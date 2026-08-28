// background/usage-tracker.js
// Sieve — Usage Insights tracker (screen time), opt-in and off by default.
//
// What counts as screen time here: the site in the active tab of the FOCUSED
// browser window, while the machine is not idle or locked. One clock, never two
// at once — so two tabs of the same site open side by side cannot double-count,
// and a window left open behind another app counts nothing.
//
// How it survives MV3: the worker is killed a few seconds after it goes quiet,
// so nothing is accumulated in a long-lived timer. Instead ONE open segment
// ({ domain, startTs, seenTs }) lives in chrome.storage.session — which belongs
// to the browser, not the worker, so it outlives every restart — and each event
// that could change what the user is looking at closes that segment and opens
// the next one.
//
// A one-minute heartbeat alarm keeps two things true:
//
//  * Liveness. It stamps seenTs on the open segment. If the machine is
//    suspended the stamp stops advancing, so on waking we credit the segment
//    only up to its last confirmed minute instead of the eight hours the wall
//    clock jumped. That is the watchdog, and it is why there is no arbitrary
//    "maximum session" constant.
//  * A bound on crash loss. Every BANK_AFTER_MS it banks the open segment and
//    starts a new one, so a browser kill costs at most that much.
//
// Note what the heartbeat deliberately does NOT do: bank every single minute.
// It cannot, because banking is irreversible — and we only learn the user left
// four minutes after they actually stopped touching the machine. Keeping the
// segment open until it is BANK_AFTER_MS old leaves something to trim when that
// news arrives, which is what keeps an absence from being recorded as reading.
//
// Nothing here runs unless the user turned the feature on, and nothing ever
// leaves the device — see common/usage-store.js for the on-disk shape.

import {
  addSpans,
  pruneUsage,
  clearUsage,
  USAGE_ENABLED_KEY,
  USAGE_RETENTION_KEY,
  DEFAULT_RETENTION_DAYS,
} from "../common/usage-store.js";

const HEARTBEAT_ALARM = "sieveUsageHeartbeat";
const PRUNE_ALARM = "sieveUsagePrune";
const OPEN_SEGMENT_KEY = "usageOpenSegment";

const HEARTBEAT_MINUTES = 1;
const HEARTBEAT_MS = HEARTBEAT_MINUTES * 60 * 1000;

// How long an unchanging segment is allowed to stay open before it is banked.
// The trade: a longer window trims absences more accurately, a shorter one
// loses less if the browser is killed outright.
const BANK_AFTER_MS = 5 * 60 * 1000;

// How far past its last confirmed minute a segment may be credited. Anything
// beyond this is time the machine was not demonstrably awake.
const LIVENESS_GRACE_MS = 2 * HEARTBEAT_MS;

// Idle detection is a judgement call, not a measurement. Chrome reports "idle"
// after this many seconds without keyboard or mouse input — but reading a long
// page is real screen time with no input at all. So the window is generous
// (4 minutes) rather than the usual 60 seconds, and when idle does fire we
// credit only the first minute of that quiet stretch and discard the rest.
// Reading keeps counting; walking away stops within a few minutes.
const IDLE_SECONDS = 240;
const IDLE_GRACE_MS = 60 * 1000;

// A second, much shorter question to the same API: "has the user touched the
// machine in the last minute?" A yes means the time up to now is confirmed and
// safe to bank. A no does not mean they are gone — they may be reading — it
// only means this stretch is not yet confirmed, so it stays open.
const RECENT_INPUT_SECONDS = 60;

// A segment that stays unconfirmed this long is banked anyway. Sparse input
// (long reading with the occasional scroll) must not leave one segment growing
// all afternoon, since an outright browser kill would lose it.
const HARD_BANK_MS = 30 * 60 * 1000;

// storage.session is in-memory and cleared when the browser closes, which is
// exactly the lifetime an open segment should have. Older builds without it
// fall back to storage.local, where onStartup clears any leftover.
const sessionArea = chrome.storage.session || chrome.storage.local;

// --- settings -------------------------------------------------------------

async function isEnabled() {
  const stored = await chrome.storage.local.get({ [USAGE_ENABLED_KEY]: false });
  return stored[USAGE_ENABLED_KEY] === true;
}

async function retentionDays() {
  const stored = await chrome.storage.local.get({
    [USAGE_RETENTION_KEY]: DEFAULT_RETENTION_DAYS,
  });
  return Number(stored[USAGE_RETENTION_KEY]) || DEFAULT_RETENTION_DAYS;
}

// --- the open segment -----------------------------------------------------

async function getOpenSegment() {
  try {
    const stored = await sessionArea.get({ [OPEN_SEGMENT_KEY]: null });
    const seg = stored[OPEN_SEGMENT_KEY];
    return seg && seg.domain && Number.isFinite(seg.startTs) ? seg : null;
  } catch {
    return null;
  }
}

async function setOpenSegment(seg) {
  try {
    await sessionArea.set({ [OPEN_SEGMENT_KEY]: seg });
  } catch (err) {
    console.error("[Sieve Usage] could not store the open segment:", err);
  }
}

async function clearOpenSegment() {
  try {
    await sessionArea.remove(OPEN_SEGMENT_KEY);
  } catch {
    /* nothing to clear */
  }
}

// --- what the user is looking at -----------------------------------------

// The site of a URL, or null for anything that is not a web page the user is
// reading: our own pages, the new-tab page, about:, view-source:, files.
function domainOf(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

// The active tab of the focused window, or null when the browser does not have
// the user's attention at all.
async function focusedTab() {
  try {
    const win = await chrome.windows.getLastFocused();
    // getLastFocused() answers even when Chrome is in the background, so this
    // flag is what separates "the user is here" from "the user is elsewhere".
    if (!win || !win.focused) return null;
    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
    return tab || null;
  } catch {
    return null;
  }
}

async function isUserPresent() {
  if (!chrome.idle?.queryState) return true; // no idle API — assume present
  try {
    const state = await chrome.idle.queryState(IDLE_SECONDS);
    return state === "active";
  } catch {
    return true;
  }
}

// Input within the last minute — the test for whether elapsed time is confirmed
// rather than merely unrefuted.
async function hasRecentInput() {
  if (!chrome.idle?.queryState) return true;
  try {
    return (await chrome.idle.queryState(RECENT_INPUT_SECONDS)) === "active";
  } catch {
    return true;
  }
}

// --- closing and opening --------------------------------------------------

async function closeSegment(endTs = Date.now()) {
  const seg = await getOpenSegment();
  if (!seg) return;
  await clearOpenSegment();

  // The watchdog: never credit further than a grace period past the last
  // heartbeat that confirmed the browser was actually running. This is what
  // stops a suspended machine from banking the hours the clock skipped.
  const watchdog = (seg.seenTs || seg.startTs) + LIVENESS_GRACE_MS;
  const end = Math.max(seg.startTs, Math.min(endTs, watchdog));
  await addSpans([{ domain: seg.domain, startTs: seg.startTs, endTs: end }]);
}

// When we learn about idleness after the fact, the user actually stopped
// touching the machine IDLE_SECONDS ago. Credit the reading grace, drop the
// rest, and never rewind past the start of the segment.
function idleAdjustedEnd(now = Date.now()) {
  return now - IDLE_SECONDS * 1000 + IDLE_GRACE_MS;
}

/**
 * The single entry point: close whatever was running, then start the clock
 * again if — and only if — the user is present on a real web page.
 *
 * Every listener funnels through here, so there is one definition of "what
 * should be counting right now" instead of one per event.
 */
async function resyncNow(endTs) {
  const now = Date.now();
  await closeSegment(endTs ?? now);

  if (!(await isEnabled())) return;
  if (!(await isUserPresent())) return;

  const tab = await focusedTab();
  const domain = tab ? domainOf(tab.url) : null;
  if (!domain) return;

  const startTs = Date.now();
  await setOpenSegment({ domain, startTs, seenTs: startTs, tabId: tab.id });
}

/**
 * The heartbeat. Confirms the browser is still awake on the same site, banks
 * the segment once it is old enough AND confirmed, and hands anything that
 * actually changed over to resyncNow().
 *
 * The order matters. Banking is irreversible, and we always learn about an
 * absence several minutes after it began, so the last unconfirmed stretch is
 * deliberately left open: it is the only thing left to trim when the idle
 * notification finally arrives. Banking every minute regardless — the obvious
 * implementation — quietly makes that trim unreachable, and every absence then
 * reads as attention.
 */
async function heartbeatNow() {
  if (!(await isEnabled())) {
    stopHeartbeat();
    return;
  }

  const seg = await getOpenSegment();

  // Away. Close with the same back-dating the idle event uses; this path is
  // only reached if that event never arrived.
  if (!(await isUserPresent())) {
    if (seg) await closeSegment(idleAdjustedEnd());
    return;
  }

  const tab = await focusedTab();
  const domain = tab ? domainOf(tab.url) : null;

  // Nothing open, nothing to run, or the user moved: let resync decide.
  if (!seg || !domain || seg.domain !== domain) {
    await resyncNow();
    return;
  }

  const now = Date.now();
  const age = now - seg.startTs;
  if (age >= BANK_AFTER_MS && ((await hasRecentInput()) || age >= HARD_BANK_MS)) {
    await closeSegment(now);
    await setOpenSegment({ domain, startTs: now, seenTs: now, tabId: tab.id });
    return;
  }

  // Same site, still here: record that this minute really happened, so the
  // watchdog in closeSegment() knows how far it may credit.
  await setOpenSegment({ ...seg, seenTs: now });
}

// Events can land together (a window focus change also changes the active tab),
// and two overlapping resyncs could open two segments. Chaining them keeps the
// "one clock" rule true.
let resyncChain = Promise.resolve();

function resync(endTs) {
  resyncChain = resyncChain
    .then(() => resyncNow(endTs))
    .catch((err) => console.error("[Sieve Usage] resync failed:", err));
  return resyncChain;
}

// --- alarms ---------------------------------------------------------------

function startHeartbeat() {
  chrome.alarms?.create(HEARTBEAT_ALARM, {
    periodInMinutes: HEARTBEAT_MINUTES,
    delayInMinutes: HEARTBEAT_MINUTES,
  });
}

function stopHeartbeat() {
  chrome.alarms?.clear(HEARTBEAT_ALARM);
}

// Just after the next local midnight, matching the doomscroll reset pattern.
function schedulePrune() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 20);
  chrome.alarms?.create(PRUNE_ALARM, { when: next.getTime() });
}

async function runPrune() {
  await pruneUsage(await retentionDays());
}

// --- wiring ---------------------------------------------------------------

// Only ask the browser for idle notifications when we are actually tracking.
function applyIdleDetection(enabled) {
  if (!chrome.idle?.setDetectionInterval) return;
  if (enabled) {
    try {
      chrome.idle.setDetectionInterval(IDLE_SECONDS);
    } catch (err) {
      console.warn("[Sieve Usage] could not set the idle interval:", err);
    }
  }
}

// Runs on every worker wake, so it must stay cheap: settings reads and alarm
// scheduling only. Pruning deliberately does NOT belong here — the worker is
// woken by its own heartbeat roughly once a minute, and re-reading the whole
// history that often to delete nothing would be the most expensive thing this
// feature does. It runs on the daily alarm, at browser start, and whenever the
// retention window changes instead.
async function start() {
  const enabled = await isEnabled();
  applyIdleDetection(enabled);
  schedulePrune();
  if (!enabled) {
    stopHeartbeat();
    await clearOpenSegment();
    return;
  }
  startHeartbeat();
  await resync();
}

chrome.runtime.onStartup.addListener(() => {
  // A leftover segment from the last browser session would otherwise be closed
  // against today's clock and credited with hours nobody spent.
  clearOpenSegment()
    .finally(start)
    .finally(runPrune);
});

chrome.runtime.onInstalled.addListener(() => {
  clearOpenSegment()
    .finally(start)
    .finally(runPrune);
});

// The service worker is also spun up by these events after being killed, so
// starting on module load is what keeps the heartbeat alive over a long day.
start();

chrome.tabs.onActivated.addListener(() => resync());

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  // Only a navigation matters, and only in the tab being looked at.
  if (!changeInfo.url) return;
  if (!tab?.active) return;
  resync();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const seg = await getOpenSegment();
  if (seg && seg.tabId === tabId) resync();
});

chrome.windows?.onFocusChanged.addListener((windowId) => {
  // WINDOW_ID_NONE means the user just left the browser entirely.
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    resyncChain = resyncChain
      .then(() => closeSegment())
      .catch((err) => console.error("[Sieve Usage] close on blur failed:", err));
    return;
  }
  resync();
});

chrome.idle?.onStateChanged.addListener((state) => {
  if (state === "active") {
    resync();
    return;
  }
  // Locked screens are unambiguous — stop at once. Input idleness happened
  // some minutes ago, so back-date the end of the segment.
  const endTs = state === "locked" ? Date.now() : idleAdjustedEnd();
  resyncChain = resyncChain
    .then(() => closeSegment(endTs))
    .catch((err) => console.error("[Sieve Usage] close on idle failed:", err));
});

chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    resyncChain = resyncChain
      .then(() => heartbeatNow())
      .catch((err) => console.error("[Sieve Usage] heartbeat failed:", err));
    return;
  }
  if (alarm.name === PRUNE_ALARM) {
    runPrune().finally(schedulePrune);
  }
});

// Turning the feature on or off takes effect immediately, without a restart.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes[USAGE_ENABLED_KEY]) {
    const on = changes[USAGE_ENABLED_KEY].newValue === true;
    applyIdleDetection(on);
    if (on) {
      startHeartbeat();
      resync();
    } else {
      stopHeartbeat();
      // Bank the time already measured, then stop the clock.
      resyncChain = resyncChain
        .then(() => closeSegment())
        .catch((err) => console.error("[Sieve Usage] close on disable failed:", err));
    }
  }

  // A shorter window should take effect now, not at the next midnight.
  if (changes[USAGE_RETENTION_KEY]) runPrune();
});

// --- messages from the settings page --------------------------------------

const USAGE_FLUSH = "SIEVE_USAGE_FLUSH";
const USAGE_CLEAR = "SIEVE_USAGE_CLEAR";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Bank the segment in progress so the page can render a total that includes
  // the minutes just spent getting to it.
  if (message?.type === USAGE_FLUSH) {
    resync()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  // Clearing runs here rather than in the page so every write to the store
  // happens in one context, and cannot interleave with a flush.
  if (message?.type === USAGE_CLEAR) {
    resyncChain = resyncChain
      .then(async () => {
        await clearOpenSegment(); // drop the in-flight span too, not just history
        await clearUsage();
        await resyncNow();
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error("[Sieve Usage] clear failed:", err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }

  return false;
});

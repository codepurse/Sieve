// background/ad-tracker-stats.js
// Sieve — how many ad & tracker requests the blocker actually stopped.
//
// Every other counter in Sieve is recorded by the code that does the blocking:
// a content script hides a comment and calls recordBlock, pages/blocked.js loads
// and calls recordBlock. Neither works here, and that is the whole reason this
// file exists.
//
// background/ad-tracker-blocker.js does its blocking with declarativeNetRequest
// rules. DNR matching happens inside the browser, on the network path — no
// script of ours runs, nothing is notified, and the request that was stopped
// leaves no trace anywhere an extension can see it. The blocked page that counts
// every other tier is never loaded, because these are SUBRESOURCES: the tracker
// was a pixel or a script inside a page, not somewhere the user navigated. So a
// tier that blocks thousands of requests a day would report zero.
//
// The only way to see them is to ask the browser afterwards:
// chrome.declarativeNetRequest.getMatchedRules(). That is what this does.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A POLL, AND WHY IT IS NOT onRuleMatchedDebug
//
// There IS an event for this — declarativeNetRequest.onRuleMatchedDebug — and it
// is the obvious thing to reach for. It cannot be used: Chromium gates it behind
// `"location": "unpacked"` in extensions/common/api/_api_features.json, so it
// exists in development and silently does not in every copy installed from a
// store. Building the counter on it would mean a feature that works perfectly on
// the developer's machine and never once for a user.
//
// getMatchedRules carries no such gate — only the declarativeNetRequestFeedback
// permission, which packed extensions may hold — so it is what a shipped build
// has to use. It is a pull, not a push, hence the alarm.
//
// TWO limits shape the polling interval, and they squeeze from opposite sides:
//   • RETENTION — a match not tied to a still-open document is dropped after
//     FIVE MINUTES. Poll slower than that and the counts are simply wrong.
//   • QUOTA — MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL is 20 calls per 10 minutes.
//     Faster than one call every 30s and the API starts failing outright.
// One minute sits in the middle: 10 calls per 10 minutes (half the quota), with
// five times the headroom against the retention window. Do not lower it without
// re-reading both numbers.
//
// ---------------------------------------------------------------------------
// ON THE PERMISSION
//
// declarativeNetRequestFeedback is in manifest.json. It adds NO new install
// warning to Sieve and needs no re-approval from existing users: Chromium's
// message rules (chrome_permission_message_rules.cc) list it among the
// permissions absorbed by IDS_EXTENSION_PROMPT_WARNING_ALL_HOSTS, and Sieve
// already requests <all_urls>.
//
// It is NOT in manifest.firefox.json. Firefox implements getMatchedRules but
// keeps it behind the extensions.dnr.feedback about:config pref, so on a normal
// Firefox profile the call throws no matter what the manifest says. Rather than
// ship a permission that buys a Firefox user nothing, the Firefox build simply
// records no request counts — every call here is guarded, and the dashboard rows
// stay at zero instead of showing a number that is quietly wrong.
// ---------------------------------------------------------------------------

import { AD_TRACKER_GROUPS, isAdTrackerEnabled } from "./ad-tracker-blocker.js";
import { recordBlock } from "../common/stats.js";

// Dashboard stats keys, one per rule band. Deliberately NOT the same strings as
// the blocker's own `category` values ("trackers" / "ads"): those are what
// pages/blocked.html reads out of its query string, and the two would drift into
// each other the first time either was renamed.
export const STATS_KEY_BY_GROUP = {
  trackers: "adTrackers",
  ads: "adNetworks",
};

const ALARM = "sieveAdTrackerStats";
const POLL_MINUTES = 1; // see the quota / retention note above
const CURSOR_KEY = "adTrackerMatchCursor";

// After this many consecutive failures, stop polling until the next startup or
// toggle flip. Guards the case where the API is present but permanently refuses
// — a Firefox profile without the pref, or a build whose permission was dropped
// — so it fails a few times and goes quiet rather than logging once a minute
// forever.
const MAX_FAILURES = 3;
let consecutiveFailures = 0;

// ===========================================================================
// Which band did this rule id come from?
// ===========================================================================

// Bands are read from the blocker itself rather than restated here, so moving a
// tier's id range can never leave the counter attributing to the wrong one.
const BANDS = Object.entries(AD_TRACKER_GROUPS)
  .filter(([name]) => STATS_KEY_BY_GROUP[name])
  .map(([name, spec]) => ({
    statsKey: STATS_KEY_BY_GROUP[name],
    start: spec.idStart,
    end: spec.idEnd, // exclusive
  }));

/**
 * Map a matched rule id to the stats key it should be counted under.
 * @param {number} ruleId
 * @returns {string|null} stats key, or null when the rule is not ours.
 */
export function statsKeyForRuleId(ruleId) {
  if (!Number.isFinite(ruleId)) return null;
  for (const b of BANDS) {
    if (ruleId >= b.start && ruleId < b.end) return b.statsKey;
  }
  return null;
}

// ===========================================================================
// Counting without double-counting
// ===========================================================================
//
// getMatchedRules returns a window of history, not a queue — the same match
// comes back on every poll until it ages out, and matches made inside a tab that
// is still open are kept for as long as that tab lives. So consecutive polls
// overlap heavily and the counter has to know what it has already seen.
//
// A cursor of "the newest timestamp I have counted" gets that almost right, and
// is wrong in exactly the case that matters most: a page load blocks thirty
// trackers inside the same millisecond, and if a poll lands on that millisecond
// the rest are never counted. Timestamps are milliseconds and these arrive in
// bursts, so ties are the normal case here, not an edge case.
//
// The cursor therefore carries a second field: how many matches were counted AT
// that exact timestamp. The next poll re-counts that millisecond and subtracts
// what it already had. That also makes the whole thing indifferent to whether a
// given browser's minTimeStamp filter is inclusive or exclusive — if the
// boundary entries come back, the subtraction removes them; if they do not, the
// subtraction is a no-op.
//
// Anything OLDER than the cursor is never counted again, so a match that keeps
// being returned for the lifetime of its tab costs one count, on the poll that
// first saw it.

/**
 * Work out what is new in a batch of matched rules.
 *
 * Pure — no chrome APIs, no storage — so the arithmetic above can be tested
 * directly. See test/ad-tracker-stats-test.mjs.
 *
 * @param {Array<{rule?:{ruleId?:number}, timeStamp?:number}>} matched
 * @param {{ts:number, at:Record<string,number>}|null} cursor previous position
 * @returns {{counted:Record<string,number>, cursor:{ts:number,at:Record<string,number>}|null}}
 */
export function countNewMatches(matched, cursor) {
  const prevTs = cursor && Number.isFinite(cursor.ts) ? cursor.ts : null;
  const prevAt = (cursor && cursor.at) || {};

  // Ours only, reduced to the two facts that matter.
  const ours = [];
  for (const info of Array.isArray(matched) ? matched : []) {
    const key = statsKeyForRuleId(info && info.rule ? Number(info.rule.ruleId) : NaN);
    if (!key) continue;
    const ts = Number(info.timeStamp);
    if (!Number.isFinite(ts)) continue;
    ours.push({ key, ts });
  }
  if (!ours.length) return { counted: {}, cursor: cursor || null };

  let maxTs = -Infinity;
  for (const e of ours) if (e.ts > maxTs) maxTs = e.ts;

  // Everything in the batch predates the cursor — nothing new, and moving the
  // cursor backwards would re-count the boundary next time. Stay put.
  if (prevTs !== null && maxTs < prevTs) return { counted: {}, cursor };

  const counted = {};
  const atPrev = {}; // this batch's matches sitting exactly on the old cursor
  for (const e of ours) {
    if (prevTs === null || e.ts > prevTs) counted[e.key] = (counted[e.key] || 0) + 1;
    else if (e.ts === prevTs) atPrev[e.key] = (atPrev[e.key] || 0) + 1;
  }
  // The boundary millisecond: count only what was not counted last time.
  for (const [key, n] of Object.entries(atPrev)) {
    const extra = n - (prevAt[key] || 0);
    if (extra > 0) counted[key] = (counted[key] || 0) + extra;
  }

  // Where the cursor lands. When the newest match is still on the old cursor's
  // millisecond, the tally there is the running total across both polls — taking
  // just this batch's would forget the earlier ones and re-count them next time.
  const at = {};
  if (prevTs !== null && maxTs === prevTs) {
    for (const key of new Set([...Object.keys(prevAt), ...Object.keys(atPrev)])) {
      at[key] = Math.max(prevAt[key] || 0, atPrev[key] || 0);
    }
  } else {
    for (const e of ours) if (e.ts === maxTs) at[e.key] = (at[e.key] || 0) + 1;
  }

  return { counted, cursor: { ts: maxTs, at } };
}

// ===========================================================================
// The cursor lives in session storage
// ===========================================================================
//
// Session, not local: the browser drops every matched rule when it restarts, so
// a cursor that outlived the browser would describe a history that no longer
// exists. Clearing itself on restart is the correct behaviour, not a limitation.
// Falls back to local where storage.session is missing (older Firefox), which
// costs at most one poll's worth of double-counting after a restart.

function cursorArea() {
  return chrome.storage.session || chrome.storage.local;
}

async function readCursor() {
  try {
    const stored = await cursorArea().get({ [CURSOR_KEY]: null });
    const c = stored[CURSOR_KEY];
    if (c && Number.isFinite(c.ts) && c.at && typeof c.at === "object") return c;
  } catch {
    /* treat an unreadable cursor as no cursor */
  }
  return null;
}

async function writeCursor(cursor) {
  try {
    await cursorArea().set({ [CURSOR_KEY]: cursor });
  } catch {
    /* a lost cursor costs one poll of double-counting, never a broken poll */
  }
}

async function clearCursor() {
  try {
    await cursorArea().remove(CURSOR_KEY);
  } catch {
    /* ignore */
  }
}

// ===========================================================================
// The poll
// ===========================================================================

// Is the feedback API actually usable here? Present on Chrome with the
// permission; present-but-throwing on a Firefox profile without the pref, which
// is why the call itself is still wrapped.
function feedbackAvailable() {
  return typeof chrome.declarativeNetRequest?.getMatchedRules === "function";
}

/**
 * One poll: read what the browser matched, count what is new, record it.
 * @returns {Promise<Record<string, number>>} what was recorded this round
 */
export async function pollAdTrackerMatches() {
  if (!feedbackAvailable()) return {};

  const cursor = await readCursor();

  let matched;
  try {
    // minTimeStamp trims the payload to roughly one interval's worth instead of
    // the full retention window; the counting above does not depend on it.
    const filter = cursor ? { minTimeStamp: cursor.ts } : {};
    const res = await chrome.declarativeNetRequest.getMatchedRules(filter);
    matched = (res && res.rulesMatchedInfo) || [];
  } catch (err) {
    consecutiveFailures++;
    if (consecutiveFailures === MAX_FAILURES) {
      console.debug(
        "[Sieve] Ad & Tracker counts unavailable in this browser — no longer polling.",
        err
      );
      await stopPolling();
    }
    return {};
  }
  consecutiveFailures = 0;

  const { counted, cursor: next } = countNewMatches(matched, cursor);
  if (next) await writeCursor(next);

  for (const [key, n] of Object.entries(counted)) {
    if (n > 0) await recordBlock(key, n);
  }
  return counted;
}

// ===========================================================================
// Arming
// ===========================================================================

async function anyGroupEnabled() {
  for (const name of Object.keys(AD_TRACKER_GROUPS)) {
    if (STATS_KEY_BY_GROUP[name] && (await isAdTrackerEnabled(name))) return true;
  }
  return false;
}

async function stopPolling() {
  try {
    await chrome.alarms.clear(ALARM);
  } catch {
    /* ignore */
  }
}

/**
 * Match the alarm to the toggles: polling only exists while at least one of the
 * two blockers is on. A user who never enables either pays nothing — no alarm,
 * no wake-ups, no API calls.
 */
export async function applyAdTrackerStatsAlarm() {
  if (!chrome.alarms?.create) return;
  if (!(await anyGroupEnabled()) || !feedbackAvailable()) {
    await stopPolling();
    await clearCursor();
    return;
  }
  consecutiveFailures = 0;
  chrome.alarms.create(ALARM, { periodInMinutes: POLL_MINUTES, delayInMinutes: POLL_MINUTES });
}

// SEPARATE listeners, additive — same house style as the other background
// modules, so none of them can stand on another's registration.
chrome.runtime.onInstalled.addListener(() => {
  applyAdTrackerStatsAlarm();
});
chrome.runtime.onStartup.addListener(() => {
  // Matched-rule history does not survive a browser restart, so neither should
  // the cursor. (storage.session clears itself; this covers the local fallback.)
  clearCursor().then(applyAdTrackerStatsAlarm);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM) return;
  pollAdTrackerMatches().catch((err) => {
    console.error("[Sieve] Ad & Tracker stats poll failed:", err);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const moved = Object.keys(AD_TRACKER_GROUPS).some(
    (name) => STATS_KEY_BY_GROUP[name] && changes[AD_TRACKER_GROUPS[name].key]
  );
  if (moved) applyAdTrackerStatsAlarm();
});

// Test hooks — drive this from the service-worker DevTools console, e.g.
//   await sieveAdTrackerStats.pollAdTrackerMatches()   // count now, don't wait
//   await chrome.declarativeNetRequest.getMatchedRules({})
//   (await chrome.storage.local.get("sieveStats")).sieveStats
globalThis.sieveAdTrackerStats = {
  statsKeyForRuleId,
  countNewMatches,
  pollAdTrackerMatches,
  applyAdTrackerStatsAlarm,
  STATS_KEY_BY_GROUP,
};

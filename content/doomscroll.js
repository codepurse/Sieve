// content/doomscroll.js
// Sieve — Doomscroll Stopper (Module 2A): the time tracker.
//  - Detects which supported social site we're on (from data/site-configs.json).
//  - Measures, FOR THE WHOLE DAY (cumulative across reloads, tabs, sessions),
//    the time spent ON the site: while its tab is on screen and the user is
//    either using it (scrolling, typing, pointing) or something on it is playing.
//  - Reads the user's per-site DAILY time limit from chrome.storage.local.
//  - When the daily time limit is reached, asks the pause overlay to appear.
//  - Because totals are persisted per day, a refresh or a new tab no longer
//    resets progress — only midnight does (handled by the service worker).
//
// It used to count only time spent actively scrolling, which let a video site
// straight through: a user set 15 minutes on YouTube and watched for three
// hours before the pause appeared, because three hours of watching is a few
// minutes of scrolling. Watching is time on the site, so it counts.

(() => {
  "use strict";

  // Guard: never run the tracker twice on the same page.
  if (window.__sieveDoomscrollActive) return;
  window.__sieveDoomscrollActive = true;

  // --- tuning constants ---------------------------------------------------
  const TICK_MS = 1000;              // how often the clock checks whether the user is here
  const IDLE_AFTER_MS = 60 * 1000;   // no input for this long, and nothing playing = away
  const MAX_TICK_MS = 5000;          // a longer gap between ticks (sleep, a throttled timer) counts only this much
  const FLUSH_INTERVAL_MS = 5000;    // how often we persist the running total
  const SNOOZE_MS = 5 * 60 * 1000;   // "Snooze 5 min" wall-clock grace
  const REMIND_AFTER_MS = 5 * 60 * 1000; // after Dismiss, nag again only after this much more time
  const GUARDIAN_GRANT_MS = 15 * 60 * 1000; // extra time the Guardian PIN unlocks

  // Defaults used until (and unless) the options page writes per-site settings.
  // A time limit of 0 means "this limit is off".
  const DEFAULT_SITE_SETTINGS = { enabled: false, timeLimitMinutes: 15 };

  // --- live state ---------------------------------------------------------
  let site = null;                       // matched entry from site-configs.json
  let settings = DEFAULT_SITE_SETTINGS;  // this site's limit
  let moduleEnabled = false;             // master Doomscroll Stopper toggle (opt-in, off by default)
  let stoppedToday = false;              // user chose "Stop for today"

  let statsDate = "";      // the date the in-memory total belongs to
  let todayMs = 0;         // cumulative time on the site today (ms)
  let unflushedMs = 0;     // time accrued since the last write to storage
  let lastInputTs = 0;     // when the user last scrolled, typed or pointed here
  let lastTickTs = 0;      // when the clock last ran

  let snoozeUntil = 0;     // wall-clock suppression (Snooze)
  let overrideUntil = 0;   // wall-clock suppression (PIN-granted extra time)
  let rearmMs = 0;         // after Dismiss: don't re-trigger until todayMs passes this
  let overlayShown = false;
  let tracking = false;
  let guardianMode = false; // a Guardian PIN is set
  let tickTimer = null;
  let flushTimer = null;

  // Anything that says the user is here. Listened for on window in the capture
  // phase, so a site that stops an event bubbling cannot hide it. Scroll does
  // not bubble at all, so it gets a capture listener on document instead, which
  // is what catches inner feed containers.
  const INPUT_EVENTS = ["wheel", "touchmove", "keydown", "pointerdown", "pointermove"];
  const LISTEN = { passive: true, capture: true };

  // --- small helpers ------------------------------------------------------

  // Local date as "YYYY-MM-DD" (matches the service worker's midnight reset).
  function todayStr() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function isSnoozed() {
    return snoozeUntil !== 0 && Date.now() < snoozeUntil;
  }

  // Read the minutes from a stored daily entry. Supports the current object
  // shape ({ minutes }), the older { minutes, px } shape, and a bare number.
  function readMinutes(entry) {
    if (entry && typeof entry === "object") return entry.minutes || 0;
    if (typeof entry === "number") return entry; // legacy shape
    return 0;
  }

  // --- load the supported-site list + match the current tab ---------------
  // Built-in feeds plus any domain the user added themselves; both arrive in
  // the same config shape from common/doomscroll-sites.js.
  async function loadConfigs() {
    const S = window.SieveDoomscrollSites;
    if (!S) {
      console.error("[Sieve] doomscroll-sites.js not loaded");
      return [];
    }
    return (await S.loadAll()).all;
  }

  // Find the config whose domains cover this hostname (incl. subdomains).
  function matchSite(configs) {
    const S = window.SieveDoomscrollSites;
    return configs.find((cfg) => S.hostMatches(cfg, location.hostname)) || null;
  }

  // --- read settings + "stopped for today" from storage ------------------
  async function loadSettings() {
    const stored = await chrome.storage.local.get({
      doomscrollEnabled: false,
      doomscrollSites: {},
      doomscrollStoppedDates: {},
    });
    moduleEnabled = stored.doomscrollEnabled;
    settings = { ...DEFAULT_SITE_SETTINGS, ...(stored.doomscrollSites[site.id] || {}) };
    stoppedToday = stored.doomscrollStoppedDates[site.id] === todayStr();
  }

  // Load today's cumulative total so we resume where the day left off.
  async function loadDailyTotals() {
    const { doomscrollStats } = await chrome.storage.local.get({ doomscrollStats: {} });
    const today = todayStr();
    const minutes = readMinutes((doomscrollStats[site.id] || {})[today]);
    todayMs = minutes * 60000;
    unflushedMs = 0;
    statsDate = today;
  }

  // --- day rollover -------------------------------------------------------
  // If the clock has crossed midnight while this tab stayed open, start fresh.
  function rolloverIfNewDay() {
    const t = todayStr();
    if (t === statsDate) return;
    statsDate = t;
    todayMs = 0;
    unflushedMs = 0;
    rearmMs = 0;
    snoozeUntil = 0;
    overrideUntil = 0;
  }

  // --- time accounting ----------------------------------------------------

  // Any input: the user is here. Only a timestamp, because pointermove fires
  // constantly; the clock below does the counting.
  function onActivity() {
    lastInputTs = Date.now();
  }

  // Is anything on the page playing? Watching is the one way to spend an hour
  // on a site without touching it.
  function mediaPlaying() {
    for (const el of document.querySelectorAll("video, audio")) {
      if (!el.paused && !el.ended) return true;
    }
    return false;
  }

  // Is the user on this site right now? The tab has to be on screen, and then
  // either they used it in the last minute or something is playing. Reading a
  // post without touching anything for over a minute stops the clock; a video
  // left playing in a tab nobody can see does not count either.
  function present(now) {
    if (document.hidden) return false;
    return now - lastInputTs < IDLE_AFTER_MS || mediaPlaying();
  }

  // One tick of the clock: credit the time since the last tick if the user was
  // here for it. The pause screen and a snooze are breaks, so they never count.
  function tick() {
    rolloverIfNewDay();
    const now = Date.now();
    const delta = Math.min(now - lastTickTs, MAX_TICK_MS);
    lastTickTs = now;
    if (delta <= 0 || overlayShown || isSnoozed() || !present(now)) return;
    todayMs += delta;
    unflushedMs += delta;
    checkLimits();
  }

  // --- limit check + trigger ---------------------------------------------
  function checkLimits() {
    if (overlayShown || !tracking || isSnoozed()) return;
    if (overrideUntil !== 0 && Date.now() < overrideUntil) return; // PIN-granted time

    const timeLimitMs = (settings.timeLimitMinutes || 0) * 60000;
    // After a Dismiss, rearmMs pushes the bar higher so we don't nag.
    const timeHit = timeLimitMs > 0 && todayMs >= Math.max(timeLimitMs, rearmMs);
    if (timeHit) triggerPause();
  }

  // Ask the pause overlay to show. If it isn't loaded yet, log it.
  function triggerPause() {
    const api = window.SievePause;
    if (!api || typeof api.show !== "function") {
      console.warn("[Sieve] Doomscroll limit reached — pause overlay not loaded.");
      return;
    }
    overlayShown = true;
    flushStats();

    const base = { siteName: site.name, minutes: Math.round(todayMs / 60000) };
    if (guardianMode) {
      // Guardian mode: the only way past is the Guardian PIN, which grants +15 min.
      api.show({
        ...base,
        guardian: true,
        // The PIN, then the access code when one is set. Getting past the pause
        // screen is the decisive moment this whole gate exists for, so it counts
        // as critical even when the code is limited to the big changes.
        verifyPin: async (pin) => {
          const G = window.SieveGuardian;
          if (!G) return false;
          if (!(await G.verify(pin))) return false;
          if (typeof G.requireAccessCode !== "function") return true;
          return G.requireAccessCode("Unlock 15 more minutes", { critical: true });
        },
        onGrantTime: handleGrantTime,
      });
    } else {
      // Personal mode: the user controls their own break.
      api.show({
        ...base,
        onSnooze: handleSnooze,
        onStopForToday: handleStopForToday,
        onDismiss: handleDismiss,
      });
    }
  }

  // --- overlay button handlers -------------------------------------------

  // Snooze: a 5-minute wall-clock break. The daily total is NOT reset.
  function handleSnooze() {
    snoozeUntil = Date.now() + SNOOZE_MS;
    overlayShown = false;
  }

  // Dismiss: keep going, but don't nag again until noticeably more time passes.
  // The daily total is NOT reset.
  function handleDismiss() {
    rearmMs = todayMs + REMIND_AFTER_MS;
    overlayShown = false;
  }

  // PIN granted extra time: suppress the pause for 15 min (usage still counts),
  // then it pauses again because the daily total is still over the limit.
  function handleGrantTime() {
    overrideUntil = Date.now() + GUARDIAN_GRANT_MS;
    overlayShown = false;
  }

  // Stop for today: persist the choice and stop tracking until midnight.
  async function handleStopForToday() {
    overlayShown = false;
    stoppedToday = true;
    const stored = await chrome.storage.local.get({ doomscrollStoppedDates: {} });
    stored.doomscrollStoppedDates[site.id] = todayStr();
    await chrome.storage.local.set({ doomscrollStoppedDates: stored.doomscrollStoppedDates });
    stopTracking();
  }

  // --- daily stats persistence -------------------------------------------

  // Add the time we've gathered since the last flush to today's stored total,
  // then refresh our in-memory total from storage (picks up other tabs).
  async function flushStats() {
    rolloverIfNewDay();
    if (unflushedMs < 1000) return;
    const addMinutes = unflushedMs / 60000;
    unflushedMs = 0;

    const today = todayStr();
    const { doomscrollStats } = await chrome.storage.local.get({ doomscrollStats: {} });
    const siteStats = doomscrollStats[site.id] || {};
    const next = { minutes: readMinutes(siteStats[today]) + addMinutes };
    siteStats[today] = next;
    doomscrollStats[site.id] = siteStats;
    await chrome.storage.local.set({ doomscrollStats });

    todayMs = next.minutes * 60000;
  }

  // --- start / stop tracking ---------------------------------------------
  function startTracking() {
    if (tracking) return;
    tracking = true;
    // Opening the page is being here.
    lastInputTs = lastTickTs = Date.now();
    document.addEventListener("scroll", onActivity, LISTEN);
    for (const type of INPUT_EVENTS) window.addEventListener(type, onActivity, LISTEN);
    tickTimer = setInterval(tick, TICK_MS);
    flushTimer = setInterval(() => {
      flushStats();
      checkLimits();
    }, FLUSH_INTERVAL_MS);
  }

  function stopTracking() {
    if (!tracking) return;
    tracking = false;
    document.removeEventListener("scroll", onActivity, LISTEN);
    for (const type of INPUT_EVENTS) window.removeEventListener(type, onActivity, LISTEN);
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    flushStats();
  }

  // Re-evaluate after a settings change (or the midnight reset).
  async function reloadAndApply() {
    await flushStats();
    // The user can delete a custom site while its tab is open; when that
    // happens this page stops being tracked, exactly as if it were switched off.
    const stillTracked = !!matchSite(await loadConfigs());
    await loadSettings();
    await loadDailyTotals();
    const shouldTrack = stillTracked && moduleEnabled && settings.enabled && !stoppedToday;
    if (shouldTrack) {
      startTracking();
      checkLimits(); // already over the daily limit? show it now.
    } else {
      stopTracking();
    }
  }

  // --- entry point --------------------------------------------------------
  async function init() {
    const configs = await loadConfigs();
    site = matchSite(configs);
    if (!site) return; // not a supported social site — do nothing

    await loadSettings();
    await loadDailyTotals();
    guardianMode = window.SieveGuardian ? await window.SieveGuardian.isEnabled() : false;
    if (moduleEnabled && settings.enabled && !stoppedToday) {
      startTracking();
      checkLimits(); // if a refresh happened while already over budget, pause now.
    }

    // React to options/service-worker changes (toggles, limits, midnight reset).
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.guardianPinHash) {
        guardianMode = !!changes.guardianPinHash.newValue;
      }
      if (
        changes.doomscrollEnabled ||
        changes.doomscrollSites ||
        changes.doomscrollStoppedDates ||
        changes.doomscrollCustomSites
      ) {
        reloadAndApply();
      }
    });

    // Don't lose the last few seconds of progress when the page goes away.
    // Coming back to the tab is being here, and the stretch it spent hidden is
    // not credited: the hidden tab's timer may not have run for a minute.
    window.addEventListener("pagehide", flushStats);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushStats();
      else lastInputTs = lastTickTs = Date.now();
    });
  }

  init();
})();

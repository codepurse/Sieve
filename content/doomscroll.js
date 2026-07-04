// content/doomscroll.js
// Sieve — Doomscroll Stopper (Module 2A): the scroll tracker.
//  - Detects which supported social site we're on (from data/site-configs.json).
//  - Measures, FOR THE WHOLE DAY (cumulative across reloads, tabs, sessions),
//    the time spent ACTIVELY scrolling.
//  - Reads the user's per-site DAILY time limit from chrome.storage.local.
//  - When the daily time limit is reached, asks the pause overlay to appear.
//  - Because totals are persisted per day, a refresh or a new tab no longer
//    resets progress — only midnight does (handled by the service worker).

(() => {
  "use strict";

  // Guard: never run the tracker twice on the same page.
  if (window.__sieveDoomscrollActive) return;
  window.__sieveDoomscrollActive = true;

  // --- tuning constants ---------------------------------------------------
  const IDLE_GAP_MS = 2000;          // a gap longer than this = the user paused; don't count it
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
  let todayMs = 0;         // cumulative active-scroll time today (ms)
  let unflushedMs = 0;     // time accrued since the last write to storage
  let lastActivityTs = 0;  // timestamp of the previous scroll activity

  let snoozeUntil = 0;     // wall-clock suppression (Snooze)
  let overrideUntil = 0;   // wall-clock suppression (PIN-granted extra time)
  let rearmMs = 0;         // after Dismiss: don't re-trigger until todayMs passes this
  let overlayShown = false;
  let tracking = false;
  let guardianMode = false; // a Guardian PIN is set
  let flushTimer = null;

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
  async function loadConfigs() {
    try {
      const res = await fetch(chrome.runtime.getURL("data/site-configs.json"));
      return await res.json();
    } catch (err) {
      console.error("[Sieve] Could not load site-configs.json", err);
      return [];
    }
  }

  // Find the config whose domains cover this hostname (incl. subdomains).
  function matchSite(configs) {
    const host = location.hostname.replace(/^www\./, "");
    for (const cfg of configs) {
      if (cfg.domains.some((d) => host === d || host.endsWith("." + d))) return cfg;
    }
    return null;
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

  // --- scroll accounting --------------------------------------------------

  // Count the time since the last activity, if the gap was short enough to
  // count as continuous scrolling. Always runs on scroll/wheel/touch.
  function recordActivity() {
    rolloverIfNewDay();
    const now = Date.now();
    if (isSnoozed()) {
      lastActivityTs = now; // ignore time spent during the snooze window
      return;
    }
    if (lastActivityTs && now - lastActivityTs < IDLE_GAP_MS) {
      const delta = now - lastActivityTs;
      todayMs += delta;
      unflushedMs += delta;
    }
    lastActivityTs = now;
  }

  // Any scroll/wheel/touch activity: count active time, then check the limit.
  // Works on virtualized feeds (e.g. TikTok) where window scrollY may not move,
  // and — registered in the capture phase — on inner feed containers too.
  function onActivity() {
    recordActivity();
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
        verifyPin: (pin) => (window.SieveGuardian ? window.SieveGuardian.verify(pin) : Promise.resolve(false)),
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
    lastActivityTs = 0;
    // Capture-phase scroll on document catches inner-container scrolls too.
    document.addEventListener("scroll", onActivity, { passive: true, capture: true });
    window.addEventListener("wheel", onActivity, { passive: true });
    window.addEventListener("touchmove", onActivity, { passive: true });
    flushTimer = setInterval(() => {
      flushStats();
      checkLimits();
    }, FLUSH_INTERVAL_MS);
  }

  function stopTracking() {
    if (!tracking) return;
    tracking = false;
    document.removeEventListener("scroll", onActivity, { capture: true });
    window.removeEventListener("wheel", onActivity);
    window.removeEventListener("touchmove", onActivity);
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    flushStats();
  }

  // Re-evaluate after a settings change (or the midnight reset).
  async function reloadAndApply() {
    await flushStats();
    await loadSettings();
    await loadDailyTotals();
    const shouldTrack = moduleEnabled && settings.enabled && !stoppedToday;
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
      if (changes.doomscrollEnabled || changes.doomscrollSites || changes.doomscrollStoppedDates) {
        reloadAndApply();
      }
    });

    // Don't lose the last few seconds of progress when the page goes away.
    window.addEventListener("pagehide", flushStats);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushStats();
    });
  }

  init();
})();

// content/cookie-autoreject.js
// Sieve — Dark Pattern Blocker: "Auto-reject non-essential cookies" driver.
//
// This is Sieve's glue around the vendored Consent-O-Matic engine (loaded just
// before this file as content/cookie-engine.bundle.js, which defines the global
// window.SieveCookieEngine). It does NOT contain any CMP-detection logic of its
// own — that all lives in the vendored engine + rule database.
//
// What it does, when (and only when) the user has opted in:
//   1. Loads the locally-packaged rule database (data/cookie-rules.json).
//   2. Tells the engine to REJECT every non-essential category
//      (A/B/D/E/F/X = false — see REJECT_ALL below).
//   3. Runs the engine silently: banners are hidden while it works and the
//      engine's own progress dialog is suppressed via injected CSS.
//   4. On a successful auto-reject, bumps a per-week, per-site counter that the
//      settings UI displays (added in a later step).
//
// OFF by default. Fully local — no third-party fetch. Top frame only for now
// (see note at startEngine): the target CMPs — OneTrust, Cookiebot, Quantcast,
// Didomi, Usercentrics, Osano — all render in the main frame.

(() => {
  "use strict";

  if (window.__sieveCookieAutoRejectActive) return;
  window.__sieveCookieAutoRejectActive = true;

  // Storage keys mirror the existing dark-pattern naming (see dark-patterns.js).
  //   master     — the Dark Pattern Blocker master switch
  //   autoReject — this feature's own opt-in toggle (default OFF)
  const KEYS = {
    master: "darkPatternsEnabled",
    autoReject: "darkPatternCookieAutoRejectEnabled",
  };

  // The consent decision. All categories the engine can toggle are set to false
  // = "do not consent". Strictly-necessary cookies (login/session/cart/CSRF)
  // are NOT one of these categories — CMPs keep them on regardless — so sites
  // keep working. Letters: A=Preferences/Functionality, B=Performance/Analytics,
  // D=Information Storage & Access, E=Content selection, F=Ad selection,
  // X=Other. (Per Sieve's design decision, A is rejected too.)
  const REJECT_ALL = { A: false, B: false, D: false, E: false, F: false, X: false };

  const RULES_URL = chrome.runtime.getURL("data/cookie-rules.json");
  const STYLE_ID = "sieve-cookie-autoreject-style";
  const STATS_KEY = "cookieAutoRejectStats";

  let engineStarted = false;
  let rulesCache = null;
  let fallbackDone = false;
  let recordedForPage = false; // shared stats: only once per page

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  function loadSettings() {
    return chrome.storage.local.get({
      [KEYS.master]: true,
      [KEYS.autoReject]: false,
    });
  }

  function isEnabled(s) {
    return !!(s[KEYS.master] && s[KEYS.autoReject]);
  }

  // ---------------------------------------------------------------------------
  // Silent operation: hide banners while the engine works, and suppress the
  // engine's built-in progress dialog entirely. Injecting our own <style> keeps
  // the vendored engine unmodified.
  // ---------------------------------------------------------------------------

  function injectSilentCSS() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".ConsentOMatic-CMP-Hider{opacity:0 !important;}" +
      ".ConsentOMatic-Progress-Dialog-Modal,.ConsentOMatic-Progress-Dialog{display:none !important;}";
    (document.head || document.documentElement).appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Weekly, de-duplicated counter of sites we auto-rejected on. The settings UI
  // reads this to show "Auto-rejected cookies on X sites this week". The week id
  // is simply the date of this week's Monday, so it rolls over automatically.
  // ---------------------------------------------------------------------------

  function currentWeekKey(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const mondayOffset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    d.setDate(d.getDate() - mondayOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function recordReject(host) {
    try {
      // Shared Protection Dashboard stats: record one successful auto-reject per page.
      if (!recordedForPage) {
        recordedForPage = true;
        try {
          chrome.runtime
            .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "cookieAutoReject", count: 1 })
            .catch(() => {});
        } catch (err) {
          // Extension context may be unavailable in unusual conditions.
        }
      }

      const weekKey = currentWeekKey(new Date());
      const stored = await chrome.storage.local.get({ [STATS_KEY]: null });
      let stats = stored[STATS_KEY];
      if (!stats || stats.weekKey !== weekKey) {
        stats = { weekKey, count: 0, hosts: {} };
      }
      if (!stats.hosts[host]) {
        stats.hosts[host] = 1;
        stats.count += 1;
        await chrome.storage.local.set({ [STATS_KEY]: stats });
      }
    } catch (e) {
      // Counting is best-effort; never let it affect the consent flow.
    }
  }

  // ---------------------------------------------------------------------------
  // Engine lifecycle
  // ---------------------------------------------------------------------------

  function onHandled(evt) {
    if (evt && evt.handled) {
      // A CMP rule matched and we clicked through it.
      recordReject(location.host);
    } else {
      // evt.handled === false → no rule matched / nothing found (or evt.error).
      // Fall back to the existing Dark Pattern "level the buttons" behavior so
      // unsupported sites still get some benefit.
      runFallbackLeveling();
    }
  }

  // ---------------------------------------------------------------------------
  // Fallback: when Consent-O-Matic has no rule for this site's CMP, reuse the
  // existing cookie dark-pattern leveling (content/patterns/cookies.js, exposed
  // as window.SieveCookieLeveling). This runs regardless of the standalone
  // "level the buttons" toggle — the promise of enabling auto-reject is that the
  // user is never left worse off, even on sites we don't recognize.
  //
  // Idempotent: cookies.js marks what it touches, so if the standalone leveling
  // already handled this banner, the scan is a no-op. Runs at most once per page.
  // ---------------------------------------------------------------------------
  function runFallbackLeveling() {
    if (fallbackDone) return;
    fallbackDone = true;
    try {
      const leveling = window.SieveCookieLeveling;
      if (!leveling || typeof leveling.scan !== "function") return;
      // Prefer the Dark Pattern coordinator's context so marking/counting stay
      // consistent with the normal path; fall back to a minimal no-op context.
      const ctx = window.SieveDarkPatterns || {
        mark() {},
        isMarked() { return false; },
        report() {},
        counts() { return { total: 0, byType: {} }; },
      };
      if (document.body) leveling.scan(document.body, ctx);
    } catch (e) {
      // Fallback is best-effort; never throw into the page.
    }
  }

  async function getRules() {
    if (rulesCache) return rulesCache;
    const resp = await fetch(RULES_URL);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    rulesCache = await resp.json();
    return rulesCache;
  }

  async function startEngine() {
    if (engineStarted) return;

    const NS = window.SieveCookieEngine;
    if (!NS || !NS.ConsentEngine) {
      console.warn("[Sieve] Cookie engine bundle missing; auto-reject unavailable.");
      runFallbackLeveling(); // never leave the user worse off
      return;
    }

    let rules;
    try {
      rules = await getRules();
    } catch (e) {
      console.warn("[Sieve] Failed to load cookie rules:", e);
      runFallbackLeveling(); // never leave the user worse off
      return;
    }

    // Guard again — an await happened since the first check.
    if (engineStarted) return;
    engineStarted = true;

    injectSilentCSS();

    const { ConsentEngine } = NS;
    // debugValues were already seeded silent by the entry wrapper; leave them.
    ConsentEngine.generalSettings = { hideInsteadOfPIP: true };
    ConsentEngine.topFrameUrl = location.host;

    try {
      // Top frame only: we don't set all_frames, so iframe-hosted CMP variants
      // (some TrustArc/Sourcepoint layouts) are out of scope for this pass.
      const engine = new ConsentEngine(rules, REJECT_ALL, onHandled);
      ConsentEngine.singleton = engine; // engine reads this during execution
    } catch (e) {
      console.warn("[Sieve] Cookie engine failed to start:", e);
      engineStarted = false;
      runFallbackLeveling(); // never leave the user worse off
    }
  }

  // ---------------------------------------------------------------------------
  // Entry point
  // ---------------------------------------------------------------------------

  async function init() {
    try {
      const s = await loadSettings();
      if (isEnabled(s)) startEngine();
    } catch (e) {
      // storage read failed; stay inert.
    }

    // Let the user flip the toggle on without reloading. (Turning it off takes
    // effect on the next navigation; a running engine self-terminates within ~5s
    // or once it has handled the banner.)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (KEYS.master in changes || KEYS.autoReject in changes) {
        loadSettings().then((s2) => {
          if (isEnabled(s2)) startEngine();
        });
      }
    });
  }

  setTimeout(init, 0);
})();

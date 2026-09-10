// content/popup-hijack-bridge.js
// Sieve — Popup & Click Hijack Blocker (isolated-world half) — STRICT mode.
//
// The MAIN-world half (popup-hijack-blocker.js) does the actual blocking but
// can't use chrome.* APIs. This isolated companion owns what needs them:
//   - reads the popupHijackEnabled toggle AND the per-site whitelist, and tells
//     the MAIN half whether to act on THIS host (enabled + whitelisted)
//   - on "Always allow this site", adds the host to the whitelist
//   - forwards each blocked popup to the background relay (chrome.storage.session)
//
// Talks to the MAIN half over window.postMessage on the shared window.

(() => {
  "use strict";

  if (window.__sievePopupHijackBridgeActive) return;
  window.__sievePopupHijackBridgeActive = true;

  const TAG = "__sievePopupHijack";
  const ENABLED_KEY = "popupHijackEnabled"; // chrome.storage.local, OFF by default
  const WHITELIST_KEY = "popupHijackWhitelist"; // array of hostnames allowed to open popups

  let enabled = false;
  let whitelist = [];
  const host = location.hostname;

  function isWhitelisted() {
    return whitelist.includes(host);
  }

  // ---------------------------------------------------------------------------
  // Talk to the MAIN half
  // ---------------------------------------------------------------------------
  function postToMain(kind, extra) {
    try {
      window.postMessage({ [TAG]: true, dir: "to-main", kind, ...extra }, "*");
    } catch {
      /* ignore */
    }
  }
  function pushConfig() {
    postToMain("config", { enabled, whitelisted: isWhitelisted() });
  }

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window) return;
      const d = event.data;
      if (!d || d[TAG] !== true || d.dir !== "to-bridge") return;

      if (d.kind === "hello") {
        pushConfig();
      } else if (d.kind === "blocked" && d.entry) {
        forwardBlocked(d.entry);
      } else if (d.kind === "whitelist-add") {
        addCurrentHostToWhitelist();
      }
    },
    false
  );

  // ---------------------------------------------------------------------------
  // Persist a blocked popup to the background relay (session storage).
  // ---------------------------------------------------------------------------
  function forwardBlocked(entry) {
    const rec = {
      url: String(entry.url || ""),
      reason: String(entry.reason || ""),
      target: String(entry.target || ""),
      pageUrl: String(entry.pageUrl || location.href),
      time: Number(entry.time) || Date.now(),
    };
    try {
      const p = chrome.runtime.sendMessage({ type: "POPUP_HIJACK_BLOCKED", entry: rec });
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* service worker asleep / context invalidated */
    }
  }

  // ---------------------------------------------------------------------------
  // Whitelist
  // ---------------------------------------------------------------------------
  async function addCurrentHostToWhitelist() {
    try {
      const stored = await chrome.storage.local.get({ [WHITELIST_KEY]: [] });
      const list = Array.isArray(stored[WHITELIST_KEY]) ? stored[WHITELIST_KEY] : [];
      if (!list.includes(host)) {
        list.push(host);
        await chrome.storage.local.set({ [WHITELIST_KEY]: list });
        // storage.onChanged below will refresh `whitelist` + re-push config.
      }
    } catch {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------------------
  // Load config
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // The shared read.
  //
  // This file, overlay-detector.js and link-hijack-detector.js are one manifest
  // entry, share one isolated world, and all three want popupHijackEnabled. They
  // each used to fetch it themselves, which on a page with forty iframes is a
  // hundred and twenty IPC round-trips at document_start — the most
  // latency-sensitive moment there is — plus a hundred and twenty
  // storage.onChanged listeners left registered afterwards.
  //
  // So the bridge does the one read and publishes it. The other two await this
  // promise instead of asking the browser. Published on `window` rather than
  // passed around because the three are separate IIFEs with no shared scope; the
  // world is isolated, so the page cannot see or forge it.
  const SHARED = (window.__sieveHijackConfig = window.__sieveHijackConfig || {});
  SHARED.subscribers = SHARED.subscribers || new Set();

  function publish() {
    SHARED.enabled = enabled;
    SHARED.whitelisted = isWhitelisted();
    for (const fn of SHARED.subscribers) {
      try {
        fn(SHARED.enabled);
      } catch {
        /* one bad subscriber must not stop the others */
      }
    }
  }

  let resolveReady;
  SHARED.ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  // Subscribe to later changes. Returns the value at the time of subscribing so
  // a caller does not need to await separately.
  SHARED.subscribe = (fn) => {
    SHARED.subscribers.add(fn);
    return SHARED.ready.then(() => SHARED.enabled);
  };

  async function loadConfig() {
    try {
      const stored = await chrome.storage.local.get({ [ENABLED_KEY]: false, [WHITELIST_KEY]: [] });
      enabled = !!stored[ENABLED_KEY];
      whitelist = Array.isArray(stored[WHITELIST_KEY]) ? stored[WHITELIST_KEY] : [];
    } catch {
      enabled = false;
      whitelist = [];
    }
    publish();
    if (resolveReady) {
      resolveReady();
      resolveReady = null;
    }
    pushConfig();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let changed = false;
    if (changes[ENABLED_KEY]) {
      enabled = !!changes[ENABLED_KEY].newValue;
      changed = true;
    }
    if (changes[WHITELIST_KEY]) {
      whitelist = Array.isArray(changes[WHITELIST_KEY].newValue) ? changes[WHITELIST_KEY].newValue : [];
      changed = true;
    }
    if (changed) {
      publish(); // the two detectors listen here instead of registering their own
      pushConfig();
    }
  });

  // ---------------------------------------------------------------------------
  // Popup messaging (live toggle from the popup pushes straight to the tab).
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    if (message.type === "SET_MODULE_STATE" && message.key === ENABLED_KEY) {
      enabled = !!message.enabled;
      pushConfig();
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });

  loadConfig();
})();

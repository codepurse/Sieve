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
  async function loadConfig() {
    try {
      const stored = await chrome.storage.local.get({ [ENABLED_KEY]: false, [WHITELIST_KEY]: [] });
      enabled = !!stored[ENABLED_KEY];
      whitelist = Array.isArray(stored[WHITELIST_KEY]) ? stored[WHITELIST_KEY] : [];
    } catch {
      enabled = false;
      whitelist = [];
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
    if (changed) pushConfig();
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

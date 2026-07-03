// content/link-hijack-detector.js
// Sieve — Popup & Click Hijack Blocker: hidden-link cleanup (Step 3).
//
// Some hijack pages plant cloaked <a target="_blank"> elements: either pushed
// off-screen / shrunk to a pixel (a decoy a script programmatically clicks), or
// otherwise hidden, all pointing at an unrelated domain. This removes those.
//
// Runs in the ISOLATED world, gated on popupHijackEnabled (OFF by default).
//
// PRECISION OVER RECALL. It removes an <a> ONLY when ALL of these hold:
//   - it has target="_blank" and an href to a DIFFERENT origin than the page
//   - it is positioned (absolute/fixed)
//   - it is actually rendered (non-zero box) AND EITHER
//       · pushed off-screen to negative coordinates (right/bottom <= 1px), OR
//       · shrunk to a sliver (< 8px in some dimension)
//
// Deliberate omissions to protect legitimate links:
//   - We never act on opacity / display:none / visibility:hidden. Collapsed
//     dropdown menus are positioned and full of hidden external _blank links;
//     a "rendered, non-zero box" requirement excludes everything hidden by an
//     ancestor, so those menus are never touched.
//   - Transparent full-area covering links (e.g. Bootstrap .stretched-link, or
//     a real overlay-link) are LEFT ALONE here; the Step 2 overlay remover owns
//     the full-page transparent case behind its own 80%-viewport gate.

(() => {
  "use strict";

  if (window.__sieveLinkHijackActive) return;
  window.__sieveLinkHijackActive = true;

  const ENABLED_KEY = "popupHijackEnabled";
  const SELECTOR = "a[href][target]";
  const TINY_PX = 8;
  const MAX_CANDIDATES = 3000;
  const DEBOUNCE_MS = 300;

  let enabled = false;
  let observer = null;
  let pending = [];
  let debounceTimer = null;
  let removedCount = 0; // surfaced to the popup in Step 5

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  async function loadEnabled() {
    try {
      const stored = await chrome.storage.local.get({ [ENABLED_KEY]: false });
      enabled = !!stored[ENABLED_KEY];
    } catch {
      enabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Signal helpers
  // ---------------------------------------------------------------------------
  function isBlankTarget(a) {
    const t = a.getAttribute("target");
    return !!t && t.trim().toLowerCase() === "_blank";
  }

  function isCrossOrigin(a) {
    let u;
    try {
      u = new URL(a.href, location.href);
    } catch {
      return false;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.origin !== location.origin;
  }

  function isPositioned(cs) {
    return cs.position === "absolute" || cs.position === "fixed";
  }

  function isHiddenHijackLink(a) {
    if (!a || a.nodeType !== 1 || a.tagName !== "A") return false;
    if (!isBlankTarget(a)) return false;
    if (!isCrossOrigin(a)) return false; // same-origin _blank links are normal

    let cs;
    try {
      cs = window.getComputedStyle(a);
    } catch {
      return false;
    }
    if (!isPositioned(cs)) return false;

    let rect;
    try {
      rect = a.getBoundingClientRect();
    } catch {
      return false;
    }
    // Must be a rendered box. This excludes anything collapsed by an ancestor
    // (display:none menus etc.), which report a 0x0 rect.
    if (rect.width <= 0 || rect.height <= 0) return false;

    const offScreen = rect.right <= 1 || rect.bottom <= 1; // shoved up/left off the page
    const tiny = rect.width < TINY_PX || rect.height < TINY_PX; // pixel-sized decoy
    return offScreen || tiny;
  }

  function describe(a) {
    try {
      let s = "a";
      if (a.id) s += "#" + a.id;
      if (a.classList && a.classList.length) {
        s += "." + Array.from(a.classList).slice(0, 2).join(".");
      }
      const href = a.getAttribute("href") || "";
      if (href) s += " → " + href.slice(0, 80);
      return s.slice(0, 160);
    } catch {
      return "(unknown link)";
    }
  }

  function removeLink(a) {
    try {
      a.remove();
      removedCount++;
      // Feed the shared Protection Dashboard stats store.
      try {
        chrome.runtime
          .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "popupHijacks", count: 1 })
          .catch(() => {});
      } catch (err) {
        // Extension context may be unavailable in unusual conditions.
      }
      // Never silent — log every removal so a mistaken one can be spotted.
      console.warn("[Sieve] Removed a hidden click-hijack link:", describe(a));
    } catch {
      /* already detached */
    }
  }

  // ---------------------------------------------------------------------------
  // Scanning (anchor-scoped for efficiency)
  // ---------------------------------------------------------------------------
  function collectAnchors(root, out) {
    if (!root || root.nodeType !== 1 || out.length >= MAX_CANDIDATES) return;
    if (root.tagName === "A") out.push(root);
    let found;
    try {
      found = root.querySelectorAll(SELECTOR);
    } catch {
      return;
    }
    for (let i = 0; i < found.length && out.length < MAX_CANDIDATES; i++) {
      out.push(found[i]);
    }
  }

  function scanFrom(roots) {
    if (!enabled) return;
    const anchors = [];
    for (const root of roots) collectAnchors(root, anchors);
    for (const a of anchors) {
      if (isHiddenHijackLink(a)) removeLink(a);
    }
  }

  function fullScan() {
    if (!enabled || !document.body) return;
    let anchors;
    try {
      anchors = document.querySelectorAll(SELECTOR);
    } catch {
      return;
    }
    for (const a of anchors) {
      if (isHiddenHijackLink(a)) removeLink(a);
    }
  }

  // ---------------------------------------------------------------------------
  // MutationObserver — links can be injected late or cloaked via a later style
  // change, and some sites re-inject after removal.
  // ---------------------------------------------------------------------------
  function flushMutations() {
    debounceTimer = null;
    const batch = pending;
    pending = [];
    if (!enabled) return;
    scanFrom(batch);
  }

  function onMutations(mutations) {
    let queued = false;
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            pending.push(node);
            queued = true;
          }
        }
      } else if (m.type === "attributes" && m.target && m.target.tagName === "A") {
        pending.push(m.target); // style/class/target/href change on an anchor
        queued = true;
      }
    }
    if (!queued) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushMutations, DEBOUNCE_MS);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "target", "href"],
    });
  }

  function stopObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
    pending = [];
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // ---------------------------------------------------------------------------
  // Apply settings / toggle reactions
  // ---------------------------------------------------------------------------
  function applyEnabled() {
    if (enabled) {
      startObserver();
      fullScan();
    } else {
      stopObserver();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[ENABLED_KEY]) return;
    enabled = !!changes[ENABLED_KEY].newValue;
    applyEnabled();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    if (message.type === "GET_LINK_REMOVED_COUNT") {
      sendResponse({ count: removedCount });
      return false;
    }
    if (message.type === "SET_MODULE_STATE" && message.key === ENABLED_KEY) {
      enabled = !!message.enabled;
      applyEnabled();
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });

  // ---------------------------------------------------------------------------
  // Entry point
  // ---------------------------------------------------------------------------
  async function init() {
    await loadEnabled();
    if (!enabled) return; // dormant while OFF

    startObserver();
    fullScan();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fullScan, { once: true });
    }
    window.addEventListener("load", fullScan, { once: true });
  }

  init();
})();

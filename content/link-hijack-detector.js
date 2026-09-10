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
  // A LEADING throttle, not a trailing debounce — see the long note in
  // content/overlay-detector.js. The old `clearTimeout` + `setTimeout` pair let
  // any continuously-mutating page cancel the scan forever, which both stopped
  // the feature working and grew `pending` without bound.
  const THROTTLE_MS = 300;
  const MAX_PENDING = 400;

  let enabled = false;
  let observer = null;
  let pending = new Set();
  let throttleTimer = null;
  let wantFullScan = false;
  let removedCount = 0; // surfaced to the popup in Step 5

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  // Shared with content/popup-hijack-bridge.js — one storage read and one
  // onChanged listener for all three scripts in this manifest entry, instead of
  // three of each per frame. See the note in the bridge.
  async function loadEnabled() {
    const shared = window.__sieveHijackConfig;
    if (shared && shared.subscribe) {
      enabled = !!(await shared.subscribe((on) => {
        enabled = on;
        applyEnabled();
      }));
      return;
    }
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

  // The three tests are separated so a scan can run them in three passes over
  // the whole candidate list rather than all three per element. Reading a
  // computed style between two geometry reads forces the layout to be recomputed
  // for the second one; batching keeps it to a single layout pass per scan.
  //
  // The order also matters: the two free tests reject nearly every anchor on a
  // page before any layout or style is touched at all.

  // 1) free — attributes and a URL parse, no layout, no style.
  function looksLikeHijackCandidate(a) {
    if (!a || a.nodeType !== 1 || a.tagName !== "A") return false;
    if (!isBlankTarget(a)) return false;
    return isCrossOrigin(a); // same-origin _blank links are normal
  }

  // 2) geometry only.
  function isCloaked(a) {
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

  // 3) computed style only — reached by almost nothing.
  function isPositionedEl(a) {
    let cs;
    try {
      cs = window.getComputedStyle(a);
    } catch {
      return false;
    }
    return isPositioned(cs);
  }

  // Kept as one predicate for the console/test hook and for single-element use.
  function isHiddenHijackLink(a) {
    return looksLikeHijackCandidate(a) && isCloaked(a) && isPositionedEl(a);
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

  // One integer per scan rather than one message per removal — see the note in
  // content/comment-collapse.js.
  function report(count) {
    if (count <= 0) return;
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "popupHijacks", count })
        ?.catch(() => {});
    } catch (err) {
      // Extension context may be unavailable in unusual conditions.
    }
  }

  function removeLink(a) {
    try {
      a.remove();
      removedCount++;
      // Never silent — log every removal so a mistaken one can be spotted.
      console.warn("[Sieve] Removed a hidden click-hijack link:", describe(a));
      return true;
    } catch {
      return false; /* already detached */
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

  // Three passes over the list rather than three tests per anchor. Nearly every
  // anchor is dropped by the first, which touches neither layout nor style.
  function judge(anchors) {
    const candidates = [];
    for (const a of anchors) {
      if (looksLikeHijackCandidate(a)) candidates.push(a);
    }
    if (candidates.length === 0) return;

    const cloaked = [];
    for (const a of candidates) {
      if (isCloaked(a)) cloaked.push(a);
    }
    if (cloaked.length === 0) return;

    let removed = 0;
    for (const a of cloaked) {
      if (!a.isConnected) continue;
      if (isPositionedEl(a) && removeLink(a)) removed++;
    }
    report(removed);
  }

  function scanFrom(roots) {
    if (!enabled) return;
    const anchors = [];
    for (const root of roots) collectAnchors(root, anchors);
    judge(anchors);
  }

  function fullScan() {
    if (!enabled || !document.body) return;
    let anchors;
    try {
      anchors = document.querySelectorAll(SELECTOR);
    } catch {
      return;
    }
    judge(anchors);
  }

  // ---------------------------------------------------------------------------
  // MutationObserver — links can be injected late or cloaked via a later style
  // change, and some sites re-inject after removal.
  // ---------------------------------------------------------------------------
  function flushMutations() {
    throttleTimer = null;
    const batch = pending;
    const full = wantFullScan;
    pending = new Set();
    wantFullScan = false;
    if (!enabled) return;
    if (full) fullScan();
    else scanFrom(batch);
  }

  function queueCandidate(node) {
    if (pending.size >= MAX_PENDING) {
      wantFullScan = true; // a whole surface is being replaced; sweep instead
      return;
    }
    pending.add(node);
  }

  function onMutations(mutations) {
    let queued = false;
    for (const m of mutations) {
      if (m.type === "childList") {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            queueCandidate(node);
            queued = true;
          }
        }
      } else if (m.type === "attributes" && m.target && m.target.tagName === "A") {
        queueCandidate(m.target); // style/class/target/href change on an anchor
        queued = true;
      }
    }
    if (!queued) return;
    // Leading edge — never reset. See the note beside THROTTLE_MS.
    if (throttleTimer !== null) return;
    throttleTimer = setTimeout(flushMutations, THROTTLE_MS);
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
    pending = new Set();
    wantFullScan = false;
    clearTimeout(throttleTimer);
    throttleTimer = null;
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

  // Only without the bridge — see the matching note in overlay-detector.js.
  if (!window.__sieveHijackConfig || !window.__sieveHijackConfig.subscribe) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[ENABLED_KEY]) return;
      enabled = !!changes[ENABLED_KEY].newValue;
      applyEnabled();
    });
  }


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

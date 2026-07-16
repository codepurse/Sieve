// content/overlay-detector.js
// Sieve — Popup & Click Hijack Blocker: transparent overlay remover (Step 2).
//
// Hijack pages drop an invisible, full-screen, high-z-index, clickable layer
// over the real page. Any click lands on it instead of what the user aimed at,
// and the layer's handler (or its <a target="_blank">) opens a spam tab.
//
// This runs in the ISOLATED world (it needs chrome.storage for the toggle; DOM
// removal works fine from here since the DOM is shared) and is gated on the
// same popupHijackEnabled flag as the rest of the module — OFF by default.
//
// It removes an element ONLY when ALL FOUR signals hold at once:
//   a) it covers > 80% of the viewport in both dimensions
//   b) it has no visible content (see-through, and no text/media of its own)
//   c) it has a high z-index (intentionally stacked on top)
//   d) it is clickable (an <a>, onclick, role=button/link, or cursor:pointer)
// If only SOME match it does NOTHING — a dimmed modal backdrop, a sticky
// header, a cookie banner, etc. must never be removed. When in doubt, keep it.
//
// LIMITATION: the DOM gives no reliable way to read addEventListener-attached
// click handlers, so signal (d) approximates "has a click listener" with the
// detectable proxies above (cursor:pointer is the strongest of them).

(() => {
  "use strict";

  if (window.__sieveOverlayDetectorActive) return;
  window.__sieveOverlayDetectorActive = true;

  const ENABLED_KEY = "popupHijackEnabled";
  const VIEWPORT_COVER = 0.8; // signal (a): fraction of viewport in each axis
  const Z_INDEX_MIN = 1000; // signal (c): "high" z-index threshold
  const SCAN_DEPTH = 3; // how deep below an added node to look for overlays
  const MAX_CANDIDATES = 3000; // per-flush cap so a giant subtree can't stall us
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
  function safeStyle(el) {
    try {
      return window.getComputedStyle(el);
    } catch {
      return null;
    }
  }

  function coversViewport(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 1 || vh < 1) return false;
    return rect.width >= vw * VIEWPORT_COVER && rect.height >= vh * VIEWPORT_COVER;
  }

  function isSeeThrough(cs) {
    if (parseFloat(cs.opacity) < 0.1) return true; // element itself near-invisible
    const bg = cs.backgroundColor;
    const transparentBg =
      bg === "transparent" ||
      bg === "rgba(0, 0, 0, 0)" ||
      /rgba\([^)]*,\s*0\s*\)$/.test(bg); // any fully-transparent rgba(…, 0)
    const noBgImage = !cs.backgroundImage || cs.backgroundImage === "none";
    return transparentBg && noBgImage;
  }

  function isHighZ(cs) {
    if (cs.position === "static") return false; // z-index only applies when positioned
    const z = parseInt(cs.zIndex, 10);
    return Number.isFinite(z) && z >= Z_INDEX_MIN;
  }

  function isClickable(el, cs) {
    if (el.tagName === "A" && el.hasAttribute("href")) return true;
    if (el.hasAttribute("onclick")) return true;
    const role = el.getAttribute("role");
    if (role === "button" || role === "link") return true;
    if (cs.cursor === "pointer") return true; // best proxy for "captures clicks"
    return false;
  }

  // True if the element actually displays something, so we must NOT remove it.
  // (Skipped when the element is near-zero opacity — then nothing it holds is
  // visible anyway, so an invisible click-catcher is safe to drop.)
  function hasVisibleContent(el) {
    if ((el.textContent || "").trim().length > 0) return true;
    let media;
    try {
      media = el.querySelectorAll("img,video,iframe,canvas,svg,picture,embed,object");
    } catch {
      return false;
    }
    for (let i = 0; i < media.length && i < 30; i++) {
      const m = media[i];
      let r;
      try {
        r = m.getBoundingClientRect();
      } catch {
        continue;
      }
      if (r.width >= 8 && r.height >= 8) {
        const ms = safeStyle(m);
        if (!ms || (ms.display !== "none" && ms.visibility !== "hidden")) return true;
      }
    }
    return false;
  }

  const NEVER_REMOVE = new Set(["HTML", "BODY", "HEAD", "SCRIPT", "STYLE", "LINK", "META"]);

  function isHijackOverlay(el) {
    if (!el || el.nodeType !== 1) return false;
    if (NEVER_REMOVE.has(el.tagName)) return false;

    // a) covers the viewport — do this cheap geometry test FIRST. Almost no
    // element covers the whole viewport, and getBoundingClientRect is far cheaper
    // than getComputedStyle; bailing here avoids forcing a style recalc for the
    // thousands of candidates that fail coverage. (display:none has a zero rect,
    // so it's rejected here too; visibility:hidden is caught by the cs check.)
    let rect;
    try {
      rect = el.getBoundingClientRect();
    } catch {
      return false;
    }
    if (!coversViewport(rect)) return false;

    const cs = safeStyle(el);
    if (!cs) return false;
    if (cs.display === "none" || cs.visibility === "hidden") return false;

    // b) see-through
    if (!isSeeThrough(cs)) return false;
    // c) high z-index
    if (!isHighZ(cs)) return false;
    // d) clickable
    if (!isClickable(el, cs)) return false;

    // Final guard: a near-transparent element shows nothing regardless of what
    // it contains; otherwise (transparent-background path) it must be empty of
    // real content, or it might be a legitimate full-screen container.
    const fullyTransparent = parseFloat(cs.opacity) < 0.1;
    if (!fullyTransparent && hasVisibleContent(el)) return false;

    return true;
  }

  function describe(el) {
    try {
      let s = el.tagName ? el.tagName.toLowerCase() : "node";
      if (el.id) s += "#" + el.id;
      if (el.classList && el.classList.length) {
        s += "." + Array.from(el.classList).slice(0, 2).join(".");
      }
      return s.slice(0, 120);
    } catch {
      return "(unknown element)";
    }
  }

  function removeOverlay(el) {
    try {
      el.remove();
      removedCount++;
      // Feed the shared Protection Dashboard stats store.
      try {
        chrome.runtime
          .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "popupHijacks", count: 1 })
          .catch(() => {});
      } catch (err) {
        // Extension context may be unavailable in unusual conditions.
      }
      // Never silent — surface every removal so a mistaken one can be spotted.
      console.warn("[Sieve] Removed a transparent click-hijack overlay:", describe(el));
    } catch {
      /* element already detached */
    }
  }

  // ---------------------------------------------------------------------------
  // Scanning
  // ---------------------------------------------------------------------------
  function collectCandidates(el, out, depth) {
    if (!el || el.nodeType !== 1 || out.length >= MAX_CANDIDATES) return;
    out.push(el);
    if (depth <= 0) return;
    const kids = el.children;
    for (let i = 0; i < kids.length; i++) collectCandidates(kids[i], out, depth - 1);
  }

  function scanFrom(roots) {
    if (!enabled) return;
    const candidates = [];
    for (const root of roots) collectCandidates(root, candidates, SCAN_DEPTH);
    for (const el of candidates) {
      if (isHijackOverlay(el)) removeOverlay(el);
    }
  }

  function fullScan() {
    if (!enabled || !document.body) return;
    scanFrom([document.body]);
  }

  // ---------------------------------------------------------------------------
  // MutationObserver — overlays are often injected late, and some sites
  // re-inject them after removal, so we keep watching.
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
      } else if (m.type === "attributes" && m.target && m.target.nodeType === 1) {
        // A style/class change can turn an existing element into an overlay.
        pending.push(m.target);
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
    // Observe from documentElement so we catch <body> and everything after it,
    // even though this script runs at document_start.
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
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
  // Apply current settings without a reload.
  // ---------------------------------------------------------------------------
  function applyEnabled() {
    if (enabled) {
      startObserver();
      fullScan();
    } else {
      stopObserver();
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle reactions
  // ---------------------------------------------------------------------------
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[ENABLED_KEY]) return;
    enabled = !!changes[ENABLED_KEY].newValue;
    applyEnabled();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    if (message.type === "GET_OVERLAY_REMOVED_COUNT") {
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
    if (!enabled) return; // stay completely dormant while OFF

    startObserver();
    // Scan whatever exists now, then again as the page reaches its milestones.
    fullScan();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fullScan, { once: true });
    }
    window.addEventListener("load", fullScan, { once: true });
  }

  init();
})();

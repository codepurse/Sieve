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
  // A LEADING throttle, not a trailing debounce. The old code cleared and reset
  // this timer on every mutation batch, so on any page that mutates more often
  // than the delay — a feed, a carousel, a spinner toggling a class — the timer
  // was cancelled before it could ever fire. Three things went wrong at once:
  // the scan never ran (so the feature silently did nothing on exactly the
  // pages most likely to need it), the pending queue grew without bound, and it
  // held the only remaining reference to every detached node in it. Firing on
  // the leading edge and coalescing what arrives during the window fixes all
  // three. Same shape as content/anti-adblock-dom.js.
  const THROTTLE_MS = 300;
  // The queue is bounded now. A burst larger than this is a whole surface being
  // replaced, which the full scan below covers anyway.
  const MAX_PENDING = 400;

  let enabled = false;
  let observer = null;
  let pending = new Set(); // a Set: the same element re-styled twice is one candidate
  let throttleTimer = null;
  let wantFullScan = false; // the queue overflowed; sweep the document instead
  let removedCount = 0; // surfaced to the popup in Step 5

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  // The toggle comes from content/popup-hijack-bridge.js, which is loaded ahead
  // of this file in the same manifest entry and the same isolated world, and
  // which does ONE storage read for all three scripts. See the long note there.
  // Falling back to our own read keeps this file working if it is ever loaded
  // on its own.
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

  // a) covers the viewport. Split out from the rest so every candidate's
  // geometry can be read in ONE pass, before any style is read.
  //
  // The order was already right — cheap rect first, expensive style second —
  // but INTERLEAVING them per element is what actually costs: each
  // getComputedStyle forces the style and layout the previous rect read just
  // settled to be recomputed for the next one. Measured over 3,000 candidates
  // on a dirty layout: 444ms interleaved. Reading all the rects first, then
  // styling only the handful that survive, keeps it to one layout pass — and
  // almost nothing survives, because almost no element covers 80% of the
  // viewport in both axes.
  function coversViewportEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (NEVER_REMOVE.has(el.tagName)) return false;
    let rect;
    try {
      rect = el.getBoundingClientRect();
    } catch {
      return false;
    }
    // (display:none has a zero rect, so it's rejected here too;
    // visibility:hidden is caught by the style check in the second pass.)
    return coversViewport(rect);
  }

  // b-d) everything that needs computed style. Only ever called for elements
  // that already passed coversViewportEl().
  function isHijackOverlay(el) {
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

  // One integer per throttle window rather than one message per removal. See
  // the note in content/comment-collapse.js: each of these messages was a
  // service-worker wake, a storage read, a storage write and a storage.onChanged
  // broadcast to every frame of every open tab.
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

  function removeOverlay(el) {
    try {
      el.remove();
      removedCount++;
      // Never silent — surface every removal so a mistaken one can be spotted.
      console.warn("[Sieve] Removed a transparent click-hijack overlay:", describe(el));
      return true;
    } catch {
      return false; /* element already detached */
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

  // TWO passes, deliberately. Pass one reads only geometry, so the layout is
  // computed once and every rect after that is a cheap read from the same
  // settled state. Pass two reads computed style, but only for the survivors —
  // normally none, occasionally one.
  function judge(candidates) {
    const covering = [];
    for (const el of candidates) {
      if (coversViewportEl(el)) covering.push(el);
    }
    if (covering.length === 0) return;

    let removed = 0;
    for (const el of covering) {
      if (!el.isConnected) continue; // a previous removal took it with the subtree
      if (isHijackOverlay(el) && removeOverlay(el)) removed++;
    }
    report(removed);
  }

  function scanFrom(roots) {
    if (!enabled) return;
    const candidates = [];
    for (const root of roots) collectCandidates(root, candidates, SCAN_DEPTH);
    judge(candidates);
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
      // Genuinely more distinct roots than the cap: a whole surface is being
      // replaced. Say so and sweep the document, rather than silently dropping
      // subtrees and letting an overlay through.
      wantFullScan = true;
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
      } else if (m.type === "attributes" && m.target && m.target.nodeType === 1) {
        // A style/class change can turn an existing element into an overlay.
        queueCandidate(m.target);
        queued = true;
      }
    }
    if (!queued) return;
    // Leading edge: the first burst is scanned after one window, and everything
    // that arrives while the window is open rides along with it. Never reset —
    // resetting is what let a continuously-mutating page starve the scan.
    if (throttleTimer !== null) return;
    throttleTimer = setTimeout(flushMutations, THROTTLE_MS);
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
    pending = new Set();
    wantFullScan = false;
    clearTimeout(throttleTimer);
    throttleTimer = null;
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
  // Only when we are running WITHOUT the bridge. With it, the subscription in
  // loadEnabled() already delivers changes, and registering here too would put
  // a second listener in every frame — which is the cost this shares away.
  if (!window.__sieveHijackConfig || !window.__sieveHijackConfig.subscribe) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[ENABLED_KEY]) return;
      enabled = !!changes[ENABLED_KEY].newValue;
      applyEnabled();
    });
  }

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

// content/dark-patterns.js
// Sieve — Dark Pattern Blocker coordinator (Module 3A).
// Registers individual pattern detectors and runs them on page load and on
// DOM mutations. Tracks how many dark-pattern interventions happen on the
// current page and reports the count to the popup on request.

(() => {
  "use strict";

  if (window.__sieveDarkPatternsActive) return;
  window.__sieveDarkPatternsActive = true;

  const STORAGE_KEYS = {
    master: "darkPatternsEnabled",
    timers: "darkPatternTimersEnabled",
    guiltCopy: "darkPatternGuiltCopyEnabled",
    checkboxes: "darkPatternCheckboxesEnabled",
    cookies: "darkPatternCookiesEnabled",
    scarcity: "darkPatternScarcityEnabled",
  };

  const PATTERN_TYPES = Object.keys(STORAGE_KEYS).filter((k) => k !== "master");

  // In-memory tally for this page only.
  const counts = {};
  for (const type of PATTERN_TYPES) counts[type] = 0;
  let totalCount = 0;

  // Coalescing window for the mutation observer, and the ceiling on how many
  // distinct roots one window may hold before it gives up and rescans the body.
  const THROTTLE_MS = 250;
  const MAX_PENDING = 400;

  let settings = {};
  let observer = null;
  let pendingNodes = new Set();
  let wantFullScan = false;
  let debounceTimer = null;

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async function loadSettings() {
    const defaults = { [STORAGE_KEYS.master]: true };
    for (const type of PATTERN_TYPES) defaults[STORAGE_KEYS[type]] = true;
    settings = await chrome.storage.local.get(defaults);
  }

  function isTypeEnabled(type) {
    return settings[STORAGE_KEYS.master] && settings[STORAGE_KEYS[type]];
  }

  // ---------------------------------------------------------------------------
  // Detector registry
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Word matching, shared by the detectors that read page text.
  //
  // All three of them used `haystack.includes(word)` over a list of short words,
  // and all three were wrong in the same way, because English is full of short
  // words inside longer ones:
  //
  //   "no"     matched Know, Economy, Ignore, Nothing, Announce, Diagnose
  //   "pass"   matched password, passenger, compass
  //   "text"   matched context, textile, next
  //   "ok"     matched Cookie -- on a COOKIE BANNER, which is the one place
  //            that detector runs
  //
  // The consequences were not cosmetic. guilt-copy replaced the words on five
  // ordinary buttons with "No thanks"; checkboxes badged a terms-of-service
  // box; and the cookie leveler picked "Cookie settings" as both the Accept and
  // the Reject button and therefore stood down on exactly the banner it exists
  // for. All three failed silently, because nobody reports a button that still
  // says the right thing.
  //
  // So: match WORDS. A phrase is matched whole, at word boundaries, with the
  // regex built once and cached. Entries that begin or end with punctuation --
  // an emoji, a "×" -- get a plain substring test instead, because \b only
  // anchors against word characters and would never match them.
  //
  // Deliberately NOT global: a `g` regex carries lastIndex between calls, so a
  // cached one would match on one element and skip the next.
  const phraseCache = new Map();

  function phraseRegex(phrase) {
    if (phraseCache.has(phrase)) return phraseCache.get(phrase);
    let re = null;
    const escaped = String(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const left = /^\w/.test(phrase) ? "\\b" : "";
    const right = /\w$/.test(phrase) ? "\\b" : "";
    try {
      re = new RegExp(left + escaped + right, "i");
    } catch (_) {
      re = null; // fall back to includes() below
    }
    phraseCache.set(phrase, re);
    return re;
  }

  /** True if `phrase` appears in `haystack` as a whole word or phrase. */
  function hasWord(haystack, phrase) {
    const text = String(haystack || "");
    if (!text || !phrase) return false;
    const re = phraseRegex(phrase);
    return re ? re.test(text) : text.toLowerCase().includes(String(phrase).toLowerCase());
  }

  /** True if ANY of `phrases` appears in `haystack` as a whole word. */
  function hasAnyWord(haystack, phrases) {
    for (const phrase of phrases) {
      if (hasWord(haystack, phrase)) return true;
    }
    return false;
  }

  const detectors = new Map();

  function registerDetector(type, detector) {
    if (!PATTERN_TYPES.includes(type)) {
      console.warn("[Sieve] Unknown dark pattern type registered:", type);
      return;
    }
    detectors.set(type, detector);
  }

  // ---------------------------------------------------------------------------
  // The shared text walk.
  //
  // Two detectors — timers and scarcity — used to do the same thing: build a
  // TreeWalker over every text node under the root, with a JS acceptNode filter
  // testing one regex, and act on the parents of the nodes that matched. Two
  // walks, over the same nodes, in the same pass, neither aware of the other.
  // Measured separately on a 112,000-element page: 57.8ms and 38.7ms.
  //
  // The walk is the expensive half, not the regex, so they now share one. A
  // detector declares its pattern and what to do with a match, and this does a
  // single pass testing every active pattern per node.
  //
  // Note the `null` filter: a JS acceptNode callback is invoked for every node
  // in the subtree, across the JS/C++ boundary. Filtering in the loop instead
  // keeps the walk itself native.
  const textVisitors = []; // { type, pattern, onMatch }

  // Nothing any registered pattern can match is shorter than this. "0:00" is
  // the shortest thing TIME_TEXT_RE accepts.
  const MIN_TEXT_LENGTH = 4;

  function registerTextVisitor(type, pattern, onMatch) {
    if (!PATTERN_TYPES.includes(type)) {
      console.warn("[Sieve] Unknown dark pattern type registered:", type);
      return;
    }
    if (!(pattern instanceof RegExp) || typeof onMatch !== "function") {
      console.warn("[Sieve] registerText needs a RegExp and a function:", type);
      return;
    }
    if (pattern.global || pattern.sticky) {
      // lastIndex would carry between nodes and make every other test miss.
      console.warn("[Sieve] registerText refuses a g/y pattern:", type);
      return;
    }
    textVisitors.push({ type, pattern, onMatch });
  }

  function scanTextNodes(root) {
    const active = textVisitors.filter((v) => isTypeEnabled(v.type));
    if (active.length === 0) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue;
      if (!value || value.length < MIN_TEXT_LENGTH) continue;
      const el = node.parentElement;
      if (!el || isMarked(el)) continue;
      for (const visitor of active) {
        if (!visitor.pattern.test(value)) continue;
        try {
          visitor.onMatch(el, detectorCtx);
        } catch (err) {
          console.error("[Sieve] Dark pattern text visitor failed:", visitor.type, err);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Element marking helpers — avoid processing the same element twice.
  // ---------------------------------------------------------------------------

  const DATA_ATTR = "data-sieve-dp";

  function markElement(el, type) {
    if (el && el.nodeType === Node.ELEMENT_NODE) {
      el.setAttribute(DATA_ATTR, type);
    }
  }

  function isMarked(el) {
    return el && el.nodeType === Node.ELEMENT_NODE && el.hasAttribute(DATA_ATTR);
  }

  // ---------------------------------------------------------------------------
  // Counting + reporting
  // ---------------------------------------------------------------------------

  function reportIntervention(type, delta) {
    if (!delta || delta < 1) return;
    counts[type] = (counts[type] || 0) + delta;
    totalCount += delta;

    // Also feed the shared Protection Dashboard stats store.
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "darkPatterns", count: delta })
        .catch(() => {});
    } catch (err) {
      // Extension context may be unavailable in unusual conditions.
    }
  }

  function getCounts() {
    return { total: totalCount, byType: { ...counts } };
  }

  // Interface handed to each detector's scan(). Detectors call ctx.mark,
  // ctx.isMarked, ctx.report, and ctx.counts — keep these names in sync with
  // the public SieveDarkPatterns API below.
  const detectorCtx = {
    mark: markElement,
    isMarked,
    report: reportIntervention,
    counts: getCounts,
    hasWord,
    hasAnyWord,
  };

  // ---------------------------------------------------------------------------
  // Scanning
  // ---------------------------------------------------------------------------

  function scanRoot(root) {
    if (!settings[STORAGE_KEYS.master]) return;
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

    for (const type of PATTERN_TYPES) {
      if (!isTypeEnabled(type)) continue;
      const detector = detectors.get(type);
      if (!detector || typeof detector.scan !== "function") continue;

      try {
        const delta = detector.scan(root, detectorCtx);
        reportIntervention(type, delta);
      } catch (err) {
        console.error("[Sieve] Dark pattern detector failed:", type, err);
      }
    }

    // One text pass for every detector that wants text, after the
    // selector-based ones have had their turn.
    scanTextNodes(root);
  }

  // ---------------------------------------------------------------------------
  // MutationObserver — debounced so dynamic feeds don't kill performance.
  // ---------------------------------------------------------------------------

  function flushMutations() {
    debounceTimer = null;
    const batch = pendingNodes;
    const full = wantFullScan;
    pendingNodes = new Set();
    wantFullScan = false;
    if (!settings[STORAGE_KEYS.master]) return;
    if (full) {
      if (document.body) scanRoot(document.body);
      return;
    }

    // Build a minimal set of roots (skip nested children when parent is scanned).
    //
    // This used to walk every descendant of every added node into a WeakSet —
    // `for (const child of node.querySelectorAll("*")) skip.add(child)` — which
    // is O(total descendants) work to save a dedupe. A feed adding a hundred
    // 500-element cards paid fifty thousand WeakSet inserts per flush, and the
    // set was rebuilt from scratch every time. Asking each candidate whether an
    // ALREADY-CHOSEN root contains it costs a handful of `contains` calls
    // instead, because there are only ever a few roots.
    const roots = [];
    for (const node of batch) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (!node.isConnected) continue; // removed again before we got to it
      let covered = false;
      for (const root of roots) {
        if (root.contains(node)) {
          covered = true;
          break;
        }
      }
      if (!covered) roots.push(node);
    }

    for (const root of roots) scanRoot(root);
  }

  function onMutations(mutations) {
    let hasAdded = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        hasAdded = true;
        if (pendingNodes.size >= MAX_PENDING) {
          wantFullScan = true; // a whole surface is being replaced
          continue;
        }
        pendingNodes.add(node);
      }
    }
    if (!hasAdded) return;

    // A LEADING throttle. The old code cleared and reset this timer on every
    // batch, so a page mutating more often than the delay — any feed, any
    // carousel, any live ticker — cancelled the flush forever: the detectors
    // never ran, and pendingNodes grew without bound holding detached elements.
    if (debounceTimer !== null) return;
    debounceTimer = setTimeout(flushMutations, THROTTLE_MS);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    // Only childList/subtree: onMutations reacts to added element nodes. We don't
    // observe characterData — text-only edits produced records the callback threw
    // away, so watching them just added observer overhead on live pages (clocks,
    // tickers, chat). Detectors that need re-sampling (timers) poll on their own.
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
    // Drop the queue too, or a disabled blocker keeps a page's detached nodes
    // alive until the next navigation.
    pendingNodes = new Set();
    wantFullScan = false;
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // ---------------------------------------------------------------------------
  // Apply current settings without a full page reload.
  // ---------------------------------------------------------------------------

  async function applySettings() {
    const wasEnabled = settings[STORAGE_KEYS.master];
    await loadSettings();
    const isEnabled = settings[STORAGE_KEYS.master];

    if (isEnabled) {
      if (!wasEnabled) scanRoot(document.body);
      startObserver();
    } else {
      stopObserver();
    }
  }

  // ---------------------------------------------------------------------------
  // Messaging with the popup.
  // ---------------------------------------------------------------------------

  function setupMessaging() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message) return false;

      if (message.type === "GET_DARK_PATTERN_COUNTS") {
        sendResponse(getCounts());
        return false;
      }

      if (message.type === "SET_MODULE_STATE" && message.key === STORAGE_KEYS.master) {
        applySettings().then(() => sendResponse({ ok: true }));
        return true;
      }

      return false;
    });
  }

  // ---------------------------------------------------------------------------
  // Public API for pattern files.
  // ---------------------------------------------------------------------------

  window.SieveDarkPatterns = {
    register: registerDetector,
    registerText: registerTextVisitor,
    ...detectorCtx,
  };

  // ---------------------------------------------------------------------------
  // Entry point
  // ---------------------------------------------------------------------------

  async function init() {
    await loadSettings();
    setupMessaging();

    if (settings[STORAGE_KEYS.master]) {
      scanRoot(document.body);
      startObserver();
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const relevant = Object.values(STORAGE_KEYS).some((k) => k in changes);
      if (relevant) applySettings();
    });
  }

  // Content scripts run at document_idle, but detectors register synchronously
  // from their own script files. Yield once so all registrations complete.
  setTimeout(init, 0);
})();

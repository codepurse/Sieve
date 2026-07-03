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

  let settings = {};
  let observer = null;
  let pendingNodes = [];
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

  const detectors = new Map();

  function registerDetector(type, detector) {
    if (!PATTERN_TYPES.includes(type)) {
      console.warn("[Sieve] Unknown dark pattern type registered:", type);
      return;
    }
    detectors.set(type, detector);
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
  }

  // ---------------------------------------------------------------------------
  // MutationObserver — debounced so dynamic feeds don't kill performance.
  // ---------------------------------------------------------------------------

  function flushMutations() {
    debounceTimer = null;
    const batch = pendingNodes;
    pendingNodes = [];
    if (!settings[STORAGE_KEYS.master]) return;

    // Build a minimal set of roots (skip nested children when parent is scanned).
    const roots = [];
    const skip = new WeakSet();
    for (const node of batch) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (skip.has(node)) continue;
      roots.push(node);
      for (const child of node.querySelectorAll("*")) skip.add(child);
    }

    for (const root of roots) scanRoot(root);
  }

  function onMutations(mutations) {
    let hasAdded = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          pendingNodes.push(node);
          hasAdded = true;
        }
      }
    }
    if (!hasAdded) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushMutations, 250);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function stopObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
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

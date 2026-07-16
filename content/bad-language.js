// content/bad-language.js
// Sieve — Bad Language Filter (Module 1A).
// Scans visible text and replaces profanity using the user's chosen style,
// optionally including milder words (family-safe) and their own custom words.

(() => {
  "use strict";

  // Guard: never run the filter twice on the same page.
  if (window.__sieveBadLanguageActive) return;
  window.__sieveBadLanguageActive = true;

  // Tags whose text we must never touch (code, styles, editable fields). These
  // are checked up the whole ANCESTOR chain, not just the immediate parent:
  // syntax highlighters wrap code in nested <span>s inside <pre><code>, so a text
  // node's direct parent is often a <span>, not CODE/PRE.
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
  const SKIP_SELECTOR = "script,style,noscript,textarea,code,pre";

  // Bundled word lists, loaded once.
  let baseWords = null; // data/wordlist.json
  let mildWords = null; // data/mild-words.json

  // Live settings (mirrors chrome.storage.local).
  let settings = { enabled: true, style: "funny", familySafe: false, customWords: [] };

  // Active filtering state.
  let observer = null;
  let activeMap = {}; // word -> clean alternative (null = no funny alternative)
  let pattern = null; // compiled whole-word regex
  let recordedForPage = false; // shared stats: only record once per page
  let modifiedAny = false; // did we change any node? gates the restore walk

  // --- Load a bundled JSON file -------------------------------------------
  async function loadJson(path) {
    try {
      const res = await fetch(chrome.runtime.getURL(path));
      return await res.json();
    } catch (err) {
      console.error("[Sieve] Could not load", path, err);
      return {};
    }
  }

  // --- Load the two bundled word lists once -------------------------------
  async function loadData() {
    if (!baseWords) baseWords = await loadJson("data/wordlist.json");
    if (!mildWords) mildWords = await loadJson("data/mild-words.json");
  }

  // --- Read the user's settings from storage ------------------------------
  async function loadSettings() {
    const s = await chrome.storage.local.get({
      badLanguageEnabled: true,
      replacementStyle: "blanks",
      familySafe: false,
      customWords: [],
    });
    return {
      enabled: s.badLanguageEnabled,
      style: s.replacementStyle,
      familySafe: s.familySafe,
      customWords: s.customWords,
    };
  }

  // --- Build the active word -> replacement map from current settings -----
  function buildActiveMap() {
    const map = { ...baseWords };
    if (settings.familySafe) Object.assign(map, mildWords);
    for (const word of settings.customWords) {
      const key = word.toLowerCase();
      if (!(key in map)) map[key] = null; // custom word: no funny alternative
    }
    return map;
  }

  // --- Build one case-insensitive, whole-word regex -----------------------
  function buildPattern(words) {
    const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi");
  }

  // --- Decide the replacement for one matched word ------------------------
  function maskWord(match) {
    return match.length > 1 ? match[0] + "*".repeat(match.length - 1) : "*";
  }
  function computeReplacement(match) {
    if (settings.style === "blanks") return "█".repeat(match.length);
    if (settings.style === "asterisks") return maskWord(match);
    // "funny": use the clean alternative, or mask custom words that lack one.
    const clean = activeMap[match.toLowerCase()];
    return clean ? clean : maskWord(match);
  }

  // --- Replace every matched word in a string -----------------------------
  function cleanText(text) {
    return text.replace(pattern, (match) => computeReplacement(match));
  }

  // --- Decide whether a text node is safe to scan -------------------------
  function shouldScan(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    // isContentEditable is inherited, so testing the immediate parent is enough.
    if (parent.isContentEditable) return false;
    // Skip tags, however, must be checked up the ancestor chain (see SKIP_TAGS).
    if (parent.closest(SKIP_SELECTOR)) return false;
    return true;
  }

  // --- Collect every scannable text node under a root ---------------------
  function collectTextNodes(root) {
    // If the whole subtree sits inside a skip context (e.g. an added node inside
    // an existing <pre>), reject it in one check rather than per text node.
    if (root.nodeType === Node.ELEMENT_NODE && root.closest(SKIP_SELECTOR)) return [];

    // Walk elements + text so we can PRUNE skip-tag / editable subtrees wholesale
    // (FILTER_REJECT skips the element and everything under it) instead of testing
    // each text node's ancestry individually.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (SKIP_TAGS.has(node.nodeName) || node.isContentEditable) {
            return NodeFilter.FILTER_REJECT; // prune this element and its subtree
          }
          return NodeFilter.FILTER_SKIP; // descend into it, but don't collect it
        }
        return NodeFilter.FILTER_ACCEPT; // a text node with clean ancestry
      },
    });
    const nodes = [];
    let current;
    while ((current = walker.nextNode())) nodes.push(current);
    return nodes;
  }

  // --- Shared stats: record one protection event per page ------------------
  function recordBadLanguageBlock() {
    if (recordedForPage) return;
    recordedForPage = true;
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "badLanguage", count: 1 })
        .catch(() => {});
    } catch (err) {
      // Extension context may be unavailable in unusual conditions.
    }
  }

  // --- Scan a single text node, remembering the original if changed -------
  function scanNode(node) {
    const original = node.nodeValue;
    const cleaned = cleanText(original);
    if (cleaned !== original) {
      if (node.__sieveOriginal === undefined) node.__sieveOriginal = original;
      node.nodeValue = cleaned;
      modifiedAny = true;
      recordBadLanguageBlock();
    }
  }

  // --- Idle-batched scanning ----------------------------------------------
  // The initial full-page scan (and large added subtrees) can touch tens of
  // thousands of text nodes. Mirror profanity-filter.js: collect the nodes, then
  // mask them in requestIdleCallback slices so the page is never blocked by one
  // long task on load.
  const ric =
    window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 16 }), 0));
  let scanQueue = [];
  let flushScheduled = false;

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    ric((deadline) => {
      flushScheduled = false;
      let processed = 0;
      while (scanQueue.length && (deadline.timeRemaining() > 4 || processed < 50)) {
        scanNode(scanQueue.shift());
        processed++;
        if (processed >= 400) break; // hard cap per slice
      }
      if (scanQueue.length) scheduleFlush();
    });
  }

  // --- Queue every scannable text node under a root for idle processing ----
  function enqueueSubtree(root) {
    const nodes = collectTextNodes(root);
    if (nodes.length === 0) return;
    for (const n of nodes) scanQueue.push(n);
    scheduleFlush();
  }

  // --- Put back every word the filter replaced ----------------------------
  function restoreOriginals() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.__sieveOriginal !== undefined) {
        node.nodeValue = node.__sieveOriginal;
        delete node.__sieveOriginal;
      }
    }
  }

  // --- Watch for dynamically added / changed content ----------------------
  function createObserver() {
    return new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          if (shouldScan(mutation.target)) scanNode(mutation.target);
        } else if (mutation.type === "childList") {
          for (const added of mutation.addedNodes) {
            if (added.nodeType === Node.TEXT_NODE) {
              if (shouldScan(added)) scanNode(added);
            } else if (added.nodeType === Node.ELEMENT_NODE) {
              enqueueSubtree(added);
            }
          }
        }
      }
    });
  }

  // --- Turn filtering ON with the current settings ------------------------
  async function enableFilter() {
    await loadData();
    activeMap = buildActiveMap();
    const words = Object.keys(activeMap);
    if (words.length === 0) return;
    pattern = buildPattern(words);
    enqueueSubtree(document.body);
    observer = createObserver();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // --- Tear down current filtering and restore the page -------------------
  function teardownFilter() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    // Drop any not-yet-processed nodes so a disabled filter stops working.
    scanQueue = [];
    // Only walk the whole document to restore text if we actually changed
    // something. On a normal load (filter off, or nothing matched) this skips a
    // full-page TreeWalker that previously ran on every init regardless.
    if (modifiedAny) {
      restoreOriginals();
      modifiedAny = false;
    }
  }

  // --- Apply current settings (called on load and on any settings change) -
  async function applyCurrentSettings() {
    teardownFilter();
    if (settings.enabled) await enableFilter();
  }

  // --- Entry point: load settings, apply, and react to changes ------------
  const WATCHED_KEYS = ["badLanguageEnabled", "replacementStyle", "familySafe", "customWords"];

  async function init() {
    settings = await loadSettings();
    await applyCurrentSettings();

    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local") return;
      if (!WATCHED_KEYS.some((k) => k in changes)) return;
      settings = await loadSettings();
      await applyCurrentSettings();
    });
  }

  init();
})();

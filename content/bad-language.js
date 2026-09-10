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

  // Deliberately NOT global: a `g` regex carries lastIndex between calls, so a
  // shared one would match on one node and skip the next. Same reason
  // common/keyword-pattern.js refuses the flag outright.
  const NON_SPACE_RE = /\S/;

  // The word lists, INLINE.
  //
  // These used to be data/wordlist.json and data/mild-words.json, fetched with
  // chrome.runtime.getURL on every page load of every tab. Two round-trips and
  // two JSON parses, before the first scan could start, for 865 bytes — and
  // they had to sit in web_accessible_resources to be fetchable at all, which
  // hands every page on the internet a reliable way to detect that Sieve is
  // installed (request the URL; a 200 means Sieve). Inlining removes the
  // round-trips, takes the wait off the critical path, and closes that probe.
  //
  // The value is the "funny" replacement; the key is what gets matched. There
  // is deliberately no second copy in data/ — one source of truth, no drift.
  const BASE_WORDS = {
    arse: "bum", arsehole: "grump", ass: "butt", asshole: "jerk",
    bastard: "meanie", bitch: "meanie", bloody: "blooming", bollocks: "nonsense",
    bugger: "rascal", bullshit: "nonsense", cock: "rooster", crap: "crud",
    cunt: "meanie", damn: "darn", dick: "jerk", dickhead: "jerk",
    douche: "jerk", douchebag: "jerk", dumbass: "silly", fuck: "fudge",
    fucked: "messed", fucker: "fudger", fucking: "freaking", goddamn: "golly",
    hell: "heck", jackass: "jerk", motherfucker: "motherfudger", piss: "tick",
    pissed: "ticked", prick: "jerk", shit: "shoot", shitty: "lousy",
    slut: "meanie", twat: "twit", wanker: "wally", whore: "meanie",
  };

  // Milder words, folded in only when the user asks for family-safe.
  const MILD_WORDS = {
    stupid: "silly", idiot: "goofball", dumb: "silly", moron: "goofball",
    loser: "underdog", sucks: "stinks", suck: "stink", sucked: "stunk",
    fart: "toot", farted: "tooted", farting: "tooting", screwed: "messed up",
    crappy: "lousy", lame: "weak",
  };

  // Live settings (mirrors chrome.storage.local).
  let settings = { enabled: true, style: "funny", familySafe: false, customWords: [] };

  // Active filtering state.
  let observer = null;
  let activeMap = {}; // word -> clean alternative (null = no funny alternative)
  let pattern = null; // compiled whole-word regex (literal entries)
  let customPatterns = []; // user /regex/ entries, compiled separately
  let recordedForPage = false; // shared stats: only record once per page
  let modifiedAny = false; // did we change any node? gates the restore walk

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

  // A custom word written as /…/ is a regular expression rather than a literal,
  // so one entry covers many spellings. Literals keep their existing
  // whole-word behaviour, so lists written before this are unaffected.
  function isRegexWord(word) {
    return typeof KeywordPattern !== "undefined" && KeywordPattern.isRegexEntry(word);
  }

  // --- Build the active word -> replacement map from current settings -----
  function buildActiveMap() {
    const map = { ...BASE_WORDS };
    if (settings.familySafe) Object.assign(map, MILD_WORDS);
    for (const word of settings.customWords) {
      if (isRegexWord(word)) continue; // a pattern has no single key to map
      const key = word.toLowerCase();
      if (!(key in map)) map[key] = null; // custom word: no funny alternative
    }
    return map;
  }

  // --- Build one case-insensitive, whole-word regex -----------------------
  function buildPattern(words) {
    const literals = words.filter((w) => !isRegexWord(w));
    const escaped = literals.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return escaped.length ? new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi") : null;
  }

  // The length of the shortest literal in play, used to reject a text node
  // before the regex ever sees it. A custom /regex/ entry could match a single
  // character, so any of those drops the floor to 1 — correctness first; the
  // blank-node test in scanNode still does most of the work.
  function shortestMatchLength(words) {
    if (customPatterns.length > 0) return 1;
    let shortest = Infinity;
    for (const word of words) {
      if (word.length < shortest) shortest = word.length;
    }
    return Number.isFinite(shortest) ? Math.max(1, shortest) : 1;
  }

  // Each user pattern compiled separately, with `g` added so replace() covers
  // every occurrence. KeywordPattern refuses `g` on the patterns it hands back
  // because a shared global regex breaks repeated .test() calls through
  // lastIndex — String.replace resets it, so adding g here is safe, and needed.
  //
  // compileEntry() also runs the slow-pattern guard, so a catastrophic pattern
  // that somehow reached storage is skipped rather than run against page text.
  function buildCustomPatterns(words) {
    if (typeof KeywordPattern === "undefined") return [];
    const out = [];
    for (const word of words) {
      if (!isRegexWord(word)) continue;
      const compiled = KeywordPattern.compileEntry(word);
      if (!compiled) continue; // invalid or unsafe — ignore this entry
      try {
        const flags = compiled.flags.includes("g") ? compiled.flags : compiled.flags + "g";
        out.push(new RegExp(compiled.source, flags));
      } catch (_) {
        /* skip */
      }
    }
    return out;
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
    let out = pattern ? text.replace(pattern, (match) => computeReplacement(match)) : text;
    for (const re of customPatterns) {
      out = out.replace(re, (match) => computeReplacement(match));
    }
    return out;
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

  // The shortest thing any active pattern could match. A node shorter than this
  // cannot contain a banned word, so it never reaches the regex. Recomputed
  // whenever the word list changes; a custom /regex/ entry has no knowable
  // minimum, so its presence drops the floor to 1 and the check becomes the
  // blank-node test alone.
  let minMatchLength = 1;

  // --- Scan a single text node, remembering the original if changed -------
  function scanNode(node) {
    const original = node.nodeValue;
    // HALF the text nodes on a real page are the whitespace between tags —
    // 64,002 of 128,002 measured on a long thread — and every one of them used
    // to be handed to the word regex. A length test and a whitespace test are
    // both far cheaper than the match they replace.
    if (original.length < minMatchLength) return;
    if (!NON_SPACE_RE.test(original)) return;
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

  // A CURSOR, not shift(). The queue holds every text node in the document, and
  // V8 only keeps its cheap left-trim for shift() while the array is small —
  // past roughly sixteen thousand elements each call becomes a memmove of the
  // whole remaining queue. Measured on a 128,000-node page: 503ms of pure
  // overhead to drain by shift(), 0.9ms to drain by index. The slice guard
  // below cannot save us from it either, because the cost is paid inside the
  // loop body and the deadline is only re-read afterwards.
  //
  // The cursor is reset — and the backing array actually emptied — only once
  // the queue is drained, so a long page does not hold its node list twice.
  let scanQueue = [];
  let queueHead = 0;
  let flushScheduled = false;

  function clearQueue() {
    scanQueue = [];
    queueHead = 0;
  }

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    ric((deadline) => {
      flushScheduled = false;
      let processed = 0;
      while (queueHead < scanQueue.length && (deadline.timeRemaining() > 4 || processed < 50)) {
        scanNode(scanQueue[queueHead++]);
        processed++;
        if (processed >= 400) break; // hard cap per slice
      }
      if (queueHead < scanQueue.length) scheduleFlush();
      else clearQueue(); // drained — drop the node references
    });
  }

  // --- Queue every scannable text node under a root for idle processing ----
  function enqueueSubtree(root) {
    const nodes = collectTextNodes(root);
    if (nodes.length === 0) return;
    // Compact away the drained prefix before growing the queue again, so a page
    // that keeps adding content does not keep a pointer to every node it has
    // ever shown.
    if (queueHead > 0 && queueHead === scanQueue.length) clearQueue();
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
    activeMap = buildActiveMap();
    const words = Object.keys(activeMap);
    customPatterns = buildCustomPatterns(settings.customWords || []);
    // A list of nothing but regex entries still has work to do, so this can no
    // longer bail on an empty word map alone.
    if (words.length === 0 && customPatterns.length === 0) return;
    pattern = buildPattern(words);
    minMatchLength = shortestMatchLength(words);
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
    clearQueue();
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

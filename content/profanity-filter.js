// content/profanity-filter.js
// Sieve — Toxic Comment Hider, LAYER 1 (Module 4A).
//
// Always-on, zero-download word-list filter. It finds individual comments on
// supported sites (YouTube, Reddit, X/Twitter, Disqus), scans their text for
// banned words using WHOLE-WORD matching (so "Scunthorpe" never trips "cunt"),
// also catches leetspeak / spaced-out bypasses, and FLAGS toxic comments.
//
// The actual collapse UI (reason label + "Show anyway") arrives in Step 3 as
// content/comment-collapse.js. Until that file exists, this layer falls back to
// a simple visible marker so detection can be tested on its own. They talk
// through the shared window.__sieveToxic namespace — no edits needed when the
// collapse UI lands.
//
// Performance: matching is pure-regex (microseconds per comment). Work is done
// in requestIdleCallback batches and driven by a MutationObserver so lazy-loaded
// / infinite-scroll comments are picked up without ever blocking the page.

(() => {
  "use strict";

  // One instance per frame (Disqus runs us inside its iframe).
  if (window.__sieveProfanityActive) return;
  window.__sieveProfanityActive = true;

  // Shared namespace — Layer 2 (the model) and the collapse UI plug in here.
  const Sieve = (window.__sieveToxic = window.__sieveToxic || {});

  // ----------------------------------------------------------------------------
  // Site configs: where comments live and where each comment's text sits.
  // `unit` = the element we collapse. `text` = the text container inside it.
  // ----------------------------------------------------------------------------
  const SITE_CONFIGS = [
    {
      name: "youtube",
      match: (h) => h.endsWith("youtube.com"),
      unit: "ytd-comment-view-model, ytd-comment-renderer",
      text: "#content-text",
    },
    {
      name: "reddit",
      match: (h) => h.endsWith("reddit.com"),
      unit: "shreddit-comment, .thing.comment",
      text: '[slot="comment"], .usertext-body',
    },
    {
      name: "twitter",
      match: (h) => h.endsWith("twitter.com") || h.endsWith("x.com"),
      unit: 'article[data-testid="tweet"]',
      text: '[data-testid="tweetText"]',
    },
    {
      name: "disqus",
      match: (h) => h.endsWith("disqus.com"),
      unit: ".post",
      text: ".post-message",
    },
  ];

  function detectSite() {
    const host = location.hostname;
    return SITE_CONFIGS.find((s) => s.match(host)) || null;
  }

  const site = detectSite();
  if (!site) return; // not a comment surface we understand — do nothing.

  // ----------------------------------------------------------------------------
  // Leetspeak / bypass normalization.
  // A 1:1 character map (length preserved, so word boundaries stay put).
  // ----------------------------------------------------------------------------
  const LEET_MAP = {
    "@": "a", "4": "a",
    "8": "b",
    "3": "e",
    "6": "g",
    "1": "i", "!": "i", "|": "i",
    "0": "o",
    "$": "s", "5": "s",
    "7": "t",
  };
  const LEET_RE = /[@48361!|0$57]/g;
  const deLeet = (s) => s.replace(LEET_RE, (c) => LEET_MAP[c] || c);

  // Collapse 3+ identical chars to 1 ("fuuuuck" -> "fuck"). Used as an EXTRA
  // pass, never the only one, so legit doubles ("ass") are still caught.
  const squeeze = (s) => s.replace(/(.)\1{2,}/g, "$1");

  // Matches a run of single letters split by separators: "f u c k", "f.u.c.k",
  // "f_u_c_k", "f-u-c-k", "f*u*c*k". Deliberately requires SINGLE letters so it
  // never merges real words like "hello world".
  const SPACED_RE = /\b[a-z0-9@$|!](?:[\s._*\-]+[a-z0-9@$|!])+\b/gi;

  // ----------------------------------------------------------------------------
  // Dictionary state (rebuilt when settings change).
  // ----------------------------------------------------------------------------
  let baseList = null; // data/profanity-list.json (array)
  let customSupplement = null; // data/profanity-custom.json ({ words: [] })

  let activeSet = new Set(); // every active banned term (post exceptions/length)
  let wordRegex = null; // \b(...)\b for normal word-like terms
  let symbolTerms = []; // terms \b can't bound (e.g. the 🖕 emoji)
  let severeSet = new Set(); // strong slurs — used by "Light" sensitivity

  // Curated strong-slur set; intersected with the active list at build time.
  // Only used so "Light" sensitivity still hides a lone slur.
  const SEVERE_CANDIDATES = [
    "nigger", "nigga", "faggot", "fag", "retard", "cunt", "spic", "chink",
    "kike", "wetback", "tranny", "coon", "beaner", "gook", "paki",
  ];

  // Built-in exceptions (never flagged). "xx" = affectionate kisses.
  // User-supplied exceptions (Step 4) are merged on top of these.
  const DEFAULT_EXCEPTIONS = ["xx"];

  // ----------------------------------------------------------------------------
  // Settings (full UI arrives in Step 4; these are the live defaults).
  // ----------------------------------------------------------------------------
  let settings = {
    enabled: true,
    sensitivity: "moderate", // strict | moderate | light
    siteToggles: {}, // { youtube:false, ... } — absent = on
    customWords: [],
    exceptions: [],
  };

  const WATCHED_KEYS = [
    "toxicHiderEnabled",
    "toxicSensitivity",
    "toxicSiteToggles",
    "toxicCustomWords",
    "toxicExceptions",
  ];

  async function loadSettings() {
    const s = await chrome.storage.local.get({
      toxicHiderEnabled: true,
      toxicSensitivity: "moderate",
      toxicSiteToggles: {},
      toxicCustomWords: [],
      toxicExceptions: [],
    });
    return {
      enabled: s.toxicHiderEnabled,
      sensitivity: s.toxicSensitivity,
      siteToggles: s.toxicSiteToggles || {},
      customWords: s.toxicCustomWords || [],
      exceptions: s.toxicExceptions || [],
    };
  }

  // True if the hider should be active on THIS site right now.
  function isActiveHere() {
    if (!settings.enabled) return false;
    return settings.siteToggles[site.name] !== false; // default on
  }

  // ----------------------------------------------------------------------------
  // Build the active dictionary + regexes from current settings.
  // ----------------------------------------------------------------------------
  async function loadJson(path) {
    try {
      const res = await fetch(chrome.runtime.getURL(path));
      return await res.json();
    } catch (err) {
      console.error("[Sieve] Could not load", path, err);
      return null;
    }
  }

  async function ensureData() {
    if (!baseList) baseList = (await loadJson("data/profanity-list.json")) || [];
    if (!customSupplement)
      customSupplement = (await loadJson("data/profanity-custom.json")) || { words: [] };
  }

  function lettersOnlyLen(w) {
    return w.replace(/[^a-z0-9]/gi, "").length;
  }

  function buildDictionary() {
    // Shortest term allowed, by sensitivity (drops ambiguous "ho"/"xx" etc.).
    const minLen = settings.sensitivity === "strict" ? 1 : 3;

    const exceptions = new Set(
      [...DEFAULT_EXCEPTIONS, ...settings.exceptions].map((w) => w.toLowerCase().trim())
    );

    const raw = [
      ...baseList,
      ...(customSupplement.words || []),
      ...settings.customWords,
    ].map((w) => String(w).toLowerCase().trim());

    activeSet = new Set();
    const wordLike = [];
    symbolTerms = [];

    for (const w of raw) {
      if (!w || exceptions.has(w)) continue;
      if (lettersOnlyLen(w) < minLen) continue;
      if (activeSet.has(w)) continue;
      activeSet.add(w);
      // \b only bounds word characters; terms like "🖕" need substring matching.
      if (/^[\w].*[\w]$/.test(w) || /^\w$/.test(w)) wordLike.push(w);
      else symbolTerms.push(w);
    }

    const escaped = wordLike
      .sort((a, b) => b.length - a.length) // longest-first: prefer phrases
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    wordRegex = escaped.length ? new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi") : null;

    severeSet = new Set(SEVERE_CANDIDATES.filter((w) => activeSet.has(w)));
  }

  // ----------------------------------------------------------------------------
  // Matching: collect every banned term found in a comment's text.
  // ----------------------------------------------------------------------------
  function collectMatches(text) {
    const found = new Set();
    if (!text) return found;

    const base = text.toLowerCase();
    const leet = deLeet(base);
    const variants = [base, leet, squeeze(leet)];

    if (wordRegex) {
      for (const v of variants) {
        for (const m of v.matchAll(wordRegex)) found.add(m[1]);
      }
    }
    for (const t of symbolTerms) {
      if (base.includes(t)) found.add(t);
    }
    // Spaced-out bypass: collapse each spaced run and test membership.
    for (const m of base.matchAll(SPACED_RE)) {
      const collapsed = deLeet(m[0].replace(/[\s._*\-]+/g, ""));
      if (activeSet.has(collapsed)) found.add(collapsed);
      else if (activeSet.has(squeeze(collapsed))) found.add(squeeze(collapsed));
    }
    return found;
  }

  // Decide whether a comment is toxic, honoring the sensitivity threshold.
  function evaluate(text) {
    const matched = [...collectMatches(text)];
    if (matched.length === 0) return null;

    const severeHits = matched.filter((w) => severeSet.has(w));
    let flagged;
    if (settings.sensitivity === "light") {
      flagged = matched.length >= 2 || severeHits.length >= 1; // tolerate one mild swear
    } else {
      flagged = true; // strict & moderate: any match
    }
    if (!flagged) return null;

    return {
      reason: severeHits.length ? "hate speech / slur" : "strong language",
      words: matched.slice(0, 5),
    };
  }

  // ----------------------------------------------------------------------------
  // Read a comment's text. Prefers the pre-mask original if Module 1A (the
  // word-replacer) already touched the node, so a masked "f**k" still matches.
  // We only READ a property 1A sets — we never modify its code.
  // ----------------------------------------------------------------------------
  function extractText(textEl) {
    let out = "";
    const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      out += (n.__sieveOriginal !== undefined ? n.__sieveOriginal : n.nodeValue) + " ";
    }
    return out;
  }

  // ----------------------------------------------------------------------------
  // Flagging — delegate to the collapse UI if present, else a fallback marker.
  // ----------------------------------------------------------------------------
  const flaggedEls = new Set(); // for fallback teardown
  const stats = { flagged: 0, scanned: 0 };

  function applyFlag(el, info) {
    if (typeof Sieve.collapse === "function") {
      Sieve.collapse(el, { layer: 1, reason: info.reason, words: info.words });
      return;
    }
    // --- Fallback marker (Step 2 standalone; replaced by Step 3's real UI) ---
    if (el.__sieveMarked) return;
    el.__sieveMarked = true;
    el.style.outline = "2px dashed #c0392b";
    el.style.outlineOffset = "2px";
    el.style.opacity = "0.55";
    const badge = document.createElement("span");
    badge.className = "sieve-l1-badge";
    badge.textContent =
      "⚑ Sieve · " + info.reason + (info.words.length ? " (" + info.words.join(", ") + ")" : "");
    badge.style.cssText =
      "display:inline-block;font:600 11px/1.4 system-ui,sans-serif;color:#fff;" +
      "background:#c0392b;padding:1px 6px;border-radius:4px;margin:2px 0;";
    el.prepend(badge);
    flaggedEls.add(el);
  }

  // Process a single comment element (idempotent via data-sieve-l1).
  function processComment(el) {
    if (el.getAttribute("data-sieve-l1")) return; // already done
    const textEl = el.querySelector(site.text);
    if (!textEl) return; // not rendered yet — MutationObserver will retry

    stats.scanned++;
    const info = evaluate(extractText(textEl));
    if (info) {
      el.setAttribute("data-sieve-l1", "flagged"); // Layer 2 skips these
      stats.flagged++;
      applyFlag(el, info);
    } else {
      el.setAttribute("data-sieve-l1", "clean"); // Layer 2 will look at these
    }
  }

  // ----------------------------------------------------------------------------
  // Idle-batched work queue — keeps scanning off the critical path.
  // ----------------------------------------------------------------------------
  const ric =
    window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 16 }), 0));
  const queue = [];
  const queued = new WeakSet();
  let flushScheduled = false;

  function enqueue(el) {
    if (queued.has(el) || el.getAttribute("data-sieve-l1")) return;
    queued.add(el);
    queue.push(el);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    ric((deadline) => {
      flushScheduled = false;
      let processed = 0;
      // Work until we run low on idle time, then yield and reschedule.
      while (queue.length && (deadline.timeRemaining() > 4 || processed < 15)) {
        processComment(queue.shift());
        processed++;
        if (processed >= 60) break; // hard cap per slice
      }
      if (queue.length) scheduleFlush();
    });
  }

  // Enqueue every comment under a root.
  function harvest(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches && root.matches(site.unit)) enqueue(root);
    if (root.querySelectorAll) {
      for (const el of root.querySelectorAll(site.unit)) enqueue(el);
    }
  }

  // ----------------------------------------------------------------------------
  // MutationObserver — catches lazy-loaded / infinite-scroll comments.
  // ----------------------------------------------------------------------------
  let observer = null;
  function startObserver() {
    observer = new MutationObserver((mutations) => {
      for (const mu of mutations) {
        for (const node of mu.addedNodes) harvest(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ----------------------------------------------------------------------------
  // Lifecycle.
  // ----------------------------------------------------------------------------
  function teardown() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    queue.length = 0;
    // Undo fallback markers (the real collapse UI manages its own restore).
    for (const el of flaggedEls) {
      const badge = el.querySelector(":scope > .sieve-l1-badge");
      if (badge) badge.remove();
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.opacity = "";
      el.__sieveMarked = false;
    }
    flaggedEls.clear();
    // Restore any comments collapsed by the Step 3 UI (comment-collapse.js).
    if (typeof Sieve.restoreAll === "function") Sieve.restoreAll();
    // Clear our per-comment marks so a re-enable rescans cleanly.
    for (const el of document.querySelectorAll("[data-sieve-l1]")) {
      el.removeAttribute("data-sieve-l1");
    }
    stats.flagged = 0;
    stats.scanned = 0;
  }

  async function start() {
    if (!isActiveHere()) return;
    await ensureData();
    buildDictionary();
    harvest(document.body);
    startObserver();
  }

  async function init() {
    settings = await loadSettings();
    await start();

    // React to settings changes (toggles, sensitivity, custom words…).
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local") return;
      if (!WATCHED_KEYS.some((k) => k in changes)) return;
      settings = await loadSettings();
      teardown();
      await start();
    });

    // Answer popup/options queries for the on-page count (Step 4 consumes this).
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.type === "sieve:getToxicStats") {
        // Prefer the live collapse count (covers both Layer 1 and the model)
        // and fall back to our own flagged tally if the collapse UI is absent.
        const flagged =
          typeof Sieve.getCollapseCount === "function" ? Sieve.getCollapseCount() : stats.flagged;
        sendResponse({
          site: site.name,
          active: isActiveHere(),
          flagged,
          scanned: stats.scanned,
        });
      }
    });
  }

  // Expose selectors + helpers so Layer 2 reuses them instead of duplicating.
  Sieve.site = site;
  Sieve.extractText = extractText;
  Sieve.getStats = () => ({ ...stats });

  init();
})();

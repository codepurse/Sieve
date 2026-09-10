// content/patterns/scarcity.js
// Sieve — Dark Pattern Blocker: fake scarcity messages.
// Detects "Only X left!" style messages. Uses phrase matching, a number,
// urgency context, AND cross-page-load stability: if the same message shows
// the same number across reloads, it is dimmed and tagged "unverified".
// The element is never removed — its visual pressure is just reduced.

(() => {
  "use strict";

  const TYPE = "scarcity";

  const SCARCITY_RE = /\bonly\s+\d+\s+(left|remaining|in\s+stock)\b|\b\d+\s+(left|remaining)\s+in\s+stock\b|\blast\s+\d+\s+(left|remaining)\b/i;

  const URGENCY_WORDS = [
    "only", "left", "remaining", "stock", "limited", "last", "hurry",
    "buy", "order", "now", "today", "rush", "selling fast", "almost gone",
  ];

  const STORAGE_KEY = "sieveScarcitySamples";
  const HIT_THRESHOLD = 2; // same value seen on this many loads before dimming
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // keep samples for one week

  let ctx = null;
  const cache = new Map(); // signature -> { value, count, lastSeen }
  let cacheLoaded = false;
  let persistTimer = null; // debounce handle for writing the cache back to storage

  // ---------------------------------------------------------------------------
  // Cross-load tracking
  // ---------------------------------------------------------------------------

  async function loadCache() {
    if (cacheLoaded) return;
    const stored = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
    const samples = stored[STORAGE_KEY];
    const now = Date.now();
    for (const [sig, data] of Object.entries(samples)) {
      if (data.lastSeen && now - data.lastSeen > MAX_AGE_MS) continue;
      cache.set(sig, data);
    }
    cacheLoaded = true;
  }

  // Update the in-memory cache and schedule a single, debounced write-back.
  // The old code did a full storage get+set PER matching element (severe thrash
  // on product grids) and wrote back the raw stored object, so expired entries
  // were never pruned on disk. Now the in-memory `cache` is the source of truth
  // and we persist it (pruned) at most once per burst.
  function recordSample(sig, value) {
    const existing = cache.get(sig);
    const next =
      existing && existing.value === value
        ? { value, count: existing.count + 1, lastSeen: Date.now() }
        : { value, count: 1, lastSeen: Date.now() };
    cache.set(sig, next);
    schedulePersist();
  }

  function schedulePersist() {
    if (persistTimer !== null) return;
    persistTimer = setTimeout(persistCache, 1000);
  }

  async function persistCache() {
    persistTimer = null;
    // Write from the in-memory cache, dropping anything past MAX_AGE_MS so old
    // signatures can't accumulate forever (the on-disk unbounded-growth bug).
    const now = Date.now();
    const out = {};
    for (const [sig, data] of cache) {
      if (data.lastSeen && now - data.lastSeen > MAX_AGE_MS) {
        cache.delete(sig);
        continue;
      }
      out[sig] = data;
    }
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: out });
    } catch (e) {
      // Best-effort: a failed write just means we re-learn these counts later.
    }
  }

  function makeSignature(text) {
    const normalized = text
      .toLowerCase()
      .replace(/\d+/g, "{n}")
      .replace(/\s+/g, " ")
      .trim();
    return `${location.hostname}|${normalized}`;
  }

  function extractNumber(text) {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  // ---------------------------------------------------------------------------
  // Context check
  // ---------------------------------------------------------------------------

  function hasUrgencyContext(el) {
    const sources = [el];
    let node = el;
    for (let i = 0; i < 2 && node; i++) {
      node = node.parentElement;
      if (node) sources.push(node);
    }

    for (const src of sources) {
      const text = (src.textContent || "").toLowerCase();
      if (URGENCY_WORDS.some((w) => text.includes(w))) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Dim + tag
  // ---------------------------------------------------------------------------

  function dimElement(el) {
    el.style.opacity = "0.55";
    el.style.filter = "grayscale(0.35)";
    el.style.transition = "opacity 0.2s";

    if (el.querySelector(".sieve-unverified-tag")) return;

    const tag = document.createElement("span");
    tag.className = "sieve-unverified-tag";
    tag.textContent = "unverified";
    tag.style.cssText = `
      display: inline-block;
      margin-left: 6px;
      padding: 1px 5px;
      font-size: 11px;
      line-height: 1.3;
      color: #57534e;
      background: #e7e5e4;
      border-radius: 4px;
      vertical-align: middle;
      white-space: nowrap;
    `;

    if (el.children.length === 0) {
      el.appendChild(tag);
    } else {
      // Append to the innermost inline wrapper, or to the element itself.
      const inline = el.querySelector("span, em, strong, b, i");
      (inline || el).appendChild(tag);
    }
  }

  function processElement(el) {
    if (ctx.isMarked(el)) return;

    const text = (el.textContent || "").trim();
    const value = extractNumber(text);
    if (value === null) return;
    if (!hasUrgencyContext(el)) return;

    const sig = makeSignature(text);
    recordSample(sig, value);

    const sample = cache.get(sig);
    if (sample && sample.count >= HIT_THRESHOLD) {
      dimElement(el);
      ctx.mark(el, TYPE);
      ctx.report(TYPE, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Public scan
  // ---------------------------------------------------------------------------

  // The walk lives in content/dark-patterns.js now — see the note there and in
  // content/patterns/timers.js. What is left here is the part that is actually
  // about scarcity.
  //
  // The cross-load cache is read from storage once, asynchronously, and every
  // decision this detector makes depends on it. So a match that arrives before
  // it is ready is held rather than judged: dimming an element requires knowing
  // whether its number has been seen before, and without the cache the answer
  // would always be "no".
  let deferred = [];

  function onScarcityText(el, context) {
    ctx = context;
    if (cacheLoaded) {
      processElement(el);
      return;
    }
    if (deferred.length < 200) deferred.push(el);
    loadCache()
      .then(() => {
        const held = deferred;
        deferred = [];
        for (const node of held) {
          if (node.isConnected && !ctx.isMarked(node)) processElement(node);
        }
      })
      .catch((err) => console.error("[Sieve] Scarcity cache load failed:", err));
  }

  // Kept for direct/console use. The coordinator no longer calls it.
  async function scanAsync(root) {
    await loadCache();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue;
      if (!value || !SCARCITY_RE.test(value)) continue;
      const el = node.parentElement;
      if (!el || ctx.isMarked(el)) continue;
      processElement(el);
    }
  }

  function scan(root, context) {
    ctx = context;
    scanAsync(root).catch((err) => console.error("[Sieve] Scarcity scan failed:", err));
    return 0; // reporting happens asynchronously
  }

  window.SieveDarkPatterns.registerText(TYPE, SCARCITY_RE, onScarcityText);
  window.SieveDarkPatterns.register(TYPE, { scanText: true });
  window.__sieveScarcityScan = scan; // console / test hook
})();

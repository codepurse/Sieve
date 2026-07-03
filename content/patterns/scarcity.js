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

  async function recordSample(sig, value) {
    const existing = cache.get(sig);
    let next;
    if (existing && existing.value === value) {
      next = { value, count: existing.count + 1, lastSeen: Date.now() };
    } else {
      next = { value, count: 1, lastSeen: Date.now() };
    }
    cache.set(sig, next);

    const stored = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
    stored[STORAGE_KEY][sig] = next;
    await chrome.storage.local.set({ [STORAGE_KEY]: stored[STORAGE_KEY] });
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

  async function processElement(el) {
    if (ctx.isMarked(el)) return;

    const text = (el.textContent || "").trim();
    const value = extractNumber(text);
    if (value === null) return;
    if (!hasUrgencyContext(el)) return;

    const sig = makeSignature(text);
    await recordSample(sig, value);

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

  async function scanAsync(root) {
    await loadCache();

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return SCARCITY_RE.test(node.textContent || "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      if (!el || ctx.isMarked(el)) continue;
      await processElement(el);
    }
  }

  function scan(root, context) {
    ctx = context;
    scanAsync(root).catch((err) => console.error("[Sieve] Scarcity scan failed:", err));
    return 0; // reporting happens asynchronously
  }

  window.SieveDarkPatterns.register(TYPE, { scan });
})();

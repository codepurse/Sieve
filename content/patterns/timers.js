// content/patterns/timers.js
// Sieve — Dark Pattern Blocker: fake countdown timers.
// Detects elements that display a time value and are actively counting down
// while surrounded by urgency language. Removes only when all three signals
// are present to avoid killing legitimate timers (cooking timers, auctions).

(() => {
  "use strict";

  const TYPE = "timers";

  const URGENCY_WORDS = [
    "offer", "hurry", "ends", "ending", "limited", "sale", "deal",
    "discount", "expires", "expiring", "now", "today", "only", "last",
    "minute", "minutes", "second", "seconds", "hour", "hours",
  ];

  // Match "MM:SS", "HH:MM:SS", or "ends in N minutes/seconds/hours".
  const TIME_TEXT_RE = /\b\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?\b|\bends?\s+in\b/i;

  // Minimum sample window before we trust a decrease (ms).
  const SAMPLE_WINDOW_MS = 2000;
  // How often to re-check pending candidates (ms).
  const CHECK_INTERVAL_MS = 500;

  let ctx = null;
  const samples = new WeakMap(); // element -> { firstValue, firstTime }
  const pending = new Set();
  let checkTimer = null;

  // ---------------------------------------------------------------------------
  // Parsing
  // ---------------------------------------------------------------------------

  function parseTimeValue(text) {
    const t = (text || "").trim();

    // "HH:MM:SS" or "MM:SS"
    const clock = t.match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?/);
    if (clock) {
      const hasHours = clock[3] !== undefined;
      const h = hasHours ? parseInt(clock[1], 10) : 0;
      const m = hasHours ? parseInt(clock[2], 10) : parseInt(clock[1], 10);
      const s = hasHours ? parseInt(clock[3], 10) : parseInt(clock[2], 10);
      return h * 3600 + m * 60 + s;
    }

    // "ends in 5 minutes / 30 seconds / 2 hours"
    const words = t.match(/ends?\s+in\s+(\d+)\s*(second|minute|hour|sec|min|hr)s?/i);
    if (words) {
      const n = parseInt(words[1], 10);
      const unit = words[2].toLowerCase();
      if (unit.startsWith("sec")) return n;
      if (unit.startsWith("min")) return n * 60;
      if (unit.startsWith("hour") || unit.startsWith("hr")) return n * 3600;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Signal checks
  // ---------------------------------------------------------------------------

  function hasTimeText(el) {
    return TIME_TEXT_RE.test(el.textContent || "");
  }

  function hasUrgencyNearby(el) {
    // Look at this element plus up to two ancestors and a few siblings.
    const sources = [el];
    let node = el;
    for (let i = 0; i < 2 && node; i++) {
      node = node.parentElement;
      if (node) sources.push(node);
    }

    for (const sib of el.parentElement?.children || []) {
      if (sib !== el) sources.push(sib);
    }

    for (const src of sources) {
      const text = (src.textContent || "").toLowerCase();
      if (URGENCY_WORDS.some((w) => text.includes(w))) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Removal
  // ---------------------------------------------------------------------------

  function removeTimer(el) {
    if (ctx.isMarked(el)) return;

    // Try to remove the smallest meaningful container. If the timer text is
    // inline inside a sentence, hide just the text node wrapper instead of
    // deleting the whole paragraph.
    const target = chooseTarget(el);
    if (target) {
      target.remove();
      ctx.mark(target, TYPE);
      ctx.report(TYPE, 1);
    } else {
      ctx.mark(el, TYPE);
    }
  }

  function chooseTarget(el) {
    // If this element is small and text-only, remove it directly.
    if (el.children.length === 0) return el;

    // Walk up until we find a block-like container that still contains only
    // the timer and closely related text (heuristic: <= 80 chars).
    // Reading textContent is O(subtree), and getComputedStyle forces a style
    // recalculation, so climbing all the way to <body> made this O(depth x
    // subtree) on a deep DOM. It does not need to: text only GROWS on the way
    // up, so once a level is over the 80-character ceiling every level above it
    // is too, and the answer cannot change. Stop there.
    let candidate = el;
    let node = el;
    while (node && node !== document.body) {
      const text = (node.textContent || "").trim();
      if (text.length > 80) break;
      if (isBlockLike(node)) candidate = node;
      node = node.parentElement;
    }
    return candidate;
  }

  function isBlockLike(el) {
    const display = getComputedStyle(el).display;
    return display === "block" || display === "flex" || display === "inline-block" || display === "grid";
  }

  // ---------------------------------------------------------------------------
  // Sampling / decreasing detection
  // ---------------------------------------------------------------------------

  function evaluateCandidate(el) {
    if (ctx.isMarked(el) || !document.body.contains(el)) return;

    const sample = samples.get(el);
    if (!sample) {
      // First time we see this element.
      const value = parseTimeValue(el.textContent || "");
      if (value === null) {
        ctx.mark(el, TYPE); // not a timer after all
        return;
      }
      samples.set(el, { firstValue: value, firstTime: Date.now() });
      pending.add(el);
      scheduleCheck();
      return;
    }

    // We already have a sample.
    const elapsed = Date.now() - sample.firstTime;
    if (elapsed < SAMPLE_WINDOW_MS) return; // wait longer

    const currentValue = parseTimeValue(el.textContent || "");
    if (currentValue === null) {
      pending.delete(el);
      ctx.mark(el, TYPE);
      return;
    }

    pending.delete(el);

    if (currentValue < sample.firstValue && hasUrgencyNearby(el)) {
      removeTimer(el);
    } else {
      // Either it isn't decreasing, or there's no urgency language.
      // Mark it so we don't keep re-evaluating forever.
      ctx.mark(el, TYPE);
    }
  }

  function scheduleCheck() {
    if (checkTimer) return;
    checkTimer = setTimeout(() => {
      checkTimer = null;
      const list = Array.from(pending);
      for (const el of list) evaluateCandidate(el);
    }, CHECK_INTERVAL_MS);
  }

  // ---------------------------------------------------------------------------
  // Public scan
  // ---------------------------------------------------------------------------

  // The walk lives in content/dark-patterns.js now: this detector and the
  // scarcity one both wanted every text node under the root, and were each
  // building their own TreeWalker to get it. We declare the pattern instead and
  // are handed the parent of anything that matches. See the note beside
  // registerTextVisitor there.
  function onTimeText(el, context) {
    ctx = context;
    // el.textContent contains the node that just matched, so this is all but
    // guaranteed — kept because evaluateCandidate reads the element's whole
    // text, and this is the check that says the element (not just one of its
    // text nodes) reads as a clock.
    if (hasTimeText(el)) evaluateCandidate(el);
  }

  // Kept for direct/console use and for anything that still calls scan(root)
  // with a root of its own. The coordinator no longer uses it.
  function scan(root) {
    ctx = window.SieveDarkPatterns;
    if (!ctx) return 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue;
      if (!value || !TIME_TEXT_RE.test(value)) continue;
      const el = node.parentElement;
      if (!el || ctx.isMarked(el)) continue;
      if (hasTimeText(el)) evaluateCandidate(el);
    }
    return 0; // actual removals are reported asynchronously via ctx.report
  }

  window.SieveDarkPatterns.registerText(TYPE, TIME_TEXT_RE, onTimeText);
  // Registered with no scan of its own: the coordinator drives this detector
  // entirely through the shared text pass.
  window.SieveDarkPatterns.register(TYPE, { scanText: true });
  window.__sieveTimersScan = scan; // console / test hook
})();

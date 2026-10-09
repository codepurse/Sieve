// content/patterns/timers.js
// Sieve — Dark Pattern Blocker: fake countdown timers.
// Detects elements that display a time value and are actively counting down
// while surrounded by urgency language. Acts only when all three signals are
// present, to avoid touching legitimate timers (cooking timers, auctions).
//
// Then it asks the Claim Ledger (common/claim-ledger.js) whether this page
// showed the same countdown before, and with what end time. A countdown that
// restarted is a fake, proven; one that kept its end time is behaving like a
// real one and is left alone; one seen for the first time is unverified, and
// the intervention ladder in content/dark-patterns.js decides what to do with
// each.

(() => {
  "use strict";

  const TYPE = "timers";

  // Delivery cut-offs count down too, and they are true: "order within
  // 2:14:05 for delivery tomorrow" is the latest you can order and still get
  // it then. That is information, not pressure, so it is left alone.
  const CUTOFF_RE =
    /\b(dispatch(?:ed|es)?|ships?|shipping|shipped|deliver(?:y|ed|s)?|arrives?|get it by|order within|order in the next)\b/i;

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
  // How many times a time that jumped UP is sampled again — see evaluateCandidate.
  const MAX_RESAMPLES = 2;

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
  // Judging a confirmed countdown
  // ---------------------------------------------------------------------------

  // Countdowns already judged on this page load, by wording. A deals page shows
  // a dozen worded alike, each with its own end time, and comparing one of them
  // with whichever came first last time would "catch" a restart that never
  // happened. So once a wording is seen twice, the ledger's verdict on it is
  // not trusted for this load.
  const seenThisLoad = new Map();

  // The fix: hidden, not removed, so it can be put back.
  function hide(el) {
    const before = { value: el.style.getPropertyValue("display"), priority: el.style.getPropertyPriority("display") };
    el.style.setProperty("display", "none", "important");
    return () => {
      if (before.value) el.style.setProperty("display", before.value, before.priority);
      else el.style.removeProperty("display");
    };
  }

  function describe(verdict) {
    const base = { type: TYPE, defuse: hide, done: "Hidden", cover: true };
    if (verdict && verdict.status === "restarted") {
      return {
        ...base,
        confidence: "high",
        title: "Fake countdown",
        label: "Fake countdown",
        detail:
          `It restarted when you came back. Earlier it said it would end at ` +
          `${ctx.formatTime(verdict.promised)}; now it says ${ctx.formatTime(verdict.deadline)}.`,
      };
    }
    if (verdict && verdict.status === "consistent") {
      return {
        ...base,
        confidence: "low",
        maxLevel: ctx.LEVEL.NOTE,
        trick: false,
        title: "A countdown that kept its time",
        detail: `It has said it ends at ${ctx.formatTime(verdict.deadline)} on each of your visits, so it looks genuine.`,
      };
    }
    return {
      ...base,
      confidence: "medium",
      title: "Pressure countdown",
      label: "Unverified countdown",
      detail: "A countdown next to hurry-up wording. Sieve will check whether it restarts if you come back.",
    };
  }

  function confirmTimer(el, remainingSeconds) {
    if (ctx.isMarked(el)) return;

    // Act on the smallest meaningful container. If the timer text is inline
    // inside a sentence, that is the text's own wrapper, not the paragraph.
    const target = chooseTarget(el) || el;
    ctx.mark(el, TYPE);
    ctx.mark(target, TYPE);

    // The cut-off wording sits in the timer's own line or the one around it —
    // not anywhere in a product panel that also happens to offer free shipping.
    const own = target.textContent || "";
    const around = (target.parentElement && target.parentElement.textContent) || "";
    if (CUTOFF_RE.test(around.length <= 200 ? around : own)) return;

    const sig = ctx.claimSignature(target.textContent);
    const seen = (seenThisLoad.get(sig) || 0) + 1;
    seenThisLoad.set(sig, seen);
    if (seen > 1 || !sig) {
      ctx.tell(target, describe(null));
      return;
    }

    const deadline = Date.now() + remainingSeconds * 1000;
    ctx.observeClaim({ kind: "timer", sig, deadline }).then((verdict) => {
      if (!target.isConnected) return;
      ctx.tell(target, describe(seenThisLoad.get(sig) > 1 ? null : verdict));
    });
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

    // Went UP, or has not moved yet. Countdown widgets often draw a placeholder
    // first — "00:00", or whatever the HTML shipped with — and only start once
    // their script has run, so the first sample may not be the countdown yet.
    // Sample again from here, a couple of times at most, rather than give up
    // on it. A time that never moves ("Open 9:00") is let go a few seconds
    // later than it used to be.
    if (currentValue >= sample.firstValue && (sample.resamples || 0) < MAX_RESAMPLES) {
      samples.set(el, { firstValue: currentValue, firstTime: Date.now(), resamples: (sample.resamples || 0) + 1 });
      return;
    }

    pending.delete(el);

    if (currentValue < sample.firstValue && hasUrgencyNearby(el)) {
      confirmTimer(el, currentValue);
    } else {
      // Either it isn't decreasing, or there's no urgency language.
      // Mark it so we don't keep re-evaluating forever.
      ctx.mark(el, TYPE);
    }
  }

  // Poll until every candidate has been judged. This used to fire once: the
  // first check, 500ms in, is inside the 2-second sample window, so it waited
  // — and nothing ever asked again. A countdown only got its second look if
  // the page happened to add new elements near it; one that updates its own
  // text in place, which is the commonest kind, was never judged at all.
  function scheduleCheck() {
    if (checkTimer) return;
    checkTimer = setTimeout(() => {
      checkTimer = null;
      const list = Array.from(pending);
      for (const el of list) evaluateCandidate(el);
      // Gone from the page, or settled some other way: nothing left to ask.
      for (const el of pending) if (!el.isConnected || ctx.isMarked(el)) pending.delete(el);
      if (pending.size > 0) scheduleCheck();
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
    return 0; // findings are reported asynchronously, through ctx.tell
  }

  window.SieveDarkPatterns.registerText(TYPE, TIME_TEXT_RE, onTimeText);
  // Registered with no scan of its own: the coordinator drives this detector
  // entirely through the shared text pass.
  window.SieveDarkPatterns.register(TYPE, { scanText: true });
  window.__sieveTimersScan = scan; // console / test hook
})();

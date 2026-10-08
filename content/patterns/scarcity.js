// content/patterns/scarcity.js
// Sieve — Dark Pattern Blocker: fake scarcity messages.
// Detects "Only X left!" style messages. Uses phrase matching, a number, and
// urgency context, then asks the Claim Ledger (common/claim-ledger.js) what
// the same message said before:
//
//   - the same number on visit after visit: there is no rush, whatever it says
//   - a number that went UP within the hour: made up on each page load
//   - the same sentence with the same number on product after product
//   - seen for the first time, or gone down since: nothing proven yet; Sieve
//     notes it and checks again next time
//
// The element is never removed — its visual pressure is reduced, or at the
// ladder's top step, covered with a note saying why.
//
// The ledger lives in the service worker. This file used to keep its own
// cross-load cache in chrome.storage.local, one per tab, each overwriting the
// others; that is retired (background/tells.js removes the old key).

(() => {
  "use strict";

  const TYPE = "scarcity";

  const SCARCITY_RE = /\bonly\s+\d+\s+(left|remaining|in\s+stock)\b|\b\d+\s+(left|remaining)\s+in\s+stock\b|\blast\s+\d+\s+(left|remaining)\b/i;

  const URGENCY_WORDS = [
    "only", "left", "remaining", "stock", "limited", "last", "hurry",
    "buy", "order", "now", "today", "rush", "selling fast", "almost gone",
  ];

  // Matches arrive one at a time; this is how long to wait for the rest of a
  // page's before judging any of them. See flush().
  const GATHER_MS = 400;

  let ctx = null;
  let gathered = new Map(); // wording -> elements found since the last flush
  let gatherTimer = null;
  const judged = new Map(); // "path|wording" -> the spec it was given this load

  // The claim itself — "only 3 left in stock" — out of whatever text the
  // element holds, which may also hold a price. Its number is the stock
  // count, and its wording is what the ledger files it under: the rest of the
  // element changes with every sale and would break the comparison.
  function readClaim(text) {
    const match = SCARCITY_RE.exec(text || "");
    if (!match) return null;
    const number = match[0].match(/\d+/);
    return number ? { phrase: match[0], value: parseInt(number[0], 10) } : null;
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
  // Dim + tag — the fix at the ladder's "defuse" step. Returns its own undo.
  // ---------------------------------------------------------------------------

  function dimElement(el) {
    const before = { opacity: el.style.opacity, filter: el.style.filter, transition: el.style.transition };
    el.style.opacity = "0.55";
    el.style.filter = "grayscale(0.35)";
    el.style.transition = "opacity 0.2s";

    let tag = el.querySelector(".sieve-unverified-tag");
    const added = !tag;
    if (added) {
      tag = document.createElement("span");
      tag.className = "sieve-unverified-tag";
      tag.textContent = "unverified";
      // Sieve's neutral stamp: its own colours, so it reads on any page.
      tag.style.cssText = `
        display: inline-block;
        margin-left: 6px;
        padding: 2px 5px;
        font: 600 10px/1.2 ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #4b4840;
        background: #ece8df;
        border: 1px solid #8c877c;
        border-radius: 2px;
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

    return () => {
      el.style.opacity = before.opacity;
      el.style.filter = before.filter;
      el.style.transition = before.transition;
      if (added) tag.remove();
    };
  }

  // ---------------------------------------------------------------------------
  // What the ledger's verdict means, in a sentence
  // ---------------------------------------------------------------------------

  function since(ts) {
    const day = ctx.formatDay(ts);
    return day === "today" ? `${ctx.formatTime(ts)} today` : day;
  }

  function describe(verdict, value) {
    const base = { type: TYPE, defuse: dimElement, done: "Dimmed", cover: true };
    const status = verdict ? verdict.status : "new";

    if (status === "jumped") {
      return {
        ...base,
        confidence: verdict.jumps >= 2 ? "high" : "medium",
        title: "A stock number that jumps around",
        label: "Made-up number",
        detail:
          `It said ${verdict.from} left ${verdict.minutes} min before it said ${verdict.to}. ` +
          `Real stock rarely goes up that fast, so the number looks made up.`,
      };
    }
    if (status === "everywhere") {
      return {
        ...base,
        confidence: verdict.products >= 5 ? "high" : "medium",
        title: "The same stock number everywhere",
        label: "Same number everywhere",
        detail: `This site gives the same low-stock number, ${verdict.value}, on ${verdict.products} different products.`,
      };
    }
    if (status === "unchanged") {
      return {
        ...base,
        confidence: "medium",
        title: "A stock number that never moves",
        label: "Unverified",
        detail:
          `It has said ${value} left on each of your ${verdict.sightings} visits since ${since(verdict.since)}. ` +
          `The number hasn't moved, so there is no rush.`,
      };
    }
    if (status === "dropped") {
      return {
        type: TYPE,
        confidence: "low",
        maxLevel: ctx.LEVEL.NOTE,
        trick: false,
        title: "A stock number that went down",
        detail: "It is lower than on your last visit, so it may well be real.",
      };
    }
    return {
      type: TYPE,
      confidence: "low",
      maxLevel: ctx.LEVEL.NOTE,
      trick: false,
      title: "A “low stock” message",
      detail: `It says ${value} left. Sieve will check whether the number moves when you come back.`,
    };
  }

  // ---------------------------------------------------------------------------
  // Judging
  // ---------------------------------------------------------------------------

  // Matches are gathered for a moment and judged together, grouped by wording.
  // One wording on several elements with DIFFERENT numbers is a product
  // listing — each card its own stock — and nothing about any one of them can
  // be checked against last time, so it is left alone. With the SAME number it
  // is one claim shown twice (a sticky bar repeating the panel, say), and is
  // judged once.
  function flush() {
    gatherTimer = null;
    const batch = gathered;
    gathered = new Map();

    for (const [sig, found] of batch) {
      const live = found.filter((f) => f.el.isConnected);
      if (live.length === 0) continue;
      const values = new Set(live.map((f) => f.value));
      if (values.size > 1) continue;
      const value = live[0].value;
      const elements = live.map((f) => f.el);

      // Already judged on this page (the same claim re-rendered): reuse it.
      const key = `${location.pathname}|${sig}`;
      if (judged.has(key)) {
        for (const el of elements) ctx.tell(el, judged.get(key));
        continue;
      }

      ctx.observeClaim({ kind: "stock", sig, value }).then((verdict) => {
        const spec = describe(verdict, value);
        judged.set(key, spec);
        for (const el of elements) if (el.isConnected) ctx.tell(el, spec);
      });
    }
  }

  function onScarcityText(el, context) {
    ctx = context;
    if (ctx.isMarked(el)) return;

    const claim = readClaim(el.textContent);
    if (!claim) return;
    if (!hasUrgencyContext(el)) return;

    ctx.mark(el, TYPE);
    const sig = ctx.claimSignature(claim.phrase);
    if (!sig) return;
    if (!gathered.has(sig)) gathered.set(sig, []);
    gathered.get(sig).push({ el, value: claim.value });
    if (gatherTimer === null) gatherTimer = setTimeout(flush, GATHER_MS);
  }

  // The walk lives in content/dark-patterns.js — see the note beside
  // registerTextVisitor there. Registered with no scan of its own.
  window.SieveDarkPatterns.registerText(TYPE, SCARCITY_RE, onScarcityText);
  window.SieveDarkPatterns.register(TYPE, { scanText: true });
})();

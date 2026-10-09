// content/patterns/deadlines.js
// Sieve — Dark Pattern Blocker: "ends today" deadlines that never end.
//
// "Sale ends tonight." "Today only." A deadline with no clock to watch, which
// is what makes it cheap to fake: the banner just says it again tomorrow. On
// one visit there is nothing to see. Across visits there is — so this files the
// sentence with the Claim Ledger (common/claim-ledger.js), and when the same
// shop says the same thing on two different days a few days apart, that is
// the trick, and Sieve says so.
//
// Seen once, it is only noted: the popup lists it under "keeping an eye on",
// and nothing on the page changes.
//
// Shops only. "Voting ends today" on a news page is not a sales tactic, and the
// same article read on two days is not a lie. A page counts as a shop by what
// it says about itself — see looksLikeShop() in content/dark-patterns.js.
//
// It is the time-pressure cousin of a countdown, so it sits under the same
// switch ("timers") rather than adding one.

(() => {
  "use strict";

  const TYPE = "timers";

  const ENDS_TODAY_RE =
    /\b(?:ends?|ending|expires?)\s+(?:today|tonight|at\s+midnight)\b|\b(?:today|tonight)\s+only\b|\blast\s+day\s+(?:to|for|of)\b/i;

  // A banner is a sentence, not a page section. Longer than this, the match is
  // in running text — an article about a sale, a terms page — and is skipped.
  const MAX_TEXT = 160;

  const judgedThisLoad = new Set();

  // The fix at the "defuse" step: the banner dimmed, not removed.
  function dim(el) {
    const before = { opacity: el.style.opacity, filter: el.style.filter };
    el.style.opacity = "0.55";
    el.style.filter = "grayscale(0.35)";
    return () => {
      el.style.opacity = before.opacity;
      el.style.filter = before.filter;
    };
  }

  function describe(ctx, verdict) {
    if (verdict && verdict.status === "repeated") {
      const day = ctx.formatDay(verdict.earlier);
      const when = day === "yesterday" || day === "today" ? day : `on ${day}`;
      return {
        type: TYPE,
        confidence: "high",
        defuse: dim,
        done: "Dimmed",
        cover: true,
        title: "A deadline that keeps coming back",
        label: "Said this before",
        detail: `This shop said the same thing ${when} too. A deadline that comes back every day isn't one.`,
      };
    }
    return {
      type: TYPE,
      confidence: "low",
      maxLevel: ctx.LEVEL.NOTE,
      trick: false,
      title: "An “ends today” deadline",
      detail: "Sieve will check whether this shop still says it tomorrow.",
    };
  }

  function onDeadlineText(el, ctx) {
    if (ctx.isMarked(el)) return;
    const text = (el.textContent || "").trim();
    if (text.length > MAX_TEXT) return;
    if (!ctx.looksLikeShop()) return;

    ctx.mark(el, TYPE);
    const sig = ctx.claimSignature(text);
    if (!sig || judgedThisLoad.has(sig)) return;
    judgedThisLoad.add(sig);

    ctx.observeClaim({ kind: "deadline", sig }).then((verdict) => {
      if (el.isConnected) ctx.tell(el, describe(ctx, verdict));
    });
  }

  window.SieveDarkPatterns.registerText(TYPE, ENDS_TODAY_RE, onDeadlineText);
})();

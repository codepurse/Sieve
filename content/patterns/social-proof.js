// content/patterns/social-proof.js
// Sieve — Dark Pattern Blocker: fake popularity.
//
// Two ways a page says "everyone else is buying this":
//
// 1. THE POP-UP. "Sarah from Ohio purchased Brushed Steel Kettle · 12 minutes
//    ago", sliding into a corner of the screen every few seconds. It is found
//    by its shape, not by who sells it: a small box pinned to the screen
//    (position: fixed), whose words say someone bought, ordered, booked or
//    signed up a moment ago. That catches the widget whoever made it —
//    including the shop-platform apps served from the shop's own address,
//    which no list of vendor addresses could block without blocking the shop.
//    The first one becomes a finding; while it is defused, every later one on
//    the page is hidden with it. Hidden by a stylesheet rule on an attribute,
//    because an author !important rule beats the widget showing its box again
//    with an inline style.
//
// 2. THE COUNT. "23 people are viewing this." Nobody outside the site can
//    check it, so on its own it is only labelled. But a live count moves, so
//    the Claim Ledger (common/claim-ledger.js) remembers it: the same number
//    on visits ten minutes or more apart is a number nobody is counting, and
//    Sieve says so.
//
// Deliberately not here: "2K+ bought in past month" and other sales totals,
// which a large shop can genuinely report and Sieve has no way to check.

(() => {
  "use strict";

  const TYPE = "socialProof";

  // ---------------------------------------------------------------------------
  // The pop-up
  // ---------------------------------------------------------------------------

  // What sends a text node here: cheap and broad. Feeds are full of "3 hours
  // ago", so the real test is TOAST_TEXT_RE on the words around it, and then
  // the shape — and only a match on both pays for a style lookup.
  const TOAST_TRIGGER_RE = /\bago\b|\b(?:just|recently)\s+(?:bought|purchased|ordered|booked|reserved|subscribed|signed\s+up)\b/i;

  // Someone did something you could do, a moment ago. "Joined" and
  // "registered" are left out on purpose: a support chat says "Anna joined the
  // conversation 2 minutes ago", and is not selling anything.
  const TOAST_TEXT_RE =
    /\b(?:just|recently)\s+(?:bought|purchased|ordered|booked|reserved|subscribed|signed\s+up)\b|\b(?:bought|purchased|ordered|booked|reserved|subscribed(?:\s+to)?|signed\s+up(?:\s+for)?|claimed)\b.{0,100}?\b(?:\d{1,3}|an?|one)\s+(?:sec(?:ond)?s?|min(?:ute)?s?|hours?|hrs?|days?)\s+ago\b/i;

  // A pop-up is short. Longer than this, it is a review or a comment.
  const MAX_TOAST_TEXT = 240;
  const MAX_TOAST_BOX = { width: 520, height: 260 };

  const HIDE_ATTR = "data-sieve-popularity";
  const STYLE_ID = "sieve-popularity-style";

  const looked = new WeakSet(); // text elements already judged, so a feed is judged once
  let popups = null; // the page's one pop-up finding: { finding, hiding, roots }

  // The pop-up's words, read node by node with spaces between, from the
  // nearest ancestor that still holds only the pop-up.
  function popupText(el) {
    let block = el;
    for (let i = 0; i < 4 && block.parentElement && block.parentElement !== document.body; i++) {
      if ((block.parentElement.textContent || "").length > MAX_TOAST_TEXT) break;
      block = block.parentElement;
    }
    const parts = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) parts.push(node.nodeValue);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // The box pinned to the screen that holds it, if there is one, and if it is
  // the size of a pop-up rather than a header or a drawer.
  function pinnedBox(el) {
    let node = el;
    for (let i = 0; i < 8 && node && node !== document.body && node !== document.documentElement; i++) {
      if (getComputedStyle(node).position === "fixed") {
        const r = node.getBoundingClientRect();
        return r.width <= MAX_TOAST_BOX.width && r.height <= MAX_TOAST_BOX.height ? node : null;
      }
      node = node.parentElement;
    }
    return null;
  }

  function hideBox(box) {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `[${HIDE_ATTR}] { display: none !important; }`;
      (document.head || document.documentElement).appendChild(style);
    }
    box.setAttribute(HIDE_ATTR, "");
  }

  function onPopupText(el, ctx) {
    if (looked.has(el)) return;
    looked.add(el);
    const text = popupText(el);
    if (!text || text.length > MAX_TOAST_TEXT || !TOAST_TEXT_RE.test(text)) return;
    const box = pinnedBox(el);
    if (!box || box.hasAttribute(HIDE_ATTR)) return;

    // A later pop-up on a page that already has the finding: hidden with the
    // others while the finding is defused, and the finding follows it if the
    // widget threw the first box away.
    if (popups) {
      popups.roots.add(box);
      if (popups.hiding) hideBox(box);
      if (popups.finding && !popups.finding.el.isConnected) popups.finding.el = box;
      return;
    }

    const state = { finding: null, hiding: false, roots: new Set([box]) };
    popups = state;
    const shown = text.length > 80 ? `${text.slice(0, 77).trimEnd()}…` : text;
    state.finding = ctx.tell(box, {
      type: TYPE,
      confidence: "medium",
      maxLevel: ctx.LEVEL.DEFUSE,
      title: "Fake “just bought” pop-ups",
      label: "Fake popularity",
      detail: `Pop-ups like “${shown}” are there to make you feel you are missing out. Sieve hides them as they appear.`,
      done: "Hidden",
      defuse: () => {
        state.hiding = true;
        for (const b of state.roots) hideBox(b);
        return () => {
          state.hiding = false;
          for (const b of state.roots) b.removeAttribute(HIDE_ATTR);
        };
      },
    });
  }

  // ---------------------------------------------------------------------------
  // The count
  // ---------------------------------------------------------------------------

  const VIEWERS_RE =
    /\b\d{1,4}\+?\s+(?:other\s+)?(?:people|persons|shoppers|customers|visitors|users|travell?ers|guests|others)\s+(?:are\s+)?(?:currently\s+|now\s+|right\s+now\s+)?(?:viewing|looking(?:\s+at)?|watching|browsing|checking\s+out|considering)\b|\b\d{1,4}\+?\s+(?:people|others|shoppers)\s+have\s+(?:this|it)\s+in\s+their\s+(?:carts?|baskets?|bags?)\b|\bin\s+\d{1,4}\+?\s+(?:other\s+)?(?:people'?s\s+|shoppers'?\s+)?(?:carts|baskets|bags)\b/i;

  const judgedCounts = new Map(); // "path|wording" -> the spec it got this page load

  function dim(el) {
    const before = { opacity: el.style.opacity, filter: el.style.filter };
    el.style.opacity = "0.55";
    el.style.filter = "grayscale(0.35)";
    return () => {
      el.style.opacity = before.opacity;
      el.style.filter = before.filter;
    };
  }

  function describeCount(ctx, verdict, value) {
    if (verdict && verdict.status === "frozen") {
      const day = ctx.formatDay(verdict.since);
      const since = day === "today" ? `${ctx.formatTime(verdict.since)} today` : day;
      return {
        type: TYPE,
        confidence: verdict.sightings >= 3 && verdict.span >= 6 * 3600000 ? "high" : "medium",
        title: "A “people viewing” count that never moves",
        label: "Never moves",
        detail: `It said ${value} every time you looked — ${verdict.sightings} times since ${since}. A real live count would have moved.`,
        defuse: dim,
        done: "Dimmed",
        cover: true,
      };
    }
    return {
      type: TYPE,
      confidence: "low",
      title: "A “people viewing” count",
      label: "Unverified",
      detail: "Nobody outside the site can check this number, and it is there to make you hurry. Sieve will check whether it moves when you come back.",
    };
  }

  function onCountText(el, ctx) {
    if (ctx.isMarked(el)) return;
    const match = VIEWERS_RE.exec(el.textContent || "");
    if (!match) return;
    ctx.mark(el, TYPE);
    const value = parseInt(match[0].match(/\d+/)[0], 10);
    const sig = ctx.claimSignature(match[0]);
    const key = `${location.pathname}|${sig}`;

    // The same count shown twice on a page (a sticky bar repeating the panel)
    // is one claim: judged once, told on both.
    if (judgedCounts.has(key)) {
      judgedCounts.get(key).then((spec) => el.isConnected && ctx.tell(el, spec));
      return;
    }
    const spec = ctx.observeClaim({ kind: "viewers", sig, value }).then((verdict) => describeCount(ctx, verdict, value));
    judgedCounts.set(key, spec);
    spec.then((s) => el.isConnected && ctx.tell(el, s));
  }

  window.SieveDarkPatterns.registerText(TYPE, TOAST_TRIGGER_RE, onPopupText);
  window.SieveDarkPatterns.registerText(TYPE, VIEWERS_RE, onCountText);
  window.SieveDarkPatterns.register(TYPE, { scanText: true });
})();

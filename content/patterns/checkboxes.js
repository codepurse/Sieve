// content/patterns/checkboxes.js
// Sieve — Dark Pattern Blocker: pre-ticked checkboxes.
// Finds checkboxes that are already checked on page load and are surrounded by
// marketing/consent language. Does NOT uncheck them automatically (that could
// break forms); instead it adds a yellow outline and a small "pre-checked"
// badge so the user notices and decides for themselves.

(() => {
  "use strict";

  const TYPE = "checkboxes";

  const MARKETING_KEYWORDS = [
    "subscribe", "subscription", "newsletter", "marketing", "offers",
    "promotional", "promotions", "updates", "deals", "emails", "email",
    "notifications", "sms", "text", "messages", "announcements",
    "consent", "agree to receive", "keep me informed", "special offers",
  ];

  const BADGE_TEXT = "pre-checked";

  function hasMarketingContext(checkbox, ctx) {
    const textSources = [];

    if (checkbox.id) {
      const label = document.querySelector(`label[for="${CSS.escape(checkbox.id)}"]`);
      if (label) textSources.push(label.textContent || "");
    }

    const wrappingLabel = checkbox.closest("label");
    if (wrappingLabel) textSources.push(wrappingLabel.textContent || "");

    textSources.push(checkbox.name || "", checkbox.getAttribute("aria-label") || "");

    // Climb for surrounding context, but STOP at the first ancestor that holds
    // another checkbox.
    //
    // Three unconditional levels was too many. On a consent form the boxes are
    // siblings, so the third level up is routinely the form — or, on a simple
    // page, <body> — and its textContent is every other checkbox's label. One
    // marketing opt-in anywhere on the page then badged all of them, including
    // "I have read and accept the terms". An ancestor shared with another
    // checkbox describes the group, not this control, so it is not context.
    let parent = checkbox.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
      let siblings = 1;
      try {
        siblings = parent.querySelectorAll('input[type="checkbox"]').length;
      } catch (_) {
        /* treat an unqueryable ancestor as its own context */
      }
      if (siblings > 1) break;
      textSources.push(parent.textContent || "");
      parent = parent.parentElement;
    }

    // WHOLE WORDS: "text" is one of the keywords and is inside "context",
    // "textile" and "next". See the note beside hasWord() in
    // content/dark-patterns.js.
    const haystack = textSources.join(" ").toLowerCase();
    if (ctx && ctx.hasAnyWord) return ctx.hasAnyWord(haystack, MARKETING_KEYWORDS);
    return MARKETING_KEYWORDS.some((kw) => haystack.includes(kw));
  }

  function addBadge(checkbox) {
    if (checkbox.dataset.sieveCheckboxBadge === "true") return null;

    const badge = document.createElement("span");
    badge.textContent = BADGE_TEXT;
    badge.className = "sieve-pre-checked-badge";
    // Sieve's caution stamp: its own colours, so it reads on any page.
    badge.style.cssText = `
      display: inline-block;
      margin-left: 6px;
      padding: 2px 5px;
      font: 600 10px/1.2 ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #6b4500;
      background: #f6ecd6;
      border: 1px solid #b07d1f;
      border-radius: 2px;
      vertical-align: middle;
      white-space: nowrap;
    `;

    const label = getLabelFor(checkbox);
    if (label) {
      label.appendChild(badge);
    } else {
      checkbox.after(badge);
    }

    checkbox.dataset.sieveCheckboxBadge = "true";
    return badge;
  }

  function getLabelFor(checkbox) {
    if (checkbox.id) {
      const forLabel = document.querySelector(`label[for="${CSS.escape(checkbox.id)}"]`);
      if (forLabel) return forLabel;
    }
    const wrapping = checkbox.closest("label");
    if (wrapping) return wrapping;
    return null;
  }

  // Outline + badge: this detector's stamp, used at the ladder's "label" step.
  // It goes no higher — unticking a box could break a form that bundles the
  // opt-in with its terms — so the choice stays the user's. Returns its undo.
  function flag(checkbox) {
    const before = { outline: checkbox.style.outline, outlineOffset: checkbox.style.outlineOffset };
    checkbox.style.outline = "2px solid #b07d1f";
    checkbox.style.outlineOffset = "2px";
    const badge = addBadge(checkbox);
    return () => {
      checkbox.style.outline = before.outline;
      checkbox.style.outlineOffset = before.outlineOffset;
      if (badge) {
        badge.remove();
        delete checkbox.dataset.sieveCheckboxBadge;
      }
    };
  }

  function processCheckbox(checkbox, ctx) {
    if (ctx.isMarked(checkbox)) return;
    if (checkbox.type !== "checkbox") return;
    if (!checkbox.checked) return;
    if (!hasMarketingContext(checkbox, ctx)) return;
    ctx.mark(checkbox, TYPE);

    if (typeof ctx.tell !== "function") {
      flag(checkbox);
      ctx.report(TYPE, 1);
      return;
    }
    const label = getLabelFor(checkbox);
    const words = ((label && label.textContent) || "").trim().replace(/\s+/g, " ").slice(0, 90);
    ctx.tell(checkbox, {
      type: TYPE,
      confidence: "medium",
      maxLevel: ctx.LEVEL.LABEL,
      title: "A box ticked for you",
      detail: words ? `“${words}” was already ticked. Untick it if you don't want it.` : "A marketing opt-in was already ticked. Untick it if you don't want it.",
      labelWith: flag,
    });
  }

  function scan(root, ctx) {
    const selector = "input[type='checkbox']";
    const checkboxes = root.matches?.(selector) ? [root] : Array.from(root.querySelectorAll(selector));
    for (const checkbox of checkboxes) processCheckbox(checkbox, ctx);
    // Each processed checkbox already reports itself via ctx.report(). Return 0 so
    // the coordinator (dark-patterns.js scanRoot) doesn't tally the same
    // interventions a second time. (Matches the timers/scarcity convention.)
    return 0;
  }

  window.SieveDarkPatterns.register(TYPE, { scan });
})();

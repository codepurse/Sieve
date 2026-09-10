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
    if (checkbox.dataset.sieveCheckboxBadge === "true") return;

    const badge = document.createElement("span");
    badge.textContent = BADGE_TEXT;
    badge.className = "sieve-pre-checked-badge";
    badge.style.cssText = `
      display: inline-block;
      margin-left: 6px;
      padding: 1px 5px;
      font-size: 11px;
      line-height: 1.3;
      color: #713f12;
      background: #fef08a;
      border-radius: 4px;
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

  function highlight(checkbox) {
    checkbox.style.outline = "2px solid #facc15";
    checkbox.style.outlineOffset = "2px";
  }

  function processCheckbox(checkbox, ctx) {
    if (ctx.isMarked(checkbox)) return;
    if (checkbox.type !== "checkbox") return;
    if (!checkbox.checked) return;
    if (!hasMarketingContext(checkbox, ctx)) return;

    highlight(checkbox);
    addBadge(checkbox);
    ctx.mark(checkbox, TYPE);
    ctx.report(TYPE, 1);
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

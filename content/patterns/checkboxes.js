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

  function hasMarketingContext(checkbox) {
    const textSources = [];

    if (checkbox.id) {
      const label = document.querySelector(`label[for="${CSS.escape(checkbox.id)}"]`);
      if (label) textSources.push(label.textContent || "");
    }

    const wrappingLabel = checkbox.closest("label");
    if (wrappingLabel) textSources.push(wrappingLabel.textContent || "");

    textSources.push(checkbox.name || "", checkbox.getAttribute("aria-label") || "");

    let parent = checkbox.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
      textSources.push(parent.textContent || "");
      parent = parent.parentElement;
    }

    const haystack = textSources.join(" ").toLowerCase();
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
    if (!hasMarketingContext(checkbox)) return;

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

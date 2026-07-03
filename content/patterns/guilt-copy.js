// content/patterns/guilt-copy.js
// Sieve — Dark Pattern Blocker: guilt-trip dismiss buttons.
// Detects close/dismiss buttons that use manipulative negative framing
// ("No thanks, I don't want to save money") and rewrites them to a neutral
// label like "No thanks" or "Close". The button itself is never removed.

(() => {
  "use strict";

  const TYPE = "guiltCopy";

  // Positive thing being rejected — the source of the guilt trip.
  const POSITIVE_THINGS = [
    "save", "savings", "saving", "money", "discount", "discounts",
    "deal", "deals", "offer", "offers", "coupon", "coupons",
    "free", "bonus", "reward", "rewards", "gift", "gifts",
    "upgrade", "benefit", "benefits", "opportunity", "member", "membership",
  ];

  // Negative framing words.
  const NEGATIVE_WORDS = [
    "no", "not", "don't", "dont", "hate", "dislike", "refuse",
    "reject", "miss", "miss out", "rather not", "prefer not",
    "give up", "pass", "skip", "decline", "opt out",
  ];

  // Rewritten label depends on the original wording.
  function neutralLabel(text) {
    const t = text.toLowerCase();
    if (t.includes("no thanks") || t.includes("no, thanks")) return "No thanks";
    if (t.includes("close") || t.includes("dismiss") || t.includes("×") || t.includes("x")) return "Close";
    return "No thanks";
  }

  function looksLikeButton(el) {
    if (el.tagName === "BUTTON") return true;
    if (el.tagName === "A" && (el.href === "#" || !el.href || el.getAttribute("role") === "button")) return true;
    const role = el.getAttribute("role");
    if (role === "button") return true;
    const clickable = el.closest("button, [role='button']");
    return !!clickable;
  }

  function isGuiltTrip(text) {
    const t = text.toLowerCase();

    // Must contain negative framing.
    const hasNegative = NEGATIVE_WORDS.some((w) => t.includes(w));
    if (!hasNegative) return false;

    // Must mention something positive the user is supposedly rejecting.
    const hasPositive = POSITIVE_THINGS.some((w) => t.includes(w));
    if (!hasPositive) return false;

    // Guilt-trip copy is typically much longer than a normal dismiss button.
    if (text.length < 20) return false;

    return true;
  }

  function rewriteButton(el, ctx) {
    if (ctx.isMarked(el)) return;

    const text = (el.textContent || "").trim();
    if (!isGuiltTrip(text)) return;

    const label = neutralLabel(text);

    // Preserve any icons / child elements by replacing text nodes only.
    let textNodeFound = false;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
        child.textContent = " " + label + " ";
        textNodeFound = true;
      }
    }

    // If the element has no direct text node (e.g. everything wrapped in spans),
    // set aria-label and prepend the label text.
    if (!textNodeFound) {
      el.setAttribute("aria-label", label);
      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;
      el.insertBefore(labelSpan, el.firstChild);
    }

    // Add a subtle attribute so the user (and tests) can see it was touched.
    el.setAttribute("data-sieve-guilt-copy", "neutralized");
    ctx.mark(el, TYPE);
    ctx.report(TYPE, 1);
  }

  function scan(root, ctx) {
    let count = 0;
    const selector = "button, a, [role='button']";
    const elements = root.matches?.(selector) ? [root] : Array.from(root.querySelectorAll(selector));

    for (const el of elements) {
      if (!looksLikeButton(el) || ctx.isMarked(el)) continue;
      const text = (el.textContent || "").trim();
      if (text.length > 80) continue; // too long to be a button; probably a paragraph
      if (isGuiltTrip(text)) {
        rewriteButton(el, ctx);
        count++;
      }
    }

    return count;
  }

  window.SieveDarkPatterns.register(TYPE, { scan });
})();

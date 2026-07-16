// content/patterns/cookies.js
// Sieve — Dark Pattern Blocker: cookie consent banner normalizer.
// Detects common cookie-consent banners (OneTrust, Cookiebot, Osano, etc.) and,
// when the "Accept" button is visually dominant while "Reject" is hidden or
// tiny, levels the two buttons so the choice is fair. Nothing is auto-clicked.

(() => {
  "use strict";

  const TYPE = "cookies";

  const BANNER_SELECTORS = [
    "#onetrust-banner-sdk",
    "#onetrust-consent-sdk",
    "#CybotCookiebotDialog",
    "#CybotCookiebotDialogBody",
    ".cookiebot",
    ".cc-banner",
    ".cc-window",
    ".cookie-banner",
    ".cookie-consent",
    ".cookie-notice",
    ".cookie-modal",
    ".cookie-popup",
    ".osano-cm-window",
    "[data-testid='cookie-banner']",
    "[aria-label*='cookie' i]",
    "[aria-label*='cookies' i]",
  ];

  const ACCEPT_WORDS = ["accept", "agree", "allow", "yes", "continue", "got it", "okay", "ok"];
  const REJECT_WORDS = [
    "reject", "decline", "deny", "refuse", "disable",
    "necessary only", "essential only", "required only", "only necessary",
    "manage cookies", "cookie settings", "customize",
  ];

  function findBanner(root) {
    for (const sel of BANNER_SELECTORS) {
      const el = root.matches?.(sel) ? root : root.querySelector(sel);
      if (el) return el;
    }

    // Fallback: a fixed/sticky container containing cookie-related text and
    // both accept- and reject-like buttons.
    const buttons = root.querySelectorAll("button, a, [role='button']");
    const acceptBtn = findButtonByWords(buttons, ACCEPT_WORDS);
    const rejectBtn = findButtonByWords(buttons, REJECT_WORDS);
    if (acceptBtn && rejectBtn) {
      let node = acceptBtn.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        const isBannerLike =
          (style.position === "fixed" || style.position === "sticky") &&
          node.textContent.toLowerCase().includes("cookie");
        if (isBannerLike) return node;
        node = node.parentElement;
      }
    }

    return null;
  }

  function findButtonByWords(buttons, words) {
    for (const btn of buttons) {
      const text = (btn.textContent || "").toLowerCase();
      if (words.some((w) => text.includes(w))) return btn;
    }
    return null;
  }

  function isVisuallySuppressed(el) {
    if (!el) return true;
    const style = getComputedStyle(el);
    if (style.display === "none") return true;
    if (style.visibility === "hidden") return true;
    if (style.opacity === "0" || parseFloat(style.opacity) < 0.2) return true;
    if (el.getAttribute("aria-hidden") === "true") return true;
    return false;
  }

  function isTiny(el) {
    const rect = el.getBoundingClientRect();
    return rect.width < 20 || rect.height < 10;
  }

  function normalizeButtons(acceptBtn, rejectBtn, ctx) {
    if (ctx.isMarked(acceptBtn) && ctx.isMarked(rejectBtn)) return;

    // Make reject visible if hidden.
    rejectBtn.style.display = "";
    rejectBtn.style.visibility = "visible";
    rejectBtn.style.opacity = "1";
    rejectBtn.removeAttribute("aria-hidden");
    rejectBtn.removeAttribute("hidden");

    // Give both buttons a consistent minimum size and prominence.
    const baseStyle = `
      min-width: 100px !important;
      min-height: 36px !important;
      font-size: 14px !important;
      padding: 8px 16px !important;
      margin: 4px !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    `;

    acceptBtn.style.cssText += baseStyle;
    rejectBtn.style.cssText += baseStyle;

    acceptBtn.setAttribute("data-sieve-cookie", "leveled");
    rejectBtn.setAttribute("data-sieve-cookie", "leveled");

    ctx.mark(acceptBtn, TYPE);
    ctx.mark(rejectBtn, TYPE);
    ctx.report(TYPE, 1);
  }

  function scan(root, ctx) {
    const banner = findBanner(root);
    if (!banner || ctx.isMarked(banner)) return 0;

    const buttons = banner.querySelectorAll("button, a, [role='button']");
    const acceptBtn = findButtonByWords(buttons, ACCEPT_WORDS);
    const rejectBtn = findButtonByWords(buttons, REJECT_WORDS);

    if (!acceptBtn || !rejectBtn) return 0;

    // Only act if the banner looks manipulative: reject is hidden or much
    // smaller/less prominent than accept.
    if (isVisuallySuppressed(rejectBtn) || isTiny(rejectBtn)) {
      normalizeButtons(acceptBtn, rejectBtn, ctx);
      ctx.mark(banner, TYPE);
      // normalizeButtons() already reports via ctx.report(). Return 0 so the
      // coordinator (dark-patterns.js scanRoot) doesn't double-count this.
      return 0;
    }

    return 0;
  }

  window.SieveDarkPatterns.register(TYPE, { scan });

  // Also expose the leveling scan directly. The cookie auto-reject driver
  // (content/cookie-autoreject.js) calls this as a FALLBACK when no
  // Consent-O-Matic rule matches the site's CMP, so unsupported sites still get
  // their Accept/Reject buttons leveled. This does not change how the Dark
  // Pattern Blocker itself runs this detector; it's an additional entry point.
  window.SieveCookieLeveling = { scan };
})();

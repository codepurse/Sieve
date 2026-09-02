// content/anti-adblock-dom.js
// Sieve — anti-adblock defeat, DOM half. Runs in the ISOLATED world at
// document_start, registered dynamically by background/anti-adblock.js only
// while the toggle is on and never on a site the user allowlisted.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN content/anti-adblock.js ALREADY LIES TO THE DETECTOR
//
// The MAIN half stops the site reaching the conclusion. This one deals with the
// sites that reach it anyway — because the check was server-side, because it
// used a technique nothing here anticipated, or because the wall is shown to
// everyone regardless and the "detection" was theatre.
//
// The two fail in opposite directions, which is the point of having both, and it
// is the same split as the Facebook filter: one layer is precise and might miss,
// the other is blunt and looks at what is actually on screen.
//
// ---------------------------------------------------------------------------
// WHY IT READS TEXT INSTEAD OF MATCHING SELECTORS
//
// The obvious implementation is a list of selectors per site — #adblock-modal on
// this newspaper, .paywall-overlay on that one — which is what the upstream
// filter lists are. It works, and it needs a build step, a per-hostname bundle
// and someone re-checking a few thousand sites every week. Sieve does not have
// that, so this reads the wall the way a person does: find the thing covering
// the page, read what it says, and act if it is asking you to turn your ad
// blocker off. One rule, no list, nothing to keep up to date.
//
// The price is false positives, so the test is deliberately three conditions
// deep and every one of them has to hold:
//
//   1. the element must be COVERING something — fixed or sticky positioning, a
//      dialog, or an absolutely positioned box stacked above the page,
//   2. its text must be SHORT. A wall is a sentence and a button. An article
//      about ad blockers is not, and this is the condition that keeps this from
//      eating one,
//   3. the text must name an ad blocker AND ask for an action. Naming alone is
//      not enough for the same reason.
//
// ---------------------------------------------------------------------------
// WHAT "CLEARING" MEANS
//
// Nothing is deleted. The wall is hidden with an inline style, and the page is
// un-locked: the scroll lock, the blur, the pointer-events trap and the height
// clamp that come with a wall are all reverted on the elements carrying them.
// Turning the toggle off and reloading brings everything back exactly as the
// site sent it.
//
// The un-locking is the half people forget. A wall that is merely hidden leaves
// a page that cannot be scrolled and an article that is still blurred, which
// looks more broken than the wall did.

(() => {
  "use strict";

  // The isolated world has its own window, so this guard — and the test hook at
  // the bottom — are invisible to the page. That is why they can be named after
  // Sieve, where the MAIN half deliberately cannot be.
  if (window.__sieveAntiAdblockDom) return;

  const STATS_CATEGORY = "antiAdblock";

  // ==========================================================================
  // Reading the text
  // ==========================================================================

  // Fold to something comparable: lowercase, strip diacritics, and turn every
  // run of non-letters into a single space. That makes "ad-blocker",
  // "ad_blocker" and "Ad Blocker" the same string, and it is why the noun list
  // below needs only one spelling of each rather than a dozen.
  //
  // The diacritic fold is what lets the non-English entries be written in plain
  // ASCII: "désactivez" and "anúncios" arrive here as "desactivez" and
  // "anuncios", so nothing in the lists has to carry an accent that a site might
  // have written as a combining character, an HTML entity, or not at all.
  //
  // \p{L}\p{N} rather than a-z0-9 for the last step, so a script this feature
  // does not have words for is left as readable text rather than blanked — it
  // simply will not match, which is the right outcome.
  function normalise(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  // The thing being named. Both the spaced and the joined spelling of each,
  // because normalise() cannot join a word that was written with a space.
  //
  // Every entry is matched as a SUBSTRING of the normalised text, which is why
  // the multi-word ones are written in their shortest unambiguous form: the
  // singular "bloqueador de anuncio" finds the plural too, and truncating
  // "publicit" covers publicité, publicidad and publicidade at once.
  const BLOCKER_NOUNS = [
    "ad blocker", "adblocker", "ad block", "adblock", "ads blocker", "ad blocking",
    "ublock",
    // The same object in the other languages a wall is commonly written in.
    // Partial coverage on purpose — these are the ones worth the bytes, not a
    // claim to handle every locale.
    "werbeblocker",
    "bloqueador de anuncio", "bloqueador de publicidad", "bloqueador de propaganda",
    "bloqueur de publicit", "bloqueur de pub",
    "blocco pubblicit", "blocco degli annunci",
    "advertentieblokkeerder",
  ];

  // What it is asking for. A wall always asks — that is what makes it a wall
  // rather than a mention. Requiring an action as well as a noun is the single
  // condition doing most of the work here: an article headlined "the rise of ad
  // blockers" names one and asks for nothing.
  //
  // The verbs are STEMS, not words, and that is not laziness. A wall writes its
  // verb as a command — "désactivez", "desative", "disattiva" — and every
  // language here inflects that differently from the infinitive a word list
  // reaches for first. "desactiv" catches desactiva, desactivar and desactivez
  // in one entry; spelling out the conjugations means finding out which one is
  // missing from a bug report.
  const WALL_ACTIONS = [
    "disable", "disabling", "turn off", "switch off", "deactivat",
    "pause", "remove", "uninstall", "whitelist", "white list", "allowlist",
    "allow list", "add us to", "detected", "not allowed", "please support",
    "support us", "support our", "keep us", "we noticed", "we detected",
    "seem to be using", "appear to be using", "are using",
    // Same languages as above, same stemming.
    "desactiv", "desativ", "deaktivier", "disattiv", "uitschakel",
  ];

  // A wall is a sentence and a button. This cap is the condition that stops the
  // whole feature from hiding an article that happens to be about ad blocking —
  // measured on the element's own visible text, so a wall wrapping the page in
  // an overlay div does not inherit the article's length.
  const WALL_TEXT_CAP = 1200;

  // The cap used by the cheap pre-filter in sweep(), which reads textContent —
  // a SUPERSET of innerText, since it includes text that is not rendered. More
  // generous than WALL_TEXT_CAP so a wall carrying a hidden blurb still gets
  // through to the accurate test. The raw cap comes first and exists so
  // normalise()'s regex never runs over an article.
  const PREFILTER_RAW_CAP = 6000;
  const PREFILTER_TEXT_CAP = 4000;

  function mentionsWall(text, cap) {
    const t = normalise(text);
    if (!t || t.length > cap) return false;
    if (!BLOCKER_NOUNS.some((n) => t.includes(n))) return false;
    return WALL_ACTIONS.some((a) => t.includes(a));
  }

  // Pure, and exposed for the tests: this decides whether something gets hidden,
  // and it is wrong in two silent directions — a missed wall looks like the
  // feature not working, and a false match hides a page nobody complained about.
  function looksLikeWallText(text) {
    return mentionsWall(text, WALL_TEXT_CAP);
  }

  // ==========================================================================
  // Finding the thing that is covering the page
  // ==========================================================================
  //
  // getStyle is a parameter rather than a direct getComputedStyle call for two
  // reasons: it makes this testable against a hand-written style object, and it
  // lets the caller reuse one lookup across the two questions it asks.
  //
  // NOTE the MAIN half patches window.getComputedStyle — but only in the page's
  // world. This runs in the isolated world with its own copy, so what it reads
  // here is the truth. That separation is not incidental; a layer that unlocks
  // the page has to be able to see that the page is locked.
  const MIN_COVER_RATIO = 0.05; // of the viewport, by area

  function isCovering(el, getStyle) {
    const cs = getStyle(el);
    if (!cs) return false;

    const position = cs.position;
    const zIndex = parseInt(cs.zIndex, 10);
    const stacked = Number.isFinite(zIndex) && zIndex >= 100;

    // A <dialog open> or an ARIA modal says so outright and needs no geometry.
    try {
      if (el.tagName === "DIALOG" && el.hasAttribute("open")) return true;
      if (el.getAttribute("role") === "dialog" || el.getAttribute("aria-modal") === "true") return true;
    } catch {
      /* not an element we can question */
    }

    if (position === "fixed" || position === "sticky") return true;
    if (position !== "absolute" || !stacked) return false;

    // An absolutely positioned box only counts if it is actually big. Plenty of
    // legitimate furniture is absolute and stacked — tooltips, dropdowns, toasts.
    let rect;
    try {
      rect = el.getBoundingClientRect();
    } catch {
      return false;
    }
    const viewport = (window.innerWidth || 1) * (window.innerHeight || 1);
    return rect.width * rect.height >= viewport * MIN_COVER_RATIO;
  }

  // ==========================================================================
  // Un-locking the page
  // ==========================================================================
  //
  // The four things a wall does to the page underneath it, and the properties
  // that undo each: it stops the scroll (overflow, position, height), blurs the
  // content (filter), swallows clicks (pointer-events) and blocks selection
  // (user-select).
  //
  // Written as inline !important declarations because there is no stylesheet to
  // put them in — this feature ships no CSS, deliberately, since a stylesheet
  // broad enough to unlock every wall is also broad enough to break every real
  // modal on every site whether or not a wall was ever shown. Here they are only
  // ever applied to a page where a wall was actually found.
  const UNLOCK = {
    overflow: "auto",
    "overflow-x": "visible",
    "overflow-y": "auto",
    position: "static",
    height: "auto",
    "max-height": "none",
    filter: "none",
    "-webkit-filter": "none",
    "pointer-events": "auto",
    "user-select": "auto",
    "-webkit-user-select": "auto",
  };

  // Classes a site adds to <html> or <body> to hold the lock. Removed as well as
  // overridden, because a site's own stylesheet may carry rules keyed off them
  // that inline styles on the element cannot reach — a ::before backdrop, for
  // instance.
  const LOCK_CLASS = /(^|[-_])(no|hidden|lock|locked|blur|blurred|modal|overlay|adblock|paywall|noscroll)([-_]|$)|^(noscroll|scrolllock|overflowhidden)$/i;

  function unlockElement(el) {
    if (!el || !el.style) return;
    for (const [prop, value] of Object.entries(UNLOCK)) {
      try {
        el.style.setProperty(prop, value, "important");
      } catch {
        /* a property this browser will not take — the others still apply */
      }
    }
    try {
      for (const cls of [...el.classList]) {
        if (LOCK_CLASS.test(cls)) el.classList.remove(cls);
      }
    } catch {
      /* SVG or a frozen classList */
    }
  }

  // The marker left on a cleared wall. Doubles as the "already done" flag, and
  // that is load-bearing rather than tidy — see clearWall.
  const CLEARED_ATTR = "data-sieve-cleared";

  function alreadyCleared(el) {
    try {
      return el.hasAttribute(CLEARED_ATTR);
    } catch {
      return false;
    }
  }

  // Hide the wall, then unlock what it was covering.
  //
  // Hidden and not removed: reversible, and consistent with how the Facebook
  // filter treats a false positive. Also safer — a site whose own script walks
  // to the wall node afterwards finds it there rather than throwing.
  function clearWall(el) {
    // Refusing a second pass over the same element is what keeps the count
    // honest, and it is not hypothetical: writing the inline style below is
    // itself an attribute mutation, which the observer sees and re-queues. On
    // the next sweep the element is display:none — and innerText on an element
    // that is not being rendered falls back to its text content rather than
    // returning "", so the wall still reads as a wall and would be "cleared"
    // again. The work is idempotent; the tally is not.
    if (alreadyCleared(el)) return false;

    try {
      el.style.setProperty("display", "none", "important");
      el.setAttribute(CLEARED_ATTR, "adblock-wall");
    } catch {
      return false;
    }

    unlockElement(document.documentElement);
    unlockElement(document.body);

    // The blur is usually not on body but on the content wrapper the wall sits
    // beside, so walk the wall's own ancestors too. Bounded — this is a walk up,
    // not a search down, so it is a handful of nodes.
    let node = el.parentElement;
    let hops = 0;
    while (node && hops++ < 12) {
      let cs = null;
      try {
        cs = window.getComputedStyle(node);
      } catch {
        /* detached */
      }
      if (cs) {
        const blurred = cs.filter && cs.filter !== "none";
        const clamped = cs.overflow === "hidden" || cs.overflowY === "hidden";
        const inert = cs.pointerEvents === "none";
        if (blurred || clamped || inert) unlockElement(node);
      }
      node = node.parentElement;
    }

    // Siblings of the wall carrying the blur — the common shape is
    // <div class="content blurred"> next to <div class="adblock-modal">.
    try {
      const parent = el.parentElement;
      if (parent) {
        for (const sib of parent.children) {
          if (sib === el) continue;
          const cs = window.getComputedStyle(sib);
          if (cs && cs.filter && cs.filter !== "none") unlockElement(sib);
        }
      }
    } catch {
      /* nothing reachable — the ancestor walk above has already done the work */
    }

    return true;
  }

  // ==========================================================================
  // The sweep
  // ==========================================================================

  // Where a wall can be, without walking the whole document.
  //
  // This selector is the CHEAP path, not the reliable one, and it is worth being
  // clear about why. It finds the walls that are named after what they are —
  // #adblock-modal, .paywall-overlay, role="dialog" — which is most of them,
  // written by publishers who were not trying to hide.
  //
  // It finds nothing at all on the ones that were. Admiral, measured on
  // rollingstone.com, builds its wall with styled-components class hashes
  // (.DCDOr, .eRIqgq, .kMGqeO), randomised data-attribute names
  // (data-tzu6tlshqe), and no role, no dialog and no id — and rotates all of it.
  // There is no selector to write. That is exactly why this file judges by TEXT
  // rather than by selector, and why the candidate list below does not stop at
  // this selector: see bodyCandidates().
  const WALL_SELECTOR = [
    "dialog[open]",
    "[role='dialog']",
    "[aria-modal='true']",
    "[class*='adblock' i]",
    "[class*='ad-block' i]",
    "[class*='adBlock' i]",
    "[id*='adblock' i]",
    "[id*='ad-block' i]",
    "[class*='paywall' i]",
    "[id*='paywall' i]",
    "[class*='blocker' i]",
    "[id*='blocker' i]",
  ].join(",");

  // Cost ceilings. A page that appends thousands of nodes must not turn this
  // into a profiler entry, and a wall that will not stay hidden must not become
  // an infinite loop between the site's script and ours.
  const MAX_CANDIDATES_PER_SWEEP = 400;
  const MAX_CLEARED = 8;

  // Late sweeps, because a wall is shown AFTER the detection runs — commonly on
  // a timer, sometimes after the article has rendered. These are the moments
  // worth a look on top of whatever the observer reports; after the last one the
  // observer is the only trigger.
  const SWEEP_DELAYS_MS = [0, 400, 1200, 3000, 6000, 10000];

  let cleared = 0;
  let observer = null;
  const seen = new WeakSet();
  const pending = new Set();
  let scheduled = false;

  function consider(el, out) {
    if (!el || el.nodeType !== 1 || seen.has(el) || alreadyCleared(el)) return;
    seen.add(el);
    out.push(el);
  }

  // The selector-free path, for a wall whose class names are generated.
  //
  // A wall has to be attached near the top of the document to cover it, so the
  // whole search space is body's own children and one level under them. That is
  // tens of nodes on a real page, not thousands — and it is bounded by
  // MAX_CANDIDATES_PER_SWEEP like everything else.
  //
  // This is not a substitute for the observer, which sees the wall arrive. It is
  // the backstop for the case the observer cannot cover: a wall that was already
  // in the document before this script started, or one whose insertion record
  // was drained by our own writes.
  function bodyCandidates(out) {
    const body = document.body;
    if (!body) return;
    for (const child of body.children) {
      if (out.length >= MAX_CANDIDATES_PER_SWEEP) return;
      consider(child, out);
      for (const grand of child.children) {
        if (out.length >= MAX_CANDIDATES_PER_SWEEP) return;
        consider(grand, out);
      }
    }
  }

  function candidates() {
    const out = [];
    for (const el of pending) consider(el, out);
    pending.clear();
    try {
      for (const el of document.querySelectorAll(WALL_SELECTOR)) {
        if (out.length >= MAX_CANDIDATES_PER_SWEEP) break;
        consider(el, out);
      }
    } catch {
      /* a browser without case-insensitive attribute selectors — the observer
         and bodyCandidates still feed this, so the sweep degrades rather than
         stops */
    }
    bodyCandidates(out);
    return out.slice(0, MAX_CANDIDATES_PER_SWEEP);
  }

  function sweep() {
    scheduled = false;
    if (cleared >= MAX_CLEARED || !document.body) return;

    let hit = 0;
    for (const el of candidates()) {
      if (cleared >= MAX_CLEARED) break;

      // TWO STAGES on the text, and the order is what lets the candidate list
      // be as wide as it is.
      //
      // textContent is free — no layout. innerText forces a reflow, and doing
      // that for every candidate on every sweep is how a content script turns
      // into a performance bug. So the free read decides who is worth the
      // expensive one, and the raw length is checked before even that, so
      // normalise()'s regex never runs across an article.
      //
      // Over-selecting is the only safe direction for a pre-filter, and
      // textContent over-selects by construction: it is innerText plus the text
      // that is not being rendered.
      let raw = "";
      try {
        raw = el.textContent || "";
      } catch {
        continue;
      }
      if (raw.length > PREFILTER_RAW_CAP) continue;
      if (!mentionsWall(raw, PREFILTER_TEXT_CAP)) continue;

      // Now the accurate test. innerText is layout-aware, which is why it is
      // worth the reflow: a wall's hidden template copy reads as empty here and
      // is dropped for free.
      let text = "";
      try {
        text = el.innerText || "";
      } catch {
        continue;
      }
      if (!looksLikeWallText(text)) continue;

      // Only now ask the expensive geometry question.
      if (!isCovering(el, (node) => window.getComputedStyle(node))) continue;

      if (clearWall(el)) {
        cleared++;
        hit++;
      }
    }

    // Throw away the records our OWN writes just generated. Unlocking the page
    // touches the style and class attributes of <html>, <body> and the wall's
    // ancestors, every one of which the observer is watching — so without this
    // a single wall schedules another sweep, which schedules another. Draining
    // here is cheaper and more certain than trying to recognise our own
    // mutations after the fact.
    if (hit && observer) {
      try {
        observer.takeRecords();
      } catch {
        /* the guards in consider() and clearWall() still stop the loop */
      }
    }

    if (hit) report(hit);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    try {
      setTimeout(sweep, 150);
    } catch {
      scheduled = false;
    }
  }

  // What crosses to the extension: one positive integer, and nothing else. Not
  // the site, not the wall's text, not the selector that matched.
  function report(count) {
    try {
      chrome.runtime.sendMessage({ type: "SIEVE_RECORD_BLOCK", category: STATS_CATEGORY, count })?.catch(() => {});
    } catch {
      /* extension context invalidated mid-navigation — a lost count is not
         worth surfacing */
    }
  }

  function onMutations(records) {
    for (const rec of records) {
      for (const node of rec.addedNodes || []) {
        if (node.nodeType !== 1) continue;
        if (pending.size < MAX_CANDIDATES_PER_SWEEP) pending.add(node);
      }
      // A site that shows its wall by adding a class to an existing element
      // rather than inserting one. The target is already in the document, so it
      // costs nothing to re-consider it — but it may already be in `seen`, so
      // clear that first or the second look never happens.
      if (rec.type === "attributes" && rec.target && rec.target.nodeType === 1) {
        seen.delete(rec.target);
        if (pending.size < MAX_CANDIDATES_PER_SWEEP) pending.add(rec.target);
      }
    }
    if (pending.size) schedule();
  }

  function start() {
    for (const delay of SWEEP_DELAYS_MS) {
      try {
        setTimeout(sweep, delay);
      } catch {
        /* no timers in this context */
      }
    }
    try {
      observer = new MutationObserver(onMutations);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        // Only the two attributes a wall is switched on with. Watching all of
        // them on a modern site is thousands of records a second.
        attributeFilter: ["class", "style"],
      });
    } catch {
      /* no observer — the timed sweeps above still run */
    }
  }

  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  // Test and console hook. Safe to name after Sieve: isolated world.
  window.__sieveAntiAdblockDom = {
    normalise,
    looksLikeWallText,
    isCovering,
    clearWall,
    unlockElement,
    sweep,
    state: () => ({ cleared, pending: pending.size }),
    WALL_TEXT_CAP,
  };
})();

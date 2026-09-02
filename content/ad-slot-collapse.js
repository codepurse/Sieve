// content/ad-slot-collapse.js
// Sieve — collapses the empty boxes left behind after an ad was blocked. Runs in
// the ISOLATED world, registered dynamically by background/ad-slot-collapse.js
// only while the toggle is on, and never on a site the user allowlisted.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
//
// Blocking an ad's request stops the ad. It does not remove the box the ad was
// going to sit in, and the box keeps its reserved height. Measured on one
// indiewire.com gallery page with the whole domain list applied: no ad rendered,
// and **96 empty slots totalling 29,042px** of blank space. That is why a page
// can look worse with a blocker than without one, and why people report "the ads
// are still there" when what they are seeing is the holes.
//
// The proper fix is cosmetic filtering — EasyList's 24,516 element-hiding rules,
// which need a per-hostname bundle and a build step. This is the cheap 80%: no
// filter list, nothing to keep up to date, and it only ever hides a box that is
// ALREADY EMPTY. It cannot remove an ad that loaded; that is the other job.
//
// ---------------------------------------------------------------------------
// THE TIMING IS THE WHOLE DESIGN
//
// Hiding an ad slot with display:none is precisely the answer an adblock
// detector is looking for. content/anti-adblock.js spends most of its length
// making empty ad-shaped boxes claim to be 300x250 for exactly that reason, and
// this file would undo that work if it ran at the same time.
//
// So it does not run at the same time. It waits until the anti-adblock probe
// window has closed — that file's PROBE_WINDOW_MS is 10 seconds — and only then
// starts hiding. By then a detector has asked its question and been answered.
//
// COLLAPSE_DELAY_MS below must therefore stay comfortably GREATER than
// PROBE_WINDOW_MS in content/anti-adblock.js. If you shorten it, you are
// choosing to hand adblock walls the evidence they were looking for.
//
// The residual risk, stated plainly: a site that re-checks for a blocker after
// the delay will catch a collapsed slot. That is the same trade the probe window
// already makes — the alternative is patching layout getters forever, on every
// page, which costs every reader real performance to defeat a check almost no
// site makes twice.
//
// ---------------------------------------------------------------------------
// WHAT IT WILL NOT TOUCH
//
// Hiding things breaks pages, so a box has to clear five separate hurdles. The
// name test is the interesting one and it is the same whole-token approach as
// content/anti-adblock.js, for the same reason: a substring match on "ad" also
// matches shadow, header, gradient, padding, download, loading, thread and read.
// Nothing is deleted — an inline style is set, so turning the toggle off and
// reloading brings every box back exactly as the site sent it.

(() => {
  "use strict";

  if (window.__sieveAdSlotCollapse) return;

  const STATS_CATEGORY = "adSlots";

  // Must stay > PROBE_WINDOW_MS in content/anti-adblock.js (10s). See above.
  const COLLAPSE_DELAY_MS = 12000;

  // ==========================================================================
  // Is this box an ad slot?
  // ==========================================================================

  const SLOT_TOKENS = new Set([
    "ad", "ads", "advert", "adverts", "advertising", "advertisement", "advertisements",
    "adbanner", "adbanners", "adbox", "adsbox", "adslot", "adslots", "adunit", "adunits",
    "adzone", "adframe", "adarea", "adspace", "adwrapper", "adcontainer", "adsense",
    "adsbygoogle", "adtech", "sponsored",
    // Ad-server plumbing that names its own containers. "gpt" is Google
    // Publisher Tag and is what caught div-gpt-indiewire-gallery-rail-middle;
    // "dfp" is its former name and still in use.
    "gpt", "dfp",
    // Native/"recommended for you" widgets, which are advertising wearing
    // editorial clothes.
    "taboola", "outbrain", "mgid", "revcontent", "zergnet",
  ]);

  // Names that only mean anything whole — a generated slot id splits into
  // meaningless pieces, and "300x250" alone is not evidence of anything.
  const SLOT_PREFIXES = ["div-gpt-", "google_ads_", "aswift_", "taboola-", "outbrain_", "pub_300x250"];

  // Deliberately NOT included: "banner" and "promo" on their own. A hero banner
  // and a site's own promo strip are not adverts, and both names are far too
  // common to hide on sight. "adbanner" and "bannerad" are in the set instead.

  function tokensOf(name) {
    if (!name || typeof name !== "string") return [];
    return name
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  function nameIsSlot(name) {
    if (!name || typeof name !== "string") return false;
    const lower = name.toLowerCase();
    for (const word of lower.split(/\s+/)) {
      for (const p of SLOT_PREFIXES) if (word.startsWith(p)) return true;
    }
    for (const t of tokensOf(name)) if (SLOT_TOKENS.has(t)) return true;
    return false;
  }

  // Only boxes. A landmark element is page structure, and a site that put an
  // ad-ish class on its <main> should not lose its main.
  const BOXES = new Set(["DIV", "SECTION", "ASIDE", "INS", "SPAN", "FIGURE", "P", "UL", "LI"]);

  // A slot is a box, not a region. Two ceilings, both there to stop this
  // collapsing a layout container that happens to be named after advertising:
  // one on how much of the viewport it covers, one on how much DOM it holds.
  // (The tallest real slot measured was 301x1074 — 26% of a 1400x900 viewport —
  // so these are well clear of a genuine skyscraper unit.)
  const MAX_VIEWPORT_SHARE = 0.5;
  const MAX_DESCENDANTS = 40;

  function isEmptySlot(el) {
    if (!el || el.nodeType !== 1 || !BOXES.has(el.tagName)) return false;

    // Cheapest first: the name. Nothing else is asked of a box that is not
    // named after an advert.
    if (!(nameIsSlot(el.id) || nameIsSlot(el.getAttribute("class")))) return false;

    if (el.querySelectorAll("*").length > MAX_DESCENDANTS) return false;

    // Empty of anything a reader would see — and getting this wrong once meant
    // the whole feature did nothing at all, so it is worth the paragraph.
    //
    // A blocked ad slot usually still holds the inline <script> that was going
    // to fill it, and textContent counts script source as text. Measured on
    // indiewire.com: 94 slots each "held" ~400 characters of
    // blogherads.defineSlot('medrec', …), were judged non-empty, and not one was
    // collapsed. Their innerText was "" throughout.
    //
    // innerText would be correct on its own — it is layout-aware and returns ""
    // for a script-only box — but it forces a reflow for every candidate on
    // every sweep, which is the cost this whole file is arranged to avoid.
    // Subtracting the children that are never rendered costs nothing and gets
    // the same answer.
    const text = (el.textContent || "").trim();
    if (text.length > 2) {
      let unrendered = 0;
      for (const node of el.querySelectorAll("script, style, template, noscript")) {
        unrendered += (node.textContent || "").length;
      }
      if (text.length - unrendered > 2) return false;
    }
    for (const img of el.querySelectorAll("img")) {
      if (img.naturalWidth > 20 && img.naturalHeight > 20) return false;
    }
    for (const media of el.querySelectorAll("iframe, video, canvas, svg, embed, object")) {
      if (media.offsetWidth > 20 && media.offsetHeight > 20) return false;
    }

    // Is it actually taking up space right now?
    let cs, rect;
    try {
      cs = window.getComputedStyle(el);
      rect = el.getBoundingClientRect();
    } catch {
      return false;
    }
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (rect.width < 20 || rect.height < 20) return false;

    const viewport = (window.innerWidth || 1) * (window.innerHeight || 1);
    if (rect.width * rect.height > viewport * MAX_VIEWPORT_SHARE) return false;

    return true;
  }

  // ==========================================================================
  // Collapsing
  // ==========================================================================

  const MARK = "data-sieve-collapsed";
  const MAX_PER_PAGE = 400; // a gallery page really does have ~100; this is a ceiling

  let collapsed = 0;
  let observer = null;
  let armed = false;

  function collapse(el) {
    try {
      if (el.hasAttribute(MARK)) return false;
      el.style.setProperty("display", "none", "important");
      el.setAttribute(MARK, "empty-ad-slot");
      return true;
    } catch {
      return false;
    }
  }

  function sweep() {
    if (!armed || collapsed >= MAX_PER_PAGE || !document.body) return;
    let hit = 0;

    // querySelectorAll on the two attributes that can carry the name, rather
    // than walking every element: a slot is always named, so there is nothing to
    // find among the unnamed. Falls back to a full walk only if the browser
    // rejects the selector.
    let candidates;
    try {
      candidates = document.querySelectorAll("[class],[id]");
    } catch {
      candidates = document.getElementsByTagName("*");
    }

    for (const el of candidates) {
      if (collapsed >= MAX_PER_PAGE) break;
      if (!isEmptySlot(el)) continue;
      if (collapse(el)) {
        collapsed++;
        hit++;
      }
    }

    // Discard the records our own writes just made, or the observer re-queues
    // every box we touched and the sweep feeds itself. Same fix, same reason as
    // content/anti-adblock-dom.js.
    if (hit && observer) {
      try {
        observer.takeRecords();
      } catch {
        /* the MARK check in collapse() still stops the loop */
      }
    }
    if (hit) report(hit);
  }

  // One positive integer crosses to the extension. Not the site, not the
  // selector, not the size.
  function report(count) {
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: STATS_CATEGORY, count })
        ?.catch(() => {});
    } catch {
      /* extension context invalidated mid-navigation */
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled || !armed) return;
    scheduled = true;
    try {
      setTimeout(() => {
        scheduled = false;
        sweep();
      }, 400);
    } catch {
      scheduled = false;
    }
  }

  function start() {
    // Nothing happens until the anti-adblock probe window has closed.
    try {
      setTimeout(() => {
        armed = true;
        sweep();
      }, COLLAPSE_DELAY_MS);
    } catch {
      return; // no timers: better to do nothing than to hide things too early
    }

    // Ads load lazily on scroll, so slots keep arriving long after load. The
    // observer only schedules a sweep once armed.
    try {
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch {
      /* no observer — the single armed sweep above still runs */
    }
    try {
      window.addEventListener("scroll", schedule, { passive: true });
    } catch {
      /* nothing to do */
    }
  }

  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  // Test and console hook. Isolated world, so this is invisible to the page.
  window.__sieveAdSlotCollapse = {
    tokensOf,
    nameIsSlot,
    isEmptySlot,
    collapse,
    sweep,
    arm: () => {
      armed = true;
    },
    state: () => ({ collapsed, armed }),
    COLLAPSE_DELAY_MS,
  };
})();

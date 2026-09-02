// content/float-video.js
// Sieve — stops video players that follow you down the page.
//
// Runs in the ISOLATED world, registered dynamically by background/float-video.js
// only while the toggle is on, and never on a site the user allowlisted.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
//
// Scroll past the video at the top of a news article and it does not stay
// there: it shrinks into a corner and rides down the page with you, usually
// playing, usually with an advert in it, usually with a close button too small
// to hit. JW Player calls it float-on-scroll, Video.js calls it sticky, and
// most publishers have hand-rolled one under some name of their own.
//
// This is NOT something an ad blocker can reach. The floating player is the
// site's own furniture, served from the site's own address, and switched on by
// the site's own JavaScript — there is no request to block that would not also
// block the article. So this is a cosmetic feature, a sibling of
// content/ad-slot-collapse.js rather than of the domain tiers.
//
// ---------------------------------------------------------------------------
// UN-FLOAT, DO NOT HIDE
//
// The player is put back in the article. It is not removed, not hidden, and not
// closed on the user's behalf.
//
// Hiding is the obvious shortcut and it is wrong twice over. On a site where
// the video IS the article, hiding leaves a hole where the thing you came for
// used to be. And clicking the player's own close button — which several of
// these do ship, and which would give a tidier result than any style we can
// set — is not reversible: a synthetic click changes the site's own state, so
// switching this feature off and reloading would no longer bring the page back
// the way the site sent it. Everything else in this suite keeps that promise
// and so does this. Nothing here is deleted and nothing is even styled: one
// attribute is set on the box, content/float-video.css does the rest, and a
// reload with the toggle off restores the page exactly.
//
// ---------------------------------------------------------------------------
// TWO LAYERS, AND WHY THE ORDER MATTERS
//
//   1. content/float-video.css names the players we know. That rule is in the
//      cascade before the site's first script runs, so the site can add and
//      re-add its floating class forever without winning. No race.
//
//   2. This file catches the ones nobody has named, by SHAPE: a player that has
//      become fixed or sticky, and is corner-sized rather than page-sized. It
//      does not style them either — it marks them, and the stylesheet has a
//      rule for the mark. See unfloat() for why that distinction is the
//      difference between winning and losing to a site that re-floats on every
//      scroll event.
//
// The script also watches the named ones — not to fix them, the stylesheet has
// already done that, but because the class appearing is the only reliable
// signal that the site just TRIED to float something, and that is what the
// counter counts.
//
// ---------------------------------------------------------------------------
// NO PROBE-WINDOW DELAY, UNLIKE THE SLOT COLLAPSER
//
// content/ad-slot-collapse.js waits twelve seconds before it touches anything,
// because hiding an ad-shaped box is exactly the evidence an adblock detector
// is looking for. That reasoning does not carry over here and it is worth
// saying so, because the two files otherwise look alike. Detectors probe for
// bait elements they planted and ask whether those were hidden. Nothing here
// hides anything, and a video player is not bait. So this runs immediately.
//
// ---------------------------------------------------------------------------
// WHAT IT WILL NOT TOUCH
//
// Un-sticking the wrong thing is how this feature would earn a bug report, so a
// box has to clear several hurdles. The one that matters most is not a
// heuristic at all: a <video> playing a MediaStream is a video CALL, and the
// floating tile in a call is the feature, not the annoyance. That test catches
// every conferencing site, including the ones nobody thought to exclude by
// name. Sites where floating video IS the product are excluded from the
// registration outright — see background/float-video.js.

(() => {
  "use strict";

  if (window.__sieveFloatVideo) return;

  const STATS_CATEGORY = "floatVideo";

  // ==========================================================================
  // The named players
  // ==========================================================================

  // Every selector here must also appear in content/float-video.css, which is
  // what actually un-floats them; this list is how the script knows a site just
  // tried to float something. test/float-video-css-test.mjs pins the pairing.
  const KNOWN_FLOAT_SELECTORS = [
    ".jw-flag-floating",
    ".vjs-sticky",
    ".video-js.vjs-float",
    ".cnx-floating",
    ".cnx-fixed",
    ".exco-floating",
    ".anyclip-floating",
    ".lre-floating",
    ".sticky-video",
    ".sticky-player",
    ".video-sticky",
    ".player-sticky",
    ".floating-player",
    ".floating-video",
    ".is-sticky-video",
    ".pinned-video",
    ".docked-video",
    ".minimized-player",
  ];

  const KNOWN_SELECTOR = KNOWN_FLOAT_SELECTORS.join(",");

  // Players that live in an iframe. We cannot see inside one, but we do not need
  // to — the box that floats is on our side of it.
  const PLAYER_IFRAME_HOSTS = [
    "youtube.com/embed",
    "youtube-nocookie.com/embed",
    "player.vimeo.com",
    "players.brightcove.net",
    "cdn.jwplayer.com",
    "content.jwplatform.com",
    "cdn.connatix.com",
    "player.anyclip.com",
    "player.ex.co",
    "kaltura.com",
    "dailymotion.com/embed",
    "megaphone.fm",
  ];

  // ==========================================================================
  // Is this a player?
  // ==========================================================================

  function isPlayerNode(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === "VIDEO") return true;
    if (el.tagName !== "IFRAME") return false;
    const src = el.getAttribute("src") || el.getAttribute("data-src") || "";
    if (typeof src !== "string" || !src) return false;
    const lower = src.toLowerCase();
    return PLAYER_IFRAME_HOSTS.some((h) => lower.includes(h));
  }

  // The single most important test in the file.
  //
  // A <video> whose source is a MediaStream is a live camera feed, which means
  // this is a video call and the little box in the corner is the person you are
  // talking to — or yourself. Un-sticking that is not a fix, it is a fault, and
  // it would happen on every conferencing site that is not on the exclusion
  // list by name. srcObject catches all of them at once, including the ones
  // nobody has heard of.
  function isLiveStream(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === "VIDEO") return !!el.srcObject;
    let videos;
    try {
      videos = el.querySelectorAll("video");
    } catch {
      return false;
    }
    for (const v of videos) if (v.srcObject) return true;
    return false;
  }

  // Picture-in-picture and fullscreen are both the user having asked for this
  // exact behaviour. Never argue with that.
  function isUserRequested(el) {
    try {
      const pip = document.pictureInPictureElement;
      if (pip && (pip === el || el.contains?.(pip))) return true;
      const full = document.fullscreenElement;
      if (full && (full === el || el.contains?.(full))) return true;
    } catch {
      /* older engines expose neither; nothing to check */
    }
    return false;
  }

  // ==========================================================================
  // Is it floating?
  // ==========================================================================

  const FLOATY = new Set(["fixed", "sticky"]);
  const MAX_ANCESTORS = 6; // JW puts the fixed position two levels above <video>

  // A floating player is a CORNER, not a page. These ceilings are what separates
  // one from a full-screen video lightbox, a cinema-mode player, or the main
  // player on a site that is nothing but video — all of which are fixed and all
  // of which should be left alone.
  const MAX_VIEWPORT_W_SHARE = 0.6;
  const MAX_VIEWPORT_H_SHARE = 0.6;

  // And it is big enough to see. Below this it is a thumbnail, a control, or a
  // one-pixel autoplay dodge, none of which follow anybody anywhere.
  const MIN_W = 80;
  const MIN_H = 60;

  function computedPosition(el) {
    try {
      return window.getComputedStyle(el).position;
    } catch {
      return "";
    }
  }

  function isCornerSized(el) {
    let rect;
    try {
      rect = el.getBoundingClientRect();
    } catch {
      return false;
    }
    if (rect.width < MIN_W || rect.height < MIN_H) return false;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    if (rect.width > vw * MAX_VIEWPORT_W_SHARE) return false;
    if (rect.height > vh * MAX_VIEWPORT_H_SHARE) return false;
    return true;
  }

  // Walk up from a player looking for the box that was made to float. Returns
  // the element to fix, or null.
  function floatingAncestor(node) {
    let el = node;
    for (let i = 0; el && el.nodeType === 1 && i <= MAX_ANCESTORS; i++, el = el.parentElement) {
      if (!FLOATY.has(computedPosition(el))) continue;
      if (!isCornerSized(el)) return null; // page-sized: a lightbox, not a corner
      return el;
    }
    return null;
  }

  // ==========================================================================
  // Un-floating
  // ==========================================================================

  const MARK = "data-sieve-unfloated";
  const MAX_PER_PAGE = 8; // three would be a lot; this is a ceiling, not a target

  let unfloated = 0;
  let observer = null;
  let writing = false;

  // Setting ONE ATTRIBUTE is the whole of it. content/float-video.css carries a
  // [data-sieve-unfloated] rule and that rule is what moves the box.
  //
  // The obvious implementation writes the positioning as an inline style here,
  // and it loses. A site whose float-on-scroll handler assigns
  // el.style.position on every scroll event overwrites an inline style we set,
  // even one flagged !important — assigning through the CSSOM replaces the
  // declaration and drops the priority with it. The only way to hold an inline
  // style would be to keep rewriting it on every scroll for the rest of the
  // session, which is a fight, and one the reader's battery pays for.
  //
  // An author-origin !important rule is a higher cascade tier than every normal
  // declaration, inline ones included. So the site can assign position: fixed
  // as often as it likes and never win. Both halves of that were measured in
  // Chrome rather than assumed.
  //
  // It also means nothing on the page is styled by this file at all: one
  // attribute is added, and a reload with the toggle off leaves no trace.
  //
  // Returns true only the FIRST time an element is marked, so the counter counts
  // players rather than scroll events.
  function unfloat(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (el.hasAttribute(MARK)) return false;
      writing = true;
      el.setAttribute(MARK, "floating-video");
    } catch {
      return false;
    } finally {
      writing = false;
    }
    return true;
  }

  // Some implementations put the floating class on an outer element and the
  // fixed positioning on an inner one, so a named match has to be treated as a
  // small subtree rather than a single box.
  function unfloatSubtree(root) {
    // The mark on the root means an earlier scan already walked this player.
    // Bailing here is not just tidiness: the walk below costs up to forty
    // getComputedStyle calls, each one a style recalculation, and scan() runs
    // on every scroll. Repeating it for a player that has already been dealt
    // with would spend that on every scroll of a page that is, by definition,
    // playing a video at the time.
    if (!unfloat(root)) return false;
    let inner;
    try {
      inner = root.querySelectorAll("*");
    } catch {
      return true;
    }
    let i = 0;
    for (const el of inner) {
      if (i++ > 40) break; // a player shell, not a page
      if (!FLOATY.has(computedPosition(el))) continue;
      unfloat(el);
    }
    return true;
  }

  // ==========================================================================
  // Scanning
  // ==========================================================================

  function scan() {
    if (unfloated >= MAX_PER_PAGE || !document.body) return;
    let hit = 0;

    // 1. The named players. A match means the site just added its floating
    //    class — the stylesheet has already taken the position away, so this is
    //    belt-and-braces plus the count.
    let named = [];
    try {
      named = document.querySelectorAll(KNOWN_SELECTOR);
    } catch {
      named = [];
    }
    for (const el of named) {
      if (unfloated >= MAX_PER_PAGE) break;
      if (isLiveStream(el) || isUserRequested(el)) continue;
      if (unfloatSubtree(el)) {
        unfloated++;
        hit++;
      }
    }

    // 2. Everything else, by shape.
    let players = [];
    try {
      players = document.querySelectorAll("video,iframe");
    } catch {
      players = [];
    }
    for (const node of players) {
      if (unfloated >= MAX_PER_PAGE) break;
      if (!isPlayerNode(node)) continue;
      if (isLiveStream(node) || isUserRequested(node)) continue;
      const box = floatingAncestor(node);
      if (!box) continue;
      if (isUserRequested(box)) continue;
      if (unfloat(box)) {
        unfloated++;
        hit++;
      }
    }

    // Discard the records our own writes just made, or the observer re-queues
    // every box we touched and the scan feeds itself. Same fix, same reason as
    // content/ad-slot-collapse.js and content/anti-adblock-dom.js.
    if (observer) {
      try {
        observer.takeRecords();
      } catch {
        /* the `writing` flag still stops the loop */
      }
    }
    if (hit) report(hit);
  }

  // One positive integer crosses to the extension. Not the site, not the
  // player, not the URL.
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
    if (scheduled || writing) return;
    scheduled = true;
    try {
      setTimeout(() => {
        scheduled = false;
        scan();
      }, 250);
    } catch {
      scheduled = false;
    }
  }

  // Floating is a response to SCROLL, which is why there is no polling here:
  // the event that causes the thing is the event we listen for. The timed scans
  // are for the minority that float on a delay after load instead, and the
  // childList observer is for players inserted later — an article that lazy-
  // loads its video, or a single-page news site changing story without a
  // navigation.
  const DELAYED_SCANS_MS = [1000, 3000, 8000];

  function start() {
    try {
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule, { passive: true });
    } catch {
      /* nothing to do */
    }

    try {
      observer = new MutationObserver(() => {
        if (!writing) schedule();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch {
      /* no observer — scroll and the timed scans still run */
    }

    // Deliberately NOT an attribute observer. The obvious way to notice a
    // floating class being added is attributeFilter: ["class", "style"] over the
    // whole subtree, and it is a performance trap: a playing video updates
    // inline styles on its progress bar many times a second, so that observer
    // fires continuously on exactly the pages this feature runs on.

    for (const ms of DELAYED_SCANS_MS) {
      try {
        setTimeout(scan, ms);
      } catch {
        /* nothing to do */
      }
    }
    scan();
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  // Test and console hook. Isolated world, so this is invisible to the page.
  window.__sieveFloatVideo = {
    KNOWN_FLOAT_SELECTORS,
    isPlayerNode,
    isLiveStream,
    isUserRequested,
    isCornerSized,
    floatingAncestor,
    unfloat,
    unfloatSubtree,
    scan,
    state: () => ({ unfloated }),
    MARK,
    MAX_PER_PAGE,
  };
})();

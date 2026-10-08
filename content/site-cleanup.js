// content/site-cleanup.js
// Sieve — Site Cleanup driver (currently YouTube only).
//
// Runs at document_start and does as little as possible: it reads the user's
// per-site toggles and puts one class per enabled toggle on <html>. All of the
// hiding lives in content/youtube-clean.css, which the manifest injects
// alongside this file, so nothing depends on this script beating YouTube's
// renderer — the worst case is a few milliseconds of unhidden content while the
// (async) storage read resolves.
//
// Only two things genuinely need script:
//   - redirects, because CSS can't leave a page (/shorts/ID → /watch?v=ID)
//   - autoplay, because it's a control inside YouTube's player, not markup
//
// Settings shape (chrome.storage.local):
//   siteCleanup: { youtube: { enabled, hideHome, hideShorts, … } }
// background/youtube-suggest.js reads the same key for the one toggle that also
// needs a network rule (hideSearchSuggestions); everything else is only here.
// A missing key means "off": with no settings at all this script does nothing
// and YouTube looks completely untouched. Failing visible is the safe default —
// if this file ever throws, the user gets a normal YouTube rather than a blank
// one.

(() => {
  "use strict";

  if (window.__sieveSiteCleanup) return;
  window.__sieveSiteCleanup = true;

  const STORAGE_KEY = "siteCleanup";
  const SITE = "youtube";

  // toggle key -> the <html> class that content/youtube-clean.css keys off
  const CLASSES = {
    hideHome: "sv-yt-hide-home",
    hideShorts: "sv-yt-hide-shorts",
    hideComments: "sv-yt-hide-comments",
    hideRecommended: "sv-yt-hide-recommended",
    hideThumbnails: "sv-yt-hide-thumbs",
    blurThumbnails: "sv-yt-blur-thumbs",
    hideSubscriptions: "sv-yt-hide-subs",
    hideExplore: "sv-yt-hide-explore",
    hideTopBar: "sv-yt-hide-topbar",
    disableEndCards: "sv-yt-no-endcards",
    hideInfoCards: "sv-yt-hide-infocards",
    blackAndWhite: "sv-yt-bw",
    // Finer controls — the video page, search filler, and single bits of chrome
    hideDescription: "sv-yt-hide-description",
    hideChannelInfo: "sv-yt-hide-channel",
    hideActionButtons: "sv-yt-hide-actions",
    hideLiveChat: "sv-yt-hide-livechat",
    hideMerch: "sv-yt-hide-merch",
    hideMixes: "sv-yt-hide-mixes",
    hideSearchExtras: "sv-yt-hide-search-extras",
    // The dropdown under the search box. This class is only the fallback half —
    // background/youtube-suggest.js reads the same toggle and stops YouTube
    // asking for the suggestions in the first place.
    hideSearchSuggestions: "sv-yt-hide-search-suggestions",
    hideNotificationBell: "sv-yt-hide-bell",
    // The sidebar's own clutter, beside hideExplore above
    hideSigninPromo: "sv-yt-hide-signin",
    hideMoreFromYouTube: "sv-yt-hide-more-yt",
    hideSidebarFooter: "sv-yt-hide-guide-footer",
  };

  // broad toggle -> the narrower toggle it makes redundant
  const SHADOWED = {
    hideThumbnails: "blurThumbnails",
    hideTopBar: "hideNotificationBell",
  };

  let settings = {};
  let autoplayTimer = null;

  // --- Classes --------------------------------------------------------------

  function applyClasses() {
    const root = document.documentElement;
    const on = (key) => !!settings.enabled && !!settings[key];

    for (const [key, cls] of Object.entries(CLASSES)) {
      root.classList.toggle(cls, on(key));
    }
    // A broad toggle makes the narrower one underneath it redundant: hiding a
    // thumbnail outright beats blurring it, and hiding the whole top bar
    // already takes the notification bell with it.
    for (const [broad, narrow] of Object.entries(SHADOWED)) {
      if (on(broad)) root.classList.remove(CLASSES[narrow]);
    }
  }

  // --- Redirects ------------------------------------------------------------
  // Hiding the Shorts shelves doesn't help if a link still drops you into the
  // swipe feed. A short and a normal video are the same video, so we send it to
  // the regular player: the video is still watchable, the endless feed isn't.

  function applyRedirects() {
    if (!settings.enabled) return;

    if (settings.hideShorts) {
      const match = location.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
      if (match) {
        location.replace(`${location.origin}/watch?v=${match[1]}`);
        return;
      }
      if (/^\/shorts\/?$/.test(location.pathname)) {
        location.replace(`${location.origin}/`);
      }
    }
  }

  // --- Autoplay -------------------------------------------------------------
  // This flips YouTube's own autoplay switch — the same click the user would
  // make, so it also sticks in YouTube's settings. Fragile by nature: if YouTube
  // renames the control this quietly does nothing, which is why it's the one
  // toggle that isn't pure CSS.
  //
  // Finding the control is NOT the same as being able to use it. The toggle is
  // in the DOM a second or two before the player starts listening to it, and a
  // click in that gap is dropped without a trace; YouTube then redraws the
  // control from its own state, which is still "on". The first version clicked
  // once as soon as the control appeared and stopped, so it lost that race every
  // time — measured October 2026, both of its clicks landed at 1.5–2.2s, neither
  // was recorded, and every video still ended on the "Up next" countdown.
  //
  // So for the first stretch of each video this keeps looking instead of
  // stopping at the first click: whenever the toggle reads "on", click it. Never
  // twice within AUTOPLAY_CLICK_GAP_MS, though — the startup read and the
  // navigation event both start a watch, and two clicks close together would
  // switch autoplay off and straight back on. Once a click lands YouTube keeps
  // it (the PREF cookie when signed out, the account setting when signed in), so
  // later videos usually open with autoplay already off and nothing is clicked.

  const AUTOPLAY_WINDOW_MS = 20000;
  const AUTOPLAY_TICK_MS = 500;
  const AUTOPLAY_CLICK_GAP_MS = 1500;
  let lastAutoplayClick = 0;

  function stopAutoplayWatch() {
    if (autoplayTimer) clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }

  function applyAutoplay() {
    stopAutoplayWatch();
    if (!settings.enabled || !settings.disableAutoplay) return;
    if (!/^\/(watch|shorts)/.test(location.pathname)) return;

    let deadline = Date.now() + AUTOPLAY_WINDOW_MS;
    const tick = () => {
      autoplayTimer = null;
      const now = Date.now();
      const btn = document.querySelector(".ytp-autonav-toggle-button");
      if (btn && btn.getAttribute("aria-checked") === "true" && now - lastAutoplayClick >= AUTOPLAY_CLICK_GAP_MS) {
        lastAutoplayClick = now;
        btn.click();
      }
      // A pre-roll ad holds the video back, so the window starts over once it's
      // gone rather than running out while the ad plays.
      if (document.querySelector(".html5-video-player.ad-showing")) deadline = now + AUTOPLAY_WINDOW_MS;
      if (now < deadline) autoplayTimer = setTimeout(tick, AUTOPLAY_TICK_MS);
    };
    tick();
  }

  // Someone switching autoplay back on by hand gets their way: a real click on
  // the toggle ends the watch, so the next tick doesn't switch it straight off
  // again. The next video starts a fresh watch, as the setting says it should.
  document.addEventListener(
    "click",
    (e) => {
      if (e.isTrusted && typeof e.target.closest === "function" && e.target.closest(".ytp-autonav-toggle")) {
        stopAutoplayWatch();
      }
    },
    true
  );

  // --- Settings -------------------------------------------------------------

  function apply(next) {
    settings = next || {};
    applyClasses();
    applyRedirects();
    applyAutoplay();
  }

  function read(bag) {
    return (bag && bag[SITE]) || {};
  }

  chrome.storage.local
    .get({ [STORAGE_KEY]: {} })
    .then((stored) => apply(read(stored[STORAGE_KEY])))
    .catch(() => {}); // no settings readable = leave YouTube alone

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    apply(read(changes[STORAGE_KEY].newValue));
  });

  // YouTube is a single-page app: the URL changes without a reload, so the
  // redirect and autoplay checks have to run again on each in-app navigation.
  // yt-navigate-finish is YouTube's own event; popstate covers back/forward.
  const onNavigate = () => {
    applyRedirects();
    applyAutoplay();
  };
  document.addEventListener("yt-navigate-finish", onNavigate, true);
  window.addEventListener("popstate", onNavigate);
})();

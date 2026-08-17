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
    blackAndWhite: "sv-yt-bw",
  };

  let settings = {};
  let autoplayTimer = null;
  let autoplayTries = 0;

  // --- Classes --------------------------------------------------------------

  function applyClasses() {
    const root = document.documentElement;
    const on = (key) => !!settings.enabled && !!settings[key];

    for (const [key, cls] of Object.entries(CLASSES)) {
      root.classList.toggle(cls, on(key));
    }
    // Hiding a thumbnail outright beats blurring it — never do both.
    if (on("hideThumbnails")) root.classList.remove(CLASSES.blurThumbnails);
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
  // make, so it also sticks in YouTube's settings. The player arrives well after
  // document_start, so we retry briefly and then give up rather than polling
  // forever. Fragile by nature: if YouTube renames the control this quietly
  // does nothing, which is why it's the one toggle that isn't pure CSS.

  function stopAutoplayWatch() {
    if (autoplayTimer) clearTimeout(autoplayTimer);
    autoplayTimer = null;
    autoplayTries = 0;
  }

  function flipAutoplayOff() {
    const btn = document.querySelector(".ytp-autonav-toggle-button");
    if (!btn) return false;
    if (btn.getAttribute("aria-checked") === "true") btn.click();
    return true; // control found — nothing left to wait for
  }

  function applyAutoplay() {
    stopAutoplayWatch();
    if (!settings.enabled || !settings.disableAutoplay) return;
    if (!/^\/(watch|shorts)/.test(location.pathname)) return;

    const tick = () => {
      autoplayTimer = null;
      if (flipAutoplayOff()) return;
      if (++autoplayTries > 15) return; // ~15s, then stop looking
      autoplayTimer = setTimeout(tick, 1000);
    };
    tick();
  }

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

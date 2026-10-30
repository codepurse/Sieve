// content/google-clean.js
// Sieve — Site Cleanup driver for Google Search.
//
// The Google half of what content/site-cleanup.js does for YouTube, kept apart
// because none of YouTube's script work (the Shorts redirect, autoplay, the
// single-page navigation events) applies here. This file only reads the user's
// switches and puts one class per enabled switch on <html>; all of the hiding
// lives in content/google-clean.css, which the manifest injects alongside it at
// document_start, so nothing depends on this script beating Google's renderer.
//
// "Show web results only" has no class: it is a network redirect to Google's
// Web tab, made by background/google-web-only.js before the page is requested.
//
// Settings shape (chrome.storage.local), shared with the YouTube card:
//   siteCleanup: { google: { enabled, hideAiOverview, … }, youtube: { … } }
// A missing key means "off": with no settings at all this script does nothing
// and Google looks untouched. If it ever throws, the user gets a normal Google.

(() => {
  "use strict";

  if (window.__sieveGoogleClean) return;
  window.__sieveGoogleClean = true;

  const STORAGE_KEY = "siteCleanup";
  const SITE = "google";

  // toggle key -> the <html> class that content/google-clean.css keys off
  const CLASSES = {
    hideAiOverview: "sv-g-hide-ai-overview",
    hideAiMode: "sv-g-hide-ai-mode",
    hidePeopleAlsoAsk: "sv-g-hide-paa",
    hideForums: "sv-g-hide-forums",
    hideShortVideos: "sv-g-hide-short-videos",
    hideVideos: "sv-g-hide-videos",
    hideTopStories: "sv-g-hide-top-stories",
    hideProducts: "sv-g-hide-products",
    hideRelatedSearches: "sv-g-hide-related",
  };

  function apply(settings) {
    const root = document.documentElement;
    for (const [key, cls] of Object.entries(CLASSES)) {
      root.classList.toggle(cls, !!settings.enabled && !!settings[key]);
    }
  }

  function read(bag) {
    return (bag && bag[SITE]) || {};
  }

  chrome.storage.local
    .get({ [STORAGE_KEY]: {} })
    .then((stored) => apply(read(stored[STORAGE_KEY])))
    .catch(() => {}); // no settings readable = leave Google alone

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    apply(read(changes[STORAGE_KEY].newValue));
  });
})();

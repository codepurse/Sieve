// common/theme.js
// Sieve — Appearance: follow the system, or always light, or always dark.
//
// Every surface Sieve draws defines a light palette and a dark one. Until now
// the dark one applied whenever the system asked for it. This adds a choice:
//
//   "auto"  — no attribute anywhere; prefers-color-scheme decides, as before.
//   "light" — data-theme="light", which the dark rules are written to skip.
//   "dark"  — data-theme="dark", which the dark rules also match outright.
//
// Where the attribute goes depends on whose page it is:
//
//   - On Sieve's own pages (settings, popup, blocked page, onboarding, release
//     notes) it goes on <html>, and it is set before the first paint from a
//     localStorage copy — chrome.storage is asynchronous, and waiting for it
//     would flash the wrong theme on every open. All extension pages share one
//     origin, so the copy written by one is there for the next.
//   - On a website it never touches <html>: that element belongs to the site,
//     and plenty of sites use data-theme themselves. Sieve's own widgets there
//     (the pause screen, the PIN dialog) carry it on their own element, via
//     mark().
//
// chrome.storage.local holds the choice itself; the localStorage copy is only a
// cache, corrected from storage as soon as that answers.

(() => {
  "use strict";

  if (window.SieveTheme) return;

  const KEY = "uiTheme";
  const CACHE_KEY = "sieve.uiTheme";
  const THEMES = ["auto", "light", "dark"];

  const ownPage = /^(chrome|moz)-extension:$/.test(location.protocol);
  const listeners = [];
  let current = "auto";

  function normalize(value) {
    return THEMES.includes(value) ? value : "auto";
  }

  function readCache() {
    try {
      return normalize(localStorage.getItem(CACHE_KEY));
    } catch {
      return "auto";
    }
  }

  function writeCache(theme) {
    try {
      localStorage.setItem(CACHE_KEY, theme);
    } catch {
      /* storage blocked — the next open simply waits for chrome.storage */
    }
  }

  // Put the choice on an element: an attribute for light or dark, none for auto.
  function mark(el) {
    if (!el) return;
    if (current === "auto") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", current);
  }

  function set(value) {
    const theme = normalize(value);
    const changed = theme !== current;
    current = theme; // first: mark() reads it
    if (ownPage) {
      writeCache(theme);
      mark(document.documentElement);
    }
    if (!changed) return;
    for (const fn of listeners) {
      try {
        fn(theme);
      } catch (err) {
        console.warn("[Sieve] theme listener failed:", err);
      }
    }
  }

  // Before anything is drawn: the cached choice, on Sieve's own pages only.
  if (ownPage) {
    current = readCache();
    mark(document.documentElement);
  }

  try {
    chrome.storage.local.get(KEY).then((stored) => set(stored[KEY]), () => {});
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[KEY]) set(changes[KEY].newValue);
    });
  } catch {
    /* no extension APIs (a test page) — the cached or default choice stands */
  }

  window.SieveTheme = {
    KEY,
    THEMES,
    normalize,
    get: () => current,
    mark,
    onChange(fn) {
      listeners.push(fn);
    },
    // Applied here at once rather than on the storage echo, so the page the
    // choice is made on changes the moment it is made.
    async save(value) {
      const theme = normalize(value);
      set(theme);
      await chrome.storage.local.set({ [KEY]: theme });
    },
  };
})();

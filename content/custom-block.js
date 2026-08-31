// content/custom-block.js
// Sieve — the page-side half of the user's blocked-sites list.
//
// Most of that list is enforced by declarativeNetRequest in the service worker,
// which is strictly better: the request never leaves the browser. Two things it
// cannot do, and this file exists for exactly those two:
//
//   1. TITLE PATTERNS. "title/Example Domain/" is a rule about the document,
//      not the request, and a document has no title until it has been parsed.
//      So the page genuinely does load, and is replaced the moment its title is
//      known. That flash is unavoidable and the settings page says so.
//
//   2. IMAGES FROM A BLOCKED SITE. A blocked site is also blocked as a source
//      of pictures. Network rules already stop most of those, which leaves a
//      broken-image icon behind; and for a whole-TLD entry there is deliberately
//      no subresource rule at all (see buildCustomBlockRules), because one would
//      run against every request on every page. Here the cost is nothing until
//      the list actually contains an entry that can match.
//
// It also hides matching results on image search, since a picture you were told
// not to see is no better as a thumbnail with a caption underneath it.
//
// THE FRAGILE PART IS THE IMAGE-SEARCH TABLE near the bottom. Search engines
// reshuffle their markup without warning and nothing raises an error when they
// do — the tile hiding just quietly stops. Everything else here works off the
// image's own URL and does not care about anyone's markup.
//
// Failure direction is deliberate throughout: anything unrecognised is LEFT
// ALONE. A missed image is one you still see; an over-eager rule silently
// removes pictures from pages that had nothing to do with the list.

(() => {
  "use strict";

  if (window.__sieveCustomBlock) return;
  window.__sieveCustomBlock = true;
  if (window.top !== window) return; // top frame only

  const KP = window.KeywordPattern;
  if (!KP || typeof KP.compileList !== "function") return;

  const MARK = "data-sv-cb"; // an element we have already judged
  const HIDDEN = "data-sv-cb-hidden";

  let urlRules = []; // wildcard / TLD / address-regex entries
  let titleRules = []; // title-regex entries
  let allowHosts = [];
  let scanScheduled = false;
  let observer = null;
  let titleWatched = false;

  // --- the list -------------------------------------------------------------

  function hostOf(url) {
    try {
      const u = new URL(url, location.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      return u.hostname.toLowerCase().replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  }

  // The allowlist is the user's single escape hatch and applies to every
  // blocker, so it wins here exactly as it wins over a network rule: neither
  // the page you are on nor an image served from an allowlisted host is touched.
  function isAllowed(host) {
    if (!host) return false;
    for (const allowed of allowHosts) {
      if (host === allowed || host.endsWith("." + allowed)) return true;
    }
    return false;
  }

  function load(store) {
    const entries = Array.isArray(store.customBlocks) ? store.customBlocks : [];
    const compiled = KP.compileList(entries);
    urlRules = compiled.filter((r) => r.kind !== "title");
    titleRules = compiled.filter((r) => r.kind === "title");
    allowHosts = (Array.isArray(store.allowlist) ? store.allowlist : []).map((d) =>
      String(d).trim().toLowerCase().replace(/^www\./, "")
    );
  }

  // --- 1. title patterns ----------------------------------------------------

  function checkTitle() {
    if (titleRules.length === 0) return false;
    if (isAllowed(hostOf(location.href))) return false;
    if (!KP.matchCompiledTitle(titleRules, document.title)) return false;
    // Replace rather than assign, so Back returns to wherever the user came
    // from instead of bouncing straight back into the blocked page.
    location.replace(chrome.runtime.getURL("pages/blocked.html?category=custom-blocked"));
    return true;
  }

  // A single-page app rewrites its title without navigating, so watching the
  // <title> element is not optional — checking once on load would let every
  // route after the first through.
  function watchTitle() {
    if (titleWatched || titleRules.length === 0) return;
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    titleWatched = true;
    new MutationObserver(() => checkTitle()).observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  // --- 2. images ------------------------------------------------------------

  function hide(el, why) {
    if (!el || el.getAttribute(HIDDEN) === "1") return;
    el.setAttribute(HIDDEN, "1");
    el.setAttribute("title", "Blocked by Sieve — " + why);
    el.style.setProperty("display", "none", "important");
  }

  // Every address this element might be pulling a picture from. An <img> that
  // has not loaded yet has no currentSrc, and lazy-loading libraries park the
  // real address in a data attribute, so all of them are worth looking at.
  function imageUrlsOf(el) {
    const urls = [];
    const push = (value) => {
      if (value && typeof value === "string") urls.push(value);
    };
    if (el.tagName === "IMG") {
      push(el.currentSrc);
      push(el.getAttribute("src"));
      push(el.getAttribute("data-src"));
      push(el.getAttribute("data-original"));
      const srcset = el.getAttribute("srcset");
      if (srcset) push(srcset.split(",")[0].trim().split(/\s+/)[0]);
    }
    const style = el.getAttribute && el.getAttribute("style");
    if (style && style.indexOf("background") !== -1) {
      const match = /url\((['"]?)([^'")]+)\1\)/i.exec(style);
      if (match) push(match[2]);
    }
    return urls;
  }

  function judgeImage(el) {
    if (el.getAttribute(MARK) === "1") return;
    el.setAttribute(MARK, "1");
    for (const raw of imageUrlsOf(el)) {
      let absolute;
      try {
        absolute = new URL(raw, location.href).href;
      } catch (_) {
        continue;
      }
      if (isAllowed(hostOf(absolute))) continue;
      const entry = KP.matchCompiledUrl(urlRules, absolute);
      if (entry) {
        hide(el, entry);
        return;
      }
    }
  }

  // --- 3. image-search results ---------------------------------------------
  //
  // A thumbnail on an image-search page is served by the search engine itself,
  // not by the site the picture came from, so there is nothing in the <img> to
  // match on. What identifies the result is the link under it. Each engine gets
  // the selector for one result tile; if it stops matching, the fallback is the
  // link's nearest sensible ancestor, which is imperfect but never nothing.

  const IMAGE_SEARCH = [
    {
      // Google Images — /search?tbm=isch or udm=2.
      test: () =>
        /(^|\.)google\./.test(location.hostname) &&
        /[?&](tbm=isch|udm=2)/.test(location.search),
      tile: "div[data-ri], div[jsname], div[data-id]",
    },
    {
      test: () => /(^|\.)bing\.com$/.test(location.hostname) && /^\/images\//.test(location.pathname),
      tile: "li.dgControl_list > div, .imgpt, .iuscp",
    },
    {
      test: () =>
        /(^|\.)duckduckgo\.com$/.test(location.hostname) && /[?&]ia?x?=images/.test(location.search),
      tile: ".tile--img, .tile",
    },
  ];

  let imageSearch = null;

  function judgeResultLink(a) {
    if (a.getAttribute(MARK) === "1") return;
    a.setAttribute(MARK, "1");
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return;
    let absolute;
    try {
      absolute = new URL(href, location.href).href;
    } catch (_) {
      return;
    }
    if (isAllowed(hostOf(absolute))) return;
    const entry = KP.matchCompiledUrl(urlRules, absolute);
    if (!entry) return;
    const tile = (imageSearch.tile && a.closest(imageSearch.tile)) || a.parentElement || a;
    hide(tile, entry);
  }

  // --- the scan -------------------------------------------------------------

  function scan() {
    scanScheduled = false;
    if (urlRules.length === 0) return;
    const images = document.querySelectorAll(
      'img:not([' + MARK + ']), [style*="background"]:not([' + MARK + '])'
    );
    for (const el of images) judgeImage(el);
    if (imageSearch) {
      for (const a of document.querySelectorAll("a[href]:not([" + MARK + "])")) judgeResultLink(a);
    }
  }

  // Forget what we have already judged, so a rescan applies a list that has
  // just changed. Only the "seen" mark is cleared; anything already hidden
  // stays hidden until the page is reloaded.
  function forgetMarks() {
    for (const el of document.querySelectorAll("[" + MARK + "]")) el.removeAttribute(MARK);
  }

  // Search results and image grids arrive in bursts as you scroll, so the
  // observer coalesces a burst into one pass at the next idle moment rather
  // than re-querying the document per mutation.
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    const run = () => scan();
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 500 });
    else setTimeout(run, 50);
  }

  function watchDocument() {
    if (observer || urlRules.length === 0) return;
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "style", "href", "data-src"],
    });
  }

  // --- start ----------------------------------------------------------------

  function start() {
    if (checkTitle()) return; // navigating away; nothing else is worth doing
    watchTitle();
    if (urlRules.length === 0) return; // nothing in the list can match a picture
    imageSearch = IMAGE_SEARCH.find((engine) => engine.test()) || null;
    scan();
    watchDocument();
  }

  chrome.storage.local.get({ customBlocks: [], allowlist: [] }).then((store) => {
    load(store);
    if (urlRules.length === 0 && titleRules.length === 0) return; // an empty list costs nothing
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  });

  // Editing the list in settings takes effect on pages that are already open,
  // the same way every other Sieve setting does. Only additions can be applied
  // live — an image already hidden stays hidden until the page is reloaded,
  // which is the safe direction to be wrong in.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes.customBlocks && !changes.allowlist) return;
    chrome.storage.local.get({ customBlocks: [], allowlist: [] }).then((store) => {
      load(store);
      if (checkTitle()) return;
      watchTitle();
      if (urlRules.length === 0) return;
      imageSearch = IMAGE_SEARCH.find((engine) => engine.test()) || null;
      forgetMarks();
      scan();
      watchDocument();
    });
  });
})();

// content/url-shortener-intercept.js
// Sieve — URL Shortener Resolver (content-script half).
//
// Detects normal left-clicks on known shortener links, prevents the browser from
// navigating, and asks the background service worker to resolve the real
// destination and check it against the blockers the user already has enabled.
//
// Fail-open by design: if resolution fails, times out, or the background does
// not know how to handle the message, the original shortened link is allowed
// through so the user is never stuck.
//
// This is a detection layer only — it does not block shortener domains and it
// reuses the existing blocked page and rule data.

(() => {
  "use strict";

  if (window.__sieveUrlShortenerActive) return;
  window.__sieveUrlShortenerActive = true;

  const SHORTENER_LIST_URL = chrome.runtime.getURL("data/url-shorteners.json");
  const SETTING_KEY = "urlShortenerResolverEnabled";
  const RESOLVE_TIMEOUT_MS = 3000; // hard fail-open deadline

  let shortenerHostnames = new Set();
  let listReady = false;

  // ---------------------------------------------------------------------------
  // Load the static shortener detection list.
  // ---------------------------------------------------------------------------
  fetch(SHORTENER_LIST_URL)
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      if (Array.isArray(list)) {
        shortenerHostnames = new Set(list.map((d) => String(d).toLowerCase().replace(/^www\./, "")));
        listReady = true;
      }
    })
    .catch((err) => {
      console.warn("[Sieve] Could not load URL shortener list:", err);
    });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function normalizeHostname(hostname) {
    return String(hostname || "").toLowerCase().replace(/^www\./, "");
  }

  function isShortener(hostname) {
    return shortenerHostnames.has(normalizeHostname(hostname));
  }

  function resolveUrl(href) {
    try {
      return new URL(String(href), location.href);
    } catch {
      return null;
    }
  }

  function findAnchor(e) {
    // Walk the composed path so clicks inside Shadow DOM still find the link.
    try {
      const path = e.composedPath ? e.composedPath() : [];
      for (const node of path) {
        if (node && node.nodeType === 1 && node.tagName === "A" && node.hasAttribute("href")) {
          return node;
        }
      }
    } catch {
      /* fall back to parent chain */
    }
    let el = e.target;
    while (el && el.nodeType === 1) {
      if (el.tagName === "A" && el.hasAttribute("href")) return el;
      el = el.parentNode;
    }
    return null;
  }

  function isSpecialNavigation(a, url) {
    if (a.hasAttribute("download")) return true;
    if (["blob:", "data:", "mailto:", "tel:", "javascript:"].includes(url.protocol)) return true;
    const target = (a.getAttribute("target") || "").trim().toLowerCase();
    if (target && target !== "_self") return true;
    return false;
  }

  function isPlainLeftClick(e) {
    return (
      e.button === 0 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey &&
      !e.altKey
    );
  }

  function navigate(url) {
    try {
      location.href = url;
    } catch {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------------------
  // Click handler (capture phase, isolated world).
  // ---------------------------------------------------------------------------
  async function onClickCapture(e) {
    if (!listReady || shortenerHostnames.size === 0) return;

    // Respect earlier handlers (e.g. the popup hijack blocker) that already
    // decided to act on this event.
    if (e.defaultPrevented) return;

    if (!isPlainLeftClick(e)) return;

    const a = findAnchor(e);
    if (!a) return;

    const url = resolveUrl(a.getAttribute("href"));
    if (!url) return;
    if (isSpecialNavigation(a, url)) return;
    if (!isShortener(url.hostname)) return;

    // Read the advanced setting. Default is ON.
    let enabled = true;
    try {
      const stored = await chrome.storage.local.get({ [SETTING_KEY]: true });
      enabled = !!stored[SETTING_KEY];
    } catch {
      enabled = true;
    }
    if (!enabled) return;

    // This is our intercept: stop the normal navigation and resolve it.
    try {
      e.preventDefault();
      e.stopImmediatePropagation();
    } catch {
      return;
    }

    const originalUrl = url.href;
    let timeoutId;
    let settled = false;

    function failOpen() {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      navigate(originalUrl);
    }

    // Hard deadline: even if the background is slow, never block the user.
    timeoutId = setTimeout(() => {
      console.warn("[Sieve] Shortener resolution timed out; failing open.");
      failOpen();
    }, RESOLVE_TIMEOUT_MS);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SIEVE_RESOLVE_SHORTENER",
        url: originalUrl,
      });

      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);

      if (!response || response.action === "fail-open") {
        navigate(originalUrl);
        return;
      }

      if (response.action === "block") {
        const params = new URLSearchParams({
          category: response.category || "safety",
          resolved: response.resolvedUrl || "",
        });
        navigate(chrome.runtime.getURL("pages/blocked.html") + "?" + params.toString());
      } else if (response.action === "allow" && response.resolvedUrl) {
        navigate(response.resolvedUrl);
      } else {
        navigate(originalUrl);
      }
    } catch (err) {
      console.warn("[Sieve] Shortener resolution failed; failing open:", err);
      failOpen();
    }
  }

  window.addEventListener("click", onClickCapture, true);
})();

// content/youtube-ads-bridge.js
// Sieve — YouTube ad filter, isolated-world half.
//
// content/youtube-ads.js runs in the page's MAIN world, because that is the only
// place it can see and replace YouTube's own globals. The price of being there
// is that it has no chrome.* API at all, so it cannot tell the extension
// anything. This companion is the other side of that trade: it can reach
// chrome.runtime but not the page's globals, so its entire job is to carry the
// count of removed ads across the gap.
//
// Same split, same reason, same shape as content/popup-hijack-blocker.js and
// content/popup-hijack-bridge.js — see those if this pattern is unfamiliar.
//
// ONE-WAY on purpose. The popup-hijack bridge talks in both directions because
// its MAIN half needs configuration (is the toggle on, is this host allowed).
// This one needs nothing back: the MAIN half only exists while the toggle is on,
// since background/youtube-ads.js registers and unregisters both scripts
// together. So there is no config to push, and nothing here ever posts INTO the
// page.
//
// WHAT CROSSES: a positive integer. No URL, no video id, no title, nothing about
// what was being watched. The message is deliberately incapable of carrying it.

(() => {
  "use strict";

  if (window.__sieveYouTubeAdsBridgeActive) return;
  window.__sieveYouTubeAdsBridgeActive = true;

  const TAG = "__sieveYouTubeAds";
  const STATS_CATEGORY = "youtubeAds";

  // A page can post anything it likes on this channel, so treat every message as
  // untrusted input: same window, same origin, our tag, our direction, and a
  // count that has to survive being turned into a sane integer. A hostile or
  // merely broken value should end up ignored, never recorded.
  //
  // The origin check is belt-and-braces next to the source check — our MAIN half
  // is in this very document, so anything arriving from a different origin did
  // not come from it. The worst a forged message could do is inflate a counter,
  // but a counter the page can write to is still a counter that lies.
  const MAX_PER_MESSAGE = 1000; // far above any real sweep; a cap, not a target

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      const d = event.data;
      if (!d || d[TAG] !== true || d.dir !== "to-bridge" || d.kind !== "ads") return;

      const count = Math.floor(Number(d.count));
      if (!Number.isFinite(count) || count <= 0 || count > MAX_PER_MESSAGE) return;

      try {
        // Fire and forget. The service worker may be asleep; the message wakes
        // it. If the extension is mid-reload the send rejects, and a lost count
        // is not worth surfacing to the user in any way.
        chrome.runtime
          .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: STATS_CATEGORY, count })
          ?.catch(() => {});
      } catch {
        /* extension context invalidated — nothing to do */
      }
    },
    false
  );
})();

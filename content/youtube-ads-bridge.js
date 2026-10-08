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
//
// And, rarely, the fall-back state: when YouTube has refused every way of
// asking and the MAIN half switches from removing video ads to fast-forwarding
// them (see STRATEGY in youtube-ads.js), it says so — two timestamps and which
// kind of push-back — so the settings page can explain why ads are suddenly
// being fast-forwarded. Or that a record it held is void, so the note goes. The
// MAIN half keeps its own copy in the page's storage and never reads this one
// back, so a forged message can at worst put a wrong sentence on the settings
// page; it cannot change what happens to a single ad.

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

  // The fall-back state, checked as hard as the count: both timestamps real
  // numbers, the switch made within the last day, a cool-down no longer than the
  // MAIN half ever sets, and one of the two reasons it knows.
  const FALLBACK_STORAGE_KEY = "ssYouTubeAdsFallback";
  const DAY_MS = 86400000;
  function recordFallback(d) {
    const since = Number(d.since);
    const until = Number(d.until);
    const now = Date.now();
    if (!Number.isFinite(since) || !Number.isFinite(until)) return;
    if (Math.abs(now - since) > DAY_MS) return;
    if (until <= since || until - since > 15 * DAY_MS) return;
    if (d.reason !== "popup" && d.reason !== "block") return;
    try {
      chrome.storage.local
        .set({ [FALLBACK_STORAGE_KEY]: { since, until, reason: d.reason } })
        ?.catch(() => {});
    } catch {
      /* extension context invalidated — the settings page just will not know */
    }
  }

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      const d = event.data;
      if (!d || d[TAG] !== true || d.dir !== "to-bridge") return;
      if (d.kind === "fallback") {
        recordFallback(d);
        return;
      }
      // The MAIN half threw away a fall-back record written before it learned
      // to ask again (see FALLBACK_VERSION there), so the settings page's note
      // about it is out of date. A forged one can only remove a sentence.
      if (d.kind === "fallback-clear") {
        try {
          chrome.storage.local.remove(FALLBACK_STORAGE_KEY)?.catch(() => {});
        } catch {
          /* extension context invalidated — the note expires by itself */
        }
        return;
      }
      if (d.kind !== "ads") return;

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

// content/facebook-ads.js
// Sieve — Facebook feed-ad remover, payload half. Runs in the page's MAIN world
// at document_start, registered dynamically by background/facebook-ads.js only
// while the toggle is on.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS, AND WHY IT IS NOT A BLOCK RULE
//
// This is the same wall the YouTube filter ran into, for the same reason. The
// Ad & Tracker Blocker stops requests to third-party ad and tracker DOMAINS —
// doubleclick, criteo, the exchanges. A sponsored post in the Facebook feed
// involves none of them:
//
//   • The ad DECISION arrives in the same GraphQL payload as your friends'
//     posts. `/api/graphql/` returns one stream of feed edges and some of them
//     happen to be ads. There is no separate request to block; blocking that
//     endpoint is blocking the feed.
//   • The ad CREATIVE — image or video — is served from scontent.*.fbcdn.net,
//     the very same CDN hosts as every photo your friends posted. There is no
//     hostname that is ads-only.
//   • The ad TELEMETRY is first-party too, on facebook.com paths.
//
// So the only place left to intervene is inside the page, on the data, before
// Facebook renders it. That is what this does, and content/facebook-ads-dom.js
// is the backstop for whatever gets past it.
//
// ---------------------------------------------------------------------------
// WHAT IT DOES: ONE HOOK, JSON.parse
//
// Facebook delivers feed data by two routes and BOTH of them end at JSON.parse:
//
//   1. First screenful — inlined in the document itself, inside the
//      `require(...)/__bbox` bootstrap blobs. Facebook's own loader parses those
//      strings during page load, which is why this has to be registered at
//      document_start.
//   2. Everything after — XHR to /api/graphql/, returned as newline-delimited
//      JSON. Facebook's Relay layer parses each line.
//
// Hooking JSON.parse catches both with one patch, and mutates the object
// Facebook is about to use.
//
// WHY NOT REWRITE THE RESPONSE TEXT, which is the other obvious approach (and
// what uBlock's trusted-replace-xhr-response filters do): rewriting means
// re-serialising a payload that is routinely megabytes of someone's feed, and
// JSON.stringify(JSON.parse(x)) is not x. Number formatting, unicode escaping
// and key order all shift. Every one of those differences is a chance to break
// Facebook in a way the user cannot diagnose and cannot report usefully. Editing
// the parsed object costs one substring scan per parse and cannot corrupt
// anything, because nothing is ever re-serialised.
//
// The cost of that choice: a payload Facebook parses with something OTHER than
// JSON.parse is invisible here. That is precisely what the DOM half is for.
//
// ---------------------------------------------------------------------------
// WHAT AN AD LOOKS LIKE IN THE PAYLOAD
//
// A feed is an array of edges, each `{ node: {...}, cursor: "..." }`. An ad's
// node carries `sponsored_data` with an `ad_id` — sitting either directly on the
// node, on `node.story`, or under `node.relay_rendering_strategy.view_model.
// story`, depending on the surface. Marketplace ads announce themselves with
// `__typename: "MarketplaceFeedAdStory"`, and search ads with
// `role: "SEARCH_ADS"`.
//
// The removal deletes the `node` and LEAVES THE EDGE, including its `cursor`.
// That is not a detail: the cursor is how Facebook asks for the next page of the
// feed, and splicing edges out of the array would take the cursors with them and
// break infinite scroll. An edge with no node renders nothing.
//
// ---------------------------------------------------------------------------
// FAILING OPEN
//
// Every guard here is written so that an unrecognised shape is handed back
// untouched. A missed ad is a nuisance; a feed that will not load is a broken
// site the user cannot fix from the settings page. Treat every field name below
// as perishable — Facebook renames these without notice, and when it does the
// ads simply come back.

(() => {
  "use strict";

  // The registration is idempotent but a page can be injected into twice (a
  // toggle flip while a tab is open, an extension update). Patching JSON.parse
  // twice would stack wrappers and double-count.
  if (window.__sieveFacebookAdFilter) return;

  const stats = {
    parsesSeen: 0, // payloads that carried an ad marker and were therefore walked
    nodesRemoved: 0, // feed nodes deleted
    streamsRemoved: 0, // instream_video_ads objects deleted
    budgetHits: 0, // walks cut short by the node budget — see WALK_BUDGET
  };

  // -------------------------------------------------------------------------
  // Reporting the count out of the page
  //
  // MAIN world, so there is no chrome.* of any kind here. The count goes over
  // window.postMessage to content/facebook-ads-bridge.js, the isolated
  // companion — the same split, for the same reason, as the YouTube filter and
  // as popup-hijack-blocker.js.
  //
  // Batched behind a short timer rather than posted per ad: one scroll can drop
  // several sponsored posts in a single payload, and a message storm through the
  // page's own channel is both wasteful and far more visible to Facebook than
  // one message a second is. Flushed on pagehide so a navigation in the gap does
  // not lose the tail.
  // -------------------------------------------------------------------------
  const REPORT_TAG = "__sieveFacebookAds";
  const REPORT_DELAY = 1000;
  let pendingAds = 0;
  let reportTimer = null;

  function flushAdCount() {
    reportTimer = null;
    if (pendingAds <= 0) return;
    const count = pendingAds;
    pendingAds = 0;
    try {
      // Targeted at our OWN origin rather than "*". The bridge is in this very
      // document, so it is the only intended reader, and naming the origin means
      // the message cannot be delivered anywhere else even if the page is later
      // navigated. It carries nothing but a small integer either way.
      window.postMessage(
        { [REPORT_TAG]: true, dir: "to-bridge", kind: "ads", count },
        window.location.origin
      );
    } catch {
      /* a lost count is never worth breaking the page for */
    }
  }

  function countAd(n) {
    const add = Number(n);
    if (!Number.isFinite(add) || add <= 0) return;
    pendingAds += add;
    if (reportTimer === null) reportTimer = setTimeout(flushAdCount, REPORT_DELAY);
  }

  try {
    window.addEventListener("pagehide", flushAdCount, { capture: true });
  } catch {
    /* non-fatal — the timer still covers the ordinary case */
  }

  // -------------------------------------------------------------------------
  // Deciding that a node is an ad
  // -------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // WHERE THE AD ID IS ALLOWED TO BE, AND WHY IT IS A LIST OF PATHS
  //
  // This started as a bounded SEARCH for `sponsored_data.ad_id` anywhere under
  // the node — more durable, on the theory that naming exact paths just means
  // being broken by the next rename. It shipped, and it made the news feed
  // reload without stopping.
  //
  // The reason is upstream, in uBlock's own facebook.com rules, and it is worth
  // writing down because it is not something you would arrive at by reasoning.
  // Two nearly identical filters exist there:
  //
  //   DISABLED  ...data.node          when  ...data.node.sponsored_data.ad_id
  //   ACTIVE    ...data.node          when  ...data.node.story.sponsored_data.ad_id
  //
  // The disabled one sits directly beneath a comment block linking a bug report
  // titled "facebook loading slow". So the distinction is not cosmetic: a
  // `sponsored_data.ad_id` sitting DIRECTLY on a node is attached to something
  // the feed needs, and deleting that node is what makes Facebook refetch
  // forever. Under `story` it is a sponsored post, and removing it is fine.
  //
  // A search cannot tell those apart — it matches both — so the paths are named
  // exactly, and they are exactly uBlock's active set. When Facebook renames
  // one, this stops catching that surface and the DOM half picks it up. That is
  // the right way for this to fail.
  // ---------------------------------------------------------------------------

  function adId(story) {
    if (!story || typeof story !== "object") return false;
    const sd = story.sponsored_data;
    // `ad_id` present and truthy. Organic stories carry sponsored_data: null, or
    // an object with a null ad_id, which is exactly the case this must not match.
    return !!(sd && typeof sd === "object" && sd.ad_id);
  }

  function get(obj, key) {
    return obj && typeof obj === "object" ? obj[key] : undefined;
  }

  // The sponsored story hanging off a feed node, by each route Facebook uses.
  // `relay_rendering_strategy.view_model.story` is the search-results shape;
  // `view_model.story` is the same one wrapper shorter.
  function sponsoredStory(node) {
    if (adId(get(node, "story"))) return true;
    if (adId(get(get(node, "view_model"), "story"))) return true;
    if (adId(get(get(get(node, "relay_rendering_strategy"), "view_model"), "story"))) return true;
    return false;
  }

  // __typename values that ARE an ad, whole and entire. Named explicitly rather
  // than matched on a substring: a substring test for "Ad" would take
  // "AdminMessage" and half of Messenger with it.
  const AD_TYPENAMES = new Set(["MarketplaceFeedAdStory"]);

  function isAdNode(node) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return false;
    if (AD_TYPENAMES.has(node.__typename)) return true;
    if (node.role === "SEARCH_ADS") return true;
    return sponsoredStory(node);
  }

  // -------------------------------------------------------------------------
  // The walk
  // -------------------------------------------------------------------------

  // Relay payloads nest deeply, but not unboundedly. 40 is far past anything
  // observed and stops a pathological or hostile object from blowing the stack.
  const MAX_DEPTH = 40;

  // Ceiling on objects visited per payload. A feed page is on the order of tens
  // of thousands; this is a runaway guard, not a working limit.
  const WALK_BUDGET = 250000;

  // Walk the parsed payload and delete what is an ad. Returns how many feed
  // nodes were removed, so only real removals are reported and counted.
  function prune(value, depth, budget) {
    if (!value || typeof value !== "object" || depth > MAX_DEPTH) return 0;
    if (--budget.left < 0) {
      stats.budgetHits++;
      return 0;
    }

    let removed = 0;

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) removed += prune(value[i], depth + 1, budget);
      return removed;
    }

    for (const key in value) {
      const child = value[key];
      if (!child || typeof child !== "object") continue;

      // Ads inside a video the user is watching. Deleting the whole object
      // leaves the player with no breaks to insert. `data.scrubber`, which
      // uBlock also prunes here, is deliberately left alone — it drives the
      // scrub bar, and a video you cannot seek is worse than an ad.
      if (key === "instream_video_ads") {
        delete value[key];
        stats.streamsRemoved++;
        continue;
      }

      // The feed edge. Delete the node, keep the edge and its cursor.
      if (key === "node" && isAdNode(child)) {
        delete value[key];
        stats.nodesRemoved++;
        removed++;
        continue;
      }

      removed += prune(child, depth + 1, budget);
    }

    return removed;
  }

  // -------------------------------------------------------------------------
  // The hook
  //
  // JSON.parse is extremely hot on Facebook — it is called constantly, with
  // small strings — so the guard matters as much as the hook does. A cheap
  // substring test on the RAW TEXT decides whether the result is worth walking
  // at all; anything that cannot contain an ad is handed straight back,
  // untouched and unwalked.
  // -------------------------------------------------------------------------
  const AD_MARKERS = [
    '"sponsored_data"',
    '"SEARCH_ADS"',
    '"MarketplaceFeedAdStory"',
    '"instream_video_ads"',
  ];

  // A cheap first cut before the substring scans, so the many tiny parses a
  // page makes (`JSON.parse('"abc"')` and friends) cost one length comparison
  // and nothing else.
  //
  // Set from the SHORTEST string that could carry an ad — `{"sponsored_data":
  // {"ad_id":1}}` is thirty characters — rather than from what a feed page
  // looks like. Facebook streams its GraphQL responses as newline-delimited
  // JSON and parses them a line at a time, so a single deferred chunk holding
  // one ad edge is a perfectly ordinary thing to see, and a floor set at
  // "roughly page-sized" would wave it through.
  const MIN_PAYLOAD = 24;

  const nativeParse = JSON.parse;
  try {
    JSON.parse = function (text, reviver) {
      const out = nativeParse.call(this, text, reviver);
      try {
        if (typeof text === "string" && text.length > MIN_PAYLOAD) {
          for (let i = 0; i < AD_MARKERS.length; i++) {
            if (text.indexOf(AD_MARKERS[i]) !== -1) {
              stats.parsesSeen++;
              const removed = prune(out, 0, { left: WALK_BUDGET });
              if (removed > 0) countAd(removed);
              break;
            }
          }
        }
      } catch {
        /* the parse itself already succeeded; never let cleanup undo that */
      }
      return out;
    };
  } catch (err) {
    console.debug("[Sieve] Facebook ad filter: could not hook JSON.parse", err);
  }

  // A marker the DOM half and a curious user can look for to confirm the
  // scriptlet actually reached the page.
  //
  // This one IS readable from an ordinary page console — it lives in the MAIN
  // world, unlike the DOM half's `__sieveFacebookAdDom`, which is isolated and
  // needs the console's context switched to the content script to see. Worth
  // knowing when someone is trying to tell you what their feed is doing.
  try {
    Object.defineProperty(window, "__sieveFacebookAdFilter", {
      // 2: pruning narrowed to named `story` paths after the search form made
      //    the feed reload without stopping. See "WHERE THE AD ID IS ALLOWED TO
      //    BE" above.
      value: { version: 2, stats },
      configurable: true,
    });
  } catch {
    /* non-fatal */
  }
})();

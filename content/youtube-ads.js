// content/youtube-ads.js
// Sieve — YouTube video-ad remover. Runs in the page's MAIN world at
// document_start, registered dynamically by background/youtube-ads.js only while
// the toggle is on.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS, AND WHY IT IS NOT A BLOCK RULE
//
// Every other blocker in Sieve stops a network request. That cannot work for
// YouTube video ads, and it is worth writing down exactly why, because it is not
// obvious and it wasted a release cycle to establish:
//
//   • The ad DECISION is inline in the watch page's own HTML. The 1.3 MB
//     document served by www.youtube.com/watch already contains
//     `ytInitialPlayerResponse` with `adPlacements` in it. There is no separate
//     request to block — the browser is told which ads to play in the same bytes
//     as the page.
//   • The ad MEDIA streams from the same googlevideo.com host and the same
//     /videoplayback endpoint as the video itself. Blocking it stops playback.
//   • The ad TELEMETRY goes to first-party /api/stats/ads and /ptracking.
//
// Measured against a real watch page: applying Sieve's entire 95,000-domain block
// list changed the ad manifest not at all (adPlacements 1 → 1, ad module active
// in both). So the only place left to intervene is in the page, on the object
// itself, before the player reads it. That is what this does.
//
// ---------------------------------------------------------------------------
// WHAT IT DOES
//
// YouTube serves ads on two completely different surfaces, and they need two
// different removals. Doing only the first is what left ads on screen:
//
//   VIDEO ads — the pre-roll and mid-roll breaks. Deletes four keys from the
//   player response, and nothing else:
//     adPlacements · adSlots · playerAds · adBreakHeartbeatParams
//
//   DISPLAY ads — the sponsored tile in the home feed, the promoted result above
//   a search, the banner beside the video, the ad between Shorts. These are not
//   in the player response at all: they arrive as ordinary feed ITEMS in the same
//   list as the real videos, wearing a renderer name of their own
//   (adSlotRenderer, searchPyvRenderer, …). Stripping player-response keys never
//   touched them. They are removed here by dropping the item from its list — see
//   isAdNode() for why dropping the item beats blanking it.
//
//   PROMOS — "Get YouTube Premium", "try YouTube Music". These are YouTube
//   advertising itself, so they come from neither of the routes above: they ride
//   in the player response under `messages`, as mealbarPromoRenderer. Removing
//   the ad breaks does nothing to them, which is why they were the one ad left
//   playing on every video after the first fix.
//
// It reaches those objects by two routes, because YouTube delivers them two ways:
//   1. First load — inline scripts assign window.ytInitialPlayerResponse (the
//      video) and window.ytInitialData (the surrounding page). We install
//      accessors on both properties BEFORE the page's scripts run, so the
//      assignments pass through us.
//   2. Every later video and every in-app navigation — YouTube is a single-page
//      app and fetches /youtubei/v1/… over the network. We wrap fetch and XHR and
//      rewrite those endpoints' JSON.
//
// It also reads ytInitialData — the surrounding page rather than the video — for
// the display ads and the enforcement message. That is a full walk of a large
// object, measured at ~1.6 ms on a real 494 KB watch page and ~2.4 ms on a 1 MB
// search page, once per navigation.
//
// WHAT IT DOES NOT TOUCH: streamingData, videoDetails, captions, storyboards,
// playabilityStatus, errorScreen, or the rest of playerConfig. Playback,
// thumbnails, recommendations, comments and SPA navigation all read those, and a
// scriptlet that "cleans up" more than it must is how you break a site you meant
// to fix.
//
// ---------------------------------------------------------------------------
// THE ENFORCEMENT LOOP — why removing ad slots is not enough on its own
//
// Deleting the ad breaks works, and then YouTube notices. Measured on a live
// watch page, the player response carries:
//
//     playerConfig.daiConfig.sendSsdaiMissingAdBreakReasons
//
// DAI is Dynamic Ad Insertion, and that flag tells the player to report back when
// an ad break it expected is MISSING — which is precisely the state we create. The
// player posts that to /youtubei/v1/log_event, the server flags the session, and
// the "ad blockers are not allowed" message appears. After that, ads return by a
// route the ad-slot strip cannot reach.
//
// So there are two jobs here, not one:
//   1. remove the ad breaks (below), and
//   2. avoid announcing that they are missing, and clear the message if it lands.
//
// This is an arms race with a company that iterates faster than an extension can
// ship through store review. Treat every field name below as perishable.
// ---------------------------------------------------------------------------
// LIMITS — be honest about these
//
//   • SERVER-SIDE ADS (SABR) are handled by Route 3 below, NOT by deleting
//     anything. On such a session the formats describe the media but do not
//     locate it — measured: 26 adaptiveFormats, zero carrying a url or a
//     signatureCipher — so the only source is serverAbrStreamingUrl, and the
//     server chooses what to send. Nothing to delete, nothing separate to block,
//     and no fallback to force. Route 3 reads the stream to notice the ad and
//     then seeks past it; see the long comment there for why reading beats
//     rewriting. It is newer and less proven than the rest of this file.
//
//     YouTube rolls SABR out per session, so the same account gets it on some
//     videos and not others. `stats.sabrSeen` says whether this session is on it
//     at all, and `stats.sabrAdsSkipped` says whether Route 3 acted.
//
//   • MID-ROLLS and LIVE streams are untested against Route 3. So is seeking
//     while an ad is queued. The guards are built to decline rather than guess,
//     so the expected failure there is an ad that plays, not a broken video.
//
//   • YouTube changes the player-response shape regularly. When it does, this
//     stops working until it is updated — it fails OPEN (ads return), never
//     closed (video breaks), which is the right direction for a beta.
// ---------------------------------------------------------------------------

(() => {
  "use strict";

  // The only keys we remove. Kept deliberately short: every addition is a new
  // way to break playback, and these four are what the player consults to decide
  // whether an ad break exists.
  const AD_KEYS = ["adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams"];

  // ---------------------------------------------------------------------------
  // A tally of what this scriptlet actually saw and did, readable in a tab as
  //   window.__sieveYouTubeAdFilter.stats
  //
  // It exists because this feature fails SILENTLY and in three different places,
  // and from the outside they are indistinguishable — "an ad appeared" looks the
  // same whether the scriptlet never loaded, loaded but never saw the response,
  // saw it but could not read it, or read it and found a shape it does not know.
  // Without the tally, diagnosing a report means guessing between those. With it,
  // one paste from the person seeing the ad says which.
  //
  // Counters only, held in the page. Every field here stays in the page except
  // `adsRemoved`, which is handed to the bridge as a bare number so the
  // Protection Dashboard can show it — no URL, no video id, nothing about what
  // was watched. `unreadable` is the interesting one for debugging: it counts
  // player responses we matched but could not parse as JSON, which is what a
  // protobuf response would look like from in here.
  // ---------------------------------------------------------------------------
  const stats = {
    lateHook: 0,       // the page had already assigned before we hooked
    inlineSeen: 0,     // assignments to ytInitialPlayerResponse / ytInitialData
    inlineCleaned: 0,
    fetchSeen: 0,      // matched an InnerTube endpoint
    fetchCleaned: 0,
    fetchUnreadable: 0,
    xhrSeen: 0,
    xhrCleaned: 0,
    xhrSkippedType: 0, // a responseType we cannot rewrite
    // Player responses whose media can only come from serverAbrStreamingUrl. On
    // those, the server picks the segments and can insert an ad this file cannot
    // reach — so a non-zero count here is the answer to "why did an ad play when
    // every other counter looks healthy", and stops the next person debugging a
    // bug that is not there. See the LIMITS block at the top.
    sabrSeen: 0,
    sabrResponses: 0,   // UMP media responses read (never rewritten)
    sabrAdsSkipped: 0,  // distinct server-side ads seeked to their end
    // Why Route 3 declined to act. When someone reports an ad that played
    // anyway, these say which guard stopped us — without them the only tool is
    // guesswork, and this feature has already cost several rounds of it.
    sabrNoDuration: 0,  // stream id mismatched but we had no real length to check against
    sabrDurationSaid: 0,// mismatched, but the duration said we were on the real video
    jsonParsed: 0,      // ad-bearing payloads caught by the JSON.parse catch-all
    // Ads counted as a USER would count them, which is not the same as the
    // key-removal tally below: taking the four video-ad keys off one player
    // response removes ONE ad break set, not four ads. This is the number the
    // Protection Dashboard shows, so it has to mean something to the person
    // reading it. `removed` stays as it is — it is the debugging tally.
    adsRemoved: 0,
    removed: Object.create(null), // key name -> how many times removed
  };
  const note = (key) => {
    stats.removed[key] = (stats.removed[key] || 0) + 1;
  };

  // -------------------------------------------------------------------------
  // Reporting the count out of the page
  //
  // This runs in the MAIN world and so has no chrome.* of any kind. The count
  // goes over window.postMessage to content/youtube-ads-bridge.js, the isolated
  // companion, which is the only half that can reach the extension — the same
  // split, for the same reason, as popup-hijack-blocker.js and its bridge.
  //
  // Batched behind a short timer rather than posted per ad. A single search-page
  // sweep can drop a dozen sponsored tiles in one pass, and a message storm
  // through the page's own message channel is both wasteful and far more visible
  // to YouTube than one message a second is. Flushed on pagehide so a navigation
  // in the gap does not lose the tail.
  // -------------------------------------------------------------------------
  const REPORT_TAG = "__sieveYouTubeAds";
  const REPORT_DELAY = 1000;
  let pendingAds = 0;
  let reportTimer = null;

  function flushAdCount() {
    reportTimer = null;
    if (pendingAds <= 0) return;
    const count = pendingAds;
    pendingAds = 0;
    try {
      window.postMessage({ [REPORT_TAG]: true, dir: "to-bridge", kind: "ads", count }, "*");
    } catch {
      /* a lost count is never worth breaking the page for */
    }
  }

  // Every removal that a viewer would have seen as an ad calls this.
  function countAd(n) {
    const add = Number(n);
    if (!Number.isFinite(add) || add <= 0) return;
    stats.adsRemoved += add;
    pendingAds += add;
    if (reportTimer === null) reportTimer = setTimeout(flushAdCount, REPORT_DELAY);
  }

  try {
    window.addEventListener("pagehide", flushAdCount, { capture: true });
  } catch {
    /* non-fatal — the timer still covers the ordinary case */
  }

  // Does this look like a YouTube player response? Checked before touching
  // anything so a same-named object from somewhere else is left alone.
  function isPlayerResponse(o) {
    return !!o && typeof o === "object" && ("streamingData" in o || "videoDetails" in o || "playabilityStatus" in o);
  }

  // Remove the ad keys in place. Returns true if anything was actually removed,
  // so callers can skip rebuilding a response that did not change.
  function stripAds(o) {
    if (!isPlayerResponse(o)) return false;
    let changed = false;
    rememberDuration(o);
    if (o.streamingData && o.streamingData.serverAbrStreamingUrl) stats.sabrSeen++;
    // How many ad breaks this response was carrying. adPlacements is the list the
    // player walks, so its length IS the number of breaks the viewer was about to
    // sit through; the other three keys are the same decision restated, which is
    // why they are not added on top. A response that has the other keys but no
    // readable adPlacements still cost the viewer at least one break, so it
    // counts as one rather than as nothing.
    const breaks = Array.isArray(o.adPlacements) ? o.adPlacements.length : 0;
    let hadAdKey = false;
    for (const k of AD_KEYS) {
      if (k in o) {
        delete o[k];
        note(k);
        hadAdKey = true;
        changed = true;
      }
    }
    if (hadAdKey) countAd(breaks || 1);
    // The player also reads an ad flag out of playerConfig on some builds. Only
    // the flag — the rest of playerConfig drives playback and is left intact.
    const ac = o.playerConfig && o.playerConfig.adConfig;
    if (ac && typeof ac === "object" && Object.keys(ac).length) {
      o.playerConfig.adConfig = {};
      changed = true;
    }

    // Do not tell YouTube that the ad breaks it expected are missing. This single
    // flag is what turns "the ads stopped" into "the ad blocker was detected".
    const dai = o.playerConfig && o.playerConfig.daiConfig;
    if (dai && typeof dai === "object") {
      if (dai.sendSsdaiMissingAdBreakReasons) {
        dai.sendSsdaiMissingAdBreakReasons = false;
        changed = true;
      }
      if (dai.enableServerStitchedDai) {
        dai.enableServerStitchedDai = false;
        changed = true;
      }
    }
    return changed;
  }

  // ---------------------------------------------------------------------------
  // The enforcement message ("Ad blockers are not allowed on YouTube").
  //
  // It arrives as a renderer nested somewhere in a response, and the nesting moves
  // between YouTube builds — so this walks the object and removes it by KEY NAME
  // rather than by a fixed path. Key names only: matching on the message TEXT
  // would break in every language but English.
  //
  // Deliberately narrow. It does NOT touch playabilityStatus or errorScreen: those
  // carry legitimate "video unavailable", "age restricted" and "private video"
  // states, and clearing them would tell the user a video is playable when it is
  // not. If YouTube escalates to refusing playback outright, that is a wall this
  // does not climb — and pretending otherwise would just break the player.
  // ---------------------------------------------------------------------------
  const ENFORCEMENT_KEY = /^(enforcementMessageViewModel|adBlockerMessageViewModel|adblockDetectionRenderer)$/i;

  // ---------------------------------------------------------------------------
  // Display-ad renderers — the sponsored feed tile, the promoted search result,
  // the banner beside the video, the ad between Shorts.
  //
  // An explicit list of names, NOT a /ad/i pattern on the key. YouTube's payloads
  // are full of innocent keys containing "ad": adaptiveFormats is the video
  // itself, addToWatchLaterCommand is a button, thumbnailBadgeViewModel is a
  // duration chip. A pattern that caught those would empty the page. Every name
  // below is a renderer whose ENTIRE purpose is to carry an ad, so removing one
  // removes an ad and nothing else.
  //
  // The names were taken from EasyList's own youtube.com cosmetic rules — the
  // maintained source of truth for them — plus the sibling renderers YouTube uses
  // for the same slot on other surfaces. Perishable, like everything else here.
  // ---------------------------------------------------------------------------
  // NOTE ON THE PROMO NAMES: only ones that are ALWAYS an advertisement. YouTube
  // uses "Promo" for empty states too — backgroundPromoRenderer is the "no
  // results found" panel, and deleting it would leave a blank page where an
  // explanation should be. That is why this is a list and not /promo/i.
  const AD_RENDERER =
    /^(adSlotRenderer|adSlotViewModel|adsEngagementPanelContentRenderer|displayAdRenderer|inFeedAdLayoutRenderer|searchPyvRenderer|promotedVideoRenderer|compactPromotedVideoRenderer|promotedSparklesWebRenderer|promotedSparklesTextSearchRenderer|videoMastheadAdV3Renderer|primetimePromoRenderer|bannerPromoRenderer|statementBannerRenderer|carouselAdRenderer|actionCompanionAdRenderer|companionSlotRenderer|instreamVideoAdRenderer|adPreviewRenderer|reelPlayerAdRenderer|mealbarPromoRenderer)$/;

  // Is this list item ENTIRELY an ad, so the whole item can go?
  //
  // Feed ads never arrive as a bare adSlotRenderer. YouTube wraps every feed item
  // in a layer or two of generic container — {richItemRenderer:{content:{…}}} —
  // and those containers are the SAME ones real videos use, so the wrapper name
  // tells you nothing. This walks down the wrapper chain and only reports an ad
  // when the chain bottoms out in an ad renderer.
  //
  // The single-child rule is what makes that safe. A node with exactly one object
  // child is transparent: it is only ever a box around that child, so it is an ad
  // iff the child is. A node with two or more object children is a real section
  // holding real content — a shelf of videos that happens to include one ad — and
  // is never dropped whole. The ad inside it is removed when its own list is
  // filtered, one level down.
  // A Shorts ad does not announce itself with a renderer name — it is an ordinary
  // reel entry carrying a flag. uBlock's list prunes the flag; we drop the whole
  // entry instead, so the ad Short never enters the sequence at all rather than
  // playing as if it were content.
  function isFlaggedReelAd(node) {
    try {
      const p = node && node.command && node.command.reelWatchEndpoint && node.command.reelWatchEndpoint.adClientParams;
      return !!(p && p.isAd);
    } catch {
      return false;
    }
  }

  const WRAPPER_DEPTH = 6; // the deepest wrapper chain seen in practice is 3
  function isAdNode(node, depth) {
    if (!node || typeof node !== "object" || depth > WRAPPER_DEPTH) return false;
    if (isFlaggedReelAd(node)) return true;
    // A list counts as an ad only if every entry is one. An empty list never does.
    if (Array.isArray(node)) return node.length > 0 && node.every((n) => isAdNode(n, depth + 1));
    const keys = Object.keys(node);
    if (keys.some((k) => AD_RENDERER.test(k))) return true;
    const children = keys.filter((k) => node[k] && typeof node[k] === "object");
    return children.length === 1 && isAdNode(node[children[0]], depth + 1);
  }

  // ---------------------------------------------------------------------------
  // One walk over one response, doing every removal.
  //
  // This replaced a depth-capped enforcement-only walk. The cap was 12; measured
  // against a live watch page ytInitialData nests to depth 38, and a search page
  // to 38 as well — so the walk was stopping two thirds of the way down and never
  // saw anything below. Depth was the wrong guard: what it was really protecting
  // against is a cycle, and a WeakSet of visited nodes does that properly and
  // completely. Cost of the full walk on the largest real payload measured — a
  // 1 MB search page, 15,030 nodes — is ~2.4 ms, once per navigation.
  // ---------------------------------------------------------------------------
  function sweep(root) {
    let changed = false;
    const seen = new WeakSet();

    const visit = (node) => {
      if (!node || typeof node !== "object" || seen.has(node)) return;
      seen.add(node);

      if (Array.isArray(node)) {
        // Backwards, because we splice as we go. Dropping the item is deliberate:
        // blanking it instead leaves an empty grid cell where the sponsored tile
        // was, and a hole in the feed reads as breakage rather than as an ad
        // removed.
        for (let i = node.length - 1; i >= 0; i--) {
          if (isAdNode(node[i], 0)) {
            note("feedItem");
            countAd(1);
            node.splice(i, 1);
            changed = true;
          } else {
            visit(node[i]);
          }
        }
        return;
      }

      // A player response can be nested inside another response — the Shorts
      // endpoints wrap one — so the video-ad strip runs at every level rather than
      // only on the object we were handed.
      if (isPlayerResponse(node) && stripAds(node)) changed = true;

      for (const key of Object.keys(node)) {
        if (ENFORCEMENT_KEY.test(key) || AD_RENDERER.test(key)) {
          // Counted only for the ad renderers. An enforcement key is the
          // "ad blockers are not allowed" panel — removing it is not an ad
          // removed, and counting it would inflate the dashboard with the very
          // thing the user never saw an ad for.
          if (AD_RENDERER.test(key)) countAd(1);
          delete node[key];
          note(key);
          changed = true;
          continue;
        }
        visit(node[key]);
      }
    };

    visit(root);
    return changed;
  }

  // Everything we do to one response, in one place.
  //
  // stripAds runs on its own before the sweep even though the sweep would reach
  // it too. The two passes are kept independent on purpose: the video-ad strip is
  // the one that must never be skipped, so a sweep that throws on some shape we
  // have not seen yet cannot cost the user their pre-roll removal.
  function clean(o) {
    let changed = false;
    try {
      if (stripAds(o)) changed = true;
    } catch {
      /* keep going — the sweep is independent */
    }
    try {
      if (sweep(o)) changed = true;
    } catch {
      /* leave the object as it is */
    }
    return changed;
  }

  // -------------------------------------------------------------------------
  // Route 1 — the inline assignment on first load.
  //
  // The page does `var ytInitialPlayerResponse = {…}` in an inline script. A
  // top-level `var` assigns through an existing accessor on window, so defining
  // one here first means the object passes through our setter on its way in.
  // configurable:true throughout, so we can never wedge the property.
  // -------------------------------------------------------------------------
  function interceptGlobal(name) {
    // Seed from whatever is already there.
    //
    // This is not defensive padding — without it, losing the document_start race
    // is silently destructive. defineProperty would replace the page's existing
    // data property with an accessor whose backing value is undefined, so an
    // assignment that already happened would be thrown away entirely: the page
    // reads back undefined instead of its own player response. Reading the
    // current value first means the worst case is an ad we did not remove,
    // instead of a page we broke. If something IS already there we clean it in
    // place, which is the only chance we get at it.
    let stored = window[name];
    if (stored !== undefined) {
      stats.lateHook++;
      try {
        clean(stored);
      } catch {
        /* leave it exactly as the page left it */
      }
    }
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        get() {
          return stored;
        },
        set(value) {
          stats.inlineSeen++;
          try {
            if (clean(value)) stats.inlineCleaned++;
          } catch (err) {
            // Never let our cleanup stop the page assigning its own data.
            console.debug("[Sieve] YouTube ad filter: could not clean the player response", err);
          }
          stored = value;
        },
      });
    } catch (err) {
      console.debug("[Sieve] YouTube ad filter: could not hook " + name, err);
    }
  }

  interceptGlobal("ytInitialPlayerResponse");
  // ytInitialData carries the page's rendered surfaces — which is where the
  // enforcement popup is delivered on a fresh page load.
  interceptGlobal("ytInitialData");

  // -------------------------------------------------------------------------
  // Route 2 — the SPA fetch for every subsequent video.
  // -------------------------------------------------------------------------
  // /player carries the video ads. /browse (home, subscriptions, channels),
  // /search and /next (the watch sidebar) carry the DISPLAY ads, and are also
  // where the enforcement popup turns up on in-app navigation.
  //
  // The two Shorts endpoints are the reason this list is written out rather than
  // guessed. It used to name "reel_watch_sequence" directly after the version —
  // and there is no such endpoint: requesting /youtubei/v1/reel_watch_sequence
  // returns 404. Both real ones sit under a reel/ path segment, so the pattern
  // matched nothing on Shorts and every Shorts ad went straight through. Checked
  // against the live API: /reel/reel_item_watch answers 200, /reel/reel_watch_
  // sequence answers 400 to a malformed body (i.e. it exists), the flat name 404s.
  //
  // The trailing class allows a further path segment as well as a query, so a
  // future /player/<something> is matched rather than silently missed.
  const PLAYER_ENDPOINT =
    /\/youtubei\/v[0-9]+\/(?:player|next|browse|search|guide|get_watch|reel\/reel_item_watch|reel\/reel_watch_sequence)(?:[/?]|$)/;

  const urlOf = (input) => {
    try {
      if (typeof input === "string") return input;
      if (input instanceof Request) return input.url;
      if (input && typeof input.url === "string") return input.url;
      if (input && typeof input.toString === "function") return input.toString();
    } catch {
      /* fall through */
    }
    return "";
  };

  // ===========================================================================
  // Route 3 — server-side ads (SABR), skipped rather than removed
  // ===========================================================================
  //
  // Everything above works by deleting an ad from JSON before the player reads
  // it. On a SABR session there is no such JSON. The player POSTs to one
  // /videoplayback endpoint asking "what next?", and the server answers with a
  // binary UMP body containing whichever media segments it chose — an ad's
  // segments included. Measured on a live watch page: adPlacements deleted, and
  // an ad played regardless, because the ad was never in the page data at all.
  //
  // THE SEAM. UMP is a flat sequence of [varint type][varint size][bytes], and
  // part type 20 (MEDIA_HEADER) precedes every media payload. Its protobuf
  // field 2 is the eleven-character video id that the payload belongs to. Ad
  // media therefore arrives labelled with the ADVERTISER'S video id, not the one
  // in the address bar. Telling an ad from the video is a string comparison —
  // no media parsing, no frame inspection. Verified against live ads from three
  // different advertisers.
  //
  // WHAT WE DO WITH THAT, AND WHY IT IS NOT WHAT YOU WOULD EXPECT.
  //
  // The obvious move is to strip the ad's segments out of the response. That was
  // tried and measured, and it is the wrong answer: the video does still play,
  // but the player sits for ~17 SECONDS waiting for media that never arrives
  // before giving up, and the server re-sends the dropped segments the whole
  // time — 15.4 MB downloaded and discarded against 1.45 MB kept. A 17-second
  // freeze in place of a 6-second ad is not a fix.
  //
  // So this does not touch the stream at all. It READS the header to learn which
  // video is playing, and when that is an ad it seeks the ad to its end — the ad
  // finishes early and the player moves on by itself. The response is handed back
  // untouched, byte for byte.
  //
  // That distinction is the whole safety argument. A parser bug here cannot
  // corrupt media, because nothing is ever written back; the worst case is that
  // we fail to recognise an ad and it plays, which is exactly how the rest of
  // this file fails. Every video every user watches passes through this code, and
  // it must not be able to cost them the video.
  // ===========================================================================

  // Real durations, learned from the player responses we already see. Used as the
  // second opinion below. Deliberately NOT read from ytInitialPlayerResponse at
  // check time: that global goes stale across SPA navigation, and an early
  // prototype that trusted it skipped a real 213-second video to its end.
  const realDuration = Object.create(null);
  function rememberDuration(o) {
    try {
      const d = o && o.videoDetails;
      if (d && d.videoId && d.lengthSeconds) realDuration[d.videoId] = +d.lengthSeconds;
    } catch {
      /* not a player response */
    }
  }

  // --- the smallest UMP reader that answers "whose media is this?" -----------
  // A UMP varint's length is given by the number of leading 1-bits in its first
  // byte; the remaining low bits of that byte are the value's least significant
  // bits, and later bytes are little-endian above them.
  function umpVarInt(buf, off) {
    const p = buf[off];
    let size = 1;
    for (let i = 0; i < 4; i++) {
      if (!(p & (128 >> i))) break;
      size++;
    }
    if (size === 1) return { value: p, size };
    let value = 0;
    let shift = 0;
    if (size < 5) {
      value = p & ((1 << (8 - size)) - 1);
      shift = 8 - size;
    }
    for (let i = 1; i < size; i++) {
      value += buf[off + i] * Math.pow(2, shift);
      shift += 8;
    }
    return { value, size };
  }

  // Pull field 2 (a length-delimited string) out of a MEDIA_HEADER protobuf.
  function mediaHeaderVideoId(b) {
    let i = 0;
    while (i < b.length) {
      let key = 0;
      let sh = 0;
      let by;
      do {
        by = b[i++];
        key += (by & 0x7f) * Math.pow(2, sh);
        sh += 7;
      } while (by & 0x80 && i < b.length);
      const field = key >>> 3;
      const wire = key & 7;
      if (wire === 0) {
        do {
          by = b[i++];
        } while (by & 0x80 && i < b.length);
      } else if (wire === 2) {
        let len = 0;
        sh = 0;
        do {
          by = b[i++];
          len += (by & 0x7f) * Math.pow(2, sh);
          sh += 7;
        } while (by & 0x80 && i < b.length);
        if (field === 2) return String.fromCharCode.apply(null, b.subarray(i, i + len));
        i += len;
      } else if (wire === 5) i += 4;
      else if (wire === 1) i += 8;
      else break;
    }
    return null;
  }

  // The id of the media most recently delivered. Read-only: we walk the buffer,
  // note the last MEDIA_HEADER's video id, and touch nothing.
  let streamingId = null;
  function readStreamedId(buf) {
    let off = 0;
    let found = null;
    while (off < buf.length) {
      const t = umpVarInt(buf, off);
      off += t.size;
      if (off >= buf.length) break;
      const s = umpVarInt(buf, off);
      off += s.size;
      if (off + s.value > buf.length) break; // desync — stop, change nothing
      if (t.value === 20) {
        const id = mediaHeaderVideoId(buf.subarray(off, off + s.value));
        if (id) found = id;
      }
      off += s.value;
    }
    return found;
  }

  function isSabr(url) {
    return url.indexOf("/videoplayback") !== -1 && /[?&]sabr=1/.test(url);
  }

  // --- deciding that an ad is on screen --------------------------------------
  //
  // TWO signals must agree, because the cost of a false positive is seeking the
  // user's actual video to its end.
  //   1. the media being streamed belongs to a different video than the address
  //      bar, and
  //   2. the player's duration is not the real video's duration.
  // Either alone has a failure mode. (1) alone can fire while YouTube prefetches
  // a different video; (2) alone is what skipped a real video in testing, when a
  // stale global made a 213-second video look like a 213-second ad.
  function currentWatchId() {
    try {
      return new URLSearchParams(location.search).get("v");
    } catch {
      return null;
    }
  }

  function adOnScreen(video) {
    const want = currentWatchId();
    if (!want || !streamingId || streamingId === want) return false;
    if (!video || !isFinite(video.duration) || video.duration <= 0) return false;
    const real = realDuration[want];
    // No known length for this video means signal 2 cannot vouch for signal 1,
    // so we decline to act. Failing open is the rule.
    if (!real) {
      stats.sabrNoDuration++;
      return false;
    }
    if (Math.abs(video.duration - real) <= 2) {
      stats.sabrDurationSaid++;
      return false;
    }
    return true;
  }

  let lastSkipped = null;
  function skipAdIfPlaying() {
    try {
      const video = document.querySelector("video");
      if (!adOnScreen(video)) return;
      const target = video.duration - 0.05;
      if (video.currentTime >= target) return;
      video.currentTime = target;
      if (streamingId !== lastSkipped) {
        lastSkipped = streamingId;
        stats.sabrAdsSkipped++;
        countAd(1); // a server-side ad, skipped rather than removed — still one ad
      }
      // If YouTube offers its own skip control, use it too — pressing the button
      // it already put there is gentler than anything we could do ourselves.
      const btn = document.querySelector(
        ".ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern"
      );
      if (btn) btn.click();
    } catch (err) {
      console.debug("[Sieve] YouTube ad filter: skip pass failed", err);
    }
  }

  // Polled rather than event-driven: an ad's timeupdate events are exactly what
  // we are trying to cut short, so waiting for them is waiting for the ad. 250 ms
  // is under a fifth of the shortest ad observed and costs nothing measurable.
  try {
    setInterval(skipAdIfPlaying, 250);
  } catch (err) {
    console.debug("[Sieve] YouTube ad filter: could not start the skip watcher", err);
  }

  const nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = function (...args) {
      const res = nativeFetch.apply(this, args);
      const reqUrl = urlOf(args[0]);

      // The media stream. Read the header, never rewrite the body.
      if (isSabr(reqUrl)) {
        stats.sabrResponses++;
        return res.then((response) => {
          try {
            response
              .clone()
              .arrayBuffer()
              .then((ab) => {
                try {
                  const id = readStreamedId(new Uint8Array(ab));
                  if (id) streamingId = id;
                } catch {
                  /* unparsable: leave streamingId as it was and skip nothing */
                }
              })
              .catch(() => {});
          } catch {
            /* fall through — the response is returned untouched either way */
          }
          return response; // ALWAYS the original object
        });
      }

      if (!PLAYER_ENDPOINT.test(reqUrl)) return res;
      stats.fetchSeen++;
      return res.then((response) => {
        // Anything unexpected here hands back the ORIGINAL response untouched —
        // a failed clean must never cost the user their video.
        try {
          if (!response || !response.ok) return response;
          return response
            .clone()
            .json()
            .then((data) => {
              if (!clean(data)) return response;
              stats.fetchCleaned++;
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            })
            .catch(() => {
              // Matched the endpoint but the body would not parse as JSON. A
              // protobuf player response looks exactly like this from here, and
              // it is the one failure that leaves ads playing with everything
              // else looking healthy - so it is counted, not swallowed.
              stats.fetchUnreadable++;
              return response;
            });
        } catch {
          return response;
        }
      });
    };
  }

  // XHR too: some player builds still request the endpoint this way, and one
  // uncovered route is all it takes for ads to come back on a navigation.
  const NativeXHR = window.XMLHttpRequest;
  if (typeof NativeXHR === "function") {
    const open = NativeXHR.prototype.open;
    const send = NativeXHR.prototype.send;

    NativeXHR.prototype.open = function (method, url, ...rest) {
      this.__sieveIsPlayer = PLAYER_ENDPOINT.test(String(url || ""));
      return open.call(this, method, url, ...rest);
    };

    NativeXHR.prototype.send = function (...args) {
      if (this.__sieveIsPlayer) {
        stats.xhrSeen++;
        this.addEventListener("readystatechange", function () {
          if (this.readyState !== 4) return;
          try {
            if (this.responseType && this.responseType !== "text" && this.responseType !== "json") {
              stats.xhrSkippedType++;
              return;
            }
            const raw = this.responseType === "json" ? this.response : this.responseText;
            const data = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (!clean(data)) return;
            stats.xhrCleaned++;
            const cleaned = this.responseType === "json" ? data : JSON.stringify(data);
            // responseText/response are read-only on the instance, so shadow them.
            Object.defineProperty(this, "response", { configurable: true, get: () => cleaned });
            if (this.responseType !== "json") {
              Object.defineProperty(this, "responseText", {
                configurable: true,
                get: () => cleaned,
              });
            }
          } catch {
            /* leave the response exactly as it arrived */
          }
        });
      }
      return send.apply(this, args);
    };
  }

  // -------------------------------------------------------------------------
  // Route 4 — JSON.parse, as a net under the other three.
  //
  // Routes 1 and 2 cover the delivery paths we know: the inline globals, fetch
  // and XHR. This covers the ones we do not. Whatever route a payload takes, if
  // YouTube turns it into an object it goes through JSON.parse, so wrapping that
  // catches shapes arriving by a mechanism nobody has thought to look at yet.
  // (uBlock reaches the same place with trusted-replace-* filters; TubeShield
  // wraps JSON.parse outright. This is the latter, guarded.)
  //
  // JSON.parse is extremely hot — YouTube calls it constantly with small strings
  // — so the guard matters as much as the hook. A cheap substring test on the
  // raw text decides whether the result is worth walking at all; anything that
  // cannot contain an ad is handed straight back, untouched and unwalked.
  // -------------------------------------------------------------------------
  const AD_MARKERS = ['"adPlacements"', '"adSlots"', '"playerAds"', '"adSlotRenderer"', '"mealbarPromoRenderer"', '"isAd"'];
  const nativeParse = JSON.parse;
  try {
    JSON.parse = function (text, reviver) {
      const out = nativeParse.call(this, text, reviver);
      try {
        if (typeof text === "string" && text.length > 200) {
          for (let i = 0; i < AD_MARKERS.length; i++) {
            if (text.indexOf(AD_MARKERS[i]) !== -1) {
              if (clean(out)) stats.jsonParsed++;
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
    console.debug("[Sieve] YouTube ad filter: could not hook JSON.parse", err);
  }

  // A marker the background module and the options page can look for to confirm
  // the scriptlet actually reached the page.
  try {
    Object.defineProperty(window, "__sieveYouTubeAdFilter", {
      value: { version: 7, keys: AD_KEYS.slice(), enforcement: true, displayAds: true, sabrSkip: true, counts: true, stats },
      configurable: true,
    });
  } catch {
    /* non-fatal */
  }
})();

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
// playabilityStatus, errorScreen, or any of playerConfig. Playback,
// thumbnails, recommendations, comments and SPA navigation all read those, and a
// scriptlet that "cleans up" more than it must is how you break a site you meant
// to fix. The one REQUEST it edits is the player's own /player request, and
// only while THE RETRY has a variant in play.
//
// ---------------------------------------------------------------------------
// THE ENFORCEMENT LOOP — why removing ad slots is not enough on its own
//
// Deleting the ad breaks works, and then YouTube notices: its server scheduled
// an ad and never heard it play. It warns first ("ad blockers are not
// allowed"), then holds the video back, and in the end refuses it outright
// ("Video playback is blocked"). Rewriting that refusal in the page does
// nothing — on a SABR session it is the video server declining to send the
// video (see noteRefusal).
//
// What does work is ASKING AGAIN, DIFFERENTLY. This is how uBlock Origin keeps
// videos playing on an account YouTube has flagged. Its public filters were read
// in October 2026, after uBlock Origin Lite played ad-free on the very account
// and browser this file had just been refused on. When the video is held back
// or refused, the player is told to load the same video again, and the request
// it sends is edited to describe a kind of playback YouTube does not put ads
// in front of. There are several such descriptions and YouTube closes them one
// at a time, so they are tried in turn. See THE RETRY. Nothing here is copied
// from uBlock (its lists are GPLv3, and this file is MIT); the field values are
// facts about YouTube's API, and the code is this file's own.
//
// So there are three jobs:
//   1. remove the ad breaks (below),
//   2. when YouTube holds the video back or refuses it, ask for it again
//      differently (THE RETRY), and
//   3. stop YouTube from spotting the first two, or from getting round them
//      (COUNTER-MEASURES).
//
// Only when every variant has been refused does this stop removing ads, and
// fast-forward them for a cool-down instead (STRATEGY).
//
// An earlier build also switched off playerConfig.daiConfig's "report missing
// ad breaks" and server-stitched DAI flags. uBlock touches neither and plays
// anyway. The player also reads that config to recognise a server-stitched ad,
// which THE RETRY now relies on, so the config is left exactly as sent.
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
//   • The final escalation — "Video playback is blocked" — cannot be rewritten
//     away on a SABR session, and this file does not try. Measured on a flagged
//     account, October 2026: the refusal reached the player through none of the
//     routes below, the formats carried no addresses, and the video server
//     answered a single request and sent nothing more. The refusal is recorded
//     (see noteRefusal) and answered by job 2, asking again; when YouTube has
//     closed every variant, the answer is to fast-forward instead.
//
//   • THE RETRY's variants are the most perishable thing in this file. Each is
//     a description of playback that YouTube happens not to put ads in front of
//     today. When YouTube closes one it fails as a refused retry and the next is
//     tried; when it closes them all this falls back to fast-forwarding. Neither
//     costs anyone their video.
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
    refusals: [],       // the last few refusals seen: route, status, screen, media
    // The fall-back to fast-forwarding (see STRATEGY). `pushback` counts what
    // made YouTube's displeasure visible — "popup" or "block".
    pushback: {},
    reloads: 0,          // refused videos loaded again to play with their ads
    adsFastForwarded: 0, // ad breaks run muted at 16x instead of removed
    // THE RETRY. `retries` counts videos the player was told to load again, and
    // `lastRetry` says why ("held" or "refused") and with which variant.
    // `variant` (a live getter, added below) is the variant now in play.
    holdSignals: 0,      // YouTube signalled the stream was being held while it was starved
    holdSignalKinds: Object.create(null), // which signal: "snackbar" or "bytes"
    retries: 0,
    lastRetry: null,
    requestsEdited: 0,   // /player requests sent with a variant
    ssapSkipped: 0,      // server-stitched ads seeked to their end through the player
    // COUNTER-MEASURES, each counted so a readout says whether it ever fired.
    abnormalityMuted: 0, // YouTube's "abnormality detected" callbacks swapped for no-ops
    timersBoosted: 0,    // YouTube's 17-second hold timers cut to 17 ms
    framesGuarded: 0,    // fresh frames handed our fetch/JSON instead of clean copies
    inlineNeutered: 0,   // inline scripts that grab window.fetch, emptied before they ran
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

  // ---------------------------------------------------------------------------
  // Hooks that look like the browser's own
  //
  // Every function this file replaces — fetch, JSON.parse, JSON.stringify,
  // setTimeout, Promise.prototype.then and the rest — is replaced by a Proxy
  // around the original rather than by a function of our own. A plain
  // replacement announces itself the moment anything calls toString() on it:
  // out comes our source instead of "function fetch() { [native code] }", and
  // YouTube's player is exactly the kind of code that checks. A Proxy keeps the
  // original's name, length and native toString, and only the call itself
  // passes through us.
  //
  // The originals are captured here, once, before anything is patched, and
  // this file calls them directly. Its own JSON work therefore never runs back
  // through its own hooks.
  // ---------------------------------------------------------------------------
  const nativeToString = Function.prototype.toString;
  const nativeParse = JSON.parse;
  const nativeStringify = JSON.stringify;
  const toStrings = new WeakMap();
  function cloak(target, apply) {
    return new Proxy(target, {
      apply,
      get(t, prop) {
        if (prop === "toString") {
          let f = toStrings.get(t);
          if (!f) {
            f = nativeToString.bind(t);
            toStrings.set(t, f);
          }
          return f;
        }
        return Reflect.get(t, prop, t);
      },
    });
  }

  // A function's source, or "" for one that will not say.
  function sourceOf(fn) {
    try {
      return nativeToString.call(fn);
    } catch {
      return "";
    }
  }

  // The page's path, with or without a real Location to ask.
  function pagePath() {
    try {
      if (typeof location.pathname === "string") return location.pathname;
      return new URL(location.href).pathname;
    } catch {
      return "";
    }
  }
  const onWatchPage = () => {
    try {
      return String(location.href).indexOf("/watch?") !== -1;
    } catch {
      return false;
    }
  };
  // The embedded player and the TV app are not where THE RETRY or its signals
  // can do anything, so the hooks that serve them are not installed there.
  const inYouTubeApp = !/^\/(?:embed|tv)(?:\/|$)/.test(pagePath());

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

  // ===========================================================================
  // STRATEGY — remove the ads, and fall back to fast-forwarding them once
  // YouTube has refused every other way of asking
  // ===========================================================================
  //
  // There are two ways to deal with a video ad, and they were measured against
  // each other on the same video in October 2026 (seconds until the video ITSELF
  // had played one second, three runs each, signed-out session):
  //
  //                      run 1   run 2   run 3   on screen meanwhile
  //   nothing done        18.7    39.7    >40    the ads
  //   fast-forward         7.3    12.6    13.4   the ad, muted, at 16x
  //   remove               6.4     6.9     6.5   ~4.5 s of black
  //
  // Removing is plainly better to watch — until YouTube notices. It notices
  // because its server scheduled an ad and never heard it play. It says so first
  // with the "ad blockers are not allowed" popup, and in the end it stops sending
  // the video at all ("Video playback is blocked") — which, on a SABR session,
  // no browser can get past (see noteRefusal). Fast-forwarding gives the server
  // nothing to notice: the ad is requested, delivered and played to its end,
  // just muted and at sixteen times the speed. (On SABR sessions YouTube holds
  // the video back for most of an ad's length whatever the client does, which is
  // why fast-forwarding is not much quicker than sitting through it. But it
  // plays.)
  //
  // So: remove by default. When YouTube holds the video back or refuses it, ask
  // again differently (THE RETRY), as many times as there are variants. Only
  // when every variant has been refused does THIS BROWSER switch to
  // fast-forwarding, for a cool-down — two days, doubling on every repeat
  // within a month, up to a fortnight — and then try removing again. Display
  // ads (feed tiles, promoted results, banners) are removed in both modes; it is
  // the video ad breaks that YouTube checks up on.
  //
  // The warning popup no longer switches anything. It used to, on the reasoning
  // that it comes before the block. But the block is now answered by asking
  // again, so there is nothing to gain by switching early. The popup is still
  // removed and counted.
  //
  // The state lives in youtube.com's own localStorage. That is unusual for this
  // file and deliberate: it is the one store this world can read synchronously
  // at document_start, before the page's first player response goes past, and
  // it survives the reload a refused video needs. The bridge is told as well, so
  // the settings page can explain why ads are suddenly being fast-forwarded.
  // ---------------------------------------------------------------------------
  const FALLBACK_KEY = "sv-yt-ff";
  // Records carry this version. One without it was written before THE RETRY
  // existed, when a single warning or refusal was enough to switch. Holding a
  // viewer to that would mean days of fast-forwarding that asking again might
  // have avoided, so it is discarded.
  const FALLBACK_VERSION = 2;
  const RELOAD_KEY = "sv-yt-ff-reload";
  const DAY_MS = 86400000;
  const MAX_COOLDOWN_DAYS = 14;
  const STRIKE_MEMORY_MS = 30 * DAY_MS; // push-back this long after a cool-down ends starts the count over
  const RELOAD_GUARD_MS = 10 * 60000;
  const FF_RATE = 16; // the most Chrome and Firefox will play a media element at

  let legacyFallbackDropped = false;
  function readFallback() {
    try {
      const raw = window.localStorage.getItem(FALLBACK_KEY);
      if (!raw) return null;
      const s = nativeParse(raw);
      if (s && s.v === FALLBACK_VERSION && typeof s.until === "number" && typeof s.since === "number") return s;
      window.localStorage.removeItem(FALLBACK_KEY);
      legacyFallbackDropped = true;
      return null;
    } catch {
      return null; // no storage in this frame: remove, as before
    }
  }

  let fallback = readFallback();
  function fastForwarding() {
    return !!fallback && fallback.until > Date.now();
  }
  // Read live, so a console check says what the page is doing NOW.
  Object.defineProperty(stats, "mode", {
    enumerable: true,
    get: () => (fastForwarding() ? "fast-forward until " + new Date(fallback.until).toISOString() : "remove"),
  });

  // The settings page still describes a record this page has just thrown away.
  // Tell it, once the bridge has had time to start listening: both halves load
  // at document_start, and this one can run first.
  if (legacyFallbackDropped) {
    setTimeout(() => {
      try {
        window.postMessage({ [REPORT_TAG]: true, dir: "to-bridge", kind: "fallback-clear" }, "*");
      } catch {
        /* the note expires by itself */
      }
    }, REPORT_DELAY);
  }

  // Something YouTube sent says it has noticed. `reason` is "popup" (the
  // warning) or "block" (playback refused, and every variant of THE RETRY
  // refused with it). Only a block switches the strategy; a popup is counted.
  function onPushback(reason) {
    stats.pushback[reason] = (stats.pushback[reason] || 0) + 1;
    if (reason !== "block") return;
    // Already standing down. A block arriving now is YouTube's flag outlasting
    // the switch, and there is nothing further this side can do about it.
    if (fastForwarding()) return;
    const now = Date.now();
    const prior = fallback && now - fallback.until < STRIKE_MEMORY_MS ? fallback.strikes || 0 : 0;
    const strikes = prior + 1;
    const days = Math.min(MAX_COOLDOWN_DAYS, Math.pow(2, strikes));
    fallback = { v: FALLBACK_VERSION, since: now, until: now + days * DAY_MS, strikes, reason };
    try {
      window.localStorage.setItem(FALLBACK_KEY, nativeStringify(fallback));
    } catch {
      /* this page still switches; the next one will not remember */
    }
    try {
      window.postMessage(
        { [REPORT_TAG]: true, dir: "to-bridge", kind: "fallback", since: fallback.since, until: fallback.until, reason },
        "*"
      );
    } catch {
      /* the settings page just will not know */
    }
    // A refused video does not start by itself: load it again, this time with
    // its ads left in. At most once per ten minutes, so a flag that outlasts the
    // switch cannot become a reload loop.
    reloadOnce();
  }

  function reloadOnce() {
    try {
      const last = Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0;
      if (Date.now() - last < RELOAD_GUARD_MS) return;
      window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      return; // no session storage means no guard, and no guard means no reload
    }
    stats.reloads++;
    setTimeout(() => {
      try {
        location.reload();
      } catch {
        /* nothing to do */
      }
    }, 300);
  }

  // Does this look like a YouTube player response? Checked before touching
  // anything so a same-named object from somewhere else is left alone.
  function isPlayerResponse(o) {
    return !!o && typeof o === "object" && ("streamingData" in o || "videoDetails" in o || "playabilityStatus" in o);
  }

  // Remove the ad keys in place. Returns true if anything was actually removed,
  // so callers can skip rebuilding a response that did not change.
  const breaksCounted = new Set(); // video ids whose ad breaks are already counted
  function stripAds(o) {
    if (!isPlayerResponse(o)) return false;
    let changed = false;
    // A refusal is written down, never acted on (see noteRefusal).
    noteRefusal(o);
    rememberDuration(o);
    if (o.streamingData && o.streamingData.serverAbrStreamingUrl) stats.sabrSeen++;
    // Fast-forwarding: the ad breaks, and the flags that report on them, stay
    // exactly as YouTube sent them — the whole point is that nothing is missing
    // for its server to notice. The player plays them; fastForwardTick() mutes
    // and speeds them up.
    if (fastForwarding()) return false;
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
    // Once per video on this page. The same video's ad breaks come back with
    // every fresh player response for it — a retry (THE RETRY), a prefetch —
    // and counting each copy put the dashboard at nearly two hundred ads for
    // two videos.
    const vid = o.videoDetails && o.videoDetails.videoId;
    if (hadAdKey && !(vid && breaksCounted.has(vid))) {
      if (vid) breaksCounted.add(vid);
      countAd(breaks || 1);
    }
    // playerConfig is not touched — not adConfig, not daiConfig. See THE
    // ENFORCEMENT LOOP at the top for why the DAI flags stopped being flipped.
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
  // Deliberately narrow. The sweep never goes into an errorScreen: that is where
  // the legitimate "video unavailable", "age restricted" and "private video"
  // states live, and emptying one would trade an explanation for a blank box.
  // ---------------------------------------------------------------------------
  const ENFORCEMENT_KEY = /^(enforcementMessageViewModel|adBlockerMessageViewModel|adblockDetectionRenderer)$/i;

  // ---------------------------------------------------------------------------
  // The playback block — recorded, never rewritten.
  //
  // YouTube's last step is to stop playing videos: "Ad blockers violate YouTube's
  // Terms of Service ... Video playback is blocked". Flipping that refusal back
  // to "OK" is the obvious move, and two builds in October 2026 did it. Against
  // a simulation of the block it worked. On the account that was really flagged
  // it did nothing, and a record of every refusal this file saw said why: the
  // refusal came through NONE of the routes here. That session streamed by SABR
  // — 36 formats, not one with an address, a single request to the video server
  // and then nothing — so the block was the video server declining to send the
  // video. There is no object in the page whose rewriting makes it send it. A
  // "lift" could only ever have swapped YouTube's explanation for a stalled
  // black player, so there is none: playabilityStatus is read, never written.
  //
  // What stays is the record: the last few refusals that put something on
  // screen, held in the page and never sent anywhere, because it is what turned
  // three rounds of guessing into one answer. Read it in a tab as
  //   window.__sieveYouTubeAdFilter.stats.refusals
  // An EMPTY list on a page showing a refusal means it came from the video
  // server, which nothing in a browser can argue with.
  //
  // What does work against the refusal is a new question rather than a
  // rewritten answer: on a watch page, THE RETRY reads the refusal off the
  // player and asks for the video again, differently.
  // ---------------------------------------------------------------------------
  let route = "?";

  // Is this player response YouTube refusing the video BECAUSE OF AN AD
  // BLOCKER, rather than for any of the ordinary reasons (private, removed,
  // region, age)? Two shapes are known: the enforcement view model inside the
  // error screen, and an ordinary error screen whose explanation links YouTube's
  // help article on ad blockers (answer 3037019). The second is uBlock's own
  // test; it skips a captcha screen, which is a bot check and not this.
  const AD_BLOCKER_HELP = "answer/3037019";
  function isAdblockRefusal(o) {
    try {
      const ps = o && o.playabilityStatus;
      if (!ps || typeof ps !== "object" || ps.status === "OK") return false;
      const screen = ps.errorScreen;
      if (!screen || typeof screen !== "object") return false;
      if (Object.keys(screen).some((k) => ENFORCEMENT_KEY.test(k))) return true;
      const pem = screen.playerErrorMessageRenderer;
      if (pem && pem.playerCaptchaViewModel) return false;
      const text = nativeStringify(screen);
      return text.indexOf(AD_BLOCKER_HELP) !== -1 && text.indexOf("WEB_PAGE_TYPE_UNKNOWN") !== -1;
    } catch {
      return false;
    }
  }

  // How this response says the video will arrive, if at all.
  function mediaOf(o) {
    const sd = o.streamingData;
    if (!sd || typeof sd !== "object") return o.videoDetails ? "withheld" : "not in this response";
    const formats = [].concat(sd.adaptiveFormats || [], sd.formats || []);
    if (formats.some((f) => f && (f.url || f.signatureCipher))) return "addressable";
    if (sd.serverAbrStreamingUrl) return "server-streamed (SABR)";
    return sd.hlsManifestUrl || sd.dashManifestUrl ? "manifest" : "none";
  }

  // clean() hands a player response to stripAds twice — once directly, once from
  // the sweep — so each refusal is written down once, by identity.
  const recorded = new WeakSet();

  function noteRefusal(o) {
    try {
      const ps = o.playabilityStatus;
      if (!ps || typeof ps !== "object" || ps.status === "OK" || recorded.has(ps)) return;
      recorded.add(ps);
      // Only a refusal that puts something on screen. A live stream's player
      // responses carry non-OK statuses with no error screen all the time, and
      // recording those flooded the record past the one entry that mattered.
      const screen = ps.errorScreen;
      if (!screen || typeof screen !== "object") return;
      const keys = Object.keys(screen);
      stats.refusals.push({ route, status: String(ps.status), screen: keys, media: mediaOf(o) });
      if (stats.refusals.length > 8) stats.refusals.shift();
      // The refusal is not ours to lift. On a watch page THE RETRY answers it by
      // asking again, and only switches the strategy if every variant is
      // refused. Anywhere else (an embed, a Short) there is no player to ask
      // again, so it switches the strategy straight away, as it always has.
      if (!onWatchPage() && isAdblockRefusal(o)) onPushback("block");
    } catch {
      /* a record we could not make is not worth breaking playback over */
    }
  }

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
  // The player-response keys that carry the video ad breaks. Fast-forwarding
  // leaves them alone, so the walk must not go into them and pick their ad
  // renderers out one by one either.
  const AD_BREAK_KEYS = new Set(AD_KEYS);

  function sweep(root) {
    let changed = false;
    const seen = new WeakSet();
    const keepAdBreaks = fastForwarding();
    let warned = false;

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
        // Never into an error screen. Whatever is in one — the playback block
        // included — is YouTube explaining why a video cannot play, and emptying
        // it leaves a blank box instead of the explanation. (It used to: the
        // enforcement message was deleted from here like from anywhere else.)
        if (key === "errorScreen") continue;
        if (keepAdBreaks && AD_BREAK_KEYS.has(key)) continue;
        if (ENFORCEMENT_KEY.test(key) || AD_RENDERER.test(key)) {
          // Counted only for the ad renderers. An enforcement key is the
          // "ad blockers are not allowed" panel — removing it is not an ad
          // removed, and counting it would inflate the dashboard with the very
          // thing the user never saw an ad for. It IS YouTube noticing, though,
          // which is what switches the strategy.
          if (AD_RENDERER.test(key)) countAd(1);
          else warned = true;
          delete node[key];
          note(key);
          changed = true;
          continue;
        }
        visit(node[key]);
      }
    };

    visit(root);
    if (warned) onPushback("popup");
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
        route = "inline " + name;
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
            route = "inline " + name;
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

  // Just the path of a request — "/youtubei/v1/player/heartbeat" — for the
  // refusal record. Never the query, which can carry the video id.
  const pathOf = (url) => {
    try {
      return new URL(String(url), location.href).pathname;
    } catch {
      return "?";
    }
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
  // The <video> element, remembered between ticks. This runs four times a
  // second for as long as the tab is open, in every frame, so re-running a
  // document-wide querySelector each time is the one thing it must not do.
  // Re-resolved only when the cached node has left the document.
  let cachedVideo = null;
  function videoEl() {
    if (cachedVideo && cachedVideo.isConnected) return cachedVideo;
    cachedVideo = document.querySelector("video");
    return cachedVideo;
  }

  function skipAdIfPlaying() {
    try {
      // Three gates before any DOM work, cheapest first.
      //
      // A hidden tab is not showing anyone an ad, and a backgrounded YouTube
      // tab left open for hours was previously enough to keep this timer — and
      // the renderer — out of deep idle for the whole time.
      if (document.hidden) return;
      // No media stream has been seen in THIS frame, so there is no ad here to
      // skip. This is what excludes every frame on the page that is not the
      // player: allFrames is true because an embedded player is a frame, but
      // most frames never set streamingId at all.
      if (!streamingId) return;

      const video = videoEl();
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

  // ===========================================================================
  // Fast-forwarding, and watching the player for the block
  // ===========================================================================

  // The MAIN player, by id. Not "the first .html5-video-player": YouTube keeps
  // other players in the page — the hover previews among them — and the first
  // one in document order is not reliably the one playing. Picking one of those
  // up was measured: the real ad ran unmuted for its whole length while this
  // watched a preview that never showed one. An id lookup costs nothing, so it
  // is done on every tick until the player exists; only the class fallback, for
  // a page without that id, is rationed — most frames this runs in have no
  // player at all.
  let cachedPlayer = null;
  let playerLookedAt = 0;
  function playerEl() {
    if (cachedPlayer && cachedPlayer.isConnected) return cachedPlayer;
    cachedPlayer = document.getElementById("movie_player");
    if (cachedPlayer) return cachedPlayer;
    const now = Date.now();
    if (now - playerLookedAt < 2000) return null;
    playerLookedAt = now;
    cachedPlayer = document.querySelector(".html5-video-player");
    return cachedPlayer;
  }

  // While the player says an ad is on, mute it and run it at 16x; the moment it
  // says the ad is over, put back exactly what the viewer had. What they had is
  // read when the ad starts, never assumed — someone watching at 1.5x, or with
  // the sound off, gets 1.5x and silence back.
  //
  // YouTube's own Skip button is deliberately NOT pressed: a script's click is
  // not a person's, YouTube can tell, and measured on a live ad it ignored
  // seventy of them. Pressing it would only be one more thing to notice.
  //
  // YouTube puts the sound back on by itself as an ad gets going — traced on a
  // live ad: muted by this at +14 ms, unmuted by the player half a second later.
  // A quarter-second poll would leave that much of the ad audible, so while an
  // ad is on, the video's own volumechange/ratechange events put it straight
  // back. The guards make each handler a no-op once the value is right, so they
  // cannot chase each other.
  let ffSaved = null;
  let ffVideo = null;
  function holdFastForward() {
    if (!ffSaved || !ffVideo || !cachedPlayer || !cachedPlayer.classList.contains("ad-showing")) return;
    if (!ffVideo.muted) ffVideo.muted = true;
    if (ffVideo.playbackRate !== FF_RATE) ffVideo.playbackRate = FF_RATE;
  }

  function fastForwardTick() {
    const player = playerEl();
    if (!player) return;
    const video = player.querySelector("video");
    if (!video) return;
    if (player.classList.contains("ad-showing")) {
      if (!ffSaved) {
        ffSaved = { muted: video.muted, rate: video.playbackRate };
        stats.adsFastForwarded++;
        countAd(1); // the viewer was spared it, if not quite as cleanly
      }
      if (ffVideo !== video) {
        if (ffVideo) {
          ffVideo.removeEventListener("volumechange", holdFastForward);
          ffVideo.removeEventListener("ratechange", holdFastForward);
        }
        ffVideo = video;
        video.addEventListener("volumechange", holdFastForward);
        video.addEventListener("ratechange", holdFastForward);
      }
      holdFastForward();
    } else if (ffSaved) {
      if (ffVideo) {
        ffVideo.removeEventListener("volumechange", holdFastForward);
        ffVideo.removeEventListener("ratechange", holdFastForward);
        ffVideo = null;
      }
      video.muted = ffSaved.muted;
      if (video.playbackRate === FF_RATE) video.playbackRate = ffSaved.rate;
      ffSaved = null;
    }
  }

  // The block on a flagged account never comes through any route above — the
  // video server refuses, and the player builds the refusal itself — so the
  // player is asked directly what it is holding. Its own getPlayerResponse() is
  // the same object the error screen is drawn from.
  function checkPlayerForBlock() {
    const player = playerEl();
    if (!player || typeof player.getPlayerResponse !== "function") return;
    const pr = player.getPlayerResponse();
    if (!pr || typeof pr !== "object") return;
    route = "player";
    noteRefusal(pr);
  }

  // ===========================================================================
  // THE RETRY — when YouTube holds the video back or refuses it, ask again,
  // differently
  // ===========================================================================
  //
  // Removing the ad breaks leaves YouTube's server with an ad it scheduled and
  // never heard played. It answers in one of two ways. It HOLDS the video back:
  // the player sits buffering, nothing in the buffer, no picture. Or it REFUSES
  // the video outright ("Video playback is blocked"). Neither can be rewritten
  // away from in here (see noteRefusal). But each is the answer to one
  // particular request, and a different request gets a different answer.
  //
  // So the player is told to load the same video again — its own
  // loadVideoById(), from where the viewer was, with no page reload — and the
  // /player request it sends for it is edited to describe a
  // kind of playback YouTube does not put ads in front of. Four such
  // descriptions are known (October 2026), tried in this order:
  //
  //   channel    the video is playing on a channel page    clientScreen CHANNEL
  //   lactmilli  a request-parameter variant               params "8AUB"
  //   instream   the request is for an ad's own playback   adPlaybackContext
  //   yahi       another request-parameter variant         params "YAHI"
  //
  // Each but the last also says the viewer was last active just now
  // (lactMilliseconds). These are uBlock Origin's: read from its public filters
  // after it played ad-free on an account this file was being refused on. The
  // order and the triggers below follow it too, because that combination is
  // what was seen to work. The code is this file's own.
  //
  // WHAT TRIGGERS A RETRY, the same way:
  //   • a REFUSAL on screen moves straight on to the next variant. The first
  //     refusal skips "channel": that one answers a hold, and against a refusal
  //     it was measured here to come back UNPLAYABLE.
  //   • a HOLD needs two things at once — YouTube signalling that it is holding
  //     the stream (the signals below) while the player is visibly starved.
  //     Starved alone is not enough: every video is starved for a moment as it
  //     starts, and treating that as a hold would reload every video anyone
  //     opened on a slow connection.
  //
  // A variant that works stays in play for the rest of the tab's life, so the
  // next video asks that way from the start. One that fails — refused, or held
  // again — is dropped. When none are left, a refusal is a refusal of every way
  // of asking, and STRATEGY falls back to fast-forwarding.
  //
  // The edited request carries "#reloadxhr" on the end of its referer. YouTube
  // echoes the referer in the response's tracking address, so the response on
  // screen says whether it was fetched with a variant. That is how a hold is
  // pinned on the variant that produced it.
  //
  // Bounded twice over, because a retry that misfired would reload a video for
  // ever: at most one retry per variant, plus one plain one, for any one video
  // on this page; and after each retry nothing is judged until the player holds
  // a new response or four seconds have passed.
  // ---------------------------------------------------------------------------
  const VARIANTS = ["channel", "lactmilli", "instream", "yahi"];
  let variant = ""; // in play for outgoing /player requests ("" = none)
  let untried = VARIANTS.slice(); // still to try for the video on screen
  let holdSeen = false; // YouTube signalled a hold while the player was starved
  let settling = null; // { until, response } — just retried, wait for the new answer
  let retriedAt = 0;
  let gaveUp = false;
  let ssapOn = false;
  const retriesFor = Object.create(null); // video id -> retries this page made
  const MAX_RETRIES_PER_VIDEO = VARIANTS.length + 1;
  const SETTLE_MS = 4000;

  Object.defineProperty(stats, "variant", { enumerable: true, get: () => variant || "none" });

  // The outgoing edit. Made on a COPY of the request: YouTube may keep the
  // object it is stringifying, and our edit must not leak into its own state.
  function editPlayerRequest(body) {
    const copy = nativeParse(nativeStringify(body));
    const client = copy.context && copy.context.client;
    const pc = copy.playbackContext;
    const cpc = pc && pc.contentPlaybackContext;
    if (variant === "channel") {
      if (client && client.clientName === "WEB") client.clientScreen = "CHANNEL";
    } else if (variant === "lactmilli") {
      copy.params = "8AUB";
    } else if (variant === "instream") {
      // A sibling of contentPlaybackContext, not a child of it.
      if (cpc) pc.adPlaybackContext = { adType: "AD_TYPE_INSTREAM" };
    } else if (variant === "yahi") {
      copy.params = "YAHI";
    }
    if (cpc) {
      if (variant !== "yahi") cpc.lactMilliseconds = String(Date.now());
      if (typeof cpc.referer === "string") cpc.referer = cpc.referer.replace(/(?:#reloadxhr)?$/, "#reloadxhr");
    }
    stats.requestsEdited++;
    return copy;
  }

  // The /player request body is gzipped before it is sent, so it cannot be
  // edited on the way out of fetch. It CAN be edited on its way into
  // JSON.stringify, which is where it becomes text. The player request is the
  // one carrying an attestationRequest; nothing else is touched.
  try {
    JSON.stringify = cloak(nativeStringify, (t, self, args) => {
      if (variant) {
        try {
          const v = args[0];
          if (v && typeof v === "object" && Object.prototype.hasOwnProperty.call(v, "attestationRequest") && v.attestationRequest) {
            args[0] = editPlayerRequest(v);
          }
        } catch {
          /* send it as YouTube wrote it */
        }
      }
      return Reflect.apply(t, self, args);
    });
  } catch (err) {
    console.debug("[Sieve] YouTube ad filter: could not hook JSON.stringify", err);
  }

  function ask(player, method) {
    try {
      const f = player[method];
      return typeof f === "function" ? f.call(player) : undefined;
    } catch {
      return undefined;
    }
  }

  // What the player says about itself, through its own API.
  function readPlayer(player) {
    const state = ask(player, "getPlayerStateObject");
    return {
      player,
      response: ask(player, "getPlayerResponse"),
      nerd: ask(player, "getStatsForNerds"),
      progress: ask(player, "getProgressState"),
      buffering: !!(state && state.isBuffering),
    };
  }

  // Buffering, with nothing in the buffer and no picture: the look of a video
  // the server is not sending.
  function starved(s) {
    return s.buffering && !!s.nerd && s.nerd.buffer_health_seconds === "0.00 s" && s.nerd.resolution === "0x0";
  }

  function fetchedWithVariant(pr) {
    try {
      return String(pr.playbackTracking.videostatsPlaybackUrl.baseUrl).indexOf("reloadxhr") !== -1;
    } catch {
      return false;
    }
  }

  // "SSAP, AD" is the player's own stats-for-nerds label for a server-stitched
  // ad (server-side ad playback) while one is on screen.
  function isSsapAd(nerd) {
    return !!nerd && typeof nerd.debug_info === "string" && nerd.debug_info.indexOf("SSAP, AD") === 0;
  }

  function mainPlayer() {
    try {
      return typeof document.getElementById === "function" ? document.getElementById("movie_player") : null;
    } catch {
      return null;
    }
  }

  // YouTube signalled a hold. Only worth acting on while the player is
  // starved; and if the response on screen was fetched with the variant in
  // play, that variant is the one being held, so it is dropped.
  let inSignal = false;
  function onHoldSignal(kind) {
    if (inSignal || fastForwarding()) return;
    inSignal = true;
    try {
      const player = mainPlayer();
      if (!player || !untried.length) return;
      const s = readPlayer(player);
      if (!starved(s)) return;
      stats.holdSignals++;
      stats.holdSignalKinds[kind] = (stats.holdSignalKinds[kind] || 0) + 1;
      if (variant && fetchedWithVariant(s.response)) {
        const i = untried.indexOf(variant);
        if (i !== -1) untried.splice(i, 1);
      }
      holdSeen = true;
    } catch {
      /* a missed signal is a hold sat out, not a broken page */
    } finally {
      inSignal = false;
    }
  }

  function retry(s, why) {
    const pr = s.response;
    const id = pr && pr.videoDetails && pr.videoDetails.videoId;
    if (!id || typeof s.player.loadVideoById !== "function") return false;
    const n = (retriesFor[id] || 0) + 1;
    if (n > MAX_RETRIES_PER_VIDEO) return false;
    retriesFor[id] = n;
    // From where the viewer was, so a hold in the middle of a video does not
    // send them back to the beginning; otherwise from where the page asked the
    // video to start. A live stream is left to find its own place.
    const psc = pr.playerConfig && pr.playerConfig.playbackStartConfig;
    let start = (psc && Number(psc.startSeconds)) || 0;
    const live = !!(pr.videoDetails && pr.videoDetails.isLive);
    const at = s.progress && Number(s.progress.current);
    if (!live && at > start + 1) start = Math.floor(at);
    settling = { until: Date.now() + SETTLE_MS, response: pr };
    retriedAt = Date.now();
    stats.retries++;
    stats.lastRetry = { why, variant: variant || "none" };
    try {
      s.player.loadVideoById(id, start);
    } catch {
      return false;
    }
    return true;
  }

  // Every way of asking has been refused. Stop editing requests and let
  // STRATEGY fall back to fast-forwarding, which reloads the page once.
  function giveUp() {
    if (gaveUp) return;
    gaveUp = true;
    variant = "";
    onPushback("block");
  }

  // A retry loses the playlist the video was playing in. Put it back, the way
  // the page's own playlist manager would.
  function restorePlaylist(player) {
    if (!retriedAt || Date.now() - retriedAt > 10000) return;
    try {
      if (String(location.href).indexOf("&list=") === -1) return;
      if (typeof player.getPlaylistId !== "function" || player.getPlaylistId() !== null) return;
      const mgr = document.querySelector("yt-playlist-manager");
      const data = mgr && typeof mgr.getPlaylistData === "function" ? mgr.getPlaylistData() : null;
      if (!data) return;
      mgr.setPlaylistData(data);
      if (typeof mgr.setPlayerPlaybackControlData === "function") {
        mgr.setPlayerPlaybackControlData({ playlistPanelRenderer: data });
      }
      retriedAt = 0;
    } catch {
      /* the video plays; only the playlist panel is missing */
    }
  }

  function retryTick() {
    const player = mainPlayer();
    if (!player || !onWatchPage()) {
      // Off a watch page: the next video gets every variant to try again, but
      // the one in play stays in play.
      untried = VARIANTS.slice();
      holdSeen = false;
      return;
    }
    const s = readPlayer(player);
    const pr = s.response;
    if (!pr || typeof pr !== "object") return;
    if (settling) {
      if (Date.now() < settling.until && pr === settling.response) return;
      settling = null;
    }
    const ff = fastForwarding();

    if (isAdblockRefusal(pr)) {
      if (!untried.length) {
        giveUp();
        return;
      }
      untried.shift();
      variant = untried[0] || "";
      holdSeen = false;
      if (!retry(s, "refused")) giveUp();
      return;
    }

    const p = s.progress;
    const live = !!(pr.videoDetails && pr.videoDetails.isLive);
    const unfinished = (p && p.duration > 0 && (p.loaded < p.duration || p.duration - p.current > 1)) || live;
    if (!unfinished) return;

    // A server-stitched ad is part of the stream itself, so there is no ad
    // break to remove and no separate media to read. The player still knows it
    // is an ad, and seeking it to its end through the player's own seekTo ends
    // it. Not while fast-forwarding, whose whole point is that ads play out.
    if (!ff && isSsapAd(s.nerd)) {
      if (!ssapOn) {
        ssapOn = true;
        stats.ssapSkipped++;
        countAd(1);
      }
      if (p && p.duration > 0) {
        try {
          player.seekTo(p.duration);
        } catch {
          /* the ad plays */
        }
      }
      return;
    }
    ssapOn = false;
    // While fast-forwarding, a starved player is YouTube waiting out the ad,
    // which is the bargain that mode makes.
    if (ff) return;

    if (!untried.length) {
      holdSeen = false;
      variant = "";
      return;
    }
    if (holdSeen && starved(s)) {
      variant = untried[0];
      holdSeen = false;
      retry(s, "held");
      return;
    }
    restorePlaylist(player);
  }

  // The hold signals, which are YouTube's own and as perishable as the rest.
  //   • The player looking up its handler for a "snackbar message" — the
  //     stream's way of telling it to put a notice up — while starved.
  //   • A whole 104- or 105-byte message going onto one of the player's queues
  //     while starved. uBlock watches for exactly that size. What the message
  //     says is not known here, only that it comes with the hold.
  // Both are hooked on the prototypes the player calls, because neither shows
  // up anywhere else the page can see.
  function isWholeByteArray(v) {
    return ArrayBuffer.isView(v) && !!v.constructor && v.constructor.name === "Uint8Array" && v.buffer.byteLength === v.length;
  }
  if (inYouTubeApp) {
    try {
      Map.prototype.has = cloak(Map.prototype.has, (t, self, args) => {
        if (args[0] === "onSnackbarMessage") onHoldSignal("snackbar");
        return Reflect.apply(t, self, args);
      });
    } catch (err) {
      console.debug("[Sieve] YouTube ad filter: could not watch for the snackbar signal", err);
    }
    try {
      Array.prototype.push = cloak(Array.prototype.push, (t, self, args) => {
        try {
          const v = args[0];
          if (v !== null && typeof v === "object" && (v.length === 104 || v.length === 105) && isWholeByteArray(v)) onHoldSignal("bytes");
        } catch {
          /* not a signal */
        }
        return Reflect.apply(t, self, args);
      });
    } catch (err) {
      console.debug("[Sieve] YouTube ad filter: could not watch for the hold signal", err);
    }
  }

  // ===========================================================================
  // COUNTER-MEASURES — three things YouTube does about blockers, disarmed
  // ===========================================================================
  //
  // 1. "ABNORMALITY DETECTED". The player hands a callback by that name to a
  //    promise, and it runs when YouTube's checks decide something is off. That
  //    one callback is swapped for one that does nothing. Found by its source
  //    text, because it has no other name the page exposes.
  //
  // 2. THE SEVENTEEN-SECOND HOLD. The player schedules a 17-second timer with
  //    a bound (native-looking) callback, and uBlock cuts exactly that timer to
  //    17 ms. It is very likely the "~17 SECONDS" of waiting that Route 3's
  //    notes measured and blamed on dropped segments. Only that exact delay
  //    with that kind of callback is touched; every other timer on the page
  //    runs as written.
  //
  // 3. GOING ROUND THE HOOKS. A freshly made frame has its own fetch and its
  //    own JSON, untouched by anything here, and borrowing them is the
  //    standard way round an extension's hooks. Every same-origin frame
  //    appended to the page is handed ours instead. Separately, the one inline
  //    script that reaches for window "fetch" by name is emptied before it runs.
  //    What exactly it does with fetch is not known here; uBlock removes it,
  //    and keeping it is not worth what it would cost to find out.
  //
  // 1 is installed wherever THE RETRY's signals are: everywhere except the
  // embedded player and the TV app. 2 and 3 apply on every YouTube page, as
  // uBlock applies them.
  // ---------------------------------------------------------------------------
  if (inYouTubeApp) {
    try {
      Promise.prototype.then = cloak(Promise.prototype.then, (t, self, args) => {
        const cb = args[0];
        if (typeof cb === "function" && sourceOf(cb).indexOf("onAbnormalityDetected") !== -1) {
          args[0] = function () {};
          stats.abnormalityMuted++;
        }
        return Reflect.apply(t, self, args);
      });
    } catch (err) {
      console.debug("[Sieve] YouTube ad filter: could not disarm the abnormality callback", err);
    }
  }

  const HOLD_TIMER_MS = 17000;
  try {
    const nativeSetTimeout = window.setTimeout;
    if (typeof nativeSetTimeout === "function") {
      window.setTimeout = cloak(nativeSetTimeout, (t, self, args) => {
        if (args[1] === HOLD_TIMER_MS && typeof args[0] === "function" && sourceOf(args[0]).indexOf("[native code]") !== -1) {
          args[1] = 17;
          stats.timersBoosted++;
        }
        return Reflect.apply(t, self, args);
      });
    }
  } catch (err) {
    console.debug("[Sieve] YouTube ad filter: could not shorten the hold timer", err);
  }

  // Hand a same-origin frame our fetch, Request and JSON. Read at the moment
  // the frame is added, so it gets the hooked versions installed below.
  function lendHooks(el) {
    let w;
    try {
      w = el.contentWindow;
    } catch {
      return;
    }
    if (!w || w === window) return;
    try {
      const href = w.location.href;
      if (href !== "about:blank" && href !== location.href) return;
      w.fetch = window.fetch;
      w.Request = window.Request;
      w.JSON.parse = JSON.parse;
      w.JSON.stringify = JSON.stringify;
      stats.framesGuarded++;
    } catch {
      /* another origin's frame: not ours to touch, and no way round us */
    }
  }
  try {
    if (typeof Node === "function" && Node.prototype && typeof Node.prototype.appendChild === "function") {
      Node.prototype.appendChild = cloak(Node.prototype.appendChild, (t, self, args) => {
        const out = Reflect.apply(t, self, args);
        try {
          const el = args[0];
          if (el && el.nodeType === 1 && "contentWindow" in el) lendHooks(el);
        } catch {
          /* the frame keeps its own copies */
        }
        return out;
      });
    }
  } catch (err) {
    console.debug("[Sieve] YouTube ad filter: could not guard new frames", err);
  }

  // The inline script, emptied as the parser hands it over. A parser-inserted
  // script runs only after a microtask checkpoint, which is when this observer
  // is told about it. Its text can arrive after the element itself, so a text
  // node landing inside a script is checked too. Only the initial HTML
  // matters: a script added later by another script has already run by the
  // time any observer hears of it. So this stops listening once the document
  // is parsed.
  const FETCH_GRAB = 'window,"fetch"';
  function emptyIfGrab(script) {
    try {
      if (!script || script.nodeName !== "SCRIPT" || script.hasAttribute("src")) return;
      const text = script.textContent;
      if (text && text.indexOf(FETCH_GRAB) !== -1) {
        script.textContent = "";
        stats.inlineNeutered++;
      }
    } catch {
      /* the script runs as written */
    }
  }
  try {
    if (typeof MutationObserver === "function" && document && typeof document.addEventListener === "function") {
      const scripts = new MutationObserver((records) => {
        for (const r of records) {
          for (const n of r.addedNodes) {
            if (n.nodeType === 1) {
              if (n.nodeName === "SCRIPT") emptyIfGrab(n);
            } else if (n.nodeType === 3 && n.parentNode && n.parentNode.nodeName === "SCRIPT") {
              emptyIfGrab(n.parentNode);
            }
          }
        }
      });
      scripts.observe(document, { childList: true, subtree: true });
      document.addEventListener("DOMContentLoaded", () => scripts.disconnect(), { once: true });
    }
  } catch (err) {
    console.debug("[Sieve] YouTube ad filter: could not watch the inline scripts", err);
  }

  // Polled rather than event-driven: an ad's timeupdate events are exactly what
  // we are trying to cut short, so waiting for them is waiting for the ad. 250 ms
  // is under a fifth of the shortest ad observed and costs nothing measurable.
  let ticks = 0;
  function watchPlayer() {
    try {
      // A hidden tab is not showing anyone an ad, and a backgrounded YouTube tab
      // left open for hours was once enough to keep this timer — and the
      // renderer — out of deep idle for the whole time.
      if (document.hidden) return;
      // An ad already muted is seen through to its end and restored, even if the
      // cool-down ran out in the middle of it.
      if (fastForwarding() || ffSaved) fastForwardTick();
      else skipAdIfPlaying();
      // Once a second is plenty for a screen that, once up, stays up.
      if (++ticks % 4 === 0) checkPlayerForBlock();
    } catch (err) {
      console.debug("[Sieve] YouTube ad filter: player watch failed", err);
    }
    // Separately guarded: a failure above must not cost a held video its retry,
    // nor a failure here the ad handling.
    try {
      if (!document.hidden) retryTick();
    } catch (err) {
      console.debug("[Sieve] YouTube ad filter: retry check failed", err);
    }
  }

  try {
    setInterval(watchPlayer, 250);
  } catch (err) {
    console.debug("[Sieve] YouTube ad filter: could not start the player watcher", err);
  }

  const nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = cloak(nativeFetch, (t, self, args) => {
      const res = Reflect.apply(t, self, args);
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
              route = "fetch " + pathOf(reqUrl);
              if (!clean(data)) return response;
              stats.fetchCleaned++;
              return new Response(nativeStringify(data), {
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
    });
  }

  // XHR too: some player builds still request the endpoint this way, and one
  // uncovered route is all it takes for ads to come back on a navigation.
  const NativeXHR = window.XMLHttpRequest;
  if (typeof NativeXHR === "function") {
    const open = NativeXHR.prototype.open;
    const send = NativeXHR.prototype.send;

    // Which requests are the player's, by instance. A WeakMap rather than a
    // property on the request itself, which the page could see.
    const playerPaths = new WeakMap();

    NativeXHR.prototype.open = cloak(open, (t, xhr, args) => {
      try {
        const url = args[1];
        if (PLAYER_ENDPOINT.test(String(url || ""))) playerPaths.set(xhr, pathOf(url));
        else playerPaths.delete(xhr);
      } catch {
        /* not one of ours */
      }
      return Reflect.apply(t, xhr, args);
    });

    NativeXHR.prototype.send = cloak(send, (t, xhr, args) => {
      if (xhr && playerPaths.has(xhr)) {
        stats.xhrSeen++;
        xhr.addEventListener("readystatechange", function () {
          if (this.readyState !== 4) return;
          try {
            if (this.responseType && this.responseType !== "text" && this.responseType !== "json") {
              stats.xhrSkippedType++;
              return;
            }
            const raw = this.responseType === "json" ? this.response : this.responseText;
            const data = typeof raw === "string" ? nativeParse(raw) : raw;
            route = "xhr " + playerPaths.get(this);
            if (!clean(data)) return;
            stats.xhrCleaned++;
            const cleaned = this.responseType === "json" ? data : nativeStringify(data);
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
      return Reflect.apply(t, xhr, args);
    });
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
  // The enforcement message is on this list although it is not an ad: the
  // "ad blockers are not allowed" popup can arrive in a payload with no ads in
  // it, and without this a popup delivered by a route only this hook sees would
  // be neither removed nor recorded.
  const AD_MARKERS = ['"adPlacements"', '"adSlots"', '"playerAds"', '"adSlotRenderer"', '"mealbarPromoRenderer"', '"isAd"', '"enforcementMessageViewModel"'];
  try {
    JSON.parse = cloak(nativeParse, (t, self, args) => {
      const out = Reflect.apply(t, self, args);
      const text = args[0];
      try {
        if (typeof text === "string" && text.length > 200) {
          for (let i = 0; i < AD_MARKERS.length; i++) {
            if (text.indexOf(AD_MARKERS[i]) !== -1) {
              route = "JSON.parse";
              if (clean(out)) stats.jsonParsed++;
              break;
            }
          }
        }
      } catch {
        /* the parse itself already succeeded; never let cleanup undo that */
      }
      return out;
    });
  } catch (err) {
    console.debug("[Sieve] YouTube ad filter: could not hook JSON.parse", err);
  }

  // A marker the background module and the options page can look for to confirm
  // the scriptlet actually reached the page.
  try {
    Object.defineProperty(window, "__sieveYouTubeAdFilter", {
      value: {
        version: 9,
        keys: AD_KEYS.slice(),
        enforcement: true,
        displayAds: true,
        sabrSkip: true,
        counts: true,
        fastForwardFallback: true,
        retry: VARIANTS.slice(),
        counterMeasures: true,
        stats,
      },
      configurable: true,
    });
  } catch {
    /* non-fatal */
  }
})();

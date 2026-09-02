// test/youtube-ads-test.mjs
// Sieve — tests for the YouTube video-ad scriptlet in content/youtube-ads.js.
//
//   node --test test/
//
// This script patches a first-party global on a site nobody at Sieve controls,
// which makes it the most dangerous file in the extension: too little and ads come
// back, too much and the video stops playing. Both failures look identical from
// the settings page.
//
// The tests run the REAL file in a vm sandbox with a fake window, rather than
// re-implementing its logic — a test that reimplemented the stripping could pass
// while the shipped scriptlet did something else entirely.
//
// The playback assertions matter as much as the ad ones. Every "must survive"
// check below corresponds to something a user would notice within seconds:
// streamingData is the video, videoDetails is the title, captions are subtitles,
// playerConfig drives the player itself.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/youtube-ads.js", import.meta.url), "utf8");

// A player response shaped like the real thing: ads plus everything playback needs.
function playerResponse() {
  return {
    adPlacements: [{ adPlacementRenderer: {} }],
    adSlots: [{ adSlotRenderer: {} }],
    playerAds: [{ playerLegacyDesktopWatchAdsRenderer: {} }],
    adBreakHeartbeatParams: "Q0FN",
    playerConfig: {
      adConfig: { showCompanion: true },
      audioConfig: { loudnessDb: 1.5 },
      daiConfig: { sendSsdaiMissingAdBreakReasons: true, enableServerStitchedDai: true },
    },
    streamingData: { adaptiveFormats: [{ itag: 137, url: "https://rr1.googlevideo.com/videoplayback" }] },
    videoDetails: { videoId: "dQw4w9WgXcQ", title: "Never Gonna Give You Up" },
    captions: { playerCaptionsTracklistRenderer: {} },
    playabilityStatus: { status: "OK" },
    storyboards: { playerStoryboardSpecRenderer: {} },
  };
}

// Build a window the scriptlet can attach to, run the real file against it, and
// hand back the sandbox so a test can drive it.
function runScriptlet({ fetchImpl, xhrClass, preset, extras } = {}) {
  const listeners = [];
  const sandbox = {
    console: { debug() {}, log() {}, error() {} },
    // Its OWN JSON facade, not the host's. Route 4 replaces JSON.parse, and a
    // shared object would stack a wrapper per sandbox — every instance writing
    // its count into whichever stats object was installed last, and Node's own
    // JSON left patched after the run.
    JSON: { parse: JSON.parse.bind(JSON), stringify: JSON.stringify.bind(JSON) },
    Object,
    Promise,
    RegExp,
    String,
    // A stub rather than Node's real Response: the real one exposes `body` as a
    // stream, and what these tests need to read is the JSON the scriptlet wrote.
    Response: class {
      constructor(body, init) {
        this.body = body;
        Object.assign(this, init);
      }
    },
    Request: class {},
    fetch: fetchImpl,
    XMLHttpRequest: xhrClass,
    __listeners: listeners,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  // `preset` puts a value on the window BEFORE the scriptlet runs, which is what
  // losing the document_start race looks like from inside the page.
  if (preset) Object.assign(sandbox, preset);
  // Route 3 needs a document, a location and a setInterval to drive its watcher.
  if (extras) Object.assign(sandbox, extras);
  if (!sandbox.setInterval) sandbox.setInterval = () => 0;
  if (!sandbox.document) sandbox.document = { querySelector: () => null };
  if (!sandbox.location) sandbox.location = { search: "" };
  if (!sandbox.URLSearchParams) sandbox.URLSearchParams = URLSearchParams;
  if (!sandbox.Uint8Array) sandbox.Uint8Array = Uint8Array;
  if (!sandbox.Math) sandbox.Math = Math;
  if (!sandbox.isFinite) sandbox.isFinite = isFinite;
  if (!sandbox.Number) sandbox.Number = Number;
  // The count of removed ads leaves the page over window.postMessage, batched
  // behind a timer. Both are captured rather than real: a recorded timer lets a
  // test flush the batch on demand instead of sleeping, and a recorded
  // postMessage is the only way to see what the isolated bridge would receive.
  sandbox.__posted = [];
  sandbox.__timers = [];
  if (!sandbox.postMessage) sandbox.postMessage = (data) => sandbox.__posted.push(data);
  if (!sandbox.addEventListener) {
    sandbox.addEventListener = (type, fn) => listeners.push({ type, fn });
  }
  if (!sandbox.setTimeout) {
    sandbox.setTimeout = (fn) => sandbox.__timers.push(fn);
  }
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox;
}

// --- the inline assignment (first page load) --------------------------------

test("the ad keys are stripped from an inline player response", () => {
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse();
  const got = w.ytInitialPlayerResponse;
  for (const k of ["adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams"]) {
    assert.equal(k in got, false, `${k} should have been removed`);
  }
});

test("everything playback needs survives untouched", () => {
  const w = runScriptlet();
  const original = playerResponse();
  w.ytInitialPlayerResponse = original;
  const got = w.ytInitialPlayerResponse;

  assert.equal(got.streamingData.adaptiveFormats.length, 1, "the video stream must be untouched");
  assert.equal(got.streamingData.adaptiveFormats[0].itag, 137);
  assert.match(got.streamingData.adaptiveFormats[0].url, /googlevideo\.com/);
  assert.equal(got.videoDetails.title, "Never Gonna Give You Up");
  assert.equal(got.videoDetails.videoId, "dQw4w9WgXcQ");
  assert.ok(got.captions, "subtitles must survive");
  assert.ok(got.storyboards, "thumbnail previews must survive");
  assert.equal(got.playabilityStatus.status, "OK");
  assert.equal(got.playerConfig.audioConfig.loudnessDb, 1.5, "playerConfig drives the player");
});

test("only the ad flag is cleared from playerConfig, not playerConfig itself", () => {
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse();
  const got = w.ytInitialPlayerResponse;
  assert.ok(got.playerConfig, "playerConfig must still exist");
  // Object.keys rather than deepEqual({}): the object comes from the vm realm.
  assert.equal(Object.keys(got.playerConfig.adConfig).length, 0, "the ad flag is emptied");
  assert.ok(got.playerConfig.audioConfig, "the rest of playerConfig is untouched");
});

test("the global reads back exactly what the page assigned", () => {
  const w = runScriptlet();
  const obj = playerResponse();
  w.ytInitialPlayerResponse = obj;
  assert.equal(w.ytInitialPlayerResponse, obj, "the page must get its own object back");
});

test("an object that is not a player response is left completely alone", () => {
  const w = runScriptlet();
  const unrelated = { adPlacements: ["keep me"], somethingElse: 1 };
  w.ytInitialPlayerResponse = unrelated;
  assert.deepEqual(Array.from(w.ytInitialPlayerResponse.adPlacements), ["keep me"]);
  assert.equal(w.ytInitialPlayerResponse.somethingElse, 1);
});

test("null and undefined assignments do not throw", () => {
  const w = runScriptlet();
  assert.doesNotThrow(() => {
    w.ytInitialPlayerResponse = null;
    w.ytInitialPlayerResponse = undefined;
  });
});

// --- not announcing that the ads are missing --------------------------------

test("the missing-ad-break report is switched off", () => {
  // This flag is what turns "the ads stopped" into "an ad blocker was detected",
  // and then into the enforcement message and ads coming back by another route.
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse();
  const dai = w.ytInitialPlayerResponse.playerConfig.daiConfig;
  assert.equal(dai.sendSsdaiMissingAdBreakReasons, false);
  assert.equal(dai.enableServerStitchedDai, false);
});

test("daiConfig itself survives — only its flags are flipped", () => {
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse();
  assert.ok(w.ytInitialPlayerResponse.playerConfig.daiConfig, "the config object must remain");
});

// --- the enforcement message ------------------------------------------------

test("the enforcement message is removed wherever it is nested", () => {
  const w = runScriptlet();
  const data = {
    contents: { twoColumnBrowseResultsRenderer: { tabs: [{ tabRenderer: { content: {
      sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: [
        { enforcementMessageViewModel: { displayType: "MODAL", title: "Ad blockers are not allowed" } },
        { videoRenderer: { videoId: "keep-me" } },
      ] } }] },
    } } }] } },
  };
  w.ytInitialData = data;
  const json = JSON.stringify(w.ytInitialData);
  assert.equal(json.includes("enforcementMessageViewModel"), false, "the modal must be gone");
  assert.equal(json.includes("keep-me"), true, "the actual page content must survive");
});

test("an enforcement renderer inside the player response is removed too", () => {
  const w = runScriptlet();
  const pr = playerResponse();
  pr.adBlockRenderer = { enforcementMessageViewModel: { title: "x" } };
  w.ytInitialPlayerResponse = pr;
  assert.equal(JSON.stringify(w.ytInitialPlayerResponse).includes("enforcementMessageViewModel"), false);
});

test("a legitimate unavailable-video state is NOT touched", () => {
  // playabilityStatus and errorScreen carry "video unavailable", "private video"
  // and age gates. Clearing those would claim a video is playable when it is not.
  const w = runScriptlet();
  const pr = playerResponse();
  pr.playabilityStatus = {
    status: "LOGIN_REQUIRED",
    reason: "Sign in to confirm your age",
    errorScreen: { playerErrorMessageRenderer: { reason: { simpleText: "Sign in" } } },
  };
  w.ytInitialPlayerResponse = pr;
  const got = w.ytInitialPlayerResponse;
  assert.equal(got.playabilityStatus.status, "LOGIN_REQUIRED");
  assert.equal(got.playabilityStatus.reason, "Sign in to confirm your age");
  assert.ok(got.playabilityStatus.errorScreen, "the real error screen must survive");
});

test("ytInitialData without an enforcement message is left alone", () => {
  const w = runScriptlet();
  const data = { contents: { a: [{ videoRenderer: { videoId: "abc" } }] } };
  w.ytInitialData = data;
  assert.equal(w.ytInitialData.contents.a[0].videoRenderer.videoId, "abc");
});

test("the enforcement walk terminates on deep and cyclic structures", () => {
  const w = runScriptlet();
  const deep = { level: 0 };
  let node = deep;
  for (let i = 1; i < 40; i++) { node.child = { level: i }; node = node.child; }
  const cyclic = { name: "root" };
  cyclic.self = cyclic;
  assert.doesNotThrow(() => {
    w.ytInitialData = deep;
    w.ytInitialData = cyclic;
  });
});

// --- the SPA fetch (every later video) --------------------------------------

test("the /youtubei/v1/player fetch response is rewritten without ads", async () => {
  let served;
  const w = runScriptlet({
    fetchImpl: async () => {
      served = playerResponse();
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {},
        clone() {
          return { json: async () => served };
        },
      };
    },
  });
  const res = await w.fetch("https://www.youtube.com/youtubei/v1/player?key=x");
  const body = JSON.parse(res.body);
  assert.equal("adPlacements" in body, false);
  assert.equal("adSlots" in body, false);
  assert.equal(body.videoDetails.videoId, "dQw4w9WgXcQ", "the video must still be described");
  assert.ok(body.streamingData.adaptiveFormats.length, "the stream must still be there");
});

test("an intercepted endpoint whose response cannot be read is handed back as-is", async () => {
  // /browse IS intercepted, so this is not the pass-through case its name once
  // claimed — it is the fail-open one. A response with no clone() throws inside
  // the wrapper, and the user must still get their page.
  const sentinel = { ok: true, marker: "original" };
  const w = runScriptlet({ fetchImpl: async () => sentinel });
  const res = await w.fetch("https://www.youtube.com/youtubei/v1/browse");
  assert.equal(res, sentinel, "an unreadable response must come back as the very same object");
});

test("a failed clean returns the original response rather than breaking the video", async () => {
  const broken = {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: {},
    clone() {
      return {
        json: async () => {
          throw new Error("not json");
        },
      };
    },
  };
  const w = runScriptlet({ fetchImpl: async () => broken });
  const res = await w.fetch("https://www.youtube.com/youtubei/v1/player");
  assert.equal(res, broken, "it must fail OPEN — ads return, playback does not break");
});

test("a non-ok response is passed straight through", async () => {
  const failed = { ok: false, status: 500 };
  const w = runScriptlet({ fetchImpl: async () => failed });
  assert.equal(await w.fetch("https://www.youtube.com/youtubei/v1/player"), failed);
});

test("a Request object is matched, not just a string url", async () => {
  let served;
  const w = runScriptlet({
    fetchImpl: async () => {
      served = playerResponse();
      return {
        ok: true, status: 200, statusText: "OK", headers: {},
        clone: () => ({ json: async () => served }),
      };
    },
  });
  const res = await w.fetch({ url: "https://www.youtube.com/youtubei/v1/player?x=1" });
  assert.equal("adPlacements" in JSON.parse(res.body), false);
});

// --- the marker -------------------------------------------------------------

test("the scriptlet leaves a marker so its presence can be confirmed in a tab", () => {
  const w = runScriptlet();
  assert.ok(w.__sieveYouTubeAdFilter, "expected window.__sieveYouTubeAdFilter");
  // Array.from: the scriptlet's array is built inside the vm realm, so a strict
  // deep-equal against a host-realm array fails on the prototype alone.
  assert.equal(w.__sieveYouTubeAdFilter.enforcement, true);
  assert.deepEqual(Array.from(w.__sieveYouTubeAdFilter.keys), [
    "adPlacements",
    "adSlots",
    "playerAds",
    "adBreakHeartbeatParams",
  ]);
});

test("the scriptlet loads without a fetch or XHR implementation present", () => {
  // Some frames have neither. It must degrade rather than throw on injection.
  assert.doesNotThrow(() => runScriptlet({ fetchImpl: undefined, xhrClass: undefined }));
});

// --- display ads: the feed, search, the sidebar, Shorts ----------------------
//
// These are the surface the scriptlet used to miss entirely. They are not in the
// player response at all — they arrive as ordinary items in the same list as the
// real videos, so the player-response strip never saw them and every one of them
// rendered. The assertions come in pairs on purpose: for each ad removed, the
// real content beside it is checked to still be there.

// One home-feed /browse response: two real videos with a sponsored tile between.
function feedResponse() {
  return {
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [{ tabRenderer: { content: { richGridRenderer: { contents: [
          { richItemRenderer: { content: { videoRenderer: { videoId: "aaa", title: "Real video 1" } } } },
          { richItemRenderer: { content: { adSlotRenderer: { adSlotMetadata: { slotId: "ad1" } } } } },
          { richItemRenderer: { content: { videoRenderer: { videoId: "bbb", title: "Real video 2" } } } },
        ] } } } }],
      },
    },
  };
}

const feedItems = (o) =>
  o.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents;

test("a sponsored tile is dropped from the feed and the real videos stay", () => {
  const w = runScriptlet();
  const data = feedResponse();
  w.ytInitialData = data;
  const items = feedItems(w.ytInitialData);
  assert.equal(items.length, 2, "the ad item must be removed from the list, not blanked");
  assert.deepEqual(
    items.map((i) => i.richItemRenderer.content.videoRenderer.videoId),
    ["aaa", "bbb"],
    "both real videos must survive, in order"
  );
});

test("a section holding videos AND one ad keeps the videos", () => {
  // The dangerous case. A shelf is not an ad just because it contains one, and a
  // rule that dropped the whole section would empty the results page.
  const w = runScriptlet();
  w.ytInitialData = {
    contents: { itemSectionRenderer: { contents: [
      { videoRenderer: { videoId: "keep1" } },
      { adSlotRenderer: { adSlotMetadata: {} } },
      { searchPyvRenderer: { ads: [{}] } },
      { videoRenderer: { videoId: "keep2" } },
    ] } },
  };
  const out = w.ytInitialData.contents.itemSectionRenderer.contents;
  assert.equal(out.length, 2, "only the two ads should have gone");
  assert.deepEqual(out.map((i) => i.videoRenderer.videoId), ["keep1", "keep2"]);
});

test("keys that merely contain the letters 'ad' are never touched", () => {
  // adaptiveFormats IS the video. Deleting it, or anything else caught by a
  // careless /ad/i on the key name, is a black player.
  const w = runScriptlet();
  const r = playerResponse();
  r.playerConfig.webPlayerConfig = { webPlayerActionsPorting: { addToWatchLaterCommand: { x: 1 } } };
  r.frameworkUpdates = { entityBatchUpdate: { mutations: [{ payload: { offlineabilityEntity: { addToOfflineButtonState: "ENABLED" } } }] } };
  r.overlay = { thumbnailBadgeViewModel: { text: "4:12" } };
  w.ytInitialPlayerResponse = r;
  const out = w.ytInitialPlayerResponse;
  assert.equal(out.streamingData.adaptiveFormats.length, 1, "adaptiveFormats is the video itself");
  assert.ok(out.playerConfig.webPlayerConfig.webPlayerActionsPorting.addToWatchLaterCommand);
  assert.equal(out.frameworkUpdates.entityBatchUpdate.mutations[0].payload.offlineabilityEntity.addToOfflineButtonState, "ENABLED");
  assert.ok(out.overlay.thumbnailBadgeViewModel, "a duration badge is not an ad");
});

test("an enforcement message nested deeper than the old depth cap is still removed", () => {
  // The walk used to stop at depth 12. Measured on a live watch page,
  // ytInitialData nests to 38 — so anything below 12 was never looked at.
  const w = runScriptlet();
  const root = {};
  let node = root;
  for (let i = 0; i < 25; i++) { node.child = {}; node = node.child; }
  node.enforcementMessageViewModel = { displayType: "AD_BLOCKER" };
  node.keepMe = "yes";
  w.ytInitialData = root;
  let probe = w.ytInitialData;
  for (let i = 0; i < 25; i++) probe = probe.child;
  assert.equal("enforcementMessageViewModel" in probe, false, "it must be reached at depth 25");
  assert.equal(probe.keepMe, "yes", "its siblings must survive");
});

test("a player response nested inside another response is still stripped", () => {
  // The Shorts endpoints wrap one, so the strip cannot only run on the root.
  const w = runScriptlet();
  w.ytInitialData = { reelWatchSequence: { entries: [{ playerResponse: playerResponse() }] } };
  const inner = w.ytInitialData.reelWatchSequence.entries[0].playerResponse;
  assert.equal("adPlacements" in inner, false);
  assert.equal("adBreakHeartbeatParams" in inner, false);
  assert.ok(inner.streamingData, "the Short itself must still play");
});

// --- the endpoints the SPA actually calls ------------------------------------

function feedServer() {
  let served;
  const w = runScriptlet({
    fetchImpl: async () => {
      served = feedResponse();
      return { ok: true, status: 200, statusText: "OK", headers: {}, clone: () => ({ json: async () => served }) };
    },
  });
  return w;
}

// Verified against the live API in September 2026: the flat
// /youtubei/v1/reel_watch_sequence the pattern used to name returns 404, and both
// real Shorts endpoints sit under reel/. Naming a path that does not exist is why
// Shorts ads went through untouched.
for (const path of [
  "/youtubei/v1/browse?prettyPrint=false",
  "/youtubei/v1/search?prettyPrint=false",
  "/youtubei/v1/next?prettyPrint=false",
  "/youtubei/v1/reel/reel_item_watch?prettyPrint=false",
  "/youtubei/v1/reel/reel_watch_sequence?prettyPrint=false",
]) {
  test(`display ads are removed from ${path.split("?")[0]}`, async () => {
    const w = feedServer();
    const res = await w.fetch("https://www.youtube.com" + path);
    const items = feedItems(JSON.parse(res.body));
    assert.equal(items.length, 2, `${path} must be intercepted and its ad removed`);
  });
}

test("a request to an unrelated host is returned as the very same object", async () => {
  const sentinel = { ok: true, marker: "original" };
  const w = runScriptlet({ fetchImpl: async () => sentinel });
  const res = await w.fetch("https://example.com/api/thing");
  assert.equal(res, sentinel);
});

// --- YouTube advertising YouTube -------------------------------------------
//
// The promo bar ("Get YouTube Premium", "try YouTube Music") is neither a video
// ad nor a feed ad. It rides in the player response under `messages`, so both
// earlier removals walked straight past it and it was the one ad still appearing
// on every video after the ad breaks were gone.

test("the Premium / Music promo bar is removed from the player response", () => {
  const w = runScriptlet();
  const r = playerResponse();
  r.messages = [{ mealbarPromoRenderer: { messageTexts: [{ runs: [{ text: "Get YouTube Premium" }] }] } }];
  w.ytInitialPlayerResponse = r;
  assert.deepEqual(w.ytInitialPlayerResponse.messages, [], "the promo must be dropped from messages");
  assert.ok(w.ytInitialPlayerResponse.streamingData, "and the video must be untouched");
});

test("a message that is not a promo survives", () => {
  // `messages` is not an ads-only channel — emptying it wholesale would throw
  // away notices the user is meant to read.
  const w = runScriptlet();
  const r = playerResponse();
  r.messages = [
    { mealbarPromoRenderer: { messageTexts: [] } },
    { notificationTextRenderer: { text: "This video is age-restricted" } },
  ];
  w.ytInitialPlayerResponse = r;
  const left = w.ytInitialPlayerResponse.messages;
  assert.equal(left.length, 1);
  assert.ok(left[0].notificationTextRenderer, "only the promo should have gone");
});

test("an empty-state panel is NOT mistaken for a promo", () => {
  // backgroundPromoRenderer is the "No results found" panel. It matches /promo/i
  // and is the reason the renderer list is a list and not a pattern: deleting it
  // leaves a blank page where an explanation should be.
  const w = runScriptlet();
  w.ytInitialData = {
    contents: { sectionListRenderer: { contents: [
      { backgroundPromoRenderer: { title: { runs: [{ text: "No results found" }] } } },
    ] } },
  };
  const out = w.ytInitialData.contents.sectionListRenderer.contents;
  assert.equal(out.length, 1, "the empty-state panel must survive");
  assert.ok(out[0].backgroundPromoRenderer);
});

// --- losing the document_start race -----------------------------------------

test("a player response already assigned before the hook is kept, not discarded", () => {
  // The failure this guards against is destructive, not just a missed ad.
  // defineProperty replaces the page's data property with our accessor; if the
  // accessor starts with no backing value, an assignment that already happened
  // is gone and the page reads back undefined instead of its own player data.
  const before = playerResponse();
  const w = runScriptlet({ preset: { ytInitialPlayerResponse: before } });
  const out = w.ytInitialPlayerResponse;
  assert.ok(out, "the value must survive being hooked late");
  assert.equal(out.videoDetails.videoId, "dQw4w9WgXcQ");
  assert.ok(out.streamingData, "playback data must still be there");
  assert.equal("adPlacements" in out, false, "and it gets cleaned in place — our only chance at it");
  assert.equal(w.__sieveYouTubeAdFilter.stats.lateHook, 1, "the tally must record that we were late");
});

test("the tally records what was seen and removed", () => {
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse();
  const s = w.__sieveYouTubeAdFilter.stats;
  assert.equal(s.lateHook, 0, "nothing was assigned before the hook here");
  assert.equal(s.inlineSeen, 1);
  assert.equal(s.inlineCleaned, 1);
  assert.equal(s.removed.adPlacements, 1);
  assert.equal(s.removed.adSlots, 1);
});

// --- Route 3: server-side (SABR) ads ----------------------------------------
//
// These ads are not in any JSON, so they cannot be deleted. They are recognised
// by reading the media stream — UMP part type 20 (MEDIA_HEADER) carries the
// video id its payload belongs to — and then seeked past.
//
// Live ad serving is not reproducible on demand, so the whole path is driven
// here from a crafted stream: parse -> extract id -> two-signal guard -> seek.
// The guard assertions matter more than the skip one. A false positive means
// seeking the user's actual video to its end, which is far worse than an ad.

// A minimal UMP body: one MEDIA_HEADER whose protobuf field 2 is `videoId`.
function umpWithMediaHeader(videoId) {
  const id = [...videoId].map((c) => c.charCodeAt(0));
  const header = [0x12, id.length, ...id]; // field 2, wire type 2 (length-delimited)
  return new Uint8Array([20, header.length, ...header]); // part type 20, size, payload
}

// Drive the scriptlet with a fake video element and a fake SABR response.
async function sabrHarness({ streamId, watchId, videoDuration, realLength, knownFor }) {
  let seekedTo = null;
  const video = {
    duration: videoDuration,
    currentTime: 0,
    readyState: 4,
    set _(_v) {},
  };
  Object.defineProperty(video, "currentTime", {
    get() { return this._t || 0; },
    set(v) { this._t = v; seekedTo = v; },
  });

  const timers = [];
  const w = runScriptlet({
    fetchImpl: async () => ({
      ok: true, status: 200, statusText: "OK", headers: {},
      clone: () => ({ arrayBuffer: async () => umpWithMediaHeader(streamId).buffer }),
      json: async () => ({}),
    }),
    extras: {
      document: {
        querySelector: (sel) => (sel === "video" ? video : null),
      },
      location: { search: `?v=${watchId}` },
      URLSearchParams: URLSearchParams,
      setInterval: (fn) => { timers.push(fn); return timers.length; },
    },
  });

  // Teach it the real length the way a player response would.
  const pr = playerResponse();
  pr.videoDetails = { videoId: knownFor || watchId, lengthSeconds: String(realLength) };
  w.ytInitialPlayerResponse = pr;

  // One SABR response, then one tick of the watcher.
  await w.fetch(`https://rr1.googlevideo.com/videoplayback?sabr=1&foo=1`);
  await new Promise((r) => setTimeout(r, 5));
  timers.forEach((fn) => fn());
  return { seekedTo, stats: w.__sieveYouTubeAdFilter.stats, video };
}

test("a server-side ad is recognised from the stream and seeked to its end", async () => {
  const r = await sabrHarness({
    streamId: "ADVERTISER1", watchId: "dQw4w9WgXcQ", videoDuration: 15.12, realLength: 213,
  });
  assert.ok(r.seekedTo !== null, "the ad should have been seeked");
  assert.ok(Math.abs(r.seekedTo - 15.07) < 0.01, `expected a seek to just before 15.12, got ${r.seekedTo}`);
  assert.equal(r.stats.sabrAdsSkipped, 1);
  assert.equal(r.stats.sabrResponses, 1, "the stream must be READ");
});

test("the real video is never seeked, even though its id is the one streaming", async () => {
  // The obvious false positive: normal playback. Signal 1 does not fire.
  const r = await sabrHarness({
    streamId: "dQw4w9WgXcQ", watchId: "dQw4w9WgXcQ", videoDuration: 213.1, realLength: 213,
  });
  assert.equal(r.seekedTo, null, "normal playback must never be touched");
  assert.equal(r.stats.sabrAdsSkipped, 0);
});

test("a mismatched id alone is NOT enough — the duration must disagree too", async () => {
  // This is the guard that stops a prefetch of another video from making us
  // seek the one actually playing. An early prototype without it skipped a real
  // 213-second video to its end.
  const r = await sabrHarness({
    streamId: "SOMEOTHERID", watchId: "dQw4w9WgXcQ", videoDuration: 213.1, realLength: 213,
  });
  assert.equal(r.seekedTo, null, "duration says we are on the real video, so decline");
  assert.equal(r.stats.sabrAdsSkipped, 0);
});

test("with no known real duration it declines rather than guesses", async () => {
  // The player response we saw was for a DIFFERENT video, so nothing vouches for
  // the length of the one in the address bar. Signal 2 cannot speak, so we do
  // not act on signal 1 alone.
  const r = await sabrHarness({
    streamId: "ADVERTISER1", watchId: "UNKNOWNVID1", videoDuration: 15.12,
    realLength: 213, knownFor: "SOMEOTHERVID",
  });
  assert.equal(r.seekedTo, null, "no second opinion available — fail open");
  assert.equal(r.stats.sabrAdsSkipped, 0);
});

test("the SABR response object is handed back untouched", async () => {
  // The safety property the whole design rests on: we read the media stream and
  // never rewrite it, so a parser bug cannot cost anyone their video.
  let served;
  const w = runScriptlet({
    fetchImpl: async () => (served = {
      ok: true, status: 200, statusText: "OK", headers: {},
      clone: () => ({ arrayBuffer: async () => umpWithMediaHeader("ADVERTISER1").buffer }),
    }),
  });
  const got = await w.fetch("https://rr1.googlevideo.com/videoplayback?sabr=1");
  assert.equal(got, served, "must be the very same Response object, not a rebuilt one");
});

test("an unparsable media stream changes nothing", async () => {
  let served;
  const w = runScriptlet({
    fetchImpl: async () => (served = {
      ok: true, status: 200, statusText: "OK", headers: {},
      clone: () => ({ arrayBuffer: async () => new Uint8Array([255, 255, 255]).buffer }),
    }),
  });
  const got = await w.fetch("https://rr1.googlevideo.com/videoplayback?sabr=1");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(got, served);
  assert.equal(w.__sieveYouTubeAdFilter.stats.sabrAdsSkipped, 0);
});

// --- gaps found by reading uBlock Origin's own YouTube filters ---------------
//
// uAssets carries rules we had no equivalent for. Two were real holes; both are
// pinned here so they cannot silently reopen.

test("a Shorts ad flagged rather than named is dropped from the sequence", () => {
  // uBlock: json-prune entries.[-].command.reelWatchEndpoint.adClientParams.isAd
  // A Shorts ad carries no ad renderer name at all — it is an ordinary reel entry
  // with a flag on it, so the renderer list could never have caught it. We drop
  // the whole entry rather than just the flag, so it never plays as content.
  const w = runScriptlet();
  w.ytInitialData = {
    reelWatchSequenceResponse: {
      entries: [
        { command: { reelWatchEndpoint: { videoId: "real1" } } },
        { command: { reelWatchEndpoint: { videoId: "advert", adClientParams: { isAd: true } } } },
        { command: { reelWatchEndpoint: { videoId: "real2" } } },
      ],
    },
  };
  const left = w.ytInitialData.reelWatchSequenceResponse.entries;
  assert.equal(left.length, 2, "the flagged ad entry must be gone");
  assert.deepEqual(left.map((e) => e.command.reelWatchEndpoint.videoId), ["real1", "real2"]);
});

test("a reel entry without the ad flag is left alone", () => {
  const w = runScriptlet();
  w.ytInitialData = {
    entries: [{ command: { reelWatchEndpoint: { videoId: "real", adClientParams: { isAd: false } } } }],
  };
  assert.equal(w.ytInitialData.entries.length, 1, "isAd:false is a real Short");
});

test("the /youtubei/v1/get_watch endpoint is intercepted", async () => {
  // uBlock replaces "adPlacements" on get_watch; our pattern did not name it.
  let served;
  const w = runScriptlet({
    fetchImpl: async () => {
      served = playerResponse();
      return { ok: true, status: 200, statusText: "OK", headers: {}, clone: () => ({ json: async () => served }) };
    },
  });
  const res = await w.fetch("https://www.youtube.com/youtubei/v1/get_watch?prettyPrint=false");
  assert.equal("adPlacements" in JSON.parse(res.body), false);
});

// --- Route 4: the JSON.parse net --------------------------------------------

test("an ad-bearing payload is cleaned even if it reaches JSON.parse by no known route", () => {
  const w = runScriptlet();
  const raw = JSON.stringify({
    ...playerResponse(),
    padding: "x".repeat(300), // over the length guard
  });
  const out = w.JSON.parse(raw);
  assert.equal("adPlacements" in out, false, "the catch-all must strip it");
  assert.ok(out.streamingData, "and leave playback alone");
  assert.equal(w.__sieveYouTubeAdFilter.stats.jsonParsed, 1);
});

test("JSON.parse still parses normally, and short payloads are not walked", () => {
  const w = runScriptlet();
  assert.deepEqual(w.JSON.parse('{"a":1}'), { a: 1 }, "ordinary parses must be untouched");
  assert.equal(w.JSON.parse('"hello"'), "hello");
  assert.equal(w.__sieveYouTubeAdFilter.stats.jsonParsed, 0, "nothing ad-shaped, nothing walked");
});

test("a JSON.parse of something with no ad markers is handed straight back", () => {
  const w = runScriptlet();
  const big = JSON.stringify({ videos: Array.from({ length: 50 }, (_, i) => ({ id: i, title: "x".repeat(20) })) });
  const out = w.JSON.parse(big);
  assert.equal(out.videos.length, 50);
  assert.equal(w.__sieveYouTubeAdFilter.stats.jsonParsed, 0);
});

test("a malformed JSON string still throws, exactly as it would have", () => {
  const w = runScriptlet();
  assert.throws(() => w.JSON.parse("{not json"), SyntaxError);
});

// --- the removed-ad count ---------------------------------------------------
//
// The number the Protection Dashboard shows. It is NOT the key-removal tally
// beside it, and the difference is the whole point: taking four ad keys off one
// player response removes ONE ad break, and a dashboard reporting four would be
// lying in the direction that flatters the extension. These pin the arithmetic
// to what a viewer would have counted.

// Run whatever the scriptlet has queued for its batched report.
function flushReports(w) {
  const timers = w.__timers.splice(0);
  for (const fn of timers) fn();
}

test("one video's ad break counts as one ad, not one per key removed", () => {
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse(); // 4 ad keys, adPlacements of length 1
  const s = w.__sieveYouTubeAdFilter.stats;
  assert.equal(s.adsRemoved, 1);
  assert.equal(s.removed.adPlacements, 1, "the debugging tally still counts keys");
  assert.equal(s.removed.adSlots, 1);
});

test("a video carrying several breaks counts all of them", () => {
  const w = runScriptlet();
  const pr = playerResponse();
  pr.adPlacements = [{ adPlacementRenderer: {} }, { adPlacementRenderer: {} }, { adPlacementRenderer: {} }];
  w.ytInitialPlayerResponse = pr;
  assert.equal(w.__sieveYouTubeAdFilter.stats.adsRemoved, 3);
});

test("ad keys with no readable adPlacements still count as one ad", () => {
  // The viewer was going to sit through something; reporting zero would be worse
  // than reporting one.
  const w = runScriptlet();
  const pr = playerResponse();
  delete pr.adPlacements;
  w.ytInitialPlayerResponse = pr;
  assert.equal(w.__sieveYouTubeAdFilter.stats.adsRemoved, 1);
});

test("a clean video counts nothing and reports nothing", () => {
  const w = runScriptlet();
  const pr = playerResponse();
  for (const k of ["adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams"]) delete pr[k];
  delete pr.playerConfig.adConfig;
  w.ytInitialPlayerResponse = pr;
  flushReports(w);
  assert.equal(w.__sieveYouTubeAdFilter.stats.adsRemoved, 0);
  assert.deepEqual(w.__posted, [], "nothing removed means nothing to report");
});

test("each sponsored feed tile counts as one ad", () => {
  const w = runScriptlet();
  const data = feedResponse();
  feedItems(data).push({
    richItemRenderer: { content: { adSlotRenderer: { adSlotMetadata: { slotId: "ad2" } } } },
  });
  w.ytInitialData = data;
  assert.equal(w.__sieveYouTubeAdFilter.stats.adsRemoved, 2);
});

test("clearing the anti-adblock message is not counted as an ad removed", () => {
  // The enforcement panel is the "ad blockers are not allowed" modal. Removing it
  // is not an ad the user was spared, and counting it would pad the dashboard
  // with the one number that has nothing to do with ads.
  const w = runScriptlet();
  w.ytInitialData = {
    contents: {
      enforcementMessageViewModel: { displayType: "MODAL", title: "Ad blockers are not allowed" },
    },
  };
  const s = w.__sieveYouTubeAdFilter.stats;
  assert.equal(s.removed.enforcementMessageViewModel, 1, "it must still be removed");
  assert.equal(s.adsRemoved, 0, "but it is not an ad");
});

test("the count is batched into one message for the bridge", () => {
  const w = runScriptlet();
  const data = feedResponse();
  feedItems(data).push({
    richItemRenderer: { content: { adSlotRenderer: { adSlotMetadata: { slotId: "ad2" } } } },
  });
  w.ytInitialData = data;
  w.ytInitialPlayerResponse = playerResponse();
  assert.deepEqual(w.__posted, [], "nothing is posted until the batch flushes");

  flushReports(w);
  assert.equal(w.__posted.length, 1, "one message, not one per ad");
  const msg = w.__posted[0];
  assert.equal(msg.__sieveYouTubeAds, true);
  assert.equal(msg.dir, "to-bridge");
  assert.equal(msg.kind, "ads");
  assert.equal(msg.count, 3, "2 feed tiles + 1 ad break");
});

test("the message carries a count and nothing else about the page", () => {
  // Privacy is the reason this is one integer. If a video id or URL ever ends up
  // on this channel, it is leaving the page in a way the user was never told
  // about.
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse();
  flushReports(w);
  assert.deepEqual(
    Object.keys(w.__posted[0]).sort(),
    ["__sieveYouTubeAds", "count", "dir", "kind"]
  );
});

test("a flushed batch is not reported a second time", () => {
  const w = runScriptlet();
  w.ytInitialPlayerResponse = playerResponse();
  flushReports(w);
  flushReports(w);
  assert.equal(w.__posted.length, 1);

  // A later ad starts a fresh batch.
  w.ytInitialData = feedResponse();
  flushReports(w);
  assert.equal(w.__posted.length, 2);
  assert.equal(w.__posted[1].count, 1);
});

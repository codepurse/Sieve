// test/youtube-ads-fallback-test.mjs
// Sieve — the YouTube ad filter's fall-back from REMOVING video ads to
// FAST-FORWARDING them once YouTube has refused every way of asking
// (content/youtube-ads.js, STRATEGY), and the bridge that tells the settings
// page about it.
//
//   node --test test/
//
// Why this exists, measured in October 2026: removing video ads gets a viewer
// to the video fastest (~6.5 s against ~16 s and up with the ad), but YouTube's
// server can tell an ad it scheduled never played. It warns, and in the end it
// refuses to play videos at all — on a SABR session from the video server
// itself, where no browser can argue with it. THE RETRY answers that by asking
// again differently (test/youtube-ads-retry-test.mjs). When YouTube refuses
// every variant, fast-forwarding leaves the ad in, plays it muted at 16x, and
// gives the server nothing to notice.
//
// The things pinned here are the ones that fail silently:
//   - what switches the strategy (a refusal nothing else could answer) and
//     what no longer does (the warning popup),
//   - that a record from before THE RETRY existed is thrown away,
//   - that fast-forward mode really leaves the ad breaks alone (stripping them
//     "just a little" would defeat the point),
//   - the cool-down: its length, its growth on repeat, its reset,
//   - that a refused video is reloaded ONCE, never in a loop,
//   - that the viewer's own mute and playback speed come back after every ad,
//   - that the block is noticed where it actually shows up on a flagged
//     account: in the player, not in any response this file sees.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const SOURCE = read("../content/youtube-ads.js");
const BRIDGE = read("../content/youtube-ads-bridge.js");
const KEY = "sv-yt-ff";
const DAY = 86400000;
const WATCH = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const EMBED = "https://www.youtube.com/embed/dQw4w9WgXcQ";

// A fall-back record as the current build writes it.
const rec = (o) => ({ v: 2, ...o });

function store(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null),
    has: (k) => m.has(k),
  };
}

function fakePlayer({ ad = false, muted = false, rate = 1, response = null } = {}) {
  // A video that fires volumechange/ratechange when written to, as a real one does.
  const listeners = { volumechange: new Set(), ratechange: new Set() };
  let m = muted;
  let r = rate;
  const video = {
    listeners,
    get muted() { return m; },
    set muted(v) { if (v !== m) { m = v; for (const fn of [...listeners.volumechange]) fn(); } },
    get playbackRate() { return r; },
    set playbackRate(v) { if (v !== r) { r = v; for (const fn of [...listeners.ratechange]) fn(); } },
    addEventListener: (t, fn) => listeners[t] && listeners[t].add(fn),
    removeEventListener: (t, fn) => listeners[t] && listeners[t].delete(fn),
  };
  const p = {
    isConnected: true,
    ad,
    video,
    response,
    classList: { contains: (c) => c === "ad-showing" && p.ad },
    querySelector: (s) => (s === "video" ? video : null),
    getPlayerResponse: () => p.response,
  };
  return p;
}

function page({ local = store(), session = store(), player = null, href = WATCH } = {}) {
  // A clock a test can move: the cool-down is days long.
  const clock = { now: Date.now() };
  class FakeDate extends Date {
    static now() {
      return clock.now;
    }
  }
  const sandbox = {
    clock,
    console: { debug() {}, log() {}, error() {} },
    JSON: { parse: JSON.parse.bind(JSON), stringify: JSON.stringify.bind(JSON) },
    // No Promise: the scriptlet patches Promise.prototype.then, and Node's own
    // must not be touched. The vm realm's is used instead.
    Object, RegExp, String, Math, Number, isFinite, Uint8Array, URLSearchParams,
    Date: FakeDate,
    Response: class {},
    Request: class {},
    localStorage: local,
    sessionStorage: session,
    location: {
      search: "?v=dQw4w9WgXcQ",
      href,
      pathname: new URL(href).pathname,
      reload() {
        sandbox.__reloads++;
      },
    },
    document: {
      hidden: false,
      getElementById: (id) => (id === "movie_player" ? player : null),
      querySelector: (sel) => (/html5-video-player/.test(sel) ? player : null),
    },
    __reloads: 0,
    __posted: [],
    __timers: [],
    __interval: null,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.postMessage = (d) => sandbox.__posted.push(d);
  sandbox.addEventListener = () => {};
  sandbox.setTimeout = (fn) => {
    sandbox.__timers.push(fn);
    return sandbox.__timers.length;
  };
  sandbox.setInterval = (fn) => {
    sandbox.__interval = fn;
    return 1;
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  sandbox.runTimers = () => {
    const t = sandbox.__timers.splice(0);
    for (const fn of t) fn();
  };
  sandbox.tick = (n = 1) => {
    for (let i = 0; i < n; i++) sandbox.__interval();
  };
  return sandbox;
}

const stats = (w) => w.__sieveYouTubeAdFilter.stats;

function playerResponse() {
  return {
    adPlacements: [{ adPlacementRenderer: { config: { adPlacementConfig: { kind: "AD_PLACEMENT_KIND_START" } } } }],
    adSlots: [{ adSlotRenderer: {} }],
    playerAds: [{ playerLegacyDesktopWatchAdsRenderer: {} }],
    adBreakHeartbeatParams: "Q0FN",
    playerConfig: { daiConfig: { sendSsdaiMissingAdBreakReasons: true } },
    streamingData: { serverAbrStreamingUrl: "https://rr1.googlevideo.com/videoplayback?sabr=1", adaptiveFormats: [{ itag: 137 }] },
    videoDetails: { videoId: "dQw4w9WgXcQ", lengthSeconds: "212" },
    playabilityStatus: { status: "OK" },
  };
}

function blocked() {
  const pr = playerResponse();
  pr.playabilityStatus = {
    status: "ERROR",
    errorScreen: { enforcementMessageViewModel: { title: { content: "Ad blockers violate YouTube's Terms of Service" } } },
  };
  return pr;
}

// The "ad blockers are not allowed" popup, arriving the one way only the
// JSON.parse net sees: in a payload with no ads in it.
const popupText = () =>
  JSON.stringify({
    responseContext: { serviceTrackingParams: [{ service: "GFEEDBACK", params: [{ key: "e", value: "x".repeat(200) }] }] },
    auxiliaryUi: { messageRenderers: { enforcementMessageViewModel: { displayType: "MODAL" } } },
  });

// --- the default -------------------------------------------------------------

test("with no push-back on record, video ads are removed as before", () => {
  const w = page();
  w.ytInitialPlayerResponse = playerResponse();
  assert.equal("adPlacements" in w.ytInitialPlayerResponse, false);
  assert.equal(stats(w).mode, "remove");
});

// --- what switches, and what no longer does -----------------------------------

test("the warning popup is removed and counted, and switches nothing", () => {
  // It used to switch at once. A refusal is now answered by asking again, so
  // there is nothing to gain from giving up on removal early.
  const local = store();
  const w = page({ local });
  w.JSON.parse(popupText());
  assert.equal(stats(w).pushback.popup, 1);
  assert.equal(stats(w).mode, "remove");
  assert.equal(local.get(KEY), null, "nothing is remembered");
  w.runTimers();
  assert.equal(w.__reloads, 0);
  assert.equal(w.__posted.some((m) => m.kind === "fallback"), false, "and the settings page is not told of a switch");
});

test("a record from before the retry existed is thrown away, and the settings page told", () => {
  // Written by a build that switched on a single warning. Keeping it would
  // hold the viewer to days of fast-forwarding that asking again might avoid.
  const local = store({ [KEY]: { since: Date.now(), until: Date.now() + 2 * DAY, strikes: 1, reason: "block" } });
  const w = page({ local });
  assert.equal(stats(w).mode, "remove");
  assert.equal(local.has(KEY), false, "the old record is gone");
  w.ytInitialPlayerResponse = playerResponse();
  assert.equal("adPlacements" in w.ytInitialPlayerResponse, false, "ads are removed again at once");
  w.runTimers(); // the bridge is given a moment to start listening
  assert.ok(w.__posted.some((m) => m.kind === "fallback-clear"));
});

test("a current record is kept, and nothing is cleared", () => {
  const local = store({ [KEY]: rec({ since: Date.now(), until: Date.now() + DAY, strikes: 1, reason: "block" }) });
  const w = page({ local });
  assert.match(stats(w).mode, /^fast-forward until /);
  w.runTimers();
  assert.equal(w.__posted.some((m) => m.kind === "fallback-clear"), false);
});

test("fast-forward mode leaves the video ad breaks exactly as YouTube sent them", () => {
  const local = store({ [KEY]: rec({ since: Date.now(), until: Date.now() + DAY, strikes: 1, reason: "block" }) });
  const w = page({ local });
  w.ytInitialPlayerResponse = playerResponse();
  const pr = w.ytInitialPlayerResponse;
  for (const k of ["adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams"]) {
    assert.ok(k in pr, `${k} must stay — a missing ad break is what YouTube notices`);
  }
  assert.ok(pr.adSlots[0].adSlotRenderer, "and nothing is picked out of them one by one either");
  assert.equal(pr.playerConfig.daiConfig.sendSsdaiMissingAdBreakReasons, true, "the reporting flag is left alone too");
});

test("…while ads in the feed are still removed", () => {
  const local = store({ [KEY]: rec({ since: Date.now(), until: Date.now() + DAY, strikes: 1, reason: "block" }) });
  const w = page({ local });
  w.ytInitialData = {
    contents: { richGridRenderer: { contents: [
      { richItemRenderer: { content: { videoRenderer: { videoId: "aaa" } } } },
      { richItemRenderer: { content: { adSlotRenderer: { adSlotMetadata: { slotId: "ad1" } } } } },
    ] } },
  };
  assert.equal(w.ytInitialData.contents.richGridRenderer.contents.length, 1);
});

test("off a watch page, a playback block switches at once and reloads the page once", () => {
  // An embed or a Short has no player to ask again, so there is no retry to
  // wait for. (On a watch page the switch comes only when every variant has
  // been refused — see the retry tests.)
  const session = store();
  const local = store();
  const w = page({ session, local, href: EMBED });
  const before = Date.now();
  w.ytInitialPlayerResponse = blocked();
  assert.match(stats(w).mode, /^fast-forward/);
  const fb = local.get(KEY);
  assert.equal(fb.v, 2, "written in the current shape");
  assert.equal(fb.reason, "block");
  assert.equal(fb.strikes, 1);
  assert.ok(Math.abs(fb.until - before - 2 * DAY) < 5000, "two days");
  w.runTimers();
  assert.equal(w.__reloads, 1);
  const msg = w.__posted.find((m) => m.kind === "fallback");
  assert.ok(msg, "the settings page is told, through the bridge");
  assert.equal(msg.reason, "block");

  // The same tab, ten minutes not yet up, blocked again on the reloaded page:
  // the flag has outlasted the switch, and reloading again would be a loop.
  const again = page({ session, local: store(), href: EMBED });
  again.ytInitialPlayerResponse = blocked();
  again.runTimers();
  assert.equal(again.__reloads, 0, "never twice inside ten minutes");
});

test("on a watch page, a refusal in a response is left to the retry", () => {
  const local = store();
  const w = page({ local });
  w.ytInitialPlayerResponse = blocked();
  assert.equal(stats(w).mode, "remove", "nothing switches until every way of asking has been refused");
  assert.equal(local.get(KEY), null);
  assert.equal(stats(w).refusals.length, 1, "but the refusal is on record");
});

test("push-back while already fast-forwarding changes nothing and reloads nothing", () => {
  const until = Date.now() + 3 * DAY;
  const local = store({ [KEY]: rec({ since: Date.now() - DAY, until, strikes: 1, reason: "block" }) });
  const w = page({ local, href: EMBED });
  w.ytInitialPlayerResponse = blocked();
  w.runTimers();
  assert.equal(w.__reloads, 0);
  assert.equal(local.get(KEY).until, until, "the cool-down is not restarted");
  assert.equal(stats(w).pushback.block, 1, "but it is counted");
});

test("the cool-down doubles on every repeat within a month, up to a fortnight", () => {
  const now = Date.now();
  const cases = [
    { prior: { strikes: 1, until: now - DAY }, days: 4 },
    { prior: { strikes: 2, until: now - DAY }, days: 8 },
    { prior: { strikes: 3, until: now - DAY }, days: 14 },
    { prior: { strikes: 9, until: now - DAY }, days: 14 },
    // A month and more of removal working again starts the count over.
    { prior: { strikes: 3, until: now - 40 * DAY }, days: 2 },
  ];
  for (const { prior, days } of cases) {
    const local = store({ [KEY]: rec({ since: prior.until - DAY, ...prior, reason: "block" }) });
    const w = page({ local, href: EMBED });
    w.ytInitialPlayerResponse = blocked();
    const fb = local.get(KEY);
    assert.ok(Math.abs(fb.until - fb.since - days * DAY) < 5000, `after ${prior.strikes} strike(s): expected ${days} days`);
  }
});

test("once the cool-down is over, ads are removed again", () => {
  const local = store({ [KEY]: rec({ since: Date.now() - 5 * DAY, until: Date.now() - 1000, strikes: 1, reason: "block" }) });
  const w = page({ local });
  w.ytInitialPlayerResponse = playerResponse();
  assert.equal("adPlacements" in w.ytInitialPlayerResponse, false);
  assert.equal(stats(w).mode, "remove");
});

// --- fast-forwarding ---------------------------------------------------------------

const ffLocal = (until = Date.now() + DAY) => store({ [KEY]: rec({ since: Date.now(), until, strikes: 1, reason: "block" }) });

test("an ad is muted and run at 16x, and the viewer's own sound and speed come back after", () => {
  const player = fakePlayer({ ad: false, muted: false, rate: 1.5 });
  const w = page({ local: ffLocal(), player });

  w.tick();
  assert.equal(player.video.muted, false, "nothing is touched while no ad is on");
  assert.equal(player.video.playbackRate, 1.5);

  player.ad = true;
  w.tick();
  assert.equal(player.video.muted, true);
  assert.equal(player.video.playbackRate, 16);
  w.tick(3);
  assert.equal(stats(w).adsFastForwarded, 1, "one ad break, counted once however many ticks it lasts");

  player.ad = false;
  w.tick();
  assert.equal(player.video.muted, false, "the sound comes back");
  assert.equal(player.video.playbackRate, 1.5, "and so does 1.5x");
});

test("when YouTube turns the sound back on mid-ad, it goes straight back off — not a quarter-second later", () => {
  const player = fakePlayer({ ad: true, muted: false, rate: 1 });
  const w = page({ local: ffLocal(), player });
  w.tick();
  // The player resets the ad: sound on, normal speed. No tick in between.
  player.video.muted = false;
  player.video.playbackRate = 1;
  assert.equal(player.video.muted, true);
  assert.equal(player.video.playbackRate, 16);
  // And once the ad is over the hold lets go: the viewer can change either freely.
  player.ad = false;
  w.tick();
  assert.equal(player.video.listeners.volumechange.size, 0);
  assert.equal(player.video.listeners.ratechange.size, 0);
  player.video.playbackRate = 2;
  assert.equal(player.video.playbackRate, 2);
});

test("a viewer who had muted it keeps it muted", () => {
  const player = fakePlayer({ ad: true, muted: true, rate: 1 });
  const w = page({ local: ffLocal(), player });
  w.tick();
  player.ad = false;
  w.tick();
  assert.equal(player.video.muted, true);
  assert.equal(player.video.playbackRate, 1);
});

test("an ad already muted is restored even if the cool-down ends in the middle of it", () => {
  const player = fakePlayer({ ad: true, muted: false, rate: 1.25 });
  const w = page({ local: ffLocal(Date.now() + 60000), player });
  w.tick();
  assert.equal(player.video.playbackRate, 16);
  w.clock.now += 120000; // the cool-down is over while the ad is still on
  assert.equal(stats(w).mode, "remove");
  w.tick();
  assert.equal(player.video.playbackRate, 16, "the ad it started is still seen through");
  player.ad = false;
  w.tick();
  assert.equal(player.video.playbackRate, 1.25, "and the viewer's speed comes back");
  assert.equal(player.video.muted, false, "and their sound");
});

test("in remove mode the watcher never mutes or speeds up anything", () => {
  const player = fakePlayer({ ad: true, muted: false, rate: 1 });
  const w = page({ player });
  w.tick(8);
  assert.equal(player.video.muted, false);
  assert.equal(player.video.playbackRate, 1);
});

// --- the block where it actually shows up -----------------------------------------

test("a block that came straight from the video server is caught by asking the player", () => {
  // The flagged account's case: no response this file sees ever carried the
  // refusal, but the player holds it — so the player is asked. This player has
  // no loadVideoById, so it cannot be asked again, and the strategy switches at
  // once rather than never.
  const player = fakePlayer({ response: blocked() });
  const session = store();
  const w = page({ player, session });
  w.tick(4); // the player is checked once a second
  assert.match(stats(w).mode, /^fast-forward/);
  const rec = stats(w).refusals.at(-1);
  assert.equal(rec.route, "player");
  assert.equal(rec.media, "server-streamed (SABR)");
  w.runTimers();
  assert.equal(w.__reloads, 1);
});

test("an ordinary video error in the player is not push-back", () => {
  const pr = playerResponse();
  pr.playabilityStatus = { status: "UNPLAYABLE", errorScreen: { playerErrorMessageRenderer: { reason: { simpleText: "Video unavailable" } } } };
  const player = fakePlayer({ response: pr });
  const w = page({ player });
  w.tick(8);
  assert.equal(stats(w).mode, "remove");
  assert.deepEqual(JSON.parse(JSON.stringify(stats(w).pushback)), {});
  assert.equal(stats(w).retries, 0, "and nothing is asked again");
});

// --- the bridge -------------------------------------------------------------------

function bridge() {
  const set = [];
  const removed = [];
  let handler = null;
  const sandbox = {
    console: { debug() {} },
    Number, Math, Date,
    location: { origin: "https://www.youtube.com" },
    chrome: {
      runtime: { sendMessage: () => ({ catch() {} }) },
      storage: {
        local: {
          set: (v) => (set.push(v), { catch() {} }),
          remove: (k) => (removed.push(k), { catch() {} }),
        },
      },
    },
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (type, fn) => {
    if (type === "message") handler = fn;
  };
  vm.createContext(sandbox);
  vm.runInContext(BRIDGE, sandbox);
  // Inside the context, window is the context's own global, not this object.
  const self = vm.runInContext("window", sandbox);
  const send = (data, extra = {}) => handler({ source: self, origin: "https://www.youtube.com", data, ...extra });
  return { set, removed, send, sandbox };
}

test("the bridge records a genuine switch for the settings page", () => {
  const b = bridge();
  const now = Date.now();
  b.send({ __sieveYouTubeAds: true, dir: "to-bridge", kind: "fallback", since: now, until: now + 2 * DAY, reason: "block" });
  assert.deepEqual(JSON.parse(JSON.stringify(b.set)), [{ ssYouTubeAdsFallback: { since: now, until: now + 2 * DAY, reason: "block" } }]);
});

test("the bridge clears the settings page's note when the page threw its record away", () => {
  const b = bridge();
  b.send({ __sieveYouTubeAds: true, dir: "to-bridge", kind: "fallback-clear" });
  assert.deepEqual(b.removed, ["ssYouTubeAdsFallback"]);
  // …but only from this page, like everything else it accepts.
  b.send({ __sieveYouTubeAds: true, dir: "to-bridge", kind: "fallback-clear" }, { origin: "https://evil.example" });
  assert.equal(b.removed.length, 1);
});

test("the bridge refuses a switch it could not have been sent", () => {
  const b = bridge();
  const now = Date.now();
  const base = { __sieveYouTubeAds: true, dir: "to-bridge", kind: "fallback", since: now, until: now + DAY, reason: "popup" };
  b.send({ ...base, reason: "because" });
  b.send({ ...base, until: now + 400 * DAY }, {});
  b.send({ ...base, since: now - 10 * DAY });
  b.send({ ...base, until: now - 1 });
  b.send({ ...base, since: "soon" });
  b.send(base, { origin: "https://evil.example" });
  b.send(base, { source: {} });
  assert.equal(b.set.length, 0);
});

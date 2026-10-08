// test/youtube-ads-retry-test.mjs
// Sieve — THE RETRY and the COUNTER-MEASURES in content/youtube-ads.js.
//
//   node --test test/
//
// Why this exists (October 2026): on an account YouTube had flagged, Sieve's
// filter got "Video playback is blocked" while uBlock Origin Lite played the
// same videos ad-free. Reading uBlock's public filters showed what it does that
// this did not. When the video is held back or refused, it asks for it again,
// differently. It disarms YouTube's "abnormality detected" callback and its
// 17-second hold. And it stops YouTube going round its hooks through a fresh
// frame. This file pins Sieve's own implementation of those ideas.
//
// What fails silently here, and so is pinned:
//   - the order variants are tried in, and that each is tried once,
//   - what each variant does to the outgoing /player request — and that the
//     caller's own object is never touched,
//   - that a hold needs YouTube's signal AND a starved player, never either
//     alone (alone, every slow start would reload),
//   - that a just-retried video is not judged on its old answer,
//   - that running out of variants falls back to fast-forwarding, once,
//   - that every hook still reports itself as the browser's own function.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/youtube-ads.js", import.meta.url), "utf8");
const WATCH = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const KEY = "sv-yt-ff";
const DAY = 86400000;

function store(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null),
  };
}

function playerResponse(extra = {}) {
  return {
    streamingData: { serverAbrStreamingUrl: "https://rr1.googlevideo.com/videoplayback?sabr=1", adaptiveFormats: [{ itag: 137 }] },
    videoDetails: { videoId: "dQw4w9WgXcQ", lengthSeconds: "212" },
    playabilityStatus: { status: "OK" },
    ...extra,
  };
}

// The two refusal shapes YouTube is known to use for an ad blocker.
function refused() {
  return playerResponse({
    playabilityStatus: {
      status: "ERROR",
      errorScreen: { enforcementMessageViewModel: { title: { content: "Ad blockers violate YouTube's Terms of Service" } } },
    },
  });
}
function refusedByHelpLink() {
  return playerResponse({
    playabilityStatus: {
      status: "UNPLAYABLE",
      errorScreen: {
        playerErrorMessageRenderer: {
          subreason: {
            runs: [{
              text: "Learn more",
              navigationEndpoint: {
                commandMetadata: { webCommandMetadata: { url: "https://support.google.com/youtube/answer/3037019", webPageType: "WEB_PAGE_TYPE_UNKNOWN" } },
              },
            }],
          },
        },
      },
    },
  });
}

// The player through its own API — the methods content/youtube-ads.js asks.
function fakePlayer(response = playerResponse()) {
  const p = {
    isConnected: true,
    ad: false,
    response,
    nerd: { buffer_health_seconds: "4.00 s", resolution: "1920x1080", debug_info: "" },
    progress: { duration: 212, loaded: 10, current: 1 },
    buffering: false,
    playlistId: "PL1",
    loads: [],
    seeks: [],
    classList: { contains: (c) => c === "ad-showing" && p.ad },
    querySelector: () => null,
    getPlayerResponse: () => p.response,
    getStatsForNerds: () => p.nerd,
    getProgressState: () => p.progress,
    getPlayerStateObject: () => ({ isBuffering: p.buffering }),
    getPlaylistId: () => p.playlistId,
    loadVideoById: (id, start) => p.loads.push({ id, start }),
    seekTo: (t) => p.seeks.push(t),
  };
  return p;
}

// The look of a video the server is not sending.
function starve(p) {
  p.buffering = true;
  p.nerd = { ...p.nerd, buffer_health_seconds: "0.00 s", resolution: "0x0" };
}

function page({ player = fakePlayer(), href = WATCH, local = store(), extras = {} } = {}) {
  const clock = { now: Date.now() };
  class FakeDate extends Date {
    static now() {
      return clock.now;
    }
  }
  const sandbox = {
    clock,
    player,
    console: { debug() {}, log() {}, error() {} },
    // Own JSON facade and no Promise: the scriptlet patches both, and Node's
    // must not be touched. The vm realm's own Promise, Map and Array are used.
    JSON: { parse: JSON.parse.bind(JSON), stringify: JSON.stringify.bind(JSON) },
    Object, RegExp, String, Math, Number, isFinite, URLSearchParams,
    Date: FakeDate,
    Response: class {},
    Request: class {},
    fetch: async () => ({ ok: false }),
    localStorage: local,
    sessionStorage: store(),
    location: {
      search: new URL(href).search,
      href,
      pathname: new URL(href).pathname,
      reload() {
        sandbox.__reloads++;
      },
    },
    document: {
      hidden: false,
      getElementById: (id) => (id === "movie_player" ? sandbox.player : null),
      querySelector: (sel) => (sel === "yt-playlist-manager" ? sandbox.__playlistManager || null : null),
    },
    __reloads: 0,
    __posted: [],
    __timers: [],
    __interval: null,
    ...extras,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.postMessage = (d) => sandbox.__posted.push(d);
  sandbox.addEventListener = () => {};
  sandbox.setTimeout = (fn, ms) => {
    sandbox.__timers.push({ fn, ms });
    return sandbox.__timers.length;
  };
  sandbox.setInterval = (fn) => {
    sandbox.__interval = fn;
    return 1;
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  sandbox.tick = (n = 1) => {
    for (let i = 0; i < n; i++) sandbox.__interval();
  };
  sandbox.runTimers = () => {
    for (const t of sandbox.__timers.splice(0)) t.fn();
  };
  sandbox.run = (code) => vm.runInContext(code, sandbox);
  return sandbox;
}

const stats = (w) => w.__sieveYouTubeAdFilter.stats;

// A /player request body as the player builds it.
function playerRequest() {
  return {
    context: { client: { clientName: "WEB", clientVersion: "2.20261001", userAgent: "Mozilla/5.0" } },
    videoId: "dQw4w9WgXcQ",
    playbackContext: { contentPlaybackContext: { referer: "https://www.youtube.com/", lactMilliseconds: "-1" } },
    attestationRequest: { omitBotguardData: true },
  };
}
const sent = (w, body) => JSON.parse(w.JSON.stringify(body));

// Refuse the video on screen once more, as a NEW response, and let the tick see it.
function refuseAgain(w, make = refused) {
  w.player.response = make();
  w.tick();
}

// --- the refusal cascade ---------------------------------------------------------

test("a refusal on a watch page is answered by asking again, not by giving up", () => {
  const player = fakePlayer(refused());
  const w = page({ player });
  w.tick();
  assert.equal(player.loads.length, 1, "the player is told to load the video again");
  assert.equal(player.loads[0].id, "dQw4w9WgXcQ");
  assert.equal(stats(w).variant, "lactmilli", "the first refusal skips channel, which answers a hold");
  assert.equal(stats(w).lastRetry.why, "refused");
  assert.equal(stats(w).mode, "remove", "ads are still being removed");
});

test("each refusal moves on to the next variant, then one plain retry, then fast-forwarding", () => {
  const player = fakePlayer(refused());
  const local = store();
  const w = page({ player, local });
  w.tick();
  assert.equal(stats(w).variant, "lactmilli");
  refuseAgain(w);
  assert.equal(stats(w).variant, "instream");
  refuseAgain(w);
  assert.equal(stats(w).variant, "yahi");
  refuseAgain(w);
  assert.equal(stats(w).variant, "none", "the last retry asks plainly");
  assert.equal(player.loads.length, 4);
  assert.equal(stats(w).mode, "remove");

  refuseAgain(w);
  assert.equal(player.loads.length, 4, "no fifth retry");
  assert.match(stats(w).mode, /^fast-forward until /, "every way of asking was refused");
  assert.equal(local.get(KEY).reason, "block");
  w.runTimers();
  assert.equal(w.__reloads, 1, "the page is reloaded once, to play with its ads");
  refuseAgain(w);
  w.runTimers();
  assert.equal(w.__reloads, 1, "and only once");
});

test("the refusal that links YouTube's ad-blocker help page counts as one too", () => {
  const player = fakePlayer(refusedByHelpLink());
  const w = page({ player });
  w.tick();
  assert.equal(player.loads.length, 1);
});

test("a captcha, or an ordinary unavailable video, is not asked again", () => {
  const captcha = refusedByHelpLink();
  captcha.playabilityStatus.errorScreen.playerErrorMessageRenderer.playerCaptchaViewModel = {};
  const unavailable = playerResponse({
    playabilityStatus: { status: "UNPLAYABLE", errorScreen: { playerErrorMessageRenderer: { reason: { simpleText: "Video unavailable" } } } },
  });
  for (const pr of [captcha, unavailable]) {
    const player = fakePlayer(pr);
    const w = page({ player });
    w.tick(8);
    assert.equal(player.loads.length, 0);
    assert.equal(stats(w).retries, 0);
  }
});

test("a video just asked again is not judged on its old answer", () => {
  // Right after loadVideoById the player can still be holding the refused
  // response. Judging that would burn through every variant in a second.
  const player = fakePlayer(refused());
  const w = page({ player });
  w.tick();
  w.tick(10); // same response object still on screen
  assert.equal(player.loads.length, 1);
  assert.equal(stats(w).variant, "lactmilli");
  // …unless no new answer comes at all: then it is judged after four seconds.
  w.clock.now += 4500;
  w.tick();
  assert.equal(player.loads.length, 2);
  assert.equal(stats(w).variant, "instream");
});

test("a retry starts where the page asked the video to start", () => {
  const pr = refused();
  pr.playerConfig = { playbackStartConfig: { startSeconds: 42 } };
  const player = fakePlayer(pr);
  page({ player }).tick();
  assert.equal(player.loads[0].start, 42);
});

test("…or, held part-way through, from where the viewer was — except on a live stream", () => {
  const player = fakePlayer();
  player.progress = { duration: 212, loaded: 96, current: 95.6 };
  const w = page({ player });
  starve(player);
  w.run('new Map().has("onSnackbarMessage")');
  w.tick();
  assert.equal(player.loads[0].start, 95, "not back to the beginning");

  const live = fakePlayer(playerResponse({ videoDetails: { videoId: "dQw4w9WgXcQ", isLive: true } }));
  live.progress = { duration: 5000, loaded: 4990, current: 4980 };
  const wl = page({ player: live });
  starve(live);
  wl.run('new Map().has("onSnackbarMessage")');
  wl.tick();
  assert.equal(live.loads[0].start, 0, "a live stream finds its own place");
});

// --- what each variant sends ----------------------------------------------------------

test("with no variant in play, the player's request goes out exactly as written", () => {
  const w = page();
  const body = playerRequest();
  assert.equal(w.JSON.stringify(body), JSON.stringify(body));
  assert.equal(stats(w).requestsEdited, 0);
});

test("each variant edits a COPY of the /player request, as specified", () => {
  const player = fakePlayer(refused());
  const w = page({ player });

  w.tick(); // lactmilli
  let body = playerRequest();
  let out = sent(w, body);
  assert.equal(out.params, "8AUB");
  assert.equal(out.playbackContext.contentPlaybackContext.lactMilliseconds, String(w.clock.now), "active just now");
  assert.equal(out.playbackContext.contentPlaybackContext.referer, "https://www.youtube.com/#reloadxhr");
  assert.deepEqual(body, playerRequest(), "the caller's own object is untouched");

  refuseAgain(w); // instream
  out = sent(w, playerRequest());
  assert.deepEqual(out.playbackContext.adPlaybackContext, { adType: "AD_TYPE_INSTREAM" }, "beside contentPlaybackContext");
  assert.equal(out.playbackContext.contentPlaybackContext.adPlaybackContext, undefined);
  assert.equal(out.params, undefined);

  refuseAgain(w); // yahi
  out = sent(w, playerRequest());
  assert.equal(out.params, "YAHI");
  assert.equal(out.playbackContext.contentPlaybackContext.lactMilliseconds, "-1", "yahi does not claim recent activity");

  // The referer marker is added once, however often a request is re-sent.
  const again = playerRequest();
  again.playbackContext.contentPlaybackContext.referer = "https://www.youtube.com/#reloadxhr";
  assert.equal(sent(w, again).playbackContext.contentPlaybackContext.referer, "https://www.youtube.com/#reloadxhr");
});

test("only the player's request is edited — the one carrying an attestation request", () => {
  const player = fakePlayer(refused());
  const w = page({ player });
  w.tick(); // a variant is now in play
  const other = { context: { client: { clientName: "WEB" } }, browseId: "FEwhat_to_watch" };
  assert.equal(w.JSON.stringify(other), JSON.stringify(other));
  assert.equal(w.JSON.stringify([1, 2]), "[1,2]");
  assert.equal(w.JSON.stringify("x"), '"x"');
  // replacer and indentation are passed through untouched
  assert.equal(w.JSON.stringify({ a: 1 }, null, 2), JSON.stringify({ a: 1 }, null, 2));
});

// --- the hold ---------------------------------------------------------------------------

test("a hold — YouTube's snackbar signal while the player is starved — is asked again as a channel page", () => {
  const player = fakePlayer();
  const w = page({ player });
  starve(player);
  w.run('new Map().has("onSnackbarMessage")');
  assert.equal(stats(w).holdSignals, 1);
  assert.equal(stats(w).holdSignalKinds.snackbar, 1);
  w.tick();
  assert.equal(player.loads.length, 1);
  assert.equal(stats(w).variant, "channel");
  assert.equal(stats(w).lastRetry.why, "held");
  assert.equal(sent(w, playerRequest()).context.client.clientScreen, "CHANNEL");
  // Only for the web client: another client's request keeps its own screen.
  const mweb = playerRequest();
  mweb.context.client.clientName = "MWEB";
  assert.equal(sent(w, mweb).context.client.clientScreen, undefined);
});

test("the other hold signal — a whole 104- or 105-byte message — does the same", () => {
  for (const size of [104, 105]) {
    const player = fakePlayer();
    const w = page({ player });
    starve(player);
    w.run(`[].push(new Uint8Array(${size}))`);
    w.tick();
    assert.equal(player.loads.length, 1, `${size} bytes`);
    assert.equal(stats(w).holdSignalKinds.bytes, 1);
  }
  // A view into a bigger buffer, or another size, is not the signal.
  const player = fakePlayer();
  const w = page({ player });
  starve(player);
  w.run("[].push(new Uint8Array(new ArrayBuffer(400), 0, 105)); [].push(new Uint8Array(106)); [].push({ length: 105 })");
  w.tick();
  assert.equal(player.loads.length, 0);
});

test("a starved player alone is not a hold — every video is starved for a moment as it starts", () => {
  const player = fakePlayer();
  const w = page({ player });
  starve(player);
  w.tick(40);
  assert.equal(player.loads.length, 0);
});

test("the signal alone is not a hold either", () => {
  const player = fakePlayer();
  const w = page({ player });
  w.run('new Map().has("onSnackbarMessage")');
  starve(player); // starved only AFTER the signal
  w.tick();
  assert.equal(stats(w).holdSignals, 0);
  assert.equal(player.loads.length, 0);
});

test("a hold on a video fetched with the variant drops that variant", () => {
  const player = fakePlayer();
  const w = page({ player });
  starve(player);
  w.run('new Map().has("onSnackbarMessage")');
  w.tick();
  assert.equal(stats(w).variant, "channel");

  // The answer to the channel request comes back — YouTube echoes the marker —
  // and it is held too.
  player.response = playerResponse({
    playbackTracking: { videostatsPlaybackUrl: { baseUrl: "https://s.youtube.com/api/stats/playback?referrer=https%3A%2F%2Fwww.youtube.com%2F%23reloadxhr" } },
  });
  w.run('new Map().has("onSnackbarMessage")');
  w.tick();
  assert.equal(player.loads.length, 2);
  assert.equal(stats(w).variant, "lactmilli");
});

test("a variant that works stays in play for the next video, and leaving the watch page keeps it", () => {
  const player = fakePlayer();
  const w = page({ player });
  starve(player);
  w.run('new Map().has("onSnackbarMessage")');
  w.tick();
  // It plays.
  player.buffering = false;
  player.nerd = { buffer_health_seconds: "6.00 s", resolution: "1920x1080", debug_info: "" };
  player.response = playerResponse();
  w.tick(20);
  assert.equal(player.loads.length, 1);
  assert.equal(stats(w).variant, "channel");
  // Off to the home page and back: still asking as a channel page.
  w.location.href = "https://www.youtube.com/";
  w.tick();
  assert.equal(stats(w).variant, "channel");
  assert.equal(sent(w, playerRequest()).context.client.clientScreen, "CHANNEL");
});

test("while fast-forwarding, a hold is YouTube waiting out the ad, and is sat out", () => {
  const local = store({ [KEY]: { v: 2, since: Date.now(), until: Date.now() + DAY, strikes: 1, reason: "block" } });
  const player = fakePlayer();
  const w = page({ player, local });
  starve(player);
  w.run('new Map().has("onSnackbarMessage")');
  w.tick(4);
  assert.equal(player.loads.length, 0);
});

test("a retry puts back the playlist the video was playing in", () => {
  const calls = [];
  const data = { playlistId: "PL1", contents: [] };
  const player = fakePlayer(refused());
  const w = page({ player, href: WATCH + "&list=PL1" });
  w.__playlistManager = {
    getPlaylistData: () => data,
    setPlaylistData: (d) => calls.push(["data", d]),
    setPlayerPlaybackControlData: (d) => calls.push(["control", d]),
  };
  w.tick(); // retried
  player.playlistId = null; // loadVideoById dropped it
  player.response = playerResponse();
  w.tick();
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1], data);
  assert.equal(calls[1][1].playlistPanelRenderer, data);
  w.tick(5);
  assert.equal(calls.length, 2, "once");
});

// --- server-stitched ads ---------------------------------------------------------------

test("a server-stitched ad is ended through the player's own seekTo, and counted once", () => {
  const player = fakePlayer();
  player.nerd = { buffer_health_seconds: "3.00 s", resolution: "1280x720", debug_info: "SSAP, AD, 1,2" };
  player.progress = { duration: 15, loaded: 3, current: 1 };
  const w = page({ player });
  w.tick(3);
  assert.deepEqual(player.seeks, [15, 15, 15]);
  assert.equal(stats(w).ssapSkipped, 1);
  assert.equal(stats(w).adsRemoved, 1);
  // The ad ends; the next one is a new ad.
  player.nerd = { ...player.nerd, debug_info: "SSAP, CONTENT" };
  w.tick();
  player.nerd = { ...player.nerd, debug_info: "SSAP, AD, 2,2" };
  w.tick();
  assert.equal(stats(w).ssapSkipped, 2);
});

test("…but not while fast-forwarding, whose whole point is that ads play out", () => {
  const local = store({ [KEY]: { v: 2, since: Date.now(), until: Date.now() + DAY, strikes: 1, reason: "block" } });
  const player = fakePlayer();
  player.nerd = { buffer_health_seconds: "3.00 s", resolution: "1280x720", debug_info: "SSAP, AD, 1,2" };
  player.progress = { duration: 15, loaded: 3, current: 1 };
  const w = page({ player, local });
  w.tick(3);
  assert.deepEqual(player.seeks, []);
});

// --- counter-measures ------------------------------------------------------------------

test("YouTube's abnormality callback is swapped for one that does nothing; others run", async () => {
  const w = page();
  w.run(`
    Promise.resolve(1).then(function onAbnormalityDetected() { globalThis.__abnormal = true; });
    Promise.resolve(1).then(function ordinary() { globalThis.__ordinary = true; });
  `);
  await new Promise((r) => setImmediate(r));
  assert.equal(w.__abnormal, undefined);
  assert.equal(w.__ordinary, true);
  assert.equal(stats(w).abnormalityMuted, 1);
});

test("the 17-second hold timer is cut to 17 ms; every other timer runs as written", () => {
  const w = page();
  const native = function () {}.bind(null); // a bound function reports [native code]
  w.setTimeout(native, 17000);
  w.setTimeout(() => {}, 17000);
  w.setTimeout(native, 16999);
  const delays = w.__timers.map((t) => t.ms);
  assert.deepEqual(delays.slice(-3), [17, 17000, 16999]);
  assert.equal(stats(w).timersBoosted, 1);
});

test("a same-origin frame appended to the page is handed our fetch and JSON", () => {
  class FakeNode {}
  FakeNode.prototype.appendChild = function (child) {
    return child;
  };
  const w = page({ extras: { Node: FakeNode } });
  const blank = { location: { href: "about:blank" }, fetch: "clean", Request: "clean", JSON: { parse: "clean", stringify: "clean" } };
  const frame = { nodeType: 1, contentWindow: blank };
  const back = new FakeNode().appendChild(frame);
  assert.equal(back, frame, "appendChild still returns what it did");
  assert.equal(blank.fetch, w.fetch);
  assert.equal(blank.Request, w.Request);
  assert.equal(blank.JSON.parse, w.JSON.parse);
  assert.equal(blank.JSON.stringify, w.JSON.stringify);
  assert.equal(stats(w).framesGuarded, 1);

  // Another origin's frame is not ours to touch.
  const foreign = { get location() { throw new Error("cross-origin"); }, fetch: "theirs", JSON: { parse: "theirs" } };
  new FakeNode().appendChild({ nodeType: 1, contentWindow: foreign });
  assert.equal(foreign.fetch, "theirs");
  // Nor is a same-origin frame already on another page.
  const elsewhere = { location: { href: "https://www.youtube.com/somewhere" }, fetch: "theirs", JSON: {} };
  new FakeNode().appendChild({ nodeType: 1, contentWindow: elsewhere });
  assert.equal(elsewhere.fetch, "theirs");
});

test("the inline script that grabs window.fetch is emptied before it runs, and nothing else is", () => {
  let observer = null;
  class FakeMO {
    constructor(cb) {
      this.cb = cb;
      observer = this;
    }
    observe() {}
    disconnect() {
      this.off = true;
    }
  }
  const listeners = {};
  const doc = {
    hidden: false,
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: (t, fn) => (listeners[t] = fn),
  };
  const w = page({ extras: { MutationObserver: FakeMO, document: doc } });
  const script = (text, src = false) => ({
    nodeType: 1,
    nodeName: "SCRIPT",
    textContent: text,
    hasAttribute: (a) => a === "src" && src,
  });
  const grab = script('(function(){var d=Object.getOwnPropertyDescriptor(window,"fetch");})()');
  const ordinary = script("var ytcfg = {};");
  const external = script('window,"fetch"', true);
  const late = script("");
  observer.cb([{ addedNodes: [grab, ordinary, external, late] }]);
  // Its text arriving after the element itself.
  late.textContent = 'x(window,"fetch")';
  observer.cb([{ addedNodes: [{ nodeType: 3, parentNode: late }] }]);
  assert.equal(grab.textContent, "");
  assert.equal(late.textContent, "");
  assert.equal(ordinary.textContent, "var ytcfg = {};");
  assert.equal(external.textContent, 'window,"fetch"', "a script with a src is not inline");
  assert.equal(stats(w).inlineNeutered, 2);
  listeners.DOMContentLoaded();
  assert.equal(observer.off, true, "it stops listening once the document is parsed");
});

test("every hook still reports itself as the function it replaced", () => {
  const fetchImpl = async function fetch() {};
  const w = page({ extras: { fetch: fetchImpl } });
  // fetch: the original's name and source, not ours.
  assert.notEqual(w.fetch, fetchImpl, "it is hooked");
  assert.equal(w.fetch.name, "fetch");
  assert.equal(w.fetch.toString(), Function.prototype.toString.call(fetchImpl));
  // The prototype hooks report native code under their own names.
  for (const path of ["Promise.prototype.then", "Map.prototype.has", "Array.prototype.push"]) {
    assert.equal(w.run(`${path}.toString === Function.prototype.toString`), false, `${path} is hooked`);
    assert.match(w.run(`${path}.toString()`), /\[native code\]/, path);
    assert.equal(w.run(`${path}.name`), path.split(".").pop());
  }
});

test("in the embedded player, the hooks that serve the retry are not installed", () => {
  const w = page({ href: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  for (const path of ["Promise.prototype.then", "Map.prototype.has", "Array.prototype.push"]) {
    assert.equal(w.run(`${path}.toString === Function.prototype.toString`), true, `${path} is the browser's own`);
  }
});

test("the marker says this build retries", () => {
  const w = page();
  const f = w.__sieveYouTubeAdFilter;
  assert.equal(f.version, 9);
  assert.deepEqual(Array.from(f.retry), ["channel", "lactmilli", "instream", "yahi"]);
  assert.equal(f.counterMeasures, true);
});

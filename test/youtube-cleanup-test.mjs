// test/youtube-cleanup-test.mjs
// Sieve — tests for Site Cleanup → YouTube (content/site-cleanup.js and
// content/youtube-clean.css).
//
//   node --test test/
//
// Three things are pinned here.
//
// 1. WIRING. A switch is spread over three files that have to agree on a key
//    and a class: the settings page writes the key, the content script turns it
//    into a class on <html>, and the stylesheet hides something under that
//    class. Nothing at runtime notices a misspelling — the switch just does
//    nothing — so every switch on the settings page is walked through here.
//
// 2. "TURN OFF AUTOPLAY" HAS TO OUTLAST THE PLAYER'S START-UP. Measured on
//    youtube.com in October 2026: the toggle is on the page ~1.5s in, but the
//    player only starts listening to it at ~3s, and a click before then is
//    dropped without a trace. YouTube then redraws the toggle as "on". The first
//    version clicked once as soon as the toggle appeared and stopped, so it lost
//    that race every time and autoplay was never turned off. The fake toggle
//    below behaves the way the real one was measured to.
//
// 3. TWO SCOPING DECISIONS in the end-card rule that look like omissions and
//    are not: the new player's suggestion grid is hidden only once a video has
//    ENDED (the same element is the fullscreen "more videos" panel while one
//    plays), and the "Up next" countdown is left to the autoplay switch (hiding
//    it would leave autoplay changing the video with no warning).
//
// As with the other content-script tests, a hand-built DOM proves the decisions
// are right, not that the file works on youtube.com — that was checked in a
// real browser, and should be again whenever YouTube changes its player.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const SOURCE = read("../content/site-cleanup.js");
const CSS = read("../content/youtube-clean.css");
const OPTIONS = read("../options/options.js");

// --- helpers ----------------------------------------------------------------

// Every { key: "…" } inside the YouTube card's definition on the settings page.
function settingsKeys() {
  const start = OPTIONS.indexOf("const SITE_CLEANUP_SITES");
  const end = OPTIONS.indexOf("function scRow");
  assert.ok(start > 0 && end > start, "SITE_CLEANUP_SITES not found in options.js");
  const block = OPTIONS.slice(start, end);
  return [...block.matchAll(/\{ key: "(\w+)"/g)].map((m) => m[1]);
}

// The stylesheet as a flat list of { selector, body }, comments stripped.
function cssRules() {
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  for (const m of bare.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    for (const sel of m[1].split(",")) rules.push({ selector: sel.trim(), body: m[2] });
  }
  return rules;
}

// A fake clock that the script's Date.now / setTimeout / clearTimeout all read.
function makeClock() {
  let now = 1_000_000;
  let seq = 0;
  const timers = new Map();
  return {
    Date: { now: () => now },
    setTimeout: (fn, ms = 0) => {
      const id = ++seq;
      timers.set(id, { fn, at: now + ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    get now() {
      return now;
    },
    pending: () => timers.size,
    // Runs every timer that falls due, in order, including ones scheduled on the way.
    advance(ms, hooks = []) {
      const target = now + ms;
      for (;;) {
        let next = null;
        for (const [id, t] of timers) if (t.at <= target && (!next || t.at < next.t.at)) next = { id, t };
        const hook = hooks.find((h) => !h.done && h.at <= target && (!next || h.at <= next.t.at));
        if (hook) {
          now = Math.max(now, hook.at);
          hook.done = true;
          hook.fn();
          continue;
        }
        if (!next) break;
        timers.delete(next.id);
        now = next.t.at;
        next.t.fn();
      }
      now = target;
    },
  };
}

// The autoplay toggle as it was measured: on the page early, deaf to clicks
// until `readyAt`. `lag` delays the redraw after a click that DID land, which is
// the case where a second click too soon reads the stale "on" and undoes the
// first. `on` is the player's real setting; `state` is what the page shows, and
// assigning it is YouTube redrawing the toggle from its own state.
function makeToggle(clock, { readyAt = 0, on = true, lag = 0 } = {}) {
  let real = on;
  let shown = on;
  let showAt = 0;
  const sync = () => {
    if (clock.now >= showAt) shown = real;
  };
  const t = {
    clicks: [],
    get on() {
      return real;
    },
    get state() {
      sync();
      return String(shown);
    },
    set state(v) {
      real = shown = v === "true";
      showAt = 0;
    },
    getAttribute: (name) => (name === "aria-checked" ? t.state : null),
    click() {
      t.clicks.push(clock.now);
      if (clock.now < readyAt) return; // dropped without a trace
      sync();
      real = !real;
      showAt = clock.now + lag;
    },
  };
  return t;
}

async function load({ settings = {}, path = "/watch", toggle = null, clock = makeClock() } = {}) {
  const classes = new Set();
  const docListeners = [];
  const sandbox = {
    window: {},
    location: { pathname: path, origin: "https://www.youtube.com", replace() {} },
    chrome: {
      storage: {
        local: { get: async () => ({ siteCleanup: { youtube: settings } }) },
        onChanged: { addListener() {} },
      },
    },
    document: {
      documentElement: {
        classList: {
          toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
          remove: (c) => classes.delete(c),
        },
      },
      querySelector: (sel) => {
        if (sel === ".ytp-autonav-toggle-button") return toggle;
        if (sel === ".html5-video-player.ad-showing") return sandbox.adShowing ? {} : null;
        return null;
      },
      addEventListener: (type, fn) => docListeners.push({ type, fn }),
    },
    adShowing: false,
    __clock: clock,
  };
  sandbox.window.addEventListener = () => {};
  vm.createContext(sandbox);
  // The file reads the clock through these three names; handing them in as
  // parameters is what lets a test move time on.
  vm.runInContext(
    `(function (Date, setTimeout, clearTimeout) {\n${SOURCE}\n})(__clock.Date, __clock.setTimeout, __clock.clearTimeout)`,
    sandbox
  );
  await new Promise((r) => setImmediate(r)); // let the storage read resolve
  const fire = (type, event = {}) => {
    for (const l of docListeners) if (l.type === type) l.fn(event);
  };
  return { classes, clock, sandbox, fire };
}

// --- 1. wiring ----------------------------------------------------------------

const SCRIPT_ONLY = new Set(["disableAutoplay"]); // a click in the player, not a class

test("every YouTube switch on the settings page becomes a class the stylesheet uses", async () => {
  const keys = settingsKeys();
  assert.ok(keys.length >= 25, `expected the full YouTube card, found ${keys.length} keys`);
  const selectors = cssRules().map((r) => r.selector);

  for (const key of keys) {
    if (SCRIPT_ONLY.has(key)) continue;
    const { classes } = await load({ settings: { enabled: true, [key]: true } });
    assert.equal(classes.size, 1, `${key} should set exactly one class, set: ${[...classes]}`);
    const [cls] = classes;
    assert.ok(
      selectors.some((s) => s.startsWith(`html.${cls} `)),
      `${key} sets "${cls}", but no rule in youtube-clean.css is scoped to it`
    );
  }
});

test("nothing is applied while the master switch is off", async () => {
  const all = Object.fromEntries(settingsKeys().map((k) => [k, true]));
  const { classes } = await load({ settings: { ...all, enabled: false } });
  assert.equal(classes.size, 0);
});

test("the sidebar switches sit together, Explore among them", () => {
  const start = OPTIONS.indexOf('title: "Sidebar"');
  assert.ok(start > 0, "no Sidebar group on the settings page");
  const group = OPTIONS.slice(start, OPTIONS.indexOf("]", start));
  for (const key of ["hideExplore", "hideSigninPromo", "hideMoreFromYouTube", "hideSidebarFooter"]) {
    assert.ok(group.includes(`key: "${key}"`), `${key} is not in the Sidebar group`);
  }
  // …and only there: a key listed twice would render two switches for one setting.
  for (const key of settingsKeys()) {
    assert.equal(settingsKeys().filter((k) => k === key).length, 1, `${key} appears twice`);
  }
});

// --- the sidebar rules -----------------------------------------------------------

test("the sign-in box goes, the top bar's Sign in button does not", () => {
  const rules = cssRules().filter((r) => r.selector.startsWith("html.sv-yt-hide-signin "));
  assert.deepEqual(rules.map((r) => r.selector), ["html.sv-yt-hide-signin ytd-guide-signin-promo-renderer"]);
  for (const r of rules) assert.ok(!/masthead|topbar|#end|#buttons/.test(r.selector));
});

test("“More from YouTube” is found by its off-site links, never by Explore's", () => {
  const rules = cssRules().filter((r) => r.selector.startsWith("html.sv-yt-hide-more-yt "));
  assert.ok(rules.length >= 2);
  for (const r of rules) {
    assert.match(r.selector, /^html\.sv-yt-hide-more-yt ytd-guide-section-renderer:has\(a\[href/);
    // Explore's own "Music" entry is a /channel/ link on youtube.com, so a rule
    // keyed on anything on-site risks taking the Explore section with it.
    assert.match(r.selector, /music\.youtube\.com|youtubekids\.com|studio\.youtube\.com/);
  }
});

// --- 3. the end-card scoping decisions ---------------------------------------

test("the new player's end-of-video grid is hidden only once the video has ended", () => {
  const grid = cssRules().filter((r) => r.selector.includes("ytp-fullscreen-grid"));
  assert.ok(grid.length > 0, "the end-card rule no longer covers the new player's grid");
  for (const r of grid) {
    assert.ok(
      r.selector.includes(".ended-mode"),
      `"${r.selector}" would also hide the fullscreen "more videos" panel while a video plays`
    );
  }
});

test("the end-card rule still covers the creator's tiles and the old player's wall", () => {
  const sels = cssRules()
    .filter((r) => r.selector.startsWith("html.sv-yt-no-endcards "))
    .map((r) => r.selector);
  for (const part of [".ytp-ce-element", ".ytp-ce-hide-button-container", ".ytp-endscreen-content"]) {
    assert.ok(sels.some((s) => s.includes(part)), `no end-card rule for ${part}`);
  }
});

test("the “Up next” countdown is never hidden — it belongs to autoplay", () => {
  for (const r of cssRules()) {
    assert.ok(!/autonav/.test(r.selector), `"${r.selector}" hides part of autoplay's countdown`);
  }
});

// --- 2. turning autoplay off -----------------------------------------------------

test("keeps clicking until the player is listening, and autoplay ends up off", async () => {
  const clock = makeClock();
  const start = clock.now;
  // On the page from the start, deaf until 3s in — as measured.
  const toggle = makeToggle(clock, { readyAt: start + 3000 });
  const { fire } = await load({ settings: { enabled: true, disableAutoplay: true }, toggle, clock });
  fire("yt-navigate-finish"); // YouTube fires this on the first load too

  clock.advance(8000);
  assert.equal(toggle.state, "false", "autoplay was left on");
  assert.ok(toggle.clicks.length >= 2, "should have needed more than the first, dropped, click");
  assert.ok(toggle.clicks.some((t) => t >= start + 3000), "no click after the player was ready");
});

test("survives YouTube redrawing the toggle as on after a click has landed", async () => {
  const clock = makeClock();
  const start = clock.now;
  const toggle = makeToggle(clock, { readyAt: start });
  const { fire } = await load({ settings: { enabled: true, disableAutoplay: true }, toggle, clock });
  fire("yt-navigate-finish");

  // The player re-applies its own state from the watch-next response, 4s in.
  clock.advance(10000, [{ at: start + 4000, fn: () => (toggle.state = "true") }]);
  assert.equal(toggle.state, "false");
});

test("the startup read and the navigation event never double-click it back on", async () => {
  const clock = makeClock();
  // Live from the start, but slow to redraw: the navigation event 200ms later
  // still sees "on", and clicking again would switch autoplay straight back on.
  const toggle = makeToggle(clock, { readyAt: 0, lag: 300 });
  const { fire } = await load({ settings: { enabled: true, disableAutoplay: true }, toggle, clock });
  clock.advance(200);
  assert.equal(toggle.state, "true", "the fake should still be showing the stale state here");
  fire("yt-navigate-finish");
  clock.advance(5000);

  assert.equal(toggle.on, false, "autoplay ended up on");
  assert.equal(toggle.clicks.length, 1);
});

test("never clicks within the gap of its own last click", async () => {
  const clock = makeClock();
  const toggle = makeToggle(clock, { readyAt: Infinity }); // never listens
  const { fire } = await load({ settings: { enabled: true, disableAutoplay: true }, toggle, clock });
  fire("yt-navigate-finish");
  clock.advance(20000);

  for (let i = 1; i < toggle.clicks.length; i++) {
    assert.ok(toggle.clicks[i] - toggle.clicks[i - 1] >= 1500, `clicks ${toggle.clicks[i] - toggle.clicks[i - 1]}ms apart`);
  }
});

test("someone switching autoplay back on by hand is left alone", async () => {
  const clock = makeClock();
  const toggle = makeToggle(clock, { readyAt: 0 });
  const { fire } = await load({ settings: { enabled: true, disableAutoplay: true }, toggle, clock });
  clock.advance(2000);
  assert.equal(toggle.state, "false");

  // A real click on the toggle, turning it back on.
  toggle.state = "true";
  fire("click", { isTrusted: true, target: { closest: (s) => (s === ".ytp-autonav-toggle" ? {} : null) } });
  const clicks = toggle.clicks.length;
  clock.advance(15000);

  assert.equal(toggle.state, "true");
  assert.equal(toggle.clicks.length, clicks, "Sieve switched it off again");
});

test("its own clicks do not count as the user's", async () => {
  const clock = makeClock();
  const toggle = makeToggle(clock, { readyAt: 0 });
  const { fire } = await load({ settings: { enabled: true, disableAutoplay: true }, toggle, clock });
  // A script-dispatched click on the toggle must not end the watch.
  fire("click", { isTrusted: false, target: { closest: () => ({}) } });
  clock.advance(1000, [{ at: clock.now + 500, fn: () => (toggle.state = "true") }]);
  clock.advance(4000);
  assert.equal(toggle.state, "false");
});

test("stops looking after the window, and an advert holds the window open", async () => {
  const clock = makeClock();
  const toggle = makeToggle(clock, { readyAt: 0, on: false });
  const { fire } = await load({ settings: { enabled: true, disableAutoplay: true }, toggle, clock });
  fire("yt-navigate-finish");
  clock.advance(21000);
  assert.equal(clock.pending(), 0, "still polling after the window closed");

  // Same again with a 30-second pre-roll: still watching when it ends.
  const clock2 = makeClock();
  const t2 = makeToggle(clock2, { readyAt: 0, on: false });
  const second = await load({ settings: { enabled: true, disableAutoplay: true }, toggle: t2, clock: clock2 });
  second.sandbox.adShowing = true;
  second.fire("yt-navigate-finish");
  clock2.advance(30000);
  second.sandbox.adShowing = false;
  t2.state = "true"; // the video proper starts with autoplay on
  clock2.advance(3000);
  assert.equal(t2.state, "false", "gave up during the advert");
  clock2.advance(25000);
  assert.equal(clock2.pending(), 0);
});

test("does nothing off the watch page, or with the switch off", async () => {
  for (const opts of [
    { path: "/", settings: { enabled: true, disableAutoplay: true } },
    { path: "/watch", settings: { enabled: true, disableAutoplay: false } },
    { path: "/watch", settings: { enabled: false, disableAutoplay: true } },
  ]) {
    const clock = makeClock();
    const toggle = makeToggle(clock, { readyAt: 0 });
    const { fire } = await load({ ...opts, toggle, clock });
    fire("yt-navigate-finish");
    clock.advance(25000);
    assert.equal(toggle.clicks.length, 0, JSON.stringify(opts));
    assert.equal(clock.pending(), 0);
  }
});

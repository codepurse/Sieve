// test/usage-tracker-test.mjs
// Sieve — tests for background/usage-tracker.js.
//
// The tracker is the part of Usage Insights that can be wrong without looking
// wrong: it decides what counts as attention. These drive it through a mocked
// browser — focus changes, tab switches, idleness, a suspended machine — and
// check what ends up in the store.
//
//   node --test test/usage-tracker-test.mjs
//
// Date.now is stubbed so time can be moved deliberately instead of waited out.

import test from "node:test";
import assert from "node:assert/strict";

const MIN = 60000;

// --- controllable clock ---------------------------------------------------
// Every test starts from the same wall-clock time, so one that runs the clock
// forward for hours cannot push the next one over midnight and have it read the
// wrong day back out of the store.
const CLOCK_START = new Date(2026, 7, 27, 9, 0, 0).getTime();
let nowMs = CLOCK_START;
const realNow = Date.now;
Date.now = () => nowMs;
function advance(ms) {
  nowMs += ms;
}

// --- mock browser ---------------------------------------------------------
const local = new Map();
const session = new Map();
const listeners = {
  tabActivated: [], tabUpdated: [], tabRemoved: [],
  focusChanged: [], idleChanged: [], alarm: [], storageChanged: [],
  startup: [], installed: [], message: [],
};
const alarms = new Map();

// What the mocked browser currently looks like. lastInputTs is what makes the
// idle mock honest: chrome.idle.queryState(n) answers "active" only if the user
// touched the machine within the last n seconds, so the tracker's two different
// questions (away for four minutes? touched in the last minute?) get two
// different answers, exactly as they would in Chrome.
const world = {
  windowFocused: true,
  windowId: 1,
  activeTab: { id: 10, url: "https://www.youtube.com/watch?v=abc", active: true },
  lastInputTs: 0,
  locked: false,
};

function area(map) {
  return {
    async get(defaults) {
      if (typeof defaults === "string") {
        return { [defaults]: map.get(defaults) };
      }
      const out = {};
      for (const [key, fallback] of Object.entries(defaults || {})) {
        out[key] = map.has(key) ? structuredClone(map.get(key)) : fallback;
      }
      return out;
    },
    async set(patch) {
      const changes = {};
      for (const [key, value] of Object.entries(patch)) {
        changes[key] = { oldValue: map.get(key), newValue: value };
        map.set(key, structuredClone(value));
      }
      return changes;
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

const localArea = area(local);

globalThis.chrome = {
  storage: {
    local: {
      ...localArea,
      // Writes to storage.local notify listeners, the way the real one does —
      // this is how the tracker learns the feature was switched on.
      async set(patch) {
        const changes = await localArea.set(patch);
        for (const fn of listeners.storageChanged) fn(changes, "local");
      },
    },
    session: area(session),
    onChanged: { addListener: (fn) => listeners.storageChanged.push(fn) },
  },
  alarms: {
    create: (name, info) => alarms.set(name, info),
    clear: (name) => alarms.delete(name),
    onAlarm: { addListener: (fn) => listeners.alarm.push(fn) },
  },
  tabs: {
    async query({ windowId }) {
      if (!world.windowFocused || windowId !== world.windowId) return [];
      return world.activeTab ? [world.activeTab] : [];
    },
    onActivated: { addListener: (fn) => listeners.tabActivated.push(fn) },
    onUpdated: { addListener: (fn) => listeners.tabUpdated.push(fn) },
    onRemoved: { addListener: (fn) => listeners.tabRemoved.push(fn) },
  },
  windows: {
    WINDOW_ID_NONE: -1,
    async getLastFocused() {
      return { id: world.windowId, focused: world.windowFocused };
    },
    onFocusChanged: { addListener: (fn) => listeners.focusChanged.push(fn) },
  },
  idle: {
    setDetectionInterval() {},
    async queryState(seconds) {
      if (world.locked) return "locked";
      return nowMs - world.lastInputTs < seconds * 1000 ? "active" : "idle";
    },
    onStateChanged: { addListener: (fn) => listeners.idleChanged.push(fn) },
  },
  runtime: {
    onStartup: { addListener: (fn) => listeners.startup.push(fn) },
    onInstalled: { addListener: (fn) => listeners.installed.push(fn) },
    onMessage: { addListener: (fn) => listeners.message.push(fn) },
  },
};

// Let the tracker's promise chains drain. Everything it does is microtask or
// resolved-promise work, so a handful of macrotask turns is plenty.
async function settle(turns = 8) {
  for (let i = 0; i < turns; i++) await new Promise((r) => setTimeout(r, 0));
}

const HEARTBEAT = "sieveUsageHeartbeat";

async function fire(list, ...args) {
  for (const fn of list) fn(...args);
  await settle();
}

async function heartbeat() {
  await fire(listeners.alarm, { name: HEARTBEAT });
}

function usage() {
  return local.get("sieveUsage") || {};
}

function todayRow() {
  const d = new Date(nowMs);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return usage()[key] || { t: 0, d: {}, h: [] };
}

async function enable() {
  await chrome.storage.local.set({ usageEnabled: true });
  await settle();
}

function resetStore() {
  local.delete("sieveUsage");
  session.clear();
}

// Put the mocked browser back to "user is here, looking at YouTube". Called at
// the START of each test rather than the end of the previous one, so a failing
// assertion cannot leave the world in a state that fails every test after it.
function resetWorld() {
  world.windowFocused = true;
  world.windowId = 1;
  world.activeTab = { id: 10, url: "https://www.youtube.com/watch?v=abc", active: true };
  world.lastInputTs = nowMs;
  world.locked = false;
}

function resetClock(ts = CLOCK_START) {
  nowMs = ts;
}

async function fresh() {
  resetStore();
  resetClock();
  resetWorld();
  await enable();
}

/**
 * Spend `minutes` actually using the browser: the clock moves a minute at a
 * time, the user keeps touching the machine, and the heartbeat fires each
 * minute exactly as the alarm does in Chrome. Advancing the clock in one jump
 * instead would look like a suspended machine, which is a different test.
 */
async function browse(minutes) {
  for (let i = 0; i < minutes; i++) {
    advance(MIN);
    world.lastInputTs = nowMs;
    await heartbeat();
  }
}

/** The same, but the user does not touch anything — reading, or already gone. */
async function linger(minutes) {
  for (let i = 0; i < minutes; i++) {
    advance(MIN);
    await heartbeat();
  }
}

// Import once; the module wires its listeners on load, like the real worker.
await import("../background/usage-tracker.js");
await settle();

// --- the off state -------------------------------------------------------

test("nothing is measured, and no heartbeat runs, while the feature is off", async () => {
  resetStore();
  resetClock();
  resetWorld();
  assert.equal(alarms.has(HEARTBEAT), false, "no heartbeat should be scheduled");
  await heartbeat(); // even if one fired anyway
  advance(10 * MIN);
  await fire(listeners.tabActivated, { tabId: 10 });
  assert.deepEqual(usage(), {}, "an off tracker must write nothing");
});

// --- the basic clock ------------------------------------------------------

test("turning it on starts the clock on the focused tab", async () => {
  await fresh();
  assert.ok(alarms.has(HEARTBEAT), "the heartbeat should be scheduled");
  const open = session.get("usageOpenSegment");
  assert.equal(open.domain, "youtube.com", "www. is stripped from the domain");
});

test("time on one site accumulates as the minutes pass", async () => {
  await fresh();
  await browse(12);
  // Banked in chunks, plus whatever is still open — a flush settles the rest.
  await fire(listeners.message, { type: "SIEVE_USAGE_FLUSH" }, {}, () => {});
  assert.equal(todayRow().d["youtube.com"], 12 * MIN);
  assert.equal(todayRow().t, 12 * MIN);
});

test("an evening is spread across the hours and days it actually covered", async () => {
  resetStore();
  resetClock(new Date(2026, 7, 27, 22, 30, 0).getTime());
  resetWorld();
  await enable();
  await browse(100); // 22:30 -> 00:10, through midnight
  await fire(listeners.message, { type: "SIEVE_USAGE_FLUSH" }, {}, () => {});

  const first = usage()["2026-08-27"];
  const second = usage()["2026-08-28"];
  assert.equal(first.h[22], 30 * MIN, "22:30-23:00 belongs to the 22:00 hour");
  assert.equal(first.h[23], 60 * MIN, "the full 23:00 hour");
  assert.equal(first.t, 90 * MIN, "the day ends at midnight, not at bedtime");
  assert.ok(second, "the minutes after midnight start a new day");
  assert.equal(second.h[0], 10 * MIN);
  assert.equal(second.t, 10 * MIN);

});

test("switching sites splits the time between them", async () => {
  await fresh();
  await browse(4);
  world.activeTab = { id: 11, url: "https://old.reddit.com/r/all", active: true };
  await fire(listeners.tabActivated, { tabId: 11 });
  await browse(6);
  await fire(listeners.message, { type: "SIEVE_USAGE_FLUSH" }, {}, () => {});

  const row = todayRow();
  assert.equal(row.d["youtube.com"], 4 * MIN);
  assert.equal(row.d["old.reddit.com"], 6 * MIN);
  assert.equal(row.t, 10 * MIN);
});

test("two tabs on the same site are one clock, not two", async () => {
  await fresh();
  await browse(5);
  // A second YouTube tab becomes active. Time must not be counted twice.
  world.activeTab = { id: 20, url: "https://www.youtube.com/feed/subscriptions", active: true };
  await fire(listeners.tabActivated, { tabId: 20 });
  await browse(5);
  await fire(listeners.message, { type: "SIEVE_USAGE_FLUSH" }, {}, () => {});
  assert.equal(todayRow().d["youtube.com"], 10 * MIN);
  assert.equal(todayRow().t, 10 * MIN);
});

// --- what must NOT count --------------------------------------------------

test("leaving the browser stops the clock", async () => {
  await fresh();
  await browse(5);

  world.windowFocused = false;
  await fire(listeners.focusChanged, chrome.windows.WINDOW_ID_NONE);
  assert.equal(session.get("usageOpenSegment"), undefined, "no segment while away");
  assert.equal(todayRow().d["youtube.com"], 5 * MIN, "the time up to leaving is banked");

  // An hour in another app must add nothing, even with heartbeats firing.
  await browse(60);
  assert.equal(todayRow().t, 5 * MIN, "time in another app is not screen time");

  world.windowFocused = true;
  await fire(listeners.focusChanged, 1);
  assert.ok(session.get("usageOpenSegment"), "coming back restarts the clock");
});

test("extension pages, the new-tab page and local files are not counted", async () => {
  for (const url of [
    "chrome://newtab/",
    "chrome-extension://abcdef/options/options.html",
    "about:blank",
    "file:///C:/notes.txt",
    "view-source:https://example.com",
  ]) {
    resetStore();
    resetWorld();
    world.activeTab = { id: 12, url, active: true };
    await enable();
    await browse(8);
    assert.deepEqual(usage(), {}, `${url} should not be counted`);
  }
});

test("reading a page with no input still counts as attention", async () => {
  await fresh();
  await browse(5);
  await linger(3); // three minutes reading, not touching anything
  await browse(1); // then a scroll
  await fire(listeners.message, { type: "SIEVE_USAGE_FLUSH" }, {}, () => {});
  // The whole nine minutes are the user's — this is the case a 60-second idle
  // threshold would wrongly throw away.
  assert.equal(todayRow().d["youtube.com"], 9 * MIN);
});

test("walking away is trimmed back to roughly when the input stopped", async () => {
  await fresh();
  await browse(26); // 26 minutes of real use

  // The user stops touching the machine. Chrome stays quiet for four minutes
  // and then reports idle; heartbeats keep firing throughout.
  await linger(4);
  await fire(listeners.idleChanged, "idle");

  const counted = todayRow().d["youtube.com"];
  // The design guarantee: an absence costs about a minute of over-credit, not
  // the whole four-minute idle window. Where it lands depends on where the
  // absence falls between two heartbeats, so this is a range, not an equality.
  assert.ok(
    counted >= 26 * MIN && counted <= 28 * MIN,
    `expected 26-28 minutes credited, got ${(counted / MIN).toFixed(1)}m`
  );
  assert.equal(session.get("usageOpenSegment"), undefined, "the clock is stopped");

  // Hours of idleness add nothing at all.
  await linger(120);
  assert.equal(todayRow().t, counted, "idle time is never credited");

  world.lastInputTs = nowMs;
  await fire(listeners.idleChanged, "active");
  assert.ok(session.get("usageOpenSegment"), "returning restarts the clock");
});

test("a locked screen stops the clock at once, with no grace", async () => {
  await fresh();
  await browse(10);
  world.locked = true;
  await fire(listeners.idleChanged, "locked");
  // Locking is unambiguous, so nothing is trimmed and nothing is added.
  assert.equal(todayRow().d["youtube.com"], 10 * MIN);
  await linger(30);
  assert.equal(todayRow().t, 10 * MIN);
});

test("a suspended machine cannot turn into hours of screen time", async () => {
  await fresh();
  await browse(3);
  // The lid closes: no events, no alarms, and the clock jumps eight hours.
  advance(8 * 60 * MIN);
  await heartbeat();
  const counted = todayRow().d["youtube.com"];
  assert.ok(
    counted <= 6 * MIN,
    `a suspend must not be credited, got ${(counted / MIN).toFixed(1)}m`
  );
  assert.ok(counted >= 3 * MIN, "the real minutes before the suspend are kept");
});

// --- messages from the settings page --------------------------------------

test("a flush banks the current segment so the page can render it", async () => {
  await fresh();
  await browse(2);
  assert.equal(todayRow().d["youtube.com"], undefined, "not banked yet");

  const responses = [];
  for (const fn of listeners.message) {
    fn({ type: "SIEVE_USAGE_FLUSH" }, {}, (r) => responses.push(r));
  }
  await settle();

  assert.equal(todayRow().d["youtube.com"], 2 * MIN, "the open minutes are banked");
  assert.ok(responses.some((r) => r && r.ok), "the flush should report success");
  assert.ok(session.get("usageOpenSegment"), "and the clock keeps running after it");
});

test("clearing forgets the history and the segment in progress", async () => {
  await fresh();
  await browse(20);
  assert.ok(todayRow().t > 0);

  await browse(2); // time in an open segment, which must not survive either
  for (const fn of listeners.message) {
    fn({ type: "SIEVE_USAGE_CLEAR" }, {}, () => {});
  }
  await settle();

  assert.deepEqual(usage(), {}, "the history should be gone");
  await heartbeat();
  assert.equal(todayRow().t, 0, "and the pre-clear segment must not come back");
});

// --- turning it off -------------------------------------------------------

test("turning it off banks what was measured and then stops entirely", async () => {
  await fresh();
  await browse(9);

  await chrome.storage.local.set({ usageEnabled: false });
  await settle();

  assert.equal(todayRow().d["youtube.com"], 9 * MIN, "measured time is kept, not discarded");
  assert.equal(alarms.has(HEARTBEAT), false, "the heartbeat is cancelled");
  assert.equal(session.get("usageOpenSegment"), undefined, "and the clock is stopped");

  await browse(45);
  assert.equal(todayRow().t, 9 * MIN, "nothing is added once it is off");
});

test.after(() => {
  Date.now = realNow;
});

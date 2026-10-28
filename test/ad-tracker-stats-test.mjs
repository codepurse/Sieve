// test/ad-tracker-stats-test.mjs
// Sieve — tests for the match counter in background/ad-tracker-stats.js.
//
//   node --test test/
//
// WHY THIS FILE EXISTS
//
// getMatchedRules hands back a WINDOW of recent history, not a queue: the same
// match is returned on every poll until it ages out, and a match made inside a
// tab that is still open is returned for as long as that tab lives. So the
// counter's whole job is deciding what it has not already seen, and the failure
// modes are both silent and both bad — a cursor that is too eager loses counts,
// one that is too generous inflates them into fiction. Neither shows up as an
// error anywhere; the dashboard just quietly reports a wrong number.
//
// The tie case is the one that motivated the design and is the one to protect: a
// page load blocks thirty ad requests in the same millisecond, so timestamp ties
// are the NORMAL case here rather than a rare edge, and a naive "newest timestamp
// I have seen" cursor drops every tied match after the first.
//
// Until 1.5.1 there were two bands, trackers (180000-189999) and ad networks
// (190000-199999), and most of these cases were written against the tracker
// band. Tracker blocking is gone; the cases moved to the ad band unchanged, and
// the old band is now pinned as NOT counted.

import test from "node:test";
import assert from "node:assert/strict";

// ad-tracker-stats.js imports ad-tracker-blocker.js, and both register chrome
// listeners at import time — so a chrome object has to exist before either
// loads. The pure counting functions take their inputs as arguments; the poll
// and the alarm read through this, which is therefore a working fake rather than
// a set of stubs: real storage, a scriptable getMatchedRules, and a record of
// what was asked of chrome.alarms.
const fakeArea = (backing) => ({
  get: async (defaults) => {
    if (defaults == null) return { ...backing };
    if (typeof defaults === "string") return { [defaults]: backing[defaults] };
    const out = {};
    for (const [k, v] of Object.entries(defaults)) out[k] = k in backing ? backing[k] : v;
    return out;
  },
  set: async (obj) => Object.assign(backing, obj),
  remove: async (key) => {
    delete backing[key];
  },
});

const local = {};
const session = {};
const alarmCalls = { created: [], cleared: [] };
let nextMatches = [];
let matchesThrow = null;

globalThis.chrome = {
  runtime: {
    onInstalled: { addListener() {} },
    onStartup: { addListener() {} },
    getURL: (p) => p,
  },
  storage: {
    local: fakeArea(local),
    session: fakeArea(session),
    onChanged: { addListener() {} },
  },
  alarms: {
    create: (name, opts) => alarmCalls.created.push({ name, ...opts }),
    clear: async (name) => alarmCalls.cleared.push(name),
    onAlarm: { addListener() {} },
  },
  declarativeNetRequest: {
    getDynamicRules: async () => [],
    updateDynamicRules: async () => {},
    getMatchedRules: async () => {
      if (matchesThrow) throw matchesThrow;
      return { rulesMatchedInfo: nextMatches };
    },
  },
};

// Wipe every scrap of state between tests — the module keeps a failure counter,
// and the stats store and the cursor both live in the fakes above.
function reset() {
  for (const k of Object.keys(local)) delete local[k];
  for (const k of Object.keys(session)) delete session[k];
  alarmCalls.created.length = 0;
  alarmCalls.cleared.length = 0;
  nextMatches = [];
  matchesThrow = null;
}

const todayKey = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};
const todayStats = () => (local.sieveStats || {})[todayKey()] || {};

const {
  countNewMatches,
  statsKeyForRuleId,
  STATS_KEY_BY_GROUP,
  pollAdTrackerMatches,
  applyAdTrackerStatsAlarm,
} = await import("../background/ad-tracker-stats.js");

// Build a MatchedRuleInfo the way Chrome shapes it.
const hit = (ruleId, timeStamp) => ({ rule: { ruleId, rulesetId: "_dynamic" }, timeStamp });

const AD_RULE = 190007; //       ad networks band: 190000–199999
const STUB_RULE = 199901; //     a neutered stub, top of the same band
const OLD_TRACKER_RULE = 180003; // the retired tracker band: 180000–189999

// ---------------------------------------------------------------------------
// Band attribution
// ---------------------------------------------------------------------------

test("rule ids are attributed to the band they were issued from", () => {
  assert.equal(statsKeyForRuleId(190000), "adNetworks");
  assert.equal(statsKeyForRuleId(199999), "adNetworks");
});

test("the neutered-stub rules sit inside the ad band, and count", () => {
  // Stubs take ids from idStart + 9900, at the top of the 10000-wide band. A
  // stub is a block by another name — the ad script is replaced with an empty
  // one — so it must count.
  assert.equal(statsKeyForRuleId(199900), "adNetworks");
});

test("the retired tracker band is not counted", () => {
  // background/retired-tracker-blocker.js removes those rules on update, but
  // until it has run a leftover rule can still match. It is not ad blocking, and
  // there is no Dashboard row for it any more.
  for (const id of [180000, 180003, 185000, 189900, 189999]) {
    assert.equal(statsKeyForRuleId(id), null, `rule ${id} should not be counted`);
  }
});

test("rules belonging to other tiers are not counted", () => {
  // Every band below this one belongs to another blocker, and those already
  // record their own blocks from pages/blocked.js. Counting them here would
  // double them.
  for (const id of [0, 9999, 20000, 30000, 59999, 139999, 179999, 200000, 250000]) {
    assert.equal(statsKeyForRuleId(id), null, `rule ${id} should not be ours`);
  }
});

test("a malformed rule id is ignored rather than guessed at", () => {
  assert.equal(statsKeyForRuleId(NaN), null);
  assert.equal(statsKeyForRuleId(undefined), null);
  assert.equal(statsKeyForRuleId("190001"), null);
});

test("the ad group maps to its own dashboard key, and nothing maps to the tracker one", () => {
  assert.deepEqual(STATS_KEY_BY_GROUP, { ads: "adNetworks" });
});

// ---------------------------------------------------------------------------
// First poll
// ---------------------------------------------------------------------------

test("with no cursor, everything in the batch counts once", () => {
  const { counted, cursor } = countNewMatches(
    [hit(AD_RULE, 100), hit(AD_RULE, 101), hit(STUB_RULE, 101)],
    null
  );
  assert.deepEqual(counted, { adNetworks: 3 });
  assert.equal(cursor.ts, 101);
  assert.deepEqual(cursor.at, { adNetworks: 2 });
});

test("an empty batch counts nothing and leaves the cursor alone", () => {
  const cursor = { ts: 500, at: { adNetworks: 2 } };
  assert.deepEqual(countNewMatches([], cursor), { counted: {}, cursor });
  assert.deepEqual(countNewMatches(null, cursor), { counted: {}, cursor });
});

test("matches from other tiers are dropped before counting", () => {
  const { counted, cursor } = countNewMatches([hit(1234, 100), hit(60000, 101)], null);
  assert.deepEqual(counted, {});
  assert.equal(cursor, null);
});

test("a leftover tracker match neither counts nor moves the cursor", () => {
  // If it moved the cursor, the ad matches tied on the earlier millisecond
  // would be skipped on the next poll.
  const { counted, cursor } = countNewMatches([hit(AD_RULE, 700), hit(OLD_TRACKER_RULE, 900)], null);
  assert.deepEqual(counted, { adNetworks: 1 });
  assert.deepEqual(cursor, { ts: 700, at: { adNetworks: 1 } });
});

// ---------------------------------------------------------------------------
// Overlapping polls — the actual job
// ---------------------------------------------------------------------------

test("a match already counted is not counted again when it comes back", () => {
  const first = countNewMatches([hit(AD_RULE, 100)], null);
  assert.deepEqual(first.counted, { adNetworks: 1 });

  // The same match is returned again — its tab is still open.
  const second = countNewMatches([hit(AD_RULE, 100)], first.cursor);
  assert.deepEqual(second.counted, {});
  assert.equal(second.cursor.ts, 100);
});

test("only what is newer than the cursor counts", () => {
  const cursor = { ts: 100, at: { adNetworks: 1 } };
  const { counted } = countNewMatches(
    [hit(AD_RULE, 100), hit(AD_RULE, 140), hit(STUB_RULE, 150)],
    cursor
  );
  assert.deepEqual(counted, { adNetworks: 2 });
});

test("ties on the cursor millisecond are counted, minus what was counted before", () => {
  // THE case this design exists for. A page load blocks four ad requests in the
  // same millisecond; the poll lands after the first two are recorded.
  const first = countNewMatches([hit(AD_RULE, 700), hit(AD_RULE, 700)], null);
  assert.deepEqual(first.counted, { adNetworks: 2 });
  assert.deepEqual(first.cursor, { ts: 700, at: { adNetworks: 2 } });

  // Next poll: the same millisecond now holds four. Two are new.
  const second = countNewMatches(
    [hit(AD_RULE, 700), hit(AD_RULE, 700), hit(AD_RULE, 700), hit(AD_RULE, 700)],
    first.cursor
  );
  assert.deepEqual(second.counted, { adNetworks: 2 });
  assert.deepEqual(second.cursor, { ts: 700, at: { adNetworks: 4 } });
});

test("a boundary tally is not lost when the batch stays on the same millisecond", () => {
  // Three polls all landing on one millisecond. If the cursor took only the
  // latest batch's tally instead of the running total, poll three would re-count
  // everything poll two had already recorded.
  let cur = countNewMatches([hit(AD_RULE, 700)], null).cursor;
  const second = countNewMatches([hit(AD_RULE, 700), hit(AD_RULE, 700)], cur);
  assert.deepEqual(second.counted, { adNetworks: 1 });
  const third = countNewMatches([hit(AD_RULE, 700), hit(AD_RULE, 700)], second.cursor);
  assert.deepEqual(third.counted, {}, "nothing new on the third look");
});

test("a cursor left by 1.5.0, still tallying trackers, does not upset the count", () => {
  // The cursor lives in session storage, so one written before the update can
  // still be there after it, with an adTrackers tally on its millisecond.
  const old = { ts: 700, at: { adTrackers: 5, adNetworks: 1 } };
  const { counted } = countNewMatches([hit(AD_RULE, 700), hit(AD_RULE, 700), hit(AD_RULE, 800)], old);
  assert.deepEqual(counted, { adNetworks: 2 });
});

test("works whether or not the browser's minTimeStamp filter is inclusive", () => {
  // Chrome trims the batch with minTimeStamp; the counter must not depend on
  // whether that trim keeps the boundary millisecond or drops it.
  const cursor = { ts: 700, at: { adNetworks: 2 } };
  const inclusive = countNewMatches(
    [hit(AD_RULE, 700), hit(AD_RULE, 700), hit(AD_RULE, 900)],
    cursor
  );
  const exclusive = countNewMatches([hit(AD_RULE, 900)], cursor);
  assert.deepEqual(inclusive.counted, { adNetworks: 1 });
  assert.deepEqual(exclusive.counted, { adNetworks: 1 });
  assert.equal(inclusive.cursor.ts, 900);
  assert.equal(exclusive.cursor.ts, 900);
});

test("a burst spread over several polls is counted exactly once in total", () => {
  // The end-to-end shape, modelled the way the real API behaves: history only
  // grows, and each poll returns everything from the cursor onward that exists at
  // that moment. 1000 matches over 5 milliseconds — 200 tied on each — and the
  // polls deliberately land MID-millisecond, which is the arrangement that
  // breaks a cursor carrying only a timestamp.
  const all = [];
  for (let i = 0; i < 1000; i++) all.push(hit(AD_RULE, 1000 + Math.floor(i / 200)));

  let cursor = null;
  let total = 0;
  for (const historyLength of [150, 370, 512, 801, 1000]) {
    const existsNow = all.slice(0, historyLength);
    const batch = existsNow.filter((h) => cursor === null || h.timeStamp >= cursor.ts);
    const res = countNewMatches(batch, cursor);
    total += res.counted.adNetworks || 0;
    cursor = res.cursor;
  }
  assert.equal(total, 1000, "every match counted, none counted twice");
});

test("a poll that finds nothing new does not disturb the next one", () => {
  // The common case in real life: the alarm fires on an idle browser. An empty
  // (or unchanged) batch must leave the cursor able to keep counting ties.
  const first = countNewMatches([hit(AD_RULE, 300), hit(AD_RULE, 300)], null);
  const idle = countNewMatches([hit(AD_RULE, 300), hit(AD_RULE, 300)], first.cursor);
  assert.deepEqual(idle.counted, {});
  const later = countNewMatches(
    [hit(AD_RULE, 300), hit(AD_RULE, 300), hit(AD_RULE, 300)],
    idle.cursor
  );
  assert.deepEqual(later.counted, { adNetworks: 1 });
});

// ---------------------------------------------------------------------------
// Hostile / degenerate input
// ---------------------------------------------------------------------------

test("a batch entirely older than the cursor leaves the cursor where it is", () => {
  // A clock adjustment, or a stale window. Moving the cursor backwards here would
  // re-count the boundary on the next poll.
  const cursor = { ts: 900, at: { adNetworks: 3 } };
  const res = countNewMatches([hit(AD_RULE, 100), hit(AD_RULE, 200)], cursor);
  assert.deepEqual(res.counted, {});
  assert.deepEqual(res.cursor, cursor);
});

test("entries without a usable timestamp are skipped", () => {
  const { counted } = countNewMatches(
    [
      hit(AD_RULE, undefined),
      hit(AD_RULE, NaN),
      { rule: { ruleId: AD_RULE } },
      { timeStamp: 5 },
      null,
      hit(AD_RULE, 10),
    ],
    null
  );
  assert.deepEqual(counted, { adNetworks: 1 });
});

test("a corrupt cursor is treated as no cursor rather than throwing", () => {
  for (const bad of [{}, { ts: NaN, at: {} }, { ts: 5 }, { at: {} }]) {
    const res = countNewMatches([hit(AD_RULE, 50)], bad);
    assert.equal(typeof res.counted.adNetworks, "number");
  }
});

// ---------------------------------------------------------------------------
// The poll, end to end
//
// The arithmetic above is the hard part, but it is worth nothing if the poll
// never reaches the stats store the dashboard reads. These drive the real
// function against a working fake browser.
// ---------------------------------------------------------------------------

test("a poll records what it counted into the shared stats store", async () => {
  reset();
  nextMatches = [hit(AD_RULE, 10), hit(AD_RULE, 11), hit(STUB_RULE, 11), hit(OLD_TRACKER_RULE, 11)];
  await pollAdTrackerMatches();
  assert.deepEqual(todayStats(), { adNetworks: 3 });
});

test("polling repeatedly over the same matches does not double the totals", async () => {
  reset();
  nextMatches = [hit(AD_RULE, 10), hit(STUB_RULE, 10)];
  await pollAdTrackerMatches();
  await pollAdTrackerMatches();
  await pollAdTrackerMatches();
  assert.deepEqual(todayStats(), { adNetworks: 2 });
});

test("the totals accumulate across polls", async () => {
  reset();
  nextMatches = [hit(AD_RULE, 10)];
  await pollAdTrackerMatches();
  nextMatches = [hit(AD_RULE, 20), hit(AD_RULE, 21)];
  await pollAdTrackerMatches();
  assert.deepEqual(todayStats(), { adNetworks: 3 });
});

test("the cursor is kept in session storage, not alongside the settings", async () => {
  // It describes matched-rule history, which the browser throws away on restart.
  // Persisting it to local storage would outlive the thing it points at — and it
  // would sit in the same store as the user's settings, which it is not.
  reset();
  nextMatches = [hit(AD_RULE, 42)];
  await pollAdTrackerMatches();
  assert.equal(session.adTrackerMatchCursor.ts, 42);
  assert.equal("adTrackerMatchCursor" in local, false);
});

test("nothing is recorded when nothing of ours matched", async () => {
  reset();
  nextMatches = [hit(1234, 10), hit(60000, 11), hit(OLD_TRACKER_RULE, 12)]; // not ours
  await pollAdTrackerMatches();
  assert.equal(local.sieveStats, undefined);
});

test("a browser that refuses the call records nothing and does not throw", async () => {
  // Firefox without extensions.dnr.feedback. It has to degrade to zero counts,
  // not to a rejected promise inside the alarm handler.
  reset();
  matchesThrow = new Error("permission denied");
  await pollAdTrackerMatches();
  await pollAdTrackerMatches();
  assert.equal(local.sieveStats, undefined);
});

test("after repeated failures it stops polling instead of retrying forever", async () => {
  reset();
  matchesThrow = new Error("permission denied");
  for (let i = 0; i < 3; i++) await pollAdTrackerMatches();
  assert.ok(alarmCalls.cleared.includes("sieveAdTrackerStats"), "the alarm must be cancelled");
});

// ---------------------------------------------------------------------------
// Arming the alarm
// ---------------------------------------------------------------------------

test("no alarm exists while the ad blocker is off", async () => {
  reset();
  await applyAdTrackerStatsAlarm();
  assert.deepEqual(alarmCalls.created, [], "a user who never enables this pays nothing");
  assert.ok(alarmCalls.cleared.includes("sieveAdTrackerStats"));
});

test("turning the ad blocker on arms the poll", async () => {
  reset();
  local.ssAdNetworkEnabled = true;
  await applyAdTrackerStatsAlarm();
  assert.equal(alarmCalls.created.length, 1);
  assert.equal(alarmCalls.created[0].name, "sieveAdTrackerStats");
});

test("the retired tracker setting no longer arms the poll", async () => {
  // A profile whose only leftover is ssAdTrackerEnabled has nothing to count.
  reset();
  local.ssAdTrackerEnabled = true;
  await applyAdTrackerStatsAlarm();
  assert.deepEqual(alarmCalls.created, []);
});

test("the poll interval respects both the quota and the retention window", async () => {
  // getMatchedRules allows 20 calls per 10 minutes and forgets a match after 5
  // minutes. A period outside that band is a silent bug: too fast and the API
  // starts failing outright, too slow and the counts are simply short.
  reset();
  local.ssAdNetworkEnabled = true;
  await applyAdTrackerStatsAlarm();
  const period = alarmCalls.created[0].periodInMinutes;
  assert.ok(period >= 0.5, "faster than two calls a minute exceeds the quota");
  assert.ok(period <= 4, "slower than this and matches age out before they are counted");
});

test("turning the blocker off clears the cursor along with the alarm", async () => {
  reset();
  local.ssAdNetworkEnabled = true;
  nextMatches = [hit(AD_RULE, 10)];
  await pollAdTrackerMatches();
  assert.ok(session.adTrackerMatchCursor, "a cursor exists while polling");

  local.ssAdNetworkEnabled = false;
  await applyAdTrackerStatsAlarm();
  assert.equal("adTrackerMatchCursor" in session, false, "a stale cursor must not survive");
});

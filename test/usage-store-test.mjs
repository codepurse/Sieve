// test/usage-store-test.mjs
// Sieve — tests for common/usage-store.js.
//
// The tracker itself is invisible in the settings page: if a span is credited
// to the wrong hour, or a session that runs past midnight lands entirely in one
// day, the chart still draws a perfectly convincing curve of the wrong data.
// These cover the bookkeeping that no screenshot can check.
//
//   node --test test/
//
// Everything runs in local time on purpose, because that is what the buckets
// mean to the reader; constructing the fixtures with new Date(y, m, d, h) keeps
// the test correct in any timezone.

import test from "node:test";
import assert from "node:assert/strict";

// --- chrome.storage.local stub -------------------------------------------
// Installed before the module under test is imported, since it reaches for
// chrome at call time.
const backing = new Map();

globalThis.chrome = {
  storage: {
    local: {
      async get(defaults) {
        const out = {};
        for (const [key, fallback] of Object.entries(defaults || {})) {
          out[key] = backing.has(key) ? structuredClone(backing.get(key)) : fallback;
        }
        return out;
      },
      async set(patch) {
        for (const [key, value] of Object.entries(patch)) {
          backing.set(key, structuredClone(value));
        }
      },
      async remove(key) {
        backing.delete(key);
      },
    },
  },
};

const {
  splitSpan,
  addSpans,
  getUsageDays,
  mergeDays,
  rankDomains,
  pruneUsage,
  clearUsage,
  localDateStr,
  USAGE_KEY,
  OTHER_BUCKET,
} = await import("../common/usage-store.js");

function reset() {
  backing.clear();
}

const MIN = 60000;

// --- splitSpan -----------------------------------------------------------

test("a span inside one hour stays in one slice", () => {
  const start = new Date(2026, 7, 27, 14, 10).getTime();
  const slices = splitSpan(start, start + 12 * MIN);
  assert.equal(slices.length, 1);
  assert.equal(slices[0].hour, 14);
  assert.equal(slices[0].ms, 12 * MIN);
  assert.equal(slices[0].date, "2026-08-27");
});

test("a span across an hour boundary is split at the boundary", () => {
  const start = new Date(2026, 7, 27, 14, 50).getTime();
  const slices = splitSpan(start, start + 20 * MIN); // 14:50 -> 15:10
  assert.deepEqual(
    slices.map((s) => [s.hour, s.ms / MIN]),
    [[14, 10], [15, 10]]
  );
});

test("a span across midnight is split across both days", () => {
  const start = new Date(2026, 7, 27, 23, 40).getTime();
  const slices = splitSpan(start, start + 40 * MIN); // 23:40 -> 00:20
  assert.deepEqual(
    slices.map((s) => [s.date, s.hour, s.ms / MIN]),
    [
      ["2026-08-27", 23, 20],
      ["2026-08-28", 0, 20],
    ]
  );
});

test("a span covering several hours yields one slice per hour", () => {
  const start = new Date(2026, 7, 27, 9, 0).getTime();
  const slices = splitSpan(start, start + 3 * 60 * MIN);
  assert.deepEqual(slices.map((s) => s.hour), [9, 10, 11]);
  assert.equal(slices.reduce((sum, s) => sum + s.ms, 0), 3 * 60 * MIN);
});

test("a backwards or empty span yields nothing", () => {
  const now = Date.now();
  assert.deepEqual(splitSpan(now, now), []);
  assert.deepEqual(splitSpan(now, now - 5 * MIN), []);
});

// --- addSpans ------------------------------------------------------------

test("a recorded span lands in the day, the hour and the domain alike", async () => {
  reset();
  const start = new Date(2026, 7, 27, 20, 0).getTime();
  await addSpans([{ domain: "youtube.com", startTs: start, endTs: start + 25 * MIN }]);

  const day = backing.get(USAGE_KEY)["2026-08-27"];
  assert.equal(day.t, 25 * MIN);
  assert.equal(day.h[20], 25 * MIN);
  assert.equal(day.d["youtube.com"], 25 * MIN);
});

test("totals stay internally consistent across many spans", async () => {
  reset();
  const base = new Date(2026, 7, 27, 8, 0).getTime();
  const spans = [];
  for (let i = 0; i < 40; i++) {
    const start = base + i * 17 * MIN;
    spans.push({
      domain: `site${i % 5}.com`,
      startTs: start,
      endTs: start + 11 * MIN,
    });
  }
  await addSpans(spans);

  const day = backing.get(USAGE_KEY)["2026-08-27"];
  const hourSum = day.h.reduce((a, b) => a + b, 0);
  const domainSum = Object.values(day.d).reduce((a, b) => a + b, 0);
  // The day total, the hourly rhythm and the site split are three views of one
  // number; if they can disagree, the report can contradict itself on screen.
  assert.equal(day.t, 40 * 11 * MIN);
  assert.equal(hourSum, day.t);
  assert.equal(domainSum, day.t);
});

test("repeated spans on one domain accumulate rather than overwrite", async () => {
  reset();
  const start = new Date(2026, 7, 27, 11, 0).getTime();
  await addSpans([{ domain: "reddit.com", startTs: start, endTs: start + 5 * MIN }]);
  await addSpans([
    { domain: "reddit.com", startTs: start + 10 * MIN, endTs: start + 17 * MIN },
  ]);
  const day = backing.get(USAGE_KEY)["2026-08-27"];
  assert.equal(day.d["reddit.com"], 12 * MIN);
});

test("concurrent writes do not lose increments", async () => {
  reset();
  const start = new Date(2026, 7, 27, 12, 0).getTime();
  // Fired together, deliberately not awaited in turn: this is the tab-switch
  // flush racing the heartbeat flush.
  await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      addSpans([
        { domain: "github.com", startTs: start + i * MIN, endTs: start + i * MIN + MIN },
      ])
    )
  );
  const day = backing.get(USAGE_KEY)["2026-08-27"];
  assert.equal(day.d["github.com"], 12 * MIN);
  assert.equal(day.t, 12 * MIN);
});

test("spans under a second are dropped as noise", async () => {
  reset();
  const start = new Date(2026, 7, 27, 12, 0).getTime();
  await addSpans([{ domain: "flicked-past.com", startTs: start, endTs: start + 400 }]);
  assert.equal(backing.get(USAGE_KEY), undefined);
});

test("a day with too many domains folds the tail into one bucket", async () => {
  reset();
  const start = new Date(2026, 7, 27, 6, 0).getTime();
  // 300 domains, descending in size, so the fold is predictable.
  const spans = Array.from({ length: 300 }, (_, i) => ({
    domain: `site${String(i).padStart(3, "0")}.com`,
    startTs: start,
    endTs: start + (300 - i) * 1000,
  }));
  await addSpans(spans);

  const day = backing.get(USAGE_KEY)["2026-08-27"];
  const keys = Object.keys(day.d);
  assert.ok(keys.length <= 250, `expected the map to be capped, got ${keys.length}`);
  assert.ok(keys.includes(OTHER_BUCKET), "the tail should be folded into a bucket");
  // Folding must not lose time: the split still adds up to the day.
  const domainSum = Object.values(day.d).reduce((a, b) => a + b, 0);
  assert.equal(domainSum, day.t);
  // The busiest survive by name.
  assert.ok(keys.includes("site000.com"));
});

// --- reading -------------------------------------------------------------

test("quiet days come back as zeroes, not gaps", async () => {
  reset();
  const start = new Date().setHours(10, 0, 0, 0);
  await addSpans([{ domain: "x.com", startTs: start, endTs: start + 30 * MIN }]);

  const days = await getUsageDays(7);
  assert.equal(days.length, 7);
  assert.equal(days[6].date, localDateStr());
  assert.equal(days[6].total, 30 * MIN);
  // A chart needs the quiet days as points on the line.
  assert.equal(days[0].total, 0);
  assert.deepEqual(days[0].hours.length, 24);
});

test("mergeDays and rankDomains agree with the rows they came from", async () => {
  reset();
  const today = new Date().setHours(9, 0, 0, 0);
  const yesterday = today - 24 * 60 * MIN;
  await addSpans([
    { domain: "a.com", startTs: today, endTs: today + 10 * MIN },
    { domain: "b.com", startTs: today + 20 * MIN, endTs: today + 50 * MIN },
    { domain: "a.com", startTs: yesterday, endTs: yesterday + 15 * MIN },
  ]);

  const merged = mergeDays(await getUsageDays(2));
  assert.equal(merged.total, 55 * MIN);
  assert.equal(merged.domains["a.com"], 25 * MIN);
  assert.equal(merged.domains["b.com"], 30 * MIN);

  const ranked = rankDomains(merged.domains);
  assert.deepEqual(ranked.map((r) => r.domain), ["b.com", "a.com"]);
  assert.deepEqual(rankDomains(merged.domains, 1).map((r) => r.domain), ["b.com"]);
});

// --- maintenance ---------------------------------------------------------

test("pruning keeps the window and drops what is older", async () => {
  reset();
  const usage = {};
  for (let offset = 0; offset < 40; offset++) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    usage[localDateStr(d)] = { t: MIN, d: { "a.com": MIN }, h: new Array(24).fill(0) };
  }
  backing.set(USAGE_KEY, usage);

  await pruneUsage(7);
  const kept = Object.keys(backing.get(USAGE_KEY));
  assert.equal(kept.length, 7, `expected 7 days, kept ${kept.length}`);
  assert.ok(kept.includes(localDateStr()), "today must survive a prune");

  const oldest = new Date();
  oldest.setDate(oldest.getDate() - 6);
  assert.ok(kept.includes(localDateStr(oldest)), "the 7th day back must survive");
});

test("an unknown retention value falls back to the default rather than wiping", async () => {
  reset();
  const usage = {};
  for (let offset = 0; offset < 40; offset++) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    usage[localDateStr(d)] = { t: MIN, d: {}, h: new Array(24).fill(0) };
  }
  backing.set(USAGE_KEY, usage);
  await pruneUsage(0); // not one of the offered choices
  assert.equal(Object.keys(backing.get(USAGE_KEY)).length, 30);
});

test("clearing forgets everything", async () => {
  reset();
  const start = Date.now() - 10 * MIN;
  await addSpans([{ domain: "a.com", startTs: start, endTs: start + 5 * MIN }]);
  await clearUsage();
  assert.equal(backing.has(USAGE_KEY), false);
  const days = await getUsageDays(7);
  assert.equal(mergeDays(days).total, 0);
});

test("a malformed stored row is read as empty instead of throwing", async () => {
  reset();
  backing.set(USAGE_KEY, {
    [localDateStr()]: { t: "nonsense", d: { "a.com": null }, h: "not an array" },
  });
  const days = await getUsageDays(1);
  assert.equal(days[0].total, 0);
  assert.deepEqual(days[0].domains, {});
  assert.equal(days[0].hours.length, 24);
});

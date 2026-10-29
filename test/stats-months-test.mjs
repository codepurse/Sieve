// test/stats-months-test.mjs
// Sieve — the month totals common/stats.js keeps as daily buckets leave its
// 30-day window, so Sieve Pro's month letter can still count a month after
// its days are gone.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";

globalThis.chrome = { storage: { local: {} }, runtime: {}, alarms: {} };
const { foldIntoMonths } = await import("../common/stats.js");

test("days fold into their month and add to what is there", () => {
  const months = foldIntoMonths(
    { "2026-09": { gambling: 2 } },
    {
      "2026-09-29": { gambling: 3, ads: 40 },
      "2026-09-30": { gambling: 1 },
      "2026-10-01": { dating: 2 },
    },
    new Date(2026, 10, 3),
  );
  assert.deepEqual(months, {
    "2026-09": { gambling: 6, ads: 40 },
    "2026-10": { dating: 2 },
  });
});

test("junk is ignored, and only about two years of months are kept", () => {
  const months = foldIntoMonths(
    { "2024-01": { gambling: 5 }, nonsense: { a: 1 }, "2026-01": "x" },
    { "2026-02-01": { gambling: -1, dating: "2", scam: NaN }, bad: { a: 1 } },
    new Date(2026, 1, 10),
  );
  assert.deepEqual(months, { "2026-02": { dating: 2 } });
});

test("the input is not changed", () => {
  const before = { "2026-09": { gambling: 2 } };
  foldIntoMonths(before, { "2026-09-01": { gambling: 1 } }, new Date(2026, 9, 1));
  assert.deepEqual(before, { "2026-09": { gambling: 2 } });
});

// test/attempts-test.mjs
// Sieve — tests for common/attempts.js, the record of when the block page
// stopped a habit.
//
// What could go wrong here goes wrong quietly: a reload counted as a second
// urge, a scam block counted as one, a burst of block pages losing entries, a
// record that grows for ever. Sieve Pro's insights read this record, so a
// wrong entry becomes a wrong "your hardest hours" months later.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";

const backing = new Map();
let listener = null;

globalThis.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://sieve/${path}`,
    onMessage: { addListener: (fn) => { listener = fn; } },
  },
  storage: {
    local: {
      async get(arg) {
        const keys = typeof arg === "string" ? [arg] : Array.isArray(arg) ? arg : Object.keys(arg || {});
        const out = {};
        for (const key of keys) if (backing.has(key)) out[key] = structuredClone(backing.get(key));
        return out;
      },
      async set(patch) {
        // Slow writes, so overlapping read-modify-writes would lose entries.
        await new Promise((r) => setTimeout(r, 2));
        for (const [k, v] of Object.entries(patch)) backing.set(k, structuredClone(v));
      },
    },
  },
};
globalThis.window = globalThis;

await import("../common/attempts.js");
const A = globalThis.SieveAttempts;

const T0 = Date.UTC(2026, 9, 1, 12);
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

test("only habits are recorded; threats never are", () => {
  assert.equal(A.add(null, "gambling", T0).added, true);
  for (const threat of ["scam", "malware", "phishing", "ads", "piracy", null, undefined, ""]) {
    assert.equal(A.add(null, threat, T0).added, false, String(threat));
  }
});

test("a repeat of the same habit within five minutes is the same attempt", () => {
  let r = A.add(null, "gambling", T0).record;
  assert.equal(A.add(r, "gambling", T0 + 4 * MIN).added, false);
  r = A.add(r, "gambling", T0 + 5 * MIN).record;
  assert.equal(r.a.length, 2);
  // A different habit inside the window is its own attempt.
  const other = A.add(r, "dating", T0 + 6 * MIN);
  assert.equal(other.added, true);
  // and does not hide a repeat of the first behind it
  assert.equal(A.add(other.record, "gambling", T0 + 7 * MIN).added, false);
});

test("the record keeps about a year, and at most MAX entries", () => {
  let r = A.add(null, "gambling", T0 - (A.KEEP_DAYS + 1) * DAY).record;
  r = A.add(r, "gambling", T0).record;
  assert.deepEqual(r.a.map((e) => e[0]), [T0]);
  const many = { since: T0, a: Array.from({ length: A.MAX + 5 }, (_, i) => [T0 + i * 10 * MIN, "dating"]) };
  const last = T0 + (A.MAX + 5) * 10 * MIN;
  const out = A.add(many, "dating", last).record;
  assert.equal(out.a.length, A.MAX);
  assert.equal(out.a[out.a.length - 1][0], last);
});

test("normalize drops junk, sorts, and starts the record at its first entry", () => {
  const n = A.normalize({ since: T0, a: [[T0 - DAY, "trading"], [T0 + 1, "nope"], ["x", "dating"], [T0 + 2, "dating"]] });
  assert.deepEqual(n.a, [[T0 - DAY, "trading"], [T0 + 2, "dating"]]);
  assert.equal(n.since, T0 - DAY);
  assert.deepEqual(A.normalize(undefined), { v: 1, since: null, a: [] });
});

test("between picks a window, and optionally some categories", () => {
  const r = { a: [[T0, "gambling"], [T0 + DAY, "dating"], [T0 + 2 * DAY, "prediction-markets"]] };
  assert.equal(A.between(r, T0, T0 + 3 * DAY).length, 3);
  assert.deepEqual(A.between(r, T0, T0 + 3 * DAY, ["gambling", "prediction-markets"]).map((e) => e[1]),
    ["gambling", "prediction-markets"]);
  assert.equal(A.between(r, T0 + 1, T0 + DAY).length, 0);
});

test("only the block page can write, and a burst of pages loses nothing", async () => {
  backing.clear();
  A.installListener();
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(backing.get(A.KEY).since > 0, "the record starts counting when the worker starts");

  const send = (category, url) =>
    new Promise((resolve) => {
      const handled = listener({ type: A.MESSAGE, category }, { url }, resolve);
      if (!handled) resolve(null);
    });
  assert.equal(await send("gambling", "chrome-extension://sieve/options/options.html"), null);
  assert.equal(await send("gambling", "https://evil.example/pages/blocked.html"), null);

  const page = "chrome-extension://sieve/pages/blocked.html?category=";
  const answers = await Promise.all(
    ["gambling", "dating", "trading", "ai-chatbots", "custom-blocked"].map((c) => send(c, page + c)),
  );
  assert.ok(answers.every((a) => a && a.ok && a.added));
  assert.equal(backing.get(A.KEY).a.length, 5);
  assert.equal(listener({ type: "SOMETHING_ELSE" }, { url: page }, () => {}), false);
});

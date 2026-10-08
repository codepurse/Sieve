// test/cooloff-test.mjs
// Sieve — tests for common/cooloff.js.
//
// The cool-off is a commitment device, so its failures are quiet ones: a
// request keyed slightly differently in the popup never unlocks in the settings
// page, a second click restarts a clock someone has already waited out, an old
// request lingers and pre-unlocks a change weeks later. None of that shows in a
// screenshot. The dialog itself is checked in a real browser; this covers the
// bookkeeping underneath it.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";

// --- chrome.storage.local stub -------------------------------------------
// Installed before the module under test is loaded, since it reaches for
// chrome at call time. Accepts the three argument shapes the module uses:
// a single key, and the object-of-defaults form.
const backing = new Map();

function keysOf(arg) {
  if (arg == null) return [...backing.keys()];
  if (typeof arg === "string") return [arg];
  if (Array.isArray(arg)) return arg;
  return Object.keys(arg);
}

globalThis.chrome = {
  storage: {
    local: {
      async get(arg) {
        const out = {};
        for (const key of keysOf(arg)) {
          if (backing.has(key)) out[key] = structuredClone(backing.get(key));
          else if (arg && typeof arg === "object" && !Array.isArray(arg)) out[key] = arg[key];
        }
        return out;
      },
      async set(patch) {
        for (const [key, value] of Object.entries(patch)) backing.set(key, structuredClone(value));
      },
      async remove(arg) {
        for (const key of keysOf(arg)) backing.delete(key);
      },
    },
  },
};

// The module is a classic script that installs itself on window.
globalThis.window = globalThis;
await import("../common/cooloff.js");
const CO = globalThis.SieveCooloff;

const HOUR = 3600000;
const T0 = Date.UTC(2026, 9, 8, 2, 0, 0); // a fixed "now"; the module takes it as an argument

function reset() {
  backing.clear();
}

test("config: anything but the offered waits reads as off", () => {
  assert.deepEqual(CO.normalizeConfig(undefined), { hours: 0 });
  assert.deepEqual(CO.normalizeConfig({ hours: 5 }), { hours: 0 });
  assert.deepEqual(CO.normalizeConfig({ hours: -24 }), { hours: 0 });
  assert.deepEqual(CO.normalizeConfig({ hours: "72" }), { hours: 72 });
  for (const hours of CO.DELAYS) assert.deepEqual(CO.normalizeConfig({ hours }), { hours });
});

test("with no cool-off set, nothing is required", async () => {
  reset();
  const info = await CO.check("Turn off the Gambling Blocker", T0);
  assert.equal(info.required, false);
  assert.equal(info.state, "none");
});

test("a request waits, unlocks, then lapses — on the clock alone", async () => {
  reset();
  await CO.setConfig({ hours: 24 });
  const action = "Turn off the Gambling Blocker";

  assert.equal((await CO.check(action, T0)).state, "none");

  const req = await CO.request(action, T0);
  assert.equal(req.readyAt, T0 + 24 * HOUR);
  assert.equal(req.expiresAt, T0 + 48 * HOUR);
  assert.equal(req.action, action);

  assert.equal((await CO.check(action, T0 + 1 * HOUR)).state, "waiting");
  assert.equal((await CO.check(action, T0 + 24 * HOUR - 1)).state, "waiting");
  assert.equal((await CO.check(action, T0 + 24 * HOUR)).state, "ready");
  assert.equal((await CO.check(action, T0 + 48 * HOUR - 1)).state, "ready");

  // Lapsed: reads as never asked, and is dropped from storage as it is found.
  assert.equal((await CO.check(action, T0 + 48 * HOUR)).state, "none");
  assert.deepEqual(backing.get(CO.REQUESTS_KEY), []);
});

test("the popup and the settings page name a change the same way", async () => {
  reset();
  await CO.setConfig({ hours: 1 });
  await CO.request("Turn off  the Dark Pattern Blocker ", T0);
  const info = await CO.check("turn off the dark pattern blocker", T0 + HOUR);
  assert.equal(info.state, "ready");
});

test("asking again does not restart a running clock", async () => {
  reset();
  await CO.setConfig({ hours: 24 });
  const first = await CO.request("Allow example.com and stop blocking it", T0);
  const again = await CO.request("Allow example.com and stop blocking it", T0 + 20 * HOUR);
  assert.equal(again.readyAt, first.readyAt);
  assert.equal((await CO.listRequests(T0 + 20 * HOUR)).length, 1);
});

test("one request unlocks that change and nothing else", async () => {
  reset();
  await CO.setConfig({ hours: 1 });
  await CO.request("Allow example.com and stop blocking it", T0);
  const later = T0 + 2 * HOUR;
  assert.equal((await CO.check("Allow example.com and stop blocking it", later)).state, "ready");
  assert.equal((await CO.check("Allow other.com and stop blocking it", later)).state, "none");
  assert.equal((await CO.check("Turn off the Gambling Blocker", later)).state, "none");
});

test("a used request is gone; doing it again waits again", async () => {
  reset();
  await CO.setConfig({ hours: 1 });
  const action = "Turn off the Gambling Blocker";
  await CO.request(action, T0);
  assert.equal((await CO.check(action, T0 + HOUR)).state, "ready");
  assert.equal(await CO.consume(action, T0 + HOUR), true);
  assert.equal((await CO.check(action, T0 + HOUR)).state, "none");
});

test("calling a request off removes it, and only it", async () => {
  reset();
  await CO.setConfig({ hours: 24 });
  await CO.request("Turn off the Gambling Blocker", T0);
  await CO.request("Remove your PIN", T0);
  assert.equal(await CO.cancel("Remove your PIN", T0), true);
  assert.equal(await CO.cancel("Remove your PIN", T0), false);
  const left = await CO.listRequests(T0);
  assert.deepEqual(left.map((r) => r.action), ["Turn off the Gambling Blocker"]);
});

test("the wait is fixed when asked: changing the setting later does not move it", async () => {
  reset();
  await CO.setConfig({ hours: 1 });
  await CO.request("Turn off the Gambling Blocker", T0);
  await CO.setConfig({ hours: 168 });
  assert.equal((await CO.check("Turn off the Gambling Blocker", T0 + HOUR)).state, "ready");
});

test("the list is soonest-first and ignores malformed entries", async () => {
  reset();
  await CO.setConfig({ hours: 24 });
  await CO.request("Turn off the Gambling Blocker", T0 + 5 * HOUR);
  await CO.request("Remove your PIN", T0);
  backing.set(CO.REQUESTS_KEY, backing.get(CO.REQUESTS_KEY).concat([null, { key: "x" }, "junk"]));
  const list = await CO.listRequests(T0 + 6 * HOUR);
  assert.deepEqual(list.map((r) => r.action), ["Remove your PIN", "Turn off the Gambling Blocker"]);
});

test("clearRequests empties the list", async () => {
  reset();
  await CO.setConfig({ hours: 24 });
  await CO.request("Remove your PIN", T0);
  await CO.clearRequests();
  assert.deepEqual(await CO.listRequests(T0), []);
});

test("durations read in minutes, hours and days, rounded up", () => {
  assert.equal(CO.formatDuration(0), "now");
  assert.equal(CO.formatDuration(-5), "now");
  assert.equal(CO.formatDuration(30 * 1000), "less than a minute");
  assert.equal(CO.formatDuration(45 * 60 * 1000), "45 min");
  assert.equal(CO.formatDuration(2 * HOUR), "2 h");
  assert.equal(CO.formatDuration(2 * HOUR + 5 * 60 * 1000), "2 h 5 min");
  // 20 h 45 min 30 s still has part of a minute to go.
  assert.equal(CO.formatDuration(20 * HOUR + 45 * 60 * 1000 + 30 * 1000), "20 h 46 min");
  assert.equal(CO.formatDuration(24 * HOUR), "1 day");
  assert.equal(CO.formatDuration(3 * 24 * HOUR + 4 * HOUR), "3 days 4 h");
});

test("the wait is named the way people say it", () => {
  assert.equal(CO.delayLabel(1), "1-hour");
  assert.equal(CO.delayLabel(24), "24-hour");
  assert.equal(CO.delayLabel(72), "3-day");
  assert.equal(CO.delayLabel(168), "7-day");
});

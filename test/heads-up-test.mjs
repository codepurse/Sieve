// test/heads-up-test.mjs
// Sieve — the heads-up before the hardest hours, in the service worker
// (background/heads-up.js). Sieve Pro works out the moments; this shows them.
//
//   node --test test/
//
// A heads-up is a warning for one moment, so the failures that matter are the
// ones that make it come at the wrong one: a day off, an hour off across a
// month or a week, shown hours late after the computer slept, or still coming
// after it was switched off or the licence lapsed. And it must never ask for
// a permission nobody chose to give.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const local = {};
let alarm = null;
const shown = [];

globalThis.chrome = {
  runtime: { getURL: (p) => `chrome-extension://sieve-test/${p}` },
  storage: {
    local: {
      get: async (keys) => {
        const out = {};
        for (const k of [].concat(keys)) if (k in local) out[k] = JSON.parse(JSON.stringify(local[k]));
        return out;
      },
    },
    onChanged: { addListener() {} },
  },
  alarms: {
    onAlarm: { addListener() {} },
    get: async (name) => (alarm && alarm.name === name ? { ...alarm } : undefined),
    create: async (name, info) => {
      alarm = { name, scheduledTime: info.when };
    },
    clear: async () => {
      alarm = null;
      return true;
    },
  },
  notifications: {
    create: async (id, options) => {
      shown.push({ id, ...options });
      return id;
    },
    onClicked: { addListener() {} },
    clear() {},
  },
  permissions: { onAdded: { addListener() {} } },
  tabs: { create() {} },
};

const { normalize, nextAt, licensed, arm, fire } = await import("../background/heads-up.js");

const at = (y, m, d, h = 12, min = 0) => new Date(y, m, d, h, min).getTime();
// Wednesday 28 October 2026, noon. Friday is the 30th.
const NOW = at(2026, 9, 28, 12);
const FRIDAY_945PM = { day: 5, minute: 21 * 60 + 45 };
const GRANTED = { key: "SIEVE-TEST", status: "granted" };

function reset(stored) {
  for (const k of Object.keys(local)) delete local[k];
  Object.assign(local, stored);
  alarm = null;
  shown.length = 0;
}

test("the stored schedule is read defensively", () => {
  const h = normalize({
    enabled: "yes",
    at: [FRIDAY_945PM, { day: 7, minute: 0 }, { day: 1, minute: 1440 }, { day: 2.5, minute: 3 }, null],
    title: "t".repeat(200),
    body: 42,
  });
  assert.equal(h.enabled, false);
  assert.deepEqual(h.at, [FRIDAY_945PM]);
  assert.equal(h.title.length, 80);
  assert.equal(h.body, "");
});

test("the next heads-up: this week's if it is still ahead, next week's if not", () => {
  assert.equal(nextAt([FRIDAY_945PM], NOW), at(2026, 9, 30, 21, 45));
  assert.equal(nextAt([FRIDAY_945PM], at(2026, 9, 30, 21, 45)), at(2026, 10, 6, 21, 45));
  assert.equal(nextAt([FRIDAY_945PM], at(2026, 9, 30, 23)), at(2026, 10, 6, 21, 45));
  // The earliest of several, across the end of a month.
  assert.equal(nextAt([FRIDAY_945PM, { day: 0, minute: 23 * 60 + 45 }], at(2026, 9, 31, 9)), at(2026, 10, 1, 23, 45));
  assert.equal(nextAt([], NOW), null);
});

test("Pro is on for a granted key that has not expired, and only then", () => {
  assert.equal(licensed(GRANTED, NOW), true);
  assert.equal(licensed({ ...GRANTED, expiresAt: NOW + 1 }, NOW), true);
  assert.equal(licensed({ ...GRANTED, expiresAt: NOW }, NOW), false);
  assert.equal(licensed({ ...GRANTED, status: "revoked" }, NOW), false);
  assert.equal(licensed({ status: "granted" }, NOW), false);
  assert.equal(licensed(null, NOW), false);
});

test("the alarm is set only while it is switched on and Pro is on", async () => {
  reset({ proHeadsUp: { enabled: true, at: [FRIDAY_945PM], title: "A heads-up", body: "Soon." }, proLicence: GRANTED });
  assert.equal(await arm(NOW), at(2026, 9, 30, 21, 45));
  assert.deepEqual(alarm, { name: "sieve-heads-up", scheduledTime: at(2026, 9, 30, 21, 45) });

  reset({ proHeadsUp: { enabled: false, at: [FRIDAY_945PM] }, proLicence: GRANTED });
  alarm = { name: "sieve-heads-up", scheduledTime: 1 };
  assert.equal(await arm(NOW), null);
  assert.equal(alarm, null);

  reset({ proHeadsUp: { enabled: true, at: [FRIDAY_945PM], title: "t", body: "b" }, proLicence: { ...GRANTED, status: "revoked" } });
  assert.equal(await arm(NOW), null);
  assert.equal(alarm, null);
});

test("on time, it shows the stored words and sets the next one", async () => {
  const due = at(2026, 9, 30, 21, 45);
  reset({ proHeadsUp: { enabled: true, at: [FRIDAY_945PM], title: "A heads-up from Sieve", body: "Your hardest hours are coming up." }, proLicence: GRANTED });
  assert.equal(await fire({ name: "sieve-heads-up", scheduledTime: due }, due + 2000), true);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].title, "A heads-up from Sieve");
  assert.equal(shown[0].message, "Your hardest hours are coming up.");
  assert.equal(shown[0].iconUrl, "chrome-extension://sieve-test/icons/icon-128.png");
  assert.equal(alarm.scheduledTime, at(2026, 10, 6, 21, 45));
});

test("late after a sleep, switched off, or without the permission: nothing shown, the next one still set", async () => {
  const due = at(2026, 9, 30, 21, 45);
  const stored = { proHeadsUp: { enabled: true, at: [FRIDAY_945PM], title: "t", body: "b" }, proLicence: GRANTED };

  reset(stored);
  assert.equal(await fire({ name: "sieve-heads-up", scheduledTime: due }, due + 31 * 60000), false);
  assert.equal(shown.length, 0);
  assert.equal(alarm.scheduledTime, at(2026, 10, 6, 21, 45));

  reset({ ...stored, proHeadsUp: { ...stored.proHeadsUp, enabled: false } });
  assert.equal(await fire({ name: "sieve-heads-up", scheduledTime: due }, due), false);
  assert.equal(alarm, null);

  const notifications = chrome.notifications;
  delete chrome.notifications;
  try {
    reset(stored);
    assert.equal(await fire({ name: "sieve-heads-up", scheduledTime: due }, due), false);
    assert.equal(alarm.scheduledTime, at(2026, 10, 6, 21, 45));
  } finally {
    chrome.notifications = notifications;
  }

  reset(stored);
  assert.equal(await fire({ name: "another-alarm", scheduledTime: due }, due), false);
  assert.equal(shown.length, 0);
});

test("notifications are asked for only when wanted, and the heads-up fetches nothing", () => {
  for (const file of ["manifest.json", "manifest.firefox.json"]) {
    const manifest = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
    assert.ok(!manifest.permissions.includes("notifications"), `${file} does not ask for notifications at install`);
    assert.deepEqual(manifest.optional_permissions, ["notifications"], `${file} can ask for them later`);
  }
  const code = readFileSync(join(ROOT, "background", "heads-up.js"), "utf8").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
  assert.match(readFileSync(join(ROOT, "background", "service-worker.js"), "utf8"), /^import "\.\/heads-up\.js";/m);
});

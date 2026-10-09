// test/trial-reminders-test.mjs
// Sieve — free-trial reminders in the service worker (background/
// trial-reminders.js).
//
//   node --test test/
//
// A reminder is the user's own request, so the failures that matter are the
// ones that betray it: a reminder that never comes back because the cheap
// "anything due?" key went stale, one that comes back on every page forever,
// one kept from a private window, or one filed under a site the page merely
// claimed to be.

import test from "node:test";
import assert from "node:assert/strict";

const local = {};
const listeners = [];

globalThis.chrome = {
  runtime: {
    getURL: (p) => `chrome-extension://sieve-test/${p}`,
    onMessage: { addListener: (fn) => listeners.push(fn) },
  },
  storage: {
    local: {
      get: async (defaults) => {
        const out = {};
        for (const [k, v] of Object.entries(defaults)) out[k] = k in local ? JSON.parse(JSON.stringify(local[k])) : v;
        return out;
      },
      set: async (obj) => Object.assign(local, JSON.parse(JSON.stringify(obj))),
    },
  },
};

const { addReminder, prune, nextDue } = await import("../background/trial-reminders.js");

function ask(message, sender) {
  return new Promise((resolve) => {
    for (const fn of listeners) {
      let answered = false;
      const keep = fn(message, sender, (v) => {
        answered = true;
        resolve(v);
      });
      if (answered || keep === true) return;
    }
    resolve(undefined);
  });
}

const DAY = 24 * 3600 * 1000;
const page = (url, extra = {}) => ({ frameId: 0, url, tab: { id: 5, incognito: false, ...extra } });
const popup = { url: "chrome-extension://sieve-test/popup/popup.html" };

test("a reminder is filed under the sender's site, not anything in the message", async () => {
  const now = Date.now();
  const reply = await ask(
    { type: "sieve:trial-remind", ends: now + 7 * DAY, remindAt: now + 5 * DAY, terms: "$14.99 a month", host: "evil.example" },
    page("https://www.stream.example/signup")
  );
  assert.deepEqual(reply, { ok: true });
  assert.equal(local.trialReminders.length, 1);
  assert.equal(local.trialReminders[0].host, "stream.example");
  assert.equal(local.trialRemindersNext, now + 5 * DAY, "the cheap key holds the earliest due time");
});

test("asking again on the same site replaces the reminder", async () => {
  const now = Date.now();
  await ask({ type: "sieve:trial-remind", ends: now + 30 * DAY, remindAt: now + 28 * DAY }, page("https://stream.example/plans"));
  assert.equal(local.trialReminders.length, 1);
  assert.equal(local.trialReminders[0].ends, now + 30 * DAY);
});

test("nothing is kept from a private window, a subframe or a non-web page", async () => {
  const now = Date.now();
  const msg = { type: "sieve:trial-remind", ends: now + 7 * DAY, remindAt: now + 5 * DAY };
  assert.deepEqual(await ask(msg, page("https://private.example/", { incognito: true })), { ok: false });
  assert.deepEqual(await ask(msg, { ...page("https://ads.example/"), frameId: 2 }), { ok: false });
  assert.deepEqual(await ask(msg, page("file:///C:/trial.html")), { ok: false });
  assert.equal(local.trialReminders.length, 1);
});

test("nonsense dates are refused", () => {
  const now = Date.now();
  assert.equal(addReminder([], "x.example", { ends: now - DAY, remindAt: now - 2 * DAY }, now), null, "already over");
  assert.equal(addReminder([], "x.example", { ends: now + 900 * DAY, remindAt: now }, now), null, "years away");
  assert.equal(addReminder([], "x.example", { ends: now + DAY, remindAt: now + 2 * DAY }, now), null, "reminder after the end");
  assert.equal(addReminder([], "x.example", { ends: "soon", remindAt: now }, now), null);
});

test("only what has fallen due is handed to a page, and not to a private one", async () => {
  const now = Date.now();
  local.trialReminders.push({ id: "due1", host: "music.example", ends: now + DAY, remindAt: now - 1000, terms: "" });
  local.trialRemindersNext = now - 1000;
  const due = await ask({ type: "sieve:trial-due" }, page("https://news.example/"));
  assert.deepEqual(due.map((r) => r.id), ["due1"]);
  assert.deepEqual(await ask({ type: "sieve:trial-due" }, page("https://news.example/", { incognito: true })), []);
});

test("'Remind me tomorrow' moves it a day on; closing the banner, a few hours", async () => {
  const now = Date.now();
  local.trialReminders.find((r) => r.id === "due1").ends = now + 5 * DAY;
  await ask({ type: "sieve:trial-snooze", id: "due1" }, page("https://news.example/"));
  let r = local.trialReminders.find((x) => x.id === "due1");
  assert.ok(Math.abs(r.remindAt - (now + DAY)) < 5000);

  await ask({ type: "sieve:trial-snooze", id: "due1", hours: 4 }, page("https://news.example/"));
  r = local.trialReminders.find((x) => x.id === "due1");
  assert.ok(Math.abs(r.remindAt - (now + 4 * 3600000)) < 5000);
  assert.equal(local.trialRemindersNext, r.remindAt, "the cheap key follows");
});

test("a snooze never runs past the end of the trial", async () => {
  const now = Date.now();
  local.trialReminders.find((r) => r.id === "due1").ends = now + 2 * 3600000;
  await ask({ type: "sieve:trial-snooze", id: "due1" }, page("https://news.example/"));
  assert.equal(local.trialReminders.find((r) => r.id === "due1").remindAt, now + 2 * 3600000);
});

test("Done removes it; the popup can list and cancel; a page cannot list", async () => {
  await ask({ type: "sieve:trial-done", id: "due1" }, page("https://news.example/"));
  assert.ok(!local.trialReminders.some((r) => r.id === "due1"));

  assert.deepEqual(await ask({ type: "sieve:trial-list" }, page("https://news.example/")), []);
  const list = await ask({ type: "sieve:trial-list" }, popup);
  assert.equal(list.length, 1);
  await ask({ type: "sieve:trial-cancel", id: list[0].id }, popup);
  assert.equal(local.trialReminders.length, 0);
  assert.equal(local.trialRemindersNext, 0, "nothing left, nothing for a page to ask about");
});

test("a stale 'due' key is rewritten when nothing is actually due", async () => {
  const now = Date.now();
  // A reminder whose trial ended long ago: pruned on read.
  local.trialReminders = [{ id: "old", host: "gone.example", ends: now - 10 * DAY, remindAt: now - 12 * DAY }];
  local.trialRemindersNext = now - 12 * DAY;
  assert.deepEqual(await ask({ type: "sieve:trial-due" }, page("https://news.example/")), []);
  assert.equal(local.trialRemindersNext, 0, "or every page would keep asking");
});

test("prune keeps a reminder for a few days after its trial ends, then drops it", () => {
  const now = Date.now();
  const list = [
    { id: "a", ends: now - DAY },
    { id: "b", ends: now - 4 * DAY },
  ];
  assert.deepEqual(prune(list, now).map((r) => r.id), ["a"]);
  assert.equal(nextDue([{ remindAt: 5 }, { remindAt: 3 }]), 3);
});

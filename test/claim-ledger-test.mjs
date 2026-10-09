// test/claim-ledger-test.mjs
// Sieve — tests for the Claim Ledger: the rules in common/claim-ledger.js and
// the service-worker half in background/tells.js.
//
//   node --test test/
//
// WHY THIS FILE EXISTS
//
// The ledger is what lets Sieve say "fake" rather than "looks fake": a verdict
// from here moves a finding to the top of the intervention ladder, where the
// page is covered over with a note saying why. So a wrong "restarted" is the
// costliest mistake the Dark Pattern Blocker can make, and most of what is
// pinned below is the cases that must NOT be caught — a countdown that kept its
// time, a delivery cut-off that rolled over to tomorrow, a stock count that
// went down, a shop of one-off items, a sale that ends every Saturday.
//
// And the privacy promises, which are easy to break without noticing: no page
// address in storage, nothing kept from a private window, answers only for top
// frames, and the page address taken from the browser rather than the message.

import test from "node:test";
import assert from "node:assert/strict";

// --- a working chrome, before background/tells.js registers its listeners ---

const fakeArea = (backing) => ({
  get: async (defaults) => {
    if (defaults == null) return { ...backing };
    if (typeof defaults === "string") return { [defaults]: backing[defaults] };
    const out = {};
    for (const [k, v] of Object.entries(defaults)) out[k] = k in backing ? backing[k] : v;
    return out;
  },
  set: async (obj) => Object.assign(backing, JSON.parse(JSON.stringify(obj))),
  remove: async (key) => {
    for (const k of [].concat(key)) delete backing[k];
  },
});

const local = { sieveScarcitySamples: { "example.com|only {n} left": { value: 3, count: 2 } } };
const listeners = { message: [], committed: [] };
const badge = [];
const injected = [];

globalThis.chrome = {
  runtime: {
    id: "sieve-test",
    getURL: (p) => `chrome-extension://sieve-test/${p}`,
    onMessage: { addListener: (fn) => listeners.message.push(fn) },
  },
  storage: { local: fakeArea(local) },
  webNavigation: { onCommitted: { addListener: (fn) => listeners.committed.push(fn) } },
  scripting: { executeScript: async (o) => injected.push(o) },
  action: {
    setBadgeText: async (o) => badge.push(["text", o.tabId, o.text]),
    setBadgeBackgroundColor: async (o) => badge.push(["color", o.tabId, o.color]),
    setBadgeTextColor: async (o) => badge.push(["textColor", o.tabId, o.color]),
  },
};

await import("../background/tells.js");
const L = globalThis.SieveClaimLedger;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const T0 = new Date(2026, 9, 6, 15, 0, 0).getTime(); // Tue 6 Oct 2026, 3 pm local
const PAGE = { host: "www.shop.example", path: "/products/kettle" };

function timer(deadline) {
  return { kind: "timer", sig: "offer ends in #:#", deadline };
}

// --- countdowns ---------------------------------------------------------------

test("a countdown seen once is new", () => {
  const ledger = {};
  assert.deepEqual(L.observe(ledger, timer(T0 + 15 * MIN), PAGE, T0), { status: "new" });
});

test("a countdown that restarts before its own deadline is caught", () => {
  const ledger = {};
  L.observe(ledger, timer(T0 + 15 * MIN), PAGE, T0);
  // Five minutes later, a fresh fifteen minutes: the 3:15 it promised never came.
  const v = L.observe(ledger, timer(T0 + 20 * MIN), PAGE, T0 + 5 * MIN);
  assert.equal(v.status, "restarted");
  assert.equal(v.promised, T0 + 15 * MIN);
  assert.equal(v.deadline, T0 + 20 * MIN);
});

test("a countdown that keeps its end time is called consistent", () => {
  const ledger = {};
  L.observe(ledger, timer(T0 + 2 * HOUR), PAGE, T0);
  // Reloaded 40 minutes later; the page computed the same end, give or take.
  const v = L.observe(ledger, timer(T0 + 2 * HOUR + 20 * 1000), PAGE, T0 + 40 * MIN);
  assert.equal(v.status, "consistent");
});

// A delivery cut-off ("order within 3h for next-day") moves to tomorrow every
// day. Its old deadline has PASSED, so the later one is not a restart.
test("a deadline that passed and came round again is not a restart", () => {
  const ledger = {};
  L.observe(ledger, timer(T0 + HOUR), PAGE, T0);
  const v = L.observe(ledger, timer(T0 + DAY + HOUR), PAGE, T0 + DAY);
  assert.equal(v.status, "new");
});

test("once caught restarting, a countdown stays caught", () => {
  const ledger = {};
  L.observe(ledger, timer(T0 + 15 * MIN), PAGE, T0);
  L.observe(ledger, timer(T0 + 20 * MIN), PAGE, T0 + 5 * MIN);
  // A reload a minute later, inside the tolerance: still the same trick.
  const v = L.observe(ledger, timer(T0 + 20 * MIN + 30 * 1000), PAGE, T0 + 6 * MIN);
  assert.equal(v.status, "restarted");
  assert.equal(v.promised, T0 + 15 * MIN, "it still reports the end time it first broke");
});

test("countdowns on different pages of the same shop are separate", () => {
  const ledger = {};
  L.observe(ledger, timer(T0 + 15 * MIN), PAGE, T0);
  const other = { host: PAGE.host, path: "/products/toaster" };
  assert.equal(L.observe(ledger, timer(T0 + 20 * MIN), other, T0 + 5 * MIN).status, "new");
});

test("a deadline in the past, or months away, is refused", () => {
  const ledger = {};
  assert.equal(L.observe(ledger, timer(T0 - MIN), PAGE, T0), null);
  assert.equal(L.observe(ledger, timer(T0 + 90 * DAY), PAGE, T0), null);
  assert.equal(L.observe(ledger, timer(Number.NaN), PAGE, T0), null);
});

// --- stock ------------------------------------------------------------------

function stock(value, sig = "only # left in stock") {
  return { kind: "stock", sig, value };
}

test("the same stock number on a second visit is unchanged", () => {
  const ledger = {};
  assert.equal(L.observe(ledger, stock(3), PAGE, T0).status, "new");
  const v = L.observe(ledger, stock(3), PAGE, T0 + DAY);
  assert.equal(v.status, "unchanged");
  assert.equal(v.sightings, 2);
  assert.equal(v.since, T0);
});

test("a stock number that goes down is what real stock does", () => {
  const ledger = {};
  L.observe(ledger, stock(5), PAGE, T0);
  assert.equal(L.observe(ledger, stock(4), PAGE, T0 + HOUR * 3).status, "dropped");
});

test("a stock number that goes UP within the hour has jumped", () => {
  const ledger = {};
  L.observe(ledger, stock(2), PAGE, T0);
  const v = L.observe(ledger, stock(7), PAGE, T0 + 10 * MIN);
  assert.equal(v.status, "jumped");
  assert.deepEqual([v.from, v.to, v.minutes, v.jumps], [2, 7, 10, 1]);
  // And it keeps that on its record, whatever it shows next.
  assert.equal(L.observe(ledger, stock(4), PAGE, T0 + 12 * MIN).status, "jumped");
  const again = L.observe(ledger, stock(9), PAGE, T0 + 14 * MIN);
  assert.equal(again.jumps, 2);
});

test("a stock number that goes up after a long gap is a restock", () => {
  const ledger = {};
  L.observe(ledger, stock(2), PAGE, T0);
  assert.equal(L.observe(ledger, stock(12), PAGE, T0 + 2 * DAY).status, "new");
});

test("the same number on three different products is everywhere", () => {
  const ledger = {};
  for (const p of ["/a", "/b"]) L.observe(ledger, stock(3), { host: PAGE.host, path: p }, T0);
  const v = L.observe(ledger, stock(3), { host: PAGE.host, path: "/c" }, T0 + MIN);
  assert.equal(v.status, "everywhere");
  assert.equal(v.products, 3);
});

// A shop of one-off items genuinely has one of everything.
test("'only 1 left' on every product is not called everywhere", () => {
  const ledger = {};
  let v;
  for (const p of ["/a", "/b", "/c", "/d", "/e"]) v = L.observe(ledger, stock(1), { host: PAGE.host, path: p }, T0);
  assert.equal(v.status, "new");
});

test("a different number on a product starts the count again", () => {
  const ledger = {};
  L.observe(ledger, stock(3), { host: PAGE.host, path: "/a" }, T0);
  L.observe(ledger, stock(3), { host: PAGE.host, path: "/b" }, T0);
  L.observe(ledger, stock(5), { host: PAGE.host, path: "/c" }, T0);
  assert.equal(L.observe(ledger, stock(3), { host: PAGE.host, path: "/d" }, T0).status, "new");
});

// --- "ends today" -------------------------------------------------------------

function deadline() {
  return { kind: "deadline", sig: "summer sale ends tonight!" };
}

test("'ends today' twice on the same day is not caught", () => {
  const ledger = {};
  L.observe(ledger, deadline(), PAGE, T0);
  assert.equal(L.observe(ledger, deadline(), PAGE, T0 + 3 * HOUR).status, "new");
});

test("'ends today' again the next day is caught, with the earlier day", () => {
  const ledger = {};
  L.observe(ledger, deadline(), PAGE, T0);
  const v = L.observe(ledger, deadline(), { host: PAGE.host, path: "/" }, T0 + DAY);
  assert.equal(v.status, "repeated", "the banner is shop-wide, so another page counts");
  assert.equal(v.earlier, L.dayKey(T0));
});

test("a one-day sale every Saturday is not caught", () => {
  const ledger = {};
  L.observe(ledger, deadline(), PAGE, T0);
  assert.equal(L.observe(ledger, deadline(), PAGE, T0 + 7 * DAY).status, "new");
});

// --- "23 people are viewing this" ----------------------------------------------

function viewers(value) {
  return { kind: "viewers", sig: "# people are viewing this", value };
}

test("a viewer count seen again within minutes proves nothing yet", () => {
  const ledger = {};
  assert.equal(L.observe(ledger, viewers(23), PAGE, T0).status, "new");
  // A reload a minute later: a real count could easily still say 23.
  assert.equal(L.observe(ledger, viewers(23), PAGE, T0 + MIN).status, "new");
});

test("the same viewer count ten minutes or more apart has frozen", () => {
  const ledger = {};
  L.observe(ledger, viewers(23), PAGE, T0);
  const v = L.observe(ledger, viewers(23), PAGE, T0 + 40 * MIN);
  assert.equal(v.status, "frozen");
  assert.deepEqual([v.value, v.sightings, v.since, v.span], [23, 2, T0, 40 * MIN]);
});

test("a viewer count that changes is not called genuine, and starts the watch again", () => {
  const ledger = {};
  L.observe(ledger, viewers(23), PAGE, T0);
  assert.equal(L.observe(ledger, viewers(17), PAGE, T0 + HOUR).status, "varies");
  // The streak restarts from the new number.
  assert.equal(L.observe(ledger, viewers(17), PAGE, T0 + HOUR + 2 * MIN).status, "new");
  assert.equal(L.observe(ledger, viewers(17), PAGE, T0 + 2 * HOUR).sightings, 3);
});

// --- keys, input and housekeeping -------------------------------------------------

test("the ledger holds no readable address", () => {
  const ledger = {};
  L.observe(ledger, timer(T0 + 15 * MIN), PAGE, T0);
  L.observe(ledger, stock(3), PAGE, T0);
  L.observe(ledger, deadline(), PAGE, T0);
  const dump = JSON.stringify(ledger);
  for (const fragment of ["shop.example", "kettle", "products", "summer sale", "ends in"]) {
    assert.ok(!dump.includes(fragment), `"${fragment}" is readable in the ledger`);
  }
  for (const key of Object.keys(ledger)) assert.match(key, /^[0-9a-f]{16}$/);
});

test("www. and letter case do not split one site into two", () => {
  const ledger = {};
  L.observe(ledger, stock(3), { host: "WWW.Shop.Example", path: "/products/kettle" }, T0);
  assert.equal(L.observe(ledger, stock(3), PAGE, T0 + MIN).status, "unchanged");
});

test("a malformed claim is refused, not recorded", () => {
  const ledger = {};
  assert.equal(L.observe(ledger, { kind: "price", sig: "x" }, PAGE, T0), null);
  assert.equal(L.observe(ledger, { kind: "stock", sig: "", value: 3 }, PAGE, T0), null);
  assert.equal(L.observe(ledger, { kind: "stock", sig: "x".repeat(400), value: 3 }, PAGE, T0), null);
  assert.equal(L.observe(ledger, { kind: "stock", sig: "x", value: 2.5 }, PAGE, T0), null);
  assert.equal(L.observe(ledger, stock(3), { host: "" }, T0), null);
  assert.deepEqual(ledger, {});
});

test("prune drops month-old entries, then the oldest past the cap", () => {
  const ledger = {};
  L.observe(ledger, stock(3), { host: "old.example", path: "/" }, T0 - 31 * DAY);
  for (let i = 0; i < L.MAX_ENTRIES + 10; i++) {
    L.observe(ledger, timer(T0 + 2 * HOUR), { host: "shop.example", path: `/p${i}` }, T0 + i);
  }
  L.prune(ledger, T0 + DAY);
  assert.equal(Object.keys(ledger).length, L.MAX_ENTRIES);
  assert.ok(Object.values(ledger).every((e) => e.k === "t"), "the month-old entries went first");
  assert.ok(Math.min(...Object.values(ledger).map((e) => e.l)) >= T0 + 10, "then the oldest");
});

// --- the service worker ---------------------------------------------------------

function ask(message, sender) {
  return new Promise((resolve) => {
    let answered = false;
    for (const fn of listeners.message) {
      const keepOpen = fn(message, sender, (value) => {
        answered = true;
        resolve(value);
      });
      if (keepOpen === true) return;
    }
    if (!answered) resolve(undefined);
  });
}

const tab = (id, extra = {}) => ({ id, incognito: false, ...extra });
const topFrame = (url, t = tab(7)) => ({ frameId: 0, url, tab: t });

test("the service worker files a claim under the sender's address, not the message's", async () => {
  const claim = { kind: "deadline", sig: "today only", host: "evil.example", path: "/x" };
  await ask({ type: "sieve:claim-observe", claim }, topFrame("https://shop.example/a"));
  const v = await ask(
    { type: "sieve:claim-observe", claim: { kind: "deadline", sig: "today only" } },
    topFrame("https://shop.example/b")
  );
  // Same shop, same day: watched, not caught — but it found the first one, so
  // both were filed under shop.example whatever the message claimed.
  assert.equal(v.status, "new");
  await new Promise((r) => setTimeout(r, 700)); // past the persist delay
  const keys = Object.keys(local.sieveClaimLedger || {});
  assert.equal(keys.length, 1, "one shop-wide entry, filed once");
});

test("the old scarcity cache is retired on first use", async () => {
  assert.equal("sieveScarcitySamples" in local, false);
});

test("subframes and non-web pages get no answer", async () => {
  const claim = { kind: "deadline", sig: "ends tonight" };
  assert.equal(await ask({ type: "sieve:claim-observe", claim }, { frameId: 3, url: "https://ads.example/", tab: tab(7) }), null);
  assert.equal(await ask({ type: "sieve:claim-observe", claim }, topFrame("file:///C:/shop.html")), null);
});

test("nothing from a private window is written down", async () => {
  const before = JSON.stringify(local.sieveClaimLedger || {});
  const sender = topFrame("https://private.example/p", tab(9, { incognito: true }));
  const claim = { kind: "stock", sig: "only # left", value: 3 };
  assert.equal((await ask({ type: "sieve:claim-observe", claim }, sender)).status, "new");
  // ...but it still works for as long as the window is open.
  assert.equal((await ask({ type: "sieve:claim-observe", claim }, sender)).status, "unchanged");
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(JSON.stringify(local.sieveClaimLedger || {}), before);
});

test("only the settings page may read or empty the ledger", async () => {
  const page = topFrame("https://shop.example/");
  assert.equal(await ask({ type: "sieve:claims-info" }, page), undefined);
  assert.equal(await ask({ type: "sieve:claims-forget" }, page), undefined);

  const settings = { url: "chrome-extension://sieve-test/options/options.html", tab: tab(2) };
  const info = await ask({ type: "sieve:claims-info" }, settings);
  assert.ok(info.count >= 1);
  assert.deepEqual(await ask({ type: "sieve:claims-forget" }, settings), { ok: true });
  assert.equal((await ask({ type: "sieve:claims-info" }, settings)).count, 0);
  assert.equal("sieveClaimLedger" in local, false);
});

test("the drawing code is injected into the asking top frame, and nowhere else", async () => {
  const ok = await ask({ type: "sieve:tells-ui" }, topFrame("https://shop.example/", tab(12)));
  assert.deepEqual(ok, { ok: true });
  assert.deepEqual(injected.pop(), { target: { tabId: 12, frameIds: [0] }, files: ["content/tells-ui.js"] });

  const sub = await ask({ type: "sieve:tells-ui" }, { frameId: 4, url: "https://ads.example/", tab: tab(12) });
  assert.deepEqual(sub, { ok: false });
  assert.equal(injected.length, 0, "a subframe cannot have it injected");
});

test("the free-trial reader is the only other file a page can ask for, by name", async () => {
  await ask({ type: "sieve:tells-ui", part: "trials" }, topFrame("https://shop.example/", tab(12)));
  assert.deepEqual(injected.pop().files, ["content/trial-terms.js"]);

  for (const part of ["../background/tells.js", "content/tells-ui.js", "toString", "__proto__"]) {
    assert.deepEqual(await ask({ type: "sieve:tells-ui", part }, topFrame("https://shop.example/", tab(12))), { ok: false }, part);
  }
  assert.equal(injected.length, 0);
});

test("the badge shows a top frame's count on its own tab, and clears on a new page", async () => {
  badge.length = 0;
  await ask({ type: "sieve:tells-count", count: 3 }, topFrame("https://shop.example/", tab(11)));
  assert.deepEqual(badge.find((b) => b[0] === "text"), ["text", 11, "3"]);
  assert.ok(badge.some((b) => b[0] === "color" && b[2] === "#855600"), "warn ink, never green");

  badge.length = 0;
  await ask({ type: "sieve:tells-count", count: 5 }, { frameId: 2, url: "https://x.example/", tab: tab(11) });
  assert.equal(badge.length, 0, "a subframe cannot set the badge");

  for (const fn of listeners.committed) fn({ tabId: 11, frameId: 0 });
  assert.deepEqual(badge.find((b) => b[0] === "text"), ["text", 11, ""]);
});

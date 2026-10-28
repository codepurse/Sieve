// test/search-filter-subscriptions-test.mjs
// Sieve — tests for background/search-filter-subscriptions.js: subscribing,
// refreshing and unsubscribing, against an in-memory chrome.storage and a fake
// fetch.
//
//   node --test test/
//
// What matters most is how it behaves when the list's server does not: a 304
// must keep the rules and cost nothing, a failure must keep the rules from
// before, a server that asks to be left alone must be, and a wrong address
// must be reported at once and not leave an empty subscription behind.

import test from "node:test";
import assert from "node:assert/strict";

// --- a browser, in miniature ----------------------------------------------------

const store = {};
function pick(keys) {
  if (keys == null) return { ...store };
  if (typeof keys === "string") keys = [keys];
  const out = {};
  if (Array.isArray(keys)) {
    for (const k of keys) if (k in store) out[k] = structuredClone(store[k]);
    return out;
  }
  for (const [k, fallback] of Object.entries(keys)) out[k] = k in store ? structuredClone(store[k]) : fallback;
  return out;
}

globalThis.self = globalThis; // the shared scripts hang themselves on `self`
globalThis.chrome = {
  runtime: { id: "sieve", getURL: (p) => "chrome-extension://sieve/" + p, onMessage: { addListener() {} }, onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
  alarms: { create() {}, onAlarm: { addListener() {} } },
  storage: {
    local: {
      get: async (keys) => pick(keys),
      set: async (items) => Object.assign(store, structuredClone(items)),
      remove: async (keys) => [].concat(keys).forEach((k) => delete store[k]),
    },
  },
};

// The list's server. Each test says what it answers next.
let serve = () => new Response("", { status: 404 });
const requests = [];
globalThis.fetch = async (url, init = {}) => {
  requests.push({ url, headers: { ...(init.headers || {}) } });
  return serve(url, init);
};

const subs = await import("../background/search-filter-subscriptions.js");
const meta = () => store[subs.META_KEY] || [];
const data = (id) => store[subs.DATA_PREFIX + id];

function reset() {
  for (const k of Object.keys(store)) delete store[k];
  requests.length = 0;
}

const LIST = "---\nname: Spam sites\n---\n*://*.spam-a.com/*\nspam-b.com\n/casino\\d+/\n@*://*.good.com/*\n";

// --- subscribing ------------------------------------------------------------------

test("subscribing downloads the list at once and stores it packed", async () => {
  reset();
  serve = () => new Response(LIST, { status: 200, headers: { ETag: '"v1"' } });
  const result = await subs.addSubscription("https://lists.example/spam.txt", 0);
  assert.equal(result.ok, true);
  const [sub] = meta();
  assert.equal(sub.name, "Spam sites"); // from the list's own header
  assert.equal(sub.hostCount, 2);
  assert.equal(sub.patternCount, 1);
  assert.equal(sub.skipped, 1); // the "@" allow rule
  assert.equal(sub.enabled, true);
  assert.equal(sub.etag, '"v1"');
  assert.deepEqual(data(sub.id), { hosts: "spam-a.com\nspam-b.com", patterns: ["/casino\\d+/"] });
});

test("the same list twice is refused, and the count is capped", async () => {
  reset();
  serve = () => new Response(LIST, { status: 200 });
  await subs.addSubscription("https://lists.example/spam.txt", 0);
  const again = await subs.addSubscription("https://LISTS.example/spam.txt", 0);
  assert.equal(again.ok, false);
  assert.match(again.error, /already follow/);

  reset();
  for (let i = 0; i < subs.MAX_SUBSCRIPTIONS; i++) await subs.addSubscription(`https://lists.example/${i}.txt`, 0);
  const over = await subs.addSubscription("https://lists.example/one-more.txt", 0);
  assert.equal(over.ok, false);
  assert.match(over.error, /up to 20/);
});

test("a wrong address is reported at once and leaves nothing behind", async () => {
  for (const [label, response, message] of [
    ["an HTML page", () => new Response("<!DOCTYPE html><html><body>GitHub</body></html>", { status: 200 }), /a web page, not a list/],
    ["a 404", () => new Response("", { status: 404 }), /Nothing was found/],
    ["a dead server", () => Promise.reject(new TypeError("fetch failed")), /Could not reach/],
  ]) {
    reset();
    serve = response;
    const result = await subs.addSubscription("https://lists.example/spam.txt", 0);
    assert.equal(result.ok, false, label);
    assert.match(result.error, message, label);
    assert.equal(meta().length, 0, `${label}: an empty subscription was kept`);
  }
  const bad = await subs.addSubscription("ftp://lists.example/spam.txt", 0);
  assert.equal(bad.ok, false);
});

// --- refreshing --------------------------------------------------------------------

async function subscribed() {
  reset();
  serve = () => new Response(LIST, { status: 200, headers: { ETag: '"v1"' } });
  await subs.addSubscription("https://lists.example/spam.txt", 0);
  const [sub] = meta();
  // Pretend the daily check is due and the last check was long ago.
  sub.updatedAt = sub.checkedAt = Date.now() - 2 * 24 * 60 * 60 * 1000;
  store[subs.META_KEY] = [sub];
  requests.length = 0;
  return sub;
}

test("an unchanged list costs a 304 and keeps its rules", async () => {
  const sub = await subscribed();
  serve = () => new Response(null, { status: 304 });
  const result = await subs.refreshSubscription(sub.id, "scheduled");
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(requests[0].headers["If-None-Match"], '"v1"');
  assert.ok(meta()[0].updatedAt > sub.updatedAt);
  assert.equal(data(sub.id).hosts, "spam-a.com\nspam-b.com");
});

test("a failed update keeps the rules from before, and backs off", async () => {
  const sub = await subscribed();
  serve = () => new Response("", { status: 500 });
  const result = await subs.refreshSubscription(sub.id, "scheduled");
  assert.equal(result.ok, false);
  assert.match(meta()[0].error, /Download failed \(500\)/);
  assert.equal(data(sub.id).hosts, "spam-a.com\nspam-b.com");
  // The next scheduled wake within the hour leaves the server alone.
  requests.length = 0;
  const again = await subs.refreshSubscription(sub.id, "scheduled");
  assert.equal(again.reason, "backoff");
  assert.equal(requests.length, 0);
});

test("a server that asks to be left alone is, even for Update now", async () => {
  const sub = await subscribed();
  serve = () => new Response("", { status: 503, headers: { "Retry-After": "1800" } });
  await subs.refreshSubscription(sub.id, "scheduled");
  const waitMs = meta()[0].retryAfterAt - Date.now();
  assert.ok(waitMs > 29 * 60 * 1000 && waitMs <= 30 * 60 * 1000, `waits ${waitMs}ms`);
  requests.length = 0;
  const manual = await subs.refreshSubscription(sub.id, "manual");
  assert.equal(manual.reason, "rate-limited");
  assert.equal(requests.length, 0);
});

test("a fresh list is not downloaded again by the daily check", async () => {
  reset();
  serve = () => new Response(LIST, { status: 200 });
  await subs.addSubscription("https://lists.example/spam.txt", 0);
  requests.length = 0;
  const result = await subs.refreshSubscription(meta()[0].id, "scheduled");
  assert.equal(result.reason, "fresh");
  assert.equal(requests.length, 0);
});

test("Update now pressed twice in a row downloads once", async () => {
  const sub = await subscribed();
  serve = () => new Response(LIST, { status: 200 });
  await subs.refreshSubscription(sub.id, "manual");
  requests.length = 0;
  const second = await subs.refreshSubscription(sub.id, "manual");
  assert.equal(second.reason, "recent");
  assert.equal(requests.length, 0);
});

// The cap is on the TOTAL across lists (one list alone is cut off sooner, by
// the parser). Measured without building a list that size: the first list is
// recorded as nearly filling it, and a small second list tips it over.
test("lists past the total a results page reads are refused, and nothing is lost", async () => {
  const first = await subscribed();
  store[subs.META_KEY] = [{ ...meta()[0], hostCount: subs.MAX_TOTAL_HOSTS - 1 }];
  serve = () => new Response(LIST, { status: 200 }); // two more sites
  const result = await subs.addSubscription("https://lists.example/second.txt", 0);
  assert.equal(result.ok, false);
  assert.match(result.error, /more than 600,000 sites/);
  assert.equal(meta().length, 1, "the refused list was kept");
  assert.equal(data(first.id).hosts, "spam-a.com\nspam-b.com");
});

// --- changing and removing ----------------------------------------------------------

test("a list's action and switch are changed in place; unsubscribing removes its rules", async () => {
  const sub = await subscribed();
  await subs.updateSubscription(sub.id, { color: 2 });
  await subs.updateSubscription(sub.id, { enabled: false });
  assert.equal(meta()[0].color, 2);
  assert.equal(meta()[0].enabled, false);
  await subs.removeSubscription(sub.id);
  assert.equal(meta().length, 0);
  assert.equal(data(sub.id), undefined);
});

test("a uBlacklist directory link subscribes to the list inside it", async () => {
  reset();
  serve = () => new Response(LIST, { status: 200 });
  const inner = "https://raw.githubusercontent.com/someone/lists/main/spam.txt";
  const result = await subs.addSubscription(`https://ublacklist.github.io/rulesets/subscribe?url=${encodeURIComponent(inner)}`, 0);
  assert.equal(result.ok, true);
  assert.equal(meta()[0].url, inner);
  assert.equal(requests[0].url, inner);
});

test("a list of only allow rules says so, rather than blaming the address", async () => {
  reset();
  serve = () => new Response("@*://*.good.com/*\n@*://*.fine.org/*\n", { status: 200 });
  const result = await subs.addSubscription("https://lists.example/allow.txt", 0);
  assert.equal(result.ok, false);
  assert.match(result.error, /only allow rules/);
});

test("ids come from the address, so the same list is the same id", () => {
  assert.equal(subs.subscriptionId("https://a.example/x.txt"), subs.subscriptionId(" HTTPS://A.EXAMPLE/X.TXT "));
  assert.notEqual(subs.subscriptionId("https://a.example/x.txt"), subs.subscriptionId("https://a.example/y.txt"));
});

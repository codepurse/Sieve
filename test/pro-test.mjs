// test/pro-test.mjs
// Sieve — tests for common/pro.js, the Sieve Pro licence.
//
// The ways this goes wrong are all unfair to someone: a paying user losing Pro
// because their Wi-Fi dropped during the weekly check, a mistyped key wiping a
// good licence, a refunded key carrying on for ever, a key for another product
// counting as this one. Polar is replaced by a fake fetch; the real endpoint is
// checked by hand with a sandbox key.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";

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

globalThis.window = globalThis;
await import("../common/pro.js");
const P = globalThis.SievePro;

P.CONFIG.organizationId = "org-test";
P.CONFIG.benefitIds = ["benefit-pro"];

const DAY = 24 * 3600000;
const T0 = Date.UTC(2026, 9, 29, 9, 0, 0);
const KEY = "SIEVE-1C285B2D-6CE6-4BC7-B8BE-ADB6A7E304DA";

// Every call the module makes, and the answer to give it.
let calls = [];
let answer = null;

function respond(status, body) {
  answer = () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function goOffline() {
  answer = () => {
    throw new TypeError("Failed to fetch");
  };
}

globalThis.fetch = async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body), credentials: init.credentials });
  return answer();
};

function reset() {
  backing.clear();
  calls = [];
  answer = null;
}

const GRANTED = { status: "granted", benefit_id: "benefit-pro", display_key: "****-E304DA", expires_at: null };

test("only a granted, unexpired licence is Pro", () => {
  assert.equal(P.isProState(null, T0), false);
  assert.equal(P.isProState({ key: KEY, status: "granted" }, T0), true);
  assert.equal(P.isProState({ key: KEY, status: "revoked" }, T0), false);
  assert.equal(P.isProState({ key: KEY, status: "disabled" }, T0), false);
  assert.equal(P.isProState({ key: KEY, status: "something new" }, T0), false);
  assert.equal(P.isProState({ key: "", status: "granted" }, T0), false);
  assert.equal(P.isProState({ key: KEY, status: "granted", expiresAt: T0 + 1 }, T0), true);
  assert.equal(P.isProState({ key: KEY, status: "granted", expiresAt: T0 }, T0), false);
});

test("activating sends only the key and the organisation, and keeps a granted key", async () => {
  reset();
  respond(200, GRANTED);
  assert.deepEqual(await P.activate(`  ${KEY}  `, T0), { ok: true });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.polar\.sh\/v1\/customer-portal\/license-keys\/validate$/);
  assert.deepEqual(calls[0].body, { key: KEY, organization_id: "org-test" });
  assert.equal(calls[0].credentials, "omit");

  const stored = backing.get(P.LICENCE_KEY);
  assert.equal(stored.key, KEY);
  assert.equal(stored.displayKey, "****-E304DA");
  assert.equal(stored.checkedAt, T0);
  assert.equal(await P.isPro(T0), true);
});

test("a key for another product does not count", async () => {
  reset();
  respond(200, { ...GRANTED, benefit_id: "benefit-warden-only" });
  assert.deepEqual(await P.activate(KEY, T0), { ok: false, status: "invalid" });
  assert.equal(backing.has(P.LICENCE_KEY), false);
});

test("an unknown or refunded key is refused and does not replace a good one", async () => {
  reset();
  respond(200, GRANTED);
  await P.activate(KEY, T0);

  respond(404, { error: "ResourceNotFound" });
  assert.deepEqual(await P.activate("SIEVE-TYPO", T0 + 1), { ok: false, status: "invalid" });
  respond(200, { ...GRANTED, status: "revoked" });
  assert.deepEqual(await P.activate("SIEVE-OTHER", T0 + 2), { ok: false, status: "revoked" });

  assert.equal(backing.get(P.LICENCE_KEY).key, KEY);
  assert.equal(await P.isPro(T0 + 3), true);
});

test("offline, rate-limited or a server error: no answer, nothing changes", async () => {
  for (const setUp of [goOffline, () => respond(500, {}), () => respond(429, {}), () => respond(408, {})]) {
    reset();
    setUp();
    const result = await P.activate(KEY, T0);
    assert.equal(result.ok, false);
    assert.equal(result.offline, true);
    assert.equal(backing.has(P.LICENCE_KEY), false);
  }
});

test("an empty key never reaches the network", async () => {
  reset();
  respond(200, GRANTED);
  assert.deepEqual(await P.activate("   ", T0), { ok: false, status: "invalid" });
  assert.equal(calls.length, 0);
});

test("the weekly check runs once a week, not on every page load", async () => {
  reset();
  respond(200, GRANTED);
  await P.activate(KEY, T0);
  calls = [];

  assert.deepEqual(await P.refreshIfDue(T0 + 6 * DAY), { checked: false });
  assert.equal(calls.length, 0);

  assert.deepEqual(await P.refreshIfDue(T0 + 7 * DAY), { checked: true, status: "granted" });
  assert.equal(calls.length, 1);
  assert.equal(backing.get(P.LICENCE_KEY).checkedAt, T0 + 7 * DAY);
});

test("a dropped connection during the weekly check keeps Pro", async () => {
  reset();
  respond(200, GRANTED);
  await P.activate(KEY, T0);

  goOffline();
  assert.deepEqual(await P.refreshIfDue(T0 + 30 * DAY), { checked: false, offline: true });
  assert.equal(await P.isPro(T0 + 30 * DAY), true);
});

test("a refund shows up at the weekly check, and the key is kept to say so", async () => {
  reset();
  respond(200, GRANTED);
  await P.activate(KEY, T0);

  respond(200, { ...GRANTED, status: "revoked" });
  assert.deepEqual(await P.refreshIfDue(T0 + 8 * DAY), { checked: true, status: "revoked" });
  assert.equal(await P.isPro(T0 + 8 * DAY), false);
  assert.equal(backing.get(P.LICENCE_KEY).status, "revoked");
  assert.equal(backing.get(P.LICENCE_KEY).key, KEY);
});

test("a clock moved backwards does not postpone the check", async () => {
  reset();
  respond(200, GRANTED);
  await P.activate(KEY, T0);
  calls = [];
  assert.equal((await P.refreshIfDue(T0 - 365 * DAY)).checked, true);
  assert.equal(calls.length, 1);
});

test("forgetting the key turns Pro off", async () => {
  reset();
  respond(200, GRANTED);
  await P.activate(KEY, T0);
  await P.forget();
  assert.equal(await P.isPro(T0), false);
});

test("without an organisation id nothing is sent", async () => {
  reset();
  respond(200, GRANTED);
  P.CONFIG.organizationId = "";
  try {
    const result = await P.activate(KEY, T0);
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  } finally {
    P.CONFIG.organizationId = "org-test";
  }
});

test("without Sieve Pro's benefit named, nothing is sent (the store is shared with BlockNSFW)", async () => {
  reset();
  respond(200, { ...GRANTED, benefit_id: "blocknsfw-supporter" });
  P.CONFIG.benefitIds = [];
  try {
    assert.equal(P.isConfigured(), false);
    const result = await P.activate(KEY, T0);
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  } finally {
    P.CONFIG.benefitIds = ["benefit-pro"];
  }
});

test("sandbox mode asks Polar's test store", async () => {
  reset();
  respond(200, GRANTED);
  P.CONFIG.mode = "sandbox";
  try {
    await P.activate(KEY, T0);
    assert.match(calls[0].url, /^https:\/\/sandbox-api\.polar\.sh\//);
  } finally {
    P.CONFIG.mode = "live";
  }
});

test("the shipped config is the live store", () => {
  assert.equal(P.CONFIG.mode, "live");
  assert.equal(P.apiBase(), "https://api.polar.sh");
});

test("the masked key shows the tail only", () => {
  assert.equal(P.maskKey("1C285B2D-6CE6-4BC7-B8BE-ADB6A7E304DA"), "****-E304DA");
  assert.equal(P.maskKey("--"), "****");
});

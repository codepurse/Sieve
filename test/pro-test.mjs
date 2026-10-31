// test/pro-test.mjs
// Sieve — tests for common/pro.js, the Sieve Pro licence.
//
// The ways this goes wrong are all unfair to someone: a paying user losing Pro
// because their Wi-Fi dropped during the weekly check, a mistyped key wiping a
// good licence, a refunded key carrying on for ever, a key for another product
// counting as this one, a browser's place on the key lost because "Remove"
// was pressed offline, or Firefox's consent skipped. Polar is replaced by a
// fake fetch; the real endpoints are checked by hand with a sandbox key.
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

// The manifest the module reads to know whether it is the Firefox build, and
// the consent Firefox would give.
let manifest = {};
let consent = { granted: true, answer: true, requests: 0 };

globalThis.chrome = {
  runtime: { getManifest: () => manifest },
  permissions: {
    async contains(p) {
      assert.deepEqual(p, { data_collection: ["authenticationInfo"] });
      return consent.granted;
    },
    async request(p) {
      assert.deepEqual(p, { data_collection: ["authenticationInfo"] });
      consent.requests++;
      if (consent.answer) consent.granted = true;
      return consent.answer;
    },
  },
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

// The config as shipped, before the tests point the live store at test ids.
const SHIPPED = structuredClone(P.CONFIG);
const LIVE = P.CONFIG.stores.live;
LIVE.organizationId = "org-test";
LIVE.benefitIds = ["benefit-pro"];

const DAY = 24 * 3600000;
const T0 = Date.UTC(2026, 9, 29, 9, 0, 0);
const KEY = "SIEVE-1C285B2D-6CE6-4BC7-B8BE-ADB6A7E304DA";
const FIREFOX = {
  browser_specific_settings: {
    gecko: { data_collection_permissions: { required: ["none"], optional: ["authenticationInfo"] } },
  },
};

// Every call the module makes, and Polar's answer to each endpoint.
let calls = [];
let answers = {};

const reply = (status, body = null) => () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const offline = () => () => {
  throw new TypeError("Failed to fetch");
};

globalThis.fetch = async (url, init) => {
  const endpoint = url.split("/license-keys/")[1];
  calls.push({ url, endpoint, body: JSON.parse(init.body), credentials: init.credentials });
  const answer = answers[endpoint];
  if (!answer) throw new Error(`unexpected call to ${endpoint}`);
  return answer(JSON.parse(init.body));
};

function reset() {
  backing.clear();
  calls = [];
  answers = {};
  manifest = {};
  consent = { granted: true, answer: true, requests: 0 };
}

const GRANTED = { status: "granted", benefit_id: "benefit-pro", display_key: "****-E304DA", expires_at: null, limit_activations: null };
const LIMITED = { ...GRANTED, limit_activations: 3 };
const stored = () => backing.get(P.LICENCE_KEY);
const endpoints = () => calls.map((c) => c.endpoint);

test("only a granted, unexpired licence is Pro", () => {
  assert.equal(P.isProState(null, T0), false);
  assert.equal(P.isProState({ key: KEY, status: "granted" }, T0), true);
  for (const status of ["revoked", "disabled", "invalid", "removed", "something new"]) {
    assert.equal(P.isProState({ key: KEY, status }, T0), false, status);
  }
  assert.equal(P.isProState({ key: "", status: "granted" }, T0), false);
  assert.equal(P.isProState({ key: KEY, status: "granted", expiresAt: T0 + 1 }, T0), true);
  assert.equal(P.isProState({ key: KEY, status: "granted", expiresAt: T0 }, T0), false);
});

test("no limit: one check, sending only the key and the organisation, and the key is kept", async () => {
  reset();
  answers.validate = reply(200, GRANTED);
  assert.deepEqual(await P.activate(`  ${KEY}  `, T0), { ok: true });

  assert.deepEqual(endpoints(), ["validate"]);
  assert.match(calls[0].url, /^https:\/\/api\.polar\.sh\/v1\/customer-portal\/license-keys\/validate$/);
  assert.deepEqual(calls[0].body, { key: KEY, organization_id: "org-test" });
  assert.equal(calls[0].credentials, "omit");
  assert.equal(stored().key, KEY);
  assert.equal(stored().displayKey, "****-E304DA");
  assert.equal(stored().activationId, "");
  assert.equal(await P.isPro(T0), true);
});

test("a limit of 3: the key takes one place, named for this browser", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-1" });
  assert.deepEqual(await P.activate(KEY, T0), { ok: true });

  assert.deepEqual(endpoints(), ["validate", "activate"]);
  assert.deepEqual(calls[1].body, { key: KEY, organization_id: "org-test", label: P.deviceLabel() });
  assert.match(P.deviceLabel(), /^Sieve · /);
  assert.equal(stored().activationId, "act-1");
  assert.equal(stored().limit, 3);
});

test("every place taken: refused, with the limit to say so, nothing kept", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(403, { error: "NotPermitted" });
  assert.deepEqual(await P.activate(KEY, T0), { ok: false, status: "full", limit: 3 });
  assert.equal(backing.has(P.LICENCE_KEY), false);
});

test("the same key entered again here keeps its place instead of taking a second", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-1" });
  await P.activate(KEY, T0);
  calls = [];

  assert.deepEqual(await P.activate(KEY, T0 + DAY), { ok: true });
  assert.deepEqual(endpoints(), ["validate"]);
  assert.equal(calls[0].body.activation_id, "act-1");
  assert.equal(stored().activationId, "act-1");
});

test("a key for another product does not count (the store is shared with BlockNSFW)", async () => {
  reset();
  answers.validate = reply(200, { ...GRANTED, benefit_id: "blocknsfw-supporter" });
  assert.deepEqual(await P.activate(KEY, T0), { ok: false, status: "invalid" });
  assert.equal(backing.has(P.LICENCE_KEY), false);
});

test("an unknown or refunded key is refused and does not replace a good one", async () => {
  reset();
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);

  answers.validate = reply(404, { error: "ResourceNotFound" });
  assert.deepEqual(await P.activate("SIEVE-TYPO", T0 + 1), { ok: false, status: "invalid" });
  answers.validate = reply(200, { ...GRANTED, status: "revoked" });
  assert.deepEqual(await P.activate("SIEVE-OTHER", T0 + 2), { ok: false, status: "revoked" });

  assert.equal(stored().key, KEY);
  assert.equal(await P.isPro(T0 + 3), true);
});

test("offline, rate-limited or a server error: no answer, nothing changes", async () => {
  for (const answer of [offline(), reply(500), reply(429), reply(408)]) {
    reset();
    answers.validate = answer;
    const result = await P.activate(KEY, T0);
    assert.equal(result.ok, false);
    assert.equal(result.offline, true);
    assert.equal(backing.has(P.LICENCE_KEY), false);
  }
});

test("an empty key never reaches the network", async () => {
  reset();
  assert.deepEqual(await P.activate("   ", T0), { ok: false, status: "invalid" });
  assert.equal(calls.length, 0);
});

test("the weekly check runs once a week, not on every page load", async () => {
  reset();
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);
  calls = [];

  assert.deepEqual(await P.refreshIfDue(T0 + 6 * DAY), { checked: false });
  assert.equal(calls.length, 0);
  assert.deepEqual(await P.refreshIfDue(T0 + 7 * DAY), { checked: true, status: "granted" });
  assert.equal(calls.length, 1);
  assert.equal(stored().checkedAt, T0 + 7 * DAY);
});

test("the weekly check asks with this browser's place", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-1" });
  await P.activate(KEY, T0);
  calls = [];
  assert.deepEqual(await P.refreshIfDue(T0 + 8 * DAY), { checked: true, status: "granted" });
  assert.equal(calls[0].body.activation_id, "act-1");
});

test("a place given back on the purchases page reads as removed, not refunded", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-1" });
  await P.activate(KEY, T0);

  // Asked with the old place: no. Asked without it: the key itself still works.
  answers.validate = (body) => (body.activation_id ? reply(404)() : reply(200, LIMITED)());
  assert.deepEqual(await P.refreshIfDue(T0 + 8 * DAY), { checked: true, status: "removed" });
  assert.equal(await P.isPro(T0 + 8 * DAY), false);
  assert.equal(stored().activationId, "");

  // Entering the key again takes a place back.
  answers.activate = reply(200, { id: "act-2" });
  assert.deepEqual(await P.activate(KEY, T0 + 9 * DAY), { ok: true });
  assert.equal(stored().activationId, "act-2");
});

test("a refund with a place held reads as revoked", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-1" });
  await P.activate(KEY, T0);
  answers.validate = (body) => (body.activation_id ? reply(404)() : reply(200, { ...LIMITED, status: "revoked" })());
  assert.deepEqual(await P.refreshIfDue(T0 + 8 * DAY), { checked: true, status: "revoked" });
  assert.equal(stored().key, KEY, "kept, so Settings can say what happened");
});

test("a limit set in Polar after the key was entered: a place is taken at the next check", async () => {
  reset();
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);

  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-late" });
  assert.deepEqual(await P.refreshIfDue(T0 + 8 * DAY), { checked: true, status: "granted" });
  assert.equal(stored().activationId, "act-late");

  // ...or, with every place already taken, this browser is the one without.
  reset();
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(403);
  assert.deepEqual(await P.refreshIfDue(T0 + 8 * DAY), { checked: true, status: "removed" });
});

test("a dropped connection during the weekly check keeps Pro", async () => {
  reset();
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);
  answers.validate = offline();
  assert.deepEqual(await P.refreshIfDue(T0 + 30 * DAY), { checked: false, offline: true });
  assert.equal(await P.isPro(T0 + 30 * DAY), true);
});

test("a key that is no longer granted is not checked again every week", async () => {
  reset();
  backing.set(P.LICENCE_KEY, { key: KEY, status: "revoked", checkedAt: T0 });
  assert.deepEqual(await P.refreshIfDue(T0 + 30 * DAY), { checked: false });
  assert.equal(calls.length, 0);
});

test("a clock moved backwards does not postpone the check", async () => {
  reset();
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);
  calls = [];
  assert.equal((await P.refreshIfDue(T0 - 365 * DAY)).checked, true);
  assert.equal(calls.length, 1);
});

test("remove: the place is given back first, then the key forgotten", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-1" });
  await P.activate(KEY, T0);
  calls = [];

  answers.deactivate = reply(204);
  assert.deepEqual(await P.release(), { ok: true });
  assert.deepEqual(endpoints(), ["deactivate"]);
  assert.deepEqual(calls[0].body, { key: KEY, organization_id: "org-test", activation_id: "act-1" });
  assert.equal(backing.has(P.LICENCE_KEY), false);
});

test("remove offline keeps the key, so the place is not left taken", async () => {
  for (const answer of [offline(), reply(500)]) {
    reset();
    answers.validate = reply(200, LIMITED);
    answers.activate = reply(200, { id: "act-1" });
    await P.activate(KEY, T0);
    answers.deactivate = answer;
    assert.deepEqual(await P.release(), { ok: false, offline: true });
    assert.equal(stored().activationId, "act-1");
  }
});

test("remove: a place Polar no longer has is gone already, and a key with no place just goes", async () => {
  reset();
  answers.validate = reply(200, LIMITED);
  answers.activate = reply(200, { id: "act-1" });
  await P.activate(KEY, T0);
  answers.deactivate = reply(404);
  assert.deepEqual(await P.release(), { ok: true });
  assert.equal(backing.has(P.LICENCE_KEY), false);

  reset();
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);
  calls = [];
  assert.deepEqual(await P.release(), { ok: true });
  assert.equal(calls.length, 0);
});

test("Firefox: nothing is sent without its consent, and it is asked from Activate", async () => {
  reset();
  manifest = FIREFOX;
  consent = { granted: false, answer: false, requests: 0 };
  answers.validate = reply(200, GRANTED);

  assert.equal(P.needsConsent(), true);
  assert.deepEqual(await P.activate(KEY, T0), { ok: false, offline: true, reason: "no-consent" });
  assert.equal(calls.length, 0);

  assert.equal(await P.askConsent(), false);
  consent.answer = true;
  assert.equal(await P.askConsent(), true);
  assert.equal(consent.requests, 2);
  assert.deepEqual(await P.activate(KEY, T0), { ok: true });
});

test("Firefox: consent withdrawn later stops the weekly check, and Pro stays as it was", async () => {
  reset();
  manifest = FIREFOX;
  answers.validate = reply(200, GRANTED);
  await P.activate(KEY, T0);
  consent.granted = false;
  calls = [];
  assert.deepEqual(await P.refreshIfDue(T0 + 8 * DAY), { checked: false, offline: true });
  assert.equal(calls.length, 0);
  assert.equal(await P.isPro(T0 + 8 * DAY), true);
});

test("Chrome and Edge never ask", async () => {
  reset();
  assert.equal(P.needsConsent(), false);
  assert.equal(await P.askConsent(), true);
  assert.equal(consent.requests, 0);
});

test("without an organisation id nothing is sent", async () => {
  reset();
  answers.validate = reply(200, GRANTED);
  LIVE.organizationId = "";
  try {
    const result = await P.activate(KEY, T0);
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  } finally {
    LIVE.organizationId = "org-test";
  }
});

test("without Sieve Pro's benefit named, nothing is sent", async () => {
  reset();
  answers.validate = reply(200, { ...GRANTED, benefit_id: "blocknsfw-supporter" });
  LIVE.benefitIds = [];
  try {
    assert.equal(P.isConfigured(), false);
    const result = await P.activate(KEY, T0);
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  } finally {
    LIVE.benefitIds = ["benefit-pro"];
  }
});

test("sandbox mode uses the test store's own ids, address, checkout and purchases page", async () => {
  reset();
  const sandbox = SHIPPED.stores.sandbox;
  answers.validate = reply(200, { ...GRANTED, benefit_id: sandbox.benefitIds[0] });
  P.CONFIG.mode = "sandbox";
  try {
    assert.deepEqual(await P.activate(KEY, T0), { ok: true });
    assert.match(calls[0].url, /^https:\/\/sandbox-api\.polar\.sh\//);
    assert.equal(calls[0].body.organization_id, sandbox.organizationId);
    assert.equal(P.checkoutUrl(), sandbox.checkoutUrl);
    assert.match(P.portalUrl(), /^https:\/\/sandbox\.polar\.sh\//);
  } finally {
    P.CONFIG.mode = "live";
  }
});

test("the shipped config: live mode, Monolab's live store, and a complete sandbox", () => {
  assert.equal(SHIPPED.mode, "live");
  const { live, sandbox } = SHIPPED.stores;
  assert.equal(live.organizationId, "354a2f6c-8ea7-46a7-87c5-f97645c12e29");
  assert.equal(live.api, "https://api.polar.sh");
  assert.equal(live.portal, "https://polar.sh/monolab/portal");
  // Sieve Supporter on sale: its licence-key benefit, and the checkout link
  // with the launch discount preset. A store package refuses to build
  // without them (build-pro.mjs).
  assert.deepEqual(live.benefitIds, ["4c41be51-3c05-44a5-ac59-76108b4b8b6c"]);
  assert.equal(live.checkoutUrl, "https://buy.polar.sh/polar_cl_qjDvSCcQ0ADA26pvzsvFIutGFMuX0HVcE4EwI2ZOsU1");
  assert.ok(!live.benefitIds.some((id) => sandbox.benefitIds.includes(id)), "a sandbox benefit never sells live");
  assert.notEqual(sandbox.organizationId, live.organizationId, "the sandbox is a separate store");
  assert.match(sandbox.organizationId, /^[0-9a-f-]{36}$/);
  assert.equal(sandbox.benefitIds.length, 1);
  assert.match(sandbox.checkoutUrl, /^https:\/\/sandbox-api\.polar\.sh\/v1\/checkout-links\/polar_cl_\w+\/redirect$/);
  assert.equal(sandbox.api, "https://sandbox-api.polar.sh");
});

test("the launch price is quoted until its last day, then the full price, with no update needed", () => {
  assert.equal(SHIPPED.priceLabel, "$34.99");
  assert.deepEqual(SHIPPED.launch, { priceLabel: "$24.99", until: "2027-01-01" });
  // Local times, as the buyer's clock reads them.
  const lastEvening = new Date(2026, 11, 31, 23, 59, 59).getTime();
  const firstMorning = new Date(2027, 0, 1, 0, 0, 0).getTime();

  const during = P.price(new Date(2026, 10, 20, 12).getTime());
  assert.equal(during.label, "$24.99");
  assert.equal(during.regular, "$34.99");
  assert.equal(during.launch, true);
  assert.deepEqual([during.lastDay.getFullYear(), during.lastDay.getMonth(), during.lastDay.getDate()], [2026, 11, 31]);

  assert.equal(P.price(lastEvening).label, "$24.99");
  assert.deepEqual(P.price(firstMorning), { label: "$34.99", regular: "$34.99", launch: false, lastDay: null });
  assert.equal(P.price(firstMorning + 90 * DAY).label, "$34.99");
});

test("no launch price, or a broken one, quotes the full price", () => {
  const saved = P.CONFIG.launch;
  try {
    for (const launch of [undefined, null, {}, { priceLabel: "$24.99" }, { priceLabel: "$24.99", until: "next year" }, { until: "2099-01-01" }]) {
      P.CONFIG.launch = launch;
      assert.deepEqual(P.price(T0), { label: "$34.99", regular: "$34.99", launch: false, lastDay: null }, JSON.stringify(launch));
    }
  } finally {
    P.CONFIG.launch = saved;
  }
});

test("the masked key shows the tail only", () => {
  assert.equal(P.maskKey("1C285B2D-6CE6-4BC7-B8BE-ADB6A7E304DA"), "****-E304DA");
  assert.equal(P.maskKey("--"), "****");
});

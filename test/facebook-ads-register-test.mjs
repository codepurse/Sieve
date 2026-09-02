// test/facebook-ads-register-test.mjs
// Sieve — tests for the registration side of the Facebook ad filter,
// background/facebook-ads.js.
//
//   node --test test/
//
// The scripts' own logic is covered in test/facebook-ads-test.mjs and
// test/facebook-ads-dom-test.mjs. What is tested here is the thing that decides
// whether they are on the page at all, and it has exactly one interesting
// failure mode: registering PART of what the feature needs and reporting
// success. This filter is FOUR registrations, and a profile upgraded from a
// version that shipped fewer of them already holds some — an all-or-nothing "is
// it registered?" check sees that profile as done and never adds the rest, so
// part of the feature is silently missing for exactly the users who had it
// turned on longest.
//
// The world assertions are here for the same reason. The MAIN/ISOLATED split is
// not a style choice: a JSON.parse hook registered in the isolated world would
// patch the content script's own JSON and never see one of Facebook's parses,
// and the DOM half registered in MAIN would have no chrome.runtime to report
// with. Either mistake leaves a feature that loads cleanly and does nothing.

import test from "node:test";
import assert from "node:assert/strict";

// A fake chrome.scripting that records what it was asked to do. The module
// registers listeners at import time, so this has to exist before the import.
function makeChrome(enabled, alreadyRegistered = []) {
  const registered = new Map(alreadyRegistered.map((s) => [s.id, s]));
  const calls = { registered: [], unregistered: [], updated: [] };
  globalThis.chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    storage: {
      local: { get: async (d) => ({ ...d, ssFacebookAdsEnabled: enabled }) },
      onChanged: { addListener() {} },
    },
    scripting: {
      async getRegisteredContentScripts() {
        return [...registered.values()];
      },
      async registerContentScripts(specs) {
        for (const s of specs) {
          if (registered.has(s.id)) throw new Error("duplicate id " + s.id);
          registered.set(s.id, s);
          calls.registered.push(s.id);
        }
      },
      async unregisterContentScripts({ ids }) {
        for (const id of ids) {
          registered.delete(id);
          calls.unregistered.push(id);
        }
      },
      async updateContentScripts(specs) {
        for (const s of specs) calls.updated.push(s.id);
      },
    },
  };
  return { registered, calls };
}

// One import for the whole file — the module installs listeners at import time
// and re-importing would not re-run them. Every test swaps globalThis.chrome
// underneath it instead.
makeChrome(false);
await import("../background/facebook-ads.js");
// The specs come off the module's own test hook rather than its exports, the
// same way test/youtube-ads-register-test.mjs reaches them: that hook is what a
// person debugging this in the service-worker console has, so a test that used a
// different route could pass while the documented one was broken.
const mod = globalThis.sieveFacebookAds;
const ALL_IDS = mod.SPECS.map((s) => s.id).sort();

test("with the toggle on and nothing registered, everything is registered", async () => {
  const { calls, registered } = makeChrome(true);
  await mod.applyFacebookAdsScript();
  assert.deepEqual(calls.registered.sort(), ALL_IDS);
  assert.equal(registered.size, mod.SPECS.length);
});

test("a profile holding only the older scriptlet gets the rest added", async () => {
  // The upgrade case. An all-or-nothing check would see "already registered" and
  // leave this profile with a payload pass and no DOM backstop for good.
  const { calls } = makeChrome(true, [mod.SCRIPT_SPEC]);
  await mod.applyFacebookAdsScript();
  assert.deepEqual(
    calls.registered.sort(),
    [mod.DOM_SPEC.id, mod.STYLE_SPEC.id, mod.BRIDGE_SPEC.id].sort()
  );
  assert.deepEqual(calls.updated, [mod.SCRIPT_SPEC.id], "the one already there is re-asserted");
});

test("with the toggle off, everything registered is removed", async () => {
  const { calls, registered } = makeChrome(false, mod.SPECS);
  await mod.applyFacebookAdsScript();
  assert.deepEqual(calls.unregistered.sort(), ALL_IDS);
  assert.equal(registered.size, 0);
});

test("with the toggle off and nothing registered, nothing is called", async () => {
  const { calls } = makeChrome(false);
  await mod.applyFacebookAdsScript();
  assert.deepEqual(calls.unregistered, []);
  assert.deepEqual(calls.registered, []);
});

test("applying twice does not register a duplicate", async () => {
  // registerContentScripts throws on a duplicate id, and the enqueue chain
  // swallows that — so a regression here is a silent no-op, not an error.
  const { calls } = makeChrome(true);
  await mod.applyFacebookAdsScript();
  await mod.applyFacebookAdsScript();
  assert.deepEqual(calls.registered.sort(), ALL_IDS, "registered exactly once each");
});

test("the payload half is MAIN world at document_start", async () => {
  assert.equal(mod.SCRIPT_SPEC.world, "MAIN");
  assert.equal(mod.SCRIPT_SPEC.runAt, "document_start");
});

test("the DOM half and the bridge are NOT MAIN world", async () => {
  // The DOM half needs chrome.runtime and the bridge is the only half that can
  // reach it at all; MAIN would leave both mute.
  assert.notEqual(mod.DOM_SPEC.world, "MAIN");
  assert.notEqual(mod.BRIDGE_SPEC.world, "MAIN");
});

test("every spec is scoped to facebook.com and nowhere else", async () => {
  for (const spec of mod.SPECS) {
    assert.deepEqual(spec.matches, ["*://*.facebook.com/*"], spec.id);
  }
});

test("the stylesheet is registered as css, not as a script", async () => {
  assert.ok(Array.isArray(mod.STYLE_SPEC.css) && mod.STYLE_SPEC.css.length === 1);
  assert.equal(mod.STYLE_SPEC.js, undefined);
});

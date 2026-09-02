// test/youtube-ads-register-test.mjs
// Sieve — tests for the registration side of the YouTube ad filter,
// background/youtube-ads.js.
//
//   node --test test/
//
// The scriptlet's own logic is covered in test/youtube-ads-test.mjs. What is
// tested here is the thing that decides whether that scriptlet is on the page at
// all, and it has exactly one interesting failure mode: registering PART of what
// the feature needs and reporting success. The filter is two registrations now —
// a MAIN-world scriptlet and a stylesheet — and a profile upgraded from the
// version that had only the scriptlet already holds one of them. An all-or-
// nothing "is it registered?" check sees that profile as done and never adds the
// stylesheet, so half the feature is silently missing for exactly the users who
// had it turned on longest.

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
      local: { get: async (d) => ({ ...d, ssYouTubeAdsEnabled: enabled }) },
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
        for (const id of ids) { registered.delete(id); calls.unregistered.push(id); }
      },
      async updateContentScripts(specs) {
        for (const s of specs) calls.updated.push(s.id);
      },
    },
  };
  return { registered, calls };
}

// The module is a singleton once imported, so each test re-points the fake at a
// fresh state rather than re-importing it.
makeChrome(false);
const mod = await import("../background/youtube-ads.js");
const { applyYouTubeAdsScript, SPECS } = globalThis.sieveYouTubeAds;

const ids = () => SPECS.map((s) => s.id);

test("the filter registers both the scriptlet and the stylesheet when it is on", async () => {
  const { registered, calls } = makeChrome(true);
  await applyYouTubeAdsScript();
  assert.deepEqual([...registered.keys()].sort(), ids().sort());
  assert.deepEqual(calls.registered.sort(), ids().sort());
});

test("an upgraded profile that already has the scriptlet gains the stylesheet", async () => {
  // The regression this file exists for. Before, the check was "is the scriptlet
  // id registered?" — true here — so nothing else was ever added.
  const scriptOnly = SPECS.filter((s) => s.js);
  const { registered, calls } = makeChrome(true, scriptOnly);
  await applyYouTubeAdsScript();
  assert.deepEqual([...registered.keys()].sort(), ids().sort(), "the missing piece must be added");
  const styleIds = SPECS.filter((s) => s.css).map((s) => s.id);
  assert.deepEqual(calls.registered, styleIds, "and ONLY the missing piece registered");
  assert.deepEqual(calls.updated, scriptOnly.map((s) => s.id), "the one already there is re-asserted, not re-registered");
});

test("turning it off removes everything the filter put on the page", async () => {
  const { registered, calls } = makeChrome(false, SPECS);
  await applyYouTubeAdsScript();
  assert.equal(registered.size, 0);
  assert.deepEqual(calls.unregistered.sort(), ids().sort());
});

test("applying it twice does not try to register a duplicate id", async () => {
  // registerContentScripts rejects on a duplicate id, and the fake above throws
  // the same way, so a second apply that got this wrong would fail loudly here
  // rather than only in a user's console.
  const { registered } = makeChrome(true);
  await applyYouTubeAdsScript();
  await applyYouTubeAdsScript();
  assert.deepEqual([...registered.keys()].sort(), ids().sort());
});

test("with the toggle off and nothing registered, it does no work at all", async () => {
  const { calls } = makeChrome(false);
  await applyYouTubeAdsScript();
  assert.deepEqual(calls.unregistered, [], "an empty unregister call throws on some builds");
  assert.deepEqual(calls.registered, []);
});

test("the stylesheet is registered at document_start, or an ad slot flashes first", async () => {
  const style = SPECS.find((s) => s.css);
  assert.ok(style, "the cosmetic half must be part of the registration");
  assert.equal(style.runAt, "document_start");
  assert.deepEqual(style.matches, mod.SCRIPT_SPEC ? mod.SCRIPT_SPEC.matches : style.matches);
  assert.ok(!style.world, "a stylesheet has no world; setting one is rejected on some builds");
});

test("the scriptlet and its bridge are registered into DIFFERENT worlds", async () => {
  // The whole reason there are two scripts. The scriptlet must be MAIN to see
  // YouTube's page globals, which costs it every chrome.* API; the bridge must be
  // isolated to have chrome.runtime at all. Register both into one world and the
  // feature still blocks ads but silently stops counting them — or, worse, the
  // MAIN-world half loses the globals it exists for.
  const main = SPECS.find((s) => s.js && s.js.some((f) => f.endsWith("content/youtube-ads.js")));
  const bridge = SPECS.find((s) => s.js && s.js.some((f) => f.endsWith("content/youtube-ads-bridge.js")));
  assert.ok(main, "the scriptlet must be registered");
  assert.ok(bridge, "the bridge must be registered");
  assert.equal(main.world, "MAIN");
  assert.ok(!bridge.world || bridge.world === "ISOLATED", "the bridge needs chrome.runtime");
});

test("the bridge is listening before the scriptlet can report", async () => {
  // The scriptlet batches for a second before its first post, so this is not
  // tight — but a bridge that arrived at document_idle would miss the pre-roll on
  // a cold load, which is the one ad a user most expects to see counted.
  const bridge = SPECS.find((s) => s.js && s.js.some((f) => f.endsWith("content/youtube-ads-bridge.js")));
  assert.equal(bridge.runAt, "document_start");
  assert.equal(bridge.allFrames, true, "embedded players report from their own frame");
});

test("the bridge is removed with the rest when the toggle goes off", async () => {
  // It is registered dynamically for the same reason as the scriptlet: nothing
  // of this feature should sit on YouTube while the feature is off. A bridge left
  // behind would be a message listener on every YouTube page for a switch the
  // user turned off.
  const bridgeId = SPECS.find((s) =>
    s.js && s.js.some((f) => f.endsWith("content/youtube-ads-bridge.js"))
  ).id;
  const { registered, calls } = makeChrome(false, SPECS);
  await applyYouTubeAdsScript();
  assert.equal(registered.has(bridgeId), false);
  assert.ok(calls.unregistered.includes(bridgeId));
});

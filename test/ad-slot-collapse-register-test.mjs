// test/ad-slot-collapse-register-test.mjs
// Sieve — tests for background/ad-slot-collapse.js.
//
//   node --test test/
//
// The script's own logic is in test/ad-slot-collapse-test.mjs. Two things here
// break invisibly if they regress, and both are the same traps the anti-adblock
// registration has:
//
//   • an allowlist EDIT must re-push the spec, even though the id is already
//     registered and nothing looks missing — excludeMatches is the only thing
//     that changed, and it is the only mechanism that keeps this script off a
//     site the user asked to be left alone;
//   • a profile upgrading with the Ad & Trackers switch already ON must adopt
//     this key, or the switch says on while this mechanism never runs.

import test from "node:test";
import assert from "node:assert/strict";

function makeChrome(enabled, allowlist = [], alreadyRegistered = []) {
  const registered = new Map(alreadyRegistered.map((s) => [s.id, s]));
  const calls = { registered: [], unregistered: [], updated: [] };
  globalThis.chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    storage: {
      local: { get: async (d) => ({ ...d, ssAdSlotCollapseEnabled: enabled, allowlist }) },
      onChanged: { addListener() {} },
    },
    scripting: {
      getRegisteredContentScripts: async () => [...registered.values()],
      registerContentScripts: async (specs) => {
        for (const s of specs) {
          if (registered.has(s.id)) throw new Error("duplicate id " + s.id);
          registered.set(s.id, s);
          calls.registered.push(s);
        }
      },
      unregisterContentScripts: async ({ ids }) => {
        for (const id of ids) {
          registered.delete(id);
          calls.unregistered.push(id);
        }
      },
      updateContentScripts: async (specs) => {
        for (const s of specs) {
          registered.set(s.id, s);
          calls.updated.push(s);
        }
      },
    },
  };
  return { registered, calls };
}

// A storage fake that models ABSENCE, which the one above cannot — adoption
// turns entirely on telling "never written" apart from "written false".
function makeStoreChrome(store) {
  const written = [];
  globalThis.chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    storage: {
      local: {
        get: async (arg) => {
          if (typeof arg === "string") {
            return Object.prototype.hasOwnProperty.call(store, arg) ? { [arg]: store[arg] } : {};
          }
          if (Array.isArray(arg)) {
            const out = {};
            for (const k of arg) if (Object.prototype.hasOwnProperty.call(store, k)) out[k] = store[k];
            return out;
          }
          const out = { ...arg };
          for (const k of Object.keys(arg || {})) {
            if (Object.prototype.hasOwnProperty.call(store, k)) out[k] = store[k];
          }
          return out;
        },
        set: async (patch) => {
          Object.assign(store, patch);
          written.push(patch);
        },
      },
      onChanged: { addListener() {} },
    },
    scripting: {
      getRegisteredContentScripts: async () => [],
      registerContentScripts: async () => {},
      unregisterContentScripts: async () => {},
      updateContentScripts: async () => {},
    },
  };
  return { store, written };
}

makeChrome(false);
await import("../background/ad-slot-collapse.js");
const { applyAdSlotCollapseScript, adoptSwitchState, allowlistToExcludeMatches, buildSpecs, SPEC_IDS } =
  globalThis.sieveAdSlotCollapse;

test("the script registers when the toggle is on and goes away when it is off", async () => {
  let { registered } = makeChrome(true);
  await applyAdSlotCollapseScript();
  assert.deepEqual([...registered.keys()], [...SPEC_IDS]);

  ({ registered } = makeChrome(false, [], SPEC_IDS.map((id) => ({ id }))));
  await applyAdSlotCollapseScript();
  assert.equal(registered.size, 0);
});

test("it stays in the isolated world, at document_start", async () => {
  // Isolated because it needs chrome.runtime to report a count and no page
  // globals at all. document_start is for the observer, not the collapse — that
  // is twelve seconds later.
  const { registered } = makeChrome(true);
  await applyAdSlotCollapseScript();
  const spec = [...registered.values()][0];
  assert.equal(spec.world, undefined);
  assert.equal(spec.runAt, "document_start");
  assert.equal(spec.allFrames, false);
  assert.equal(spec.persistAcrossSessions, true);
  assert.deepEqual(spec.matches, ["*://*/*"]);
  assert.deepEqual(spec.js, ["content/ad-slot-collapse.js"]);
});

test("an allowlisted domain keeps the script off that site entirely", () => {
  assert.deepEqual(allowlistToExcludeMatches(["example.com"]), ["*://*.example.com/*"]);
  assert.deepEqual(allowlistToExcludeMatches(["*.Example.COM"]), ["*://*.example.com/*"]);
  // Junk is dropped rather than risking the whole all-or-nothing registration.
  assert.deepEqual(allowlistToExcludeMatches(["no-dot", "a note", "http://x.com", "x.com/p", null, 7]), []);
  // An empty allowlist omits the key instead of sending [].
  for (const s of buildSpecs([])) assert.ok(!("excludeMatches" in s));
});

test("editing the allowlist re-pushes the spec even though the id is present", async () => {
  const { registered, calls } = makeChrome(true, ["shop.example"], SPEC_IDS.map((id) => ({ id })));
  await applyAdSlotCollapseScript();
  assert.deepEqual(calls.registered, [], "nothing was missing");
  assert.equal(calls.updated.length, 1, "but it still had to be updated");
  assert.deepEqual([...registered.values()][0].excludeMatches, ["*://*.shop.example/*"]);
});

test("a profile with the switch already on adopts this mechanism", async () => {
  const { store, written } = makeStoreChrome({ ssAdTrackerEnabled: true });
  assert.equal(await adoptSwitchState(), true);
  assert.equal(store.ssAdSlotCollapseEnabled, true);
  assert.deepEqual(written, [{ ssAdSlotCollapseEnabled: true }]);
});

test("the anti-adblock key counts as a sibling too", async () => {
  // It shipped in the same release, so a profile could have that one on and this
  // one absent.
  const { store } = makeStoreChrome({ ssAntiAdblockEnabled: true });
  assert.equal(await adoptSwitchState(), true);
  assert.equal(store.ssAdSlotCollapseEnabled, true);
});

test("a stored false is a decision and is left alone", async () => {
  const { store, written } = makeStoreChrome({
    ssAdTrackerEnabled: true,
    ssAdSlotCollapseEnabled: false,
  });
  assert.equal(await adoptSwitchState(), false);
  assert.equal(store.ssAdSlotCollapseEnabled, false);
  assert.deepEqual(written, []);
});

test("a profile with the switch off gains nothing, and adopting is one-shot", async () => {
  const { store, written } = makeStoreChrome({});
  assert.equal(await adoptSwitchState(), false);
  assert.ok(!("ssAdSlotCollapseEnabled" in store));

  const second = makeStoreChrome({ ssFacebookAdsEnabled: true });
  assert.equal(await adoptSwitchState(), true);
  assert.equal(await adoptSwitchState(), false);
  assert.equal(second.written.length, 1);
  void written;
});

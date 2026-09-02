// test/anti-adblock-register-test.mjs
// Sieve — tests for the registration side of the anti-adblock filter,
// background/anti-adblock.js.
//
//   node --test test/
//
// The scripts' own logic is covered in test/anti-adblock-test.mjs and
// test/anti-adblock-dom-test.mjs. What is tested here is what decides whether
// they are on the page at all, and it has two interesting failure modes.
//
// PART OF THE FEATURE, REPORTED AS SUCCESS. Same trap as
// test/youtube-ads-register-test.mjs exists for: a profile upgraded from a
// version that registered only one of the two scripts already holds one id, and
// an all-or-nothing "is it registered?" check reads that as done. Half the
// feature then stays missing for exactly the users who had it on longest.
//
// THE ALLOWLIST. This is the only feature in the extension whose allowlist is
// enforced by excludeMatches rather than by a DNR allow rule, because a
// document_start MAIN-world script has already run by the time anything could
// read storage. Two things therefore have to hold, and neither is visible from
// the outside if it breaks: an allowlisted site must produce a match pattern,
// and an EDIT to the allowlist must re-push the specs even though both ids are
// already registered and nothing looks missing.

import test from "node:test";
import assert from "node:assert/strict";

// A fake chrome.scripting that records what it was asked to do. The module
// registers listeners at import time, so this has to exist before the import.
function makeChrome(enabled, allowlist = [], alreadyRegistered = []) {
  const registered = new Map(alreadyRegistered.map((s) => [s.id, s]));
  const calls = { registered: [], unregistered: [], updated: [] };
  globalThis.chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    storage: {
      local: {
        get: async (d) => ({ ...d, ssAntiAdblockEnabled: enabled, allowlist }),
      },
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
          calls.registered.push(s);
        }
      },
      async unregisterContentScripts({ ids }) {
        for (const id of ids) {
          registered.delete(id);
          calls.unregistered.push(id);
        }
      },
      async updateContentScripts(specs) {
        for (const s of specs) {
          registered.set(s.id, s);
          calls.updated.push(s);
        }
      },
    },
  };
  return { registered, calls };
}

// The module is a singleton once imported, so each test re-points the fake at a
// fresh state rather than re-importing it.
makeChrome(false);
await import("../background/anti-adblock.js");
const { applyAntiAdblockScript, allowlistToExcludeMatches, buildSpecs, SPEC_IDS } =
  globalThis.sieveAntiAdblock;

// ===========================================================================
// Registering and unregistering
// ===========================================================================

test("both halves register when the toggle is on", () => {
  return (async () => {
    const { registered, calls } = makeChrome(true);
    await applyAntiAdblockScript();
    assert.deepEqual([...registered.keys()].sort(), [...SPEC_IDS].sort());
    assert.deepEqual(calls.registered.map((s) => s.id).sort(), [...SPEC_IDS].sort());
  })();
});

test("an upgraded profile that already has one half gains the other", async () => {
  const { registered, calls } = makeChrome(true, [], [{ id: SPEC_IDS[0] }]);
  await applyAntiAdblockScript();
  assert.deepEqual([...registered.keys()].sort(), [...SPEC_IDS].sort());
  assert.deepEqual(calls.registered.map((s) => s.id), [SPEC_IDS[1]]);
  assert.deepEqual(calls.updated.map((s) => s.id), [SPEC_IDS[0]], "the one already there is re-pushed");
});

test("turning the toggle off removes everything and leaves nothing behind", async () => {
  const { registered, calls } = makeChrome(false, [], SPEC_IDS.map((id) => ({ id })));
  await applyAntiAdblockScript();
  assert.equal(registered.size, 0);
  assert.deepEqual(calls.unregistered.sort(), [...SPEC_IDS].sort());
  assert.deepEqual(calls.registered, []);
});

test("applying twice with nothing changed registers nothing twice", async () => {
  const { calls } = makeChrome(true);
  await applyAntiAdblockScript();
  await applyAntiAdblockScript();
  assert.deepEqual(calls.registered.map((s) => s.id).sort(), [...SPEC_IDS].sort());
});

// ===========================================================================
// The two worlds
// ===========================================================================

test("one half is MAIN and one is isolated, both at document_start", async () => {
  // Not a style preference. The MAIN half has to see page globals and the DOM
  // half has to have chrome.runtime and an unpatched getComputedStyle; swap
  // either and that half silently does nothing at all.
  const { registered } = makeChrome(true);
  await applyAntiAdblockScript();
  const specs = [...registered.values()];

  const main = specs.find((s) => s.js.includes("content/anti-adblock.js"));
  const dom = specs.find((s) => s.js.includes("content/anti-adblock-dom.js"));
  assert.ok(main && dom);
  assert.equal(main.world, "MAIN");
  assert.equal(dom.world, undefined, "the DOM half must stay in the isolated world");
  for (const s of specs) {
    assert.equal(s.runAt, "document_start");
    assert.equal(s.allFrames, false, "the detector and the wall live in the top document");
    assert.equal(s.persistAcrossSessions, true);
    assert.deepEqual(s.matches, ["*://*/*"]);
  }
});

// ===========================================================================
// The allowlist
// ===========================================================================

test("an allowlisted domain becomes a match pattern covering its subdomains", () => {
  // Same scope the DNR allow rule gives (requestDomains matches subdomains too),
  // so a site is spared here exactly as widely as it is there.
  assert.deepEqual(allowlistToExcludeMatches(["example.com"]), ["*://*.example.com/*"]);
  assert.deepEqual(allowlistToExcludeMatches(["My.Bank.co.uk"]), ["*://*.my.bank.co.uk/*"]);
  assert.deepEqual(allowlistToExcludeMatches(["*.example.com"]), ["*://*.example.com/*"]);
});

test("anything that is not a bare hostname is dropped rather than risked", () => {
  // registerContentScripts is all-or-nothing: one malformed pattern takes both
  // scripts down. The allowlist is free text the user typed, so it is gated here
  // instead of being handed to the browser and hoped for.
  const junk = [
    "", "   ", "no-dot", ".example.com", "example.com.", "example..com",
    "http://example.com", "example.com/path", "example.com:8080",
    "a note to self", "*", "*.*", "192.168.0.1/24", "-bad.com", "bad-.com",
    null, undefined, 42, {},
  ];
  assert.deepEqual(allowlistToExcludeMatches(junk), []);
  // …and a bad entry does not take the good ones with it.
  assert.deepEqual(allowlistToExcludeMatches(["a note", "good.example", "also bad/"]), [
    "*://*.good.example/*",
  ]);
});

test("a pasted blocklist is capped rather than shipped whole", () => {
  const many = Array.from({ length: 2000 }, (_, i) => `d${i}.example.com`);
  const out = allowlistToExcludeMatches(many);
  assert.equal(out.length, 500);
});

test("an empty allowlist omits the key instead of sending an empty array", () => {
  // DNR rejects an empty array for its exclusion fields and some scripting
  // builds do the same. Omitting it also keeps the registered spec byte-identical
  // to what it was before this feature learned about the allowlist.
  for (const spec of buildSpecs([])) {
    assert.ok(!("excludeMatches" in spec), `${spec.id} must not carry an empty excludeMatches`);
  }
  for (const spec of buildSpecs(["example.com"])) {
    assert.deepEqual(spec.excludeMatches, ["*://*.example.com/*"]);
  }
});

test("editing the allowlist re-pushes the specs even though both ids are present", async () => {
  // The failure this test exists for. Both scripts are already registered, so a
  // reconcile that only looks for MISSING ids finds nothing to do and returns —
  // and the site the user just allowlisted keeps getting a MAIN-world script
  // rewriting its globals, with no way to tell from the settings page.
  const { registered, calls } = makeChrome(true, ["shop.example"], SPEC_IDS.map((id) => ({ id })));
  await applyAntiAdblockScript();

  assert.deepEqual(calls.registered, [], "nothing was missing");
  assert.equal(calls.updated.length, SPEC_IDS.length, "both had to be updated");
  for (const spec of registered.values()) {
    assert.deepEqual(spec.excludeMatches, ["*://*.shop.example/*"]);
  }
});

test("if the exclusions are refused, register without them rather than not at all", async () => {
  // A silent failure to register is the worst outcome here: the user switched
  // the feature on and it never runs. Losing the exclusion is a smaller loss —
  // the DNR allow rule still spares the requests on those sites.
  const { registered, calls } = makeChrome(true, ["example.com"]);
  const real = chrome.scripting.registerContentScripts;
  let attempts = 0;
  chrome.scripting.registerContentScripts = async (specs) => {
    attempts++;
    if (specs.some((s) => s.excludeMatches)) throw new Error("Invalid match pattern");
    return real(specs);
  };

  await applyAntiAdblockScript();
  assert.equal(attempts, 2, "one attempt with the exclusions, one without");
  assert.deepEqual([...registered.keys()].sort(), [...SPEC_IDS].sort());
  for (const spec of calls.registered) {
    assert.ok(!("excludeMatches" in spec));
  }
});

// ===========================================================================
// Adopting the switch on upgrade
// ===========================================================================
//
// These need a storage fake that models ABSENCE, which makeChrome above does
// not: its get() always answers with the key present, which is fine for every
// other test here and is the one thing adoption has to be able to tell apart.
function makeStoreChrome(store) {
  const written = [];
  globalThis.chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    storage: {
      local: {
        // Real semantics: a key that was never written is simply absent from
        // the result. A string or array argument adds no defaults.
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

test("a profile with the switch already on adopts this mechanism too", async () => {
  // The bug this exists for. The settings page shows ONE switch over five keys
  // and calls it on if ANY of them is on — so a profile upgrading into this
  // release reads as ON while the fifth key sits at its default false. The user
  // sees a switch that says on, gets none of this, and the only way out is to
  // toggle off (which asks for the PIN) and on again.
  const { store, written } = makeStoreChrome({ ssAdTrackerEnabled: true, ssAdNetworkEnabled: true });
  assert.equal(await globalThis.sieveAntiAdblock.adoptSwitchState(), true);
  assert.equal(store.ssAntiAdblockEnabled, true);
  assert.deepEqual(written, [{ ssAntiAdblockEnabled: true }]);
});

test("any one of the four siblings being on is enough", async () => {
  for (const key of ["ssAdTrackerEnabled", "ssAdNetworkEnabled", "ssYouTubeAdsEnabled", "ssFacebookAdsEnabled"]) {
    const { store } = makeStoreChrome({ [key]: true });
    assert.equal(await globalThis.sieveAntiAdblock.adoptSwitchState(), true, key);
    assert.equal(store.ssAntiAdblockEnabled, true, key);
  }
});

test("a stored false is left alone — that is a decision, not an absence", async () => {
  // The failure mode on the other side: reading a stored false as consent would
  // switch this back on at every single update, for exactly the person who went
  // looking for the switch to turn it off.
  const { store, written } = makeStoreChrome({
    ssAdTrackerEnabled: true,
    ssAntiAdblockEnabled: false,
  });
  assert.equal(await globalThis.sieveAntiAdblock.adoptSwitchState(), false);
  assert.equal(store.ssAntiAdblockEnabled, false);
  assert.deepEqual(written, [], "nothing may be written");
});

test("a profile with the switch off gains nothing", async () => {
  const { store, written } = makeStoreChrome({});
  assert.equal(await globalThis.sieveAntiAdblock.adoptSwitchState(), false);
  assert.ok(!("ssAntiAdblockEnabled" in store));
  assert.deepEqual(written, []);
});

test("adopting is one-shot — the write is what stops it repeating", async () => {
  const { written } = makeStoreChrome({ ssYouTubeAdsEnabled: true });
  assert.equal(await globalThis.sieveAntiAdblock.adoptSwitchState(), true);
  assert.equal(await globalThis.sieveAntiAdblock.adoptSwitchState(), false);
  assert.equal(written.length, 1);
});

test("a failure that has nothing to do with the exclusions is not retried", async () => {
  // Otherwise a genuine problem — a bad js path, a duplicate id — is retried
  // identically and then reported in the console as an exclusion problem it is
  // not.
  makeChrome(true, []); // no allowlist, so no exclusions to drop
  let attempts = 0;
  chrome.scripting.registerContentScripts = async () => {
    attempts++;
    throw new Error("Could not load file");
  };
  await applyAntiAdblockScript(); // the module logs and swallows
  assert.equal(attempts, 1);
});

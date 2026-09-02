// test/float-video-register-test.mjs
// Sieve — tests for background/float-video.js.
//
//   node --test test/
//
// The script's own logic is in test/float-video-test.mjs. What is pinned here
// is the registration, where three things break invisibly:
//
//   • an allowlist EDIT must re-push the spec, even though the id is already
//     registered and nothing looks missing — excludeMatches is the only thing
//     that changed, and it is the only mechanism that keeps this off a site the
//     user asked to be left alone;
//   • the built-in exclusions must survive everything, including an allowlist
//     the browser refuses. A lost allowlist entry is a site edited that should
//     not have been; a lost exclusion is somebody's video call losing the
//     picture of the person talking;
//   • this must NOT adopt the shared Ad & Trackers switch. Its two neighbours
//     in that section do, because they are behind it; this one has a switch of
//     its own, so inheriting would turn a page-rearranging feature on for
//     somebody who only ever asked for ad blocking.

import test from "node:test";
import assert from "node:assert/strict";

function makeChrome(enabled, allowlist = [], alreadyRegistered = [], { refuse = false } = {}) {
  const registered = new Map(alreadyRegistered.map((s) => [s.id, s]));
  const calls = { registered: [], unregistered: [], updated: [], refused: 0 };
  globalThis.chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    storage: {
      local: { get: async (d) => ({ ...d, ssFloatVideoEnabled: enabled, allowlist }) },
      onChanged: { addListener() {} },
    },
    scripting: {
      getRegisteredContentScripts: async () => [...registered.values()],
      registerContentScripts: async (specs) => {
        // Model a browser that rejects a pattern list it does not like: the
        // first attempt fails, the retry is allowed through.
        if (refuse && calls.refused === 0) {
          calls.refused++;
          throw new Error("invalid match pattern");
        }
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

makeChrome(false);
await import("../background/float-video.js");
const {
  applyFloatVideoScript,
  allowlistToExcludeMatches,
  buildSpecs,
  EXCLUDED_SITES,
  SPEC_IDS,
} = globalThis.sieveFloatVideo;

// ===========================================================================
// Registration
// ===========================================================================

test("the pair registers when the toggle is on and goes away when it is off", async () => {
  let { registered } = makeChrome(true);
  await applyFloatVideoScript();
  assert.deepEqual([...registered.keys()], [...SPEC_IDS]);

  ({ registered } = makeChrome(false, [], SPEC_IDS.map((id) => ({ id }))));
  await applyFloatVideoScript();
  assert.equal(registered.size, 0);
});

test("the stylesheet ships with the script, in the isolated world at document_start", async () => {
  // The stylesheet is the half that cannot lose a race with the site's own
  // scroll handler, so it has to be in the cascade before the site's first
  // script runs. Losing it from the spec would leave only the JavaScript, which
  // is exactly the racing version this design exists to avoid.
  const { registered } = makeChrome(true);
  await applyFloatVideoScript();
  const spec = [...registered.values()][0];
  assert.deepEqual(spec.css, ["content/float-video.css"]);
  assert.deepEqual(spec.js, ["content/float-video.js"]);
  assert.equal(spec.runAt, "document_start");
  assert.equal(spec.world, undefined);
  assert.equal(spec.allFrames, false);
  assert.equal(spec.persistAcrossSessions, true);
  assert.deepEqual(spec.matches, ["*://*/*"]);
});

// ===========================================================================
// The exclusions
// ===========================================================================

test("an allowlisted domain keeps this off that site entirely", () => {
  assert.deepEqual(allowlistToExcludeMatches(["example.com"]), ["*://*.example.com/*"]);
  assert.deepEqual(allowlistToExcludeMatches(["*.Example.COM"]), ["*://*.example.com/*"]);
  // Junk is dropped rather than risking the whole all-or-nothing registration.
  assert.deepEqual(allowlistToExcludeMatches(["no-dot", "a note", "http://x.com", "x.com/p", null, 7]), []);
});

test("the built-in exclusions are there with an empty allowlist", () => {
  // Unlike its siblings, this spec always carries excludeMatches — the video
  // sites and the call sites are not optional.
  const [spec] = buildSpecs([]);
  assert.deepEqual(spec.excludeMatches, EXCLUDED_SITES);
});

test("video calls and video sites are both excluded", () => {
  const [spec] = buildSpecs([]);
  for (const pattern of [
    "*://meet.google.com/*",
    "*://*.zoom.us/*",
    "*://teams.microsoft.com/*",
    "*://*.youtube.com/*",
    "*://*.twitch.tv/*",
    "*://*.netflix.com/*",
  ]) {
    assert.ok(spec.excludeMatches.includes(pattern), `${pattern} is not excluded`);
  }
});

test("meet.google.com is excluded without excluding the whole of google.com", () => {
  // Google Search, Maps, Docs and everything else must still be covered — a
  // bare-hostname exclusion here would have switched the feature off across all
  // of Google to protect one subdomain.
  const [spec] = buildSpecs([]);
  assert.ok(spec.excludeMatches.includes("*://meet.google.com/*"));
  assert.ok(!spec.excludeMatches.includes("*://*.google.com/*"));
});

test("the allowlist is added to the built-in list, never instead of it", () => {
  const [spec] = buildSpecs(["shop.example"]);
  assert.ok(spec.excludeMatches.includes("*://*.shop.example/*"));
  for (const pattern of EXCLUDED_SITES) assert.ok(spec.excludeMatches.includes(pattern), pattern);
});

test("allowlisting a site that is already excluded does not duplicate it", () => {
  const [spec] = buildSpecs(["youtube.com"]);
  const hits = spec.excludeMatches.filter((p) => p === "*://*.youtube.com/*");
  assert.equal(hits.length, 1);
});

test("editing the allowlist re-pushes the spec even though the id is present", async () => {
  const { registered, calls } = makeChrome(true, ["shop.example"], SPEC_IDS.map((id) => ({ id })));
  await applyFloatVideoScript();
  assert.deepEqual(calls.registered, [], "nothing was missing");
  assert.equal(calls.updated.length, 1, "but it still had to be updated");
  assert.ok([...registered.values()][0].excludeMatches.includes("*://*.shop.example/*"));
});

test("a refused registration retries with the built-in exclusions, not without any", async () => {
  // The siblings drop excludeMatches entirely on a retry. This one must not:
  // the fallback is what decides whether a rejected allowlist costs the user a
  // site edited by mistake, or a meeting.
  const { registered, calls } = makeChrome(true, ["shop.example"], [], { refuse: true });
  await applyFloatVideoScript();
  assert.equal(calls.refused, 1, "the first attempt should have been refused");
  const spec = [...registered.values()][0];
  assert.deepEqual(spec.excludeMatches, EXCLUDED_SITES);
  assert.ok(!spec.excludeMatches.includes("*://*.shop.example/*"));
});

// ===========================================================================
// Staying out of the shared switch
// ===========================================================================

test("this module has no adoption at all", async () => {
  // Its neighbours in the same settings section export adoptSwitchState and
  // inherit the shared Ad & Trackers switch on upgrade. This one must not: it
  // has its own switch, so there is nothing to inherit, and inheriting would
  // switch a page-rearranging feature on for someone who asked for ad blocking.
  assert.equal(globalThis.sieveFloatVideo.adoptSwitchState, undefined);
});

test("its key is not one of the shared switch's keys", async () => {
  // The list in common/adblock-switch.js is what the two adopters read to
  // decide whether the shared switch is on. This key appearing there would make
  // turning THIS on look like evidence that the shared one is on, and the
  // adopters would switch themselves on off the back of it.
  const { ADBLOCK_SWITCH_KEYS } = await import("../common/adblock-switch.js");
  assert.ok(!ADBLOCK_SWITCH_KEYS.includes("ssFloatVideoEnabled"));
});

test("the settings page and the adopters agree on what is behind the shared switch", async () => {
  // Two hand-maintained lists that must not drift — drift between two copies of
  // exactly this list is what put the shared helper in common/ in the first
  // place. options.js is not importable here (it is a classic script for a
  // page), so the list is read out of its source.
  const { ADBLOCK_SWITCH_KEYS } = await import("../common/adblock-switch.js");
  const src = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("../options/options.js", import.meta.url), "utf8")
  );
  const block = /const ADBLOCK_KEYS = \[([^\]]*)\]/.exec(src);
  assert.ok(block, "ADBLOCK_KEYS not found in options/options.js");
  const uiKeys = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(uiKeys, ADBLOCK_SWITCH_KEYS);
  assert.ok(!uiKeys.includes("ssFloatVideoEnabled"));
});

test("the settings page still has a switch of its own for this key", async () => {
  // The whole point of being out of the list above is having one here instead.
  // Without it the key is unreachable and the feature can never be turned on.
  const fs = await import("node:fs");
  const html = fs.readFileSync(new URL("../options/options.html", import.meta.url), "utf8");
  const js = fs.readFileSync(new URL("../options/options.js", import.meta.url), "utf8");
  assert.ok(html.includes('id="float-video-toggle"'), "no checkbox in options.html");
  assert.ok(js.includes('"float-video-toggle"'), "the checkbox is not wired up");
  assert.ok(js.includes('"ssFloatVideoEnabled"'), "the checkbox is not bound to the key");
});

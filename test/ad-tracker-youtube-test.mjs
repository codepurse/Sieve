// test/ad-tracker-youtube-test.mjs
// Sieve — the ad & tracker domain tier always stands down on YouTube.
//
//   node --test test/
//
// On YouTube the ad and tracking domains are Google's, and Google is the site,
// so blocking them protects nobody — but it does refuse the ad's activity and
// viewability reports, and an ad that never reports being seen looks exactly
// like an ad that was blocked. Measured in October 2026: with only this tier on,
// a watch page had activity_ext, activeview_ext and pagead/id refused, and on a
// reporter's account YouTube kept refusing playback even while the YouTube
// filter was letting every ad play.
//
// The spare rides in the same excludedInitiatorDomains the user's Allowlist
// compiles into, so it reaches every rule shape at once. What is pinned here is
// the APPLY step — the real function that installs the rules — because the
// builder tests elsewhere take their exclusions as an argument and would never
// notice the spare going missing on the way in.

import test from "node:test";
import assert from "node:assert/strict";

let installed = [];
const stored = { ssAdTrackerEnabled: true, ssAdNetworkEnabled: true, allowlist: ["mybank.example"] };

globalThis.chrome = {
  runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getURL: (p) => p },
  storage: {
    local: { get: async (d) => ({ ...(typeof d === "object" && d ? d : {}), ...stored }) },
    onChanged: { addListener() {} },
  },
  declarativeNetRequest: {
    getDynamicRules: async () => [],
    updateDynamicRules: async ({ addRules }) => {
      installed = installed.concat(addRules);
    },
  },
};

// A tiny list in the bundled file's shape, every rule shape represented.
globalThis.fetch = async () => ({
  json: async () => ({
    ads: {
      always: ["doubleclick.net"],
      thirdParty: ["googlesyndication.com"],
      scoped: [{ domain: "googleadservices.com", exceptInitiators: ["shop.example"], group: "always" }],
      typed: [{ resourceTypes: ["script"], domains: ["adnxs.com"], thirdParty: true }],
      spared: [],
    },
    trackers: { always: ["google-analytics.com"], thirdParty: [], scoped: [], typed: [], spared: [] },
  }),
});

const { applyAdTrackerRules, ALWAYS_SPARED_INITIATORS } = await import("../background/ad-tracker-blocker.js");

test("YouTube is spared by every rule that could fire on a page", async () => {
  installed = [];
  await applyAdTrackerRules("ads");
  await applyAdTrackerRules("trackers");
  // Everything but the main_frame redirect — someone navigating straight to an
  // ad domain — has an initiator to spare.
  const firing = installed.filter((r) => !r.condition.resourceTypes.includes("main_frame"));
  assert.ok(firing.length >= 5, "expected the stubs and every block shape");
  for (const r of firing) {
    const ex = r.condition.excludedInitiatorDomains || [];
    for (const d of ["youtube.com", "youtube-nocookie.com"]) {
      assert.ok(ex.includes(d), `rule ${r.id} (${r.action.type}) would still fire on ${d}`);
    }
  }
});

test("the spare sits beside the user's own Allowlist and upstream's carve-outs, not in place of them", async () => {
  installed = [];
  await applyAdTrackerRules("ads");
  const scoped = installed.find((r) => (r.condition.requestDomains || []).includes("googleadservices.com"));
  assert.deepEqual([...scoped.condition.excludedInitiatorDomains].sort(), ["mybank.example", "shop.example", "youtube-nocookie.com", "youtube.com"]);
  const always = installed.find((r) => r.action.type === "block" && (r.condition.requestDomains || []).includes("doubleclick.net"));
  assert.ok(always.condition.excludedInitiatorDomains.includes("mybank.example"));
});

test("the spare is only YouTube's own domains", () => {
  // Widening it to google.com or googlevideo.com would stand this tier down on
  // Google Search and every page that embeds a Google service.
  assert.deepEqual([...ALWAYS_SPARED_INITIATORS].sort(), ["youtube-nocookie.com", "youtube.com"]);
});

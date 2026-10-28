// test/retired-tracker-blocker-test.mjs
// Sieve — tests for background/retired-tracker-blocker.js, which clears away what
// tracker blocking (removed in 1.5.1) left on a profile that had it on.
//
//   node --test test/
//
// The danger in a clean-up is reach: it runs on every install and update, on
// every profile, so what matters as much as what it removes is what it must
// leave alone. Here that is above all the ad blocker, which shared a section, a
// counter and a neighbouring rule band with trackers and stays. And a removed
// feature leaves one more kind of debris: a manifest still naming a file that is
// gone, which nothing notices until the browser refuses to load the extension.
// That is checked here too.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// --- a profile that had trackers on ------------------------------------------

let dynamicRules;
let store;

function reset() {
  dynamicRules = new Map([
    [1001, "gambling"],
    [10001, "custom block"],
    [179999, "the band below, not ours"],
    [180000, "tracker"],
    [184321, "tracker"],
    [189999, "tracker"],
    [190000, "ad network"],
    [199999, "ad probe stub"],
  ]);
  store = {
    ssAdTrackerEnabled: true,
    ssAdNetworkEnabled: true,
    ssYouTubeAdsEnabled: true,
    ssAdSlotCollapseEnabled: true,
    ssFloatVideoEnabled: true,
    gamblingEnabled: true,
    sieveStats: {
      "2026-10-27": { adTrackers: 900, adNetworks: 40, youtubeAds: 3, gambling: 2 },
      "2026-10-28": { adTrackers: 12, adSlots: 12, scam: 1 },
    },
  };
}

// The ad blocker is imported too, for its band; it only registers listeners at
// import time, hence onStartup, getURL and onChanged.
globalThis.chrome = {
  runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, getURL: (p) => p },
  declarativeNetRequest: {
    updateDynamicRules: async ({ removeRuleIds = [] }) => removeRuleIds.forEach((id) => dynamicRules.delete(id)),
  },
  storage: {
    local: {
      get: async (defaults) => {
        const out = {};
        for (const [k, v] of Object.entries(defaults)) out[k] = k in store ? structuredClone(store[k]) : v;
        return out;
      },
      set: async (items) => Object.assign(store, structuredClone(items)),
      remove: async (keys) => [].concat(keys).forEach((k) => delete store[k]),
    },
    onChanged: { addListener() {} },
  },
};

const retired = await import("../background/retired-tracker-blocker.js");
const { AD_TRACKER_GROUPS } = await import("../background/ad-tracker-blocker.js");

test("its band ends exactly where the ad networks' begins", () => {
  assert.equal(retired.RULE_ID_END, AD_TRACKER_GROUPS.ads.idStart);
  assert.deepEqual(Object.keys(AD_TRACKER_GROUPS), ["ads"]);
});

test("its network rules are removed, and the ad blocker's and every other blocker's stay", async () => {
  reset();
  await retired.clearRetiredTrackerBlocker();
  assert.deepEqual([...dynamicRules.keys()].sort((a, b) => a - b), [1001, 10001, 179999, 190000, 199999]);
});

test("its setting goes; the ad settings stay on", async () => {
  reset();
  await retired.clearRetiredTrackerBlocker();
  assert.equal("ssAdTrackerEnabled" in store, false);
  assert.equal(store.ssAdNetworkEnabled, true);
  assert.equal(store.ssYouTubeAdsEnabled, true);
  assert.equal(store.ssAdSlotCollapseEnabled, true);
  assert.equal(store.ssFloatVideoEnabled, true);
  assert.equal(store.gamblingEnabled, true);
});

test("its Dashboard counter leaves the history; the ad-network counter and the rest stay", async () => {
  reset();
  await retired.clearRetiredTrackerBlocker();
  assert.deepEqual(store.sieveStats, {
    "2026-10-27": { adNetworks: 40, youtubeAds: 3, gambling: 2 },
    "2026-10-28": { adSlots: 12, scam: 1 },
  });
});

test("on a profile that never had it, it changes nothing and throws nothing", async () => {
  reset();
  dynamicRules = new Map([[1001, "gambling"], [190000, "ad network"]]);
  store = { ssAdNetworkEnabled: false, sieveStats: { "2026-10-28": { gambling: 1 } } };
  await retired.clearRetiredTrackerBlocker();
  assert.deepEqual([...dynamicRules.keys()], [1001, 190000]);
  assert.deepEqual(store, { ssAdNetworkEnabled: false, sieveStats: { "2026-10-28": { gambling: 1 } } });
});

test("one step failing does not stop the others", async () => {
  reset();
  const original = chrome.declarativeNetRequest.updateDynamicRules;
  chrome.declarativeNetRequest.updateDynamicRules = async () => {
    throw new Error("rules unavailable");
  };
  const warn = console.warn;
  console.warn = () => {};
  try {
    await retired.clearRetiredTrackerBlocker();
  } finally {
    chrome.declarativeNetRequest.updateDynamicRules = original;
    console.warn = warn;
  }
  assert.equal("ssAdTrackerEnabled" in store, false);
  assert.equal("adTrackers" in store.sieveStats["2026-10-27"], false);
});

// --- nothing left pointing at a removed file -----------------------------------

test("every file the manifests name still exists", () => {
  const root = new URL("../", import.meta.url);
  for (const manifestFile of ["manifest.json", "manifest.firefox.json"]) {
    const manifest = JSON.parse(fs.readFileSync(new URL(manifestFile, root), "utf8"));
    const files = [];
    if (manifest.background && manifest.background.service_worker) files.push(manifest.background.service_worker);
    for (const s of (manifest.background && manifest.background.scripts) || []) files.push(s);
    for (const cs of manifest.content_scripts || []) files.push(...(cs.js || []), ...(cs.css || []));
    for (const war of manifest.web_accessible_resources || []) files.push(...(war.resources || []).filter((r) => !r.includes("*")));
    for (const rr of (manifest.declarative_net_request && manifest.declarative_net_request.rule_resources) || []) files.push(rr.path);
    for (const file of files) {
      assert.ok(fs.existsSync(new URL(file, root)), `${manifestFile} names ${file}, which does not exist`);
    }
  }
});

test("the service worker loads the clean-up beside the ad blocker it leaves alone", () => {
  const sw = fs.readFileSync(new URL("../background/service-worker.js", import.meta.url), "utf8");
  assert.match(sw, /import "\.\/retired-tracker-blocker\.js"/);
  assert.match(sw, /import "\.\/ad-tracker-blocker\.js"/);
  assert.match(sw, /import "\.\/ad-tracker-stats\.js"/);
});

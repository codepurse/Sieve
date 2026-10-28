// test/youtube-restrict-test.mjs
// Sieve — tests for "Turn on Restricted Mode" / "Make it strict" (Site Cleanup →
// YouTube).
//
//   node --test test/
//
// Like the search-suggestion switch, this is spread over files that must agree
// on names nothing checks at runtime: the settings page writes restrictedMode
// and restrictedModeStrict, the background module reads them to pick one of two
// static rulesets, and the manifests declare those rulesets by id and path. A
// misspelling anywhere leaves a switch that does nothing, silently.
//
// Two properties of the rules are pinned rather than trusted:
//   - they can only ever touch YouTube's own hosts, so a switch in the YouTube
//     card never changes what any other Google service serves;
//   - they outrank the Allowlist's allow rule, or allowlisting youtube.com
//     would switch Restricted Mode off without a word.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const readJson = (p) => JSON.parse(read(p));

const LEVELS = {
  moderate: { id: "youtube_restrict_moderate_ruleset", path: "rules/youtube-restrict-moderate-rules.json", value: "Moderate" },
  strict: { id: "youtube_restrict_strict_ruleset", path: "rules/youtube-restrict-strict-rules.json", value: "Strict" },
};
// The hosts Google lists for the YouTube-Restrict header.
const HOSTS = ["youtube.com", "youtube-nocookie.com", "youtubei.googleapis.com", "youtube.googleapis.com"];

// The module registers chrome listeners at import time; record what it asks of
// the ruleset API so the sync can be checked without a browser.
const calls = [];
let stored = {};
globalThis.chrome = {
  runtime: { onInstalled: { addListener() {} } },
  storage: { local: { get: async () => ({ siteCleanup: stored }) }, onChanged: { addListener() {} } },
  declarativeNetRequest: { updateEnabledRulesets: async (arg) => calls.push(arg) },
};
const { restrictLevel, applyRestrictRulesets } = await import("../background/youtube-restrict.js");

// --- the rules ---------------------------------------------------------------

for (const [level, { path, value }] of Object.entries(LEVELS)) {
  test(`${level}: one rule, setting YouTube-Restrict: ${value}`, () => {
    const rules = readJson(`../${path}`);
    assert.equal(rules.length, 1);
    const [rule] = rules;
    assert.equal(rule.action.type, "modifyHeaders");
    assert.deepEqual(rule.action.requestHeaders, [{ header: "YouTube-Restrict", operation: "set", value }]);
    // A page and the data it fetches as you browse; the header is read there.
    for (const type of ["main_frame", "sub_frame", "xmlhttprequest"]) {
      assert.ok(rule.condition.resourceTypes.includes(type), `${type} missing`);
    }
  });

  test(`${level}: only YouTube's own hosts`, () => {
    const [rule] = readJson(`../${path}`);
    assert.deepEqual([...rule.condition.requestDomains].sort(), [...HOSTS].sort());
    assert.equal(rule.condition.urlFilter, undefined, "a urlFilter could reach hosts outside requestDomains");
    assert.equal(rule.condition.regexFilter, undefined);
  });

  // A modifyHeaders rule applies only if it outranks every matching allow rule.
  test(`${level}: outranks the Allowlist, so allowlisting youtube.com keeps it on`, () => {
    const [rule] = readJson(`../${path}`);
    const sw = read("../background/service-worker.js");
    const found = /function buildAllowRules[\s\S]*?priority:\s*(\d+)/.exec(sw);
    assert.ok(found, "the Allowlist's allow rule was not found");
    assert.ok(rule.priority > Number(found[1]), `priority ${rule.priority} does not beat the allow rule's ${found[1]}`);
  });
}

// --- declared, shipped, loaded ------------------------------------------------

for (const manifest of ["manifest.json", "manifest.firefox.json"]) {
  test(`${manifest} declares both rulesets, off until switched on`, () => {
    const resources = readJson(`../${manifest}`).declarative_net_request.rule_resources;
    for (const { id, path } of Object.values(LEVELS)) {
      const entry = resources.find((r) => r.id === id);
      assert.ok(entry, `${id} missing`);
      assert.equal(entry.path, path);
      assert.equal(entry.enabled, false);
    }
  });
}

test("both builds require the rule files, and the service worker loads the module", () => {
  for (const script of ["build-chrome.ps1", "build-firefox.ps1"]) {
    const src = read(`../${script}`);
    for (const { path } of Object.values(LEVELS)) {
      assert.ok(src.includes(path.replace("/", "\\")), `${script} does not require ${path}`);
    }
  }
  assert.match(read("../background/service-worker.js"), /import "\.\/youtube-restrict\.js";/);
});

test("the settings page writes the keys the module reads, Strict covering the other", () => {
  const options = read("../options/options.js");
  assert.match(options, /key: "restrictedMode",[^\n]*shadowedBy: "restrictedModeStrict"/);
  assert.match(options, /key: "restrictedModeStrict"/);
});

// --- which level ---------------------------------------------------------------

test("the level follows the switches, and only while YouTube cleanup is on", () => {
  assert.equal(restrictLevel({}), "off");
  assert.equal(restrictLevel({ youtube: { restrictedMode: true } }), "off", "master switch off");
  assert.equal(restrictLevel({ youtube: { enabled: true } }), "off");
  assert.equal(restrictLevel({ youtube: { enabled: true, restrictedMode: true } }), "moderate");
  assert.equal(restrictLevel({ youtube: { enabled: true, restrictedModeStrict: true } }), "strict");
  assert.equal(restrictLevel({ youtube: { enabled: true, restrictedMode: true, restrictedModeStrict: true } }), "strict");
});

test("syncing enables at most one ruleset and disables the rest", async () => {
  const cases = [
    [{ youtube: { enabled: true, restrictedMode: true } }, [LEVELS.moderate.id], [LEVELS.strict.id]],
    [{ youtube: { enabled: true, restrictedModeStrict: true } }, [LEVELS.strict.id], [LEVELS.moderate.id]],
    [{ youtube: { enabled: false, restrictedModeStrict: true } }, [], [LEVELS.moderate.id, LEVELS.strict.id]],
  ];
  for (const [bag, enable, disable] of cases) {
    stored = bag;
    calls.length = 0;
    await applyRestrictRulesets();
    assert.deepEqual(calls, [{ enableRulesetIds: enable, disableRulesetIds: disable }]);
  }
});

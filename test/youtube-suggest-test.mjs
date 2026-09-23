// test/youtube-suggest-test.mjs
// Sieve — tests for "Hide search suggestions" (Site Cleanup → YouTube).
//
//   node --test test/
//
// This feature is spread over five files that have to agree on one key name and
// one class name: the settings page writes `hideSearchSuggestions`, the content
// script turns it into `sv-yt-hide-search-suggestions`, the stylesheet hides the
// dropdown under that class, and the background module reads the same key to
// flip a static ruleset. Nothing at runtime notices when one of them is spelled
// differently — the switch just does half of what it says, which is the failure
// this file exists to catch.
//
// The rule's shape is pinned for a second reason. YouTube's suggestions used to
// come from suggestqueries.google.com, and that host also answers for Google's
// own search box. Widening this rule to catch it would mean a switch in the
// YouTube card silently killing suggestions in Google Search, so "this can only
// match youtube.com" is asserted rather than assumed.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const readJson = (p) => JSON.parse(read(p));

const RULES = readJson("../rules/youtube-suggest-rules.json");
const MANIFEST = readJson("../manifest.json");
const MANIFEST_FF = readJson("../manifest.firefox.json");
const CSS = read("../content/youtube-clean.css");
const CONTENT = read("../content/site-cleanup.js");
const OPTIONS = read("../options/options.js");

const RULESET_ID = "youtube_suggest_ruleset";
const RULES_PATH = "rules/youtube-suggest-rules.json";
const KEY = "hideSearchSuggestions";
const CLASS = "sv-yt-hide-search-suggestions";

// The module registers chrome listeners at import time, so a chrome object has
// to exist before it loads. Only the pure gate is exercised here.
globalThis.chrome = {
  runtime: { onInstalled: { addListener() {} } },
  storage: { local: { get: async (d) => d }, onChanged: { addListener() {} } },
  declarativeNetRequest: { updateEnabledRulesets: async () => {} },
};

const { isSuggestBlockOn } = await import("../background/youtube-suggest.js");

// --- the block rule --------------------------------------------------------

test("the ruleset is a single block rule", () => {
  assert.equal(RULES.length, 1);
  assert.deepEqual(RULES[0].action, { type: "block" });
  assert.equal(RULES[0].id, 1);
});

test("it matches the suggest path under youtube.com and nothing wider", () => {
  const { condition } = RULES[0];
  assert.deepEqual(condition.requestDomains, ["youtube.com"]);
  assert.equal(condition.urlFilter, "/complete/search");
});

test("it cannot reach Google's own suggest host", () => {
  // requestDomains matches a domain and its subdomains, so the only way this
  // rule could touch Google Search's suggestions is by naming a google.com
  // host. Guards the "only YouTube" promise the settings page makes.
  const domains = RULES[0].condition.requestDomains;
  for (const d of domains) {
    assert.ok(d === "youtube.com" || d.endsWith(".youtube.com"), `${d} is not a YouTube domain`);
  }
});

test("it blocks the request types the suggest call actually uses, never a page", () => {
  const types = RULES[0].condition.resourceTypes;
  // Both the desktop and the mobile site fetch this over XHR; script covers the
  // JSONP transport YouTube used before that.
  assert.ok(types.includes("xmlhttprequest"));
  assert.ok(types.includes("script"));
  // A main_frame block would hand the user a browser error page instead of a
  // quietly missing dropdown.
  assert.ok(!types.includes("main_frame"));
});

// --- manifest registration -------------------------------------------------

for (const [name, manifest] of [
  ["chrome", MANIFEST],
  ["firefox", MANIFEST_FF],
]) {
  test(`the ${name} manifest ships the ruleset disabled`, () => {
    const entry = manifest.declarative_net_request.rule_resources.find((r) => r.id === RULESET_ID);
    assert.ok(entry, `${RULESET_ID} missing from the ${name} manifest`);
    assert.equal(entry.path, RULES_PATH);
    // Opt-in, like every other Site Cleanup switch: shipping it enabled would
    // turn the feature on for everyone who updates.
    assert.equal(entry.enabled, false);
  });
}

test("the packaged rules file is the one the manifest names", () => {
  assert.ok(fs.existsSync(new URL("../" + RULES_PATH, import.meta.url)));
});

// --- the five files agreeing ----------------------------------------------

test("the settings page offers the toggle under YouTube", () => {
  assert.ok(OPTIONS.includes(`key: "${KEY}"`));
});

test("the content script maps the toggle to the stylesheet's class", () => {
  assert.ok(CONTENT.includes(`${KEY}: "${CLASS}"`));
});

test("the stylesheet hides the suggestion container under that class", () => {
  assert.ok(CSS.includes(`html.${CLASS} .ytSearchboxComponentSuggestionsContainer`));
});

test("the background module reads the same toggle", () => {
  // Both halves of the feature are gated on the site master switch, so they can
  // never disagree about whether the feature is running.
  assert.equal(isSuggestBlockOn({ youtube: { enabled: true, [KEY]: true } }), true);
  assert.equal(isSuggestBlockOn({ youtube: { enabled: false, [KEY]: true } }), false);
  assert.equal(isSuggestBlockOn({ youtube: { enabled: true, [KEY]: false } }), false);
  assert.equal(isSuggestBlockOn({ youtube: {} }), false);
  assert.equal(isSuggestBlockOn({}), false);
  assert.equal(isSuggestBlockOn(undefined), false);
});

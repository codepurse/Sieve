// test/google-cleanup-test.mjs
// Sieve — tests for Site Cleanup → Google Search (content/google-clean.js,
// content/google-clean.css, background/google-web-only.js and
// rules/google-web-only-rules.json).
//
//   node --test test/
//
// Four things are pinned here.
//
// 1. WIRING. As on YouTube, each switch is a key the settings page writes, a
//    class the content script puts on <html>, and a stylesheet rule under that
//    class. A misspelling anywhere just makes the switch do nothing.
//
// 2. THE STYLESHEET CAN ONLY EVER HIDE A BOX, NEVER A RESULT. Every rule that
//    hides a whole result block insists on the innermost block, so a future
//    Google layout that wraps several results in one block makes the rule find
//    nothing rather than take results down with a box.
//
// 3. WHERE IT RUNS. Only on www.google.<country> pages — never on every page,
//    which would cost every site the user visits for a feature about one.
//
// 4. THE WEB-ONLY REDIRECT. Its regex has to say "a search with no udm= and no
//    tbm=" without lookahead (RE2 has none), so it is checked here against real
//    Google addresses, including the redirected address itself: if that ever
//    matched again, every search would loop.
//
// As with the other content-script tests, this proves the decisions, not that
// Google's markup still matches — that was checked on live google.com
// (October 2026, English and German), and should be again when Google moves.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const readJson = (p) => JSON.parse(read(p));

const SOURCE = read("../content/google-clean.js");
const CSS = read("../content/google-clean.css");
const OPTIONS = read("../options/options.js");
const OPTIONS_HTML = read("../options/options.html");
const MANIFEST = readJson("../manifest.json");
const MANIFEST_FF = readJson("../manifest.firefox.json");
const RULES = readJson("../rules/google-web-only-rules.json");

const RULESET_ID = "google_web_only_ruleset";
const RULES_PATH = "rules/google-web-only-rules.json";

// --- helpers ----------------------------------------------------------------

// The Google card's definition on the settings page, as text.
function googleCard() {
  const list = OPTIONS.indexOf("const SITE_CLEANUP_SITES");
  const start = OPTIONS.indexOf('id: "google"', list);
  const end = OPTIONS.indexOf("function scRow");
  assert.ok(list > 0 && start > list && end > start, "the Google card was not found in options.js");
  return OPTIONS.slice(start, end);
}

// Every item in the card: { key, shadowedBy }.
function googleItems() {
  return [...googleCard().matchAll(/\{ key: "(\w+)"[^\n]*/g)].map((m) => ({
    key: m[1],
    shadowedBy: (m[0].match(/shadowedBy: "(\w+)"/) || [])[1] || null,
  }));
}

// The stylesheet as a flat list of { selector, body }, comments stripped.
function cssRules() {
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  for (const m of bare.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    // Split the selector list on top-level commas only — :has() and :not()
    // take lists of their own.
    let depth = 0;
    let cur = "";
    for (const ch of m[1]) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        rules.push({ selector: cur.trim(), body: m[2] });
        cur = "";
      } else cur += ch;
    }
    if (cur.trim()) rules.push({ selector: cur.trim(), body: m[2] });
  }
  return rules;
}

async function load(settings = {}) {
  const classes = new Set();
  const listeners = [];
  const sandbox = {
    window: {},
    chrome: {
      storage: {
        local: { get: async () => ({ siteCleanup: { google: settings, youtube: { enabled: true, hideShorts: true } } }) },
        onChanged: { addListener: (fn) => listeners.push(fn) },
      },
    },
    document: {
      documentElement: {
        classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) },
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  await new Promise((r) => setImmediate(r)); // let the storage read resolve
  const change = (google) => {
    for (const fn of listeners) fn({ siteCleanup: { newValue: { google } } }, "local");
  };
  return { classes, change };
}

// --- 1. wiring ----------------------------------------------------------------

// A network redirect, made by background/google-web-only.js; nothing to style.
const NOT_A_CLASS = new Set(["webOnly"]);

test("every Google switch on the settings page becomes a class the stylesheet uses", async () => {
  const keys = googleItems().map((i) => i.key);
  assert.ok(keys.length >= 10, `expected the full Google card, found ${keys.length} keys`);
  const selectors = cssRules().map((r) => r.selector);

  for (const key of keys) {
    if (NOT_A_CLASS.has(key)) continue;
    const { classes } = await load({ enabled: true, [key]: true });
    assert.equal(classes.size, 1, `${key} should set exactly one class, set: ${[...classes]}`);
    const [cls] = classes;
    assert.ok(
      selectors.some((s) => s.startsWith(`html.${cls} `)),
      `${key} sets "${cls}", but no rule in google-clean.css is scoped to it`
    );
  }
});

test("nothing is applied while the master switch is off", async () => {
  const all = Object.fromEntries(googleItems().map((i) => [i.key, true]));
  const { classes } = await load({ ...all, enabled: false });
  assert.equal(classes.size, 0);
});

test("it reads only its own card, and follows a change without a reload", async () => {
  const { classes, change } = await load({});
  assert.equal(classes.size, 0, "YouTube's settings must not leak in");
  change({ enabled: true, hideAiOverview: true });
  assert.deepEqual([...classes], ["sv-g-hide-ai-overview"]);
  change({ enabled: false, hideAiOverview: true });
  assert.equal(classes.size, 0);
});

test("the settings page has a place to draw the card", () => {
  assert.match(OPTIONS_HTML, /id="sc-google-body"/);
});

test("the boxes the Web tab never shows are covered by “web results only”; AI Mode is not", () => {
  // The Web tab still carries the AI Mode tab, so that switch keeps working
  // alongside web-only. Everything in the results is already gone there.
  const items = googleItems();
  const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
  assert.equal(byKey.hideAiMode.shadowedBy, null);
  assert.equal(byKey.webOnly.shadowedBy, null);
  for (const i of items) {
    if (i.key === "webOnly" || i.key === "hideAiMode") continue;
    assert.equal(i.shadowedBy, "webOnly", `${i.key} should be covered by webOnly`);
  }
});

// --- 2. the stylesheet --------------------------------------------------------

test("every rule is scoped to one of the script's classes, and only hides", () => {
  const rules = cssRules();
  assert.ok(rules.length > 10);
  for (const { selector, body } of rules) {
    assert.match(selector, /^html\.sv-g-[a-z-]+ /, `unscoped rule: ${selector}`);
    assert.equal(body.replace(/\s+/g, " ").trim(), "display: none !important;", `${selector} does more than hide`);
  }
});

test("a rule that hides a whole result block only ever takes the innermost one", () => {
  const blockRules = cssRules().filter((r) => /div\.MjjYud:has/.test(r.selector));
  assert.ok(blockRules.length >= 8, "expected a block rule per box");
  for (const { selector } of blockRules) {
    assert.match(selector, /:not\(:has\(div\.MjjYud\)\)$/, `${selector} could hide a block holding real results`);
  }
});

test("boxes are found by the tab they link to, never by their (translated) heading", () => {
  const links = {
    "sv-g-hide-forums": "udm=forums",
    "sv-g-hide-short-videos": "udm=short_vids",
    "sv-g-hide-videos": "udm=vids",
    "sv-g-hide-top-stories": "tbm=nws",
    "sv-g-hide-ai-overview": "udm=50",
    "sv-g-hide-ai-mode": "udm=50",
  };
  const rules = cssRules();
  for (const [cls, tab] of Object.entries(links)) {
    assert.ok(
      rules.some((r) => r.selector.startsWith(`html.${cls} `) && r.selector.includes(`a[href*="${tab}"]`)),
      `${cls} should key off links to ${tab}`
    );
  }
  assert.doesNotMatch(CSS.replace(/\/\*[\s\S]*?\*\//g, ""), /:contains|aria-label=/, "no text-based matching");
});

test("the short-video rule cannot catch the video row, or the other way round", () => {
  // udm=vids is not a substring of udm=short_vids, and the legacy numeric tab
  // ids are matched whole (udm=7& / …udm=7) so udm=7 cannot match udm=71.
  const rules = cssRules();
  const videos = rules.filter((r) => r.selector.startsWith("html.sv-g-hide-videos ")).map((r) => r.selector).join(" ");
  assert.doesNotMatch(videos, /short_vids/);
  assert.doesNotMatch(videos, /a\[href\*="udm=7"\]/, "a bare udm=7 substring would also match udm=7x");
});

// --- 3. where it runs ---------------------------------------------------------

function googleEntry(manifest) {
  return manifest.content_scripts.find((cs) => (cs.js || []).includes("content/google-clean.js"));
}

// Chrome/Firefox include_globs: * is any run of characters, ? exactly one.
const globToRegExp = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");

test("both builds inject the script and stylesheet on Google pages at document_start", () => {
  for (const manifest of [MANIFEST, MANIFEST_FF]) {
    const cs = googleEntry(manifest);
    assert.ok(cs, "content/google-clean.js is not in the manifest");
    assert.deepEqual(cs.css, ["content/google-clean.css"]);
    assert.equal(cs.run_at, "document_start");
    assert.ok(!cs.all_frames, "the results page is the top frame");
    for (const f of [...cs.js, ...cs.css]) assert.ok(fs.existsSync(new URL(`../${f}`, import.meta.url)), `${f} is missing`);
  }
});

test("it runs on www.google.<any country> and nowhere else", () => {
  for (const manifest of [MANIFEST, MANIFEST_FF]) {
    const cs = googleEntry(manifest);
    assert.ok(!cs.matches.includes("<all_urls>"), "must not count as an every-page script");
    assert.ok(cs.include_globs && cs.include_globs.length, "the host has to be narrowed by a glob");
    const runsOn = (url) => cs.include_globs.some((g) => globToRegExp(g).test(url));
    for (const url of [
      "https://www.google.com/search?q=x",
      "https://www.google.co.uk/search?q=x&udm=14",
      "https://www.google.com.au/",
      "https://www.google.de/webhp?hl=de",
    ]) {
      assert.ok(runsOn(url), `should run on ${url}`);
    }
    for (const url of [
      "https://example.com/search?q=x",
      "https://mail.google.com/mail/u/0/",
      "https://www.youtube.com/results?search_query=x",
      "https://news.google.com/",
    ]) {
      assert.ok(!runsOn(url), `should not run on ${url}`);
    }
  }
});

// --- 4. the web-only redirect -------------------------------------------------

const [RULE] = RULES;
const REGEX = new RegExp(RULE.condition.regexFilter); // case-sensitive, as the rule says

// What the browser does with a match: add udm=14 to the query.
const redirectOf = (url) => {
  const u = new URL(url);
  u.searchParams.set("udm", "14");
  return u.href;
};

test("the ruleset is one main-frame redirect to the Web tab", () => {
  assert.equal(RULES.length, 1);
  assert.deepEqual(RULE.condition.resourceTypes, ["main_frame"]);
  assert.equal(RULE.action.type, "redirect");
  assert.deepEqual(RULE.action.redirect.transform.queryTransform.addOrReplaceParams, [{ key: "udm", value: "14" }]);
  assert.equal(RULE.condition.isUrlFilterCaseSensitive, true);
  assert.equal(RULE.priority, 3, "above the shared allowlist's priority-2 allow rule");
});

const REDIRECTED = [
  "https://www.google.com/search?q=cats",
  "https://www.google.com/search?q=cats&hl=en",
  "https://www.google.com/search?q=x&oq=x&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8",
  "https://www.google.co.uk/search?q=x",
  "https://www.google.com.au/search?q=x&start=10",
  "https://www.google.de/search?q=udm%3D14", // the words, not the parameter
  "https://www.google.com/search?q=x&tbs=qdr:d", // tbs (Tools) is not tbm
  "https://www.google.com/search?ud=1&tb=1&udmx=1&tbmx=2&q=tbm",
  "https://www.google.com/search?q=x&sca_esv=10ab62&source=lnms&sa=X&ved=2ahUKEwi",
  "https://www.google.cat/search?q=x",
];

const LEFT_ALONE = [
  "https://www.google.com/search?q=x&udm=14", // already on Web
  "https://www.google.com/search?udm=2&q=x", // Images
  "https://www.google.com/search?q=x&tbm=nws", // News
  "https://www.google.com/search?q=x&udm=50", // AI Mode, opened on purpose
  "https://www.google.com/search?q=x&udm=forums",
  "https://www.google.com/search?q=x&udm=short_vids&hl=en",
  "https://www.google.com/maps/search/coffee",
  "https://www.google.com/searchbyimage?image_url=x",
  "https://www.google.com/",
  "https://www.google.com.evil.example/search?q=x",
  "https://mail.google.com/search?q=x",
];

test("a search that has not picked a tab goes to the Web tab", () => {
  for (const url of REDIRECTED) assert.ok(REGEX.test(url), `should redirect ${url}`);
});

test("a search on any tab, and anything that is not a search, is left alone", () => {
  for (const url of LEFT_ALONE) assert.ok(!REGEX.test(url), `should leave ${url}`);
});

test("the redirected address never matches again, so it cannot loop", () => {
  for (const url of REDIRECTED) {
    const to = redirectOf(url);
    assert.match(to, /[?&]udm=14(&|$)/);
    assert.ok(!REGEX.test(to), `${to} would redirect again`);
  }
});

test("the regex keeps the shape that fits Chrome's regex memory limit", () => {
  // Node cannot run Chrome's RE2 limit, so these are the two things that were
  // measured to push the rule over it (see background/google-web-only.js). A
  // rule over the limit still loads and simply never matches, so it would pass
  // every other test in this file.
  const re = RULE.condition.regexFilter;
  assert.ok(re.startsWith("^https://www\\.google\\."), "keep the fixed https prefix — https? broke the limit");
  assert.doesNotMatch(re, /\{\d/, "counted repeats like {2,3} cost more than the limit allows");
  assert.ok(re.length <= 200, `${re.length} characters — re-check it with isRegexSupported in a real browser`);
});

test("both manifests ship the ruleset off, and both builds require its files", () => {
  for (const manifest of [MANIFEST, MANIFEST_FF]) {
    const rr = manifest.declarative_net_request.rule_resources.find((r) => r.id === RULESET_ID);
    assert.ok(rr, `${RULESET_ID} is not declared`);
    assert.equal(rr.enabled, false, "off until the user asks for it");
    assert.equal(rr.path, RULES_PATH);
  }
  for (const script of ["../build-chrome.ps1", "../build-firefox.ps1"]) {
    const ps = read(script);
    for (const f of ["rules\\google-web-only-rules.json", "content\\google-clean.js", "content\\google-clean.css"]) {
      assert.ok(ps.includes(`"${f}"`), `${script} does not require ${f}`);
    }
  }
  assert.match(read("../background/service-worker.js"), /import "\.\/google-web-only\.js"/);
});

// --- the background switch ---------------------------------------------------

let enabledCalls = [];
let stored = {};
globalThis.chrome = {
  runtime: { onInstalled: { addListener() {} } },
  storage: {
    local: { get: async (d) => ({ ...d, ...stored }) },
    onChanged: { addListener() {} },
  },
  declarativeNetRequest: { updateEnabledRulesets: async (opts) => enabledCalls.push(opts) },
};
const webOnly = await import("../background/google-web-only.js");

test("the redirect follows the switch, and only while the Google card is on", () => {
  const on = (google) => webOnly.isWebOnlyOn({ google });
  assert.equal(on({ enabled: true, webOnly: true }), true);
  assert.equal(on({ enabled: false, webOnly: true }), false);
  assert.equal(on({ enabled: true, webOnly: false }), false);
  assert.equal(on({ enabled: true }), false);
  assert.equal(webOnly.isWebOnlyOn({ youtube: { enabled: true, webOnly: true } }), false, "YouTube's card is not Google's");
  assert.equal(webOnly.isWebOnlyOn(undefined), false);
});

test("syncing enables or disables exactly this ruleset", async () => {
  enabledCalls = [];
  stored = { siteCleanup: { google: { enabled: true, webOnly: true } } };
  await webOnly.applyWebOnlyRuleset();
  stored = { siteCleanup: { google: { enabled: true, webOnly: false } } };
  await webOnly.applyWebOnlyRuleset();
  assert.deepEqual(enabledCalls, [{ enableRulesetIds: [RULESET_ID] }, { disableRulesetIds: [RULESET_ID] }]);
  assert.equal(webOnly.RULESET_ID, RULESET_ID);
});

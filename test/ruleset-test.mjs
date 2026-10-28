// test/ruleset-test.mjs
// Sieve — tests for subscribed lists on the matching side: the parser
// (common/ruleset.js), the packed host index (common/host-index.js), and how
// common/search-filter.js compiles and explains a list's rules.
//
//   node --test test/
//
// The parser reads files nobody at Sieve wrote, so most of what is pinned here
// is what it must REFUSE: allow rules of every dialect (a list may hide, never
// unhide), the lines of an HTML page, network rules that are about a page's
// requests rather than the page, and regexes that could hang a results page.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// The three files are browser scripts that hang themselves on a global.
globalThis.window = globalThis;
globalThis.KeywordPattern = require("../common/keyword-pattern.js");
globalThis.SieveHostIndex = require("../common/host-index.js");
const { parseRuleset, MAX_REGEX_ENTRIES } = require("../common/ruleset.js");
require("../common/search-filter.js");
const SF = globalThis.SieveSearchFilter;

// --- the parser: uBlacklist ---------------------------------------------------

test("uBlacklist: front matter, match patterns and the plain forms", () => {
  const parsed = parseRuleset(
    [
      "---",
      "name: Spam sites",
      "homepage: https://example.org/list",
      "---",
      "# a comment",
      "*://*.spam-a.com/*",
      "*://spam-b.com/*",
      "*.spam-c.com",
      ".spam-d.com",
      "spam-e.com/",
      "www.spam-f.com",
      "*://docs.example.com/junk/*",
      "*://*.xyz/*",
      "/casino\\d+\\./",
      "title/Free Download/",
    ].join("\n")
  );
  assert.equal(parsed.name, "Spam sites");
  assert.equal(parsed.homepage, "https://example.org/list");
  assert.deepEqual(parsed.hosts, ["spam-a.com", "spam-b.com", "spam-c.com", "spam-d.com", "spam-e.com", "spam-f.com"]);
  assert.deepEqual(parsed.patterns, ["docs.example.com/junk/*", ".xyz", "/casino\\d+\\./", "title/Free Download/"]);
  assert.equal(parsed.skipped, 0);
});

test("allow and highlight rules are never read, in any dialect", () => {
  const parsed = parseRuleset(["@*://*.good.com/*", "@1*://*.green.com/*", "@@||ok.com^", "real.com"].join("\n"));
  assert.deepEqual(parsed.hosts, ["real.com"]);
  assert.deepEqual(parsed.patterns, []);
  assert.equal(parsed.skipped, 3);
});

test("every site on the web is not a rule", () => {
  const parsed = parseRuleset("*://*/*\n*://*.*/*");
  assert.equal(parsed.hosts.length + parsed.patterns.length, 0);
});

// --- the parser: hosts files and AdGuard / uBO -----------------------------------

test("hosts files: the sink address is dropped, the names a hosts file maps to itself skipped", () => {
  const parsed = parseRuleset(
    [
      "127.0.0.1 localhost",
      "::1 ip6-localhost",
      "0.0.0.0 0.0.0.0",
      "0.0.0.0 ads.example.com",
      "127.0.0.1 tracker.example.net  # trailing note",
      ":: badsite.org",
    ].join("\n")
  );
  assert.deepEqual(parsed.hosts, ["ads.example.com", "tracker.example.net", "badsite.org"]);
  assert.equal(parsed.skipped, 3);
});

test("AdGuard / uBO: a site rule is read, a request rule is not", () => {
  const parsed = parseRuleset(
    [
      "[Adblock Plus 2.0]",
      "! a comment",
      "||spam.com^",
      "||spam2.com^$document",
      "||spam3.com^$all,important",
      "||ads.example^$third-party", // about requests pages make, not the page
      "||cdn.example^$script",
      "||example.com/ads/^", // a path inside a network rule
      "example.com##.sponsored", // cosmetic
    ].join("\n")
  );
  assert.deepEqual(parsed.hosts, ["spam.com", "spam2.com", "spam3.com"]);
  assert.equal(parsed.skipped, 5);
});

// --- the parser: what a broken or hostile file gets ------------------------------

test("an HTML page parses to nothing", () => {
  const parsed = parseRuleset(
    '<!DOCTYPE html>\n<html lang="en">\n<head><title>spam.txt · GitHub</title></head>\n<body class="logged-out env-production">\n</body></html>'
  );
  assert.equal(parsed.hosts.length + parsed.patterns.length, 0);
});

test("a regex that could hang a page is refused", () => {
  const parsed = parseRuleset("/(a+)+$/\n/^(\\w+\\s?)*$/\nok.com");
  assert.deepEqual(parsed.patterns, []);
  assert.deepEqual(parsed.hosts, ["ok.com"]);
  assert.equal(parsed.skipped, 2);
});

// Counted by calls to the validator, not by how many regexes it accepted:
// validation times each regex against a 10 ms budget, so under a busy machine
// (the whole suite runs in parallel, with headless Chromes) a good regex can
// occasionally be refused, and a count of accepted ones would be a coin toss.
test("regexes past the cap are counted as skipped, not validated", () => {
  const KP = globalThis.KeywordPattern;
  const validate = KP.validateListEntry;
  let validated = 0;
  KP.validateListEntry = (entry) => {
    validated++;
    return validate(entry);
  };
  try {
    const lines = Array.from({ length: MAX_REGEX_ENTRIES + 50 }, (_, i) => `/spam${i}\\.example/`);
    const parsed = parseRuleset(lines.join("\n"));
    assert.equal(validated, MAX_REGEX_ENTRIES, "regexes past the cap were validated");
    assert.ok(parsed.patterns.length <= MAX_REGEX_ENTRIES);
    assert.equal(parsed.patterns.length + parsed.skipped, MAX_REGEX_ENTRIES + 50, "every line is either a rule or counted");
  } finally {
    KP.validateListEntry = validate;
  }
});

test("duplicates count once, names are lower case, IDNs become punycode", () => {
  const parsed = parseRuleset("Spam.com\nspam.com\n*://*.spam.com/*\nbücher.example");
  assert.deepEqual(parsed.hosts, ["spam.com", "xn--bcher-kva.example"]);
});

// --- the packed index -----------------------------------------------------------

test("the index finds a listed site, and its subdomains, and nothing else", () => {
  const { packHosts, createHostIndex } = globalThis.SieveHostIndex;
  const packed = packHosts(["zeta.com", "example.com", "alpha.org", "example.com"]);
  assert.equal(packed, "alpha.org\nexample.com\nzeta.com");
  const index = createHostIndex(packed);
  assert.equal(index.size, 3);
  assert.equal(index.find("example.com"), "example.com");
  assert.equal(index.find("news.example.com"), "example.com");
  assert.equal(index.find("a.b.zeta.com"), "zeta.com");
  assert.equal(index.find("notexample.com"), "");
  assert.equal(index.find("example.com.evil.net"), "");
  assert.equal(createHostIndex("").find("example.com"), "");
});

// --- compiling and explaining a list -------------------------------------------

const list = (overrides = {}) => ({
  name: "Spam list",
  color: SF.HIDE,
  hosts: globalThis.SieveHostIndex.packHosts(["spam.com", "mozilla.org"]),
  patterns: ["/casino\\d+/"],
  ...overrides,
});

test("a list's sites are one matcher, however many there are", () => {
  const compiled = SF.compile([], [list()]);
  assert.equal(compiled.filter((r) => r.kind === "hostset").length, 1);
  assert.equal(compiled.length, 2); // the hostset and the one regex
});

test("a listed site hides its subdomains, and says which entry and which list", () => {
  const compiled = SF.compile([], [list()]);
  const verdict = SF.explain(compiled, "https://developer.mozilla.org/en-US/", "MDN");
  assert.equal(verdict.color, SF.HIDE);
  assert.equal(verdict.winner.pattern, "mozilla.org");
  assert.equal(verdict.winner.source, "list");
  assert.equal(verdict.winner.listName, "Spam list");
  assert.equal(verdict.winner.kind, "wildcard"); // reads as a site rule in the popover
});

test("a list's patterns carry the list's name and action", () => {
  const compiled = SF.compile([], [list({ color: 2 })]);
  const verdict = SF.explain(compiled, "https://casino777.example/", "Win");
  assert.equal(verdict.color, 2);
  assert.equal(verdict.winner.listName, "Spam list");
});

test("hiding still beats colouring, whichever side it comes from", () => {
  const coloured = SF.compile([{ pattern: "spam.com", color: 1 }], [list({ color: SF.HIDE })]);
  assert.equal(SF.explain(coloured, "https://spam.com/", "").color, SF.HIDE);
  const hidden = SF.compile([{ pattern: "spam.com", color: SF.HIDE }], [list({ color: 1 })]);
  assert.equal(SF.explain(hidden, "https://spam.com/", "").color, SF.HIDE);
});

test("without lists, compile and explain behave exactly as before", () => {
  const compiled = SF.compile([{ pattern: ".edu", color: 1 }]);
  assert.equal(compiled.length, 1);
  assert.equal(SF.explain(compiled, "https://www.harvard.edu/", "").color, 1);
  assert.equal(SF.explain(compiled, "https://spam.com/", "").color, null);
});

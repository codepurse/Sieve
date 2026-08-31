// test/search-filter-test.mjs
// Unit tests for the Search Result Filter rule model (common/search-filter.js).
// Run: node test/search-filter-test.mjs
//
// Covers the cases the feature was actually requested for — highlight .edu/.gov
// and GitHub, hide spam and adult TLDs — plus the precedence rule and the
// pattern forms inherited from uBlacklist.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Both files are browser scripts that hang themselves off `window`, so give
// them one and run them in this process.
const sandbox = { window: {}, console };
sandbox.self = sandbox;
const load = (rel) => {
  const src = readFileSync(path.join(ROOT, rel), "utf8");
  const fn = new Function("window", "self", "module", "KeywordPattern", src);
  const mod = { exports: {} };
  fn(sandbox.window, sandbox, mod, sandbox.window.KeywordPattern);
  return mod.exports;
};

// keyword-pattern.js is a UMD keyed on `self`; loading it populates self.KeywordPattern.
load("common/keyword-pattern.js");
sandbox.window.KeywordPattern = sandbox.KeywordPattern;
load("common/search-filter.js");

const SF = sandbox.window.SieveSearchFilter;
const KeywordPattern = sandbox.KeywordPattern;
assert.ok(SF, "search-filter did not load");

let passed = 0;
const check = (name, actual, expected) => {
  assert.deepEqual(actual, expected, `${name}: expected ${expected}, got ${actual}`);
  passed++;
};

// The list the requesting user described.
const rules = [
  { pattern: ".edu", color: 1 },
  { pattern: ".gov", color: 1 },
  { pattern: "github.com", color: 2 },
  { pattern: ".cyou", color: 0 },
  { pattern: "spam-example.com", color: 0 },
];
const compiled = SF.compile(rules);
const m = (url, title) => SF.match(compiled, url, title);

check("edu highlights", m("https://www.harvard.edu/admissions"), 1);
check("gov highlights", m("https://nasa.gov/"), 1);
check("github highlights", m("https://github.com/torvalds/linux"), 2);
check("github subdomain highlights", m("https://gist.github.com/x"), 2);
check("cyou hidden", m("https://junk.cyou/page"), 0);
check("spam domain hidden", m("https://spam-example.com/a"), 0);
check("unrelated untouched", m("https://developer.mozilla.org/en-US/"), null);
check("edu substring is not a match", m("https://notedu.com/"), null);
check("edu inside path is not a match", m("https://example.com/edu"), null);

// Precedence: hiding beats highlighting when both match.
const conflict = SF.compile([
  { pattern: "example.com", color: 3 },
  { pattern: "example.com/bad/*", color: 0 },
]);
check("hide beats highlight", SF.match(conflict, "https://example.com/bad/x"), 0);
check("highlight elsewhere on the site", SF.match(conflict, "https://example.com/good"), 3);

// Lowest colour wins between two highlights, so the order is stable.
const twoColors = SF.compile([
  { pattern: "example.com", color: 4 },
  { pattern: ".com", color: 2 },
]);
check("lowest highlight wins", SF.match(twoColors, "https://example.com/"), 2);

// Pattern forms carried over from uBlacklist.
const forms = SF.compile([
  { pattern: "*://*.pasted.com/*", color: 1 },
  { pattern: "docs.example.com/guide/*", color: 1 },
  { pattern: "/^https?:\\/\\/([a-z]+\\.)?regex-example\\.(net|org)/", color: 2 },
  { pattern: "title/Cheap Pills/", color: 0 },
]);
check("full match pattern", SF.match(forms, "https://sub.pasted.com/x"), 1);
check("path glob matches", SF.match(forms, "https://docs.example.com/guide/intro"), 1);
check("path glob misses", SF.match(forms, "https://docs.example.com/blog/intro"), null);
check("url regex matches", SF.match(forms, "https://regex-example.org/a"), 2);
check("url regex misses", SF.match(forms, "https://regex-example.com/a"), null);
check("title regex matches", SF.match(forms, "https://anywhere.test/x", "Cheap Pills Online"), 0);
check("title regex ignores other titles", SF.match(forms, "https://anywhere.test/x", "Something Else"), null);

// www is stripped before matching, so a rule works on both spellings.
const bare = SF.compile([{ pattern: "example.com", color: 1 }]);
check("www stripped", SF.match(bare, "https://www.example.com/"), 1);

// Bad input is skipped, not thrown.
check("garbage url is ignored", m("not a url"), null);
check("empty pattern dropped", SF.compile([{ pattern: "   ", color: 1 }]).length, 0);

// Validation refuses what KeywordPattern refuses, and accepts plain globs.
check("plain domain valid", SF.validate("example.com").ok, true);
check("tld valid", SF.validate(".edu").ok, true);
check("empty invalid", SF.validate("").ok, false);
check("stateful regex refused", SF.validate("/abc/g").ok, false);
check("catastrophic regex refused", SF.validate("/(a+)+$/").ok, false);
check("sane regex accepted", SF.validate("/example\\.(net|org)/").ok, true);

// A rule that fails validation must not take the rest of the list with it.
const withBad = SF.compile([
  { pattern: "/(a+)+$/", color: 1 },
  { pattern: "good.com", color: 2 },
]);
check("bad rule dropped, good rule kept", SF.match(withBad, "https://good.com/"), 2);

// explain(): the same verdict, plus every reason for it. This is what the
// per-result "why is this hidden?" popover reads.
const explained = SF.compile([
  { pattern: ".edu", color: 1 },
  { pattern: "harvard.edu", color: 2 },
  { pattern: "harvard.edu/secret/*", color: 0 },
  { pattern: "unrelated.com", color: 3 },
  { pattern: "blocked-example.com", color: 0, source: "blocked" },
]);

const one = SF.explain(explained, "https://www.harvard.edu/admissions");
check("explain reports the host", one.host, "harvard.edu");
check("explain lists every matching rule", one.matched.map((r) => r.pattern).join(","), ".edu,harvard.edu");
check("explain skips non-matching rules", one.matched.length, 2);
check("explain picks the lowest colour as winner", one.winner.pattern, ".edu");
check("explain's colour agrees with match", one.color, SF.match(explained, "https://www.harvard.edu/admissions"));

const hidden = SF.explain(explained, "https://harvard.edu/secret/x");
check("a hide rule wins over highlights", hidden.winner.pattern, "harvard.edu/secret/*");
check("hide verdict is 0", hidden.color, 0);
check("all three matches are still reported", hidden.matched.length, 3);

const fromList = SF.explain(explained, "https://blocked-example.com/x");
check("source is carried through", fromList.winner.source, "blocked");
check("a rule's own source defaults to 'rule'", one.winner.source, "rule");

const none = SF.explain(explained, "https://developer.mozilla.org/");
check("no match means no winner", none.winner, null);
check("no match means no colour", none.color, null);
check("no match reports an empty rule list", none.matched.length, 0);

const broken = SF.explain(explained, "not a url");
check("a bad url explains as nothing", broken.winner, null);

console.log(`search-filter: ${passed} checks passed`);

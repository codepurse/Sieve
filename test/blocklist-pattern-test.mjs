// test/blocklist-pattern-test.mjs
// Sieve — tests for the blocked-sites entry syntax in common/keyword-pattern.js.
//
//   node --test test/
//
// This list is the one place where a user writes a pattern that decides whether
// a page loads at all, so both failure directions matter and neither is visible
// from the settings page: an entry that quietly matches nothing looks exactly
// like a list that is working, and an entry that matches too much (".xyz" is a
// single character away from a domain, and "example.com" must not swallow
// "notexample.com") only shows up as sites mysteriously disappearing.
//
// The sort is here too, because it is the part with a rule that is easy to
// break by accident: a note has to stay above the entries it heads.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const KP = require("../common/keyword-pattern.js");

// --- which form is this? ---------------------------------------------------

test("parseListEntry recognises each of the five forms", () => {
  assert.equal(KP.parseListEntry("pornhub.com").kind, "wildcard");
  assert.equal(KP.parseListEntry("*.inappropriate.net").kind, "wildcard");
  assert.equal(KP.parseListEntry("example.com/adult/*").kind, "wildcard");
  assert.equal(KP.parseListEntry(".xyz").kind, "tld");
  assert.equal(KP.parseListEntry("xyz").kind, "tld");
  assert.equal(KP.parseListEntry("/example\\.(net|org)/").kind, "url");
  assert.equal(KP.parseListEntry("title/Example Domain/").kind, "title");
  assert.equal(KP.parseListEntry("# a note").kind, "comment");
  assert.equal(KP.parseListEntry("! a note").kind, "comment");
  assert.equal(KP.parseListEntry("   ").kind, "empty");
});

test("a bare trailing slash is the whole site, not the exact path '/'", () => {
  const parsed = KP.parseListEntry("https://www.pornhub.com/");
  assert.equal(parsed.kind, "wildcard");
  assert.equal(parsed.host, "pornhub.com");
  assert.equal(parsed.path, "");
  const rules = KP.compileList(["example.com/"]);
  assert.equal(KP.matchCompiledUrl(rules, "https://example.com/anything"), "example.com/");
});

test("a scheme, www and a port are stripped from a wildcard entry", () => {
  const parsed = KP.parseListEntry("https://www.example.com:8080/adult/*");
  assert.equal(parsed.kind, "wildcard");
  assert.equal(parsed.host, "example.com");
  assert.equal(parsed.path, "/adult/*");
});

test("a domain starting with 'title' is not mistaken for a title pattern", () => {
  const parsed = KP.parseListEntry("titles.example.com");
  assert.equal(parsed.kind, "wildcard");
  assert.equal(parsed.host, "titles.example.com");
});

// --- validation ------------------------------------------------------------

test("validateListEntry accepts the good forms and names the bad ones", () => {
  for (const good of [
    "example.com",
    "*.example.com",
    "example.com/adult/*",
    ".xyz",
    "/example\\.(net|org)/",
    "title/Example Domain/",
    "# a note",
  ]) {
    assert.equal(KP.validateListEntry(good).ok, true, `expected ${good} to be accepted`);
  }

  assert.equal(KP.validateListEntry("not a domain").ok, false);
  assert.equal(KP.validateListEntry("").ok, false);

  // An unparseable regex is refused with the engine's own reason.
  const broken = KP.validateListEntry("/exam(ple/");
  assert.equal(broken.ok, false);
  assert.match(broken.error, /group|Invalid|Unterminated/i);

  // A pattern that would freeze pages is refused before it can reach one.
  const slow = KP.validateListEntry("/(a+)+$/");
  assert.equal(slow.ok, false);
  assert.match(slow.error, /too slow/i);

  // Stateful flags are refused for both regex forms.
  assert.equal(KP.validateListEntry("/example/g").ok, false);
  assert.equal(KP.validateListEntry("title/Example/y").ok, false);
});

// --- matching --------------------------------------------------------------

const compiled = KP.compileList([
  "# porn",
  "pornhub.com",
  "*.inappropriate.net",
  "example.com/adult/*",
  ".xyz",
  "/badsite\\.(net|org)/",
  "title/Example Domain/",
]);

test("a host entry covers the host and its subdomains, and nothing that merely ends the same way", () => {
  assert.equal(KP.matchCompiledUrl(compiled, "https://pornhub.com/"), "pornhub.com");
  assert.equal(KP.matchCompiledUrl(compiled, "https://www.pornhub.com/videos"), "pornhub.com");
  assert.equal(KP.matchCompiledUrl(compiled, "https://cdn.pornhub.com/a.jpg"), "pornhub.com");
  assert.equal(KP.matchCompiledUrl(compiled, "https://notpornhub.com/"), null);
  assert.equal(KP.matchCompiledUrl(compiled, "https://pornhub.com.example.org/"), null);
});

test("*.host is the same rule written the other way", () => {
  assert.equal(KP.matchCompiledUrl(compiled, "https://inappropriate.net/"), "*.inappropriate.net");
  assert.equal(KP.matchCompiledUrl(compiled, "https://a.b.inappropriate.net/x"), "*.inappropriate.net");
});

test("a path entry blocks only under that path", () => {
  assert.equal(KP.matchCompiledUrl(compiled, "https://example.com/adult/x"), "example.com/adult/*");
  assert.equal(KP.matchCompiledUrl(compiled, "https://example.com/news"), null);
  assert.equal(KP.matchCompiledUrl(compiled, "https://example.com/"), null);
});

test("a TLD entry covers every site under it, and does not leak into other TLDs", () => {
  assert.equal(KP.matchCompiledUrl(compiled, "https://anything.xyz/"), ".xyz");
  assert.equal(KP.matchCompiledUrl(compiled, "https://a.b.c.xyz/page"), ".xyz");
  assert.equal(KP.matchCompiledUrl(compiled, "https://xyz.com/"), null);
  assert.equal(KP.matchCompiledUrl(compiled, "https://notxyz/"), null);
});

test("an address regex matches the whole URL", () => {
  assert.equal(KP.matchCompiledUrl(compiled, "https://badsite.net/page"), "/badsite\\.(net|org)/");
  assert.equal(KP.matchCompiledUrl(compiled, "https://badsite.org/"), "/badsite\\.(net|org)/");
  assert.equal(KP.matchCompiledUrl(compiled, "https://badsite.com/"), null);
});

test("title entries never match a URL, and URL entries never match a title", () => {
  assert.equal(KP.matchCompiledUrl(compiled, "https://safe.example/title/Example%20Domain/"), null);
  assert.equal(KP.matchCompiledTitle(compiled, "Example Domain"), "title/Example Domain/");
  assert.equal(KP.matchCompiledTitle(compiled, "example domain"), "title/Example Domain/"); // always case-insensitive
  assert.equal(KP.matchCompiledTitle(compiled, "Something else"), null);
  assert.equal(KP.matchCompiledTitle(compiled, "pornhub.com"), null);
});

test("comments and invalid entries are dropped before matching", () => {
  const list = KP.compileList(["# note", "", "not a domain", "/(a+)+$/", "example.com"]);
  assert.equal(list.length, 1);
  assert.equal(list[0].source, "example.com");
});

test("non-http URLs never match", () => {
  assert.equal(KP.matchCompiledUrl(compiled, "data:image/png;base64,AAAA"), null);
  assert.equal(KP.matchCompiledUrl(compiled, "chrome-extension://abc/page.html"), null);
  assert.equal(KP.matchCompiledUrl(compiled, "nonsense"), null);
});

// --- tidying ---------------------------------------------------------------

test("a list with no notes sorts A-Z and de-duplicates case-insensitively", () => {
  assert.deepEqual(
    KP.tidyListEntries(["zebra.com", "Apple.com", "apple.com", "mid.com"]),
    ["Apple.com", "mid.com", "zebra.com"]
  );
});

test("notes stay above the entries they head, and sections keep their order", () => {
  assert.deepEqual(
    KP.tidyListEntries([
      "# news",
      "zzz.news",
      "aaa.news",
      "# shopping",
      "zzz.shop",
      "aaa.shop",
    ]),
    ["# news", "aaa.news", "zzz.news", "# shopping", "aaa.shop", "zzz.shop"]
  );
});

test("entries written before the first note stay at the top", () => {
  assert.deepEqual(
    KP.tidyListEntries(["b.com", "a.com", "# later", "d.com", "c.com"]),
    ["a.com", "b.com", "# later", "c.com", "d.com"]
  );
});

test("consecutive notes head the same section", () => {
  assert.deepEqual(
    KP.tidyListEntries(["# heading", "! and a second line", "b.com", "a.com"]),
    ["# heading", "! and a second line", "a.com", "b.com"]
  );
});

test("a duplicate is dropped from the later section, not the first", () => {
  assert.deepEqual(
    KP.tidyListEntries(["# one", "dupe.com", "# two", "dupe.com", "other.com"]),
    ["# one", "dupe.com", "# two", "other.com"]
  );
});

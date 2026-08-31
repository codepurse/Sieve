// test/custom-block-rules-test.mjs
// Sieve — tests for background/custom-block-rules.js.
//
//   node --test test/
//
// These rules are the part of the blocked-sites list that the user can never
// see. A rule that is too narrow leaves an entry in their list that quietly
// never blocks anything; a rule that is too broad takes down sites they never
// listed. Chrome reports neither, so the shapes are pinned here.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildCustomBlockRules } from "../background/custom-block-rules.js";

const require = createRequire(import.meta.url);
const KP = require("../common/keyword-pattern.js");

const SUBRESOURCE_TYPES = ["image", "script", "sub_frame"];

function build(entries, over = {}) {
  return buildCustomBlockRules(entries, {
    KP,
    idStart: 10000,
    idEnd: 20000,
    subresourceTypes: SUBRESOURCE_TYPES,
    isRegexSupported: async () => true,
    ...over,
  });
}

const pages = (rules) => rules.filter((r) => r.condition.resourceTypes.includes("main_frame"));
const subresource = (rules) => rules.filter((r) => !r.condition.resourceTypes.includes("main_frame"));

test("an empty list produces no rules", async () => {
  assert.deepEqual(await build([]), []);
  assert.deepEqual(await build(["# just a note", "! and another"]), []);
});

test("plain hosts are packed into one rule pair, not one pair each", async () => {
  const rules = await build(["a.com", "b.com", "c.com"]);
  assert.equal(rules.length, 2);
  assert.deepEqual(rules[0].condition.requestDomains, ["a.com", "b.com", "c.com"]);
  assert.equal(rules[0].action.type, "redirect");
  assert.deepEqual(rules[0].condition.resourceTypes, ["main_frame"]);
  assert.equal(rules[1].action.type, "block");
  assert.deepEqual(rules[1].condition.resourceTypes, SUBRESOURCE_TYPES);
});

test("*.host and a bare host are the same rule, and are de-duplicated by the settings page's normaliser, not here", async () => {
  const rules = await build(["*.example.com"]);
  assert.deepEqual(rules[0].condition.requestDomains, ["example.com"]);
});

test("a path entry becomes a urlFilter that covers subdomains", async () => {
  const rules = await build(["example.com/adult/*"]);
  assert.equal(rules.length, 2);
  assert.equal(rules[0].condition.urlFilter, "||example.com/adult/*");
  assert.equal(rules[1].condition.urlFilter, "||example.com/adult/*");
});

test("a path with no trailing star is anchored, so /adult does not also block /adultery", async () => {
  const rules = await build(["example.com/adult"]);
  assert.equal(rules[0].condition.urlFilter, "||example.com/adult|");
});

test("a TLD blocks pages only — never subresources", async () => {
  const rules = await build([".xyz"]);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].action.type, "redirect");
  assert.deepEqual(rules[0].condition.resourceTypes, ["main_frame"]);
  // Matches any host under the TLD, and nothing that merely starts with it.
  const re = new RegExp(rules[0].condition.regexFilter);
  assert.ok(re.test("https://anything.xyz/"));
  assert.ok(re.test("http://a.b.xyz:8080/page"));
  assert.ok(!re.test("https://xyz.com/"));
  assert.ok(!re.test("https://notxyz.com/"));
});

test("an address pattern gets both a page rule and a subresource rule", async () => {
  const rules = await build(["/badsite\\.(net|org)/"]);
  assert.equal(rules.length, 2);
  assert.equal(rules[0].condition.regexFilter, "badsite\\.(net|org)");
  assert.equal(pages(rules).length, 1);
  assert.equal(subresource(rules).length, 1);
});

test("a pattern the browser will not take is skipped, and the rest of the list still applies", async () => {
  const seen = [];
  const rules = await build(["a.com", "/(?=nope)/", "/fine/"], {
    isRegexSupported: async (regex) => {
      seen.push(regex);
      return !regex.includes("?=");
    },
    warn: () => {},
  });
  assert.deepEqual(seen, ["(?=nope)", "fine"]);
  assert.ok(rules.some((r) => r.condition.requestDomains));
  assert.ok(rules.some((r) => r.condition.regexFilter === "fine"));
  assert.ok(!rules.some((r) => r.condition.regexFilter === "(?=nope)"));
});

test("title patterns, notes and invalid lines produce no rules at all", async () => {
  const rules = await build([
    "title/Example Domain/",
    "# a note",
    "! another note",
    "not a domain",
    "/(a+)+$/", // refused as too slow before it ever reaches the browser
  ]);
  assert.deepEqual(rules, []);
});

test("rule IDs are unique, sequential and stay inside the range they own", async () => {
  const rules = await build(["a.com", "b.com/x/*", ".xyz", "/pat/"]);
  const ids = rules.map((r) => r.id);
  assert.deepEqual(ids, [...new Set(ids)]);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  assert.ok(ids.every((id) => id >= 10000 && id < 20000));
});

test("a list too long for its ID range is truncated rather than spilling into the next one", async () => {
  const many = Array.from({ length: 20 }, (_, i) => `site${i}.com/x/*`);
  const warnings = [];
  const rules = await build(many, { idEnd: 10010, warn: (m) => warnings.push(m) });
  assert.ok(rules.every((r) => r.id < 10010));
  assert.equal(rules.length, 10);
  assert.ok(warnings.some((w) => /tail was skipped/.test(w)));
});

test("every rule Chrome is handed has the fields it requires", async () => {
  const rules = await build(["a.com", "b.com/x/*", ".xyz", "/pat/"]);
  for (const rule of rules) {
    assert.equal(typeof rule.id, "number");
    assert.equal(rule.priority, 1);
    assert.ok(rule.action.type === "block" || rule.action.type === "redirect");
    if (rule.action.type === "redirect") {
      assert.match(rule.action.redirect.extensionPath, /^\/pages\/blocked\.html\?category=custom-blocked$/);
    }
    assert.ok(Array.isArray(rule.condition.resourceTypes));
    const shapes = ["requestDomains", "urlFilter", "regexFilter"].filter((k) => k in rule.condition);
    assert.deepEqual(shapes.length, 1, "a condition should use exactly one matcher");
  }
});

test("each redirect action is its own object, so mutating one cannot alter another", async () => {
  const rules = await build(["a.com", ".xyz"]);
  const redirects = rules.filter((r) => r.action.type === "redirect");
  assert.ok(redirects.length >= 2);
  assert.notEqual(redirects[0].action, redirects[1].action);
  assert.notEqual(redirects[0].action.redirect, redirects[1].action.redirect);
});

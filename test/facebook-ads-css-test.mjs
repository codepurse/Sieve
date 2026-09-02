// test/facebook-ads-css-test.mjs
// Sieve — the part of content/facebook-ads.css that can be checked without a
// browser engine.
//
//   node --test test/
//
// Whether the selectors MATCH needs a real engine (:has(), the cascade). What is
// pinned here is the set of mistakes that are invisible until a user hits them:
//
//   1. Losing the collapse class, or its contract with
//      content/facebook-ads-dom.js. That script only ever adds a class name; if
//      this file stops defining it, the whole DOM half marks ads and nothing
//      happens, with no error anywhere.
//   2. Reaching for display:none on the feed. Facebook's feed is virtualised and
//      measures its items — uBlock Origin has used height:0 here for years, and
//      re-learning why would cost a release.
//   3. Mixing a plain selector into the :has() block. An invalid selector
//      invalidates the whole comma-separated list it sits in, so on an engine
//      without :has() the plain one is silently thrown away too.
//   4. A rule keyed on one of Facebook's generated class names. Those are
//      minified and rotate; one will eventually mean something else, and then
//      the rule hides a real post with nobody able to say why.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const CSS = fs.readFileSync(new URL("../content/facebook-ads.css", import.meta.url), "utf8");
const DOM = fs.readFileSync(new URL("../content/facebook-ads-dom.js", import.meta.url), "utf8");

// The comments explain the reasoning at length and name the very things we are
// asserting are absent, so they have to go before matching.
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

const BLOCKS = [...RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  body: m[2],
}));
const ALL = BLOCKS.flatMap((b) => b.selectors);

// Is this selector confined to the right-hand column?
//
// THREE names, because Facebook serves three right-hand columns depending on
// the session: #right_rail_container (oldest), [data-pagelet="RightRail"] (the
// Comet pagelet) and div[role="complementary"] (current). The two tests below
// exist to keep display:none and :has() out of the VIRTUALISED FEED, and all
// three of these are the static sidebar, where neither costs anything.
//
// `complementary` was the missing one, in the stylesheet and in the script's
// container list both, and between them that is why sidebar ads survived on a
// modern session: nothing here named the column the ads were actually in.
const RAIL = ["right_rail", "RightRail", 'role="complementary"'];
const inRightColumn = (sel) => RAIL.some((name) => sel.includes(name));

test("the collapse class exists and is what the DOM half asks for", () => {
  // The one hard contract between the two files.
  const name = /const COLLAPSE_CLASS = "([^"]+)"/.exec(DOM);
  assert.ok(name, "content/facebook-ads-dom.js must declare COLLAPSE_CLASS");
  assert.ok(
    ALL.includes("." + name[1]),
    `content/facebook-ads.css must define .${name[1]} — without it the DOM half is a no-op`
  );
});

test("the collapse actually collapses", () => {
  const block = BLOCKS.find((b) => b.selectors.includes(".sieve-fb-ad-collapsed"));
  for (const decl of ["height: 0", "overflow: hidden", "margin: 0", "padding: 0"]) {
    assert.match(block.body, new RegExp(decl.replace(/\s+/g, "\\s*")), decl);
  }
  // Every one of them has to win against Facebook's own inline styling.
  const declarations = block.body.split(";").filter((d) => d.trim());
  for (const d of declarations) {
    assert.match(d, /!important/, `missing !important: ${d.trim()}`);
  }
});

test("the feed is never hidden with display:none", () => {
  // The single most important assertion in this file. Facebook's feed measures
  // its items and recycles their wrappers; uBlock Origin collapses rather than
  // hides here, and has done for years. The right-hand-column rule is the one
  // exception — it is a static sidebar, not a virtualised list.
  for (const block of BLOCKS) {
    if (!/display\s*:\s*none/.test(block.body)) continue;
    for (const sel of block.selectors) {
      assert.ok(
        inRightColumn(sel),
        `display:none outside the right-hand column: ${sel}`
      );
    }
  }
});

test("no rule is keyed on a generated Facebook class name", () => {
  // Facebook's classes look like .x1i10hfl / .xt0psk2 — minified, rotating, and
  // meaningless. Ours is the only class allowed here.
  for (const sel of ALL) {
    const classes = sel.match(/\.[A-Za-z0-9_-]+/g) || [];
    for (const c of classes) {
      assert.ok(c.startsWith(".sieve-"), `selector keyed on a Facebook class: ${sel}`);
    }
  }
});

test(":has() selectors are kept in their own block", () => {
  // An unsupported selector invalidates its whole comma-separated list. Mixing
  // the two means an old engine throws away the plain selectors as well.
  for (const block of BLOCKS) {
    const withHas = block.selectors.filter((s) => s.includes(":has("));
    if (!withHas.length) continue;
    assert.equal(
      withHas.length,
      block.selectors.length,
      "a plain selector is sharing a block with :has() — it will be dropped with it"
    );
  }
});

test("the surfaces the settings page promises are all covered", () => {
  // If one of these is deleted while triaging breakage, say so rather than
  // letting the ad quietly come back. The right-hand column is the stylesheet's;
  // the feed is the script's, for the reason in the next test.
  // Prefix-matched, never exact: Facebook increments that counter and a live
  // sidebar now serves rhcad3, so a rule pinned to rhcad2 selects nothing.
  assert.match(ALL.join(" "), /target\^="rhcad"/, "the right-hand-column ad link target");
  assert.doesNotMatch(ALL.join(" "), /target="rhcad\d/, "rhcad must not be pinned to one generation");
  assert.match(DOM, /\/ads\/about/, 'the "Why am I seeing this ad?" link');
  assert.match(DOM, /role="feed"/, "the main feed");
});

test("no :has() rule reaches into the feed", () => {
  // The regression guard for a shipped bug. :has() re-evaluates whenever
  // anything inside the subject's subtree changes, and Facebook's feed changes
  // constantly — one `div[role="feed"] > div:has(...)` rule had the engine
  // re-checking every story for as long as the tab was open, which from the
  // user's chair looked like a feed that would not stop refreshing.
  //
  // The right-hand column is small and static, so the same construct is free
  // there. Everywhere else this belongs to content/facebook-ads-dom.js, which
  // looks once per element and remembers.
  for (const sel of ALL) {
    if (!sel.includes(":has(")) continue;
    assert.ok(
      inRightColumn(sel),
      `:has() outside the right-hand column will thrash style recalculation: ${sel}`
    );
  }
});

test("nothing here touches a surface the switch does not claim", () => {
  // "Suggested for you" and friends are Facebook promoting Facebook, not
  // advertising, and the settings page says this switch leaves them alone.
  for (const forbidden of ["Suggested", "people_you_may_know", "pymk", "reels_tab"]) {
    assert.ok(!RULES.includes(forbidden), `out of scope for this switch: ${forbidden}`);
  }
});

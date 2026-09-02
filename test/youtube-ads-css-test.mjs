// test/youtube-ads-css-test.mjs
// Sieve — the part of content/youtube-ads.css that can be checked without a
// browser engine.
//
//   node --test test/
//
// Whether the selectors actually MATCH needs a real engine (:has(), the cascade),
// and that lives in test/youtube-ads-css-test.html. What is pinned here is the
// set of mistakes that are invisible until a user hits them:
//
//   1. Hiding the player's own ad container. That is the one change in this file
//      that would make things WORSE than shipping nothing — see below.
//   2. Mixing a plain selector into the :has() block. An invalid selector
//      invalidates the whole comma-separated list it sits in, so on an engine
//      without :has() support the plain one is thrown away too, silently.
//   3. Losing a surface. If a selector is deleted while triaging breakage, this
//      says so rather than letting the ad quietly come back.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const CSS = fs.readFileSync(new URL("../content/youtube-ads.css", import.meta.url), "utf8");

// Comments in this file explain the reasoning at length and name the very
// selectors we are asserting are absent, so they have to go before matching.
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

// Every selector, per block.
const BLOCKS = [...RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1].split(",").map((s) => s.trim()).filter(Boolean),
  body: m[2],
}));
const ALL = BLOCKS.flatMap((b) => b.selectors);

test("the player's own ad container is never hidden", () => {
  // The single most important assertion in this file.
  //
  // Hiding .video-ads / .ytp-ad-module does not stop an ad that is already
  // playing — it makes it invisible. The user then sits through a countdown they
  // cannot see, beside a skip button they cannot click, and concludes the
  // extension broke YouTube. EasyList carries an explicit exception for exactly
  // this (ads.google.com,youtube.com#@#.video-ads). Removing the ad from the
  // data is the only fix for that surface, and that is the scriptlet's job.
  for (const forbidden of [".video-ads", ".ytp-ad-module", ".ytp-ad-player-overlay"]) {
    const hit = ALL.filter((s) => s.split(/\s|>/).some((part) => part === forbidden));
    assert.deepEqual(hit, [], `${forbidden} must not be hidden by this stylesheet`);
  }
});

test("the :has() block contains nothing but :has() selectors", () => {
  const hasBlocks = BLOCKS.filter((b) => b.selectors.some((s) => s.includes(":has(")));
  assert.ok(hasBlocks.length, "expected at least one :has() block");
  for (const b of hasBlocks) {
    const plain = b.selectors.filter((s) => !s.includes(":has("));
    assert.deepEqual(
      plain,
      [],
      "a plain selector here is discarded along with the :has() ones on an engine " +
        "that does not support :has(); move it to a block of its own"
    );
  }
});

test("every rule hides, and hides with !important", () => {
  // YouTube's own styles are specific and inline-ish; a rule without !important
  // loses to them and the ad stays on screen looking exactly like a missing rule.
  for (const b of BLOCKS) {
    assert.match(b.body.trim(), /display:\s*none\s*!important;?/);
  }
});

test("each ad surface still has a selector", () => {
  // One name per surface a user can see an ad on. This is a coverage list, not a
  // style check: if triage deletes one of these while chasing breakage, the ad
  // comes back and nothing else would notice.
  const SURFACES = {
    "home / subscriptions feed tile": "ytd-ad-slot-renderer",
    "feed ad layout": "ytd-in-feed-ad-layout-renderer",
    "home masthead": "#masthead-ad",
    "promoted search result": "ytd-search-pyv-renderer",
    "promoted video": "ytd-promoted-video-renderer",
    "watch-page companion": "#player-ads",
    "companion slot": "ytd-companion-slot-renderer",
    "in-player banner overlay": ".ytp-ad-overlay-container",
    "Premium / Music promo bar": "ytd-mealbar-promo-renderer",
    "Shorts": "ytd-reel-video-renderer",
    "mobile slot": "ad-slot-renderer",
  };
  for (const [surface, selector] of Object.entries(SURFACES)) {
    assert.ok(
      ALL.some((s) => s.includes(selector)),
      `no rule left covering the ${surface} (${selector})`
    );
  }
});

test("the stylesheet is inert on every site but YouTube", () => {
  // It is registered with a youtube.com match pattern, so it is never injected
  // elsewhere — but the element names are the second line of defence. Anything
  // generic here (a bare .ad, .sponsored, [class*="ad"]) would be one manifest
  // edit away from hiding parts of unrelated sites.
  for (const s of ALL) {
    const generic = /^\.(ad|ads|sponsored|advert|promo)$/.test(s.trim()) || /\[class\*?=/.test(s);
    assert.equal(generic, false, `"${s}" is too generic to be safe outside YouTube`);
  }
});

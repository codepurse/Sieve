// test/facebook-ads-dom-test.mjs
// Sieve — tests for the label reader in content/facebook-ads-dom.js.
//
//   node --test test/
//
// What is pinned here is visibleLabelText() and the two decisions either side of
// it, because that is the detector the whole DOM half rests on: it is the only
// one that keeps working when Facebook renames its attributes, and it is the one
// whose failure mode is silent in both directions — a missed ad looks like the
// feature not working, and a false match hides someone's actual post.
//
// The real file is run in a vm sandbox against a hand-built node tree rather
// than a DOM library. That is not a shortcut: the whole point of the function is
// that it asks the BROWSER which elements are visible, so the interesting input
// is the computed style, and a fake getStyle is a more honest test of that than
// a DOM implementation guessing at layout. The tree only has to answer
// nodeType / childNodes / data, which is all the function reads.
//
// The obfuscation cases below are the ones Facebook has actually shipped:
// letters split into spans, decoys hidden five different ways, and the reading
// order set by CSS `order` rather than the DOM.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/facebook-ads-dom.js", import.meta.url), "utf8");

// Load the real file with just enough of a window for its top-level wiring to
// run, and hand back the test hook it exposes.
function loadDom() {
  const sandbox = {
    console: { debug() {}, log() {}, error() {} },
    Object,
    Array,
    Number,
    String,
    RegExp,
    Math,
    Date,
    setTimeout: () => 0,
    chrome: { runtime: { sendMessage: () => ({ catch() {} }) } },
    MutationObserver: class {
      observe() {}
    },
  };
  sandbox.window = sandbox;
  sandbox.window.addEventListener = () => {};
  sandbox.window.getComputedStyle = () => ({});
  sandbox.location = { href: "https://www.facebook.com/" };
  sandbox.document = {
    documentElement: { nodeType: 1 },
    body: null,
    addEventListener: () => {},
    getElementsByClassName: () => [],
    querySelectorAll: () => [],
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.window.__sieveFacebookAdDom;
}

const dom = loadDom();

// --- the fake tree ---------------------------------------------------------
//
// `style` is what the fake getComputedStyle will return for that element, and
// defaults to a plain visible inline box.

const VISIBLE = { display: "inline", visibility: "visible", opacity: "1", fontSize: "12px" };

function el(children, style) {
  return { nodeType: 1, childNodes: children || [], style: { ...VISIBLE, ...(style || {}) } };
}

function txt(data) {
  return { nodeType: 3, data };
}

// One <span> per letter, the shape Facebook renders the label in.
function letters(spec) {
  return spec.map(([ch, style]) => el([txt(ch)], style));
}

function read(node) {
  const getStyle = (e, pseudo) => (pseudo ? { content: "none" } : e.style);
  return dom.visibleLabelText(node, getStyle, { left: 500 });
}

// --- reading the label -----------------------------------------------------

test("a plain, unobfuscated label reads as itself", () => {
  assert.equal(read(el([txt("Sponsored")])), "Sponsored");
});

test("letters split into spans are put back together", () => {
  const node = el(letters([["S"], ["p"], ["o"], ["n"], ["s"], ["o"], ["r"], ["e"], ["d"]]));
  assert.equal(read(node), "Sponsored");
});

test("decoy letters are dropped, whichever way they are hidden", () => {
  // The five ways seen in the wild, one per decoy.
  const node = el(
    letters([
      ["S"],
      ["x", { display: "none" }],
      ["p"],
      ["q", { visibility: "hidden" }],
      ["o"],
      ["z", { opacity: "0" }],
      ["n"],
      ["w", { fontSize: "0px" }],
      ["s"],
      ["k", { position: "absolute", width: "1px", height: "1px" }],
      ["o"],
      ["j", { textIndent: "-9999px" }],
      ["r"],
      ["e"],
      ["d"],
    ])
  );
  assert.equal(read(node), "Sponsored");
});

test("a hidden element takes its whole subtree with it", () => {
  const node = el([
    txt("Spo"),
    el([txt("XXX"), el([txt("YYY")])], { display: "none" }),
    txt("nsored"),
  ]);
  assert.equal(read(node), "Sponsored");
});

test("flex `order` decides the reading order, not the DOM", () => {
  // The DOM order here spells "erdSonpso".
  const node = el(
    letters([
      ["e", { order: "7" }],
      ["r", { order: "6" }],
      ["d", { order: "8" }],
      ["S", { order: "0" }],
      ["o", { order: "2" }],
      ["n", { order: "3" }],
      ["p", { order: "1" }],
      ["s", { order: "4" }],
      ["o", { order: "5" }],
    ]),
    { display: "flex" }
  );
  assert.equal(read(node), "Sponsored");
});

test("`order` is ignored when the container is not a flex box", () => {
  // Same orders, ordinary block container: CSS order means nothing there, and
  // honouring it anyway would scramble a label that was perfectly readable.
  const node = el(
    letters([
      ["S", { order: "9" }],
      ["p", { order: "1" }],
    ]),
    { display: "block" }
  );
  assert.equal(read(node), "Sp");
});

test("equal orders keep their DOM sequence", () => {
  const node = el(
    letters([
      ["S", { order: "0" }],
      ["p", { order: "0" }],
      ["o", { order: "0" }],
    ]),
    { display: "flex" }
  );
  assert.equal(read(node), "Spo");
});

test("letters delivered as ::before / ::after content are included", () => {
  const inner = el([txt("ponsore")]);
  const node = el([inner]);
  const getStyle = (e, pseudo) => {
    if (pseudo === "::before") return { content: e === node ? '"S"' : "none" };
    if (pseudo === "::after") return { content: e === node ? '"d"' : "none" };
    return e.style;
  };
  assert.equal(dom.visibleLabelText(node, getStyle, { left: 500 }), "Sponsored");
});

test("a computed ::before content is not mistaken for a letter", () => {
  const node = el([txt("Sponsored")]);
  const getStyle = (e, pseudo) =>
    pseudo ? { content: pseudo === "::before" ? "counter(x)" : "none" } : e.style;
  assert.equal(dom.visibleLabelText(node, getStyle, { left: 500 }), "Sponsored");
});

test("the node budget stops a mis-chosen candidate becoming a subtree walk", () => {
  let node = el([txt("x")]);
  for (let i = 0; i < 50; i++) node = el([node]);
  const budget = { left: 10 };
  dom.visibleLabelText(node, (e, p) => (p ? { content: "none" } : e.style), budget);
  assert.ok(budget.left <= 0, "the walk must stop rather than run to the bottom");
});

// --- deciding what the label means -----------------------------------------

test("the word is matched whole, never as a substring", () => {
  assert.equal(dom.isSponsoredLabel("Sponsored"), true);
  assert.equal(dom.isSponsoredLabel("  sponsored  "), true);
  // A real post that merely mentions the word must not be touched.
  assert.equal(dom.isSponsoredLabel("Sponsored by my dog"), false);
  assert.equal(dom.isSponsoredLabel("Our sponsored walk is Saturday"), false);
  assert.equal(dom.isSponsoredLabel("Unsponsored"), false);
});

test("the suffix Facebook appends after a separator is allowed", () => {
  assert.equal(dom.isSponsoredLabel("Sponsored · Paid partnership"), true);
  assert.equal(dom.isSponsoredLabel("Sponsored • Suggested for you"), true);
});

test("the other languages Facebook ships the badge in are matched", () => {
  for (const word of ["Patrocinado", "Gesponsert", "Sponsorisé", "広告", "광고", "Реклама"]) {
    assert.equal(dom.isSponsoredLabel(word), true, word);
  }
});

test("accents and Arabic vowel marks do not decide a match", () => {
  assert.equal(dom.isSponsoredLabel("sponsorise"), true, "the unaccented spelling still matches");
  assert.equal(dom.isSponsoredLabel("Sponsorisé"), true);
});

test("a byline is not a label", () => {
  assert.equal(dom.isSponsoredLabel("John Smith"), false);
  assert.equal(dom.isSponsoredLabel("2 hours ago"), false);
  assert.equal(dom.isSponsoredLabel(""), false);
});

// --- the pre-filter --------------------------------------------------------

test("the pre-filter passes obfuscated text", () => {
  // Decoys are ADDED, never substituted, so every real letter is still in there.
  assert.equal(dom.couldSpell("SdpxoznsyoAred"), true);
  assert.equal(dom.couldSpell("Sponsored"), true);
});

test("the pre-filter turns away the text a post header is actually full of", () => {
  // This is a COST filter, not a decision — anything it lets through still has
  // to survive being read and then matched, and a few near-misses getting that
  // far is cheap. What it must not do is let everything through, because then
  // every byline and timestamp in the feed pays for a style walk.
  for (const s of ["2 hours ago", "Yesterday at 18:02", "John Smith", "Just now", "Share", ""]) {
    assert.equal(dom.couldSpell(s), false, s);
  }
});

test("a near-miss that does get through is still rejected by the reader", () => {
  // The two halves in sequence: the filter is allowed to be generous, because
  // this is where the decision is actually made.
  assert.equal(dom.isSponsoredLabel("Maria Santos"), false);
  assert.equal(dom.isSponsoredLabel("Top comments"), false);
});

test("the pre-filter tolerates letters that came from generated content", () => {
  // The case that made this a tolerance rather than an all-present test: a
  // letter delivered as ::before / ::after content is on screen but absent from
  // textContent, so a strict check threw away exactly the labels the
  // reconstruction exists to read. "ponsore" here is the label with its S and
  // its d supplied by pseudo-elements.
  assert.equal(dom.couldSpell("XrQpzewoksjnpolisore"), true);
  assert.equal(dom.couldSpell("ponsore"), true);
});

test("the tolerance does not swallow a two-character badge", () => {
  // A flat allowance of two would make every short candidate on a Japanese or
  // Korean page look like a match, since the whole badge is two characters. The
  // allowance is proportional for exactly that reason.
  assert.equal(dom.couldSpell("3時間"), false);
  assert.equal(dom.couldSpell("広告"), true);
});

// --- the header-token heuristic --------------------------------------------

const longToken = "A".repeat(300);
const shortToken = "A".repeat(40);

function link(href) {
  return { getAttribute: () => href };
}

test("a long __cft__ token in a header link reads as an ad", () => {
  assert.equal(dom.looksLikeAdLink(link(`/story?__cft__[0]=${longToken}`)), true);
  assert.equal(dom.looksLikeAdLink(link(`/story?__cft__%5B0%5D=${longToken}`)), true);
});

test("an ordinary post's short token does not", () => {
  assert.equal(dom.looksLikeAdLink(link(`/story?__cft__[0]=${shortToken}`)), false);
  assert.equal(dom.looksLikeAdLink(link("/story?id=1")), false);
  assert.equal(dom.looksLikeAdLink(link("")), false);
});

test("group and section-header links are excluded whatever their token", () => {
  // Both carry long tokens routinely and neither is ever an ad.
  assert.equal(dom.looksLikeAdLink(link(`/groups/123?__cft__[0]=${longToken}`)), false);
  assert.equal(
    dom.looksLikeAdLink(link(`/x?section_header_type=1&__cft__[0]=${longToken}`)),
    false
  );
});

// test/anti-adblock-test.mjs
// Sieve — tests for the MAIN-world half of the anti-adblock filter,
// content/anti-adblock.js.
//
//   node --test test/
//
// Two things here are worth a test suite of their own, and they are the two
// whose failures are silent in opposite directions.
//
// THE NAME TEST. Job 3 lies about the size of anything that looks like an ad
// slot, and "looks like" is decided by tokenising the id and class. Matching "ad"
// as a substring — the obvious implementation, and the one every naive version
// of this ships with — also matches shadow, header, gradient, padding, download,
// loading, thread and read. That would have the extension inventing a 250px box
// for arbitrary page furniture, during page load, on every site. The false
// negatives are just as quiet: miss "adBanner" because the tokeniser does not
// split camelCase and the whole feature does nothing on half the web.
//
// THE DETECTOR STUB. It has to answer "no blocker here" in a shape the calling
// site accepts: chainable, asynchronous, and with the onDetected callbacks never
// fired. A stub that fires both is worse than no stub at all.
//
// The real file is run in a vm sandbox against a hand-built DOM rather than a
// DOM library, for the same reason test/facebook-ads-dom-test.mjs does: what is
// interesting is the interaction with the prototype accessors, and a fake whose
// descriptors we control is a more honest test of that than an implementation
// guessing at layout.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/anti-adblock.js", import.meta.url), "utf8");

// --- the fake page ---------------------------------------------------------

function makeSandbox() {
  const timers = [];
  const intervals = new Set();

  const sandbox = {
    console: { debug() {}, log() {}, warn() {}, error() {} },
    Object,
    Array,
    Set,
    WeakMap,
    WeakSet,
    Proxy,
    Reflect,
    Map,
    Math,
    Date,
    Number,
    String,
    RegExp,
    Boolean,
    Error,
    TypeError,
    JSON,
    // Timers are collected rather than run, so a test decides when (and
    // whether) a queued callback fires.
    setTimeout: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    setInterval: (fn, ms) => {
      const id = { fn, ms };
      intervals.add(id);
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
  };

  // A two-level prototype chain, and the level each property sits on matters:
  // offsetHeight/offsetWidth/offsetParent are HTMLElement's, while
  // clientHeight/clientWidth and the two rect methods are Element's. The file
  // patches them where the real DOM keeps them, so a fake that flattens the
  // split would report a pass on a property that is still telling the truth in
  // a browser.
  vm.createContext(sandbox);
  vm.runInContext(
    `
    class Element {
      constructor() {
        this.nodeType = 1;
        this.id = "";
        this._attrs = {};
        this._text = "";
        this._h = 0;
        this._w = 0;
        this._rect = { x: 5, y: 7, top: 7, left: 5, width: 0, height: 0, right: 5, bottom: 7 };
        // A hidden element returns an EMPTY list, which is the whole point of
        // the getClientRects check.
        this._rects = [];
        this.parentElement = null;
        this._offsetParent = null;
      }
      getAttribute(name) { return name in this._attrs ? this._attrs[name] : null; }
      setAttribute(name, value) { this._attrs[name] = value; }
      getBoundingClientRect() { return this._rect; }
      getClientRects() { return this._rects; }
      get textContent() { return this._text; }
      // clientHeight/clientWidth live on Element in the real DOM, and the file
      // patches them there. Putting them on HTMLElement here — as an earlier
      // version of this fake did — makes the test pass while the real browser
      // keeps reporting 0, which is exactly the bug it was meant to catch.
      get clientHeight() { return this._h; }
      get clientWidth() { return this._w; }
    }
    class HTMLElement extends Element {
      get offsetHeight() { return this._h; }
      get offsetWidth() { return this._w; }
      get offsetParent() { return this._offsetParent; }
    }
    this.Element = Element;
    this.HTMLElement = HTMLElement;
  `,
    sandbox
  );

  sandbox.window = sandbox;
  sandbox.document = { body: null, documentElement: null, addEventListener() {} };
  // The real computed style, before the file wraps it. Returns a declaration
  // that answers both spellings of a style read.
  sandbox.getComputedStyle = (el) => ({
    display: el && el._display !== undefined ? el._display : "none",
    visibility: "hidden",
    opacity: "0",
    height: "0px",
    width: "0px",
    color: "rgb(1, 2, 3)",
    getPropertyValue(name) {
      return this[name] !== undefined ? this[name] : "";
    },
  });

  vm.runInContext(SOURCE, sandbox);
  return { sandbox, shim: sandbox.window.__slotShim, timers, intervals };
}

function el(sandbox, { id = "", cls = null, name = null, text = "" } = {}) {
  const node = new sandbox.HTMLElement();
  node.id = id;
  if (cls !== null) node.setAttribute("class", cls);
  if (name !== null) node.setAttribute("name", name);
  node._text = text;
  return node;
}

// ===========================================================================
// The tokeniser
// ===========================================================================

test("a name is split on punctuation and on camelCase humps", () => {
  const { shim } = makeSandbox();
  assert.deepEqual(Array.from(shim.tokensOf("ad-banner")), ["ad", "banner"]);
  assert.deepEqual(Array.from(shim.tokensOf("adBanner")), ["ad", "banner"]);
  assert.deepEqual(Array.from(shim.tokensOf("ad_slot_top")), ["ad", "slot", "top"]);
  assert.deepEqual(Array.from(shim.tokensOf("AdSlot")), ["ad", "slot"]);
  assert.deepEqual(Array.from(shim.tokensOf("")), []);
  assert.deepEqual(Array.from(shim.tokensOf(null)), []);
});

test("the words that merely CONTAIN ad are not ad slots", () => {
  // The whole reason the tokeniser exists. Every one of these matches a
  // substring test for "ad", and not one of them is an advert.
  const { shim } = makeSandbox();
  const innocent = [
    "shadow", "box-shadow", "header", "page-header", "gradient", "padding",
    "download", "downloads", "upload", "loading", "is-loading", "read",
    "read-more", "thread", "breadcrumb", "adjacent", "adapter", "admin",
    "address", "advice", "readable", "spread", "shade", "roadmap", "heading",
    "add-to-cart", "adm-panel", "adv-search",
  ];
  for (const name of innocent) {
    assert.equal(shim.nameLooksLikeBait(name), false, `${name} must not read as an ad slot`);
  }
});

test("the names a detector actually uses do read as ad slots", () => {
  const { shim } = makeSandbox();
  const bait = [
    "ad", "ads", "adsbox", "ad-banner", "adBanner", "ad_banner", "advertisement",
    "advert", "ad-slot", "adSlot", "ad-unit", "adzone", "sponsoredAds",
    "textads", "adsbygoogle", "pub_300x250", "banner_ad", "div-gpt-ad-1234567",
    "AdSense", "google-ads", "ad-container", "content ads sidebar",
  ];
  for (const name of bait) {
    assert.equal(shim.nameLooksLikeBait(name), true, `${name} must read as an ad slot`);
  }
});

// ===========================================================================
// Which elements get lied about
// ===========================================================================

test("an empty ad-named box is bait; the same box with text in it is not", () => {
  const { sandbox, shim } = makeSandbox();
  assert.equal(shim.isBait(el(sandbox, { cls: "ad-banner" })), true);
  // A real component that happens to tokenise as ad-something. Sites do have
  // these — an "advertise with us" panel, an ad-management widget — and telling
  // them they are 250px tall is how this feature breaks a layout.
  assert.equal(
    shim.isBait(el(sandbox, { cls: "ad-banner", text: "Advertise with us" })),
    false
  );
});

test("the id, the class and the name attribute are all read", () => {
  const { sandbox, shim } = makeSandbox();
  assert.equal(shim.isBait(el(sandbox, { id: "adsbox" })), true);
  assert.equal(shim.isBait(el(sandbox, { cls: "foo adsbox bar" })), true);
  assert.equal(shim.isBait(el(sandbox, { name: "ad_slot" })), true);
  assert.equal(shim.isBait(el(sandbox, { id: "content", cls: "wrapper" })), false);
});

test("className is never read directly, so an SVG element cannot poison the test", () => {
  // On an SVG element className is an SVGAnimatedString and String()-ing it
  // gives "[object SVGAnimatedString]" — which contains no ad token, so the bug
  // would be silent in the safe direction here but wrong the moment the token
  // list grows. getAttribute("class") is the only correct read.
  const { sandbox, shim } = makeSandbox();
  const svg = el(sandbox, { cls: "ad-banner" });
  Object.defineProperty(svg, "className", {
    value: { baseVal: "ad-banner", animVal: "ad-banner" },
  });
  assert.equal(shim.isBait(svg), true);
});

// ===========================================================================
// The lie itself
// ===========================================================================

test("a bait box reports a healthy 300x250, a normal box reports the truth", () => {
  const { sandbox, shim } = makeSandbox();
  const bait = el(sandbox, { cls: "adsbox" });
  const real = el(sandbox, { cls: "article-body", text: "words" });
  real._h = 42;

  assert.equal(bait.offsetHeight, 250);
  assert.equal(bait.offsetWidth, 300);
  assert.equal(bait.clientHeight, 250);
  assert.equal(real.offsetHeight, 42, "an ordinary element must still measure itself");
  assert.ok(shim.state().lies > 0);
});

test("offsetParent stops being null for a bait box", () => {
  // display:none makes offsetParent null whatever the height says, so a
  // detector reading it gets its answer from a different property.
  const { sandbox, shim } = makeSandbox();
  const bait = el(sandbox, { cls: "ad" });
  const parent = el(sandbox, { cls: "sidebar", text: "x" });
  bait.parentElement = parent;
  assert.equal(bait.offsetParent, parent);

  const real = el(sandbox, { cls: "menu", text: "x" });
  assert.equal(real.offsetParent, null, "an ordinary hidden element is still hidden");
  void shim;
});

test("getBoundingClientRect keeps the real position and invents only the size", () => {
  const { sandbox } = makeSandbox();
  const bait = el(sandbox, { cls: "ad-slot" });
  const rect = bait.getBoundingClientRect();
  assert.equal(rect.width, 300);
  assert.equal(rect.height, 250);
  assert.equal(rect.x, 5, "the position is not ours to invent");
  assert.equal(rect.y, 7);
  assert.equal(rect.right, 305);
  assert.equal(rect.bottom, 257);
});

test("getClientRects stops coming back empty for a bait box", () => {
  // The spelling a rect-based check falls back to. A display:none element
  // returns an empty list however healthy its getBoundingClientRect looks, so
  // answering the other two and not this one leaves the question open.
  const { sandbox } = makeSandbox();
  const bait = el(sandbox, { cls: "ad-banner" });
  const rects = bait.getClientRects();
  assert.equal(rects.length, 1);
  assert.equal(rects[0].height, 250);
  assert.equal(rects.item(0).width, 300);
  assert.equal(rects.item(5), null);

  const real = el(sandbox, { cls: "menu", text: "x" });
  assert.equal(real.getClientRects().length, 0, "an ordinary hidden element is still hidden");
});

test("clientHeight is patched on Element, where the real DOM keeps it", () => {
  // Regression. offsetHeight is on HTMLElement.prototype and clientHeight is on
  // Element.prototype; patching both in one place fails SILENTLY — the missing
  // patch simply never installs and that property keeps telling the truth.
  const { sandbox } = makeSandbox();
  assert.ok(
    Object.getOwnPropertyDescriptor(sandbox.Element.prototype, "clientHeight").get,
    "the fake must keep clientHeight where the browser does, or this proves nothing"
  );
  const bait = el(sandbox, { cls: "adsbox" });
  assert.equal(bait.clientHeight, 250);
  assert.equal(bait.clientWidth, 300);
});

test("getComputedStyle reports visible for bait and passes everything else through", () => {
  const { sandbox } = makeSandbox();
  const bait = el(sandbox, { cls: "adsbox" });
  const style = sandbox.window.getComputedStyle(bait);

  assert.equal(style.display, "block");
  assert.equal(style.visibility, "visible");
  assert.equal(style.opacity, "1");
  assert.equal(style.height, "250px");
  // Both spellings of the same read have to agree, or a detector using the
  // other one gets the truth.
  assert.equal(style.getPropertyValue("display"), "block");
  // A property we never faked must still come back real.
  assert.equal(style.color, "rgb(1, 2, 3)");
  assert.equal(style.getPropertyValue("color"), "rgb(1, 2, 3)");

  const real = el(sandbox, { cls: "footer", text: "x" });
  real._display = "flex";
  assert.equal(sandbox.window.getComputedStyle(real).display, "flex");
});

test("a pseudo-element query is never faked", () => {
  // getComputedStyle(el, "::before") asks about generated content, not about
  // whether the element rendered. Faking it would be answering a different
  // question and could break a site reading its own ::before.
  const { sandbox } = makeSandbox();
  const bait = el(sandbox, { cls: "adsbox" });
  assert.equal(sandbox.window.getComputedStyle(bait, "::before").display, "none");
});

test("stopLying puts every patched accessor back", () => {
  // The patches sit on prototypes the whole page uses, so they are removed once
  // the probe window closes. If a restore is missed, every layout read on the
  // page keeps paying for a feature that has finished its work.
  const { sandbox, shim } = makeSandbox();
  const bait = el(sandbox, { cls: "adsbox" });
  assert.equal(bait.offsetHeight, 250);
  assert.ok(shim.state().patched > 0);

  shim.stopLying();

  assert.equal(shim.state().patched, 0, "nothing may be left patched");
  assert.equal(bait.offsetHeight, 0, "the real getter is back");
  assert.equal(sandbox.window.getComputedStyle(bait).display, "none");
  assert.equal(bait.getBoundingClientRect().width, 0);
  assert.equal(bait.getClientRects().length, 0);
  assert.equal(bait.clientHeight, 0);
});

// ===========================================================================
// The globals
// ===========================================================================

test("the clean flags are defined, and cannot be written back", () => {
  const { sandbox } = makeSandbox();
  assert.equal(sandbox.window.canRunAds, true);
  assert.equal(sandbox.window.canShowAds, true);
  assert.equal(sandbox.window.isAdBlockActive, false);
  assert.equal(sandbox.window.google_ad_status, 1);

  // A detector that sets the flag itself and reads it back later must not be
  // able to. This is the difference between an answer and a suggestion.
  const desc = Object.getOwnPropertyDescriptor(sandbox.window, "canRunAds");
  assert.equal(desc.writable, false);
  assert.equal(desc.configurable, false);
  assert.equal(desc.enumerable, true, "the real globals are enumerable; ours must look the same");
});

test("adsbygoogle stays a usable array and stays writable", () => {
  // Page code does (adsbygoogle = window.adsbygoogle || []).push({...}), and the
  // real AdSense script REPLACES the object when it is not blocked — on an
  // allowlisted site, or a host EasyList carves out. Pinning it would break both.
  const { sandbox } = makeSandbox();
  const q = sandbox.window.adsbygoogle;
  assert.ok(Array.isArray(q));
  assert.equal(q.loaded, true);
  q.push({ params: 1 });
  assert.equal(q.length, 1);

  sandbox.window.adsbygoogle = [];
  assert.equal(sandbox.window.adsbygoogle.length, 0, "the real script must be able to take over");
});

// ===========================================================================
// The detector library stub
// ===========================================================================

test("the detector reports clean: onNotDetected runs, onDetected never does", () => {
  const { sandbox, timers } = makeSandbox();
  const fab = sandbox.window.fuckAdBlock;
  assert.ok(fab, "the instance the library normally assigns must already exist");

  let wall = 0;
  let content = 0;
  const returned = fab.onDetected(() => wall++).onNotDetected(() => content++);
  assert.equal(returned, fab, "the API is chainable and sites rely on it");
  assert.equal(fab.check(), true);

  // Asynchronous, like the real library: nothing has run yet.
  assert.equal(content, 0);
  for (const t of timers) t.fn();
  assert.equal(content, 1, "the site must be told there is no blocker");
  assert.equal(wall, 0, "the wall callback must never be reached");
});

test("on(detected, fn) is the other spelling and behaves the same way", () => {
  const { sandbox, timers } = makeSandbox();
  const bab = sandbox.window.blockAdBlock;
  let wall = 0;
  let content = 0;
  bab.on(true, () => wall++);
  bab.on(false, () => content++);
  for (const t of timers) t.fn();
  assert.equal(content, 1);
  assert.equal(wall, 0);
});

test("a callback that throws does not take the page down with it", () => {
  const { sandbox, timers } = makeSandbox();
  sandbox.window.fuckAdBlock.onNotDetected(() => {
    throw new Error("the site's own bug");
  });
  for (const t of timers) t.fn(); // must not throw
});

test("the library cannot install itself over the stub", () => {
  // The real FuckAdBlock ends with window.FuckAdBlock = FuckAdBlock. Refusing
  // that assignment is what keeps the stub in place — and in strict mode it
  // throws, which takes the rest of the library's script with it. Both outcomes
  // are wanted.
  const { sandbox } = makeSandbox();
  const stub = sandbox.window.FuckAdBlock;
  assert.equal(typeof stub, "function");
  // Matched on the message, not the constructor: the error is thrown inside the
  // vm realm, so it is that realm's TypeError and not this one's.
  assert.throws(() => {
    vm.runInContext(`"use strict"; window.FuckAdBlock = function Real() {};`, sandbox);
  }, /read only property/);
  assert.equal(sandbox.window.FuckAdBlock, stub);
});

test("setOption takes both call shapes without throwing", () => {
  const { sandbox } = makeSandbox();
  const fab = sandbox.window.fuckAdBlock;
  fab.setOption("checkOnLoad", false);
  fab.setOption({ resetOnEnd: true, loopCheckTime: 50 });
  assert.equal(fab.options.checkOnLoad, false);
  assert.equal(fab.options.resetOnEnd, true);
});

// ===========================================================================
// The footprint
// ===========================================================================

test("the shim leaves nothing enumerable on window", () => {
  // A feature whose job is not being noticed must not be the easiest thing on
  // the page to notice. Object.keys(window) is the two-line detection script.
  const { sandbox } = makeSandbox();
  // Only Sieve's own name is checked. The clean flags (canRunAds,
  // isAdBlockActive, blockAdBlock and the rest) are enumerable ON PURPOSE — they
  // are impersonating globals that are enumerable in the real thing, and hiding
  // them from Object.keys would itself be the tell.
  const keys = Object.keys(sandbox.window);
  const leaked = keys.filter((k) => /slotshim|sieve/i.test(k));
  assert.deepEqual(leaked, [], `these name the extension: ${leaked}`);
  // But it IS there for the tests and the console.
  assert.ok(sandbox.window.__slotShim);
});

test("a second injection into the same frame does nothing", () => {
  // allFrames plus a re-registration after an extension update can run this
  // twice in one document. The second run must not re-patch already-patched
  // accessors, which would leave a restore chain that cannot fully unwind.
  const { sandbox, shim } = makeSandbox();
  const before = shim.state().patched;
  vm.runInContext(SOURCE, sandbox);
  assert.equal(sandbox.window.__slotShim, shim, "the first shim must survive");
  assert.equal(shim.state().patched, before);
});

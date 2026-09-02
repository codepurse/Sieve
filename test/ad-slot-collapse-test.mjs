// test/ad-slot-collapse-test.mjs
// Sieve — tests for content/ad-slot-collapse.js.
//
//   node --test test/
//
// This file hides parts of pages, on every site, with no filter list telling it
// what is safe. So what is pinned here is every one of the five hurdles a box
// has to clear, each taken away in turn to prove it was load-bearing:
//
//   1. it must be a BOX, not a page landmark,
//   2. named after advertising, by WHOLE TOKEN — the substring trap ("shadow",
//      "header", "gradient", "download") is what makes a naive version of this
//      hide arbitrary furniture,
//   3. genuinely EMPTY — no text, no loaded image, no sized media,
//   4. actually taking up space,
//   5. small enough to be a slot rather than a layout container.
//
// And the timing, which is the real design: it must not collapse anything
// before content/anti-adblock.js has stopped lying about ad-shaped boxes, or
// the two features cancel out and the page hands a detector its answer.
//
// The real file runs in a vm sandbox against hand-built nodes, like the other
// content-script tests here.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/ad-slot-collapse.js", import.meta.url), "utf8");

function makeSandbox() {
  const timers = [];
  const sent = [];
  const sandbox = {
    console: { debug() {}, log() {}, warn() {}, error() {} },
    Object, Array, Set, Map, Math, Number, String, RegExp, JSON, Error,
    setTimeout: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    chrome: {
      runtime: {
        sendMessage: (m) => {
          sent.push(m);
          return { catch() {} };
        },
      },
    },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; }
      observe() {}
      takeRecords() { return []; }
    },
  };
  sandbox.window = sandbox;
  sandbox.innerWidth = 1400;
  sandbox.innerHeight = 900;
  sandbox.addEventListener = () => {};
  sandbox.getComputedStyle = (n) => (n && n._cs) || { display: "block", visibility: "visible" };
  sandbox.document = {
    documentElement: {},
    body: {},
    addEventListener() {},
    querySelectorAll: () => sandbox._candidates || [],
    getElementsByTagName: () => sandbox._candidates || [],
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return { sandbox, api: sandbox.window.__sieveAdSlotCollapse, timers, sent };
}

// A fake element. `w`/`h` are the rendered box; `text`, `imgs` and `media` are
// what is inside it; `kids` is the descendant count.
function el({
  tag = "DIV", id = "", cls = "", text = "", w = 300, h = 250,
  imgs = [], media = [], kids = 0, cs = null, scripts = [],
} = {}) {
  const attrs = { class: cls };
  const applied = {};
  const descendants = new Array(kids).fill(0).map(() => ({}));
  return {
    nodeType: 1,
    tagName: tag,
    id,
    textContent: text,
    applied,
    offsetWidth: w,
    offsetHeight: h,
    _cs: cs || { display: "block", visibility: "visible" },
    style: { setProperty(p, v, pr) { applied[p] = { value: v, priority: pr }; } },
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    setAttribute(n, v) { attrs[n] = v; },
    hasAttribute: (n) => n in attrs,
    getBoundingClientRect: () => ({ width: w, height: h, top: 0, left: 0, x: 0, y: 0 }),
    querySelectorAll: (sel) => {
      if (sel === "*") return descendants;
      if (sel === "img") return imgs;
      if (/script/.test(sel)) return scripts;
      return media;
    },
  };
}
const img = (w, h) => ({ naturalWidth: w, naturalHeight: h });
const frame = (w, h) => ({ offsetWidth: w, offsetHeight: h });

// ===========================================================================
// Hurdle 2 — the name
// ===========================================================================

test("the words that merely CONTAIN ad are not ad slots", () => {
  const { api } = makeSandbox();
  for (const n of [
    "shadow", "box-shadow", "header", "page-header", "gradient", "padding",
    "download", "upload", "loading", "read", "read-more", "thread", "breadcrumb",
    "adjacent", "adapter", "admin", "address", "advice", "spread", "roadmap",
    "heading", "add-to-cart", "adm-panel", "adv-search",
  ]) {
    assert.equal(api.nameIsSlot(n), false, n);
  }
});

test("banner and promo alone are NOT enough", () => {
  // A hero banner and a site's own promo strip are not adverts, and both names
  // are far too common to hide on sight.
  const { api } = makeSandbox();
  assert.equal(api.nameIsSlot("banner"), false);
  assert.equal(api.nameIsSlot("hero-banner"), false);
  assert.equal(api.nameIsSlot("promo"), false);
  assert.equal(api.nameIsSlot("promo-strip"), false);
  // …but the compound forms are.
  assert.equal(api.nameIsSlot("adbanner"), true);
  assert.equal(api.nameIsSlot("ad-banner"), true);
});

test("the slot names measured on real pages are recognised", () => {
  // Every one of these was captured from a live indiewire.com gallery page with
  // Sieve's list applied — they are the actual 29,042px of gaps.
  const { api } = makeSandbox();
  for (const n of [
    "c-gallery-vertical__advert",
    "_adUnit_bmiei_1",
    "pmc-adm-boomerang-pub-div ad-text",
    "div-gpt-indiewire-gallery-rail-middle-uid45",
    "adsbygoogle",
    "taboola-below-article",
    "outbrain_widget_0",
  ]) {
    assert.equal(api.nameIsSlot(n), true, n);
  }
});

// ===========================================================================
// Hurdles 1, 3, 4, 5
// ===========================================================================

test("an empty, ad-named, visible box of slot size is collapsed", () => {
  const { api } = makeSandbox();
  assert.equal(api.isEmptySlot(el({ cls: "c-gallery-vertical__advert", w: 610, h: 292 })), true);
});

test("a page landmark is never touched, however it is named", () => {
  // Hurdle 1. A site that put an ad-ish class on its <main> should not lose it.
  const { api } = makeSandbox();
  for (const tag of ["MAIN", "ARTICLE", "BODY", "HEADER", "FOOTER", "NAV", "HTML"]) {
    assert.equal(api.isEmptySlot(el({ tag, cls: "ad-container" })), false, tag);
  }
});

test("a box with anything in it is left alone", () => {
  // Hurdle 3, the one that keeps this from removing a loaded ad's neighbour —
  // or a real component that happens to be named after advertising.
  const { api } = makeSandbox();
  assert.equal(api.isEmptySlot(el({ cls: "ad-slot", text: "Advertise with us" })), false);
  assert.equal(api.isEmptySlot(el({ cls: "ad-slot", imgs: [img(300, 250)] })), false);
  assert.equal(api.isEmptySlot(el({ cls: "ad-slot", media: [frame(300, 250)] })), false);
  // A tracking pixel and a broken image are not content.
  assert.equal(api.isEmptySlot(el({ cls: "ad-slot", imgs: [img(1, 1)] })), true);
  assert.equal(api.isEmptySlot(el({ cls: "ad-slot", imgs: [img(0, 0)] })), true);
  // A zero-sized leftover iframe is not content either.
  assert.equal(api.isEmptySlot(el({ cls: "ad-slot", media: [frame(0, 0)] })), true);
});

test("a slot still holding its inline ad script counts as empty", () => {
  // The regression a real browser found and this harness had missed. A blocked
  // slot usually still contains the <script> that was going to fill it, and
  // textContent counts script source as text — so 94 slots on indiewire.com
  // each "held" ~400 characters of blogherads.defineSlot(…) and NOTHING
  // collapsed. Their innerText was "" the whole time.
  const { api } = makeSandbox();
  const src = "blogherads.adq.push(function () { blogherads.defineSlot('medrec', 'gpt-uid1').addSize([[300,250]]); });";
  const slot = el({
    cls: "c-gallery-vertical__advert",
    w: 610,
    h: 292,
    text: src,
    scripts: [{ textContent: src }],
  });
  assert.equal(api.isEmptySlot(slot), true);

  // …and real words are still real words, script or no script.
  const withCopy = el({
    cls: "c-gallery-vertical__advert",
    w: 610,
    h: 292,
    text: src + "Advertisement from a sponsor you might like",
    scripts: [{ textContent: src }],
  });
  assert.equal(api.isEmptySlot(withCopy), false);
});

test("a box taking up no space is not collapsed", () => {
  // Hurdle 4. Nothing is gained by hiding what is already invisible, and doing
  // it would put a marker on half the DOM.
  const { api } = makeSandbox();
  assert.equal(api.isEmptySlot(el({ cls: "ad-slot", w: 2, h: 2 })), false);
  assert.equal(
    api.isEmptySlot(el({ cls: "ad-slot", cs: { display: "none", visibility: "visible" } })),
    false
  );
  assert.equal(
    api.isEmptySlot(el({ cls: "ad-slot", cs: { display: "block", visibility: "hidden" } })),
    false
  );
});

test("a layout container is not a slot, by area or by contents", () => {
  // Hurdle 5, the guard against collapsing half a page. The tallest real slot
  // measured was 301x1074 — 26% of a 1400x900 viewport — so a genuine
  // skyscraper still passes.
  const { api } = makeSandbox();
  assert.equal(api.isEmptySlot(el({ cls: "ad-wrapper", w: 301, h: 1074 })), true, "a real skyscraper passes");
  assert.equal(api.isEmptySlot(el({ cls: "ad-wrapper", w: 1400, h: 800 })), false, "most of the viewport");
  assert.equal(api.isEmptySlot(el({ cls: "ad-wrapper", kids: 200 })), false, "too much DOM to be a slot");
});

// ===========================================================================
// The timing — the actual design
// ===========================================================================

test("nothing is collapsed before the anti-adblock probe window has closed", () => {
  // The most important test here. Collapsing early hands a detector exactly the
  // answer content/anti-adblock.js exists to withhold, and the two features
  // would cancel each other out.
  const { sandbox, api, sent } = makeSandbox();
  sandbox._candidates = [el({ cls: "ad-slot", w: 610, h: 292 })];

  api.sweep(); // not armed yet
  assert.equal(api.state().collapsed, 0);
  assert.equal(sandbox._candidates[0].applied.display, undefined);
  assert.deepEqual(sent, []);

  api.arm();
  api.sweep();
  assert.equal(api.state().collapsed, 1);
  assert.equal(sandbox._candidates[0].applied.display.value, "none");
});

test("the delay is longer than the probe window it has to outlast", () => {
  // content/anti-adblock.js stops lying after PROBE_WINDOW_MS = 10000. If this
  // ever drops below that, the two features fight and this test is the only
  // thing that would say so.
  const { api } = makeSandbox();
  const probeWindow = Number(
    fs
      .readFileSync(new URL("../content/anti-adblock.js", import.meta.url), "utf8")
      .match(/const PROBE_WINDOW_MS = (\d+)/)[1]
  );
  assert.ok(
    api.COLLAPSE_DELAY_MS > probeWindow,
    `COLLAPSE_DELAY_MS (${api.COLLAPSE_DELAY_MS}) must exceed PROBE_WINDOW_MS (${probeWindow})`
  );
});

// ===========================================================================
// Collapsing, counting, and not repeating
// ===========================================================================

test("collapsing is reversible and marked, never a deletion", () => {
  const { api } = makeSandbox();
  const box = el({ cls: "ad-slot" });
  assert.equal(api.collapse(box), true);
  assert.deepEqual(box.applied.display, { value: "none", priority: "important" });
  assert.equal(box.getAttribute("data-sieve-collapsed"), "empty-ad-slot");
});

test("a box already collapsed is not collapsed or counted again", () => {
  // Our own inline write is a mutation, which the observer sees and re-queues.
  // Same feedback loop as the wall sweep, same guard.
  const { sandbox, api, sent } = makeSandbox();
  sandbox._candidates = [el({ cls: "ad-slot", w: 610, h: 292 })];
  api.arm();
  api.sweep();
  api.sweep();
  api.sweep();
  assert.equal(api.state().collapsed, 1);
  assert.equal(sent.length, 1);
});

test("the count is reported per sweep, and carries nothing else", () => {
  const { sandbox, api, sent } = makeSandbox();
  sandbox._candidates = [
    el({ cls: "ad-slot", w: 300, h: 250 }),
    el({ cls: "advert", w: 610, h: 292 }),
    el({ cls: "article-body", text: "words" }),
  ];
  api.arm();
  api.sweep();
  assert.equal(sent.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(sent[0])), {
    type: "SIEVE_RECORD_BLOCK",
    category: "adSlots",
    count: 2,
  });
});

test("nothing is reported when there is nothing to collapse", () => {
  const { sandbox, api, sent } = makeSandbox();
  sandbox._candidates = [
    el({ cls: "article-body", text: "the article" }),
    el({ cls: "hero-banner", w: 1200, h: 400 }),
    el({ cls: "ad-slot", imgs: [img(300, 250)] }),
  ];
  api.arm();
  api.sweep();
  assert.deepEqual(sent, []);
});

test("the whole measured page collapses to nothing left over", () => {
  // End to end against the real shape: 96 slots, the four biggest by name and
  // size, plus the article that must survive.
  const { sandbox, api } = makeSandbox();
  const slots = [
    el({ cls: "_adUnit_bmiei_1", w: 301, h: 1074 }),
    el({ cls: "pmc-adm-boomerang-pub-div ad-text", w: 301, h: 1074 }),
    el({ id: "div-gpt-indiewire-gallery-rail-middle-uid45", cls: " adw-300 adh-600", w: 301, h: 1050 }),
    ...Array.from({ length: 9 }, () => el({ cls: "c-gallery-vertical__advert", w: 610, h: 292 })),
  ];
  const article = el({ cls: "c-gallery-vertical__slide", text: "The film everyone is waiting for", w: 610, h: 800 });
  sandbox._candidates = [...slots, article];

  api.arm();
  api.sweep();
  assert.equal(api.state().collapsed, 12);
  for (const s of slots) assert.equal(s.applied.display.value, "none");
  assert.equal(article.applied.display, undefined, "the gallery slide must survive");
});

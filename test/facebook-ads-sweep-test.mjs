// test/facebook-ads-sweep-test.mjs
// Sieve — the SWEEP half of content/facebook-ads-dom.js: which element gets
// collapsed, how often anything is judged, and whether a decision ever changes
// its mind.
//
//   node --test test/
//
// Its sibling, test/facebook-ads-dom-test.mjs, pins the label READER — the
// function that reconstructs a scrambled "Sponsored" badge. This file pins
// everything downstream of it, and it exists because of two shipped bugs that
// the reader tests could never have caught:
//
//   1. THE OSCILLATION. There were two copies of "is this an ad?" — one in the
//      sweep and one in the second opinion asked before releasing a collapse —
//      and they had drifted apart. The second was missing the accessible-name
//      detector. So an ad collapsed because a link said aria-label="Sponsored"
//      was released by a function that could not see accessible names, then
//      collapsed again, then released again: a class change, a height change
//      from 0 to auto and back, and a forced layout every turn, with Facebook's
//      own feed virtualiser re-measuring and re-rendering into the gap. From
//      the user's chair that is a feed that will not stop refreshing.
//
//      Everything under "the verdict never oscillates" is the regression guard.
//      The shape of the guard matters: it is not "aria-label is handled", it is
//      "for EVERY detector, collapsing and then re-judging is stable" — so the
//      next detector added is covered before it is written.
//
//   2. THE INVISIBLE SIDEBAR. unitFor() knew #right_rail_container but not
//      div[role="complementary"], which is the right-hand column a modern
//      session actually renders. The ad's own "Why am I seeing this ad?" link
//      was found on every single sweep, handed to unitFor(), and thrown away,
//      because the walk had no idea it had arrived anywhere and climbed past the
//      column to <body>. Nothing collapsed, forever, silently.
//
// WHY A HAND-BUILT DOM. The same reason as the sibling file: the interesting
// input is structure, and a fake tree that answers matches/querySelectorAll/
// childElementCount is a more honest test of a walk than a DOM library guessing
// at layout. The selector engine below is small but real — descendant and child
// combinators, attribute operators, ids — because the file under test leans on
// all of them and a matcher that quietly said "no" would turn every assertion
// green for the wrong reason. That is what `the test harness itself` checks.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/facebook-ads-dom.js", import.meta.url), "utf8");
const COLLAPSED = "sieve-fb-ad-collapsed";

// ===========================================================================
// A small DOM
// ===========================================================================

class El {
  constructor(tag, attrs = {}, kids = []) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.childNodes = [];
    this.parentElement = null;
    this.isConnected = true;
    this._classes = new Set();
    for (const k of kids) this.append(k);
  }

  append(node) {
    node.parentElement = this;
    this.childNodes.push(node);
    return this;
  }

  // Replace everything inside — Facebook virtualising a story away, or filling
  // a recycled wrapper back in.
  replaceChildren(...kids) {
    for (const c of this.childNodes) if (c.nodeType === 1) c.parentElement = null;
    this.childNodes = [];
    for (const k of kids) this.append(k);
    return this;
  }

  get classList() {
    const s = this._classes;
    return {
      add: (c) => s.add(c),
      remove: (c) => s.delete(c),
      contains: (c) => s.has(c),
    };
  }

  get collapsed() {
    return this._classes.has(COLLAPSED);
  }

  getAttribute(name) {
    return name in this.attrs ? this.attrs[name] : null;
  }

  get children() {
    return this.childNodes.filter((c) => c.nodeType === 1);
  }

  get childElementCount() {
    return this.children.length;
  }

  get textContent() {
    let out = "";
    for (const c of this.childNodes) out += c.nodeType === 3 ? c.data : c.textContent;
    return out;
  }

  // innerText, for our purposes, is textContent — the fake tree has no layout,
  // and the reader tests next door cover the case where the two differ.
  get innerText() {
    return this.textContent;
  }

  descendants(out = []) {
    for (const c of this.childNodes) {
      if (c.nodeType !== 1) continue;
      out.push(c);
      c.descendants(out);
    }
    return out;
  }

  matches(selectorList) {
    return splitList(selectorList).some((sel) => matchComplex(this, sel));
  }

  querySelectorAll(selectorList) {
    const sels = splitList(selectorList);
    return this.descendants().filter((e) => sels.some((s) => matchComplex(e, s)));
  }

  querySelector(selectorList) {
    return this.querySelectorAll(selectorList)[0] || null;
  }
}

const text = (data) => ({ nodeType: 3, data });

// Split on commas that are not inside brackets or quotes.
function splitList(s) {
  const out = [];
  let depth = 0;
  let quote = "";
  let cur = "";
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "[") depth++;
    else if (ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// `a b > c` → [{combinator, compound}, ...], rightmost first.
function parseComplex(sel) {
  const parts = sel.trim().split(/\s*(>)\s*|\s+/).filter(Boolean);
  const steps = [];
  let combinator = null;
  for (const p of parts) {
    if (p === ">") {
      combinator = "child";
      continue;
    }
    steps.push({ compound: p, combinator: combinator || (steps.length ? "descendant" : null) });
    combinator = null;
  }
  // The parser above attaches a combinator to the step that FOLLOWS it, which is
  // what walking rightwards needs.
  return steps;
}

function matchComplex(el, sel) {
  const steps = parseComplex(sel);
  if (!steps.length) return false;
  const last = steps[steps.length - 1];
  if (!matchCompound(el, last.compound)) return false;

  let node = el;
  for (let i = steps.length - 2; i >= 0; i--) {
    const want = steps[i];
    // The combinator between steps[i] and steps[i+1] is stored on steps[i+1].
    const rel = steps[i + 1].combinator;
    if (rel === "child") {
      node = node.parentElement;
      if (!node || !matchCompound(node, want.compound)) return false;
    } else {
      node = node.parentElement;
      while (node && !matchCompound(node, want.compound)) node = node.parentElement;
      if (!node) return false;
    }
  }
  return true;
}

const COMPOUND = /^([a-zA-Z0-9]+)?(#[-\w]+)?((?:\[[^\]]*\])*)$/;
const ATTR = /\[([-\w]+)(?:([~^*$|]?=)"?((?:[^"\]\\]|\\.)*)"?)?\]/g;

function matchCompound(el, compound) {
  const m = COMPOUND.exec(compound);
  if (!m) throw new Error(`test selector engine cannot parse: ${compound}`);
  if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
  if (m[2] && el.getAttribute("id") !== m[2].slice(1)) return false;

  ATTR.lastIndex = 0;
  let a;
  while ((a = ATTR.exec(m[3] || ""))) {
    const value = a[1] === "id" ? el.getAttribute("id") : el.getAttribute(a[1]);
    if (value === null) return false;
    if (!a[2]) continue;
    const want = a[3];
    if (a[2] === "=" && value !== want) return false;
    if (a[2] === "^=" && !value.startsWith(want)) return false;
    if (a[2] === "*=" && !value.includes(want)) return false;
    if (a[2] === "$=" && !value.endsWith(want)) return false;
  }
  return true;
}

// ===========================================================================
// Loading the real file against that DOM
// ===========================================================================

const VISIBLE = { display: "inline", visibility: "visible", opacity: "1", fontSize: "12px" };

function load(body, href = "https://www.facebook.com/") {
  const url = new URL(href);

  // The real scheduling path is worth driving, so the stubs below capture
  // rather than discard: `notify` is the file's own MutationObserver callback
  // and `flush` runs whatever it queued. Between them a test can push a burst of
  // mutations through onMutations() and addPending() exactly as the browser
  // would, without a browser.
  const timers = [];
  let observerCallback = null;

  const sandbox = {
    console: { debug() {}, log() {}, error() {} },
    Object,
    Array,
    Number,
    String,
    RegExp,
    Math,
    Date,
    Set,
    WeakMap,
    setTimeout: (fn) => (timers.push(fn), timers.length),
    setInterval: () => 0,
    chrome: { runtime: { sendMessage: () => ({ catch() {} }) } },
    MutationObserver: class {
      constructor(fn) {
        observerCallback = fn;
      }
      observe() {}
    },
  };
  sandbox.window = sandbox;
  sandbox.window.addEventListener = () => {};
  sandbox.window.getComputedStyle = () => VISIBLE;
  sandbox.location = { href, pathname: url.pathname, search: url.search };
  sandbox.document = {
    documentElement: { nodeType: 1 },
    body,
    hidden: false,
    readyState: "complete",
    addEventListener: () => {},
    getElementsByClassName: (c) => body.descendants().filter((e) => e._classes.has(c)),
    querySelectorAll: (s) => body.querySelectorAll(s),
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);

  const api = sandbox.window.__sieveFacebookAdDom;
  api.notify = (...added) => observerCallback([{ addedNodes: added }]);
  // arm() queues a timeout that queues the idle callback, so draining takes more
  // than one pass. Bounded so a scheduling bug that re-arms forever fails the
  // test rather than hanging it.
  api.flush = () => {
    for (let i = 0; i < 8 && timers.length; i++) {
      const queued = timers.splice(0);
      for (const fn of queued) fn();
    }
    assert.equal(timers.length, 0, "the scheduler kept re-arming itself with nothing to do");
  };
  return api;
}

// ===========================================================================
// Page fragments — the shapes Facebook actually renders
// ===========================================================================

const FILLER = "A real post with enough words in it to look like somebody wrote it.";

// A home-feed story: div[aria-posinset] wrapping a div[role="article"].
function story(header, bodyText = FILLER) {
  const article = new El("div", { role: "article" }, [
    new El("h3", {}, [new El("span", {}, header)]),
    new El("div", {}, [text(bodyText)]),
  ]);
  return { unit: new El("div", { "aria-posinset": "1" }, [article]), article };
}

function feedPage(...units) {
  const feed = new El("div", { role: "feed" }, units);
  return new El("body", {}, [new El("div", { role: "main" }, [feed])]);
}

// The four detectors, as the header content that triggers each one.
const DETECTORS = {
  "attribute signal": () => [new El("a", { href: "/ads/about/?entry=1" }, [text("Why?")])],
  "accessible name": () => [new El("a", { "aria-label": "Sponsored", href: "/x" }, [text("Acme")])],
  "visible badge": () => [new El("span", { "aria-labelledby": "z" }, [text("Sponsored")])],
  "header token": () => [
    new El("a", { href: "/permalink?__cft__[0]=" + "k".repeat(300) }, [text("Acme")]),
  ],
};

// A right-hand-column ad card, in the shape a modern session renders: no
// aria-posinset, no role="article", nothing this file recognises as a wrapper.
function railAd(name = "Acme") {
  return new El("div", { "data-visualcompletion": "ignore-dynamic" }, [
    new El("div", {}, [
      new El("a", { href: "/ads/about/?entry_product=ad_preferences" }, [text("Why?")]),
      new El("div", {}, [text(`${name} — buy our thing, it is genuinely great.`)]),
    ]),
  ]);
}

function railFurniture() {
  return new El("div", {}, [
    new El("h3", {}, [new El("span", {}, [text("Contacts")])]),
    new El("div", {}, [text("Alice Bob Carol Dave Erin Frank Grace Heidi Ivan Judy")]),
  ]);
}

// ===========================================================================
// The harness itself, checked before anything is asserted with it
// ===========================================================================

test("the test harness itself", () => {
  const a = new El("a", { href: "/ads/about/?x=1" });
  const inner = new El("span", {}, [a]);
  const h3 = new El("h3", {}, [inner]);
  const root = new El("div", { id: "right_rail_container", role: "complementary" }, [h3]);

  assert.ok(a.matches('a[href*="/ads/about"]'), "attribute contains");
  assert.ok(root.matches("#right_rail_container"), "id");
  assert.ok(root.matches('[role="complementary"]'), "attribute equals");
  assert.ok(!root.matches('[role="feed"]'), "attribute equals, negative");
  assert.ok(a.matches("h3 span > a"), "descendant then child");
  assert.ok(!a.matches("h3 > a"), "child, negative");
  assert.equal(root.querySelectorAll('a[href*="/ads/about"]').length, 1, "querySelectorAll");
  assert.equal(root.querySelectorAll("h3 span > a").length, 1, "combinators in querySelectorAll");
  assert.equal(root.childElementCount, 1, "childElementCount");
  assert.equal(root.querySelector("div"), null, "querySelector excludes the root itself");
});

// ===========================================================================
// The verdict never oscillates
// ===========================================================================

for (const [name, header] of Object.entries(DETECTORS)) {
  test(`an ad found by its ${name} stays collapsed, and is judged once`, () => {
    // THE REGRESSION GUARD, run once per detector on purpose.
    //
    // The shipped bug was not "aria-label was forgotten" — it was that the
    // detectors existed twice and one copy fell behind. Asserting the property
    // for every detector means the next one added is covered whether or not
    // whoever adds it remembers this file.
    const s = story(header());
    const api = load(feedPage(s.unit));

    api.sweep([]);
    assert.ok(s.unit.collapsed, "the ad should be collapsed on the first sweep");
    assert.equal(api.stats.collapsed, 1);

    // Facebook re-renders the same ad, over and over, with a detail changed —
    // a like count ticking over is enough. The old code keyed its second look on
    // textContent LENGTH, so every one of these re-opened the question.
    for (let i = 0; i < 10; i++) {
      s.article.childNodes[1].childNodes[0].data += "!";
      api.sweep([]);
    }

    assert.ok(s.unit.collapsed, "the ad must still be collapsed");
    assert.equal(api.stats.released, 0, "a released ad is the oscillation coming back");
    assert.equal(api.stats.frozen, 0, "the flip budget should never have to catch anything");
  });
}

test("the second opinion is the same function as the first opinion", () => {
  // Structural, and worth pinning even next to the behavioural tests above: the
  // bug was two implementations of one decision. There is now one, and both
  // names point at it.
  const api = load(feedPage());
  assert.equal(api.isAdUnit, api.adVerdict, "isAdUnit must be adVerdict, not a second copy");
});

test("a settled feed stops costing anything to sweep", () => {
  // Idempotence, measured rather than asserted in the abstract. `verdicts`
  // counts the units actually judged.
  //
  // It is not one per unit and it is not meant to be. A story wrapper can be
  // inserted before its header arrives — Facebook does exactly that — so a CLEAR
  // verdict is re-taken a bounded number of times before it is final. What
  // matters, and what the old code could not manage, is that the number STOPS:
  // an ad verdict is taken once and never revisited, and a clear one is
  // revisited a fixed number of times whatever happens afterwards.
  const N_POSTS = 8;
  const ad = story(DETECTORS["accessible name"]());
  const posts = [ad.unit];
  for (let i = 0; i < N_POSTS; i++) {
    posts.push(story([new El("span", {}, [text("Jo Bloggs")])]).unit);
  }
  const api = load(feedPage(...posts));

  for (let i = 0; i < 5; i++) api.sweep([]);
  const settled = api.stats.verdicts;

  for (let i = 0; i < 40; i++) api.sweep([]);
  assert.equal(api.stats.verdicts, settled, "a settled page must stop being re-judged");

  // The ceiling: one verdict per unit, plus the retries the clear ones are
  // allowed. The ad is judged once — a positive verdict is never re-taken.
  const retries = /MAX_CLEAR_RETRIES = (\d+)/.exec(SOURCE);
  assert.ok(retries, "MAX_CLEAR_RETRIES should be a named constant");
  assert.equal(settled, 1 + N_POSTS * Number(retries[1]), "verdicts should hit exactly the cap");

  assert.equal(api.stats.collapsed, 1);
  assert.equal(api.stats.released, 0);
});

test("one ad carrying several signals is judged once, not once per signal", () => {
  // Discovery is deliberately generous — an ad matches the /ads/about rule, the
  // aria-label rule and the badge rule at the same time. Before, each match
  // walked to the unit and collapsed it separately.
  const s = story([
    new El("a", { href: "/ads/about/?entry=1", "aria-label": "Sponsored" }, [text("Why?")]),
    new El("span", { "aria-labelledby": "z" }, [text("Sponsored")]),
    new El("a", { attributionsrc: "/privacy_sandbox/comet/register/source/?xt=1" }, [text("Go")]),
  ]);
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.equal(api.stats.verdicts, 1, "one unit, one verdict");
  assert.equal(api.stats.collapsed, 1);
});

// ===========================================================================
// Recycling — the one thing that reopens a decided unit
// ===========================================================================

test("a wrapper virtualised away is not grounds for a release", () => {
  // Facebook swaps an off-screen story's subtree for an empty placeholder. That
  // is not recycling and the collapse must survive it — releasing here is the
  // first half of the loop.
  const s = story(DETECTORS["accessible name"]());
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(s.unit.collapsed);

  s.unit.replaceChildren(new El("div", { "data-virtualized": "true" }));
  api.sweep([]);
  api.sweep([]);
  assert.ok(s.unit.collapsed, "a virtualised ad must stay collapsed");
  assert.equal(api.stats.released, 0);
});

test("a wrapper recycled onto a real post is released", () => {
  // The reason a release valve has to exist at all: a permanently hidden real
  // post is the worst thing this file can produce.
  const s = story(DETECTORS["accessible name"]());
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(s.unit.collapsed);

  s.unit.replaceChildren(new El("div", { "data-virtualized": "true" }));
  api.sweep([]);
  s.unit.replaceChildren(
    new El("div", { role: "article" }, [
      new El("h3", {}, [new El("span", {}, [text("Jo Bloggs")])]),
      new El("div", {}, [text(FILLER)]),
    ])
  );
  api.sweep([]);

  assert.ok(!s.unit.collapsed, "a recycled wrapper holding a real post must come back");
  assert.equal(api.stats.released, 1);
  assert.equal(api.stats.recycled, 1);
});

test("a wrapper recycled onto another ad stays collapsed", () => {
  const s = story(DETECTORS["accessible name"]());
  const api = load(feedPage(s.unit));
  api.sweep([]);

  s.unit.replaceChildren(new El("div", { "data-virtualized": "true" }));
  api.sweep([]);
  s.unit.replaceChildren(
    new El("div", { role: "article" }, [
      new El("h3", {}, [new El("span", {}, DETECTORS["attribute signal"]())]),
      new El("div", {}, [text(FILLER)]),
    ])
  );
  api.sweep([]);

  assert.ok(s.unit.collapsed, "a recycled wrapper holding another ad stays collapsed");
  assert.equal(api.stats.released, 0);
});

// ===========================================================================
// The right-hand column
// ===========================================================================

test("a right-hand-column ad is collapsed, and its neighbours are not", () => {
  // The second shipped bug. div[role="complementary"] is the column a modern
  // session renders; unitFor() knew only #right_rail_container, so it walked
  // past the column to <body>, found nothing, and returned null — on every
  // sweep, for every rail ad, in silence.
  const ad = railAd();
  const contacts = railFurniture();
  const section = new El("div", {}, [
    new El("h3", {}, [new El("span", {}, [text("Sponsored")])]),
    ad,
  ]);
  const inner = new El("div", {}, [section, contacts]);
  const rail = new El("div", { role: "complementary" }, [inner]);
  const body = new El("body", {}, [new El("div", { role: "main" }, []), rail]);

  const api = load(body);
  api.sweep([]);

  assert.ok(section.collapsed || ad.collapsed, "the sidebar ad must be collapsed");
  assert.ok(!rail.collapsed, "never the whole column");
  assert.ok(!inner.collapsed, "never the column's contents");
  assert.ok(!contacts.collapsed, "never the neighbouring section");
});

test("several sidebar ads go, by card or by section, and the neighbours stay", () => {
  // A section holding three ads and nothing else may be taken whole — that is
  // holdsOnlyAds(), and it is what removes the "Sponsored" heading along with
  // the cards instead of leaving it floating over a gap.
  //
  // What this test pins is not WHICH of the two it picks, because either is a
  // correct answer and the choice depends on how deeply Facebook nests the
  // section that week. It pins the pair of properties that actually matter: no
  // ad is left visible, and nothing that is not an ad is touched.
  const ads = [railAd("Acme"), railAd("Globex"), railAd("Initech")];
  const section = new El("div", {}, ads);
  const contacts = railFurniture();
  const inner = new El("div", {}, [section, contacts]);
  const rail = new El("div", { role: "complementary" }, [inner]);
  const body = new El("body", {}, [new El("div", { role: "main" }, []), rail]);

  const api = load(body);
  api.sweep([]);

  const hidden = (el) => el.collapsed || (el.parentElement && hidden(el.parentElement));
  for (const ad of ads) assert.ok(hidden(ad), "every sidebar ad must end up hidden");
  assert.ok(!contacts.collapsed, "Contacts must survive");
  assert.ok(!inner.collapsed, "and the column's contents wrapper");
  assert.ok(!rail.collapsed, "and the column");
});

test("a grid of sponsored tiles never collapses as a grid", () => {
  // Marketplace. Each tile registers its own attribution source, so a row of
  // them looks locally like one big ad — and there is no story wrapper anywhere
  // to stop the walk. Collapsing a smaller box than ideal is a cosmetic bug;
  // collapsing the grid is the whole surface gone.
  const tiles = [];
  for (let i = 0; i < 6; i++) {
    tiles.push(
      new El("div", {}, [
        new El("a", { attributionsrc: "/privacy_sandbox/comet/register/source/?xt=" + i }, [
          text("Item " + i),
        ]),
      ])
    );
  }
  const grid = new El("div", {}, tiles);
  const main = new El("div", { role: "main" }, [new El("div", {}, [grid])]);
  const body = new El("body", {}, [main]);

  const api = load(body, "https://www.facebook.com/marketplace/");
  api.sweep([]);

  assert.ok(!grid.collapsed, "the grid must survive");
  assert.ok(!main.collapsed, "and so must the page region");
});

test("a region is never the thing that gets collapsed", () => {
  // The blast-radius guarantee, stated directly. Whatever else goes wrong, one
  // ad signal must not be able to take a whole region of the page with it.
  const signal = new El("a", { href: "/ads/about/?x=1" }, [text("Why?")]);
  const feed = new El("div", { role: "feed" }, [signal]);
  const main = new El("div", { role: "main" }, [feed]);
  const body = new El("body", {}, [main]);
  const api = load(body);
  api.sweep([]);

  assert.ok(!feed.collapsed, "the feed itself is never an ad");
  assert.ok(!main.collapsed, "nor the main region");
});

// ===========================================================================
// The header-token heuristic is scoped
// ===========================================================================

test("the __cft__ heuristic runs on the home feed and search, and nowhere else", () => {
  // It is a magic number over a tracking token — the least principled detector
  // in the file — so it runs only where uBlock Origin's own filters run it. A
  // long token in a Group or a Page header is not evidence of anything, and a
  // false positive there hides a real post with nobody able to say why.
  const build = () => story(DETECTORS["header token"]());

  for (const href of ["https://www.facebook.com/", "https://www.facebook.com/search/top?q=x"]) {
    const s = build();
    const api = load(feedPage(s.unit), href);
    api.sweep([]);
    assert.ok(s.unit.collapsed, `should apply on ${href}`);
  }

  for (const href of [
    "https://www.facebook.com/groups/123456",
    "https://www.facebook.com/marketplace/",
    "https://www.facebook.com/watch/",
  ]) {
    const s = build();
    const api = load(feedPage(s.unit), href);
    api.sweep([]);
    assert.ok(!s.unit.collapsed, `must not apply on ${href}`);
  }
});

// ===========================================================================
// Ordinary posts
// ===========================================================================

test("an ordinary post is left alone, however many times it is swept", () => {
  const posts = [];
  for (let i = 0; i < 12; i++) {
    posts.push(story([new El("span", {}, [text("Jo Bloggs")])], FILLER + " " + i).unit);
  }
  const api = load(feedPage(...posts));
  for (let i = 0; i < 5; i++) api.sweep([]);
  for (const p of posts) assert.ok(!p.collapsed, "no organic post may be collapsed");
  assert.equal(api.stats.collapsed, 0);
});

test("a post that merely mentions sponsorship is not an ad", () => {
  const s = story([new El("span", {}, [text("Jo Bloggs")])], "Thanks to our sponsored partners!");
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(!s.unit.collapsed, "the word in prose is not a badge");
});

// ===========================================================================
// Scheduling — the burst of mutations Facebook actually delivers
// ===========================================================================

test("a burst of mutations coalesces to its roots and does not escalate", () => {
  // THE THIRD SHIPPED BUG, and the quietest of the three.
  //
  // The rule used to be "past sixty pending roots, sweep the whole document
  // instead" — and Facebook inserts far more than sixty element nodes in any
  // 400ms window in which you are scrolling, because one story wrapper arriving
  // brings a couple of hundred descendants with it and the observer reports
  // every one. So the escalation fired on essentially every sweep, and the
  // subtree optimisation the file was built around never ran at all: it was
  // doing the whole-document scan it existed to avoid, several times a second.
  //
  // Descendants of an already-queued root add nothing, because scanning a root
  // scans its descendants. Dropping them is what keeps the queue small enough
  // that the escalation never has to fire.
  const s = story(DETECTORS["attribute signal"]());
  const body = feedPage(s.unit);
  const api = load(body);

  api.flush(); // the initial full pass
  const fullsAfterLoad = api.stats.fullSweeps;

  // One wrapper, and every node inside it, exactly as the observer reports it.
  api.notify(s.unit, ...s.unit.descendants());
  api.flush();

  assert.equal(api.stats.fullSweeps, fullsAfterLoad, "a burst must not escalate to a full sweep");
  assert.ok(s.unit.collapsed, "and the ad in it is still found");
});

test("genuinely distinct roots past the cap do escalate rather than being dropped", () => {
  // The other half of the same decision. Coalescing is only safe because it
  // drops nodes an ancestor already covers; when the roots really are distinct
  // and there are more than the cap, silently forgetting the overflow would let
  // the ads in it through. Saying "sweep everything" is the honest answer.
  const units = [];
  for (let i = 0; i < 200; i++) units.push(story([new El("span", {}, [text("Jo")])]).unit);
  const ad = story(DETECTORS["attribute signal"]());
  units.push(ad.unit);

  const api = load(feedPage(...units));
  api.flush();
  const before = api.stats.fullSweeps;

  api.notify(...units);
  api.flush();

  assert.ok(api.stats.fullSweeps > before, "an overflowing queue must fall back to a full sweep");
  assert.ok(ad.unit.collapsed, "and nothing is lost when it does");
});

test("nodes Facebook has already taken back out are not swept", () => {
  const gone = story(DETECTORS["attribute signal"]());
  gone.unit.isConnected = false;
  const api = load(feedPage());
  api.flush();
  const before = api.stats.verdicts;

  api.notify(gone.unit);
  api.flush();

  assert.equal(api.stats.verdicts, before, "a detached root is not worth scanning");
  assert.ok(!gone.unit.collapsed);
});

// ===========================================================================
// Recycling in the other direction — a wrapper that BECOMES an ad
// ===========================================================================

test("a wrapper recycled from a real post onto an ad is caught", () => {
  // The gap the release valve cannot see. reconsider() only ever looks at
  // COLLAPSED wrappers, so a wrapper written off as clear and later recycled
  // onto an ad would sit there visible for the life of the page, behind a
  // cached "no". A hard signal appearing inside a unit we judged clear
  // overrules the cache; nothing else does.
  const s = story([new El("span", {}, [text("Jo Bloggs")])]);
  const api = load(feedPage(s.unit));

  for (let i = 0; i < 6; i++) api.sweep([]); // spend the clear-verdict retries
  assert.ok(!s.unit.collapsed);
  assert.equal(api.stats.collapsed, 0);

  s.unit.replaceChildren(
    new El("div", { role: "article" }, [
      new El("h3", {}, [new El("span", {}, DETECTORS["attribute signal"]())]),
      new El("div", {}, [text(FILLER)]),
    ])
  );
  api.sweep([]);

  assert.ok(s.unit.collapsed, "the recycled wrapper now holds an ad and must be collapsed");
});

test("a renumbered story slot is reconsidered even without an empty placeholder", () => {
  // Facebook has two ways of putting something else in a slot: virtualise and
  // restore, which passes through an empty placeholder, and React updating the
  // slot's children in place, which does not. The second announces itself by
  // renumbering aria-posinset, and without that trigger a collapse would outlive
  // the ad it was for — hiding a real post, which is the worst thing this file
  // can do.
  const s = story(DETECTORS["accessible name"]());
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(s.unit.collapsed);

  s.unit.attrs["aria-posinset"] = "9";
  s.unit.replaceChildren(
    new El("div", { role: "article" }, [
      new El("h3", {}, [new El("span", {}, [text("Jo Bloggs")])]),
      new El("div", {}, [text(FILLER)]),
    ])
  );
  api.sweep([]);

  assert.ok(!s.unit.collapsed, "a renumbered slot holding a real post must come back");
  assert.equal(api.stats.recycled, 1);
});

test("a story that merely shifts position is not reconsidered forever", () => {
  // The counterweight to the test above. Positions renumber constantly as the
  // feed grows, and each renumber must cost exactly one re-judgement, not an
  // open invitation to re-judge on every sweep after it.
  const s = story(DETECTORS["accessible name"]());
  const api = load(feedPage(s.unit));
  api.sweep([]);
  const before = api.stats.verdicts;

  s.unit.attrs["aria-posinset"] = "4";
  for (let i = 0; i < 10; i++) api.sweep([]);

  assert.ok(s.unit.collapsed, "still an ad, still collapsed");
  assert.equal(api.stats.verdicts, before + 1, "one renumber, one re-judgement");
  assert.equal(api.stats.released, 0);
});

// ===========================================================================
// Read from a live Facebook session, 2 September 2026
//
// Everything above this line was written against a DOM I reasoned my way to.
// Everything below was read out of a real logged-in page, and all four of these
// were shipped bugs that every test above passed straight over. That is the
// lesson worth keeping: a synthetic fixture tests the code against my
// assumptions, and the assumptions were what was wrong.
// ===========================================================================

const ZWSP = "\u200B";

test("the sidebar heading Facebook actually renders is matched", () => {
  // Observed: the right-hand column's heading is "Sponsored\u200B" — the word
  // with a ZERO WIDTH SPACE welded on. Nothing looks different; a person reads
  // "Sponsored". But isSponsoredLabel() compares the whole label, and
  // "sponsored\u200b" !== "sponsored", so EVERY detector resting on the word
  // list said no. The old strip list had U+200C and U+200D — the joiners either
  // side of it — and not the one Facebook uses.
  const api = load(feedPage());
  assert.ok(api.isSponsoredLabel("Sponsored" + ZWSP), "the live sidebar heading must match");
  assert.ok(api.isSponsoredLabel(ZWSP + "Sponsored" + ZWSP), "leading and trailing");
  assert.ok(api.isSponsoredLabel("Sponsored" + ZWSP + " \u00b7 Paid partnership"), "with a suffix");
  assert.ok(api.isSponsoredLabel("Sponsored\uFEFF"), "and the rest of the zero-width family");
  assert.ok(!api.isSponsoredLabel("Sponsored a post about my dog"), "prose is still not a badge");
});

test('the short "Ad" byline is matched, and only as a whole label', () => {
  // Observed in the feed: an ad's byline under the advertiser name reads
  // "Ad \u00b7 \u{1F310}", not "Sponsored". Without this the word list misses
  // every ad on that layout.
  const api = load(feedPage());
  assert.ok(api.isSponsoredLabel("Ad"), "the bare byline");
  assert.ok(api.isSponsoredLabel("Ad \u00b7 \u{1F310}"), "with the globe suffix Facebook appends");
  // Two letters is short enough to be worth pinning the limits of.
  for (const notAnAd of ["Adam", "Ada Lovelace", "Adidas", "Read this ad", "Advertising"]) {
    assert.ok(!api.isSponsoredLabel(notAnAd), `must not match: ${notAnAd}`);
  }
});

test("the right-hand-column ad target is matched whatever generation it is", () => {
  // Observed: target="rhcad3". Every rule we had — and uBlock Origin's — was
  // pinned to rhcad2 and therefore selected nothing at all.
  const api = load(feedPage());
  // Scanned over the SELECTOR CONSTANTS rather than the file: the comments
  // quote the exact values read off the live page, rhcad2 and rhcad3 both, and
  // a test that cannot tell a selector from a sentence about one is no test.
  const selectors = [...SOURCE.matchAll(/^\s*const (?:\w*SELECTOR\w*) = [\s\S]*?;$/gm)]
    .map((m) => m[0])
    .join(" ");
  assert.ok(selectors.includes('rhcad'), "the rail target must appear in a selector");
  assert.match(selectors, /target\^="rhcad"/, "the signal must be prefix-matched");
  assert.doesNotMatch(selectors, /target="rhcad\d/, "never pinned to one generation");
  void api;
});

test("data-ad-preview does not collapse a post on its own", () => {
  // Observed: [data-ad-preview="message"] on a post by a real person with a
  // __cft__ profile link, alongside data-ad-rendering-role="profile_name" /
  // "story_message" / "like_button" on the same organic story. The whole
  // data-ad-* family is Facebook's RENDERING vocabulary, not its ad vocabulary.
  // It was in the collapse-on-sight list, so this test is the difference between
  // hiding a friend's post and not.
  const article = new El("div", { role: "article" }, [
    new El("h3", {}, [new El("span", {}, [text("John Pavl Dahao")])]),
    new El("div", { "data-ad-preview": "message" }, [text(FILLER)]),
    new El("div", { "data-ad-rendering-role": "story_message" }, [text(FILLER)]),
  ]);
  const unit = new El("div", { "aria-posinset": "1" }, [article]);
  const api = load(feedPage(unit));
  api.sweep([]);
  assert.ok(!unit.collapsed, "a data-ad-* attribute alone must never hide a post");
});

test("the live sidebar's Sponsored block is removed, heading and all", () => {
  // The structure read off the page, level for level: the ad's link sits five
  // wrappers below the card, the cards sit in a list, and the list sits under a
  // "Sponsored\u200B" heading. Collapsing only the cards leaves that heading
  // floating in the sidebar with nothing under it — which is what "there is
  // still a sponsored section" means.
  const card = (name) =>
    new El("div", {}, [
      new El("div", { "data-visualcompletion": "ignore-dynamic" }, [
        new El("div", {}, [
          new El("div", {}, [
            new El("a", { target: "rhcad3", href: "https://l.facebook.com/l.php?u=x" }, [
              text(`Advertiser ${name} https://example.com/`),
            ]),
          ]),
        ]),
      ]),
    ]);
  const list = new El("div", {}, [card("Grand OPEN"), card("MongoDB")]);
  const heading = new El("div", {}, [new El("span", {}, [text("Sponsored" + ZWSP)])]);
  const block = new El("div", {}, [heading, list, new El("div", {})]);
  const pad = new El("div", {}, [block]);
  const birthdays = new El("div", {}, [
    new El("span", {}, [text("Birthdays")]),
    new El("div", {}, [text("Simplyme Malou and Analyn Raposas Taberna have birthdays today.")]),
  ]);
  const rail = new El("div", { role: "complementary" }, [new El("div", {}, [pad, birthdays])]);
  const body = new El("body", {}, [new El("div", { role: "main" }, []), rail]);

  const api = load(body);
  api.sweep([]);

  assert.ok(block.collapsed || pad.collapsed, "the whole Sponsored block should go");
  assert.ok(!birthdays.collapsed, "Birthdays must survive");
  assert.ok(!rail.collapsed, "and so must the column");
  assert.ok(!rail.childNodes[0].collapsed, "and the column's contents wrapper");
});

test("a two-letter word does not turn the pre-filter off", () => {
  // Adding "ad" to the word list nearly destroyed couldSpell(): a two-letter
  // word is "possibly spellable" by almost any string, so "Yesterday at 18:02"
  // became a candidate for the style walk — and a feed is mostly timestamps.
  // Short words are therefore bounded by the candidate's LENGTH, on the grounds
  // that decoy letters are added a few at a time and a scrambled two-letter
  // badge is never eighteen characters long.
  // Each of these contains BOTH letters of "ad" and is too long to be a
  // scrambled two-letter badge, which is exactly the case the bound is for.
  //
  // Note what is not in this list: strings like "Adam and 4 others", which do
  // still get through. That is the LONG words' own tolerance \u2014 "sponsored"
  // allows one missing letter, and that string is only missing the p. It has
  // always been so, it is the filter being deliberately generous, and the reader
  // rejects it a moment later. Only the short-word bound is under test here.
  const api = load(feedPage());
  for (const byline of ["Yesterday at 18:02", "3 days ago", "Edited \u00b7 2d", "Ada Lovelace"]) {
    assert.equal(api.couldSpell(byline), false, `must not reach the style walk: ${byline}`);
  }
  // …while a scrambled two-letter badge still does.
  assert.equal(api.couldSpell("aAdx"), true, "a scrambled Ad badge must still get read");
  assert.equal(api.couldSpell("Ad"), true, "and the plain one");
});

// ===========================================================================
// The byline is not inside the heading
//
// Read from a live feed, 2 September 2026. The ad by "Games Story" — rendering
// "Ad · 🌐" under the name on screen — has an h4 whose subtree is nine nested
// elements, every one of whose textContent is "Games Story". The word "Ad" is
// not in the heading at all. The organic post by INQUIRER.net, queried the same
// way, returns "INQUIRER.net · Follow" — byline included.
//
// So the old selector matched eleven elements inside that ad and all eleven
// were the advertiser's name. Every detector downstream was working perfectly
// on text that could not contain the answer.
// ===========================================================================

// The heading as Facebook nests it: h4 > span > span > span > span > div > a >
// b > span, every level carrying the same name and nothing else.
function nestedName(name, depth = 8) {
  let node = new El("span", {}, [text(name)]);
  for (let i = 0; i < depth; i++) node = new El("span", {}, [node]);
  return new El("h4", {}, [node]);
}

// name and byline as SIBLINGS, which is the shape that matters.
function headerColumn(name, byline) {
  return new El("div", {}, [
    nestedName(name),
    new El("span", {}, [new El("span", {}, [text(byline)])]),
  ]);
}

function storyWithHeader(header, bodyText = FILLER) {
  const article = new El("div", { role: "article" }, [
    header,
    new El("div", {}, [text(bodyText)]),
  ]);
  return { unit: new El("div", { "aria-posinset": "1" }, [article]), article };
}

test('an ad whose "Ad" byline sits beside the heading is caught', () => {
  const s = storyWithHeader(headerColumn("Games Story", "Ad \u00b7 \u{1F310}"));
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(s.unit.collapsed, 'the "Ad" byline is outside the h4 and must still be read');
});

test("the same shape with a Sponsored byline is caught", () => {
  const s = storyWithHeader(headerColumn("Spotify", "Sponsored" + ZWSP));
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(s.unit.collapsed);
});

test("an organic post with a timestamp byline is left alone", () => {
  // The exact counterweight: same structure, ordinary byline. This is the test
  // that would fail if "look beside the heading" ever became "look at the post".
  for (const byline of ["2h \u00b7 \u{1F310}", "\u00a0 \u00b7 Follow", "3m", "Yesterday at 18:02"]) {
    const s = storyWithHeader(headerColumn("INQUIRER.net", byline));
    const api = load(feedPage(s.unit));
    api.sweep([]);
    assert.ok(!s.unit.collapsed, `must not collapse on byline: ${JSON.stringify(byline)}`);
  }
});

test("the byline walk never reaches the story body", () => {
  // The bound that keeps this safe. A sibling holding the post text is not a
  // byline, however much it might happen to contain.
  const header = new El("div", {}, [
    nestedName("Some Page"),
    new El("div", {}, [
      text("A long post that mentions an ad and sponsored content at length, repeatedly."),
    ]),
  ]);
  const s = storyWithHeader(header);
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(!s.unit.collapsed, "a long sibling is the story, not a badge");
});

test("the badge is found wherever in the post it is put", () => {
  // The structure-independent pass. Each of these buries the byline somewhere
  // different — a sibling of the heading, three levels away from it, in front of
  // the heading, in no relation to it at all — and every one must be caught,
  // because which of them Facebook is using this week is precisely the thing
  // this file keeps guessing wrong.
  const badge = () => new El("span", {}, [new El("span", {}, [text("Ad \u00b7 \u2699")])]);

  const shapes = {
    "sibling of the heading": () => new El("div", {}, [nestedName("McDonald's"), badge()]),
    "cousin of the heading": () =>
      new El("div", {}, [
        new El("div", {}, [nestedName("McDonald's")]),
        new El("div", {}, [new El("div", {}, [badge()])]),
      ]),
    "before the heading": () => new El("div", {}, [badge(), nestedName("McDonald's")]),
    "no relation at all": () =>
      new El("div", {}, [
        new El("div", {}, [new El("div", {}, [nestedName("McDonald's")])]),
        badge(),
      ]),
  };

  for (const [name, build] of Object.entries(shapes)) {
    const s = storyWithHeader(build());
    const api = load(feedPage(s.unit));
    api.sweep([]);
    assert.ok(s.unit.collapsed, `must be caught when the badge is a ${name}`);
  }
});

test("the broad pass still leaves ordinary posts alone", () => {
  // The counterweight, and the one that matters most: reading the first few
  // dozen spans of every post is only safe because the match is whole-label.
  const bits = ["Like", "Comment", "Share", "3m", "2h \u00b7 \u{1F310}", "See more", "Follow",
                "Top comments", "Adam Sandler", "Advertising", "Read the ad copy"];
  const header = new El("div", {}, [
    nestedName("INQUIRER.net"),
    ...bits.map((b) => new El("span", {}, [text(b)])),
  ]);
  const s = storyWithHeader(header);
  const api = load(feedPage(s.unit));
  api.sweep([]);
  assert.ok(!s.unit.collapsed, "none of an ordinary post's furniture is a badge");
});

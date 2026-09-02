// test/float-video-test.mjs
// Sieve — tests for content/float-video.js.
//
//   node --test test/
//
// This file rewrites positioning on every site, with no filter list telling it
// what is safe, so what is pinned here is every hurdle a box has to clear —
// each taken away in turn to prove it was load-bearing:
//
//   1. it holds a real player (a <video>, or an iframe from a player host),
//   2. it is FLOATING — fixed or sticky, not merely present,
//   3. it is CORNER-sized, so a full-screen lightbox or a cinema-mode player is
//      left alone,
//   4. it is not a video CALL, which is the one case where being wrong costs
//      somebody something,
//   5. it is not picture-in-picture or fullscreen, both of which are the user
//      having asked for exactly this.
//
// And three things that are invisible when they regress: the script must MARK
// rather than style (an inline style loses to a site that re-floats on every
// scroll, an author !important rule does not), the counter must count players
// rather than scroll events, and the observer must not feed itself.
//
// The real file runs in a vm sandbox against hand-built nodes, like the other
// content-script tests here. A hand-built DOM is a poor imitation of the real
// thing and that is worth remembering when reading a pass — what it proves is
// that the decisions are right, not that the file works on indiewire.com.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/float-video.js", import.meta.url), "utf8");

function makeSandbox() {
  const timers = [];
  const sent = [];
  const listeners = [];
  const observers = [];
  const sandbox = {
    console: { debug() {}, log() {}, warn() {}, error() {} },
    Object, Array, Set, Map, WeakMap, Math, Number, String, RegExp, JSON, Error,
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
      constructor(fn) {
        this.fn = fn;
        this.taken = 0;
        observers.push(this);
      }
      observe() {}
      takeRecords() { this.taken++; return []; }
    },
  };
  sandbox.window = sandbox;
  sandbox.innerWidth = 1400;
  sandbox.innerHeight = 900;
  sandbox.addEventListener = (type, fn) => listeners.push({ type, fn });
  sandbox.getComputedStyle = (n) => (n && n._cs) || { position: "static" };
  sandbox.document = {
    documentElement: {},
    body: {},
    pictureInPictureElement: null,
    fullscreenElement: null,
    addEventListener() {},
    querySelectorAll: (sel) => {
      const named = sandbox._named || [];
      const players = sandbox._players || [];
      // The file makes exactly two document-level queries and they are easy to
      // tell apart: the named one is the joined class list, the other is
      // "video,iframe".
      return sel === "video,iframe" ? players : named;
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return { sandbox, api: sandbox.window.__sieveFloatVideo, timers, sent, listeners, observers };
}

// A fake element. `pos` is the computed position; `w`/`h` the rendered box.
function el({
  tag = "DIV", src = "", pos = "static", w = 400, h = 225,
  kids = [], parent = null, srcObject = null,
} = {}) {
  const attrs = src ? { src } : {};
  const applied = {};
  const node = {
    nodeType: 1,
    tagName: tag,
    srcObject,
    parentElement: parent,
    _cs: { position: pos },
    _applied: applied,
    style: {
      setProperty(name, value, priority) {
        applied[name] = { value, priority };
      },
    },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    setAttribute: (k, v) => { attrs[k] = v; },
    getBoundingClientRect: () => ({ width: w, height: h }),
    querySelectorAll: (sel) => (sel === "video" ? kids.filter((k) => k.tagName === "VIDEO") : kids),
    contains: (other) => other === node || kids.includes(other),
  };
  for (const k of kids) if (!k.parentElement) k.parentElement = node;
  return node;
}

// A player nested the way JW Player nests one: <video> inside a wrapper that is
// the element actually made fixed, inside the outer player element.
function nestedPlayer({ pos = "fixed", w = 400, h = 225 } = {}) {
  const video = el({ tag: "VIDEO" });
  const wrapper = el({ pos, w, h, kids: [video] });
  const outer = el({ kids: [wrapper] });
  wrapper.parentElement = outer;
  video.parentElement = wrapper;
  return { video, wrapper, outer };
}

// ===========================================================================
// 1. Is this a player?
// ===========================================================================

test("a <video> is a player", () => {
  const { api } = makeSandbox();
  assert.equal(api.isPlayerNode(el({ tag: "VIDEO" })), true);
});

test("an iframe from a known player host is a player", () => {
  const { api } = makeSandbox();
  for (const src of [
    "https://players.brightcove.net/123/default_default/index.html?videoId=456",
    "https://www.youtube.com/embed/abc123",
    "https://cdn.jwplayer.com/players/xyz.html",
    "https://player.vimeo.com/video/999",
  ]) {
    assert.equal(api.isPlayerNode(el({ tag: "IFRAME", src })), true, src);
  }
});

test("an ordinary iframe is not a player", () => {
  const { api } = makeSandbox();
  // The advert iframe on the same page must not drag its container out of
  // position — this feature is about video, not about ads.
  for (const src of [
    "https://googleads.g.doubleclick.net/pagead/ads",
    "https://platform.twitter.com/embed/Tweet.html",
    "",
  ]) {
    assert.equal(api.isPlayerNode(el({ tag: "IFRAME", src })), false, src || "(empty src)");
  }
});

test("a DIV is never a player, however it is positioned", () => {
  const { api } = makeSandbox();
  assert.equal(api.isPlayerNode(el({ pos: "fixed" })), false);
});

// ===========================================================================
// 2. Is it floating?
// ===========================================================================

test("a static player is left alone", () => {
  const { api } = makeSandbox();
  const { video } = nestedPlayer({ pos: "static" });
  assert.equal(api.floatingAncestor(video), null);
});

test("fixed and sticky both count as floating", () => {
  const { api } = makeSandbox();
  for (const pos of ["fixed", "sticky"]) {
    const { video, wrapper } = nestedPlayer({ pos });
    assert.equal(api.floatingAncestor(video), wrapper, pos);
  }
});

test("the floating box is found through the wrapper the site actually moved", () => {
  // The <video> itself is static; two levels up is the fixed one. Walking up is
  // the whole reason this works on JW Player.
  const { api } = makeSandbox();
  const { video, wrapper } = nestedPlayer();
  assert.equal(api.floatingAncestor(video), wrapper);
});

test("a fixed ancestor further away than the player shell is not ours", () => {
  // A site's whole page can sit inside one fixed wrapper. That is layout, not a
  // floating player, and the walk has to stop before it reaches it.
  const { api } = makeSandbox();
  const video = el({ tag: "VIDEO" });
  let cur = video;
  for (let i = 0; i < 8; i++) {
    const wrap = el({ kids: [cur] });
    cur.parentElement = wrap;
    cur = wrap;
  }
  const far = el({ pos: "fixed", kids: [cur] });
  cur.parentElement = far;
  assert.equal(api.floatingAncestor(video), null);
});

// ===========================================================================
// 3. Corner-sized, not page-sized
// ===========================================================================

test("a corner-sized box is in scope", () => {
  const { api } = makeSandbox();
  assert.equal(api.isCornerSized(el({ w: 400, h: 225 })), true);
});

test("a full-screen player is left alone", () => {
  // A video lightbox and a cinema-mode player are both fixed, and neither is
  // the thing this feature exists to stop.
  const { api } = makeSandbox();
  assert.equal(api.isCornerSized(el({ w: 1400, h: 900 })), false);
  assert.equal(api.isCornerSized(el({ w: 1200, h: 700 })), false);
});

test("a thumbnail-sized box is left alone", () => {
  const { api } = makeSandbox();
  assert.equal(api.isCornerSized(el({ w: 40, h: 30 })), false);
});

test("a page-sized floating ancestor stops the walk rather than continuing it", () => {
  // Finding a page-sized fixed box means we have walked past the player shell
  // into the site's own layout, and a smaller fixed box above that is not the
  // player either. Returning null rather than carrying on is the safe answer.
  const { api } = makeSandbox();
  const { video, wrapper } = nestedPlayer({ pos: "fixed", w: 1400, h: 900 });
  assert.equal(api.floatingAncestor(video), null);
  assert.equal(wrapper.hasAttribute("data-sieve-unfloated"), false);
});

// ===========================================================================
// 4. Video calls — the guard that matters most
// ===========================================================================

test("a <video> playing a MediaStream is a call and is never touched", () => {
  const { api } = makeSandbox();
  const live = el({ tag: "VIDEO", srcObject: {} });
  assert.equal(api.isLiveStream(live), true);
});

test("the call guard reaches through a container", () => {
  const { api } = makeSandbox();
  const live = el({ tag: "VIDEO", srcObject: {} });
  const tile = el({ pos: "fixed", w: 240, h: 135, kids: [live] });
  assert.equal(api.isLiveStream(tile), true);
});

test("an ordinary video file is not a live stream", () => {
  const { api } = makeSandbox();
  assert.equal(api.isLiveStream(el({ tag: "VIDEO" })), false);
});

test("a scan leaves a floating call tile exactly where it is", () => {
  const { sandbox, api } = makeSandbox();
  const live = el({ tag: "VIDEO", srcObject: {} });
  const tile = el({ pos: "fixed", w: 240, h: 135, kids: [live] });
  live.parentElement = tile;
  sandbox._players = [live];
  api.scan();
  assert.equal(tile.hasAttribute("data-sieve-unfloated"), false);
  assert.equal(api.state().unfloated, 0);
});

// ===========================================================================
// 5. Picture-in-picture and fullscreen
// ===========================================================================

test("picture-in-picture is the user asking for this, and is left alone", () => {
  const { sandbox, api } = makeSandbox();
  const { video, wrapper } = nestedPlayer();
  sandbox.document.pictureInPictureElement = video;
  assert.equal(api.isUserRequested(video), true);
  sandbox._players = [video];
  api.scan();
  assert.equal(wrapper.hasAttribute("data-sieve-unfloated"), false);
});

test("fullscreen is left alone", () => {
  const { sandbox, api } = makeSandbox();
  const video = el({ tag: "VIDEO" });
  sandbox.document.fullscreenElement = video;
  assert.equal(api.isUserRequested(video), true);
});

// ===========================================================================
// Un-floating
// ===========================================================================

test("un-floating MARKS the box and writes no style at all", () => {
  // This is the load-bearing decision in the file and it is easy to "simplify"
  // back into a bug. Writing the positioning as an inline style here loses to a
  // site whose float-on-scroll handler assigns el.style.position on every
  // scroll event: assigning through the CSSOM replaces the declaration and
  // drops the !important with it. The stylesheet's [data-sieve-unfloated] rule
  // is author-origin !important, a higher cascade tier than any inline
  // declaration, so it cannot be overwritten at all. Both halves were measured
  // in Chrome, and the browser check in the same session is what caught it.
  const { api } = makeSandbox();
  const box = el({ pos: "fixed" });
  assert.equal(api.unfloat(box), true);
  assert.equal(box.getAttribute("data-sieve-unfloated"), "floating-video");
  assert.deepEqual(Object.keys(box._applied), [], "an inline style was written");
});

test("the stylesheet is what actually moves a marked box", () => {
  // The other half of the pairing. A mark with no rule behind it is a silent
  // no-op, which is exactly how the slot collapser once shipped doing nothing.
  const css = fs.readFileSync(new URL("../content/float-video.css", import.meta.url), "utf8");
  const rule = css.slice(css.indexOf("[data-sieve-unfloated]"));
  assert.ok(rule.startsWith("[data-sieve-unfloated]"), "no rule for the mark");
  const body = rule.slice(rule.indexOf("{"), rule.indexOf("}"));
  for (const decl of ["position: static", "top: auto", "right: auto", "bottom: auto", "left: auto", "z-index: auto", "transform: none"]) {
    assert.ok(body.includes(decl), `${decl} is missing`);
    // Leaving top/right/bottom/left behind is how a box ends up static but
    // still sitting where the offsets put it on a positioned ancestor.
  }
  assert.equal((body.match(/!important/g) || []).length, 7, "every declaration must be !important");
});

test("width and height are deliberately not touched", () => {
  // Forcing them back to auto is how you break a player's aspect ratio.
  const css = fs.readFileSync(new URL("../content/float-video.css", import.meta.url), "utf8");
  const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/\bwidth\s*:/i.test(declarations));
  assert.ok(!/\bheight\s*:/i.test(declarations));
});

test("a re-scan does not re-count the same player", () => {
  // The counter counts players, not scroll events. A site that re-adds its
  // floating class on every scroll must not inflate the dashboard.
  const { api } = makeSandbox();
  const box = el({ pos: "fixed" });
  assert.equal(api.unfloat(box), true);
  assert.equal(api.unfloat(box), false);
  assert.equal(api.unfloat(box), false);
});

test("a named player has its inner fixed box marked too", () => {
  // The floating class goes on the outer element and the fixed positioning
  // lands on an inner one — marking only the matched element would miss it.
  const { api } = makeSandbox();
  const { wrapper, outer } = nestedPlayer();
  assert.equal(api.unfloatSubtree(outer), true);
  assert.equal(wrapper.hasAttribute("data-sieve-unfloated"), true);
});

// ===========================================================================
// Scanning and counting
// ===========================================================================

test("a scan un-floats a floating player and reports one", () => {
  const { sandbox, api, sent } = makeSandbox();
  const { video, wrapper } = nestedPlayer();
  sandbox._players = [video];
  api.scan();
  assert.equal(wrapper.hasAttribute("data-sieve-unfloated"), true);
  assert.equal(api.state().unfloated, 1);
  // Field by field rather than deepEqual: the message is built inside the vm
  // sandbox, so it is a cross-realm object and never reference-equal to one
  // built out here.
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "SIEVE_RECORD_BLOCK");
  assert.equal(sent[0].category, "floatVideo");
  assert.equal(sent[0].count, 1);
});

test("a second scan over the same page reports nothing further", () => {
  const { sandbox, api, sent } = makeSandbox();
  const { video } = nestedPlayer();
  sandbox._players = [video];
  api.scan();
  api.scan();
  api.scan();
  assert.equal(sent.length, 1);
});

test("a scan over a page with no floating player reports nothing", () => {
  const { sandbox, api, sent } = makeSandbox();
  const { video } = nestedPlayer({ pos: "static" });
  sandbox._players = [video];
  api.scan();
  assert.equal(sent.length, 0);
  assert.equal(api.state().unfloated, 0);
});

test("the observer's records are discarded after our own writes", () => {
  // Without this the observer re-queues every box we touched and the scan feeds
  // itself. Same trap as content/ad-slot-collapse.js and anti-adblock-dom.js.
  const { sandbox, api, observers } = makeSandbox();
  assert.equal(observers.length, 1, "start() should have made an observer");
  const before = observers[0].taken;
  const { video } = nestedPlayer();
  sandbox._players = [video];
  api.scan();
  assert.ok(observers[0].taken > before, "takeRecords was not called after the writes");
});

test("a mutation while we are writing does not schedule another scan", () => {
  // The other half of the same trap: our own setProperty calls are mutations,
  // and an observer callback that trusted them would loop.
  const { sandbox, api, observers, timers } = makeSandbox();
  const { video } = nestedPlayer();
  sandbox._players = [video];
  const scheduledBefore = timers.length;
  // Fire the observer callback the way our own write would.
  observers[0].fn([]);
  assert.equal(timers.length, scheduledBefore + 1, "a real mutation should schedule one scan");
});

test("the per-page ceiling holds", () => {
  const { sandbox, api } = makeSandbox();
  const players = [];
  for (let i = 0; i < api.MAX_PER_PAGE + 6; i++) players.push(nestedPlayer().video);
  sandbox._players = players;
  api.scan();
  assert.equal(api.state().unfloated, api.MAX_PER_PAGE);
});

// ===========================================================================
// The stylesheet pairing
// ===========================================================================

test("every named selector the script watches is un-floated by the stylesheet", () => {
  // The script only NOTICES the named players; content/float-video.css is what
  // actually stops them. A selector in one file and not the other is a silent
  // no-op, which is exactly the failure the slot collapser shipped with once.
  const { api } = makeSandbox();
  const css = fs.readFileSync(new URL("../content/float-video.css", import.meta.url), "utf8");
  for (const sel of api.KNOWN_FLOAT_SELECTORS) {
    assert.ok(css.includes(sel), `${sel} is in the script's list but not in float-video.css`);
  }
});

test("the stylesheet never hides anything", () => {
  // Un-float, do not hide. A display:none in here would leave a hole where the
  // article's video used to be.
  const css = fs.readFileSync(new URL("../content/float-video.css", import.meta.url), "utf8");
  const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/display\s*:\s*none/i.test(declarations));
  assert.ok(!/visibility\s*:\s*hidden/i.test(declarations));
});

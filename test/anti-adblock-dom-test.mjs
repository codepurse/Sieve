// test/anti-adblock-dom-test.mjs
// Sieve — tests for the wall sweep in content/anti-adblock-dom.js.
//
//   node --test test/
//
// What is pinned here is looksLikeWallText() and the two decisions either side
// of it, because this half hides things and it has no per-site list to fall back
// on. It reads the page and judges. Both failure directions are silent: a missed
// wall looks like the feature not working, and a false match hides part of a site
// nobody was complaining about.
//
// The case this file exists to prevent is an ARTICLE ABOUT AD BLOCKING. Every
// word a wall uses appears in one, and a naive phrase match would hide the
// piece the reader came for. Three conditions have to hold before anything is
// touched — it must be covering the page, its text must be short, and that text
// must both name a blocker and ask for something — and the tests below take each
// of them away in turn to check it was actually load-bearing.
//
// Run in a vm sandbox against hand-built nodes, for the same reason
// test/facebook-ads-dom-test.mjs is: the interesting input is the computed
// style, and a fake we control says more about the logic than a DOM
// implementation guessing at layout.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/anti-adblock-dom.js", import.meta.url), "utf8");

// --- the fake page ---------------------------------------------------------

function makeSandbox() {
  const timers = [];
  const sent = [];

  const sandbox = {
    console: { debug() {}, log() {}, warn() {}, error() {} },
    Object,
    Array,
    Set,
    WeakSet,
    Map,
    Math,
    Number,
    String,
    RegExp,
    JSON,
    Error,
    parseInt,
    setTimeout: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    chrome: {
      runtime: {
        sendMessage: (msg) => {
          sent.push(msg);
          return { catch() {} };
        },
      },
    },
    MutationObserver: class {
      constructor(fn) {
        this.fn = fn;
        this.drained = 0;
      }
      observe() {}
      takeRecords() {
        this.drained++;
        return [];
      }
    },
  };
  sandbox.window = sandbox;
  sandbox.innerWidth = 1000;
  sandbox.innerHeight = 800;
  sandbox.getComputedStyle = (node) => (node && node._cs) || style({});
  sandbox.document = {
    documentElement: node({ tag: "HTML" }),
    body: node({ tag: "BODY" }),
    addEventListener() {},
    // The selector is exercised by the browser, not here. Every test hands the
    // sweep its own candidate list through this.
    querySelectorAll: () => sandbox._candidates || [],
  };

  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return { sandbox, dom: sandbox.window.__sieveAntiAdblockDom, timers, sent };
}

// A computed style with sane defaults — a plain, static, unstyled box.
function style(over) {
  return {
    position: "static",
    zIndex: "auto",
    display: "block",
    overflow: "visible",
    overflowY: "visible",
    filter: "none",
    pointerEvents: "auto",
    ...over,
  };
}

// A fake element. `applied` records every setProperty call so a test can assert
// on what was written rather than on a stringified cssText.
function node({ tag = "DIV", id = "", cls = "", text = "", cs = null, rect = null } = {}) {
  const applied = {};
  const classes = cls ? cls.split(/\s+/) : [];
  classes.remove = (c) => {
    const i = classes.indexOf(c);
    if (i >= 0) classes.splice(i, 1);
  };
  const attrs = { class: cls };
  return {
    nodeType: 1,
    tagName: tag,
    id,
    innerText: text,
    // The sweep pre-filters on textContent (free) before reading innerText
    // (forces layout). Defaults to the same string; a test can pass `hidden`
    // to model a node whose textContent carries text innerText does not see.
    textContent: text,
    applied,
    classList: classes,
    parentElement: null,
    children: [],
    _cs: cs,
    style: {
      setProperty(prop, value, priority) {
        applied[prop] = { value, priority };
      },
    },
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    setAttribute(n, v) {
      attrs[n] = v;
    },
    hasAttribute: (n) => n in attrs,
    getBoundingClientRect: () => rect || { x: 0, y: 0, top: 0, left: 0, width: 0, height: 0 },
  };
}

// ===========================================================================
// Reading the text
// ===========================================================================

test("normalise folds case, punctuation and spacing into one comparable string", () => {
  const { dom } = makeSandbox();
  assert.equal(dom.normalise("Ad-Blocker  DETECTED!"), "ad blocker detected");
  assert.equal(dom.normalise("ad_blocker"), "ad blocker");
  assert.equal(dom.normalise("   "), "");
  assert.equal(dom.normalise(null), "");
});

test("diacritics are folded away, so the word lists can be plain ASCII", () => {
  // A site may write the accent as a combining character, a precomposed one, an
  // HTML entity, or leave it off altogether. Folding here means the lists carry
  // one spelling instead of four.
  const { dom } = makeSandbox();
  assert.equal(dom.normalise("Bloqueur de publicité"), "bloqueur de publicite");
  assert.equal(dom.normalise("anúncios"), "anuncios");
  assert.equal(dom.normalise("Désactivez"), "desactivez");
});

test("a command in the imperative is still an action", () => {
  // The reason the verb list holds stems. Every one of these is how a wall
  // actually writes it, and not one is the infinitive.
  const { dom } = makeSandbox();
  assert.equal(dom.looksLikeWallText("Désactivez votre bloqueur de publicité."), true);
  assert.equal(dom.looksLikeWallText("Desative o seu bloqueador de anúncios."), true);
  assert.equal(dom.looksLikeWallText("Disattiva il blocco pubblicità."), true);
  assert.equal(dom.looksLikeWallText("Deaktiviere deinen Werbeblocker."), true);
});

test("the wall copy sites actually ship is recognised", () => {
  const { dom } = makeSandbox();
  const walls = [
    "Please disable your ad blocker to continue reading.",
    "Ad blocker detected. Turn it off and reload the page.",
    "We noticed you are using an ad blocker.",
    "It looks like you're using an adblocker. Please whitelist our site.",
    "Adblock detected — we rely on advertising to keep this site running. Please support us.",
    "Ad blockers are not allowed here.",
    "Bitte deaktivieren Sie Ihren Werbeblocker.",
    "Por favor, desactiva tu bloqueador de anuncios.",
    "Desative o seu bloqueador de anúncios para continuar.",
  ];
  for (const text of walls) {
    assert.equal(dom.looksLikeWallText(text), true, `not recognised: ${text}`);
  }
});

test("naming an ad blocker is not enough — the text has to ask for something", () => {
  // This is the condition that separates a wall from a mention. A wall always
  // asks; a sentence about ad blocking does not.
  const { dom } = makeSandbox();
  assert.equal(dom.looksLikeWallText("Ad blocker"), false);
  assert.equal(dom.looksLikeWallText("Our ad blocker policy"), false);
  assert.equal(dom.looksLikeWallText("Sponsored by an adblocker company"), false);
});

test("asking for something is not enough either — it has to name an ad blocker", () => {
  // Otherwise every cookie banner and newsletter modal on the web qualifies.
  const { dom } = makeSandbox();
  assert.equal(dom.looksLikeWallText("Please disable this feature to continue."), false);
  assert.equal(dom.looksLikeWallText("Subscribe to support us and remove this message."), false);
  assert.equal(dom.looksLikeWallText("We detected unusual activity. Please verify."), false);
});

test("an article about ad blocking is too long to be a wall", () => {
  // The condition that stops this feature eating the page the reader came for.
  // The text says everything a wall says; it just keeps going afterwards.
  const { dom } = makeSandbox();
  const article =
    "We noticed you are using an ad blocker, and so has everyone else. " +
    "The rise of ad blocking has reshaped online publishing. ".repeat(30);
  assert.ok(article.length > dom.WALL_TEXT_CAP);
  assert.equal(dom.looksLikeWallText(article), false);
  // …and the same opening sentence on its own still is one.
  assert.equal(dom.looksLikeWallText("We noticed you are using an ad blocker."), true);
});

// ===========================================================================
// Is it covering the page?
// ===========================================================================

test("a fixed or sticky box counts as covering", () => {
  const { dom, sandbox } = makeSandbox();
  const get = (n) => n._cs;
  assert.equal(dom.isCovering(node({ cs: style({ position: "fixed" }) }), get), true);
  assert.equal(dom.isCovering(node({ cs: style({ position: "sticky" }) }), get), true);
  assert.equal(dom.isCovering(node({ cs: style({ position: "static" }) }), get), false);
  assert.equal(dom.isCovering(node({ cs: style({ position: "relative" }) }), get), false);
  void sandbox;
});

test("a dialog or an ARIA modal says so outright and needs no geometry", () => {
  const { dom } = makeSandbox();
  const get = (n) => n._cs;
  const dialog = node({ tag: "DIALOG", cs: style({}) });
  dialog.setAttribute("open", "");
  assert.equal(dom.isCovering(dialog, get), true);

  const aria = node({ cs: style({}) });
  aria.setAttribute("role", "dialog");
  assert.equal(dom.isCovering(aria, get), true);

  const modal = node({ cs: style({}) });
  modal.setAttribute("aria-modal", "true");
  assert.equal(dom.isCovering(modal, get), true);
});

test("an absolute box has to be both stacked and big", () => {
  // Tooltips, dropdowns and toasts are absolute and stacked all day long. Only
  // something actually covering the page qualifies.
  const { dom } = makeSandbox();
  const get = (n) => n._cs;
  const big = { x: 0, y: 0, top: 0, left: 0, width: 900, height: 600 };
  const small = { x: 0, y: 0, top: 0, left: 0, width: 120, height: 40 };

  assert.equal(
    dom.isCovering(node({ cs: style({ position: "absolute", zIndex: "9999" }), rect: big }), get),
    true
  );
  assert.equal(
    dom.isCovering(node({ cs: style({ position: "absolute", zIndex: "9999" }), rect: small }), get),
    false,
    "a small stacked box is a tooltip, not a wall"
  );
  assert.equal(
    dom.isCovering(node({ cs: style({ position: "absolute", zIndex: "2" }), rect: big }), get),
    false,
    "a big box behind the page is not covering it"
  );
});

// ===========================================================================
// Clearing, and un-locking what the wall was covering
// ===========================================================================

test("clearing hides the wall and marks it, rather than deleting it", () => {
  const { sandbox, dom } = makeSandbox();
  const wall = node({ cls: "adblock-modal", text: "Please disable your ad blocker." });
  assert.equal(dom.clearWall(wall), true);
  assert.deepEqual(wall.applied.display, { value: "none", priority: "important" });
  assert.equal(wall.getAttribute("data-sieve-cleared"), "adblock-wall");
  void sandbox;
});

test("the scroll lock and the blur come off <html> and <body>", () => {
  // The half people forget. A wall that is merely hidden leaves a page that
  // cannot be scrolled and an article that is still blurred — which looks more
  // broken than the wall did.
  const { sandbox, dom } = makeSandbox();
  const html = sandbox.document.documentElement;
  const body = sandbox.document.body;

  dom.clearWall(node({ cls: "wall", text: "Turn off your ad blocker." }));

  for (const el of [html, body]) {
    assert.equal(el.applied.overflow.value, "auto");
    assert.equal(el.applied.overflow.priority, "important");
    assert.equal(el.applied.position.value, "static");
    assert.equal(el.applied.filter.value, "none");
    assert.equal(el.applied["pointer-events"].value, "auto");
  }
});

test("the classes holding the lock are removed as well as overridden", () => {
  // A site's own stylesheet can carry rules keyed off the class — a ::before
  // backdrop, say — that an inline style on the element cannot reach.
  const { dom } = makeSandbox();
  const el = node({ cls: "page no-scroll is-blurred modal-open theme-dark" });
  dom.unlockElement(el);
  assert.ok(!el.classList.includes("no-scroll"));
  assert.ok(!el.classList.includes("modal-open"));
  assert.ok(el.classList.includes("theme-dark"), "an unrelated class must be left alone");
  assert.ok(el.classList.includes("page"));
});

test("a blurred sibling of the wall is un-blurred too", () => {
  // The commonest shape on a news site: <div class="content blurred"> next to
  // <div class="adblock-notice">. Nothing on <body> is blurred, so restoring
  // only html and body would leave the article unreadable.
  const { dom } = makeSandbox();
  const parent = node({ cls: "layout" });
  const content = node({ cls: "content", cs: style({ filter: "blur(6px)" }) });
  const wall = node({ cls: "notice", text: "Please disable your ad blocker." });
  wall.parentElement = parent;
  content.parentElement = parent;
  parent.children = [content, wall];

  dom.clearWall(wall);
  assert.equal(content.applied.filter.value, "none");
  assert.equal(content.applied["-webkit-filter"].value, "none");
});

test("an ancestor holding the scroll lock is walked up to and unlocked", () => {
  const { dom } = makeSandbox();
  const shell = node({ cls: "app-shell", cs: style({ overflow: "hidden" }) });
  const wall = node({ cls: "notice", text: "Ad blocker detected, please disable it." });
  wall.parentElement = shell;

  dom.clearWall(wall);
  assert.equal(shell.applied.overflow.value, "auto");
});

// ===========================================================================
// End to end
// ===========================================================================

test("a real wall is cleared once and counted once", () => {
  const { sandbox, dom, sent } = makeSandbox();
  const wall = node({
    cls: "adblock-overlay",
    text: "Ad blocker detected. Please disable it to continue.",
    cs: style({ position: "fixed", zIndex: "10000" }),
  });
  sandbox._candidates = [wall];

  dom.sweep();
  assert.equal(wall.applied.display.value, "none");
  // Round-tripped through JSON: the message object was built inside the vm
  // realm, so a strict deepEqual would fail on its prototype rather than on its
  // contents.
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    { type: "SIEVE_RECORD_BLOCK", category: "antiAdblock", count: 1 },
  ]);

  // A second sweep must not re-count the same element — the site's own script
  // re-showing its wall in a loop would otherwise inflate the dashboard.
  dom.sweep();
  assert.equal(sent.length, 1);
});

test("a wall already cleared is never cleared, or counted, twice", () => {
  // The bug a real browser found and this harness had missed. Writing the inline
  // display:none is itself an attribute mutation, so the observer re-queues the
  // element — and innerText on an element that is not being rendered falls back
  // to its text content rather than returning "", so it still reads as a wall.
  // The work is idempotent. The tally was not.
  const { dom } = makeSandbox();
  const wall = node({ cls: "notice", text: "Please disable your ad blocker." });
  assert.equal(dom.clearWall(wall), true);
  assert.equal(dom.clearWall(wall), false, "the second pass must be refused");
});

test("re-offering a cleared wall to the sweep changes nothing", () => {
  const { sandbox, dom, sent } = makeSandbox();
  const wall = node({
    cls: "adblock-overlay",
    text: "Ad blocker detected. Please disable it to continue.",
    cs: style({ position: "fixed", zIndex: "10000" }),
  });
  sandbox._candidates = [wall];

  dom.sweep();
  assert.equal(dom.state().cleared, 1);
  assert.equal(sent.length, 1);

  // What the observer does after our own writes: hand the same node back.
  dom.sweep();
  dom.sweep();
  assert.equal(dom.state().cleared, 1, "the count must not climb");
  assert.equal(sent.length, 1, "and nothing more is reported");
});

test("a wall whose class names are generated is still found", () => {
  // Measured on rollingstone.com: Admiral builds its wall from
  // styled-components hashes (.DCDOr, .eRIqgq, .kMGqeO) plus randomised
  // data-attribute names, and rotates them. WALL_SELECTOR matches nothing at
  // all on it, so the wall has to be reachable some other way — here, as a
  // child of body. Handed to the sweep with querySelectorAll returning nothing.
  const { sandbox, dom, sent } = makeSandbox();
  const wall = node({
    cls: "DCDOr",
    text: "Disable Your Adblocker. We use ads to keep our content free. To access our site, disable your adblocker.",
    cs: style({ position: "fixed", zIndex: "2147483647" }),
  });
  sandbox._candidates = []; // the selector finds nothing, as on the real page
  sandbox.document.body.children = [wall];

  dom.sweep();
  assert.equal(wall.applied.display.value, "none");
  assert.equal(sent.length, 1);
});

test("a grandchild of body is reached too, but nothing deeper", () => {
  // The search space is deliberately two levels: a wall has to be attached near
  // the top of the document to cover it, and going deeper turns a bounded scan
  // into a document walk.
  const { sandbox, dom, sent } = makeSandbox();
  const deep = node({ cls: "x", text: "Please disable your ad blocker.", cs: style({ position: "fixed" }) });
  const mid = node({ cls: "mid" });
  const top = node({ cls: "top" });
  mid.children = [deep];
  top.children = [mid];
  sandbox._candidates = [];
  sandbox.document.body.children = [top];

  dom.sweep();
  assert.equal(sent.length, 0, "three levels down is out of scope");

  // Move it up one and it is found.
  top.children = [deep];
  dom.sweep();
  assert.equal(sent.length, 1);
});

test("an article is rejected without ever forcing a layout", () => {
  // The pre-filter. textContent is free; innerText reflows. If the cheap read
  // does not gate the expensive one, widening the candidate list above turns
  // this file into a performance bug on every page load.
  const { sandbox, dom } = makeSandbox();
  let innerTextReads = 0;
  const article = node({ cls: "content" });
  article.textContent = "Please disable your ad blocker, say publishers. " + "Here is the argument. ".repeat(300);
  Object.defineProperty(article, "innerText", {
    get() {
      innerTextReads++;
      return article.textContent;
    },
  });
  sandbox._candidates = [article];

  dom.sweep();
  assert.equal(innerTextReads, 0, "a long node must be rejected on textContent alone");
});

test("the real Admiral wall, exactly as measured on rollingstone.com", () => {
  // Captured 2026-09-02 from the live page. Every value here is real, and the
  // shape is the whole reason this file judges by text rather than by selector:
  //
  //   DIV.eFEjHN               static   auto          301x44    <- the copy
  //   DIV.irzeLH               static   auto          350x167
  //   DIV.lmmqeT               static   auto          740x1354
  //   DIV.eRIqgq               relative auto          740x1354
  //   DIV.DCDOr                fixed    2147483647   1802x1354  <- the wall
  //   DIV (no class)           static   auto         1802x0
  //   BODY                     static   auto         1802x61300
  //
  // Seven nodes carry the text, because an ancestor chain all contains it. Only
  // ONE is the wall, and picking any of the others hides either a fragment or
  // the entire document. Note there is no scroll lock: html and body were both
  // overflow:visible, and the wall covers by being fixed.
  const { sandbox, dom, sent } = makeSandbox();
  const COPY =
    "Disable Your Adblocker We use ads to keep our content free. " +
    "To access our site, disable your adblocker. ALLOW ADS ON ROLLING STONE";

  const mk = (cls, pos, z, w, h) =>
    node({ cls, text: COPY, cs: style({ position: pos, zIndex: z }), rect: { x: 0, y: 0, top: 0, left: 0, width: w, height: h } });

  const copy = mk("eFEjHN", "static", "auto", 301, 44);
  const inner = mk("irzeLH", "static", "auto", 350, 167);
  const card = mk("lmmqeT a__s1p0xe8r-0", "static", "auto", 740, 1354);
  const rel = mk("eRIqgq a__s1p0xe8r-0", "relative", "auto", 740, 1354);
  const wall = mk("DCDOr", "fixed", "2147483647", 1802, 1354);
  const holder = mk("", "static", "auto", 1802, 0);
  const body = sandbox.document.body;

  rel.children = [card];
  card.children = [inner];
  inner.children = [copy];
  wall.children = [rel];
  holder.children = [wall];
  body.children = [holder];
  for (const [child, parent] of [[copy, inner], [inner, card], [card, rel], [rel, wall], [wall, holder], [holder, body]]) {
    child.parentElement = parent;
  }

  // Admiral's class names are generated, so the selector path finds nothing at
  // all — as it does on the real page. Every text-bearing node is offered to the
  // sweep anyway, so the choice between them is what is under test.
  sandbox._candidates = [copy, inner, card, rel, wall, holder, body];

  dom.sweep();

  assert.equal(wall.applied.display.value, "none", "the fixed, viewport-covering node is the wall");
  for (const [name, el] of [["copy", copy], ["inner", inner], ["card", card], ["rel", rel], ["holder", holder], ["body", body]]) {
    assert.equal(el.applied.display, undefined, `${name} must not be hidden`);
  }
  assert.equal(dom.state().cleared, 1, "one wall, not seven");
  assert.equal(sent.length, 1);
});

test("the Admiral wall is reachable as a grandchild of body, with no selector help", () => {
  // The other half of the same case. On the real page the wall sits under an
  // unclassed div under body, and matches none of WALL_SELECTOR — so if the
  // observer misses its insertion, the two-level body scan is the only thing
  // that finds it.
  const { sandbox, dom, sent } = makeSandbox();
  const wall = node({
    cls: "DCDOr",
    text: "Disable Your Adblocker. To access our site, disable your adblocker.",
    cs: style({ position: "fixed", zIndex: "2147483647" }),
    rect: { x: 0, y: 0, top: 0, left: 0, width: 1802, height: 1354 },
  });
  const holder = node({ cls: "" });
  holder.children = [wall];
  wall.parentElement = holder;
  sandbox.document.body.children = [holder];
  sandbox._candidates = []; // no selector match, and no mutation record

  dom.sweep();
  assert.equal(wall.applied.display.value, "none");
  assert.equal(sent.length, 1);
});

test("nothing is reported when there is no wall", () => {
  const { sandbox, dom, sent } = makeSandbox();
  sandbox._candidates = [
    // A cookie banner: covering, short, asks for something — but names no blocker.
    node({
      cls: "cookie-banner",
      text: "We use cookies. Please accept to continue.",
      cs: style({ position: "fixed", zIndex: "9999" }),
    }),
    // An article about ad blocking, in the flow of the page where it belongs.
    node({
      cls: "article",
      text: "Please disable your ad blocker, say publishers. " + "Here is why they say it. ".repeat(40),
      cs: style({ position: "static" }),
    }),
  ];

  dom.sweep();
  assert.deepEqual(sent, []);
  for (const el of sandbox._candidates) {
    assert.equal(el.applied.display, undefined, "nothing may be hidden");
  }
});

test("a wall's text alone is not enough — it has to be covering something", () => {
  // The inverse of the article case: the right words, in the page's own flow.
  // Some sites print exactly this into the body as a fallback notice, and hiding
  // that is not worth the risk of hiding a paragraph.
  const { sandbox, dom, sent } = makeSandbox();
  sandbox._candidates = [
    node({
      cls: "notice",
      text: "Please disable your ad blocker.",
      cs: style({ position: "static" }),
    }),
  ];
  dom.sweep();
  assert.deepEqual(sent, []);
});

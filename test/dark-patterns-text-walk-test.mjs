// test/dark-patterns-text-walk-test.mjs
// Sieve — tests for the SHARED TEXT WALK in content/dark-patterns.js.
//
//   node --test test/
//
// Two detectors, timers and scarcity, each used to build their own TreeWalker
// over every text node under the scanned root. Two walks over the same nodes in
// the same pass, neither aware of the other, and the walk is the expensive half
// — measured at 57.8ms and 38.7ms on a 112,000-element page. They now declare a
// pattern and are handed the parent of anything that matches, so there is one
// walk however many detectors want text.
//
// What is pinned here is the contract that swap depends on, because getting it
// wrong is SILENT in both directions: a visitor that stops being called means a
// dark pattern is no longer caught and nothing says so, and a walk that visits
// a node twice means an element is judged twice and the page's tally drifts.
//
// Run in a vm sandbox against hand-built nodes, in the same style as
// test/anti-adblock-dom-test.mjs: what matters here is the traversal contract,
// and a fake we control states it more plainly than a DOM implementation would.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/dark-patterns.js", import.meta.url), "utf8");

// --- the fake page ---------------------------------------------------------

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function el(tag, children = []) {
  const node = {
    nodeType: ELEMENT_NODE,
    nodeName: tag.toUpperCase(),
    attrs: new Map(),
    childNodes: children,
    parentElement: null,
    setAttribute(k, v) {
      this.attrs.set(k, String(v));
    },
    getAttribute(k) {
      return this.attrs.has(k) ? this.attrs.get(k) : null;
    },
    hasAttribute(k) {
      return this.attrs.has(k);
    },
    querySelectorAll() {
      return [];
    },
    matches() {
      return false;
    },
    get isConnected() {
      return true;
    },
  };
  for (const child of children) child.parentElement = node;
  return node;
}

function text(value) {
  return { nodeType: TEXT_NODE, nodeValue: value, parentElement: null };
}

// Depth-first, document order — the order a real TreeWalker yields.
function flatten(root, out = []) {
  for (const child of root.childNodes || []) {
    out.push(child);
    if (child.nodeType === ELEMENT_NODE) flatten(child, out);
  }
  return out;
}

function makeSandbox(body) {
  const walkCounts = []; // one entry per createTreeWalker call
  const stored = {
    darkPatternsEnabled: true,
    darkPatternTimersEnabled: true,
    darkPatternGuiltCopyEnabled: true,
    darkPatternCheckboxesEnabled: true,
    darkPatternCookiesEnabled: true,
    darkPatternScarcityEnabled: true,
  };
  const sent = [];
  const timers = [];

  const document = {
    body,
    createTreeWalker(root, whatToShow) {
      const all = flatten(root).filter((n) =>
        whatToShow === 4 ? n.nodeType === TEXT_NODE : true
      );
      const record = { root, visited: 0 };
      walkCounts.push(record);
      let i = 0;
      return {
        nextNode() {
          if (i >= all.length) return null;
          record.visited++;
          return all[i++];
        },
      };
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  };

  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
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
    Promise,
    document,
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    Node: { ELEMENT_NODE, TEXT_NODE },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    setTimeout: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimeout() {},
    chrome: {
      runtime: {
        sendMessage: (msg) => {
          sent.push(msg);
          return { catch() {} };
        },
        onMessage: { addListener() {} },
      },
      storage: {
        local: {
          get: (defaults) => Promise.resolve({ ...defaults, ...stored }),
          set: () => Promise.resolve(),
        },
        onChanged: { addListener() {} },
      },
    },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return { sandbox, walkCounts, stored, sent, timers };
}

// Run the queued init() and let its awaits settle.
async function boot(env) {
  for (const t of env.timers.splice(0)) t.fn();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// --- the contract ----------------------------------------------------------

test("several text visitors share ONE walk over the root", async () => {
  const a = text("only 3 left in stock");
  const b = text("ends in 00:04:59");
  const body = el("body", [el("div", [a]), el("div", [b])]);
  const env = makeSandbox(body);

  const seen = { timers: [], scarcity: [] };
  env.sandbox.SieveDarkPatterns.registerText("timers", /ends in/i, (node) =>
    seen.timers.push(node)
  );
  env.sandbox.SieveDarkPatterns.registerText("scarcity", /only \d+ left/i, (node) =>
    seen.scarcity.push(node)
  );

  await boot(env);

  assert.equal(seen.timers.length, 1, "the timers visitor saw its match");
  assert.equal(seen.scarcity.length, 1, "the scarcity visitor saw its match");
  // The whole point: two visitors, one traversal.
  assert.equal(env.walkCounts.length, 1, "exactly one TreeWalker was built");
});

test("each text node is visited exactly once", async () => {
  const nodes = [];
  for (let i = 0; i < 25; i++) nodes.push(el("p", [text("line " + i)]));
  const body = el("body", nodes);
  const env = makeSandbox(body);

  env.sandbox.SieveDarkPatterns.registerText("timers", /line/i, () => {});
  await boot(env);

  assert.equal(env.walkCounts.length, 1);
  assert.equal(env.walkCounts[0].visited, 25, "25 text nodes, 25 visits");
});

test("a visitor whose type is switched off is not called", async () => {
  const body = el("body", [el("div", [text("only 3 left in stock")])]);
  const env = makeSandbox(body);
  env.stored.darkPatternScarcityEnabled = false;

  let calls = 0;
  env.sandbox.SieveDarkPatterns.registerText("scarcity", /only \d+ left/i, () => calls++);
  await boot(env);

  assert.equal(calls, 0);
});

test("blank and very short nodes never reach a pattern", async () => {
  const body = el("body", [
    el("div", [text("   ")]),
    el("div", [text("\n\t")]),
    el("div", [text("ok")]), // shorter than MIN_TEXT_LENGTH
    el("div", [text("a real line of text")]),
  ]);
  const env = makeSandbox(body);

  // registerText requires a real RegExp, so wrap one and record what it is
  // asked about. What is being pinned is which nodes reach the pattern at all.
  const tested = [];
  const pattern = /never matches this/i;
  const originalTest = pattern.test.bind(pattern);
  pattern.test = (value) => {
    tested.push(value);
    return originalTest(value);
  };
  env.sandbox.SieveDarkPatterns.registerText("timers", pattern, () => {});
  await boot(env);

  assert.deepEqual(tested, ["a real line of text"], "only the substantial node was tested");
});

test("a node whose parent is already marked is skipped", async () => {
  const marked = el("div", [text("only 3 left in stock")]);
  marked.setAttribute("data-sieve-dp", "scarcity");
  const body = el("body", [marked]);
  const env = makeSandbox(body);

  let calls = 0;
  env.sandbox.SieveDarkPatterns.registerText("scarcity", /only \d+ left/i, () => calls++);
  await boot(env);

  assert.equal(calls, 0, "an element judged once is not judged again");
});

test("a stateful g/y pattern is refused, because lastIndex would make it miss", async () => {
  const body = el("body", [el("div", [text("only 3 left in stock")])]);
  const env = makeSandbox(body);

  let calls = 0;
  env.sandbox.SieveDarkPatterns.registerText("scarcity", /only \d+ left/gi, () => calls++);
  await boot(env);

  assert.equal(calls, 0, "the g pattern was never registered");
});

test("an unknown pattern type is refused", async () => {
  const body = el("body", [el("div", [text("anything at all here")])]);
  const env = makeSandbox(body);

  let calls = 0;
  env.sandbox.SieveDarkPatterns.registerText("notAType", /anything/i, () => calls++);
  await boot(env);

  assert.equal(calls, 0);
});

test("one visitor throwing does not stop the others", async () => {
  const body = el("body", [el("div", [text("only 3 left in stock")])]);
  const env = makeSandbox(body);

  const reached = [];
  env.sandbox.SieveDarkPatterns.registerText("timers", /only/i, () => {
    throw new Error("boom");
  });
  env.sandbox.SieveDarkPatterns.registerText("scarcity", /only/i, () => reached.push(1));
  await boot(env);

  assert.equal(reached.length, 1, "the second visitor still ran");
});

test("the visitor is handed the matching node's PARENT element", async () => {
  const target = el("span", [text("only 3 left in stock")]);
  const body = el("body", [el("div", [target])]);
  const env = makeSandbox(body);

  let got = null;
  env.sandbox.SieveDarkPatterns.registerText("scarcity", /only \d+ left/i, (node) => {
    got = node;
  });
  await boot(env);

  assert.equal(got, target, "the element holding the text, not the text node");
});

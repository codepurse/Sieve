// test/tells-ladder-test.mjs
// Sieve — the intervention ladder in content/dark-patterns.js, as a table.
//
//   node --test test/
//
// The ladder is one small function, and the promise the settings page makes
// rests on it: "whatever you pick, something Sieve isn't sure about is only
// ever labelled". So that promise is pinned here for every setting, along with
// the two caps that keep a fix in its place — a detector's own maxLevel, and
// the fact that only some findings can be covered at all.
//
// Run in a vm sandbox with just enough of a page for the coordinator to load,
// as test/dark-patterns-text-walk-test.mjs does: chooseLevel touches no DOM.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/dark-patterns.js", import.meta.url), "utf8");

function load() {
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    document: { body: null, createTreeWalker() {}, querySelectorAll: () => [] },
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    setTimeout: () => 0,
    clearTimeout() {},
    chrome: {
      runtime: { sendMessage: () => Promise.resolve(), onMessage: { addListener() {} } },
      storage: { local: { get: (d) => Promise.resolve(d) }, onChanged: { addListener() {} } },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.SieveDarkPatterns;
}

const DP = load();
const { NOTE, LABEL, DEFUSE, COVER } = DP.LEVEL;

test("the ladder, setting by setting", () => {
  const table = {
    gentle: { low: NOTE, medium: LABEL, high: LABEL },
    balanced: { low: LABEL, medium: DEFUSE, high: COVER },
    firm: { low: LABEL, medium: COVER, high: COVER },
  };
  for (const [setting, row] of Object.entries(table)) {
    for (const [confidence, level] of Object.entries(row)) {
      assert.equal(DP.chooseLevel(confidence, setting), level, `${setting} / ${confidence}`);
    }
  }
});

test("something Sieve isn't sure about is never more than labelled", () => {
  for (const setting of ["gentle", "balanced", "firm", "something-new"]) {
    assert.ok(DP.chooseLevel("low", setting) <= LABEL, setting);
  }
});

test("a detector's own cap holds whatever the setting", () => {
  // Pre-ticked boxes cap themselves at a label; "watching" findings at a note.
  assert.equal(DP.chooseLevel("high", "firm", LABEL), LABEL);
  assert.equal(DP.chooseLevel("medium", "balanced", NOTE), NOTE);
  // A finding that can be fixed but not covered tops out at the fix.
  assert.equal(DP.chooseLevel("high", "balanced", DEFUSE), DEFUSE);
});

test("an unknown setting falls back to Balanced, an unknown confidence to a note", () => {
  assert.equal(DP.chooseLevel("medium", undefined), DEFUSE);
  assert.equal(DP.chooseLevel("certain", "firm"), NOTE);
});

test("claims are filed under their wording, with the numbers taken out", () => {
  assert.equal(DP.claimSignature("  Only 3 left\n in   STOCK! "), "only # left in stock!");
  assert.equal(DP.claimSignature("Only 3 left"), DP.claimSignature("Only 17 left"));
  assert.ok(DP.claimSignature("x".repeat(500)).length <= 120);
});

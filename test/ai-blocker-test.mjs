// test/ai-blocker-test.mjs
// Sieve — tests for the AI Blocker tier in background/safety-shield.js.
//
//   node --test test/
//
// Three things are pinned here, and each of them fails silently if it drifts:
//
//   1. The ID bands. Every tier clears its own band before writing it, so two
//      tiers sharing a band means enabling one wipes the other's rules — the
//      exact bug that moved piracy off 50000. The AI groups own 200000-229999
//      and nothing here may leave it.
//   2. The rule shapes. A redirect for the page the user navigated to, a block
//      for subresources, priority 1 so the shared priority-2 allowlist wins.
//      Redirecting a subresource would hand a page an HTML interstitial where
//      it asked for a script.
//   3. The curated list itself: group names that match the code, no domain in
//      two groups, no metadata key smuggled in as a domain, and — the one worth
//      the most — no vendor parent domain where only a chat product was meant.
//      `requestDomains` matches every subdomain, so listing openai.com would
//      take api.openai.com with it and break pages that never asked for the chat.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const LIST_PATH = new URL("../data/ai-sites.json", import.meta.url);
const raw = JSON.parse(fs.readFileSync(LIST_PATH, "utf8"));

// The module registers chrome listeners and reads storage at import time, so a
// working-enough chrome has to exist before it loads. Storage and the dynamic
// rule table are real here (in memory) because the assertions below are about
// what ends up in that table.
const store = {};
const changedListeners = [];
let dynamicRules = [];

globalThis.chrome = {
  runtime: {
    getURL: (p) => "ext://" + p,
    onInstalled: { addListener() {} },
    onStartup: { addListener() {} },
  },
  storage: {
    local: {
      async get(defaults) {
        const out = {};
        for (const [k, v] of Object.entries(defaults || {})) out[k] = k in store ? store[k] : v;
        return out;
      },
      async set(obj) {
        const changes = {};
        for (const [k, v] of Object.entries(obj)) {
          changes[k] = { oldValue: store[k], newValue: v };
          store[k] = v;
        }
        for (const fn of changedListeners) fn(changes, "local");
      },
      async remove(keys) {
        for (const k of [].concat(keys)) delete store[k];
      },
    },
    onChanged: { addListener: (fn) => changedListeners.push(fn) },
  },
  alarms: { create() {}, async get() { return null; }, onAlarm: { addListener() {} } },
  declarativeNetRequest: {
    async getDynamicRules() { return dynamicRules.slice(); },
    async updateDynamicRules({ removeRuleIds = [], addRules = [] }) {
      const gone = new Set(removeRuleIds);
      dynamicRules = dynamicRules.filter((r) => !gone.has(r.id)).concat(addRules);
    },
  },
};

// The module fetches its bundled list through chrome.runtime.getURL, so serve
// those URLs from disk and leave every other fetch alone.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const s = String(url);
  if (s.startsWith("ext://")) {
    const body = fs.readFileSync(new URL("../" + s.slice("ext://".length), import.meta.url), "utf8");
    return new Response(body, { status: 200 });
  }
  return realFetch(url, init);
};

const { AI_GROUPS, AI_ENABLED_KEYS, applyAiGroupRules, applyAllAiRules, isAiGroupEnabled } =
  await import("../background/safety-shield.js");

const band = (spec) => dynamicRules.filter((r) => r.id >= spec.idStart && r.id < spec.idEnd);

async function setGroup(name, on) {
  await chrome.storage.local.set({ [AI_GROUPS[name].key]: on });
  await applyAiGroupRules(name);
}

async function reset() {
  for (const name of Object.keys(AI_GROUPS)) await setGroup(name, false);
}

// --- the bands -------------------------------------------------------------

test("the three groups own separate 10000-wide bands inside 200000-229999", () => {
  const specs = Object.values(AI_GROUPS);
  assert.equal(specs.length, 3);
  for (const spec of specs) {
    assert.equal(spec.idEnd - spec.idStart, 10000);
    assert.ok(spec.idStart >= 200000 && spec.idEnd <= 230000, `${spec.key} is outside the AI bands`);
  }
  // No overlap with each other, and none with the tiers below (games end at
  // 179999, the ad/tracker tier ends at 199999).
  const sorted = specs.slice().sort((a, b) => a.idStart - b.idStart);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i].idStart >= sorted[i - 1].idEnd, "two AI groups share a band");
  }
  assert.ok(sorted[0].idStart >= 200000, "an AI group reaches into the ad/tracker tier");
});

test("every group is opt-in, keyed under the ss… namespace", async () => {
  assert.deepEqual(AI_ENABLED_KEYS, Object.values(AI_GROUPS).map((g) => g.key));
  for (const name of Object.keys(AI_GROUPS)) {
    assert.match(AI_GROUPS[name].key, /^ssAi/);
    assert.equal(await isAiGroupEnabled(name), false, `${name} must default to off`);
  }
});

// --- the rules -------------------------------------------------------------

test("nothing is written while every toggle is off", async () => {
  await reset();
  await applyAllAiRules();
  assert.deepEqual(dynamicRules, []);
});

test("a group on builds one redirect rule and one block rule over its own list", async () => {
  await reset();
  for (const [name, spec] of Object.entries(AI_GROUPS)) {
    await setGroup(name, true);
    const rules = band(spec);
    assert.equal(rules.length, 2, `${name}: redirect + block`);

    const [redirect, block] = rules;
    assert.equal(redirect.id, spec.idStart);
    assert.equal(redirect.priority, 1, "priority 1, so the priority-2 allowlist overrides it");
    assert.equal(redirect.action.type, "redirect");
    assert.equal(
      redirect.action.redirect.extensionPath,
      `/pages/blocked.html?category=${spec.category}`
    );
    assert.deepEqual(redirect.condition.resourceTypes, ["main_frame"]);
    assert.deepEqual(redirect.condition.requestDomains, raw[name]);

    assert.equal(block.priority, 1);
    assert.equal(block.action.type, "block");
    assert.ok(!block.condition.resourceTypes.includes("main_frame"), "never redirect a subresource");
    assert.ok(block.condition.resourceTypes.includes("sub_frame"));
    assert.deepEqual(block.condition.requestDomains, raw[name]);
  }
  assert.equal(dynamicRules.length, 6, "three groups on, six rules, no overlap");
});

test("turning one group off leaves the other two alone", async () => {
  await reset();
  for (const name of Object.keys(AI_GROUPS)) await setGroup(name, true);

  await setGroup("writing", false);
  assert.equal(band(AI_GROUPS.writing).length, 0);
  assert.equal(band(AI_GROUPS.chatbots).length, 2);
  assert.equal(band(AI_GROUPS.companions).length, 2);
});

test("no rule ever escapes the AI bands", async () => {
  await reset();
  for (const name of Object.keys(AI_GROUPS)) await setGroup(name, true);
  for (const r of dynamicRules) {
    assert.ok(r.id >= 200000 && r.id < 230000, `rule ${r.id} escaped the AI bands`);
  }
  await reset();
});

test("an unknown group name throws rather than silently doing nothing", async () => {
  await assert.rejects(() => applyAiGroupRules("image-generators"), /Unknown AI group/);
});

// --- the curated list ------------------------------------------------------

test("the file carries exactly the groups the code expects", () => {
  const groups = Object.keys(raw).filter((k) => !k.startsWith("_"));
  assert.deepEqual(groups.sort(), Object.keys(AI_GROUPS).sort());
});

test("every entry is a bare lowercase domain, not a URL or a wildcard", () => {
  for (const name of Object.keys(AI_GROUPS)) {
    for (const d of raw[name]) {
      assert.equal(d, d.toLowerCase(), `${d} is not lowercase`);
      assert.ok(!/^[_*.]/.test(d), `${d} starts with a wildcard, dot or metadata marker`);
      assert.ok(!d.includes("/") && !d.includes(":"), `${d} looks like a URL, not a domain`);
      assert.match(d, /^[a-z0-9.-]+\.[a-z]{2,}$/, `${d} is not a plain domain`);
    }
  }
});

test("no domain appears in two groups, and none is listed twice", () => {
  const seen = new Map();
  for (const name of Object.keys(AI_GROUPS)) {
    for (const d of raw[name]) {
      assert.ok(!seen.has(d), `${d} is in both ${seen.get(d)} and ${name}`);
      seen.set(d, name);
    }
  }
});

test("no listed domain is the parent of another, which would make it redundant", () => {
  // requestDomains matches a domain AND all its subdomains, so listing both
  // example.com and chat.example.com just wastes an entry — and, worse, hides
  // the fact that the parent was blocked wholesale.
  const all = Object.keys(AI_GROUPS).flatMap((n) => raw[n]);
  const set = new Set(all);
  for (const d of all) {
    const parts = d.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join(".");
      assert.ok(!set.has(parent), `${d} is already covered by ${parent}`);
    }
  }
});

test("the vendors' non-chat domains stay out of the list", () => {
  // Each of these serves an API, docs or a search engine as well as (or instead
  // of) a chat, so listing it would break pages that never asked for the chat.
  // The chat products themselves are listed instead.
  const mustNotBlock = [
    "openai.com",
    "anthropic.com",
    "google.com",
    "bing.com",
    "microsoft.com",
    "mistral.ai",
    "github.com",
    "huggingface.co",
    "grammarly.com",
  ];
  const all = new Set(Object.keys(AI_GROUPS).flatMap((n) => raw[n]));
  for (const d of mustNotBlock) {
    assert.ok(!all.has(d), `${d} must not be blocked wholesale`);
  }
  // …and the chat products they stand in for ARE listed.
  for (const d of ["chatgpt.com", "claude.ai", "gemini.google.com", "copilot.microsoft.com"]) {
    assert.ok(all.has(d), `${d} should be in the chatbots list`);
  }
});

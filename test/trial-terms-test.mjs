// test/trial-terms-test.mjs
// Sieve — reading a free trial's terms (content/trial-terms.js).
//
//   node --test test/
//
// The free-trial warning says, beside the offer, "After 7 days, this becomes
// $14.99 a month", and puts a date on it. Every word of that comes from
// parseTerms(), so it is pinned here against the ways shops actually write
// it — and against the ways a careless reader would get it wrong: the "$0
// today" that is the trial rather than the price, the page that says no card
// is needed, the offer that never says it renews.
//
// The file is loaded in a vm sandbox with just enough of the coordinator for
// it to register; the reader itself is pure.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/trial-terms.js", import.meta.url), "utf8");

function load() {
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    SieveDarkPatterns: { registerText() {}, register() {}, ensureUI: () => Promise.resolve(false) },
    chrome: {
      runtime: { sendMessage: () => Promise.resolve(null) },
      storage: { local: { get: (d) => Promise.resolve(d) } },
    },
    setTimeout,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.SieveTrials;
}

const { parseTerms, trialDates } = load();
const plain = (v) => JSON.parse(JSON.stringify(v)); // across the vm boundary

test("the common ways a trial and its price are written", () => {
  const cases = [
    ["Start your 7-day free trial. Then $14.99/month.", { n: 7, unit: "day" }, { amount: "$14.99", interval: "month" }],
    ["Try free for 30 days, then $9.99 per month", { n: 30, unit: "day" }, { amount: "$9.99", interval: "month" }],
    ["1 month free, then £79.99 a year", { n: 1, unit: "month" }, { amount: "£79.99", interval: "year" }],
    ["First month free! Afterwards 12,99 € monthly", { n: 1, unit: "month" }, { amount: "12,99 €", interval: "month" }],
    ["Free trial for two weeks — $5/wk after", { n: 2, unit: "week" }, { amount: "$5", interval: "week" }],
    ["A 14 day trial, then €8 every month", { n: 14, unit: "day" }, { amount: "€8", interval: "month" }],
  ];
  for (const [text, length, price] of cases) {
    const t = plain(parseTerms(text));
    assert.deepEqual(t.length, length, text);
    assert.deepEqual(t.price, price, text);
  }
});

test("'$0 today' is the trial, not the price that follows it", () => {
  const t = plain(parseTerms("7 days free — $0.00/month today, then $19.99/month"));
  assert.deepEqual(t.price, { amount: "$19.99", interval: "month" });
});

test("a price with no interval is not a subscription price", () => {
  // A one-off price on the same page must not become "this becomes $49".
  assert.equal(parseTerms("Free trial. Also: the starter kit is $49.").price, null);
});

test("renewal wording is recognised, and its absence too", () => {
  for (const text of [
    "Then $14.99/month",
    "renews automatically",
    "Billed annually",
    "Cancel anytime",
    "until you cancel",
    "after your free trial ends",
    "We'll auto-charge your card",
  ]) {
    assert.equal(parseTerms(text).renews, true, text);
  }
  for (const text of ["Start your free trial today", "Then explore the dashboard", "Rated 4.8 by renewal experts"]) {
    assert.equal(parseTerms(text).renews, false, text);
  }
});

test("'no credit card required' is noticed", () => {
  for (const text of ["14-day free trial. No credit card required.", "No card needed", "Try it without a credit card", "No payment details required"]) {
    assert.equal(parseTerms(text).noCard, true, text);
  }
  assert.equal(parseTerms("Add your card to start the trial").noCard, false);
});

test("an absurd length is not a trial length", () => {
  assert.equal(parseTerms("900 days free").length, null);
  assert.deepEqual(plain(parseTerms("a 3 month free trial").length), { n: 3, unit: "month" });
});

test("the end date and the reminder date", () => {
  const start = new Date(2026, 9, 8, 15, 30).getTime(); // Thu 8 Oct 2026, 3:30 pm

  const week = trialDates({ n: 7, unit: "day" }, start);
  assert.equal(new Date(week.end).getDate(), 15);
  // Two days before, from the start of that day.
  assert.deepEqual([new Date(week.remind).getDate(), new Date(week.remind).getHours()], [13, 0]);

  const month = trialDates({ n: 1, unit: "month" }, start);
  assert.equal(new Date(month.end).getMonth(), 10); // November

  const three = trialDates({ n: 3, unit: "day" }, start);
  assert.equal(new Date(three.remind).getDate(), 10, "one day before a short trial");

  const one = trialDates({ n: 1, unit: "day" }, start);
  assert.equal(one.end - one.remind, 3 * 3600000, "three hours before a one-day trial");
});

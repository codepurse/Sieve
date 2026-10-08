// content/patterns/trials.js
// Sieve — Dark Pattern Blocker: free trials that turn into payments.
//
// "Start your free trial" is the offer in large type. What it becomes — "then
// $14.99/month, billed until you cancel" — is the small print, and the date it
// becomes that is not printed at all. The business model is people forgetting.
// So when a page offers a trial that will start charging by itself, Sieve
// reads the terms and says them plainly beside the offer: how long, how much,
// and the day the first payment falls due. And it offers to remind you two
// days before, on this device, with no account and no email.
//
// What counts. A trial is only called one that becomes a payment when the
// page shows that it will: a card form on the page, or wording that says so
// ("then $14.99/month", "renews", "billed", "until you cancel") on a page with
// a button to sign up. A trial that needs no card ("no credit card required")
// just ends, and is left alone, as is a review that merely describes one.
//
// THIS FILE IS THE SMALL HALF, injected into every page: it only notices the
// words "free trial" and checks for a reminder that has fallen due. Reading
// the terms, and everything Sieve says about them, is in content/trial-
// terms.js, which the service worker injects only into a page that has those
// words — most pages never do.
//
// The reminder itself lives in the service worker (background/trial-
// reminders.js). When it falls due, it is shown at the top of whatever page
// you are on — which is why that check runs on every page, whether or not
// this detector is switched on: a reminder you asked for is kept even if you
// turn the warnings off afterwards.

(() => {
  "use strict";

  const TYPE = "trials";

  // Any of these in a text node sends its element here. Deliberately broad;
  // content/trial-terms.js is what decides.
  const TRIAL_RE = /\bfree\s+trial\b|\btry\s+(?:it\s+)?(?:for\s+)?free\b|\b(?:\d{1,3}|one|two|three|seven|fourteen|thirty)[\s-]*(?:day|week|month)s?\s+free\b|\bfirst\s+(?:day|week|month)\s+free\b/i;

  // The text that belongs with the match: climb while the block stays short
  // enough to be one offer rather than the whole page.
  const MAX_CONTEXT = 700;

  function offerBlock(el) {
    let block = el;
    while (block.parentElement && block.parentElement !== document.body) {
      const text = block.parentElement.textContent || "";
      if (text.length > MAX_CONTEXT) break;
      block = block.parentElement;
    }
    return block;
  }

  function ask(message) {
    try {
      const pending = chrome.runtime.sendMessage(message);
      return pending && typeof pending.then === "function" ? pending.catch(() => null) : Promise.resolve(null);
    } catch (_) {
      return Promise.resolve(null);
    }
  }

  // One finding per page: a pricing page says "free trial" a dozen times.
  // Matches are gathered briefly and the best-described offer is the one used.
  const GATHER_MS = 600;
  let ctx = null;
  let gathered = [];
  let gatherTimer = null;
  let toldFor = "";

  function flush() {
    gatherTimer = null;
    const blocks = gathered.filter((b) => b.isConnected);
    gathered = [];
    if (toldFor === location.href || blocks.length === 0) return;
    toldFor = location.href;

    ctx.loadPart("trials").then((ready) => {
      if (!ready) return;
      const best = window.SieveTrials.judge(blocks);
      if (best && best.block.isConnected) ctx.tell(best.block, window.SieveTrials.describe(best.terms, ctx, ask));
    });
  }

  function onTrialText(el, context) {
    ctx = context;
    if (ctx.isMarked(el) || toldFor === location.href) return;
    ctx.mark(el, TYPE);
    gathered.push(offerBlock(el));
    if (gatherTimer === null) gatherTimer = setTimeout(flush, GATHER_MS);
  }

  // One cheap read per page: the service worker keeps the earliest due time in
  // its own small key, so a page with nothing due asks nothing more.
  function checkReminders() {
    const dp = window.SieveDarkPatterns;
    chrome.storage.local
      .get({ trialRemindersNext: 0 })
      .then(({ trialRemindersNext }) => {
        if (!trialRemindersNext || trialRemindersNext > Date.now()) return null;
        return ask({ type: "sieve:trial-due" });
      })
      .then((due) => {
        if (!Array.isArray(due) || due.length === 0 || !dp) return null;
        return Promise.all([dp.loadPart("trials"), dp.loadPart("ui")]).then(([terms, ui]) => {
          if (terms && ui) window.SieveTellsUI.showBanner(window.SieveTrials.reminderBanner(due[0], ask));
        });
      })
      .catch(() => {});
  }

  window.SieveDarkPatterns.registerText(TYPE, TRIAL_RE, onTrialText);
  window.SieveDarkPatterns.register(TYPE, { scanText: true });
  checkReminders();
})();

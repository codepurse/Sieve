// background/licence-check.js
// Sieve Supporter — the weekly licence check, on a timer.
//
// common/pro.js re-checks a Supporter key with Polar about once a week, so a
// refunded key stops working. The settings page asks when it opens, but
// someone who never opens it again would never be asked; so this asks too,
// from the background. An alarm wakes every few hours and refreshIfDue()
// decides whether a check is due, so most wakes cost one storage read and
// send nothing. Without a key nothing is ever sent.
//
// It runs here, on a timer, and not from the popup or the block page, so the
// request never says anything about what someone is doing: one from the block
// page would tell Polar the moment a blocked site stopped them.

import "../common/pro.js";

const ALARM = "sieve-licence-check";
const EVERY_MINUTES = 6 * 60;

function check() {
  const P = self.SievePro;
  if (!P) return;
  P.refreshIfDue().catch((err) => console.warn("[Sieve] licence check failed:", err));
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) check();
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: EVERY_MINUTES });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: EVERY_MINUTES });
  check();
});

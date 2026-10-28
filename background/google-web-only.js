// background/google-web-only.js
// Sieve — "Show web results only" (Site Cleanup → Google Search).
//
// Google has a tab that is nothing but links: Web, at /search?…&udm=14. No AI
// Overview, no "People also ask", no video rows, no product grids. This switch
// sends every search there, by adding udm=14 to a Google search before it is
// requested (rules/google-web-only-rules.json), so the cluttered page is never
// loaded and there is nothing to hide. It is the robust half of the Google card:
// the hiding switches depend on Google's markup, this depends only on a URL
// parameter Google has kept since it added the tab in 2024.
//
// The rule only touches a search that has NOT chosen a tab yet — no udm= and no
// tbm= in the address. So Images (udm=2), News (tbm=nws), Videos, Shopping, AI
// Mode (udm=50) and the rest all still open as asked; only "All" becomes "Web".
// That is also what stops it looping: the redirected address carries udm=14.
//
// Why the regex looks the way it does. declarativeNetRequest regexes are RE2,
// which has no lookahead, so "no udm= anywhere" cannot be said directly; the
// rule instead spells out a query string whose every parameter is NOT named
// udm or tbm. test/google-cleanup-test.mjs pins that against real addresses.
//
// It also has to compile inside Chrome's regex memory limit (2 KB), and that
// limit is not intuitive. A rule that is over it is not rejected at install —
// the ruleset still enables, the rule just never matches — so the first version
// shipped "working" in every unit test and redirected nothing. Measured with
// isRegexSupported in Edge, October 2026:
//   - "https?" pushed it over: RE2 stores a fixed leading "^https://www.google."
//     outside the compiled program, and the "?" made that text part of it.
//     Google is HSTS-preloaded, so a search is always upgraded to https before
//     it is requested, and https alone catches every one.
//   - a host written [a-z]{2,3}(\.[a-z]{2})? cost more than [a-z]+(\.[a-z]+)?.
//   - the same pattern can pass case-insensitive and fail case-sensitive.
// So any change here gets re-checked in a real browser with the exact flags
// the rule ships with (isUrlFilterCaseSensitive: true — Google writes its
// parameter names in lower case); this one passes with room for a little
// more, but not for a second copy of the parameter pattern.
//
// Priority 3, like YouTube's Restricted Mode rules, so the shared allowlist's
// priority-2 allow rule does not stand it down — it is not a block, it is a
// view the user chose. It never opens anything a block rule would stop: the
// redirected address is matched afresh, and a site the user blocked is still
// blocked there.
//
// Toggled like the YouTube rulesets: a static ruleset shipped disabled and
// flipped with updateEnabledRulesets, so no dynamic rule is touched.

const STORAGE_KEY = "siteCleanup";
const SITE = "google";
const RULESET_ID = "google_web_only_ruleset"; // matches manifest rule_resources id

// The switch only counts while the card's master switch is on — the same rule
// content/google-clean.js applies to its classes.
function isWebOnlyOn(bag) {
  const site = (bag && bag[SITE]) || {};
  return !!site.enabled && !!site.webOnly;
}

async function applyWebOnlyRuleset() {
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
  const on = isWebOnlyOn(stored[STORAGE_KEY]);
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    on ? { enableRulesetIds: [RULESET_ID] } : { disableRulesetIds: [RULESET_ID] }
  );
}

// Every Site Cleanup switch writes the same nested key; re-syncing is
// idempotent and cheaper than working out what moved.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) applyWebOnlyRuleset();
});

// Enabled static rulesets reset to the manifest default (off) on an update.
chrome.runtime.onInstalled.addListener(() => {
  applyWebOnlyRuleset();
});

export { isWebOnlyOn, applyWebOnlyRuleset, STORAGE_KEY, SITE, RULESET_ID };

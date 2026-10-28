// background/youtube-restrict.js
// Sieve — "Restricted Mode" and "Strict Restricted Mode" (Site Cleanup → YouTube).
//
// YouTube's Restricted Mode is a switch in its own menu, kept in a cookie, and
// it is off whenever you are signed out — so a filter you set yourself is one
// click, or one private window, from gone. A supporter found that not even
// their AdGuard DNS, set to enforce SafeSearch everywhere else, could hold it.
//
// Google's own answer, the one schools and offices use, is a request header:
// YouTube-Restrict: Moderate or Strict on requests to YouTube. With it present
// YouTube applies Restricted Mode signed in or out, hides comments, and its
// menu says "Turned on by your network administrator" over a switch that
// cannot be used (all three verified on live YouTube, October 2026). That is
// what these rules send. They are Google's two levels, not ours: Strict lets
// fewer videos through.
//
// The hosts are the ones Google lists for the header: youtube.com (www, m),
// youtube-nocookie.com (embeds), and the two googleapis.com hosts YouTube's
// apps and player call. The resource types are the ones that carry a page or
// its data — documents, frames, and the fetches the site makes as you browse.
//
// Priority 3, deliberately above the shared allowlist's priority-2 allow rule.
// A modifyHeaders rule only applies when it outranks every allow rule that
// matches, so at priority 1 adding youtube.com to the Allowlist — which means
// "don't block this site" — would quietly switch Restricted Mode off as well.
//
// Toggled the way the search-suggestion block is (background/youtube-suggest.js):
// two static rulesets shipped disabled in the manifest, at most one enabled,
// flipped with updateEnabledRulesets, so no dynamic rule is ever touched.

const STORAGE_KEY = "siteCleanup";
const SITE = "youtube";
const MODERATE_RULESET_ID = "youtube_restrict_moderate_ruleset"; // matches manifest rule_resources ids
const STRICT_RULESET_ID = "youtube_restrict_strict_ruleset";

// "strict", "moderate" or "off". The switches only count while the site's
// master switch is on, as every Site Cleanup switch does, and Strict wins when
// both are on: the settings page greys Restricted Mode out under it.
function restrictLevel(bag) {
  const site = (bag && bag[SITE]) || {};
  if (!site.enabled) return "off";
  if (site.restrictedModeStrict) return "strict";
  if (site.restrictedMode) return "moderate";
  return "off";
}

// Bring the two static rulesets in line with the stored switches.
async function applyRestrictRulesets() {
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
  const level = restrictLevel(stored[STORAGE_KEY]);
  const on = level === "strict" ? [STRICT_RULESET_ID] : level === "moderate" ? [MODERATE_RULESET_ID] : [];
  const off = [MODERATE_RULESET_ID, STRICT_RULESET_ID].filter((id) => !on.includes(id));
  await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: on, disableRulesetIds: off });
}

// Every Site Cleanup switch writes the same nested key; re-syncing on each is
// idempotent and one API call.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) applyRestrictRulesets();
});

// Enabled static rulesets reset to the manifest default (off) when the
// extension updates, so an update would otherwise drop Restricted Mode.
chrome.runtime.onInstalled.addListener(() => {
  applyRestrictRulesets();
});

export { restrictLevel, applyRestrictRulesets, STORAGE_KEY, SITE, MODERATE_RULESET_ID, STRICT_RULESET_ID };

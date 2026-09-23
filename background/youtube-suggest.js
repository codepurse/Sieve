// background/youtube-suggest.js
// Sieve — the network half of "Hide search suggestions" (Site Cleanup → YouTube).
//
// The visible half is one CSS rule in content/youtube-clean.css, which hides the
// dropdown once it has rendered. That alone would leave the interesting part
// untouched: YouTube asks for suggestions the moment the box is FOCUSED (with an
// empty query, which returns what it knows about you) and then again on every
// keystroke. Hiding the answer does not stop the question — you would still be
// sending each half-typed search to Google to have a list of temptations built
// out of your watch history. So this file stops the request instead.
//
// Which is the whole design: the CSS is the fallback, not the mechanism. With
// the requests blocked the dropdown has nothing to render and collapses to zero
// height on its own (verified on both www.youtube.com and m.youtube.com — the
// search box keeps working normally, no error, no gap). The CSS only earns its
// keep if Google moves the endpoint somewhere these rules don't reach, or serves
// a list from somewhere other than the network.
//
// The rule (rules/youtube-suggest-rules.json) is deliberately narrow:
//   requestDomains  youtube.com and its subdomains
//   urlFilter       /complete/search
// Both the desktop and the mobile site ask suggestqueries-clients6.youtube.com
// for /complete/search over XHR. Matching the PATH under youtube.com rather than
// that one hostname survives Google rotating the subdomain, and staying inside
// youtube.com is what keeps this off suggestqueries.google.com — the host that
// also answers for Google Search. A switch in the YouTube card has no business
// changing what Google's own search box does.
//
// Toggled the way the Prediction Markets ruleset is: a static ruleset shipped
// disabled in the manifest and flipped with updateEnabledRulesets, which leaves
// every dynamic rule (gambling big list, custom blocks, allowlist, the
// Financial Protection / Safety Shield / tracker bands) completely untouched.
//
// Note there is no allowlist exemption here, and none is wanted: this blocks a
// request YouTube makes, on YouTube, because the user asked for it on YouTube.

const STORAGE_KEY = "siteCleanup";
const SITE = "youtube";
const RULESET_ID = "youtube_suggest_ruleset"; // matches manifest rule_resources id

// The sub-toggle only counts while the site's master switch is on — the same
// rule content/site-cleanup.js applies to every class it puts on <html>, so the
// two halves of this feature can never disagree about whether it is running.
function isSuggestBlockOn(bag) {
  const site = (bag && bag[SITE]) || {};
  return !!site.enabled && !!site.hideSearchSuggestions;
}

// Bring the static ruleset in line with the stored toggle.
async function applySuggestRuleset() {
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
  const on = isSuggestBlockOn(stored[STORAGE_KEY]);
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    on ? { enableRulesetIds: [RULESET_ID] } : { disableRulesetIds: [RULESET_ID] }
  );
}

// Every Site Cleanup switch writes the same nested key, so this fires for
// changes that have nothing to do with suggestions. Re-syncing is idempotent
// and costs one API call, which is cheaper than working out what moved.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) applySuggestRuleset();
});

// The set of enabled static rulesets survives a browser restart but RESETS to
// the manifest default (enabled: false) when the extension updates — so an
// update would silently turn this off without re-syncing it here.
chrome.runtime.onInstalled.addListener(() => {
  applySuggestRuleset();
});

export { isSuggestBlockOn, applySuggestRuleset, STORAGE_KEY, SITE, RULESET_ID };

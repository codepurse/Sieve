// background/retired-tracker-blocker.js
// Sieve — clears away what tracker blocking left behind.
//
// Until 1.5.1 the Ad & Trackers section blocked two kinds of domain: ad networks
// (EasyList) and trackers (EasyPrivacy). Tracker blocking was removed then. Ads
// are clutter on the page, which is Sieve's business; trackers are invisible
// privacy work, a different job done better by tools built for it. The ad half
// stays, in the section now called Ads.
//
// The code is gone, but an update does not take away what it left on a profile
// that had it switched on:
//
//   - its dynamic network rules, ids 180000-189999, which would go on blocking
//     with nothing left to manage them (background/ad-tracker-blocker.js now only
//     owns 190000-199999, the ad networks);
//   - its setting, ssAdTrackerEnabled;
//   - its "Tracking requests" counter in the Protection Dashboard's history.
//
// So on every install and update, this removes those three, and nothing that
// belongs to the ad blocker. Each step is idempotent and costs next to nothing
// on a profile that never had trackers on. Once no profile can still carry
// 1.5.0's state, this file can go too.

const RULE_ID_START = 180000;
const RULE_ID_END = 190000; // exclusive: 190000 is the ad networks' first id

const STORAGE_KEYS = ["ssAdTrackerEnabled"];

// Its counter in common/stats.js's sieveStats.
const STATS_KEY = "sieveStats";
const STATS_CATEGORIES = ["adTrackers"];

async function removeRules() {
  // Removing an id that is not there is allowed, so the whole band is named
  // rather than fetched: getDynamicRules() would drag every other band's rules,
  // the gambling list among them, across the process boundary to find out.
  const removeRuleIds = [];
  for (let id = RULE_ID_START; id < RULE_ID_END; id++) removeRuleIds.push(id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds });
}

async function removeStats() {
  const { [STATS_KEY]: stats } = await chrome.storage.local.get({ [STATS_KEY]: {} });
  if (!stats || typeof stats !== "object") return;
  let changed = false;
  for (const day of Object.values(stats)) {
    if (!day || typeof day !== "object") continue;
    for (const category of STATS_CATEGORIES) {
      if (category in day) {
        delete day[category];
        changed = true;
      }
    }
  }
  if (changed) await chrome.storage.local.set({ [STATS_KEY]: stats });
}

async function clearRetiredTrackerBlocker() {
  // Independent steps: one failing must not leave the others undone.
  const steps = [removeRules, () => chrome.storage.local.remove(STORAGE_KEYS), removeStats];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      console.warn("[Sieve] clearing the retired tracker blocker:", error);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  clearRetiredTrackerBlocker();
});

export { clearRetiredTrackerBlocker, RULE_ID_START, RULE_ID_END, STORAGE_KEYS, STATS_CATEGORIES };

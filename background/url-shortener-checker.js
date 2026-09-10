// background/url-shortener-checker.js
// Sieve — URL Shortener Resolver (blocker-check layer, Step 4).
//
// Takes a resolved URL and checks its hostname against every blocker the user
// currently has enabled, reusing the EXISTING stored rule data and toggle keys.
// It does not create new lists or new rules; it reads what the existing modules
// already keep in chrome.storage.local, IndexedDB, dynamic DNR rules, and bundled
// JSON/ruleset files.
//
// The allowlist is checked first: an allowlisted destination is always allowed,
// matching the priority-2 DNR allow rule that overrides every blocker.

import {
  getStoredScamList,
  isScamEnabled,
  isTradingEnabled,
  isMlmEnabled,
} from "./financial-protection.js";

import {
  getStoredSafetyList,
  isSafetyListEnabled,
  isGoreShockEnabled,
  isDatingEnabled,
} from "./safety-shield.js";

const GAMBLING_ENABLED_KEY = "gamblingEnabled";
const PREDICTION_MARKET_ENABLED_KEY = "predictionMarketEnabled";
const ALLOWLIST_KEY = "allowlist";

// ---------------------------------------------------------------------------
// Memoising the domain sets.
//
// A click on a shortened link has a hard three-second deadline in the content
// script, after which it fails open and the user goes to the short URL
// unchecked. Everything below used to be rebuilt from scratch inside that
// window, on every click: thirteen categories, each re-fetching and re-parsing
// its list into a fresh Set of up to a couple of hundred thousand entries — and
// the gambling one additionally calling getDynamicRules(), which marshals every
// dynamic rule the extension owns, packed ten thousand domains to a rule,
// across the process boundary. On a slow machine the check lost its own race.
//
// So each set is built once and kept. The worker is torn down often enough that
// this is not a long-lived cache; within one wake it turns thirteen rebuilds
// per click into thirteen rebuilds, once.
//
// Invalidated by storage.onChanged below, because the lists genuinely do change
// — a weekly refresh, a toggle flip, an allowlist edit.
const setCache = new Map();

function cachedSet(name, build) {
  let hit = setCache.get(name);
  if (!hit) {
    // The PROMISE is cached, not the resolved value, so two clicks in flight at
    // once share one build instead of racing to do it twice.
    hit = build().catch((err) => {
      setCache.delete(name); // a failed build must not be remembered
      throw err;
    });
    setCache.set(name, hit);
  }
  return hit;
}

/** Drop the memoised sets. Exported so tests can reset between cases. */
export function invalidateShortenerCaches() {
  setCache.clear();
}

// Any of these changing means at least one set is now stale. Cheaper and far
// less error-prone than mapping each key to the sets it feeds — rebuilding is
// only paid on the next click, and list edits are rare.
chrome.storage?.onChanged?.addListener((_changes, area) => {
  if (area === "local" || area === "session") invalidateShortenerCaches();
});

// ---------------------------------------------------------------------------
// Domain matching — mirrors DNR requestDomains semantics (domain + subdomains).
// ---------------------------------------------------------------------------
function normalizeHostname(hostname) {
  return String(hostname || "").toLowerCase().replace(/^www\./, "");
}

function hostnameMatches(hostname, domainSet) {
  let h = normalizeHostname(hostname);
  while (h) {
    if (domainSet.has(h)) return true;
    const dot = h.indexOf(".");
    if (dot === -1) break;
    h = h.slice(dot + 1);
  }
  return false;
}

function toDomainSet(items) {
  const set = new Set();
  if (!Array.isArray(items)) return set;
  for (const d of items) {
    const s = String(d).trim().toLowerCase();
    if (s) set.add(s);
  }
  return set;
}

// ---------------------------------------------------------------------------
// Load existing blocker domain data.
// ---------------------------------------------------------------------------
async function fetchJsonArray(path) {
  try {
    const res = await fetch(chrome.runtime.getURL(path));
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (err) {
    console.warn("[Sieve] Could not load existing blocker data:", path, err);
    return [];
  }
}

// Extract every requestDomains entry from a bundled static DNR ruleset.
async function ruleDomainsFrom(path) {
  const domains = [];
  try {
    const rules = await fetchJsonArray(path);
    for (const rule of rules) {
      const list = rule?.condition?.requestDomains;
      if (Array.isArray(list)) domains.push(...list);
    }
  } catch (err) {
    console.warn("[Sieve] Could not parse ruleset:", path, err);
  }
  return domains;
}

function getAllowlist() {
  return cachedSet("allowlist", async () => {
    const { allowlist } = await chrome.storage.local.get({ [ALLOWLIST_KEY]: [] });
    return toDomainSet(allowlist);
  });
}

function getGamblingDomains() {
  return cachedSet("gambling", async () => {
    const domains = await ruleDomainsFrom("rules/gambling-rules.json");
    try {
      // The single most expensive call in this file: with the big list
      // installed this hands back tens of rules carrying hundreds of thousands
      // of domain strings. Worth doing once per worker wake; ruinous per click.
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      for (const rule of rules) {
        // The gambling blocker owns dynamic-rule IDs below 10000.
        if (rule.id >= 10000) continue;
        const list = rule?.condition?.requestDomains;
        if (Array.isArray(list)) domains.push(...list);
      }
    } catch (err) {
      console.warn("[Sieve] Could not read gambling dynamic rules:", err);
    }
    return toDomainSet(domains);
  });
}

function getPredictionMarketDomains() {
  return cachedSet("predictionMarkets", async () =>
    toDomainSet(await ruleDomainsFrom("rules/prediction-market-rules.json"))
  );
}

function getTradingDomains() {
  return cachedSet("trading", async () => toDomainSet(await fetchJsonArray("data/trading-sites.json")));
}

function getMlmDomains() {
  return cachedSet("mlm", async () => toDomainSet(await fetchJsonArray("data/mlm-sites.json")));
}

function getGoreShockDomains() {
  return cachedSet("goreShock", async () =>
    toDomainSet(await fetchJsonArray("data/gore-shock-sites.json"))
  );
}

function getDatingDomains() {
  return cachedSet("dating", async () => toDomainSet(await fetchJsonArray("data/dating-sites.json")));
}

function getStoredSafetyDomains(name) {
  return cachedSet("safety:" + name, async () => {
    try {
      const { domains } = await getStoredSafetyList(name);
      return toDomainSet(domains);
    } catch (err) {
      console.warn("[Sieve] Could not read safety list:", name, err);
      return new Set();
    }
  });
}

function getStoredScamDomains() {
  return cachedSet("scam", async () => {
    try {
      const { domains } = await getStoredScamList();
      return toDomainSet(domains);
    } catch (err) {
      console.warn("[Sieve] Could not read scam list:", err);
      return new Set();
    }
  });
}

// ---------------------------------------------------------------------------
// Toggle helpers (defaults match the existing modules).
// ---------------------------------------------------------------------------
async function isGamblingEnabled() {
  const s = await chrome.storage.local.get({ [GAMBLING_ENABLED_KEY]: true });
  return !!s[GAMBLING_ENABLED_KEY];
}

async function isPredictionMarketEnabled() {
  const s = await chrome.storage.local.get({ [PREDICTION_MARKET_ENABLED_KEY]: false });
  return !!s[PREDICTION_MARKET_ENABLED_KEY];
}

// ---------------------------------------------------------------------------
// Main entry: check a resolved URL against enabled blockers.
// Returns { action: "allow", resolvedUrl } or { action: "block", category, resolvedUrl }.
// ---------------------------------------------------------------------------
export async function checkResolvedUrl(resolvedUrl) {
  let url;
  try {
    url = new URL(resolvedUrl);
  } catch {
    return { action: "allow", resolvedUrl };
  }

  const hostname = normalizeHostname(url.hostname);

  // Allowlist wins, just like the priority-2 DNR allow rule.
  if (hostnameMatches(hostname, await getAllowlist())) {
    return { action: "allow", resolvedUrl };
  }

  // Each check is independent; the first match decides the category shown.
  const checks = [
    { enabled: isGamblingEnabled, domains: getGamblingDomains, category: "gambling" },
    { enabled: isPredictionMarketEnabled, domains: getPredictionMarketDomains, category: "prediction-markets" },
    { enabled: isScamEnabled, domains: getStoredScamDomains, category: "scam" },
    { enabled: isTradingEnabled, domains: getTradingDomains, category: "trading" },
    { enabled: isMlmEnabled, domains: getMlmDomains, category: "mlm" },
    { enabled: () => isSafetyListEnabled("piracy"), domains: () => getStoredSafetyDomains("piracy"), category: "piracy" },
    { enabled: () => isSafetyListEnabled("phishing"), domains: () => getStoredSafetyDomains("phishing"), category: "safety" },
    { enabled: () => isSafetyListEnabled("malware"), domains: () => getStoredSafetyDomains("malware"), category: "safety" },
    { enabled: () => isSafetyListEnabled("cryptojacking"), domains: () => getStoredSafetyDomains("cryptojacking"), category: "cryptojacking" },
    { enabled: () => isSafetyListEnabled("aiSlop"), domains: () => getStoredSafetyDomains("aiSlop"), category: "aislop" },
    { enabled: () => isSafetyListEnabled("fraud"), domains: () => getStoredSafetyDomains("fraud"), category: "fraud" },
    { enabled: isGoreShockEnabled, domains: getGoreShockDomains, category: "goreshock" },
    { enabled: isDatingEnabled, domains: getDatingDomains, category: "dating" },
  ];

  for (const check of checks) {
    try {
      if (!(await check.enabled())) continue;
      const domains = await check.domains();
      if (hostnameMatches(hostname, domains)) {
        return { action: "block", category: check.category, resolvedUrl };
      }
    } catch (err) {
      console.warn("[Sieve] Shortener check failed for category:", check.category, err);
      // Continue to the next check rather than failing open globally.
    }
  }

  return { action: "allow", resolvedUrl };
}

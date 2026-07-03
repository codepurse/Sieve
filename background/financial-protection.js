// background/financial-protection.js
// Sieve — Financial Protection module (Phase 5).
//
// Three INDEPENDENT, opt-in tiers (all default OFF), kept completely separate:
//   • Scam tier    — an auto-updating community feed (scamsniffer). Fraud /
//                    phishing / fake-platform domains. Churns fast, so we
//                    refresh it on a schedule (Step 3).
//   • Trading tier — a small, hand-maintained JSON list shipped in the
//                    extension (data/trading-sites.json). Legit exchanges the
//                    user opts to block for self-control.
//   • MLM tier     — a STATIC reviewed JSON list shipped in the extension
//                    (data/mlm-sites.json). Known multi-level-marketing company
//                    sites. Stable brands, so (like trading) it is NOT fetched
//                    or scheduled — a manual list refresh every few months.
//
// This file (Step 2) covers only the SCAM tier's fetch → parse → cap → store.
// Scheduling (Step 3), rule-building (Step 4), allowlist (Step 5) and UI
// (Step 6) come later. The two lists are NEVER merged: a scam feed must never
// flag a legitimate exchange.
//
// It reuses the gambling blocker's mechanics (background fetch + chrome.storage
// + DNR requestDomains packing) rather than inventing a parallel system.

// The large scam domain array is kept in IndexedDB (via list-store.js), NOT in
// chrome.storage.local — holding a multi-MB list there slowed every storage.local
// read (see list-store.js). Only the small count/timestamp/toggle keys stay in
// chrome.storage.local, which is where the settings UI reads them.
import { getBigList, setBigList, migrateBigLists } from "./list-store.js";

// ===========================================================================
// Scam tier — source + cap
// ===========================================================================

// Verified to resolve (HTTP 200, JSON array of ~348k bare domains, newest
// first). scamsniffer's free feed has a documented ~7-day delay — acceptable.
export const SCAM_LIST_URL =
  "https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/domains.json";

// We block the ENTIRE scam feed (~348k domains today). This is only a safety
// backstop: it trims solely if the feed ever explodes past 1,000,000 domains,
// to protect storage and rule limits.
//
// Why blocking the whole list is safe:
//   DNR limits the number of *rules*, not domains. Reusing the gambling
//   blocker's packing (DOMAINS_PER_RULE = 10000 via `requestDomains`), the full
//   ~348k list becomes ~70 dynamic rules (35 redirect + 35 block) — and Chrome's
//   ceiling is 30,000 RULES. (Proof it scales: this same extension's gambling
//   blocker already loads ~271k domains in 56 rules.) The scam ID range
//   [30000,40000) further hard-caps us at 5,000 groups = 50M domains.
//   The full list (~7-9 MB) is held in IndexedDB via list-store.js; the manifest
//   keeps the "unlimitedStorage" permission so IndexedDB isn't quota-limited.
//   scamsniffer lists newest first, so if the backstop ever trims, the freshest
//   domains are kept.
export const SCAM_LIST_CAP = 1000000;

// Storage keys — namespaced ("fp…") so they can never collide with the gambling
// blocker's keys (gamblingEnabled, customBlocks, allowlist, …). The big domain
// array lives in IndexedDB under SCAM_DOMAINS_KEY; the two small meta values live
// in chrome.storage.local (that's what the settings UI reads).
export const SCAM_DOMAINS_KEY = "fpScamDomains";        // string[] (capped) — IndexedDB
export const SCAM_UPDATED_AT_KEY = "fpScamListUpdatedAt"; // ms epoch — storage.local
export const SCAM_COUNT_KEY = "fpScamListCount";        // number (for the UI) — storage.local

// Per-tier on/off toggles. ALL default OFF (opt-in) — unlike the gambling
// blocker, which defaults on. The Step 6 settings UI flips these.
export const SCAM_ENABLED_KEY = "fpScamEnabled";        // boolean, default false
export const TRADING_ENABLED_KEY = "fpTradingEnabled";  // boolean, default false
export const MLM_ENABLED_KEY = "fpMlmEnabled";          // boolean, default false

// ===========================================================================
// fetch → parse → cap → store
// ===========================================================================

// Download the raw scam list. Throws on any non-200 so the caller can keep the
// last good list instead of overwriting it.
async function fetchScamListText() {
  const res = await fetch(SCAM_LIST_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error("Scam list fetch failed: HTTP " + res.status);
  return res.text();
}

// Parse raw text into a clean, de-duplicated array of bare domains.
// scamsniffer ships a JSON array, but this also handles hosts-file / plain-text
// formats defensively (strips "0.0.0.0 "/"127.0.0.1 " prefixes, "#"/"!" comment
// lines, leading "*.", schemes, paths, and trailing junk) so an alternate or
// supplemental source could be dropped in later without rewriting this.
export function parseScamList(text) {
  let entries;
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    try {
      entries = JSON.parse(trimmed);
    } catch {
      entries = null;
    }
  }
  if (!Array.isArray(entries)) entries = trimmed.split(/\r?\n/);

  const out = [];
  const seen = new Set();
  for (const raw of entries) {
    if (typeof raw !== "string") continue;
    let d = raw.trim().toLowerCase();
    if (!d || d.startsWith("#") || d.startsWith("!")) continue; // comments / blanks
    // hosts-file form: "0.0.0.0 example.com" / "127.0.0.1 example.com"
    const hosts = d.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(.*)$/);
    if (hosts) d = hosts[1].trim();
    d = d
      .replace(/^\*\./, "") // leading wildcard
      .replace(/^https?:\/\//, "") // scheme
      .split("/")[0] // path
      .split(/\s+/)[0]; // trailing junk / inline comment
    if (!d || !d.includes(".")) continue; // must look like a domain
    if (/[^a-z0-9.\-_]/.test(d)) continue; // reject anything with odd chars
    if (seen.has(d)) continue; // de-dupe
    seen.add(d);
    out.push(d);
  }
  return out;
}

// Keep only the most-recent N (front of the list).
function capScamList(domains, cap = SCAM_LIST_CAP) {
  return domains.length > cap ? domains.slice(0, cap) : domains;
}

// Fetch + parse + cap + store, with a "last updated" timestamp.
// IMPORTANT: on ANY failure (offline, 404, malformed, empty) it logs and leaves
// the previously-stored list untouched — it never wipes a working list. This is
// what Step 3's scheduler relies on for "keep last good on failed fetch".
export async function updateScamList() {
  try {
    const text = await fetchScamListText();
    const parsed = parseScamList(text);
    if (parsed.length === 0) {
      throw new Error("Parsed 0 domains — refusing to overwrite the stored list.");
    }
    const capped = capScamList(parsed);
    // Big array → IndexedDB; small meta → storage.local. Store the array first so
    // the meta (which the UI trusts) is never newer than the list it describes.
    await setBigList(SCAM_DOMAINS_KEY, capped);
    await chrome.storage.local.set({
      [SCAM_UPDATED_AT_KEY]: Date.now(),
      [SCAM_COUNT_KEY]: capped.length,
    });
    console.log(
      `[Sieve] Scam list updated: stored ${capped.length} of ${parsed.length} parsed domains.`
    );
    return { ok: true, stored: capped.length, parsed: parsed.length };
  } catch (err) {
    console.error("[Sieve] Scam list update failed (last good list kept):", err);
    return { ok: false, error: String((err && err.message) || err) };
  }
}

// Read back what's currently stored (used by later steps + manual testing).
export async function getStoredScamList() {
  const s = await chrome.storage.local.get({
    [SCAM_UPDATED_AT_KEY]: 0,
    [SCAM_COUNT_KEY]: 0,
  });
  const domains = await getBigList(SCAM_DOMAINS_KEY); // IndexedDB (self-migrates legacy data)
  return {
    domains,
    updatedAt: s[SCAM_UPDATED_AT_KEY],
    count: s[SCAM_COUNT_KEY],
  };
}

// ===========================================================================
// Step 3 — Auto-update scheduler (chrome.alarms)
//
// Crypto-scam domains churn fast, so the scam list refreshes itself daily.
// Mirrors the gambling blocker's alarm pattern (scheduleGamblingRefresh /
// refreshGamblingList), with two differences:
//   • the trading tier is NEVER fetched/refreshed (it's a static bundled file);
//   • the scam tier is opt-in, so a refresh is gated on its toggle being ON.
// ===========================================================================

const SCAM_REFRESH_ALARM = "fpScamListRefresh";
const SCAM_REFRESH_PERIOD_MINUTES = 60 * 24; // every 24h

// Is the scam tier currently on? (defaults OFF — opt-in)
export async function isScamEnabled() {
  const s = await chrome.storage.local.get({ [SCAM_ENABLED_KEY]: false });
  return s[SCAM_ENABLED_KEY];
}

// ===========================================================================
// Step 4 — Blocking rules: three SEPARATE dynamic-rule groups
//
//   • scamRules    — IDs 30000-39999, built from the fetched/stored scam list
//   • tradingRules — IDs 40000-49999, built from data/trading-sites.json
//   • mlmRules     — IDs 50000-59999, built from data/mlm-sites.json (static)
//
// Each group is enabled/disabled by its own toggle, completely independently.
// All reuse the gambling blocker's exact rule shape (redirect the full page to
// the blocked page; block embedded subresources) and its 10k-domains-per-rule
// packing, so 30k scam domains => ~6 rules. The three lists are NEVER merged.
//
// Why these high ID ranges: the gambling blocker owns dynamic-rule IDs below
// 30000 (big list <10000, custom blocks 10000-19999, allowlist 20000+).
// Financial Protection owns everything >= 30000, so the two modules never
// clobber each other. (Two 1-line scoping fixes in service-worker.js stop the
// gambling code from reaching into our range — see FP_DYNAMIC_ID_START there.)
// ===========================================================================

const SCAM_RULE_ID_START = 30000;
const SCAM_RULE_ID_END = 40000; // exclusive
const TRADING_RULE_ID_START = 40000;
const TRADING_RULE_ID_END = 50000; // exclusive
const MLM_RULE_ID_START = 50000;
const MLM_RULE_ID_END = 60000; // exclusive

// Same packing + resource types as the gambling blocker (kept local so this
// module has no cross-dependency on service-worker.js internals).
const DOMAINS_PER_RULE = 10000;
const SUBRESOURCE_TYPES = [
  "sub_frame", "script", "image", "stylesheet", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other",
];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Build redirect(full-page) + block(subresource) rules for a set of domains,
// tagging the blocked page with ?category=<category> so it can show the right
// message (Step 7). requestDomains matches each domain AND all its subdomains.
function buildBlockRules(domains, idStart, category) {
  if (!domains || domains.length === 0) return [];
  const groups = chunk(domains, DOMAINS_PER_RULE);
  const path = `/pages/blocked.html?category=${category}`;
  const rules = [];
  let id = idStart;
  for (const g of groups) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: path } },
      condition: { requestDomains: g, resourceTypes: ["main_frame"] },
    });
  }
  for (const g of groups) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "block" },
      condition: { requestDomains: g, resourceTypes: SUBRESOURCE_TYPES },
    });
  }
  return rules;
}

// Remove every dynamic rule we own in [start, end) and (re)add the given rules.
async function replaceDynamicRules(start, end, addRules) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter((r) => r.id >= start && r.id < end)
    .map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// Every FP rule write is a read-modify-write (getDynamicRules → updateDynamicRules).
// If two run concurrently — which happens on install (reconcile + refresh) and
// whenever toggles/alarms overlap — their snapshots race and clobber each other,
// and Chrome rejects the colliding call (duplicate IDs), leaving a partial rule
// set. This single serial queue guarantees one write fully completes before the
// next one reads. Errors are caught so a failed write can't break the chain.
let ruleWriteChain = Promise.resolve();
function enqueueRuleWrite(label, fn) {
  ruleWriteChain = ruleWriteChain.then(fn).catch((err) => {
    console.error(`[Sieve] Financial Protection rule write (${label}) failed:`, err);
  });
  return ruleWriteChain;
}

// scamRules — built from the stored (already capped) scam list. While the tier
// is off we add nothing, which removes any existing scam rules. While on, we
// apply whatever is stored (the last good list) so a failed fetch still leaves
// protection in place.
async function applyScamRules() {
  return enqueueRuleWrite("scam", async () => {
    let addRules = [];
    if (await isScamEnabled()) {
      const { domains } = await getStoredScamList();
      addRules = buildBlockRules(domains, SCAM_RULE_ID_START, "scam");
    }
    await replaceDynamicRules(SCAM_RULE_ID_START, SCAM_RULE_ID_END, addRules);
  });
}

// Is the trading tier currently on? (defaults OFF — opt-in)
export async function isTradingEnabled() {
  const s = await chrome.storage.local.get({ [TRADING_ENABLED_KEY]: false });
  return s[TRADING_ENABLED_KEY];
}

// Read the hand-maintained trading list shipped inside the extension. This file
// is the single source of truth for the trading tier; editing it + reloading
// the extension rebuilds the rules. It is NEVER mixed with the scam list.
async function loadTradingDomains() {
  try {
    const res = await fetch(chrome.runtime.getURL("data/trading-sites.json"));
    const list = await res.json();
    return Array.isArray(list)
      ? list.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
      : [];
  } catch (err) {
    console.error("[Sieve] Could not load data/trading-sites.json:", err);
    return [];
  }
}

// tradingRules — built from the bundled JSON. Same on/off semantics as scam.
async function applyTradingRules() {
  return enqueueRuleWrite("trading", async () => {
    let addRules = [];
    if (await isTradingEnabled()) {
      const domains = await loadTradingDomains();
      addRules = buildBlockRules(domains, TRADING_RULE_ID_START, "trading");
    }
    await replaceDynamicRules(TRADING_RULE_ID_START, TRADING_RULE_ID_END, addRules);
  });
}

// Is the MLM tier currently on? (defaults OFF — opt-in)
export async function isMlmEnabled() {
  const s = await chrome.storage.local.get({ [MLM_ENABLED_KEY]: false });
  return s[MLM_ENABLED_KEY];
}

// Read the reviewed, STATIC MLM list shipped inside the extension. Like the
// trading tier this is a bundled file, not fetched at runtime — MLM companies
// are stable, well-known brands (a manual refresh every few months suffices),
// so there's no scheduler. Editing data/mlm-sites.json + reloading the
// extension rebuilds the rules. It is NEVER mixed with the scam/trading lists.
async function loadMlmDomains() {
  try {
    const res = await fetch(chrome.runtime.getURL("data/mlm-sites.json"));
    const list = await res.json();
    return Array.isArray(list)
      ? list.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
      : [];
  } catch (err) {
    console.error("[Sieve] Could not load data/mlm-sites.json:", err);
    return [];
  }
}

// mlmRules — built from the bundled JSON. Same on/off semantics as trading.
async function applyMlmRules() {
  return enqueueRuleWrite("mlm", async () => {
    let addRules = [];
    if (await isMlmEnabled()) {
      const domains = await loadMlmDomains();
      addRules = buildBlockRules(domains, MLM_RULE_ID_START, "mlm");
    }
    await replaceDynamicRules(MLM_RULE_ID_START, MLM_RULE_ID_END, addRules);
  });
}

// Reconcile ALL rule groups with the saved toggle state (used on install /
// startup). Sequential so the updateDynamicRules calls don't race.
async function reconcileFinancialRules() {
  await applyScamRules();
  await applyTradingRules();
  await applyMlmRules();
}

// One scheduled cycle: skip entirely if the tier is off; otherwise fetch +
// parse + cap + store, then ALWAYS re-apply rules from the stored list. A
// failed fetch keeps the last good list (updateScamList never overwrites on
// failure) and we still apply it, so protection survives an offline cycle.
export async function refreshScamList() {
  if (!(await isScamEnabled())) {
    console.log("[Sieve] Financial Protection: scam tier off — skipping refresh.");
    return { ok: false, skipped: true };
  }
  const res = await updateScamList(); // fetch + store; keeps last good on failure
  await applyScamRules(); // apply current stored list (fresh or last good)
  return res;
}

// Create (or reset) the recurring daily refresh alarm.
function scheduleScamRefresh() {
  chrome.alarms.create(SCAM_REFRESH_ALARM, { periodInMinutes: SCAM_REFRESH_PERIOD_MINUTES });
}

// When the alarm fires, run a refresh cycle.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCAM_REFRESH_ALARM) refreshScamList();
});

// On install/update: schedule the daily alarm, and if the scam tier is already
// on (e.g. after an extension update), pull a fresh list right away. This is a
// SEPARATE onInstalled listener — it does not touch the gambling/doomscroll
// onInstalled handlers in service-worker.js (Chrome allows multiple).
chrome.runtime.onInstalled.addListener(async () => {
  scheduleScamRefresh();
  // Move any pre-existing scam list out of storage.local into IndexedDB before
  // reconciling, so this update cleans up the bloated area right away.
  await migrateBigLists([SCAM_DOMAINS_KEY]);
  await reconcileFinancialRules(); // apply both groups from the saved toggle state
  refreshScamList(); // if scam is on, also pull a fresh list now (no-op while off)
});

// On browser startup, re-apply both groups. Dynamic rules persist across
// restarts, but this also picks up any hand edits to data/trading-sites.json
// made before the reload.
chrome.runtime.onStartup.addListener(async () => {
  await migrateBigLists([SCAM_DOMAINS_KEY]); // clean up any lingering legacy list
  reconcileFinancialRules();
});

// React to the two toggles (the Step 6 settings UI writes these keys). Mirrors
// the gambling blocker's storage.onChanged wiring; additive — it doesn't touch
// the gambling/toxic listeners already in service-worker.js.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[SCAM_ENABLED_KEY]) {
    // ON: fetch fresh + apply. OFF: applyScamRules removes our scam rules.
    if (changes[SCAM_ENABLED_KEY].newValue) refreshScamList();
    else applyScamRules();
  }
  if (changes[TRADING_ENABLED_KEY]) applyTradingRules();
  if (changes[MLM_ENABLED_KEY]) applyMlmRules();
});

// Test hooks for Steps 2-3: drive things from the service-worker DevTools
// console while we build Phase 5, e.g.
//   await chrome.storage.local.set({ fpScamEnabled: true }) // simulate the toggle
//   await sieveFP.refreshScamList()    // gated cycle (what the alarm runs)
//   await sieveFP.updateScamList()     // ungated fetch + store
//   await sieveFP.getStoredScamList()  // inspect what's stored
// (The real toggle + visible "last updated" line arrive in Step 6.)
globalThis.sieveFP = Object.assign(globalThis.sieveFP || {}, {
  updateScamList,
  refreshScamList,
  getStoredScamList,
  parseScamList,
  isScamEnabled,
  isTradingEnabled,
  isMlmEnabled,
  applyScamRules,
  applyTradingRules,
  applyMlmRules,
  reconcileFinancialRules,
  loadTradingDomains,
  loadMlmDomains,
});

// background/service-worker.js
// Sieve background service worker.
//  - Stores module on/off state; applies it to the gambling blocker's rules.
//  - Fetches & installs the full gambling domain list as dynamic rules.
//  - Refreshes that list weekly.

import "./financial-protection.js"; // Phase 5 — Financial Protection (scam + trading + mlm tiers)
import "./safety-shield.js"; // Safety Shield — piracy + safety/malware blockers
import "./popup-hijack.js"; // Popup & Click Hijack Blocker — blocked-popup log + recovery
import "./url-shortener-resolver.js"; // URL Shortener Resolver — expand shortened links before blocker checks
import { installStatsListener, installStatsAlarmHandler, scheduleStatsMidnightAlarm } from "../common/stats.js"; // Shared Protection Dashboard stats store

installStatsListener();
installStatsAlarmHandler();
scheduleStatsMidnightAlarm();

// ===========================================================================
// Module on/off messages from the popup.
// ===========================================================================

const SET_MODULE_STATE = "SET_MODULE_STATE";
const GAMBLING_ENABLED_KEY = "gamblingEnabled";

// Persist a single module's enabled state.
async function setModuleState(key, enabled) {
  await chrome.storage.local.set({ [key]: enabled });
}

// Store the state; for the gambling blocker, also apply it to the live rules.
async function handleModuleState(key, enabled) {
  await setModuleState(key, enabled);
  if (key === GAMBLING_ENABLED_KEY) {
    if (enabled) await enableGambling();
    else await disableGambling();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === SET_MODULE_STATE) {
    handleModuleState(message.key, message.enabled).then(() => sendResponse({ ok: true }));
    return true; // keep the channel open until the async work finishes
  }
  return false;
});

// ===========================================================================
// Gambling Blocker — full domain list (fetched at runtime, not bundled).
// The bundled static ruleset covers ~40 seed brands; this adds the rest as
// dynamic rules so the extension package stays tiny.
// ===========================================================================

const GAMBLING_LIST_URL =
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/wildcard/gambling-onlydomains.txt";
const GAMBLING_RULESET_ID = "gambling_ruleset"; // matches manifest rule_resources id

const DOMAINS_PER_RULE = 10000; // many domains packed per rule via requestDomains
const SUBRESOURCE_TYPES = [
  "sub_frame", "script", "image", "stylesheet", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other",
];
const ALL_RESOURCE_TYPES = ["main_frame", ...SUBRESOURCE_TYPES];

// Dynamic-rule ID ranges keep the three sources from clobbering each other.
// Big list: below 10000 · Custom blocks: 10000-19999 · Allowlist: 20000-29999
const CUSTOM_BLOCK_ID_START = 10000;
const ALLOW_ID_START = 20000;

// Phase 5 (Financial Protection) owns all dynamic-rule IDs >= 30000. The
// gambling blocker must never remove rules at or above this boundary, or
// toggling gambling would wipe the scam/trading rules. See
// background/financial-protection.js.
const FP_DYNAMIC_ID_START = 30000;

// Is the gambling blocker currently on? (defaults to on)
async function isGamblingEnabled() {
  const stored = await chrome.storage.local.get({ [GAMBLING_ENABLED_KEY]: true });
  return stored[GAMBLING_ENABLED_KEY];
}

// 5a.1 Download the blocklist and return an array of clean domains.
async function fetchGamblingDomains() {
  const response = await fetch(GAMBLING_LIST_URL);
  if (!response.ok) throw new Error("Fetch failed: HTTP " + response.status);
  const text = await response.text();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

// 5a.2 Split an array into fixed-size chunks.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// 5a.3 Turn domains into DNR rules: redirect full pages, block embeds.
function buildGamblingRules(domains) {
  const groups = chunk(domains, DOMAINS_PER_RULE);
  const rules = [];
  let id = 1;
  for (const g of groups) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: "/pages/blocked.html?category=gambling" } },
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

// 5a.4 Replace only the big-list dynamic rules (IDs below CUSTOM_BLOCK_ID_START),
// leaving the user's custom-block and allowlist rules untouched.
async function installGamblingRules(rules) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const oldBigListIds = existing
    .filter((r) => r.id < CUSTOM_BLOCK_ID_START)
    .map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldBigListIds,
    addRules: rules,
  });
}

// 5a.5 Fetch the list and install it — but only while the blocker is on.
async function refreshGamblingList() {
  if (!(await isGamblingEnabled())) {
    console.log("[Sieve] Gambling blocker is off — skipping list install.");
    return;
  }
  try {
    const domains = await fetchGamblingDomains();
    const rules = buildGamblingRules(domains);
    await installGamblingRules(rules);
    await chrome.storage.local.set({ gamblingListCount: domains.length });
    console.log("[Sieve] Installed", rules.length, "gambling rules covering", domains.length, "domains.");
  } catch (err) {
    console.error("[Sieve] Gambling list refresh failed (seed list still active):", err);
  }
}

// ===========================================================================
// 5b — Weekly auto-refresh so the blocklist stays current over time.
// ===========================================================================

const GAMBLING_REFRESH_ALARM = "gamblingListRefresh";
const REFRESH_PERIOD_MINUTES = 60 * 24 * 7; // one week

// Create (or reset) the recurring weekly refresh alarm.
function scheduleGamblingRefresh() {
  chrome.alarms.create(GAMBLING_REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MINUTES });
}

// When the alarm fires, re-fetch and re-install the list.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === GAMBLING_REFRESH_ALARM) refreshGamblingList();
});

// ===========================================================================
// 5c — On/off toggle. Dynamic rules can't be paused, only added/removed, so
// OFF removes them and disables the seed ruleset; ON re-enables + reinstalls.
// ===========================================================================

// Turn the blocker ON: enable the seed ruleset and (re)install the big list.
async function enableGambling() {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: [GAMBLING_RULESET_ID],
  });
  await refreshGamblingList();
  await applyCustomBlocks();
  await applyAllowlist();
}

// Turn the blocker OFF: disable the seed ruleset and remove ONLY the gambling
// big-list rules (IDs < 10000). Everything else is intentionally left intact,
// because none of it is gambling-scoped anymore: the user's GLOBAL custom blocks
// (10000-19999) and the shared allowlist (20000-29999) are always-on and
// independent of this toggle, and the Financial Protection rules (>= 30000) are
// separate. So turning gambling off must not wipe any of them.
async function disableGambling() {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: [GAMBLING_RULESET_ID],
  });
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.filter((r) => r.id < CUSTOM_BLOCK_ID_START).map((r) => r.id),
  });
}

// ===========================================================================
// 5d — Custom blocks + allowlist (user-managed dynamic rules).
// The popup writes `customBlocks` / `allowlist` arrays to storage; we react.
// ===========================================================================

// Serialize the custom-block + allowlist rule writes. Both are read-modify-write
// (getDynamicRules -> updateDynamicRules). The blocked page's one-click allow now
// calls applyAllowlist() while the storage.onChanged listener fires it too, so two
// can overlap; without serialization their snapshots race and Chrome rejects the
// second call with a duplicate-ID error (e.g. both try to add allow rule 20000).
// This chain guarantees one write finishes before the next reads — the same guard
// financial-protection.js / safety-shield.js use for their own ID ranges.
let allowBlockWriteChain = Promise.resolve();
function enqueueAllowBlockWrite(fn) {
  allowBlockWriteChain = allowBlockWriteChain.then(fn).catch((err) => {
    console.error("[Sieve] allow/block rule write failed:", err);
  });
  return allowBlockWriteChain;
}

// Build redirect+block rules for the user's custom domains.
function buildCustomBlockRules(domains) {
  if (domains.length === 0) return [];
  return [
    {
      id: CUSTOM_BLOCK_ID_START,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: "/pages/blocked.html?category=custom-blocked" } },
      condition: { requestDomains: domains, resourceTypes: ["main_frame"] },
    },
    {
      id: CUSTOM_BLOCK_ID_START + 1,
      priority: 1,
      action: { type: "block" },
      condition: { requestDomains: domains, resourceTypes: SUBRESOURCE_TYPES },
    },
  ];
}

// Build one high-priority allow rule so allowlisted domains beat any block.
function buildAllowRules(domains) {
  if (domains.length === 0) return [];
  return [
    {
      id: ALLOW_ID_START,
      priority: 2, // higher than blocks (priority 1), so allow wins
      action: { type: "allow" },
      condition: { requestDomains: domains, resourceTypes: ALL_RESOURCE_TYPES },
    },
  ];
}

// Rebuild custom-block rules from storage. GLOBAL: the user's custom block list
// is always on and independent of every toggle (just like the shared allowlist
// below), so this applies unconditionally — turning the Gambling Blocker (or any
// other blocker) on/off never affects it. IDs stay in [10000, 20000).
async function applyCustomBlocks() {
  return enqueueAllowBlockWrite(async () => {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing
      .filter((r) => r.id >= CUSTOM_BLOCK_ID_START && r.id < ALLOW_ID_START)
      .map((r) => r.id);
    const { customBlocks } = await chrome.storage.local.get({ customBlocks: [] });
    const addRules = buildCustomBlockRules(customBlocks);
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  });
}

// Rebuild the allow rule from storage. The allowlist is SHARED across every
// blocker (gambling + Financial Protection's scam & trading tiers), so it
// applies whenever it has entries — NOT only while the gambling blocker is on.
// The priority-2 allow rule overrides every priority-1 block/redirect; an empty
// list removes the rule. This is the user's single escape hatch for all tiers.
async function applyAllowlist() {
  return enqueueAllowBlockWrite(async () => {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing
      .filter((r) => r.id >= ALLOW_ID_START && r.id < FP_DYNAMIC_ID_START)
      .map((r) => r.id);
    const { allowlist } = await chrome.storage.local.get({ allowlist: [] });
    const addRules = buildAllowRules(allowlist);
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  });
}

// React when the popup edits the custom-block or allowlist arrays.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.customBlocks) applyCustomBlocks();
  if (changes.allowlist) applyAllowlist();
});

// ===========================================================================
// On install / update: schedule the weekly refresh and reconcile the rules
// with the saved on/off state.
// ===========================================================================

chrome.runtime.onInstalled.addListener(async () => {
  scheduleGamblingRefresh();
  if (await isGamblingEnabled()) {
    await enableGambling(); // already reconciles the global custom blocks + shared allowlist
  } else {
    await disableGambling();
    await applyCustomBlocks(); // global custom blocks apply even when gambling is off
    await applyAllowlist(); // keep the shared allowlist live for every blocker
  }
});

// ===========================================================================
// Prediction Markets Blocker — the SECOND toggle inside the Gambling Blocker.
// A STATIC, opt-in (default OFF) list of prediction-market / betting-platform
// domains (Polymarket, Kalshi, and similar) rebranded as "forecasting markets".
//
// It reuses the gambling blocker's EXACT mechanism: a bundled static DNR ruleset
// (rules/prediction-market-rules.json, declared in manifest.json right beside
// gambling_ruleset) that redirects full pages to the shared blocked page
// (?category=prediction-markets) and blocks embedded subresources. Because it is
// its OWN ruleset with its OWN toggle key, it turns on/off completely
// independently of the traditional-gambling toggle, and the shared priority-2
// allowlist (ID 20000) overrides it exactly as it already overrides the gambling
// rules — no per-category allowlist work needed.
//
// STATIC by design: the reviewed list is baked into the package — NOT fetched at
// runtime, NO scheduler. A manual refresh = update data/prediction-markets.json,
// regenerate rules/prediction-market-rules.json, reload the extension.
//
// Everything below is ADDITIVE — it registers its own listeners (Chrome allows
// many per event, as the gambling/doomscroll handlers above already do) and does
// not modify any gambling / doomscroll / toxic logic.
// ===========================================================================

const PREDICTION_MARKET_ENABLED_KEY = "predictionMarketEnabled"; // default false (opt-in)
const PREDICTION_MARKET_RULESET_ID = "prediction_market_ruleset"; // matches manifest rule_resources id

// Is the prediction-markets blocker currently on? (defaults OFF — opt-in)
async function isPredictionMarketEnabled() {
  const stored = await chrome.storage.local.get({ [PREDICTION_MARKET_ENABLED_KEY]: false });
  return stored[PREDICTION_MARKET_ENABLED_KEY];
}

// Enable or disable the bundled static ruleset to match the stored toggle.
// (Static rulesets can be flipped like this without touching dynamic rules, so
// the gambling big-list / custom-block / allowlist dynamic rules are untouched.)
async function applyPredictionMarketRuleset() {
  const on = await isPredictionMarketEnabled();
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    on
      ? { enableRulesetIds: [PREDICTION_MARKET_RULESET_ID] }
      : { disableRulesetIds: [PREDICTION_MARKET_RULESET_ID] }
  );
}

// React when the Step 3 settings toggle flips the key. Mirrors how the
// Financial Protection / Safety Shield opt-in tiers react via storage.onChanged.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[PREDICTION_MARKET_ENABLED_KEY]) {
    applyPredictionMarketRuleset();
  }
});

// On install/update: the enabled-static-ruleset set persists across browser
// restarts but RESETS to the manifest default (enabled:false) on extension
// update — so re-sync it with the saved toggle here. Separate listener; it does
// not touch the gambling/doomscroll onInstalled handlers above.
chrome.runtime.onInstalled.addListener(() => {
  applyPredictionMarketRuleset();
});

// Test hook: drive it from the service-worker DevTools console before the Step 3
// UI exists, e.g.
//   await chrome.storage.local.set({ predictionMarketEnabled: true }) // simulate toggle ON
//   await sievePM.applyPredictionMarketRuleset()                      // force a re-sync
//   await sievePM.isPredictionMarketEnabled()                         // inspect state
globalThis.sievePM = Object.assign(globalThis.sievePM || {}, {
  isPredictionMarketEnabled,
  applyPredictionMarketRuleset,
});

// ===========================================================================
// Doomscroll Stopper (Module 2A) — daily stats housekeeping.
// Everything below is ADDITIVE — none of the Phase 1 logic above is changed.
//   - Daily scroll stats live in storage as { siteId: { "YYYY-MM-DD": minutes } }
//     (written by content/doomscroll.js).
//   - At local midnight we (1) prune stats older than the retention window and
//     (2) clear any "Stop for today" flags from previous days so that tracking
//     automatically resumes on the new day.
// ===========================================================================

const DAILY_RESET_ALARM = "doomscrollDailyReset";
const STATS_RETENTION_DAYS = 14; // keep ~2 weeks so 2B's weekly chart can read history

// Local date as "YYYY-MM-DD" — must match content/doomscroll.js.
function localDateStr(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Whole-day difference between two "YYYY-MM-DD" strings (b - a).
function dayDiff(aStr, bStr) {
  const a = new Date(aStr + "T00:00:00");
  const b = new Date(bStr + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// Roll over to a new day: drop stale history and expired "stop for today" flags.
async function runDoomscrollDailyReset() {
  const today = localDateStr();
  const stored = await chrome.storage.local.get({
    doomscrollStats: {},
    doomscrollStoppedDates: {},
  });

  const stats = stored.doomscrollStats;
  for (const siteId of Object.keys(stats)) {
    const byDate = stats[siteId];
    for (const date of Object.keys(byDate)) {
      if (dayDiff(date, today) > STATS_RETENTION_DAYS) delete byDate[date];
    }
    if (Object.keys(byDate).length === 0) delete stats[siteId];
  }

  const stopped = stored.doomscrollStoppedDates;
  for (const siteId of Object.keys(stopped)) {
    if (stopped[siteId] !== today) delete stopped[siteId];
  }

  await chrome.storage.local.set({
    doomscrollStats: stats,
    doomscrollStoppedDates: stopped,
  });
}

// Schedule a one-shot alarm for just after the next local midnight. We reschedule
// after each fire (instead of a fixed period) so it stays aligned across DST.
function scheduleDoomscrollReset() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  chrome.alarms.create(DAILY_RESET_ALARM, { when: nextMidnight.getTime() });
}

// When the midnight alarm fires: reset, then schedule the following midnight.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === DAILY_RESET_ALARM) {
    runDoomscrollDailyReset().finally(scheduleDoomscrollReset);
  }
});

// On install/update and on browser startup: catch up any reset missed while the
// browser was closed, then (re)schedule the next midnight. Separate listeners so
// the Phase 1 onInstalled handler above is left exactly as it was.
chrome.runtime.onInstalled.addListener(() => {
  runDoomscrollDailyReset().finally(scheduleDoomscrollReset);
  scheduleStatsMidnightAlarm();
});
chrome.runtime.onStartup.addListener(() => {
  runDoomscrollDailyReset().finally(scheduleDoomscrollReset);
  scheduleStatsMidnightAlarm();
});

// ===========================================================================
// Toxic Comment Hider — Layer 2 model bridge (Module 4A, Step 7).
// Content scripts can't reach the offscreen document directly, so the flow is:
//   content script -> service worker (here) -> offscreen doc (model) -> back.
// The offscreen doc loads the cached model once and is reused across all tabs.
// Everything below is ADDITIVE — none of the logic above is changed.
// ===========================================================================

const OFFSCREEN_DOC = "offscreen/toxic-offscreen.html";
let offscreenCreating = null;

async function hasOffscreenDoc() {
  if (chrome.runtime.getContexts) {
    const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
    return ctx.length > 0;
  }
  if (chrome.offscreen && chrome.offscreen.hasDocument) return chrome.offscreen.hasDocument();
  return false;
}

async function ensureOffscreenDoc() {
  if (await hasOffscreenDoc()) return;
  if (offscreenCreating) return offscreenCreating;
  offscreenCreating = chrome.offscreen
    .createDocument({
      url: OFFSCREEN_DOC,
      reasons: ["WORKERS"],
      justification: "Run the on-device toxicity model to filter comments locally.",
    })
    .catch((err) => {
      // Tolerate the race where another call created it first.
      if (!/single offscreen/i.test(String(err))) throw err;
    })
    .finally(() => {
      offscreenCreating = null;
    });
  return offscreenCreating;
}

// Relay classify requests from content scripts to the offscreen model.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "sieve:classify") {
    (async () => {
      try {
        await ensureOffscreenDoc();
        const resp = await chrome.runtime.sendMessage({
          type: "sieve:offscreen-classify",
          texts: message.texts,
        });
        sendResponse(resp || { ok: false, error: "no response from model" });
      } catch (err) {
        sendResponse({ ok: false, error: String((err && err.message) || err) });
      }
    })();
    return true; // async response
  }
  return false;
});

// Free the model's memory when the user turns smart detection off.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes.toxicModelEnabled) return;
  if (changes.toxicModelEnabled.newValue === false && (await hasOffscreenDoc())) {
    try {
      await chrome.offscreen.closeDocument();
    } catch {
      /* already closed */
    }
  }
});

// ===========================================================================
// Blocked-page URL capture + one-click "Allow this site".
//
// A declarativeNetRequest redirect throws away the URL that was blocked, so the
// blocked page can't natively show it. We capture the tab's last top-frame
// http(s) navigation — which IS the URL about to be blocked, since the redirect
// to blocked.html fires immediately after — and hand it back when blocked.html
// asks. The page can then offer a one-click allow; because adding to the
// allowlist WEAKENS protection, the page PIN-gates it via Guardian before
// messaging us here. Additive: new listeners only; nothing above is changed.
// ===========================================================================

// tabId -> { url, ts }. In-memory (fast, no I/O). The blocked page loads within
// the same wake cycle as the navigation that populated this, so it's warm in
// practice; a cold service-worker restart just yields null and the page falls
// back to its generic copy (no URL, no allow button).
const lastTopNavByTab = new Map();
const BLOCKED_NAV_TTL_MS = 30000;

chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId !== 0) return; // top frame only
  if (!/^https?:\/\//i.test(d.url || "")) return; // ignore our chrome-extension:// page, about:, etc.
  lastTopNavByTab.set(d.tabId, { url: d.url, ts: Date.now() });
});
chrome.tabs.onRemoved.addListener((tabId) => lastTopNavByTab.delete(tabId));

// Normalize + validate exactly like the options page (strip scheme/www/path), so
// the allowlist entry matches how the rule engine and manual entries work.
function normalizeAllowDomain(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split(":")[0];
}
function isValidAllowDomain(d) {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d);
}

// Add a domain to the shared allowlist and wait until the allow rule is actually
// live, so the blocked page can navigate to the site without getting re-blocked.
async function allowSiteFromBlockedPage(rawDomain) {
  const domain = normalizeAllowDomain(rawDomain);
  if (!isValidAllowDomain(domain)) return { ok: false, error: "invalid domain" };

  const { allowlist } = await chrome.storage.local.get({ allowlist: [] });
  const list = Array.isArray(allowlist) ? allowlist : [];
  if (!list.includes(domain)) {
    list.push(domain);
    list.sort();
    await chrome.storage.local.set({ allowlist: list }); // also triggers onChanged -> applyAllowlist
  }
  await applyAllowlist(); // serialized with the onChanged write; resolves once applied

  // Confirm the priority-2 allow rule now covers this domain before we greenlight
  // navigation (the write chain swallows errors, so verify rather than assume).
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const live = rules.some(
    (r) => r.id === ALLOW_ID_START && r.condition?.requestDomains?.includes(domain)
  );
  return live ? { ok: true, domain } : { ok: false, error: "rule not applied", domain };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_BLOCKED_URL") {
    const tabId = message.tabId ?? sender.tab?.id;
    const rec = tabId != null ? lastTopNavByTab.get(tabId) : null;
    const fresh = rec && Date.now() - rec.ts < BLOCKED_NAV_TTL_MS;
    sendResponse({ url: fresh ? rec.url : null });
    return false; // sync
  }
  if (message?.type === "SIEVE_ALLOW_SITE") {
    allowSiteFromBlockedPage(message.domain).then(sendResponse);
    return true; // async
  }
  return false;
});

// ===========================================================================
// First-install onboarding page.
// Opened only on a fresh install (reason === "install"), not on extension
// updates, so users are not interrupted again on every release.
// ===========================================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/onboarding.html") });
  }
});

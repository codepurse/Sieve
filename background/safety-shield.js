// background/safety-shield.js
// Sieve — Safety Shield module.
//
// Adds TWO new, INDEPENDENT, opt-in site blockers on top of the existing
// gambling/scam blocking mechanism (background fetch + chrome.storage + DNR
// requestDomains packing). It invents NO new system — it reuses the exact
// pattern proven by background/financial-protection.js.
//
//   • Piracy & illegal streaming  — blocklistproject "piracy" list.
//   • Safety & Malware            — blocklistproject "phishing" + "malware"
//                                   lists (two sources, surfaced to the user as
//                                   one "Safety & Malware" toggle in later
//                                   steps, but kept as separate lists/rule
//                                   groups internally for clarity).
//
// All three sources churn fast, so (in Step 2) they auto-update on a schedule.
//
// ---------------------------------------------------------------------------
// THIS FILE — STEPS 1-3:
//   Step 1: fetch → parse → cap → store, for each of the three lists SEPARATELY,
//           each with its own "last updated" timestamp.
//   Step 2: a chrome.alarms scheduler that auto-refreshes the lists daily
//           (only those whose toggle is on), keeping the last good list on a
//           failed fetch and retrying next cycle.
//   Step 3: three independent dynamic-rule groups (piracy / phishing / malware)
//           that redirect to the existing blocked page with the right category.
// No settings UI (Step 4) yet — the toggles are simulated via storage keys.
// Drive it from the service-worker DevTools console via the globalThis.sieveSafety
// test hooks at the bottom of this file.
// ---------------------------------------------------------------------------

// The large fetched domain arrays are kept in IndexedDB (via list-store.js), NOT
// in chrome.storage.local — several multi-MB lists there slowed every
// storage.local read (see list-store.js). Only the small count/timestamp/toggle
// keys stay in chrome.storage.local, which is where the settings UI reads them.
import { getBigList, setBigList, migrateBigLists } from "./list-store.js";

// ===========================================================================
// Sources + caps
//
// All three are blocklistproject hosts-format lists (MIT). Verified to resolve:
//   piracy.txt   ~2,153 domains   phishing.txt ~190,215   malware.txt ~435,195
//
// Primary URL = the canonical raw.githubusercontent.com path (the same host the
// gambling & scam blockers fetch from). The raw CDN occasionally serves a
// transient "HTTP 400" on a cold cache for the piracy path, so each list also
// has a jsDelivr mirror as an in-cycle fallback. If BOTH fail we keep the last
// good list (see updateSafetyList) — never wipe it.
// ===========================================================================

const SAFETY_LISTS = {
  piracy: {
    label: "Piracy & illegal streaming",
    url: "https://raw.githubusercontent.com/blocklistproject/Lists/master/piracy.txt",
    mirrorUrl: "https://cdn.jsdelivr.net/gh/blocklistproject/Lists@master/piracy.txt",
    domainsKey: "ssPiracyDomains", // string[] (capped)
    updatedAtKey: "ssPiracyUpdatedAt", // ms epoch of last successful store
    countKey: "ssPiracyCount", // number (for the UI)
  },
  phishing: {
    label: "Phishing",
    url: "https://raw.githubusercontent.com/blocklistproject/Lists/master/phishing.txt",
    mirrorUrl: "https://cdn.jsdelivr.net/gh/blocklistproject/Lists@master/phishing.txt",
    domainsKey: "ssPhishingDomains",
    updatedAtKey: "ssPhishingUpdatedAt",
    countKey: "ssPhishingCount",
  },
  malware: {
    label: "Malware",
    url: "https://raw.githubusercontent.com/blocklistproject/Lists/master/malware.txt",
    mirrorUrl: "https://cdn.jsdelivr.net/gh/blocklistproject/Lists@master/malware.txt",
    domainsKey: "ssMalwareDomains",
    updatedAtKey: "ssMalwareUpdatedAt",
    countKey: "ssMalwareCount",
  },
  // Cryptojacking / hidden miners — same hosts format, same engine. Primary is
  // the well-maintained nocoin list; the coinhive-block list is merged in as a
  // BEST-EFFORT supplement (see updateSafetyList): if both supplement sources
  // fail we fall back to the primary alone rather than failing the whole update.
  // Both lists already scope themselves to NON-consensual miners, so no custom
  // consent logic is needed — we just use them as-is. Surfaced as the third
  // Safety Shield toggle in Step 4.
  cryptojacking: {
    label: "Cryptojacking / hidden miners",
    url: "https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/hosts.txt",
    mirrorUrl: "https://cdn.jsdelivr.net/gh/hoshsadiq/adblock-nocoin-list@master/hosts.txt",
    supplementUrl: "https://raw.githubusercontent.com/Marfjeh/coinhive-block/master/hostfile.txt",
    supplementMirrorUrl: "https://cdn.jsdelivr.net/gh/Marfjeh/coinhive-block@master/hostfile.txt",
    domainsKey: "ssCryptojackingDomains",
    updatedAtKey: "ssCryptojackingUpdatedAt",
    countKey: "ssCryptojackingCount",
  },
  // AI content farms / spam sites — mass-produced AI-generated clickbait, fake
  // reviews, fake recipes, etc. Same engine, same blocked page, same daily
  // auto-updater as the four lists above, with ONE difference: the source is
  // infinitytec's "ai-slop" list, which is adblock-style ("||domain^"), NOT
  // hosts-format. So this spec carries its own `parser` (parseAdblockList);
  // updateSafetyList picks it up via `spec.parser || parseHostsList`. The list
  // is small (~500 domains) so the explosion cap never engages. Surfaced as the
  // fourth Safety Shield toggle in Step 4. Primary = canonical raw path
  // (confirmed to resolve); jsDelivr mirror as the in-cycle fallback, same as
  // the others.
  aiSlop: {
    label: "AI content farms / spam sites",
    url: "https://raw.githubusercontent.com/infinitytec/blocklists/master/ai-slop.txt",
    mirrorUrl: "https://cdn.jsdelivr.net/gh/infinitytec/blocklists@master/ai-slop.txt",
    parser: parseAdblockList, // adblock "||domain^" format — NOT hosts format
    domainsKey: "ssAiSlopDomains",
    updatedAtKey: "ssAiSlopUpdatedAt",
    countKey: "ssAiSlopCount",
  },
  // Fraud / scam / fake-shop sites — general online fraud (fake stores, refund
  // scams, impersonation, etc.). blocklistproject hosts-format list (MIT), so it
  // uses the default parseHostsList and the same jsDelivr-mirror fallback as
  // piracy/phishing/malware. ~196,000 domains, of which ~99.5% are NOT in the
  // phishing/malware lists (measured) — genuinely additive, not a duplicate.
  // Surfaced as the fifth Safety Shield toggle; opt-in, default OFF.
  fraud: {
    label: "Fraud & scam sites",
    url: "https://raw.githubusercontent.com/blocklistproject/Lists/master/fraud.txt",
    mirrorUrl: "https://cdn.jsdelivr.net/gh/blocklistproject/Lists@master/fraud.txt",
    domainsKey: "ssFraudDomains",
    updatedAtKey: "ssFraudUpdatedAt",
    countKey: "ssFraudCount",
  },
};

// Per-list safety backstop. The DNR limit is on the number of RULES, not
// domains: the rule-builder (Step 3) packs 10,000 domains per rule via
// `requestDomains` — the same packing the gambling/scam blockers use — so a
// list of N domains becomes 2 × ceil(N / 10000) rules (one redirect group +
// one block group). With today's lists that's piracy 2, phishing 40, malware
// 88 = ~130 rules total; Chrome's dynamic-rule ceiling is 30,000. This cap only
// engages if a list ever explodes: 1,000,000 domains => at most 200 rules per
// list, still a rounding error against the ceiling. NB: these lists are ordered
// alphabetically, so a trim (should one ever happen) keeps an arbitrary subset
// — today none of the three is anywhere near the cap, so nothing is trimmed.
const SAFETY_LIST_CAP = 1000000;

// ===========================================================================
// fetch → parse → cap → store
// ===========================================================================

// Download one list's raw text. Tries the canonical raw URL first, then the
// jsDelivr mirror. Throws only if BOTH fail, so the caller can keep the last
// good list rather than overwriting it.
async function fetchListText(spec) {
  const urls = [spec.url, spec.mirrorUrl].filter(Boolean);
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    } catch (err) {
      lastErr = err;
      console.warn(`[Sieve] Safety Shield: fetch failed for ${url} (${err}); trying next source.`);
    }
  }
  throw new Error(`all sources failed (last: ${lastErr && lastErr.message})`);
}

// Parse blocklistproject hosts-format text into a clean, de-duplicated array of
// bare domains. Mirrors financial-protection.js's parser (kept local so this
// module has no cross-dependency): strips the "0.0.0.0 "/"127.0.0.1 " prefix,
// "#"/"!" comment lines, blanks, leading "*.", schemes, paths, and trailing
// junk, and rejects anything that doesn't look like a domain.
export function parseHostsList(text) {
  const out = [];
  const seen = new Set();
  for (const raw of text.split(/\r?\n/)) {
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
    if (/^[0-9.]+$/.test(d)) continue; // reject bare IPs (e.g. a "0.0.0.0 0.0.0.0" footer)
    if (seen.has(d)) continue; // de-dupe
    seen.add(d);
    out.push(d);
  }
  return out;
}

// Parse infinitytec's "ai-slop" adblock-style list into a clean, de-duplicated
// array of bare domains. This list is NOT hosts-format, so parseHostsList can't
// be reused: every entry is an adblock DOMAIN-ANCHOR rule "||example.com^",
// where "||" anchors to the start of a domain, "^" is a separator, and the
// anchor semantically means "this domain AND all its subdomains". We therefore:
//   • skip "#"/"!" comment lines and blanks (same as hosts format),
//   • require the "||" prefix and capture the domain up to the first "^", "$"
//     (adblock option, e.g. "$third-party"), or "/" (path) — dropping the
//     trailing "^" and anything after it,
//   • strip a leading "*." if present, then validate exactly like parseHostsList
//     (bare domain, no odd chars, not a raw IP).
// Non-domain adblock syntax (regex "/…/", cosmetic "##…", exception "@@…",
// path/query rules) simply fails the "^||" match and is skipped — DNR
// requestDomains only accepts bare domains.
//
// We store the BARE domain (e.g. "101generator.com"); the "||…^" wildcard
// subdomain coverage is supplied at rule-build time by DNR requestDomains
// (Step 3), which already matches each stored domain AND all its subdomains —
// exactly what the domain anchor asks for. This is the same subdomain behaviour
// the other four hosts-format lists already rely on.
export function parseAdblockList(text) {
  const out = [];
  const seen = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().toLowerCase();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue; // comments / blanks
    // Domain-anchor rules only: "||domain^" (optionally "||domain^$options").
    const m = line.match(/^\|\|([^\^$/]+)/);
    if (!m) continue; // not a "||domain…" rule — skip
    let d = m[1]
      .replace(/^\*\./, "") // leading wildcard, if any
      .replace(/^https?:\/\//, "") // scheme (defensive; shouldn't appear)
      .split("/")[0]; // any path (defensive)
    if (!d || !d.includes(".")) continue; // must look like a domain
    if (/[^a-z0-9.\-_]/.test(d)) continue; // reject anything with odd chars
    if (/^[0-9.]+$/.test(d)) continue; // reject bare IPs
    if (seen.has(d)) continue; // de-dupe
    seen.add(d);
    out.push(d);
  }
  return out;
}

// Keep only the first N (the cap is a pure explosion backstop — see above).
function capList(domains, cap = SAFETY_LIST_CAP) {
  return domains.length > cap ? domains.slice(0, cap) : domains;
}

// Fetch + parse + cap + store ONE list, stamping its own "last updated" time.
// IMPORTANT: on ANY failure (offline, 4xx/5xx from both sources, malformed,
// empty) it logs and leaves the previously-stored list untouched — it never
// wipes a working list. This is what Step 2's scheduler relies on for
// "keep last good on failed fetch".
export async function updateSafetyList(name) {
  const spec = SAFETY_LISTS[name];
  if (!spec) throw new Error("Unknown safety list: " + name);
  try {
    let text = await fetchListText(spec);
    // Optional best-effort supplement (cryptojacking merges nocoin + coinhive-
    // block). We just concatenate the raw text and let parseHostsList de-dupe,
    // so a domain present in both lists is stored once. If BOTH supplement
    // sources fail we keep the primary text — a flaky supplement must never
    // fail the whole update. Lists without a supplementUrl skip this entirely.
    if (spec.supplementUrl) {
      try {
        const extra = await fetchListText({
          url: spec.supplementUrl,
          mirrorUrl: spec.supplementMirrorUrl,
        });
        text += "\n" + extra;
      } catch (err) {
        console.warn(
          `[Sieve] Safety Shield "${name}": supplement fetch failed (using primary list only):`,
          err
        );
      }
    }
    // Most lists are hosts-format (parseHostsList); a list may override this with
    // its own `parser` (e.g. aiSlop uses the adblock "||domain^" parser).
    const parse = spec.parser || parseHostsList;
    const parsed = parse(text);
    if (parsed.length === 0) {
      throw new Error("parsed 0 domains — refusing to overwrite the stored list");
    }
    const capped = capList(parsed);
    // Big array → IndexedDB; small meta → storage.local. Store the array first so
    // the meta (which the UI trusts) is never newer than the list it describes.
    await setBigList(spec.domainsKey, capped);
    await chrome.storage.local.set({
      [spec.updatedAtKey]: Date.now(),
      [spec.countKey]: capped.length,
    });
    console.log(
      `[Sieve] Safety Shield "${name}" updated: stored ${capped.length} of ${parsed.length} parsed domains.`
    );
    return { ok: true, name, stored: capped.length, parsed: parsed.length };
  } catch (err) {
    console.error(`[Sieve] Safety Shield "${name}" update failed (last good list kept):`, err);
    return { ok: false, name, error: String((err && err.message) || err) };
  }
}

// Update all three lists. Independent per list (Promise.allSettled), so one
// list failing can never block or wipe the others.
export async function updateAllSafetyLists() {
  const names = Object.keys(SAFETY_LISTS);
  const results = await Promise.allSettled(names.map((n) => updateSafetyList(n)));
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { ok: false, name: names[i], error: String(r.reason) }
  );
}

// Read back what's currently stored for one list (used by later steps + manual
// testing). Returns { domains, updatedAt, count }.
export async function getStoredSafetyList(name) {
  const spec = SAFETY_LISTS[name];
  if (!spec) throw new Error("Unknown safety list: " + name);
  const s = await chrome.storage.local.get({
    [spec.updatedAtKey]: 0,
    [spec.countKey]: 0,
  });
  const domains = await getBigList(spec.domainsKey); // IndexedDB (self-migrates legacy data)
  return {
    name,
    domains,
    updatedAt: s[spec.updatedAtKey],
    count: s[spec.countKey],
  };
}

// ===========================================================================
// Step 2 — Auto-update scheduler (chrome.alarms)
//
// Piracy / phishing / malware domains churn fast, so the lists refresh
// themselves DAILY. This mirrors the gambling blocker's weekly alarm and the
// scam tier's daily alarm (scheduleScamRefresh / refreshScamList), with one
// difference: each list is opt-in, so a refresh only runs for a list whose
// toggle is ON — we don't download hundreds of thousands of domains for a
// feature the user never enabled.
//
// "Keep last good on failed fetch" is inherited from Step 1: updateSafetyList
// never overwrites stored data on failure, so a failed cycle simply leaves the
// previous list in place and the next daily alarm retries.
// ===========================================================================

// Per-feature toggle keys. BOTH default OFF (opt-in) — the Step 4 settings UI
// flips them. There are TWO user-facing toggles but THREE lists: the single
// "Safety & Malware" toggle (ssSafetyEnabled) governs BOTH the phishing and
// malware lists, while piracy has its own (ssPiracyEnabled).
export const PIRACY_ENABLED_KEY = "ssPiracyEnabled"; // boolean, default false
export const SAFETY_ENABLED_KEY = "ssSafetyEnabled"; // boolean, default false
export const CRYPTOJACKING_ENABLED_KEY = "ssCryptojackingEnabled"; // boolean, default false
export const AI_SLOP_ENABLED_KEY = "ssAiSlopEnabled"; // boolean, default false
export const FRAUD_ENABLED_KEY = "ssFraudEnabled"; // boolean, default false

// Map each internal list to the toggle that controls it. The cryptojacking
// list gets its own independent toggle key now so the existing iterators
// (refreshEnabledSafetyLists / isSafetyListEnabled) treat it consistently with
// the others — while it's off (the default) it is simply skipped, never fetched.
const LIST_TOGGLE_KEY = {
  piracy: PIRACY_ENABLED_KEY,
  phishing: SAFETY_ENABLED_KEY,
  malware: SAFETY_ENABLED_KEY,
  cryptojacking: CRYPTOJACKING_ENABLED_KEY,
  // aiSlop is mapped now (default OFF) so the shared install/startup/alarm
  // scheduler — which iterates every SAFETY_LISTS entry — cleanly SKIPS it
  // instead of throwing "Unknown safety list". While off it is never fetched or
  // ruled; its onChanged reaction, rule group, and UI toggle land in Steps 2-4.
  aiSlop: AI_SLOP_ENABLED_KEY,
  fraud: FRAUD_ENABLED_KEY,
};

// Is the toggle that governs this list currently ON? (defaults OFF — opt-in)
export async function isSafetyListEnabled(name) {
  const key = LIST_TOGGLE_KEY[name];
  if (!key) throw new Error("Unknown safety list: " + name);
  const s = await chrome.storage.local.get({ [key]: false });
  return s[key];
}

// Refresh ONE list, but only if its toggle is on. Skips (no fetch) while off;
// keeps the last good list on a failed fetch (via updateSafetyList). After the
// fetch it ALWAYS re-applies that list's blocking rules from whatever is stored
// (fresh, or last-good if the fetch failed), so protection survives an offline
// cycle. Mirrors financial-protection's refreshScamList.
export async function refreshSafetyList(name) {
  if (!(await isSafetyListEnabled(name))) {
    return { ok: false, name, skipped: true };
  }
  const res = await updateSafetyList(name); // fetch + store; keeps last good on failure
  await applySafetyListRules(name); // apply current stored list (fresh or last good)
  return res;
}

// One scheduled cycle: refresh every list whose toggle is on. Independent per
// list (Promise.allSettled) so one failing can't block or wipe the others. Each
// refreshed list also re-applies its blocking rules (see refreshSafetyList).
export async function refreshEnabledSafetyLists() {
  const names = Object.keys(SAFETY_LISTS);
  const results = await Promise.allSettled(names.map((n) => refreshSafetyList(n)));
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { ok: false, name: names[i], error: String(r.reason) }
  );
}

const SAFETY_REFRESH_ALARM = "ssSafetyListRefresh";
const SAFETY_REFRESH_PERIOD_MINUTES = 60 * 24; // every 24h (well under the weekly minimum)

// Create (or reset) the recurring daily refresh alarm. Idempotent — calling it
// again just re-asserts the same schedule.
function scheduleSafetyRefresh() {
  chrome.alarms.create(SAFETY_REFRESH_ALARM, { periodInMinutes: SAFETY_REFRESH_PERIOD_MINUTES });
}

// When the daily alarm fires, run a refresh cycle. Separate listener from the
// gambling/scam/doomscroll alarm listeners (Chrome dispatches to all of them);
// it only reacts to its own alarm name, so it never disturbs theirs.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SAFETY_REFRESH_ALARM) refreshEnabledSafetyLists();
});

// On install/update: schedule the daily alarm, reconcile all three rule groups
// with the saved toggle state (applies the last-good stored list right away so
// protection is live before any network round-trip), then pull a fresh copy for
// any enabled list. All a no-op while both toggles are off (the default).
// SEPARATE onInstalled listener — it does not touch the gambling / doomscroll /
// financial-protection onInstalled handlers (Chrome allows many).
// Every fetched list's big domain array now lives in IndexedDB; these are the
// legacy storage.local keys to sweep out of the area on install/startup.
const SAFETY_DOMAIN_KEYS = Object.values(SAFETY_LISTS).map((s) => s.domainsKey);

chrome.runtime.onInstalled.addListener(async () => {
  scheduleSafetyRefresh();
  // Move any pre-existing lists out of storage.local into IndexedDB before
  // reconciling, so this update cleans up the bloated area right away.
  await migrateBigLists(SAFETY_DOMAIN_KEYS);
  await reconcileSafetyRules(); // apply all groups from saved toggle + stored list
  refreshEnabledSafetyLists(); // also pull fresh now for enabled lists
});

// On browser startup: re-assert the schedule and re-reconcile the rules.
// Dynamic rules persist across restarts, but reconciling is cheap and keeps the
// live rules in lock-step with the toggle state.
chrome.runtime.onStartup.addListener(async () => {
  scheduleSafetyRefresh();
  await migrateBigLists(SAFETY_DOMAIN_KEYS); // clean up any lingering legacy lists
  reconcileSafetyRules();
});

// ===========================================================================
// Step 3 — Blocking rules: THREE SEPARATE dynamic-rule groups
//
//   • piracyRules        — IDs 130000-139999, category "piracy" (moved off 50000
//                          to avoid colliding with Financial Protection's MLM tier)
//   • phishingRules      — IDs 60000-69999, category "safety"
//   • malwareRules       — IDs 70000-79999, category "safety"
//   • cryptojackingRules — IDs 80000-89999, category "cryptojacking"
//   • aiSlopRules        — IDs 90000-99999, category "aislop"
//
// Three independent groups so the toggles work independently. Phishing + malware
// are governed by the ONE user-facing "Safety & Malware" toggle (ssSafetyEnabled)
// yet stay separate rule groups internally for clarity (and so a future split is
// trivial). Both safety lists redirect to the blocked page with category=safety,
// so the page shows one "phishing/malware" message; piracy uses category=piracy.
//
// Each group reuses the gambling/scam blocker's EXACT rule shape: redirect the
// full page (main_frame) to /pages/blocked.html, block embedded subresources,
// at priority 1 — so the shared priority-2 allowlist (ID 20000, owned by
// service-worker.js) overrides every one of these blocks with no extra wiring
// (that's Step 5's "reuse the existing allowlist"). requestDomains matches each
// domain AND all its subdomains, so "main domain + subdomains" is covered.
//
// ID ranges: the gambling blocker owns < 30000, Financial Protection owns
// 30000-59999 (scam 30000, trading 40000, MLM 50000), so Safety Shield's fetched
// tiers take 60000-109999, and its static tiers take gore/shock 110000, dating
// 120000, and the relocated piracy 130000. NB: piracy USED to sit at 50000-59999,
// which collided with FP's MLM tier — enabling both wiped one another's rules —
// so it moved to 130000-139999. Any stale piracy rules a pre-fix install left in
// 50000-59999 are swept automatically the first time FP reconciles, because
// applyMlmRules() always clears that whole band on install/startup; no separate
// migration is needed. Each module only ever removes rules within its own ranges,
// so they never clobber each other.
// At the 1,000,000-domain cap a group is <= 200 rules, comfortably inside its
// 10000-wide ID band and a rounding error against Chrome's 30000-rule ceiling.
// ===========================================================================

const SAFETY_RULES = {
  // Piracy — RELOCATED from 50000-59999 to 130000-139999. The old band collided
  // with Financial Protection's MLM tier (both call replaceDynamicRules over
  // 50000-60000, so enabling MLM + piracy together wiped one another's rules).
  // 130000 is the next free 10000-wide band after the dating tier (120000). See
  // the ID-range note above for why stale old-band rules need no migration.
  piracy: { idStart: 130000, idEnd: 140000, category: "piracy" },
  phishing: { idStart: 60000, idEnd: 70000, category: "safety" },
  malware: { idStart: 70000, idEnd: 80000, category: "safety" },
  cryptojacking: { idStart: 80000, idEnd: 90000, category: "cryptojacking" },
  // AI content farms / spam sites — its own independent group so the toggle works
  // on its own. Next free 10000-wide band after cryptojacking. buildBlockRules
  // uses requestDomains, which matches each stored domain AND all its subdomains,
  // so "main domain + subdomains" is covered without storing explicit wildcards.
  // category "aislop" tags the blocked page (its message text lands in Step 5;
  // until then an AI-slop block falls back to the generic blocked-page copy).
  aiSlop: { idStart: 90000, idEnd: 100000, category: "aislop" },
  // Fraud — next free 10000-wide band after aiSlop. ~196k domains => ~40 rules,
  // well inside the band and a rounding error against Chrome's 30000-rule ceiling.
  fraud: { idStart: 100000, idEnd: 110000, category: "fraud" },
};

// Same packing + resource types as the gambling/scam blockers (kept local so
// this module has no cross-dependency on their internals).
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
// tagging the blocked page with ?category=<category> so it shows the right
// message. requestDomains matches each domain AND all its subdomains.
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

// Every rule write is a read-modify-write (getDynamicRules → updateDynamicRules).
// If two run concurrently — which happens on install (reconcile + refresh) and
// whenever toggles/alarms overlap — their snapshots race and Chrome rejects the
// colliding call (duplicate IDs), leaving a partial rule set. This serial queue
// guarantees one write finishes before the next reads. Errors are caught so a
// failed write can't break the chain. (Same guard financial-protection.js uses;
// kept separate here because the two modules touch disjoint ID ranges.)
let ruleWriteChain = Promise.resolve();
function enqueueRuleWrite(label, fn) {
  ruleWriteChain = ruleWriteChain.then(fn).catch((err) => {
    console.error(`[Sieve] Safety Shield rule write (${label}) failed:`, err);
  });
  return ruleWriteChain;
}

// Apply ONE list's rule group. While its toggle is off we add nothing, which
// removes any existing rules for that group. While on, we build from the stored
// (already capped) list — so a failed fetch still leaves the last-good blocks in
// place. Serialized via the write queue.
export async function applySafetyListRules(name) {
  const spec = SAFETY_RULES[name];
  if (!spec) throw new Error("Unknown safety list: " + name);
  return enqueueRuleWrite(name, async () => {
    let addRules = [];
    if (await isSafetyListEnabled(name)) {
      const { domains } = await getStoredSafetyList(name);
      addRules = buildBlockRules(domains, spec.idStart, spec.category);
    }
    await replaceDynamicRules(spec.idStart, spec.idEnd, addRules);
  });
}

// Reconcile ALL three rule groups with the saved toggle state (used on install /
// startup). Sequential through the write queue so the calls don't race.
export async function reconcileSafetyRules() {
  for (const name of Object.keys(SAFETY_RULES)) {
    await applySafetyListRules(name);
  }
}

// React to the two toggles (the Step 4 settings UI writes these keys). Mirrors
// the gambling/scam storage.onChanged wiring; additive — it doesn't touch the
// listeners already in service-worker.js or financial-protection.js.
//   • piracy toggle  → ON: fetch fresh + apply; OFF: applySafetyListRules removes
//   • safety toggle  → governs BOTH phishing and malware together
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[PIRACY_ENABLED_KEY]) {
    if (changes[PIRACY_ENABLED_KEY].newValue) refreshSafetyList("piracy");
    else applySafetyListRules("piracy");
  }
  if (changes[SAFETY_ENABLED_KEY]) {
    const on = changes[SAFETY_ENABLED_KEY].newValue;
    for (const name of ["phishing", "malware"]) {
      if (on) refreshSafetyList(name);
      else applySafetyListRules(name);
    }
  }
  if (changes[CRYPTOJACKING_ENABLED_KEY]) {
    if (changes[CRYPTOJACKING_ENABLED_KEY].newValue) refreshSafetyList("cryptojacking");
    else applySafetyListRules("cryptojacking");
  }
  if (changes[AI_SLOP_ENABLED_KEY]) {
    if (changes[AI_SLOP_ENABLED_KEY].newValue) refreshSafetyList("aiSlop");
    else applySafetyListRules("aiSlop");
  }
  if (changes[FRAUD_ENABLED_KEY]) {
    if (changes[FRAUD_ENABLED_KEY].newValue) refreshSafetyList("fraud");
    else applySafetyListRules("fraud");
  }
});

// ===========================================================================
// Test hooks — drive Steps 1-3 from the service-worker DevTools console, e.g.
//   await sieveSafety.updateSafetyList("piracy")     // ungated: fetch + store one
//   await sieveSafety.updateSafetyList("cryptojacking") // nocoin + coinhive merge
//   await sieveSafety.updateAllSafetyLists()          // ungated: fetch + store all
//   await sieveSafety.getStoredSafetyList("malware")  // inspect what's stored
//   await sieveSafety.getStoredSafetyList("cryptojacking") // inspect the miner list
//   // simulate the Step 4 toggles, then run the gated cycle the alarm runs:
//   await chrome.storage.local.set({ ssPiracyEnabled: true, ssSafetyEnabled: true })
//   await sieveSafety.refreshEnabledSafetyLists()     // gated: fetch + apply rules
//   await sieveSafety.reconcileSafetyRules()          // re-apply all 3 groups
//   await sieveSafety.applySafetyListRules("phishing")// apply one group from store
//   // inspect the live rules Safety Shield installed:
//   (await chrome.declarativeNetRequest.getDynamicRules()).filter(r => r.id >= 50000)
// (The real toggle UI and visible "last updated" line arrive in Steps 4-5.)
// ===========================================================================
globalThis.sieveSafety = Object.assign(globalThis.sieveSafety || {}, {
  updateSafetyList,
  updateAllSafetyLists,
  getStoredSafetyList,
  parseHostsList,
  parseAdblockList,
  refreshSafetyList,
  refreshEnabledSafetyLists,
  isSafetyListEnabled,
  applySafetyListRules,
  reconcileSafetyRules,
  SAFETY_LISTS,
  SAFETY_RULES,
});

// ===========================================================================
// STATIC TIER — Gore / Shock sites  (added feature)
//
// A sixth Safety Shield blocker, but UNLIKE the five above it is a STATIC,
// baked-in list — data/gore-shock-sites.json (98 reviewed domains from the
// ShadowWhisperer "Shock" list). Gore/shock sites are a small, stable set of
// well-known domains, so there is NO fetch, NO scheduler, and NO chrome.storage
// domain cache: the bundled JSON is the single source of truth. Editing that
// file + reloading the extension rebuilds the rules. This mirrors the STATIC
// MLM/trading tiers in financial-protection.js, but REUSES this module's shared
// rule primitives (buildBlockRules / replaceDynamicRules / enqueueRuleWrite) so
// no engine is duplicated.
//
// It is intentionally kept OUT of SAFETY_LISTS (the fetch registry) and
// SAFETY_RULES (whose generic iterators assume a fetched + stored list), so the
// daily scheduler never touches it. Everything below is self-contained and
// additive — it edits none of the code above.
//
// SCOPE: this is DOMAIN BLOCKING ONLY. It is NOT the full "Graphic Content
// Filter" (per-image scanning with nsfwjs) — that is a separate, larger future
// feature and NO image-scanning code exists here.
//
//   • goreShockRules — IDs 110000-119999, category "goreshock"
//     (next free 10000-wide band after fraud's 100000-110000). 98 domains pack
//     into 1 chunk => 2 rules (1 redirect + 1 block), well inside the band.
// ===========================================================================

// Toggle key — opt-in, default OFF (the Step 3 settings UI flips it). Same
// "ss…" namespace as the other Safety Shield toggles.
export const GORE_SHOCK_ENABLED_KEY = "ssGoreShockEnabled"; // boolean, default false

const GORE_SHOCK_RULE_ID_START = 110000;
const GORE_SHOCK_RULE_ID_END = 120000; // exclusive
const GORE_SHOCK_CATEGORY = "goreshock";

// Is the gore/shock blocker currently on? (defaults OFF — opt-in)
export async function isGoreShockEnabled() {
  const s = await chrome.storage.local.get({ [GORE_SHOCK_ENABLED_KEY]: false });
  return s[GORE_SHOCK_ENABLED_KEY];
}

// Read the reviewed, STATIC gore/shock list shipped inside the extension. Like
// the MLM/trading tiers this is a bundled file, not fetched at runtime — the
// domains are stable, so a manual refresh suffices and there is no scheduler.
// Editing data/gore-shock-sites.json + reloading the extension rebuilds the
// rules. It is NEVER merged with any other list.
async function loadGoreShockDomains() {
  try {
    const res = await fetch(chrome.runtime.getURL("data/gore-shock-sites.json"));
    const list = await res.json();
    return Array.isArray(list)
      ? list.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
      : [];
  } catch (err) {
    console.error("[Sieve] Could not load data/gore-shock-sites.json:", err);
    return [];
  }
}

// goreShockRules — built from the bundled JSON. While the toggle is off we add
// nothing, which removes any existing gore/shock rules. While on, we build
// redirect(full-page) + block(subresource) rules via the shared buildBlockRules,
// tagging the blocked page with category=goreshock. requestDomains matches each
// domain AND all its subdomains, so "main domain + subdomains" is covered. The
// rules are priority 1, so the shared priority-2 allowlist (ID 20000, owned by
// service-worker.js) overrides them with no extra wiring. Serialized via the
// module's shared write queue so it can't race the other groups.
export async function applyGoreShockRules() {
  return enqueueRuleWrite("goreShock", async () => {
    let addRules = [];
    if (await isGoreShockEnabled()) {
      const domains = await loadGoreShockDomains();
      addRules = buildBlockRules(domains, GORE_SHOCK_RULE_ID_START, GORE_SHOCK_CATEGORY);
    }
    await replaceDynamicRules(GORE_SHOCK_RULE_ID_START, GORE_SHOCK_RULE_ID_END, addRules);
  });
}

// Reconcile the gore/shock group on install/update and on browser startup, so
// the live rules always match the saved toggle (and pick up any hand edits to
// the bundled JSON made before the reload). SEPARATE listeners — additive, they
// don't touch the module's existing onInstalled/onStartup handlers above.
chrome.runtime.onInstalled.addListener(() => {
  applyGoreShockRules();
});
chrome.runtime.onStartup.addListener(() => {
  applyGoreShockRules();
});

// React to the toggle (the Step 3 settings UI writes this key). SEPARATE
// onChanged listener — additive, it doesn't touch the one above. ON or OFF both
// just re-apply from the bundled list (no fetch — it's static).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[GORE_SHOCK_ENABLED_KEY]) applyGoreShockRules();
});

// Test hooks — additive extension of the existing sieveSafety object, e.g.
//   await chrome.storage.local.set({ ssGoreShockEnabled: true }) // simulate toggle
//   await sieveSafety.applyGoreShockRules()   // apply from the bundled list
//   await sieveSafety.loadGoreShockDomains()  // inspect the bundled domains
//   (await chrome.declarativeNetRequest.getDynamicRules()).filter(r => r.id >= 110000 && r.id < 120000)
globalThis.sieveSafety = Object.assign(globalThis.sieveSafety || {}, {
  isGoreShockEnabled,
  loadGoreShockDomains,
  applyGoreShockRules,
  GORE_SHOCK_ENABLED_KEY,
});

// ===========================================================================
// STATIC TIER — Dating sites  (added feature)
//
// A curated, opt-in blocker for MAINSTREAM + HOOKUP dating sites (Tinder,
// Bumble, Match, Grindr, Ashley Madison, AdultFriendFinder, …). Like the
// MLM / trading / gore-shock tiers it is STATIC — a hand-reviewed bundled list
// in data/dating-sites.json — because dating "brands" are a stable, well-known
// set, so there is NO fetch, NO scheduler, and NO chrome.storage domain cache.
//
// It is SELF-CONTROL, not a safety threat, so the blocked page uses a neutral,
// opt-in tone ("You chose to block dating sites") via category=dating — never a
// moralizing warning. It deliberately leaves hardcore/adult-content & cam sites
// alone; those are out of Sieve's scope (a separate porn blocker covers them).
//
// Editing data/dating-sites.json + reloading the extension rebuilds the rules.
// It REUSES this module's shared rule primitives (buildBlockRules /
// replaceDynamicRules / enqueueRuleWrite), so no engine is duplicated, and is
// kept OUT of SAFETY_LISTS / SAFETY_RULES so the daily scheduler never touches it.
//
//   • datingRules — IDs 120000-129999, category "dating"
//     (next free 10000-wide band after gore/shock's 110000-120000). 65 domains
//     pack into 1 chunk => 2 rules (1 redirect + 1 block), well inside the band.
// ===========================================================================

// Toggle key — opt-in, default OFF (the settings UI flips it). Same "ss…"
// namespace as the other Safety Shield toggles.
export const DATING_ENABLED_KEY = "ssDatingEnabled"; // boolean, default false

const DATING_RULE_ID_START = 120000;
const DATING_RULE_ID_END = 130000; // exclusive
const DATING_CATEGORY = "dating";

// Is the dating blocker currently on? (defaults OFF — opt-in)
export async function isDatingEnabled() {
  const s = await chrome.storage.local.get({ [DATING_ENABLED_KEY]: false });
  return s[DATING_ENABLED_KEY];
}

// Read the reviewed, STATIC dating list shipped inside the extension. Like the
// MLM/trading/gore tiers this is a bundled file, not fetched at runtime — the
// domains are stable, so a manual refresh suffices and there is no scheduler.
async function loadDatingDomains() {
  try {
    const res = await fetch(chrome.runtime.getURL("data/dating-sites.json"));
    const list = await res.json();
    return Array.isArray(list)
      ? list.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
      : [];
  } catch (err) {
    console.error("[Sieve] Could not load data/dating-sites.json:", err);
    return [];
  }
}

// datingRules — built from the bundled JSON. While the toggle is off we add
// nothing, which removes any existing dating rules. While on, we build
// redirect(full-page) + block(subresource) rules via the shared buildBlockRules,
// tagging the blocked page with category=dating. requestDomains matches each
// domain AND all its subdomains. Priority 1, so the shared priority-2 allowlist
// (ID 20000, owned by service-worker.js) overrides them with no extra wiring.
// Serialized via the module's shared write queue so it can't race the others.
export async function applyDatingRules() {
  return enqueueRuleWrite("dating", async () => {
    let addRules = [];
    if (await isDatingEnabled()) {
      const domains = await loadDatingDomains();
      addRules = buildBlockRules(domains, DATING_RULE_ID_START, DATING_CATEGORY);
    }
    await replaceDynamicRules(DATING_RULE_ID_START, DATING_RULE_ID_END, addRules);
  });
}

// Reconcile on install/update and on browser startup so the live rules always
// match the saved toggle (and pick up any hand edits to the bundled JSON made
// before the reload). SEPARATE listeners — additive, they don't touch the
// module's existing onInstalled/onStartup handlers above.
chrome.runtime.onInstalled.addListener(() => {
  applyDatingRules();
});
chrome.runtime.onStartup.addListener(() => {
  applyDatingRules();
});

// React to the toggle (the settings UI writes this key). SEPARATE onChanged
// listener — additive. ON or OFF both just re-apply from the bundled list.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[DATING_ENABLED_KEY]) applyDatingRules();
});

// Test hooks — additive extension of the existing sieveSafety object, e.g.
//   await chrome.storage.local.set({ ssDatingEnabled: true }) // simulate toggle
//   await sieveSafety.applyDatingRules()   // apply from the bundled list
//   await sieveSafety.loadDatingDomains()  // inspect the bundled domains
//   (await chrome.declarativeNetRequest.getDynamicRules()).filter(r => r.id >= 120000 && r.id < 130000)
globalThis.sieveSafety = Object.assign(globalThis.sieveSafety || {}, {
  isDatingEnabled,
  loadDatingDomains,
  applyDatingRules,
  DATING_ENABLED_KEY,
});

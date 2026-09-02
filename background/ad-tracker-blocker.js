// background/ad-tracker-blocker.js
// Sieve — Ad & Tracker Blocker (BETA).
//
// A single opt-in blocker for third-party AD-NETWORK and TRACKER domains, built
// from the bundled data/tracker-domains.json (derived from EasyPrivacy — see
// data/ATTRIBUTION-easylist.md for the licence position).
//
// It invents NO new blocking system: same shape as the STATIC tiers in
// background/safety-shield.js (gore-shock / dating / games) — bundled JSON, no
// fetch, no scheduler, no chrome.storage domain cache. Refreshing the list is
// `node build-tracker-list.mjs` plus a release. It lives in its own file rather
// than inside safety-shield.js because it is its own settings section, not a
// sixth Safety Shield tier.
//
// SCOPE — this is a DOMAIN blocker, and the UI must keep saying so. It kills
// third-party ad and tracker traffic. It does NOT kill YouTube ads, anti-adblock
// walls, or ads a site serves from its own domain: those need cosmetic filtering
// and scriptlet injection, which are deliberately out of scope. Nothing here
// hides elements, injects scripts, or redirects a subresource to a stub.
//
// ---------------------------------------------------------------------------
// HOW THIS TIER DIFFERS FROM EVERY OTHER ONE — read before editing.
//
// Every existing tier blocks SITES THE USER NAVIGATES TO, so its dominant action
// is "redirect the page to pages/blocked.html". Trackers and ad networks are
// SUB-RESOURCES: nobody types doubleclick.net into the address bar, they just
// load it 40 times a day without noticing. So here:
//
//   • subresources are BLOCKED, never redirected. Redirecting a subresource to
//     an HTML interstitial hands the page an HTML document where it expected a
//     script or a pixel, which breaks the page harder than a clean block does.
//   • main_frame still redirects, for the rare case someone opens a tracker
//     domain directly — same blocked page, same category, as every other tier.
//
// There are consequently THREE rule shapes here, not the usual two. See
// buildTrackerRules().
// ---------------------------------------------------------------------------

// Toggle key — opt-in, default OFF, in the same "ss…" namespace as the Safety
// Shield toggles. The settings UI flips it; turning it OFF goes through the
// Guardian PIN gate there (it weakens protection), turning it ON is free.
// Guardian is enforced in the UI layer, exactly as it is for every other toggle
// — this module only ever reacts to the stored key.
export const AD_TRACKER_ENABLED_KEY = "ssAdTrackerEnabled"; // boolean, default false
export const AD_NETWORK_ENABLED_KEY = "ssAdNetworkEnabled"; // boolean, default false

// DNR id band. Bands below 180000 are all allocated (gambling < 10000, custom
// blocks 10000, allowlist 20000, Financial Protection 30000-59999, Safety Shield
// 60000-139999, games 140000-179999). 190000-199999 stays FREE: it is reserved
// for a separate "Ad networks" toggle if EasyList is ever added as a second
// source. This module only ever removes rules inside its own band, so it can
// never clobber another tier's.
const AD_TRACKER_ID_START = 180000;
const AD_TRACKER_ID_END = 190000; // exclusive

// TWO independent groups, one band each, mirroring how safety-shield.js splits
// the Game Blocker. They are separate because they come from separate upstream
// lists and carry very different breakage risk: EasyPrivacy (trackers) is
// conservative, EasyList (ad networks) targets ad delivery and is the one more
// likely to leave a visible hole or upset a site. A user can take analytics
// blocking without ad blocking, which is exactly what the split is for.
export const AD_TRACKER_GROUPS = {
  trackers: {
    key: AD_TRACKER_ENABLED_KEY,
    idStart: AD_TRACKER_ID_START,
    idEnd: AD_TRACKER_ID_END,
    category: "trackers",
  },
  ads: {
    key: AD_NETWORK_ENABLED_KEY,
    idStart: 190000,
    idEnd: 200000, // exclusive — the last band; nothing else may take 190000+
    category: "ads",
  },
};

// ===========================================================================
// Neutered stubs — the one place this tier answers instead of blocking
// ===========================================================================
//
// A handful of URLs are worse blocked than allowed, and this is the list of them.
//
// The case that put it here: YouTube loads
// static.doubleclick.net/instream/ad_status.js. Upstream blocks the whole host
// (`||static.doubleclick.net^` in EasyList, no YouTube carve-out), so this tier
// blocks it too and the request fails with ERR_BLOCKED_BY_CLIENT. That failure is
// not neutral — a request that fails this way is visible to the page, and a
// script named ad_status.js failing to load tells the site precisely what it
// wants to know. It is the same mistake as announcing that the ad breaks are
// missing, which content/youtube-ads.js goes to some length to avoid: block the
// ads, then hand over a receipt proving you did.
//
// Serving an empty script instead costs nothing — the file does nothing, no ad is
// delivered — and leaves no failed request behind.
//
// Kept SHORT and named one URL at a time. This is an exception to a tier whose
// entire job is blocking, so each entry has to earn its place; a pattern here
// that was too broad would quietly un-block real ad delivery.
//
// `host` is the domain as it appears in the list, and it is not decoration: the
// stub inherits that host's site carve-outs (see buildTrackerRules), so a stub
// never fires on a site where the block rule itself stands down. Every host
// named here must actually be on the list for its group — a stub for a host this
// tier does not block would REPLACE a script that was working, since DNR has no
// "redirect only if it would have been blocked".
const NEUTERED_STUBS = [
  {
    group: "ads", // upstream lists static.doubleclick.net in the EasyList group
    host: "static.doubleclick.net",
    urlFilter: "||static.doubleclick.net/instream/ad_status.js",
    resourceTypes: ["script"],
    stub: "/rules/noop.js",
  },
  // The three below were added for the anti-adblock feature, and they are the
  // whole network-level half of it. A site that wants to know whether you can
  // see adverts asks by loading one of these and checking whether it arrived.
  {
    // The single most-probed URL on the web: every AdSense page loads it, and
    // "did adsbygoogle.js load" is the canonical detection one-liner.
    group: "ads",
    host: "pagead2.googlesyndication.com",
    urlFilter: "||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    resourceTypes: ["script"],
    stub: "/rules/noop.js",
  },
  {
    // Legacy AdSense. Long superseded, still shipped by older publishers, and
    // still probed by the detector snippets that were written alongside it.
    group: "ads",
    host: "pagead2.googlesyndication.com",
    urlFilter: "||pagead2.googlesyndication.com/pagead/show_ads.js",
    resourceTypes: ["script"],
    stub: "/rules/noop.js",
  },
  {
    // Google Publisher Tag. Stubbed for the failed-request signal ONLY — an
    // empty file leaves window.googletag undefined, exactly as blocking the
    // request does, so nothing about the page's behaviour changes. Faking
    // `googletag` itself is deliberately not attempted; see the "WHAT IS
    // DELIBERATELY NOT HERE" note in content/anti-adblock.js for why a
    // half-built slot API is worse than none.
    group: "ads",
    host: "googletagservices.com",
    urlFilter: "||googletagservices.com/tag/js/gpt.js",
    resourceTypes: ["script"],
    stub: "/rules/noop.js",
  },
];

// Stub rules take ids from the TOP of each group's 10000-wide band, where the
// chunked block rules can never reach: the largest group is ~48k domains, which
// is 5 chunk rules plus a few hundred scoped and typed ones.
const STUB_ID_OFFSET = 9900;

// Same packing as the gambling / scam / Safety Shield blockers. Kept local so
// this module has no cross-dependency on their internals — the same reason
// safety-shield.js keeps its own copy rather than importing service-worker's.
const DOMAINS_PER_RULE = 10000;
const SUBRESOURCE_TYPES = [
  "sub_frame", "script", "image", "stylesheet", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other",
];

// Is the blocker currently on? (defaults OFF — opt-in)
export async function isAdTrackerEnabled(name = "trackers") {
  const spec = AD_TRACKER_GROUPS[name];
  if (!spec) throw new Error("Unknown ad/tracker group: " + name);
  const s = await chrome.storage.local.get({ [spec.key]: false });
  return s[spec.key];
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ===========================================================================
// The bundled list
// ===========================================================================

// Read the generated, STATIC tracker list shipped inside the extension. Two
// groups, because the upstream list distinguishes them and DNR can honour the
// distinction natively (see buildTrackerRules):
//   always     — block wherever it appears
//   thirdParty — block only cross-site
//   scoped     — hosts upstream blocks by default but carves out on a NAMED LIST
//                OF SITES (e.g. googletagmanager.com, excepted on ~500 sites).
//                Each gets its own rule so it can carry that site list as
//                excludedInitiatorDomains — blocked everywhere upstream did not
//                name it. Folding these into the bulk groups is impossible: a
//                10,000-domain chunk rule has nowhere to put a per-host exception.
//   spared     — hosts upstream explicitly excepted that sit UNDER a listed
//                parent, so removing them from the list would not have spared
//                them (requestDomains matches every subdomain). These become
//                excludedRequestDomains — see buildTrackerRules.
//
// ~1 MB of JSON, parsed only when the tier is ON and only when the rules are
// (re)built: install, browser startup, a toggle flip, or an allowlist edit.
// Never on a per-request path — matching is native DNR once the rules are in.
async function loadTrackerDomains(name) {
  const empty = { always: [], thirdParty: [], scoped: [], typed: [], spared: [] };
  try {
    const res = await fetch(chrome.runtime.getURL("data/tracker-domains.json"));
    const data = await res.json();
    const group = data && data[name];
    if (!group || typeof group !== "object") return empty;
    const clean = (list) =>
      Array.isArray(list) ? list.map((d) => String(d).trim().toLowerCase()).filter(Boolean) : [];
    return {
      always: clean(group.always),
      thirdParty: clean(group.thirdParty),
      scoped: Array.isArray(group.scoped)
        ? group.scoped.filter((e) => e && e.domain && Array.isArray(e.exceptInitiators))
        : [],
      typed: Array.isArray(group.typed)
        ? group.typed.filter((b) => b && Array.isArray(b.resourceTypes) && Array.isArray(b.domains))
        : [],
      spared: clean(group.spared),
    };
  } catch (err) {
    console.error("[Sieve] Could not load data/tracker-domains.json:", err);
    return empty;
  }
}

// ===========================================================================
// The allowlist — why this tier needs its own wiring
//
// Every other tier gets the shared allowlist for free: service-worker.js installs
// ONE priority-2 allow rule (id 20000) whose condition is `requestDomains`, so
// allowlisting example.com allows requests *to* example.com, which is exactly
// what "let me visit this blocked site" means.
//
// That does NOT work here, and the difference is easy to miss. This tier blocks
// requests to tracker.com made *from* the site the user is on. A `requestDomains`
// allow rule for the user's bank never matches those requests — its target is
// tracker.com, not the bank. So the shared allowlist would silently fail to be
// the escape hatch, on the one tier most likely to break a checkout.
//
// The fix is to exclude allowlisted INITIATORS from this tier's block rules:
// "while I am on this site, don't run the tracker blocker." That is what the
// user means when they allowlist a site that this tier broke.
//
// Done with `excludedInitiatorDomains` on our own rules rather than a new
// priority-2 allow rule, because an allow rule scoped by initiator would also
// override the OTHER tiers' blocks on that page — e.g. letting a blocked
// gambling frame load inside an allowlisted site. Excluding initiators touches
// nothing outside this band.
// ===========================================================================

// Normalise the user's allowlist into bare domains DNR will accept. Entries are
// already clean by the time service-worker.js feeds them to requestDomains, but
// this rule set would be taken down ENTIRELY by one entry Chrome rejects
// (updateDynamicRules is all-or-nothing), so we do not rely on someone else's
// validation to keep this tier alive.
export function allowlistInitiators(allowlist) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(allowlist) ? allowlist : []) {
    let d = String(raw).trim().toLowerCase();
    if (!d || d.startsWith("#")) continue;
    d = d
      .replace(/^\*\./, "")
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0];
    if (!d.includes(".")) continue;
    if (/[^a-z0-9.\-_]/.test(d)) continue; // regex / title entries are not domains
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

// ===========================================================================
// Rule building — three shapes
// ===========================================================================

// Build this tier's rules. requestDomains matches each listed domain AND all its
// subdomains, so the converter's subdomain collapsing costs no coverage.
//
// All rules are priority 1, so the shared priority-2 allowlist (id 20000) still
// wins for a main_frame hit on an allowlisted domain, with no extra wiring —
// same as every other tier.
//
//   1. main_frame redirect (from `always`) — someone navigated straight to a
//      tracker domain. Rare, but it should say why, like every other tier.
//   2. subresource block (from `always`).
//   3. subresource block (from `thirdParty`) with domainType "thirdParty".
//   4. one rule per `scoped` host, carrying its own site carve-out list.
//   5. one rule per `typed` bucket, scoped to the resource types upstream named.
//
// `thirdParty` gets NO main_frame rule on purpose: a top-level navigation is
// first-party by definition, so such a rule could never match. Building it would
// just burn an id and imply a block that never happens.
export function buildTrackerRules(
  domains,
  initiatorExclusions,
  idStart = AD_TRACKER_ID_START,
  category = "trackers"
) {
  const always = domains.always || [];
  const thirdParty = domains.thirdParty || [];
  const scoped = domains.scoped || [];
  const typed = domains.typed || [];
  const spared = domains.spared || [];
  if (!always.length && !thirdParty.length && !scoped.length && !typed.length) return [];

  // Only attach the exclusion when there is something to exclude — DNR rejects
  // an empty array for these fields outright.
  const excluded =
    initiatorExclusions && initiatorExclusions.length
      ? { excludedInitiatorDomains: initiatorExclusions }
      : {};

  // Hosts upstream spared that live under a domain we still block. DNR gives
  // excludedRequestDomains precedence over requestDomains, so this is the exact
  // carve-out — "block datadome.co, except api-js.datadome.co". Attached to every
  // shape including the page redirect, because a host upstream vouched for should
  // not be interstitialled either. Same empty-array rule as above: DNR rejects [].
  const spareExcept = spared.length ? { excludedRequestDomains: spared } : {};

  const rules = [];
  let id = idStart;

  // Shape 6 — the neutered stubs, at priority 2 so they beat this tier's own
  // priority-1 block on the same host.
  //
  // Priority 2 also ties with the shared allowlist rule (id 20000), and that tie
  // is decided correctly without extra wiring — DNR ranks `allow` above
  // `redirect` at equal priority.
  //
  // TWO sets of sites are kept off every stub, and it builds its own exclusion
  // list rather than reusing `excluded` because it needs both:
  //
  //   • the user's allowlist, so an allowlisted site gets the REAL script rather
  //     than our empty one — on an allowlisted site nothing here should be
  //     interfering at all, and handing over a neutered script is interfering;
  //   • the site carve-outs upstream put on the stub's own host. Shape 4 stands
  //     the BLOCK down on those sites, because a human found that blocking it
  //     there broke the page. A stub that kept firing would hand out an empty
  //     script instead — the same breakage by a quieter route, since the request
  //     succeeds. The lookup is by host, which is why every NEUTERED_STUBS entry
  //     carries one.
  let stubId = idStart + STUB_ID_OFFSET;
  const stubCarveOuts = new Map(
    scoped.filter((e) => e && e.domain).map((e) => [e.domain, e.exceptInitiators || []])
  );
  for (const s of NEUTERED_STUBS) {
    if (s.group !== category) continue;
    // NOT named `spared`: that name is taken by the list of HOSTS upstream
    // vouched for, and this is a list of SITES to stand down on.
    const stubSpared = [
      ...new Set([...(stubCarveOuts.get(s.host) || []), ...(initiatorExclusions || [])]),
    ];
    rules.push({
      id: stubId++,
      priority: 2,
      action: { type: "redirect", redirect: { extensionPath: s.stub } },
      condition: {
        urlFilter: s.urlFilter,
        resourceTypes: s.resourceTypes,
        // Same empty-array rule as everywhere else in this file: DNR rejects [].
        ...(stubSpared.length ? { excludedInitiatorDomains: stubSpared } : {}),
      },
    });
  }

  for (const g of chunk(always, DOMAINS_PER_RULE)) {
    rules.push({
      id: id++,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { extensionPath: `/pages/blocked.html?category=${category}` },
      },
      condition: { requestDomains: g, resourceTypes: ["main_frame"], ...spareExcept },
    });
  }
  for (const g of chunk(always, DOMAINS_PER_RULE)) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "block" },
      condition: { requestDomains: g, resourceTypes: SUBRESOURCE_TYPES, ...spareExcept, ...excluded },
    });
  }
  for (const g of chunk(thirdParty, DOMAINS_PER_RULE)) {
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "block" },
      condition: {
        requestDomains: g,
        resourceTypes: SUBRESOURCE_TYPES,
        // Upstream marked these $third-party because the domain ALSO serves
        // legitimate first-party content. Blocking them unconditionally would
        // break the sites that own them.
        domainType: "thirdParty",
        ...spareExcept,
        ...excluded,
      },
    });
  }

  // Shape 4 — one rule per site-carve-out host. Blocked like any other tracker,
  // except on the sites upstream named, which ride in excludedInitiatorDomains
  // alongside the user's own allowlist. No main_frame rule: same reason as the
  // thirdParty group for those, and for the rest because a carve-out host is a
  // subresource host, not somewhere anyone navigates.
  for (const entry of scoped) {
    const initiators = [...new Set([...(entry.exceptInitiators || []), ...initiatorExclusions])];
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "block" },
      condition: {
        requestDomains: [entry.domain],
        resourceTypes: SUBRESOURCE_TYPES,
        ...(entry.group === "thirdParty" ? { domainType: "thirdParty" } : {}),
        ...(initiators.length ? { excludedInitiatorDomains: initiators } : {}),
      },
    });
  }

  // Shape 5 — type-scoped blocks. Upstream scopes some rules to resource types
  // ("||google-analytics.com^$script,third-party,xmlhttprequest"), which DNR
  // expresses natively via `resourceTypes`. Domains sharing an identical
  // condition are packed into one rule, so ~150 domains cost ~26 rules rather
  // than one each. No main_frame rule: every type here is a subresource type.
  for (const bucket of typed) {
    const types = (bucket.resourceTypes || []).filter((t) => SUBRESOURCE_TYPES.includes(t));
    if (!types.length || !bucket.domains || !bucket.domains.length) continue;
    for (const g of chunk(bucket.domains, DOMAINS_PER_RULE)) {
      rules.push({
        id: id++,
        priority: 1,
        action: { type: "block" },
        condition: {
          requestDomains: g,
          resourceTypes: types,
          ...(bucket.thirdParty ? { domainType: "thirdParty" } : {}),
          ...spareExcept,
          ...excluded,
        },
      });
    }
  }
  return rules;
}

// Remove every dynamic rule we own in [start, end) and (re)add the given rules.
// Local copy, same as the one in safety-shield.js — this module deliberately has
// no cross-dependency on another blocker's internals.
async function replaceDynamicRules(start, end, addRules) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.filter((r) => r.id >= start && r.id < end).map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// Every rule write is a read-modify-write, so two overlapping writes race and
// Chrome rejects the loser on duplicate ids. This tier can get two at once
// easily — install fires while an allowlist edit lands. Its own chain, because
// it owns a band no other module touches. (Same guard safety-shield.js and
// service-worker.js each keep for their own ranges.)
let ruleWriteChain = Promise.resolve();
function enqueueRuleWrite(label, fn) {
  ruleWriteChain = ruleWriteChain.then(fn).catch((err) => {
    console.error(`[Sieve] Ad & Tracker rule write (${label}) failed:`, err);
  });
  return ruleWriteChain;
}

// Apply the tier from the bundled list + the current allowlist. While the toggle
// is off we add nothing, which removes any rules we previously installed — and
// we skip loading the 1 MB list entirely, so a user who never enables this pays
// nothing for it.
export async function applyAdTrackerRules(name) {
  const spec = AD_TRACKER_GROUPS[name];
  if (!spec) throw new Error("Unknown ad/tracker group: " + name);
  return enqueueRuleWrite(name, async () => {
    let addRules = [];
    if (await isAdTrackerEnabled(name)) {
      const { allowlist } = await chrome.storage.local.get({ allowlist: [] });
      const domains = await loadTrackerDomains(name);
      addRules = buildTrackerRules(
        domains,
        allowlistInitiators(allowlist),
        spec.idStart,
        spec.category
      );
    }
    await replaceDynamicRules(spec.idStart, spec.idEnd, addRules);
  });
}

// Reconcile both groups (install, startup).
export async function applyAllAdTrackerRules() {
  for (const name of Object.keys(AD_TRACKER_GROUPS)) {
    await applyAdTrackerRules(name);
  }
}

// Reconcile on install/update and on browser startup so the live rules always
// match the saved toggle (and pick up a refreshed data/tracker-domains.json
// shipped by a new version). SEPARATE listeners — Chrome allows many, and these
// touch nothing the other modules registered.
chrome.runtime.onInstalled.addListener(() => {
  applyAllAdTrackerRules();
});
chrome.runtime.onStartup.addListener(() => {
  applyAllAdTrackerRules();
});

// React to the toggle, and to allowlist edits — the allowlist is baked into this
// tier's conditions (see above), so it has to be rebuilt when the list changes.
// Only when the tier is on: while it is off there are no rules to rebuild, and
// re-applying on every allowlist keystroke-save would be a pointless rule write.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  let rebuiltAny = false;
  for (const [name, spec] of Object.entries(AD_TRACKER_GROUPS)) {
    if (changes[spec.key]) {
      applyAdTrackerRules(name); // only the group whose toggle moved
      rebuiltAny = true;
    }
  }
  if (rebuiltAny) return; // a toggle rebuild already picks up the current allowlist
  if (!changes.allowlist) return;
  for (const name of Object.keys(AD_TRACKER_GROUPS)) {
    if (await isAdTrackerEnabled(name)) applyAdTrackerRules(name);
  }
});

// Test hooks — drive this from the service-worker DevTools console, e.g.
//   await chrome.storage.local.set({ ssAdTrackerEnabled: true, ssAdNetworkEnabled: true })
//   await sieveAdTracker.applyAdTrackerRules("trackers") // apply one group
//   await sieveAdTracker.applyAllAdTrackerRules()        // apply both
//   await sieveAdTracker.loadTrackerDomains("ads")       // inspect the bundled domains
//   (await chrome.declarativeNetRequest.getDynamicRules()).filter(r => r.id >= 180000 && r.id < 200000)
globalThis.sieveAdTracker = {
  AD_TRACKER_ENABLED_KEY,
  AD_NETWORK_ENABLED_KEY,
  AD_TRACKER_GROUPS,
  isAdTrackerEnabled,
  loadTrackerDomains,
  buildTrackerRules,
  applyAdTrackerRules,
  applyAllAdTrackerRules,
};

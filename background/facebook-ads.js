// background/facebook-ads.js
// Sieve — registers (and unregisters) the Facebook ad filter.
//
// The four pieces it registers are content/facebook-ads.js (MAIN world),
// content/facebook-ads-dom.js (isolated world), content/facebook-ads.css and
// content/facebook-ads-bridge.js. Read the header of content/facebook-ads.js for
// WHY Facebook ads cannot be handled by a block rule.
//
// WHY DYNAMIC REGISTRATION RATHER THAN A MANIFEST ENTRY
// Same reason as background/youtube-ads.js: the scriptlet has to run in the
// page's MAIN world at document_start, before Facebook's own bootstrap parses
// the feed payload inlined in the document. A manifest content_scripts entry
// would give that timing but would also inject a MAIN-world script that patches
// JSON.parse into every user's Facebook session whether or not they asked for
// it. chrome.scripting.registerContentScripts gives the same timing while
// staying genuinely opt-in — registered when the toggle goes on, removed when it
// goes off.
//
// SCOPE — this module registers four things on facebook.com and nothing anywhere
// else. It adds no permissions: `scripting` and <all_urls> are already in the
// manifest for the existing content scripts.

// Toggle key — opt-in, default OFF, same "ss…" namespace as the other blockers.
// Turning it OFF weakens what the user set up, so the settings UI puts it behind
// the Guardian PIN gate like every other protection toggle.
export const FACEBOOK_ADS_ENABLED_KEY = "ssFacebookAdsEnabled"; // boolean, default false

// Stable ids so a re-register replaces rather than duplicates.
const SCRIPT_ID = "sieve-facebook-ads";
const DOM_ID = "sieve-facebook-ads-dom";
const STYLE_ID = "sieve-facebook-ads-css";
const BRIDGE_ID = "sieve-facebook-ads-bridge";

// `*.facebook.com` matches the bare domain as well as every subdomain, so this
// covers www., web., m., mbasic. and the rest with one pattern.
const MATCHES = ["*://*.facebook.com/*"];

// allFrames is FALSE on all four, and deliberately.
//
// The feed, Watch, Marketplace and search all render in the TOP-LEVEL document,
// and that is also where the GraphQL payloads carrying the ads are parsed. The
// iframes on facebook.com are plugins, embeds and pixel frames — running four
// scripts, a MutationObserver and a JSON.parse patch inside every one of them
// would cost real time and buy nothing. (The YouTube filter sets allFrames true
// because an embedded PLAYER is a genuine ad surface; Facebook has no
// equivalent.)
const ALL_FRAMES = false;

const SCRIPT_SPEC = {
  id: SCRIPT_ID,
  matches: MATCHES,
  js: ["content/facebook-ads.js"],
  // document_start is the whole point: Facebook inlines the first screenful of
  // the feed in the document itself and parses it during load. Arriving after
  // that means the first ads are already rendered.
  runAt: "document_start",
  // MAIN world: an isolated content script gets its own JSON, so a JSON.parse
  // hook installed there would never see a single one of Facebook's parses.
  world: "MAIN",
  allFrames: ALL_FRAMES,
  persistAcrossSessions: true,
};

// The DOM half — the backstop that catches what survives the payload pass. See
// the header of content/facebook-ads-dom.js.
//
// ISOLATED world on purpose, which is the opposite choice from SCRIPT_SPEC and
// for a specific reason: this half needs no page globals at all (getComputedStyle
// and the DOM are the same in both worlds), and it needs chrome.runtime to
// report what it hid. Isolated also means the page cannot reach in and disable
// it, which matters on a site that actively looks for ad blockers.
const DOM_SPEC = {
  id: DOM_ID,
  matches: MATCHES,
  js: ["content/facebook-ads-dom.js"],
  // document_start so the observer is watching before the first stories land.
  // The script waits for a body itself rather than relying on document_idle,
  // which on Facebook can be many seconds after the feed is on screen.
  runAt: "document_start",
  allFrames: ALL_FRAMES,
  persistAcrossSessions: true,
};

// The cosmetic half — see the header of content/facebook-ads.css. It carries the
// collapse rule the DOM half switches on, so it is not optional decoration: with
// the stylesheet missing, facebook-ads-dom.js marks ads and nothing happens.
//
// A SEPARATE registration rather than a `css` key on a spec above, because the
// two scripts want different worlds and a stylesheet has no world at all.
const STYLE_SPEC = {
  id: STYLE_ID,
  matches: MATCHES,
  css: ["content/facebook-ads.css"],
  runAt: "document_start",
  allFrames: ALL_FRAMES,
  persistAcrossSessions: true,
};

// The isolated-world courier for the MAIN half's count — see
// content/facebook-ads-bridge.js. The scriptlet runs in MAIN and therefore has
// no chrome.* at all, so it cannot report how many ads it removed from the
// payload. (The DOM half is already isolated and reports its own count directly.)
const BRIDGE_SPEC = {
  id: BRIDGE_ID,
  matches: MATCHES,
  js: ["content/facebook-ads-bridge.js"],
  runAt: "document_start",
  allFrames: ALL_FRAMES,
  persistAcrossSessions: true,
};

const SPECS = [SCRIPT_SPEC, DOM_SPEC, STYLE_SPEC, BRIDGE_SPEC];

// Is the Facebook ad filter currently on? (defaults OFF — opt-in)
export async function isFacebookAdsEnabled() {
  const s = await chrome.storage.local.get({ [FACEBOOK_ADS_ENABLED_KEY]: false });
  return s[FACEBOOK_ADS_ENABLED_KEY];
}

// Registration is a read-modify-write over a shared list, exactly like the DNR
// rule writes elsewhere, so it gets the same serial queue. Without it an install
// firing at the same time as a toggle can try to register a duplicate id and the
// second call throws.
let writeChain = Promise.resolve();
function enqueue(label, fn) {
  writeChain = writeChain.then(fn).catch((err) => {
    console.error(`[Sieve] Facebook ad filter (${label}) failed:`, err);
  });
  return writeChain;
}

// Which of OUR ids are currently registered.
//
// Asked without an ids filter and narrowed here, rather than passing
// { ids: [...] }: that form rejects rather than returning [] when an id is
// unknown on some builds, and an unknown id is the normal case on a first run.
async function registeredIds() {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts();
    const ours = new Set(SPECS.map((s) => s.id));
    return new Set(existing.map((s) => s.id).filter((id) => ours.has(id)));
  } catch {
    return new Set();
  }
}

// Reconcile the registrations with the saved toggle. Idempotent: safe to call on
// every install, startup and toggle flip.
//
// Reconciled PER SPEC rather than all-or-nothing on one id. This filter is four
// registrations, and a profile upgraded from a version that had fewer of them
// already holds some — an all-or-nothing "is it registered?" check would see
// that profile as done and never add the rest, leaving part of the feature
// silently missing for exactly the users who had it turned on longest.
export async function applyFacebookAdsScript() {
  return enqueue("apply", async () => {
    const want = await isFacebookAdsEnabled();
    const have = await registeredIds();

    if (!want) {
      const stale = SPECS.filter((s) => have.has(s.id)).map((s) => s.id);
      if (stale.length) {
        await chrome.scripting.unregisterContentScripts({ ids: stale });
        console.log("[Sieve] Facebook ad filter unregistered.");
      }
      return;
    }

    const missing = SPECS.filter((s) => !have.has(s.id));
    if (missing.length) {
      await chrome.scripting.registerContentScripts(missing);
      console.log(`[Sieve] Facebook ad filter registered (${missing.map((s) => s.id).join(", ")}).`);
    }
    // Re-assert what was already there, so an updated extension picks up changed
    // script and style files without needing a toggle flip.
    const present = SPECS.filter((s) => have.has(s.id));
    if (present.length) {
      try {
        await chrome.scripting.updateContentScripts(present);
      } catch (err) {
        console.debug("[Sieve] Facebook ad filter: update skipped", err);
      }
    }
  });
}

// SEPARATE listeners, additive — they touch nothing the other background modules
// registered.
chrome.runtime.onInstalled.addListener(() => {
  applyFacebookAdsScript();
});
chrome.runtime.onStartup.addListener(() => {
  applyFacebookAdsScript();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[FACEBOOK_ADS_ENABLED_KEY]) applyFacebookAdsScript();
});

// Test hooks — drive from the service-worker DevTools console, e.g.
//   await chrome.storage.local.set({ ssFacebookAdsEnabled: true })
//   await sieveFacebookAds.applyFacebookAdsScript()
//   await chrome.scripting.getRegisteredContentScripts()
// and in a Facebook tab's console (MAIN world): window.__sieveFacebookAdFilter
globalThis.sieveFacebookAds = {
  FACEBOOK_ADS_ENABLED_KEY,
  isFacebookAdsEnabled,
  applyFacebookAdsScript,
  SCRIPT_SPEC,
  DOM_SPEC,
  STYLE_SPEC,
  BRIDGE_SPEC,
  SPECS,
};

// background/youtube-ads.js
// Sieve — registers (and unregisters) the YouTube video-ad scriptlet.
//
// The scriptlet itself is content/youtube-ads.js; read the comment at the top of
// that file for WHY YouTube video ads cannot be handled by a block rule.
//
// WHY DYNAMIC REGISTRATION RATHER THAN A MANIFEST ENTRY
// The scriptlet must run in the page's MAIN world at document_start, before
// YouTube's inline script assigns ytInitialPlayerResponse. A manifest
// content_scripts entry would satisfy that, but it would also run for every user
// whether or not they turned the feature on, and a MAIN-world script that patches
// a first-party global is not something to inject on people who did not ask for
// it. chrome.scripting.registerContentScripts gives the same timing while staying
// genuinely opt-in — it is registered when the toggle goes on and removed when it
// goes off. This is the same mechanism uBO Lite uses, and for the same reason: a
// suspended service worker cannot inject in time, so the registration has to be
// declarative.
//
// SCOPE — this module registers three things on YouTube and nothing anywhere
// else: the MAIN-world scriptlet, its stylesheet, and the isolated-world bridge
// that carries the removed-ad count back to the extension. It touches no other
// site and adds no permissions: `scripting` and <all_urls> are already in the
// manifest for the existing content scripts.

// Toggle key — opt-in, default OFF, same "ss…" namespace as the other blockers.
// Turning it OFF weakens what the user set up, so the settings UI puts it behind
// the Guardian PIN gate like every other protection toggle.
export const YOUTUBE_ADS_ENABLED_KEY = "ssYouTubeAdsEnabled"; // boolean, default false

// Stable ids so a re-register replaces rather than duplicates.
const SCRIPT_ID = "sieve-youtube-ads";
const STYLE_ID = "sieve-youtube-ads-css";
const BRIDGE_ID = "sieve-youtube-ads-bridge";

const MATCHES = ["*://*.youtube.com/*", "*://*.youtube-nocookie.com/*"];

const SCRIPT_SPEC = {
  id: SCRIPT_ID,
  matches: MATCHES,
  js: ["content/youtube-ads.js"],
  // document_start is not a preference here — it is the whole point. The inline
  // assignment we intercept happens early in the document, and arriving after it
  // means the player has already read its ads.
  runAt: "document_start",
  // MAIN world: an isolated content script cannot see or replace page globals
  // like ytInitialPlayerResponse or window.fetch.
  world: "MAIN",
  // Embedded players live in iframes, so the scriptlet has to reach them too.
  allFrames: true,
  persistAcrossSessions: true,
};

// The cosmetic half — see the header of content/youtube-ads.css for what it
// covers that the scriptlet cannot.
//
// A SEPARATE registration rather than a `css` key on the spec above, because the
// two want different worlds: the scriptlet has to be MAIN to see page globals,
// and a stylesheet has no world at all. Keeping them apart also means a browser
// that rejects one still applies the other.
//
// Registered rather than declared in the manifest for the same reason as the
// scriptlet: it must exist only while the user has the toggle on. document_start
// so the rules are parsed before YouTube paints — that is what stops an ad slot
// flashing on screen before it is hidden.
const STYLE_SPEC = {
  id: STYLE_ID,
  matches: MATCHES,
  css: ["content/youtube-ads.css"],
  runAt: "document_start",
  allFrames: true,
  persistAcrossSessions: true,
};

// The isolated-world half — see content/youtube-ads-bridge.js. The scriptlet
// runs in MAIN and therefore has no chrome.* at all, so it cannot report how
// many ads it removed; this carries that one number to the Protection Dashboard.
//
// A THIRD registration rather than a second file on SCRIPT_SPEC, because a spec
// registers one world and these need different ones. Registered and removed with
// the other two, so it exists exactly while the toggle is on and there is never
// a listener sitting on YouTube for a feature that is off.
const BRIDGE_SPEC = {
  id: BRIDGE_ID,
  matches: MATCHES,
  js: ["content/youtube-ads-bridge.js"],
  // document_start so it is listening before the scriptlet's first flush. The
  // scriptlet batches for a second before posting, so this is comfortable rather
  // than tight — but a bridge that arrives late silently loses the pre-roll,
  // which is the one ad the user most expects to see counted.
  runAt: "document_start",
  allFrames: true,
  persistAcrossSessions: true,
};

const SPECS = [SCRIPT_SPEC, STYLE_SPEC, BRIDGE_SPEC];

// Is the YouTube ad filter currently on? (defaults OFF — opt-in)
export async function isYouTubeAdsEnabled() {
  const s = await chrome.storage.local.get({ [YOUTUBE_ADS_ENABLED_KEY]: false });
  return s[YOUTUBE_ADS_ENABLED_KEY];
}

// Registration is a read-modify-write over a shared list, exactly like the DNR
// rule writes elsewhere, so it gets the same serial queue. Without it an install
// firing at the same time as a toggle can try to register a duplicate id and the
// second call throws.
let writeChain = Promise.resolve();
function enqueue(label, fn) {
  writeChain = writeChain.then(fn).catch((err) => {
    console.error(`[Sieve] YouTube ad filter (${label}) failed:`, err);
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
// Reconciled PER SPEC rather than all-or-nothing on one id, which matters on
// upgrade: a profile that already has the scriptlet registered from an earlier
// version has no stylesheet, and an all-or-nothing check would see "already
// registered" and never add it.
export async function applyYouTubeAdsScript() {
  return enqueue("apply", async () => {
    const want = await isYouTubeAdsEnabled();
    const have = await registeredIds();

    if (!want) {
      const stale = SPECS.filter((s) => have.has(s.id)).map((s) => s.id);
      if (stale.length) {
        await chrome.scripting.unregisterContentScripts({ ids: stale });
        console.log("[Sieve] YouTube ad filter unregistered.");
      }
      return;
    }

    const missing = SPECS.filter((s) => !have.has(s.id));
    if (missing.length) {
      await chrome.scripting.registerContentScripts(missing);
      console.log(`[Sieve] YouTube ad filter registered (${missing.map((s) => s.id).join(", ")}).`);
    }
    // Re-assert what was already there, so an updated extension picks up changed
    // script and style files without needing a toggle flip.
    const present = SPECS.filter((s) => have.has(s.id));
    if (present.length) {
      try {
        await chrome.scripting.updateContentScripts(present);
      } catch (err) {
        console.debug("[Sieve] YouTube ad filter: update skipped", err);
      }
    }
  });
}

// SEPARATE listeners, additive — they touch nothing the other background modules
// registered.
chrome.runtime.onInstalled.addListener(() => {
  applyYouTubeAdsScript();
});
chrome.runtime.onStartup.addListener(() => {
  applyYouTubeAdsScript();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[YOUTUBE_ADS_ENABLED_KEY]) applyYouTubeAdsScript();
});

// Test hooks — drive from the service-worker DevTools console, e.g.
//   await chrome.storage.local.set({ ssYouTubeAdsEnabled: true })
//   await sieveYouTubeAds.applyYouTubeAdsScript()
//   await chrome.scripting.getRegisteredContentScripts()
// and in a YouTube tab's console (MAIN world): window.__sieveYouTubeAdFilter
globalThis.sieveYouTubeAds = {
  YOUTUBE_ADS_ENABLED_KEY,
  isYouTubeAdsEnabled,
  applyYouTubeAdsScript,
  SCRIPT_SPEC,
  STYLE_SPEC,
  BRIDGE_SPEC,
  SPECS,
};

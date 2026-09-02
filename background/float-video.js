// background/float-video.js
// Sieve — registers (and unregisters) the floating-video un-sticker.
//
// The pair it registers is content/float-video.css and content/float-video.js;
// read the script's header for what they do and why the stylesheet carries most
// of the weight.
//
// It has its own switch in the settings page rather than sharing the Ad &
// Trackers one, because it is not ad blocking: the floating player is the site's
// own furniture, served from the site's own address, and there is no advertising
// request to block that would not also block the article.
//
// WHY DYNAMIC REGISTRATION RATHER THAN A MANIFEST ENTRY
// Same reason as background/anti-adblock.js and background/ad-slot-collapse.js:
// a stylesheet that rewrites positioning on <all_urls> is not something to
// inject into every user's browsing whether or not they asked for it.
// Registered when the toggle goes on, removed when it goes off.
//
// THE ALLOWLIST is compiled into excludeMatches, exactly as it is for the other
// two, and for the same reason — the DNR allow rule spares requests and has no
// effect at all on a content script, so a user who allowlisted a site would
// otherwise still have its layout edited. An allowlist EDIT therefore has to
// re-register, which is why the listener at the bottom watches two keys.

// Toggle key — opt-in, default OFF, same "ss…" namespace as the other blockers.
export const FLOAT_VIDEO_ENABLED_KEY = "ssFloatVideoEnabled"; // boolean, default false

const ALLOWLIST_KEY = "allowlist";

const SCRIPT_ID = "sieve-float-video";
const MATCHES = ["*://*/*"];

// ===========================================================================
// Sites this must never run on
// ===========================================================================
//
// Two kinds, and they fail in two different ways.
//
// SITES WHERE FLOATING VIDEO IS THE PRODUCT. A miniplayer on YouTube or Twitch
// is a feature somebody switched on for themselves. The script's size test
// already spares a full-page player, but a deliberately-shrunk miniplayer is
// corner-sized by definition and is indistinguishable, by shape, from the thing
// this feature exists to stop. Shape cannot separate them; only the site name
// can.
//
// VIDEO CALLS. Un-sticking the floating tile in a call is not a cosmetic
// nuisance, it is breaking a call in progress. content/float-video.js has a
// second, better defence for this — a <video> playing a MediaStream is a live
// camera feed and is skipped wherever it appears, which covers every
// conferencing site including the ones not listed here. These are listed as
// well because a call is the one case where being wrong costs somebody
// something, and one guard is not enough for that.
//
// Full match patterns rather than bare hostnames, because meet.google.com must
// be excluded without excluding the whole of google.com.
export const EXCLUDED_SITES = [
  // Floating video is the product.
  "*://*.youtube.com/*",
  "*://*.youtube-nocookie.com/*",
  "*://*.twitch.tv/*",
  "*://*.netflix.com/*",
  "*://*.vimeo.com/*",
  "*://*.hulu.com/*",
  "*://*.disneyplus.com/*",
  "*://*.max.com/*",
  "*://*.primevideo.com/*",
  "*://*.dailymotion.com/*",
  "*://*.tiktok.com/*",
  // Video calls.
  "*://meet.google.com/*",
  "*://*.zoom.us/*",
  "*://teams.microsoft.com/*",
  "*://teams.live.com/*",
  "*://*.webex.com/*",
  "*://*.whereby.com/*",
  "*://*.discord.com/*",
  "*://*.slack.com/*",
];

// allFrames FALSE. The floating box is in the top-level document — a player
// iframe's own interior is not what moved, its container is, and that container
// is ours to reach. Same choice, same reasoning as the other two registrars.
const ALL_FRAMES = false;

// Same ceiling and the same reason as background/anti-adblock.js: registration
// is all-or-nothing and the pattern list travels with every injection. The
// built-in exclusions above are on top of this, not counted against it — a user
// with a full allowlist must not lose the video-call protection.
const MAX_EXCLUDES = 500;

// A GATE, not a parser — anything that is not obviously a bare hostname is
// dropped rather than risking the whole registration on text the user typed.
// Deliberately a local copy rather than an import from the sibling registrars:
// these background modules stay independent of each other, exactly like the DNR
// tiers that each keep their own chunking constants.
export function allowlistToExcludeMatches(allowlist) {
  const out = [];
  for (const raw of Array.isArray(allowlist) ? allowlist : []) {
    if (out.length >= MAX_EXCLUDES) break;
    if (typeof raw !== "string") continue;
    const host = raw.trim().toLowerCase().replace(/^\*\./, "");
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(host)) continue;
    out.push(`*://*.${host}/*`);
  }
  return out;
}

export function buildSpecs(allowlist) {
  // Deduped, because a user who allowlisted youtube.com themselves would
  // otherwise produce a duplicate pattern in the list.
  const excludeMatches = [...new Set([...EXCLUDED_SITES, ...allowlistToExcludeMatches(allowlist)])];
  return [
    {
      id: SCRIPT_ID,
      matches: MATCHES,
      // The stylesheet is the half that cannot lose a race with the site's own
      // scroll handler, so it has to be in the cascade before the site's first
      // script runs. That is the whole reason for document_start.
      css: ["content/float-video.css"],
      js: ["content/float-video.js"],
      runAt: "document_start",
      // ISOLATED world: it needs chrome.runtime to report a count, and it needs
      // no page globals at all. Isolation also means the page cannot reach in
      // and stop it.
      allFrames: ALL_FRAMES,
      persistAcrossSessions: true,
      excludeMatches,
    },
  ];
}

const SPEC_IDS = [SCRIPT_ID];

export async function isFloatVideoEnabled() {
  const s = await chrome.storage.local.get({ [FLOAT_VIDEO_ENABLED_KEY]: false });
  return s[FLOAT_VIDEO_ENABLED_KEY];
}

let writeChain = Promise.resolve();
function enqueue(label, fn) {
  writeChain = writeChain.then(fn).catch((err) => {
    console.error(`[Sieve] Floating video (${label}) failed:`, err);
  });
  return writeChain;
}

async function registeredIds() {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts();
    const ours = new Set(SPEC_IDS);
    return new Set(existing.map((s) => s.id).filter((id) => ours.has(id)));
  } catch {
    return new Set();
  }
}

// Reconcile with the saved toggle and the current allowlist. Idempotent.
//
// A registered spec is always UPDATED as well as left alone, because that is how
// an allowlist edit takes effect: the id is already present and only its
// excludeMatches changed.
export async function applyFloatVideoScript() {
  return enqueue("apply", async () => {
    const want = await isFloatVideoEnabled();
    const have = await registeredIds();

    if (!want) {
      const stale = SPEC_IDS.filter((id) => have.has(id));
      if (stale.length) {
        await chrome.scripting.unregisterContentScripts({ ids: stale });
        console.log("[Sieve] Floating video unregistered.");
      }
      return;
    }

    const { [ALLOWLIST_KEY]: allowlist } = await chrome.storage.local.get({ [ALLOWLIST_KEY]: [] });
    const specs = buildSpecs(allowlist);

    const missing = specs.filter((s) => !have.has(s.id));
    if (missing.length) {
      await register(missing);
      console.log(`[Sieve] Floating video registered (${missing.map((s) => s.id).join(", ")}).`);
    }
    const present = specs.filter((s) => have.has(s.id));
    if (present.length) {
      try {
        await chrome.scripting.updateContentScripts(present);
      } catch (err) {
        console.debug("[Sieve] Floating video: update skipped", err);
      }
    }
  });
}

// If the browser refuses the call, try once with only the built-in exclusions
// rather than leave a feature the user switched on silently not running. The
// allowlist entries are the ones dropped, never the video-call list: a lost
// allowlist entry is a site edited that should not have been, which the user can
// see and report, and a lost call exclusion is a broken meeting. Same trade,
// same reasoning as background/anti-adblock.js.
async function register(specs) {
  try {
    await chrome.scripting.registerContentScripts(specs);
  } catch (err) {
    const fallback = specs.map((s) => ({ ...s, excludeMatches: [...EXCLUDED_SITES] }));
    if (JSON.stringify(fallback) === JSON.stringify(specs)) throw err;
    console.warn("[Sieve] Floating video: the allowlist exclusions were refused, registering with the built-in list only.", err);
    await chrome.scripting.registerContentScripts(fallback);
  }
}

// DELIBERATELY NO adoptSwitchState here, unlike its neighbours in this section.
//
// background/anti-adblock.js and background/ad-slot-collapse.js each adopt the
// state of the single Ad & Trackers switch on upgrade, because they are behind
// that switch: a profile with it on would otherwise read as on while a
// newly-added mechanism never ran. This one has its OWN switch in the settings
// page, so there is nothing to inherit and inheriting would be wrong — turning
// a page-rearranging feature on for someone who only ever asked for ad blocking
// is not a fix for a confusing switch, it is a surprise. Off until asked for,
// like every other opt-in here.
chrome.runtime.onInstalled.addListener(() => {
  applyFloatVideoScript();
});
chrome.runtime.onStartup.addListener(() => {
  applyFloatVideoScript();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[FLOAT_VIDEO_ENABLED_KEY] || changes[ALLOWLIST_KEY]) applyFloatVideoScript();
});

// Test hooks — drive from the service-worker DevTools console, e.g.
//   await chrome.storage.local.set({ ssFloatVideoEnabled: true })
//   await sieveFloatVideo.applyFloatVideoScript()
// and in a page's console (isolated world is not reachable from there — use the
// extension's content-script context in DevTools):
//   window.__sieveFloatVideo.state()
globalThis.sieveFloatVideo = {
  FLOAT_VIDEO_ENABLED_KEY,
  EXCLUDED_SITES,
  isFloatVideoEnabled,
  applyFloatVideoScript,
  allowlistToExcludeMatches,
  buildSpecs,
  SPEC_IDS,
};

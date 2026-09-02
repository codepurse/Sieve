// background/anti-adblock.js
// Sieve — registers (and unregisters) the anti-adblock defeat scripts.
//
// The two pieces it registers are content/anti-adblock.js (MAIN world, answers
// the detector) and content/anti-adblock-dom.js (isolated world, clears the wall
// if one appears anyway). Read the header of each for what it does and why.
//
// WHY DYNAMIC REGISTRATION RATHER THAN A MANIFEST ENTRY
// Same reason as background/youtube-ads.js and background/facebook-ads.js: the
// MAIN-world half has to run at document_start on every site, before the page's
// own detector script, and a manifest entry would inject it for every user
// whether or not they asked for it. This is the most invasive script in the
// extension — it redefines page globals and patches layout getters on <all_urls>
// — so being genuinely opt-in matters more here than anywhere else.
//
// ---------------------------------------------------------------------------
// THE ALLOWLIST, AND WHY IT IS DONE HERE AND NOT IN THE SCRIPTS
//
// Sieve's allowlist is a declarativeNetRequest allow rule. That rule spares
// requests; it has no effect whatsoever on a registered content script, so the
// tiers built on content scripts have historically not honoured it at all.
//
// For this feature that would be wrong in a way it is not for the others. A
// user who allowlists a site is saying "stop interfering here" — and this
// feature's whole job is interfering with what the page can observe about
// itself. So the allowlist is compiled into excludeMatches on both specs, which
// is the only mechanism that can keep a document_start MAIN-world script off a
// page: by the time any script could check storage, it has already run.
//
// The consequence is that editing the allowlist has to RE-REGISTER, not just
// re-check — hence the storage listener at the bottom watching two keys.

import { adoptAdblockSwitchState } from "../common/adblock-switch.js";

// Toggle key — opt-in, default OFF, same "ss…" namespace as the other blockers.
// Turning it OFF weakens what the user set up, so the settings UI puts it behind
// the Guardian PIN gate like every other protection toggle.
export const ANTI_ADBLOCK_ENABLED_KEY = "ssAntiAdblockEnabled"; // boolean, default false

// The shared allowlist, written by the popup and the settings page. Read here
// only to build excludeMatches.
const ALLOWLIST_KEY = "allowlist";

// Stable ids so a re-register replaces rather than duplicates.
const SCRIPT_ID = "sieve-anti-adblock";
const DOM_ID = "sieve-anti-adblock-dom";

const MATCHES = ["*://*/*"];

// allFrames is FALSE on both, and deliberately.
//
// The detector, the bait element and the wall all live in the TOP-LEVEL
// document, because a site asking "can this visitor see adverts" asks it where
// it is going to show them. The iframes on a page are the adverts, the pixels
// and the embeds — lying to an ad frame about its own height achieves nothing,
// and running this in every one of them on every site would multiply the cost
// of the most invasive script in the extension by however many frames a page
// happens to have.
//
// (content/youtube-ads.js sets allFrames true because an embedded PLAYER is a
// real ad surface. There is no equivalent here.)
const ALL_FRAMES = false;

// A cap on how many allowlist entries become match patterns. Registration is
// all-or-nothing and the pattern list travels with every injection, so an
// allowlist someone pasted a blocklist into should degrade rather than either
// fail outright or bloat every page load. Far above any hand-written list.
const MAX_EXCLUDES = 500;

// Turn an allowlist entry into a match pattern, or null if it cannot safely
// become one.
//
// This is a GATE, not a parser. chrome.scripting.registerContentScripts rejects
// the whole call when one pattern is malformed, and the allowlist is free text
// the user typed — so anything that is not obviously a bare hostname is dropped
// here rather than risking the entire feature failing to register because
// somebody typed a note into the box.
//
// "*://*.example.com/*" covers the bare domain as well as every subdomain, which
// is the same scope the DNR allow rule gives (requestDomains matches subdomains
// too). So an allowlisted site is spared here exactly as widely as it is there.
export function allowlistToExcludeMatches(allowlist) {
  const out = [];
  for (const raw of Array.isArray(allowlist) ? allowlist : []) {
    if (out.length >= MAX_EXCLUDES) break;
    if (typeof raw !== "string") continue;
    const host = raw.trim().toLowerCase().replace(/^\*\./, "");
    // A hostname and nothing else: letters, digits, dots and hyphens, at least
    // one dot, no leading or trailing dot, no empty label. Rejects paths, ports,
    // schemes, wildcards in the middle, IDN in its unicode form, and prose.
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(host)) continue;
    out.push(`*://*.${host}/*`);
  }
  return out;
}

// Build the two specs for a given allowlist. A function rather than two
// constants because excludeMatches depends on stored state — which is also why
// this module re-registers on an allowlist edit instead of only on a toggle.
export function buildSpecs(allowlist) {
  const excludeMatches = allowlistToExcludeMatches(allowlist);
  // Omit the key entirely when empty. An empty array is accepted by Chrome but
  // rejected by some builds, and omitting it keeps the registered spec identical
  // to what it was before this feature learned about the allowlist.
  const exclude = excludeMatches.length ? { excludeMatches } : {};

  return [
    {
      id: SCRIPT_ID,
      matches: MATCHES,
      js: ["content/anti-adblock.js"],
      // document_start is the whole point, and more so here than anywhere else
      // in the extension: the globals this defines have to exist BEFORE the
      // page's detector reads them, and the getters it patches have to be in
      // place before the bait element is measured. A single tick late and the
      // site already has its answer.
      runAt: "document_start",
      // MAIN world: canRunAds, the BlockAdBlock constructor and
      // HTMLElement.prototype.offsetHeight are all page-world objects, and an
      // isolated content script has its own private copies of every one of them.
      world: "MAIN",
      allFrames: ALL_FRAMES,
      persistAcrossSessions: true,
      ...exclude,
    },
    {
      id: DOM_ID,
      matches: MATCHES,
      js: ["content/anti-adblock-dom.js"],
      // document_start so the observer is watching before the wall is inserted.
      // The script waits for documentElement itself rather than relying on
      // document_idle, which arrives after the wall on plenty of sites.
      runAt: "document_start",
      // ISOLATED world, which is the opposite choice from the spec above and for
      // three specific reasons: it needs chrome.runtime to report what it
      // cleared; it needs an UNPATCHED getComputedStyle to see that the page is
      // locked, which the MAIN half has by then meddled with; and isolation
      // means the page cannot reach in and disable the half that removes its
      // wall.
      allFrames: ALL_FRAMES,
      persistAcrossSessions: true,
      ...exclude,
    },
  ];
}

const SPEC_IDS = [SCRIPT_ID, DOM_ID];

// Is the anti-adblock filter currently on? (defaults OFF — opt-in)
export async function isAntiAdblockEnabled() {
  const s = await chrome.storage.local.get({ [ANTI_ADBLOCK_ENABLED_KEY]: false });
  return s[ANTI_ADBLOCK_ENABLED_KEY];
}

// Registration is a read-modify-write over a shared list, exactly like the DNR
// rule writes elsewhere, so it gets the same serial queue. Without it an install
// firing at the same time as a toggle can try to register a duplicate id and the
// second call throws.
let writeChain = Promise.resolve();
function enqueue(label, fn) {
  writeChain = writeChain.then(fn).catch((err) => {
    console.error(`[Sieve] Anti-adblock (${label}) failed:`, err);
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
    const ours = new Set(SPEC_IDS);
    return new Set(existing.map((s) => s.id).filter((id) => ours.has(id)));
  } catch {
    return new Set();
  }
}

// Reconcile the registrations with the saved toggle and the current allowlist.
// Idempotent: safe to call on every install, startup, toggle flip and allowlist
// edit.
//
// Reconciled PER SPEC rather than all-or-nothing on one id, for the same reason
// background/youtube-ads.js is: a profile that already has one of the two from
// an earlier version would otherwise be read as "already registered" and never
// gain the other.
//
// Registered specs are always UPDATED as well, even when nothing appears to be
// missing. That is not belt-and-braces here, it is how an allowlist edit takes
// effect at all: both ids are already present and only their excludeMatches have
// changed.
export async function applyAntiAdblockScript() {
  return enqueue("apply", async () => {
    const want = await isAntiAdblockEnabled();
    const have = await registeredIds();

    if (!want) {
      const stale = SPEC_IDS.filter((id) => have.has(id));
      if (stale.length) {
        await chrome.scripting.unregisterContentScripts({ ids: stale });
        console.log("[Sieve] Anti-adblock unregistered.");
      }
      return;
    }

    const { [ALLOWLIST_KEY]: allowlist } = await chrome.storage.local.get({ [ALLOWLIST_KEY]: [] });
    const specs = buildSpecs(allowlist);

    const missing = specs.filter((s) => !have.has(s.id));
    if (missing.length) {
      await register(missing);
      console.log(`[Sieve] Anti-adblock registered (${missing.map((s) => s.id).join(", ")}).`);
    }

    const present = specs.filter((s) => have.has(s.id));
    if (present.length) {
      try {
        await chrome.scripting.updateContentScripts(present);
      } catch (err) {
        console.debug("[Sieve] Anti-adblock: update skipped", err);
      }
    }
  });
}

// Register, and if the browser refuses the call, try once more without the
// exclusions.
//
// registerContentScripts is all-or-nothing: one match pattern it dislikes takes
// down both scripts, and the exclusions are built from text the user typed. The
// failure that matters is the silent one — a feature the user switched on that
// never registers because of a stray character in an unrelated box. Better to
// run without the exclusion and say so than not to run at all; the DNR allow
// rule still spares the requests on those sites either way.
//
// allowlistToExcludeMatches already refuses anything that is not a bare
// hostname, so this path should be unreachable. It exists because "should be"
// and "is" differ across browsers, and Firefox is a supported target.
async function register(specs) {
  try {
    await chrome.scripting.registerContentScripts(specs);
  } catch (err) {
    // Only worth a second attempt if there was something to drop. Without this
    // check a genuine failure — a bad js path, a duplicate id — would be retried
    // identically and reported as an exclusion problem it is not.
    if (!specs.some((s) => s.excludeMatches)) throw err;
    console.warn("[Sieve] Anti-adblock: the allowlist exclusions were refused, registering without them.", err);
    await chrome.scripting.registerContentScripts(
      specs.map(({ excludeMatches, ...rest }) => rest)
    );
  }
}

// ===========================================================================
// Adopting the switch on upgrade
// ===========================================================================
//
// The settings page presents ONE switch over five keys (see ADBLOCK_KEYS in
// options/options.js). This key is the fifth, and it did not exist before this
// release — so a profile that already has that switch ON reads as ON, because
// the switch is on if ANY of its keys is, while this particular mechanism stays
// off forever. Nothing in the UI would explain why, and the only way out would
// be to toggle the switch off and on again, which asks for the Guardian PIN on
// the way down.
//
// That is precisely the half-applied state the merged switch is documented as
// being unable to produce, so it gets fixed here rather than argued about: if
// the user has the switch on, they have this on.
//
// ABSENCE is the test, not falseness. storage.local.get returns {} for a key
// that was never written, and that is the only thing distinguishing "never
// heard of this feature" from "turned it off on purpose". Reading a stored
// false as consent to re-enable would switch it back on at every update for
// exactly the person who least wants it.
//
// One shot: writing the key is itself what stops this running again.
//
// The rule itself now lives in common/adblock-switch.js. It was written twice,
// here and in background/ad-slot-collapse.js, each copy carrying its own
// hand-written list of the other keys. Putting them side by side showed the
// lists had drifted: the one here predated the slot collapser and never counted
// it. The siblings this consults are therefore now the whole switch rather than
// the four keys named here before — read that file's header for the rest.
//
// The write fires storage.onChanged, which calls applyAntiAdblockScript for us,
// so this deliberately does not register anything itself.
export async function adoptSwitchState() {
  return adoptAdblockSwitchState(ANTI_ADBLOCK_ENABLED_KEY, "Anti-adblock");
}

// SEPARATE listeners, additive — they touch nothing the other background modules
// registered.
chrome.runtime.onInstalled.addListener(async () => {
  // Before the reconcile, so the reconcile sees the adopted value. Awaited
  // rather than fired alongside, or the two race and the first run does nothing.
  try {
    await adoptSwitchState();
  } catch (err) {
    console.error("[Sieve] Anti-adblock: adopting the switch state failed:", err);
  }
  applyAntiAdblockScript();
});
chrome.runtime.onStartup.addListener(() => {
  applyAntiAdblockScript();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  // The allowlist matters as much as the toggle here: it is compiled into the
  // registration, so an edit is only honoured by re-registering.
  if (changes[ANTI_ADBLOCK_ENABLED_KEY] || changes[ALLOWLIST_KEY]) applyAntiAdblockScript();
});

// Test hooks — drive from the service-worker DevTools console, e.g.
//   await chrome.storage.local.set({ ssAntiAdblockEnabled: true })
//   await sieveAntiAdblock.applyAntiAdblockScript()
//   await chrome.scripting.getRegisteredContentScripts()
// and in a page's console: window.__slotShim.state()   (MAIN world)
globalThis.sieveAntiAdblock = {
  ANTI_ADBLOCK_ENABLED_KEY,
  isAntiAdblockEnabled,
  applyAntiAdblockScript,
  adoptSwitchState,
  allowlistToExcludeMatches,
  buildSpecs,
  SPEC_IDS,
};

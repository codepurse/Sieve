// background/ad-slot-collapse.js
// Sieve — registers (and unregisters) the empty-ad-slot collapser.
//
// The script is content/ad-slot-collapse.js; read its header for what it does
// and, more importantly, why it waits twelve seconds before doing it.
//
// WHY DYNAMIC REGISTRATION RATHER THAN A MANIFEST ENTRY
// Same reason as background/anti-adblock.js: a script that hides elements on
// <all_urls> is not something to inject into every user's browsing whether or
// not they asked for it. Registered when the toggle goes on, removed when it
// goes off.
//
// THE ALLOWLIST is compiled into excludeMatches, exactly as it is for the
// anti-adblock scripts and for the same reason — the DNR allow rule spares
// requests and has no effect at all on a content script, so a user who
// allowlisted a site would otherwise still have its layout edited. An allowlist
// EDIT therefore has to re-register, which is why the listener at the bottom
// watches two keys.

import { adoptAdblockSwitchState } from "../common/adblock-switch.js";

// Toggle key — opt-in, default OFF, same "ss…" namespace as the other blockers.
export const AD_SLOT_COLLAPSE_ENABLED_KEY = "ssAdSlotCollapseEnabled"; // boolean, default false

const ALLOWLIST_KEY = "allowlist";

const SCRIPT_ID = "sieve-ad-slot-collapse";
const MATCHES = ["*://*/*"];

// allFrames FALSE. The empty boxes are in the top-level document — an ad
// iframe's own interior is not a slot anyone sees, and the frames on a page are
// the adverts themselves. Same choice, same reasoning as
// background/anti-adblock.js.
const ALL_FRAMES = false;

// Same ceiling and the same reason as background/anti-adblock.js: registration
// is all-or-nothing and the pattern list travels with every injection.
const MAX_EXCLUDES = 500;

// A GATE, not a parser — anything that is not obviously a bare hostname is
// dropped rather than risking the whole registration on text the user typed.
// Deliberately a local copy rather than an import from anti-adblock.js: these
// background modules stay independent of each other, exactly like the DNR tiers
// that each keep their own chunking constants.
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
  const excludeMatches = allowlistToExcludeMatches(allowlist);
  const exclude = excludeMatches.length ? { excludeMatches } : {};
  return [
    {
      id: SCRIPT_ID,
      matches: MATCHES,
      js: ["content/ad-slot-collapse.js"],
      // document_start is not about timing the collapse — that is twelve
      // seconds away — it is so the MutationObserver is watching before the
      // first slots are inserted. A slot that arrives before the observer, on a
      // page that never mutates again, would otherwise be missed.
      runAt: "document_start",
      // ISOLATED world: it needs chrome.runtime to report a count, and it needs
      // no page globals at all. Isolation also means the page cannot reach in
      // and stop it.
      allFrames: ALL_FRAMES,
      persistAcrossSessions: true,
      ...exclude,
    },
  ];
}

const SPEC_IDS = [SCRIPT_ID];

export async function isAdSlotCollapseEnabled() {
  const s = await chrome.storage.local.get({ [AD_SLOT_COLLAPSE_ENABLED_KEY]: false });
  return s[AD_SLOT_COLLAPSE_ENABLED_KEY];
}

let writeChain = Promise.resolve();
function enqueue(label, fn) {
  writeChain = writeChain.then(fn).catch((err) => {
    console.error(`[Sieve] Ad-slot collapse (${label}) failed:`, err);
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
export async function applyAdSlotCollapseScript() {
  return enqueue("apply", async () => {
    const want = await isAdSlotCollapseEnabled();
    const have = await registeredIds();

    if (!want) {
      const stale = SPEC_IDS.filter((id) => have.has(id));
      if (stale.length) {
        await chrome.scripting.unregisterContentScripts({ ids: stale });
        console.log("[Sieve] Ad-slot collapse unregistered.");
      }
      return;
    }

    const { [ALLOWLIST_KEY]: allowlist } = await chrome.storage.local.get({ [ALLOWLIST_KEY]: [] });
    const specs = buildSpecs(allowlist);

    const missing = specs.filter((s) => !have.has(s.id));
    if (missing.length) {
      await register(missing);
      console.log(`[Sieve] Ad-slot collapse registered (${missing.map((s) => s.id).join(", ")}).`);
    }
    const present = specs.filter((s) => have.has(s.id));
    if (present.length) {
      try {
        await chrome.scripting.updateContentScripts(present);
      } catch (err) {
        console.debug("[Sieve] Ad-slot collapse: update skipped", err);
      }
    }
  });
}

// If the browser refuses the call, try once without the exclusions rather than
// leave a feature the user switched on silently not running. Same trade, same
// reasoning as background/anti-adblock.js.
async function register(specs) {
  try {
    await chrome.scripting.registerContentScripts(specs);
  } catch (err) {
    if (!specs.some((s) => s.excludeMatches)) throw err;
    console.warn("[Sieve] Ad-slot collapse: the allowlist exclusions were refused, registering without them.", err);
    await chrome.scripting.registerContentScripts(specs.map(({ excludeMatches, ...rest }) => rest));
  }
}

// ===========================================================================
// Adopting the switch on upgrade
// ===========================================================================
//
// The settings page shows ONE switch over several keys, and it reads as on if
// ANY of them is on. This key is new, so a profile that already has that switch
// on would read as on while this particular mechanism stayed off forever, with
// nothing in the UI to explain it.
//
// ABSENCE is the test, not falseness: storage.local.get returns {} for a key
// never written, and that is the only thing separating "has not heard of this"
// from "turned it off on purpose". One shot — the write is what stops it
// repeating.
//
// This was a near-copy of adoptSwitchState in background/anti-adblock.js, kept
// separate on purpose while there were only two of them, with a note saying a
// THIRD copy should become one. The rule now lives in common/adblock-switch.js
// — read its header for what putting the two copies side by side turned up.
//
// The write fires storage.onChanged, which runs the reconcile for us.
export async function adoptSwitchState() {
  return adoptAdblockSwitchState(AD_SLOT_COLLAPSE_ENABLED_KEY, "Ad-slot collapse");
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await adoptSwitchState();
  } catch (err) {
    console.error("[Sieve] Ad-slot collapse: adopting the switch state failed:", err);
  }
  applyAdSlotCollapseScript();
});
chrome.runtime.onStartup.addListener(() => {
  applyAdSlotCollapseScript();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[AD_SLOT_COLLAPSE_ENABLED_KEY] || changes[ALLOWLIST_KEY]) applyAdSlotCollapseScript();
});

// Test hooks — drive from the service-worker DevTools console, e.g.
//   await chrome.storage.local.set({ ssAdSlotCollapseEnabled: true })
//   await sieveAdSlotCollapse.applyAdSlotCollapseScript()
// and in a page's console (isolated world is not reachable from there — use the
// extension's content-script context in DevTools):
//   window.__sieveAdSlotCollapse.state()
globalThis.sieveAdSlotCollapse = {
  AD_SLOT_COLLAPSE_ENABLED_KEY,
  isAdSlotCollapseEnabled,
  applyAdSlotCollapseScript,
  adoptSwitchState,
  allowlistToExcludeMatches,
  buildSpecs,
  SPEC_IDS,
};

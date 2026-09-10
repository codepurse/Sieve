// background/cookie-autoreject.js
// Sieve — registers (and unregisters) the cookie auto-reject content scripts.
//
// The scripts are content/cookie-engine.bundle.js (the vendored Consent-O-Matic
// engine) and content/cookie-autoreject.js (Sieve's driver around it). Read the
// driver's header for what they do.
//
// WHY DYNAMIC REGISTRATION RATHER THAN A MANIFEST ENTRY
//
// The pair was declared on <all_urls> in the manifest, so the 58 KB engine
// bundle was fetched, parsed and executed on EVERY page load of every tab — and
// then, on the overwhelming majority of them, did nothing at all, because
// auto-reject is opt-in and OFF by default. 68 KB of the 278 KB Sieve injects
// into every top frame was this one feature, paid for by everybody who had not
// asked for it.
//
// Same reasoning, and deliberately the same shape, as
// background/ad-slot-collapse.js and background/anti-adblock.js: registered when
// the toggle goes on, removed when it goes off, so a user who never enables it
// pays nothing.
//
// TWO KEYS, NOT ONE. Auto-reject sits under the Dark Pattern Blocker's master
// switch as well as its own, and the driver used to check both at runtime. With
// the scripts registered rather than declared, that check has to happen HERE —
// otherwise turning the master switch off would leave the engine injected and
// idling on every page.
//
// THE ALLOWLIST is NOT compiled into excludeMatches, and that is a deliberate
// difference from the ad-blocking scripts. Those hide or remove page content, so
// an allowlisted site must be left untouched. This one clicks "reject" in a
// consent dialog, which is the user's own standing answer to a question the site
// asked — allowlisting a site to unbreak it is not a request to start consenting
// to its tracking. Nothing here alters the page's own content.

const MASTER_KEY = "darkPatternsEnabled"; // Dark Pattern Blocker master, default ON
const ENABLED_KEY = "darkPatternCookieAutoRejectEnabled"; // this feature, default OFF

const SCRIPT_ID = "sieve-cookie-autoreject";
const MATCHES = ["*://*/*"];

// Top frame only, matching what the manifest entry did. The CMPs this engine
// has rules for — OneTrust, Cookiebot, Quantcast, Didomi, Usercentrics, Osano —
// all render in the main frame, and injecting a 58 KB bundle into every iframe
// on the page to catch the exceptions would cost far more than it recovers.
const ALL_FRAMES = false;

export function buildSpecs() {
  return [
    {
      id: SCRIPT_ID,
      matches: MATCHES,
      // Order matters: the bundle defines window.SieveCookieEngine, which the
      // driver reads. Same order the manifest entry listed them in.
      js: ["content/cookie-engine.bundle.js", "content/cookie-autoreject.js"],
      // document_idle, as before. A consent dialog is not in the initial markup
      // — it is injected by the CMP's own script — so there is nothing to find
      // any earlier, and starting late keeps the bundle's parse off the
      // critical path.
      runAt: "document_idle",
      // ISOLATED world: it needs chrome.storage and chrome.runtime, and it
      // touches the page only through the DOM, which is shared.
      allFrames: ALL_FRAMES,
      persistAcrossSessions: true,
    },
  ];
}

const SPEC_IDS = [SCRIPT_ID];

export async function isCookieAutoRejectEnabled() {
  const s = await chrome.storage.local.get({ [MASTER_KEY]: true, [ENABLED_KEY]: false });
  return !!(s[MASTER_KEY] && s[ENABLED_KEY]);
}

let writeChain = Promise.resolve();
function enqueue(label, fn) {
  writeChain = writeChain.then(fn).catch((err) => {
    console.error(`[Sieve] Cookie auto-reject (${label}) failed:`, err);
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

// Reconcile with the two saved toggles. Idempotent.
export async function applyCookieAutoRejectScript() {
  return enqueue("apply", async () => {
    const want = await isCookieAutoRejectEnabled();
    const have = await registeredIds();

    if (!want) {
      const stale = SPEC_IDS.filter((id) => have.has(id));
      if (stale.length) {
        await chrome.scripting.unregisterContentScripts({ ids: stale });
        console.log("[Sieve] Cookie auto-reject unregistered.");
      }
      return;
    }

    const specs = buildSpecs();
    const missing = specs.filter((s) => !have.has(s.id));
    if (missing.length) {
      await chrome.scripting.registerContentScripts(missing);
      console.log("[Sieve] Cookie auto-reject registered.");
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  applyCookieAutoRejectScript();
});
chrome.runtime.onStartup.addListener(() => {
  applyCookieAutoRejectScript();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[MASTER_KEY] || changes[ENABLED_KEY]) applyCookieAutoRejectScript();
});

// Test hooks — drive from the service-worker DevTools console, e.g.
//   await chrome.storage.local.set({ darkPatternCookieAutoRejectEnabled: true })
//   await sieveCookieAutoReject.applyCookieAutoRejectScript()
//   await chrome.scripting.getRegisteredContentScripts()
globalThis.sieveCookieAutoReject = {
  MASTER_KEY,
  ENABLED_KEY,
  isCookieAutoRejectEnabled,
  applyCookieAutoRejectScript,
  buildSpecs,
  SPEC_IDS,
};

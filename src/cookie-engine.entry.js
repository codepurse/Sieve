// src/cookie-engine.entry.js
// Sieve entry wrapper for the vendored Consent-O-Matic rule engine.
//
// Why this file exists:
//   The engine under vendor/consent-o-matic/Extension/ is verbatim upstream code
//   written as ES modules for a standalone extension. Manifest V3 content scripts
//   cannot be ES modules, so build-cookie-engine.mjs bundles this entry (and the
//   engine it imports) into a single classic IIFE: content/cookie-engine.bundle.js.
//
//   This wrapper does three things and nothing else — it does NOT run the engine
//   (Sieve's driver does that in a later step):
//     1. Import the engine's public class (ConsentEngine) and Tools.
//     2. Give the engine's config statics safe, silent defaults. The engine reads
//        ConsentEngine.debugValues.* and ConsentEngine.generalSettings.* all over
//        the place — including while constructing CMPs — so they must be valid
//        objects before anything is instantiated, or the engine throws.
//     3. Expose everything under one namespaced global, window.SieveCookieEngine.
//
//   Keeping all Sieve-specific glue here (never inside vendor/) means updating
//   from upstream is a clean file copy — see vendor/consent-o-matic/ATTRIBUTION.md.

import ConsentEngine from "../vendor/consent-o-matic/Extension/ConsentEngine.js";
import Tools from "../vendor/consent-o-matic/Extension/Tools.js";

// ---------------------------------------------------------------------------
// Safe engine config defaults.
//
// debugValues:      every flag off → no console spam, no dev-only behaviour.
// generalSettings:  hideInsteadOfPIP = true → the HIDE_CMP action simply hides
//                   the banner (opacity 0). This deliberately avoids the engine's
//                   picture-in-picture path, which would otherwise call
//                   enforceScrollBehaviours() → chrome.runtime.sendMessage(...),
//                   messaging that only Consent-O-Matic's own background exists to
//                   answer. Sieve wants silent operation with no floating preview.
// topFrameUrl:      the host, used by the engine's "url" matcher. A real value is
//                   required up front — URLMatcher does topFrameUrl.indexOf(...),
//                   which would throw on undefined.
//
// Sieve's driver (added in a later step) may override any of these before it
// constructs an engine; these are just non-crashing starting points.
// ---------------------------------------------------------------------------
ConsentEngine.debugValues = {
  clickDelay: false,
  skipSubmit: false,
  paintMatchers: false,
  debugClicks: false,
  alwaysForceRulesUpdate: false,
  skipHideMethod: false,
  debugLog: false,
  debugRules: false,
  debugTranslations: false,
  skipSubmitConfirmation: false,
  dontHideProgressDialog: false,
  skipOpenMethod: false,
  autoOpenOptionsTab: false,
};

ConsentEngine.generalSettings = {
  hideInsteadOfPIP: true,
};

try {
  ConsentEngine.topFrameUrl = location.host;
} catch (e) {
  ConsentEngine.topFrameUrl = "";
}

// ConsentEngine.singleton is set by upstream to null at module load; the engine
// sets it to the live instance itself in Sieve's driver. Nothing to do here.

// ---------------------------------------------------------------------------
// Public namespace for Sieve content scripts.
//   SieveCookieEngine.ConsentEngine — the engine class (statics live on it)
//   SieveCookieEngine.Tools         — DOM find() helper (setBase, etc.)
//   SieveCookieEngine.version       — the upstream commit we vendored
// ---------------------------------------------------------------------------
if (!window.SieveCookieEngine) {
  window.SieveCookieEngine = {
    ConsentEngine,
    Tools,
    version: "consent-o-matic@8ca8500",
  };
}

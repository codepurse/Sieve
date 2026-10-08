// background/tells.js
// Sieve — the background half of "tells": the Claim Ledger's storage, and the
// toolbar badge.
//
// THE LEDGER. The rules live in common/claim-ledger.js and are pure; this file
// holds the one ledger object, answers the detectors' "have you seen this
// before?" (sieve:claim-observe) and persists the result. It lives here rather
// than in the content script so there is exactly one writer: two tabs of the
// same shop each doing their own read-modify-write on chrome.storage.local
// would quietly lose each other's sightings, which is how the old scarcity
// cache worked.
//
// The page's address is taken from the SENDER, never from the message: the
// ledger keys on the site and path the browser says the frame is showing. And
// only top frames are answered — a claim inside an ad iframe is the ad's.
//
// Nothing seen in a private window is written down. Those sightings go into a
// separate ledger that lives in memory only, so a private window can still
// catch a countdown restarting while it is open and leaves no trace after.
//
// THE DRAWING. The stamps and covers a page shows live in content/tells-ui.js,
// which is injected here, on request, into the one page that needs it — not
// into every page, which is what a manifest content script would cost.
//
// THE BADGE. A content script reports how many tricks it found on its page
// (sieve:tells-count); the badge shows that number on that tab. It counts
// tricks only — never trackers, which are on every page and would turn the
// badge into wallpaper. It is cleared when the tab commits a new page, and the
// new page's script sets it again if it finds anything.

import "../common/claim-ledger.js";

const Ledger = globalThis.SieveClaimLedger; // `self` in the worker; globalThis in the tests

const LEDGER_KEY = "sieveClaimLedger";
// The scarcity detector's own cross-load cache, before the ledger replaced it.
const OLD_SCARCITY_KEY = "sieveScarcitySamples";

const PERSIST_DELAY_MS = 500;

let ledger = null; // the persistent ledger, once loaded
let loading = null;
let persistTimer = null;
const privateLedger = {}; // private windows: memory only, never persisted

function loadLedger() {
  if (ledger) return Promise.resolve(ledger);
  if (!loading) {
    loading = chrome.storage.local
      .get({ [LEDGER_KEY]: {} })
      .then((stored) => {
        const value = stored[LEDGER_KEY];
        ledger = value && typeof value === "object" && !Array.isArray(value) ? value : {};
        if (Ledger.prune(ledger, Date.now()) > 0) schedulePersist();
        // Retire the old cache. A week of scarcity samples is all it held, and
        // the ledger relearns them on the next visit.
        chrome.storage.local.remove(OLD_SCARCITY_KEY).catch(() => {});
        return ledger;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

function schedulePersist() {
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (!ledger) return;
    Ledger.prune(ledger, Date.now());
    chrome.storage.local.set({ [LEDGER_KEY]: ledger }).catch(() => {});
  }, PERSIST_DELAY_MS);
}

// The page a message came from: its top frame's site and path, or null for a
// subframe, an extension page, or anything that is not a web page.
function senderPage(sender) {
  if (!sender || sender.frameId !== 0 || !sender.url) return null;
  try {
    const url = new URL(sender.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return { host: url.hostname, path: url.pathname || "/" };
  } catch {
    return null;
  }
}

async function observeClaim(claim, sender) {
  const page = senderPage(sender);
  if (!page) return null;
  if (sender.tab && sender.tab.incognito) {
    return Ledger.observe(privateLedger, claim, page, Date.now());
  }
  const target = await loadLedger();
  const verdict = Ledger.observe(target, claim, page, Date.now());
  if (verdict) schedulePersist();
  return verdict;
}

async function forgetClaims() {
  clearTimeout(persistTimer);
  persistTimer = null;
  ledger = {};
  for (const key of Object.keys(privateLedger)) delete privateLedger[key];
  await chrome.storage.local.remove(LEDGER_KEY);
}

async function claimsInfo() {
  const target = await loadLedger();
  return { count: Object.keys(target).length };
}

// --- badge -------------------------------------------------------------------

// The warn ink from common/sieve-ui.css. A trick found is a caution, and green
// is reserved for "something is on".
const BADGE_COLOR = "#855600";
const BADGE_TEXT_COLOR = "#ffffff";

function setBadge(tabId, count) {
  const n = Math.max(0, Math.min(999, Math.floor(Number(count) || 0)));
  const text = n === 0 ? "" : String(n);
  try {
    chrome.action.setBadgeText({ tabId, text }).catch(() => {});
    if (n > 0) {
      chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR }).catch(() => {});
      if (typeof chrome.action.setBadgeTextColor === "function") {
        chrome.action.setBadgeTextColor({ tabId, color: BADGE_TEXT_COLOR }).catch(() => {});
      }
    }
  } catch {
    // The tab closed between the message and the call.
  }
}

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) setBadge(details.tabId, 0);
});

// --- messages ----------------------------------------------------------------

const ON_DEMAND = Object.freeze({
  ui: "content/tells-ui.js",
  trials: "content/trial-terms.js",
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return false;

  if (message.type === "sieve:claim-observe") {
    observeClaim(message.claim, sender)
      .then((verdict) => sendResponse(verdict || null))
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === "sieve:tells-count") {
    if (sender && sender.tab && sender.tab.id != null && sender.frameId === 0) {
      setBadge(sender.tab.id, message.count);
    }
    return false;
  }

  // The on-demand halves of the Dark Pattern Blocker, injected into a page only
  // once it needs them: the drawing ("ui"), or the free-trial reader ("trials").
  // Into the asking frame's own isolated world — the one its content scripts
  // share — and only ever a top frame, and only ever one of these two files:
  // the name in the message picks from this list, it is never a path.
  if (message.type === "sieve:tells-ui") {
    const part = message.part || "ui";
    const file = Object.prototype.hasOwnProperty.call(ON_DEMAND, part) ? ON_DEMAND[part] : null;
    if (!file || !sender || !sender.tab || sender.tab.id == null || sender.frameId !== 0) {
      sendResponse({ ok: false });
      return false;
    }
    chrome.scripting
      .executeScript({ target: { tabId: sender.tab.id, frameIds: [0] }, files: [file] })
      .then(
        () => sendResponse({ ok: true }),
        () => sendResponse({ ok: false })
      );
    return true;
  }

  // From the settings page only: a content script has no business asking. The
  // settings page opens in a tab, so sender.tab is set for it too — the URL is
  // what tells the two apart.
  const fromExtensionPage =
    !!sender && typeof sender.url === "string" && sender.url.startsWith(chrome.runtime.getURL(""));

  if (message.type === "sieve:claims-info" && fromExtensionPage) {
    claimsInfo()
      .then(sendResponse)
      .catch(() => sendResponse({ count: 0 }));
    return true;
  }

  if (message.type === "sieve:claims-forget" && fromExtensionPage) {
    forgetClaims()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});

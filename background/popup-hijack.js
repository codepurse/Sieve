// background/popup-hijack.js
// Sieve — Popup & Click Hijack Blocker: blocked-popup log + recovery (Step 4).

import { recordBlock } from "../common/stats.js";
//
// The content-script bridge runs in an untrusted context and can't write
// chrome.storage.session, so it forwards each blocked popup here. This module:
//   - keeps a per-tab log of blocked popups in chrome.storage.session
//   - clears a tab's log when its TOP frame navigates to a new page, so the
//     popup's "Blocked N popups on this page" count stays per-page
//   - drops a tab's log when the tab closes
//   - lets the popup fetch a tab's log, clear it, or "Open anyway" — the last
//     opens the URL from here (chrome.tabs.create), bypassing the in-page
//     blocker entirely. That's the safety net for a wrongly-caught login/payment.
//
// chrome.storage.session keeps its DEFAULT (trusted-contexts-only) access level
// — nothing here loosens it, so page scripts can never read the log.
//
// This file is ADDITIVE: it only adds its own listeners. None of the existing
// service-worker logic is touched.

const PH_SESSION_KEY = "popupHijackLog";
const PH_MAX_ENTRIES_PER_TAB = 50;

// Serialize read-modify-write on the session log so a popunder storm firing many
// window.open calls at once can't clobber concurrent updates.
let phWriteChain = Promise.resolve();
function phEnqueue(work) {
  const run = phWriteChain.then(work, work);
  phWriteChain = run.catch(() => {}); // keep the chain alive past a failed step
  return run;
}

async function phGetLog() {
  const stored = await chrome.storage.session.get({ [PH_SESSION_KEY]: {} });
  return stored[PH_SESSION_KEY] || {};
}
async function phSetLog(log) {
  await chrome.storage.session.set({ [PH_SESSION_KEY]: log });
}

// Normalize a bridge entry into the stored shape the spec asks for.
function phNormalize(entry) {
  const e = entry || {};
  return {
    url: String(e.url || ""),
    timestamp: Number(e.time) || Date.now(),
    pageUrl: String(e.pageUrl || ""),
    clickTarget: String(e.target || ""),
    reason: String(e.reason || ""),
  };
}

async function phAppend(tabId, entry) {
  if (typeof tabId !== "number") return; // only real tabs (content scripts)
  await phEnqueue(async () => {
    const log = await phGetLog();
    const tab = log[tabId] || { pageUrl: entry.pageUrl || "", entries: [] };
    if (entry.pageUrl) tab.pageUrl = entry.pageUrl;
    tab.entries.push(entry);
    if (tab.entries.length > PH_MAX_ENTRIES_PER_TAB) {
      tab.entries.splice(0, tab.entries.length - PH_MAX_ENTRIES_PER_TAB);
    }
    log[tabId] = tab;
    await phSetLog(log);
  });
}

async function phDropTab(tabId) {
  await phEnqueue(async () => {
    const log = await phGetLog();
    if (log[tabId]) {
      delete log[tabId];
      await phSetLog(log);
    }
  });
}

// ---------------------------------------------------------------------------
// Messages from the bridge (blocks) and the popup (read / clear / recover).
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;

  if (message.type === "POPUP_HIJACK_BLOCKED") {
    const tabId = sender && sender.tab ? sender.tab.id : undefined;
    recordBlock("popupHijacks", 1).catch(() => {});
    phAppend(tabId, phNormalize(message.entry)).then(() => sendResponse({ ok: true }));
    return true; // async
  }

  if (message.type === "GET_POPUP_HIJACK_LOG") {
    phGetLog().then((log) => {
      const tab = log[message.tabId] || { pageUrl: "", entries: [] };
      sendResponse({ ok: true, pageUrl: tab.pageUrl, entries: tab.entries });
    });
    return true;
  }

  if (message.type === "POPUP_HIJACK_CLEAR") {
    phDropTab(message.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "POPUP_HIJACK_OPEN_ANYWAY") {
    // Open the recovered URL ourselves — this never passes through the in-page
    // window.open wrapper, so a wrongly-blocked popup always opens here.
    chrome.tabs
      .create({ url: message.url })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
    return true;
  }

  return false;
});

// ---------------------------------------------------------------------------
// Reset a tab's log when its top frame commits a new document, so the count is
// per-page. (Same-document / SPA navigations don't fire this, which is what we
// want — staying on the same page keeps its log.)
// ---------------------------------------------------------------------------
chrome.webNavigation?.onCommitted?.addListener((details) => {
  if (details.frameId !== 0) return;
  phDropTab(details.tabId);
});

// Clean up when a tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {
  phDropTab(tabId);
});

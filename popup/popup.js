// Sieve popup — controls the module toggles.
// Quick on/off lives here; the detailed per-module configuration (dark-pattern
// sub-types, toxic per-site toggles) lives on the options page.
// See options/options.js.

const SET_MODULE_STATE = "SET_MODULE_STATE";

// Show "On" / "Off" next to a module name.
function updateLabel(label, enabled) {
  label.textContent = enabled ? "On" : "Off";
  label.classList.toggle("is-on", enabled);
}

// Wire one module toggle: reflect the saved state, and save + apply on change.
// Turning a module OFF is a protection-weakening action, so it goes through the
// Guardian gate (asks for the PIN when one is set); turning it ON is always free.
async function wireToggle(toggle, label, storageKey, moduleName, defaultEnabled = true) {
  const stored = await chrome.storage.local.get({ [storageKey]: defaultEnabled });
  toggle.checked = stored[storageKey];
  updateLabel(label, toggle.checked);

  toggle.addEventListener("change", async () => {
    if (!(await SieveGuardian.gateToggleOff(toggle, `Turn off ${moduleName}`))) return;
    updateLabel(label, toggle.checked);
    chrome.runtime.sendMessage({
      type: SET_MODULE_STATE,
      key: storageKey,
      enabled: toggle.checked,
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fillVersion();

  wireToggle(
    document.getElementById("bad-language-toggle"),
    document.getElementById("bad-language-state"),
    "badLanguageEnabled",
    "the Bad Language Filter"
  );
  wireToggle(
    document.getElementById("gambling-toggle"),
    document.getElementById("gambling-state"),
    "gamblingEnabled",
    "the Gambling Blocker"
  );
  wireToggle(
    document.getElementById("doomscroll-toggle"),
    document.getElementById("doomscroll-state"),
    "doomscrollEnabled",
    "the Doomscroll Stopper",
    false // opt-in: off by default on first run
  );

  document.getElementById("open-settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  setupDarkPatterns();
  setupToxicHider();
  setupPopupHijack();

  // Summary banner — reflect how many modules are active, live.
  updateStatusBanner();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && MODULE_KEYS.some((k) => changes[k])) updateStatusBanner();
  });
});

// ===========================================================================
// Header version badge + protection summary banner.
// ===========================================================================

// [storageKey, defaultEnabled] for every independent protection toggle in Sieve
// — the core popup modules PLUS the Site-Blocking opt-ins (prediction markets,
// Financial Protection, Safety Shield). The summary banner counts how many are
// on, so enabling e.g. three Safety Shield lists is now reflected instead of
// ignored. (Dark-pattern sub-types live under darkPatternsEnabled and Guardian
// is a lock rather than a filter, so neither is counted here.)
const MODULE_DEFAULTS = {
  // Core modules (shown in the popup)
  badLanguageEnabled: true,
  gamblingEnabled: true,
  doomscrollEnabled: false,
  darkPatternsEnabled: true,
  toxicHiderEnabled: true,
  popupHijackEnabled: false,
  // Gambling Blocker — 2nd toggle
  predictionMarketEnabled: false,
  // Financial Protection (opt-in, default off)
  fpScamEnabled: false,
  fpTradingEnabled: false,
  fpMlmEnabled: false,
  // Safety Shield (opt-in, default off)
  ssPiracyEnabled: false,
  ssSafetyEnabled: false,
  ssCryptojackingEnabled: false,
  ssAiSlopEnabled: false,
  ssFraudEnabled: false,
  ssGoreShockEnabled: false,
  ssDatingEnabled: false,
};
const MODULE_KEYS = Object.keys(MODULE_DEFAULTS);

function fillVersion() {
  const el = document.getElementById("version");
  if (el) el.textContent = "v" + chrome.runtime.getManifest().version;
}

async function updateStatusBanner() {
  const el = document.getElementById("status");
  if (!el) return;
  const stored = await chrome.storage.local.get({ ...MODULE_DEFAULTS });
  const active = MODULE_KEYS.filter((k) => stored[k]).length;
  if (active === 0) {
    el.textContent = "All protection is off";
    el.className = "status disabled";
  } else {
    // No "of N" denominator: most protections are opt-in by design, so a
    // fraction would misread deliberate opt-outs as gaps. Show just the count.
    el.textContent = `Protection active · ${active} module${active === 1 ? "" : "s"} on`;
    el.className = "status enabled";
  }
}

// ===========================================================================
// Dark Pattern Blocker (Module 3A) — master toggle + per-page count only.
// The per-type sub-toggles live on the options page (options/options.js).
// ===========================================================================

function updateDarkPatternsCount(counts) {
  const el = document.getElementById("dark-patterns-count");
  const total = counts?.total ?? 0;
  el.textContent =
    total === 0
      ? "No dark patterns on this page"
      : `Removed ${total} dark pattern${total === 1 ? "" : "s"} on this page`;
}

async function refreshDarkPatternsCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const counts = await chrome.tabs.sendMessage(tab.id, { type: "GET_DARK_PATTERN_COUNTS" });
    updateDarkPatternsCount(counts);
  } catch (err) {
    // Content script not loaded on this page (e.g. chrome:// URLs).
    updateDarkPatternsCount({ total: 0 });
  }
}

function setupDarkPatterns() {
  const masterToggle = document.getElementById("dark-patterns-toggle");
  const masterLabel = document.getElementById("dark-patterns-state");

  chrome.storage.local.get({ darkPatternsEnabled: true }).then((stored) => {
    masterToggle.checked = stored.darkPatternsEnabled;
    updateLabel(masterLabel, masterToggle.checked);
  });

  masterToggle.addEventListener("change", async () => {
    if (!(await SieveGuardian.gateToggleOff(masterToggle, "Turn off the Dark Pattern Blocker"))) return;
    updateLabel(masterLabel, masterToggle.checked);
    chrome.runtime.sendMessage({
      type: SET_MODULE_STATE,
      key: "darkPatternsEnabled",
      enabled: masterToggle.checked,
    });
  });

  refreshDarkPatternsCount();
}

// ===========================================================================
// Toxic Comment Hider (Module 4A) — master toggle + per-page count only.
// The per-site toggles live on the options page (options/options.js).
// ===========================================================================

function updateToxicCount(total) {
  const el = document.getElementById("toxic-hider-count");
  el.textContent =
    total === 0
      ? "No comments hidden on this page"
      : `Hid ${total} comment${total === 1 ? "" : "s"} on this page`;
}

// The hider can run in several frames (Disqus lives in its own iframe), so we
// ask every frame for its count and sum them.
async function refreshToxicHiderCount() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return updateToxicCount(0);

    let frames = [{ frameId: 0 }];
    try {
      frames = (await chrome.webNavigation.getAllFrames({ tabId: tab.id })) || frames;
    } catch {
      /* fall back to the top frame */
    }

    let total = 0;
    await Promise.all(
      frames.map(
        (f) =>
          new Promise((resolve) => {
            try {
              chrome.tabs.sendMessage(
                tab.id,
                { type: "sieve:getToxicStats" },
                { frameId: f.frameId },
                (resp) => {
                  void chrome.runtime.lastError; // frame may not have our script — ignore
                  if (resp && typeof resp.flagged === "number") total += resp.flagged;
                  resolve();
                }
              );
            } catch {
              resolve();
            }
          })
      )
    );
    updateToxicCount(total);
  } catch {
    updateToxicCount(0);
  }
}

function setupToxicHider() {
  const masterToggle = document.getElementById("toxic-hider-toggle");
  const masterLabel = document.getElementById("toxic-hider-state");

  chrome.storage.local.get({ toxicHiderEnabled: true }).then((stored) => {
    masterToggle.checked = stored.toxicHiderEnabled;
    updateLabel(masterLabel, masterToggle.checked);
  });

  masterToggle.addEventListener("change", async () => {
    if (!(await SieveGuardian.gateToggleOff(masterToggle, "Turn off the Toxic Comment Hider"))) return;
    updateLabel(masterLabel, masterToggle.checked);
    chrome.runtime.sendMessage({
      type: SET_MODULE_STATE,
      key: "toxicHiderEnabled",
      enabled: masterToggle.checked,
    });
  });

  refreshToxicHiderCount();
}

// ===========================================================================
// Popup & Click Hijack Blocker — toggle, per-page count, blocked list + recovery.
// This module is OFF by default (note the `false` default below), and its count
// + list come from the background relay (chrome.storage.session), not a content
// script, so they survive across frames and a sleeping service worker.
// ===========================================================================

let phTabId = null;
let phHost = null; // hostname of the active tab, for the per-site whitelist
let phEntries = [];

const PH_WHITELIST_KEY = "popupHijackWhitelist";

// Plain-English labels for the block reasons recorded by the interceptor.
const PH_REASONS = {
  "window-open": "window.open() popup",
  "anchor-click": "scripted new-tab link",
  "anchor-dispatch": "scripted new-tab link",
  "form-submit": "scripted form to new tab",
  "form-dispatch": "scripted form to new tab",
  "covering-link": "full-page invisible link",
};

function updatePopupHijackCount(n) {
  const el = document.getElementById("popup-hijack-count");
  el.textContent =
    n === 0
      ? "No popups blocked on this page"
      : `Blocked ${n} popup${n === 1 ? "" : "s"} on this page`;
}

function phReasonText(entry) {
  const why = PH_REASONS[entry.reason] || entry.reason || "blocked";
  const target = entry.clickTarget ? ` · ${entry.clickTarget}` : "";
  return why + target;
}

function syncPopupHijackView() {
  const viewBtn = document.getElementById("popup-hijack-view");
  const listEl = document.getElementById("popup-hijack-list");
  if (phEntries.length === 0) {
    viewBtn.hidden = true;
    listEl.hidden = true;
    return;
  }
  viewBtn.hidden = false;
  viewBtn.textContent = listEl.hidden
    ? `View blocked popups (${phEntries.length})`
    : "Hide blocked popups";
}

function renderPopupHijackList() {
  const listEl = document.getElementById("popup-hijack-list");
  listEl.textContent = ""; // clear without innerHTML

  if (phEntries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "ph-empty";
    empty.textContent = "Nothing blocked yet.";
    listEl.appendChild(empty);
    return;
  }

  // Newest first.
  for (let i = phEntries.length - 1; i >= 0; i--) {
    const entry = phEntries[i];

    const row = document.createElement("div");
    row.className = "ph-entry";

    const info = document.createElement("div");
    info.className = "ph-info";

    const url = document.createElement("div");
    url.className = "ph-url";
    url.textContent = entry.url || "(no URL)";
    url.title = entry.url || "";

    const meta = document.createElement("div");
    meta.className = "ph-meta";
    meta.textContent = phReasonText(entry);

    info.appendChild(url);
    info.appendChild(meta);

    const open = document.createElement("button");
    open.className = "ph-open";
    open.textContent = "Open anyway";
    open.disabled = !entry.url;
    open.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "POPUP_HIJACK_OPEN_ANYWAY", url: entry.url });
    });

    row.appendChild(info);
    row.appendChild(open);
    listEl.appendChild(row);
  }

  const clear = document.createElement("button");
  clear.className = "ph-clear link-btn";
  clear.textContent = "Clear list";
  clear.addEventListener("click", async () => {
    if (phTabId != null) {
      try {
        await chrome.runtime.sendMessage({ type: "POPUP_HIJACK_CLEAR", tabId: phTabId });
      } catch {
        /* service worker asleep — the list still clears locally */
      }
    }
    phEntries = [];
    updatePopupHijackCount(0);
    renderPopupHijackList();
    syncPopupHijackView();
  });
  listEl.appendChild(clear);
}

// Reflect whether the active tab's host is on the "allow popups" whitelist.
async function refreshAllowSite() {
  const row = document.getElementById("popup-hijack-allow-row");
  const box = document.getElementById("popup-hijack-allow-site");
  const label = document.getElementById("popup-hijack-allow-label");
  try {
    if (!phHost) {
      box.checked = false;
      box.disabled = true;
      row.classList.add("is-disabled");
      label.textContent = "Allow popups on this site";
      return;
    }
    const { [PH_WHITELIST_KEY]: list } = await chrome.storage.local.get({ [PH_WHITELIST_KEY]: [] });
    box.disabled = false;
    row.classList.remove("is-disabled");
    box.checked = Array.isArray(list) && list.includes(phHost);
    label.textContent = `Allow popups on ${phHost}`;
  } catch {
    box.disabled = true;
  }
}

let phWhitelistCount = 0;

function syncWhitelistView() {
  const viewBtn = document.getElementById("popup-hijack-wl-view");
  const listEl = document.getElementById("popup-hijack-wl-list");
  viewBtn.textContent = listEl.hidden
    ? `Whitelisted sites (${phWhitelistCount})`
    : "Hide whitelisted sites";
}

function renderWhitelist(list) {
  const listEl = document.getElementById("popup-hijack-wl-list");
  phWhitelistCount = list.length;
  listEl.textContent = ""; // clear without innerHTML

  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "ph-empty";
    empty.textContent = "No sites whitelisted.";
    listEl.appendChild(empty);
    syncWhitelistView();
    return;
  }

  for (const siteHost of list.slice().sort()) {
    const row = document.createElement("div");
    row.className = "ph-entry";

    const info = document.createElement("div");
    info.className = "ph-info";
    const h = document.createElement("div");
    h.className = "ph-url";
    h.textContent = siteHost;
    h.title = siteHost;
    info.appendChild(h);

    const rm = document.createElement("button");
    rm.className = "ph-open";
    rm.textContent = "Remove";
    rm.addEventListener("click", async () => {
      const { [PH_WHITELIST_KEY]: cur } = await chrome.storage.local.get({ [PH_WHITELIST_KEY]: [] });
      const next = (Array.isArray(cur) ? cur : []).filter((x) => x !== siteHost);
      await chrome.storage.local.set({ [PH_WHITELIST_KEY]: next });
      renderWhitelist(next); // immediate; the storage listener would also catch it
      refreshAllowSite();
    });

    row.appendChild(info);
    row.appendChild(rm);
    listEl.appendChild(row);
  }
  syncWhitelistView();
}

async function refreshWhitelist() {
  try {
    const { [PH_WHITELIST_KEY]: list } = await chrome.storage.local.get({ [PH_WHITELIST_KEY]: [] });
    renderWhitelist(Array.isArray(list) ? list : []);
  } catch {
    renderWhitelist([]);
  }
}

async function refreshPopupHijack() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      phEntries = [];
      phHost = null;
      updatePopupHijackCount(0);
      syncPopupHijackView();
      refreshAllowSite();
      return;
    }
    phTabId = tab.id;
    try {
      phHost = tab.url ? new URL(tab.url).hostname : null;
    } catch {
      phHost = null;
    }
    const resp = await chrome.runtime.sendMessage({
      type: "GET_POPUP_HIJACK_LOG",
      tabId: tab.id,
    });
    phEntries = (resp && resp.entries) || [];
    updatePopupHijackCount(phEntries.length);
    renderPopupHijackList();
    syncPopupHijackView();
    refreshAllowSite();
  } catch {
    phEntries = [];
    updatePopupHijackCount(0);
    syncPopupHijackView();
  }
}

function setupPopupHijack() {
  const toggle = document.getElementById("popup-hijack-toggle");
  const label = document.getElementById("popup-hijack-state");
  const viewBtn = document.getElementById("popup-hijack-view");
  const listEl = document.getElementById("popup-hijack-list");

  // OFF by default — unlike wireToggle(), which defaults modules to ON.
  chrome.storage.local.get({ popupHijackEnabled: false }).then((stored) => {
    toggle.checked = !!stored.popupHijackEnabled;
    updateLabel(label, toggle.checked);
  });

  toggle.addEventListener("change", async () => {
    if (!(await SieveGuardian.gateToggleOff(toggle, "Turn off the Popup & Click Hijack Blocker")))
      return;
    updateLabel(label, toggle.checked);
    chrome.runtime.sendMessage({
      type: SET_MODULE_STATE,
      key: "popupHijackEnabled",
      enabled: toggle.checked,
    });
  });

  viewBtn.addEventListener("click", () => {
    listEl.hidden = !listEl.hidden;
    syncPopupHijackView();
  });

  // Per-site whitelist: add/remove the active tab's host from popupHijackWhitelist.
  const allowBox = document.getElementById("popup-hijack-allow-site");
  allowBox.addEventListener("change", async () => {
    if (!phHost) return;
    const { [PH_WHITELIST_KEY]: stored } = await chrome.storage.local.get({ [PH_WHITELIST_KEY]: [] });
    const list = Array.isArray(stored) ? stored : [];
    const has = list.includes(phHost);
    if (allowBox.checked && !has) list.push(phHost);
    else if (!allowBox.checked && has) list.splice(list.indexOf(phHost), 1);
    await chrome.storage.local.set({ [PH_WHITELIST_KEY]: list });
    renderWhitelist(list);
  });

  // Whitelist manager: expand/collapse the list of allowed sites.
  const wlViewBtn = document.getElementById("popup-hijack-wl-view");
  const wlListEl = document.getElementById("popup-hijack-wl-list");
  wlViewBtn.addEventListener("click", () => {
    wlListEl.hidden = !wlListEl.hidden;
    syncWhitelistView();
  });

  // Keep the whitelist UI + per-site checkbox live if the list changes elsewhere
  // (e.g. the user clicks "Always allow this site" on the in-page prompt).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[PH_WHITELIST_KEY]) {
      renderWhitelist(
        Array.isArray(changes[PH_WHITELIST_KEY].newValue) ? changes[PH_WHITELIST_KEY].newValue : []
      );
      refreshAllowSite();
    }
  });

  refreshWhitelist();
  refreshPopupHijack();
}

// Sieve settings page.
// Writes settings to chrome.storage.local; the content script and service
// worker watch those keys and update their behavior automatically.

// Mirrors the popup: the service worker persists this and (for gambling) applies
// it to the live rules. Other modules just react to the storage change.
const SET_MODULE_STATE = "SET_MODULE_STATE";

// --- input normalizers / validators -------------------------------------

// Reduce user input to a bare, matchable domain (no scheme / path / www).
function normalizeDomain(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split(":")[0];
}
function isValidDomain(domain) {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain);
}

// A custom word: lowercase, single token of letters.
function normalizeWord(input) {
  return input.trim().toLowerCase();
}
function isValidWord(word) {
  return /^[a-z][a-z'-]+$/.test(word);
}

// --- storage helpers ------------------------------------------------------

async function getList(key) {
  const stored = await chrome.storage.local.get({ [key]: [] });
  return stored[key];
}
async function setList(key, list) {
  await chrome.storage.local.set({ [key]: list });
}

// --- a reusable "add/remove list" section (domains or words) -------------

function renderList(listEl, items) {
  listEl.textContent = "";
  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Nothing added yet.";
    listEl.appendChild(empty);
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = item;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "✕";
    btn.dataset.item = item;
    li.append(span, btn);
    listEl.appendChild(li);
  }
}

// gateAddAction / gateRemoveAction: when set, that mutation WEAKENS protection
// (e.g. allowlisting a site, or un-blocking one) and must pass the Guardian PIN
// gate. The opposite mutation strengthens protection and is always free. Mirrors
// the "allow this site" gate on the blocked page (pages/blocked.js).
function setupSection({ storageKey, inputId, addBtnId, listId, errorId, normalize, validate, invalidMsg, initialItems, gateAddAction, gateRemoveAction }) {
  const input = document.getElementById(inputId);
  const addBtn = document.getElementById(addBtnId);
  const listEl = document.getElementById(listId);
  const errorEl = document.getElementById(errorId);

  async function refresh() {
    renderList(listEl, await getList(storageKey));
  }

  async function add() {
    const value = normalize(input.value);
    if (!validate(value)) {
      errorEl.textContent = invalidMsg;
      return;
    }
    errorEl.textContent = "";
    // Gate weakening adds (e.g. allowlisting a site) behind the PIN.
    if (gateAddAction && !(await SieveGuardian.confirmUnlock(gateAddAction))) return;
    const list = await getList(storageKey);
    if (!list.includes(value)) {
      list.push(value);
      list.sort();
      await setList(storageKey, list);
    }
    input.value = "";
    await refresh();
  }

  async function remove(item) {
    // Gate weakening removes (e.g. un-blocking a site) behind the PIN.
    if (gateRemoveAction && !(await SieveGuardian.confirmUnlock(gateRemoveAction))) return;
    const list = (await getList(storageKey)).filter((x) => x !== item);
    await setList(storageKey, list);
    await refresh();
  }

  addBtn.addEventListener("click", add);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") add();
  });
  listEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove")) remove(e.target.dataset.item);
  });

  // Initial paint comes from the page's one batched snapshot — no extra storage
  // read here. The add/remove handlers still re-read (via refresh) on their own.
  renderList(listEl, initialItems || []);
}

// --- single-value controls (radio group, checkbox) ----------------------

function setupRadioGroup(name, storageKey, currentValue) {
  const radios = document.querySelectorAll(`input[name="${name}"]`);
  radios.forEach((radio) => {
    radio.checked = radio.value === currentValue;
    radio.addEventListener("change", () => {
      if (radio.checked) chrome.storage.local.set({ [storageKey]: radio.value });
    });
  });
}

// `actionName`, when given, marks this as a protection switch: turning it OFF
// goes through the Guardian gate (asks for the PIN when one is set).
function setupCheckbox(id, storageKey, currentValue, actionName) {
  const el = document.getElementById(id);
  el.checked = currentValue;
  el.addEventListener("change", async () => {
    if (actionName && !(await SieveGuardian.gateToggleOff(el, actionName))) return;
    chrome.storage.local.set({ [storageKey]: el.checked });
  });
}

// --- wire everything up ---------------------------------------------------

// Every storage key the page reads on load, with its default. We fetch them all
// in ONE chrome.storage.local.get below instead of letting each control do its
// own round-trip. The page used to fire ~25 separate reads (several chained
// sequentially), which is what made refreshing feel slow and made the toggles
// visibly flip on one group at a time. Built at call time (not at module load)
// because it references DARK_PATTERN_TYPES, which is declared further down.
function optionsDefaults() {
  const d = {
    // Bad Language Filter
    replacementStyle: "blanks",
    familySafe: false,
    customWords: [],
    // Gambling Blocker — opt-in prediction-markets sub-toggle
    predictionMarketEnabled: false,
    // URL Shortener Resolver — advanced setting, default ON
    urlShortenerResolverEnabled: true,
    // Global "Blocked sites" + "Allowlist"
    customBlocks: [],
    allowlist: [],
    // Financial Protection
    fpScamEnabled: false,
    fpTradingEnabled: false,
    fpMlmEnabled: false,
    fpScamListUpdatedAt: 0,
    fpScamListCount: 0,
    // Safety Shield toggles
    ssPiracyEnabled: false,
    ssSafetyEnabled: false,
    ssCryptojackingEnabled: false,
    ssAiSlopEnabled: false,
    ssFraudEnabled: false,
    ssGoreShockEnabled: false,
    ssDatingEnabled: false,
    // Safety Shield "last updated" meta
    ssPiracyUpdatedAt: 0, ssPiracyCount: 0,
    ssPhishingUpdatedAt: 0, ssPhishingCount: 0,
    ssMalwareUpdatedAt: 0, ssMalwareCount: 0,
    ssCryptojackingUpdatedAt: 0, ssCryptojackingCount: 0,
    ssAiSlopUpdatedAt: 0, ssAiSlopCount: 0,
    ssFraudUpdatedAt: 0, ssFraudCount: 0,
    // Toxic Comment Hider
    toxicSensitivity: "moderate",
    toxicCustomWords: [],
    toxicModelEnabled: false,
    toxicModelReady: false,
    toxicSiteToggles: {},
    // Doomscroll Stopper
    doomscrollSites: {},
    doomscrollStats: {},
    // Guardian — presence of a hash means a PIN is set
    guardianPinHash: "",
    // Dark Pattern Blocker — master + cookie-autoreject tally (per-type keys added below)
    darkPatternsEnabled: true,
    cookieAutoRejectStats: null,
    // Protection Dashboard — remember whether the breakdown is expanded
    dashboardExpanded: false,
    // Announcement banner — id of the last message the user dismissed
    dismissedAnnouncementId: "",
  };
  for (const t of DARK_PATTERN_TYPES) {
    d[t.key] = t.default !== undefined ? t.default : true;
  }
  return d;
}

document.addEventListener("DOMContentLoaded", async () => {
  // A full-screen "Loading…" veil (shown by the `preload` class on <html>) covers
  // the page until the saved state is read and applied — so on refresh the user
  // sees a clean loading state, never the momentary all-toggles-off default.
  const startedAt = performance.now();

  let store;
  try {
    // One batched read for the whole page (down from ~25 separate reads).
    store = await chrome.storage.local.get(optionsDefaults());
  } catch (err) {
    console.error("[Sieve] options: could not read settings — showing defaults.", err);
    store = optionsDefaults();
  }
  const readMs = Math.round(performance.now() - startedAt);

  try {
    await applyStoredSettings(store);
  } catch (err) {
    console.error("[Sieve] options: failed while applying settings.", err);
  } finally {
    // Reveal the page no matter what — never leave the veil stuck. State above was
    // applied with transitions disabled (preload), so nothing visibly flips on.
    requestAnimationFrame(() => document.documentElement.classList.remove("preload"));
    setupNav(); // sidebar smooth-scroll + scroll-spy highlight
    // How long the load actually took — if it's still slow, the `read` figure
    // tells us whether chrome.storage.local is the bottleneck.
    console.debug(`[Sieve] options ready in ${Math.round(performance.now() - startedAt)}ms (settings read ${readMs}ms).`);
  }
});

// Apply every control's state from the one batched snapshot, then wire its
// change/onChanged listeners. Each helper reads only from `store` — no further
// storage round-trips — so this runs synchronously except for the Doomscroll
// site list, which comes from a small bundled JSON file.
async function applyStoredSettings(store) {
  // Bad Language Filter
  setupRadioGroup("replacementStyle", "replacementStyle", store.replacementStyle);
  setupCheckbox("family-safe", "familySafe", store.familySafe, "Turn off Family-Safe mode");
  setupSection({
    storageKey: "customWords",
    inputId: "word-input",
    addBtnId: "word-add",
    listId: "word-list",
    errorId: "word-error",
    normalize: normalizeWord,
    validate: isValidWord,
    invalidMsg: "Please enter a single word (letters only).",
    initialItems: store.customWords,
  });

  // Gambling Blocker — second, opt-in (default OFF) sub-toggle. Writes
  // predictionMarketEnabled; the service worker watches that key. Turning it OFF
  // weakens protection, so it goes through the Guardian PIN gate.
  setupCheckbox("prediction-market-toggle", "predictionMarketEnabled", store.predictionMarketEnabled, "Turn off Prediction-markets blocking");

  // Global "Blocked sites" + "Allowlist" — both apply to EVERY blocker.
  setupSection({
    storageKey: "customBlocks",
    inputId: "block-input",
    addBtnId: "block-add",
    listId: "block-list",
    errorId: "block-error",
    normalize: normalizeDomain,
    validate: isValidDomain,
    invalidMsg: "Please enter a valid domain (e.g. example.com).",
    initialItems: store.customBlocks,
    // Un-blocking a site weakens protection → gate. Adding a block strengthens it.
    gateRemoveAction: "Remove a site from your Blocked list",
  });
  setupSection({
    storageKey: "allowlist",
    inputId: "allow-input",
    addBtnId: "allow-add",
    listId: "allow-list",
    errorId: "allow-error",
    normalize: normalizeDomain,
    validate: isValidDomain,
    invalidMsg: "Please enter a valid domain (e.g. example.com).",
    initialItems: store.allowlist,
    // Allowlisting a site bypasses every blocker → weakens protection → gate.
    gateAddAction: "Allow a site (this bypasses all blockers)",
  });

  // Remaining sections all read from the snapshot only, so they apply state
  // synchronously too (each still wires its own change/onChanged listeners).
  setupFinancialProtection(store); // Phase 5 — scam + trading + mlm opt-in toggles
  setupSafetyShield(store);        // piracy + malware/phishing + … opt-in toggles

  // URL Shortener Resolver — advanced setting, default ON. Turning it OFF
  // weakens protection, so it goes through the Guardian PIN gate like other
  // protection toggles.
  setupCheckbox("url-shortener-resolver-toggle", "urlShortenerResolverEnabled", store.urlShortenerResolverEnabled, "Turn off URL Shortener Resolver");

  setupToxicHider(store);          // Module 4A
  setupGuardian(store);            // self-lock PIN status panel
  setupDarkPatterns(store);        // Module 3A — relocated from the popup
  setupToxicSites(store);          // per-site toggles — relocated from the popup

  // Protection Dashboard — today / week stats from the shared stats store.
  await setupDashboard(store);

  // Doomscroll needs the bundled site list (a fast, local fetch).
  await setupDoomscroll(store);

  // Announcement banner — fetched from the repo over the network. Fire-and-forget
  // so a slow/failed fetch never delays revealing the page.
  setupAnnouncement(store);
}

// ===========================================================================
// Sidebar navigation — smooth scroll to a section and highlight the link for
// whichever section is currently in view. (Inline page scripts are blocked by
// the extension CSP, so this lives here rather than in options.html.)
// ===========================================================================

function setupNav() {
  const links = Array.from(document.querySelectorAll(".nav-link[data-target]"));
  if (!links.length) return;

  const byId = {};
  links.forEach((link) => {
    byId[link.dataset.target] = link;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = document.getElementById(link.dataset.target);
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const sections = links
    .map((link) => document.getElementById(link.dataset.target))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) => l.classList.remove("active"));
          if (byId[entry.target.id]) byId[entry.target.id].classList.add("active");
        });
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
  }

  links[0].classList.add("active");
}

// ===========================================================================
// Toxic Comment Hider (Module 4A) — sensitivity + custom words.
// ===========================================================================

function setupToxicHider(store) {
  setupRadioGroup("toxicSensitivity", "toxicSensitivity", store.toxicSensitivity);
  setupSection({
    storageKey: "toxicCustomWords",
    inputId: "toxic-word-input",
    addBtnId: "toxic-word-add",
    listId: "toxic-word-list",
    errorId: "toxic-word-error",
    normalize: (s) => s.trim().toLowerCase(),
    // A word or short phrase: letters plus spaces, apostrophes or hyphens,
    // with at least two actual letters. Leetspeak is generated by the filter,
    // so users add plain words here.
    validate: (w) => /^[a-z][a-z' -]*$/.test(w) && w.replace(/[^a-z]/g, "").length >= 2,
    invalidMsg: "Enter a word or phrase (letters, spaces, ' or - ).",
    initialItems: store.toxicCustomWords,
  });
  setupToxicModel(store);
}

// --- Optional Layer-2 model: download, progress, cache, fallback -----------

async function setupToxicModel(store) {
  const toggle = document.getElementById("toxic-model-toggle");
  const statusEl = document.getElementById("toxic-model-status");

  // If the cache helper didn't load for any reason, fail safe: leave the word
  // list working and disable just this optional control.
  if (typeof SieveModelCache === "undefined" || !self.caches) {
    toggle.disabled = true;
    statusEl.textContent = "Smart detection unavailable in this browser.";
    return;
  }

  const progressEl = document.getElementById("toxic-model-progress");
  const barFill = document.getElementById("toxic-model-bar-fill");
  const progressText = document.getElementById("toxic-model-progress-text");
  const removeBtn = document.getElementById("toxic-model-remove");

  const setStatus = (text, kind) => {
    statusEl.textContent = text;
    statusEl.dataset.kind = kind || "";
  };
  const showProgress = (show) => {
    progressEl.hidden = !show;
  };
  const setProgress = (fraction) => {
    const pct = Math.round(fraction * 100);
    barFill.style.width = pct + "%";
    progressText.textContent = pct + "%";
  };

  let busy = false;

  // Reconcile the UI with the persisted model state. We trust the lightweight
  // `toxicModelReady` flag here instead of scanning the whole Cache API on every
  // page open — enumerating a downloaded 55 MB model's weight shards via
  // cache.match() was a major source of the slow load. The flag is written only
  // after a successful download (and cleared on remove/failure); if it ever goes
  // stale (e.g. the browser evicts the cache), the toggle-ON handler below calls
  // isReady() and re-downloads, so correctness self-heals at the moment of use.
  async function render(snapshot) {
    // Initial render uses the page's batched snapshot; later renders (after a
    // toggle/remove) pass nothing and read the two flags fresh.
    const { toxicModelEnabled, toxicModelReady } = snapshot || await chrome.storage.local.get({
      toxicModelEnabled: false,
      toxicModelReady: false,
    });

    if (toxicModelReady) {
      toggle.checked = toxicModelEnabled;
      removeBtn.hidden = false;
      setStatus(
        toxicModelEnabled
          ? "Model ready — smart detection is on."
          : "Downloaded. Turn on to use it.",
        toxicModelEnabled ? "ready" : "idle"
      );
    } else {
      // Not downloaded → it can't be active. Heal a stale "enabled" flag.
      if (toxicModelEnabled) {
        await chrome.storage.local.set({ toxicModelEnabled: false });
      }
      toggle.checked = false;
      removeBtn.hidden = true;
      setStatus("Off — using the word list only.", "idle");
    }
    showProgress(false);
  }

  toggle.addEventListener("change", async () => {
    if (busy) return;

    // Turning OFF: weakens protection, so gate it behind the Guardian PIN.
    // (The cache is kept either way, so re-enabling stays instant.)
    if (!toggle.checked) {
      if (!(await SieveGuardian.gateToggleOff(toggle, "Turn off smart toxic detection"))) return;
      await chrome.storage.local.set({ toxicModelEnabled: false });
      await render();
      return;
    }

    // Turning ON: ready instantly if cached, otherwise download.
    if (await SieveModelCache.isReady()) {
      await chrome.storage.local.set({ toxicModelEnabled: true, toxicModelReady: true });
      await render();
      return;
    }

    busy = true;
    toggle.disabled = true;
    removeBtn.hidden = true;
    showProgress(true);
    setProgress(0);
    setStatus("Downloading… (about 55 MB, one time)", "busy");
    try {
      await SieveModelCache.download(({ fraction }) => setProgress(fraction));
      await chrome.storage.local.set({ toxicModelEnabled: true, toxicModelReady: true });
      setStatus("Model ready — smart detection is on.", "ready");
      showProgress(false);
      toggle.checked = true;
      removeBtn.hidden = false;
    } catch (err) {
      console.error("[Sieve] toxicity model download failed:", err);
      await chrome.storage.local.set({ toxicModelEnabled: false, toxicModelReady: false });
      toggle.checked = false;
      showProgress(false);
      setStatus("Download failed — still protected by the word list. Try again.", "error");
    } finally {
      busy = false;
      toggle.disabled = false;
    }
  });

  removeBtn.addEventListener("click", async () => {
    if (busy) return;
    // Removing the model turns smart detection off + deletes the download — the
    // same weakening the toggle-off gates, so it needs the PIN too.
    if (!(await SieveGuardian.confirmUnlock("Remove smart toxic detection"))) return;
    await SieveModelCache.clear();
    await chrome.storage.local.set({ toxicModelEnabled: false, toxicModelReady: false });
    await render();
  });

  await render(store);
}

// ===========================================================================
// Financial Protection (Phase 5) — three independent, opt-in toggles.
// All default OFF. Each toggle just writes its own storage key; the service
// worker (background/financial-protection.js) watches those keys and adds or
// removes the scam / trading / mlm rule group accordingly. The allowlist is
// shared with the gambling blocker, so nothing extra is needed here for it.
// ===========================================================================

function setupFinancialProtection(store) {
  setupCheckbox("fp-scam-toggle", "fpScamEnabled", store.fpScamEnabled, "Turn off Scam-site blocking");
  setupCheckbox("fp-trading-toggle", "fpTradingEnabled", store.fpTradingEnabled, "Turn off Trading-site blocking");
  setupCheckbox("fp-mlm-toggle", "fpMlmEnabled", store.fpMlmEnabled, "Turn off MLM-site blocking");
  renderScamListUpdated(store);

  // Keep the "last updated" line current while this page stays open — e.g. when
  // turning the scam blocker on kicks off the first fetch in the background.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.fpScamListUpdatedAt || changes.fpScamListCount)) {
      renderScamListUpdated();
    }
  });
}

// Format a ms-epoch timestamp for display, or "never" if unset.
function fpFormatTime(ms) {
  if (!ms) return "never";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "unknown";
  }
}

// Show "Scam list last updated: <time> (<count> domains)" under the scam toggle.
async function renderScamListUpdated(store) {
  const el = document.getElementById("fp-scam-updated");
  if (!el) return;
  // Initial call passes the batched snapshot; the onChanged listener passes
  // nothing and reads the two values fresh.
  const { fpScamListUpdatedAt, fpScamListCount } = store || await chrome.storage.local.get({
    fpScamListUpdatedAt: 0,
    fpScamListCount: 0,
  });
  el.textContent = fpScamListUpdatedAt
    ? `Scam list last updated: ${fpFormatTime(fpScamListUpdatedAt)} (${fpScamListCount.toLocaleString()} domains)`
    : "Scam list last updated: never";
}

// ===========================================================================
// Safety Shield — four independent, opt-in toggles, all default OFF. Each toggle
// just writes its own storage key; the service worker (background/safety-shield.js)
// watches those keys and adds/removes the matching rule group. The single
// "malware & phishing" toggle (ssSafetyEnabled) governs BOTH the phishing and
// malware lists; the "cryptojacking" toggle (ssCryptojackingEnabled) governs the
// merged miner list; the "AI content farms" toggle (ssAiSlopEnabled) governs the
// ai-slop list. The allowlist is shared with the gambling blocker, so nothing
// extra is needed here for it.
// ===========================================================================

function setupSafetyShield(store) {
  setupCheckbox("ss-piracy-toggle", "ssPiracyEnabled", store.ssPiracyEnabled, "Turn off Piracy-site blocking");
  setupCheckbox("ss-safety-toggle", "ssSafetyEnabled", store.ssSafetyEnabled, "Turn off Malware & phishing blocking");
  setupCheckbox("ss-cryptojacking-toggle", "ssCryptojackingEnabled", store.ssCryptojackingEnabled, "Turn off Cryptojacking blocking");
  setupCheckbox("ss-aislop-toggle", "ssAiSlopEnabled", store.ssAiSlopEnabled, "Turn off AI content-farm blocking");
  setupCheckbox("ss-fraud-toggle", "ssFraudEnabled", store.ssFraudEnabled, "Turn off Fraud-site blocking");
  // Gore / shock sites — static bundled list (no "last updated" line). Writes
  // ssGoreShockEnabled; background/safety-shield.js watches that key. Turning it
  // OFF weakens protection, so it goes through the Guardian PIN gate like the rest.
  setupCheckbox("ss-goreshock-toggle", "ssGoreShockEnabled", store.ssGoreShockEnabled, "Turn off Gore/shock-site blocking");
  // Dating sites — static bundled list (no "last updated" line), same pattern as
  // gore/shock. Writes ssDatingEnabled; background/safety-shield.js watches it.
  setupCheckbox("ss-dating-toggle", "ssDatingEnabled", store.ssDatingEnabled, "Turn off Dating-site blocking");
  renderSafetyShieldUpdated(store);

  // Keep the "last updated" lines current while this page stays open — turning a
  // blocker on kicks off its first fetch in the background, which lands here.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (
      changes.ssPiracyUpdatedAt || changes.ssPiracyCount ||
      changes.ssPhishingUpdatedAt || changes.ssPhishingCount ||
      changes.ssMalwareUpdatedAt || changes.ssMalwareCount ||
      changes.ssCryptojackingUpdatedAt || changes.ssCryptojackingCount ||
      changes.ssAiSlopUpdatedAt || changes.ssAiSlopCount ||
      changes.ssFraudUpdatedAt || changes.ssFraudCount
    ) {
      renderSafetyShieldUpdated();
    }
  });
}

// Show "last updated" under each Safety Shield toggle. Piracy has one list; the
// "malware & phishing" toggle covers two lists, so we show the most recent of
// the two updates and their combined domain count.
async function renderSafetyShieldUpdated(store) {
  const piracyEl = document.getElementById("ss-piracy-updated");
  const safetyEl = document.getElementById("ss-safety-updated");
  const cryptojackingEl = document.getElementById("ss-cryptojacking-updated");
  const aiSlopEl = document.getElementById("ss-aislop-updated");
  const fraudEl = document.getElementById("ss-fraud-updated");
  // Initial call passes the batched snapshot; the onChanged listener passes
  // nothing and reads these fresh.
  const s = store || await chrome.storage.local.get({
    ssPiracyUpdatedAt: 0, ssPiracyCount: 0,
    ssPhishingUpdatedAt: 0, ssPhishingCount: 0,
    ssMalwareUpdatedAt: 0, ssMalwareCount: 0,
    ssCryptojackingUpdatedAt: 0, ssCryptojackingCount: 0,
    ssAiSlopUpdatedAt: 0, ssAiSlopCount: 0,
    ssFraudUpdatedAt: 0, ssFraudCount: 0,
  });

  if (piracyEl) {
    piracyEl.textContent = s.ssPiracyUpdatedAt
      ? `Piracy list last updated: ${fpFormatTime(s.ssPiracyUpdatedAt)} (${s.ssPiracyCount.toLocaleString()} domains)`
      : "Piracy list last updated: never";
  }

  if (safetyEl) {
    const latest = Math.max(s.ssPhishingUpdatedAt, s.ssMalwareUpdatedAt);
    const total = s.ssPhishingCount + s.ssMalwareCount;
    safetyEl.textContent = latest
      ? `Safety lists last updated: ${fpFormatTime(latest)} (${total.toLocaleString()} domains)`
      : "Safety lists last updated: never";
  }

  if (cryptojackingEl) {
    cryptojackingEl.textContent = s.ssCryptojackingUpdatedAt
      ? `Cryptojacking list last updated: ${fpFormatTime(s.ssCryptojackingUpdatedAt)} (${s.ssCryptojackingCount.toLocaleString()} domains)`
      : "Cryptojacking list last updated: never";
  }

  if (aiSlopEl) {
    aiSlopEl.textContent = s.ssAiSlopUpdatedAt
      ? `AI content-farm list last updated: ${fpFormatTime(s.ssAiSlopUpdatedAt)} (${s.ssAiSlopCount.toLocaleString()} domains)`
      : "AI content-farm list last updated: never";
  }

  if (fraudEl) {
    fraudEl.textContent = s.ssFraudUpdatedAt
      ? `Fraud list last updated: ${fpFormatTime(s.ssFraudUpdatedAt)} (${s.ssFraudCount.toLocaleString()} domains)`
      : "Fraud list last updated: never";
  }
}

// ===========================================================================
// Guardian Lock (self-lock PIN) — set / change / remove the PIN.
// ===========================================================================

// A PIN is 4 or more digits.
function isValidPin(pin) {
  return /^\d{4,}$/.test(pin);
}

async function setupGuardian(store) {
  const statusBadge = document.getElementById("guardian-status");
  const setupBox = document.getElementById("guardian-setup");
  const manageBox = document.getElementById("guardian-manage");

  const newPin = document.getElementById("guardian-new");
  const confirmPin = document.getElementById("guardian-confirm");
  const enableBtn = document.getElementById("guardian-enable");
  const setupError = document.getElementById("guardian-setup-error");

  const currentPin = document.getElementById("guardian-current");
  const changePin = document.getElementById("guardian-change");
  const changeConfirm = document.getElementById("guardian-change-confirm");
  const updateBtn = document.getElementById("guardian-update");
  const disableBtn = document.getElementById("guardian-disable");
  const manageError = document.getElementById("guardian-manage-error");

  // Show the right panel (set up vs manage) for the current state. The initial
  // call reads the PIN state from the batched snapshot; the button handlers call
  // render() with no argument and re-check live via SieveGuardian.
  async function render(snapshot) {
    const on = snapshot ? !!snapshot.guardianPinHash : await SieveGuardian.isEnabled();
    statusBadge.textContent = on ? "On" : "Off";
    statusBadge.classList.toggle("on", on);
    setupBox.hidden = on;
    manageBox.hidden = !on;
    setupError.textContent = "";
    manageError.textContent = "";
    newPin.value = confirmPin.value = currentPin.value = changePin.value = changeConfirm.value = "";
  }

  enableBtn.addEventListener("click", async () => {
    if (!isValidPin(newPin.value)) {
      setupError.textContent = "PIN must be at least 4 digits.";
      return;
    }
    if (newPin.value !== confirmPin.value) {
      setupError.textContent = "PINs don't match.";
      return;
    }
    await SieveGuardian.setPin(newPin.value);
    await render();
  });

  updateBtn.addEventListener("click", async () => {
    if (!(await SieveGuardian.verify(currentPin.value))) {
      manageError.textContent = "Current PIN is incorrect.";
      return;
    }
    if (!isValidPin(changePin.value)) {
      manageError.textContent = "New PIN must be at least 4 digits.";
      return;
    }
    if (changePin.value !== changeConfirm.value) {
      manageError.textContent = "New PINs don't match.";
      return;
    }
    await SieveGuardian.setPin(changePin.value);
    await render();
  });

  disableBtn.addEventListener("click", async () => {
    if (!(await SieveGuardian.clearPin(currentPin.value))) {
      manageError.textContent = "Current PIN is incorrect.";
      return;
    }
    await render();
  });

  await render(store);
}

// ===========================================================================
// Doomscroll Stopper (Module 2A) — per-site tracking, limits, today's stats.
// ===========================================================================

const DS_SITE_DEFAULTS = { enabled: false, timeLimitMinutes: 15 };

// Local date "YYYY-MM-DD" — matches the content script and service worker.
function dsTodayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Tiny element builder.
function dsEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Clamp a number input to a non-negative integer (0 = this limit is off).
function dsClampInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// One labelled number field; returns { wrap, input }.
function dsLimitField(labelText, value) {
  const wrap = dsEl("label", "ds-limit");
  wrap.append(dsEl("span", "ds-limit-label", labelText));
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = String(value);
  input.className = "ds-limit-input";
  wrap.append(input);
  return { wrap, input };
}

// Build one site's row: enable checkbox, today's time, and the two limits.
function dsRenderSite(site, settings, minutesToday, allSettings) {
  const row = dsEl("div", "ds-site");

  const head = dsEl("div", "ds-site-head");
  const nameLabel = dsEl("label", "ds-site-toggle");
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = settings.enabled;
  nameLabel.append(toggle, dsEl("span", "ds-site-name", site.name));
  head.append(nameLabel);
  head.append(dsEl("span", "ds-site-stat", `${minutesToday} min today`));
  row.append(head);

  const limits = dsEl("div", "ds-limits");
  const time = dsLimitField("Daily time limit (min)", settings.timeLimitMinutes);
  limits.append(time.wrap);
  row.append(limits);

  // Track the last committed limit so we can tell whether an edit weakens it.
  // (0 = "limit off"; a larger number = more lenient — see content/doomscroll.js.)
  let lastLimit = dsClampInt(time.input.value);

  function persist() {
    allSettings[site.id] = {
      enabled: toggle.checked,
      timeLimitMinutes: dsClampInt(time.input.value),
    };
    chrome.storage.local.set({ doomscrollSites: allSettings });
  }
  function applyDim() {
    row.classList.toggle("is-off", !toggle.checked);
    time.input.disabled = !toggle.checked;
  }

  toggle.addEventListener("change", async () => {
    // Turning a site's limit off weakens protection — gate it behind the PIN.
    if (!(await SieveGuardian.gateToggleOff(toggle, `Turn off Doomscroll limits on ${site.name}`)))
      return;
    persist();
    applyDim();
  });
  time.input.addEventListener("change", async () => {
    const next = dsClampInt(time.input.value);
    // Weakening = turning the limit off (→0) or raising it. Strengthening is free.
    const weakens = next === 0 ? lastLimit !== 0 : lastLimit !== 0 && next > lastLimit;
    if (weakens && !(await SieveGuardian.confirmUnlock(`Raise the Doomscroll limit on ${site.name}`))) {
      time.input.value = String(lastLimit); // revert (programmatic set won't re-fire change)
      return;
    }
    lastLimit = next;
    persist();
  });
  applyDim();
  return row;
}

// Load the supported sites, render a row each, and show today's stats.
async function setupDoomscroll(store) {
  const list = document.getElementById("ds-sites");

  let configs = [];
  try {
    const res = await fetch(chrome.runtime.getURL("data/site-configs.json"));
    configs = await res.json();
  } catch (err) {
    console.error("[Sieve] options could not load site-configs.json", err);
  }

  // Per-site settings and today's stats come from the page's batched snapshot.
  const allSettings = store.doomscrollSites;
  const stats = store.doomscrollStats;
  const today = dsTodayStr();

  list.textContent = "";
  for (const site of configs) {
    const settings = { ...DS_SITE_DEFAULTS, ...(allSettings[site.id] || {}) };
    const entry = (stats[site.id] || {})[today];
    // Today's total may be stored as { minutes, px } or, in older data, a number.
    const minutes = entry && typeof entry === "object" ? entry.minutes || 0 : entry || 0;
    list.append(dsRenderSite(site, settings, Math.round(minutes), allSettings));
  }
}

// ===========================================================================
// Dark Pattern Blocker (Module 3A) — master + per-type toggles.
// Moved here from the popup. Each toggle writes its own storage key (via the
// service worker); content/dark-patterns.js watches those keys and reacts.
// Turning a toggle OFF weakens protection, so it goes through the Guardian gate.
// ===========================================================================

const DARK_PATTERN_TYPES = [
  { key: "darkPatternTimersEnabled", id: "dark-pattern-timers-toggle", name: "fake countdown timer removal" },
  { key: "darkPatternGuiltCopyEnabled", id: "dark-pattern-guilt-copy-toggle", name: "guilt-trip copy rewriting" },
  { key: "darkPatternCheckboxesEnabled", id: "dark-pattern-checkboxes-toggle", name: "pre-ticked checkbox highlighting" },
  { key: "darkPatternCookiesEnabled", id: "dark-pattern-cookies-toggle", name: "cookie banner fixing" },
  // Opt-in, OFF by default (unlike the others). Sits under the same master
  // switch and reuses the same gate/persist plumbing; only its default differs.
  { key: "darkPatternCookieAutoRejectEnabled", id: "dark-pattern-cookie-autoreject-toggle", name: "auto-rejecting non-essential cookies", default: false },
  { key: "darkPatternScarcityEnabled", id: "dark-pattern-scarcity-toggle", name: "fake scarcity dimming" },
];

function setupDarkPatterns(store) {
  const master = document.getElementById("dark-patterns-toggle");
  if (!master) return;
  const subs = DARK_PATTERN_TYPES.map((t) => ({ ...t, el: document.getElementById(t.id) }));

  function setSubsDisabled(disabled) {
    for (const s of subs) if (s.el) s.el.disabled = disabled;
  }

  master.checked = store.darkPatternsEnabled;
  setSubsDisabled(!master.checked);
  for (const s of subs) if (s.el) s.el.checked = store[s.key];

  master.addEventListener("change", async () => {
    if (!(await SieveGuardian.gateToggleOff(master, "Turn off the Dark Pattern Blocker"))) return;
    setSubsDisabled(!master.checked);
    chrome.runtime.sendMessage({ type: SET_MODULE_STATE, key: "darkPatternsEnabled", enabled: master.checked });
  });

  for (const s of subs) {
    if (!s.el) continue;
    s.el.addEventListener("change", async () => {
      if (!(await SieveGuardian.gateToggleOff(s.el, `Turn off ${s.name}`))) return;
      chrome.runtime.sendMessage({ type: SET_MODULE_STATE, key: s.key, enabled: s.el.checked });
    });
  }

  // Live counter under the auto-reject toggle: "Auto-rejected cookies on X sites
  // this week". The tally is written by content/cookie-autoreject.js into
  // cookieAutoRejectStats; here we just render the current week's figure and keep
  // it fresh as more sites are handled. Week id = this week's Monday (matches the
  // driver), so a new week resets the number automatically.
  const countEl = document.getElementById("cookie-autoreject-count");
  if (countEl) {
    const thisWeekKey = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const render = (stats) => {
      const n = stats && stats.weekKey === thisWeekKey() ? stats.count || 0 : 0;
      countEl.textContent = `Auto-rejected cookies on ${n} ${n === 1 ? "site" : "sites"} this week`;
    };
    render(store.cookieAutoRejectStats);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.cookieAutoRejectStats) render(changes.cookieAutoRejectStats.newValue);
    });
  }
}

// ===========================================================================
// Toxic Comment Hider — per-site toggles. Moved here from the popup; stored
// together in the toxicSiteToggles object (absent entry = on).
// ===========================================================================

const TOXIC_SITES = [
  { key: "youtube", id: "toxic-site-youtube", name: "YouTube" },
  { key: "reddit", id: "toxic-site-reddit", name: "Reddit" },
  { key: "twitter", id: "toxic-site-twitter", name: "X (Twitter)" },
  { key: "disqus", id: "toxic-site-disqus", name: "Disqus" },
];

function setupToxicSites(store) {
  const sites = TOXIC_SITES.map((s) => ({ ...s, el: document.getElementById(s.id) }));
  if (!sites.some((s) => s.el)) return;

  const toggles = store.toxicSiteToggles || {};

  for (const s of sites) {
    if (!s.el) continue;
    s.el.checked = toggles[s.key] !== false; // absent = on
    s.el.addEventListener("change", async () => {
      if (!(await SieveGuardian.gateToggleOff(s.el, `Turn off toxic-comment hiding on ${s.name}`))) return;
      const cur = (await chrome.storage.local.get({ toxicSiteToggles: {} })).toxicSiteToggles || {};
      cur[s.key] = s.el.checked;
      chrome.storage.local.set({ toxicSiteToggles: cur });
    });
  }
}

// ===========================================================================
// Protection Dashboard — today / week stats from the shared stats store.
// ===========================================================================

// The dashboard is split into two labelled sections: things Sieve cleaned up on
// the page you were on, and whole websites it kept you off. Each row's `combine`
// lists every stats key that rolls into it (e.g. Malware & Phishing folds in the
// separately-recorded "cryptojacking" blocks so they aren't lost).
const DASHBOARD_GROUPS = [
  {
    title: "On-page protection",
    rows: [
      { key: "toxicComments", label: "Toxic Comments" },
      { key: "darkPatterns", label: "Dark Patterns" },
      { key: "popupHijacks", label: "Popup & Click Hijacks" },
      { key: "badLanguage", label: "Bad Language Filter", combine: ["badLanguage"] },
      { key: "cookieAutoReject", label: "Cookie Auto-Reject", combine: ["cookieAutoReject"] },
    ],
  },
  {
    title: "Blocked websites",
    rows: [
      { key: "gambling", label: "Gambling & Prediction Markets", combine: ["gambling", "predictionMarkets"] },
      { key: "scam", label: "Financial Scams", combine: ["scam", "fraud"] },
      { key: "trading", label: "Trading & MLM", combine: ["trading", "mlm"] },
      { key: "malware", label: "Malware & Phishing", combine: ["malware", "cryptojacking"] },
      { key: "piracy", label: "Piracy & Illegal Streaming", combine: ["piracy"] },
      { key: "aiSlop", label: "AI Slop / Spam", combine: ["aiSlop"] },
      { key: "goreShock", label: "Gore / Shock", combine: ["goreShock"] },
      { key: "dating", label: "Dating Sites", combine: ["dating"] },
      { key: "customBlocked", label: "Custom Blocked Sites", combine: ["customBlocked"] },
      { key: "urlShortener", label: "URL Shortener Blocks", combine: ["urlShortener"] },
    ],
  },
];

// Per-category glyphs (inner SVG markup) — same Lucide-style line icons the rest
// of the options page uses. Rendered inside a shared <svg> wrapper by iconSvg().
const DASHBOARD_ICONS = {
  darkPatterns: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  toxicComments: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="12" y1="14" x2="12.01" y2="14"/>',
  popupHijacks: '<path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/>',
  gambling: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/>',
  scam: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9.5" y1="9" x2="14.5" y2="14"/><line x1="14.5" y1="9" x2="9.5" y2="14"/>',
  trading: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  malware: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2"/><path d="M5 7l3 2"/><path d="M19 19l-3-2"/><path d="M5 19l3-2"/><path d="M20 13h-4"/><path d="M8 13H4"/><path d="M10 4l1 2"/><path d="M14 4l-1 2"/>',
  piracy: '<rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
  aiSlop: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  goreShock: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  dating: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  customBlocked: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  urlShortener: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  badLanguage: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  cookieAutoReject: '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
};

const DASHBOARD_MOON_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function iconSvg(inner) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner || ""}</svg>`;
}

function dashboardValue(stats, row) {
  const keys = row.combine || [row.key];
  return keys.reduce((sum, k) => sum + (stats[k] || 0), 0);
}

async function setupDashboard(store) {
  const numEl = document.getElementById("dashboard-total-num");
  const labelEl = document.getElementById("dashboard-total-label");
  const subEl = document.getElementById("dashboard-total-sub");
  const gridEl = document.getElementById("dashboard-grid");
  const tabsEl = document.getElementById("dashboard-tabs");
  const toggleEl = document.getElementById("dashboard-toggle");
  if (!gridEl) return;

  let getStats;
  try {
    const statsMod = await import("../common/stats.js");
    getStats = statsMod.getStats;
  } catch (err) {
    console.error("[Sieve] Dashboard could not load stats module", err);
    gridEl.innerHTML = "<div class='dashboard-empty'>Unable to load dashboard stats.</div>";
    if (tabsEl) tabsEl.style.display = "none";
    return;
  }

  let currentPeriod = "today";

  // Build one category row (icon + label + proportional bar + count). `max` is
  // the busiest value in its section, so bars scale within their own section.
  function renderItem(row, value, max) {
    const pct = max ? Math.max(4, Math.round((value / max) * 100)) : 0;
    const item = document.createElement("div");
    item.className = "dashboard-item";
    item.innerHTML = `
      <span class="dashboard-item-icon">${iconSvg(DASHBOARD_ICONS[row.key])}</span>
      <div class="dashboard-item-main">
        <div class="dashboard-item-label">${escapeHtml(row.label)}</div>
        <div class="dashboard-item-bar"><div class="dashboard-item-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="dashboard-item-count">${value.toLocaleString()}</span>
    `;
    return item;
  }

  async function render() {
    const stats = await getStats(currentPeriod);
    const periodLabel = currentPeriod === "week" ? "this week" : "today";

    gridEl.textContent = "";
    let grandTotal = 0;
    let activeCount = 0;

    for (const group of DASHBOARD_GROUPS) {
      // Value per category, then split into "active" (>0, sorted busiest-first)
      // and the quiet remainder that collapses into a single line.
      const rows = group.rows.map((row) => ({ row, value: dashboardValue(stats, row) }));
      const subtotal = rows.reduce((sum, r) => sum + r.value, 0);
      const active = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
      const quiet = rows.length - active.length;
      const max = active.length ? active[0].value : 0;
      grandTotal += subtotal;
      activeCount += active.length;

      const groupEl = document.createElement("div");
      groupEl.className = "dashboard-group";

      const head = document.createElement("div");
      head.className = "dashboard-group-head";
      head.innerHTML = `
        <span class="dashboard-group-title">${escapeHtml(group.title)}</span>
        <span class="dashboard-group-total">${subtotal.toLocaleString()}</span>
      `;
      groupEl.appendChild(head);

      const list = document.createElement("div");
      list.className = "dashboard-group-list";
      for (const { row, value } of active) list.appendChild(renderItem(row, value, max));

      if (quiet > 0) {
        const line = document.createElement("div");
        line.className = "dashboard-quiet";
        line.innerHTML = `${DASHBOARD_MOON_ICON}<span>${quiet} ${quiet === 1 ? "category" : "categories"} — nothing to block ${periodLabel}</span>`;
        list.appendChild(line);
      }

      groupEl.appendChild(list);
      gridEl.appendChild(groupEl);
    }

    if (numEl) numEl.textContent = grandTotal.toLocaleString();
    if (labelEl) labelEl.textContent = `thing${grandTotal === 1 ? "" : "s"} blocked ${periodLabel}`;
    if (subEl) {
      subEl.textContent =
        grandTotal === 0
          ? "Nothing to block yet — you're all clear."
          : `Across ${activeCount} active ${activeCount === 1 ? "filter" : "filters"} ${periodLabel}.`;
    }
  }

  function setPeriod(period) {
    currentPeriod = period;
    if (tabsEl) {
      for (const btn of tabsEl.querySelectorAll(".dashboard-tab")) {
        btn.classList.toggle("active", btn.dataset.period === period);
      }
    }
    render();
  }

  if (tabsEl) {
    tabsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".dashboard-tab");
      if (!btn) return;
      setPeriod(btn.dataset.period);
    });
  }

  // Collapsible breakdown — opens compact (just the tabs + hero summary). The
  // list is always rendered, only shown/hidden, so expanding is instant. The
  // choice persists across reloads via the batched settings read.
  let expanded = !!(store && store.dashboardExpanded);
  function applyExpanded() {
    if (toggleEl) toggleEl.setAttribute("aria-expanded", String(expanded));
    gridEl.hidden = !expanded;
  }
  applyExpanded();

  if (toggleEl) {
    const toggle = () => {
      expanded = !expanded;
      applyExpanded();
      chrome.storage.local.set({ dashboardExpanded: expanded }).catch(() => {});
    };
    toggleEl.addEventListener("click", toggle);
    toggleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        toggle();
      }
    });
  }

  await render();

  // Refresh when the shared stats store changes.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.sieveStats) render();
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ===========================================================================
// Announcement banner — a backend-free way to show a message to all users.
// Host a small JSON file in the repo and edit it to broadcast; the options page
// fetches it on open. No account, no database. Expected shape (all optional
// except `message`):
//   {
//     "id": "2026-07-release",     // change this whenever you post a NEW message
//     "active": true,               // set false to hide without deleting
//     "level": "info",              // info | update | warning (styles the accent)
//     "title": "Sieve 1.3 is out",
//     "message": "What's new: …",
//     "url": "https://…",           // optional call-to-action link (default / Chrome)
//     "urlFirefox": "https://…",    // optional override used only on Firefox —
//                                    // e.g. an addons.mozilla.org link when `url`
//                                    // points at the Chrome Web Store. Falls back
//                                    // to `url` when omitted.
//     "linkText": "Read more"
//   }
// ---------------------------------------------------------------------------
// Point this at the raw file in YOUR repo after pushing (replace the username).
// raw.githubusercontent.com serves the file directly; <all_urls> host permission
// lets the extension page fetch it.
const ANNOUNCEMENT_URL =
  "https://raw.githubusercontent.com/codepurse/Sieve/main/announcement.json";

// Firefox extension pages load from moz-extension://; every Chromium browser
// (Chrome, Edge, Brave, Opera) uses chrome-extension://. No special permission
// needed — this just reads the current page's own URL scheme.
const IS_FIREFOX = location.protocol === "moz-extension:";

async function setupAnnouncement(store) {
  const el = document.getElementById("announcement");
  if (!el) return;

  let data;
  try {
    const res = await fetch(ANNOUNCEMENT_URL, { cache: "no-cache" });
    if (!res.ok) return; // 404 (not posted yet) / server error → show nothing
    data = await res.json();
  } catch {
    return; // offline / blocked / malformed → fail silently, never nag
  }

  if (!data || data.active === false || !data.message) return;

  // A stable id lets "dismiss" stick until you post a genuinely new message.
  const id = String(data.id || data.message);
  const dismissed =
    (store && store.dismissedAnnouncementId) ||
    (await chrome.storage.local.get({ dismissedAnnouncementId: "" })).dismissedAnnouncementId;
  if (dismissed === id) return;

  const titleEl = document.getElementById("announcement-title");
  const textEl = document.getElementById("announcement-text");
  const linkEl = document.getElementById("announcement-link");
  const dismissBtn = document.getElementById("announcement-dismiss");

  // Text only (never innerHTML) — the message is trusted content, but rendering
  // it as text keeps the banner XSS-proof regardless of what's in the file.
  if (titleEl) {
    titleEl.textContent = data.title || "";
    titleEl.hidden = !data.title;
  }
  if (textEl) textEl.textContent = data.message;

  el.dataset.level = ["info", "update", "warning"].includes(data.level) ? data.level : "info";

  // Optional link — Firefox gets `urlFirefox` when provided (e.g. an AMO page
  // instead of a Chrome Web Store one), otherwise everyone gets `url`. Only
  // rendered if the resolved value is a real http(s) URL.
  const linkUrl = (IS_FIREFOX && data.urlFirefox) || data.url;
  if (linkEl && linkUrl && /^https?:\/\//i.test(String(linkUrl))) {
    linkEl.href = linkUrl;
    linkEl.textContent = data.linkText || "Learn more";
    linkEl.hidden = false;
  }

  el.hidden = false;

  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      el.hidden = true;
      chrome.storage.local.set({ dismissedAnnouncementId: id }).catch(() => {});
    });
  }
}

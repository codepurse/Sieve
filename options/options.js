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

// --- blocked-sites entries ------------------------------------------------
//
// The blocked-sites list is not a plain list of domains. An entry can be a
// wildcard, a whole top-level domain, a regex over the address, a regex over
// the page title, or a note — see the "Blocked-site entries" section of
// common/keyword-pattern.js, which the settings page, the service worker and
// the content script all share so that all three agree on what a line means.

function normalizeBlockEntry(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const parsed = KeywordPattern.parseListEntry(raw);
  // Notes and both regex forms are stored exactly as typed: lower-casing a
  // pattern, or stripping a "www." out of one, would change what it means.
  if (parsed.kind === "comment" || parsed.kind === "url" || parsed.kind === "title") return raw;
  // The rest are canonicalised, so "https://WWW.Example.com/" and "example.com"
  // are recognised as the same entry rather than saved twice.
  if (parsed.kind === "tld") return "." + parsed.tld;
  if (parsed.kind === "wildcard") return parsed.host + parsed.path;
  return raw;
}

// Chrome enforces an address pattern through declarativeNetRequest, whose regex
// dialect is RE2, not JavaScript's: /example(?=\.com)/ is a perfectly valid JS
// pattern that Chrome will not accept. Asking it here means the user hears
// about that now, while the pattern is still in front of them, instead of the
// line sitting in their list looking fine and never blocking anything.
async function checkBlockEntry(entry) {
  const result = KeywordPattern.validateListEntry(entry);
  if (!result.ok) return result.error;
  if (result.kind !== "url") return "";
  try {
    const parsed = KeywordPattern.parseListEntry(entry);
    const supported = await chrome.declarativeNetRequest.isRegexSupported({
      regex: parsed.body,
      isCaseSensitive: false,
    });
    if (supported && supported.isSupported) return "";
    return (
      "Chrome cannot block pages with this pattern" +
      (supported && supported.reason ? " (" + String(supported.reason).toLowerCase() + ")" : "") +
      ". Lookahead and backreferences are the usual cause — a title/…/ pattern accepts them."
    );
  } catch (_) {
    return ""; // if the check itself is unavailable, don't stand in the user's way
  }
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
    // A note (a "#" or "!" line in the blocked-sites list) is a heading for the
    // entries under it, not an entry, so it is styled as one — and it still has
    // its own remove button, because it is still a line the user can delete.
    if (typeof KeywordPattern !== "undefined" && KeywordPattern.isCommentEntry(item)) {
      li.className = "note";
    }
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

// --- bulk entry: paste a list, import a file, export one ------------------
//
// Adding entries one at a time through a single input and an Add button is fine
// for one domain and painful for fifty. A user who keeps his own lists asked to
// paste them in instead, which is the natural way to fill these.
//
// Built here rather than in options.html because all four lists share the same
// markup (an .add-row, an error line, a <ul>), so one implementation keeps them
// identical and there is no fourfold copy to drift.

const MAX_IMPORT_BYTES = 1024 * 1024;

// One entry per line. Quoted fields keep their commas, so a phrase survives a
// round trip through a spreadsheet; an unquoted line is taken whole, because
// someone typing "hello, world" means one phrase.
function parseEntryList(text) {
  const source = String(text || "").replace(/^﻿/, ""); // strip BOM (Excel)
  const entries = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === "\r" || source[i] === "\n") { i++; continue; }
    let value = "";
    if (source[i] === '"') {
      i++;
      for (; i < source.length; i++) {
        if (source[i] === '"') {
          if (source[i + 1] === '"') { value += '"'; i++; continue; }
          i++;
          break;
        }
        value += source[i];
      }
      while (i < source.length && source[i] !== "\r" && source[i] !== "\n") i++;
    } else {
      const end = source.indexOf("\n", i);
      value = end === -1 ? source.slice(i) : source.slice(i, end);
      i = end === -1 ? source.length : end + 1;
    }
    const trimmed = value.trim();
    if (trimmed) entries.push(trimmed);
  }
  return entries;
}

function serializeEntryList(entries) {
  return entries
    .map((e) => (/[",\r\n]/.test(e) ? '"' + String(e).replace(/"/g, '""') + '"' : e))
    .join("\r\n");
}

// Case-insensitive de-duplication, A-Z, first spelling kept. Every consumer of
// these lists lower-cases before matching, so "Example.com" and "example.com"
// are the same entry.
function tidyEntryList(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = String(entry).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
}

function downloadTextFile(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// gateAddAction / gateRemoveAction: when set, that mutation WEAKENS protection
// (e.g. allowlisting a site, or un-blocking one) and must pass the Guardian PIN
// gate. The opposite mutation strengthens protection and is always free. Mirrors
// the "allow this site" gate on the blocked page (pages/blocked.js).
// checkValue: a section whose entries are richer than one shape (the
// blocked-sites list) supplies its own check, which returns the REASON a line
// is refused rather than a single catch-all message — being told "invalid" when
// the real answer is "that flag would make the pattern match every other time"
// is what makes a list like this infuriating to fill in. It may be async: the
// blocked list asks Chrome whether it can actually use an address pattern.
//
// tidy: how the saved list is de-duplicated and sorted. The default sorts the
// whole list A-Z; the blocked list passes a note-aware sort, so a heading stays
// above the entries it heads.
function setupSection({ storageKey, inputId, addBtnId, listId, errorId, normalize, validate, invalidMsg, initialItems, gateAddAction, gateRemoveAction, allowRegex, checkValue, tidy, bulkHint }) {
  const input = document.getElementById(inputId);
  const addBtn = document.getElementById(addBtnId);
  const listEl = document.getElementById(listId);
  const errorEl = document.getElementById(errorId);
  const tidyList = tidy || tidyEntryList;

  async function refresh() {
    renderList(listEl, await getList(storageKey));
  }

  // A /regex/ entry is checked by KeywordPattern rather than the section's own
  // validator, which would reject the slashes. Returns an error string, or "".
  async function checkEntry(value) {
    if (allowRegex && typeof KeywordPattern !== "undefined" && KeywordPattern.isRegexEntry(value)) {
      const result = KeywordPattern.validateEntry(value);
      return result.ok ? "" : result.error;
    }
    if (checkValue) return await checkValue(value);
    return validate(value) ? "" : invalidMsg;
  }

  async function add() {
    // Regex entries keep their case and slashes; normalize() is for literals.
    const raw = String(input.value || "").trim();
    const isRegex = allowRegex && typeof KeywordPattern !== "undefined" && KeywordPattern.isRegexEntry(raw);
    const value = isRegex ? raw : normalize(input.value);
    const error = await checkEntry(value);
    if (error) {
      errorEl.textContent = error;
      return;
    }
    errorEl.textContent = "";
    // Gate weakening adds (e.g. allowlisting a site) behind the PIN.
    if (gateAddAction && !(await SieveGuardian.confirmUnlock(gateAddAction))) return;
    // tidyList so this route and "Add all" agree: case-insensitive
    // de-duplication (adding "Example.com" when "example.com" is already there
    // is not a new entry) and a locale A-Z sort rather than raw code points,
    // which put every capital ahead of every lowercase letter.
    const list = await getList(storageKey);
    const merged = tidyList(list.concat([value]));
    if (merged.length !== list.length) {
      await setList(storageKey, merged);
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

  // Add many at once. Invalid lines are reported rather than silently dropped —
  // pasting 50 domains and being told "38 added" with no explanation of the
  // other 12 is worse than useless.
  async function addMany(rawEntries) {
    const accepted = [];
    const rejected = [];
    for (const raw of rawEntries) {
      const trimmed = String(raw || "").trim();
      const isRegex =
        allowRegex && typeof KeywordPattern !== "undefined" && KeywordPattern.isRegexEntry(trimmed);
      const value = isRegex ? trimmed : normalize(raw);
      if (value && !(await checkEntry(value))) accepted.push(value);
      else rejected.push(raw);
    }
    if (accepted.length === 0) {
      return { added: 0, duplicates: 0, rejected };
    }
    // One gate for the whole batch, not one prompt per entry.
    if (gateAddAction && !(await SieveGuardian.confirmUnlock(gateAddAction))) {
      return { added: 0, duplicates: 0, rejected, cancelled: true };
    }
    const existing = await getList(storageKey);
    const before = existing.length;
    const merged = tidyList(existing.concat(accepted));
    await setList(storageKey, merged);
    await refresh();
    const added = merged.length - before;
    return { added, duplicates: accepted.length - added, rejected };
  }

  // Build the paste/import/export panel next to this list's add row.
  function buildBulkPanel() {
    const addRow = input.closest(".add-row") || input.parentNode;
    if (!addRow || !addRow.parentNode) return;

    const details = document.createElement("details");
    details.className = "bulk";

    const summary = document.createElement("summary");
    summary.textContent = "Paste a list, import or export";
    details.appendChild(summary);

    const textarea = document.createElement("textarea");
    textarea.className = "input bulk-text";
    // A list pasted in here goes through exactly the same validation a typed
    // entry does, so the box says what it will accept rather than leaving the
    // user to discover it one rejected line at a time.
    textarea.placeholder = bulkHint || "One per line, or paste a whole list here";
    // Tall enough to show the whole hint: a placeholder that lists the accepted
    // forms is no use if the box clips the last two of them.
    textarea.rows = Math.max(6, textarea.placeholder.split("\n").length);
    details.appendChild(textarea);

    const row = document.createElement("div");
    row.className = "add-row bulk-actions";

    const addAllBtn = document.createElement("button");
    addAllBtn.className = "btn btn-primary";
    addAllBtn.textContent = "Add all";

    const importBtn = document.createElement("button");
    importBtn.className = "btn";
    importBtn.textContent = "Import";

    const exportBtn = document.createElement("button");
    exportBtn.className = "btn";
    exportBtn.textContent = "Export";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv,.txt,text/csv,text/plain";
    fileInput.hidden = true;

    row.append(addAllBtn, importBtn, exportBtn, fileInput);
    details.appendChild(row);

    const status = document.createElement("p");
    status.className = "hint bulk-status";
    details.appendChild(status);

    addRow.parentNode.insertBefore(details, addRow.nextSibling);

    addAllBtn.addEventListener("click", async () => {
      const entries = parseEntryList(textarea.value);
      if (entries.length === 0) {
        status.textContent = "Nothing to add — paste some entries first.";
        return;
      }
      const result = await addMany(entries);
      if (result.cancelled) {
        status.textContent = "Cancelled — nothing was added.";
        return;
      }
      const parts = [`Added ${result.added}`];
      if (result.duplicates > 0) parts.push(`${result.duplicates} already in your list`);
      if (result.rejected.length > 0) {
        const sample = result.rejected.slice(0, 3).join(", ");
        parts.push(
          `${result.rejected.length} skipped as invalid (${sample}${result.rejected.length > 3 ? "…" : ""})`
        );
      }
      status.textContent = parts.join(" · ");
      if (result.added > 0) textarea.value = "";
    });

    // Import fills the box rather than writing straight to storage: the entries
    // are visible before they take effect, and "Add all" still applies the same
    // validation and PIN gate a typed entry would.
    importBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        if (typeof file.size === "number" && file.size > MAX_IMPORT_BYTES) {
          status.textContent = "That file is too large (max 1 MB).";
          return;
        }
        const text = await file.text();
        const imported = parseEntryList(text);
        if (imported.length === 0) {
          status.textContent = "No entries found in that file.";
          return;
        }
        const merged = tidyList(parseEntryList(textarea.value).concat(imported));
        textarea.value = merged.join("\n");
        status.textContent = `Loaded ${imported.length} from the file — review, then Add all.`;
      } catch (err) {
        console.error("[Sieve] list import failed:", err);
        status.textContent = "Could not read that file.";
      } finally {
        e.target.value = ""; // allow re-importing the same file
      }
    });

    exportBtn.addEventListener("click", async () => {
      const list = await getList(storageKey);
      if (list.length === 0) {
        status.textContent = "Nothing to export yet.";
        return;
      }
      const date = new Date().toISOString().split("T")[0];
      downloadTextFile(`sieve-${storageKey}-${date}.csv`, serializeEntryList(list));
      status.textContent = `Exported ${list.length}.`;
    });
  }

  addBtn.addEventListener("click", add);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") add();
  });
  listEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove")) remove(e.target.dataset.item);
  });
  buildBulkPanel();

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
    // Game Blocker — four independent groups, all opt-in
    ssGamePortalsEnabled: false,
    ssGameStoresEnabled: false,
    ssGamePlatformsEnabled: false,
    ssGameStreamingEnabled: false,
    // Ad & Tracker Blocker (BETA) — independent opt-in groups behind one switch
    ssAdTrackerEnabled: false,
    ssAdNetworkEnabled: false,
    ssYouTubeAdsEnabled: false,
    ssFacebookAdsEnabled: false,
    ssAntiAdblockEnabled: false,
    ssAdSlotCollapseEnabled: false,
    ssFloatVideoEnabled: false,
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
    doomscrollCustomSites: [],
    // Site Cleanup — per-site page surgery, e.g. { youtube: { enabled, … } }
    siteCleanup: {},
    // Guardian — presence of a hash means a PIN is set
    guardianPinHash: "",
    // Search Result Filter — rules carry their own colour; see setupSearchFilter
    searchFilterEnabled: false,
    searchFilterRules: [],
    searchFilterColors: [],
    searchFilterHideBlocked: true,
    // Dark Pattern Blocker — master + cookie-autoreject tally (per-type keys added below)
    darkPatternsEnabled: true,
    cookieAutoRejectStats: null,
    // Protection Dashboard — remember whether the breakdown is expanded
    dashboardExpanded: false,
    // Usage Insights — opt-in screen-time tracking, and how long to keep it
    usageEnabled: false,
    usageRetentionDays: 30,
    // Announcement banner — id of the last message the user dismissed
    dismissedAnnouncementId: "",
    // What's New — version whose release notes the user has already seen
    seenWhatsNewVersion: "",
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
    invalidMsg: "Enter a single word (letters only), or a pattern like /w[o0]rd/.",
    initialItems: store.customWords,
    // Word lists accept /regex/ entries; the site lists cannot, because their
    // blocking runs through declarativeNetRequest.
    allowRegex: true,
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
    normalize: normalizeBlockEntry,
    // Five forms, not one, so the section asks KeywordPattern instead of a
    // shape test — and reports the reason a line was refused.
    checkValue: checkBlockEntry,
    validate: () => true,
    invalidMsg: "",
    tidy: KeywordPattern.tidyListEntries, // keeps a note above the entries it heads
    bulkHint:
      "One entry per line — any of the forms above:\n" +
      "example.com\n" +
      "*.example.com\n" +
      "example.com/adult/*\n" +
      ".xyz\n" +
      "/example\\.(net|org)/\n" +
      "title/Example Domain/\n" +
      "# a note, ignored when matching",
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
  setupGameBlocker(store);         // game portals/stores/platforms/streaming toggles
  setupAdTrackerBlocker(store);    // Ad & Trackers (BETA) — bundled tracker-domain tier

  // URL Shortener Resolver — advanced setting, default ON. Turning it OFF
  // weakens protection, so it goes through the Guardian PIN gate like other
  // protection toggles.
  setupCheckbox("url-shortener-resolver-toggle", "urlShortenerResolverEnabled", store.urlShortenerResolverEnabled, "Turn off URL Shortener Resolver");

  setupSearchFilter(store);        // hide / colour-code search results
  setupWhatsNew(store);            // release notes bundled with the extension
  setupSiteCleanup(store);         // per-site page cleanup (YouTube)
  setupToxicHider(store);          // Module 4A
  setupGuardian(store);            // self-lock PIN status panel
  setupAccessCode();               // optional second layer over that PIN
  setupDarkPatterns(store);        // Module 3A — relocated from the popup
  setupToxicSites(store);          // per-site toggles — relocated from the popup

  // Protection Dashboard — today / week stats from the shared stats store.
  await setupDashboard(store);

  // Usage Insights — the screen-time report. Its chart drawing lives in its own
  // module, loaded on demand like the shared stats store above.
  await setupUsageSection(store);

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
// What's New — the release notes themselves live in common/changelog.js and
// are rendered by pages/release-notes.html. All this page owns is the sidebar
// card that opens them: it names the version, says how many entries those
// notes carry, and wears a New badge until they have been looked at.
// ===========================================================================

function setupWhatsNew(store) {
  const link = document.getElementById("whatsnew-link");
  if (!link) return;

  const current = chrome.runtime.getManifest().version;
  const releases = typeof SIEVE_CHANGELOG !== "undefined" ? SIEVE_CHANGELOG : [];

  // The notes for the version actually running, falling back to the newest
  // entry so an unreleased entry still describes the card during development.
  const release = releases.find((r) => r.version === current) || releases[0];
  const sub = document.getElementById("whatsnew-sub");
  if (sub && release) {
    const count = release.items.length;
    sub.textContent = `v${release.version} — ${count} ${count === 1 ? "change" : "changes"}`;
  }

  const pill = document.getElementById("whatsnew-pill");
  const unread = store.seenWhatsNewVersion !== current;
  if (pill) pill.hidden = !unread;
  if (unread) link.classList.add("is-unread");

  // Opening the page counts as reading them; the page records this too, for
  // when it is reached some other way.
  link.addEventListener("click", () => {
    if (pill) pill.hidden = true;
    link.classList.remove("is-unread");
    chrome.storage.local.set({ seenWhatsNewVersion: current });
  });
}

// Small element helper — mirrors dsEl() in the Doomscroll section.
function svEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// ===========================================================================
// Site Cleanup — hide parts of a site you still want to use. Each site is a
// card of grouped switches; content/site-cleanup.js turns them into classes on
// <html> and content/youtube-clean.css does the hiding.
//
// Everything defaults to OFF: switching one on strengthens protection (free),
// switching it off weakens it (Guardian PIN gate), same as every other module.
// Settings live under ONE nested key so more sites don't mean dozens of new
// storage keys: siteCleanup: { youtube: { enabled, hideShorts, … } }
// ===========================================================================

const SITE_CLEANUP_SITES = [
  {
    id: "youtube",
    name: "YouTube",
    masterLabel: "Clean up YouTube",
    masterDesc: "Master switch for everything below",
    groups: [
      {
        title: "Feeds & pages",
        items: [
          { key: "hideHome", label: "Hide home feed", desc: "Empties the home page — search and subscriptions still work" },
          { key: "hideShorts", label: "Hide Shorts", desc: "Removes Shorts shelves and the sidebar entry; a Shorts link opens in the normal player instead of the swipe feed" },
          { key: "hideSubscriptions", label: "Hide Subscriptions", desc: "Empties the Subscriptions feed and removes its sidebar entry" },
          { key: "hideExplore", label: "Hide Explore", desc: "Removes Trending, Music, Movies and Gaming from the sidebar" },
          { key: "hideMixes", label: "Hide mixes & radio playlists", desc: "Drops the auto-generated endless playlists from results and recommendations" },
          { key: "hideSearchExtras", label: "Hide search filler", desc: "Removes “People also search for” and “Related to your search” from results" },
        ],
      },
      {
        title: "On a video page",
        items: [
          { key: "hideRecommended", label: "Hide recommended videos", desc: "Clears the up-next list beside a video. Live chat and playlists stay" },
          { key: "hideComments", label: "Hide comments", desc: "Hides the comment section entirely — the Toxic Comment Hider then skips YouTube, since there's nothing left to read" },
          { key: "hideDescription", label: "Hide the description", desc: "Leaves just the video and its title" },
          { key: "hideChannelInfo", label: "Hide the channel row", desc: "Removes the avatar, channel name and subscribe button under the video" },
          { key: "hideActionButtons", label: "Hide the action buttons", desc: "Removes the like, dislike, share and save row" },
          { key: "hideLiveChat", label: "Hide live chat", desc: "Collapses the chat panel on live streams and premieres" },
          { key: "hideMerch", label: "Hide merch & tickets", desc: "Removes merchandise, ticket and offer shelves" },
        ],
      },
      {
        title: "In the player",
        items: [
          { key: "disableEndCards", label: "Hide end cards", desc: "Removes the video suggestions laid over the end of a video" },
          { key: "hideInfoCards", label: "Hide info cards", desc: "Removes the “i” teaser and its pop-out panel during playback" },
          { key: "disableAutoplay", label: "Turn off autoplay", desc: "Flips YouTube's own autoplay switch off when a video opens. Depends on YouTube's player controls, so it's the one setting here that can break when YouTube changes" },
        ],
      },
      {
        title: "Appearance",
        items: [
          { key: "hideThumbnails", label: "Hide thumbnails", desc: "Blanks video thumbnails; titles stay readable. Channel avatars are left alone" },
          { key: "blurThumbnails", label: "Blur thumbnails", desc: "A softer alternative to hiding them", shadowedBy: "hideThumbnails" },
          { key: "hideTopBar", label: "Hide the top bar", desc: "Removes the masthead, including the search box" },
          { key: "hideNotificationBell", label: "Hide the notification bell", desc: "Keeps the top bar but drops the bell and its red dot", shadowedBy: "hideTopBar" },
          { key: "blackAndWhite", label: "Black & white", desc: "Drains the colour from every YouTube page, the video included" },
        ],
      },
    ],
  },
];

// One switch row in a Site Cleanup card, matching the markup used by the
// Dark Pattern Blocker's rows.
function scRow(label, desc) {
  const row = svEl("div", "switch-row");
  const text = svEl("div", "switch-label");
  text.append(svEl("span", "label", label));
  if (desc) text.append(svEl("span", "description", desc));

  const input = document.createElement("input");
  input.type = "checkbox";
  const toggle = svEl("label", "switch");
  toggle.append(input, svEl("span", "slider"));

  row.append(text, toggle);
  return { row, input };
}

function setupSiteCleanup(store) {
  // The whole nested key, so writing one site never drops another one's settings.
  const all = store.siteCleanup && typeof store.siteCleanup === "object" ? { ...store.siteCleanup } : {};

  for (const site of SITE_CLEANUP_SITES) {
    const host = document.getElementById(`sc-${site.id}-body`);
    if (!host) continue;

    host.textContent = ""; // re-rendering replaces the rows, never doubles them
    const settings = { ...(all[site.id] || {}) };
    const subs = []; // { key, label, input, group }

    function persist() {
      all[site.id] = settings;
      chrome.storage.local.set({ siteCleanup: all });
    }

    // Master switch.
    const masterField = svEl("div", "field");
    const master = scRow(site.masterLabel, site.masterDesc);
    masterField.append(master.row);
    host.append(masterField);
    master.input.checked = !!settings.enabled;

    // Grouped sub-switches.
    for (const group of site.groups) {
      const field = svEl("div", "field sc-group");
      field.append(svEl("h3", "", group.title));
      for (const item of group.items) {
        const { row, input } = scRow(item.label, item.desc);
        input.checked = !!settings[item.key];
        field.append(row);
        subs.push({ ...item, input, group: field });
      }
      host.append(field);
    }

    // Sub-switches only mean anything while the master is on. Hiding a thumbnail
    // outright also makes blurring it moot, so that pair is mutually exclusive.
    function refreshEnabled() {
      const on = master.input.checked;
      for (const s of subs) {
        const shadowed = !!s.shadowedBy && !!settings[s.shadowedBy];
        s.input.disabled = !on || shadowed;
        s.group.classList.toggle("is-off", !on);
      }
    }

    master.input.addEventListener("change", async () => {
      if (!(await SieveGuardian.gateToggleOff(master.input, `Turn off ${site.name} cleanup`))) return;
      settings.enabled = master.input.checked;
      refreshEnabled();
      persist();
    });

    for (const s of subs) {
      s.input.addEventListener("change", async () => {
        if (!(await SieveGuardian.gateToggleOff(s.input, `Turn off “${s.label}” on ${site.name}`))) return;
        settings[s.key] = s.input.checked;
        refreshEnabled();
        persist();
      });
    }

    refreshEnabled();
  }
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
    invalidMsg: "Enter a word or phrase (letters, spaces, ' or -), or a pattern like /w[o0]rd/.",
    initialItems: store.toxicCustomWords,
    allowRegex: true,
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
  // Turns a download failure into something the user can act on. The three
  // causes need three different responses, and "try again" only helps one:
  //   - the request never left the browser  -> a VPN, DNS filter or shield
  //   - the server answered with an error    -> genuinely retry later
  //   - the browser refused to store it      -> free up disk space
  function describeDownloadFailure(err) {
    const message = String((err && err.message) || err || "");

    // fetch() rejects with a TypeError when the request is blocked before it
    // reaches the network, which is what a DNS filter or browser shield does.
    // Only a fetch rejection means "blocked". A bare TypeError is not enough:
    // a coding mistake throws one too, and reporting that as a network problem
    // sends the user chasing their VPN over a bug in this extension.
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
      return `Download blocked before it reached the network. A VPN, custom DNS or browser shield is usually the cause — allow storage.googleapis.com and try again. (${message})`;
    }
    if (/quota|storage|exceeded/i.test(message) || (err && err.name === "QuotaExceededError")) {
      return "Not enough storage to save the model (it needs about 55 MB). Free up disk space and try again.";
    }
    const http = /HTTP (\d{3})/.exec(message);
    if (http) {
      return `The server refused the download (HTTP ${http[1]}). This is not on your end — please try again later.`;
    }
    if (/caches|indexeddb|securityerror/i.test(message)) {
      return "This browser would not let the extension store the model. Check that site data is not blocked for extensions.";
    }
    const name = (err && err.name) ? err.name : "Error";
    return `Download failed (${name}: ${message || "no message"}). Still protected by the word list.`;
  }

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
      // "Try again" was the only guidance, and retrying does not help when the
      // cause is a VPN, a DNS filter or a full disk. Users reported being stuck
      // on this with no way to find out why, so name the likely cause.
      setStatus(describeDownloadFailure(err), "error");
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

// ===========================================================================
// Game Blocker — four independent, opt-in groups over the curated bundled list
// in data/game-sites.json. Each toggle writes its own ss…Enabled key and
// background/safety-shield.js watches them, rebuilding only that group's DNR
// band. Static lists, so there is no "last updated" line to render. Turning a
// group OFF weakens a block the user set for themselves, so each goes through
// the Guardian PIN gate exactly like the gore/shock and dating toggles.
// ===========================================================================

function setupGameBlocker(store) {
  setupCheckbox("ss-game-portals-toggle", "ssGamePortalsEnabled", store.ssGamePortalsEnabled, "Turn off Browser game portal blocking");
  setupCheckbox("ss-game-stores-toggle", "ssGameStoresEnabled", store.ssGameStoresEnabled, "Turn off Game download store blocking");
  setupCheckbox("ss-game-platforms-toggle", "ssGamePlatformsEnabled", store.ssGamePlatformsEnabled, "Turn off Game platform blocking");
  setupCheckbox("ss-game-streaming-toggle", "ssGameStreamingEnabled", store.ssGameStreamingEnabled, "Turn off Game streaming & esports blocking");
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
// Ad & Tracker Blocker (BETA) — two independent opt-in groups over the bundled
// domain list in data/tracker-domains.json: trackers (EasyPrivacy) and ad
// networks (EasyList). Separate because they carry different breakage risk — a
// user can take analytics blocking without ad blocking. Writes ssAdTrackerEnabled
// and ssAdNetworkEnabled;
// background/ad-tracker-blocker.js watches that key and rebuilds its own DNR
// band. A static list, so there is no "last updated" line to render — same as
// the gore/shock, dating and game tiers.
//
// Turning it OFF weakens protection the user set for themselves, so it goes
// through the Guardian PIN gate exactly like every other protection toggle.
// Turning it ON is free.
// ===========================================================================

// The six keys the one switch drives. Order is cosmetic; they are written
// together in a single storage.set so the six background modules react to one
// change event rather than six.
//
//   ssAdTrackerEnabled    tracker domains (EasyPrivacy)  → ad-tracker-blocker.js
//   ssAdNetworkEnabled    ad-network domains (EasyList)  → ad-tracker-blocker.js
//   ssYouTubeAdsEnabled   the MAIN-world scriptlet       → youtube-ads.js
//   ssFacebookAdsEnabled  the scripts and stylesheet     → facebook-ads.js
//   ssAntiAdblockEnabled  the detector answer + wall sweep → anti-adblock.js
//   ssAdSlotCollapseEnabled  hides the empty boxes left behind → ad-slot-collapse.js
//
// They stay separate keys on purpose. Each background module still watches only
// its own and knows nothing about the others, so merging the UI needed no
// migration, cannot half-apply, and can be split back into separate switches
// later by editing markup alone — which is also how a fifth mechanism was added
// here without touching any of the first four.
//
// NOT in this list, though it sits in the same section: ssFloatVideoEnabled.
// The floating-video un-sticker has its own card and its own switch, because it
// is not ad blocking — the player it moves is the site's own furniture, served
// from the site's own address, and someone may well want their ads blocked
// without their video players rearranged, or the other way round. Splitting it
// out cost exactly the markup this comment predicted it would.
const ADBLOCK_KEYS = [
  "ssAdTrackerEnabled",
  "ssAdNetworkEnabled",
  "ssYouTubeAdsEnabled",
  "ssFacebookAdsEnabled",
  "ssAntiAdblockEnabled",
  "ssAdSlotCollapseEnabled",
];

function setupAdTrackerBlocker(store) {
  const master = document.getElementById("adblock-master-toggle");

  // ON if ANY of them is on, rather than only when all of them are.
  //
  // That matters for a profile upgraded from the version that had four separate
  // switches, where two might be on and two off — and for every profile that
  // upgrades into a release adding a fifth key, which starts life false. Reading
  // "all of them" would show this as OFF while blocking was demonstrably still
  // happening, and a switch that says off while the feature is on is worse than
  // a switch that rounds up. The first time it is touched they are all written
  // together and the split state is gone.
  if (master) {
    master.checked = ADBLOCK_KEYS.some((k) => store[k]);
    master.addEventListener("change", async () => {
      // Turning it OFF weakens protection the user set for themselves, so it
      // goes through the Guardian PIN gate like every other protection toggle.
      // gateToggleOff waves through the ON direction itself, and reverts the
      // checkbox for us when the PIN is refused.
      if (!(await SieveGuardian.gateToggleOff(master, "Turn off ad & tracker blocking"))) return;
      const on = master.checked;
      const patch = {};
      for (const k of ADBLOCK_KEYS) patch[k] = on;
      chrome.storage.local.set(patch);
    });
  }

  // The blocked-request counters read declarativeNetRequest.getMatchedRules,
  // which Firefox keeps behind the extensions.dnr.feedback pref — so on Firefox
  // the two request rows in the Protection Dashboard never move. The blocking is
  // unaffected; only the tally is unreadable. Reveal the explanation rather than
  // leave someone reading a zero as a broken blocker.
  // (See the header of background/ad-tracker-stats.js.)
  const countNote = document.getElementById("ad-tracker-count-note");
  if (countNote && IS_FIREFOX) countNote.hidden = false;

  // Its own switch, its own key, and the Guardian gate on the way down like
  // every other protection toggle. Nothing about it is wired to the master
  // switch above.
  setupCheckbox(
    "float-video-toggle",
    "ssFloatVideoEnabled",
    store.ssFloatVideoEnabled,
    "Turn off floating-video un-sticking"
  );
}

// ===========================================================================
// Guardian Lock (self-lock PIN) — set / change / remove the PIN.
// ===========================================================================

// Any 4 or more characters. This deliberately accepts far more than digits.
//
// It used to be /^\d{4,}$/. A user explained why that was wrong: he writes his
// lock as sentences about the consequences of relapsing, keeps them on paper so
// they cannot be pasted, and has to read and retype the whole thing to get in.
// The typing is the point — it forces a pause to think. Sieve rejected it
// outright, and told him only that a PIN must be digits.
//
// Nothing downstream cared: the Guardian core hashes whatever string it is
// given (salt + value, SHA-256), so letters, spaces and punctuation have always
// worked once past this check.
const MIN_LOCK_LENGTH = 4;

function isValidPin(pin) {
  return typeof pin === "string" && pin.length >= MIN_LOCK_LENGTH;
}

// Access code settings. Only shown while a PIN is set, because the code is a
// second layer over the PIN rather than a lock of its own — offering it in
// Personal mode would promise protection it cannot give.
async function setupAccessCode() {
  const field = document.getElementById("access-code-field");
  const enabledEl = document.getElementById("access-code-enabled");
  const scopeEl = document.getElementById("access-code-scope-all");
  const lengthEl = document.getElementById("access-code-length");
  const optionsEl = document.getElementById("access-code-options");
  const statusEl = document.getElementById("access-code-status");
  const AC = window.SieveAccessCode;
  if (!field || !AC) return;

  async function render() {
    const pinSet = await SieveGuardian.isEnabled();
    field.hidden = !pinSet;
    if (!pinSet) return;
    const config = await AC.getConfig();
    enabledEl.checked = config.enabled;
    scopeEl.checked = config.scope === "all";
    lengthEl.value = String(config.length);
    // Reveal the sub-settings instead of disabling them. Greyed-out controls
    // that cannot be clicked and do not say why read as a broken page.
    if (optionsEl) optionsEl.hidden = !config.enabled;
    statusEl.textContent = config.enabled
      ? `On — ${config.length} characters, ${config.scope === "all" ? "on every change" : "decisive changes only"}.`
      : "Off — your PIN alone protects these settings. Turn it on to choose the length and when it is asked for.";
  }

  enabledEl.addEventListener("change", async () => {
    const config = await AC.getConfig();
    // Turning it ON tightens protection and is free. Turning it OFF removes a
    // deterrent, so it must survive the deterrent itself.
    if (config.enabled && !enabledEl.checked) {
      const ok = await SieveGuardian.confirmUnlock("Turn off the access code", { critical: true });
      if (!ok) {
        enabledEl.checked = true;
        return;
      }
    }
    await AC.setConfig({ ...config, enabled: enabledEl.checked });
    await render();
  });

  scopeEl.addEventListener("change", async () => {
    const config = await AC.getConfig();
    // Narrowing the scope means fewer moments guarded — gated. Widening is free.
    if (config.scope === "all" && !scopeEl.checked) {
      const ok = await SieveGuardian.confirmUnlock("Ask for the code less often", { critical: true });
      if (!ok) {
        scopeEl.checked = true;
        return;
      }
    }
    await AC.setConfig({ ...config, scope: scopeEl.checked ? "all" : "critical" });
    await render();
  });

  lengthEl.addEventListener("change", async () => {
    const config = await AC.getConfig();
    const next = AC.normalizeConfig({ length: Number(lengthEl.value) }).length;
    // A shorter code is a weaker deterrent, so shortening is gated.
    if (config.enabled && next < config.length) {
      const ok = await SieveGuardian.confirmUnlock("Shorten the access code", { critical: true });
      if (!ok) {
        lengthEl.value = String(config.length);
        return;
      }
    }
    await AC.setConfig({ ...config, length: next });
    await render();
  });

  // The panel only exists while a PIN does, so follow that flag rather than
  // reaching into setupGuardian's render. Setting or clearing the PIN in the
  // card above shows or hides this one without a reload.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.guardianPinHash) render();
  });

  await render();
  return render;
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
      setupError.textContent = "Use at least 4 characters — letters, numbers, spaces or whole sentences all work.";
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
      manageError.textContent = "Use at least 4 characters — letters, numbers, spaces or whole sentences all work.";
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
// Custom (user-added) sites also get a remove button; built-in ones don't.
function dsRenderSite(site, settings, minutesToday, allSettings, onRemove) {
  const row = dsEl("div", "ds-site");

  const head = dsEl("div", "ds-site-head");
  const nameLabel = dsEl("label", "ds-site-toggle");
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = settings.enabled;
  nameLabel.append(toggle, dsEl("span", "ds-site-name", site.name));
  head.append(nameLabel);
  head.append(dsEl("span", "ds-site-stat", `${minutesToday} min today`));
  if (onRemove) {
    const removeBtn = dsEl("button", "ds-site-remove", "✕");
    removeBtn.type = "button";
    removeBtn.title = `Stop tracking ${site.name}`;
    removeBtn.setAttribute("aria-label", `Stop tracking ${site.name}`);
    removeBtn.addEventListener("click", () => onRemove(site));
    head.append(removeBtn);
  }
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

// Today's total may be stored as { minutes, px } or, in older data, a number.
function dsMinutesToday(stats, siteId, today) {
  const entry = (stats[siteId] || {})[today];
  return entry && typeof entry === "object" ? entry.minutes || 0 : entry || 0;
}

// Drop everything a removed custom site left behind: its limit, its history and
// any "stopped for today" flag. Otherwise re-adding the same domain later would
// silently resurrect an old limit the user has long forgotten setting.
async function dsForgetSite(siteId) {
  const stored = await chrome.storage.local.get({
    doomscrollSites: {},
    doomscrollStats: {},
    doomscrollStoppedDates: {},
  });
  delete stored.doomscrollSites[siteId];
  delete stored.doomscrollStats[siteId];
  delete stored.doomscrollStoppedDates[siteId];
  await chrome.storage.local.set(stored);
}

// Load the tracked sites — built-in plus the user's own — render a row each,
// and show today's stats. The "Add your own site" field writes
// doomscrollCustomSites; the service worker watches that key and registers the
// tracker on the new domain, so nothing here has to think about injection.
async function setupDoomscroll(store) {
  const list = document.getElementById("ds-sites");
  const input = document.getElementById("ds-custom-input");
  const addBtn = document.getElementById("ds-custom-add");
  const errorEl = document.getElementById("ds-custom-error");

  const builtin = await SieveDoomscrollSites.loadBuiltin();

  // Per-site settings and today's stats come from the page's batched snapshot.
  const allSettings = store.doomscrollSites;
  const stats = store.doomscrollStats;
  const today = dsTodayStr();

  // Seeded from the page's batched snapshot, then kept in step with storage so a
  // second settings tab (or the removal below) is reflected without a reload.
  let customDomains = store.doomscrollCustomSites;

  async function remove(site) {
    // Un-tracking a site removes a limit → weakens protection → gate it.
    if (!(await SieveGuardian.confirmUnlock(`Stop tracking ${site.name}`))) return;
    customDomains = customDomains.filter(
      (d) => SieveDoomscrollSites.CUSTOM_PREFIX + d !== site.id
    );
    await chrome.storage.local.set({ doomscrollCustomSites: customDomains });
    await dsForgetSite(site.id);
    delete allSettings[site.id];
    delete stats[site.id];
    render();
  }

  function render() {
    const custom = customDomains.map(SieveDoomscrollSites.customConfig);
    list.textContent = "";
    for (const site of builtin) {
      const settings = { ...DS_SITE_DEFAULTS, ...(allSettings[site.id] || {}) };
      const minutes = dsMinutesToday(stats, site.id, today);
      list.append(dsRenderSite(site, settings, Math.round(minutes), allSettings));
    }
    for (const site of custom) {
      const settings = { ...DS_SITE_DEFAULTS, ...(allSettings[site.id] || {}) };
      const minutes = dsMinutesToday(stats, site.id, today);
      list.append(dsRenderSite(site, settings, Math.round(minutes), allSettings, remove));
    }
  }

  function add() {
    const domain = normalizeDomain(input.value || "");
    if (!isValidDomain(domain)) {
      errorEl.textContent = "Please enter a valid domain (e.g. example.com).";
      return;
    }
    // A built-in feed already has a row above, with its own limit. Adding it by
    // hand would make a second row that quietly competes with the first.
    const clash = SieveDoomscrollSites.findBuiltin(builtin, domain);
    if (clash) {
      errorEl.textContent = `${clash.name} is already in the list above.`;
      return;
    }
    if (customDomains.includes(domain)) {
      errorEl.textContent = `${domain} is already tracked.`;
      return;
    }
    errorEl.textContent = "";
    // Adding a site adds a limit — that strengthens protection, so it's free.
    customDomains = customDomains.concat([domain]).sort();
    chrome.storage.local.set({ doomscrollCustomSites: customDomains });
    input.value = "";
    render();
  }

  addBtn.addEventListener("click", add);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") add();
  });
  input.addEventListener("input", () => {
    errorEl.textContent = "";
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.doomscrollCustomSites) return;
    customDomains = changes.doomscrollCustomSites.newValue || [];
    render();
  });

  render();
}

// ===========================================================================
// Search Result Filter — hide or colour-code results on the search page.
//
// The rule list is the interesting part. uBlacklist, where users know this
// feature from, writes the colour into the rule text ("@1*://*.example.com/*")
// because its rules live in one textarea. Sieve's lists are real rows, so the
// colour is a dropdown on the row: same capability, nothing to mistype.
//
// Guardian follows the usual rule — a change that means you see MORE of what you
// asked to hide needs the PIN, everything else is free. So removing a "Hide"
// rule, or turning one into a highlight, is gated; adding rules and picking
// colours is not, because a colour is a preference, not a protection.
// ===========================================================================

// Full-strength colours; content/search-filter.js tints them for the background
// and uses them at full strength for the edge. Chosen to stay distinguishable
// against both a light and a dark results page.
const SF_DEFAULT_COLORS = ["#2ea043", "#3b82f6", "#f59e0b"];
const SF_HIDE = 0;

function sfEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function sfColorLabel(index) {
  return index === SF_HIDE ? "Hide" : `Colour ${index}`;
}

// A <select> can't paint its own options, so the swatch sits beside it and
// mirrors the choice. "Hide" gets no colour, which is the point of it.
function sfPaintSwatch(swatch, index, colors) {
  const isHide = index === SF_HIDE;
  swatch.style.background = isHide ? "transparent" : colors[index - 1] || "transparent";
  swatch.classList.toggle("is-hide", isHide);
}

function sfBuildSelect(colors, value) {
  const select = sfEl("select", "input sf-select");
  const options = [SF_HIDE, ...colors.map((_, i) => i + 1)];
  for (const index of options) {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = sfColorLabel(index);
    select.append(option);
  }
  // A rule pointing at a colour that has since gone falls back to Hide rather
  // than silently doing nothing.
  select.value = options.includes(value) ? String(value) : String(SF_HIDE);
  return select;
}

function setupSearchFilter(store) {
  const master = document.getElementById("search-filter-toggle");
  if (!master) return;
  const hideBlocked = document.getElementById("search-filter-hide-blocked-toggle");
  const paletteEl = document.getElementById("search-filter-palette");
  const paletteError = document.getElementById("search-filter-palette-error");
  const addColorBtn = document.getElementById("search-filter-add-color");
  const input = document.getElementById("search-filter-input");
  const addSelect = document.getElementById("search-filter-color");
  const addBtn = document.getElementById("search-filter-add");
  const errorEl = document.getElementById("search-filter-error");
  const listEl = document.getElementById("search-filter-list");

  let colors = store.searchFilterColors.length ? store.searchFilterColors.slice() : SF_DEFAULT_COLORS.slice();
  let rules = store.searchFilterRules.slice();

  const saveColors = () => chrome.storage.local.set({ searchFilterColors: colors });
  const saveRules = () => chrome.storage.local.set({ searchFilterRules: rules });

  // --- master switches ----------------------------------------------------

  master.checked = store.searchFilterEnabled;
  hideBlocked.checked = store.searchFilterHideBlocked;

  master.addEventListener("change", async () => {
    if (!(await SieveGuardian.gateToggleOff(master, "Turn off the Search Result Filter"))) return;
    chrome.runtime.sendMessage({ type: SET_MODULE_STATE, key: "searchFilterEnabled", enabled: master.checked });
  });
  hideBlocked.addEventListener("change", async () => {
    if (!(await SieveGuardian.gateToggleOff(hideBlocked, "Show blocked sites in search results again"))) return;
    chrome.runtime.sendMessage({ type: SET_MODULE_STATE, key: "searchFilterHideBlocked", enabled: hideBlocked.checked });
  });

  // --- palette ------------------------------------------------------------

  function renderPalette() {
    paletteEl.textContent = "";
    colors.forEach((value, i) => {
      const row = sfEl("div", "sf-color");
      row.append(sfEl("span", "sf-color-name", sfColorLabel(i + 1)));

      const picker = document.createElement("input");
      picker.type = "color";
      picker.className = "sf-color-input";
      picker.value = value;
      picker.setAttribute("aria-label", `${sfColorLabel(i + 1)} colour`);
      // "input" rather than "change" so the results page follows the picker live.
      picker.addEventListener("input", () => {
        colors[i] = picker.value;
        saveColors();
        renderRules(); // the row swatches use these colours
      });

      const removeBtn = sfEl("button", "remove", "✕");
      removeBtn.type = "button";
      removeBtn.title = `Remove ${sfColorLabel(i + 1)}`;
      removeBtn.setAttribute("aria-label", `Remove ${sfColorLabel(i + 1)}`);
      removeBtn.addEventListener("click", () => removeColor(i));

      row.append(picker, removeBtn);
      paletteEl.append(row);
    });
    if (!colors.length) paletteEl.append(sfEl("p", "empty", "No colours yet — every rule can only hide."));
    renderAddSelect();
  }

  // Removing a colour that rules still point at would quietly change what those
  // rules do, so it is refused with the count instead. Renumbering the survivors
  // would be worse: every rule below the gap would silently change colour.
  function removeColor(index) {
    const colorIndex = index + 1;
    const inUse = rules.filter((r) => r.color === colorIndex).length;
    if (inUse > 0) {
      paletteError.textContent =
        `${sfColorLabel(colorIndex)} is used by ${inUse} ${inUse === 1 ? "rule" : "rules"}. ` +
        `Change ${inUse === 1 ? "it" : "them"} first.`;
      return;
    }
    paletteError.textContent = "";
    colors.splice(index, 1);
    // Rules above the gap shift down with it, so they keep the colour they show.
    rules = rules.map((r) => (r.color > colorIndex ? { ...r, color: r.color - 1 } : r));
    saveColors();
    saveRules();
    renderPalette();
    renderRules();
  }

  addColorBtn.addEventListener("click", () => {
    paletteError.textContent = "";
    colors.push(SF_DEFAULT_COLORS[colors.length % SF_DEFAULT_COLORS.length]);
    saveColors();
    renderPalette();
  });

  // --- the "what to do" dropdown on the add row ---------------------------

  function renderAddSelect() {
    const previous = addSelect.value;
    addSelect.textContent = "";
    for (const index of [SF_HIDE, ...colors.map((_, i) => i + 1)]) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = sfColorLabel(index);
      addSelect.append(option);
    }
    if (previous && [...addSelect.options].some((o) => o.value === previous)) addSelect.value = previous;
  }

  // --- rules --------------------------------------------------------------

  function renderRules() {
    listEl.textContent = "";
    if (!rules.length) {
      listEl.append(sfEl("li", "empty", "Nothing added yet."));
      return;
    }
    rules.forEach((rule, i) => {
      const li = sfEl("li", "sf-rule");
      const swatch = sfEl("span", "sf-swatch");
      sfPaintSwatch(swatch, rule.color, colors);

      const pattern = sfEl("span", "sf-pattern", rule.pattern);

      const select = sfBuildSelect(colors, rule.color);
      select.setAttribute("aria-label", `What to do with ${rule.pattern}`);
      select.addEventListener("change", async () => {
        const next = Number(select.value);
        // Going from Hide to a colour means those results come back — that
        // weakens what the user set up, so it goes through the gate.
        if (rule.color === SF_HIDE && next !== SF_HIDE) {
          if (!(await SieveGuardian.confirmUnlock(`Stop hiding ${rule.pattern} in search results`))) {
            select.value = String(rule.color);
            return;
          }
        }
        rules[i] = { ...rule, color: next };
        saveRules();
        renderRules();
      });

      const removeBtn = sfEl("button", "remove", "✕");
      removeBtn.type = "button";
      removeBtn.title = `Remove ${rule.pattern}`;
      removeBtn.setAttribute("aria-label", `Remove ${rule.pattern}`);
      removeBtn.addEventListener("click", async () => {
        // Same reasoning: dropping a Hide rule puts those results back.
        if (rule.color === SF_HIDE) {
          if (!(await SieveGuardian.confirmUnlock(`Stop hiding ${rule.pattern} in search results`))) return;
        }
        rules = rules.filter((_, j) => j !== i);
        saveRules();
        renderRules();
      });

      li.append(swatch, pattern, select, removeBtn);
      listEl.append(li);
    });
  }

  function add() {
    const pattern = String(input.value || "").trim();
    const result = SieveSearchFilter.validate(pattern);
    if (!result.ok) {
      errorEl.textContent = result.error || "Please enter a site, a domain ending like .edu, or a /regex/.";
      return;
    }
    if (rules.some((r) => r.pattern.toLowerCase() === pattern.toLowerCase())) {
      errorEl.textContent = `${pattern} is already in the list.`;
      return;
    }
    errorEl.textContent = "";
    // Adding a rule is always free: hiding more is strengthening, and a colour
    // is a preference rather than a protection.
    rules = rules.concat([{ pattern, color: Number(addSelect.value) || SF_HIDE }]);
    saveRules();
    input.value = "";
    renderRules();
  }

  addBtn.addEventListener("click", add);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") add();
  });
  input.addEventListener("input", () => {
    errorEl.textContent = "";
  });

  // Keep a second settings tab (and the popup) in step.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.searchFilterColors) {
      colors = changes.searchFilterColors.newValue || [];
      renderPalette();
      renderRules();
    }
    if (changes.searchFilterRules) {
      rules = changes.searchFilterRules.newValue || [];
      renderRules();
    }
    if (changes.searchFilterEnabled) master.checked = !!changes.searchFilterEnabled.newValue;
    if (changes.searchFilterHideBlocked) hideBlocked.checked = !!changes.searchFilterHideBlocked.newValue;
  });

  // A first run has no stored palette; persist the default so the content
  // script and this page agree about what "Colour 1" means.
  if (!store.searchFilterColors.length) saveColors();

  renderPalette();
  renderRules();
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
      // Here rather than in "Ads & trackers", and the group comment below is
      // the reason: bars scale against the busiest row in their OWN section. A
      // page yields one or two floating players against thousands of blocked
      // requests, so sharing a section with the request counters would draw
      // this as a permanently empty bar.
      { key: "floatVideo", label: "Floating Videos Un-stuck" },
    ],
  },
  {
    // Its own section rather than rows inside "On-page protection", and not only
    // for tidiness: bars scale against the busiest row in their OWN section, and
    // a tier that stops thousands of requests a day would flatten every other bar
    // on the page to a sliver if it shared one.
    title: "Ads & trackers",
    rows: [
      { key: "adTrackers", label: "Tracking Requests" },
      { key: "adNetworks", label: "Ad-Network Requests" },
      { key: "youtubeAds", label: "YouTube Ads" },
      { key: "facebookAds", label: "Facebook Ads" },
      { key: "antiAdblock", label: "Adblock Walls Cleared" },
      { key: "adSlots", label: "Empty Ad Slots Hidden" },
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
      // All four Game Blocker groups roll up into one row (blocked.js maps every
      // games-* category to the single "games" stats key).
      { key: "games", label: "Game Sites", combine: ["games"] },
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
  games: '<line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z"/>',
  customBlocked: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  urlShortener: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  badLanguage: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  cookieAutoReject: '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
  adTrackers: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/>',
  adNetworks: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  youtubeAds: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
  facebookAds: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  antiAdblock: '<rect x="3" y="4" width="18" height="16" rx="1"/><line x1="3" y1="9.33" x2="21" y2="9.33"/><line x1="3" y1="14.67" x2="21" y2="14.67"/><line x1="9" y1="4" x2="9" y2="9.33"/><line x1="15" y1="9.33" x2="15" y2="14.67"/><line x1="9" y1="14.67" x2="9" y2="20"/>',
  adSlots: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 3"/><line x1="9" y1="15" x2="15" y2="9"/><line x1="9" y1="9" x2="15" y2="15"/>',
  floatVideo: '<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="12" width="8" height="6" rx="1"/><line x1="12" y1="18" x2="20" y2="12"/>',
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

// Usage Insights — the report is a few hundred lines of chart drawing, so it
// lives in options/usage-insights.js and is imported on demand rather than
// parsed on every page load. A failure to load leaves the settings card usable
// and only costs the report below it.
async function setupUsageSection(store) {
  if (!document.getElementById("section-usage")) return;
  try {
    const mod = await import("./usage-insights.js");
    await mod.setupUsageInsights(store);
  } catch (err) {
    console.error("[Sieve] could not load the Usage Insights report", err);
    const report = document.getElementById("usage-report");
    if (report) {
      report.hidden = false;
      report.textContent = "";
      const note = document.createElement("div");
      note.className = "dashboard-empty";
      note.textContent = "Unable to load the screen-time report.";
      report.append(note);
    }
  }
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

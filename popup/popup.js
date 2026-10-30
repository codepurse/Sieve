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

  setupReceipt();
  setupDarkPatterns();
  setupToxicHider();
  setupPopupHijack();

  // The status stamp and the top under it, kept live.
  setupTop();
  updateStatusBanner();
  updateTop();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && MODULE_KEYS.some((k) => changes[k])) updateStatusBanner();
    if (area === "local" && TOP_KEYS.some((k) => changes[k])) updateTop();
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
  // Search Result Filter (opt-in, default off) — settings page only, like the
  // other opt-ins above; counted here so the banner reflects it.
  searchFilterEnabled: false,
  // Game Blocker (opt-in, default off) — four independent groups
  ssGamePortalsEnabled: false,
  ssGameStoresEnabled: false,
  ssGamePlatformsEnabled: false,
  ssGameStreamingEnabled: false,
  // AI Blocker (opt-in, default off) — three independent groups
  ssAiChatbotsEnabled: false,
  ssAiWritingEnabled: false,
  ssAiCompanionsEnabled: false,
};
const MODULE_KEYS = Object.keys(MODULE_DEFAULTS);

function fillVersion() {
  const el = document.getElementById("version");
  if (el) el.textContent = "v" + chrome.runtime.getManifest().version;
}

// The status, as a stamp in the top bar: green with the count when anything
// is on, and in words under it when nothing is.
async function updateStatusBanner() {
  const el = document.getElementById("status");
  if (!el) return;
  const title = document.getElementById("status-title");
  const off = document.getElementById("status-off");
  const stored = await chrome.storage.local.get({ ...MODULE_DEFAULTS });
  const active = MODULE_KEYS.filter((k) => stored[k]).length;
  if (active === 0) {
    title.textContent = "Off";
    el.className = "status-stamp disabled";
    el.setAttribute("aria-label", "Protection is off. Every filter is switched off.");
    if (off) off.hidden = false;
  } else {
    // No "of N" denominator: most protections are opt-in by design, so a
    // fraction would misread deliberate opt-outs as gaps. Show just the count.
    const filters = `${active} filter${active === 1 ? "" : "s"}`;
    title.textContent = `On · ${filters}`;
    el.className = "status-stamp enabled";
    el.setAttribute("aria-label", `Protection is on. ${filters} running.`);
    if (off) off.hidden = true;
  }
}

// Under the top bar: a running seal (free, common/seal.js). With Sieve Pro,
// tonight (pro/coach.js): where the hardest hours stand against the clock,
// the plan for them and what tends to help, then the seal and the streaks as
// stamps and a way to Your progress (saying so when last month's letter is
// waiting). Without Pro, until dismissed, a word about what Pro would show
// here. In an open-source build the Pro files are empty stand-ins, nothing is
// for sale, and there is only the seal.
const PRO_HINT_KEY = "popupProHintHidden";
const TOP_KEYS = [
  "proLicence",
  "proSeal",
  "proHabits",
  "habitAttempts",
  "proMonthSeen",
  "sieveAttempts",
  "proPlans",
  "proTries",
  PRO_HINT_KEY,
];
const DAY_MS = 24 * 60 * 60 * 1000;
// Stamps are short: the habits by one word.
const HABIT_SHORT = {
  gambling: "Gambling",
  dating: "Dating",
  custom: "Blocked sites",
  games: "Games",
  ai: "AI tools",
  trading: "Trading",
};

// The month just ended, as "2026-10", and its name, while its letter is new:
// the first week of the next month, if the attempt record began before it
// ended and the letter has not been opened.
async function waitingLetter(now) {
  const d = new Date(now);
  if (d.getDate() > 7) return null;
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const stored = await chrome.storage.local.get(["proMonthSeen", "sieveAttempts"]);
  const since = stored.sieveAttempts && stored.sieveAttempts.since;
  const thisMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  if (stored.proMonthSeen === key || !Number.isFinite(since) || since >= thisMonth) return null;
  return prev.toLocaleDateString([], { month: "long" });
}

function openProgress(hash) {
  chrome.tabs.create({ url: chrome.runtime.getURL(`pages/progress.html${hash || ""}`) });
  window.close();
}

function topEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The seal's days as holes, gone ones filled and a ring round today; a seal
// longer than a month as a thin bar.
function drawSealDays(host, seal, now) {
  host.textContent = "";
  const total = Math.max(1, Math.round((seal.until - seal.startedAt) / DAY_MS));
  const gone = Math.min(total, Math.max(0, Math.floor((now - seal.startedAt) / DAY_MS)));
  if (total > 31) {
    const bar = topEl("span", "bar");
    const fill = topEl("span");
    fill.style.width = `${Math.round((gone / total) * 100)}%`;
    bar.appendChild(fill);
    host.appendChild(bar);
    return;
  }
  for (let i = 0; i < total; i++) {
    host.appendChild(topEl("i", i < gone ? "hole is-done" : i === gone ? "hole is-now" : "hole"));
  }
}

// Twenty-four hours round now, an hour a cell. With `day` (from pro/coach.js
// tonight()): the hours gone, now, and the hardest two, hatched where they
// really come and only outlined on days they don't. The strip reaches far
// enough ahead to hold the next ones, so hours that start after midnight are
// drawn after now, not back at the start of today. Without `day`, empty.
const HOUR_MS = 60 * 60 * 1000;
function drawDay(host, day) {
  host.textContent = "";
  const hours = topEl("div", "day-hours");
  if (!day) {
    for (let i = 0; i < 24; i++) hours.appendChild(topEl("i", "day-h"));
    host.appendChild(hours);
    return;
  }
  const I = window.SieveInsights;
  // Hours shown after now: the next ones' end, between 4 and 14 hours away.
  const toEnd = day.next ? Math.ceil((day.next + 2 * HOUR_MS - day.at) / HOUR_MS) : 4;
  const ahead = Math.min(14, Math.max(4, toEnd));
  const nowIndex = 23 - ahead;
  const thisHour = new Date(day.at);
  thisHour.setMinutes(0, 0, 0);
  const first = thisHour.getTime() - nowIndex * HOUR_MS;
  const scale = topEl("div", "day-scale");
  const LABELS = { 0: "12a", 6: "6a", 12: "12p", 18: "6p" };
  for (let i = 0; i < 24; i++) {
    const t = first + i * HOUR_MS;
    const h = new Date(t).getHours();
    const into = (((h - day.start) % 24) + 24) % 24;
    let cls = "day-h";
    if (i === nowIndex) cls += " is-now";
    else if (into < 2) cls += day.days.includes(I.weekdayOf(t - into * HOUR_MS)) ? " is-hard is-due" : " is-hard";
    else if (i < nowIndex) cls += " is-past";
    hours.appendChild(topEl("i", cls));
    if (LABELS[h] && i < 22) {
      const label = topEl("span", "", LABELS[h]);
      label.style.left = `${(i / 24) * 100}%`;
      scale.appendChild(label);
    }
  }
  const now = topEl("span", "day-now", "now");
  now.style.left = `${((nowIndex + new Date(day.at).getMinutes() / 60 + 0.5) / 24) * 100}%`;
  const hard = topEl("span", "day-hard", `Hard · ${I.hourLabel(day.start)}–${I.hourLabel(day.start + 2)}`);
  host.append(now, hours, scale, hard);
}

async function updateTop() {
  const top = document.getElementById("top");
  if (!top) return;
  const P = window.SievePro;
  const S = window.SieveSeal;
  const ST = window.SieveStreaks;
  const C = window.SieveCoach;
  const A = window.SieveAttempts;
  const now = Date.now();
  const sealBox = document.getElementById("seal");
  const tonightBox = document.getElementById("tonight");
  const hintBox = document.getElementById("pro-hint");
  let sealed = null;
  let pro = false;

  try {
    if (S) {
      const seal = await S.check(now);
      if (seal.sealed) sealed = seal;
    }

    if (P && ST && (await P.isPro(now))) {
      pro = true;
      const stamps = document.getElementById("tonight-stamps");
      stamps.textContent = "";
      if (sealed) stamps.appendChild(topEl("span", "stamp", `Sealed → ${S.formatDay(sealed.until)}`));
      let kept = "";
      for (const row of (await ST.summary(now)).slice(0, 3)) {
        const days = row.days === 0 ? "from today" : ST.daysLabel(row.days);
        stamps.appendChild(topEl("span", "stamp", `${HABIT_SHORT[row.id] || row.label} · ${days}`));
        if (!kept && row.keptLabel) {
          kept = `About ${row.keptLabel} kept`;
          if (row.goalProgress) {
            kept += row.goalProgress.reached
              ? `, enough for ${row.goal.name}`
              : ` · ${Math.floor(row.goalProgress.share * 100)}% of the way to ${row.goal.name}`;
          }
        }
      }
      const keptEl = document.getElementById("tonight-kept");
      keptEl.textContent = kept;
      keptEl.hidden = !kept;

      // Tonight, from what Sieve Pro reads in the attempt record.
      const said = C && A ? await readTonight(C, A, now) : null;
      document.getElementById("tonight-when").hidden = !said;
      document.getElementById("tonight-title").hidden = !said;
      const dayEl = document.getElementById("tonight-day");
      const planEl = document.getElementById("tonight-plan");
      const worksEl = document.getElementById("tonight-works");
      dayEl.hidden = !(said && said.day);
      planEl.hidden = !(said && said.plan);
      worksEl.hidden = !(said && said.works);
      if (said) {
        document.getElementById("tonight-when").textContent = said.when;
        document.getElementById("tonight-title").textContent = said.title;
        if (said.day) drawDay(dayEl, said.day);
        if (said.plan) {
          document.getElementById("tonight-plan-label").textContent = said.planLabel;
          document.getElementById("tonight-if").textContent = said.plan.if;
          document.getElementById("tonight-then").textContent = said.plan.then;
        }
        if (said.works) worksEl.textContent = said.works;
      }

      const month = await waitingLetter(now);
      const link = document.getElementById("tonight-progress");
      link.textContent = month ? `Your ${month} letter is ready →` : "Your progress →";
      link.dataset.hash = month ? "#month" : "";
    }
  } catch (err) {
    console.warn("[Sieve] popup: could not read the seal, streaks or tonight:", err);
  }

  // With Pro the seal is one of the stamps; without, it has the top to itself.
  sealBox.hidden = pro || !sealed;
  if (sealed && !pro) {
    const left = Math.max(1, Math.ceil((sealed.until - now) / DAY_MS));
    document.getElementById("seal-until").textContent = `Until ${S.formatDay(sealed.until)}`;
    document.getElementById("seal-days").textContent = left === 1 ? "1 day" : `${left} days`;
    drawSealDays(document.getElementById("seal-holes"), sealed, now);
  }
  tonightBox.hidden = !pro;

  // The hint: only where this build carries Pro, Pro is on sale, and it is
  // not already on, until dismissed.
  let hint = false;
  const carried = Array.isArray(window.SieveProFeatures) && window.SieveProFeatures.length > 0;
  if (!pro && carried && P && P.isConfigured()) {
    try {
      hint = !(await chrome.storage.local.get(PRO_HINT_KEY))[PRO_HINT_KEY];
    } catch {
      hint = false;
    }
  }
  hintBox.hidden = !hint;
  if (hint) drawDay(document.getElementById("pro-hint-day"), null);

  top.hidden = sealBox.hidden && tonightBox.hidden && hintBox.hidden;
}

async function readTonight(C, A, now) {
  const stored = await chrome.storage.local.get([A.KEY, C.PLANS_KEY, C.TRIES_KEY]);
  return C.tonight(A.normalize(stored[A.KEY]), stored[C.PLANS_KEY], stored[C.TRIES_KEY], now);
}

function setupTop() {
  document.getElementById("tonight-progress").addEventListener("click", (event) => {
    openProgress(event.currentTarget.dataset.hash || "");
  });
  document.getElementById("pro-hint-open").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html#section-pro") });
    window.close();
  });
  document.getElementById("pro-hint-close").addEventListener("click", () => {
    document.getElementById("pro-hint").hidden = true;
    chrome.storage.local.set({ [PRO_HINT_KEY]: true }).catch(() => {});
  });
}

// Name the site the bottom block acts on, so "this page" means something.
function showSiteHost(host) {
  const el = document.getElementById("site-host");
  if (!el) return;
  el.textContent = host ? host.replace(/^www\./, "") : "";
  el.hidden = !host;
}

// ===========================================================================
// On this page — what the page tried, and what Sieve did about each thing.
// The Dark Pattern Blocker's content script (content/dark-patterns.js) keeps
// the list of findings for its page; this asks for it, and sends "Show me" and
// "Undo" back. The bar of three holes beside each one is the intervention
// ladder: one filled for a label, two for a fix, three for a cover.
// ===========================================================================

const CONFIDENCE_WORDS = { high: "sure", medium: "likely", low: "unsure" };
// Proven first. Sorted by how sure Sieve is, not by what it did, so an item
// does not jump down the list when its Undo is pressed.
const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 };
// Beyond this many, the rest wait behind "Show N more", so the switches below
// stay in reach without the list scrolling inside a popup that scrolls.
const RECEIPT_SHOWN = 3;

let receiptTabId = null;
let receiptShown = ""; // the last report drawn, so a refresh that changes nothing draws nothing
let receiptExpanded = false;
let receiptReport = null;

async function sendToPage(message) {
  if (receiptTabId == null) return null;
  try {
    return await chrome.tabs.sendMessage(receiptTabId, message, { frameId: 0 });
  } catch {
    return null; // no content script here: chrome:// pages, the web store, PDFs
  }
}

function receiptButton(text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "link-btn";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function tellItem(t) {
  const li = document.createElement("li");
  li.className = "tell" + (t.undone ? " is-undone" : "");

  const meter = document.createElement("span");
  meter.className = "tell-meter";
  meter.dataset.level = String(Math.max(0, t.level));
  meter.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) meter.appendChild(document.createElement("i"));

  const main = document.createElement("div");
  main.className = "tell-main";

  const title = document.createElement("span");
  title.className = "tell-title";
  title.textContent = t.title;

  const detail = document.createElement("span");
  detail.className = "tell-detail";
  detail.textContent = t.detail;

  const foot = document.createElement("div");
  foot.className = "tell-foot";
  const done = document.createElement("span");
  done.className = "tell-done";
  done.textContent = t.trick ? `${t.done} · ${CONFIDENCE_WORDS[t.confidence] || ""}` : t.done;
  foot.appendChild(done);

  foot.appendChild(
    receiptButton("Show me", async () => {
      const result = await sendToPage({ type: "sieve:tells-show", id: t.id });
      if (result && result.ok) window.close(); // out of the way, so the ring can be seen
    })
  );
  if (t.canUndo) {
    foot.appendChild(
      receiptButton(t.undone ? "Redo" : "Undo", async () => {
        const report = await sendToPage({ type: t.undone ? "sieve:tells-redo" : "sieve:tells-undo", id: t.id });
        if (report) renderReceipt(report);
      })
    );
  }
  // The finding's own buttons, e.g. a free trial's "Remind me on Tue, Oct 13".
  for (const action of t.actions || []) {
    const button = receiptButton(action.label, async () => {
      button.disabled = true;
      const report = await sendToPage({ type: "sieve:tells-action", id: t.id, action: action.id });
      if (report) renderReceipt(report);
      refreshReminders();
    });
    button.disabled = !!action.disabled;
    foot.appendChild(button);
  }

  main.append(title, detail, foot);
  li.append(meter, main);
  return li;
}

function renderReceipt(report, force) {
  const key = JSON.stringify(report);
  if (key === receiptShown && !force) return;
  receiptShown = key;
  receiptReport = report;

  const empty = document.getElementById("receipt-empty");
  const count = document.getElementById("receipt-count");
  const list = document.getElementById("receipt-list");
  const more = document.getElementById("receipt-more");
  const watchTitle = document.getElementById("receipt-watch-title");
  const watch = document.getElementById("receipt-watch");
  list.textContent = "";
  watch.textContent = "";

  const tells = report && Array.isArray(report.tells) ? report.tells : [];
  const tricks = tells
    .filter((t) => t.trick)
    .sort((a, b) => (CONFIDENCE_RANK[a.confidence] ?? 3) - (CONFIDENCE_RANK[b.confidence] ?? 3));
  const watching = tells.filter((t) => !t.trick);

  const shown = receiptExpanded ? tricks : tricks.slice(0, RECEIPT_SHOWN);
  for (const t of shown) list.appendChild(tellItem(t));
  for (const t of watching) watch.appendChild(tellItem(t));

  const hiddenCount = tricks.length - shown.length;
  more.hidden = tricks.length <= RECEIPT_SHOWN;
  more.textContent = hiddenCount > 0 ? `Show ${hiddenCount} more` : "Show fewer";

  list.hidden = tricks.length === 0;
  watch.hidden = watchTitle.hidden = watching.length === 0;
  count.hidden = tricks.length === 0;
  count.textContent = `${tricks.length} trick${tricks.length === 1 ? "" : "s"}`;

  empty.hidden = tricks.length > 0;
  if (!report) empty.textContent = "Sieve can't read this page.";
  else if (!report.enabled && tells.length === 0) empty.textContent = "The Dark Pattern Blocker is off.";
  else empty.textContent = "No tricks spotted on this page.";

  updateDarkPatternsCount(report ? tricks.length : 0);
}

async function refreshReceipt() {
  renderReceipt(await sendToPage({ type: "sieve:tells-list" }));
}

// ===========================================================================
// Free-trial reminders — the ones you set, from any site, each with Cancel.
// Kept by the service worker (background/trial-reminders.js); this only lists
// them. The section stays hidden until there is one.
// ===========================================================================

function reminderDay(ms) {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

async function refreshReminders() {
  let list = [];
  try {
    const reply = await chrome.runtime.sendMessage({ type: "sieve:trial-list" });
    list = Array.isArray(reply) ? reply : [];
  } catch {
    list = [];
  }
  const section = document.getElementById("reminders");
  const ol = document.getElementById("reminder-list");
  ol.textContent = "";
  section.hidden = list.length === 0;

  for (const r of list) {
    const li = document.createElement("li");
    li.className = "reminder";
    const info = document.createElement("div");
    info.className = "reminder-info";
    const host = document.createElement("span");
    host.className = "reminder-host";
    host.textContent = r.host;
    const when = document.createElement("span");
    when.className = "reminder-when";
    when.textContent =
      `Trial ends ${reminderDay(r.ends)} · reminder ${reminderDay(r.remindAt)}` + (r.terms ? ` · then ${r.terms}` : "");
    info.append(host, when);
    const cancel = receiptButton("Cancel", async () => {
      cancel.disabled = true;
      try {
        await chrome.runtime.sendMessage({ type: "sieve:trial-cancel", id: r.id });
      } catch {
        /* the list is redrawn either way */
      }
      refreshReminders();
    });
    li.append(info, cancel);
    ol.appendChild(li);
  }
}

async function setupReceipt() {
  refreshReminders();
  document.getElementById("receipt-more").addEventListener("click", () => {
    receiptExpanded = !receiptExpanded;
    renderReceipt(receiptReport, true);
  });
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    receiptTabId = tab?.id ?? null;
  } catch {
    receiptTabId = null;
  }
  await refreshReceipt();
  // Some findings wait on the Claim Ledger, so a popup opened the moment a page
  // loads can arrive before they do. Ask once more.
  setTimeout(refreshReceipt, 1200);
}

// ===========================================================================
// Dark Pattern Blocker (Module 3A) — master toggle; its per-page count comes
// from the receipt above. The per-type sub-toggles and the strictness setting
// live on the options page (options/options.js).
// ===========================================================================

function updateDarkPatternsCount(tricks) {
  const el = document.getElementById("dark-patterns-count");
  el.textContent =
    tricks === 0 ? "No tricks on this page" : `Caught ${tricks} trick${tricks === 1 ? "" : "s"} on this page`;
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
      const all = (await chrome.webNavigation.getAllFrames({ tabId: tab.id })) || [];
      // Only the frames that can actually be running the hider. The content
      // script is registered on four hosts; every other frame on the page — and
      // an ad-heavy page has dozens — would just be a message that finds no
      // listener and comes back as a lastError we discard. Asking the four
      // that might answer is the same result for a fraction of the traffic.
      const CAN_HOST_HIDER = /(^|\.)(youtube\.com|reddit\.com|twitter\.com|x\.com|disqus\.com)$/;
      const relevant = all.filter((f) => {
        if (f.frameId === 0) return true; // the top frame always gets asked
        try {
          return CAN_HOST_HIDER.test(new URL(f.url).hostname);
        } catch {
          return false; // about:blank, data:, a frame with no usable URL
        }
      });
      if (relevant.length) frames = relevant;
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
      const url = tab.url ? new URL(tab.url) : null;
      phHost = url && /^https?:$/.test(url.protocol) ? url.hostname : null;
    } catch {
      phHost = null;
    }
    showSiteHost(phHost);
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

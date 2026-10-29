// common/attempts.js
// Sieve — the attempt record: when the block page stopped a site from a list
// someone chose to block for themselves.
//
// The block page already counts blocks per day for the dashboard
// (common/stats.js). This keeps the moments themselves, a time and the kind of
// site, because "when" is the one thing a daily count throws away and the one
// someone trying to stop most wants to know: Friday nights after eleven, the
// evening after payday. Sieve Pro reads it (when it's hardest, your month and
// your year); nothing that blocks does.
//
// Only habits are recorded: the kinds of site a person turns on to stop
// themselves (gambling, dating, their own blocked sites, games, AI tools,
// trading). Threats, such as scam sites, malware and phishing, are not urges
// and never appear here.
//
// It is written for everyone, Pro or not, on this device, next to the daily
// counts, so someone who buys Pro later sees the months before. Nothing is
// sent anywhere.
//
// Storage, chrome.storage.local:
//   sieveAttempts  { v: 1, since: <ms>, a: [[<ms>, <category>], ...] }  oldest first
//
// One urge often reaches the block page more than once: a reload, a second
// try, a site that hops through two of its own domains. A repeat of the same
// category within MERGE_MS of the last one is the same attempt, not a new one.
// The record keeps KEEP_DAYS (a year and a little, so a whole year can be
// told) and at most MAX entries.
//
// The service worker writes it (installListener), so two block pages opening
// at once cannot lose one another's entry; pages only read it.

(() => {
  "use strict";

  const root = typeof self !== "undefined" ? self : globalThis;
  if (root.SieveAttempts) return;

  const KEY = "sieveAttempts";
  const MESSAGE = "SIEVE_RECORD_ATTEMPT";
  const DAY = 24 * 60 * 60 * 1000;
  const MERGE_MS = 5 * 60 * 1000;
  const KEEP_DAYS = 400;
  const MAX = 6000;

  // The block page's ?category= values that are habits. pro/streaks.js groups
  // them into the habits a person tracks.
  const CATEGORIES = [
    "gambling",
    "prediction-markets",
    "dating",
    "custom-blocked",
    "games-portals",
    "games-stores",
    "games-platforms",
    "games-streaming",
    "ai-chatbots",
    "ai-writing",
    "ai-companions",
    "trading",
  ];

  function normalize(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const list = Array.isArray(src.a) ? src.a : [];
    const a = list
      .filter(
        (e) =>
          Array.isArray(e) &&
          Number.isFinite(e[0]) &&
          e[0] > 0 &&
          typeof e[1] === "string" &&
          CATEGORIES.includes(e[1]),
      )
      .map((e) => [Math.floor(e[0]), e[1]])
      .sort((x, y) => x[0] - y[0]);
    let since = Number.isFinite(src.since) && src.since > 0 ? Math.floor(src.since) : null;
    if (a.length && (since === null || a[0][0] < since)) since = a[0][0];
    return { v: 1, since, a };
  }

  // The record with this attempt in it, pruned to the window. `added` is false
  // for a category that is not a habit and for a repeat inside MERGE_MS.
  function add(raw, category, now = Date.now()) {
    const record = normalize(raw);
    const cutoff = now - KEEP_DAYS * DAY;
    record.a = record.a.filter((e) => e[0] >= cutoff && e[0] <= now);
    if (record.since === null) record.since = now;
    if (!CATEGORIES.includes(category)) return { record, added: false };
    for (let i = record.a.length - 1; i >= 0; i--) {
      if (now - record.a[i][0] >= MERGE_MS) break;
      if (record.a[i][1] === category) return { record, added: false };
    }
    record.a.push([now, category]);
    if (record.a.length > MAX) record.a = record.a.slice(record.a.length - MAX);
    return { record, added: true };
  }

  // The attempts between two moments, optionally only some categories.
  function between(record, from, to, categories) {
    const want = Array.isArray(categories) ? categories : null;
    return normalize(record).a.filter(
      (e) => e[0] >= from && e[0] < to && (!want || want.includes(e[1])),
    );
  }

  async function get() {
    const stored = await chrome.storage.local.get(KEY);
    return normalize(stored[KEY]);
  }

  // Writes queue behind one another in the one context that writes.
  let writing = Promise.resolve();

  function record(category, now = Date.now()) {
    const run = writing.then(async () => {
      const stored = await chrome.storage.local.get(KEY);
      const before = normalize(stored[KEY]);
      const { record: next, added } = add(before, category, now);
      // The worker wakes often; a wake that changes nothing writes nothing.
      if (added || next.since !== before.since || next.a.length !== before.a.length) {
        await chrome.storage.local.set({ [KEY]: next });
      }
      return added;
    });
    writing = run.catch(() => {});
    return run;
  }

  // Called once by the service worker. Only the block page sends the message.
  // The record starts counting now if it has never started, so a month that
  // passes without one attempt can still be told as a clear month.
  function installListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || message.type !== MESSAGE) return false;
      const page = chrome.runtime.getURL("pages/blocked.html");
      if (!sender || typeof sender.url !== "string" || !sender.url.startsWith(page)) return false;
      record(message.category)
        .then((added) => sendResponse({ ok: true, added }))
        .catch((err) => {
          console.warn("[Sieve] could not record the attempt:", err);
          sendResponse({ ok: false });
        });
      return true;
    });
    record(null).catch(() => {});
  }

  root.SieveAttempts = {
    KEY,
    MESSAGE,
    MERGE_MS,
    KEEP_DAYS,
    MAX,
    CATEGORIES,
    normalize,
    add,
    between,
    get,
    record,
    installListener,
  };
})();

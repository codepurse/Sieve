// common/stats.js
// Sieve — shared stats store (Step 1 / Protection Dashboard).
// ONE central API that every module uses to record blocks/hides.
//
// Storage layout in chrome.storage.local:
//   {
//     "sieveStats": {
//       "2026-07-03": { "gambling": 3, "toxicComments": 12, ... },
//       "2026-07-02": { ... },
//       ...
//     }
//   }
//
// Both "today" and "this week" are computed from the same daily data;
// no separate weekly counter is needed.

const STATS_KEY = "sieveStats";

// Local date as "YYYY-MM-DD".
function localDateStr(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Serialize read-modify-write operations on the stats store so concurrent
// updates from multiple content scripts do not lose increments.
let statsWriteChain = Promise.resolve();

function enqueueStatsWrite(fn) {
  statsWriteChain = statsWriteChain.then(fn).catch((err) => {
    console.error("[Sieve Stats] stats write failed:", err);
    throw err;
  });
  return statsWriteChain;
}

async function readAllStats() {
  const stored = await chrome.storage.local.get({ [STATS_KEY]: {} });
  return stored[STATS_KEY];
}

async function writeAllStats(stats) {
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

// ---------------------------------------------------------------------------
// Write buffering.
//
// Every recorded block used to be a read-modify-write of the WHOLE stats object
// — thirty days of daily buckets — straight to disk-backed storage. That is
// expensive three times over: chrome.storage.local is on disk, the write keeps
// the service worker awake, and it fires storage.onChanged in every listener
// that has access, which is roughly 700 of them across a handful of open tabs
// (nine per top frame, three per subframe, seventeen in this worker). A Reddit
// thread collapsing two hundred comments did all of that two hundred times.
//
// So increments land in memory and are flushed on a timer. The dashboard is a
// number people look at occasionally; it does not need to be durable to the
// second. What it must not do is lose a count when the worker is torn down,
// which is what flushNow() on suspend is for.
//
// The buffer is keyed by date as well as category so a flush that straddles
// local midnight still credits each increment to the day it happened on.
const FLUSH_DELAY_MS = 5000;
const pendingCounts = new Map(); // "YYYY-MM-DD" -> Map(category -> count)
let flushTimer = null;
// Kept so callers that want a running total still get a sensible answer without
// waiting for the flush.
const optimisticTotals = new Map(); // "date\0category" -> count

function bufferIncrement(date, category, count) {
  let day = pendingCounts.get(date);
  if (!day) {
    day = new Map();
    pendingCounts.set(date, day);
  }
  day.set(category, (day.get(category) || 0) + count);
}

/** Write everything buffered so far. Safe to call when there is nothing to do. */
export function flushStatsNow() {
  if (pendingCounts.size === 0) return statsWriteChain;
  const batch = new Map(pendingCounts);
  pendingCounts.clear();
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  return enqueueStatsWrite(async () => {
    const stats = await readAllStats();
    for (const [date, byCategory] of batch) {
      const dayStats = stats[date] || {};
      for (const [category, count] of byCategory) {
        dayStats[category] = (dayStats[category] || 0) + count;
      }
      stats[date] = dayStats;
    }
    await writeAllStats(stats);
    // The optimistic mirror has served its purpose for this batch.
    for (const [date, byCategory] of batch) {
      for (const category of byCategory.keys()) optimisticTotals.delete(date + "\0" + category);
    }
  });
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushStatsNow();
  }, FLUSH_DELAY_MS);
}

/**
 * Record a block/hide event for today.
 *
 * Buffered: the returned total is this worker's own running count, and the
 * write it implies lands within FLUSH_DELAY_MS (or immediately, on suspend).
 *
 * @param {string} category - module category key (e.g. "gambling", "toxicComments")
 * @param {number} [count=1] - how many items were blocked/hidden
 * @returns {Promise<number>} the new total for this category today
 */
export async function recordBlock(category, count = 1) {
  if (!category || typeof category !== "string") {
    console.warn("[Sieve Stats] recordBlock requires a non-empty category string");
    return 0;
  }

  count = Number(count);
  if (!Number.isFinite(count) || count <= 0) {
    console.warn("[Sieve Stats] recordBlock count must be a positive finite number, got:", count);
    return 0;
  }

  const today = localDateStr();
  bufferIncrement(today, category, count);
  scheduleFlush();

  // A best-effort running total for the caller, without forcing a read.
  const key = today + "\0" + category;
  let total = optimisticTotals.get(key);
  if (total === undefined) {
    const stats = await readAllStats();
    total = (stats[today] || {})[category] || 0;
    // Everything buffered for this key is already counted in `total` only if it
    // was written; add back what is still pending.
    const pendingForKey = (pendingCounts.get(today) || new Map()).get(category) || 0;
    total += pendingForKey;
  } else {
    total += count;
  }
  optimisticTotals.set(key, total);
  return total;
}

/**
 * Read stats for a period.
 * @param {"today"|"week"} period
 * @returns {Promise<Record<string, number>>} category -> count
 */
export async function getStats(period) {
  const stats = await readAllStats();

  // Merge in anything still sitting in the write buffer, so a dashboard opened
  // between flushes shows the same number as one opened just after. Merging
  // rather than forcing a flush keeps reading the stats free of writes.
  const dayOf = (date) => {
    const stored = stats[date] || {};
    const pending = pendingCounts.get(date);
    if (!pending) return stored;
    const merged = { ...stored };
    for (const [cat, n] of pending) merged[cat] = (merged[cat] || 0) + n;
    return merged;
  };

  if (period === "today") {
    return { ...dayOf(localDateStr()) };
  }

  if (period === "week") {
    const combined = {};
    const now = new Date();
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      for (const [cat, n] of Object.entries(dayOf(localDateStr(d)))) {
        combined[cat] = (combined[cat] || 0) + n;
      }
    }
    return combined;
  }

  throw new Error(`[Sieve Stats] unknown period: ${period}. Use "today" or "week".`);
}

/**
 * Install the runtime message listener so non-module contexts (content scripts)
 * can record blocks via:
 *   chrome.runtime.sendMessage({ type: "SIEVE_RECORD_BLOCK", category, count })
 * Call once in the service worker / background context.
 */
export function installStatsListener() {
  if (!chrome.runtime?.onMessage) {
    console.warn("[Sieve Stats] installStatsListener called outside an extension runtime");
    return;
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === "SIEVE_RECORD_BLOCK") {
      recordBlock(message.category, message.count)
        .then((newTotal) => sendResponse({ ok: true, newTotal }))
        .catch((err) => {
          console.error("[Sieve Stats] recordBlock failed:", err);
          sendResponse({ ok: false, error: String(err) });
        });
      return true; // async response
    }
    return false;
  });

  // The buffer lives in worker memory, so it has to reach disk before the
  // worker is torn down. onSuspend is the browser's warning that this is about
  // to happen; without this, up to five seconds of counts would be lost every
  // time the worker went idle.
  chrome.runtime.onSuspend?.addListener(() => {
    flushStatsNow();
  });
}

const STATS_MIDNIGHT_ALARM = "sieveStatsMidnight";
const STATS_RETENTION_DAYS = 30;

// Timestamp of the next local midnight.
function nextMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

// Remove daily buckets older than the retention window. Weekly rollups only
// need 7 days; we keep 30 so prior-day data survives midnight cleanly and
// leaves headroom for future features.
async function pruneOldStats() {
  // Land the buffer first, or a prune would read stats that do not yet include
  // the pending counts and write back a version missing them.
  await flushStatsNow();
  const stats = await readAllStats();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STATS_RETENTION_DAYS);
  const cutoffStr = localDateStr(cutoff);
  const pruned = {};
  for (const [date, dayStats] of Object.entries(stats)) {
    if (date >= cutoffStr) pruned[date] = dayStats;
  }
  await writeAllStats(pruned);
}

async function handleStatsMidnightAlarm() {
  await pruneOldStats();
  scheduleStatsMidnightAlarm();
}

/**
 * Schedule the daily stats alarm for the next local midnight.
 * Call on service worker startup/install, consistent with Sieve's existing
 * doomscroll reset pattern.
 */
export function scheduleStatsMidnightAlarm() {
  if (!chrome.alarms?.create) {
    console.warn("[Sieve Stats] chrome.alarms unavailable — cannot schedule midnight alarm");
    return;
  }
  const when = nextMidnight();
  chrome.alarms.create(STATS_MIDNIGHT_ALARM, { when });
}

/**
 * Install the alarm listener so the daily pruning + rescheduling happens.
 * Call once in the service worker / background context.
 */
export function installStatsAlarmHandler() {
  if (!chrome.alarms?.onAlarm) {
    console.warn("[Sieve Stats] installStatsAlarmHandler called outside an extension runtime");
    return;
  }
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === STATS_MIDNIGHT_ALARM) {
      handleStatsMidnightAlarm().catch((err) => {
        console.error("[Sieve Stats] midnight alarm handler failed:", err);
      });
    }
  });
}

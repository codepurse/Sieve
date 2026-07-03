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

/**
 * Record a block/hide event for today.
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

  return enqueueStatsWrite(async () => {
    const stats = await readAllStats();
    const dayStats = stats[today] || {};
    dayStats[category] = (dayStats[category] || 0) + count;
    stats[today] = dayStats;
    await writeAllStats(stats);
    return dayStats[category];
  });
}

/**
 * Read stats for a period.
 * @param {"today"|"week"} period
 * @returns {Promise<Record<string, number>>} category -> count
 */
export async function getStats(period) {
  const stats = await readAllStats();

  if (period === "today") {
    return { ...(stats[localDateStr()] || {}) };
  }

  if (period === "week") {
    const combined = {};
    const now = new Date();
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      const key = localDateStr(d);
      const dayStats = stats[key] || {};
      for (const [cat, n] of Object.entries(dayStats)) {
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

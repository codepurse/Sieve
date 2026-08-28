// common/usage-store.js
// Sieve — Usage Insights store (screen time).
//
// This is the ONLY module that touches the usage data, so the on-disk shape and
// the day/hour bookkeeping live in one place. It mirrors common/stats.js: daily
// buckets in chrome.storage.local, one serialized write chain, a retention
// window pruned at midnight.
//
// Storage layout in chrome.storage.local:
//   {
//     "sieveUsage": {
//       "2026-08-27": {
//         t: 4521000,                             // total active ms that day
//         d: { "youtube.com": 1200000, ... },     // active ms per domain
//         h: [0, 0, ..., 812000, ...]             // active ms per local hour (24)
//       },
//       ...
//     }
//   }
//
// Durations are whole milliseconds so repeated small additions never drift the
// way accumulating fractional minutes does. Everything is derived from these
// daily buckets: today, this week, the per-hour rhythm and the per-site split
// all come out of the same rows, so no total can disagree with another.

export const USAGE_KEY = "sieveUsage";
export const USAGE_ENABLED_KEY = "usageEnabled";
export const USAGE_RETENTION_KEY = "usageRetentionDays";

export const DEFAULT_RETENTION_DAYS = 30;
export const RETENTION_CHOICES = [7, 30, 90];

// A day's domain map is capped so heavy tab-hopping (or a page that redirects
// through many hosts) cannot grow one row without bound. The smallest entries
// past the cap fold into a single bucket, which keeps the day total honest
// while dropping only detail nobody reads.
const MAX_DOMAINS_PER_DAY = 250;
export const OTHER_BUCKET = "other"; // safe as a key: real hostnames contain a dot

// Spans shorter than this are noise — a tab flicked past on the way somewhere
// else. Dropping them keeps the site list meaningful.
const MIN_SPAN_MS = 1000;

// --- date helpers ---------------------------------------------------------

/** Local date as "YYYY-MM-DD" — the bucket key, same format stats.js uses. */
export function localDateStr(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" bucket key back into a local Date at midnight. */
export function parseDateStr(str) {
  const [y, m, d] = String(str).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function emptyDay() {
  return { t: 0, d: {}, h: new Array(24).fill(0) };
}

// Tolerate a partially-written or older row rather than throwing on read.
function normalizeDay(raw) {
  const day = emptyDay();
  if (!raw || typeof raw !== "object") return day;
  day.t = Number(raw.t) || 0;
  if (raw.d && typeof raw.d === "object") {
    for (const [domain, ms] of Object.entries(raw.d)) {
      const n = Number(ms);
      if (Number.isFinite(n) && n > 0) day.d[domain] = n;
    }
  }
  if (Array.isArray(raw.h)) {
    for (let i = 0; i < 24; i++) day.h[i] = Number(raw.h[i]) || 0;
  }
  return day;
}

// --- serialized read-modify-write ----------------------------------------
// The tracker flushes whenever the active site changes, so two flushes can
// overlap; chaining them means no increment is ever read-then-overwritten.

let usageWriteChain = Promise.resolve();

function enqueueUsageWrite(fn) {
  usageWriteChain = usageWriteChain.then(fn).catch((err) => {
    console.error("[Sieve Usage] write failed:", err);
    throw err;
  });
  return usageWriteChain;
}

async function readAll() {
  const stored = await chrome.storage.local.get({ [USAGE_KEY]: {} });
  const raw = stored[USAGE_KEY];
  return raw && typeof raw === "object" ? raw : {};
}

async function writeAll(usage) {
  await chrome.storage.local.set({ [USAGE_KEY]: usage });
}

// --- writing -------------------------------------------------------------

/**
 * Split one span of attention across the local hour (and therefore day)
 * boundaries it crosses, so an evening that runs past midnight lands in both
 * days and the per-hour rhythm stays truthful.
 * @returns {Array<{date: string, hour: number, ms: number}>}
 */
export function splitSpan(startTs, endTs) {
  const out = [];
  let cursor = startTs;
  // Guard against a clock that moved backwards mid-span.
  if (!(endTs > cursor)) return out;

  while (cursor < endTs) {
    const at = new Date(cursor);
    // Next wall-clock hour. Date normalizes hour 24 into the following day, and
    // does it in local time, so DST shifts land where the clock says they do.
    const nextHour = new Date(
      at.getFullYear(), at.getMonth(), at.getDate(), at.getHours() + 1, 0, 0, 0
    ).getTime();
    const sliceEnd = Math.min(endTs, nextHour);
    out.push({ date: localDateStr(at), hour: at.getHours(), ms: sliceEnd - cursor });
    cursor = sliceEnd;
  }
  return out;
}

// Fold the smallest domains into OTHER_BUCKET once a day has too many keys.
function capDomains(day) {
  const keys = Object.keys(day.d);
  if (keys.length <= MAX_DOMAINS_PER_DAY) return;

  const ranked = keys
    .filter((k) => k !== OTHER_BUCKET)
    .sort((a, b) => day.d[b] - day.d[a]);
  // Keep the busiest, minus one slot for the bucket itself.
  const keep = new Set(ranked.slice(0, MAX_DOMAINS_PER_DAY - 1));
  let folded = day.d[OTHER_BUCKET] || 0;
  for (const key of ranked) {
    if (keep.has(key)) continue;
    folded += day.d[key];
    delete day.d[key];
  }
  if (folded > 0) day.d[OTHER_BUCKET] = folded;
}

/**
 * Record attention spans.
 * @param {Array<{domain: string, startTs: number, endTs: number}>} spans
 * @returns {Promise<void>}
 */
export async function addSpans(spans) {
  const usable = (spans || []).filter(
    (s) => s && s.domain && s.endTs - s.startTs >= MIN_SPAN_MS
  );
  if (usable.length === 0) return;

  return enqueueUsageWrite(async () => {
    const usage = await readAll();
    const touched = new Set();

    for (const span of usable) {
      for (const slice of splitSpan(span.startTs, span.endTs)) {
        if (slice.ms <= 0) continue;
        const day = normalizeDay(usage[slice.date]);
        day.t += slice.ms;
        day.h[slice.hour] += slice.ms;
        day.d[span.domain] = (day.d[span.domain] || 0) + slice.ms;
        usage[slice.date] = day;
        touched.add(slice.date);
      }
    }

    for (const date of touched) capDomains(usage[date]);
    await writeAll(usage);
  });
}

// --- reading -------------------------------------------------------------

/**
 * The last `days` days ending today, oldest first, with missing days filled in
 * as zeroes. A chart needs the gaps as much as the data — a quiet Sunday is a
 * point on the line, not an absent one.
 * @param {number} days
 * @returns {Promise<Array<{date: string, total: number, domains: Record<string, number>, hours: number[]}>>}
 */
export async function getUsageDays(days = 7) {
  const usage = await readAll();
  const out = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key = localDateStr(d);
    const day = normalizeDay(usage[key]);
    out.push({ date: key, total: day.t, domains: day.d, hours: day.h });
  }
  return out;
}

/** Merge a set of day rows into one total / domain map / 24-hour array. */
export function mergeDays(rows) {
  const merged = { total: 0, domains: {}, hours: new Array(24).fill(0) };
  for (const row of rows || []) {
    merged.total += row.total;
    for (const [domain, ms] of Object.entries(row.domains)) {
      merged.domains[domain] = (merged.domains[domain] || 0) + ms;
    }
    for (let i = 0; i < 24; i++) merged.hours[i] += row.hours[i];
  }
  return merged;
}

/** Domains sorted busiest-first. */
export function rankDomains(domains, limit = Infinity) {
  const ranked = Object.entries(domains)
    .map(([domain, ms]) => ({ domain, ms }))
    .sort((a, b) => b.ms - a.ms || a.domain.localeCompare(b.domain));
  return limit === Infinity ? ranked : ranked.slice(0, limit);
}

// --- maintenance ---------------------------------------------------------

/** Drop buckets older than the retention window. */
export async function pruneUsage(retentionDays = DEFAULT_RETENTION_DAYS) {
  const keepDays = RETENTION_CHOICES.includes(retentionDays)
    ? retentionDays
    : DEFAULT_RETENTION_DAYS;

  return enqueueUsageWrite(async () => {
    const usage = await readAll();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (keepDays - 1)); // keepDays including today
    const cutoffStr = localDateStr(cutoff);
    let dropped = 0;
    for (const date of Object.keys(usage)) {
      // Bucket keys are zero-padded, so a string compare is a date compare.
      if (date < cutoffStr) {
        delete usage[date];
        dropped++;
      }
    }
    if (dropped > 0) await writeAll(usage);
  });
}

/** Forget everything. Wired to the Clear history button. */
export async function clearUsage() {
  return enqueueUsageWrite(async () => {
    await chrome.storage.local.remove(USAGE_KEY);
  });
}

/** Rough on-disk size of the history, for the settings page footnote. */
export async function getUsageFootprint() {
  const usage = await readAll();
  const dates = Object.keys(usage);
  return { days: dates.length, bytes: JSON.stringify(usage).length };
}

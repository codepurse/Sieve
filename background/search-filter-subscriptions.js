// background/search-filter-subscriptions.js
// Sieve — subscribed lists for the Search Result Filter.
// The refresh logic is ported from BlockNSFW's ruleset subscriptions.
//
// A subscription is a URL the user chose, holding a list someone else keeps —
// uBlacklist's rulesets are what people bring, and their own lists on GitHub.
// Each list has one action, Hide or a highlight colour, and applies to search
// results only, as uBlacklist's do. Lists can only hide: common/ruleset.js
// never produces an allow rule, so a file someone else edits can never bring a
// result back that the user's own rules hid.
//
// Storage is split so the settings page never carries the lists themselves:
//   searchFilterSubscriptions   [{ id, url, name, color, enabled, counts, status }]
//   searchFilterSub:<id>        { hosts: packed string, patterns: [...] }
// The content script reads the metadata, then only the enabled lists' data, on
// results pages only. That read is why the total is capped: it happens on every
// results page, and a few megabytes is where it stops being free.
//
// Refreshing is once a day, from an hourly alarm, with BlockNSFW's manners: a
// conditional request so an unchanged list costs a 304, an hour's backoff after
// a failure, a server's Retry-After honoured, and "Update now" answered from
// what is stored when it was pressed moments ago.

// keyword-pattern.js FIRST: ruleset.js looks for KeywordPattern as it loads,
// and without it a downloaded regex would skip the checks that refuse one that
// could hang a page. The service worker imports it too, but only after this.
import "../common/keyword-pattern.js";
import "../common/host-index.js";
import "../common/ruleset.js";

const META_KEY = "searchFilterSubscriptions";
const DATA_PREFIX = "searchFilterSub:";
const MESSAGE_TYPE = "SIEVE_SF_SUBS";
const ALARM = "searchFilterSubscriptionsRefresh";

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SUBSCRIPTIONS = 20;
// Sites across every list, because a results page reads them all back. Sized
// by the list people actually ask for: Super SEO Spam Suppressor is ~416,000
// sites, 6.7 MB packed, and measured at about 50 ms to read back from storage
// and 20 ms to index (October 2026), while the results page is still loading.
const MAX_TOTAL_HOSTS = 600000;
const RETRY_BACKOFF_MS = 60 * 60 * 1000;
const MANUAL_REFRESH_GAP_MS = 5 * 60 * 1000;
const MANUAL_RETRY_GAP_MS = 60 * 1000;

const dataKey = (id) => DATA_PREFIX + id;

class FetchError extends Error {
  constructor(message, { status = 0, retryAfterMs = 0 } = {}) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

// --- storage ------------------------------------------------------------------

async function getSubscriptions() {
  const { [META_KEY]: list } = await chrome.storage.local.get({ [META_KEY]: [] });
  return Array.isArray(list) ? list : [];
}

// Every write to the metadata goes through here, one at a time. A refresh holds
// its copy across a download that can take seconds; without this, a remove or
// a change made meanwhile was overwritten when the refresh saved.
let mutation = Promise.resolve();
function mutateSubscriptions(mutate) {
  const run = mutation.then(async () => {
    const list = await getSubscriptions();
    const result = await mutate(list);
    await chrome.storage.local.set({ [META_KEY]: list });
    return result;
  });
  mutation = run.catch(() => {});
  return run;
}

// Derived from the URL, so subscribing twice is caught and a re-subscribe
// reuses the id. FNV-1a, because two long URLs can share any prefix.
function subscriptionId(url) {
  let hash = 0x811c9dc5;
  const text = String(url || "").trim().toLowerCase();
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return "sub_" + hash.toString(16).padStart(8, "0");
}

// "raw.githubusercontent.com · spam.txt" until the list names itself.
function defaultName(url) {
  try {
    const u = new URL(url);
    const file = u.pathname.split("/").filter(Boolean).pop();
    return file ? `${u.hostname} · ${decodeURIComponent(file)}` : u.hostname;
  } catch (_) {
    return String(url).slice(0, 80);
  }
}

// --- downloading --------------------------------------------------------------

function retryAfterMs(response) {
  const value = response.headers.get("Retry-After");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : 0;
}

function describeDownloadFailure(status) {
  if (status === 429 || status === 503) return `The list's server is busy or limiting downloads (${status})`;
  if (status === 404 || status === 410) return `Nothing was found at that address (${status})`;
  return `Download failed (${status})`;
}

function tooLargeError() {
  const megabytes = Math.round(self.SieveRuleset.MAX_FILE_BYTES / (1024 * 1024));
  return new FetchError(`That list is larger than ${megabytes} MB, the most Sieve can follow`);
}

// The body as text, refused as soon as it passes the limit rather than read in
// full and measured afterwards.
async function readCappedText(response, maxBytes) {
  const declared = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLargeError();
  if (!response.body || typeof response.body.getReader !== "function") {
    const text = await response.text();
    if (text.length > maxBytes) throw tooLargeError();
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      try {
        await reader.cancel();
      } catch (_) {}
      throw tooLargeError();
    }
    parts.push(decoder.decode(value, { stream: true }));
  }
  parts.push(decoder.decode());
  return parts.join("");
}

async function fetchRuleset(url, validators = {}) {
  if (!self.SieveRuleset.isHttpUrl(url)) throw new FetchError("Only http(s) addresses can be subscribed to");
  const headers = {};
  if (validators.etag) headers["If-None-Match"] = validators.etag;
  if (validators.lastModified) headers["If-Modified-Since"] = validators.lastModified;

  let response;
  try {
    // no-store keeps the HTTP cache out, so a 304 reaches this code.
    response = await fetch(url, { cache: "no-store", redirect: "follow", headers, credentials: "omit" });
  } catch (_) {
    throw new FetchError("Could not reach the list's server");
  }
  const etag = response.headers.get("ETag") || "";
  const lastModified = response.headers.get("Last-Modified") || "";
  if (response.status === 304) return { notModified: true, etag, lastModified };
  if (!response.ok) {
    throw new FetchError(describeDownloadFailure(response.status), {
      status: response.status,
      retryAfterMs: retryAfterMs(response),
    });
  }
  const text = await readCappedText(response, self.SieveRuleset.MAX_FILE_BYTES);
  const parsed = self.SieveRuleset.parseRuleset(text);
  if (parsed.hosts.length + parsed.patterns.length === 0) throw new FetchError(whyNothing(text, parsed));
  return { notModified: false, parsed, etag, lastModified };
}

// A list that yields nothing, explained by what it was. Each of these turned
// up among real "rulesets": allowlists, a one-line "every site" rule, and the
// commonest mistake of all, the GitHub page instead of its raw file.
function whyNothing(text, parsed) {
  if (/^\s*</.test(text)) return "That address is a web page, not a list. Use the link to the raw file";
  if (parsed.allowSkipped > 0) return "That list holds only allow rules, and a subscribed list can only hide results";
  if (parsed.skipped > 0) return "Nothing in that list is a rule Sieve can use";
  return "No rules found at that address";
}

// uBlacklist's ruleset directory links to ublacklist.github.io/rulesets/subscribe
// ?url=<the list>, and that is what people copy. The list is the url parameter.
function unwrapSubscribeLink(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "ublacklist.github.io" && u.pathname.replace(/\/$/, "") === "/rulesets/subscribe") {
      const inner = u.searchParams.get("url");
      if (inner && self.SieveRuleset.isHttpUrl(inner)) return inner.trim();
    }
  } catch (_) {}
  return url;
}

// --- refreshing ---------------------------------------------------------------

// Why this refresh should not download now, or "" if it should.
//   add        always: the user is watching the box.
//   manual     "Update now". Waits out a Retry-After, and answers from storage
//              if the list was checked in the last few minutes.
//   scheduled  the daily check. Backs off for an hour after a failure.
function refreshWait(sub, mode, now) {
  if (mode === "add") return "";
  if (sub.retryAfterAt && now < sub.retryAfterAt) return "rate-limited";
  if (mode === "manual") {
    const last = Math.max(sub.checkedAt || 0, sub.lastErrorAt || 0);
    const gap = sub.error ? MANUAL_RETRY_GAP_MS : MANUAL_REFRESH_GAP_MS;
    return last && now - last < gap ? "recent" : "";
  }
  if (sub.error && sub.lastErrorAt && now - sub.lastErrorAt < RETRY_BACKOFF_MS) return "backoff";
  return sub.updatedAt && now - sub.updatedAt <= TTL_MS ? "fresh" : "";
}

async function recordFailure(id, error) {
  const message = (error && error.message) || "Update failed";
  return mutateSubscriptions((list) => {
    const current = list.find((s) => s && s.id === id);
    if (!current) return { ok: false, error: message };
    const now = Date.now();
    Object.assign(current, { error: message, lastErrorAt: now, checkedAt: now });
    // A server that says it is overloaded is left alone for as long as it asks,
    // or ten minutes; capped at a day so a bad header cannot stop a list.
    const status = error && error.status;
    current.retryAfterAt =
      status === 429 || status === 503
        ? now + Math.min(Math.max(error.retryAfterMs || 10 * 60 * 1000, 60 * 1000), TTL_MS)
        : 0;
    return { ok: false, error: message };
  });
}

async function runRefresh(id, mode) {
  const sub = (await getSubscriptions()).find((s) => s && s.id === id);
  if (!sub) return { ok: false, error: "Subscription not found" };
  const wait = refreshWait(sub, mode, Date.now());
  if (wait) return { ok: !sub.error, reason: wait, error: sub.error || "" };

  // Ask "has it changed?" only when there is something stored to keep.
  const validators = sub.updatedAt ? { etag: sub.etag || "", lastModified: sub.lastModified || "" } : {};
  let fetched;
  try {
    fetched = await fetchRuleset(sub.url, validators);
  } catch (error) {
    return recordFailure(id, error);
  }

  if (fetched.notModified) {
    return mutateSubscriptions((list) => {
      const current = list.find((s) => s && s.id === id);
      if (!current) return { ok: false, error: "Subscription not found" };
      const now = Date.now();
      Object.assign(current, {
        updatedAt: now,
        checkedAt: now,
        etag: fetched.etag || current.etag || "",
        lastModified: fetched.lastModified || current.lastModified || "",
        error: "",
        retryAfterAt: 0,
      });
      return { ok: true, changed: false };
    });
  }

  const { parsed } = fetched;
  try {
    return await mutateSubscriptions(async (list) => {
      const current = list.find((s) => s && s.id === id);
      if (!current) return { ok: false, error: "Subscription not found" }; // removed mid-download
      const others = list.reduce((sum, s) => (s && s.id !== id ? sum + (s.hostCount || 0) : sum), 0);
      if (others + parsed.hosts.length > MAX_TOTAL_HOSTS) {
        throw new FetchError(
          `Together with your other lists that is more than ${MAX_TOTAL_HOSTS.toLocaleString("en-US")} sites, ` +
            "the most Sieve reads on a results page"
        );
      }
      await chrome.storage.local.set({
        [dataKey(id)]: { hosts: self.SieveHostIndex.packHosts(parsed.hosts), patterns: parsed.patterns },
      });
      const now = Date.now();
      Object.assign(current, {
        name: current.customName || parsed.name || current.name,
        homepage: parsed.homepage || "",
        hostCount: parsed.hosts.length,
        patternCount: parsed.patterns.length,
        skipped: parsed.skipped,
        truncated: !!parsed.truncated,
        updatedAt: now,
        checkedAt: now,
        etag: fetched.etag,
        lastModified: fetched.lastModified,
        error: "",
        retryAfterAt: 0,
      });
      return { ok: true, changed: true };
    });
  } catch (error) {
    return recordFailure(id, error);
  }
}

// One download per list at a time: a second request waits for the first.
const inFlight = new Map();
function refreshSubscription(id, mode = "scheduled") {
  const running = inFlight.get(id);
  if (running) return running;
  const job = runRefresh(id, mode).finally(() => inFlight.delete(id));
  inFlight.set(id, job);
  return job;
}

async function refreshAll(mode = "scheduled") {
  const results = [];
  for (const sub of await getSubscriptions()) {
    if (sub && sub.enabled !== false) results.push(await refreshSubscription(sub.id, mode));
  }
  return results;
}

// --- changes from the settings page -------------------------------------------

async function addSubscription(url, color) {
  const trimmed = unwrapSubscribeLink(String(url || "").trim());
  if (!self.SieveRuleset.isHttpUrl(trimmed)) return { ok: false, error: "Enter a full http:// or https:// address" };
  const id = subscriptionId(trimmed);
  const refusal = await mutateSubscriptions((list) => {
    if (list.length >= MAX_SUBSCRIPTIONS) return `You can follow up to ${MAX_SUBSCRIPTIONS} lists`;
    if (list.some((s) => s && s.id === id)) return "You already follow that list";
    list.push({
      id,
      url: trimmed,
      name: defaultName(trimmed),
      customName: "",
      color: Number(color) || 0,
      enabled: true,
      addedAt: Date.now(),
      updatedAt: 0,
      hostCount: 0,
      patternCount: 0,
      skipped: 0,
      error: "",
    });
    return "";
  });
  if (refusal) return { ok: false, error: refusal };

  // Fetched at once: this is where a wrong address is reported, while the user
  // is still looking at the box. A list that fails here is not kept.
  const result = await refreshSubscription(id, "add");
  if (!result.ok) {
    await removeSubscription(id);
    return { ok: false, error: result.error || "Could not read that list" };
  }
  return { ok: true, id };
}

async function removeSubscription(id) {
  await mutateSubscriptions((list) => {
    const index = list.findIndex((s) => s && s.id === id);
    if (index !== -1) list.splice(index, 1);
  });
  await chrome.storage.local.remove(dataKey(id));
  return { ok: true };
}

async function updateSubscription(id, changes) {
  const found = await mutateSubscriptions((list) => {
    const sub = list.find((s) => s && s.id === id);
    if (!sub) return false;
    if (changes && "enabled" in changes) sub.enabled = !!changes.enabled;
    if (changes && "color" in changes) sub.color = Number(changes.color) || 0;
    return true;
  });
  return found ? { ok: true } : { ok: false, error: "Subscription not found" };
}

async function handleMessage(message) {
  switch (message.action) {
    case "add":
      return addSubscription(message.url, message.color);
    case "remove":
      return removeSubscription(message.id);
    case "update":
      return updateSubscription(message.id, message.changes);
    case "refresh":
      return refreshSubscription(message.id, "manual");
    case "refreshAll":
      return { ok: true, results: await refreshAll("manual") };
    default:
      return { ok: false, error: "Unknown action" };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== MESSAGE_TYPE) return false;
  // Only Sieve's own pages may change subscriptions; a content script's sender
  // carries a tab, and the settings page's does not come from a website.
  if (sender && sender.id !== chrome.runtime.id) return false;
  if (sender && sender.tab && sender.url && !sender.url.startsWith(chrome.runtime.getURL(""))) return false;
  handleMessage(message).then(sendResponse, (error) => sendResponse({ ok: false, error: String(error && error.message) }));
  return true;
});

// An hourly alarm runs the daily check; refreshWait() decides which lists are
// actually due, so most wakes cost one storage read.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) refreshAll("scheduled");
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 60 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 60 });
  refreshAll("scheduled");
});

export {
  META_KEY,
  DATA_PREFIX,
  MESSAGE_TYPE,
  MAX_SUBSCRIPTIONS,
  MAX_TOTAL_HOSTS,
  subscriptionId,
  refreshWait,
  addSubscription,
  removeSubscription,
  updateSubscription,
  refreshSubscription,
  refreshAll,
};

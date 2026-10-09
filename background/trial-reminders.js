// background/trial-reminders.js
// Sieve — free-trial reminders: the ones you asked for, and nothing else.
//
// content/patterns/trials.js offers "Remind me on Tue, Oct 13" beside a free
// trial that will start charging by itself. Pressing it lands here. The
// reminder is kept in chrome.storage.local and shown, when it falls due, at
// the top of whatever page you are on — so it needs no account, no email and
// no notification permission, and works the same in every browser Sieve runs
// in.
//
// WHAT IS KEPT: the site's name (the page's host — taken from the browser, not
// from the message), the day the trial ends, the day to remind you, and the
// price the page gave. Only when you ask. A reminder is deleted when you mark
// it done or cancel it, and on its own a few days after the trial has ended.
// Nothing is kept from a private window: asking there is refused.
//
// THE CHEAP CHECK. Every page asks whether a reminder is due, so the earliest
// due time is also written to a key of its own (trialRemindersNext). A page
// reads that one number and, almost always, stops there.

const KEY = "trialReminders";
const NEXT_KEY = "trialRemindersNext";
const MAX_REMINDERS = 50;
const DAY_MS = 24 * 3600 * 1000;
const KEEP_AFTER_END_MS = 3 * DAY_MS;
const SNOOZE_MS = DAY_MS;

// Read-modify-write on one key, from several tabs at once: one at a time.
let chain = Promise.resolve();
function serialize(work) {
  const run = chain.then(work, work);
  chain = run.catch(() => {});
  return run;
}

export function prune(list, now) {
  return list.filter((r) => r && typeof r.ends === "number" && r.ends + KEEP_AFTER_END_MS > now);
}

export function nextDue(list) {
  let next = 0;
  for (const r of list) if (!next || r.remindAt < next) next = r.remindAt;
  return next;
}

async function load(now) {
  const stored = await chrome.storage.local.get({ [KEY]: [] });
  return prune(Array.isArray(stored[KEY]) ? stored[KEY] : [], now);
}

async function save(list) {
  await chrome.storage.local.set({ [KEY]: list, [NEXT_KEY]: nextDue(list) });
}

// The page a message came from, or null: a top frame showing a web page, in
// a normal window.
function senderHost(sender) {
  if (!sender || sender.frameId !== 0 || !sender.url || !sender.tab || sender.tab.incognito) return null;
  try {
    const url = new URL(sender.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function fromExtensionPage(sender) {
  return !!sender && typeof sender.url === "string" && sender.url.startsWith(chrome.runtime.getURL(""));
}

export function addReminder(list, host, message, now) {
  const ends = Number(message.ends);
  const remindAt = Number(message.remindAt);
  if (!Number.isFinite(ends) || !Number.isFinite(remindAt)) return null;
  if (ends <= now || ends - now > 400 * DAY_MS || remindAt > ends) return null;
  const terms = typeof message.terms === "string" ? message.terms.slice(0, 60) : "";
  const reminder = { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, host, ends, remindAt, terms, made: now };
  // One per site: asking again replaces the last one.
  const next = list.filter((r) => r.host !== host).concat(reminder);
  next.sort((a, b) => a.remindAt - b.remindAt);
  return next.slice(-MAX_REMINDERS);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string" || !message.type.startsWith("sieve:trial-")) return false;
  const now = Date.now();

  if (message.type === "sieve:trial-remind") {
    const host = senderHost(sender);
    if (!host) {
      sendResponse({ ok: false });
      return false;
    }
    serialize(async () => {
      const list = addReminder(await load(now), host, message, now);
      if (!list) return { ok: false };
      await save(list);
      return { ok: true };
    }).then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }

  // A page asking what is due. Not shown in a private window.
  if (message.type === "sieve:trial-due") {
    if (!senderHost(sender)) {
      sendResponse([]);
      return false;
    }
    serialize(async () => {
      const list = await load(now);
      const due = list.filter((r) => r.remindAt <= now);
      // Nothing due after all — the one that was has expired. Rewrite the
      // cheap key, or every page would go on asking.
      if (due.length === 0) await save(list);
      return due;
    }).then(sendResponse, () => sendResponse([]));
    return true;
  }

  // Done, snoozed or cancelled: from the reminder banner on a page, or from
  // the toolbar popup.
  if (message.type === "sieve:trial-done" || message.type === "sieve:trial-snooze" || message.type === "sieve:trial-cancel") {
    if (!senderHost(sender) && !fromExtensionPage(sender)) {
      sendResponse({ ok: false });
      return false;
    }
    serialize(async () => {
      let list = await load(now);
      if (message.type === "sieve:trial-snooze") {
        // "Remind me tomorrow" by default; closing the banner asks for a few
        // hours. Never past the end of the trial, which is when it matters.
        const hours = Math.min(48, Math.max(1, Number(message.hours) || SNOOZE_MS / 3600000));
        list = list.map((r) => (r.id === message.id ? { ...r, remindAt: Math.min(now + hours * 3600000, r.ends) } : r));
      } else {
        list = list.filter((r) => r.id !== message.id);
      }
      await save(list);
      return { ok: true };
    }).then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }

  // The toolbar popup's list.
  if (message.type === "sieve:trial-list") {
    if (!fromExtensionPage(sender)) {
      sendResponse([]);
      return false;
    }
    // In line behind any write, so a list asked for the moment a reminder is
    // set includes it.
    serialize(() => load(now)).then(sendResponse, () => sendResponse([]));
    return true;
  }

  return false;
});

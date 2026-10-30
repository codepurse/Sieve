// background/heads-up.js
// Sieve — the heads-up before someone's hardest hours: a notification at a
// time this device already worked out, and nothing else.
//
// Sieve Pro (pro/coach.js) reads when the block page has tended to stop
// someone and, once they switch the heads-up on, writes to proHeadsUp the
// moments to give it and the words to say. This file is the open-source half:
// it keeps one alarm set for the next of those moments, shows the notification
// when it comes, and sets the next. Without Pro nothing writes proHeadsUp, so
// nothing here ever fires; and it only ever shows the words stored there.
//
// Notifications need a permission Sieve does not ask for when it is installed.
// It is an optional one, asked for in Settings only when someone switches the
// heads-up on. Until it is given, chrome.notifications does not exist here and
// nothing is shown.
//
// A heads-up that comes late, because the computer was asleep through it, is
// dropped rather than shown at the wrong time: it is a warning for a moment
// that has already passed.

const KEY = "proHeadsUp";
const LICENCE_KEY = "proLicence";
const ALARM = "sieve-heads-up";
const NOTIFICATION = "sieve-heads-up";
const LATE_MS = 30 * 60 * 1000;
const TITLE_MAX = 80;
const BODY_MAX = 400;

// The stored schedule, read defensively: { enabled, at: [{ day, minute }],
// title, body }. day is Date#getDay's (0 is Sunday), minute of the day local.
export function normalize(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const at = (Array.isArray(src.at) ? src.at : []).filter(
    (s) =>
      s &&
      Number.isInteger(s.day) &&
      s.day >= 0 &&
      s.day < 7 &&
      Number.isInteger(s.minute) &&
      s.minute >= 0 &&
      s.minute < 1440,
  );
  return {
    enabled: src.enabled === true,
    at: at.map((s) => ({ day: s.day, minute: s.minute })),
    title: typeof src.title === "string" ? src.title.slice(0, TITLE_MAX) : "",
    body: typeof src.body === "string" ? src.body.slice(0, BODY_MAX) : "",
  };
}

// The first of those moments after `now`, in local time, or null. Built from
// the date parts, so a daylight-saving change cannot move it by an hour.
export function nextAt(at, now) {
  const base = new Date(now);
  let best = null;
  for (const slot of at) {
    for (let add = 0; add <= 7; add++) {
      const d = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() + add,
        Math.floor(slot.minute / 60),
        slot.minute % 60,
      );
      if (d.getDay() !== slot.day || d.getTime() <= now) continue;
      if (best === null || d.getTime() < best) best = d.getTime();
      break;
    }
  }
  return best;
}

// Is Pro on? The same test as common/pro.js isProState, which is written for
// pages and cannot load in a service worker: a stored key Polar granted, not
// past its expiry. A key that lapses stops the heads-up with it.
export function licensed(raw, now) {
  if (!raw || typeof raw !== "object") return false;
  if (typeof raw.key !== "string" || !raw.key.trim() || raw.status !== "granted") return false;
  return !Number.isFinite(raw.expiresAt) || now < raw.expiresAt;
}

// Keeps the one alarm on the next heads-up, or clears it when there is none.
export async function arm(now = Date.now()) {
  const stored = await chrome.storage.local.get([KEY, LICENCE_KEY]);
  const headsUp = normalize(stored[KEY]);
  const when = headsUp.enabled && licensed(stored[LICENCE_KEY], now) ? nextAt(headsUp.at, now) : null;
  if (when === null) {
    await chrome.alarms.clear(ALARM);
    return null;
  }
  const set = await chrome.alarms.get(ALARM);
  if (!set || set.scheduledTime !== when) await chrome.alarms.create(ALARM, { when });
  return when;
}

// The alarm went off: show the heads-up if it is still wanted, still allowed
// and on time, then set the next one. Returns whether it was shown.
export async function fire(alarm, now = Date.now()) {
  if (!alarm || alarm.name !== ALARM) return false;
  const stored = await chrome.storage.local.get([KEY, LICENCE_KEY]);
  const headsUp = normalize(stored[KEY]);
  let shown = false;
  if (
    headsUp.enabled &&
    headsUp.title &&
    headsUp.body &&
    licensed(stored[LICENCE_KEY], now) &&
    now - alarm.scheduledTime < LATE_MS &&
    chrome.notifications
  ) {
    try {
      // Only the options Firefox knows as well: it rejects ones it doesn't.
      await chrome.notifications.create(NOTIFICATION, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
        title: headsUp.title,
        message: headsUp.body,
      });
      shown = true;
    } catch (err) {
      console.warn("[Sieve] could not show the heads-up:", err);
    }
  }
  // The next one, never this one again.
  await arm(Math.max(now, alarm.scheduledTime) + 1000);
  return shown;
}

// Tapping it opens Your progress at the plans. Registered once the permission
// exists, which may be after this worker started.
let clicksHeard = false;
function listenForClicks() {
  if (clicksHeard || !chrome.notifications || !chrome.notifications.onClicked) return;
  chrome.notifications.onClicked.addListener((id) => {
    if (id !== NOTIFICATION) return;
    chrome.notifications.clear(id);
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/progress.html#plans") });
  });
  clicksHeard = true;
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM) return;
  fire(alarm).catch((err) => console.warn("[Sieve] heads-up:", err));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || (!changes[KEY] && !changes[LICENCE_KEY])) return;
  arm().catch((err) => console.warn("[Sieve] heads-up:", err));
});

if (chrome.permissions && chrome.permissions.onAdded) chrome.permissions.onAdded.addListener(listenForClicks);
listenForClicks();
arm().catch((err) => console.warn("[Sieve] heads-up:", err));

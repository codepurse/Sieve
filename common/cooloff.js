// common/cooloff.js
// Sieve — Cool-off, a waiting period on anything that weakens protection.
//
// A PIN is no lock in a weak moment when the person craving is the one who
// knows it. A wait is. With a cool-off set, a protected change (turning a
// blocker off, allowing a site, removing the PIN — exactly what the Guardian
// gate already covers) is first ASKED for, and only unlocks once the wait is
// over. Then it stays unlocked for that one change, once, for a day, and lapses.
//
// Two decisions here are load-bearing:
//
//   - Nothing applies itself. When the wait ends, the person comes back and
//     makes the change themselves. An impulse at 2am must not quietly fire at
//     2am the next night, and the urge passing should need no follow-up.
//   - It is independent of the PIN. Someone on their own has nobody to hold a
//     PIN for them, and the wait is the protection that still works then. With
//     a PIN set too, the PIN is asked for after the wait, as before.
//
// Requests are keyed by the gate's own action name ("Turn off the Gambling
// Blocker", "Allow example.com and stop blocking it"), so asking for one change
// unlocks that change and nothing else.
//
// This module owns the settings and the requests. The dialog lives in
// common/guardian-prompt.js, so every existing gate inherits the wait without
// its own wiring. Like the PIN, it lives in this browser's storage: it is a
// commitment device against impulse, not a defence against someone determined
// to dig it out (or to move the system clock forward).

(() => {
  "use strict";

  if (window.SieveCooloff) return;

  const CONFIG_KEY = "cooloffConfig";
  const REQUESTS_KEY = "cooloffRequests";

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  // Hours. 0 is off. A choice of a few fixed waits rather than a number box:
  // "how long" is the whole decision, and five clear options make it in one look.
  const DELAYS = [0, 1, 24, 72, 168];

  // How long a request stays unlocked once its wait is over. Long enough that
  // nobody has to be at the screen the minute it opens — there is no
  // notification to call them back — and short enough that an old request
  // cannot be kept in a drawer for the next bad night.
  const READY_WINDOW_MS = DAY;

  function normalizeConfig(raw) {
    const config = raw && typeof raw === "object" ? raw : {};
    const hours = Number(config.hours);
    return { hours: DELAYS.includes(hours) ? hours : 0 };
  }

  async function getConfig() {
    const stored = await chrome.storage.local.get(CONFIG_KEY);
    return normalizeConfig(stored[CONFIG_KEY]);
  }

  async function setConfig(config) {
    await chrome.storage.local.set({ [CONFIG_KEY]: normalizeConfig(config) });
  }

  // The popup and the settings page name the same change in the same words, but
  // a stray capital or double space must not make them two different requests.
  function keyFor(action) {
    return String(action == null ? "" : action)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  // "none" | "waiting" | "ready" | "expired" — a pure function of the clock, so
  // nothing has to run in the background for a request to ripen or lapse.
  function stateOf(request, now) {
    if (!request) return "none";
    if (now < request.readyAt) return "waiting";
    if (now < request.expiresAt) return "ready";
    return "expired";
  }

  function isValidRequest(r) {
    return (
      r &&
      typeof r === "object" &&
      typeof r.key === "string" &&
      r.key !== "" &&
      Number.isFinite(r.requestedAt) &&
      Number.isFinite(r.readyAt) &&
      Number.isFinite(r.expiresAt)
    );
  }

  function liveRequests(list, now) {
    return (Array.isArray(list) ? list : []).filter(
      (r) => isValidRequest(r) && stateOf(r, now) !== "expired"
    );
  }

  async function readRequests(now) {
    const stored = await chrome.storage.local.get(REQUESTS_KEY);
    const raw = Array.isArray(stored[REQUESTS_KEY]) ? stored[REQUESTS_KEY] : [];
    const live = liveRequests(raw, now);
    // Lapsed requests are dropped as they are found rather than by a timer.
    if (live.length !== raw.length) await chrome.storage.local.set({ [REQUESTS_KEY]: live });
    return live;
  }

  async function writeRequests(list) {
    await chrome.storage.local.set({ [REQUESTS_KEY]: list });
  }

  // Every live request, soonest to unlock first — for the settings page list.
  async function listRequests(now = Date.now()) {
    const live = await readRequests(now);
    return live.slice().sort((a, b) => a.readyAt - b.readyAt);
  }

  // What the gate needs to know about one action, in one read.
  //   required: false when no cool-off is set — the gate goes straight on.
  //   state:    of this action's request, if any.
  async function check(action, now = Date.now()) {
    const config = await getConfig();
    const key = keyFor(action);
    if (config.hours === 0) return { required: false, hours: 0, key, state: "none", request: null };
    const live = await readRequests(now);
    const request = live.find((r) => r.key === key) || null;
    return { required: true, hours: config.hours, key, state: stateOf(request, now), request };
  }

  // Start the clock for one action, with the wait set at the moment of asking.
  // Asking twice does not restart a clock that is already running.
  async function request(action, now = Date.now()) {
    const config = await getConfig();
    const key = keyFor(action);
    const live = await readRequests(now);
    const existing = live.find((r) => r.key === key);
    if (existing) return existing;
    const readyAt = now + config.hours * HOUR;
    const entry = {
      key,
      action: String(action == null ? "" : action),
      requestedAt: now,
      readyAt,
      expiresAt: readyAt + READY_WINDOW_MS,
    };
    await writeRequests(live.concat([entry]));
    return entry;
  }

  // Calling a request off strengthens protection, so it is always free.
  async function cancel(actionOrKey, now = Date.now()) {
    const key = keyFor(actionOrKey);
    const live = await readRequests(now);
    const kept = live.filter((r) => r.key !== key);
    if (kept.length !== live.length) await writeRequests(kept);
    return kept.length !== live.length;
  }

  // A ready request unlocks its change once. Used, it is gone — doing the same
  // thing again later is a new decision and waits again.
  async function consume(actionOrKey, now = Date.now()) {
    return cancel(actionOrKey, now);
  }

  async function clearRequests() {
    await chrome.storage.local.remove(REQUESTS_KEY);
  }

  // --- wording ------------------------------------------------------------
  // Shared by the dialog, the settings page and the blocked page, so all three
  // describe the same wait in the same words.

  // "a 24-hour wait", "a 3-day wait".
  function delayLabel(hours) {
    if (hours >= 48 && hours % 24 === 0) return `${hours / 24}-day`;
    return `${hours}-hour`;
  }

  // Coarse on purpose: "20 h 46 min" is useful, "20 h 46 min 12 s" is a
  // countdown to stare at.
  function formatDuration(ms) {
    if (!(ms > 0)) return "now";
    if (ms < MINUTE) return "less than a minute";
    const totalMinutes = Math.ceil(ms / MINUTE);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) {
      const d = `${days} ${days === 1 ? "day" : "days"}`;
      return hours > 0 ? `${d} ${hours} h` : d;
    }
    if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
    return `${minutes} min`;
  }

  // "Thu 9 Oct, 2:14 AM" in the reader's own locale.
  function formatWhen(ms) {
    try {
      return new Date(ms).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return new Date(ms).toString();
    }
  }

  window.SieveCooloff = {
    CONFIG_KEY,
    REQUESTS_KEY,
    DELAYS,
    READY_WINDOW_MS,
    normalizeConfig,
    getConfig,
    setConfig,
    keyFor,
    stateOf,
    check,
    request,
    cancel,
    consume,
    listRequests,
    clearRequests,
    delayLabel,
    formatDuration,
    formatWhen,
  };
})();

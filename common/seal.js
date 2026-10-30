// common/seal.js
// Sieve — the Seal: lock your protection until a date.
//
// The PIN stops someone else. The cool-off stops an impulse. The Seal is for
// the person who has decided, on a good day, that for the next month nothing
// gets weaker — and does not want to be able to change their mind at 2am, not
// with the PIN and not by waiting a cool-off out.
//
// While a seal runs, every change the lock already protects (turning a blocker
// off, allowing a site, removing the PIN, shortening the cool-off — everything
// that goes through SieveGuardian.confirmUnlock) is refused. The gate itself
// lives in common/guardian-prompt.js, so every existing gate inherits the seal
// without its own wiring.
//
// There is one way out early, chosen when the seal starts:
//
//   - A witness (the default). Someone trusted scans a QR code into the
//     authenticator app they already use, as for BlockNSFW's Pact, and keeps
//     eight one-time recovery codes. Ending the seal means asking them for the
//     six digits their app shows: a person, not a drawer. Standard TOTP
//     (common/totp.js), so nothing is sent anywhere. The seal only starts once
//     their app has shown a code that works, so a scan that went wrong cannot
//     leave a seal with no way out; and that first code can never end it.
//   - A printed key, for someone with nobody to ask: twenty characters shown
//     once, kept only as a salted hash, like the PIN.
//
// Either way, the code ends the seal and the usual PIN and cool-off then apply
// as before. Five wrong codes lock entry for five minutes, doubling to an
// hour, so six digits cannot simply be guessed.
//
// Decisions that hold it up:
//
//   - It can only get stronger. Extending a seal is free; there is no
//     shortening, and no way to change the witness or the key without ending
//     the seal.
//   - It is free, like every other protection. Sieve Pro adds comfort and
//     insight on top (the urge screen, streaks), never a stronger lock, and
//     nothing here reads the Pro licence.
//   - The pause screen's "15 more minutes" is not covered, for the reason the
//     cool-off does not cover it: it is a daily allowance, not a protection.
//
// Like the PIN and the cool-off, this lives in this browser's storage. It is a
// commitment device, not a defence against someone determined to dig it out:
// whoever sees the QR code could scan it twice, moving the system clock
// forward ends a seal, and so does removing Sieve (which Extension Guard is
// for).

(() => {
  "use strict";

  if (window.SieveSeal) return;

  const SEAL_KEY = "proSeal";

  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;

  // Days. Fixed choices, like the cool-off's: "how long" is the whole decision.
  const DURATIONS = [7, 30, 90, 365];

  // Who holds the way out.
  const EXITS = ["witness", "key"];

  // No 0/O or 1/I: the key is read off paper, often by someone else.
  const KEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const KEY_LENGTH = 20;
  const KEY_GROUP = 4;

  // Wrong codes before entry locks, and how long: 5 minutes, then 10, 20, 40,
  // and an hour from then on.
  const TRIES = 5;
  const LOCK_MS = 5 * MINUTE;
  const MAX_LOCK_MS = 60 * MINUTE;

  function totp() {
    return window.SieveTotp || null;
  }

  function normalizeWitness(raw) {
    if (!raw || typeof raw !== "object" || typeof raw.secret !== "string" || !raw.secret) return null;
    const recovery = (Array.isArray(raw.recovery) ? raw.recovery : [])
      .filter((r) => r && typeof r.hash === "string" && r.hash)
      .map((r) => ({ hash: r.hash, used: r.used === true }));
    return {
      secret: raw.secret,
      recovery,
      lastCounter: Number.isFinite(raw.lastCounter) ? raw.lastCounter : -1,
    };
  }

  // A seal with no usable way out reads as no seal: a lock nobody can open
  // early would be worse than none, and a damaged record must not become one.
  function normalizeSeal(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (!Number.isFinite(raw.until) || !Number.isFinite(raw.startedAt)) return null;
    const base = {
      until: raw.until,
      startedAt: raw.startedAt,
      failures: Number.isFinite(raw.failures) && raw.failures > 0 ? Math.floor(raw.failures) : 0,
      lockedUntil: Number.isFinite(raw.lockedUntil) ? raw.lockedUntil : 0,
    };
    // Seals started before witnesses existed have no `exit`, and are keys.
    const exit = raw.exit === "witness" ? "witness" : "key";
    if (exit === "witness") {
      const witness = normalizeWitness(raw.witness);
      return witness ? { ...base, exit, witness } : null;
    }
    if (typeof raw.keySalt !== "string" || typeof raw.keyHash !== "string") return null;
    if (!raw.keySalt || !raw.keyHash) return null;
    return { ...base, exit, keySalt: raw.keySalt, keyHash: raw.keyHash };
  }

  // "none" | "sealed" | "ended" — a pure function of the clock, so a seal ends
  // on its date with nothing running in the background.
  function stateOf(seal, now = Date.now()) {
    const s = normalizeSeal(seal);
    if (!s) return "none";
    return now < s.until ? "sealed" : "ended";
  }

  function toHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function randomHex(byteCount) {
    const arr = new Uint8Array(byteCount);
    crypto.getRandomValues(arr);
    return toHex(arr.buffer);
  }

  // Rejection sampling, as in common/access-code.js: modulo would bias the
  // key toward the start of the alphabet. 32 characters divide 256 evenly, so
  // nothing is ever discarded today, but the loop stays correct if the
  // alphabet changes.
  function generateKey() {
    const size = KEY_CHARS.length;
    const limit = Math.floor(256 / size) * size;
    let raw = "";
    while (raw.length < KEY_LENGTH) {
      const bytes = new Uint8Array(KEY_LENGTH - raw.length);
      crypto.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte >= limit) continue;
        raw += KEY_CHARS[byte % size];
        if (raw.length === KEY_LENGTH) break;
      }
    }
    return formatKey(raw);
  }

  // "ABCD-EFGH-…", the way it is printed and read aloud.
  function formatKey(raw) {
    const groups = [];
    for (let i = 0; i < raw.length; i += KEY_GROUP) groups.push(raw.slice(i, i + KEY_GROUP));
    return groups.join("-");
  }

  // Typed back from paper: any case, with or without the dashes and spaces.
  function normalizeKey(key) {
    return String(key == null ? "" : key)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  async function hashKey(key, salt) {
    const data = new TextEncoder().encode(salt + ":" + normalizeKey(key));
    return toHex(await crypto.subtle.digest("SHA-256", data));
  }

  // The stored seal, with an ended one dropped as it is found.
  async function getSeal(now = Date.now()) {
    const stored = await chrome.storage.local.get(SEAL_KEY);
    const seal = normalizeSeal(stored[SEAL_KEY]);
    if (stored[SEAL_KEY] && stateOf(seal, now) !== "sealed") {
      await chrome.storage.local.remove(SEAL_KEY);
      return null;
    }
    return seal;
  }

  async function save(seal) {
    await chrome.storage.local.set({ [SEAL_KEY]: seal });
  }

  // What the gate and the settings page need, in one read.
  async function check(now = Date.now()) {
    const seal = await getSeal(now);
    if (!seal) return { sealed: false };
    return {
      sealed: true,
      until: seal.until,
      startedAt: seal.startedAt,
      exit: seal.exit,
      recoveryLeft: seal.exit === "witness" ? seal.witness.recovery.filter((r) => !r.used).length : 0,
      lockedUntil: seal.lockedUntil > now ? seal.lockedUntil : 0,
    };
  }

  // --- starting -----------------------------------------------------------

  // Start a seal whose way out is a printed key. The key is returned here and
  // nowhere else, ever.
  //   { ok: true, key, until }
  //   { ok: false, reason: "already-sealed" | "bad-duration" }
  async function start(days, now = Date.now()) {
    if (!DURATIONS.includes(Number(days))) return { ok: false, reason: "bad-duration" };
    if (await getSeal(now)) return { ok: false, reason: "already-sealed" };
    const key = generateKey();
    const keySalt = randomHex(16);
    const seal = {
      until: now + Number(days) * DAY,
      startedAt: now,
      exit: "key",
      keySalt,
      keyHash: await hashKey(key, keySalt),
    };
    await save(seal);
    return { ok: true, key, until: seal.until };
  }

  // A witness's half of a seal, before it starts: the key their app scans and
  // the recovery codes they keep. Nothing is stored until their app shows a
  // code that works (startWithWitness), so a pairing abandoned halfway leaves
  // nothing behind.
  //   { secret, uri, recoveryCodes }
  function pairWitness() {
    const T = totp();
    if (!T) throw new Error("common/totp.js is not loaded");
    const secret = T.generateSecret();
    return { secret, uri: T.otpauthUri(secret, "Seal"), recoveryCodes: T.generateRecoveryCodes() };
  }

  // Start a seal held by a witness, once a code from their app proves the scan
  // worked. That code is spent here, so it cannot end the seal a minute later.
  //   { ok: true, until }
  //   { ok: false, reason: "already-sealed" | "bad-duration" | "wrong-code" }
  async function startWithWitness(days, pairing, code, now = Date.now()) {
    const T = totp();
    if (!DURATIONS.includes(Number(days))) return { ok: false, reason: "bad-duration" };
    if (!T || !pairing || typeof pairing.secret !== "string") return { ok: false, reason: "wrong-code" };
    if (await getSeal(now)) return { ok: false, reason: "already-sealed" };
    const result = await T.verify(pairing.secret, code, { times: [now] });
    if (!result.ok) return { ok: false, reason: "wrong-code" };
    const recovery = [];
    for (const c of pairing.recoveryCodes || []) recovery.push({ hash: await T.hashRecoveryCode(c), used: false });
    const seal = {
      until: now + Number(days) * DAY,
      startedAt: now,
      exit: "witness",
      witness: { secret: pairing.secret, recovery, lastCounter: result.counter },
    };
    await save(seal);
    return { ok: true, until: seal.until };
  }

  // Add days to a running seal. Strengthening, so it is always free; the way
  // out stays the same.
  async function extend(days, now = Date.now()) {
    if (!DURATIONS.includes(Number(days))) return { ok: false, reason: "bad-duration" };
    const seal = await getSeal(now);
    if (!seal) return { ok: false, reason: "not-sealed" };
    const next = { ...seal, until: seal.until + Number(days) * DAY };
    await save(next);
    return { ok: true, until: next.until };
  }

  // --- ending early -------------------------------------------------------

  async function matchesKey(key, now = Date.now()) {
    const seal = await getSeal(now);
    if (!seal || seal.exit !== "key" || !normalizeKey(key)) return false;
    return (await hashKey(key, seal.keySalt)) === seal.keyHash;
  }

  // Does this code open this seal? A witness's six digits (not one already
  // used) or one of their unused recovery codes; or the printed key.
  async function opens(seal, code, now) {
    if (seal.exit === "key") return (await hashKey(code, seal.keySalt)) === seal.keyHash;
    const T = totp();
    if (!T) return false;
    if (T.looksLikeRecoveryCode(code)) {
      const hash = await T.hashRecoveryCode(code);
      return seal.witness.recovery.some((r) => !r.used && r.hash === hash);
    }
    const result = await T.verify(seal.witness.secret, code, { times: [now], lastCounter: seal.witness.lastCounter });
    return result.ok;
  }

  // How long the lock lasts after `failures` wrong codes, or 0 when it does
  // not lock yet: 5 minutes at five wrong, doubling each five after, to an hour.
  function lockFor(failures) {
    if (failures === 0 || failures % TRIES !== 0) return 0;
    return Math.min(LOCK_MS * 2 ** (failures / TRIES - 1), MAX_LOCK_MS);
  }

  // Codes are checked one at a time. Each check reads the count of wrong codes
  // and writes it back; two at once would both read the same count, and a
  // burst of guesses fired together would never reach the lock.
  let checking = Promise.resolve();

  // End a seal early with its witness's code or its printed key.
  //   { ok: true }                                  the seal is over
  //   { ok: false, locked: true, retryAt }          too many wrong codes; wait
  //   { ok: false }                                 wrong
  //   { ok: false, reason: "not-sealed" }
  function breakWith(code, now) {
    const run = checking.then(() => checkCode(code, now === undefined ? Date.now() : now));
    checking = run.catch(() => {});
    return run;
  }

  async function checkCode(code, now) {
    const seal = await getSeal(now);
    if (!seal) return { ok: false, reason: "not-sealed" };
    if (seal.lockedUntil > now) return { ok: false, locked: true, retryAt: seal.lockedUntil };
    if (String(code == null ? "" : code).trim() && (await opens(seal, code, now))) {
      await chrome.storage.local.remove(SEAL_KEY);
      return { ok: true };
    }
    const failures = seal.failures + 1;
    const lock = lockFor(failures);
    await save({ ...seal, failures, lockedUntil: lock ? now + lock : seal.lockedUntil });
    return lock ? { ok: false, locked: true, retryAt: now + lock } : { ok: false };
  }

  // --- wording ------------------------------------------------------------

  // "a week", "30 days", "a year" — for the settings page and the dialog.
  function durationLabel(days) {
    if (days === 7) return "a week";
    if (days === 365) return "a year";
    return `${days} days`;
  }

  // "Thu 28 Nov, 9:14 AM" in the reader's own locale.
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

  // "28 Nov" — short enough for the popup's status line.
  function formatDay(ms) {
    try {
      return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    } catch {
      return new Date(ms).toDateString();
    }
  }

  window.SieveSeal = {
    SEAL_KEY,
    DURATIONS,
    EXITS,
    KEY_CHARS,
    KEY_LENGTH,
    TRIES,
    normalizeSeal,
    stateOf,
    generateKey,
    normalizeKey,
    getSeal,
    check,
    start,
    pairWitness,
    startWithWitness,
    extend,
    matchesKey,
    lockFor,
    breakWith,
    durationLabel,
    formatWhen,
    formatDay,
  };
})();

// test/seal-test.mjs
// Sieve — tests for common/seal.js, the Seal.
//
// A seal that can be shortened, a key that is stored readable, a key that only
// works typed exactly as printed, or a seal that quietly outlives its date —
// each of those breaks the one promise it makes. The dialog that refuses a
// change is checked in a real browser; this covers the bookkeeping.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const backing = new Map();

function keysOf(arg) {
  if (arg == null) return [...backing.keys()];
  if (typeof arg === "string") return [arg];
  if (Array.isArray(arg)) return arg;
  return Object.keys(arg);
}

globalThis.chrome = {
  storage: {
    local: {
      async get(arg) {
        const out = {};
        for (const key of keysOf(arg)) {
          if (backing.has(key)) out[key] = structuredClone(backing.get(key));
          else if (arg && typeof arg === "object" && !Array.isArray(arg)) out[key] = arg[key];
        }
        return out;
      },
      async set(patch) {
        for (const [key, value] of Object.entries(patch)) backing.set(key, structuredClone(value));
      },
      async remove(arg) {
        for (const key of keysOf(arg)) backing.delete(key);
      },
    },
  },
};

globalThis.window = globalThis;
// Pages load common/totp.js as a classic script before seal.js; under Node it
// is a CommonJS module, so it is handed over by name the way a page would.
const Totp = createRequire(import.meta.url)("../common/totp.js");
globalThis.SieveTotp = Totp;
await import("../common/seal.js");
const S = globalThis.SieveSeal;

const DAY = 24 * 3600000;
const T0 = Date.UTC(2026, 9, 29, 9, 0, 0);

function reset() {
  backing.clear();
}

test("a key is twenty characters in five groups, with no look-alike characters", () => {
  for (let i = 0; i < 200; i++) {
    const key = S.generateKey();
    assert.match(key, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/);
    assert.doesNotMatch(key, /[01IO]/);
  }
  assert.notEqual(S.generateKey(), S.generateKey());
});

test("starting a seal gives the key once and stores only its hash", async () => {
  reset();
  const result = await S.start(30, T0);
  assert.equal(result.ok, true);
  assert.equal(result.until, T0 + 30 * DAY);

  const stored = backing.get(S.SEAL_KEY);
  const raw = S.normalizeKey(result.key);
  assert.equal(JSON.stringify(stored).includes(raw), false);
  assert.equal(JSON.stringify(stored).includes(result.key), false);
  assert.match(stored.keyHash, /^[0-9a-f]{64}$/);
  assert.match(stored.keySalt, /^[0-9a-f]{32}$/);
});

test("only the offered lengths can be chosen", async () => {
  reset();
  assert.deepEqual(await S.start(1, T0), { ok: false, reason: "bad-duration" });
  assert.deepEqual(await S.start(-30, T0), { ok: false, reason: "bad-duration" });
  assert.equal(backing.has(S.SEAL_KEY), false);
  for (const days of S.DURATIONS) {
    reset();
    assert.equal((await S.start(days, T0)).ok, true);
  }
});

test("a seal holds until its date, then ends on the clock alone", async () => {
  reset();
  await S.start(7, T0);
  assert.equal((await S.check(T0)).sealed, true);
  assert.equal((await S.check(T0 + 7 * DAY - 1)).sealed, true);
  assert.equal((await S.check(T0 + 7 * DAY)).sealed, false);
  // An ended seal is dropped as it is found.
  assert.equal(backing.has(S.SEAL_KEY), false);
});

test("a running seal cannot be restarted (which would mint a new key)", async () => {
  reset();
  await S.start(30, T0);
  assert.deepEqual(await S.start(7, T0 + DAY), { ok: false, reason: "already-sealed" });
  assert.equal(backing.get(S.SEAL_KEY).until, T0 + 30 * DAY);
});

test("extending adds days and keeps the key", async () => {
  reset();
  const { key } = await S.start(7, T0);
  const result = await S.extend(30, T0 + DAY);
  assert.deepEqual(result, { ok: true, until: T0 + 37 * DAY });
  assert.equal(await S.matchesKey(key, T0 + DAY), true);
  assert.deepEqual(await S.extend(30, T0 + 40 * DAY), { ok: false, reason: "not-sealed" });
});

test("there is no way to shorten a seal", () => {
  assert.equal(typeof S.shorten, "undefined");
  assert.equal(typeof S.clear, "undefined");
  assert.equal(typeof S.setUntil, "undefined");
});

test("the emergency key ends the seal; a wrong key does nothing", async () => {
  reset();
  const { key } = await S.start(90, T0);
  assert.equal((await S.breakWith("ABCD-EFGH-JKLM-NPQR-STUV", T0 + DAY)).ok, false);
  assert.equal((await S.breakWith("", T0 + DAY)).ok, false);
  assert.equal((await S.check(T0 + DAY)).sealed, true);

  assert.deepEqual(await S.breakWith(key, T0 + DAY), { ok: true });
  assert.equal((await S.check(T0 + DAY)).sealed, false);
  assert.equal(backing.has(S.SEAL_KEY), false);
});

test("the key is accepted however it is typed back from paper", async () => {
  reset();
  const { key } = await S.start(30, T0);
  const plain = S.normalizeKey(key);
  for (const typed of [key, plain, plain.toLowerCase(), ` ${key.replace(/-/g, " ")} `, key.toLowerCase()]) {
    assert.equal(await S.matchesKey(typed, T0), true, `typed as ${JSON.stringify(typed)}`);
  }
});

test("with no seal, a code does nothing", async () => {
  reset();
  assert.deepEqual(await S.breakWith("ABCD-EFGH-JKLM-NPQR-STUV", T0), { ok: false, reason: "not-sealed" });
});

test("a damaged record reads as no seal rather than a lock with no way out", () => {
  assert.equal(S.stateOf({ until: T0 + DAY, startedAt: T0 }, T0), "none");
  assert.equal(S.stateOf({ until: "soon", startedAt: T0, keySalt: "a", keyHash: "b" }, T0), "none");
  assert.equal(S.stateOf({ until: T0 + DAY, startedAt: T0, exit: "witness", witness: {} }, T0), "none");
  assert.equal(S.stateOf(null, T0), "none");
});

test("a seal from before witnesses (no exit) still reads as a key seal", () => {
  const legacy = { until: T0 + DAY, startedAt: T0, keySalt: "a", keyHash: "b" };
  assert.equal(S.stateOf(legacy, T0), "sealed");
  assert.equal(S.normalizeSeal(legacy).exit, "key");
});

// --- the witness ------------------------------------------------------------

async function sealWithWitness(days = 30, at = T0) {
  const pairing = S.pairWitness();
  const code = await Totp.totp(pairing.secret, at);
  const result = await S.startWithWitness(days, pairing, code, at);
  return { pairing, result };
}

test("pairing makes a scannable key and eight recovery codes, and stores nothing yet", () => {
  reset();
  const pairing = S.pairWitness();
  assert.equal(Totp.base32Decode(pairing.secret).length, 20);
  assert.equal(pairing.uri, `otpauth://totp/Sieve:Seal?secret=${pairing.secret}&issuer=Sieve`);
  assert.equal(pairing.recoveryCodes.length, 8);
  assert.equal(backing.size, 0);
});

test("the seal starts only once the witness's app shows a code that works", async () => {
  reset();
  const pairing = S.pairWitness();
  assert.deepEqual(await S.startWithWitness(30, pairing, "000000", T0), { ok: false, reason: "wrong-code" });
  assert.deepEqual(await S.startWithWitness(30, pairing, "", T0), { ok: false, reason: "wrong-code" });
  assert.equal(backing.has(S.SEAL_KEY), false);

  const code = await Totp.totp(pairing.secret, T0);
  assert.deepEqual(await S.startWithWitness(30, pairing, code, T0), { ok: true, until: T0 + 30 * DAY });
  const info = await S.check(T0);
  assert.equal(info.exit, "witness");
  assert.equal(info.recoveryLeft, 8);
});

test("recovery codes are stored only as hashes", async () => {
  reset();
  const { pairing } = await sealWithWitness();
  const stored = JSON.stringify(backing.get(S.SEAL_KEY));
  for (const c of pairing.recoveryCodes) {
    assert.equal(stored.includes(c), false);
    assert.equal(stored.includes(c.replace("-", "")), false);
  }
});

test("the code that started the seal cannot end it", async () => {
  reset();
  const { pairing } = await sealWithWitness();
  const sameCode = await Totp.totp(pairing.secret, T0);
  assert.equal((await S.breakWith(sameCode, T0 + 10000)).ok, false);
  assert.equal((await S.check(T0 + 10000)).sealed, true);
});

test("a fresh code from the witness's app ends the seal", async () => {
  reset();
  const { pairing } = await sealWithWitness();
  const later = T0 + 3 * DAY;
  const code = await Totp.totp(pairing.secret, later);
  assert.deepEqual(await S.breakWith(code, later), { ok: true });
  assert.equal((await S.check(later)).sealed, false);
});

test("a recovery code ends the seal, typed any way; a made-up one does not", async () => {
  reset();
  const { pairing } = await sealWithWitness();
  assert.equal((await S.breakWith("ACDE-FGHJ", T0 + DAY)).ok, false);
  const typed = pairing.recoveryCodes[3].toLowerCase().replace("-", " ");
  assert.deepEqual(await S.breakWith(typed, T0 + DAY), { ok: true });
});

test("a printed key does not open a witness's seal, nor a witness code a key's", async () => {
  reset();
  const { key } = await S.start(30, T0);
  assert.equal((await S.breakWith("123456", T0 + DAY)).ok, false);
  reset();
  await sealWithWitness();
  assert.equal(await S.matchesKey(key, T0 + DAY), false);
});

test("five wrong codes lock entry for 5 minutes, then 10, up to an hour", async () => {
  reset();
  const { pairing } = await sealWithWitness();
  let at = T0 + DAY;
  for (let i = 1; i <= 4; i++) assert.deepEqual(await S.breakWith("000000", at), { ok: false });
  assert.deepEqual(await S.breakWith("000000", at), { ok: false, locked: true, retryAt: at + 5 * 60000 });

  // While locked, even the right code waits.
  const right = await Totp.totp(pairing.secret, at + 60000);
  assert.deepEqual(await S.breakWith(right, at + 60000), { ok: false, locked: true, retryAt: at + 5 * 60000 });
  assert.equal((await S.check(at + 60000)).lockedUntil, at + 5 * 60000);

  at += 5 * 60000;
  for (let i = 1; i <= 4; i++) await S.breakWith("000000", at);
  assert.equal((await S.breakWith("000000", at)).retryAt, at + 10 * 60000);

  assert.equal(S.lockFor(5), 5 * 60000);
  assert.equal(S.lockFor(10), 10 * 60000);
  assert.equal(S.lockFor(25), 60 * 60000);
  assert.equal(S.lockFor(40), 60 * 60000);
  assert.equal(S.lockFor(7), 0);

  // Once the lock is over, the right code still works.
  at += 10 * 60000;
  const code = await Totp.totp(pairing.secret, at);
  assert.deepEqual(await S.breakWith(code, at), { ok: true });
});

test("a burst of guesses fired together still counts every one, and locks", async () => {
  reset();
  await sealWithWitness();
  const at = T0 + DAY;
  const results = await Promise.all(["111111", "222222", "333333", "444444", "555555", "666666"].map((c) => S.breakWith(c, at)));
  assert.equal(backing.get(S.SEAL_KEY).failures, 5, "the sixth was refused by the lock, uncounted");
  assert.equal(results.filter((r) => r.locked).length, 2);
  assert.equal(results[5].retryAt, at + 5 * 60000);
});

test("extending a witness's seal keeps the witness", async () => {
  reset();
  const { pairing } = await sealWithWitness(7);
  await S.extend(30, T0 + DAY);
  const later = T0 + 20 * DAY;
  assert.equal((await S.check(later)).sealed, true);
  assert.deepEqual(await S.breakWith(await Totp.totp(pairing.secret, later), later), { ok: true });
});

test("the seal is free: it starts and holds with no Pro licence at all", async () => {
  reset();
  // Sieve Pro's licence is a separate key; nothing here reads it.
  assert.equal((await S.start(30, T0)).ok, true);
  assert.equal((await S.check(T0 + DAY)).sealed, true);
  backing.set("proLicence", { key: "SIEVE-X", status: "revoked" });
  assert.equal((await S.check(T0 + DAY)).sealed, true);
});

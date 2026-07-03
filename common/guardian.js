// common/guardian.js
// Sieve — Guardian (self-lock PIN) core. Shared by the options page, the popup,
// and the content scripts. It is for everyone, not just parents: a PIN to lock
// your own settings against impulse, or to lock them for someone else.
//   - When a PIN is set, Sieve is in "Guardian mode": actions that WEAKEN the
//     protection (turning a module off, getting past the pause screen) require
//     the PIN. Strengthening protection is always free.
//   - With no PIN set, Sieve is in "Personal mode": everything is freely under
//     the user's own control.
// The PIN is never stored in the clear — only a salted SHA-256 hash is kept.

(() => {
  "use strict";

  // Define the API once (content scripts of one extension share a world).
  if (window.SieveGuardian) return;

  const SALT_KEY = "guardianSalt";
  const HASH_KEY = "guardianPinHash";

  function toHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function randomHex(byteCount) {
    const arr = new Uint8Array(byteCount);
    crypto.getRandomValues(arr);
    return toHex(arr.buffer);
  }

  async function hashPin(pin, salt) {
    const data = new TextEncoder().encode(salt + ":" + pin);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return toHex(digest);
  }

  // Is a PIN set (i.e. are we in Guardian mode)?
  async function isEnabled() {
    const stored = await chrome.storage.local.get(HASH_KEY);
    return !!stored[HASH_KEY];
  }

  // Set or change the PIN.
  async function setPin(pin) {
    const salt = randomHex(16);
    const hash = await hashPin(pin, salt);
    await chrome.storage.local.set({ [SALT_KEY]: salt, [HASH_KEY]: hash });
  }

  // Check a PIN. Returns true when NO PIN is set (Personal mode = always allowed).
  async function verify(pin) {
    const stored = await chrome.storage.local.get([SALT_KEY, HASH_KEY]);
    if (!stored[HASH_KEY]) return true;
    if (!stored[SALT_KEY]) return false;
    const hash = await hashPin(pin, stored[SALT_KEY]);
    return hash === stored[HASH_KEY];
  }

  // Remove the PIN (turn off Guardian mode). Requires the current PIN.
  async function clearPin(pin) {
    if (!(await verify(pin))) return false;
    await chrome.storage.local.remove([SALT_KEY, HASH_KEY]);
    return true;
  }

  window.SieveGuardian = { isEnabled, setPin, verify, clearPin };
})();

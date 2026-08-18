// common/access-code.js
// Sieve — optional access code, a second layer on top of the Guardian PIN.
//
// Ported from BlockNSFW so the two extensions behave identically; requested by a
// user who called it "an absolutely brilliant deterrent" and asked for it here.
//
// The code is NOT a secret. It is displayed in full, directly above the box you
// type it into. The protection is the deliberate effort of retyping 32 to 256
// random characters, which is long enough for an impulse to pass. Two things
// follow from that, and both are load-bearing:
//
//   - Pasting must be impossible, or the whole thing is defeated in two seconds.
//     The prompt refuses paste, drop and Ctrl/Cmd+V, and the displayed code
//     cannot be selected or copied.
//   - A wrong answer must issue a NEW code. Retrying against the same string
//     would let someone assemble it piecemeal instead of typing it in one go.
//
// This module owns the settings and the code itself. The prompt UI lives in
// common/guardian-prompt.js, which shows it after the PIN is accepted, so every
// existing gate (settings page, pause screen, blocked page) inherits it without
// its own wiring.

(() => {
  "use strict";

  if (window.SieveAccessCode) return;

  const CONFIG_KEY = "accessCodeConfig";

  // Ambiguous glyphs are excluded: retyping 256 characters should be effort, not
  // a guessing game about whether that is a 1 or an l. With 0/O and 1/l/I gone,
  // lowercase "o" and "i" are unambiguous and stay.
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=?~";
  const LENGTHS = [32, 64, 128, 256];
  const SCOPES = ["critical", "all"];

  function normalizeConfig(raw) {
    const config = raw && typeof raw === "object" ? raw : {};
    const length = Number(config.length);
    return {
      enabled: config.enabled === true,
      length: LENGTHS.includes(length) ? length : 64,
      // 'critical' guards only the decisive actions (turning a protection off,
      // getting past the pause screen, weakening the code itself). A code
      // demanded for every small edit trains people to resent the feature and
      // switch it off, which protects nobody.
      scope: SCOPES.includes(config.scope) ? config.scope : "critical",
    };
  }

  async function getConfig() {
    const stored = await chrome.storage.local.get(CONFIG_KEY);
    return normalizeConfig(stored[CONFIG_KEY]);
  }

  async function setConfig(config) {
    await chrome.storage.local.set({ [CONFIG_KEY]: normalizeConfig(config) });
  }

  // Pure decision, separated from the UI so it can be tested directly.
  function requiredFor(config, isCritical) {
    const c = normalizeConfig(config);
    if (!c.enabled) return false;
    if (c.scope === "all") return true;
    return isCritical === true;
  }

  // Rejection sampling rather than modulo, which would bias the distribution
  // toward the start of the charset.
  function generate(length) {
    const size = CHARS.length;
    const limit = Math.floor(256 / size) * size;
    let code = "";
    while (code.length < length) {
      const bytes = new Uint8Array(length - code.length);
      crypto.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte >= limit) continue; // discard: would skew the distribution
        code += CHARS[byte % size];
        if (code.length === length) break;
      }
    }
    return code;
  }

  window.SieveAccessCode = {
    CONFIG_KEY,
    CHARS,
    LENGTHS,
    SCOPES,
    normalizeConfig,
    getConfig,
    setConfig,
    requiredFor,
    generate,
  };
})();

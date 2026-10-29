// common/pro.js
// Sieve — Sieve Pro, the one-time purchase that unlocks the Pro features.
//
// Everything Sieve did before Pro stays free. Pro adds new things on top (the
// Seal, the urge screen, streaks), and this module answers one question for all
// of them: has this browser got a valid Pro licence?
//
// This file is open source on purpose, like BlockNSFW's shared/supporter.js:
// it is the one part of Pro that talks to the network, so anyone can read
// exactly what it sends. The features themselves are not open source; store
// builds copy them over the stand-ins in pro/ (pro/README.md).
//
// The licence is a key sold through Polar (polar.sh), which emails it to the
// buyer. It is checked against Polar's public licence endpoint, which needs no
// secret and is made for apps that run on the buyer's own machine. Three
// decisions here are load-bearing:
//
//   - The only things ever sent are the key and Sieve's organisation id, and
//     only from the settings page: when a key is entered, then at most once a
//     week. Never from a website, never from the popup.
//   - Being offline is not being refunded. A network error, a timeout or a
//     server error keeps whatever was last known; only a clear answer from
//     Polar (revoked, disabled, unknown key) turns Pro off.
//   - Losing Pro never weakens a protection that is already running. That rule
//     lives in each feature (a running Seal is honoured without asking this
//     module), but it is why nothing here clears or changes their state.
//
// Like the PIN, this lives in this browser's storage. It is not copy
// protection: anyone can edit an extension's code. The people who pay are the
// honest ones, and this is built for them.

(() => {
  "use strict";

  if (window.SievePro) return;

  const LICENCE_KEY = "proLicence";

  // From the Polar dashboard: Monolab's store, the one BlockNSFW's Supporter
  // sells through too. `mode` is "sandbox" while testing with Polar's test
  // store and "live" for real purchases; a key from one does not open the
  // other, and the sandbox has its own organisation and benefit ids.
  const CONFIG = {
    mode: "live",
    organizationId: "354a2f6c-8ea7-46a7-87c5-f97645c12e29",
    api: { sandbox: "https://sandbox-api.polar.sh", live: "https://api.polar.sh" },
    // The benefit(s) that grant Sieve Pro. Required: every product in the store
    // shares the organisation id, so this is what tells a Sieve Pro key from a
    // BlockNSFW one. Until it is set, Pro cannot be activated.
    benefitIds: [],
    // Without it the settings page hides the Buy button.
    checkoutUrl: "",
    priceLabel: "$24",
  };

  const DAY = 24 * 60 * 60 * 1000;
  const REFRESH_EVERY_MS = 7 * DAY;
  const TIMEOUT_MS = 15000;

  // "granted" is the only status that unlocks anything. "invalid" is ours:
  // a key Polar does not know, or one for a different product.
  const STATUSES = ["granted", "revoked", "disabled", "invalid"];

  function normalizeLicence(raw) {
    if (!raw || typeof raw !== "object") return null;
    const key = typeof raw.key === "string" ? raw.key.trim() : "";
    if (!key) return null;
    return {
      key,
      displayKey: typeof raw.displayKey === "string" && raw.displayKey ? raw.displayKey : maskKey(key),
      status: STATUSES.includes(raw.status) ? raw.status : "invalid",
      benefitId: typeof raw.benefitId === "string" ? raw.benefitId : "",
      expiresAt: Number.isFinite(raw.expiresAt) ? raw.expiresAt : null,
      checkedAt: Number.isFinite(raw.checkedAt) ? raw.checkedAt : 0,
    };
  }

  // "****-E304DA": enough to tell two keys apart, not enough to use one.
  function maskKey(key) {
    const tail = String(key).replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase();
    return tail ? `****-${tail}` : "****";
  }

  // A pure decision, so it can be tested without storage.
  function isProState(licence, now = Date.now()) {
    const l = normalizeLicence(licence);
    if (!l || l.status !== "granted") return false;
    return l.expiresAt === null || now < l.expiresAt;
  }

  function isConfigured() {
    return !!CONFIG.organizationId && CONFIG.benefitIds.length > 0;
  }

  function apiBase() {
    return CONFIG.api[CONFIG.mode] || CONFIG.api.live;
  }

  async function getLicence() {
    const stored = await chrome.storage.local.get(LICENCE_KEY);
    return normalizeLicence(stored[LICENCE_KEY]);
  }

  async function isPro(now = Date.now()) {
    try {
      return isProState(await getLicence(), now);
    } catch {
      return false;
    }
  }

  // Polar's answer, read into our own shape.
  //   { ok: true,  status, benefitId, displayKey, expiresAt }  a clear answer
  //   { ok: false, offline: true }                             no clear answer
  function readAnswer(body) {
    const status = STATUSES.includes(body && body.status) ? body.status : "invalid";
    const benefitId = body && typeof body.benefit_id === "string" ? body.benefit_id : "";
    const wrongProduct = !CONFIG.benefitIds.includes(benefitId);
    const expires = body && body.expires_at ? Date.parse(body.expires_at) : NaN;
    return {
      ok: true,
      status: wrongProduct ? "invalid" : status,
      benefitId,
      displayKey: body && typeof body.display_key === "string" ? body.display_key : "",
      expiresAt: Number.isFinite(expires) ? expires : null,
    };
  }

  async function validate(key) {
    if (!isConfigured()) return { ok: false, offline: true, reason: "not-configured" };
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
    let res;
    try {
      res = await fetch(`${apiBase()}/v1/customer-portal/license-keys/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, organization_id: CONFIG.organizationId }),
        credentials: "omit",
        cache: "no-store",
        signal: controller ? controller.signal : undefined,
      });
    } catch {
      return { ok: false, offline: true };
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (res.ok) {
      let body = null;
      try {
        body = await res.json();
      } catch {
        return { ok: false, offline: true };
      }
      return readAnswer(body);
    }
    // A 4xx is Polar saying no: an unknown key (404), a malformed one (422), a
    // key it will not validate (403). Rate limits and timeouts are not answers.
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      return { ok: true, status: "invalid", benefitId: "", displayKey: "", expiresAt: null };
    }
    return { ok: false, offline: true };
  }

  function licenceFrom(key, answer, now) {
    return normalizeLicence({
      key,
      displayKey: answer.displayKey || maskKey(key),
      status: answer.status,
      benefitId: answer.benefitId,
      expiresAt: answer.expiresAt,
      checkedAt: now,
    });
  }

  // Enter a key from the settings page. Only a granted key is kept: a mistyped
  // one should not replace a good licence already stored.
  //   { ok: true }                       Pro is on
  //   { ok: false, status }              Polar said no (status says why)
  //   { ok: false, offline: true }       could not ask; try again later
  async function activate(rawKey, now = Date.now()) {
    const key = String(rawKey == null ? "" : rawKey).trim();
    if (!key) return { ok: false, status: "invalid" };
    const answer = await validate(key);
    if (!answer.ok) return answer;
    if (answer.status !== "granted") return { ok: false, status: answer.status };
    if (answer.expiresAt !== null && now >= answer.expiresAt) return { ok: false, status: "revoked" };
    await chrome.storage.local.set({ [LICENCE_KEY]: licenceFrom(key, answer, now) });
    return { ok: true };
  }

  // Re-check a stored licence once it is a week old. A refund shows up here as
  // "revoked", which is kept (so the settings page can say what happened)
  // rather than deleted.
  async function refreshIfDue(now = Date.now()) {
    const licence = await getLicence();
    if (!licence) return { checked: false };
    // A clock moved backwards would otherwise postpone the check for as long
    // as it was moved; checking early costs nothing.
    const age = now - licence.checkedAt;
    if (age >= 0 && age < REFRESH_EVERY_MS) return { checked: false };
    const answer = await validate(licence.key);
    if (!answer.ok) return { checked: false, offline: true };
    await chrome.storage.local.set({ [LICENCE_KEY]: licenceFrom(licence.key, answer, now) });
    return { checked: true, status: answer.status };
  }

  // Taking the key out is the person's own call and needs no gate: Pro going
  // away never weakens a protection that is already running.
  async function forget() {
    await chrome.storage.local.remove(LICENCE_KEY);
  }

  window.SievePro = {
    LICENCE_KEY,
    CONFIG,
    REFRESH_EVERY_MS,
    normalizeLicence,
    maskKey,
    isProState,
    isConfigured,
    apiBase,
    getLicence,
    isPro,
    validate,
    activate,
    refreshIfDue,
    forget,
  };
})();

// common/pro.js
// Sieve — Sieve Pro, the one-time purchase that unlocks the Pro features.
//
// Every protection stays free, the Seal included. Pro adds comfort and insight
// on top (the urge screen, streaks), and this module answers one question for
// both: has this browser got a valid Pro licence?
//
// This file is open source on purpose, like BlockNSFW's shared/supporter.js:
// it is the one part of Pro that talks to the network, so anyone can read
// exactly what it sends. The features themselves are not open source; store
// builds copy them over the stand-ins in pro/ (pro/README.md).
//
// The licence is a key sold through Polar (polar.sh), which emails it to the
// buyer. It is checked against Polar's public licence endpoints, which need no
// secret and are made for apps that run on the buyer's own machine. A key
// works on a few browsers at once: Polar's activation limit on the licence-key
// benefit, set in Polar, as BlockNSFW's is. Entering the key takes one of its
// places, named for the browser ("Sieve · Edge on Windows"); "Remove from this
// browser" gives the place back, so the key can move. With no limit set in
// Polar, a key simply works wherever it is entered. Decisions that hold it up:
//
//   - The only things ever sent are the key, Sieve's organisation id, that
//     browser name, and this browser's place on the key; only from the
//     settings page: when a key is entered or removed, then at most once a
//     week. Never from a website, never from the popup.
//   - Firefox asks before an extension sends anything off the device. The key
//     is declared as optional "authenticationInfo" (manifest.firefox.json), so
//     the question is asked of someone who presses Activate, and nobody else.
//     Without that yes, nothing is sent.
//   - Being offline is not being refunded. A network error, a timeout or a
//     server error keeps whatever was last known; only a clear answer from
//     Polar (revoked, disabled, unknown key, this browser's place given back)
//     turns Pro off.
//   - Losing Pro never weakens a protection. Nothing that protects asks this
//     module anything, and nothing here clears or changes their state.
//
// Like the PIN, this lives in this browser's storage. It is not copy
// protection: anyone can edit an extension's code. The people who pay are the
// honest ones, and this is built for them.

(() => {
  "use strict";

  if (window.SievePro) return;

  const LICENCE_KEY = "proLicence";

  // From the Polar dashboard: Monolab's store, the one BlockNSFW's Supporter
  // sells through too. `mode` is "live" for real purchases and "sandbox" for
  // Polar's test store, which is a separate copy with its own organisation,
  // product and benefit; a key from one does not open the other. Shipped
  // builds are live; `build-chrome.ps1 -Sandbox` makes a test build that
  // switches this one word in its own copy (build-pro.mjs).
  const CONFIG = {
    mode: "live",
    stores: {
      live: {
        organizationId: "354a2f6c-8ea7-46a7-87c5-f97645c12e29",
        // The benefit(s) that grant Sieve Pro. Required: every product in the
        // store shares the organisation id, so this is what tells a Sieve Pro
        // key from a BlockNSFW one. Until it is set, Pro cannot be activated.
        benefitIds: ["4c41be51-3c05-44a5-ac59-76108b4b8b6c"],
        // Without it the settings page hides the Buy button. Sieve Pro at
        // $34.99, with the $10 launch discount preset on the link until
        // 2 January 2027 (see `launch` below).
        checkoutUrl: "https://buy.polar.sh/polar_cl_qjDvSCcQ0ADA26pvzsvFIutGFMuX0HVcE4EwI2ZOsU1",
        api: "https://api.polar.sh",
        // Where buyers find their key and see the browsers it is on.
        portal: "https://polar.sh/monolab/portal",
      },
      sandbox: {
        organizationId: "35c82b93-77a2-4b87-8478-39fc5dd4e666",
        benefitIds: ["128feed7-d174-4ea4-a623-8bb26140935a"],
        checkoutUrl: "https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_nMckDrg0py2tVxqLjBPTm96ZqBomNzo7lS5nV2amxgc/redirect",
        api: "https://sandbox-api.polar.sh",
        portal: "https://sandbox.polar.sh/monolab/portal",
      },
    },
    priceLabel: "$34.99",
    // A launch price, quoted until the day `until` begins (in the buyer's
    // own time zone) and then gone by itself, so Settings never quotes a
    // price the checkout has stopped charging. It only says what the price
    // is: the product's price in Polar has to change on the same day.
    launch: { priceLabel: "$24.99", until: "2027-01-01" },
  };

  function store() {
    return CONFIG.stores[CONFIG.mode] || CONFIG.stores.live;
  }

  const DAY = 24 * 60 * 60 * 1000;
  const REFRESH_EVERY_MS = 7 * DAY;
  const TIMEOUT_MS = 15000;

  // "granted" is the only status that unlocks anything. "invalid" is ours: a
  // key Polar does not know, or one for a different product. "removed" is
  // ours too: the key still works, but this browser's place on it was given
  // back (on the purchases page, or every place was taken by the time a limit
  // was set).
  const STATUSES = ["granted", "revoked", "disabled", "invalid", "removed"];

  const CONSENT = { data_collection: ["authenticationInfo"] };

  function normalizeLicence(raw) {
    if (!raw || typeof raw !== "object") return null;
    const key = typeof raw.key === "string" ? raw.key.trim() : "";
    if (!key) return null;
    const limit = Math.floor(Number(raw.limit));
    return {
      key,
      displayKey: typeof raw.displayKey === "string" && raw.displayKey ? raw.displayKey : maskKey(key),
      status: STATUSES.includes(raw.status) ? raw.status : "invalid",
      benefitId: typeof raw.benefitId === "string" ? raw.benefitId : "",
      expiresAt: Number.isFinite(raw.expiresAt) ? raw.expiresAt : null,
      checkedAt: Number.isFinite(raw.checkedAt) ? raw.checkedAt : 0,
      activationId: typeof raw.activationId === "string" ? raw.activationId : "",
      limit: limit > 0 ? limit : 0,
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
    const s = store();
    return !!s.organizationId && s.benefitIds.length > 0;
  }

  // The price Settings quotes: the launch price until it ends, then the full
  // one. { label, regular, launch, lastDay }: lastDay is the launch price's
  // last day, or null when there is no launch price (any more).
  function price(now = Date.now()) {
    const regular = CONFIG.priceLabel;
    const full = { label: regular, regular, launch: false, lastDay: null };
    const l = CONFIG.launch;
    const m = l && l.priceLabel && /^(\d{4})-(\d{2})-(\d{2})$/.exec(l.until || "");
    if (!m) return full;
    const ends = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!(now < ends.getTime())) return full;
    const lastDay = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - 1);
    return { label: l.priceLabel, regular, launch: true, lastDay };
  }

  function apiBase() {
    return store().api;
  }

  function portalUrl() {
    return store().portal;
  }

  function checkoutUrl() {
    return store().checkoutUrl;
  }

  // What this browser is called on the purchases page, so a buyer can tell
  // their browsers apart: "Sieve · Edge on Windows". Nothing more.
  function deviceLabel() {
    const ua = typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent : "";
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /OPR\//.test(ua) ? "Opera" : "Chrome";
    const os = /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /CrOS/.test(ua) ? "ChromeOS"
      : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
    return `Sieve · ${browser}${os ? ` on ${os}` : ""}`;
  }

  // --- Firefox's consent ------------------------------------------------------

  // True only in the Firefox build, which declares the key as optional data.
  function needsConsent() {
    try {
      const gecko = chrome.runtime.getManifest().browser_specific_settings;
      const optional = gecko && gecko.gecko && gecko.gecko.data_collection_permissions
        ? gecko.gecko.data_collection_permissions.optional
        : null;
      return Array.isArray(optional) && optional.includes("authenticationInfo");
    } catch {
      return false;
    }
  }

  async function hasConsent() {
    if (!needsConsent()) return true;
    try {
      return await chrome.permissions.contains(CONSENT);
    } catch {
      return true; // a Firefox older than its consent framework has nothing to ask
    }
  }

  // Must be called straight from a click, before anything is awaited: Firefox
  // only shows its question in answer to the person's own action.
  function askConsent() {
    if (!needsConsent()) return Promise.resolve(true);
    const older = (err) => !/user input|handler/i.test(String(err && err.message));
    try {
      return Promise.resolve(chrome.permissions.request(CONSENT)).catch(older);
    } catch (err) {
      return Promise.resolve(older(err));
    }
  }

  // --- Asking Polar -----------------------------------------------------------

  // One request. { status, body } when Polar answered (body null when there was
  // none to read), or { offline: true } when it did not.
  async function call(path, payload) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
    let res;
    try {
      res = await fetch(`${apiBase()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        cache: "no-store",
        signal: controller ? controller.signal : undefined,
      });
    } catch {
      return { offline: true };
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res.ok || res.status === 204) return { status: res.status, body: null };
    try {
      return { status: res.status, body: await res.json() };
    } catch {
      return { offline: true }; // an answer that could not be read is no answer
    }
  }

  // A 4xx is Polar saying no: an unknown key (404), a malformed one (422), a
  // key it will not validate (403). Rate limits and timeouts are not answers.
  function saysNo(status) {
    return status >= 400 && status < 500 && status !== 408 && status !== 429;
  }

  const NO = { ok: true, status: "invalid", benefitId: "", displayKey: "", expiresAt: null, limit: 0 };

  // Polar's answer, read into our own shape.
  //   { ok: true, status, benefitId, displayKey, expiresAt, limit }  a clear answer
  //   { ok: false, offline: true, reason? }                          no clear answer
  function readAnswer(body) {
    const status = STATUSES.includes(body && body.status) ? body.status : "invalid";
    const benefitId = body && typeof body.benefit_id === "string" ? body.benefit_id : "";
    const wrongProduct = !store().benefitIds.includes(benefitId);
    const expires = body && body.expires_at ? Date.parse(body.expires_at) : NaN;
    const limit = Math.floor(Number(body && body.limit_activations));
    return {
      ok: true,
      status: wrongProduct ? "invalid" : status,
      benefitId,
      displayKey: body && typeof body.display_key === "string" ? body.display_key : "",
      expiresAt: Number.isFinite(expires) ? expires : null,
      limit: limit > 0 ? limit : 0,
    };
  }

  async function validate(key, activationId) {
    if (!isConfigured()) return { ok: false, offline: true, reason: "not-configured" };
    if (!(await hasConsent())) return { ok: false, offline: true, reason: "no-consent" };
    const payload = { key, organization_id: store().organizationId };
    if (activationId) payload.activation_id = activationId;
    const r = await call("/v1/customer-portal/license-keys/validate", payload);
    if (r.offline) return { ok: false, offline: true };
    if (r.status >= 200 && r.status < 300 && r.body) return readAnswer(r.body);
    if (saysNo(r.status)) return NO;
    return { ok: false, offline: true };
  }

  // Takes one of the key's places for this browser.
  //   { ok: true, activationId } | { ok: false, status: "full" | "invalid", limit? } | { ok: false, offline: true }
  async function takePlace(key, limit) {
    const r = await call("/v1/customer-portal/license-keys/activate", {
      key,
      organization_id: store().organizationId,
      label: deviceLabel(),
    });
    if (r.offline) return { ok: false, offline: true };
    if (r.status === 403) return { ok: false, status: "full", limit };
    if (r.status >= 200 && r.status < 300 && r.body && r.body.id) return { ok: true, activationId: String(r.body.id) };
    if (saysNo(r.status)) return { ok: false, status: "invalid" };
    return { ok: false, offline: true };
  }

  // Granted, but run out, reads as revoked: either way the key no longer opens Pro.
  function statusOf(answer, now) {
    if (answer.status === "granted" && answer.expiresAt !== null && now >= answer.expiresAt) return "revoked";
    return answer.status;
  }

  function licenceFrom(key, answer, now, activationId, status = statusOf(answer, now)) {
    return normalizeLicence({
      key,
      displayKey: answer.displayKey || maskKey(key),
      status,
      benefitId: answer.benefitId,
      expiresAt: answer.expiresAt,
      checkedAt: now,
      activationId,
      limit: answer.limit,
    });
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

  async function keep(licence) {
    await chrome.storage.local.set({ [LICENCE_KEY]: licence });
    return licence;
  }

  // Enter a key from the settings page (after askConsent, in Firefox). Only a
  // granted key is kept: a mistyped one should not replace a good licence.
  //   { ok: true }                                   Pro is on
  //   { ok: false, status }                          Polar said no ("full": every place taken)
  //   { ok: false, offline: true, reason? }          could not ask; try again later
  async function activate(rawKey, now = Date.now()) {
    const key = String(rawKey == null ? "" : rawKey).trim();
    if (!key) return { ok: false, status: "invalid" };

    // The same key entered again here keeps its place rather than taking a second.
    const held = await getLicence();
    if (held && held.key === key && held.activationId && held.status !== "removed") {
      const again = await validate(key, held.activationId);
      if (!again.ok) return again;
      if (statusOf(again, now) === "granted") {
        await keep(licenceFrom(key, again, now, held.activationId));
        return { ok: true };
      }
    }

    const answer = await validate(key);
    if (!answer.ok) return answer;
    const status = statusOf(answer, now);
    if (status !== "granted") return { ok: false, status };

    let activationId = "";
    if (answer.limit > 0) {
      const place = await takePlace(key, answer.limit);
      if (!place.ok) return place;
      activationId = place.activationId;
    }
    await keep(licenceFrom(key, answer, now, activationId));
    return { ok: true };
  }

  // Re-check a granted licence once it is a week old. A refund shows up as
  // "revoked" and a place given back as "removed"; both are kept (so the
  // settings page can say what happened) rather than deleted.
  async function refreshIfDue(now = Date.now()) {
    const licence = await getLicence();
    if (!licence || licence.status !== "granted") return { checked: false };
    // A clock moved backwards would otherwise postpone the check for as long
    // as it was moved; checking early costs nothing.
    const age = now - licence.checkedAt;
    if (age >= 0 && age < REFRESH_EVERY_MS) return { checked: false };

    const { key, activationId } = licence;
    const done = async (next) => ({ checked: true, status: (await keep(next)).status });
    const answer = await validate(key, activationId);
    if (!answer.ok) return { checked: false, offline: true };

    if (statusOf(answer, now) === "granted") {
      if (answer.limit > 0 && !activationId) {
        // Polar's limit came in after this key was entered here.
        const place = await takePlace(key, answer.limit);
        if (place.ok) return done(licenceFrom(key, answer, now, place.activationId));
        if (place.status) return done(licenceFrom(key, answer, now, "", place.status === "full" ? "removed" : "invalid"));
        return { checked: false, offline: true };
      }
      return done(licenceFrom(key, answer, now, activationId));
    }

    if (activationId) {
      // A no, asked with this browser's place: either the key is over, or only
      // the place was given back. Asked again without it to tell which.
      const plain = await validate(key);
      if (!plain.ok) return { checked: false, offline: true };
      if (statusOf(plain, now) === "granted") return done(licenceFrom(key, plain, now, "", "removed"));
      return done(licenceFrom(key, plain, now, ""));
    }
    return done(licenceFrom(key, answer, now, ""));
  }

  // "Remove from this browser": gives this browser's place on the key back,
  // then forgets the key here. Offline, nothing changes: forgetting the key
  // without telling Polar would leave the place taken. Needs no gate: Pro
  // going away never weakens a protection that is already running.
  //   { ok: true } | { ok: false, offline: true }
  async function release() {
    const licence = await getLicence();
    if (licence && licence.activationId && licence.status === "granted") {
      if (!(await hasConsent())) return { ok: false, offline: true, reason: "no-consent" };
      const r = await call("/v1/customer-portal/license-keys/deactivate", {
        key: licence.key,
        organization_id: store().organizationId,
        activation_id: licence.activationId,
      });
      // 404: Polar has no such place any more, which is what was asked for.
      const given = !r.offline && ((r.status >= 200 && r.status < 300) || r.status === 404);
      if (!given) return { ok: false, offline: true };
    }
    await chrome.storage.local.remove(LICENCE_KEY);
    return { ok: true };
  }

  window.SievePro = {
    LICENCE_KEY,
    CONFIG,
    REFRESH_EVERY_MS,
    normalizeLicence,
    maskKey,
    isProState,
    isConfigured,
    price,
    apiBase,
    portalUrl,
    checkoutUrl,
    deviceLabel,
    needsConsent,
    hasConsent,
    askConsent,
    getLicence,
    isPro,
    validate,
    activate,
    refreshIfDue,
    release,
  };
})();

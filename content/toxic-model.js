// content/toxic-model.js
// Toxic Comment Hider — LAYER 2 driver (Module 4A, Step 7).
//
// Only active when the user has enabled + downloaded the optional model. It does
// NOT contain TensorFlow.js — the model runs in the offscreen document. This
// script just decides WHICH comments to check and collapses the toxic ones:
//
//   - Considers only comments Layer 1 passed as clean (data-sieve-l1="clean").
//   - Classifies only comments near the viewport (IntersectionObserver).
//   - Batches them (up to 16) before asking the model, so we cross into the
//     offscreen document rarely.
//   - Picks up lazy-loaded comments (MutationObserver on the data-sieve-l1 mark).
//   - Collapses model-flagged comments with the same UI as Layer 1.
//
// Privacy: comment text goes content script -> service worker -> offscreen doc,
// all inside the browser. Nothing is sent to any server.

(() => {
  "use strict";

  if (window.__sieveToxicModelActive) return;
  window.__sieveToxicModelActive = true;

  const Sieve = window.__sieveToxic;
  if (!Sieve || !Sieve.site) return; // not a supported comment surface
  const site = Sieve.site;

  // sensitivity → minimum toxic probability to hide.
  const THRESHOLDS = { strict: 0.7, moderate: 0.85, light: 0.92 };
  const LABEL_TEXT = {
    identity_attack: "identity attack",
    insult: "insult",
    obscene: "obscene language",
    severe_toxicity: "severe toxicity",
    sexual_explicit: "sexual content",
    threat: "threat",
    toxicity: "toxic",
  };

  const BATCH_SIZE = 16;
  const FLUSH_MS = 500;
  const MAX_TEXT = 600; // cap chars sent per comment

  let enabled = false;
  let threshold = THRESHOLDS.moderate;

  let observed = new WeakSet();
  let io = null;
  let mo = null;
  const pending = [];
  let flushTimer = null;

  // --- find Layer-1-clean comments and watch them for entering the viewport -
  function registerCandidates() {
    if (!io) return;
    const els = document.querySelectorAll('[data-sieve-l1="clean"]:not([data-sieve-l2])');
    for (const el of els) {
      if (observed.has(el)) continue;
      observed.add(el);
      io.observe(el);
    }
  }

  function onIntersect(entries) {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      io.unobserve(el);
      if (el.getAttribute("data-sieve-l2")) continue;
      el.setAttribute("data-sieve-l2", "pending");
      pending.push(el);
    }
    scheduleFlush();
  }

  function scheduleFlush() {
    if (pending.length >= BATCH_SIZE) {
      flush();
      return;
    }
    if (flushTimer) return;
    flushTimer = setTimeout(flush, FLUSH_MS);
  }

  let flushing = false;

  async function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    // One batch in flight at a time; the finally re-schedules any leftovers.
    if (flushing || !enabled || pending.length === 0) return;
    flushing = true;
    try {
      const batch = pending.splice(0, BATCH_SIZE);
      const items = batch.map((el) => {
        const textEl = el.querySelector(site.text);
        const text = textEl ? Sieve.extractText(textEl).trim().slice(0, MAX_TEXT) : "";
        return { el, text };
      });

      // Empty comments need no model pass.
      const toSend = items.filter((it) => it.text.length > 0);
      for (const it of items) {
        if (it.text.length === 0) it.el.setAttribute("data-sieve-l2", "clean");
      }
      if (toSend.length === 0) return;

      let resp;
      try {
        resp = await chrome.runtime.sendMessage({
          type: "sieve:classify",
          texts: toSend.map((it) => it.text),
        });
      } catch {
        // Background unavailable — mark clean so we don't loop. Layer 1 still protects.
        for (const it of toSend) it.el.setAttribute("data-sieve-l2", "clean");
        return;
      }

      if (!resp || !resp.ok || !Array.isArray(resp.results)) {
        for (const it of toSend) it.el.setAttribute("data-sieve-l2", "clean");
        return;
      }

      resp.results.forEach((r, i) => {
        const el = toSend[i].el;
        if (r && r.prob >= threshold) {
          el.setAttribute("data-sieve-l2", "flagged");
          const reason = LABEL_TEXT[r.label] || "toxic";
          if (typeof Sieve.collapse === "function") {
            Sieve.collapse(el, { layer: 2, reason, words: [] });
          }
        } else {
          el.setAttribute("data-sieve-l2", "clean");
        }
      });
    } finally {
      flushing = false;
      if (enabled && pending.length) scheduleFlush();
    }
  }

  // --- lifecycle -----------------------------------------------------------
  function start() {
    io = new IntersectionObserver(onIntersect, { rootMargin: "200px" });
    registerCandidates();
    mo = new MutationObserver(() => {
      const cb = () => registerCandidates();
      if (window.requestIdleCallback) requestIdleCallback(cb, { timeout: 1000 });
      else setTimeout(cb, 200);
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-sieve-l1"],
    });
  }

  function stop() {
    if (io) {
      io.disconnect();
      io = null;
    }
    if (mo) {
      mo.disconnect();
      mo = null;
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    pending.length = 0;
    observed = new WeakSet();
    // Reveal model-collapsed comments and clear our marks so a re-enable is clean.
    if (typeof Sieve.restoreLayer === "function") Sieve.restoreLayer(2);
    for (const el of document.querySelectorAll("[data-sieve-l2]")) {
      el.removeAttribute("data-sieve-l2");
    }
  }

  async function loadState() {
    const s = await chrome.storage.local.get({
      toxicModelEnabled: false,
      toxicSensitivity: "moderate",
      toxicHiderEnabled: true,
      toxicSiteToggles: {},
    });
    const siteOn = s.toxicHiderEnabled && s.toxicSiteToggles[site.name] !== false;
    enabled = s.toxicModelEnabled && siteOn;
    threshold = THRESHOLDS[s.toxicSensitivity] || THRESHOLDS.moderate;
  }

  async function apply() {
    await loadState();
    stop();
    if (enabled) start();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const keys = ["toxicModelEnabled", "toxicSensitivity", "toxicHiderEnabled", "toxicSiteToggles"];
    if (keys.some((k) => k in changes)) apply();
  });

  apply();
})();

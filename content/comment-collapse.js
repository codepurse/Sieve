// content/comment-collapse.js
// Sieve — Toxic Comment Hider, collapse UI (Module 4A, Step 3).
//
// Provides the reversible "collapse" experience for comments that Layer 1 (the
// word list) or Layer 2 (the optional model) flags. It registers two functions
// on the shared window.__sieveToxic namespace:
//
//   Sieve.collapse(el, info)  — collapse a comment with a reason label
//   Sieve.restoreAll()        — un-collapse everything (used on disable/rescan)
//
// profanity-filter.js calls Sieve.collapse the moment a comment is flagged.
// Because this file is listed FIRST in the manifest, that function already
// exists by the time the filter runs.
//
// Design choice: we hide the comment's content by adding a class to the comment
// element and inserting our bar as its FIRST CHILD. The bar lives *inside* the
// comment, so if a single-page app recycles/removes the comment, our UI goes
// with it — no orphaned "Hidden by Sieve" bars left floating on the page. The
// comment is never deleted; collapsing is always reversible.

(() => {
  "use strict";

  if (window.__sieveCollapseActive) return;
  window.__sieveCollapseActive = true;

  const Sieve = (window.__sieveToxic = window.__sieveToxic || {});

  // el -> { el, info, ui:{bar,text,btn}, collapsed }
  const managed = new Map();
  let collapsedCount = 0;

  // --- Inject our stylesheet once per frame --------------------------------
  let stylesReady = false;
  function ensureStyles() {
    if (stylesReady) return;
    stylesReady = true;
    const style = document.createElement("style");
    style.id = "sieve-cc-styles";
    style.textContent = `
      .sieve-cc-host > :not(.sieve-cc-bar) { display: none !important; }
      .sieve-cc-bar {
        display: flex !important; align-items: center; gap: 8px;
        margin: 4px 0; padding: 8px 12px; box-sizing: border-box;
        font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: inherit;
        background: rgba(127,127,127,0.12);
        border: 1px solid rgba(127,127,127,0.32);
        border-radius: 10px;
      }
      .sieve-cc-bar.is-shown { opacity: 0.7; }
      .sieve-cc-icon { font-size: 14px; line-height: 1; flex: 0 0 auto; }
      .sieve-cc-text { flex: 1 1 auto; min-width: 0; }
      .sieve-cc-reason { opacity: 0.75; }
      .sieve-cc-btn {
        flex: 0 0 auto; cursor: pointer; font: inherit; font-weight: 600;
        color: inherit; background: transparent;
        border: 1px solid currentColor; border-radius: 6px;
        padding: 3px 10px; opacity: 0.85;
      }
      .sieve-cc-btn:hover { opacity: 1; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // --- Friendly reason text ------------------------------------------------
  function reasonText(info) {
    return info && info.reason ? String(info.reason) : "flagged content";
  }

  // --- Build the collapse bar ----------------------------------------------
  function buildBar(el) {
    const bar = document.createElement("div");
    bar.className = "sieve-cc-bar";

    const icon = document.createElement("span");
    icon.className = "sieve-cc-icon";
    icon.textContent = "🧹";

    const text = document.createElement("span");
    text.className = "sieve-cc-text";

    const btn = document.createElement("button");
    btn.className = "sieve-cc-btn";
    btn.type = "button";

    bar.append(icon, text, btn);

    // Keep clicks inside our bar from reaching the host site's handlers
    // (e.g. a tweet's navigate-on-click).
    bar.addEventListener("click", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle(el);
    });

    return { bar, text, btn };
  }

  // --- Render an entry in its current (collapsed / shown) state -------------
  function render(entry) {
    const { el, ui, info, collapsed } = entry;
    el.classList.toggle("sieve-cc-host", collapsed);
    ui.bar.classList.toggle("is-collapsed", collapsed);
    ui.bar.classList.toggle("is-shown", !collapsed);
    if (collapsed) {
      ui.text.textContent = "Hidden by Sieve · ";
      const reason = document.createElement("span");
      reason.className = "sieve-cc-reason";
      reason.textContent = reasonText(info);
      ui.text.appendChild(reason);
      ui.btn.textContent = "Show anyway";
    } else {
      ui.text.textContent = "Shown — flagged by Sieve";
      ui.btn.textContent = "Hide";
    }
  }

  // --- Flip a single comment between collapsed and shown --------------------
  function toggle(el) {
    const entry = managed.get(el);
    if (!entry) return;
    entry.collapsed = !entry.collapsed;
    collapsedCount += entry.collapsed ? 1 : -1;
    render(entry);
  }

  // --- Public: collapse a comment ------------------------------------------
  function collapse(el, info) {
    if (!el || !el.isConnected) return;
    const existing = managed.get(el);
    if (existing) {
      existing.info = info; // refresh reason (e.g. Layer 2 upgrades the label)
      if (existing.collapsed) render(existing);
      return;
    }
    ensureStyles();
    const ui = buildBar(el);
    el.insertBefore(ui.bar, el.firstChild);
    const entry = { el, info, ui, collapsed: true };
    managed.set(el, entry);
    collapsedCount++;

    // Feed the shared Protection Dashboard stats store.
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "toxicComments", count: 1 })
        .catch(() => {});
    } catch (err) {
      // Extension context may be unavailable in unusual conditions.
    }

    render(entry);
  }

  // --- Public: restore one / all ------------------------------------------
  function restore(entry) {
    entry.el.classList.remove("sieve-cc-host");
    if (entry.ui.bar.parentNode) entry.ui.bar.remove();
    if (entry.collapsed) collapsedCount--;
  }

  function restoreAll() {
    for (const entry of managed.values()) restore(entry);
    managed.clear();
    collapsedCount = 0;
  }

  // Reveal only the comments collapsed by a given layer (1 = word list,
  // 2 = model). Used when the optional model is turned off mid-page.
  function restoreLayer(layer) {
    for (const entry of [...managed.values()]) {
      if (entry.info && entry.info.layer === layer) {
        restore(entry);
        managed.delete(entry.el);
      }
    }
  }

  // --- Expose API ----------------------------------------------------------
  Sieve.collapse = collapse;
  Sieve.restoreAll = restoreAll;
  Sieve.restoreLayer = restoreLayer;
  Sieve.getCollapseCount = () => collapsedCount;
})();

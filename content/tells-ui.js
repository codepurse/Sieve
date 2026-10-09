// content/tells-ui.js
// Sieve — what the Dark Pattern Blocker draws on a page: the stamp beside a
// finding (the ladder's "label" step), the note that covers one (its "cover"
// step), a note beside one (a free trial's plain terms), the free-trial
// reminder banner, and the ring that answers the toolbar popup's "Show me".
//
// NOT a manifest content script. Most pages never have anything to draw, and
// every byte injected into every page is a cost every page pays, so this is
// injected on demand: the first time a page has a finding that needs drawing,
// content/dark-patterns.js asks the service worker (sieve:tells-ui) to run
// this file in the same isolated world. Until then a finding waits; see
// applyLevel() there.
//
// Each drawing lives in a closed shadow root on a host element of our own, so
// the page's CSS cannot restyle it, the shared text walk cannot read our words
// back as a dark pattern, and the host carries the coordinator's marker
// attribute so nothing here is ever scanned. The colours are Sieve's own paper
// and ink, fixed, so they read on any page.

(() => {
  "use strict";

  if (window.SieveTellsUI) return;

  // content/dark-patterns.js marks what it has handled with this attribute and
  // skips anything carrying it. Kept in step by hand: it is one string.
  const DATA_ATTR = "data-sieve-dp";

  const SANS = `"Segoe UI Variable Text", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  const MONO = `ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace`;
  const CSS = `
    .stamp { display: inline-block; margin-left: 6px; padding: 2px 5px; font: 600 10px/1.2 ${MONO};
      letter-spacing: 0.06em; text-transform: uppercase; color: #4b4840; background: #ece8df;
      border: 1px solid #8c877c; border-radius: 2px; vertical-align: middle; white-space: nowrap; cursor: help; }
    .cover { box-sizing: border-box; display: flex; align-items: center; gap: 12px; max-width: 640px;
      margin: 4px 0; padding: 9px 12px; color: #1a1916; background: #f2efe7;
      border: 1px solid rgba(26, 25, 22, 0.26); border-radius: 3px; font: 13px/1.45 ${SANS}; text-align: left; }
    .body { flex: 1; min-width: 0; }
    .kicker { display: block; font: 600 10px/1.3 ${MONO}; letter-spacing: 0.08em; text-transform: uppercase; color: #855600; }
    .title { display: block; margin-top: 2px; font-weight: 600; }
    .detail { display: block; margin-top: 1px; font-size: 12.5px; color: #4b4840; }
    .show { flex: none; padding: 5px 10px; font: 500 12px/1.2 ${SANS}; color: #1a1916; background: transparent;
      border: 1px solid rgba(26, 25, 22, 0.26); border-radius: 3px; cursor: pointer; }
    .show:hover { border-color: #1a1916; background: rgba(26, 25, 22, 0.045); }
    .show:focus-visible { outline: 2px solid #1a1916; outline-offset: 2px; }
    .ring { position: absolute; inset: 0; border: 2px solid #855600; border-radius: 4px;
      box-shadow: 0 0 0 4px rgba(133, 86, 0, 0.18); }
    .note { flex-wrap: wrap; align-items: flex-start; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .show:disabled { color: #66625a; border-color: rgba(26, 25, 22, 0.13); cursor: default; background: transparent; }
    .banner { position: relative; margin: 0; max-width: 400px; padding-right: 36px;
      box-shadow: 0 1px 0 rgba(26, 25, 22, 0.13), 0 18px 40px -18px rgba(26, 25, 22, 0.32); }
    .close { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; padding: 0; font: 16px/1 ${SANS};
      color: #4b4840; background: transparent; border: 0; border-radius: 3px; cursor: pointer; }
    .close:hover { color: #1a1916; background: rgba(26, 25, 22, 0.045); }
  `;

  function makeHost(kind, display) {
    const host = document.createElement("sieve-tell");
    host.setAttribute(DATA_ATTR, kind);
    host.style.cssText = `all: initial; display: ${display};`;
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);
    return { host, shadow };
  }

  function piece(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // Controls and media get the stamp AFTER them; anything else gets it inside,
  // at the end of its text.
  const STAMP_AFTER = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "IMG", "A", "VIDEO", "IFRAME"]);

  // The "label" step. Returns its undo.
  function addLabel(el, finding) {
    const { host, shadow } = makeHost("label", "inline-block");
    shadow.appendChild(piece("span", "stamp", finding.spec.label || "Sieve"));
    host.title = `Sieve: ${finding.spec.detail || finding.spec.title}`;
    if (STAMP_AFTER.has(el.tagName)) el.after(host);
    else el.appendChild(host);
    return () => host.remove();
  }

  // The "cover" step: the element hidden, and a note in its place saying what
  // Sieve found, with a button that puts it back. Returns its undo.
  function addCover(finding, onShow) {
    const el = finding.el;
    if (!el.parentNode) return null;
    // A cover in the middle of a sentence should sit in the sentence.
    const display = getComputedStyle(el).display;
    const { host, shadow } = makeHost("cover", display === "inline" ? "inline-block" : "block");

    const box = piece("div", "cover");
    box.setAttribute("role", "note");
    const body = piece("div", "body");
    body.appendChild(piece("span", "kicker", "Sieve covered this"));
    body.appendChild(piece("span", "title", finding.spec.title));
    if (finding.spec.detail) body.appendChild(piece("span", "detail", finding.spec.detail));
    const show = piece("button", "show", "Show it");
    show.type = "button";
    show.addEventListener("click", (event) => {
      // The cover may sit inside a link or a form: this click is ours.
      event.preventDefault();
      event.stopPropagation();
      onShow();
    });
    box.appendChild(body);
    box.appendChild(show);
    shadow.appendChild(box);

    const before = { value: el.style.getPropertyValue("display"), priority: el.style.getPropertyPriority("display") };
    el.style.setProperty("display", "none", "important");
    el.parentNode.insertBefore(host, el);
    finding.cover = host;

    return () => {
      host.remove();
      finding.cover = null;
      if (before.value) el.style.setProperty("display", before.value, before.priority);
      else el.style.removeProperty("display");
    };
  }

  // A row of buttons. Each runs its action and, if that settles on a new label
  // ("Reminder set"), shows it and stays pressed.
  function actionRow(actions, onAction) {
    const row = piece("div", "actions");
    for (const action of actions) {
      const button = piece("button", "show", action.label);
      button.type = "button";
      button.disabled = !!action.disabled;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        Promise.resolve(onAction(action.id)).catch(() => {
          button.disabled = false;
        });
      });
      row.appendChild(button);
    }
    return row;
  }

  // A note BESIDE something, not over it: the plain terms of a free trial,
  // under the offer that hides them. The page is left exactly as it is.
  // Returns its undo.
  function addNote(el, finding, note) {
    if (!el.parentNode) return null;
    const { host, shadow } = makeHost("note", "block");
    const box = piece("div", "cover note");
    box.setAttribute("role", "note");
    const body = piece("div", "body");
    body.appendChild(piece("span", "kicker", note.kicker || "Sieve"));
    body.appendChild(piece("span", "title", note.title));
    if (note.detail) body.appendChild(piece("span", "detail", note.detail));
    if (note.actions && note.actions.length) body.appendChild(actionRow(note.actions, note.onAction));
    box.appendChild(body);
    shadow.appendChild(box);
    el.after(host);
    return () => host.remove();
  }

  // A note that floats at the top of the page: a reminder the user asked for,
  // shown on whatever page they are on when it falls due. Its buttons close it.
  // Returns a function that removes it.
  function showBanner(banner) {
    const { host, shadow } = makeHost("banner", "block");
    host.style.cssText =
      "all: initial; display: block; position: fixed; top: 16px; right: 16px; z-index: 2147483646; max-width: calc(100vw - 32px);";
    const box = piece("div", "cover banner");
    box.setAttribute("role", "status");
    const body = piece("div", "body");
    body.appendChild(piece("span", "kicker", banner.kicker || "Sieve"));
    body.appendChild(piece("span", "title", banner.title));
    if (banner.detail) body.appendChild(piece("span", "detail", banner.detail));
    const remove = () => host.remove();
    body.appendChild(
      actionRow(banner.actions || [], (id) =>
        Promise.resolve(banner.onAction(id)).then(remove)
      )
    );
    const close = piece("button", "close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", () => {
      remove();
      if (typeof banner.onClose === "function") banner.onClose();
    });
    box.appendChild(body);
    box.appendChild(close);
    shadow.appendChild(box);
    document.documentElement.appendChild(host);
    return remove;
  }

  const RING_MS = 1800;

  function ring(target) {
    const { host, shadow } = makeHost("ring", "block");
    host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; pointer-events: none;";
    shadow.appendChild(piece("div", "ring"));
    document.documentElement.appendChild(host);
    const started = performance.now();
    const step = (now) => {
      const r = target.getBoundingClientRect();
      host.style.left = `${r.left - 4}px`;
      host.style.top = `${r.top - 4}px`;
      host.style.width = `${r.width + 8}px`;
      host.style.height = `${r.height + 8}px`;
      const age = now - started;
      host.style.opacity = age < RING_MS - 400 ? "1" : String(Math.max(0, (RING_MS - age) / 400));
      if (age < RING_MS && target.isConnected) requestAnimationFrame(step);
      else host.remove();
    };
    requestAnimationFrame(step);
  }

  // "Show me": scroll a finding into view and ring it. A countdown hidden at
  // the "defuse" step has no box of its own, so the ring goes round the
  // nearest ancestor that does.
  function showTell(finding) {
    let target = finding.cover && finding.cover.isConnected ? finding.cover : finding.el;
    while (target && target !== document.body && target.getClientRects().length === 0) {
      target = target.parentElement;
    }
    if (!target || !target.isConnected) return false;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    ring(target);
    return true;
  }

  window.SieveTellsUI = { addLabel, addCover, addNote, showBanner, showTell };
})();

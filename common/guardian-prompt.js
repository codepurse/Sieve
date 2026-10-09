// common/guardian-prompt.js
// Sieve — Guardian PIN prompt.
//
// An on-demand confirmation dialog shown when the user tries to WEAKEN their
// protection (turn a module off) while a PIN is set. Shared by the popup and
// the options page; it builds its own DOM + styles so it looks the same in both
// surfaces and never collides with the host page's CSS.
//
//   SieveGuardian.confirmUnlock(actionName) -> Promise<boolean>
//     Resolves true when the correct PIN is entered, false on cancel/Escape.
//     Resolves true immediately when no PIN is set (nothing to confirm).
//     With a cool-off set (common/cooloff.js) the change must first wait it
//     out: until then the dialog only offers to start or call off the wait, and
//     resolves false. Once the wait is over, the PIN is asked for as before.
//
//   SieveGuardian.gateToggleOff(checkbox, actionName) -> Promise<boolean>
//     Helper for on/off switches. Returns true if the change may proceed.
//     A switch being turned ON is always allowed. A switch being turned OFF
//     asks for the PIN; if that fails or is cancelled, the checkbox is reverted
//     to checked and the helper returns false.

(() => {
  "use strict";

  // Needs the PIN core, and only installs once per document.
  if (!window.SieveGuardian || window.SieveGuardian.confirmUnlock) return;

  const G = window.SieveGuardian;

  let overlay = null;
  let input = null;
  let errorEl = null;
  let subEl = null;
  let coolEl = null;
  let confirmBtn = null;
  let cancelBtn = null;
  let pending = null; // { resolve, actionName, critical, cooloffKey } for the dialog currently open

  // The dark palette, used twice below: under the system's dark mode unless
  // Sieve is set to Light, and always when it is set to Dark (common/theme.js).
  const SG_DARK = `
    --sg-paper: #1b1b18; --sg-ink: #ede9df; --sg-ink-2: #b8b3a7; --sg-ink-3: #8f8a7f;
    --sg-rule: rgba(237, 233, 223, 0.11); --sg-rule-strong: rgba(237, 233, 223, 0.22);
    --sg-wash: rgba(237, 233, 223, 0.06); --sg-danger: #e5866b; --sg-sunken: #131311;
    background: rgba(0, 0, 0, 0.55);`;

  function build() {
    if (overlay) return;

    // Self-contained: this dialog also opens on other people's sites (the
    // pause screen), so it carries its own copy of the paper-and-ink tokens
    // from common/sieve-ui.css, scoped to the dialog, and resets the few
    // properties a host page is likely to have styled on bare elements.
    const style = document.createElement("style");
    style.textContent = `
      .sg-backdrop {
        --sg-paper: #f9f7f2; --sg-ink: #1a1916; --sg-ink-2: #4b4840; --sg-ink-3: #66625a;
        --sg-rule: rgba(26, 25, 22, 0.13); --sg-rule-strong: rgba(26, 25, 22, 0.26);
        --sg-wash: rgba(26, 25, 22, 0.045); --sg-danger: #a63d24; --sg-sunken: #efece4;
        --sg-serif: "Iowan Old Style", "Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif;
        --sg-sans: "Segoe UI Variable Text", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        --sg-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        padding: 16px; box-sizing: border-box;
        background: rgba(20, 19, 16, 0.42);
        font: 14px/1.5 var(--sg-sans); color: var(--sg-ink);
        -webkit-font-smoothing: antialiased;
        animation: sg-fade 160ms cubic-bezier(0.2, 0, 0, 1) both;
      }
      @media (prefers-color-scheme: dark) {
        .sg-backdrop:not([data-theme="light"]) { ${SG_DARK} }
      }
      .sg-backdrop[data-theme="dark"] { ${SG_DARK} }
      .sg-backdrop[hidden] { display: none; }
      .sg-backdrop *, .sg-backdrop *::before, .sg-backdrop *::after { box-sizing: border-box; }
      .sg-card {
        width: min(360px, 100%); margin: 0;
        padding: 24px 24px 20px;
        background: var(--sg-paper); color: var(--sg-ink);
        border-radius: 6px;
        box-shadow: 0 0 0 1px var(--sg-rule-strong), 0 24px 48px -16px rgba(0, 0, 0, 0.45);
        text-align: left;
        animation: sg-rise 220ms cubic-bezier(0.2, 0, 0, 1) both;
      }
      .sg-title {
        margin: 0 0 6px; padding: 0;
        font: 400 22px/1.15 var(--sg-serif); letter-spacing: -0.01em; color: var(--sg-ink);
      }
      .sg-sub { margin: 0 0 16px; padding: 0; font: 13px/1.5 var(--sg-sans); color: var(--sg-ink-2); }
      .sg-input {
        display: block; width: 100%; height: auto; min-height: 40px; margin: 0; padding: 9px 12px;
        font: 15px/1.3 var(--sg-sans); letter-spacing: 0.15em;
        background: var(--sg-sunken); color: var(--sg-ink);
        border: 1px solid var(--sg-rule-strong); border-radius: 3px; box-shadow: none;
      }
      .sg-input:focus { outline: none; border-color: var(--sg-ink); box-shadow: 0 0 0 1px var(--sg-ink); }
      .sg-input::placeholder { color: var(--sg-ink-3); letter-spacing: normal; opacity: 1; }
      .sg-error { min-height: 18px; margin: 8px 0 0; padding: 0; font: 12.5px/1.45 var(--sg-sans); color: var(--sg-danger); }
      /* The copy-paste line explains the rule; it is not an error, so it is not red. */
      .sg-error[data-tone="note"] { color: var(--sg-ink-3); }
      .sg-actions { display: flex; gap: 8px; justify-content: flex-end; margin: 12px 0 0; }
      .sg-btn {
        min-height: 36px; margin: 0; padding: 0 16px;
        font: 500 13px/1 var(--sg-sans); letter-spacing: 0.005em; text-transform: none;
        border-radius: 3px; border: 1px solid transparent; cursor: pointer;
        transition: background-color 120ms, border-color 120ms, transform 80ms;
      }
      .sg-btn:active { transform: translateY(1px); }
      .sg-btn:focus-visible { outline: 2px solid var(--sg-ink); outline-offset: 2px; }
      .sg-btn.primary { background: var(--sg-ink); color: var(--sg-paper); border-color: var(--sg-ink); }
      .sg-btn.primary:hover { background: var(--sg-ink-2); border-color: var(--sg-ink-2); }
      .sg-btn.ghost { background: transparent; color: var(--sg-ink); border-color: var(--sg-rule-strong); }
      .sg-btn.ghost:hover { border-color: var(--sg-ink); background: var(--sg-wash); }
      @keyframes sg-fade { from { opacity: 0; } }
      @keyframes sg-rise { from { opacity: 0; transform: translateY(8px); } }
      @media (prefers-reduced-motion: reduce) {
        .sg-backdrop, .sg-card { animation: none; }
      }

      /* Access code stage. The card widens because a 256-character code needs
         the room, and the code itself must be read, not copied — so selection
         is off here as the first line of defence (handlers below refuse
         copy/cut/paste as the second). */
      .sg-card.code { width: min(580px, 100%); }
      .sg-code {
        margin: 0 0 12px; padding: 12px 14px;
        max-height: 190px; overflow-y: auto;
        background: var(--sg-sunken); border: 1px solid var(--sg-rule); border-radius: 3px;
        font: 13px/1.7 var(--sg-mono); letter-spacing: 0.04em; word-break: break-all;
        color: var(--sg-ink);
        user-select: none; -webkit-user-select: none;
      }
      .sg-input.code-input { letter-spacing: 0.04em; font: 13px/1.4 var(--sg-mono); }

      /* Cool-off stage: words in place of the PIN box. */
      .sg-card [hidden] { display: none; }
      .sg-cool { margin: 0 0 4px; padding: 0; font: 14px/1.55 var(--sg-sans); color: var(--sg-ink); }
      .sg-cool strong { font-weight: 600; }
    `;

    overlay = document.createElement("div");
    overlay.className = "sg-backdrop";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="sg-card" role="dialog" aria-modal="true" aria-labelledby="sg-title">
        <p class="sg-title" id="sg-title">Enter your PIN</p>
        <p class="sg-sub" id="sg-sub"></p>
        <div id="sg-code-wrap" hidden><p class="sg-code" id="sg-code"></p></div>
        <p class="sg-cool" id="sg-cool" hidden></p>
        <input class="sg-input" id="sg-input" type="password"
               placeholder="PIN" autocomplete="off" autocorrect="off"
               autocapitalize="off" spellcheck="false" />
        <p class="sg-error" id="sg-error" role="alert"></p>
        <div class="sg-actions">
          <button class="sg-btn ghost" id="sg-cancel" type="button">Cancel</button>
          <button class="sg-btn primary" id="sg-confirm" type="button">Unlock</button>
        </div>
      </div>`;

    document.documentElement.appendChild(style);
    document.documentElement.appendChild(overlay);
    // A choice made in another window while this dialog is open shows at once.
    if (window.SieveTheme) window.SieveTheme.onChange(() => window.SieveTheme.mark(overlay));

    input = overlay.querySelector("#sg-input");
    errorEl = overlay.querySelector("#sg-error");
    subEl = overlay.querySelector("#sg-sub");
    coolEl = overlay.querySelector("#sg-cool");
    confirmBtn = overlay.querySelector("#sg-confirm");
    cancelBtn = overlay.querySelector("#sg-cancel");

    confirmBtn.addEventListener("click", submit);
    cancelBtn.addEventListener("click", dismiss);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
      else if (e.key === "Escape") finish(false);
    });
    // The cool-off stage has no text box to catch Escape, so the card does.
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") finish(false);
    });
    // Click outside the card = cancel.
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) finish(false);
    });

    // The access code is defeated entirely if it can be pasted, so refuse every
    // route into the box: the clipboard, drag and drop, and the keyboard
    // shortcut (some browsers fire the shortcut without a paste event). Undo is
    // blocked too, since it can restore text that was refused.
    ["paste", "drop", "dragover"].forEach((evt) => {
      input.addEventListener(evt, (e) => {
        if (stage === "code") e.preventDefault();
      });
    });
    input.addEventListener("keydown", (e) => {
      if (stage !== "code") return;
      const key = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === "v" || key === "z" || key === "y")) {
        e.preventDefault();
      }
    });

    // And refuse to hand the code out: no selecting, copying or right-clicking
    // the displayed string. user-select is already off in CSS; this covers the
    // routes that bypass it.
    const codeDisplay = overlay.querySelector("#sg-code");
    ["copy", "cut", "contextmenu", "dragstart"].forEach((evt) => {
      codeDisplay.addEventListener(evt, (e) => e.preventDefault());
    });
  }

  // --- access code stage --------------------------------------------------
  //
  // Shown after the PIN is accepted, when the optional access code is on. Kept
  // in this file rather than at each call site so every existing gate — the
  // settings page, the pause screen, the blocked page — gets it for free.
  let codeExpected = "";

  function codeElements() {
    return {
      card: overlay.querySelector(".sg-card"),
      title: overlay.querySelector("#sg-title"),
      display: overlay.querySelector("#sg-code"),
      wrap: overlay.querySelector("#sg-code-wrap"),
    };
  }

  function newCode(length) {
    const AC = window.SieveAccessCode;
    codeExpected = AC.generate(length);
    const { display } = codeElements();
    if (display) display.textContent = codeExpected;
    input.value = "";
    input.focus();
  }

  // Resolves true only when the code is typed correctly. A wrong answer issues a
  // fresh code rather than letting the same one be retried.
  function askForCode(actionName, length) {
    const { card, title, wrap } = codeElements();
    card.classList.add("code");
    title.textContent = "Type the access code";
    subEl.textContent = actionName
      ? `${actionName} — type the code below exactly.`
      : "Type the code below exactly.";
    wrap.hidden = false;
    input.classList.add("code-input");
    input.type = "text";
    input.placeholder = "Type the code above";
    errorEl.textContent = "Copy and paste are disabled on purpose.";
    errorEl.dataset.tone = "note";
    stage = "code";
    newCode(length);
  }

  function resetToPinStage() {
    const { card, title, wrap } = codeElements();
    if (card) card.classList.remove("code");
    if (title) title.textContent = "Enter your PIN";
    if (wrap) wrap.hidden = true;
    input.classList.remove("code-input");
    input.type = "password";
    input.placeholder = "PIN";
    input.hidden = false;
    errorEl.hidden = false;
    coolEl.hidden = true;
    coolEl.textContent = "";
    confirmBtn.textContent = "Unlock";
    cancelBtn.textContent = "Cancel";
    codeExpected = "";
    cool = null;
    stage = "pin";
  }

  let stage = "pin";

  // --- cool-off stage -----------------------------------------------------
  //
  // Shown INSTEAD of the PIN while a protected change has not yet waited out
  // its cool-off. From here the change can only be asked for, or the request
  // called off, so this stage always resolves false; the person comes back
  // once the wait is over, and then the gate goes on to the PIN as usual.
  let cool = null; // { actionName, info, justStarted } while it is showing

  // A sentence with a few words in bold, built from text nodes — the action
  // name can carry a domain from the address bar and never goes near innerHTML.
  function setCoolText(parts) {
    coolEl.textContent = "";
    for (const part of parts) {
      if (typeof part === "string") {
        coolEl.appendChild(document.createTextNode(part));
      } else {
        const strong = document.createElement("strong");
        strong.textContent = part.strong;
        coolEl.appendChild(strong);
      }
    }
  }

  function renderCooloff() {
    const CO = window.SieveCooloff;
    const { title } = codeElements();
    const { info, justStarted } = cool;
    const now = Date.now();

    if (info.state === "none") {
      const readyAt = now + info.hours * 3600000;
      title.textContent = `This takes a ${CO.delayLabel(info.hours)} wait`;
      setCoolText([
        "Ask now and it unlocks on ",
        { strong: CO.formatWhen(readyAt) },
        ". Come back then and make the change yourself — it stays unlocked for a day, then lapses. Nothing changes on its own, and you can call it off at any time.",
      ]);
      cancelBtn.textContent = "Never mind";
      confirmBtn.textContent = "Start the wait";
    } else {
      const { readyAt } = info.request;
      title.textContent = justStarted ? "The wait has started" : "Still waiting";
      setCoolText([
        "This unlocks in ",
        { strong: CO.formatDuration(readyAt - now) },
        `, on ${CO.formatWhen(readyAt)}. Come back after that to make the change.`,
      ]);
      cancelBtn.textContent = "Cancel request";
      confirmBtn.textContent = "Close";
    }
    confirmBtn.focus();
  }

  function showCooloff(actionName, info) {
    stage = "cooloff";
    cool = { actionName, info, justStarted: false };
    subEl.textContent = actionName || "This change is protected.";
    input.hidden = true;
    errorEl.hidden = true;
    coolEl.hidden = false;
    renderCooloff();
  }

  async function cooloffSubmit() {
    const CO = window.SieveCooloff;
    if (cool.info.state !== "none") {
      finish(false);
      return;
    }
    try {
      const request = await CO.request(cool.actionName);
      cool.info = { ...cool.info, state: "waiting", request };
      cool.justStarted = true;
      renderCooloff();
    } catch (err) {
      console.warn("[Sieve] could not start the cool-off:", err);
      finish(false);
    }
  }

  // The left-hand button: Cancel / Never mind, or — while a request is
  // waiting — Cancel request, which calls the change off. Always free, since
  // it can only keep protection where it is.
  async function dismiss() {
    if (stage === "cooloff" && cool && cool.info.state !== "none") {
      try {
        await window.SieveCooloff.cancel(cool.info.key);
      } catch (err) {
        console.warn("[Sieve] could not cancel the cool-off request:", err);
      }
    }
    finish(false);
  }

  async function submit() {
    if (stage === "cooloff") {
      await cooloffSubmit();
      return;
    }
    if (stage === "code") {
      if (input.value === codeExpected) {
        finish(true);
      } else {
        errorEl.textContent = "That didn't match. Here's a new code.";
        errorEl.dataset.tone = "";
        newCode(codeExpected.length);
      }
      return;
    }

    if (!(await G.verify(input.value))) {
      errorEl.textContent = "Incorrect PIN.";
      errorEl.dataset.tone = "";
      input.value = "";
      input.focus();
      return;
    }

    // PIN accepted. If the access code applies to this action, move to it
    // instead of resolving — the two layers stack.
    const AC = window.SieveAccessCode;
    if (AC) {
      try {
        const config = await AC.getConfig();
        if (AC.requiredFor(config, !!(pending && pending.critical))) {
          askForCode(pending && pending.actionName, config.length);
          return;
        }
      } catch (err) {
        // Never let a settings read lock the user out of their own settings.
        console.warn("[Sieve] access code check failed, allowing on PIN alone:", err);
      }
    }
    finish(true);
  }

  function finish(result) {
    if (!pending) return;
    const { resolve, cooloffKey } = pending;
    pending = null;
    overlay.hidden = true;
    input.value = "";
    errorEl.textContent = "";
    resetToPinStage();
    // An unlocked cool-off request is good for one change; this was it.
    if (result && cooloffKey) {
      consumeCooloff(cooloffKey).then(() => resolve(result));
    } else {
      resolve(result);
    }
  }

  // This dialog and the doomscroll pause screen both sit at the maximum
  // z-index, so whichever comes later in the document paints on top. The pause
  // screen attaches itself to <html> when it opens, and the access code is then
  // asked for FROM that screen — so the dialog was opening underneath it, the
  // code unreadable behind a near-opaque backdrop. Moving the dialog to the end
  // of <html> each time it opens keeps it on top of anything already there.
  function raise() {
    if (document.documentElement.lastElementChild !== overlay) {
      document.documentElement.appendChild(overlay);
    }
    // Every open goes through here, so this is where the dialog takes the
    // Appearance choice. It is set on the dialog itself, never on <html>: on
    // the pause screen that element belongs to the website.
    if (window.SieveTheme) window.SieveTheme.mark(overlay);
  }

  // The cool-off for this action, or null when none applies (none is set, or
  // this page did not load common/cooloff.js). A failed read lets the change
  // through rather than locking someone out of their own settings, the same
  // call the access code makes.
  async function cooloffFor(actionName) {
    const CO = window.SieveCooloff;
    if (!CO) return null;
    try {
      const info = await CO.check(actionName);
      return info.required ? info : null;
    } catch (err) {
      console.warn("[Sieve] cool-off check failed, going on without it:", err);
      return null;
    }
  }

  async function consumeCooloff(key) {
    try {
      await window.SieveCooloff.consume(key);
    } catch (err) {
      console.warn("[Sieve] could not close the cool-off request:", err);
    }
  }

  function askToWait(actionName, info, critical) {
    build();
    if (pending) finish(false);
    return new Promise((resolve) => {
      pending = { resolve, actionName, critical, cooloffKey: null };
      resetToPinStage();
      raise();
      overlay.hidden = false;
      showCooloff(actionName, info);
    });
  }

  // `opts.critical` marks the decisive actions — turning a protection off,
  // getting past the pause screen, weakening the lock itself. With the access
  // code set to its default scope, only those face the code; everything else
  // still needs the PIN alone.
  async function confirmUnlock(actionName, opts) {
    const critical = !!(opts && opts.critical);

    // The cool-off comes first and does not depend on a PIN: it is the lock
    // that still works for someone on their own.
    const cooloff = await cooloffFor(actionName);
    if (cooloff && cooloff.state !== "ready") return askToWait(actionName, cooloff, critical);
    const cooloffKey = cooloff ? cooloff.key : null;

    // No PIN set = Personal mode, nothing more to confirm. The access code is a
    // second layer over the PIN, so it does not apply on its own here.
    if (!(await G.isEnabled())) {
      if (cooloffKey) await consumeCooloff(cooloffKey);
      return true;
    }

    build();
    // If a prompt is somehow already open, cancel it before opening the new one.
    if (pending) finish(false);

    return new Promise((resolve) => {
      pending = { resolve, actionName, critical, cooloffKey };
      resetToPinStage();
      subEl.textContent = actionName || "This change is protected.";
      errorEl.textContent = "";
      input.value = "";
      raise();
      overlay.hidden = false;
      input.focus();
    });
  }

  // Gate an on/off switch: turning it ON is free; turning it OFF needs the PIN.
  // On a failed/cancelled unlock the checkbox is reverted to checked.
  //
  // Switching a protection off is treated as critical: it is the action that
  // actually removes cover, so it is the one worth guarding when the access code
  // is limited to the decisive changes.
  async function gateToggleOff(checkbox, actionName) {
    if (checkbox.checked) return true; // turning ON (or already on) — always allowed
    const ok = await confirmUnlock(actionName, { critical: true });
    if (!ok) checkbox.checked = true; // revert the OFF
    return ok;
  }

  // Cool-off-only gate, for callers that verify the PIN themselves. Removing
  // the PIN is one: its own form takes the current PIN, but removing it still
  // weakens protection and so still waits.
  //
  // Resolves true when no cool-off applies or the wait is over (using up the
  // request), false otherwise — so a caller can await it after its PIN check.
  async function requireCooloff(actionName) {
    const cooloff = await cooloffFor(actionName);
    if (!cooloff) return true;
    if (cooloff.state === "ready") {
      await consumeCooloff(cooloff.key);
      return true;
    }
    return askToWait(actionName, cooloff, true);
  }

  // Code-only challenge, for callers that verify the PIN themselves and cannot
  // route through confirmUnlock. The pause overlay is one: it has its own PIN row
  // inside a shadow root, so without this the access code would silently not
  // apply at the exact moment it matters most for doomscrolling.
  //
  // The cool-off deliberately does not apply here. The pause screen's "15 more
  // minutes" is a daily limit, and a wait measured in hours or days would
  // simply outlast it; turning the limit itself off still waits.
  //
  // Resolves true when the code is typed correctly, false on cancel, and true
  // immediately when no code is required — so a caller can await it
  // unconditionally after its own PIN check.
  async function requireAccessCode(actionName, opts) {
    const AC = window.SieveAccessCode;
    if (!AC) return true;
    let config;
    try {
      config = await AC.getConfig();
    } catch (err) {
      console.warn("[Sieve] access code check failed, allowing:", err);
      return true;
    }
    if (!AC.requiredFor(config, !!(opts && opts.critical))) return true;
    if (!(await G.isEnabled())) return true; // second layer over the PIN only

    build();
    if (pending) finish(false);

    return new Promise((resolve) => {
      pending = { resolve, actionName, critical: true };
      resetToPinStage();
      raise();
      overlay.hidden = false;
      askForCode(actionName, config.length);
    });
  }

  G.confirmUnlock = confirmUnlock;
  G.requireCooloff = requireCooloff;
  G.requireAccessCode = requireAccessCode;
  G.gateToggleOff = gateToggleOff;
})();

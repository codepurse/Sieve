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
  let pending = null; // { resolve } for the dialog currently open

  function build() {
    if (overlay) return;

    const style = document.createElement("style");
    style.textContent = `
      .sg-backdrop {
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        background: rgba(8, 12, 24, 0.7);
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      .sg-backdrop[hidden] { display: none; }
      .sg-card {
        width: min(320px, calc(100vw - 32px)); box-sizing: border-box;
        padding: 22px 22px 18px;
        background: #0f172a; color: #f1f5f9;
        border: 1px solid #334155; border-radius: 14px;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
        text-align: left;
      }
      .sg-title { margin: 0 0 4px; font-size: 15px; font-weight: 600; }
      .sg-sub { margin: 0 0 14px; font-size: 13px; color: #94a3b8; }
      .sg-input {
        width: 100%; box-sizing: border-box; padding: 9px 12px;
        font-size: 14px; letter-spacing: 2px;
        background: #1e293b; color: #f1f5f9;
        border: 1px solid #475569; border-radius: 8px;
      }
      .sg-input:focus { outline: none; border-color: #6366f1; }
      .sg-error { min-height: 16px; margin: 8px 0 0; font-size: 12px; color: #f87171; }
      .sg-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
      .sg-btn {
        padding: 8px 16px; font-size: 13px; font-weight: 600;
        border-radius: 8px; border: 1px solid transparent; cursor: pointer;
      }
      .sg-btn.primary { background: #6366f1; color: #fff; }
      .sg-btn.ghost { background: transparent; color: #cbd5e1; border-color: #475569; }

      /* Access code stage. The card widens because a 256-character code needs
         the room, and the code itself must be read, not copied — so selection
         is off here as the first line of defence (handlers below refuse
         copy/cut/paste as the second). */
      .sg-card.code { width: min(560px, calc(100vw - 32px)); }
      .sg-code {
        padding: 10px 12px; margin: 0 0 10px;
        max-height: 190px; overflow-y: auto;
        background: #1e293b; border: 1px solid #475569; border-radius: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12.5px; line-height: 1.65; word-break: break-all;
        color: #e2e8f0;
        user-select: none; -webkit-user-select: none;
      }
      .sg-input.code-input { letter-spacing: normal; font-size: 12.5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    `;

    overlay = document.createElement("div");
    overlay.className = "sg-backdrop";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="sg-card" role="dialog" aria-modal="true" aria-labelledby="sg-title">
        <p class="sg-title" id="sg-title">Enter your PIN</p>
        <p class="sg-sub" id="sg-sub"></p>
        <div id="sg-code-wrap" hidden><p class="sg-code" id="sg-code"></p></div>
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
    document.body.appendChild(overlay);

    input = overlay.querySelector("#sg-input");
    errorEl = overlay.querySelector("#sg-error");
    subEl = overlay.querySelector("#sg-sub");

    overlay.querySelector("#sg-confirm").addEventListener("click", submit);
    overlay.querySelector("#sg-cancel").addEventListener("click", () => finish(false));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
      else if (e.key === "Escape") finish(false);
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
    codeExpected = "";
    stage = "pin";
  }

  let stage = "pin";

  async function submit() {
    if (stage === "code") {
      if (input.value === codeExpected) {
        finish(true);
      } else {
        errorEl.textContent = "That didn't match. Here's a new code.";
        newCode(codeExpected.length);
      }
      return;
    }

    if (!(await G.verify(input.value))) {
      errorEl.textContent = "Incorrect PIN.";
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
    const { resolve } = pending;
    pending = null;
    overlay.hidden = true;
    input.value = "";
    errorEl.textContent = "";
    resetToPinStage();
    resolve(result);
  }

  // `opts.critical` marks the decisive actions — turning a protection off,
  // getting past the pause screen, weakening the lock itself. With the access
  // code set to its default scope, only those face the code; everything else
  // still needs the PIN alone.
  async function confirmUnlock(actionName, opts) {
    // No PIN set = Personal mode, nothing to confirm. The access code is a
    // second layer over the PIN, so it does not apply on its own here.
    if (!(await G.isEnabled())) return true;

    build();
    // If a prompt is somehow already open, cancel it before opening the new one.
    if (pending) finish(false);

    return new Promise((resolve) => {
      pending = { resolve, actionName, critical: !!(opts && opts.critical) };
      resetToPinStage();
      subEl.textContent = actionName || "This change is protected.";
      errorEl.textContent = "";
      input.value = "";
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

  // Code-only challenge, for callers that verify the PIN themselves and cannot
  // route through confirmUnlock. The pause overlay is one: it has its own PIN row
  // inside a shadow root, so without this the access code would silently not
  // apply at the exact moment it matters most for doomscrolling.
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
      overlay.hidden = false;
      askForCode(actionName, config.length);
    });
  }

  G.confirmUnlock = confirmUnlock;
  G.requireAccessCode = requireAccessCode;
  G.gateToggleOff = gateToggleOff;
})();

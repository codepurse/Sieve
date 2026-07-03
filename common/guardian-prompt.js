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
    `;

    overlay = document.createElement("div");
    overlay.className = "sg-backdrop";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="sg-card" role="dialog" aria-modal="true" aria-labelledby="sg-title">
        <p class="sg-title" id="sg-title">Enter your PIN</p>
        <p class="sg-sub" id="sg-sub"></p>
        <input class="sg-input" id="sg-input" type="password" inputmode="numeric"
               placeholder="PIN" autocomplete="off" />
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
  }

  async function submit() {
    if (await G.verify(input.value)) {
      finish(true);
    } else {
      errorEl.textContent = "Incorrect PIN.";
      input.value = "";
      input.focus();
    }
  }

  function finish(result) {
    if (!pending) return;
    const { resolve } = pending;
    pending = null;
    overlay.hidden = true;
    input.value = "";
    errorEl.textContent = "";
    resolve(result);
  }

  async function confirmUnlock(actionName) {
    // No PIN set = Personal mode, nothing to confirm.
    if (!(await G.isEnabled())) return true;

    build();
    // If a prompt is somehow already open, cancel it before opening the new one.
    if (pending) finish(false);

    return new Promise((resolve) => {
      pending = { resolve };
      subEl.textContent = actionName || "This change is protected.";
      errorEl.textContent = "";
      input.value = "";
      overlay.hidden = false;
      input.focus();
    });
  }

  // Gate an on/off switch: turning it ON is free; turning it OFF needs the PIN.
  // On a failed/cancelled unlock the checkbox is reverted to checked.
  async function gateToggleOff(checkbox, actionName) {
    if (checkbox.checked) return true; // turning ON (or already on) — always allowed
    const ok = await confirmUnlock(actionName);
    if (!ok) checkbox.checked = true; // revert the OFF
    return ok;
  }

  G.confirmUnlock = confirmUnlock;
  G.gateToggleOff = gateToggleOff;
})();

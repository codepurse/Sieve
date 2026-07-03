// content/pause-overlay.js
// Sieve — Doomscroll Stopper (Module 2A): the pause overlay.
//  - Exposes window.SievePause.show(opts) / .hide() for doomscroll.js to call.
//  - Injects a full-screen, calm "take a break" screen ABOVE everything
//    (z-index 2147483647) using a Shadow DOM so the page's CSS can't touch it.
//  - Offers three choices: Snooze 5 min · Stop for today · Dismiss.
//  - Locks page scrolling while it's up so it can't be scrolled past.

(() => {
  "use strict";

  // Guard: define the API only once.
  if (window.SievePause) return;

  const Z_TOP = 2147483647; // the maximum 32-bit z-index — sits above all page UI
  const KEYS_THAT_SCROLL = new Set([
    " ", "Spacebar", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "Home", "End",
  ]);

  // --- module state -------------------------------------------------------
  let host = null;          // the element we attach to the page
  let handlers = {};        // callbacks supplied by doomscroll.js
  let shown = false;
  let guardianActive = false; // is the current overlay in Guardian (PIN) mode?
  let prevHtmlOverflow = "";
  let prevBodyOverflow = "";

  // --- the overlay's isolated styles + markup -----------------------------
  function overlayHTML(guardian) {
    const sub = guardian
      ? `<p class="sub">You've reached today's limit. Enter your PIN to unlock more time.</p>`
      : `<p class="sub">Is this how you want to spend your time right now?</p>`;

    const actions = guardian
      ? `<div class="actions">
            <button class="btn primary" id="pin-reveal">Enter PIN to continue</button>
            <div class="pin-row" id="pin-row" hidden>
              <input class="pin-input" id="pin-input" type="password" inputmode="numeric"
                     placeholder="PIN" autocomplete="off" />
              <button class="btn primary" id="pin-submit">Unlock 15 min</button>
            </div>
            <p class="pin-error" id="pin-error" role="alert"></p>
          </div>`
      : `<div class="actions">
            <button class="btn primary" data-act="snooze">Snooze 5 min</button>
            <button class="btn" data-act="stop">Stop for today</button>
            <button class="btn ghost" data-act="dismiss">Dismiss</button>
          </div>`;

    return `
      <style>
        :host { all: initial; }
        .backdrop {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(8, 12, 24, 0.82);
          backdrop-filter: blur(8px);
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          color: #f1f5f9;
          animation: fade 0.35s ease;
        }
        .card {
          max-width: 420px; width: calc(100% - 48px);
          padding: 36px 32px 28px;
          text-align: center;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        }
        .breath {
          width: 64px; height: 64px; margin: 0 auto 22px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 45%, #7dd3fc, #38bdf8 70%);
          box-shadow: 0 0 40px rgba(56, 189, 248, 0.45);
          animation: breathe 5s ease-in-out infinite;
        }
        h1 { margin: 0 0 10px; font-size: 22px; font-weight: 700; }
        .msg { margin: 0 0 6px; font-size: 15px; color: #cbd5e1; line-height: 1.5; }
        .msg strong { color: #f1f5f9; }
        .sub { margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.5; }
        .actions { display: flex; flex-direction: column; gap: 10px; }
        .btn {
          appearance: none; border: 1px solid #334155;
          padding: 12px 16px; border-radius: 10px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          background: #1e293b; color: #f1f5f9;
          transition: background 0.15s, border-color 0.15s, transform 0.05s;
        }
        .btn:hover { background: #243349; }
        .btn:active { transform: translateY(1px); }
        .btn.primary { background: #38bdf8; border-color: #38bdf8; color: #06283d; }
        .btn.primary:hover { background: #59c8fb; }
        .btn.ghost { background: transparent; border-color: transparent; color: #94a3b8; }
        .btn.ghost:hover { color: #f1f5f9; background: rgba(148, 163, 184, 0.12); }
        .pin-row { display: flex; gap: 8px; }
        .pin-input {
          flex: 1; min-width: 0; padding: 12px; border-radius: 10px;
          border: 1px solid #334155; background: #0b1220; color: #f1f5f9;
          font-size: 15px; text-align: center; letter-spacing: 0.3em;
        }
        .pin-error { margin: 8px 0 0; font-size: 13px; color: #f87171; min-height: 1em; }
        .brand { margin: 22px 0 0; font-size: 11px; letter-spacing: 0.04em;
                 text-transform: uppercase; color: #475569; }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes breathe {
          0%, 100% { transform: scale(0.78); opacity: 0.7; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .backdrop, .breath { animation: none; }
        }
      </style>
      <div class="backdrop">
        <div class="card" role="dialog" aria-modal="true" aria-label="Take a break">
          <div class="breath" aria-hidden="true"></div>
          <h1>Time for a breath</h1>
          <p class="msg" id="sieve-msg"></p>
          ${sub}
          ${actions}
          <p class="brand">Sieve · Doomscroll Stopper</p>
        </div>
      </div>`;
  }

  // Friendly sentence about how long they've been scrolling.
  function buildMessage(root, opts) {
    const msg = root.getElementById("sieve-msg");
    const where = document.createElement("strong");
    where.textContent = opts.siteName || "this feed";
    msg.append("You've been scrolling ", where);
    msg.append(
      opts.minutes && opts.minutes >= 1
        ? ` for about ${opts.minutes} min.`
        : " for a while now."
    );
  }

  // --- scroll locking -----------------------------------------------------
  function blockWheel(e) { e.preventDefault(); }
  function blockKeys(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (!guardianActive) runAction("dismiss"); // no free exit in Guardian mode
      return;
    }
    if (KEYS_THAT_SCROLL.has(e.key)) e.preventDefault();
  }
  function lockScroll() {
    prevHtmlOverflow = document.documentElement.style.overflow;
    prevBodyOverflow = document.body ? document.body.style.overflow : "";
    document.documentElement.style.overflow = "hidden";
    if (document.body) document.body.style.overflow = "hidden";
    window.addEventListener("wheel", blockWheel, { passive: false, capture: true });
    window.addEventListener("touchmove", blockWheel, { passive: false, capture: true });
    window.addEventListener("keydown", blockKeys, true);
  }
  function unlockScroll() {
    document.documentElement.style.overflow = prevHtmlOverflow;
    if (document.body) document.body.style.overflow = prevBodyOverflow;
    window.removeEventListener("wheel", blockWheel, { capture: true });
    window.removeEventListener("touchmove", blockWheel, { capture: true });
    window.removeEventListener("keydown", blockKeys, true);
  }

  // --- run a button's handler, then close (Personal mode) -----------------
  function runAction(name) {
    const map = { snooze: "onSnooze", stop: "onStopForToday", dismiss: "onDismiss" };
    const fn = handlers[map[name]];
    hide();
    if (typeof fn === "function") fn();
  }

  // --- wire the "Enter PIN to continue" flow (Guardian mode) --------------
  function wireGuardian(root) {
    const askBtn = root.getElementById("pin-reveal");
    const pinRow = root.getElementById("pin-row");
    const pinInput = root.getElementById("pin-input");
    const pinSubmit = root.getElementById("pin-submit");
    const pinError = root.getElementById("pin-error");

    askBtn.addEventListener("click", () => {
      askBtn.hidden = true;
      pinRow.hidden = false;
      pinInput.focus();
    });

    async function submit() {
      const ok =
        typeof handlers.verifyPin === "function" ? await handlers.verifyPin(pinInput.value) : false;
      if (ok) {
        const grant = handlers.onGrantTime;
        hide();
        if (typeof grant === "function") grant();
      } else {
        pinError.textContent = "Incorrect PIN.";
        pinInput.value = "";
        pinInput.focus();
      }
    }

    pinSubmit.addEventListener("click", submit);
    pinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }

  // --- public API ---------------------------------------------------------
  function show(opts) {
    if (shown) return;
    shown = true;
    handlers = opts || {};
    guardianActive = !!handlers.guardian;

    host = document.createElement("div");
    host.id = "sieve-pause-overlay";
    host.style.cssText = `position:fixed;inset:0;z-index:${Z_TOP};`;
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = overlayHTML(guardianActive);
    buildMessage(root, handlers);

    if (guardianActive) {
      wireGuardian(root);
    } else {
      root.querySelectorAll(".btn[data-act]").forEach((btn) => {
        btn.addEventListener("click", () => runAction(btn.dataset.act));
      });
    }

    // Attach to <html> so it survives sites that rebuild <body>.
    document.documentElement.appendChild(host);
    lockScroll();
    const primary = root.querySelector(".btn.primary");
    if (primary) primary.focus();
  }

  function hide() {
    if (!shown) return;
    shown = false;
    guardianActive = false;
    unlockScroll();
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null;
    handlers = {};
  }

  window.SievePause = { show, hide };
})();

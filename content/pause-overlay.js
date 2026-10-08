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
              <input class="pin-input" id="pin-input" type="password"
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

    // The breathing guide is the sieve itself: a ring of small holes that
    // slowly widens and settles, about six breaths a minute. Built from
    // constants here, so the markup has nothing from the page in it.
    const holes = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      return `<circle cx="${(50 + Math.cos(a) * 40).toFixed(2)}" cy="${(50 + Math.sin(a) * 40).toFixed(2)}" r="2.1"/>`;
    }).join("");

    return `
      <style>
        :host { all: initial; }
        /* Without this, .pin-row's display:flex beat its own [hidden] and the
           PIN field showed before "Enter PIN to continue" was pressed. */
        [hidden] { display: none !important; }
        .backdrop {
          --paper: #f2efe7; --ink: #1a1916; --ink-2: #4b4840; --ink-3: #66625a;
          --rule-strong: rgba(26, 25, 22, 0.26); --wash: rgba(26, 25, 22, 0.05);
          --sunken: #e8e4d9; --danger: #a63d24;
          --serif: "Iowan Old Style", "Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif;
          --sans: "Segoe UI Variable Text", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          --mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; box-sizing: border-box;
          /* Opaque enough that what is behind cannot be followed, and a heavy
             blur on top. A user could still watch a partially blurred video
             through the old 0.82/8px, which defeats a pause screen. */
          background: color-mix(in srgb, var(--paper) 96%, transparent);
          backdrop-filter: blur(28px) saturate(0.4);
          font: 15px/1.55 var(--sans);
          color: var(--ink);
          -webkit-font-smoothing: antialiased;
          animation: fade 0.4s cubic-bezier(0.2, 0, 0, 1);
        }
        @media (prefers-color-scheme: dark) {
          .backdrop {
            --paper: #131311; --ink: #ede9df; --ink-2: #b8b3a7; --ink-3: #8f8a7f;
            --rule-strong: rgba(237, 233, 223, 0.22); --wash: rgba(237, 233, 223, 0.06);
            --sunken: #0d0d0b; --danger: #e5866b;
          }
        }
        .card {
          width: min(400px, 100%);
          text-align: center;
        }
        .breath {
          display: block; width: 96px; height: 96px; margin: 0 auto 32px;
          fill: var(--ink);
          animation: breathe 10s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .kicker {
          margin: 0 0 14px;
          font: 500 11px/1.3 var(--mono); letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-3);
        }
        h1 {
          margin: 0 0 14px;
          font: 400 40px/1.05 var(--serif); letter-spacing: -0.02em;
          color: var(--ink);
        }
        .msg { margin: 0 0 6px; font-size: 16px; color: var(--ink-2); }
        .msg strong { color: var(--ink); font-weight: 600; }
        .sub { margin: 0 0 28px; font-size: 15px; color: var(--ink-2); }
        .actions { display: flex; flex-direction: column; gap: 8px; }
        .btn {
          appearance: none; min-height: 44px; padding: 0 18px;
          border: 1px solid var(--rule-strong); border-radius: 3px;
          font: 500 14px/1 var(--sans); cursor: pointer;
          background: transparent; color: var(--ink);
          transition: background-color 120ms, border-color 120ms, transform 80ms;
        }
        .btn:hover { border-color: var(--ink); background: var(--wash); }
        .btn:active { transform: translateY(1px); }
        .btn:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
        .btn.primary { background: var(--ink); border-color: var(--ink); color: var(--paper); }
        .btn.primary:hover { background: var(--ink-2); border-color: var(--ink-2); }
        .btn.ghost { border-color: transparent; color: var(--ink-2); }
        .btn.ghost:hover { color: var(--ink); background: var(--wash); border-color: transparent; }
        .pin-row { display: flex; gap: 8px; }
        .pin-input {
          flex: 1; min-width: 0; min-height: 44px; padding: 0 12px; border-radius: 3px;
          border: 1px solid var(--rule-strong); background: var(--sunken); color: var(--ink);
          font: 16px/1 var(--sans); text-align: center; letter-spacing: 0.3em;
        }
        .pin-input:focus { outline: none; border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink); }
        .pin-error { margin: 8px 0 0; font-size: 13px; color: var(--danger); min-height: 1em; }
        @keyframes fade { from { opacity: 0; } }
        @keyframes breathe {
          0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.45; }
          50% { transform: scale(1) rotate(12deg); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .backdrop, .breath { animation: none; }
        }
      </style>
      <div class="backdrop">
        <div class="card" role="dialog" aria-modal="true" aria-labelledby="sieve-pause-title">
          <svg class="breath" viewBox="0 0 100 100" aria-hidden="true">${holes}</svg>
          <p class="kicker">Sieve &middot; Doomscroll Stopper</p>
          <h1 id="sieve-pause-title">Time for a breath</h1>
          <p class="msg" id="sieve-msg"></p>
          ${sub}
          ${actions}
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

  // --- media ---------------------------------------------------------------
  //
  // The overlay used to blur the page and nothing more, which left the video
  // playing behind it. A user reported pressing space and carrying on watching:
  // the key never reaches us because YouTube listens on its own player, and the
  // overlay is a sibling element, not a replacement for the page.
  //
  // Blurring harder would not have fixed it. Sound is most of what holds
  // attention on a video, and no amount of blur touches audio — the pause has to
  // actually stop playback.
  //
  // Two details matter. Players restart playback on their own (autoplay, "up
  // next", a user hitting space anyway), so pausing once is not enough: a `play`
  // listener re-pauses for as long as the overlay is up. And we remember only
  // what we paused ourselves, so hiding the overlay never starts something the
  // user had already stopped.
  let pausedMedia = [];
  let mediaGuard = null;

  function pauseAllMedia() {
    pausedMedia = [];
    const media = document.querySelectorAll("video, audio");
    for (const el of media) {
      try {
        if (el.paused) continue; // leave it alone; it was not us
        el.pause();
        pausedMedia.push(el);
      } catch (_) {
        /* a cross-origin or detached element — nothing we can do */
      }
    }

    // Keep it paused. Capture phase so we see the event before the page's own
    // handlers, and re-pause rather than cancel: `play` is not cancelable.
    mediaGuard = (e) => {
      const el = e.target;
      if (!el || (el.tagName !== "VIDEO" && el.tagName !== "AUDIO")) return;
      try {
        el.pause();
        if (!pausedMedia.includes(el)) pausedMedia.push(el);
      } catch (_) {}
    };
    document.addEventListener("play", mediaGuard, true);
  }

  function resumePausedMedia() {
    if (mediaGuard) {
      document.removeEventListener("play", mediaGuard, true);
      mediaGuard = null;
    }
    for (const el of pausedMedia) {
      // play() rejects if the element went away or autoplay policy refuses it;
      // that is fine, the user can press play themselves.
      try {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (_) {}
    }
    pausedMedia = [];
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
      // A wrong attempt's message should not linger while the right one is
      // checked (and, with an access code, while the code is being typed).
      pinError.textContent = "";
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
    pauseAllMedia();
    const primary = root.querySelector(".btn.primary");
    if (primary) primary.focus();
  }

  function hide() {
    if (!shown) return;
    shown = false;
    guardianActive = false;
    unlockScroll();
    resumePausedMedia();
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null;
    handlers = {};
  }

  window.SievePause = { show, hide };
})();

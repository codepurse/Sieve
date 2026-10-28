// content/countdown.js
// Sieve — Doomscroll Stopper (Module 2A): the countdown bubble.
//  - Exposes window.SieveCountdown.update(state) / .hide() for doomscroll.js,
//    which calls update() once a second while a tracked site is on screen.
//  - A small pill in a corner of the page: what is left of today's limit, and
//    whether the clock is running right now.
//
// It exists so a limit that is not being enforced can be seen. A supporter
// watched YouTube for three hours on a 15-minute limit and had no way to tell
// the clock was not counting; with this showing, a missing bubble or one stuck
// on "paused" says so at once. LeechBlock's countdown was the model.
//
// It never takes a click: pointer-events are off, so whatever it covers in its
// corner still works. Shadow DOM, like the pause screen, so the page's CSS
// cannot reach it and its CSS cannot reach the page.

(() => {
  "use strict";

  // Guard: define the API only once.
  if (window.SieveCountdown) return;

  const Z_TOP = 2147483647; // the same top layer as the pause screen
  const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const SIZES = ["small", "medium", "large"];
  const LOW_MS = 60 * 1000; // the last minute is drawn in the warning colour

  // The dark palette, written twice below for the same reason as the pause
  // screen's: once under the system's dark mode unless Sieve is set to Light,
  // once when it is set to Dark. See common/theme.js.
  const DARK = `
    --paper: #1b1b18; --ink: #ede9df; --ink-3: #8f8a7f;
    --edge: rgba(237, 233, 223, 0.24); --danger: #e5866b;
    --shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.75);`;

  // Sieve's small mark (src/icons/mark-small.svg): the sieve with fewer,
  // larger holes, which is the one that stays legible at this size.
  const MARK =
    '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.75 5.3H21.45a1.05 1.05 0 0 1 0 2.1H4.75a1.05 1.05 0 0 1 0 -2.1zM4.5 6.4H21.7A8.6 8.4 0 0 1 4.5 6.4ZM7.1 9.5a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0zM10.4 9.5a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0zM13.7 9.5a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0zM17 9.5a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0zM8.75 12.6a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0zM12.05 12.6a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0zM15.35 12.6a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0z"/><path d="M5.1 6.3 2.4 3.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path fill="currentColor" d="M10.75 18.2a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0zM13.8 20.7a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0z"/></svg>';

  // --- module state -------------------------------------------------------
  let host = null;   // the element we attach to the page
  let pill = null;   // the pill inside the shadow root
  let timeEl = null;
  let wordEl = null;
  let lastText = ""; // what is on screen, so a tick that changes nothing writes nothing

  // --- markup + styles ----------------------------------------------------
  function build() {
    host = document.createElement("div");
    host.id = "sieve-countdown";
    host.style.cssText = `position:fixed;inset:0;z-index:${Z_TOP};pointer-events:none;`;
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        .pill {
          --paper: #fbf9f3; --ink: #1a1916; --ink-3: #66625a;
          --edge: rgba(26, 25, 22, 0.18); --danger: #a63d24;
          --shadow: 0 8px 24px -12px rgba(26, 25, 22, 0.45);
          --sans: "Segoe UI Variable Text", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          position: fixed;
          display: flex; align-items: center; gap: 0.45em;
          padding: 0.4em 0.75em 0.4em 0.6em;
          border-radius: 999px;
          background: var(--paper);
          color: var(--ink);
          box-shadow: 0 0 0 1px var(--edge), var(--shadow);
          font: 500 14px/1 var(--sans);
          -webkit-font-smoothing: antialiased;
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
        }
        @media (prefers-color-scheme: dark) {
          .pill:not([data-theme="light"]) { ${DARK} }
        }
        .pill[data-theme="dark"] { ${DARK} }

        .pill[data-corner="top-left"] { top: 16px; left: 16px; }
        .pill[data-corner="top-right"] { top: 16px; right: 16px; }
        .pill[data-corner="bottom-left"] { bottom: 16px; left: 16px; }
        .pill[data-corner="bottom-right"] { bottom: 16px; right: 16px; }

        .pill[data-size="small"] { font-size: 12px; }
        .pill[data-size="large"] { font-size: 18px; }

        .mark { width: 1.15em; height: 1.15em; flex-shrink: 0; }
        .time { font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }
        .word { color: var(--ink-3); font-weight: 400; }

        /* Paused: the clock is not counting (away, nothing playing). The time
           goes grey and the word says so, rather than a symbol to be decoded.
           The pill itself stays solid: fading all of it let the page's text
           show through. */
        .pill.is-paused .mark, .pill.is-paused .time { color: var(--ink-3); }
        .pill.is-low .time, .pill.is-over .time { color: var(--danger); }
        .pill.is-over .word { color: var(--danger); }
      </style>
      <div class="pill" role="timer" aria-label="Sieve daily limit">
        ${MARK}<span class="time"></span><span class="word"></span>
      </div>`;
    pill = root.querySelector(".pill");
    timeEl = root.querySelector(".time");
    wordEl = root.querySelector(".word");
    if (window.SieveTheme) window.SieveTheme.mark(pill);
  }

  // 754000 -> "12:34"; 3912000 -> "1:05:12". Whole seconds, rounded up while
  // counting down, so "0:00" means the limit really is reached.
  function format(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  // In fullscreen only the fullscreen element and what is inside it are drawn,
  // and fullscreen video is where an evening goes. So the bubble moves inside
  // it, and back out after. A bare <video> cannot hold it; then it waits.
  function place() {
    if (!host) return;
    const fs = document.fullscreenElement;
    const parent = fs && fs.tagName !== "VIDEO" && fs.tagName !== "IFRAME" ? fs : document.documentElement;
    if (host.parentNode !== parent) parent.appendChild(host);
  }

  // --- public API ---------------------------------------------------------

  // state: { remainingMs, running, corner, size }
  //   remainingMs  what is left of today's limit; below zero once it is passed
  //   running      is the clock counting right now
  function update(state) {
    if (!host) {
      build();
      document.addEventListener("fullscreenchange", place);
    }
    place();

    const over = state.remainingMs <= 0;
    pill.dataset.corner = CORNERS.includes(state.corner) ? state.corner : "bottom-left";
    pill.dataset.size = SIZES.includes(state.size) ? state.size : "medium";
    pill.classList.toggle("is-paused", !state.running && !over);
    pill.classList.toggle("is-low", !over && state.remainingMs <= LOW_MS);
    pill.classList.toggle("is-over", over);

    const time = format(Math.abs(state.remainingMs));
    const word = over ? "over" : state.running ? "left" : "paused";
    const text = `${time} ${word}`;
    if (text === lastText) return;
    lastText = text;
    timeEl.textContent = time;
    wordEl.textContent = word;
    pill.setAttribute(
      "aria-label",
      over ? `Sieve: ${time} over today's limit` : `Sieve: ${time} left of today's limit${state.running ? "" : ", paused"}`
    );
  }

  function hide() {
    if (!host) return;
    document.removeEventListener("fullscreenchange", place);
    if (host.parentNode) host.parentNode.removeChild(host);
    host = pill = timeEl = wordEl = null;
    lastText = "";
  }

  window.SieveCountdown = { update, hide, format };
})();

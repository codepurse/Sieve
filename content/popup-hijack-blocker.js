// content/popup-hijack-blocker.js
// Sieve — Popup & Click Hijack Blocker (MAIN-world half) — STRICT mode.
//
// Reimplements the technique used by the open-source "Popup Blocker (strict)"
// (schomery/popup-blocker, MPL-2.0) as original code: instead of guessing
// intent, it BLOCKS every script-driven attempt to open a new tab/window by
// default and lets the user recover with an on-page "Allow" prompt + a per-site
// whitelist. That's why it catches the popunders the old conservative version
// missed — and it's the deliberate trade-off the user chose (a real login/
// payment popup will occasionally need one "Allow" click).
//
// Runs in the page's MAIN world at document_start so it can replace the real
// open paths before page scripts capture them. It uses NO chrome.* APIs; the
// toggle, the per-site whitelist, the blocked-popup log and storage live in the
// isolated companion (popup-hijack-bridge.js), reached over window.postMessage:
//   bridge -> main : { dir:'to-main',   kind:'config', enabled, whitelisted }
//   main   -> bridge: { dir:'to-bridge', kind:'hello' }            (request config)
//   main   -> bridge: { dir:'to-bridge', kind:'blocked', entry }   (log a block)
//   main   -> bridge: { dir:'to-bridge', kind:'whitelist-add' }    ("Always allow")
//
// The interceptors that hook page JS (window.open / .click / .submit /
// dispatchEvent) MUST live here in the MAIN world. The DOM-cleanup pieces
// (overlay-detector.js, link-hijack-detector.js) stay in the isolated world.

(() => {
  "use strict";

  if (window.__sievePopupHijackActive) return;
  window.__sievePopupHijackActive = true;

  const TAG = "__sievePopupHijack";
  const TOP_FRAME = window.top === window;
  const COVER_FRACTION = 0.7;

  // Config pushed from the bridge.
  let enabled = false;
  let whitelisted = false;

  // Captured native implementations (grabbed before we replace anything).
  const nativeOpen = typeof window.open === "function" ? window.open.bind(window) : null;
  const AProto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
  const FProto = window.HTMLFormElement && HTMLFormElement.prototype;
  const nativeAnchorClick = AProto && AProto.click;
  const nativeFormSubmit = FProto && FProto.submit;
  const nativeDispatch = EventTarget.prototype.dispatchEvent;

  function postToBridge(kind, extra) {
    try {
      window.postMessage({ [TAG]: true, dir: "to-bridge", kind, ...extra }, "*");
    } catch {
      /* ignore */
    }
  }

  window.addEventListener(
    "message",
    (event) => {
      if (event.source !== window) return;
      const d = event.data;
      if (!d || d[TAG] !== true || d.dir !== "to-main") return;
      if (d.kind === "config") {
        enabled = !!d.enabled;
        whitelisted = !!d.whitelisted;
      }
    },
    false
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function resolveUrl(href) {
    if (href === undefined || href === null || String(href).trim() === "") return null;
    try {
      return new URL(String(href), location.href);
    } catch {
      return null;
    }
  }

  // target that opens a separate context: _blank or any named window (not self).
  function opensNewWindow(targetAttr) {
    const t = (targetAttr || "").trim().toLowerCase();
    return !!t && t !== "_self" && t !== "_top" && t !== "_parent";
  }

  // Downloads & special schemes are never blocked (file-save libraries use
  // a.click() with download/blob exactly like this).
  function isDownloadOrSpecial(el, dest) {
    if (el && el.hasAttribute && el.hasAttribute("download")) return true;
    if (!dest) return false;
    const p = dest.protocol;
    return p === "blob:" || p === "data:" || p === "mailto:" || p === "tel:" || p === "javascript:";
  }

  function safeStyle(el) {
    try {
      return window.getComputedStyle(el);
    } catch {
      return null;
    }
  }

  function isSeeThroughCover(el) {
    let r;
    try {
      r = el.getBoundingClientRect();
    } catch {
      return false;
    }
    const vw = window.innerWidth, vh = window.innerHeight;
    if (vw < 1 || vh < 1) return false;
    if (r.width < vw * COVER_FRACTION || r.height < vh * COVER_FRACTION) return false;
    const cs = safeStyle(el);
    if (!cs) return false;
    const bg = cs.backgroundColor;
    const transparent =
      parseFloat(cs.opacity) < 0.1 ||
      ((bg === "transparent" || bg === "rgba(0, 0, 0, 0)" || /rgba\([^)]*,\s*0\s*\)$/.test(bg)) &&
        (!cs.backgroundImage || cs.backgroundImage === "none"));
    const noText = !(el.textContent && el.textContent.trim().length > 0);
    return transparent && noText;
  }

  // ---------------------------------------------------------------------------
  // Simulated window — a recursive no-op Proxy returned from a blocked
  // window.open, so page scripts that chain .focus()/.location=.../.document…
  // keep running instead of throwing on a null.
  // ---------------------------------------------------------------------------
  function makeFakeWindow() {
    const noop = function () {};
    const handler = {
      get(target, prop) {
        if (prop === "closed") return false;
        if (prop === "opener") return null;
        if (prop === "then") return undefined; // never look like a thenable (avoid hanging an await)
        if (prop === Symbol.toPrimitive || prop === "toString" || prop === "valueOf") {
          return () => "";
        }
        return new Proxy(noop, handler);
      },
      set() {
        return true; // swallow assignments like w.location = '...'
      },
      apply() {
        return new Proxy(noop, handler);
      },
    };
    return new Proxy(noop, handler);
  }

  // ---------------------------------------------------------------------------
  // Blocking + the Allow prompt
  // ---------------------------------------------------------------------------
  let seq = 0;
  const pending = new Map(); // id -> { url, kind, perform }

  function block(info) {
    const id = ++seq;
    pending.set(id, info);
    // Log to the bridge so the popup's per-page list + count see it.
    postToBridge("blocked", {
      entry: {
        url: info.url || "",
        reason: info.kind,
        target: info.label || "",
        pageUrl: location.href,
        time: Date.now(),
      },
    });
    // Only the top frame shows UI (a prompt inside a hidden ad iframe is useless).
    if (TOP_FRAME) showPrompt(id);
    try {
      console.warn("[Sieve] Blocked a popup (" + info.kind + "): " + (info.url || "(empty)"));
    } catch {
      /* ignore */
    }
  }

  function performPending(id) {
    const info = pending.get(id);
    if (!info) return;
    pending.delete(id);
    try {
      info.perform();
    } catch {
      /* ignore */
    }
  }
  function performAll() {
    for (const id of Array.from(pending.keys())) performPending(id);
  }

  // --- on-page prompt (Shadow DOM so page CSS can't touch it) ---
  let promptHost = null;
  let promptShadow = null;

  function ensurePrompt() {
    if (promptHost && document.documentElement.contains(promptHost)) return;
    promptHost = document.createElement("div");
    promptHost.id = "sieve-ph-prompt-host";
    promptHost.style.cssText = "all:initial;position:fixed;z-index:2147483647;bottom:16px;right:16px;";
    promptShadow = promptHost.attachShadow ? promptHost.attachShadow({ mode: "closed" }) : promptHost;
    const style = document.createElement("style");
    style.textContent =
      ".box{font:13px system-ui,-apple-system,'Segoe UI',sans-serif;color:#f1f5f9;background:#1e293b;" +
      "border:1px solid #334155;border-radius:10px;padding:12px 14px;width:300px;box-shadow:0 8px 24px rgba(0,0,0,.4)}" +
      ".t{font-weight:600;margin-bottom:4px}.u{color:#94a3b8;font-size:11px;word-break:break-all;margin-bottom:10px;max-height:48px;overflow:hidden}" +
      ".row{display:flex;gap:8px;flex-wrap:wrap}button{font:inherit;border-radius:6px;padding:5px 10px;cursor:pointer;border:1px solid #334155}" +
      ".allow{background:#38bdf8;color:#06283d;border-color:#38bdf8;font-weight:600}.site{background:transparent;color:#38bdf8}" +
      ".x{background:transparent;color:#94a3b8;margin-left:auto}";
    const box = document.createElement("div");
    box.className = "box";
    box.innerHTML =
      '<div class="t"></div><div class="u"></div>' +
      '<div class="row"><button class="allow"></button>' +
      '<button class="site">Always allow this site</button>' +
      '<button class="x">✕</button></div>';
    promptShadow.appendChild(style);
    promptShadow.appendChild(box);

    box.querySelector(".allow").addEventListener("click", () => {
      // Clicking is a real user gesture, so the native open succeeds here.
      const id = latestId();
      if (id != null) performPending(id);
      renderPrompt();
    });
    box.querySelector(".site").addEventListener("click", () => {
      postToBridge("whitelist-add", {});
      whitelisted = true;
      performAll();
      hidePrompt();
    });
    box.querySelector(".x").addEventListener("click", hidePrompt);
  }

  function latestId() {
    let max = null;
    for (const id of pending.keys()) max = id;
    return max;
  }

  function showPrompt(/* id */) {
    ensurePrompt();
    if (!document.documentElement.contains(promptHost)) {
      document.documentElement.appendChild(promptHost);
    }
    renderPrompt();
  }

  function renderPrompt() {
    if (!promptShadow) return;
    const box = promptShadow.querySelector(".box");
    if (!box) return;
    const n = pending.size;
    if (n === 0) {
      hidePrompt();
      return;
    }
    const id = latestId();
    const info = pending.get(id);
    box.querySelector(".t").textContent =
      n === 1 ? "Sieve blocked a popup" : "Sieve blocked " + n + " popups";
    box.querySelector(".u").textContent = (info && info.url) || "";
    box.querySelector(".allow").textContent = n === 1 ? "Allow" : "Allow latest";
    promptHost.style.display = "";
  }

  function hidePrompt() {
    pending.clear();
    if (promptHost) promptHost.style.display = "none";
  }

  // ---------------------------------------------------------------------------
  // 1) window.open
  // ---------------------------------------------------------------------------
  function sieveOpen(url, target, features) {
    if (!enabled || whitelisted || !nativeOpen) {
      return nativeOpen ? nativeOpen(url, target, features) : null;
    }
    const dest = resolveUrl(url);
    block({
      url: dest ? dest.href : String(url || "(blank)"),
      kind: "window-open",
      label: "window.open",
      perform: () => nativeOpen(url, target, features),
    });
    return makeFakeWindow();
  }
  try {
    Object.defineProperty(sieveOpen, "name", { value: "open" });
    sieveOpen.toString = () => "function open() { [native code] }";
  } catch {
    /* cosmetic */
  }
  try {
    window.open = sieveOpen;
  } catch {
    /* locked */
  }

  // ---------------------------------------------------------------------------
  // 2) Programmatic anchor.click()
  // ---------------------------------------------------------------------------
  if (AProto && nativeAnchorClick) {
    AProto.click = function () {
      try {
        if (enabled && !whitelisted && this && opensNewWindow(this.getAttribute("target"))) {
          const dest = resolveUrl(this.getAttribute("href"));
          if (dest && !isDownloadOrSpecial(this, dest)) {
            const el = this;
            block({
              url: dest.href,
              kind: "anchor-click",
              label: "scripted link click",
              perform: () => nativeAnchorClick.call(el),
            });
            return undefined;
          }
        }
      } catch {
        /* fall through to native */
      }
      return nativeAnchorClick.apply(this, arguments);
    };
    try {
      AProto.click.toString = () => "function click() { [native code] }";
    } catch {
      /* cosmetic */
    }
  }

  // ---------------------------------------------------------------------------
  // 3) Programmatic form.submit() to a new window
  // ---------------------------------------------------------------------------
  if (FProto && nativeFormSubmit) {
    FProto.submit = function () {
      try {
        if (enabled && !whitelisted && this && opensNewWindow(this.getAttribute("target"))) {
          const dest = resolveUrl(this.getAttribute("action") || location.href);
          const form = this;
          block({
            url: dest ? dest.href : "",
            kind: "form-submit",
            label: "scripted form submit",
            perform: () => nativeFormSubmit.call(form),
          });
          return undefined;
        }
      } catch {
        /* fall through */
      }
      return nativeFormSubmit.apply(this, arguments);
    };
  }

  // ---------------------------------------------------------------------------
  // 4) Synthetic events: el.dispatchEvent(new MouseEvent('click')) etc.
  // ---------------------------------------------------------------------------
  EventTarget.prototype.dispatchEvent = function (evt) {
    try {
      if (
        enabled &&
        !whitelisted &&
        evt &&
        this &&
        this.nodeType === 1 &&
        (evt.type === "click" || evt.type === "submit")
      ) {
        const el = this;
        if (el.tagName === "A" && evt.type === "click" && opensNewWindow(el.getAttribute("target"))) {
          const dest = resolveUrl(el.getAttribute("href"));
          if (dest && !isDownloadOrSpecial(el, dest)) {
            block({
              url: dest.href,
              kind: "anchor-dispatch",
              label: "dispatched link click",
              perform: () => nativeDispatch.call(el, evt),
            });
            return false;
          }
        }
        if (el.tagName === "FORM" && evt.type === "submit" && opensNewWindow(el.getAttribute("target"))) {
          const dest = resolveUrl(el.getAttribute("action") || location.href);
          block({
            url: dest ? dest.href : "",
            kind: "form-dispatch",
            label: "dispatched form submit",
            perform: () => nativeDispatch.call(el, evt),
          });
          return false;
        }
      }
    } catch {
      /* fall through */
    }
    return nativeDispatch.apply(this, arguments);
  };

  // ---------------------------------------------------------------------------
  // 5) Real user click on a big, see-through covering link (overlay-link the
  //    DOM cleanup didn't catch). Genuine clicks on normal visible links are
  //    left alone — we don't prompt on every "open in new tab".
  // ---------------------------------------------------------------------------
  function onClickCapture(e) {
    if (!enabled || whitelisted) return;
    let a = null;
    try {
      const el = e.target && e.target.nodeType === 1 ? e.target : e.target && e.target.parentElement;
      a = el && el.closest ? el.closest("a[href]") : null;
    } catch {
      return;
    }
    if (!a || !opensNewWindow(a.getAttribute("target"))) return;
    const dest = resolveUrl(a.getAttribute("href"));
    if (!dest || isDownloadOrSpecial(a, dest)) return;
    if (dest.origin === location.origin) return;
    if (!isSeeThroughCover(a)) return; // only the invisible covering-link case
    try {
      e.preventDefault();
      e.stopImmediatePropagation();
    } catch {
      /* ignore */
    }
    block({ url: dest.href, kind: "covering-link", label: "full-page invisible link", perform: () => {} });
  }
  window.addEventListener("click", onClickCapture, true);
  window.addEventListener("auxclick", onClickCapture, true);

  // Ask the bridge for the current config (covers the load-order race).
  postToBridge("hello", {});
})();

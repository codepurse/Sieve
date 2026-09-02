// content/anti-adblock.js
// Sieve — anti-adblock defeat, MAIN-world half. Registered dynamically by
// background/anti-adblock.js only while the toggle is on, and never on a site
// the user allowlisted (that is done with excludeMatches — see that file).
//
// ---------------------------------------------------------------------------
// WHAT A SITE ACTUALLY MEASURES
//
// "You seem to be using an ad blocker" is a conclusion, and it is reached three
// different ways. They need three different answers, and only two of them live
// in this file:
//
//   1. A FAILED REQUEST. The page loads a known ad script and watches whether it
//      arrives — an onerror handler, or a later check of a global the script was
//      supposed to define. This is answered in background/ad-tracker-blocker.js,
//      by serving rules/noop.js instead of blocking: an empty script that
//      succeeds leaves nothing to notice. See NEUTERED_STUBS there.
//
//   2. A MISSING GLOBAL. window.canRunAds, adsbygoogle.loaded,
//      google_ad_status. Cheap to check, cheap to answer — job 1 below.
//
//   3. A BAIT ELEMENT. The page builds a div named like an ad slot, then reads
//      its height. A slot whose contents never loaded collapses to zero, and
//      zero is the answer the page was looking for — job 3 below.
//
// Plus one special case that is really its own industry: the detector
// LIBRARIES, BlockAdBlock and its descendants, which do all of the above behind
// an API the site calls. Job 2.
//
// ---------------------------------------------------------------------------
// WHY THIS IS IN THE MAIN WORLD AND WHAT THAT COSTS
//
// Every one of these is a page global or a page prototype, and an isolated
// content script has its own copies of both. There is no way to answer any of
// this from outside the page.
//
// The cost is that everything here is visible to the page, so this file leaves
// as little of itself lying around as it can. The one property it does add to
// window is non-enumerable and named for what it is rather than for Sieve —
// window.__slotShim and not __sieveAntiAdblock, because a feature whose whole
// purpose is not being spotted should not announce itself in a name a two-line
// script could grep for. That is obscurity and not protection: a page that
// guesses the name finds it. It still beats the alternative, and the rest of the
// extension's MAIN-world scripts (content/youtube-ads.js,
// content/facebook-ads.js) can afford a __sieve… hook because YouTube and
// Facebook are not asking that question.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT HERE
//
// window.googletag. The obvious next global to fake, and the one that bites.
// Sites gate real work on googletag.apiReady, then call googletag.pubads() — so
// a stub that claims to be ready without implementing the rest turns a missing
// ad into a thrown exception and a half-rendered page. Faking it properly means
// reimplementing the slot API, which is a few hundred lines and its own
// maintenance problem. Until that exists, gpt.js is answered with an empty
// script (so the request does not fail) and googletag is left undefined —
// exactly the state a blocked gpt.js already produces today, so nothing gets
// worse.
//
// Cosmetic filtering is not here either, and not anywhere: this feature hides
// no ad slots. That matters more than it sounds. Hiding a bait element with
// display:none is how a blocker ANSWERS the question the site is asking, which
// is why job 3 can safely claim every empty ad-shaped box is healthy — Sieve
// never emptied it. The requests were blocked; the boxes were left alone.

(() => {
  "use strict";

  // Re-entry guard. allFrames means this runs per frame, and a re-registration
  // after an extension update can inject twice into a live frame.
  if (Object.prototype.hasOwnProperty.call(window, "__slotShim")) return;

  // ==========================================================================
  // How long the lying lasts
  // ==========================================================================
  //
  // Job 3 patches getters the whole page uses, so leaving it installed forever
  // puts a JS frame on every layout read the page ever does. It does not need to
  // be forever: bait measurement happens while the page loads, because the site
  // wants its answer before it decides what to render.
  //
  // So the patches are installed at document_start and REMOVED again once the
  // window closes, restoring the original descriptors. After that the cost is
  // not "small", it is zero — there is nothing left on the prototype.
  //
  // Each actual lie pushes the deadline out, bounded by a hard cap: if something
  // is still probing at second nine it is worth answering at second nineteen,
  // but a page that probes on a loop should not hold the patches open all day.
  const PROBE_WINDOW_MS = 10000;
  const PROBE_WINDOW_CAP_MS = 60000;

  const installedAt = Date.now();
  let deadline = installedAt + PROBE_WINDOW_MS;
  let lies = 0;

  function windowOpen() {
    return Date.now() < deadline;
  }

  function extend() {
    lies++;
    deadline = Math.min(Date.now() + PROBE_WINDOW_MS, installedAt + PROBE_WINDOW_CAP_MS);
  }

  // ==========================================================================
  // Job 1 — the globals a detector reads
  // ==========================================================================
  //
  // Defined non-writable and non-configurable, which is the point rather than
  // tidiness: a detector's own script commonly sets canRunAds = false itself and
  // then reads it back later. A writable answer is no answer.
  //
  // The consequence, stated plainly: page code assigning one of these in strict
  // mode throws, and the rest of THAT script does not run. For these particular
  // names the script doing the assigning is the detector, so that is the desired
  // outcome and not collateral damage — but it is why this list is short and
  // contains nothing an ordinary page has a reason to own.
  //
  // enumerable: true on purpose. The real globals are enumerable, and a shim
  // that is invisible to Object.keys(window) while being visible to `in` is a
  // difference a detector can see.
  function pin(name, value) {
    try {
      if (Object.prototype.hasOwnProperty.call(window, name)) return false;
      Object.defineProperty(window, name, {
        value,
        writable: false,
        configurable: false,
        enumerable: true,
      });
      return true;
    } catch {
      // A page that got there first with its own non-configurable property. It
      // already has an answer; leave it alone.
      return false;
    }
  }

  // "Can I run ads?" — yes. "Is a blocker active?" — no. The two spellings of
  // each are both in the wild and cost nothing to cover.
  const CLEAN_FLAGS = {
    canRunAds: true,
    canShowAds: true,
    isAdBlockActive: false,
    adBlockDetected: false,
    adblockDetected: false,
    // AdSense sets this to 1 when a slot fills. Detectors read it as "did any
    // advert actually arrive".
    google_ad_status: 1,
  };
  for (const [flagName, flagValue] of Object.entries(CLEAN_FLAGS)) pin(flagName, flagValue);

  // adsbygoogle is not a flag, it is the queue AdSense drains: page code does
  // (adsbygoogle = window.adsbygoogle || []).push({...}). So it has to stay a
  // real array that accepts pushes — the only thing added is the `loaded` marker
  // detectors read. Left WRITABLE, unlike the flags above, precisely because the
  // real AdSense script replaces this object when it is not blocked (an
  // allowlisted site, a host EasyList carves out) and must be allowed to.
  try {
    if (!window.adsbygoogle) {
      const queue = [];
      queue.loaded = true;
      window.adsbygoogle = queue;
    } else if (window.adsbygoogle.loaded === undefined) {
      window.adsbygoogle.loaded = true;
    }
  } catch {
    /* frozen or already owned — nothing to do */
  }

  // ==========================================================================
  // Job 2 — the detector libraries
  // ==========================================================================
  //
  // BlockAdBlock / FuckAdBlock (the same library under two names) and the
  // handful that copy its shape. A site does:
  //
  //     fuckAdBlock.onDetected(showTheWall);
  //     fuckAdBlock.onNotDetected(showTheContent);
  //     fuckAdBlock.check();
  //
  // The trick is not to remove the library — the site's own code calls into it
  // and would throw if it were missing. It is to BE the library, and answer
  // honestly-shaped "no blocker here": run the onNotDetected callbacks, never
  // run the onDetected ones.
  //
  // Installing this at document_start also locks the name, so when the real
  // library loads afterwards and does window.FuckAdBlock = FuckAdBlock the
  // assignment is refused. Either it fails quietly or, in strict mode, it throws
  // and takes the rest of the library's script with it. Both are fine.
  //
  // Callbacks are fired asynchronously, because the real library does: a site
  // that calls onNotDetected(cb) and then keeps setting things up must not have
  // cb run in the middle of that.
  function later(fn) {
    if (typeof fn !== "function") return;
    try {
      setTimeout(() => {
        try {
          fn();
        } catch {
          /* the site's own callback threw — not ours to handle */
        }
      }, 0);
    } catch {
      /* no timers in this context */
    }
  }

  function FakeDetector() {
    // The real library exposes these and sites read them.
    this.version = "3.2.1";
    this.options = {};
  }

  FakeDetector.prototype = {
    constructor: FakeDetector,
    setOption(name, value) {
      if (name && typeof name === "object") Object.assign(this.options, name);
      else this.options[name] = value;
      return this;
    },
    // The site is asking to be told. Only the "clean" half of the register is
    // ever kept — a callback handed to onDetected is dropped on the floor rather
    // than stored, so nothing can fire it later by accident.
    onDetected() {
      return this;
    },
    onNotDetected(fn) {
      later(fn);
      return this;
    },
    on(detected, fn) {
      if (!detected) later(fn);
      return this;
    },
    clearEvent() {
      return this;
    },
    emitEvent() {
      return this;
    },
    // check() returns true in the real library meaning "the check ran", not
    // "a blocker was found". The verdict arrives through the callbacks.
    check() {
      return true;
    },
  };

  // Both capitalisations of both names, plus the ones that copied the shape.
  // Constructors get the class; the lowercase spellings are the ready-made
  // instance the library normally assigns on load.
  const DETECTOR_CTORS = ["BlockAdBlock", "FuckAdBlock", "SniffAdBlock", "AdBlockDetector"];
  const DETECTOR_INSTANCES = ["blockAdBlock", "fuckAdBlock", "sniffAdBlock", "adBlockDetector"];
  for (const ctorName of DETECTOR_CTORS) pin(ctorName, FakeDetector);
  for (const instName of DETECTOR_INSTANCES) pin(instName, new FakeDetector());

  // ==========================================================================
  // Job 3 — the bait element
  // ==========================================================================
  //
  // The measurement, in every variant seen in the wild:
  //
  //     var bait = document.createElement("div");
  //     bait.className = "ad-banner ads adsbox";
  //     document.body.appendChild(bait);
  //     if (bait.offsetHeight === 0) blocked();
  //
  // …with getComputedStyle(bait).display and getBoundingClientRect().height as
  // the other two spellings of the same question.
  //
  // WHICH ELEMENTS WE LIE ABOUT, and why the test is the way it is.
  //
  // Matching "ad" as a SUBSTRING of the id or class is the classic bug in this
  // kind of code: it hits shadow, header, gradient, padding, download, loading,
  // read, and thread. So the name is TOKENISED first — split on punctuation and
  // on camelCase humps — and the tokens are compared whole. "ad-banner" and
  // "adBanner" both yield an "ad" token; "gradient" yields "gradient".
  //
  // Two further conditions, both there to keep the lie away from real layout:
  //
  //   • the box must be EMPTY of visible text. A bait div is empty by
  //     construction, and so is an ad slot whose contents were blocked. A real
  //     component that happens to tokenise as ad-something almost always has
  //     text in it.
  //   • the probe window must still be open (see above).
  //
  // The residual risk, honestly: a site's own layout code that measures an empty
  // ad container during the first ten seconds and collapses the row when it is
  // zero will now be told 250 and leave a gap — the opposite of what anyone
  // wants. That is the trade for defeating detection at all, it is bounded to
  // the probe window, and it is why the token list stays narrow.
  const BAIT_TOKENS = new Set([
    "ad", "ads", "advert", "adverts", "advertising", "advertisement", "advertisements",
    "adbanner", "adbanners", "adbox", "adsbox", "adslot", "adslots", "adunit", "adunits",
    "adzone", "adframe", "adarea", "adspace", "adwrapper", "adcontainer", "adheader",
    "adfooter", "adsense", "adsbygoogle", "adtest", "bannerad", "textads", "googlead",
    "googleads", "sponsoredads",
  ]);

  // A few names that only make sense whole — a slot size joined by underscores
  // would be split into meaningless pieces by the tokeniser, and "300x250" on
  // its own is not evidence of anything.
  const BAIT_WHOLE = new Set(["pub_300x250", "banner_ad", "ad_300x250", "div-gpt-ad"]);

  // Split a name into whole words. Punctuation and camelCase humps separate;
  // "adBanner" must not survive as one token or the whole-word comparison never
  // fires.
  //
  // Exposed for the tests: this function and BAIT_TOKENS together decide
  // everything job 3 does, and both of its failure directions are silent.
  function tokensOf(name) {
    if (!name || typeof name !== "string") return [];
    return name
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  function nameLooksLikeBait(name) {
    if (!name || typeof name !== "string") return false;
    const lower = name.toLowerCase();
    // Whole-string names first, and each space-separated word of a class list,
    // so `class="foo pub_300x250"` is caught before the tokeniser gets to it.
    for (const word of lower.split(/\s+/)) {
      if (BAIT_WHOLE.has(word)) return true;
      // div-gpt-ad-12345 and friends: a prefix match is right here because the
      // suffix is a generated slot id.
      if (word.startsWith("div-gpt-ad")) return true;
    }
    for (const t of tokensOf(name)) if (BAIT_TOKENS.has(t)) return true;
    return false;
  }

  // The verdict is cached per element: the getters below are on the hot path of
  // every layout read the page makes while the window is open, and re-reading
  // three attributes each time is the one cost worth removing.
  const verdicts = new WeakMap();

  function isBait(el) {
    if (!el || el.nodeType !== 1) return false;
    const cached = verdicts.get(el);
    if (cached !== undefined) return cached;

    let verdict = false;
    try {
      // getAttribute("class") and not className: on an SVG element className is
      // an SVGAnimatedString, and String()-ing it gives "[object …]".
      const named =
        nameLooksLikeBait(el.id) ||
        nameLooksLikeBait(el.getAttribute("class")) ||
        nameLooksLikeBait(el.getAttribute("name"));
      // textContent walks the subtree, so it is asked only after the cheap name
      // test has already said yes, and the answer is cached either way.
      verdict = named && !(el.textContent || "").trim();
    } catch {
      verdict = false;
    }
    verdicts.set(el, verdict);
    return verdict;
  }

  function shouldLie(el) {
    return windowOpen() && isBait(el);
  }

  // The dimensions to claim. 300x250 is the medium rectangle — the commonest
  // slot on the web, and therefore the least remarkable answer to give.
  const FAKE_W = 300;
  const FAKE_H = 250;

  // Patches are recorded as they go on so they can all come off again when the
  // window closes. Restoring the ORIGINAL descriptor rather than deleting the
  // property matters: these are inherited accessors, and a delete would leave
  // the prototype without them.
  const restores = [];

  function patchAccessor(proto, prop, fake) {
    if (!proto) return;
    const original = Object.getOwnPropertyDescriptor(proto, prop);
    if (!original || typeof original.get !== "function") return;
    try {
      Object.defineProperty(proto, prop, {
        ...original,
        get() {
          if (shouldLie(this)) {
            extend();
            return fake;
          }
          return original.get.call(this);
        },
      });
      restores.push(() => Object.defineProperty(proto, prop, original));
    } catch {
      /* a browser that will not let this be redefined — the other jobs stand */
    }
  }

  // The two prototypes are NOT interchangeable, and getting it wrong fails
  // silently: patchAccessor finds no descriptor and returns, so that property
  // keeps telling the truth and a detector reading it gets its answer.
  //
  //   offsetHeight / offsetWidth / offsetParent  →  HTMLElement.prototype
  //   clientHeight / clientWidth                 →  Element.prototype
  //
  // (This was caught by a real browser, not by the unit tests: a hand-built
  // fake will happily put all five in one place.)
  const HTML_PROTO = window.HTMLElement && window.HTMLElement.prototype;
  const EL_PROTO = window.Element && window.Element.prototype;
  patchAccessor(HTML_PROTO, "offsetHeight", FAKE_H);
  patchAccessor(HTML_PROTO, "offsetWidth", FAKE_W);
  patchAccessor(EL_PROTO, "clientHeight", FAKE_H);
  patchAccessor(EL_PROTO, "clientWidth", FAKE_W);

  // offsetParent === null is the other way of asking "is this rendered at all",
  // and it is null for a display:none element regardless of its height. Answer
  // it with a node that is genuinely in the document rather than a fabricated
  // one, so anything the page does with the answer still works.
  if (HTML_PROTO) {
    const original = Object.getOwnPropertyDescriptor(HTML_PROTO, "offsetParent");
    if (original && typeof original.get === "function") {
      try {
        Object.defineProperty(HTML_PROTO, "offsetParent", {
          ...original,
          get() {
            const real = original.get.call(this);
            if (real === null && shouldLie(this)) {
              extend();
              const parent = this.parentElement;
              return (parent && parent !== this ? parent : null) || document.body;
            }
            return real;
          },
        });
        restores.push(() => Object.defineProperty(HTML_PROTO, "offsetParent", original));
      } catch {
        /* as above */
      }
    }
  }

  // getBoundingClientRect. The real rect is kept for x/y so a page that uses the
  // position for anything real still gets the truth; only the size is invented.
  function fakeRect(rect) {
    const x = (rect && (rect.x || rect.left)) || 0;
    const y = (rect && (rect.y || rect.top)) || 0;
    return {
      x,
      y,
      top: y,
      left: x,
      width: FAKE_W,
      height: FAKE_H,
      right: x + FAKE_W,
      bottom: y + FAKE_H,
      toJSON() {
        return { ...this };
      },
    };
  }

  if (EL_PROTO) {
    const original = EL_PROTO.getBoundingClientRect;
    if (typeof original === "function") {
      try {
        EL_PROTO.getBoundingClientRect = function sieveGetBoundingClientRect() {
          const rect = original.apply(this, arguments);
          if (!shouldLie(this)) return rect;
          extend();
          return fakeRect(rect);
        };
        restores.push(() => {
          EL_PROTO.getBoundingClientRect = original;
        });
      } catch {
        /* as above */
      }
    }

    // getClientRects().length === 0 is the third spelling of "did this render",
    // and it is the one a rect-based check falls back to: a display:none element
    // returns an EMPTY list however plausible its getBoundingClientRect looks.
    // Answering the first two and not this one leaves the question open.
    const originalRects = EL_PROTO.getClientRects;
    if (typeof originalRects === "function") {
      try {
        EL_PROTO.getClientRects = function sieveGetClientRects() {
          const rects = originalRects.apply(this, arguments);
          if (!shouldLie(this)) return rects;
          extend();
          // A plain array, not a DOMRectList — that type cannot be constructed
          // from script. Everything a page does with the result (length, [0],
          // for…of, item()) works the same way on this.
          const list = [fakeRect(rects && rects[0])];
          list.item = (i) => list[i] || null;
          return list;
        };
        restores.push(() => {
          EL_PROTO.getClientRects = originalRects;
        });
      } catch {
        /* as above */
      }
    }
  }

  // getComputedStyle. Returned as a Proxy over the REAL declaration rather than
  // a hand-built object: a CSSStyleDeclaration has hundreds of properties plus
  // indexed access, and a page reading any of the ones we did not think to fake
  // must still get a real answer. Only the properties that answer "is this
  // visible" are overridden, and getPropertyValue is intercepted too because
  // that is the other spelling of the same read.
  {
    const original = window.getComputedStyle;
    if (typeof original === "function") {
      const FAKED = {
        display: "block",
        visibility: "visible",
        opacity: "1",
        height: FAKE_H + "px",
        width: FAKE_W + "px",
      };
      try {
        window.getComputedStyle = function sieveGetComputedStyle(el, pseudo) {
          const real = original.call(window, el, pseudo);
          if (pseudo || !shouldLie(el)) return real;
          extend();
          return new Proxy(real, {
            get(target, prop) {
              if (prop === "getPropertyValue") {
                return (name) =>
                  Object.prototype.hasOwnProperty.call(FAKED, name)
                    ? FAKED[name]
                    : target.getPropertyValue(name);
              }
              if (typeof prop === "string" && Object.prototype.hasOwnProperty.call(FAKED, prop)) {
                return FAKED[prop];
              }
              const value = target[prop];
              // Methods must keep their receiver, or the CSSStyleDeclaration
              // throws an illegal-invocation when called on the Proxy.
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        };
        restores.push(() => {
          window.getComputedStyle = original;
        });
      } catch {
        /* as above */
      }
    }
  }

  // Take the patches off once the window has closed for good. Checked on a slow
  // interval rather than a single timer because the deadline moves: each lie
  // pushes it out, so there is no one moment known up front.
  let sweeper = null;
  function stopLying() {
    if (sweeper) {
      clearInterval(sweeper);
      sweeper = null;
    }
    while (restores.length) {
      try {
        restores.pop()();
      } catch {
        /* leave it patched rather than throw during teardown */
      }
    }
  }
  try {
    sweeper = setInterval(() => {
      if (!windowOpen()) stopLying();
    }, 2000);
  } catch {
    /* no timers — the patches stay, which is the safe direction */
  }

  // ==========================================================================
  // The one thing left on window
  // ==========================================================================
  //
  // Non-enumerable, so Object.keys(window), for…in and spread do not see it.
  // Doubles as the re-entry guard at the top of the file and as the handle the
  // tests and a console session drive:
  //   window.__slotShim.tokensOf("adBanner")   → ["ad","banner"]
  //   window.__slotShim.state()                → { lies, open, patched, msLeft }
  Object.defineProperty(window, "__slotShim", {
    value: {
      tokensOf,
      nameLooksLikeBait,
      isBait,
      FakeDetector,
      stopLying,
      state: () => ({
        lies,
        open: windowOpen(),
        patched: restores.length,
        msLeft: deadline - Date.now(),
      }),
    },
    writable: false,
    configurable: false,
    enumerable: false,
  });
})();

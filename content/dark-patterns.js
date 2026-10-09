// content/dark-patterns.js
// Sieve — Dark Pattern Blocker coordinator (Module 3A).
// Registers individual pattern detectors and runs them on page load and on
// DOM mutations. Each thing a detector finds is a "tell": it is recorded here,
// answered at the level the intervention ladder picks (see below), listed in
// the toolbar popup's "On this page", and counted on the toolbar badge.

(() => {
  "use strict";

  if (window.__sieveDarkPatternsActive) return;
  window.__sieveDarkPatternsActive = true;

  const STORAGE_KEYS = {
    master: "darkPatternsEnabled",
    timers: "darkPatternTimersEnabled",
    guiltCopy: "darkPatternGuiltCopyEnabled",
    checkboxes: "darkPatternCheckboxesEnabled",
    cookies: "darkPatternCookiesEnabled",
    scarcity: "darkPatternScarcityEnabled",
    trials: "darkPatternTrialsEnabled",
    socialProof: "darkPatternSocialProofEnabled",
  };

  const PATTERN_TYPES = Object.keys(STORAGE_KEYS).filter((k) => k !== "master");

  // In-memory tally for this page only.
  const counts = {};
  for (const type of PATTERN_TYPES) counts[type] = 0;
  let totalCount = 0;

  // Coalescing window for the mutation observer, and the ceiling on how many
  // distinct roots one window may hold before it gives up and rescans the body.
  const THROTTLE_MS = 250;
  const MAX_PENDING = 400;

  let settings = {};
  let observer = null;
  let pendingNodes = new Set();
  let wantFullScan = false;
  let debounceTimer = null;

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  // How firmly Sieve answers what it finds — see the ladder below. Not one of
  // the on/off switches, so it is kept out of STORAGE_KEYS.
  const STRICTNESS_KEY = "tellsStrictness";
  let strictness = "balanced";

  async function loadSettings() {
    const defaults = { [STORAGE_KEYS.master]: true, [STRICTNESS_KEY]: "balanced" };
    for (const type of PATTERN_TYPES) defaults[STORAGE_KEYS[type]] = true;
    settings = await chrome.storage.local.get(defaults);
    strictness = LADDER[settings[STRICTNESS_KEY]] ? settings[STRICTNESS_KEY] : "balanced";
  }

  function isTypeEnabled(type) {
    return settings[STORAGE_KEYS.master] && settings[STORAGE_KEYS[type]];
  }

  // ---------------------------------------------------------------------------
  // Detector registry
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Word matching, shared by the detectors that read page text.
  //
  // All three of them used `haystack.includes(word)` over a list of short words,
  // and all three were wrong in the same way, because English is full of short
  // words inside longer ones:
  //
  //   "no"     matched Know, Economy, Ignore, Nothing, Announce, Diagnose
  //   "pass"   matched password, passenger, compass
  //   "text"   matched context, textile, next
  //   "ok"     matched Cookie -- on a COOKIE BANNER, which is the one place
  //            that detector runs
  //
  // The consequences were not cosmetic. guilt-copy replaced the words on five
  // ordinary buttons with "No thanks"; checkboxes badged a terms-of-service
  // box; and the cookie leveler picked "Cookie settings" as both the Accept and
  // the Reject button and therefore stood down on exactly the banner it exists
  // for. All three failed silently, because nobody reports a button that still
  // says the right thing.
  //
  // So: match WORDS. A phrase is matched whole, at word boundaries, with the
  // regex built once and cached. Entries that begin or end with punctuation --
  // an emoji, a "×" -- get a plain substring test instead, because \b only
  // anchors against word characters and would never match them.
  //
  // Deliberately NOT global: a `g` regex carries lastIndex between calls, so a
  // cached one would match on one element and skip the next.
  const phraseCache = new Map();

  function phraseRegex(phrase) {
    if (phraseCache.has(phrase)) return phraseCache.get(phrase);
    let re = null;
    const escaped = String(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const left = /^\w/.test(phrase) ? "\\b" : "";
    const right = /\w$/.test(phrase) ? "\\b" : "";
    try {
      re = new RegExp(left + escaped + right, "i");
    } catch (_) {
      re = null; // fall back to includes() below
    }
    phraseCache.set(phrase, re);
    return re;
  }

  /** True if `phrase` appears in `haystack` as a whole word or phrase. */
  function hasWord(haystack, phrase) {
    const text = String(haystack || "");
    if (!text || !phrase) return false;
    const re = phraseRegex(phrase);
    return re ? re.test(text) : text.toLowerCase().includes(String(phrase).toLowerCase());
  }

  /** True if ANY of `phrases` appears in `haystack` as a whole word. */
  function hasAnyWord(haystack, phrases) {
    for (const phrase of phrases) {
      if (hasWord(haystack, phrase)) return true;
    }
    return false;
  }

  const detectors = new Map();

  function registerDetector(type, detector) {
    if (!PATTERN_TYPES.includes(type)) {
      console.warn("[Sieve] Unknown dark pattern type registered:", type);
      return;
    }
    detectors.set(type, detector);
  }

  // ---------------------------------------------------------------------------
  // The shared text walk.
  //
  // Two detectors — timers and scarcity — used to do the same thing: build a
  // TreeWalker over every text node under the root, with a JS acceptNode filter
  // testing one regex, and act on the parents of the nodes that matched. Two
  // walks, over the same nodes, in the same pass, neither aware of the other.
  // Measured separately on a 112,000-element page: 57.8ms and 38.7ms.
  //
  // The walk is the expensive half, not the regex, so they now share one. A
  // detector declares its pattern and what to do with a match, and this does a
  // single pass testing every active pattern per node.
  //
  // Note the `null` filter: a JS acceptNode callback is invoked for every node
  // in the subtree, across the JS/C++ boundary. Filtering in the loop instead
  // keeps the walk itself native.
  const textVisitors = []; // { type, pattern, onMatch }

  // Nothing any registered pattern can match is shorter than this. "0:00" is
  // the shortest thing TIME_TEXT_RE accepts.
  const MIN_TEXT_LENGTH = 4;

  function registerTextVisitor(type, pattern, onMatch) {
    if (!PATTERN_TYPES.includes(type)) {
      console.warn("[Sieve] Unknown dark pattern type registered:", type);
      return;
    }
    if (!(pattern instanceof RegExp) || typeof onMatch !== "function") {
      console.warn("[Sieve] registerText needs a RegExp and a function:", type);
      return;
    }
    if (pattern.global || pattern.sticky) {
      // lastIndex would carry between nodes and make every other test miss.
      console.warn("[Sieve] registerText refuses a g/y pattern:", type);
      return;
    }
    textVisitors.push({ type, pattern, onMatch });
  }

  function scanTextNodes(root) {
    const active = textVisitors.filter((v) => isTypeEnabled(v.type));
    if (active.length === 0) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue;
      if (!value || value.length < MIN_TEXT_LENGTH) continue;
      const el = node.parentElement;
      if (!el || isMarked(el)) continue;
      for (const visitor of active) {
        if (!visitor.pattern.test(value)) continue;
        try {
          visitor.onMatch(el, detectorCtx);
        } catch (err) {
          console.error("[Sieve] Dark pattern text visitor failed:", visitor.type, err);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Element marking helpers — avoid processing the same element twice.
  // ---------------------------------------------------------------------------

  const DATA_ATTR = "data-sieve-dp";

  function markElement(el, type) {
    if (el && el.nodeType === Node.ELEMENT_NODE) {
      el.setAttribute(DATA_ATTR, type);
    }
  }

  function isMarked(el) {
    return el && el.nodeType === Node.ELEMENT_NODE && el.hasAttribute(DATA_ATTR);
  }

  // ---------------------------------------------------------------------------
  // Counting + reporting
  // ---------------------------------------------------------------------------

  function reportIntervention(type, delta) {
    if (!delta || delta < 1) return;
    counts[type] = (counts[type] || 0) + delta;
    totalCount += delta;

    // Also feed the shared Protection Dashboard stats store.
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: "darkPatterns", count: delta })
        .catch(() => {});
    } catch (err) {
      // Extension context may be unavailable in unusual conditions.
    }
  }

  function getCounts() {
    return { total: totalCount, byType: { ...counts } };
  }

  // A message to the service worker that nobody waits on. sendMessage returns a
  // promise in the extension and may not anywhere else, so this does not assume.
  function send(message) {
    try {
      const pending = chrome.runtime.sendMessage(message);
      if (pending && typeof pending.catch === "function") pending.catch(() => {});
    } catch (_) {
      // Extension context gone (updated or reloaded under the page).
    }
  }

  // ---------------------------------------------------------------------------
  // The intervention ladder.
  //
  // Every finding carries how sure its detector is — low, medium or high — and
  // the user's strictness setting turns that into what Sieve does on the page:
  //
  //   0  note    listed in the toolbar popup; nothing on the page changes
  //   1  label   a small Sieve stamp beside it; the page is otherwise untouched
  //   2  defuse  the detector's own reversible fix: hide, dim, rewrite, level
  //   3  cover   hidden behind a note saying what Sieve found, with "Show it"
  //
  // The rule that makes the rest safe: something Sieve is NOT sure about is
  // never more than labelled, whatever the setting. A wrong guess then costs
  // the page a stamp, never a broken button. At the default setting only
  // evidence — a countdown the Claim Ledger caught restarting — earns a cover.
  // ---------------------------------------------------------------------------

  const LEVEL = { NOTE: 0, LABEL: 1, DEFUSE: 2, COVER: 3 };

  const LADDER = {
    gentle: { low: LEVEL.NOTE, medium: LEVEL.LABEL, high: LEVEL.LABEL },
    balanced: { low: LEVEL.LABEL, medium: LEVEL.DEFUSE, high: LEVEL.COVER },
    firm: { low: LEVEL.LABEL, medium: LEVEL.COVER, high: LEVEL.COVER },
  };

  // The most ANY setting may do with a finding of this confidence.
  const CEILING = { low: LEVEL.LABEL, medium: LEVEL.COVER, high: LEVEL.COVER };

  function chooseLevel(confidence, strictnessName, maxLevel) {
    const row = LADDER[strictnessName] || LADDER.balanced;
    const want = row[confidence];
    if (want === undefined) return LEVEL.NOTE;
    const cap = maxLevel === undefined ? LEVEL.COVER : maxLevel;
    return Math.max(LEVEL.NOTE, Math.min(want, CEILING[confidence], cap));
  }

  // What a finding is CAPABLE of: a cover needs nothing from the detector, but
  // a defuse needs its fix, and a detector may cap itself lower still.
  function maxLevelOf(spec) {
    const can = spec.cover ? LEVEL.COVER : spec.defuse ? LEVEL.DEFUSE : LEVEL.LABEL;
    return spec.maxLevel === undefined ? can : Math.min(can, spec.maxLevel);
  }

  // ---------------------------------------------------------------------------
  // Tells — the findings on this page.
  //
  // A detector hands over the element and a spec:
  //
  //   type        one of PATTERN_TYPES
  //   confidence  "low" | "medium" | "high"
  //   maxLevel    optional cap, e.g. LEVEL.NOTE for "seen it, watching it"
  //   trick       false for a finding that is NOT a trick (a countdown that kept
  //               its end time); it is listed, but not counted on the badge
  //   title       a few words: "Fake countdown"
  //   detail      one plain sentence of evidence
  //   label       the stamp's text at level 1
  //   labelWith   optional (el, finding) -> undo, the detector's own stamp
  //   defuse      optional (el, ui, finding) -> undo, the detector's reversible
  //               fix; `ui` is content/tells-ui.js when the fix draws
  //   drawn       true if that fix draws something of Sieve's own (a note
  //               beside a free trial), so it needs content/tells-ui.js
  //   done        the word for what the fix did: "Hidden", "Dimmed"
  //   cover       true if the element may be covered at level 3
  //   actions     optional (finding) -> [{ id, label, disabled }], buttons the
  //               popup shows for this finding ("Remind me on Tue, Oct 13")
  //   onAction    optional (id, finding) -> promise, what a button does; the
  //               finding is redrawn afterwards so its own buttons catch up
  //
  // Every treatment returns its own undo, so the ladder can move a finding up
  // or down when the setting changes, and the popup can put any of it back.
  // ---------------------------------------------------------------------------

  const tells = [];
  let nextTellId = 1;

  function tell(el, spec) {
    if (!el || !spec || !PATTERN_TYPES.includes(spec.type)) return null;
    const finding = { id: nextTellId++, el, spec, level: -1, undo: null, undone: false, counted: false, cover: null };
    tells.push(finding);
    applyLevel(finding);
    scheduleBadge();
    return finding;
  }

  function revert(finding) {
    const undo = finding.undo;
    finding.undo = null;
    finding.level = -1;
    if (typeof undo !== "function") return;
    try {
      undo();
    } catch (err) {
      console.error("[Sieve] Could not undo a dark pattern fix:", finding.spec.type, err);
    }
  }

  function applyLevel(finding) {
    let target = finding.undone ? -1 : chooseLevel(finding.spec.confidence, strictness, maxLevelOf(finding.spec));

    // A stamp or a cover needs content/tells-ui.js. Ask for it and come back
    // when it is here; if it cannot come, do what needs no drawing instead.
    if (needsDrawing(finding, target) && !window.SieveTellsUI) {
      if (!PARTS.ui.failed) {
        ensureUI().then(() => applyLevel(finding));
        return;
      }
      const plainFix = finding.spec.defuse && !finding.spec.drawn;
      target = target === LEVEL.COVER && plainFix ? LEVEL.DEFUSE : LEVEL.NOTE;
    }

    if (target === finding.level) return;
    revert(finding);
    finding.level = target;
    const ui = window.SieveTellsUI;
    try {
      if (target === LEVEL.LABEL) {
        finding.undo = finding.spec.labelWith ? finding.spec.labelWith(finding.el) : ui.addLabel(finding.el, finding);
      } else if (target === LEVEL.DEFUSE) {
        finding.undo = finding.spec.defuse(finding.el, ui, finding);
      } else if (target === LEVEL.COVER) {
        finding.undo = ui.addCover(finding, () => {
          undoTell(finding);
          scheduleBadge(true);
        });
      }
    } catch (err) {
      console.error("[Sieve] Dark pattern fix failed:", finding.spec.type, err);
    }
    // Counted once, the first time Sieve does anything a person can see.
    if (target >= LEVEL.LABEL && !finding.counted) {
      finding.counted = true;
      reportIntervention(finding.spec.type, 1);
    }
  }

  function isLive(finding) {
    return finding.el.isConnected || !!(finding.cover && finding.cover.isConnected);
  }

  function relevelAll() {
    for (const finding of tells) if (isLive(finding)) applyLevel(finding);
    scheduleBadge(true);
  }

  function findTell(id) {
    return tells.find((t) => t.id === id) || null;
  }

  function undoTell(finding) {
    if (finding.undone) return;
    finding.undone = true;
    applyLevel(finding);
  }

  function redoTell(finding) {
    if (!finding.undone) return;
    finding.undone = false;
    applyLevel(finding);
  }

  // A finding's own button ("Remind me"), pressed on the page or in the popup.
  // Afterwards the finding is redrawn, so a note on the page shows the same
  // state as the popup does.
  function runAction(finding, id) {
    if (!finding || typeof finding.spec.onAction !== "function") return Promise.resolve();
    return Promise.resolve(finding.spec.onAction(id, finding))
      .catch((err) => console.error("[Sieve] Dark pattern action failed:", finding.spec.type, err))
      .then(() => {
        if (finding.level < LEVEL.LABEL) return;
        revert(finding);
        applyLevel(finding);
      });
  }

  // --- the badge -------------------------------------------------------------

  const BADGE_DELAY_MS = 250;
  let badgeTimer = null;
  let lastBadge = -1;

  function trickCount() {
    let n = 0;
    for (const finding of tells) if (finding.spec.trick !== false && isLive(finding)) n++;
    return n;
  }

  function scheduleBadge(force) {
    if (force) lastBadge = -1;
    if (badgeTimer !== null || tells.length === 0) return;
    badgeTimer = setTimeout(() => {
      badgeTimer = null;
      const n = trickCount();
      if (n === lastBadge) return;
      lastBadge = n;
      send({ type: "sieve:tells-count", count: n });
    }, BADGE_DELAY_MS);
  }

  // --- the report the popup reads ---------------------------------------------

  const LEVEL_WORDS = ["Noted", "Labelled", "Fixed", "Covered"];

  function describe(finding) {
    const trick = finding.spec.trick !== false;
    let done;
    if (finding.undone) done = "Put back";
    else if (finding.level === LEVEL.DEFUSE) done = finding.spec.done || LEVEL_WORDS[LEVEL.DEFUSE];
    else if (finding.level === LEVEL.NOTE && !trick) done = "Watching";
    else done = LEVEL_WORDS[finding.level] || "";
    return {
      id: finding.id,
      type: finding.spec.type,
      title: finding.spec.title || "",
      detail: finding.spec.detail || "",
      confidence: finding.spec.confidence,
      level: finding.level,
      trick,
      done,
      undone: finding.undone,
      canUndo: finding.undone || finding.level >= LEVEL.LABEL,
      actions: typeof finding.spec.actions === "function" ? finding.spec.actions(finding) : [],
    };
  }

  function tellsReport() {
    return {
      enabled: !!settings[STORAGE_KEYS.master],
      strictness,
      tells: tells.filter(isLive).map(describe),
    };
  }

  // ---------------------------------------------------------------------------
  // Drawing on the page. The stamp (label), the cover and the ring that answers
  // "Show me" live in content/tells-ui.js, which is not injected with this file:
  // most pages never have anything to draw, and every page would pay for it.
  // The first time a finding needs drawing, the service worker injects it
  // (sieve:tells-ui) and the finding waits until it arrives. If it cannot
  // arrive, a finding falls back to what needs no drawing — see applyLevel().
  // ---------------------------------------------------------------------------

  // The same goes for the free-trial warning's reading half
  // (content/trial-terms.js): only a page that mentions a free trial needs it.
  // Each part is fetched at most once per page; `failed` remembers a part that
  // could not come, so nothing waits on it again.
  const PARTS = {
    ui: { ready: () => !!window.SieveTellsUI, loading: null, failed: false },
    trials: { ready: () => !!window.SieveTrials, loading: null, failed: false },
  };

  // Asked again if the first request gets no file: the first page after the
  // extension is installed or updated can be talking to a service worker that
  // is still starting, and a lost request used to leave that page without the
  // part for good — a free trial seen and never explained.
  const PART_RETRY_MS = [600, 1500];

  function requestPart(name) {
    return new Promise((resolve) => {
      try {
        const pending = chrome.runtime.sendMessage({ type: "sieve:tells-ui", part: name });
        if (pending && typeof pending.then === "function") pending.then(resolve, () => resolve(null));
        else resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  function loadPart(name) {
    const part = PARTS[name];
    if (!part) return Promise.resolve(false);
    if (part.ready()) return Promise.resolve(true);
    if (!part.loading) {
      part.loading = (async () => {
        for (let attempt = 0; ; attempt++) {
          await requestPart(name);
          if (part.ready() || attempt >= PART_RETRY_MS.length) break;
          await new Promise((r) => setTimeout(r, PART_RETRY_MS[attempt]));
          if (part.ready()) break;
        }
        part.failed = !part.ready();
        return !part.failed;
      })();
    }
    return part.loading;
  }

  function ensureUI() {
    return loadPart("ui");
  }

  function needsDrawing(finding, level) {
    return (
      level === LEVEL.COVER ||
      (level === LEVEL.LABEL && !finding.spec.labelWith) ||
      (level === LEVEL.DEFUSE && !!finding.spec.drawn)
    );
  }

  // ---------------------------------------------------------------------------
  // The Claim Ledger, from this side: hand a claim to the service worker
  // (background/tells.js) and get back what it makes of it. Resolves to null
  // when no answer comes in time — a detector then decides without evidence,
  // exactly as it would have before the ledger existed.
  // ---------------------------------------------------------------------------

  const CLAIM_TIMEOUT_MS = 2500;

  function observeClaim(claim) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (verdict) => {
        if (settled) return;
        settled = true;
        resolve(verdict && typeof verdict === "object" ? verdict : null);
      };
      setTimeout(() => finish(null), CLAIM_TIMEOUT_MS);
      try {
        const pending = chrome.runtime.sendMessage({ type: "sieve:claim-observe", claim });
        if (pending && typeof pending.then === "function") pending.then(finish, () => finish(null));
        else finish(null);
      } catch (_) {
        finish(null);
      }
    });
  }

  // The normalised wording a claim is filed under: lower case, numbers taken
  // out, spaces collapsed. "Only 3 left!" and "Only 7 left!" are the same claim
  // with different values.
  function claimSignature(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\d+/g, "#")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  // Does this page sell something? Read from what the page says about itself —
  // its structured data and its buttons — never from anything about the user.
  // A "yes" holds for the page; a "no" is asked again a few seconds later,
  // because a shop's buttons often arrive after its banners do.
  const SHOP_BUTTON_RE = /\b(add to (cart|bag|basket|trolley)|buy (it )?now|checkout|check out)\b/i;
  const SHOP_TYPE_RE = /"@type"\s*:\s*\[?\s*"(Product|ProductGroup|Offer|AggregateOffer)"/;
  let shopCheck = { href: "", value: false, at: 0 };

  function looksLikeShop() {
    const now = Date.now();
    if (shopCheck.href === location.href && (shopCheck.value || now - shopCheck.at < 3000)) return shopCheck.value;
    let value = false;
    try {
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        if (SHOP_TYPE_RE.test((script.textContent || "").slice(0, 50000))) {
          value = true;
          break;
        }
      }
      if (!value) {
        value = !!document.querySelector(
          'meta[property="og:type"][content*="product" i], meta[property="product:price:amount"], ' +
            '[itemtype*="schema.org/Product" i], [itemtype*="schema.org/Offer" i], [itemprop="price"]'
        );
      }
      if (!value) {
        const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
        for (let i = 0; i < buttons.length && i < 300; i++) {
          const text = buttons[i].tagName === "INPUT" ? buttons[i].value : buttons[i].textContent;
          if (text && text.length < 40 && SHOP_BUTTON_RE.test(text)) {
            value = true;
            break;
          }
        }
      }
    } catch (_) {
      value = false;
    }
    shopCheck = { href: location.href, value, at: now };
    return value;
  }

  // "3:42 PM", or "Tue 3:42 PM" when it is not today.
  function formatTime(ms) {
    const d = new Date(ms);
    const sameDay = d.toDateString() === new Date().toDateString();
    const opts = sameDay ? { hour: "numeric", minute: "2-digit" } : { weekday: "short", hour: "numeric", minute: "2-digit" };
    return d.toLocaleString(undefined, opts);
  }

  // "today", "yesterday", or "Monday, Oct 6". Takes a timestamp or a ledger
  // day key ("2026-10-06").
  function formatDay(value) {
    let d;
    if (typeof value === "string") {
      const [y, m, day] = value.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(value);
    }
    const midnight = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const gap = Math.round((midnight(new Date()) - midnight(d)) / 86400000);
    if (gap === 0) return "today";
    if (gap === 1) return "yesterday";
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  // Interface handed to each detector's scan(). Detectors call ctx.mark,
  // ctx.isMarked, ctx.report, ctx.counts and ctx.tell — keep these names in
  // sync with the public SieveDarkPatterns API below.
  const detectorCtx = {
    mark: markElement,
    isMarked,
    report: reportIntervention,
    counts: getCounts,
    hasWord,
    hasAnyWord,
    tell,
    runAction,
    ensureUI,
    loadPart,
    LEVEL,
    observeClaim,
    claimSignature,
    looksLikeShop,
    formatTime,
    formatDay,
  };

  // ---------------------------------------------------------------------------
  // Scanning
  // ---------------------------------------------------------------------------

  function scanRoot(root) {
    if (!settings[STORAGE_KEYS.master]) return;
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

    for (const type of PATTERN_TYPES) {
      if (!isTypeEnabled(type)) continue;
      const detector = detectors.get(type);
      if (!detector || typeof detector.scan !== "function") continue;

      try {
        const delta = detector.scan(root, detectorCtx);
        reportIntervention(type, delta);
      } catch (err) {
        console.error("[Sieve] Dark pattern detector failed:", type, err);
      }
    }

    // One text pass for every detector that wants text, after the
    // selector-based ones have had their turn.
    scanTextNodes(root);
  }

  // ---------------------------------------------------------------------------
  // MutationObserver — debounced so dynamic feeds don't kill performance.
  // ---------------------------------------------------------------------------

  function flushMutations() {
    debounceTimer = null;
    const batch = pendingNodes;
    const full = wantFullScan;
    pendingNodes = new Set();
    wantFullScan = false;
    if (!settings[STORAGE_KEYS.master]) return;
    if (full) {
      if (document.body) scanRoot(document.body);
      return;
    }

    // Build a minimal set of roots (skip nested children when parent is scanned).
    //
    // This used to walk every descendant of every added node into a WeakSet —
    // `for (const child of node.querySelectorAll("*")) skip.add(child)` — which
    // is O(total descendants) work to save a dedupe. A feed adding a hundred
    // 500-element cards paid fifty thousand WeakSet inserts per flush, and the
    // set was rebuilt from scratch every time. Asking each candidate whether an
    // ALREADY-CHOSEN root contains it costs a handful of `contains` calls
    // instead, because there are only ever a few roots.
    const roots = [];
    for (const node of batch) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (!node.isConnected) continue; // removed again before we got to it
      let covered = false;
      for (const root of roots) {
        if (root.contains(node)) {
          covered = true;
          break;
        }
      }
      if (!covered) roots.push(node);
    }

    for (const root of roots) scanRoot(root);
    // The page changing is also how findings leave it.
    scheduleBadge();
  }

  function onMutations(mutations) {
    let hasAdded = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        // Words set with textContent arrive as a bare text node, and the text
        // walk only ever starts from an element: scan the one they went into.
        // Without this, a pop-up widget that fills its box with
        // `box.textContent = "Sarah just bought…"` was never read at all.
        const target = node.nodeType === Node.TEXT_NODE ? mutation.target : node;
        if (!target || target.nodeType !== Node.ELEMENT_NODE) continue;
        hasAdded = true;
        if (pendingNodes.size >= MAX_PENDING) {
          wantFullScan = true; // a whole surface is being replaced
          continue;
        }
        pendingNodes.add(target);
      }
    }
    if (!hasAdded) return;

    // A LEADING throttle. The old code cleared and reset this timer on every
    // batch, so a page mutating more often than the delay — any feed, any
    // carousel, any live ticker — cancelled the flush forever: the detectors
    // never ran, and pendingNodes grew without bound holding detached elements.
    if (debounceTimer !== null) return;
    debounceTimer = setTimeout(flushMutations, THROTTLE_MS);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    // Only childList/subtree: onMutations reacts to added element nodes. We don't
    // observe characterData — text-only edits produced records the callback threw
    // away, so watching them just added observer overhead on live pages (clocks,
    // tickers, chat). Detectors that need re-sampling (timers) poll on their own.
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
    // Drop the queue too, or a disabled blocker keeps a page's detached nodes
    // alive until the next navigation.
    pendingNodes = new Set();
    wantFullScan = false;
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // ---------------------------------------------------------------------------
  // Apply current settings without a full page reload.
  // ---------------------------------------------------------------------------

  async function applySettings() {
    const wasEnabled = settings[STORAGE_KEYS.master];
    const wasStrictness = strictness;
    await loadSettings();
    const isEnabled = settings[STORAGE_KEYS.master];

    if (isEnabled) {
      if (!wasEnabled) scanRoot(document.body);
      startObserver();
    } else {
      stopObserver();
    }
    // A new setting moves every finding already on the page, up or down.
    if (strictness !== wasStrictness) relevelAll();
  }

  // ---------------------------------------------------------------------------
  // Messaging with the popup.
  // ---------------------------------------------------------------------------

  function setupMessaging() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message) return false;

      if (message.type === "GET_DARK_PATTERN_COUNTS") {
        sendResponse(getCounts());
        return false;
      }

      // The toolbar popup's "On this page".
      if (message.type === "sieve:tells-list") {
        sendResponse(tellsReport());
        return false;
      }

      if (message.type === "sieve:tells-show") {
        const finding = findTell(message.id);
        if (!finding) {
          sendResponse({ ok: false });
          return false;
        }
        ensureUI().then((ready) => sendResponse({ ok: ready && window.SieveTellsUI.showTell(finding) }));
        return true;
      }

      if (message.type === "sieve:tells-action") {
        runAction(findTell(message.id), message.action).then(() => sendResponse(tellsReport()));
        return true;
      }

      if (message.type === "sieve:tells-undo" || message.type === "sieve:tells-redo") {
        const finding = findTell(message.id);
        if (finding) {
          if (message.type === "sieve:tells-undo") undoTell(finding);
          else redoTell(finding);
          scheduleBadge(true);
        }
        sendResponse(tellsReport());
        return false;
      }

      if (message.type === "SET_MODULE_STATE" && message.key === STORAGE_KEYS.master) {
        applySettings().then(() => sendResponse({ ok: true }));
        return true;
      }

      return false;
    });
  }

  // ---------------------------------------------------------------------------
  // Public API for pattern files.
  // ---------------------------------------------------------------------------

  window.SieveDarkPatterns = {
    register: registerDetector,
    registerText: registerTextVisitor,
    chooseLevel,
    ...detectorCtx,
  };

  // ---------------------------------------------------------------------------
  // Entry point
  // ---------------------------------------------------------------------------

  async function init() {
    await loadSettings();
    setupMessaging();

    if (settings[STORAGE_KEYS.master]) {
      scanRoot(document.body);
      startObserver();
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const relevant = STRICTNESS_KEY in changes || Object.values(STORAGE_KEYS).some((k) => k in changes);
      if (relevant) applySettings();
    });

    // Back/forward restores this page from memory without running it again,
    // but the tab still "commits" — which clears the badge. Say it again.
    if (typeof window.addEventListener === "function") {
      window.addEventListener("pageshow", (event) => {
        if (event.persisted) scheduleBadge(true);
      });
    }
  }

  // Content scripts run at document_idle, but detectors register synchronously
  // from their own script files. Yield once so all registrations complete.
  setTimeout(init, 0);
})();

// content/search-filter.js
// Sieve — Search Result Filter: hides or colour-codes results on the search
// page itself, before you click anything.
//
// This is the one Sieve module that acts on a page it does not own, so two
// things are deliberate:
//
//   1. It costs nothing anywhere else. The script is registered on <all_urls>
//      so it covers every Google country domain without listing them, and the
//      first thing it does is a hostname test that returns on every other page.
//      Listing google.co.uk, google.de, google.com.au … in the manifest instead
//      would still miss whichever one the next user happens to use.
//
//      Supported engines: Google, Bing, DuckDuckGo.
//
//   2. It fails visible. Every unknown case leaves the result alone. A missed
//      rule is a result you still see; an over-eager one is a result you never
//      learn existed, which is much worse and much harder to notice.
//
// THE FRAGILE PART IS THE ENGINES TABLE BELOW. Search engines reshuffle their
// markup without warning and no error is raised when they do — filtering just
// quietly stops. If this module ever seems to do nothing on a live page, the
// selectors are where to look first.

(() => {
  "use strict";

  if (window.__sieveSearchFilter) return;
  window.__sieveSearchFilter = true;

  const MARK = "data-sv-sf"; // marks a block we've already looked at
  const STYLE_ID = "sv-sf-style";
  const NOTICE_ID = "sv-sf-notice";
  const REVEAL_CLASS = "sv-sf-reveal"; // on <html> while hidden results are shown
  const MARKER_CLASS = "sv-sf-why";    // the per-result "why?" button
  const POPOVER_ID = "sv-sf-pop";      // the panel it opens
  const BRAND = "#6366f1";             // Sieve indigo, matching --primary
  const HIDE_COLOR = "#e05252";        // the accent for "this was hidden"
  // Sieve's shield, kept angular with the brand's diagonal cut. A plain rounded
  // shield collapses into an unreadable blob at this size; the diagonal is what
  // still reads at 16px, and it is the distinctive half of the mark anyway.
  // The cut is painted in the badge colour, so it reads as a gap.
  const SHIELD_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 1.8l8.2 3.6V12L12 22.2 3.8 12V5.4z" fill="#fff"/>' +
    '<path d="M15.4 0h2.5L9.1 24H6.6z" fill="' + BRAND + '"/>' +
    "</svg>";

  // --- engines ------------------------------------------------------------
  //
  // Adding an engine is an entry here, not a code change.
  //   test    is this a results page for this engine?
  //   roots   containers holding organic results (answer boxes, "People also
  //           ask" and image strips sit outside these, and are left alone)
  //   blocks  candidate result blocks; narrowed to the innermost one holding
  //           exactly one `title`, which is what makes it a single result
  //   anchor  the links to consider for the destination URL
  //   title   the result's heading — also what counts a block as one result,
  //           so it must match ONCE per result and not once per sub-heading
  //   self    hosts belonging to the engine itself; links there are page
  //           furniture (related searches, image tabs), never results
  //   resolve OPTIONAL. Some engines route every click through their own
  //           redirector, so the href is useless until it is unwrapped.
  //   cite    OPTIONAL. The visible source line, used only when `resolve`
  //           cannot recover a URL.
  const ENGINES = [
    {
      id: "google",
      test: () =>
        /^(www\.)?google(\.[a-z]{2,3})+$/.test(location.hostname) &&
        location.pathname.startsWith("/search"),
      roots: ["#rso", "#search", "#botstuff"],
      blocks: "div[data-hveid], div.g",
      anchor: "a[href]",
      title: "h3",
      self: /(^|\.)google(\.[a-z]{2,3})+$/,
      noticeAnchor: "#rso, #search",
    },
    {
      // Bing puts every result behind bing.com/ck/a?…&u=a1<base64url>. Taken at
      // face value each result looks like it points at Bing itself, so without
      // `resolve` no rule would ever match here.
      id: "bing",
      test: () =>
        /^(www\.)?bing\.com$/.test(location.hostname) &&
        location.pathname.startsWith("/search"),
      roots: ["#b_results"],
      // Organic results only: #b_results also holds li.b_ans answer boxes and
      // li.b_pag pagination, which are not results.
      blocks: "li.b_algo",
      anchor: "a[href]",
      // A Bing result carries an h2 title AND an h3 further down, so counting
      // "any heading" would see two and skip every result on the page.
      title: "h2",
      self: /(^|\.)bing\.com$/,
      cite: "cite",
      resolve: (href) => {
        let url;
        try {
          url = new URL(href);
        } catch (_) {
          return href;
        }
        if (!/(^|\.)bing\.com$/.test(url.hostname) || !url.pathname.startsWith("/ck/")) return href;
        const packed = url.searchParams.get("u");
        if (!packed) return null;
        // "a1" prefix, then base64url (- _ for + /, padding dropped).
        let base64 = packed.replace(/^a1/, "").replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        try {
          return atob(base64);
        } catch (_) {
          return null;
        }
      },
      noticeAnchor: "#b_results",
    },
    {
      // DuckDuckGo serves results from "/" with a ?q=, not from a /search path.
      id: "duckduckgo",
      test: () =>
        /^(www\.|html\.|lite\.)?duckduckgo\.com$/.test(location.hostname) &&
        new URLSearchParams(location.search).has("q"),
      roots: ["ol.react-results--main", "[data-area='mainline']", "#links"],
      blocks: "article[data-testid='result'], li[data-layout='organic'], div.result",
      anchor: "a[href]",
      title: "h2",
      self: /(^|\.)duckduckgo\.com$/,
      // The no-JS html/lite versions route through duckduckgo.com/l/?uddg=…
      resolve: (href) => {
        let url;
        try {
          url = new URL(href);
        } catch (_) {
          return href;
        }
        if (/(^|\.)duckduckgo\.com$/.test(url.hostname) && url.pathname === "/l/") {
          const target = url.searchParams.get("uddg");
          if (target) return decodeURIComponent(target);
        }
        return href;
      },
      noticeAnchor: "ol.react-results--main, #links",
    },
  ];

  const engine = ENGINES.find((e) => {
    try {
      return e.test();
    } catch (_) {
      return false;
    }
  });
  if (!engine) return; // not a search page — the overwhelmingly common case

  // --- state --------------------------------------------------------------
  let enabled = false;
  let compiled = [];
  let palette = [];
  let hiddenCount = 0;
  let observer = null;
  let scheduled = false;

  // --- styles -------------------------------------------------------------

  // "#3b82f6" -> "rgba(59,130,246,0.16)". Returns null for anything that isn't a
  // plain hex colour, so a stored oddity falls back to being used as-is rather
  // than producing a broken declaration that takes the whole rule down with it.
  function tint(hex, alpha) {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!match) return null;
    let digits = match[1];
    if (digits.length === 3) digits = digits.replace(/./g, (c) => c + c);
    const value = parseInt(digits, 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  // One rule per palette entry, rebuilt whenever the colours change. Written as
  // a stylesheet rather than inline styles so a result keeps its own background
  // when a rule is removed, instead of being left with ours baked on.
  function applyStyles() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    const rules = [
      `[${MARK}="hidden"]{display:none !important}`,
      // Revealed: shown, dimmed, and marked, so "show" never looks like normal
      // results sneaking back in.
      `.${REVEAL_CLASS} [${MARK}="hidden"]{display:block !important;opacity:.45;` +
        `outline:1px dashed rgba(128,128,128,.6);outline-offset:2px}`,
      `#${NOTICE_ID}{font:14.5px/1.5 system-ui,sans-serif;opacity:.8;padding:9px 0;display:flex;gap:10px;align-items:center}`,
      `#${NOTICE_ID} button{font:inherit;cursor:pointer;background:none;border:0;padding:0;` +
        `color:currentColor;text-decoration:underline}`,

      // The "why?" button. Inline, so it cannot disturb the result's layout,
      // and quiet until hovered — it is an answer waiting to be asked for, not
      // a badge competing with the result itself.
      // Top-right of the result, inset from both edges rather than jammed into
      // the corner — flush against the boundary it reads as part of the page
      // chrome, and it crowds the engine's own "about this result" control.
      //
      // position+z-index is what makes it CLICKABLE, not merely visible. Every
      // Google result contains a `position:relative` div covering the whole
      // block, and positioned elements paint — and hit-test — above floats, so
      // a plain float ends up underneath it and swallows every click.
      `.${MARKER_CLASS}{float:right;position:relative;z-index:2;` +
        `display:inline-flex;align-items:center;justify-content:center;` +
        `width:24px;height:24px;margin:7px 9px 4px 12px;padding:0;overflow:hidden;` +
        `cursor:pointer;border-radius:50%;border:0;` +
        `background:${BRAND};box-shadow:0 0 0 1px rgba(255,255,255,.55),0 1px 3px rgba(0,0,0,.3);` +
        `transition:transform .12s,box-shadow .12s}`,
      `.${MARKER_CLASS}:hover,.${MARKER_CLASS}:focus{transform:scale(1.12);` +
        `box-shadow:0 0 0 1px rgba(255,255,255,.7),0 2px 6px rgba(0,0,0,.42);outline:none}`,
      `.${MARKER_CLASS} svg{width:16px;height:16px;display:block;pointer-events:none}`,

      // Panel colours are stated for both schemes: the results page may be
      // light or dark, and inheriting would make the text vanish on one of them.
      // --sv-accent is set per-panel to the colour being explained.
      `#${POPOVER_ID}{position:absolute;z-index:2147483647;width:382px;` +
        `max-width:calc(100vw - 16px);border-radius:14px;overflow:hidden;` +
        `font:14.5px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;` +
        `background:#fff;color:#1f2328;border:1px solid rgba(0,0,0,.14);` +
        `box-shadow:0 12px 34px rgba(0,0,0,.24);text-align:left;` +
        `--sv-line:rgba(0,0,0,.09);--sv-soft:rgba(0,0,0,.045);--sv-dim:rgba(31,35,40,.62)}`,
      `@media (prefers-color-scheme:dark){#${POPOVER_ID}{background:#1f2023;color:#e8eaed;` +
        `border-color:rgba(255,255,255,.14);box-shadow:0 12px 34px rgba(0,0,0,.6);` +
        `--sv-line:rgba(255,255,255,.12);--sv-soft:rgba(255,255,255,.06);--sv-dim:rgba(232,234,237,.62)}}`,

      // Header, washed in the accent so the verdict registers before reading.
      `#${POPOVER_ID} .sv-sf-head{display:flex;align-items:center;gap:10px;padding:13px 14px;` +
        `border-bottom:1px solid var(--sv-line);` +
        `background:linear-gradient(180deg,color-mix(in srgb,var(--sv-accent) 14%,transparent),transparent)}`,
      `#${POPOVER_ID} .sv-sf-brand{flex:0 0 auto;display:inline-flex;align-items:center;` +
        `justify-content:center;width:31px;height:31px;border-radius:50%;background:${BRAND}}`,
      `#${POPOVER_ID} .sv-sf-brand svg{width:20px;height:20px;display:block}`,
      `#${POPOVER_ID} .sv-sf-titles{flex:1 1 auto;min-width:0}`,
      `#${POPOVER_ID} .sv-sf-host{font-weight:650;font-size:16px;line-height:1.3;` +
        `white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
      `#${POPOVER_ID} .sv-sf-url{font-size:13px;color:var(--sv-dim);` +
        `white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
      `#${POPOVER_ID} .sv-sf-pill{flex:0 0 auto;font-size:12.5px;font-weight:650;` +
        `letter-spacing:.02em;padding:5px 11px;border-radius:999px;color:#fff;` +
        `background:var(--sv-accent);white-space:nowrap}`,

      `#${POPOVER_ID} .sv-sf-heading{display:flex;justify-content:space-between;align-items:baseline;` +
        `padding:12px 15px 7px;font-weight:650;font-size:12px;text-transform:uppercase;` +
        `letter-spacing:.06em;color:var(--sv-dim)}`,
      `#${POPOVER_ID} .sv-sf-count{font-weight:500;letter-spacing:0;text-transform:none;font-size:12.5px}`,

      // One card per rule; the deciding one is marked down its left edge.
      `#${POPOVER_ID} .sv-sf-rules{list-style:none;margin:0;padding:0 15px;display:flex;` +
        `flex-direction:column;gap:7px}`,
      `#${POPOVER_ID} .sv-sf-rules li{padding:9px 11px;border-radius:10px;background:var(--sv-soft);` +
        `border:1px solid var(--sv-line)}`,
      `#${POPOVER_ID} .sv-sf-rules li.is-winner{border-color:color-mix(in srgb,var(--sv-accent) 55%,transparent);` +
        `box-shadow:inset 3px 0 0 var(--sv-accent)}`,
      `#${POPOVER_ID} .sv-sf-rule-top{display:flex;align-items:center;gap:7px}`,
      `#${POPOVER_ID} .sv-sf-dot{flex:0 0 auto;width:11px;height:11px;border-radius:3px;` +
        `box-shadow:0 0 0 1px var(--sv-line)}`,
      // A hide has no palette colour of its own, so it gets a struck-through
      // swatch rather than an empty square that reads as a missing value.
      `#${POPOVER_ID} .sv-sf-dot.is-hide{background:transparent;position:relative}`,
      `#${POPOVER_ID} .sv-sf-dot.is-hide::after{content:"";position:absolute;inset:0;` +
        `background:linear-gradient(to bottom right,transparent 42%,${HIDE_COLOR} 42%,${HIDE_COLOR} 58%,transparent 58%)}`,
      `#${POPOVER_ID} code{flex:1 1 auto;min-width:0;font:13.5px/1.45 ui-monospace,Menlo,Consolas,monospace;` +
        `word-break:break-all}`,
      `#${POPOVER_ID} .sv-sf-won{flex:0 0 auto;font-size:11px;font-weight:700;text-transform:uppercase;` +
        `letter-spacing:.05em;padding:3px 8px;border-radius:999px;color:#fff;background:var(--sv-accent)}`,
      `#${POPOVER_ID} .sv-sf-effect{margin-top:4px;padding-left:18px;font-size:13px;color:var(--sv-dim)}`,

      `#${POPOVER_ID} .sv-sf-actions{display:flex;gap:9px;padding:14px 15px;margin-top:13px;` +
        `border-top:1px solid var(--sv-line);background:var(--sv-soft)}`,
      `#${POPOVER_ID} button{font:inherit;font-size:14px;cursor:pointer;padding:8px 14px;` +
        `border-radius:8px;border:1px solid var(--sv-line);background:transparent;color:inherit;` +
        `transition:background .12s,border-color .12s}`,
      `#${POPOVER_ID} button:hover{background:rgba(128,128,128,.16)}`,
      `#${POPOVER_ID} .sv-sf-primary{border-color:transparent;background:${BRAND};color:#fff;font-weight:600}`,
      `#${POPOVER_ID} .sv-sf-primary:hover{background:#5457e0}`,
    ];
    palette.forEach((color, i) => {
      // Each colour is used twice: a faint wash behind the result, and the full
      // strength as a bar down its left edge. Alpha rather than a pale shade of
      // the same colour, because the results page can be light or dark — a
      // pastel that looks right on white turns light-on-light in dark mode,
      // while a wash just tints whatever is already there.
      const wash = tint(color, 0.16) || color;
      rules.push(
        `[${MARK}="c${i + 1}"]{background-color:${wash} !important;` +
          `box-shadow:inset 3px 0 0 ${color};border-radius:8px;` +
          `padding-left:10px;margin-left:-10px}`
      );
    });
    style.textContent = rules.join("");
  }

  // --- reading the page ---------------------------------------------------

  // The destination of a result. The link wrapping the heading is the real one;
  // everything else in a result block (cached copy, sitelinks, "translate this
  // page") is secondary, so the heading's link is tried first and the other
  // outbound links are only a fallback.
  function resultUrl(block) {
    const titleEl = engine.title ? block.querySelector(engine.title) : null;
    const titleLink = titleEl ? titleEl.closest("a[href]") : null;
    const anchors = Array.from(block.querySelectorAll(engine.anchor));
    if (titleLink) anchors.unshift(titleLink);

    for (const a of anchors) {
      if (!/^https?:/i.test(a.getAttribute("href") || "")) continue;
      // Unwrap the engine's redirector BEFORE judging the host, or on Bing
      // every result reads as a link to Bing and is discarded as furniture.
      const resolved = engine.resolve ? engine.resolve(a.href) : a.href;
      if (!resolved) continue;
      let host;
      try {
        host = new URL(resolved).hostname;
      } catch (_) {
        continue;
      }
      // Links back to the engine are chrome — related searches, image tabs,
      // "search for this site instead" — not results.
      if (engine.self.test(host)) continue;
      return resolved;
    }

    // Last resort: the visible source line. Reached when a redirector changes
    // shape and `resolve` comes back empty, which is exactly when a result
    // would otherwise go unfiltered without anything looking wrong.
    if (engine.cite) {
      const citeEl = block.querySelector(engine.cite);
      const text = citeEl ? citeEl.textContent.trim().split(/[\s›»]/)[0] : "";
      if (text) {
        try {
          return new URL(/^https?:/i.test(text) ? text : "https://" + text).href;
        } catch (_) {
          /* not a usable URL — fall through to "not a result" */
        }
      }
    }
    return null;
  }

  // Collect the result blocks we haven't handled yet.
  //
  // One result must be collected exactly once, which the hidden count depends on:
  // the roots NEST (#rso sits inside #search), so the same block is reachable
  // from more than one of them, and a result with sitelinks is a block inside a
  // block. Marks from earlier passes cover repeat calls; the checks below cover
  // a single pass, before anything has been marked.
  function collectBlocks() {
    const found = [];
    for (const rootSelector of engine.roots) {
      const root = document.querySelector(rootSelector);
      if (!root) continue;

      // A block is ONE result only if it holds exactly one heading. Google puts
      // data-hveid on wrapper divs as well as on results, and the widest wrapper
      // holds the whole page — taking that one and reading its first link tinted
      // every result on the page. Anything else is passed over, so:
      //   0 headings  — not an organic result (People also ask, image strips,
      //                 the knowledge panel). Left alone entirely.
      //   2 or more   — a wrapper. Its children get their turn instead.
      const candidates = [];
      for (const block of root.querySelectorAll(engine.blocks)) {
        if (block.hasAttribute(MARK)) continue;
        if (block.parentElement && block.parentElement.closest(`[${MARK}]`)) continue;
        // Also skip a block wrapped AROUND something already handled. On
        // DuckDuckGo each result is an <article> inside an <li> and both match
        // `blocks`; once the inner article is marked it drops out of the
        // candidate list, which would leave the outer li looking like the
        // innermost candidate and count the same result a second time.
        if (block.querySelector(`[${MARK}]`)) continue;
        const headings = engine.title ? block.querySelectorAll(engine.title) : [];
        if (headings.length === 1) candidates.push(block);
      }

      for (const block of candidates) {
        // Prefer the innermost candidate: a wrapper around a SINGLE result also
        // holds exactly one heading, and the result itself is the tighter fit.
        if (candidates.some((other) => other !== block && block.contains(other))) continue;
        // `contains` is true of an element itself, so this also covers the same
        // block being reachable from two roots (#rso sits inside #search).
        if (found.some((seen) => seen.block.contains(block) || block.contains(seen.block))) continue;
        const url = resultUrl(block);
        if (!url) continue;
        found.push({ block, url, title: block.querySelector(engine.title).textContent });
      }
    }
    return found;
  }

  // --- "why is this here?" ------------------------------------------------
  //
  // The counter says a result was hidden; this says WHICH rule did it. Without
  // it a filter is a black box: the only way to find out why something vanished
  // is to delete rules one at a time until it comes back.
  //
  // The verdict for each result is kept in a WeakMap rather than serialised onto
  // the element, so it dies with the node and never has to be parsed back.
  const explanations = new WeakMap();
  let popover = null;

  function ruleEffect(rule) {
    return rule.color === window.SieveSearchFilter.HIDE ? "Hide" : `Colour ${rule.color}`;
  }

  // Where the rule came from. A user who never wrote ".cyou" in this list needs
  // to be told it came from their Blocked list, or they will hunt for it here.
  function ruleOrigin(rule) {
    return rule.source === "blocked" ? "Blocked sites" : "Search Result Filter";
  }

  // HOW the rule matched. "example.com" and "/example/" both catch the same
  // result but for different reasons, and knowing which is what tells you
  // whether to edit the rule or leave it alone.
  function ruleKind(rule) {
    if (rule.kind === "title") return "Title pattern";
    if (rule.kind === "url") return "URL pattern";
    if (rule.host && rule.host.startsWith(".")) return "Domain ending";
    if (rule.path && rule.path !== "/" && rule.path !== "/*") return "Site & path";
    return "Domain";
  }

  // The swatch shown beside a rule: its palette colour, or nothing for a hide.
  function ruleSwatch(rule) {
    const dot = document.createElement("span");
    dot.className = "sv-sf-dot";
    if (rule.color === window.SieveSearchFilter.HIDE) dot.classList.add("is-hide");
    else dot.style.background = palette[rule.color - 1] || BRAND;
    return dot;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function closePopover() {
    if (!popover) return;
    popover.remove();
    popover = null;
    document.removeEventListener("click", onDocumentClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  function onDocumentClick(event) {
    if (popover && !popover.contains(event.target) && !event.target.closest(`.${MARKER_CLASS}`)) {
      closePopover();
    }
  }

  function onKeyDown(event) {
    if (event.key === "Escape") closePopover();
  }

  function openPopover(marker, block) {
    closePopover();
    const verdict = explanations.get(block);
    if (!verdict) return;
    const hidden = verdict.color === window.SieveSearchFilter.HIDE;

    popover = document.createElement("div");
    popover.id = POPOVER_ID;
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Why Sieve changed this result");
    // The panel is tinted by the very colour it is explaining, so the answer is
    // legible before a word of it is read.
    const accentColor = hidden ? HIDE_COLOR : palette[verdict.color - 1] || BRAND;
    popover.style.setProperty("--sv-accent", accentColor);

    // --- header: who is talking, about what, and what happened --------------
    const head = el("header", "sv-sf-head");
    const brand = el("span", "sv-sf-brand");
    brand.innerHTML = SHIELD_SVG;
    const titles = el("div", "sv-sf-titles");
    titles.append(el("div", "sv-sf-host", verdict.host));
    // The exact string the rules were tested against — a path-scoped or regex
    // rule is impossible to reason about without seeing it.
    let shown = verdict.url || "";
    try {
      const u = new URL(verdict.url);
      shown = u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
    } catch (_) { /* keep the raw string */ }
    titles.append(el("div", "sv-sf-url", shown));
    const pill = el("span", "sv-sf-pill", hidden ? "Hidden" : `Colour ${verdict.color}`);
    head.append(brand, titles, pill);
    popover.append(head);

    // --- the rules ----------------------------------------------------------
    const heading = el("div", "sv-sf-heading");
    heading.append(el("span", null, verdict.matched.length === 1 ? "Matching rule" : "Matching rules"));
    heading.append(el("span", "sv-sf-count", `${verdict.matched.length} of ${compiled.length}`));
    popover.append(heading);

    const list = el("ul", "sv-sf-rules");
    for (const rule of verdict.matched) {
      const item = el("li");
      // With several rules on one result, saying which one actually decided it
      // is the difference between an explanation and a list.
      const won = rule === verdict.winner && verdict.matched.length > 1;
      if (won) item.classList.add("is-winner");

      const top = el("div", "sv-sf-rule-top");
      top.append(ruleSwatch(rule));
      const code = el("code", null, rule.pattern);
      top.append(code);
      if (won) top.append(el("span", "sv-sf-won", "Applied"));
      item.append(top);

      item.append(el("div", "sv-sf-effect", `${ruleKind(rule)} · ${ruleEffect(rule)} · ${ruleOrigin(rule)}`));
      list.append(item);
    }
    popover.append(list);

    const actions = document.createElement("div");
    actions.className = "sv-sf-actions";

    // Only ever affects this page. Changing the rule itself is a settings
    // decision, and quietly rewriting someone's list from a search page is not
    // something a filter should do behind their back.
    if (verdict.color === window.SieveSearchFilter.HIDE) {
      const show = document.createElement("button");
      show.type = "button";
      show.className = "sv-sf-primary";
      show.textContent = "Show on this page";
      show.addEventListener("click", () => {
        block.setAttribute(MARK, "seen");
        const own = block.querySelector(`.${MARKER_CLASS}`);
        if (own) own.remove();
        hiddenCount = Math.max(0, hiddenCount - 1);
        closePopover();
        updateNotice();
      });
      actions.append(show);
    }

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit rules…";
    edit.addEventListener("click", () => {
      // A content script cannot open the options page itself.
      chrome.runtime.sendMessage({ type: "SIEVE_OPEN_OPTIONS" });
      closePopover();
    });
    actions.append(edit);
    popover.append(actions);

    // Positioned in page coordinates rather than fixed to the viewport, so it
    // travels with the result instead of hanging in space when the page scrolls.
    document.body.appendChild(popover);
    const at = marker.getBoundingClientRect();
    const width = popover.offsetWidth;
    const left = Math.max(8, Math.min(at.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - width - 8));
    popover.style.top = `${at.bottom + window.scrollY + 6}px`;
    popover.style.left = `${left}px`;

    document.addEventListener("click", onDocumentClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  // One small button per affected result, floated into its top-right corner.
  //
  // Float rather than absolute positioning: positioning it would mean forcing
  // `position:relative` onto a container the search engine owns, which can move
  // that result's own absolutely-positioned children (Google's "..." menu, for
  // one). A float only shortens the line boxes beside it and cannot do that.
  // It is also why the marker is the block's FIRST child — a float placed after
  // a block-level heading drops to the following line.
  function addMarker(block) {
    if (block.querySelector(`.${MARKER_CLASS}`)) return;
    const titleEl = engine.title ? block.querySelector(engine.title) : null;
    if (!titleEl) return;
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = MARKER_CLASS;
    // Sieve's own shield, drawn inline rather than loaded from the extension:
    // an <img> would mean adding the icon to web_accessible_resources, which
    // hands every page a reliable way to detect that Sieve is installed.
    marker.innerHTML = SHIELD_SVG;
    marker.title = "Why did Sieve change this result?";
    marker.setAttribute("aria-label", "Why did Sieve change this result?");
    block.insertBefore(marker, block.firstChild);
  }

  // Handled at the document, in the CAPTURE phase, so nothing the search engine
  // listens for on an ancestor can act on the click first — every result on
  // these pages is wired for navigation and logging.
  function onMarkerPointer(event) {
    const target = event.target;
    const marker = target && target.closest ? target.closest(`.${MARKER_CLASS}`) : null;
    if (!marker) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.type !== "click") return; // swallow mousedown, act on the click
    const block = marker.closest(`[${MARK}]`);
    if (popover) closePopover();
    else if (block) openPopover(marker, block);
  }

  // --- applying -----------------------------------------------------------

  function process() {
    if (!enabled) return;
    let changed = false;
    for (const { block, url, title } of collectBlocks()) {
      const verdict = window.SieveSearchFilter.explain(compiled, url, title);
      if (verdict.color === null) {
        block.setAttribute(MARK, "seen"); // remember, so we don't re-test it
        continue;
      }
      if (verdict.color === window.SieveSearchFilter.HIDE) {
        block.setAttribute(MARK, "hidden");
        hiddenCount++;
      } else {
        // Colours beyond the palette would be invisible, so they fall back to
        // the last one the user actually defined rather than doing nothing.
        block.setAttribute(MARK, `c${Math.min(verdict.color, palette.length) || 1}`);
      }
      explanations.set(block, { ...verdict, url, matchedAgainst: title });
      addMarker(block);
      changed = true;
    }
    if (changed || hiddenCount) updateNotice();
  }

  // A count with a way back. Silently eating results is how a filter loses the
  // user's trust the first time it gets one wrong.
  function updateNotice() {
    if (!hiddenCount) {
      const existing = document.getElementById(NOTICE_ID);
      if (existing) existing.remove();
      return;
    }
    let notice = document.getElementById(NOTICE_ID);
    if (!notice) {
      const anchor = document.querySelector(engine.noticeAnchor);
      if (!anchor) return;
      // Bing and DuckDuckGo hang their results off an <ol>, where a bare <div>
      // is not a valid child; Google's containers are plain divs.
      notice = document.createElement(/^(OL|UL)$/.test(anchor.tagName) ? "li" : "div");
      notice.id = NOTICE_ID;
      const label = document.createElement("span");
      const button = document.createElement("button");
      button.type = "button";
      button.addEventListener("click", () => {
        const on = document.documentElement.classList.toggle(REVEAL_CLASS);
        button.textContent = on ? "Hide them again" : "Show them";
      });
      notice.append(label, button);
      anchor.insertBefore(notice, anchor.firstChild);
    }
    const revealed = document.documentElement.classList.contains(REVEAL_CLASS);
    notice.firstChild.textContent =
      `Sieve hid ${hiddenCount} ${hiddenCount === 1 ? "result" : "results"}`;
    notice.lastChild.textContent = revealed ? "Hide them again" : "Show them";
  }

  // Results arrive in batches as Google streams and re-renders them, so the
  // observer is coalesced into one pass per frame rather than running per node.
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      process();
    });
  }

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopObserving() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  }

  // Undo everything, so turning the module off (or editing a rule) gives the
  // page back rather than leaving stale marks behind.
  function clearMarks() {
    closePopover();
    for (const el of document.querySelectorAll(`.${MARKER_CLASS}`)) el.remove();
    for (const el of document.querySelectorAll(`[${MARK}]`)) el.removeAttribute(MARK);
    document.documentElement.classList.remove(REVEAL_CLASS);
    const notice = document.getElementById(NOTICE_ID);
    if (notice) notice.remove();
    hiddenCount = 0;
  }

  // --- settings -----------------------------------------------------------

  async function loadSettings() {
    const stored = await chrome.storage.local.get({
      searchFilterEnabled: false,
      searchFilterRules: [],
      searchFilterColors: [],
      searchFilterHideBlocked: true,
      customBlocks: [],
    });
    enabled = stored.searchFilterEnabled;
    palette = stored.searchFilterColors;

    const rules = stored.searchFilterRules.slice();
    // Sites on the global Blocked list can't be opened anyway — a result for one
    // is a dead link. Hiding them here is the same protection, one step earlier.
    if (stored.searchFilterHideBlocked) {
      for (const domain of stored.customBlocks) {
        rules.push({ pattern: domain, color: window.SieveSearchFilter.HIDE, source: "blocked" });
      }
    }
    compiled = window.SieveSearchFilter.compile(rules);
  }

  async function apply() {
    await loadSettings();
    clearMarks();
    if (!enabled) {
      stopObserving();
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      return;
    }
    applyStyles();
    process();
    startObserving();
  }

  // --- entry point --------------------------------------------------------

  document.addEventListener("mousedown", onMarkerPointer, true);
  document.addEventListener("click", onMarkerPointer, true);

  apply();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (
      changes.searchFilterEnabled ||
      changes.searchFilterRules ||
      changes.searchFilterColors ||
      changes.searchFilterHideBlocked ||
      changes.customBlocks
    ) {
      apply();
    }
  });
})();

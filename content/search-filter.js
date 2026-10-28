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
//      Supported engines: Google, Bing, DuckDuckGo (web results, and its
//      Images and Videos tabs).
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
  // Where background/search-filter-subscriptions.js keeps subscribed lists.
  const SUBS_KEY = "searchFilterSubscriptions";
  const SUBS_DATA_PREFIX = "searchFilterSub:";
  const STYLE_ID = "sv-sf-style";
  const NOTICE_ID = "sv-sf-notice";
  const SITES_ID = "sv-sf-sites"; // the notice's "By site" list
  const REVEAL_CLASS = "sv-sf-reveal"; // on <html> while hidden results are shown
  const MARKER_CLASS = "sv-sf-why";    // the per-result "why?" button
  const POPOVER_ID = "sv-sf-pop";      // the panel it opens
  // Sieve's ink and paper (common/sieve-ui.css). The marker is the toolbar
  // icon in miniature — the paper sieve on an ink tile — so it is plainly
  // Sieve's on a light results page and a dark one alike.
  const INK = "#1a1916";
  const PAPER = "#f2efe7";
  const GOLD = "#e8b54f";
  const HIDE_COLOR = "#c0563b";        // "this was hidden": Sieve's brick, mid-tone for light and dark pages
  const NO_COLOR = "#8c877c";          // a rule whose palette colour has since been removed
  // The sieve with fewer, larger holes (src/icons/mark-small.svg): at 16px
  // the full mesh clogs into a grey bowl. Paper on the tile's ink, the drops
  // in gold, as on the toolbar icon.
  const hole = (x, y) => `M${x} ${y}a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0-2.1 0z`;
  const SIEVE_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    `<path fill="${PAPER}" d="M4.75 5.3H21.45a1.05 1.05 0 0 1 0 2.1H4.75a1.05 1.05 0 0 1 0-2.1zM4.5 6.4H21.7A8.6 8.4 0 0 1 4.5 6.4Z` +
    [[7.1, 9.5], [10.4, 9.5], [13.7, 9.5], [17, 9.5], [8.75, 12.6], [12.05, 12.6], [15.35, 12.6]].map(([x, y]) => hole(x, y)).join("") +
    '"/>' +
    `<path d="M5.1 6.3 2.4 3.6" fill="none" stroke="${PAPER}" stroke-width="2" stroke-linecap="round"/>` +
    `<path fill="${GOLD}" d="M10.75 18.2a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0-2.1 0zM13.8 20.7a.8 .8 0 1 0 1.6 0a.8 .8 0 1 0-1.6 0z"/>` +
    "</svg>";
  const MONO = 'ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace';
  const POPOVER_DARK =
    "--sv-bg:#1b1b18;--sv-ink:#ede9df;--sv-dim:#8f8a7f;" +
    "--sv-line:rgba(237,233,223,.12);--sv-edge:rgba(237,233,223,.24);" +
    "box-shadow:0 0 0 1px var(--sv-edge),0 18px 40px -16px rgba(0,0,0,.75)";

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
  //   tiles   OPTIONAL. Results are tiles in a grid (pictures, videos), not
  //           rows of text: a colour is drawn as a ring instead of a bar that
  //           shifts the result sideways, and the "why?" marker sits beside
  //           the title instead of pushing the thumbnail aside.

  // DuckDuckGo keeps every tab at "/" with a ?q=, and says which tab in ia=
  // (and iax=, once the tab has been opened rather than linked to).
  function ddgTab(tab) {
    if (!/^(www\.)?duckduckgo\.com$/.test(location.hostname)) return false;
    const params = new URLSearchParams(location.search);
    return params.has("q") && (params.get("iax") === tab || params.get("ia") === tab);
  }

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
      // DuckDuckGo's Images tab (read off the live page, October 2026). A tile
      // is an <li> holding a <figure>: the thumbnail, which comes from
      // DuckDuckGo's own image proxy and so names nothing, and a caption whose
      // link and <h3> are the page the picture is from. The grid's rows are
      // <li>s as well, but each holds several <h3>s, so only a tile counts as a
      // result. Every class name is a hash that changes between releases; the
      // data-testid is the one stable handle.
      id: "duckduckgo-images",
      test: () => ddgTab("images"),
      roots: ["[data-testid='zci-images']"],
      blocks: "li",
      anchor: "a[href]",
      title: "h3",
      self: /(^|\.)duckduckgo\.com$/,
      tiles: true,
      noticeAnchor: "[data-testid='zci-images']",
    },
    {
      // DuckDuckGo's Videos tab: an <li> per video, the whole card one link to
      // the video's page, and an <h2> for its title.
      id: "duckduckgo-videos",
      test: () => ddgTab("videos"),
      roots: ["[data-testid='zci-videos']"],
      blocks: "li",
      anchor: "a[href]",
      title: "h2",
      self: /(^|\.)duckduckgo\.com$/,
      tiles: true,
      noticeAnchor: "[data-testid='zci-videos']",
    },
    {
      // DuckDuckGo serves results from "/" with a ?q=, not from a /search path.
      // Listed after its Images and Videos tabs, which this test also matches.
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

  function pickEngine() {
    return (
      ENGINES.find((e) => {
        try {
          return e.test();
        } catch (_) {
          return false;
        }
      }) || null
    );
  }

  // `let`, not `const`: DuckDuckGo changes tab without loading a new page, so
  // the engine can change under a running script. See followTabs().
  let engine = pickEngine();
  if (!engine) return; // not a search page — the overwhelmingly common case

  // --- state --------------------------------------------------------------
  let enabled = false;
  let hideCount = false; // the user chose no count, and so no way back to what is hidden
  let compiled = [];
  let palette = [];
  // Sieve's Appearance choice: "auto", "light" or "dark". Read here with the
  // other settings rather than by loading common/theme.js, which would add a
  // storage read to every page this script is injected into.
  let uiTheme = "auto";

  function markTheme(el) {
    if (!el) return;
    if (uiTheme === "light" || uiTheme === "dark") el.setAttribute("data-theme", uiTheme);
    else el.removeAttribute("data-theme");
  }
  // What is hidden on the page now: the total the notice states, and the same
  // results by site for its "By site" list. Changed only through noteHidden(),
  // noteShown() and recountHidden(), so the two can never disagree.
  let hiddenCount = 0;
  let hiddenBySite = new Map();
  let observer = null;
  let scheduled = false;

  function noteHidden(host) {
    hiddenCount++;
    hiddenBySite.set(host, (hiddenBySite.get(host) || 0) + 1);
  }

  function noteShown(host) {
    hiddenCount = Math.max(0, hiddenCount - 1);
    const left = (hiddenBySite.get(host) || 0) - 1;
    if (left > 0) hiddenBySite.set(host, left);
    else hiddenBySite.delete(host);
  }

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
      `#${NOTICE_ID}{font:14px/1.5 system-ui,sans-serif;opacity:.8;padding:9px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;list-style:none}`,
      // "By site": a full-width row under the notice, in the page's own text
      // colour (results pages are light and dark), scrolling past about ten
      // sites rather than pushing the results down the page.
      `#${NOTICE_ID} .sv-sf-sites{flex-basis:100%;max-width:440px;max-height:15em;overflow-y:auto;` +
        `margin:2px 0 0;padding:4px 0;list-style:none;` +
        `border-top:1px solid rgba(128,128,128,.35);border-bottom:1px solid rgba(128,128,128,.35)}`,
      `#${NOTICE_ID} .sv-sf-sites[hidden]{display:none}`,
      `#${NOTICE_ID} .sv-sf-sites li{display:flex;justify-content:space-between;gap:16px;margin:0;padding:2px 0;` +
        `font-size:13px;list-style:none}`,
      `#${NOTICE_ID} .sv-sf-site{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`,
      `#${NOTICE_ID} .sv-sf-n{flex:0 0 auto;font-variant-numeric:tabular-nums}`,
      `#${NOTICE_ID} button{font:inherit;cursor:pointer;background:none;border:0;padding:0;` +
        `color:currentColor;text-decoration:underline;text-underline-offset:3px}`,
      `#${NOTICE_ID} button::before{content:"·";display:inline-block;margin-right:8px}`,

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
      //
      // The light ring keeps the ink tile's edge visible on a dark results page.
      `.${MARKER_CLASS}{float:right;position:relative;z-index:2;` +
        `display:inline-flex;align-items:center;justify-content:center;` +
        `width:24px;height:24px;margin:7px 9px 4px 12px;padding:0;overflow:hidden;` +
        `cursor:pointer;border-radius:5px;border:0;` +
        `background:${INK};box-shadow:0 0 0 1px rgba(255,255,255,.45),0 1px 2px rgba(0,0,0,.25);` +
        `transition:box-shadow .12s}`,
      `.${MARKER_CLASS}:hover{box-shadow:0 0 0 1px rgba(255,255,255,.7),0 2px 6px rgba(0,0,0,.35)}`,
      `.${MARKER_CLASS}:focus-visible{outline:2px solid currentColor;outline-offset:2px}`,
      `.${MARKER_CLASS} svg{width:16px;height:16px;display:block;pointer-events:none}`,

      // Sieve's paper-and-ink panel, stated for both schemes: the results page
      // may be light or dark, and inheriting would make the text vanish on one
      // of them. --sv-accent is set per panel to the colour being explained.
      `#${POPOVER_ID}{position:absolute;z-index:2147483647;width:372px;` +
        `max-width:calc(100vw - 16px);border-radius:6px;overflow:hidden;text-align:left;` +
        `font:14px/1.5 "Segoe UI Variable Text",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;` +
        `--sv-bg:#f9f7f2;--sv-ink:${INK};--sv-dim:#66625a;--sv-line:rgba(26,25,22,.13);--sv-edge:rgba(26,25,22,.26);` +
        `background:var(--sv-bg);color:var(--sv-ink);` +
        `box-shadow:0 0 0 1px var(--sv-edge),0 18px 40px -16px rgba(0,0,0,.4)}`,
      // Dark under the system's dark mode unless Sieve is set to Light, and
      // always when it is set to Dark (common/theme.js). The choice rides on
      // the panel itself — the results page's <html> is the search engine's.
      `@media (prefers-color-scheme:dark){#${POPOVER_ID}:not([data-theme="light"]){${POPOVER_DARK}}}`,
      `#${POPOVER_ID}[data-theme="dark"]{${POPOVER_DARK}}`,
      `#${POPOVER_ID} *{box-sizing:border-box}`,

      // Header: who is talking (the mark), about what (site in serif, address
      // in mono), and the verdict as a stamp. The result's own colour runs down
      // the left edge, the same edge the result itself carries on the page.
      `#${POPOVER_ID} .sv-sf-head{display:flex;align-items:center;gap:12px;padding:14px 16px;` +
        `border-bottom:1px solid var(--sv-line);box-shadow:inset 3px 0 0 var(--sv-accent)}`,
      `#${POPOVER_ID} .sv-sf-brand{flex:0 0 auto;display:inline-flex;align-items:center;` +
        `justify-content:center;width:28px;height:28px;border-radius:5px;background:${INK}}`,
      `#${POPOVER_ID} .sv-sf-brand svg{width:19px;height:19px;display:block}`,
      `#${POPOVER_ID} .sv-sf-titles{flex:1 1 auto;min-width:0}`,
      `#${POPOVER_ID} .sv-sf-host{font:400 18px/1.25 "Iowan Old Style",Charter,"Sitka Heading",Cambria,Georgia,serif;` +
        `letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
      `#${POPOVER_ID} .sv-sf-url{font:12px/1.45 ${MONO};color:var(--sv-dim);` +
        `white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
      `#${POPOVER_ID} .sv-sf-pill{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;height:22px;` +
        `padding:0 7px;font:600 10.5px/1 ${MONO};letter-spacing:.08em;text-transform:uppercase;` +
        `border:1px solid var(--sv-edge);border-radius:2px;white-space:nowrap}`,
      `#${POPOVER_ID} .sv-sf-pill::before{content:"";width:8px;height:8px;border-radius:1px;background:var(--sv-accent)}`,

      `#${POPOVER_ID} .sv-sf-heading{display:flex;justify-content:space-between;align-items:baseline;` +
        `padding:14px 16px 8px;font:500 10.5px/1.3 ${MONO};text-transform:uppercase;` +
        `letter-spacing:.08em;color:var(--sv-dim)}`,
      `#${POPOVER_ID} .sv-sf-count{letter-spacing:0;text-transform:none;font-size:11.5px}`,

      // One line per rule, between hairlines; the deciding one is marked down
      // its left edge.
      `#${POPOVER_ID} .sv-sf-rules{list-style:none;margin:0 16px;padding:0;border-top:1px solid var(--sv-line)}`,
      `#${POPOVER_ID} .sv-sf-rules li{margin:0;padding:10px 0;border-bottom:1px solid var(--sv-line)}`,
      `#${POPOVER_ID} .sv-sf-rules li.is-winner{padding-left:10px;box-shadow:inset 2px 0 0 var(--sv-accent)}`,
      `#${POPOVER_ID} .sv-sf-rule-top{display:flex;align-items:center;gap:8px}`,
      `#${POPOVER_ID} .sv-sf-dot{flex:0 0 auto;width:10px;height:10px;border-radius:2px;` +
        `box-shadow:0 0 0 1px var(--sv-line)}`,
      // A hide has no palette colour of its own, so it gets a struck-through
      // swatch rather than an empty square that reads as a missing value.
      `#${POPOVER_ID} .sv-sf-dot.is-hide{background:transparent;position:relative}`,
      `#${POPOVER_ID} .sv-sf-dot.is-hide::after{content:"";position:absolute;inset:0;` +
        `background:linear-gradient(to bottom right,transparent 42%,${HIDE_COLOR} 42%,${HIDE_COLOR} 58%,transparent 58%)}`,
      `#${POPOVER_ID} code{flex:1 1 auto;min-width:0;font:13px/1.45 ${MONO};` +
        `background:none;padding:0;color:inherit;word-break:break-all}`,
      `#${POPOVER_ID} .sv-sf-won{flex:0 0 auto;font:600 10px/1 ${MONO};letter-spacing:.08em;text-transform:uppercase;` +
        `padding:4px 6px;border:1px solid var(--sv-accent);border-radius:2px}`,
      `#${POPOVER_ID} .sv-sf-effect{margin-top:3px;padding-left:18px;font-size:12.5px;color:var(--sv-dim)}`,

      `#${POPOVER_ID} .sv-sf-actions{display:flex;gap:8px;padding:14px 16px;margin-top:14px;` +
        `border-top:1px solid var(--sv-line)}`,
      `#${POPOVER_ID} button{font:inherit;font-size:13px;font-weight:500;cursor:pointer;min-height:34px;padding:0 14px;` +
        `border-radius:3px;border:1px solid var(--sv-edge);background:transparent;color:inherit;` +
        `transition:border-color .12s,opacity .12s}`,
      `#${POPOVER_ID} button:hover{border-color:var(--sv-ink)}`,
      `#${POPOVER_ID} button:focus-visible{outline:2px solid var(--sv-ink);outline-offset:2px}`,
      // Primary is ink on paper (paper on ink in dark) — never a colour.
      `#${POPOVER_ID} .sv-sf-primary{border-color:var(--sv-ink);background:var(--sv-ink);color:var(--sv-bg)}`,
      `#${POPOVER_ID} .sv-sf-primary:hover{opacity:.86}`,
    ];
    palette.forEach((color, i) => {
      // A tile in a grid gets a ring: the bar below is made with padding and a
      // negative margin, which in a grid would pull the tile out of line with
      // its neighbours, and a wash is lost behind a picture anyway. The ring
      // sits just OUTSIDE the tile, in the gap. Inside it was invisible on the
      // live Videos tab: the card within is position:relative with an opaque
      // background, and a positioned child paints over its parent's outline.
      if (engine.tiles) {
        rules.push(`[${MARK}="c${i + 1}"]{outline:3px solid ${color} !important;outline-offset:1px;border-radius:8px}`);
        return;
      }
      // Each colour is used twice: a faint wash behind the result, and the full
      // strength as a bar down its left edge. Alpha rather than a pale shade of
      // the same colour, because the results page can be light or dark — a
      // pastel that looks right on white turns light-on-light in dark mode,
      // while a wash just tints whatever is already there.
      const wash = tint(color, 0.16) || color;
      rules.push(
        `[${MARK}="c${i + 1}"]{background-color:${wash} !important;` +
          `box-shadow:inset 3px 0 0 ${color};border-radius:3px;` +
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

      // ONE ordered pass, not two nested scans.
      //
      // This used to ask, for every candidate, whether it contained any OTHER
      // candidate, and then whether it overlapped anything already found — two
      // O(n^2) sweeps of contains(). Measured: 0.2ms at 50 candidates, 1.4ms at
      // 200, 12.5ms at 600. A continuously-scrolled SERP reaches the high
      // hundreds, and this runs on every animation frame the observer fires.
      //
      // querySelectorAll returns document order, so a wrapper always appears
      // BEFORE the thing it wraps. That makes the "innermost wins" rule a
      // single backwards pass: walk from the end, and skip anything that
      // contains a candidate already accepted (which, going backwards, means
      // anything that wraps a tighter fit). Same answer, linear.
      const innermost = [];
      for (let i = candidates.length - 1; i >= 0; i--) {
        const block = candidates[i];
        let wrapsAccepted = false;
        for (const kept of innermost) {
          if (block.contains(kept)) {
            wrapsAccepted = true;
            break;
          }
        }
        if (!wrapsAccepted) innermost.push(block);
      }
      innermost.reverse(); // back to document order, so the notice counts read naturally

      for (const block of innermost) {
        // The same block can be reachable from two roots (#rso sits inside
        // #search), so an overlap check against what is already collected is
        // still needed — but `found` holds one entry per RESULT, not per
        // candidate, so it stays short.
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
    if (rule.source === "list") return `List: ${rule.listName}`;
    return rule.source === "blocked" ? "Blocked sites" : "Search Result Filter";
  }

  // "2 of 5": how many of the user's OWN rules matched. A subscribed list adds
  // thousands of entries the user never wrote, so those are counted apart
  // rather than swelling the total until the fraction says nothing.
  function matchCount(matched) {
    const own = matched.filter((rule) => rule.source !== "list").length;
    const fromLists = matched.length - own;
    const ownTotal = compiled.filter((rule) => rule.source !== "list").length;
    const lists = `${fromLists} from ${fromLists === 1 ? "a list" : "lists"}`;
    if (!fromLists) return `${own} of ${ownTotal}`;
    return own ? `${own} of ${ownTotal} · ${lists}` : lists;
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
    else dot.style.background = palette[rule.color - 1] || NO_COLOR;
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
    markTheme(popover);
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Why Sieve changed this result");
    // The panel is tinted by the very colour it is explaining, so the answer is
    // legible before a word of it is read.
    const accentColor = hidden ? HIDE_COLOR : palette[verdict.color - 1] || NO_COLOR;
    popover.style.setProperty("--sv-accent", accentColor);

    // --- header: who is talking, about what, and what happened --------------
    const head = el("header", "sv-sf-head");
    const brand = el("span", "sv-sf-brand");
    brand.innerHTML = SIEVE_SVG;
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
    heading.append(el("span", "sv-sf-count", matchCount(verdict.matched)));
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
        noteShown(verdict.host);
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
    // Sieve's own mark, drawn inline rather than loaded from the extension:
    // an <img> would mean adding the icon to web_accessible_resources, which
    // hands every page a reliable way to detect that Sieve is installed.
    marker.innerHTML = SIEVE_SVG;
    marker.title = "Why did Sieve change this result?";
    marker.setAttribute("aria-label", "Why did Sieve change this result?");
    // On a tile the block's first child is the thumbnail, which a float would
    // push aside; beside the title it only shortens the caption's lines.
    if (engine.tiles) titleEl.parentElement.insertBefore(marker, titleEl);
    else block.insertBefore(marker, block.firstChild);
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

  // DuckDuckGo moves between its All, Images and Videos tabs without loading a
  // new page, and keeps the tab it left in the page, hidden. So the engine is
  // chosen again whenever the address changes, and the count and its notice
  // start over for the tab now showing: the old notice lives in the old tab's
  // results, and updating it would be updating something nobody can see. A
  // user who searches first and then clicks Images would otherwise get no
  // filtering at all. Everywhere else the address does not change under a
  // results page, and this is one string comparison.
  let engineHref = location.href;

  function followTabs() {
    if (location.href === engineHref) return;
    engineHref = location.href;
    const next = pickEngine();
    if (!next || next === engine) return;
    engine = next;
    const notice = document.getElementById(NOTICE_ID);
    if (notice) notice.remove();
    document.documentElement.classList.remove(REVEAL_CLASS);
    recountHidden(); // a tab visited before keeps what it hid
    applyStyles();
  }

  // Recount from the page: the results already hidden under the current
  // engine's roots, by site. A Set, because on Google the roots nest and the
  // same result is reachable from two of them.
  function recountHidden() {
    const seen = new Set();
    for (const selector of engine.roots) {
      const root = document.querySelector(selector);
      if (root) for (const el of root.querySelectorAll(`[${MARK}="hidden"]`)) seen.add(el);
    }
    hiddenCount = 0;
    hiddenBySite = new Map();
    for (const el of seen) noteHidden((explanations.get(el) || {}).host || "");
  }

  function process() {
    if (!enabled) return;
    followTabs();
    let changed = false;
    for (const { block, url, title } of collectBlocks()) {
      const verdict = window.SieveSearchFilter.explain(compiled, url, title);
      if (verdict.color === null) {
        block.setAttribute(MARK, "seen"); // remember, so we don't re-test it
        continue;
      }
      if (verdict.color === window.SieveSearchFilter.HIDE) {
        block.setAttribute(MARK, "hidden");
        noteHidden(verdict.host);
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
  // user's trust the first time it gets one wrong. So no count is the user's
  // choice to make, never the default: for some, the way back is the problem.
  function updateNotice() {
    if (!hiddenCount || hideCount) {
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
      label.className = "sv-sf-label";
      const reveal = noticeButton("sv-sf-reveal", () => {
        document.documentElement.classList.toggle(REVEAL_CLASS);
        updateNotice();
      });
      const sites = document.createElement("ul");
      sites.id = SITES_ID;
      sites.className = "sv-sf-sites";
      sites.hidden = true;
      const bySite = noticeButton("sv-sf-by-site", () => {
        sites.hidden = !sites.hidden;
        updateNotice();
      });
      bySite.setAttribute("aria-controls", SITES_ID);
      notice.append(label, reveal, bySite, sites);
      anchor.insertBefore(notice, anchor.firstChild);
    }
    const revealed = document.documentElement.classList.contains(REVEAL_CLASS);
    notice.querySelector(".sv-sf-label").textContent =
      `Sieve hid ${hiddenCount} ${hiddenCount === 1 ? "result" : "results"}`;
    notice.querySelector(".sv-sf-reveal").textContent = revealed ? "Hide them again" : "Show them";
    const sites = notice.querySelector(".sv-sf-sites");
    const bySite = notice.querySelector(".sv-sf-by-site");
    bySite.textContent = sites.hidden ? "By site" : "Hide the list";
    bySite.setAttribute("aria-expanded", String(!sites.hidden));
    if (!sites.hidden) renderSites(sites);
    fitNoticeColor(notice);
  }

  // --- the notice's colour --------------------------------------------------
  //
  // The notice takes the results page's own text colour, which blends in on
  // almost every page. DuckDuckGo's dark theme is the exception found so far:
  // it colours each piece of its text and not the list the notice sits in, so
  // the notice inherited the browser's default black on a near-black page and
  // could not be read. So the inherited colour is checked against what is
  // actually behind the notice, and only when the two are too close does the
  // notice take a light or dark colour of its own. Checked on every update,
  // because a page can change theme without reloading.

  function parseRgb(value) {
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(String(value || ""));
    if (!m) return null;
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[4] && m[4].endsWith("%")) a /= 100;
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }

  // WCAG relative luminance, 0 (black) to 1 (white).
  function luminance({ r, g, b }) {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  // The first solid background at or above the element. A page that paints
  // none anywhere shows the browser's white.
  function backgroundBehind(el) {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const color = parseRgb(getComputedStyle(node).backgroundColor);
      if (color && color.a >= 0.5) return color;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function fitNoticeColor(notice) {
    notice.style.removeProperty("color");
    const text = parseRgb(getComputedStyle(notice).color);
    if (!text) return; // a colour format this cannot read: leave the page's
    const back = backgroundBehind(notice);
    const lighter = Math.max(luminance(text), luminance(back));
    const darker = Math.min(luminance(text), luminance(back));
    // 4.5:1 is WCAG's floor for text this size; the notice is also drawn at
    // 80% opacity, so it needs that much to stay readable.
    if ((lighter + 0.05) / (darker + 0.05) >= 4.5) return;
    notice.style.setProperty("color", luminance(back) < 0.35 ? "#e8e6e1" : "#202124", "important");
  }

  function noticeButton(className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.addEventListener("click", onClick);
    return button;
  }

  // Which sites were hidden, and how many results each: the most first, then
  // by name. What was hidden can be seen at a glance without showing any of
  // it, so a filter that is catching more than it should is noticed without
  // revealing the results. The list scrolls once it is long (see applyStyles),
  // and is kept current as more results stream in while it is open.
  function renderSites(list) {
    list.textContent = "";
    const rows = [...hiddenBySite].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [host, count] of rows) {
      const row = document.createElement("li");
      const site = document.createElement("span");
      site.className = "sv-sf-site";
      site.textContent = host || "(no address)";
      const n = document.createElement("span");
      n.className = "sv-sf-n";
      n.textContent = String(count);
      row.append(site, n);
      list.append(row);
    }
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
    hiddenBySite = new Map();
  }

  // --- settings -----------------------------------------------------------

  async function loadSettings() {
    const stored = await chrome.storage.local.get({
      searchFilterEnabled: false,
      searchFilterRules: [],
      searchFilterColors: [],
      searchFilterHideBlocked: true,
      searchFilterHideCount: false,
      customBlocks: [],
      uiTheme: "auto",
    });
    enabled = stored.searchFilterEnabled;
    hideCount = stored.searchFilterHideCount;
    uiTheme = stored.uiTheme;
    palette = stored.searchFilterColors;

    const rules = stored.searchFilterRules.slice();
    // Sites on the global Blocked list can't be opened anyway — a result for one
    // is a dead link. Hiding them here is the same protection, one step earlier.
    if (stored.searchFilterHideBlocked) {
      for (const domain of stored.customBlocks) {
        rules.push({ pattern: domain, color: window.SieveSearchFilter.HIDE, source: "blocked" });
      }
    }
    compiled = window.SieveSearchFilter.compile(rules, enabled ? await loadLists() : []);
  }

  // Subscribed lists (background/search-filter-subscriptions.js): the small
  // metadata first, then the stored rules of only the lists switched on. Only
  // ever read here, on a results page, which is why the total is capped there.
  async function loadLists() {
    const { [SUBS_KEY]: subs } = await chrome.storage.local.get({ [SUBS_KEY]: [] });
    const active = (Array.isArray(subs) ? subs : []).filter((s) => s && s.enabled !== false && s.updatedAt);
    if (!active.length) return [];
    const data = await chrome.storage.local.get(active.map((s) => SUBS_DATA_PREFIX + s.id));
    return active.map((s) => {
      const stored = data[SUBS_DATA_PREFIX + s.id] || {};
      return { name: s.name, color: s.color, hosts: stored.hosts || "", patterns: stored.patterns || [] };
    });
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
    // A new Appearance choice only recolours the open panel; nothing to re-run.
    if (changes.uiTheme) {
      uiTheme = changes.uiTheme.newValue;
      markTheme(popover);
    }
    if (
      changes.searchFilterEnabled ||
      changes.searchFilterRules ||
      changes.searchFilterColors ||
      changes.searchFilterHideBlocked ||
      changes.searchFilterHideCount ||
      changes.customBlocks ||
      changes[SUBS_KEY] ||
      Object.keys(changes).some((key) => key.startsWith(SUBS_DATA_PREFIX))
    ) {
      apply();
    }
  });
})();

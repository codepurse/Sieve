// test/search-filter-serp-test.mjs
// End-to-end test for content/search-filter.js against Google-, Bing-,
// DuckDuckGo-, Brave-, Swisscows- and Yahoo-shaped results pages.
// Run: node test/search-filter-serp-test.mjs
//
// Each page is served under the engine's real hostname (Chrome's
// --host-resolver-rules points it at the local server), so the content script
// runs its genuine engine test and its genuine selectors rather than a stubbed
// version of them.
//
// The fixtures below are modelled on markup read off the live pages: Bing's
// li.b_algo with an h2 title, a second h3, and every link wrapped in
// bing.com/ck/a?u=a1<base64url>; DuckDuckGo's article[data-testid=result]
// nested in li[data-layout=organic] with a self-link ahead of the real one.
// What this still canNOT tell you is whether those selectors match what the
// engines serve TODAY — see the note at the top of the content script.
//
// Requires Chrome installed. Skips with a message if it isn't found.

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => fs.existsSync(p));
if (!CHROME) {
  console.log("search-filter-serp: SKIPPED (Chrome not found)");
  process.exit(0);
}

// The rules every engine's page is tested with.
const SETTINGS = `
  const store = {
    searchFilterEnabled: true,
    searchFilterHideBlocked: true,
    searchFilterRules: [
      { pattern: ".edu", color: 1 },
      { pattern: "harvard.edu", color: 2 },
      { pattern: "github.com", color: 2 },
      { pattern: ".cyou", color: 0 }
    ],
    searchFilterColors: ["#2ea043", "#3b82f6"],
    customBlocks: ["blocked-example.com"]
  };
  window.chrome = {
    storage: {
      local: { get: (keys) => {
        const o = {};
        if (Array.isArray(keys)) { for (const k of keys) if (k in store) o[k] = store[k]; return Promise.resolve(o); }
        for (const k of Object.keys(keys)) o[k] = k in store ? store[k] : keys[k];
        return Promise.resolve(o);
      } },
      onChanged: { addListener() {} }
    },
    runtime: { getURL: (p) => "/" + p }
  };`;

// Reports what the content script did, keyed by result title, plus the few
// structural facts the assertions care about.
const REPORTER = (titleSelector, settleMs = 400) => `
<pre id="RESULTS"></pre>
<script src="/common/keyword-pattern.js"></script>
<script src="/common/host-index.js"></script>
<script src="/common/search-filter.js"></script>
<script src="/content/search-filter.js"></script>
<script>
(async () => {
  const out = { byTitle: {} };
  await new Promise((r) => setTimeout(r, ${settleMs}));
  try {
    for (const el of document.querySelectorAll("[data-sv-sf]")) {
      const t = el.querySelector(${JSON.stringify(titleSelector)});
      out.byTitle[t ? t.textContent.trim() : "(none)"] = el.getAttribute("data-sv-sf");
    }
    out.marked = document.querySelectorAll("[data-sv-sf]").length;
    out.hidden = document.querySelectorAll('[data-sv-sf="hidden"]').length;
    const notice = document.getElementById("sv-sf-notice");
    out.notice = notice ? notice.firstChild.textContent : null;
    out.noticeTag = notice ? notice.tagName : null;
    out.noticeParentTag = notice ? notice.parentElement.tagName : null;
    out.noticeIn = notice ? notice.parentElement.getAttribute("data-testid") : null;
    out.notices = document.querySelectorAll("#sv-sf-notice").length;
    // The colour the notice is drawn in, and whether Sieve had to set one
    // (an inline colour) rather than take the page's.
    out.noticeStyle = notice ? { color: getComputedStyle(notice).color, inline: notice.style.color } : null;
    // "By site": opened here and left open, so it can be read again after a
    // result is shown on the page further down.
    const sitesRows = () => [...document.querySelectorAll("#sv-sf-sites li")]
      .map((li) => li.querySelector(".sv-sf-site").textContent + " " + li.querySelector(".sv-sf-n").textContent);
    const bySiteButton = notice && notice.querySelector(".sv-sf-by-site");
    if (bySiteButton) {
      out.bySiteClosed = { label: bySiteButton.textContent, expanded: bySiteButton.getAttribute("aria-expanded"), rows: sitesRows().length };
      bySiteButton.click();
      await new Promise((r) => setTimeout(r, 20));
      const list = document.getElementById("sv-sf-sites");
      out.bySite = {
        label: bySiteButton.textContent,
        expanded: bySiteButton.getAttribute("aria-expanded"),
        rows: sitesRows(),
        scrolls: getComputedStyle(list).overflowY,
        visible: list.getBoundingClientRect().height > 0,
      };
    }
    const noticeText = () => {
      const n = document.getElementById("sv-sf-notice");
      return n ? n.querySelector(".sv-sf-label").textContent + n.querySelector(".sv-sf-reveal").textContent : null;
    };
    // How a colour is drawn: a bar made of padding on a row of text, a ring on
    // a tile in a grid.
    const coloured = document.querySelector('[data-sv-sf="c1"]');
    if (coloured) {
      const cs = getComputedStyle(coloured);
      out.colourStyle = { outline: cs.outlineStyle + " " + cs.outlineWidth, offset: cs.outlineOffset,
        paddingLeft: cs.paddingLeft, marginLeft: cs.marginLeft };
    }
    const probe = document.querySelector("[data-probe]");
    out.probe = probe ? probe.getAttribute("data-sv-sf") : "(absent)";

    // "Why is this here?" — every affected result gets a marker, and none of
    // the untouched ones do.
    out.markers = document.querySelectorAll(".sv-sf-why").length;
    // Dispatching marker.click() proves nothing about whether a real click
    // reaches it — that goes through hit-testing, which is where a search
    // engine's own overlays win. Ask the page who is actually on top.
    const visibleMarker = [...document.querySelectorAll(".sv-sf-why")]
      .find((m) => m.closest('[data-sv-sf]').getAttribute("data-sv-sf") !== "hidden");
    if (visibleMarker) {
      const next = visibleMarker.nextElementSibling;
      out.markerBesideTitle = !!next && next.matches(${JSON.stringify(titleSelector)});
      const b = visibleMarker.getBoundingClientRect();
      out.markerSize = [Math.round(b.width), Math.round(b.height)];
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      out.hitTestTop = top ? top.tagName + (top.className ? "." + String(top.className).split(" ")[0] : "") : null;
      out.markerIsClickable = !!top && (top === visibleMarker || visibleMarker.contains(top));
      // The engine's own controls under the marker, which it would be
      // sitting on top of. Being clickable itself says nothing about that.
      out.markerCovers = document.elementsFromPoint(b.left + b.width / 2, b.top + b.height / 2)
        .filter((e) => e !== visibleMarker && !visibleMarker.contains(e) && !e.contains(visibleMarker) && e.matches("button"))
        .map((e) => e.getAttribute("aria-label") || e.tagName).join(",");
      out.markerParent = visibleMarker.parentElement.tagName;
    }
    out.markerOnSeen = !!document.querySelector('[data-sv-sf="seen"] .sv-sf-why');
    const readPopover = async (block) => {
      const m = block && block.querySelector(".sv-sf-why");
      if (!m) return null;
      m.click();
      await new Promise((r) => setTimeout(r, 50));
      const pop = document.getElementById("sv-sf-pop");
      if (!pop) return null;
      const data = {
        host: pop.querySelector(".sv-sf-host").textContent,
        url: pop.querySelector(".sv-sf-url").textContent,
        pill: pop.querySelector(".sv-sf-pill").textContent,
        count: pop.querySelector(".sv-sf-count").textContent,
        accent: pop.style.getPropertyValue("--sv-accent"),
        rules: [...pop.querySelectorAll(".sv-sf-rules code")].map((c) => c.textContent),
        effects: [...pop.querySelectorAll(".sv-sf-effect")].map((c) => c.textContent),
        applied: [...pop.querySelectorAll(".sv-sf-rules li")].filter((li) => li.querySelector(".sv-sf-won"))
          .map((li) => li.querySelector("code").textContent),
        buttons: [...pop.querySelectorAll("button")].map((b) => b.textContent),
      };
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      return data;
    };
    // A highlighted result caught by TWO rules, and one hidden by the global list.
    const titleIs = (txt) => [...document.querySelectorAll("[data-sv-sf]")]
      .find((el) => { const h = el.querySelector(${JSON.stringify(titleSelector)}); return h && h.textContent.trim() === txt; });
    out.multi = await readPopover(titleIs("Harvard"));
    out.fromList = await readPopover(titleIs("Blocked Site"));
    out.fromSubscription = await readPopover(titleIs("MDN")); // only marked on the list page

    const hiddenBlock = document.querySelector('[data-sv-sf="hidden"]');
    const marker = hiddenBlock && hiddenBlock.querySelector(".sv-sf-why");
    out.hasMarker = !!marker;
    if (marker) {
      marker.click();
      await new Promise((r) => setTimeout(r, 60));
      const pop = document.getElementById("sv-sf-pop");
      out.popOpen = !!pop;
      if (pop) {
        out.popHost = pop.querySelector(".sv-sf-host").textContent;
        out.popUrl = pop.querySelector(".sv-sf-url").textContent;
        out.popPill = pop.querySelector(".sv-sf-pill").textContent;
        out.popCount = pop.querySelector(".sv-sf-count").textContent;
        out.popAccent = pop.style.getPropertyValue("--sv-accent");
        out.popRules = [...pop.querySelectorAll(".sv-sf-rules code")].map((c) => c.textContent);
        out.popEffects = [...pop.querySelectorAll(".sv-sf-effect")].map((c) => c.textContent);
        out.popButtons = [...pop.querySelectorAll("button")].map((b) => b.textContent);
        // Escape closes it.
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        out.closedOnEscape = !document.getElementById("sv-sf-pop");
        // Re-open and use "Show on this page".
        marker.click();
        await new Promise((r) => setTimeout(r, 40));
        const show = [...document.querySelectorAll("#sv-sf-pop button")].find((b) => /Show on this page/.test(b.textContent));
        if (show) {
          show.click();
          await new Promise((r) => setTimeout(r, 40));
          out.afterShowMark = hiddenBlock.getAttribute("data-sv-sf");
          out.afterShowDisplay = getComputedStyle(hiddenBlock).display;
          out.afterShowNotice = noticeText();
          out.bySiteAfterShow = sitesRows();
        }
      }
    }
  } catch (e) { out.threw = e.message; }
  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>`;

// `extra` overrides the shared settings for one page.
const page = (title, body, titleSelector, settleMs, extra) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<script>${SETTINGS}${extra ? `Object.assign(store, ${JSON.stringify(extra)});` : ""}</script></head><body>${body}${REPORTER(titleSelector, settleMs)}</body></html>`;

// --- Google -----------------------------------------------------------------
// Every result sits inside ONE outer data-hveid wrapper, which is what made a
// single matching link tint the whole page.
let hv = 0;
// Modelled on Google's real result: an inner div covering the whole block with
// `position:relative`. Positioned elements paint — and hit-test — ABOVE floats,
// so a plainly floated marker ends up underneath this and cannot be clicked,
// which is exactly the bug this fixture exists to catch.
const gResult = (href, title, extra = "") =>
  `<div data-hveid="CA${++hv}" class="g"><div class="N54PNb" style="position:relative">
     <a href="${href}"><h3>${title}</h3></a>
     <div class="snippet">Description.</div></div>${extra}</div>`;

const GOOGLE = page(
  "test - Google Search",
  `<div id="search"><div id="rso"><div data-hveid="CAwrap" data-probe="wrapper">
     ${gResult("https://www.harvard.edu/admissions", "Harvard")}
     ${gResult("https://github.com/torvalds/linux", "torvalds/linux", '<div data-hveid="CAsite"><a href="https://github.com/torvalds/linux/docs">Docs</a></div>')}
     ${gResult("https://junk.cyou/spam", "Cheap Deals")}
     ${gResult("https://blocked-example.com/x", "Blocked Site")}
     ${gResult("https://developer.mozilla.org/en-US/", "MDN")}
     <div data-hveid="CAself"><a href="https://www.google.com/search?q=related">Related</a></div>
     <div data-hveid="CApaa"><div role="heading">People also ask</div><a href="https://www.harvard.edu/faq">Q</a></div>
   </div></div></div>`,
  "h3"
);

// --- Bing -------------------------------------------------------------------
// Real Bing hides the destination behind bing.com/ck/a?u=a1<base64url> and puts
// BOTH an h2 and an h3 in every result.
const b64 = (u) => "a1" + Buffer.from(u, "utf8").toString("base64url");
const bResult = (href, title) =>
  `<li class="b_algo"><h2><a href="https://www.bing.com/ck/a?!&p=x&u=${b64(href)}&ntb=1">${title}</a></h2>
   <div class="b_caption"><cite>${href}</cite><p>Description.</p><h3>Related heading</h3></div></li>`;

const BING = page(
  "example - Bing",
  `<ol id="b_results">
     ${bResult("https://www.harvard.edu/admissions", "Harvard")}
     ${bResult("https://github.com/torvalds/linux", "torvalds/linux")}
     ${bResult("https://junk.cyou/spam", "Cheap Deals")}
     ${bResult("https://blocked-example.com/x", "Blocked Site")}
     ${bResult("https://developer.mozilla.org/en-US/", "MDN")}
     <li class="b_ans" data-probe="answer"><h2>An answer box</h2><a href="https://www.harvard.edu/x">More</a></li>
   </ol>`,
  "h2"
);

// --- DuckDuckGo -------------------------------------------------------------
// article nested inside li — both match `blocks`, so the innermost must win —
// and a self-link sits ahead of the real one inside each result.
const dResult = (href, title) =>
  `<li data-layout="organic"><article data-testid="result">
     <a href="https://duckduckgo.com/?q=site%3A${encodeURIComponent(title)}">site search</a>
     <h2><a href="${href}">${title}</a></h2><div>Description.</div>
   </article></li>`;

const DDG = page(
  "example at DuckDuckGo",
  `<ol class="react-results--main">
     ${dResult("https://www.harvard.edu/admissions", "Harvard")}
     ${dResult("https://github.com/torvalds/linux", "torvalds/linux")}
     ${dResult("https://junk.cyou/spam", "Cheap Deals")}
     ${dResult("https://blocked-example.com/x", "Blocked Site")}
     ${dResult("https://developer.mozilla.org/en-US/", "MDN")}
     <li data-layout="organic"><article data-testid="result">
       <h2><a href="https://duckduckgo.com/l/?uddg=${encodeURIComponent("https://www.yale.edu/about")}">Yale</a></h2>
     </article></li>
   </ol>`,
  "h2"
);

// --- DuckDuckGo's Images and Videos tabs -------------------------------------
// Read off the live tabs in October 2026, class names left out because they are
// hashes. Images: the grid's ROWS are <li>s holding several tiles, so only the
// inner <li> (exactly one <h3>) is a result; the thumbnail comes from
// DuckDuckGo's own proxy and names nothing, and the source is the caption's
// link. Videos: one <li> per video, the whole card a single link, an <h2>.
const SOURCES = [
  ["https://www.harvard.edu/admissions", "Harvard"],
  ["https://github.com/torvalds/linux", "torvalds/linux"],
  ["https://junk.cyou/spam", "Cheap Deals"],
  ["https://blocked-example.com/x", "Blocked Site"],
  ["https://developer.mozilla.org/en-US/", "MDN"],
];

const imageTile = ([href, title]) =>
  `<li><figure><div><img alt=""><span>1280 × 720</span><div></div></div>
     <div><figcaption><a href="${href}" rel="noopener"><h3 title="${title}">${title}</h3>
       <div><div><img alt="" width="16" height="16"><p>${new URL(href).hostname}</p></div>
       <div><button type="button" aria-label="Menu">…</button></div></div>
     </a></figcaption></div></figure></li>`;

const IMAGES_GRID = `<div data-testid="zci-images"><div><section><ol>
     <li><ol>${SOURCES.slice(0, 3).map(imageTile).join("")}</ol></li>
     <li><ol>${SOURCES.slice(3).map(imageTile).join("")}</ol></li>
   </ol></section></div></div>`;

const videoTile = ([href, title]) =>
  `<li><a href="${href}" rel="noopener"><article>
     <div><div><img alt=""></div><div><p>0:20</p></div></div>
     <div><h2 title="${title}"><span>${title}</span></h2></div>
     <div><div><span><div>1yr</div></span><span>2.9K views</span></div>
       <div><div><img alt="" width="16" height="16"><span>YouTube</span></div>
       <div><button type="button" aria-label="Menu">…</button></div></div></div>
   </article></a></li>`;

const VIDEOS_GRID = `<div data-testid="zci-videos"><div><ol>${SOURCES.map(videoTile).join("")}</ol></div></div>`;

// Opened on the web results, then switched to Images the way DuckDuckGo does
// it: the address changes by pushState, the web results stay in the page
// hidden, and the image grid is added beside them. No new page is loaded.
//
// The script reacts to a change by queueing a pass for the next animation
// frame, and under --virtual-time-budget headless Chrome draws ONE frame, about
// 20ms in, then never another (measured). Everything after load would wait for
// a frame that never comes, so this page gets a frame clock: 16ms timers, which
// the virtual clock does drive. Nothing about the page itself is faked.
const DDG_TAB_SWITCH = page(
  "example at DuckDuckGo",
  `${DDG.match(/<ol class="react-results--main">[\s\S]*?<\/ol>/)[0]}
   <script>
     window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
     setTimeout(() => {
       history.pushState({}, "", "/?q=test&ia=images&iax=images");
       document.querySelector("ol.react-results--main").style.display = "none";
       document.body.insertAdjacentHTML("afterbegin", ${JSON.stringify(IMAGES_GRID)});
     }, 500);
   </script>`,
  "h3",
  1400
);

// The Blocked-sites half (content/custom-block.js), on its own: the Search
// Result Filter is off, so whatever is hidden here was hidden by the list.
const BLOCKLIST_PAGE = (body, titleSelector) => `<!doctype html><html><head><meta charset="utf-8">
<script>
  const store = { customBlocks: ["blocked-example.com"], allowlist: [] };
  window.chrome = {
    storage: {
      local: { get: (defs) => { const o = {}; for (const k of Object.keys(defs)) o[k] = k in store ? store[k] : defs[k]; return Promise.resolve(o); } },
      onChanged: { addListener() {} }
    },
    runtime: { getURL: (p) => "/" + p }
  };
</script></head><body>${body}
<pre id="RESULTS"></pre>
<script src="/common/keyword-pattern.js"></script>
<script src="/content/custom-block.js"></script>
<script>
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  const out = { shown: {} };
  for (const h of document.querySelectorAll(${JSON.stringify(titleSelector)})) {
    out.shown[h.textContent.trim()] = getComputedStyle(h.closest("li")).display !== "none";
  }
  out.hiddenTags = [...document.querySelectorAll("[data-sv-cb-hidden]")].map((e) => e.tagName);
  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script></body></html>`;

// WCAG contrast between two computed colours, "rgb(r, g, b)".
function contrast(a, b) {
  const lum = (value) => {
    const [r, g, b] = value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const ch = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// DuckDuckGo's results, on a dark page. "Unthemed" is DuckDuckGo's own dark
// theme as it really is: the page is dark, but nothing sets a text colour on
// the list the notice sits in, so it inherits the browser's black. "Themed"
// is a dark page that does colour its text, which the notice should simply use.
const DDG_DARK = (themed) =>
  `<style>html,body{background:#1c1c1c}${themed ? "ol.react-results--main{color:#e3e3e3}" : ""}</style>` +
  DDG.match(/<ol class="react-results--main">[\s\S]*?<\/ol>/)[0];

// --- DuckDuckGo's html version ----------------------------------------------
// Read off html.duckduckgo.com in October 2026: a div.result per result in
// #links, an h2 title. Opened from a ?q= link, every link in a result is the
// protocol-relative //duckduckgo.com/l/?uddg=…, which resultUrl() used to
// refuse as "not absolute" before the redirect could be unwrapped. Searched
// from its own box, the form POSTs to /html/ (no ?q= at all) and the links
// come back direct.
const ddgHtmlResult = ([href, title], wrapped) => {
  const link = wrapped ? `//duckduckgo.com/l/?uddg=${encodeURIComponent(href)}&amp;rut=abc123` : href;
  return `<div class="result results_links results_links_deep web-result"><div class="links_main links_deep result__body">
     <h2 class="result__title"><a rel="nofollow" class="result__a" href="${link}">${title}</a></h2>
     <div class="result__extras"><div class="result__extras__url"><span class="result__icon"><a rel="nofollow" href="${link}"><img class="result__icon__img" alt=""></a></span>
       <a class="result__url" href="${link}">${new URL(href).hostname}</a></div></div>
     <a class="result__snippet" href="${link}">Description.</a><div class="clear"></div></div></div>`;
};
const DDG_HTML = (wrapped) => page("test at DuckDuckGo",
  `<div id="links" class="results">${SOURCES.map((s) => ddgHtmlResult(s, wrapped)).join("")}
     <div class="nav-link"><form action="/html/" method="post"><input type="submit" value="Next"></form></div></div>`,
  "h2");

// --- Brave Search --------------------------------------------------------------
// Read off search.brave.com in October 2026: a div.snippet[data-type="web"] per
// result in section#mixed-main, a div.title inside the one link, which goes
// straight to the site. Snippets of other types share the list; a discussions
// box here, with a title and a link of its own, is not a result.
const braveResult = ([href, title]) =>
  `<div class="snippet svelte-jmfu5f" data-type="web" data-keynav="true"><div class="result-body"><div class="result-wrapper"><div class="result-content">
     <a href="${href}" class="svelte-14r20fy l1"><div class="site-name-wrapper"><div class="site-name-content">
       <div class="t-secondary">${new URL(href).hostname}</div><cite class="snippet-url"><span>› path</span></cite></div></div>
       <div class="title search-snippet-title" title="${title}">${title}</div></a>
     <div class="generic-snippet"><div class="content">Description.</div></div>
   </div></div></div></div>`;

const BRAVE_MAIN = `<main id="search-page"><section id="mixed-main">
     ${SOURCES.map(braveResult).join("")}
     <div id="discussions" class="snippet svelte-jmfu5f" data-probe="discussions"><div class="title">Discussions</div>
       <a href="https://www.harvard.edu/forum">A thread</a></div>
   </section></main>`;

// Brave puts its results on the page twice: once in the HTML, then again as
// its script starts, as fresh copies of the same results. A running total
// counted each hidden result twice ("Sieve hid 4 results" over two). Here the
// list is rebuilt from its own HTML 300ms in, with the frame clock that
// DDG_TAB_SWITCH explains.
const BRAVE_RERENDER = page(
  "test - Brave Search",
  `${BRAVE_MAIN}
   <script>
     window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
     const fresh = document.querySelector("#mixed-main").innerHTML;
     setTimeout(() => { document.querySelector("#mixed-main").innerHTML = fresh; }, 300);
   </script>`,
  ".title",
  1000
);

// --- Swisscows -----------------------------------------------------------------
// Read off swisscows.com in October 2026: an article.item per result in
// div.web-results, an h1 inside a direct link. Its own buttons are pinned
// absolutely into the result's top-right corner, where the marker would
// otherwise float, so the styles that do that are copied here too. The video
// carousel in the same list is article.video-object, which is not a result.
const SWISSCOWS_STYLE = `<style>
  .web-results article.item{position:relative;display:block;margin:0 0 16px}
  .web-results article.item header{position:relative}
  .web-results .actions{position:absolute;top:2px;right:0;display:flex;gap:8px}
  .web-results .actions button{width:24px;height:24px;padding:0}
  .web-results article.item footer{display:flex;justify-content:flex-end;align-items:center;gap:8px}
</style>`;

const swisscowsResult = ([href, title]) =>
  `<article class="item web-page"><header>
     <a href="${href}"><div class="thumbnail"><img alt=""></div></a>
     <a class="mainlink" href="${href}"><h1 class="title">${title}</h1></a>
     <div class="actions"><div class="button-dropdown"><button type="button" aria-label="Like">+</button></div>
       <div class="button-dropdown"><button type="button" aria-label="Share">s</button></div>
       <div class="button-dropdown"><button type="button" aria-label="More">…</button></div></div>
   </header><p class="description">Description.</p>
   <footer><div class="site"><a href="${href}"><img class="favicon" alt=""></a></div>
     <button class="button" type="button"><span>Preview</span></button></footer></article>`;

const SWISSCOWS_RESULTS = (results) => `<div class="web-results content">
     ${results.map(swisscowsResult).join("")}
     <section class="widget widget-video"><header class="widget-header"><h1 class="widget-title">Video</h1></header>
       <div class="swiper"><div class="swiper-wrapper"><div class="swiper-slide"><article class="video-object" data-probe="video">
         <a href="https://www.harvard.edu/video"><h2>A video</h2></a></article></div></div></div></section>
   </div>`;

// Searched from the home page, the way most people get there: Swisscows shows
// the results without loading a page, so the script started on a page that
// was not a results page. Then a second search from the results page, which
// swaps one search's results for the next and keeps the list they sit in.
const SECOND_SEARCH = [
  ["https://junk.cyou/other", "More Deals"],
  ["https://www.harvard.edu/news", "Harvard News"],
  ["https://example.org/", "Example"],
];
const SWISSCOWS_SPA = page(
  "Your private and anonymous search engine Swisscows",
  `${SWISSCOWS_STYLE}<div class="main"><form action="/en/web"><input type="search" name="query"></form></div>
   <script>
     window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
     setTimeout(() => {
       history.pushState({}, "", "/en/web?query=test");
       document.querySelector(".main").insertAdjacentHTML("beforeend", ${JSON.stringify(SWISSCOWS_RESULTS(SOURCES))});
     }, 400);
     setTimeout(() => {
       history.pushState({}, "", "/en/web?query=more");
       const list = document.querySelector(".web-results");
       for (const old of list.querySelectorAll("article.item")) old.remove();
       list.querySelector(".widget").insertAdjacentHTML("beforebegin", ${JSON.stringify(SECOND_SEARCH.map(swisscowsResult).join(""))});
     }, 900);
   </script>`,
  "h1",
  1500
);

// --- Yahoo ---------------------------------------------------------------------
// Read off search.yahoo.com (and uk., fr.) in October 2026: a div.algo per
// result in #web, one h3, direct links. search.yahoo.com wraps the h3 in its
// link; the regional versions put the link inside the h3, as Harvard's does
// here.
// Yahoo's own stylesheet beats the colour bar's negative margin, which the
// #web rule below reproduces. A result-shaped block outside #web is not a
// result.
const yahooResult = ([href, title], linkInside) => {
  const heading = linkInside
    ? `<h3 class="title"><a href="${href}">${title}</a></h3>`
    : `<a class="d-ib va-top" href="${href}"><div class="d-ib p-abs"><span>${new URL(href).hostname}</span></div>
         <h3 class="title"><span>${title}</span></h3></a>`;
  return `<li><div class="dd algo algo-sr relsrch"><div class="compTitle options-toggle">${heading}</div>
     <div class="compText"><p>Description.</p></div>
     <div class="compList"><ul><li><a href="${href}/more">More from this site</a></li></ul></div></div></li>`;
};

const YAHOO = page(
  "test - Yahoo Search Results",
  `<style>#web .dd{margin-left:0}</style>
   <ol class="searchCenterTopAds"><li><div class="dd algo" data-probe="outside"><h3><a href="https://www.harvard.edu/ad">Outside</a></h3></div></li></ol>
   <div id="web" class="web-res"><ol class="reg searchCenterMiddle">
     ${SOURCES.map((s) => yahooResult(s, s[1] === "Harvard")).join("")}
   </ol></div>`,
  "h3"
);

// What every tile case asserts beyond the shared checks.
function checkTiles(id, r) {
  eq(r.marked, 5, `${id}: one mark per tile, none on the grid's rows`);
  eq(r.noticeIn, id === "duckduckgo-images" ? "zci-images" : "zci-videos", `${id}: the notice sits at the top of the grid`);
  eq(r.colourStyle.outline, "solid 3px", `${id}: a colour is a ring around the tile`);
  // Outside the tile, not inside: on the live Videos tab the card inside is
  // positioned and opaque, and it painted straight over an inset ring.
  eq(r.colourStyle.offset, "1px", `${id}: the ring sits just outside the tile`);
  eq(r.colourStyle.paddingLeft, "0px", `${id}: and never the padding that shifts a row of text`);
  eq(r.markerBesideTitle, true, `${id}: the marker sits beside the title, not over the thumbnail`);
}

// The whole tile goes, picture and all; before, only the caption did.
function checkBlocklist(id, r) {
  eq(r.shown["Blocked Site"], false, `${id}: the blocked site's tile is hidden`);
  eq(r.hiddenTags.join(","), "LI", `${id}: the tile itself is what is hidden, not its caption`);
  for (const title of ["Harvard", "torvalds/linux", "Cheap Deals", "MDN"]) {
    eq(r.shown[title], true, `${id}: ${title} is left alone`);
  }
}

// `tls`: the case needs the self-signed certificate below (HSTS), and is
// skipped without openssl.
const CASES = [
  { id: "google", host: "www.google.com", url: "/search?q=test", body: GOOGLE },
  { id: "bing", host: "www.bing.com", url: "/search?q=test", body: BING, tls: true },
  { id: "duckduckgo", host: "duckduckgo.com", url: "/?q=test", body: DDG },
  // Opened from a ?q= link: every link wrapped in //duckduckgo.com/l/?uddg=…
  { id: "duckduckgo-html", host: "html.duckduckgo.com", url: "/html/?q=test", body: DDG_HTML(true) },
  // Searched from its own box: a POST to /html/, so no ?q= in the address.
  { id: "duckduckgo-html-post", host: "html.duckduckgo.com", url: "/html/", body: DDG_HTML(false) },
  { id: "brave", host: "search.brave.com", url: "/search?q=test", body: page("test - Brave Search", BRAVE_MAIN, ".title"), tls: true },
  {
    id: "swisscows", host: "swisscows.com", url: "/en/web?query=test", tls: true,
    body: page("Web pages for test - Swisscows", SWISSCOWS_STYLE + SWISSCOWS_RESULTS(SOURCES), "h1"),
  },
  { id: "yahoo", host: "search.yahoo.com", url: "/search?p=test", body: YAHOO, tls: true },
  {
    id: "brave-rerender", host: "search.brave.com", url: "/search?q=test&rr=1", body: BRAVE_RERENDER, tls: true,
    check: (r) => {
      const t = r.byTitle || {};
      eq(r.threw, undefined, `brave-rerender: page threw: ${r.threw}`);
      eq(t["Cheap Deals"], "hidden", "brave-rerender: the fresh copies are filtered");
      eq(t.Harvard, "c1", "brave-rerender: and coloured");
      eq(r.hidden, 2, "brave-rerender: two results hidden on the page");
      eq(r.notices, 1, "brave-rerender: one notice");
      eq(r.notice, "Sieve hid 2 results", "brave-rerender: each hidden result counted once, not once per copy");
    },
  },
  {
    id: "swisscows-spa", host: "swisscows.com", url: "/en", body: SWISSCOWS_SPA, tls: true,
    check: (r) => {
      const t = r.byTitle || {};
      eq(r.threw, undefined, `swisscows-spa: page threw: ${r.threw}`);
      eq(t["More Deals"], "hidden", "swisscows-spa: started on the home page, the filter still reaches the results");
      eq(t["Harvard News"], "c1", "swisscows-spa: a colour rule applies too");
      eq(t.Example, "seen", "swisscows-spa: an unmatched result is left alone");
      eq(r.marked, 3, "swisscows-spa: only the latest search's results are on the page");
      eq(r.notices, 1, "swisscows-spa: one notice");
      eq(r.notice, "Sieve hid 1 result", "swisscows-spa: the count is this search's, not the one before it as well");
    },
  },
  {
    id: "duckduckgo-images", host: "duckduckgo.com", url: "/?q=test&ia=images&iax=images",
    body: page("example at DuckDuckGo", IMAGES_GRID, "h3"), tiles: true,
  },
  {
    id: "duckduckgo-videos", host: "duckduckgo.com", url: "/?q=test&ia=videos&iax=videos",
    body: page("example at DuckDuckGo", VIDEOS_GRID, "h2"), tiles: true,
  },
  {
    // Searched first, Images clicked after: the way most people get there.
    id: "duckduckgo-tab-switch", host: "duckduckgo.com", url: "/?q=test&ia=web", body: DDG_TAB_SWITCH,
    check: (r) => {
      const t = r.byTitle || {};
      eq(r.threw, undefined, `duckduckgo-tab-switch: page threw: ${r.threw}`);
      eq(t.Harvard, "c1", "duckduckgo-tab-switch: the image grid is filtered after the switch");
      eq(t["Cheap Deals"], "hidden", "duckduckgo-tab-switch: a hide rule applies to the new tab");
      eq(t["Blocked Site"], "hidden", "duckduckgo-tab-switch: and so does the Blocked list");
      eq(t.MDN, "seen", "duckduckgo-tab-switch: an unmatched tile is left alone");
      eq(r.notices, 1, "duckduckgo-tab-switch: one notice, not one per tab");
      eq(r.noticeIn, "zci-images", "duckduckgo-tab-switch: and it is the Images tab's");
      eq(r.notice, "Sieve hid 2 results", "duckduckgo-tab-switch: counting this tab, not the web results left behind");
    },
  },
  {
    // The reported bug: the notice was near-black on DuckDuckGo's dark theme.
    id: "duckduckgo-dark", host: "duckduckgo.com", url: "/?q=test&dark=1",
    body: page("example at DuckDuckGo", DDG_DARK(false), "h2"),
    check: (r) => {
      eq(r.threw, undefined, `duckduckgo-dark: page threw: ${r.threw}`);
      eq(r.notice, "Sieve hid 2 results", "duckduckgo-dark: the notice is there");
      eq(r.noticeStyle.inline !== "", true, "duckduckgo-dark: unreadable inherited text gets a colour of its own");
      const ratio = contrast(r.noticeStyle.color, "rgb(28, 28, 28)");
      eq(ratio >= 4.5, true, `duckduckgo-dark: the notice is readable on the dark page (contrast ${ratio.toFixed(1)}:1)`);
    },
  },
  {
    id: "duckduckgo-dark-themed", host: "duckduckgo.com", url: "/?q=test&dark=2",
    body: page("example at DuckDuckGo", DDG_DARK(true), "h2"),
    check: (r) => {
      eq(r.threw, undefined, `duckduckgo-dark-themed: page threw: ${r.threw}`);
      eq(r.noticeStyle.inline, "", "duckduckgo-dark-themed: a dark page that colours its text keeps its own colour");
      eq(r.noticeStyle.color, "rgb(227, 227, 227)", "duckduckgo-dark-themed: which is the page's");
    },
  },
  {
    // "Hide the count": the same results hidden, and no line saying so — which
    // also means no Show them, the point of the setting.
    id: "duckduckgo-no-count", host: "duckduckgo.com", url: "/?q=test&nc=1",
    body: page("example at DuckDuckGo", DDG.match(/<ol class="react-results--main">[\s\S]*?<\/ol>/)[0], "h2", undefined, { searchFilterHideCount: true }),
    check: (r) => {
      const t = r.byTitle || {};
      eq(r.threw, undefined, `duckduckgo-no-count: page threw: ${r.threw}`);
      eq(t["Cheap Deals"], "hidden", "duckduckgo-no-count: results are still hidden");
      eq(t["Blocked Site"], "hidden", "duckduckgo-no-count: including the Blocked list's");
      eq(t.Harvard, "c1", "duckduckgo-no-count: colours still apply");
      eq(r.notices, 0, "duckduckgo-no-count: no count on the page");
    },
  },
  {
    // A subscribed list, as background/search-filter-subscriptions.js stores
    // one: metadata in one key, the packed sites in another. MDN's host is a
    // subdomain of the listed mozilla.org, so the index's parent lookup is what
    // catches it.
    id: "duckduckgo-subscribed-list", host: "duckduckgo.com", url: "/?q=test&sub=1",
    // A second junk.cyou result, so "By site" has a count above one to sort by.
    body: page("example at DuckDuckGo", DDG.match(/<ol class="react-results--main">[\s\S]*?<\/ol>/)[0]
      .replace("</ol>", dResult("https://junk.cyou/more", "More Deals") + "</ol>"), "h2", undefined, {
      searchFilterSubscriptions: [
        { id: "sub_1", name: "Spam list", color: 0, enabled: true, updatedAt: 1 },
        { id: "sub_2", name: "Switched off", color: 0, enabled: false, updatedAt: 1 },
      ],
      "searchFilterSub:sub_1": { hosts: "mozilla.org\nspam.example", patterns: [] },
      "searchFilterSub:sub_2": { hosts: "harvard.edu", patterns: [] },
    }),
    check: (r) => {
      const t = r.byTitle || {};
      eq(r.threw, undefined, `duckduckgo-subscribed-list: page threw: ${r.threw}`);
      eq(t.MDN, "hidden", "duckduckgo-subscribed-list: a site on the list is hidden, subdomains included");
      eq(t.Harvard, "c1", "duckduckgo-subscribed-list: a list that is switched off does nothing");
      eq(r.notice, "Sieve hid 4 results", "duckduckgo-subscribed-list: the count includes what the list hid");
      // By the result's own site, not the list entry that caught it; the
      // most-hidden site first, then by name.
      eq(r.bySite.rows.join(" | "), "junk.cyou 2 | blocked-example.com 1 | developer.mozilla.org 1",
        "duckduckgo-subscribed-list: By site counts each site and puts the most first");
      eq(r.fromSubscription.rules.join(","), "mozilla.org", "duckduckgo-subscribed-list: the popover names the entry");
      eq(r.fromSubscription.effects.join(","), "Domain · Hide · List: Spam list",
        "duckduckgo-subscribed-list: and the list it came from");
      eq(r.fromSubscription.count, "1 from a list", "duckduckgo-subscribed-list: counted apart from the user's own rules");
    },
  },
  {
    id: "duckduckgo-images-blocklist", host: "duckduckgo.com", url: "/?q=test&ia=images&iax=images&cb=1",
    body: BLOCKLIST_PAGE(IMAGES_GRID, "h3"), check: (r) => checkBlocklist("duckduckgo-images-blocklist", r),
  },
  {
    id: "duckduckgo-videos-blocklist", host: "duckduckgo.com", url: "/?q=test&ia=videos&iax=videos&cb=1",
    body: BLOCKLIST_PAGE(VIDEOS_GRID, "h2"), check: (r) => checkBlocklist("duckduckgo-videos-blocklist", r),
  },
];

// www.bing.com is in Chrome's HSTS preload list, so it refuses plain HTTP no
// matter where the hostname resolves. Serving TLS is the only way to exercise
// Bing's real engine test. The certificate is generated fresh into a temp dir
// on every run — nothing is committed, and no key outlives the process.
function selfSignedCert(dir) {
  const key = path.join(dir, "key.pem");
  const cert = path.join(dir, "cert.pem");
  try {
    execFileSync(
      "openssl",
      ["req", "-x509", "-newkey", "rsa:2048", "-keyout", key, "-out", cert,
       "-days", "1", "-nodes", "-subj", "/CN=localhost"],
      { stdio: "ignore", env: { ...process.env, MSYS_NO_PATHCONV: "1" } }
    );
    return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
  } catch (_) {
    return null; // no openssl — the Bing case is skipped below
  }
}

const certDir = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-serp-tls-"));
const tls = selfSignedCert(certDir);
const SCHEME = tls ? "https" : "http";

const handler = ((req, res) => {
  const host = String(req.headers.host || "").split(":")[0];
  // Several cases share duckduckgo.com, so the address picks the page.
  const match = CASES.find((c) => c.host === host && c.url === req.url) || CASES.find((c) => c.host === host);
  const urlPath = req.url.split("?")[0];
  // Anything under /common or /content is a real extension file; everything
  // else on a mapped host is that engine's results page.
  if (!urlPath.startsWith("/common/") && !urlPath.startsWith("/content/") && match) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(match.body);
  }
  const file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    return res.end("not found");
  }
  res.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
  res.end(fs.readFileSync(file));
});

const server = tls
  ? https.createServer({ key: tls.key, cert: tls.cert }, handler)
  : http.createServer(handler);

function run(kase, port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-serp-"));
  const map = CASES.map((c) => `MAP ${c.host} 127.0.0.1:${port}`).join(", ");
  return new Promise((resolve, reject) => {
    execFile(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        `--host-resolver-rules=${map}`,
        `--user-data-dir=${profile}`,
        "--window-size=1100,900",
        "--virtual-time-budget=20000",
        ...(tls ? ["--ignore-certificate-errors"] : []),
        "--dump-dom",
        `${SCHEME}://${kase.host}${kase.url}`,
      ],
      { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => {
        fs.rmSync(profile, { recursive: true, force: true });
        if (err) return reject(err);
        const found = /&lt;&lt;&lt;(.*?)&gt;&gt;&gt;/s.exec(stdout);
        if (!found) return reject(new Error(`${kase.id}: the page never reported results`));
        resolve(
          JSON.parse(found[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'"))
        );
      }
    );
  });
}

let checks = 0;
const eq = (actual, expected, message) => {
  assert.equal(actual, expected, message);
  checks++;
};

server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address();
  try {
    // SF_ONLY=duckduckgo-images runs one page, for working on one engine.
    const running = CASES.filter((c) => tls || !c.tls)
      .filter((c) => !process.env.SF_ONLY || c.id === process.env.SF_ONLY);
    if (!tls) {
      const skipped = CASES.filter((c) => c.tls).map((c) => c.id).join(", ");
      console.log(`search-filter-serp: NOTE — openssl not found, skipping ${skipped} (need TLS for HSTS)`);
    }
    for (const kase of running) {
      const r = await run(kase, port);
      if (kase.check) {
        kase.check(r);
        continue;
      }
      const t = r.byTitle || {};
      eq(r.threw, undefined, `${kase.id}: page threw: ${r.threw}`);

      // The same five results, the same three rules, on all three engines.
      eq(t.Harvard, "c1", `${kase.id}: .edu should take colour 1`);
      eq(t["torvalds/linux"], "c2", `${kase.id}: github.com should take colour 2`);
      eq(t["Cheap Deals"], "hidden", `${kase.id}: .cyou should be hidden`);
      eq(t["Blocked Site"], "hidden", `${kase.id}: the global Blocked list should apply here too`);
      eq(t.MDN, "seen", `${kase.id}: an unmatched result is examined and left alone`);

      eq(r.hidden, 2, `${kase.id}: exactly two results hidden`);
      eq(r.notice, "Sieve hid 2 results", `${kase.id}: the notice must match what was hidden`);

      // "Why is this here?" — the explanation popover.
      eq(r.markerOnSeen, false, `${kase.id}: an untouched result gets no marker`);
      eq(r.hasMarker, true, `${kase.id}: an affected result gets a marker`);
      eq(r.markerIsClickable, true,
        `${kase.id}: a real click must reach the marker, not the engine's overlay (topmost was ${r.hitTestTop})`);
      eq(r.markerSize.join("x"), "24x24", `${kase.id}: the marker must be big enough to hit`);
      eq(r.popOpen, true, `${kase.id}: clicking the marker opens the popover`);
      eq(r.popHost, "junk.cyou", `${kase.id}: the popover names the host`);
      eq(r.popRules.join(","), ".cyou", `${kase.id}: the popover names the rule that matched`);
      eq(r.popEffects.join(","), "Domain ending · Hide · Search Result Filter",
        `${kase.id}: it says how the rule matched, what it did, and where it came from`);
      eq(r.popUrl, "junk.cyou/spam", `${kase.id}: the panel shows the URL that was matched`);
      eq(r.popPill, "Hidden", `${kase.id}: the verdict is stated as a pill`);
      eq(r.popCount, "1 of 5", `${kase.id}: it says how many of your rules matched`);
      eq(r.popAccent, "#c0563b", `${kase.id}: a hidden result is accented in the hide colour`);
      eq(r.closedOnEscape, true, `${kase.id}: Escape closes the popover`);
      eq(r.afterShowMark, "seen", `${kase.id}: "Show on this page" un-hides the result`);
      eq(r.afterShowDisplay !== "none", true, `${kase.id}: the un-hidden result is actually visible`);
      eq(r.afterShowNotice, "Sieve hid 1 resultShow them", `${kase.id}: the count drops when one is shown`);
      eq(r.noticeStyle.inline, "", `${kase.id}: on a readable page the notice keeps the page's own colour`);

      // "By site": closed until asked for, then the hidden results by site,
      // in a list that scrolls, and that follows a result shown on the page.
      eq(r.bySiteClosed.label, "By site", `${kase.id}: the notice offers the list by site`);
      eq(r.bySiteClosed.expanded, "false", `${kase.id}: closed to begin with`);
      eq(r.bySite.expanded, "true", `${kase.id}: opened by its button`);
      eq(r.bySite.label, "Hide the list", `${kase.id}: which then offers to close it`);
      eq(r.bySite.visible, true, `${kase.id}: the list is on the page`);
      eq(r.bySite.scrolls, "auto", `${kase.id}: a long list scrolls instead of pushing the results down`);
      eq(r.bySite.rows.join(" | "), "blocked-example.com 1 | junk.cyou 1", `${kase.id}: each hidden site and its count`);
      eq(r.bySiteAfterShow.join(" | "), "blocked-example.com 1", `${kase.id}: a site shown on the page leaves the list`);

      // Two rules on one result: both are listed, and the popover says which
      // one actually decided the outcome.
      eq(r.multi.rules.join(","), ".edu,harvard.edu", `${kase.id}: every matching rule is listed`);
      eq(r.multi.applied.join(","), ".edu", `${kase.id}: the deciding rule is marked "applied"`);
      eq(r.multi.buttons.join(","), "Edit rules…", `${kase.id}: a highlighted result offers no un-hide`);

      // A rule the user never typed into this list must say where it came from.
      eq(r.fromList.effects.join(","), "Domain · Hide · Blocked sites", `${kase.id}: the global Blocked list is named as the source`);
      // The panel is tinted by the colour it is explaining.
      eq(r.multi.accent, "#2ea043", `${kase.id}: a highlighted result is accented in its own colour`);
      eq(r.multi.pill, "Colour 1", `${kase.id}: the pill names the colour that was applied`);
      eq(r.multi.count, "2 of 5", `${kase.id}: two of five rules matched this result`);

      // Non-results must never be claimed. On Google that is the wrapper around
      // every result (the bug that tinted whole pages); on Bing an answer box.
      if (kase.id === "google") {
        eq(r.probe, null, "google: a wrapper around every result must not be claimed");
        eq(r.marked, 5, "google: only the five real results are marked");
      }
      if (kase.id === "bing") {
        // Reaching c1/hidden at all proves the base64 redirector was unwrapped:
        // untouched, every Bing result reads as bing.com and nothing matches.
        eq(r.probe, null, "bing: an answer box is not an organic result");
        eq(r.noticeTag, "LI", "bing: the notice must be a valid child of <ol>");
        eq(r.noticeParentTag, "OL", "bing: the notice belongs inside #b_results");
      }
      if (kase.id === "duckduckgo") {
        // article nested in li: the innermost must win, so 6 results not 12.
        eq(r.marked, 6, "duckduckgo: nested article/li must count once each");
        eq(t.Yale, "c1", "duckduckgo: a /l/?uddg= redirect should be unwrapped");
        eq(r.colourStyle.paddingLeft, "10px", "duckduckgo: a row of text keeps its colour bar");
      }
      if (kase.id.startsWith("duckduckgo-html")) {
        // Reaching c1/hidden at all on the ?q= page proves the //…/l/?uddg=
        // links were taken: refused, nothing on the page would match.
        eq(r.marked, 5, `${kase.id}: one mark per result`);
        eq(r.noticeParentTag, "DIV", `${kase.id}: the notice sits at the top of #links`);
      }
      if (kase.id === "brave") {
        eq(r.probe, null, "brave: a snippet that is not a web result is left alone");
        eq(r.marked, 5, "brave: only the five web results are marked");
      }
      if (kase.id === "swisscows") {
        eq(r.probe, null, "swisscows: the video carousel is not a result");
        eq(r.marked, 5, "swisscows: only the five results are marked");
        eq(r.markerParent, "FOOTER", "swisscows: the marker goes in the result's footer");
        eq(r.markerCovers, "", "swisscows: and covers none of Swisscows' own buttons");
      }
      if (kase.id === "yahoo") {
        eq(r.probe, null, "yahoo: a result-shaped block outside #web is left alone");
        eq(r.marked, 5, "yahoo: only the five results are marked");
        // Yahoo's stylesheet beats the margin, not the padding. Half the pair
        // shifted every coloured result 10px to the right.
        eq(r.colourStyle.paddingLeft, "10px", "yahoo: the colour bar's padding applies");
        eq(r.colourStyle.marginLeft, "-10px", "yahoo: and so does the margin that keeps the text in place");
      }
      if (kase.tiles) checkTiles(kase.id, r);
    }
    console.log(`search-filter-serp: ${checks} checks passed across ${running.length} pages`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    fs.rmSync(certDir, { recursive: true, force: true });
  }
});

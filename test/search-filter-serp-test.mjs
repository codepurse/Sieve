// test/search-filter-serp-test.mjs
// End-to-end test for content/search-filter.js against Google-, Bing- and
// DuckDuckGo-shaped results pages. Run: node test/search-filter-serp-test.mjs
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
      local: { get: (defs) => { const o = {}; for (const k of Object.keys(defs)) o[k] = k in store ? store[k] : defs[k]; return Promise.resolve(o); } },
      onChanged: { addListener() {} }
    },
    runtime: { getURL: (p) => "/" + p }
  };`;

// Reports what the content script did, keyed by result title, plus the few
// structural facts the assertions care about.
const REPORTER = (titleSelector) => `
<pre id="RESULTS"></pre>
<script src="/common/keyword-pattern.js"></script>
<script src="/common/search-filter.js"></script>
<script src="/content/search-filter.js"></script>
<script>
(async () => {
  const out = { byTitle: {} };
  await new Promise((r) => setTimeout(r, 400));
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
      const b = visibleMarker.getBoundingClientRect();
      out.markerSize = [Math.round(b.width), Math.round(b.height)];
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      out.hitTestTop = top ? top.tagName + (top.className ? "." + String(top.className).split(" ")[0] : "") : null;
      out.markerIsClickable = !!top && (top === visibleMarker || visibleMarker.contains(top));
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
          out.afterShowNotice = (document.getElementById("sv-sf-notice") || {}).textContent || null;
        }
      }
    }
  } catch (e) { out.threw = e.message; }
  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>`;

const page = (title, body, titleSelector) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<script>${SETTINGS}</script></head><body>${body}${REPORTER(titleSelector)}</body></html>`;

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

const CASES = [
  { id: "google", host: "www.google.com", url: "/search?q=test", body: GOOGLE },
  { id: "bing", host: "www.bing.com", url: "/search?q=test", body: BING },
  { id: "duckduckgo", host: "duckduckgo.com", url: "/?q=test", body: DDG },
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
  const match = CASES.find((c) => c.host === host);
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
    const running = tls ? CASES : CASES.filter((c) => c.id !== "bing");
    if (!tls) console.log("search-filter-serp: NOTE — openssl not found, skipping Bing (needs TLS for HSTS)");
    for (const kase of running) {
      const r = await run(kase, port);
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
      eq(r.popAccent, "#e05252", `${kase.id}: a hidden result is accented in the hide colour`);
      eq(r.closedOnEscape, true, `${kase.id}: Escape closes the popover`);
      eq(r.afterShowMark, "seen", `${kase.id}: "Show on this page" un-hides the result`);
      eq(r.afterShowDisplay !== "none", true, `${kase.id}: the un-hidden result is actually visible`);
      eq(r.afterShowNotice, "Sieve hid 1 resultShow them", `${kase.id}: the count drops when one is shown`);

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
      }
    }
    console.log(`search-filter-serp: ${checks} checks passed across ${running.length} engines`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    fs.rmSync(certDir, { recursive: true, force: true });
  }
});

// test/social-proof-test.mjs
// Sieve — fake popularity (content/patterns/social-proof.js), end to end in
// real headless Chrome.
//
//   node --test test/
//
// The pop-up is found by its SHAPE — a small box pinned to the screen saying
// someone just bought something — so this needs a real layout engine:
// getComputedStyle and getBoundingClientRect are the whole decision. Two
// widgets are played, the two ways they are actually built:
//
//   #widget-a  rebuilt with innerHTML every few seconds, and then thrown away
//              and replaced by a brand-new box
//   #widget-b  an empty box filled later with box.textContent = "…" — a bare
//              text node, which the coordinator's observer used to ignore
//
// and two things that must be left alone, because each says something
// close: a review in the page ("I bought this 2 hours ago") and a support
// chat pinned to the corner ("Anna joined the conversation 2 minutes ago").
//
// The "23 people are viewing this" count arrives with a history (the page
// plays the service worker and replays a visit an hour earlier), so it is
// caught as frozen. A second page has the same count and no history.
//
// Requires Chrome installed; skips if not found.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => fs.existsSync(p));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const DETECTOR_FILES = manifest.content_scripts.find((cs) => cs.js.includes("content/dark-patterns.js")).js;

function fakeChrome(replayHistory) {
  return `
  const store = { darkPatternsEnabled: true, tellsStrictness: "balanced" };
  window.__messageListeners = [];
  const ledger = {};
  const replayed = new Set();
  function observe(claim) {
    const L = window.SieveClaimLedger;
    const page = { host: location.hostname, path: location.pathname };
    if (${replayHistory} && !replayed.has(claim.sig)) {
      replayed.add(claim.sig);
      L.observe(ledger, claim, page, Date.now() - 3600000); // the same claim, an hour ago
    }
    return L.observe(ledger, claim, page, Date.now());
  }
  window.chrome = {
    storage: {
      local: {
        get: (defs) => { const o = {}; for (const k of Object.keys(defs)) o[k] = k in store ? store[k] : defs[k]; return Promise.resolve(o); },
        set: (o) => { Object.assign(store, o); return Promise.resolve(); }
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      getURL: (p) => "/" + p,
      sendMessage: (msg) => {
        if (msg.type === "sieve:claim-observe") return Promise.resolve(observe(msg.claim));
        if (msg.type === "sieve:tells-ui") return new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = msg.part === "trials" ? "/content/trial-terms.js" : "/content/tells-ui.js";
          s.onload = () => resolve({ ok: true });
          document.head.appendChild(s);
        });
        return Promise.resolve(null);
      },
      onMessage: { addListener: (fn) => window.__messageListeners.push(fn) }
    }
  };
  window.__ask = (message) => new Promise((resolve) => {
    for (const fn of window.__messageListeners) {
      let answered = false;
      const keep = fn(message, {}, (value) => { answered = true; resolve(value); });
      if (answered || keep === true) return;
    }
    resolve(undefined);
  });`;
}

const SHOP = `<!doctype html><meta charset="utf-8"><title>Shop</title><body>
<script src="/common/claim-ledger.js"></script>
<script>${fakeChrome(true)}</script>
<h1>Brushed steel kettle</h1>
<p id="viewers">23 people are viewing this right now</p>
<section id="reviews"><h2>Reviews</h2><p id="review">I bought this 2 hours ago and it boils fast.</p></section>
<div id="chat" style="position:fixed;right:16px;bottom:16px;width:260px;padding:8px;background:#eee">Anna joined the conversation 2 minutes ago</div>
<div id="widget-b" style="position:fixed;left:16px;top:16px;width:280px;padding:8px;background:#fff"></div>
<pre id="RESULTS"></pre>
<script>
  // Widget A: a box rebuilt with innerHTML, then replaced by a new box.
  const people = [["Sarah", "Ohio", 12], ["Tom", "Leeds", 4], ["Mia", "Perth", 27]];
  let i = 0;
  function makeBox() {
    const box = document.createElement("div");
    box.className = "fomo-toast";
    box.style.cssText = "position:fixed;left:16px;bottom:16px;width:300px;padding:10px;background:#fff;border:1px solid #ccc";
    document.body.appendChild(box);
    return box;
  }
  let box = null;
  setTimeout(() => {
    box = makeBox();
    const tick = () => {
      const [name, place, mins] = people[i++ % people.length];
      box.innerHTML = "<b>" + name + " from " + place + "</b> purchased <i>Brushed steel kettle</i><br><small>" + mins + " minutes ago</small>";
    };
    tick();
    setInterval(tick, 1500);
    // Later the widget throws its box away and starts a new one.
    setTimeout(() => { box.remove(); box = makeBox(); tick(); }, 3200);
  }, 400);
  // Widget B: text set straight onto an existing box.
  setTimeout(() => { document.getElementById("widget-b").textContent = "Someone in Bristol just bought a kettle"; }, 900);
</script>
<script src="/__detectors.js"></script>
<script>
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(5000);
  const hidden = (el) => !!el && getComputedStyle(el).display === "none";
  const out = {};
  out.toastsHidden = [...document.querySelectorAll(".fomo-toast")].map(hidden);
  out.widgetB = hidden(document.getElementById("widget-b"));
  out.chat = hidden(document.getElementById("chat"));
  out.review = hidden(document.getElementById("review"));
  out.viewersDimmed = document.getElementById("viewers").style.opacity === "0.55";
  out.report = await window.__ask({ type: "sieve:tells-list" });
  const popups = out.report.tells.find((t) => t.title === "Fake “just bought” pop-ups");
  if (popups) {
    await window.__ask({ type: "sieve:tells-undo", id: popups.id });
    out.afterUndo = { toasts: [...document.querySelectorAll(".fomo-toast")].map(hidden), widgetB: hidden(document.getElementById("widget-b")) };
  }
  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>
</body>`;

const FRESH = `<!doctype html><meta charset="utf-8"><title>Hotel</title><body>
<script src="/common/claim-ledger.js"></script>
<script>${fakeChrome(false)}</script>
<h1>Seaview Hotel</h1>
<p id="viewers">12 other people are looking at this hotel</p>
<pre id="RESULTS"></pre>
<script src="/__detectors.js"></script>
<script>
(async () => {
  await new Promise((r) => setTimeout(r, 2000));
  const out = {};
  out.report = await window.__ask({ type: "sieve:tells-list" });
  out.stamped = !!document.querySelector('#viewers sieve-tell[data-sieve-dp="label"]');
  out.dimmed = document.getElementById("viewers").style.opacity === "0.55";
  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>
</body>`;

const PAGES = { "/shop": SHOP, "/hotel": FRESH };

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (PAGES[url]) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(PAGES[url]);
    }
    if (url === "/__detectors.js") {
      const bundle = DETECTOR_FILES.map((f) => `\n/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      return res.end(bundle);
    }
    const file = path.join(ROOT, url.replace(/^\/+/, ""));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function render(port, pagePath) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-social-"));
  return new Promise((resolve, reject) => {
    execFile(
      CHROME,
      ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${profile}`, "--window-size=1100,900",
        "--virtual-time-budget=20000", "--dump-dom", `http://127.0.0.1:${port}${pagePath}`],
      { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => {
        fs.rmSync(profile, { recursive: true, force: true });
        if (err) return reject(err);
        const found = /&lt;&lt;&lt;(.*?)&gt;&gt;&gt;/s.exec(stdout);
        if (!found) return reject(new Error(`${pagePath} never reported results`));
        resolve(JSON.parse(found[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")));
      }
    );
  });
}

let reports = null;
async function results() {
  if (reports) return reports;
  const server = await startServer();
  try {
    reports = {};
    for (const p of Object.keys(PAGES)) reports[p] = await render(server.address().port, p);
  } finally {
    server.close();
  }
  if (process.env.SIEVE_DP_DEBUG) console.log(JSON.stringify(reports, null, 1));
  return reports;
}

const skip = !CHROME && "Chrome not found";

test("a 'just bought' pop-up is hidden, and the box that replaces it too", { skip }, async () => {
  const r = (await results())["/shop"];
  assert.ok(r.toastsHidden.length >= 1, "the widget's box is on the page");
  assert.ok(r.toastsHidden.every(Boolean), `every pop-up box hidden: ${JSON.stringify(r.toastsHidden)}`);
});

test("a pop-up filled with textContent is caught too", { skip }, async () => {
  const r = (await results())["/shop"];
  assert.equal(r.widgetB, true);
});

test("one finding for all of a page's pop-ups", { skip }, async () => {
  const r = (await results())["/shop"];
  const found = r.report.tells.filter((t) => t.title === "Fake “just bought” pop-ups");
  assert.equal(found.length, 1);
  assert.equal(found[0].level, 2);
  assert.equal(found[0].done, "Hidden");
});

test("a pinned support chat and a review in the page are left alone", { skip }, async () => {
  const r = (await results())["/shop"];
  assert.equal(r.chat, false, "'Anna joined the conversation 2 minutes ago' was hidden");
  assert.equal(r.review, false, "'I bought this 2 hours ago' in a review was hidden");
});

test("Undo shows every pop-up box again", { skip }, async () => {
  const r = (await results())["/shop"];
  assert.ok(r.afterUndo.toasts.every((h) => h === false));
  assert.equal(r.afterUndo.widgetB, false);
});

test("a viewer count that said the same an hour ago is dimmed, with why", { skip }, async () => {
  const r = (await results())["/shop"];
  assert.equal(r.viewersDimmed, true);
  const t = r.report.tells.find((x) => x.type === "socialProof" && x.title.startsWith("A “people viewing” count that never moves"));
  assert.ok(t);
  assert.match(t.detail, /It said 23 every time you looked/);
});

test("a viewer count with no history is only labelled", { skip }, async () => {
  const r = (await results())["/hotel"];
  const t = r.report.tells.find((x) => x.type === "socialProof");
  assert.equal(t.confidence, "low");
  assert.equal(t.level, 1);
  assert.equal(r.stamped, true);
  assert.equal(r.dimmed, false);
});

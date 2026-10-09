// test/tells-receipt-test.mjs
// Sieve — end-to-end tests for "tells": the Claim Ledger's verdicts reaching
// the page, the intervention ladder acting on them, and the report the toolbar
// popup reads.
//
//   node --test test/
//
// One page, in real headless Chrome, carrying one of each finding — a
// countdown, a stock number, a sale that "ends tonight", a guilt-trip button
// and a pre-ticked opt-in — with the real detector files loaded the way the
// manifest injects them. The service worker is played by the page: its
// sendMessage runs the real common/claim-ledger.js, after first replaying a
// visit from earlier, so each claim arrives with a history:
//
//   the countdown       5 minutes later on an earlier visit -> it restarted
//   the stock number    the same number yesterday           -> unchanged
//   "ends tonight"      the same words yesterday            -> came back
//
// Then the page drives the popup's messages (list, undo, redo) and the
// strictness setting, and reports what is on the page after each step.
//
// Real Chrome rather than a fake DOM because the ladder's cover decides with
// getComputedStyle and draws in a shadow root, and the timer detector needs a
// clock that actually ticks. Requires Chrome installed; skips if not found.

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

// The manifest's content_scripts entry for the Dark Pattern Blocker, in order.
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const DETECTOR_FILES = manifest.content_scripts.find((cs) => cs.js.includes("content/dark-patterns.js")).js;

const FAKE_CHROME = `
  const store = {
    darkPatternsEnabled: true,
    darkPatternTimersEnabled: true,
    darkPatternGuiltCopyEnabled: true,
    darkPatternCheckboxesEnabled: true,
    darkPatternCookiesEnabled: true,
    darkPatternScarcityEnabled: true,
    tellsStrictness: "balanced"
  };
  const changeListeners = [];
  window.__messageListeners = [];
  window.__badge = [];

  // The service worker, played here: the real ledger rules, with a visit from
  // earlier replayed before each claim's first sighting.
  const ledger = {};
  const replayed = new Set();
  const MIN = 60000, DAY = 86400000;
  function observe(claim) {
    const L = window.SieveClaimLedger;
    const page = { host: location.hostname, path: location.pathname };
    const now = Date.now();
    const key = claim.kind + "|" + claim.sig;
    if (!replayed.has(key)) {
      replayed.add(key);
      if (claim.kind === "timer") L.observe(ledger, { ...claim, deadline: claim.deadline - 5 * MIN }, page, now - 3 * MIN);
      if (claim.kind === "stock") L.observe(ledger, claim, page, now - DAY);
      if (claim.kind === "deadline") L.observe(ledger, claim, page, now - DAY);
    }
    return L.observe(ledger, claim, page, now);
  }

  window.chrome = {
    storage: {
      local: {
        get: (defs) => { const o = {}; for (const k of Object.keys(defs)) o[k] = k in store ? store[k] : defs[k]; return Promise.resolve(o); },
        set: (o) => { Object.assign(store, o); return Promise.resolve(); }
      },
      onChanged: { addListener: (fn) => changeListeners.push(fn) }
    },
    runtime: {
      getURL: (p) => "/" + p,
      sendMessage: (msg) => {
        if (msg && msg.type === "sieve:claim-observe") return Promise.resolve(observe(msg.claim));
        if (msg && msg.type === "sieve:tells-count") window.__badge.push(msg.count);
        // What chrome.scripting.executeScript does for the real service worker.
        if (msg && msg.type === "sieve:tells-ui") {
          window.__uiRequests = (window.__uiRequests || 0) + 1;
          return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = msg.part === "trials" ? "/content/trial-terms.js" : "/content/tells-ui.js";
            script.onload = () => resolve({ ok: true });
            script.onerror = () => resolve({ ok: false });
            document.head.appendChild(script);
          });
        }
        return Promise.resolve({});
      },
      onMessage: { addListener: (fn) => window.__messageListeners.push(fn) }
    }
  };

  // What the popup does: one message to the content script, one answer back.
  window.__ask = (message) => new Promise((resolve) => {
    for (const fn of window.__messageListeners) {
      let answered = false;
      const keep = fn(message, {}, (value) => { answered = true; resolve(value); });
      if (answered || keep === true) return;
    }
    resolve(undefined);
  });

  // What the settings page does: write the key, and every listener hears it.
  window.__setStrictness = (value) => {
    const oldValue = store.tellsStrictness;
    store.tellsStrictness = value;
    for (const fn of changeListeners) fn({ tellsStrictness: { oldValue, newValue: value } }, "local");
  };`;

const PAGE = `<!doctype html><meta charset="utf-8"><title>Kettle</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Kettle"}</script>
<body>
<script src="/common/claim-ledger.js"></script>
<script>${FAKE_CHROME}</script>

<div id="sale">Summer sale ends tonight!</div>
<h1>Kettle</h1>
<div id="countdown">Hurry, offer ends in 14:59</div>
<div id="placeholder">Flash deal ends in 00:00</div>
<p id="stock">Only 3 left in stock - order soon</p>
<button id="guilt">No thanks, I don't want to save money</button>
<label id="optin"><input type="checkbox" id="optin-box" checked /> Send me marketing emails and special offers</label>
<button>Add to cart</button>

<pre id="RESULTS"></pre>
<script>
  // A countdown that really counts down, the way the page's own script would.
  let left = 14 * 60 + 59;
  setInterval(() => {
    left -= 1;
    const m = Math.floor(left / 60), s = left % 60;
    document.getElementById("countdown").textContent = "Hurry, offer ends in " + m + ":" + String(s).padStart(2, "0");
  }, 1000);
  // A widget that ships "00:00" in its HTML and only starts counting once its
  // script has run — the first time Sieve reads it is a placeholder.
  let deal = 9 * 60 + 59;
  setTimeout(() => setInterval(() => {
    deal -= 1;
    document.getElementById("placeholder").textContent = "Flash deal ends in " + Math.floor(deal / 60) + ":" + String(deal % 60).padStart(2, "0");
  }, 1000), 1200);
</script>
<script src="/__detectors.js"></script>
<script>
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (id) => document.getElementById(id);
  const covered = (el) => {
    const prev = el.previousElementSibling;
    return getComputedStyle(el).display === "none" && !!prev && prev.localName === "sieve-tell" && prev.getAttribute("data-sieve-dp") === "cover";
  };
  const stamped = (el) => !!el.querySelector('sieve-tell[data-sieve-dp="label"]') ||
    (el.nextElementSibling && el.nextElementSibling.getAttribute("data-sieve-dp") === "label");
  const snapshot = () => ({
    countdown: { covered: covered($("countdown")), hidden: getComputedStyle($("countdown")).display === "none" },
    placeholder: { covered: covered($("placeholder")) },
    stock: { covered: covered($("stock")), dimmed: $("stock").style.opacity === "0.55", stamped: stamped($("stock")) },
    sale: { covered: covered($("sale")), dimmed: $("sale").style.opacity === "0.55", stamped: stamped($("sale")) },
    guilt: { text: $("guilt").textContent.trim(), stamped: stamped($("guilt")) },
    optin: { badged: !!$("optin-box").dataset.sieveCheckboxBadge },
  });

  const out = {};
  // A countdown is judged after a 2-second sample (two of them, for the one
  // that starts as a placeholder); the rest gather briefly.
  await wait(7000);
  out.balanced = snapshot();
  out.report = await window.__ask({ type: "sieve:tells-list" });
  out.badge = window.__badge.slice();
  out.uiRequestsAfterLoad = window.__uiRequests || 0;

  const countdownTell = out.report.tells.find((t) => t.type === "timers" && t.level === 3 && t.title === "Fake countdown");
  if (countdownTell) {
    const afterUndo = await window.__ask({ type: "sieve:tells-undo", id: countdownTell.id });
    out.undo = { snapshot: snapshot(), item: afterUndo.tells.find((t) => t.id === countdownTell.id) };
    await window.__ask({ type: "sieve:tells-redo", id: countdownTell.id });
    out.redo = snapshot();
  }

  window.__setStrictness("gentle");
  await wait(300);
  out.gentle = snapshot();
  out.gentleReport = await window.__ask({ type: "sieve:tells-list" });

  window.__setStrictness("firm");
  await wait(300);
  out.firm = snapshot();
  out.uiRequests = window.__uiRequests || 0;

  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>
</body>`;

// --- harness (the same shape as test/dark-patterns-detectors-test.mjs) -------

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(PAGE);
    }
    // The detector files as ONE script, as they are injected — see the note in
    // test/dark-patterns-detectors-test.mjs.
    if (url === "/__detectors.js") {
      const bundle = DETECTOR_FILES.map(
        (f) => `\n/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(ROOT, f), "utf8")
      ).join("\n");
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

function render(port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-tells-"));
  return new Promise((resolve, reject) => {
    execFile(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        `--user-data-dir=${profile}`,
        "--window-size=1100,900",
        "--virtual-time-budget=30000",
        "--dump-dom",
        `http://127.0.0.1:${port}/`,
      ],
      { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => {
        fs.rmSync(profile, { recursive: true, force: true });
        if (err) return reject(err);
        const found = /&lt;&lt;&lt;(.*?)&gt;&gt;&gt;/s.exec(stdout);
        if (!found) return reject(new Error("the page never reported results"));
        resolve(
          JSON.parse(
            found[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          )
        );
      }
    );
  });
}

let report = null;
async function results() {
  if (report) return report;
  const server = await startServer();
  try {
    report = await render(server.address().port);
  } finally {
    server.close();
  }
  if (process.env.SIEVE_DP_DEBUG) console.log(JSON.stringify(report, null, 1));
  return report;
}

const skip = !CHROME && "Chrome not found";
const byTitle = (r, title) => r.report.tells.find((t) => t.title === title);

// --- Balanced, the default ------------------------------------------------------

test("a countdown the ledger caught restarting is covered, with the evidence", { skip }, async () => {
  const r = await results();
  assert.equal(r.balanced.countdown.covered, true);
  const t = byTitle(r, "Fake countdown");
  assert.ok(t, "the report lists it as a fake countdown");
  assert.equal(t.confidence, "high");
  assert.equal(t.level, 3);
  assert.equal(t.done, "Covered");
  assert.match(t.detail, /restarted when you came back/);
});

// It used to read "00:00", then 9:58, see the time go UP, decide this was not
// a countdown, and never look again.
test("a countdown that starts as a placeholder is still judged", { skip }, async () => {
  const r = await results();
  assert.equal(r.balanced.placeholder.covered, true);
  assert.equal(r.report.tells.filter((t) => t.title === "Fake countdown").length, 2);
});

test("a stock number that hasn't moved is dimmed, not covered", { skip }, async () => {
  const r = await results();
  // "Unchanged" is not proof the number is false — only that there is no rush.
  assert.deepEqual([r.balanced.stock.dimmed, r.balanced.stock.covered], [true, false]);
  const t = byTitle(r, "A stock number that never moves");
  assert.equal(t.level, 2);
  assert.equal(t.done, "Dimmed");
});

test("a sale that 'ends tonight' two days running is covered", { skip }, async () => {
  const r = await results();
  assert.equal(r.balanced.sale.covered, true);
  const t = byTitle(r, "A deadline that keeps coming back");
  assert.match(t.detail, /said the same thing yesterday too/);
});

test("the existing detectors keep their default behaviour on the ladder", { skip }, async () => {
  const r = await results();
  assert.equal(r.balanced.guilt.text, "No thanks", "the guilt trip is reworded");
  assert.equal(r.balanced.optin.badged, true, "the opt-in is flagged");
  assert.equal(byTitle(r, "A box ticked for you").level, 1, "and never more than flagged");
});

// The stamps and covers are drawn by content/tells-ui.js, which is not a
// content script: it is fetched the first time a page needs it, and once.
test("the drawing code is fetched once, by the first finding that needs it", { skip }, async () => {
  const r = await results();
  assert.equal(r.uiRequestsAfterLoad, 1);
  assert.equal(r.uiRequests, 1, "Undo, Redo and two changes of setting fetched nothing more");
});

test("the badge counts the tricks on the page", { skip }, async () => {
  const r = await results();
  const tricks = r.report.tells.filter((t) => t.trick);
  assert.equal(tricks.length, 6);
  assert.equal(r.badge[r.badge.length - 1], 6);
});

// --- the popup's Undo / Redo -------------------------------------------------------

test("Undo puts the page back, and Redo covers it again", { skip }, async () => {
  const r = await results();
  assert.ok(r.undo, "the countdown was found, so it could be undone");
  assert.equal(r.undo.snapshot.countdown.covered, false);
  assert.equal(r.undo.snapshot.countdown.hidden, false);
  assert.equal(r.undo.item.undone, true);
  assert.equal(r.undo.item.done, "Put back");
  assert.equal(r.redo.countdown.covered, true);
});

// --- strictness -------------------------------------------------------------

test("Gentle labels everything and changes nothing", { skip }, async () => {
  const r = await results();
  const g = r.gentle;
  assert.equal(g.countdown.covered || g.countdown.hidden, false, "the countdown is back");
  assert.deepEqual([g.sale.covered, g.sale.dimmed, g.sale.stamped], [false, false, true]);
  assert.deepEqual([g.stock.dimmed, g.stock.stamped], [false, true]);
  assert.equal(g.guilt.text, "No thanks, I don't want to save money", "the button's own words are back");
  assert.equal(g.guilt.stamped, true);
  assert.ok(r.gentleReport.tells.filter((t) => t.trick).every((t) => t.level === 1));
});

test("Firm covers what is likely, but never a control", { skip }, async () => {
  const r = await results();
  assert.equal(r.firm.stock.covered, true, "a likely stock trick is covered at Firm");
  assert.equal(r.firm.guilt.text, "No thanks", "a button is reworded, never covered");
  assert.equal(r.firm.optin.badged, true);
});

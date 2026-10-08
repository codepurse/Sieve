// test/trial-test.mjs
// Sieve — the free-trial warning end to end, in real headless Chrome: the
// detector reading a signup page, the note it draws beside the offer, the
// "Remind me" button reaching the service worker, and a reminder that has
// fallen due appearing at the top of a page.
//
//   node --test test/
//
// Three pages, each run with the real detector files loaded the way the
// manifest injects them, and the service worker played by the page:
//
//   /signup   a 7-day trial, "then $14.99/month", and a card field — the case
//             this exists for — and a reminder from another site that is due
//   /nocard   the same offer, but "No credit card required": it just ends
//   /article  a blog post that mentions a free trial and has nowhere to pay
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

const DAY = 86400000;

function fakeChrome(reminderDue) {
  return `
  const store = { darkPatternsEnabled: true, tellsStrictness: "balanced", trialRemindersNext: ${reminderDue ? 1 : 0} };
  window.__messageListeners = [];
  window.__sent = [];
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
        window.__sent.push(msg);
        if (msg.type === "sieve:tells-ui") return new Promise((resolve) => {
          const s = document.createElement("script");
          s.src = msg.part === "trials" ? "/content/trial-terms.js" : "/content/tells-ui.js";
          s.onload = () => resolve({ ok: true });
          document.head.appendChild(s);
        });
        if (msg.type === "sieve:trial-remind") return Promise.resolve({ ok: true });
        if (msg.type === "sieve:trial-due") return Promise.resolve([
          { id: "r1", host: "music.example", ends: Date.now() + 2 * ${DAY}, remindAt: Date.now() - 1000, terms: "$9.99 a month" }
        ]);
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

const REPORTER = `
<pre id="RESULTS"></pre>
<script src="/__detectors.js"></script>
<script>
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1500);
  const out = {};
  out.report = await window.__ask({ type: "sieve:tells-list" });
  out.notes = document.querySelectorAll('sieve-tell[data-sieve-dp="note"]').length;
  out.banner = !!document.querySelector('sieve-tell[data-sieve-dp="banner"]');
  const trial = out.report.tells.find((t) => t.type === "trials");
  if (trial && trial.actions.length) {
    const after = await window.__ask({ type: "sieve:tells-action", id: trial.id, action: trial.actions[0].id });
    out.afterAction = after.tells.find((t) => t.id === trial.id);
    out.notesAfter = document.querySelectorAll('sieve-tell[data-sieve-dp="note"]').length;
  }
  out.remind = window.__sent.filter((m) => m.type === "sieve:trial-remind");
  out.dueAsked = window.__sent.some((m) => m.type === "sieve:trial-due");
  out.now = Date.now();
  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>`;

const PAGES = {
  "/signup": `<!doctype html><meta charset="utf-8"><title>StreamCo</title><body>
<script>${fakeChrome(true)}</script>
<header><a href="/">StreamCo</a> <a href="/help">Help</a></header>
<main>
  <section id="offer">
    <h1>Start your 7-day free trial</h1>
    <p>Then $14.99/month. Cancel anytime.</p>
  </section>
  <form><label>Card number <input name="cardnumber" autocomplete="cc-number"></label>
  <button type="submit">Start free trial</button></form>
</main>
${REPORTER}</body>`,

  "/nocard": `<!doctype html><meta charset="utf-8"><title>AppCo</title><body>
<script>${fakeChrome(false)}</script>
<section><h1>14-day free trial</h1><p>Then $9.99/month. No credit card required.</p>
<button>Start free trial</button></section>
${REPORTER}</body>`,

  "/article": `<!doctype html><meta charset="utf-8"><title>Blog</title><body>
<script>${fakeChrome(false)}</script>
<article><h1>Is the 30-day free trial worth it?</h1>
<p>We tried the service for a month. The free trial gives you everything in the paid plan, and our reviewer found it generous.</p></article>
${REPORTER}</body>`,

  // Quotes the terms word for word — "then $9.99/month", "cancel anytime" —
  // but there is nothing here to sign up to.
  "/review": `<!doctype html><meta charset="utf-8"><title>Review</title><body>
<script>${fakeChrome(false)}</script>
<article><h1>StreamCo review</h1>
<p>You get a 30-day free trial, then $9.99/month. You can cancel anytime from your account page.</p>
<p><a href="/next">Next review</a></p></article>
${REPORTER}</body>`,

  // The same terms with a sign-up button and no card field on this page (the
  // card comes on the next step): renewal wording plus a way in is enough.
  "/plans": `<!doctype html><meta charset="utf-8"><title>Plans</title><body>
<script>${fakeChrome(false)}</script>
<section><h2>Premium</h2><p>1 month free, then $11.99/month. Cancel anytime.</p>
<button>Try it free</button></section>
${REPORTER}</body>`,
};

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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-trial-"));
  return new Promise((resolve, reject) => {
    execFile(
      CHROME,
      ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${profile}`, "--window-size=1100,900",
        "--virtual-time-budget=15000", "--dump-dom", `http://127.0.0.1:${port}${pagePath}`],
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
    const port = server.address().port;
    reports = {};
    for (const p of Object.keys(PAGES)) reports[p] = await render(port, p);
  } finally {
    server.close();
  }
  if (process.env.SIEVE_DP_DEBUG) console.log(JSON.stringify(reports, null, 1));
  return reports;
}

const skip = !CHROME && "Chrome not found";

test("a trial that charges by itself is explained beside the offer", { skip }, async () => {
  const r = (await results())["/signup"];
  const t = r.report.tells.find((x) => x.type === "trials");
  assert.ok(t, "the signup page has a free-trial finding");
  assert.equal(t.level, 2);
  assert.equal(t.done, "Explained");
  assert.match(t.detail, /After 7 days, this becomes \$14\.99 a month\./);
  assert.match(t.detail, /first payment is due/);
  assert.equal(r.notes, 1, "one note on the page, beside the offer");
});

test("'Remind me' reaches the service worker with the trial's dates", { skip }, async () => {
  const r = (await results())["/signup"];
  assert.equal(r.remind.length, 1);
  const m = r.remind[0];
  const days = (m.ends - r.now) / DAY;
  assert.ok(days > 6.9 && days < 7.1, `the trial ends in ${days.toFixed(2)} days`);
  assert.ok(m.ends - m.remindAt >= DAY && m.remindAt < m.ends, "reminded before it ends");
  assert.equal(m.terms, "$14.99 a month");
});

test("after 'Remind me', the button says so, in the popup and on the page", { skip }, async () => {
  const r = (await results())["/signup"];
  assert.match(r.afterAction.actions[0].label, /^Reminder set for /);
  assert.equal(r.afterAction.actions[0].disabled, true);
  assert.equal(r.notesAfter, 1, "the note was redrawn, not duplicated");
});

test("a reminder that has fallen due appears at the top of the page", { skip }, async () => {
  const r = (await results())["/signup"];
  assert.equal(r.dueAsked, true);
  assert.equal(r.banner, true);
});

test("with nothing due, a page does not even ask", { skip }, async () => {
  const r = (await results())["/article"];
  assert.equal(r.dueAsked, false);
  assert.equal(r.banner, false);
});

test("a trial that needs no card is left alone", { skip }, async () => {
  const r = (await results())["/nocard"];
  assert.equal(r.report.tells.filter((t) => t.type === "trials").length, 0);
  assert.equal(r.notes, 0);
});

test("a blog post about a trial, with nowhere to pay, is left alone", { skip }, async () => {
  const r = (await results())["/article"];
  assert.equal(r.report.tells.filter((t) => t.type === "trials").length, 0);
});

test("a review quoting the terms, with nothing to sign up to, is left alone", { skip }, async () => {
  const r = (await results())["/review"];
  assert.equal(r.report.tells.filter((t) => t.type === "trials").length, 0);
});

test("a plans page with a sign-up button and renewal terms is explained", { skip }, async () => {
  const r = (await results())["/plans"];
  const t = r.report.tells.find((x) => x.type === "trials");
  assert.ok(t);
  assert.match(t.detail, /After 1 month, this becomes \$11\.99 a month\./);
});

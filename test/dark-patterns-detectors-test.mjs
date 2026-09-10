// test/dark-patterns-detectors-test.mjs
// Sieve — tests for the three dark-pattern detectors that CHANGE THE PAGE:
// content/patterns/guilt-copy.js, checkboxes.js and cookies.js.
//
//   node --test test/
//
// These three had no coverage at all, which is the wrong way round: they are
// the detectors that rewrite a button's words, stick a badge on a form control,
// and restyle someone's consent dialog. A missed dark pattern is invisible and
// costs nothing. A FALSE POSITIVE edits a page that was doing nothing wrong,
// and is equally invisible — nobody reports "this button says the right thing".
// So most of what is pinned here is the negative case.
//
// Run in real headless Chrome, not against a hand-built DOM, for the same
// reason test/search-filter-serp-test.mjs is: cookies.js decides using
// getComputedStyle and getBoundingClientRect, and a fake would have to invent
// both. The two text-only detectors are exercised through the same page so
// they run against the same real DOM their production code sees.
//
// Requires Chrome installed. Skips with a message if it isn't found.

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

// The order the manifest lists them in. The coordinator must come first; it is
// what the five detectors register against.
const DETECTOR_FILES = [
  "content/dark-patterns.js",
  "content/patterns/timers.js",
  "content/patterns/guilt-copy.js",
  "content/patterns/checkboxes.js",
  "content/patterns/cookies.js",
  "content/patterns/scarcity.js",
];

// --- the page under test ----------------------------------------------------

// Every detector on, so one page run reports all three.
const SETTINGS = `
  const store = {
    darkPatternsEnabled: true,
    darkPatternTimersEnabled: true,
    darkPatternGuiltCopyEnabled: true,
    darkPatternCheckboxesEnabled: true,
    darkPatternCookiesEnabled: true,
    darkPatternScarcityEnabled: true,
    sieveScarcitySamples: {}
  };
  window.chrome = {
    storage: {
      local: {
        get: (defs) => { const o = {}; for (const k of Object.keys(defs)) o[k] = k in store ? store[k] : defs[k]; return Promise.resolve(o); },
        set: (o) => { Object.assign(store, o); return Promise.resolve(); }
      },
      onChanged: { addListener() {} }
    },
    runtime: { getURL: (p) => "/" + p, sendMessage: () => Promise.resolve({}), onMessage: { addListener() {} } }
  };`;

// A button carries data-case; the reporter says whether Sieve rewrote it.
function button(id, label) {
  return `<button data-case="${id}">${label}</button>`;
}

// A checkbox, checked, inside a label, inside a container with its own text.
function checkbox(id, labelText, surrounding) {
  return `<div class="row">${surrounding ? `<p>${surrounding}</p>` : ""}
    <label data-case="${id}"><input type="checkbox" data-cb="${id}" checked /> ${labelText}</label>
  </div>`;
}

const PAGE = `<!doctype html><meta charset="utf-8"><body>
<script>${SETTINGS}</script>

<!-- ============ guilt-copy ============ -->
<!-- Genuine guilt trips: negative framing plus the good thing being refused. -->
${button("guilt-savings", "No thanks, I don't want to save money")}
${button("guilt-discount", "I would rather not get my discount today")}

<!-- Ordinary buttons that must be LEFT ALONE. Each contains a word that a
     substring match would mistake for negative framing or a reward. -->
${button("ok-know", "Know more about our free trial")}
${button("ok-economy", "Economy or premium - pick your upgrade")}
${button("ok-ignore", "Ignore this and claim your reward later")}
${button("ok-nothing", "Nothing here, browse the offers instead")}
${button("ok-plain", "No thanks")}
${button("ok-checkout", "Continue to checkout")}
${button("ok-password", "Reset the password for member accounts")}

<!-- ============ checkboxes ============ -->
${checkbox("cb-marketing", "Yes, send me marketing emails and special offers")}
${checkbox("cb-newsletter", "Subscribe to our newsletter")}
<!-- Must be LEFT ALONE: consent to terms is not marketing, and the words
     around it are ordinary page furniture. -->
${checkbox("cb-terms", "I have read and accept the terms of service")}
${checkbox("cb-context", "Remember this device", "Read the help article in context for more detail")}

<!-- ============ cookies ============ -->
<!-- A manipulative banner: Accept is prominent, Reject is shrunk to a sliver.
     "Cookie settings" sits FIRST, which is where a substring match for "ok"
     goes wrong -- the word "cookie" contains it. -->
<div class="cookie-banner" id="banner">
  <p>We use cookies to improve your experience.</p>
  <button id="c-settings">Cookie settings</button>
  <button id="c-accept" style="min-width:160px;min-height:44px">Accept all</button>
  <button id="c-reject" style="width:4px;height:4px;overflow:hidden">Reject</button>
</div>

<pre id="RESULTS"></pre>
<!-- ONE script, not six.
     The manifest lists these six files in a single content_scripts entry, and
     the coordinator's setTimeout(init, 0) assumes every detector has
     registered by the next macrotask. Loading them as six separate <script src>
     tags breaks that assumption in a way the extension never sees: the HTML
     parser may yield between external scripts, so the timer can fire before
     guilt-copy.js has even been fetched, and the first scan then finds no
     detectors registered. Serving them concatenated reproduces how they are
     actually injected. -->
<script src="/__detectors.js"></script>
<script>
(async () => {
  await new Promise((r) => setTimeout(r, 600));
  const out = { rewritten: {}, labels: {}, badged: {}, cookie: {} };

  for (const el of document.querySelectorAll("button[data-case]")) {
    const id = el.getAttribute("data-case");
    out.rewritten[id] = el.hasAttribute("data-sieve-guilt-copy");
    out.labels[id] = (el.textContent || "").trim();
  }
  for (const el of document.querySelectorAll("input[data-cb]")) {
    const id = el.getAttribute("data-cb");
    out.badged[id] = !!el.dataset.sieveCheckboxBadge;
  }
  for (const id of ["c-settings", "c-accept", "c-reject"]) {
    const el = document.getElementById(id);
    out.cookie[id] = el ? el.getAttribute("data-sieve-cookie") : "(missing)";
  }
  out.counts = window.SieveDarkPatterns.counts().byType;
  // Content added after load must be scanned too — that is the coordinator's
  // MutationObserver, and it is a separate path from the first scan. Asserted
  // below, and it is also the probe that told us the first scan was missing
  // while this test was being written.
  const probe = document.createElement("button");
  probe.setAttribute("data-case", "probe-late");
  probe.textContent = "No thanks, I don't want to save money";
  document.body.appendChild(probe);
  await new Promise((r) => setTimeout(r, 900));
  out.observerAlive = probe.hasAttribute("data-sieve-guilt-copy");

  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>
</body>`;

// --- harness ----------------------------------------------------------------

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(PAGE);
    }
    // The six detector files, in manifest order, as one script — see the note
    // in the page. Read from source each time so the test always runs against
    // the working tree rather than a stale copy.
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
    const type = file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".json")
        ? "application/json"
        : "text/plain";
    res.writeHead(200, { "content-type": type + "; charset=utf-8" });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function render(port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-dp-"));
  return new Promise((resolve, reject) => {
    execFile(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        `--user-data-dir=${profile}`,
        "--window-size=1100,900",
        "--virtual-time-budget=20000",
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
            found[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'")
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

// --- guilt-copy -------------------------------------------------------------

test("guilt-copy rewrites a genuine guilt trip", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  assert.equal(r.rewritten["guilt-savings"], true);
  assert.equal(r.labels["guilt-savings"], "No thanks");
  assert.equal(r.rewritten["guilt-discount"], true);
});

// The whole point of the detector is that it is picky. Every case below
// contains a word that a naive substring match reads as negative framing:
// "Know", "Economy", "Ignore" and "Nothing" all contain "no", and "password"
// contains "pass". Rewriting any of them replaces a real button's words with
// "No thanks", on a page that was behaving perfectly.
test("guilt-copy leaves ordinary buttons alone", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  for (const id of ["ok-know", "ok-economy", "ok-ignore", "ok-nothing", "ok-checkout", "ok-password"]) {
    assert.equal(r.rewritten[id], false, `${id} was rewritten: "${r.labels[id]}"`);
  }
});

test("guilt-copy leaves a short, already-neutral dismiss alone", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  // "No thanks" is negative framing about nothing, and under the length floor.
  assert.equal(r.rewritten["ok-plain"], false);
  assert.equal(r.labels["ok-plain"], "No thanks");
});

// --- checkboxes -------------------------------------------------------------

test("checkboxes badges a pre-ticked marketing opt-in", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  assert.equal(r.badged["cb-marketing"], true);
  assert.equal(r.badged["cb-newsletter"], true);
});

test("checkboxes leaves a terms-acceptance box alone", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  // Agreeing to terms is not a marketing opt-in, and a badge on it is noise.
  assert.equal(r.badged["cb-terms"], false);
});

// "context" contains "text", which is one of the marketing keywords. The
// detector reads up to three levels of ancestor text, so an unrelated word in
// a paragraph near the checkbox is enough to trip a substring match.
test("checkboxes is not tripped by a keyword buried in a longer word", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  assert.equal(r.badged["cb-context"], false, "a checkbox near the word 'context' was badged");
});

// --- cookies ----------------------------------------------------------------

test("cookies levels a banner whose reject button is a sliver", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  assert.equal(r.cookie["c-accept"], "leveled");
  assert.equal(r.cookie["c-reject"], "leveled");
});

// "Cookie settings" contains "ok", so a substring match for the accept words
// finds it before it ever reaches "Accept all" -- and it is also in the REJECT
// words, so the same button can be chosen as both. Either way the real Accept
// button is left untouched and the feature has done nothing but restyle a
// third button.
test("cookies picks the real Accept, not the button whose text merely contains 'ok'", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  assert.notEqual(
    r.cookie["c-settings"],
    "leveled",
    "'Cookie settings' was leveled as though it were the Accept or Reject button"
  );
});

test("a guilt trip added after load is caught by the observer", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  assert.equal(r.observerAlive, true, "the coordinator did not scan content added after load");
});

test("every detector reports through the coordinator", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  assert.ok(r.counts.guiltCopy >= 2, `guiltCopy counted ${r.counts.guiltCopy}`);
  assert.ok(r.counts.checkboxes >= 2, `checkboxes counted ${r.counts.checkboxes}`);
  assert.ok(r.counts.cookies >= 1, `cookies counted ${r.counts.cookies}`);
});

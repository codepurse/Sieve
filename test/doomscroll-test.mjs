// test/doomscroll-test.mjs
// Sieve — tests for the Doomscroll Stopper's clock (content/doomscroll.js):
// what counts as time on a site.
//
//   node --test test/
//
// The clock used to count only time spent actively scrolling. A user set 15
// minutes on YouTube and watched for three hours before the pause appeared,
// because watching a video is almost no scrolling. So the case that matters
// most here is the one with nobody touching anything and a video playing: it
// has to count. The others pin the edges of that: an idle page stops counting,
// a hidden tab never counts, and scrolling still does.
//
// Run in real headless Chrome with a virtual clock, for the same reason
// test/dark-patterns-detectors-test.mjs is: the tracker reads a real <video>'s
// paused state, real input events and real timers, and a hand-built fake would
// have to invent all three. The virtual clock is what lets two and a half
// minutes of a page's life run in a couple of seconds.
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

// The Doomscroll entry in a manifest: the content script whose files include
// the tracker. The page below loads exactly that list, read from the manifest
// itself, so a file added there is tested without anyone updating this test.
function doomscrollEntry(manifestFile) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, manifestFile), "utf8"));
  return manifest.content_scripts.find((cs) => (cs.js || []).includes("content/doomscroll.js")).js;
}
const TRACKER_FILES = doomscrollEntry("manifest.json");

// The test page is tracked as a custom site, which is how a user-added domain
// is matched; 127.0.0.1 is the host the page is served from.
const SITE_ID = "custom:127.0.0.1";

// Every case starts with nothing counted today. Opening the page counts as
// being there, so the first minute is credited even with no input at all;
// that is why the limits below are two minutes, not one.
//   limit   the daily limit, in minutes
//   video   a muted video plays from the start
//   hidden  the tab is in the background the whole time
//   scroll  a wheel event every second
//   wait    how long the page lives, in virtual milliseconds
//   snaps   moments (virtual ms) to read the countdown bubble at
//   store   extra settings, for the bubble's own switch, corner and size
const CASES = {
  watching: { limit: 2, video: true, wait: 150000, snaps: [30000] },
  idle: { limit: 10, wait: 150000, snaps: [30000, 100000] },
  hidden: { limit: 2, video: true, hidden: true, wait: 150000, snaps: [30000] },
  scrolling: { limit: 10, scroll: true, wait: 120000 },
  placed: {
    limit: 10, wait: 5000, snaps: [3000],
    store: { doomscrollCountdownCorner: "top-right", doomscrollCountdownSize: "large" },
  },
  countdownOff: { limit: 10, wait: 5000, snaps: [3000], store: { doomscrollCountdown: false } },
};

// --- the page under test ----------------------------------------------------

function page(c) {
  return `<!doctype html><meta charset="utf-8"><body>
<script>
  const store = {
    doomscrollEnabled: true,
    doomscrollCustomSites: ["127.0.0.1"],
    doomscrollSites: { ${JSON.stringify(SITE_ID)}: { enabled: true, timeLimitMinutes: ${c.limit} } },
    ...${JSON.stringify(c.store || {})},
  };
  const pick = (keys) => {
    const o = {};
    if (typeof keys === "string") keys = [keys];
    if (Array.isArray(keys)) { for (const k of keys) if (k in store) o[k] = store[k]; return o; }
    for (const k of Object.keys(keys || {})) o[k] = k in store ? store[k] : keys[k];
    return o;
  };
  window.chrome = {
    storage: {
      local: {
        get: (keys) => Promise.resolve(JSON.parse(JSON.stringify(pick(keys)))),
        set: (o) => { Object.assign(store, JSON.parse(JSON.stringify(o))); return Promise.resolve(); },
        remove: (keys) => { for (const k of [].concat(keys)) delete store[k]; return Promise.resolve(); },
      },
      onChanged: { addListener() {} },
    },
    runtime: { getURL: (p) => "/" + p },
  };
  ${c.hidden ? `
  // A background tab, from before the tracker loads.
  Object.defineProperty(Document.prototype, "hidden", { configurable: true, get: () => true });
  Object.defineProperty(Document.prototype, "visibilityState", { configurable: true, get: () => "hidden" });` : ""}
</script>
${c.video ? `<video id="v" muted playsinline width="160" height="90"></video>
<script>
  // A real video element, really playing: a canvas stream, so nothing has to
  // be fetched and the virtual clock is never held up by the network.
  const canvas = document.createElement("canvas");
  canvas.width = 160; canvas.height = 90;
  canvas.getContext("2d").fillRect(0, 0, 160, 90);
  const v = document.getElementById("v");
  v.srcObject = canvas.captureStream(30);
  v.play().catch((e) => { window.__playError = String(e); });
</script>` : ""}
<pre id="RESULTS"></pre>
<script src="/__tracker.js"></script>
<script>
// The countdown bubble as a user would see it, or null when there is none.
function bubble() {
  const host = document.getElementById("sieve-countdown");
  const pill = host && host.shadowRoot && host.shadowRoot.querySelector(".pill");
  if (!pill) return null;
  const cs = getComputedStyle(pill);
  return {
    time: pill.querySelector(".time").textContent,
    word: pill.querySelector(".word").textContent,
    paused: pill.classList.contains("is-paused"),
    corner: pill.dataset.corner,
    top: cs.top, right: cs.right, bottom: cs.bottom, left: cs.left,
    fontSize: cs.fontSize,
    visible: pill.getBoundingClientRect().width > 0,
  };
}

(async () => {
  const startedPlaying = ${c.video ? `!document.getElementById("v").paused` : "null"};
  const snaps = [];
  for (const at of ${JSON.stringify(c.snaps || [])}) setTimeout(() => snaps.push(bubble()), at);
  ${c.scroll ? `const scroller = setInterval(() => window.dispatchEvent(new WheelEvent("wheel", { deltaY: 120 })), 1000);` : ""}
  await new Promise((r) => setTimeout(r, ${c.wait}));
  ${c.scroll ? "clearInterval(scroller);" : ""}
  const days = (store.doomscrollStats || {})[${JSON.stringify(SITE_ID)}] || {};
  const minutes = Object.values(days).reduce((sum, d) => sum + (d.minutes || 0), 0);
  const overlay = document.getElementById("sieve-pause-overlay");
  const msg = overlay && overlay.shadowRoot && overlay.shadowRoot.getElementById("sieve-msg");
  const out = {
    minutes,
    overlay: !!overlay,
    message: msg ? msg.textContent : null,
    startedPlaying,
    endedPaused: ${c.video ? `document.getElementById("v").paused` : "null"},
    playError: window.__playError || null,
    snaps,
    bubbleAtEnd: bubble(),
    formats: window.SieveCountdown
      ? [59000, 754000, 3912000, 400].map((ms) => window.SieveCountdown.format(ms))
      : null,
  };
  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>
</body>`;
}

// --- harness ----------------------------------------------------------------

function startServer() {
  const server = http.createServer((req, res) => {
    const [pathname, query = ""] = req.url.split("?");
    const url = decodeURIComponent(pathname);
    if (url === "/" || url === "/index.html") {
      const c = CASES[new URLSearchParams(query).get("case")];
      if (!c) {
        res.writeHead(404);
        return res.end("no such case");
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(page(c));
    }
    // The tracker's files as one script, the way the manifest injects them,
    // read from source each time so the test runs against the working tree.
    if (url === "/__tracker.js") {
      const bundle = TRACKER_FILES.map(
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

function render(port, name) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-ds-"));
  return new Promise((resolve, reject) => {
    execFile(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--autoplay-policy=no-user-gesture-required",
        `--user-data-dir=${profile}`,
        "--window-size=800,600",
        `--virtual-time-budget=${CASES[name].wait + 30000}`,
        "--dump-dom",
        `http://127.0.0.1:${port}/?case=${name}`,
      ],
      { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => {
        fs.rmSync(profile, { recursive: true, force: true });
        if (err) return reject(err);
        const found = /&lt;&lt;&lt;(.*?)&gt;&gt;&gt;/s.exec(stdout);
        if (!found) return reject(new Error(`the "${name}" page never reported results`));
        resolve(
          JSON.parse(
            found[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'")
          )
        );
      }
    );
  });
}

// All four cases run side by side, once, and every test reads the same report.
let reports = null;
async function results() {
  if (reports) return reports;
  const server = await startServer();
  try {
    const port = server.address().port;
    const names = Object.keys(CASES);
    const outs = await Promise.all(names.map((n) => render(port, n)));
    reports = Object.fromEntries(names.map((n, i) => [n, outs[i]]));
  } finally {
    server.close();
  }
  if (process.env.SIEVE_DS_DEBUG) console.log(JSON.stringify(reports, null, 1));
  return reports;
}

// --- the clock --------------------------------------------------------------

// The reported bug. Nobody touches the page, a video plays, and the two-minute
// limit has to be reached: by the first minute's grace alone it never would be.
test("watching a video counts toward the limit", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).watching;
  assert.equal(r.playError, null, "the test video did not play");
  assert.equal(r.startedPlaying, true, "the test video was not playing");
  assert.equal(r.overlay, true, `the pause never appeared (${r.minutes.toFixed(2)} min counted)`);
  assert.ok(r.minutes >= 1.9, `only ${r.minutes.toFixed(2)} min counted`);
});

// The pause screen has to stop the video it interrupted; otherwise the limit
// is a picture over a video that keeps talking.
test("the pause screen stops the video", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).watching;
  assert.equal(r.overlay, true);
  assert.equal(r.endedPaused, true, "the video was still playing behind the pause screen");
});

// Time on the site, not scrolling: the pause screen says so.
test("the pause screen talks about time on the site, not scrolling", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).watching;
  assert.match(r.message || "", /^You've spent about \d+ min on 127\.0\.0\.1 today\.$/);
});

// A page left open with nothing playing and nobody there stops counting after
// a minute, so lunch with a feed open on screen is not two hours of scrolling.
test("an idle page stops counting after a minute", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).idle;
  assert.equal(r.overlay, false);
  assert.ok(r.minutes >= 0.9 && r.minutes <= 1.1, `${r.minutes.toFixed(2)} min counted, expected about 1`);
});

// A video playing in a background tab is not someone on the site.
test("a hidden tab counts nothing, even with a video playing", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).hidden;
  assert.equal(r.startedPlaying, true, "the test video was not playing");
  assert.equal(r.overlay, false);
  assert.ok(r.minutes < 0.05, `${r.minutes.toFixed(2)} min counted in a hidden tab`);
});

// What the clock always did, still done.
test("scrolling still counts", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).scrolling;
  assert.ok(r.minutes >= 1.85 && r.minutes <= 2.1, `${r.minutes.toFixed(2)} min counted, expected about 2`);
});

// --- the countdown bubble (content/countdown.js) ----------------------------

const seconds = (snap) => snap.time.split(":").reduce((total, part) => total * 60 + Number(part), 0);

// Its whole job: a limit that is running can be seen running. Thirty seconds
// into a two-minute limit, with a video playing, about a minute and a half is
// left.
test("the countdown shows what is left while the clock runs", { skip: !CHROME && "Chrome not found" }, async () => {
  const [mid] = (await results()).watching.snaps;
  assert.ok(mid, "no countdown on a tracked site");
  assert.equal(mid.visible, true);
  assert.equal(mid.word, "left");
  assert.equal(mid.paused, false);
  assert.ok(seconds(mid) >= 86 && seconds(mid) <= 92, `${mid.time} left at 30s into a 2-minute limit`);
});

// And a limit that is NOT running can be seen not running, which is what the
// supporter who asked for this had no way to tell.
test("the countdown says paused once the clock stops", { skip: !CHROME && "Chrome not found" }, async () => {
  const [running, stopped] = (await results()).idle.snaps;
  assert.equal(running.word, "left");
  assert.equal(stopped.word, "paused");
  assert.equal(stopped.paused, true);
  // Ten minutes, less the one minute that counted before the page went idle.
  assert.ok(seconds(stopped) >= 536 && seconds(stopped) <= 542, `${stopped.time} left, expected about 9:00`);
});

test("the countdown gives way to the pause screen", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).watching;
  assert.equal(r.overlay, true);
  assert.equal(r.bubbleAtEnd, null, "the countdown stayed up over the pause screen");
});

test("a hidden tab draws no countdown", { skip: !CHROME && "Chrome not found" }, async () => {
  assert.equal((await results()).hidden.snaps[0], null);
});

// Read back from the real layout, so a corner that the stylesheet does not
// actually move is caught.
test("the countdown sits in the corner and at the size chosen", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = await results();
  const [standard] = r.idle.snaps;
  assert.equal(standard.corner, "bottom-left");
  assert.equal(standard.bottom, "16px");
  assert.equal(standard.left, "16px");
  assert.equal(standard.fontSize, "14px");

  const [placed] = r.placed.snaps;
  assert.equal(placed.corner, "top-right");
  assert.equal(placed.top, "16px");
  assert.equal(placed.right, "16px");
  assert.equal(placed.fontSize, "18px");
});

test("switching the countdown off removes it", { skip: !CHROME && "Chrome not found" }, async () => {
  const r = (await results()).countdownOff;
  assert.equal(r.snaps[0], null);
  assert.equal(r.bubbleAtEnd, null);
});

test("times read as m:ss, and h:mm:ss past an hour", { skip: !CHROME && "Chrome not found" }, async () => {
  // A part of a second still counts as a second left, so 0:00 means done.
  assert.deepEqual((await results()).idle.formats, ["0:59", "12:34", "1:05:12", "0:01"]);
});

// --- the script list ---------------------------------------------------------

// A user-added site gets the tracker by a dynamic registration in the service
// worker, from its own copy of the manifest's list. The two had drifted once:
// user-added sites ran without cooloff.js and theme.js.
test("user-added sites get the same scripts as the built-in ones", () => {
  const sw = fs.readFileSync(path.join(ROOT, "background/service-worker.js"), "utf8");
  const found = /const DOOMSCROLL_CS_FILES = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(found, "DOOMSCROLL_CS_FILES not found in the service worker");
  const list = [...found[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(list, TRACKER_FILES);
  assert.deepEqual(doomscrollEntry("manifest.firefox.json"), TRACKER_FILES);
});

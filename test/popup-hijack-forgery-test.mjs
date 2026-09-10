// test/popup-hijack-forgery-test.mjs
// Sieve — the Popup & Click Hijack Blocker's two halves talk over
// window.postMessage, and THE PAGE CAN SEND AND READ EVERY MESSAGE. Both halves
// live in the same window, so `event.source === window` is true for the page
// too, and any token they tried to exchange would be readable by a page
// listening on that same window. There is no fix for that at this layer.
//
// So the rule is: nothing crossing that channel may change stored state. This
// pins it. The test forges, from the page, exactly what a hostile site would
// send — and the site this module exists to stop is precisely the one that
// would bother.
//
// What used to happen: a single postMessage added the current host to
// popupHijackWhitelist, permanently exempting the site from the blocker across
// restarts. "Always allow this site" now lives in the toolbar popup, which a
// page cannot reach.
//
// Run in real headless Chrome: the thing under test is the message plumbing
// between two script worlds, which a fake window cannot reproduce.

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

const TAG = "__sievePopupHijack";

// The page stands in for BOTH the isolated world (a chrome shim that records
// every write) and a hostile site (the forged messages at the bottom).
const PAGE = `<!doctype html><meta charset="utf-8"><body>
<pre id="RESULTS"></pre>
<script>
  // Surface page-side failures instead of leaving the runner to report the
  // useless "never reported results". An async reporter throws as an unhandled
  // rejection, which the "error" event does not see - both are captured.
  window.__err = [];
  const report = () => {
    document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify({ fatal: window.__err }) + ">>>";
  };
  window.addEventListener("error", (e) => {
    window.__err.push("ERROR " + e.message + " @" + (e.filename||"").split("/").pop() + ":" + e.lineno);
    report();
  });
  window.addEventListener("unhandledrejection", (e) => {
    window.__err.push("REJECT " + (e.reason && e.reason.stack ? e.reason.stack : e.reason));
    report();
  });
</script>
<script>
  // Records every storage write so the test can see whether a forged message
  // reached the whitelist.
  window.__writes = [];
  const store = { popupHijackEnabled: true, popupHijackWhitelist: [] };
  window.chrome = {
    storage: {
      local: {
        get: (defs) => { const o = {}; for (const k of Object.keys(defs)) o[k] = k in store ? store[k] : defs[k]; return Promise.resolve(o); },
        set: (o) => { window.__writes.push(JSON.parse(JSON.stringify(o))); Object.assign(store, o); return Promise.resolve(); }
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      sendMessage: (m) => { (window.__sent = window.__sent || []).push(m); return Promise.resolve({}); },
      onMessage: { addListener() {} }
    }
  };
</script>
<script src="/content/popup-hijack-blocker.js"></script>
<script src="/content/popup-hijack-bridge.js"></script>
<script>
(async () => {
  const tick = () => new Promise((r) => setTimeout(r, 60));
  await tick(); await tick();          // let the bridge's storage read settle

  const out = {};
  const post = (msg) => window.postMessage(Object.assign({ ["${TAG}"]: true }, msg), "*");

  // --- 1. can a page write itself into the whitelist? --------------------
  post({ dir: "to-bridge", kind: "whitelist-add" });
  await tick(); await tick();
  out.writesAfterForgedWhitelistAdd = window.__writes.length;
  out.whitelist = store.popupHijackWhitelist.slice();

  // --- 2. is there any message that reaches a storage write at all? ------
  for (const kind of ["whitelist-add", "whitelistAdd", "allow-site", "config", "hello"]) {
    post({ dir: "to-bridge", kind, host: location.hostname });
  }
  await tick(); await tick();
  out.writesAfterAllForgeries = window.__writes.length;

  // --- 3. the blocked log IS forgeable, and that is the accepted trade --
  post({ dir: "to-bridge", kind: "blocked", entry: { url: "https://forged.example/", reason: "x" } });
  await tick();
  out.forwardedBlocked = (window.__sent || []).filter((m) => m && m.type === "POPUP_HIJACK_BLOCKED").length;

  // --- 4. the on-page prompt must not offer a permanent exemption -------
  const host = document.getElementById("sieve-ph-prompt-host");
  out.promptExists = !!host;
  // The shadow root is closed, so the page cannot read inside it. That is the
  // point: assert from the source instead that no such control is built.
  out.promptShadowReachable = !!(host && host.shadowRoot);

  document.getElementById("RESULTS").textContent = "<<<" + JSON.stringify(out) + ">>>";
})();
</script>
</body>`;

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(PAGE);
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-ph-"));
  return new Promise((resolve, reject) => {
    execFile(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        `--user-data-dir=${profile}`,
        "--virtual-time-budget=20000",
        "--dump-dom",
        `http://127.0.0.1:${port}/`,
      ],
      { maxBuffer: 32 * 1024 * 1024 },
      (err, stdout) => {
        fs.rmSync(profile, { recursive: true, force: true });
        if (err) return reject(err);
        const found = /&lt;&lt;&lt;(.*?)&gt;&gt;&gt;/s.exec(stdout);
        if (!found) return reject(new Error("the page never reported results"));
        resolve(
          JSON.parse(found[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'"))
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
  return report;
}

test(
  "a page cannot add itself to the popup-hijack whitelist by postMessage",
  { skip: !CHROME && "Chrome not found" },
  async () => {
    const r = await results();
    assert.equal(r.writesAfterForgedWhitelistAdd, 0, "a forged whitelist-add reached storage");
    assert.deepEqual(r.whitelist, [], "the whitelist was modified by the page");
  }
);

test(
  "no forged message of any shape reaches a storage write",
  { skip: !CHROME && "Chrome not found" },
  async () => {
    const r = await results();
    // The bridge is read-only on storage now. If this ever fails, someone has
    // added a writer reachable from the page — check what it writes before
    // raising the number.
    assert.equal(r.writesAfterAllForgeries, 0);
  }
);

test(
  "the blocked-popup log stays forgeable, and that is the accepted trade",
  { skip: !CHROME && "Chrome not found" },
  async () => {
    const r = await results();
    // Pinned so the trade-off stays deliberate rather than drifting: the worst a
    // page achieves is a line in its own tab's list, which is per-tab, capped,
    // and rendered as text. It changes no setting.
    assert.equal(r.forwardedBlocked, 1);
  }
);

test(
  "the on-page prompt's shadow root stays closed to the page",
  { skip: !CHROME && "Chrome not found" },
  async () => {
    const r = await results();
    assert.equal(r.promptShadowReachable, false, "the page can open the prompt's shadow root");
  }
);

test("no whitelist writer is reachable from the content scripts", () => {
  // A source-level guard, because the browser test above can only prove that
  // today's message shapes fail. This proves there is nothing to reach.
  const bridge = fs.readFileSync(path.join(ROOT, "content/popup-hijack-bridge.js"), "utf8");
  const main = fs.readFileSync(path.join(ROOT, "content/popup-hijack-blocker.js"), "utf8");
  assert.equal(
    /storage\.local\.set/.test(bridge),
    false,
    "the bridge writes to storage again — the whitelist hole is reachable from a page"
  );
  assert.equal(/whitelist-add/.test(main.replace(/\/\/.*$/gm, "")), false, "MAIN still sends whitelist-add");
});

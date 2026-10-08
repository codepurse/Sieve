// build-icons.mjs
// Regenerates the toolbar / store icons (icons/icon-{16,32,48,128}.png) and
// their editable SVG masters (src/icons/) from one geometry.
//
//   node build-icons.mjs
//
// The icon is the in-app mark set as a stamp: the shield with its diagonal cut
// in paper, on an ink tile. It is the same path the settings page, popup and
// blocked page draw inline (see .mark in common/sieve-ui.css), so the toolbar
// and the product cannot drift apart. Monochrome on purpose: in Sieve green
// only ever means "a switch is on", and a toolbar icon is not a switch.
//
// Why a tile and not a bare shield: a toolbar icon sits on light AND dark
// browser chrome. A bare ink shield disappears on a dark toolbar; a paper one
// disappears on a light one. An ink tile with a paper shield reads on both —
// on a dark toolbar the tile edge goes quiet and the paper shield carries it.
//
// Rasterised by headless Chrome (canvas.drawImage of each SVG), so there is no
// image library to install. Set CHROME to a browser binary if it is not found.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PNG_DIR = path.join(ROOT, "icons");
const SVG_DIR = path.join(ROOT, "src", "icons");

const PAPER = "#f2efe7";
const INK = "#1a1916";

// The mark, in a 24-unit grid — identical to the inline SVG in the pages.
const SHIELD = "M12 2.2 20 5v6.6c0 4.7-3.3 8.5-8 10.2-4.7-1.7-8-5.5-8-10.2V5z";
const SHIELD_HEIGHT = 19.6; // 2.2 → 21.8
const CUT = "M16.3 0.5 7.7 23.5";

// Per size, in output pixels. The cut is widened at 32 (it would otherwise
// fall under two pixels and smear), and the 128 keeps the Chrome Web Store's
// 16px transparent margin around a 96px tile.
const SIZES = {
  32: { tile: 32, radius: 5.5, shield: 22.5, cut: 2.5, edge: true },
  48: { tile: 48, radius: 8, shield: 33, cut: 3.3, edge: true },
  128: { tile: 96, radius: 13, shield: 60, cut: 5.4, edge: true },
};

// 16px is drawn by hand, pixel by pixel, rather than scaled. Scaled to this
// size the diagonal cut lands between pixels and smears into grey; placed by
// hand it is a clean one-pixel staircase at the mark's own slope. The outline
// is simplified on purpose: square shoulders and a V-shaped foot, because the
// mark's peaked top and rounded foot, sampled faithfully at 16px, read as a
// bean rather than a shield.
//   # ink   P paper   o ink at half strength (rounds the corner)   - empty
const PIXELS_16 = [
  "-o############o-",
  "o##############o",
  "####PPPPPP#P####",
  "###PPPPPP#PPP###",
  "###PPPPPP#PPP###",
  "###PPPPP#PPPP###",
  "###PPPPP#PPPP###",
  "###PPPPP#PPPP###",
  "###PPPP#PPPPP###",
  "###PPPP#PPPPP###",
  "####PPP#PPPP####",
  "#####P#PPPP#####",
  "#######PPP######",
  "#######PP#######",
  "o##############o",
  "-o############o-",
];

function pixelSvg(rows) {
  const fills = { "#": [INK, 1], o: [INK, 0.5], P: [PAPER, 1] };
  const rects = [];
  rows.forEach((row, y) => {
    // One rect per run of the same pixel, so the file stays readable.
    for (let x = 0; x < row.length; ) {
      let end = x;
      while (end + 1 < row.length && row[end + 1] === row[x]) end++;
      const fill = fills[row[x]];
      if (fill) {
        const opacity = fill[1] === 1 ? "" : ` fill-opacity="${fill[1]}"`;
        rects.push(`<rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${fill[0]}"${opacity}/>`);
      }
      x = end + 1;
    }
  });
  const size = rows.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

function iconSvg(size) {
  const { tile, radius, shield, cut, edge } = SIZES[size];
  const k = shield / SHIELD_HEIGHT; // grid units → pixels
  const inset = (size - tile) / 2;
  // The shield carries its weight high (wide top, pointed foot), so its
  // bounding-box centre sits above its optical centre; nudge it down a little.
  const dy = 0.45 * k;
  const c = size / 2;
  // A hairline just inside the tile, faint enough to vanish on a light
  // toolbar, that keeps the tile's edge visible on a dark one.
  const edgeRect = edge
    ? `<rect x="${inset + 0.5}" y="${inset + 0.5}" width="${tile - 1}" height="${tile - 1}" rx="${radius - 0.5}" fill="none" stroke="#ffffff" stroke-opacity="0.1"/>`
    : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<defs><mask id="cut" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">`,
    `<rect x="-4" y="-4" width="32" height="32" fill="#fff"/>`,
    `<path d="${CUT}" stroke="#000" stroke-width="${(cut / k).toFixed(3)}"/>`,
    `</mask></defs>`,
    `<rect x="${inset}" y="${inset}" width="${tile}" height="${tile}" rx="${radius}" fill="${INK}"/>`,
    edgeRect,
    `<g transform="translate(${c} ${(c + dy).toFixed(3)}) scale(${k.toFixed(4)}) translate(-12 -12)">`,
    `<path d="${SHIELD}" fill="${PAPER}" mask="url(#cut)"/>`,
    `</g>`,
    `</svg>`,
  ].join("");
}

// --- headless Chrome, just enough DevTools protocol to run one script -------

const CHROME_CANDIDATES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rasterise(svgs) {
  const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chrome) throw new Error("No Chrome/Chromium found — set CHROME to a browser binary.");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sieve-icons-"));
  const port = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(chrome, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });

  try {
    let page;
    for (let i = 0; i < 60 && !page; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        page = list.find((t) => t.type === "page");
      } catch {
        await sleep(200);
      }
    }
    if (!page) throw new Error("Chrome did not open a DevTools port.");

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    const reply = new Promise((resolve) =>
      ws.addEventListener("message", (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === 1) resolve(msg);
      })
    );

    // Each SVG drawn onto a canvas of exactly its own size and read back as a
    // PNG. Transparent wherever the SVG paints nothing.
    const expression = `(async (svgs) => {
      const out = {};
      for (const [size, markup] of Object.entries(svgs)) {
        const img = new Image();
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Number(size);
        canvas.getContext("2d").drawImage(img, 0, 0, Number(size), Number(size));
        out[size] = canvas.toDataURL("image/png").split(",")[1];
      }
      return JSON.stringify(out);
    })(${JSON.stringify(svgs)})`;
    ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    const msg = await reply;
    ws.close();
    const value = msg.result && msg.result.result && msg.result.result.value;
    if (!value) throw new Error("Rasterising failed: " + JSON.stringify(msg).slice(0, 400));
    return JSON.parse(value);
  } finally {
    proc.kill();
    await sleep(300);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

// --- main -------------------------------------------------------------------

const svgs = { 16: pixelSvg(PIXELS_16) };
for (const size of Object.keys(SIZES)) svgs[size] = iconSvg(Number(size));
fs.mkdirSync(SVG_DIR, { recursive: true });
for (const [size, markup] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(SVG_DIR, `icon-${size}.svg`), markup + "\n");
}

const pngs = await rasterise(svgs);
for (const [size, b64] of Object.entries(pngs)) {
  const file = path.join(PNG_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  console.log(`  icons/icon-${size}.png  ${fs.statSync(file).size} bytes`);
}
console.log("==> Icons written. SVG masters in src/icons/.");

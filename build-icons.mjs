// build-icons.mjs
// Regenerates the toolbar / store icons (icons/icon-{16,32,48,128}.png), their
// editable SVG masters, and the inline mark the pages draw (src/icons/), all
// from one geometry.
//
//   node build-icons.mjs
//
// The mark is a kitchen sieve, side on: a rim with a handle, a bowl of holes,
// and two drops falling through. It says what Sieve does: the web goes in,
// the junk stays in the bowl, the good falls through.
//
// The icon sets it in paper on an ink tile, with the drops in Sieve's gold.
// Why a tile and not a bare sieve: a toolbar icon sits on light AND dark
// browser chrome. A bare ink drawing disappears on a dark toolbar; a paper one
// disappears on a light one. An ink tile with a paper drawing reads on both.
// Gold, not green: in Sieve green only ever means "a switch is on", and a
// toolbar icon is not a switch.
//
// The pages (settings, popup, blocked page, onboarding, release notes) draw
// the same geometry inline, in one colour (currentColor), next to the
// wordmark. They carry a COPY of src/icons/mark.svg, so after changing the
// geometry here, paste the new file into them. content/search-filter.js
// carries src/icons/mark-small.svg, the version with fewer, larger holes for
// a 16px drawing (the full mesh clogs into grey at that size).
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
const GOLD = "#e8b54f";

// --- the mark, in a 24-unit grid ---------------------------------------------
//
// Placed so its bounding box (handle tip to the lower drop) is centred in the
// grid: 1.4–22.5 across, 2.6–21.5 down.

const BOWL = { cx: 13.1, top: 6.4, rx: 8.6, ry: 8.4 }; // the lower half of an ellipse
const RIM = { x: 3.7, y: 5.3, w: 18.8, h: 2.1 };
const HANDLE = "M5.1 6.3 2.4 3.6"; // stroked, 2 wide, round caps
const DRIPS = [
  [11.8, 18.2, 1.05],
  [14.6, 20.7, 0.8],
];

// The holes: rows across the bowl, each centred under the rim.
const FULL = { hole: 0.78, pitch: 2.6, rows: [{ y: 9.1, n: 6 }, { y: 11.6, n: 5 }, { y: 13.9, n: 2 }] };
const SMALL = { hole: 1.05, pitch: 3.3, rows: [{ y: 9.5, n: 4 }, { y: 12.6, n: 3 }] };

const num = (n) => +n.toFixed(2);
const circle = (cx, cy, r) => `M${num(cx - r)} ${num(cy)}a${r} ${r} 0 1 0 ${num(2 * r)} 0a${r} ${r} 0 1 0 ${num(-2 * r)} 0z`;

// The rim and the bowl as one path, so the holes are real holes (whatever is
// behind shows through) and no mask id is needed: the inline copies sit on
// pages that may draw the mark more than once. The holes are cut by winding,
// not by even-odd: rim and bowl run clockwise, each hole anticlockwise. Under
// even-odd the band where the rim overlaps the bowl would be cut out too.
function body(mesh) {
  const { cx, top, rx, ry } = BOWL;
  const r = RIM.h / 2;
  let d = `M${RIM.x + r} ${RIM.y}H${num(RIM.x + RIM.w - r)}a${r} ${r} 0 0 1 0 ${RIM.h}H${RIM.x + r}a${r} ${r} 0 0 1 0 ${-RIM.h}z`;
  d += `M${num(cx - rx)} ${top}H${num(cx + rx)}A${rx} ${ry} 0 0 1 ${num(cx - rx)} ${top}Z`;
  for (const { y, n } of mesh.rows) {
    for (let j = 0; j < n; j++) d += circle(cx + (j - (n - 1) / 2) * mesh.pitch, y, mesh.hole);
  }
  return d;
}
const drips = () => DRIPS.map(([x, y, r]) => circle(x, y, r)).join("");

function markElements(mesh, drawing, drops) {
  return (
    `<path fill="${drawing}" d="${body(mesh)}"/>` +
    `<path d="${HANDLE}" fill="none" stroke="${drawing}" stroke-width="2" stroke-linecap="round"/>` +
    `<path fill="${drops}" d="${drips()}"/>`
  );
}

// The inline mark, in the colour of the text around it.
function inlineSvg(mesh) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${markElements(mesh, "currentColor", "currentColor")}</svg>`;
}

// --- the icon ----------------------------------------------------------------

// Per size, in output pixels. The 128 keeps the Chrome Web Store's 16px
// transparent margin around a 96px tile. `mark` is how much of the tile the
// 24-unit grid fills.
const SIZES = {
  32: { tile: 32, radius: 5.5, mark: 0.9, mesh: SMALL },
  48: { tile: 48, radius: 8, mark: 0.88, mesh: FULL },
  128: { tile: 96, radius: 13, mark: 0.88, mesh: FULL },
};

// 16px is drawn by hand, pixel by pixel, rather than scaled: scaled, the
// mesh smears into a grey bowl. Placed by hand, the holes are single ink
// pixels in two staggered rows, the bowl steps in evenly, and the drops are
// two gold pixels.
//   # ink   P paper   G gold   o ink at half strength (rounds the corner)   - empty
const PIXELS_16 = [
  "-o############o-",
  "o##############o",
  "#P##############",
  "##P#############",
  "##PPPPPPPPPPPPP#",
  "###PPPPPPPPPPP##",
  "###PP#P#P#P#PP##",
  "####PPPPPPPPP###",
  "####PP#P#P#PP###",
  "#####PPPPPPP####",
  "######PPPPP#####",
  "################",
  "#######G########",
  "################",
  "o########G#####o",
  "-o############o-",
];

function pixelSvg(rows) {
  const fills = { "#": [INK, 1], o: [INK, 0.5], P: [PAPER, 1], G: [GOLD, 1] };
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
  const { tile, radius, mark, mesh } = SIZES[size];
  const inset = (size - tile) / 2;
  const k = (tile * mark) / 24; // grid units → pixels
  const at = inset + (tile - 24 * k) / 2;
  // A hairline just inside the tile, faint enough to vanish on a light
  // toolbar, that keeps the tile's edge visible on a dark one.
  const edge = `<rect x="${inset + 0.5}" y="${inset + 0.5}" width="${tile - 1}" height="${tile - 1}" rx="${radius - 0.5}" fill="none" stroke="#ffffff" stroke-opacity="0.1"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect x="${inset}" y="${inset}" width="${tile}" height="${tile}" rx="${radius}" fill="${INK}"/>`,
    edge,
    `<g transform="translate(${num(at)} ${num(at)}) scale(${k.toFixed(4)})">`,
    markElements(mesh, PAPER, GOLD),
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
// The inline marks the pages carry a copy of (see the top of this file).
fs.writeFileSync(path.join(SVG_DIR, "mark.svg"), inlineSvg(FULL) + "\n");
fs.writeFileSync(path.join(SVG_DIR, "mark-small.svg"), inlineSvg(SMALL) + "\n");

const pngs = await rasterise(svgs);
for (const [size, b64] of Object.entries(pngs)) {
  const file = path.join(PNG_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  console.log(`  icons/icon-${size}.png  ${fs.statSync(file).size} bytes`);
}
console.log("==> Icons written. SVG masters and the inline marks in src/icons/.");

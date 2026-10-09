// test/theme-test.mjs
// Sieve — tests for the Appearance choice (common/theme.js) and the stylesheets
// that honour it.
//
// CSS cannot share one block between a media query and a plain selector, so
// every dark palette is now written twice: once under prefers-color-scheme
// (skipped when Sieve is set to Light) and once for data-theme="dark". The
// danger is quiet drift — a colour tuned in one copy and not the other, so the
// "Dark" setting and the system's dark mode slowly stop matching. These tests
// fail when that happens, and pin the one rule theme.js must never break: it
// does not write on a website's own <html>.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

// --- CSS helpers ---------------------------------------------------------

// The declaration block that follows `selector` (first match after `from`).
// A selector given with its own "{" opens the block right there; otherwise the
// next "{" does.
function blockAfter(css, selector, from = 0) {
  const at = css.indexOf(selector, from);
  assert.ok(at >= 0, `selector not found: ${selector}`);
  const open = selector.endsWith("{") ? at + selector.length - 1 : css.indexOf("{", at + selector.length);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

// Comments out, one declaration per entry, whitespace collapsed.
function declarations(block) {
  return block
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .map((d) => d.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function tokenMap(block) {
  const map = new Map();
  for (const d of declarations(block)) {
    const i = d.indexOf(":");
    map.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
  }
  return map;
}

function darkPair(css, root) {
  const media = css.indexOf("@media (prefers-color-scheme: dark)");
  assert.ok(media >= 0, "no dark media query");
  const underSystem = blockAfter(css, `${root}:not([data-theme="light"])`, media);
  const forced = blockAfter(css, `${root}[data-theme="dark"]`);
  return { underSystem, forced };
}

// --- the stylesheets -----------------------------------------------------

test("sieve-ui.css: the system-dark and chosen-dark palettes are identical", () => {
  const css = read("common/sieve-ui.css");
  const { underSystem, forced } = darkPair(css, ":root");
  assert.deepEqual(declarations(forced), declarations(underSystem));
  assert.ok(declarations(forced).includes("color-scheme: dark"));
});

test("sieve-ui.css: no dark rule is left that ignores the choice", () => {
  const css = read("common/sieve-ui.css");
  // Every rule inside a dark media query must step aside for data-theme="light".
  const re = /@media \(prefers-color-scheme: dark\) \{\s*([^{]+)\{/g;
  let m;
  let count = 0;
  while ((m = re.exec(css))) {
    count++;
    assert.match(m[1], /:not\(\[data-theme="light"\]\)/, `dark rule without the Light escape: ${m[1].trim()}`);
  }
  assert.ok(count >= 1);
});

test("options.css: every dark rule steps aside for Light; the Warden band's two match", () => {
  const css = read("options/options.css");
  const re = /@media \(prefers-color-scheme: dark\) \{\s*([^{]+)\{/g;
  let m;
  while ((m = re.exec(css))) {
    assert.match(m[1], /:not\(\[data-theme="light"\]\)/, `dark rule without the Light escape: ${m[1].trim()}`);
  }
  const media = css.indexOf("@media (prefers-color-scheme: dark)");
  const underSystem = blockAfter(css, ':root:not([data-theme="light"]) .warden', media);
  const forced = blockAfter(css, ':root[data-theme="dark"] .warden');
  assert.deepEqual(declarations(forced), declarations(underSystem));
  assert.ok(declarations(forced).length >= 5);
});

test("blocked.html: its two dark palettes are identical", () => {
  const html = read("pages/blocked.html");
  const { underSystem, forced } = darkPair(html, ":root");
  assert.deepEqual(declarations(forced), declarations(underSystem));
});

test("blocked.html: its copy of the tokens matches sieve-ui.css", () => {
  const html = read("pages/blocked.html");
  const css = read("common/sieve-ui.css");
  const pairs = [
    [tokenMap(blockAfter(html, ":root {")), tokenMap(blockAfter(css, ":root {"))],
    [tokenMap(darkPair(html, ":root").forced), tokenMap(darkPair(css, ":root").forced)],
  ];
  for (const [page, shared] of pairs) {
    for (const [name, value] of page) {
      if (!name.startsWith("--") || !shared.has(name)) continue; // page-only tokens such as --mark
      if (name.startsWith("--font-")) continue; // the page trims the font stacks on purpose
      assert.equal(value, shared.get(name), `${name} differs from sieve-ui.css`);
    }
  }
});

test("the Appearance tiles are drawn in the real palettes", () => {
  const options = read("options/options.css");
  const css = read("common/sieve-ui.css");
  const pairs = [
    [tokenMap(blockAfter(options, ".theme-mini.is-light {")), tokenMap(blockAfter(css, ":root {"))],
    [tokenMap(blockAfter(options, ".theme-mini.is-dark {")), tokenMap(darkPair(css, ":root").forced)],
  ];
  for (const [tile, shared] of pairs) {
    let compared = 0;
    for (const [name, value] of tile) {
      if (!shared.has(name)) continue; // the tile's own --tm-* helpers
      assert.equal(value, shared.get(name), `${name} differs from sieve-ui.css`);
      compared++;
    }
    assert.ok(compared >= 5, "expected the tile to redeclare the real tokens");
  }
});

test("the widgets drawn on websites write their dark palette both ways", () => {
  const sources = [
    ["common/guardian-prompt.js", ".sg-backdrop", "SG_DARK"],
    ["content/pause-overlay.js", ".backdrop", "DARK"],
    ["content/search-filter.js", "#${POPOVER_ID}", "POPOVER_DARK"],
  ];
  for (const [file, sel, constName] of sources) {
    const src = read(file);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(src, new RegExp(`${esc(sel)}:not\\(\\[data-theme="light"\\]\\)\\s*\\{\\s*\\$\\{${constName}\\}`), `${file}: system-dark rule`);
    assert.match(src, new RegExp(`${esc(sel)}\\[data-theme="dark"\\]\\s*\\{\\s*\\$\\{${constName}\\}`), `${file}: chosen-dark rule`);
    assert.doesNotMatch(src, new RegExp(`prefers-color-scheme: ?dark\\)\\s*\\{\\s*${esc(sel)}\\s*\\{`), `${file}: an old-style dark rule remains`);
  }
});

// --- common/theme.js -----------------------------------------------------

function fakeElement() {
  const attrs = new Map();
  return {
    attrs,
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
  };
}

// theme.js is a classic script, and Node caches a .js import as CommonJS by
// filename — a second import would not run it again. Each case runs the source
// itself, fresh, against the fakes below.
const THEME_SRC = fs.readFileSync(new URL("../common/theme.js", import.meta.url), "utf8");

// Load theme.js fresh into a fake page. `protocol` decides whether it is one of
// Sieve's pages or a website; `cached` is the localStorage copy; `stored` is
// what chrome.storage holds.
async function loadTheme({ protocol, cached = null, stored }) {
  const changeListeners = [];
  const cache = new Map(cached == null ? [] : [["sieve.uiTheme", cached]]);
  const written = [];
  const root = fakeElement();
  const define = (name, value) =>
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

  define("window", globalThis);
  define("location", { protocol });
  define("document", { documentElement: root });
  define("localStorage", {
    getItem: (k) => (cache.has(k) ? cache.get(k) : null),
    setItem: (k, v) => cache.set(k, String(v)),
  });
  define("chrome", {
    storage: {
      local: {
        get: async (key) => (stored === undefined ? {} : { [key]: stored }),
        set: async (patch) => written.push(patch),
      },
      onChanged: { addListener: (fn) => changeListeners.push(fn) },
    },
  });
  delete globalThis.SieveTheme;

  vm.runInThisContext(THEME_SRC, { filename: "common/theme.js" });
  const rootAtLoad = root.getAttribute("data-theme");
  await new Promise((r) => setTimeout(r, 0)); // let the storage read answer
  const change = (value) => changeListeners.forEach((fn) => fn({ uiTheme: { newValue: value } }, "local"));
  return { T: globalThis.SieveTheme, root, rootAtLoad, cache, written, change };
}

test("normalize: anything but the three choices is 'auto'", async () => {
  const { T } = await loadTheme({ protocol: "chrome-extension:", stored: undefined });
  assert.equal(T.normalize("dark"), "dark");
  assert.equal(T.normalize("light"), "light");
  assert.equal(T.normalize("auto"), "auto");
  assert.equal(T.normalize("Dark"), "auto");
  assert.equal(T.normalize(undefined), "auto");
});

test("Sieve's page: the cached choice is on <html> before storage answers", async () => {
  const { root, rootAtLoad } = await loadTheme({ protocol: "chrome-extension:", cached: "dark", stored: "dark" });
  assert.equal(rootAtLoad, "dark");
  assert.equal(root.getAttribute("data-theme"), "dark");
});

test("Sieve's page: storage corrects a stale cache, and the cache follows", async () => {
  const { root, rootAtLoad, cache, T } = await loadTheme({ protocol: "moz-extension:", cached: "dark", stored: "light" });
  assert.equal(rootAtLoad, "dark");
  assert.equal(root.getAttribute("data-theme"), "light");
  assert.equal(cache.get("sieve.uiTheme"), "light");
  assert.equal(T.get(), "light");
});

test("Sieve's page: 'auto' leaves no attribute, so the system decides", async () => {
  const { root, change } = await loadTheme({ protocol: "chrome-extension:", cached: "light", stored: "light" });
  assert.equal(root.getAttribute("data-theme"), "light");
  change("auto");
  assert.equal(root.getAttribute("data-theme"), null);
});

test("a choice made elsewhere arrives, and listeners hear it once", async () => {
  const { T, root, change } = await loadTheme({ protocol: "chrome-extension:", stored: undefined });
  const heard = [];
  T.onChange((t) => heard.push(t));
  change("dark");
  change("dark");
  assert.equal(root.getAttribute("data-theme"), "dark");
  assert.deepEqual(heard, ["dark"]);
});

test("save applies at once and stores the normalised value", async () => {
  const { T, root, written } = await loadTheme({ protocol: "chrome-extension:", stored: undefined });
  await T.save("light");
  assert.equal(root.getAttribute("data-theme"), "light");
  await T.save("nonsense");
  assert.equal(root.getAttribute("data-theme"), null);
  assert.deepEqual(written, [{ uiTheme: "light" }, { uiTheme: "auto" }]);
});

test("a website: theme.js never writes on the site's <html> or its storage", async () => {
  const { T, root, rootAtLoad, cache, change } = await loadTheme({ protocol: "https:", cached: "light", stored: "dark" });
  assert.equal(rootAtLoad, null);
  assert.equal(root.getAttribute("data-theme"), null);
  change("light");
  assert.equal(root.getAttribute("data-theme"), null);
  assert.equal(cache.get("sieve.uiTheme"), "light"); // untouched: it was the site's to begin with

  // Sieve's own widget there takes the choice on itself instead.
  change("dark");
  const widget = fakeElement();
  T.mark(widget);
  assert.equal(widget.getAttribute("data-theme"), "dark");
  change("auto");
  T.mark(widget);
  assert.equal(widget.getAttribute("data-theme"), null);
});

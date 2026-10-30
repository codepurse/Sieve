// test/pro-standins-test.mjs
// pro/ holds empty stand-ins for Sieve Pro, which is not open source
// (pro/README.md). These hold the line: the stand-ins stay empty, the private
// repository stays out of this one, and everything that loads a stand-in still
// works without what it stands in for.
//
//   node --test test/

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "pro");
const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");
const STANDINS = readdirSync(DIR).filter((f) => !f.endsWith(".md")).sort();

test("the stand-ins are the Pro files, and the README names each", () => {
  assert.deepEqual(STANDINS, [
    "coach.js",
    "designs.js",
    "features.js",
    "insights.js",
    "progress.js",
    "settings.js",
    "streaks.js",
    "urge.js",
    "voice.js",
  ]);
  const readme = read("pro", "README.md");
  for (const f of STANDINS) assert.ok(readme.includes("`" + f + "`"), `pro/README.md names ${f}`);
});

test("every stand-in is empty: comments, and features.js saying there are none", () => {
  for (const f of STANDINS) {
    const code = read("pro", f)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .trim();
    assert.equal(code, f === "features.js" ? "self.SieveProFeatures = null;" : "", f);
    assert.match(read("pro", f).split("\n", 1)[0], /an empty stand-in/, `${f} says what it is`);
  }
});

test("the private repository can never be committed here", () => {
  assert.match(read(".gitignore"), /^\/pro-private\/$/m);
  let tracked = "";
  try {
    tracked = execFileSync("git", ["ls-files", "--", "pro-private"], { cwd: ROOT, encoding: "utf8" });
  } catch {
    return; // not a git checkout (a source zip): nothing to hold
  }
  assert.equal(tracked.trim(), "", "files under pro-private/ are tracked");
});

test("everything that uses Pro checks it is there first", () => {
  // The block page: no SieveUrge, the plain notice.
  assert.match(read("pages", "blocked.js"), /if \(window\.SieveUrge\) \{/);
  // Your progress: no SieveProgress, a page that says Pro is not in this build.
  assert.match(read("pages", "progress.js"), /if \(!window\.SieveProgress\) \{\s*document\.getElementById\("pg-absent"\)\.hidden = false;/);
  // The popup: no streaks without Pro and pro/streaks.js; the seal line needs neither.
  const popup = read("popup", "popup.js");
  assert.match(popup, /if \(P && ST && \(await P\.isPro\(now\)\)\) \{/);
  assert.match(popup, /if \(S\) \{\s*const seal = await S\.check\(now\);/);
  // Settings: no features, no section at all.
  const options = read("options", "options.js");
  assert.match(options, /Array\.isArray\(window\.SieveProFeatures\)/);
  assert.match(options, /if \(!P \|\| !carried \|\| !window\.SieveProSettings\) \{[\s\S]{0,300}section\.remove\(\)/);
});

test("pages load Pro from pro/, never from anywhere a stand-in cannot replace", () => {
  const pages = {
    "options/options.html": ["../pro/features.js", "../pro/streaks.js", "../pro/coach.js", "../pro/settings.js"],
    "popup/popup.html": ["../pro/streaks.js"],
    "pages/blocked.html": ["../pro/streaks.js", "../pro/coach.js", "../pro/urge.js"],
  };
  for (const [page, scripts] of Object.entries(pages)) {
    const html = read(...page.split("/"));
    for (const s of scripts) assert.ok(html.includes(`<script src="${s}"></script>`), `${page} loads ${s}`);
  }
});

test("the Seal is a free protection: open source, loaded from common/, never from pro/", () => {
  for (const page of ["options/options.html", "popup/popup.html", "pages/blocked.html"]) {
    const html = read(...page.split("/"));
    assert.ok(html.includes('<script src="../common/seal.js"></script>'), `${page} loads common/seal.js`);
    assert.ok(!html.includes("pro/seal.js"), `${page} does not look for the Seal in pro/`);
  }
  for (const manifest of ["manifest.json", "manifest.firefox.json"]) {
    assert.ok(read(manifest).includes('"common/seal.js"'), `${manifest} injects common/seal.js with the pause screen`);
  }
  // Its settings live in the open-source page, in the Lock section, and never wait on Pro.
  const options = read("options", "options.js");
  assert.match(options, /^function setupSeal\(store\) \{/m);
  assert.match(options, /setupSeal\(store\);/);
  const html = read("options", "options.html");
  const lock = html.slice(html.indexOf('id="section-security"'), html.indexOf('id="section-advanced"'));
  assert.ok(lock.includes('id="seal-card"'), "the Seal is in Settings › Lock");
  const sealCard = lock.slice(lock.indexOf('id="seal-card"'), lock.indexOf('id="desktop-guard-card"'));
  assert.doesNotMatch(sealCard, /pro-(feature|control|note)/, "nothing in the Seal group waits on Pro");
});

test("the builds copy pro/ and hand it to build-pro.mjs", () => {
  for (const script of ["build-chrome.ps1", "build-firefox.ps1"]) {
    const ps = read(script);
    assert.match(ps, /"pro",/, `${script} copies pro/`);
    assert.match(ps, /build-pro\.mjs"\) --check \$ProKind/, `${script} checks before cleaning`);
    assert.match(ps, /build-pro\.mjs"\) \$OutDir \$ProKind/, `${script} swaps Pro in`);
    assert.match(ps, /\[switch\]\$OpenSource/, `${script} can build without Pro`);
  }
  const ci = read(".github", "workflows", "build.yml");
  assert.match(ci, /build-chrome\.ps1 -Zip -OpenSource/);
  assert.match(ci, /build-firefox\.ps1 -Zip -OpenSource/);
});

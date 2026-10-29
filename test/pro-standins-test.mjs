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
  assert.deepEqual(STANDINS, ["features.js", "seal.js", "settings.js", "streaks.js", "urge.js"]);
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
  // The Guardian gate: no SieveSeal, no seal.
  assert.match(read("common", "guardian-prompt.js"), /const S = window\.SieveSeal;\s*if \(!S\) return null;/);
  // The block page: no SieveUrge, the plain notice.
  assert.match(read("pages", "blocked.js"), /if \(window\.SieveUrge\) \{/);
  // The popup: no seal or streaks, no Pro lines.
  assert.match(read("popup", "popup.js"), /if \(!el \|\| !P \|\| !S \|\| !ST\) return;/);
  // Settings: no features, no section at all.
  const options = read("options", "options.js");
  assert.match(options, /Array\.isArray\(window\.SieveProFeatures\)/);
  assert.match(options, /if \(!P \|\| !carried \|\| !window\.SieveProSettings\) \{[\s\S]{0,300}section\.remove\(\)/);
});

test("pages load Pro from pro/, never from anywhere a stand-in cannot replace", () => {
  const pages = {
    "options/options.html": ["../pro/seal.js", "../pro/features.js", "../pro/streaks.js", "../pro/settings.js"],
    "popup/popup.html": ["../pro/seal.js", "../pro/streaks.js"],
    "pages/blocked.html": ["../pro/seal.js", "../pro/streaks.js", "../pro/urge.js"],
  };
  for (const [page, scripts] of Object.entries(pages)) {
    const html = read(...page.split("/"));
    for (const s of scripts) assert.ok(html.includes(`<script src="${s}"></script>`), `${page} loads ${s}`);
  }
  for (const manifest of ["manifest.json", "manifest.firefox.json"]) {
    assert.ok(read(manifest).includes('"pro/seal.js"'), `${manifest} injects pro/seal.js with the pause screen`);
  }
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

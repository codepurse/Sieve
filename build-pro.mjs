// build-pro.mjs
// Puts Sieve Pro into a build, or deliberately leaves it out. Called twice by
// build-chrome.ps1 and build-firefox.ps1:
//
//   node build-pro.mjs --check <kind>       before dist\ is cleaned, so a
//                                           refused package leaves it as it was
//   node build-pro.mjs <outDir> <kind>      after the runtime folders are copied
//
// <kind> is one of:
//   store        a package for the stores (-Zip): Pro must be included, from a
//                clean pro-private checkout, selling through Polar's live store
//   sandbox      a test package (-Zip -Sandbox): Pro included, any store mode;
//                never upload one
//   dev          a plain build: Pro included when pro-private is checked out
//   open-source  without Pro on purpose (-OpenSource): the stand-ins stay
//
// Sieve Pro is not open source. Its files live in a private repository checked
// out at pro-private\ (ignored by this one); pro\ here holds an empty stand-in
// of the same name for each (pro/README.md). Only those names are copied, so
// nothing else in the private repository (its tests, its notes) can reach a
// package.

import { readFileSync, readdirSync, existsSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = dirname(fileURLToPath(import.meta.url));
const STANDINS = join(ROOT, "pro");
const PRIVATE = join(ROOT, "pro-private");
const REAL = join(PRIVATE, "pro");
const KINDS = ["store", "sandbox", "dev", "open-source"];
// Every real file starts by saying it is Sieve Pro; that line is how a real
// file is told from a stand-in.
const MARK = "(Sieve Pro; pro-private/, not open source)";

function fail(message) {
  console.error(`build-pro: ${message}`);
  process.exit(1);
}

function standInNames() {
  return readdirSync(STANDINS).filter((f) => f.endsWith(".js")).sort();
}

// The licence settings, read the way the extension reads them.
function proConfig() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(join(ROOT, "common", "pro.js"), "utf8"), sandbox);
  return sandbox.window.SievePro.CONFIG;
}

function checkPrivate(kind) {
  if (!existsSync(REAL)) {
    if (kind === "store" || kind === "sandbox") {
      fail("a store package needs Sieve Pro. Check out the private repository at pro-private\\, or pass -OpenSource to package without it.");
    }
    return false;
  }
  const names = standInNames();
  for (const name of readdirSync(REAL).filter((f) => f.endsWith(".js"))) {
    if (!names.includes(name)) fail(`pro-private\\pro\\${name} has no stand-in in pro\\, so it would never ship. Add one.`);
  }
  for (const name of names) {
    const real = join(REAL, name);
    if (!existsSync(real)) fail(`pro-private\\pro is missing ${name}`);
    if (statSync(real).size === 0) fail(`pro-private\\pro\\${name} is empty`);
    const text = readFileSync(real, "utf8");
    if (!text.split("\n", 1)[0].includes(MARK)) fail(`pro-private\\pro\\${name} does not start by saying it is Sieve Pro (${MARK})`);
    if (text === readFileSync(join(STANDINS, name), "utf8")) fail(`pro-private\\pro\\${name} is only the stand-in`);
  }
  return true;
}

function checkStore() {
  const c = proConfig();
  const missing = [];
  if (c.mode !== "live") missing.push(`mode is "${c.mode}", not "live"`);
  if (!c.organizationId) missing.push("no organizationId");
  if (!Array.isArray(c.benefitIds) || c.benefitIds.length === 0) missing.push("no benefitIds");
  if (!c.checkoutUrl) missing.push("no checkoutUrl");
  if (missing.length) fail(`common/pro.js cannot sell Sieve Pro yet: ${missing.join(", ")}. Fill it in from the Polar dashboard, or pass -Sandbox for a test package.`);

  let dirty = "";
  try {
    dirty = execFileSync("git", ["status", "--porcelain", "--", "pro"], { cwd: PRIVATE, encoding: "utf8" });
  } catch {
    fail("pro-private\\ is not a git checkout, so this package could not be traced to a commit.");
  }
  if (dirty.trim()) fail(`pro-private\\pro has changes that are not committed:\n${dirty}`);
}

const args = process.argv.slice(2);

if (args[0] === "--check") {
  const kind = args[1];
  if (!KINDS.includes(kind)) fail(`unknown kind "${kind}"`);
  if (kind === "open-source") process.exit(0);
  checkPrivate(kind);
  if (kind === "store") checkStore();
  process.exit(0);
}

const [outDir, kind] = args;
if (!outDir || !KINDS.includes(kind)) fail("usage: node build-pro.mjs <outDir> <store|sandbox|dev|open-source>");
const outPro = join(outDir, "pro");
if (!existsSync(outPro)) fail(`${outPro} is missing: is "pro" in the build's runtime folders?`);
rmSync(join(outPro, "README.md"), { force: true });

if (kind === "open-source" || !checkPrivate(kind)) {
  console.log("Sieve Pro: not included (the stand-ins stay)");
  process.exit(0);
}
for (const name of standInNames()) copyFileSync(join(REAL, name), join(outPro, name));
console.log(`Sieve Pro: included (${standInNames().join(", ")})`);

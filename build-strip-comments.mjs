// build-strip-comments.mjs
// Removes comments from the .js files in a built output folder, in place.
//
//   node build-strip-comments.mjs dist/chrome
//
// WHY THIS EXISTS
//
// Sieve's source is unusually heavily commented — 26% of the shipped JavaScript,
// 441 KB, is prose explaining why things are the way they are. That is a
// deliberate and good property of the SOURCE. It is dead weight in the PACKAGE:
// every user downloads it on install and on every update, every frame that runs
// a content script holds it in memory, and the five scripts that run in every
// iframe are between 29% and 45% comment by weight.
//
// WHY NOT JUST MINIFY
//
// esbuild's --minify-whitespace would do this in one line, and it also collapses
// the code onto a handful of enormous lines. Mozilla's add-on policies treat
// minified code as requiring a source-code submission alongside the package, and
// a reviewer opening a Sieve file should be able to read it. So this removes
// comments and nothing else: every statement stays on its own line, in the same
// order, with its indentation. Only the prose goes.
//
// HOW IT IS KEPT HONEST
//
// A hand-written comment stripper has one classic way to corrupt a file: it
// mistakes a regex literal for a division and eats the rest of the line, or vice
// versa. This codebase is full of regex literals, so that is not a hypothetical.
//
// Rather than trust the tokenizer, every file is CHECKED: esbuild minifies the
// original and the stripped version, and they must come out byte-identical.
// Minification erases comments and formatting, so if the two agree, the strip
// provably changed nothing but comments. A file that fails the check is copied
// through untouched rather than shipped broken — the build still succeeds, it
// just carries that file's comments.

import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

// --- the stripper -----------------------------------------------------------

// True if a `/` at this point starts a regex literal rather than a division.
// Decided by the last meaningful token before it, which is the standard way:
// after a value (identifier, literal, `)`, `]`) a slash is division; after an
// operator, a punctuator or a keyword, it opens a regex.
const REGEX_PRECEDING_KEYWORDS = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
  "throw", "case", "do", "else", "yield", "await",
]);

function regexAllowedAt(out) {
  // Walk back over whitespace to the last significant character.
  let i = out.length - 1;
  while (i >= 0 && /\s/.test(out[i])) i--;
  if (i < 0) return true; // start of file
  const ch = out[i];
  if (")]".includes(ch)) return false; // end of a call/index — division
  if (ch === "}") return true; // end of a block — a regex may follow
  if (/[A-Za-z0-9_$]/.test(ch)) {
    // An identifier or number. A keyword may allow a regex; a value does not.
    let j = i;
    while (j >= 0 && /[A-Za-z0-9_$]/.test(out[j])) j--;
    const word = out.slice(j + 1, i + 1);
    if (/^\d/.test(word)) return false; // a number — division
    return REGEX_PRECEDING_KEYWORDS.has(word);
  }
  return true; // an operator or punctuator
}

/**
 * Remove // and comments from JavaScript source, preserving every
 * line break so line numbers and layout survive. Lines left blank by the
 * removal are dropped, but only when the whole line was a comment.
 */
export function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];

    // --- strings and template literals: copied verbatim ---------------------
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (ch === "`") {
      out += ch;
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        // A ${ ... } hole can hold anything, including a slash. Copy to the
        // matching brace rather than trying to parse it.
        if (src[i] === "$" && src[i + 1] === "{") {
          let depth = 0;
          do {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") depth--;
            out += src[i];
            i++;
          } while (i < n && depth > 0);
          continue;
        }
        out += src[i];
        if (src[i] === "`") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // --- comments ----------------------------------------------------------
    if (ch === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue; // the newline itself is copied on the next pass
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        // Keep the line breaks a block comment spanned, so nothing below it moves.
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }

    // --- regex literals: copied verbatim, including any / inside a class ----
    if (ch === "/" && regexAllowedAt(out)) {
      out += ch;
      i++;
      let inClass = false;
      while (i < n) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) {
          out += src[i];
          i++;
          break;
        } else if (src[i] === "\n") {
          break; // unterminated — not a regex after all; let the check catch it
        }
        out += src[i];
        i++;
      }
      continue;
    }

    out += ch;
    i++;
  }

  // Drop lines that are now empty only because a comment was removed, but keep
  // blank lines the author wrote (a run of two or more collapses to one).
  const lines = out.split("\n");
  const kept = [];
  let pendingBlank = false;
  for (const line of lines) {
    if (line.trim() === "") {
      pendingBlank = true;
      continue;
    }
    if (pendingBlank && kept.length > 0) kept.push("");
    pendingBlank = false;
    kept.push(line.replace(/[ \t]+$/, ""));
  }
  return kept.join("\n") + "\n";
}

// --- the equivalence check --------------------------------------------------

function normalised(code, file) {
  return esbuild.transformSync(code, {
    minify: true,
    loader: "js",
    // Modules and classic scripts both parse under this; esbuild does not
    // rewrite import/export unless asked to change format.
    format: undefined,
    sourcefile: file,
  }).code;
}

function stripFileSafely(file) {
  const original = fs.readFileSync(file, "utf8");
  let stripped;
  try {
    stripped = stripComments(original);
  } catch (err) {
    return { ok: false, reason: "stripper threw: " + err.message };
  }
  let a, b;
  try {
    a = normalised(original, file);
  } catch (err) {
    // The original does not parse on its own — a fragment, or a syntax esbuild
    // rejects. Leave it exactly as it is.
    return { ok: false, reason: "original did not parse" };
  }
  try {
    b = normalised(stripped, file);
  } catch (err) {
    return { ok: false, reason: "stripped did not parse" };
  }
  if (a !== b) return { ok: false, reason: "stripped code differs semantically" };
  fs.writeFileSync(file, stripped, "utf8");
  return { ok: true, saved: original.length - stripped.length };
}

// --- walk -------------------------------------------------------------------

function* jsFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(p);
    else if (entry.name.endsWith(".js")) yield p;
  }
}

const target = process.argv[2];
if (!target) {
  console.error("usage: node build-strip-comments.mjs <built-folder>");
  process.exit(1);
}
if (!fs.existsSync(target)) {
  console.error("no such folder: " + target);
  process.exit(1);
}

let stripped = 0;
let skipped = 0;
let saved = 0;
const skipList = [];
for (const file of jsFiles(target)) {
  const result = stripFileSafely(file);
  if (result.ok) {
    stripped++;
    saved += result.saved;
  } else {
    skipped++;
    skipList.push(path.relative(target, file) + " (" + result.reason + ")");
  }
}

console.log(`==> Comments stripped from ${stripped} file(s), ${(saved / 1024).toFixed(0)} KB removed`);
if (skipped) {
  console.log(`==> ${skipped} file(s) left with comments, unchanged:`);
  for (const s of skipList) console.log("      " + s);
}

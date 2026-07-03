// build.mjs — Sieve's esbuild build for the OPTIONAL Layer-2 toxicity model.
//
// What this does:
//   Takes src/toxic-model.entry.js (which imports the TensorFlow.js library and
//   the @tensorflow-models/toxicity wrapper) and bundles every dependency into a
//   single self-contained browser script: content/toxic-model.bundle.js.
//
// Why it exists:
//   TF.js ships as npm modules with hundreds of internal imports that a browser
//   content script cannot resolve, and Manifest V3 forbids loading remote code.
//   So we flatten it all into one local file the extension can load itself.
//
// What it does NOT do:
//   - It does not bundle the ~25MB model WEIGHTS. Those are downloaded on demand
//     and cached at runtime (Steps 6-7). This bundle is just the library code.
//   - It does not touch any Phase 1-3 / Layer-1 file. Those are plain JS loaded
//     directly by the manifest and are never run through esbuild.
//
// Usage:
//   npm install        (once)
//   npm run build      (produces content/toxic-model.bundle.js)
//   npm run build:watch (rebuild automatically while developing Step 7)

import * as esbuild from "esbuild";

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/toxic-model.entry.js"],
  outfile: "content/toxic-model.bundle.js",
  bundle: true,
  format: "iife", // a classic browser script, not an ES module
  platform: "browser",
  target: ["chrome109", "firefox109"],
  minify: true,
  legalComments: "none",
  // TF.js checks this; "production" trims dev-only warnings and code paths.
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("[Sieve] esbuild is watching for changes…");
} else {
  await esbuild.build(options);
  console.log("[Sieve] Build complete → content/toxic-model.bundle.js");
}

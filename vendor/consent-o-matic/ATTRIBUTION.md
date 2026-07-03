# Consent-O-Matic — vendored rule engine

This folder contains code vendored **verbatim** from the Consent-O-Matic project
and used by Sieve's "Auto-reject non-essential cookies" feature (an opt-in
sub-feature of the Dark Pattern Blocker).

- **Upstream repo:** https://github.com/cavi-au/Consent-O-Matic
- **License:** MIT (see `LICENSE` in this folder — preserved unmodified)
- **Copyright:** © 2019–2022 Janus Bager Kristensen and Rolf Bagge,
  CAVI – Center for Advanced Visualization and Interaction, Aarhus University
- **Vendored at commit:** `8ca8500d26434c586039e126ad091e1bfccd205d` (2025-11-07)

## What was vendored

Only the self-contained **rule-execution engine** (`Extension/*.js` below) was
copied. The 7 files import only each other — none of Consent-O-Matic's
standalone-extension glue (its own `contentScript.js`, `background.js`,
`GDPRConfig.js`, `Language.js`, options/popup UI) was brought in.

```
Extension/ConsentEngine.js   orchestrator: detect CMP, run method sequence
Extension/CMP.js             one CMP: its detectors + methods
Extension/Detector.js        runs presentMatcher / showingMatcher
Extension/Matcher.js         css / checkbox / url / onoff matchers
Extension/Consent.js         one consent category toggle
Extension/Action.js          click / list / consent / hide / slide / ... actions
Extension/Tools.js           DOM find() incl. shadow-DOM + text/style filters
```

These files are **unmodified**. Do not edit them here — all Sieve-specific glue
lives outside this folder:

- `src/cookie-engine.entry.js` — Sieve entry wrapper (sets engine config
  statics to safe defaults and exposes the engine to Sieve's content scripts).
- `build-cookie-engine.mjs` — build step that (a) flattens the ES-module engine
  into the classic content-script bundle `content/cookie-engine.bundle.js`
  (Manifest V3 content scripts cannot be ES modules), and (b) compiles the rule
  database (below) into `data/cookie-rules.json`.

## What was vendored — rule database

The rule database is also part of the same repo and is therefore MIT-licensed
too. Vendored verbatim:

```
rules/*.json        one JSON file per CMP (204 files, mirrors upstream exactly)
rules-list.json     upstream index: which rule files are active, and in what order
```

At **build time**, `build-cookie-engine.mjs` reads `rules-list.json`, loads each
referenced rule file in order (de-duplicating repeats), strips each file's
`$schema` key, and merges them with `Object.assign` (later files win on key
clashes — same as upstream's engine). The result is written minified to
`data/cookie-rules.json` (~202 CMPs). That single packaged file is what Sieve
loads at runtime, so the feature works fully offline and never fetches from a
third party.

Rule files present in `rules/` but not listed in `rules-list.json` are skipped
on purpose, matching upstream (currently only `onetrust_hidden.json`).

## How to update from upstream

1. `git clone --depth 1 https://github.com/cavi-au/Consent-O-Matic`
2. Copy the 7 engine files listed above into `Extension/`, overwriting.
3. Copy the whole `rules/` folder and `rules-list.json` over this folder's copies.
4. Copy `LICENSE` over this folder's `LICENSE`.
5. Update the commit hash in this file.
6. Re-run the build: `node build-cookie-engine.mjs`
   (rebuilds `content/cookie-engine.bundle.js` **and** `data/cookie-rules.json`).
7. Re-run the Step 6 test pass (OneTrust / Cookiebot / Quantcast).

If upstream adds a new engine file or a new relative import, esbuild will fail
to resolve it — that's the signal a new file needs vendoring too.

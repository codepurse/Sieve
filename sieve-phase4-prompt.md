# Sieve — Phase 4 Prompt & TODO
**Phase 4: AI Features (the hardest phase)**
**Modules: Toxic Comment Hider (4A) + Graphic Content Filter (4B)**

---

## How to use this file

1. Copy the **PROMPT** section below into Claude / Claude Code
2. Make sure your `sieve-phases.md` is also attached or in the project
3. Work through the TODO checklist — tick items off as each is confirmed
4. Build Module 4A completely before starting Module 4B

> ⚠️ **This is the hardest phase.** It introduces optional machine-learning
> models that run in the browser. The big new challenges are: keeping the
> default install tiny, downloading models only when the user opts in,
> caching them, and running inference without freezing the page.

---

## KEY ARCHITECTURE DECISION — layered detection (read this first)

After comparing options, the toxic comment hider uses a **two-layer** design,
NOT a single bundled model:

**Layer 1 — Word list + regex (ALWAYS ON, default, ships in the extension)**
- Tiny (under ~1MB), runs in microseconds, no download
- Catches obvious profanity, slurs, and insults instantly
- Handles leetspeak / bypass attempts (f_u_c_k, st0pid) via character mapping
- This is the DEFAULT experience — works the moment Sieve is installed
- Word list source: **coffee-and-fun/google-profanity-words**
  (actively maintained, multilingual, TypeScript-ready, zero deps, ~962 EN words)

**Layer 2 — TF.js toxicity model (OPTIONAL, user downloads in options page)**
- ~25MB model, downloaded ONLY when the user enables "smart detection"
- Catches subtle, context-based toxicity that has NO banned words
  (e.g. "people like you shouldn't be allowed to speak")
- Uses @tensorflow-models/toxicity (runs 100% in browser, 7 categories)
- After download, cached so it never re-downloads
- If never enabled, Sieve still works at Layer-1 level — nothing breaks

**Why this design:** keeps the install tiny and fast, respects the user's
bandwidth/storage, degrades gracefully, and matches how good extensions handle
large models. Accuracy: Layer 1 alone ~60-75% on profanity; Layer 1 + Layer 2
lands in the low-to-mid 80s% on general toxicity. Treat it as harm reduction,
not a perfect wall — determined users can still evade any filter.

**Future optimization (NOT now):** Tiny-Toxic-Detector (~8-10MB, custom
architecture) could later replace the TF.js model to shrink the optional
download, but it needs custom ONNX conversion that may not succeed. Do not
block Phase 4 on it. Ship with TF.js first; treat Tiny-Toxic-Detector as a
time-boxed experiment afterward.

---

## IMPORTANT — the gore reality check (for Module 4B)

There is **no mature, browser-ready, open-source gore classifier.** Most
violence-detection models on GitHub are built for video surveillance and use
heavy architectures (RNN, LSTM, YOLO, I3D) that don't run as a lightweight
in-browser model.

`nsfwjs` is the only mature browser model — but it detects **nudity, not gore.**

So Module 4B is built **honestly around this limitation**, using a layered
approach instead of pretending a perfect gore detector exists:

1. **Domain blocklist** — known shock/gore sites blocked outright (reuses your
   Phase 1 gambling-blocker technique — you already know how to do this).
   This is the most reliable layer, so build it first.
2. **nsfwjs "disturbing content" gate** — OPTIONAL download (like Layer 2 above),
   catches graphic/explicit imagery broadly (not gore-specific, but catches a lot)
3. **User-reported list** — let users flag images; build a community blocklist
   over time
4. **(Future / optional)** — train a custom gore classifier on top of MobileNet
   if you later gather a labeled dataset. Phase 5+ research task, NOT this build.

Set expectations in the UI: call it a "Graphic content filter (beta)" and be
honest that it catches *most* but not *all* graphic imagery.

---

## THE PROMPT (copy this)

```
Phases 1, 2, and 3 are complete, tested, and working. Do not touch any
existing code unless absolutely required — and if so, tell me exactly what
you are changing and why.

Now we are building Phase 4 — AI Features.
Refer to sieve-phases.md for the full spec.

Phase 4 has two modules:
- Module 4A: Toxic Comment Hider (layered: word list + optional TF.js model)
- Module 4B: Graphic Content Filter (domain blocklist + optional nsfwjs model)

CRITICAL ARCHITECTURE YOU MUST RESPECT:
- Detection is LAYERED. A tiny word-list/regex filter is the always-on default
  and ships inside the extension. Larger ML models are OPTIONAL downloads the
  user enables in the options page — never bundled, never forced.
- All detection runs 100% locally in the browser. No comment text or image is
  ever sent to any server. This is a core privacy promise — never break it.
- When a model IS enabled, it must be downloaded once, cached (Cache API or
  IndexedDB), and reused. Never reload it per page.
- The extension must work fully at Layer-1 (word list) level even if the user
  never downloads any model. Models only ADD capability.

RULES:
1. Build Module 4A completely first. Do not start 4B until I confirm 4A works.
2. Build one step at a time. Wait for my "confirmed" before each next step.
3. After writing any code, explain it in plain English AND tell me the
   performance implications.
4. Inference must NEVER freeze the page. Use batching, requestIdleCallback,
   and IntersectionObserver so work happens off the critical path.
5. For the optional model we need a build tool (esbuild preferred) to bundle
   the TF.js library. Set this up cleanly and explain what you're adding.
6. Self-host the model files (don't load from a remote CDN at runtime). The
   model download should pull from your own hosting or be packaged so the
   extension fetches + caches it on demand.
7. If anything is unclear, ask before assuming.

=== MODULE 4A — TOXIC COMMENT HIDER ===

--- LAYER 1: word list + regex (always-on default, build this FIRST) ---

Step 1: data/profanity-list.json
- Use the coffee-and-fun/google-profanity-words list as the base
  (https://github.com/coffee-and-fun/google-profanity-words)
- Store as a clean array (or Set source) of words
- Add a small custom-supplement file (data/profanity-custom.json) for terms
  I can add myself over time, so we are not locked to one repo's updates

Step 2: content/profanity-filter.js
- Find comment text on supported sites (YouTube, Reddit, X/Twitter, Disqus)
- Match words using WHOLE-WORD matching (word boundaries) to avoid the
  "Scunthorpe problem" (innocent words containing banned substrings)
- Add leetspeak / bypass detection via a character map
  (a -> @,4 ; o -> 0 ; i -> 1,l ; s -> $,5 ; etc.)
- Keep an exceptions list so known false positives never trip
- This layer flags/collapses comments that contain banned words

Step 3: content/comment-collapse.js
- Collapse flagged comments, show a small reason label
- "Show anyway" button to expand (never delete — always reversible)

Step 4: popup + options (Layer 1 controls)
- Popup: master toggle for the toxic comment hider + per-site toggle
- Options page: sensitivity (Strict / Moderate / Light), custom word add/remove
- Show count: "Hid 12 comments on this page"

--- LAYER 2: optional TF.js toxicity model (build AFTER Layer 1 works) ---

Step 5: Build tooling
- Add esbuild and configure it to bundle the content script that uses TF.js
- Keep existing Phase 1-3 plain JS files working as-is
- Explain the build command (e.g. npm run build)

Step 6: Optional model download (options page)
- Add a toggle in the options page:
  "Enable smart toxicity detection (downloads a ~25MB model, one time)"
- When enabled: fetch the @tensorflow-models/toxicity model, show download
  progress ("Downloading 40%..."), then "Model ready"
- Cache the model (Cache API or IndexedDB) so it never re-downloads
- Handle failure: if download fails, fall back to Layer 1 and show a clear
  message — never break

Step 7: content/toxic-model.js (only active if model is enabled)
- Load the cached model ONCE (background/offscreen), reuse everywhere
- Run ONLY on comments that passed Layer 1 clean (Layer 1 already caught the
  obvious ones — the model handles the subtle, word-free cases)
- BATCH comments (10-20 at a time) before model.classify()
- Use IntersectionObserver so only near-viewport comments are classified
- Use MutationObserver for lazy-loaded comments (YouTube, infinite scroll)
- Collapse model-flagged comments with a reason label, same as Layer 1

Step 8: Performance pass
- Confirm model loads once and is reused (not per page)
- Confirm Layer 1 runs first and the model only runs on what's left
- Confirm batching + IntersectionObserver are working
- Confirm the page stays responsive on a busy comment section
- Confirm everything still works with the model DISABLED (Layer 1 only)

After Step 8, I will test Module 4A on real YouTube/Reddit/X threads, both
with the model OFF (Layer 1 only) and ON (both layers). Only after I confirm
it works AND performance is acceptable do we start Module 4B.

=== MODULE 4B — GRAPHIC CONTENT FILTER (beta) ===
(Do NOT start this until I confirm 4A is working)

Step 1: data/gore-domains.json
- Starter domain blocklist of known shock/gore sites
- Reuse the Phase 1 declarativeNetRequest approach to block these outright
- This is the most reliable layer — build it first, it needs no model

Step 2: Optional nsfwjs model download (options page)
- Same pattern as Layer 2 above: a toggle that downloads the ~7MB nsfwjs model
  on demand, with progress UI and caching
- If never enabled, the domain blocklist still works on its own

Step 3: content/graphic-filter.js (only active if nsfwjs is enabled)
- Find <img> elements and video poster/thumbnail images
- ONLY classify images above a minimum size (e.g. 100x100px) — skip icons
- Use IntersectionObserver — only classify images entering the viewport
- Use the nsfwjs result as a "disturbing content" gate

Step 4: content/image-blur.js
- Blur flagged images with CSS: filter: blur(20px)
- Overlay a small "Hidden by Sieve — click to reveal" label (reversible)

Step 5: User reporting (community layer)
- Right-click context menu item: "Report graphic image to Sieve"
- Store reported URLs/domains locally

Step 6: popup + options (update)
- "Graphic Content Filter (beta)" section
- Honest copy: "Catches most graphic imagery, not all"
- Master toggle + optional model download + sensitivity
- Show count: "Blurred 4 images on this page"

Step 7: Performance pass
- nsfwjs loads once and is reused
- Only visible, large-enough images get classified
- Scrolling an image-heavy page stays smooth

After each step:
- Show me the code
- Explain it in plain English
- Tell me the performance impact
- Wait for my "confirmed"

Start with Module 4A, Layer 1, Step 1 only.
```

---

## TODO CHECKLIST

### Module 4A — Layer 1 (word list, always-on default)
- [ ] Step 1: `data/profanity-list.json` (coffee-and-fun base) + custom supplement
- [ ] Step 2: `content/profanity-filter.js` — whole-word match + leetspeak + exceptions
- [ ] Step 3: `content/comment-collapse.js` — collapse + reason + show anyway
- [ ] Step 4: popup + options — toggles, sensitivity, custom words, count
- [ ] **TEST Layer 1 on real YouTube / Reddit / X threads (model OFF)**
- [ ] Confirm obvious profanity is caught instantly
- [ ] Confirm no false positives on innocent words (Scunthorpe test)
- [ ] Confirm leetspeak variants are caught (f_u_c_k, st0pid)

### Module 4A — Layer 2 (optional TF.js model)
- [ ] Step 5: esbuild set up, build command works, Phase 1-3 files untouched
- [ ] Step 6: options-page model download — toggle, progress UI, caching, fallback
- [ ] Step 7: `content/toxic-model.js` — load once, run only on Layer-1-clean comments, batch, IntersectionObserver
- [ ] Step 8: performance pass — model reused, layered correctly, page smooth
- [ ] **TEST Layer 2 (model ON)**
- [ ] Confirm model downloads once and caches (doesn't re-download)
- [ ] Confirm subtle/word-free toxicity is now caught
- [ ] Confirm disabling the model cleanly falls back to Layer 1
- [ ] Confirm page stays responsive with the model active

### Module 4B — Graphic Content Filter (beta)
- [ ] Step 1: `data/gore-domains.json` — domain blocklist (most reliable layer)
- [ ] Step 2: optional nsfwjs download — toggle, progress, caching
- [ ] Step 3: `content/graphic-filter.js` — visible + large images only
- [ ] Step 4: `content/image-blur.js` — blur + click to reveal
- [ ] Step 5: user reporting via right-click context menu
- [ ] Step 6: popup + options — beta labeling, honest copy, toggle, count
- [ ] Step 7: performance pass — model reused, only visible images, smooth scroll
- [ ] **TEST 4B**
- [ ] Confirm known gore domains are blocked outright (no model needed)
- [ ] Confirm graphic images get blurred when model enabled
- [ ] Confirm click-to-reveal works
- [ ] Confirm off-screen images are NOT classified (performance)

### Phase 4 Final Checks
- [ ] All Phases 1-3 features still work (nothing broke)
- [ ] Default install is tiny (no model bundled — word list only)
- [ ] Models download only on opt-in, cache correctly, and fall back cleanly
- [ ] No comment text or image ever leaves the device (verify in network tab)
- [ ] Page performance is acceptable on comment/image-heavy sites
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Bump version to 1.3.0 in manifest.json
- [ ] Ready to ship Phase 4

---

## The layered detection logic (the heart of Module 4A)

```
For each comment:
  1. Layer 1 (always): does it contain a banned word (whole-word, leetspeak-aware)?
        YES -> collapse it (reason: "language")        [done, no model needed]
        NO  -> continue
  2. Layer 2 (only if model enabled): does the model flag it as toxic?
        YES -> collapse it (reason: e.g. "insult")
        NO  -> leave it visible
```

Layer 1 catches the cheap/obvious cases for free, so the model (when enabled)
runs on far fewer comments — that's what keeps it fast.

---

## Performance rules

1. **Layer 1 first, always.** It's free; let it catch the obvious stuff so the
   model runs on the minimum number of comments.
2. **Load any model ONCE.** Load in background/offscreen, reuse everywhere.
3. **Only classify what's visible.** IntersectionObserver for off-screen content.
4. **Batch text classification.** 10-20 comments per model.classify() call.
5. **Skip tiny images.** Don't run nsfwjs on icons/avatars (min size).
6. **Stay off the critical path.** requestIdleCallback where possible.
7. **Cache model files.** After first download, never re-download.

---

## Word list sourcing (Layer 1)

- **Base:** coffee-and-fun/google-profanity-words — actively maintained,
  multilingual (EN/ES/FR/IE/AR/ZH), zero deps, TypeScript-ready, ~962 EN words
- **Supplement:** keep your own `data/profanity-custom.json` for new slang /
  terms you want to add, so you are never locked to one repo's update cadence
- **Optional extra coverage later:** merge in LDNOOBW or dsojevic/profanity-list
  (dsojevic adds severity tiers + exceptions but is older; merge selectively)
- Word lists are just arrays of strings — combining several is cheap and keeps
  you independent of any single source going stale

---

## Privacy verification (before shipping)

DevTools -> Network tab -> browse a comment-heavy and image-heavy page with
models enabled. Confirm: **zero outbound requests carrying comment text or
image data.** Everything stays local. Verify it — don't assume it.

---

## Honest messaging

- Toxic comment hider: be clear that the default catches obvious bad language,
  and "smart detection" (the optional model) adds subtler toxicity catching.
- Graphic content filter: call it "(beta)", say it catches most not all, and
  note it works best combined with the domain blocklist.

Being honest builds trust and avoids overpromising on features that, by the
nature of available open-source tech, can't be perfect yet.

---

## When Phase 4 is done

All 8 Sieve modules are live: content blocking, digital wellbeing, dark pattern
removal, and AI-powered filtering. After that, **Phase 5 — Polish & Expand**
is ongoing: settings sync, parental PIN lock, usage reports, Edge support,
community blocklists, the cross-promotion loop with your porn blocker, and
(optionally) the Tiny-Toxic-Detector experiment to shrink the optional model.

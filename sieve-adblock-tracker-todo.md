# Sieve — Ad & Tracker Blocker: Plan & TODO

**Target release:** 1.4.0, ~**22 September 2026** (1.3.0 uploaded 1 September)
**New section:** "Ad & Trackers", its own sidebar entry, shipped with a **BETA** banner
**Status:** **BUILT — in `main`, unreleased.** Every checklist below is done.
What remains before 1.4.0 ships is the part no checklist can do for you: the
week of real browsing in Week 3, and the store upload.

---

## How to use this file

This started as a plan to hand to Claude Code and is now mostly a **record**.
Read it that way: the checklists say what was decided and where it ended up, and
the notes under them say where the plan was wrong. Nothing here needs pasting
into anything any more.

The parts still worth acting on are marked **OPEN** — there are two, both in
Week 3, and both are somebody sitting in front of a browser rather than code.

> ⚠️ **The main failure mode of this release was scope creep, and it happened.**
> The warning below was written before anything was built. It was right that the
> risk was real and wrong about the outcome: three of the four things listed as
> out of scope shipped anyway. See "Explicitly OUT of scope" near the bottom,
> which now carries what actually became of each one. Kept as written because a
> prediction is only useful if you can still read what it said.

---

## Scope decision (read this first)

This release ships a **tracker & ad-network DOMAIN blocker**, not an adblocker.

That wording is deliberate and it needs to survive into the UI, the store
listing and the release notes. A domain blocker kills most third-party ad and
tracker traffic. It does **not** kill YouTube ads, anti-adblock walls, or ads a
site injects from its own domain. Promising "adblock" and delivering this earns
one-star reviews from people whose YouTube stayed loud.

Ship the cheap, high-value 80% first, behind a BETA banner, and learn how much
breakage it causes before committing to the expensive half.

### Feasibility, by scope

| Scope | Rating | This release? |
|---|---|---|
| Ad/tracker domain tier | 9/10 | **yes** |
| + cosmetic filtering (hide leftover ad slots) | 8/10 | no — release after |
| + scriptlets (anti-adblock, first-party ads) | 6/10 | no |
| YouTube ads specifically | 4/10 | no |
| Full uBlock Origin parity | 2/10 | never (see below) |

---

## What MV3 actually allows (corrected 2026-09-01)

An earlier read of this was too pessimistic. Verified against the uBO Lite and
AdGuard sources:

**Works under MV3:**
- DNR blocking by domain — what this release uses.
- `$redirect` to a neutered stub, via DNR redirect to a
  `web_accessible_resources` path. Sieve already does this shape in
  `rules/gambling-rules.json` (`redirect.extensionPath`).
- **Scriptlet injection.** uBO Lite pre-compiles scriptlets at build time and
  registers them with `chrome.scripting.registerContentScripts`. Declarative
  *because a suspended service worker cannot inject in time*, not because
  injection is forbidden.
- **Cosmetic filtering**, specific and generic. uBOL gates these behind its
  Optimal/Complete permission modes.

**Genuinely impossible:**
- `$redirect-rule=` (redirect only *if* blocked) — DNR has no such concept.
- HTML / response-body filtering — no access to response bodies.
- Real-time request decisions — `webRequestBlocking` is gone.

### Why Sieve starts ahead of uBO Lite

uBOL's real handicap is not the API — it ships with **no host permissions**, so
most of its users never leave DNR-only "Basic" mode. Sieve's manifest already
has:

```
host_permissions : <all_urls>
permissions      : scripting, declarativeNetRequest, unlimitedStorage, storage, …
content_scripts  : 11 entries, most matching <all_urls>
web_accessible_resources : already declared with <all_urls> matches
```

That is what uBOL calls **Complete** mode, granted at install. The real cost of
going further is therefore the **build pipeline** (per-hostname precompiled
scriptlet + CSS bundles, i.e. uBOL's `make-rulesets.js`) plus weekly breakage
triage — not the platform. AdGuard beats uBOL on Chrome purely by spending more
engineering on DNR optimisation. That is the game, and it is not a three-week
game.

---

## THE PROMPT (historical — this is what was handed over)

> Kept as a record of what the work was actually asked for, which is worth
> having when reading the decisions above. **Do not paste this in now:** it
> opens by saying the feature does not exist yet, and it would send anyone who
> ran it off rebuilding something that is already in `main`.

```
Sieve 1.3.0 is shipped and live in both stores. Everything currently in the
repo works — do not touch existing code unless it is genuinely required, and
if it is, tell me exactly what you are changing and why before you do it.

We are now building the 1.4.0 feature: an Ad & Tracker blocker, in its own
new settings section, shipped with a BETA banner.

Read sieve-adblock-tracker-todo.md and treat it as the spec. Follow its
week-by-week checklists in order.

SCOPE — THE MOST IMPORTANT RULE:
This release ships a tracker & ad-network DOMAIN blocker. Nothing else.
Cosmetic filtering, scriptlet injection, $redirect stubs, anti-adblock defeat
and YouTube ads are ALL out of scope for 1.4.0, even though MV3 permits some
of them. If you think a task needs one of those, stop and tell me instead of
building it. Do not describe the feature as an "adblocker" anywhere a user can
read it — in the UI, the store listing, or the release notes.

ARCHITECTURE YOU MUST RESPECT:
- Mirror background/safety-shield.js. Do NOT invent a parallel blocking
  system. Same shape: list -> IndexedDB via background/list-store.js
  (getBigList/setBigList) -> chunk at DOMAINS_PER_RULE = 10000 -> pack into
  requestDomains rules -> updateDynamicRules.
- Take DNR id band 180000-189999 for trackers, and 190000-199999 only if we
  split into two toggles. Every band below 180000 is already allocated; the
  table in the todo file lists them. Never reach into another band.
- Trackers and ad networks are SUB-RESOURCES, not pages the user navigates to.
  So the action is `block` on subresource types. Only a main_frame hit
  redirects to pages/blocked.html. Do not redirect subresources — that breaks
  pages harder than blocking them. This differs from every existing tier, so
  do not copy the redirect behaviour blindly.
- The toggle(s) are opt-in, default OFF, in the existing "ss..." key namespace.
- The Allowlist MUST apply to this tier. Non-negotiable.
- Turning the tier OFF goes through the Guardian PIN gate (it weakens
  protection). Turning it ON is free.
- Store only small keys in chrome.storage.local. The domain list belongs in
  IndexedDB.

RULES:
1. Before writing any code, resolve the EasyPrivacy licence question
   (GPLv3 / CC BY-SA 3.0): what attribution do the store listing and repo
   need, and does it oblige anything about Sieve's own licence? Report back
   and wait for my go-ahead. This is a blocker, not a footnote.
2. Build one step at a time. Wait for my "confirmed" before each next step.
3. After writing any code, explain it in plain English and tell me the
   performance implications.
4. Log what the list converter DROPPED and why, so the count is honest and a
   future refresh is reproducible. No silent truncation.
5. Verify options-page changes with headless Chrome plus a throwaway chrome-API
   shim — the Browser-pane MCP does not composite here. The shim's
   storage.local.get must resolve the DEFAULTS object it is handed; if it
   resolves {} instead, a setup function throws and every setup after it
   silently stops running.
6. Run the full test suite (test/*.mjs) before telling me anything is done, and
   add a converter test in the style of test/blocklist-pattern-test.mjs.
7. Match the surrounding code: same comment density, naming and idiom. The
   existing background/ modules explain WHY in comments, not just what.
8. If anything is unclear, ask before assuming.

Start with the licence question, then Week 1.
```

---

## Architecture

Mirror `background/safety-shield.js` exactly. Do not invent a parallel system.

```
fetch or bundle list  →  IndexedDB (background/list-store.js, getBigList/setBigList)
                      →  chunk into DOMAINS_PER_RULE = 10000 groups
                      →  requestDomains rules in its own DNR id band
                      →  chrome.declarativeNetRequest.updateDynamicRules
```

Rule budget is a non-issue. The gambling blocker already runs ~271k domains in
56 rules and the scam list ~348k in ~70, against Chrome's 30,000-rule ceiling.

### DNR id band

Every 10000-wide band currently allocated:

| Band | Owner |
|---|---|
| `< 10000` | gambling (big list) |
| `10000–19999` | custom blocks |
| `20000–29999` | allowlist |
| `30000–39999` | scam |
| `40000–49999` | trading |
| `50000–59999` | MLM |
| `60000–69999` | phishing |
| `70000–79999` | malware |
| `80000–89999` | cryptojacking |
| `90000–99999` | AI slop |
| `100000–109999` | fraud |
| `110000–119999` | gore / shock |
| `120000–129999` | dating |
| `130000–139999` | piracy |
| `140000–179999` | game portals / stores / platforms / streaming |
| **`180000–189999`** | **trackers — TAKE THIS** |
| **`190000–199999`** | **ad networks — if the two toggles are split** |

Highest currently in use is `170000–179999` (`GAME_GROUPS.streaming` in
`background/safety-shield.js`), so `180000` is the next free band.

### Blocking action

Trackers and ad networks are **sub-resources**, not pages the user navigates to.
Unlike every existing tier, the dominant action here is `block` on subresource
types, not `redirect` to `pages/blocked.html`. A redirect on a `main_frame` hit
is still right for the rare case someone opens `doubleclick.net` directly, but
do not redirect subresources — that breaks pages harder than blocking them.

---

## Week 1 — the tier — **DONE**

- [x] List source: **EasyPrivacy** for trackers, **EasyList** for ad networks.
      Two sources, because the two groups carry different breakage risk.
- [x] Licence resolved and it was the right thing to do first. CC BY-SA 3.0 was
      the elected licence; the reasoning, the attribution, and a third section
      answering "did you copy uBlock Origin" live in `data/ATTRIBUTION-easylist.md`.
- [x] Converter: `build-tracker-list.mjs`. It emits five shapes, not one —
      `always`, `thirdParty`, `scoped`, `typed` and `spared` — because the
      upstream lists carve out per-site exceptions that a flat domain array
      cannot express. `scoped` became `excludedInitiatorDomains`, `spared`
      became `excludedRequestDomains`.
- [x] **Bundled**, as recommended. `data/tracker-domains.json`, 2.16 MB, parsed
      only when a group is on and only when the rules are rebuilt.
- [x] Drops are logged: `tracker-list-report.md`, plus a `_dropped` block inside
      the JSON so the count travels with the data.
- [x] Id band `180000`. **Both** groups fit in the one band rather than costing
      a second — see the Open questions below, where this was expected to need
      `190000`. That band is still free and now reserved for a third source.
- [x] `ssAdTrackerEnabled` and `ssAdNetworkEnabled`, both default **OFF**.
- [x] Subresources blocked; `main_frame` redirects to the blocked page.

## Week 2 — UI, banner, honesty — **DONE**

- [x] Sidebar section and nav entry in `options/options.html`.
- [x] **Beta** pill on the section, with the callout saying what is and is not
      blocked, and a link for reporting a site that broke
      (`github.com/codepurse/Sieve`).
- [x] Toggles wired in the safety-shield style; Guardian gates turning **off**,
      turning on is free.
- [x] **Allowlist applies** — and this was the one real architectural surprise
      of the release. It could not be done with the shared allow rule, because
      this tier blocks requests made *from* the site you are on rather than *to*
      it. It is `excludedInitiatorDomains` on this tier's own rules. See the
      section further down; it is the note most likely to matter later.
- [x] Blocked-page wording names the switch, like every other tier.
- [x] Store listing copy holds the line: "tracker & ad-network blocker".
- [x] Release notes in `common/changelog.js`. Now 38 items, because the
      performance pass that followed added eight more — including one that is a
      correction rather than a feature (the Popup & Click Hijack Blocker was
      silently doing nothing on any page that kept changing).

## Week 3 — triage, and this is where the time actually goes

Two items here are still **OPEN**, and they are the two nobody can do for you.
Everything a machine can check is done and green.

- [ ] **OPEN — run it on your own daily sites for a week with both toggles on.**
      This is the item the release actually depends on, and no test substitutes
      for it. The breakage rate is the thing 1.4.0 exists to learn.
- [ ] **OPEN — deliberately exercise the fragile surfaces:** logins / SSO,
      checkout and payment, analytics-gated UI, embedded players, comment
      widgets, consent flows. Watch especially for the consent-flow interaction
      with cookie auto-reject, which now registers dynamically and so is only
      present on a page when it is switched on.
- [x] Breakage handling exists in both directions: drop the domain, or add one
      the lists missed via `data/tracker-additions.json`. The first gap found
      was an audio-advert player neither list carries.
- [x] Test suite green — **478 passing**, and `test/tracker-list-test.mjs` is
      the converter test. (The count rose from 469 during the performance pass;
      nine of those pin the shared text walk.)
- [x] Options page verified headlessly. The shim gotcha in the original note is
      real and cost time — it is now written down properly in the project memory
      rather than only here.
- [x] `manifest.json`, `manifest.firefox.json` and `package.json` all at 1.4.0.
      The changelog entry still reads `date: "September 2026"` — **date it on
      upload day.**
- [x] Both builds run clean, with `-Zip`, and CI runs them on every PR.
      Chrome 1,247,548 bytes zipped; Firefox 1,092,984.

### After the tier: the performance pass

Not part of the original plan, and worth recording because it changed what this
release ships. An audit of every hot path found that the Ad & Trackers work had
landed well — dynamic registration means a user who never enables it pays
nothing — while the *older, default-on* modules were the expensive ones. That is
backwards, and it is the thing to watch as more gets added here.

Measured, before and after: the script Sieve puts into every top frame went from
284,649 to 116,389 bytes, the Chrome package from 4.40 to 3.97 MB, the Firefox
package to 3.36 MB, and the worst single main-thread task from 503 ms to 0.9 ms.
Three latent bugs came out of it that were not performance problems at all — see
`sieve-performance-audit.html`, which also records three of its own
recommendations that did not survive being implemented.

---

## Explicitly OUT of scope for 1.4.0

> **This list is now historical.** Three of the four were built anyway, in this
> order: YouTube ads, Facebook ads, then anti-adblock defeat. The scope warning
> at the top of this file was right about the *risk* and wrong about the
> *sequence* — each one turned out to be tractable once the one before it had
> established the pattern (dynamic `registerContentScripts`, a MAIN-world
> scriptlet plus an isolated reporter, its own opt-in `ss…` key). What follows
> is kept as written, with the outcome noted.

- ~~Cosmetic filtering~~ — needs a per-hostname CSS bundle build step. Starting it
  in week 3 means shipping it untested. Next release, once the domain tier's
  breakage rate is known.
  **Still out.** And note the anti-adblock work is a reason to keep it out
  rather than a step towards it: hiding an ad slot with `display:none` is how a
  blocker *answers* the question a detector is asking. The bait-box lie in
  `content/anti-adblock.js` is only safe because Sieve hides nothing generically.
  Shipping generic cosmetic filtering means the two features start fighting.
- ~~Scriptlet injection, `$redirect` stubs, anti-adblock defeat~~ —
  **all three shipped in 1.4.0.** `$redirect` stubs are `NEUTERED_STUBS` in
  `background/ad-tracker-blocker.js` (four probe URLs, each inheriting its host's
  upstream site carve-outs). Scriptlet injection and the wall sweep are
  `content/anti-adblock.js` (MAIN) and `content/anti-adblock-dom.js` (isolated),
  registered by `background/anti-adblock.js` under `ssAntiAdblockEnabled`.
  Deliberately still missing: a faithful `window.googletag` stub — see the "WHAT
  IS DELIBERATELY NOT HERE" note in the scriptlet for why a half-built slot API
  is worse than none. That is the next increment if walls start getting past.
- ~~YouTube ads~~ — **shipped in 1.4.0** (`content/youtube-ads.js`).
- Any claim of uBlock Origin parity. **Still out, and still true.** No filter
  list drives the anti-adblock work and no uBO code was copied — see the third
  section of `data/ATTRIBUTION-easylist.md`, which exists to keep that
  answerable.

### The one architectural surprise worth carrying forward

The allowlist. Every other tier gets it for free from the shared DNR `allow`
rule, and the two ad filters honour it not at all — a content script is not a
request, so the rule never reaches it. That is tolerable for YouTube and
Facebook and is not for this feature, whose entire job is interfering with what
a page can observe about itself.

So `background/anti-adblock.js` compiles the allowlist into `excludeMatches` on
both specs, which is the only mechanism that can keep a `document_start`
MAIN-world script off a page: anything that could read storage has already run.
The consequence is that an allowlist **edit** has to re-register rather than
re-check, which is why that module watches two storage keys instead of one.
If cosmetic filtering ever ships, it needs the same treatment.

---

## Open questions — all three answered

- ~~One toggle or two?~~ **Two**, as the leaning said: `ssAdTrackerEnabled` and
  `ssAdNetworkEnabled`. The cost estimate was wrong in a useful direction —
  both groups fit inside the one `180000` band rather than needing `190000`,
  because a band holds groups, not switches. `190000` stays free.
- ~~Does the beta banner need a "report a broken site" link?~~ **Yes**, and it
  points at `github.com/codepurse/Sieve`. On a tier whose whole risk is silent
  breakage, a user who cannot tell you is a bug report you never get.
- ~~Ship OFF for existing users but offer it in onboarding?~~ **Purely opt-in
  everywhere**, as consistency argued. Nothing in this section turns itself on.

### Still genuinely open, for next release

- Cosmetic filtering stays out, and the anti-adblock work is now a *reason* to
  keep it out rather than a step towards it — see the note in the out-of-scope
  section. Revisit only with a plan for how the two stop fighting.
- A faithful `window.googletag` stub is the next increment if walls start
  getting past. The scriptlet says why a half-built slot API is worse than none.
- The performance audit's P2/P3 leftovers, if anyone wants them: build-time
  budget assertions on injected bytes and package size, so the gains above do
  not quietly erode.

---

## Sources

- [uBO Lite FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ))
- [uBlock Origin Lite (MV3) — DeepWiki](https://deepwiki.com/gorhill/uBlock/10-ublock-origin-lite-(mv3))
- [Best Ad Blockers 2026: Who Survived Manifest V3](https://www.securitysenses.com/posts/best-ad-blockers-2026-who-survived-manifest-v3)
- [Ad Blocking in Chrome 134: What Actually Works After Manifest V3](https://dev.to/alphashark/ad-blocking-in-chrome-134-what-actually-works-after-manifest-v3-4c62)

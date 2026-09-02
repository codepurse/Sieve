# Sieve — Ad & Tracker Blocker: Plan & TODO

**Target release:** 1.4.0, ~**22 September 2026** (1.3.0 uploaded 1 September)
**New section:** "Ad & Trackers", its own sidebar entry, shipped with a **BETA** banner
**Status:** planned — nothing built yet

---

## How to use this file

1. Copy the **THE PROMPT** section below into Claude / Claude Code.
2. Make sure this file is attached, or in the project so it can be read.
3. Work through the week-by-week TODO checklists — tick items off as each is
   confirmed working, not as each is written.
4. Finish the domain tier completely before even discussing cosmetic filtering.

> ⚠️ **The main failure mode of this release is scope creep.** MV3 turns out to
> allow far more than it first appears (scriptlets, cosmetics — see below), and
> that makes it tempting to keep going. Don't. Ship the domain tier, learn the
> breakage rate, then decide.

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

## THE PROMPT (copy this)

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

## Week 1 — the tier

- [ ] Decide list source. Default: **EasyPrivacy**, domain-only entries.
- [ ] **Check the licence before writing any code.** EasyPrivacy is GPLv3 /
      CC BY-SA 3.0. Confirm what attribution the store listing and the repo
      need, and whether it obliges anything about Sieve's own licence. This is
      a blocker, not a footnote — resolve it first.
- [ ] Write the converter: filter the list to plain-domain entries, drop
      everything needing a rule form DNR cannot express (`$redirect-rule=`,
      cosmetics, scriptlets, `$csp`, regex-only entries), and emit a sorted,
      deduped domain array.
- [ ] Decide **bundled vs fetched**. Recommendation: **bundle it**, matching
      how MLM and dating ship. No first-run network dependency, no stale-list
      failure mode, refresh costs a release. Reserve fetching for lists too big
      to bundle (scam, malware).
- [ ] Log what the converter dropped and why, so the count is honest and a
      later refresh is reproducible.
- [ ] Add the group(s) to the safety-shield-style spec with id band `180000`.
- [ ] Wire the toggle key(s) in the `ss…` namespace, default **OFF**.
- [ ] Subresource types: block. `main_frame`: redirect to the blocked page.

## Week 2 — UI, banner, honesty

- [ ] New sidebar section + nav entry in `options/options.html`
      (`#section-adblock`), following the existing `.section` / `.card` markup.
- [ ] **BETA banner** on the section. Reuse the existing `.badge` / `.badge.on`
      pill for the nav or card title, and add a short explanatory callout: what
      it does block (third-party ad and tracker domains), what it does **not**
      (YouTube ads, anti-adblock walls, first-party ads), and that breakage
      should be reported.
- [ ] Toggle(s) wired through `setupSafetyShield`-style handlers; Guardian gate
      on turning **off** (weakening protection), free to turn on.
- [ ] **Allowlist must apply.** Non-negotiable — this is the tier most likely to
      break a checkout, and the allowlist is the user's escape hatch.
- [ ] Blocked-page wording for a `main_frame` hit that names the switch to turn
      off, like every other tier.
- [ ] Store listing copy: "tracker & ad-network blocker". Never "adblocker".
- [ ] Add the release-notes entry to `common/changelog.js` (1.4.0, top of the
      array, `date: "Unreleased"` until release day).

## Week 3 — triage, and this is where the time actually goes

- [ ] Run it on your own daily sites with the toggle on for the whole week.
- [ ] Deliberately test the known-fragile surfaces: **logins / SSO, checkout
      and payment flows, analytics-gated UI, embedded video players, comment
      widgets, consent flows** (watch for interaction with cookie auto-reject).
- [ ] Every breakage found: either drop the domain from the bundled list or
      document it in the beta banner's known-issues line.
- [ ] Re-run the full test suite (`test/*.mjs`) and add a converter test in the
      style of `test/blocklist-pattern-test.mjs`.
- [ ] Verify the options page headlessly (headless Chrome + throwaway chrome
      shim; the Browser-pane MCP does not composite here). Remember the shim's
      `storage.local.get` must resolve the DEFAULTS object it is handed, or
      later `setup…` calls throw and everything after them silently stops.
- [ ] Bump `manifest.json`, `manifest.firefox.json`, `package.json` to 1.4.0 and
      date the changelog entry.
- [ ] `build-chrome.ps1 -Bundle -Zip` and `build-firefox.ps1 -Zip`.

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

## Open questions

- One toggle or two? "Trackers" and "Ad networks" as separate switches matches
  how the game blocker split into four, and lets a user take analytics blocking
  without ad blocking. Costs a second id band (`190000`). Leaning **two**.
- Does the beta banner need a "report a broken site" link, and where does it
  point — GitHub issues?
- Should the tier ship OFF for existing users but be offered in onboarding for
  new ones, or stay purely opt-in everywhere? (Every other tier is purely
  opt-in; consistency argues for that.)

---

## Sources

- [uBO Lite FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ))
- [uBlock Origin Lite (MV3) — DeepWiki](https://deepwiki.com/gorhill/uBlock/10-ublock-origin-lite-(mv3))
- [Best Ad Blockers 2026: Who Survived Manifest V3](https://www.securitysenses.com/posts/best-ad-blockers-2026-who-survived-manifest-v3)
- [Ad Blocking in Chrome 134: What Actually Works After Manifest V3](https://dev.to/alphashark/ad-blocking-in-chrome-134-what-actually-works-after-manifest-v3-4c62)

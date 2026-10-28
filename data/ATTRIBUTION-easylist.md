# EasyList — attribution and licence election

`data/tracker-domains.json` is a **derived work of EasyList**, used by Sieve's Ad
Blocker as its `ads` group. This file records the licence position, the
attribution that has to travel with it, and how to refresh it reproducibly.

Until 1.5.1 the same file also carried a `trackers` group derived from
**EasyPrivacy** (same authors, same licence, covered by the same election below).
It was removed with tracker blocking, which did not fit Sieve: ads are clutter on
the page, trackers are privacy work done out of sight. Where this document still
mentions EasyPrivacy, it is describing that history.

- **Work:** EasyList (ad networks)
- **Author:** The EasyList authors
- **Homepage:** https://easylist.to/
- **Upstream licence notice:** https://easylist.to/pages/licence.html
- **Upstream list:** https://easylist.to/easylist/easylist.txt
  (mirrors under https://easylist-downloads.adblockplus.org/)
- **Converter:** `build-tracker-list.mjs` (repo root)
- **Conversion report:** `tracker-list-report.md` (repo root — committed, not shipped)

## Licence election

EasyList is **dual-licensed**: GNU GPL v3-or-later **or** Creative Commons
Attribution-ShareAlike 3.0 Unported-or-later, at the user's option. (EasyPrivacy
carries the same terms from the same project, so this one election covered both
while both were used.)

**Sieve elects CC BY-SA 3.0.** This is a deliberate choice, recorded here so it is
unambiguous, and it is not to be changed casually.

Why the CC arm and not the GPL arm:

- BY-SA 3.0 §4(b) contains an explicit **Collection** carve-out — including the
  Work in a Collection "does not require the Collection apart from the Work
  itself to be made subject to the terms of this License." The extension is the
  Collection; the derived list is the Work. So bundling the list does **not**
  subject Sieve to BY-SA.
- Under the GPLv3 arm there is a real argument that shipping a GPL data file
  inside the extension makes the package a work based on it. Electing BY-SA
  removes that argument entirely rather than winning it.

### What that means for Sieve's own licence

| | Licence |
|---|---|
| Sieve's code | **MIT**, unchanged (see `LICENSE`) |
| `data/tracker-domains.json` | **CC BY-SA 3.0** — it is an *Adaptation* |

The repo is therefore **mixed-licence** on purpose. `data/tracker-domains.json`
cannot be relicensed MIT, and anyone editing it (for example dropping a domain
that broke a site during breakage triage) is editing a BY-SA file. Everything
else in the repo remains MIT.

## Attribution that must ship

CC BY-SA 3.0 §4(a) requires a copy of, **or the URI for**, the licence with every
distributed copy, plus all notices referring to it kept intact. §4(c) requires
crediting the Original Author, the title, the licensor's URI, and — for an
Adaptation — a credit identifying the use made of the Work.

A URI is explicitly sufficient, so all four of these carry it:

1. **`data/tracker-domains.json`** — the `_license` block, written by the
   converter. This is the copy that ships inside the extension package, and it
   preserves the upstream `! Licence:` notice verbatim in
   `_license.upstreamLicenceNotice`. **Do not strip it.**
2. **`options/options.html`** — a `.credit` line on the Ad blocker card,
   matching how the Consent-O-Matic credit is presented on the cookie
   auto-reject toggle.
3. **`README.md`** — an Acknowledgements entry, plus the mixed-licence note in
   the License section.
4. **This file**, which ships in `data/`.

The store listing is *not* obliged to carry it — the requirement is that
attribution ships *with the work*, which (1) and (2) satisfy — but a one-line
credit there is cheap insurance.

## What the converter keeps, and what it drops

EasyList is Adblock-Plus filter syntax. Only rules expressible as a
declarativeNetRequest `requestDomains` condition survive:

| Upstream form | Outcome |
|---|---|
| `\|\|example.com^` | kept → `always` (blocked in every context) |
| `\|\|example.com^$third-party` | kept → `thirdParty` (DNR `domainType: "thirdParty"`) |
| `@@\|\|example.com^` | domain (and subdomains) removed from the list |
| `@@` scoped to a path/type/site | **whole domain removed** — see below |
| anything path-, query- or port-scoped | dropped |
| cosmetic, scriptlet, regex, `$redirect=`, `$domain=`, resource-type options | dropped |
| wildcard domains, bare IPs | dropped |
| shared infrastructure / public suffixes | refused by the converter's own guard |

Two decisions worth knowing about:

- **A rule scoped to a path is never widened to its domain.** `||example.com^*/track?id=`
  is about one path; emitting `example.com` would take the whole site down. An
  early version of the converter did exactly that to ~1,800 rules. There is a
  regression test for it (`test/tracker-list-test.mjs`).
- **Narrow exceptions spare the whole domain.** When upstream carved out one
  script on a host, we cannot express the carve-out — so the host comes off the
  block list entirely. That under-blocks by design: an exception exists because a
  human found that blocking it broke a real page. On EasyList 202609021306 this
  spares 29 domains. It mattered most on EasyPrivacy, while that was converted:
  its 202609010808 build had 503 spared (~1%), including anti-bot and DDoS-check
  endpoints such as `check.ddos-guard.net` and `api-js.datadome.co`, where the
  cost of a false positive is a locked-out user rather than a missed tracker.

Every rule the converter reads is accounted for by exactly one outcome, and the
build **fails** if that tally does not balance — so the shipped domain count is
checkable, not just claimed. See `reconcile()` in the converter and the equation
printed in `tracker-list-report.md`.

## Known risky blocks

The converter runs a **fragile-surface audit** on every build and prints the result
into `tracker-list-report.md`. It asks one question: does this list block anything
whose failure costs more than an ad — a consent manager, a bot check, a payment
SDK, a sign-in provider, an embedded player, a comment widget?

A hit is not automatically a bug; upstream can block such a vendor on purpose.
The audit's job is to make each one a decision somebody made rather than an
accident, and the survivors are what the settings page's known-issues text is
written from.

As of EasyList `202609021306`, **none** survive: the ad list blocks nothing on a
fragile surface. Every hit the audit ever reported was in the EasyPrivacy group —
sixteen domains, bot and fraud checks (DataDome, Sift, Forter, FingerprintJS,
iovation) and error reporting or session replay (Sentry, New Relic, LogRocket,
FullStory and others) — and they went with it in 1.5.1. That is why the settings
page no longer warns that sites break at sign-in or checkout.

When following the refresh procedure below, compare against the **report**, and
update this paragraph when it moves.

Consent/CMP, sign-in, payments, embedded players and comment widgets are **clean** —
nothing in those categories is blocked. The consent result matters especially,
because Sieve's own cookie auto-reject drives those same CMPs and the two features
would otherwise fight.

This audit is also what found the `spared` bug described above: 73 hosts upstream
had explicitly excepted were still being blocked through a listed parent. Nothing
in the domain counts or the drop log showed it.

## How to refresh from upstream

1. `node build-tracker-list.mjs`
   (or `node build-tracker-list.mjs --from ./some-dir` to convert a local copy —
   use this to re-run against the exact bytes that were reviewed).
2. Read the diff of `tracker-list-report.md`. Specifically check:
   - the drop counts did not move sharply — a large swing means upstream changed
     rule style and the classifier needs a look;
   - **no new `guard:` drops** — a guard hit means upstream now lists shared
     infrastructure, which needs a human decision before it ships;
   - the kept count is in the expected range (~48,000 domains);
   - **the "Blocked on fragile surfaces" table has not grown.** A new entry there
     means the refresh started blocking something load-bearing — decide whether to
     keep it, and add a known-issues note to `options/options.html` if you do.
3. `npm test` — the converter tests must pass.
4. Commit `data/tracker-domains.json` **and** `tracker-list-report.md` together.
   The report plus `_upstream.ads.commit` in the JSON pin down exactly which
   upstream build a shipped list came from.

The converter deliberately does **not** stamp a generation timestamp: it would
make the file diff on every run even when upstream is unchanged, hiding real
changes in review. Upstream's own `! Version:` and `! Commit:` are the identity.

---

## Not upstream's: `data/tracker-additions.json`

EasyList has holes, and `data/tracker-additions.json` is where Sieve fills them
by hand. Its entries are **Sieve's own work, MIT** — they are not part of the
BY-SA Adaptation, even though they end up merged into a file that is.

The generated list therefore records them separately, in an `_additions` block
alongside `_license`, so this stays legible to anyone auditing provenance: the
BY-SA attribution covers what came from EasyList, and `_additions` names what
did not. Without that a reviewer reading `_license` alone would conclude every
domain in the file is upstream's.

How the merge works, and why each part is the way it is:

- It happens **after** `convert()`, so `reconcile()` still proves that every
  *upstream* rule is accounted for. Folding additions into `considered` to make
  the equation balance would destroy the only thing that equation guarantees.
- Every entry goes through `domainFromAnchor()` — the same function every
  upstream rule goes through — so the shared-infrastructure guard, the
  public-suffix backstop and the malformed-host checks all apply. Nobody adds
  `cloudfront.net` by hand.
- A refused entry **fails the build**. Skipping it with a warning is how you
  ship a list that silently lacks the domain someone added to it.
- A domain upstream later picks up is reported as *redundant*, which is the
  signal to delete it from the additions file.

First entry, 2026-09-02: `trinitymedia.ai` (Trinity Audio). Found by measuring
indiewire.com — the only ad iframe still rendering after the whole list was
applied, and carried by neither upstream list nor present in the drop log.
It should also be reported upstream; this file is the stopgap, not the fix.

## Second derived work: `content/youtube-ads.css`

`data/tracker-domains.json` is not the only thing in this repo derived from
EasyList. The YouTube ad-slot selectors in **`content/youtube-ads.css`** were
taken from EasyList's `youtube.com##…` **cosmetic** rules — the same ~24,500
rules `build-tracker-list.mjs` drops as "cosmetic or scriptlet rule", because the
domain tier cannot express them.

The licence election recorded above covers this file too: **CC BY-SA 3.0**, same
work, same authors, same attribution. It is called out separately only because
the converter's report does not mention it, so a future licence review reading
only `tracker-list-report.md` would miss it.

Refreshing it is manual and unrelated to `node build-tracker-list.mjs`:

```
curl -s https://easylist.to/easylist/easylist.txt | grep -E '^[^!]*youtube\.com[^#]*##'
```

Compare against the selectors in `content/youtube-ads.css`, which is annotated
with which rules came from upstream and which are Sieve's own additions for the
same slots on other surfaces.

## Third area: the anti-adblock filter — derived from NO list

`content/anti-adblock.js` and `content/anti-adblock-dom.js` are **not** derived
from EasyList or from anything else, and this section exists to say so, because
the natural assumption is the opposite.

EasyList publishes an **Adblock Warning Removal List** for exactly this job, and
uBlock Origin ships a scriptlet library that does most of what these two files
do. Neither was used:

- No selectors, phrases or domains were taken from the Adblock Warning Removal
  List. The wall detector works differently in kind — it reads what an overlay
  *says* rather than matching a per-site selector, so there was nothing to copy.
  The word lists in `content/anti-adblock-dom.js` were written from scratch.
- **No code was copied from uBlock Origin**, whose scriptlets are GPLv3. That is
  the one that matters: copying them would put a GPLv3 file inside an MIT
  extension and force the licence question this file's election was written to
  avoid. The behaviours overlap because there are only so many ways to answer
  `window.canRunAds`, not because the implementations are shared.

The names of a third party's globals and the shape of the `FuckAdBlock` API are
facts about someone else's library, not copyrightable expression — the same
reasoning recorded below for YouTube's payload fields.

So both files are **MIT**, like the rest of Sieve's code, and a licence review
needs to do nothing about them. If a future refresh ever *does* pull selectors
from the Adblock Warning Removal List, that changes — it is the same dual licence
as the other two lists, so the election above would cover it, but the file it
lands in would become BY-SA and would have to be listed in the table near the
top of this document.

### What is NOT derived from anything

Two facts used by `content/youtube-ads.js` came from reading EasyList's rules —
that `/youtubei/v1/get_watch` carries ad data, and that Shorts ads are flagged
`reelWatchEndpoint.adClientParams.isAd`. Facts about a third party's API are not
copyrightable and the handling of both is Sieve's own; the Shorts case
deliberately behaves differently from upstream (drop the entry, not the flag).
No code was copied from uBlock Origin, and none from any other extension.

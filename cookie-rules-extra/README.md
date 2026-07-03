# Sieve-authored cookie CMP rules

These are **Sieve's own** consent-rule files, written in Consent-O-Matic's rule
format but **not** part of the upstream Consent-O-Matic database. They cover CMPs
upstream doesn't (yet) support.

`build-cookie-engine.mjs` merges every `*.json` here into `data/cookie-rules.json`
**after** the vendored upstream rules — so these add new CMPs and win on any key
collision. Because they're ours (not vendored), they live outside
`vendor/consent-o-matic/` and are safe to edit.

Each file must strictly reject non-essential cookies by clicking the site's own
genuine "Reject All" control — never fabricating consent, never clicking Accept.

## cookieyes.json

Covers **CookieYes** (`.cky-consent-container`, `data-cky-tag="..."` controls),
a very common CMP not in upstream. Verified in a live browser: clicking the
banner's `[data-cky-tag='reject-button']` sets the site's `cookieyes-consent`
cookie to `necessary:yes, functional:no, analytics:no, performance:no,
advertisement:no` and dismisses the banner.

Flow:
- **Detect** `.cky-consent-container` present + showing.
- **DO_CONSENT**: if a banner-level "Reject All" exists, click it; otherwise open
  "Customize", wait for the preference center, and click its "Reject All". Both
  are the site's own reject controls.
- **HIDE_CMP**: hide `.cky-consent-container` (wraps both the bar and the modal).

## cookiefirst.json

Covers **CookieFirst**, based on its documented custom-button API
(`data-cookiefirst-action="accept" | "reject" | "adjust"`). Fail-safe by design:
the **detector requires `[data-cookiefirst-action='reject']` to be present and
showing**, so the rule only ever fires when the site's own Reject control exists —
and it only ever clicks *that*, never Accept. If the selector is wrong or absent,
the rule simply doesn't trigger and the driver falls back to leveling.

Note: verified in simulation and safe by construction, but not yet confirmed on a
live CookieFirst site (the browser tool blocked navigation to test domains).

If you add a rule here, re-run `node build-cookie-engine.mjs` and re-test.

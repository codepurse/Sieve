# Sieve

**Clean Internet Suite — a privacy-first browser extension that quietly cleans up the modern web.**

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Runs on-device](https://img.shields.io/badge/privacy-100%25%20on--device-brightgreen.svg)

Sieve blocks the stuff that makes the internet feel hostile — scams, gambling,
dark patterns, toxic comments, popup hijacks, and endless feeds — and gives you
back a bit of control. It runs **entirely on your device**: no account, no
tracking, nothing leaves your browser.

> Honestly, I made this because I got tired. The internet I grew up on felt fun
> and open. Somewhere over the years it turned into scams, nasty comments,
> endless feeds, and sites that trick you at every click. So I built the tool I
> wished existed. — *monolab*

---

## Features

### On-page cleanup
- **Bad Language Filter** — masks profanity on pages (funny or family-safe styles, plus your own word list).
- **Toxic Comment Hider** — collapses toxic comments on YouTube, Reddit, X/Twitter, and Disqus, with an optional on-device TensorFlow.js toxicity model.
- **Dark Pattern Blocker** — neutralises fake countdown timers, guilt-trip copy, pre-checked boxes, and manufactured scarcity.
- **Cookie Auto-Reject** — automatically rejects cookie-consent banners (built on the MIT-licensed Consent-O-Matic rules).
- **Popup & Click Hijack Blocker** — blocks popups and click-hijacks by default, with a per-site allow prompt and whitelist.
- **Search Result Filter** — opt-in sorting of your search results before you click: colour-code the sources you trust and hide the ones you don't, each rule carrying its own colour. Works on Google, Bing and DuckDuckGo. Hidden results are counted with a link to show them, never dropped silently, and every affected result can tell you which rule changed it and where that rule came from.

### Blocked websites
- **Gambling Blocker** — blocks gambling and betting sites (with an opt-in Prediction Markets tier).
- **Financial Protection** — opt-in tiers for crypto scams, trading/exchange sites, and MLM schemes.
- **Safety Shield** — opt-in blocking for phishing/malware, cryptojacking, piracy, AI-slop content farms, fraud, gore/shock, and dating sites.
- **Game Blocker** — four independent opt-in tiers: browser game portals, game download stores, game platforms/online worlds, and game streaming/cloud gaming/esports. Browser-only: it blocks game sites and store pages, not games already installed on the machine.
- **Custom block list + allowlist** — a global block list and allowlist that apply across every blocker. A blocked-list entry can be a wildcard (`example.com`, `*.example.com`, `example.com/adult/*`), a whole top-level domain (`.xyz`), a regular expression on the address (`/example\.(net|org)/`) or on the page title (`title/Example Domain/`), or a `#` note that heads a section. Blocked sites are also blocked as a source of images.
- **Ad & Tracker Blocker** *(beta)* — two opt-in **domain** blockers, bundled with the extension: trackers/analytics from EasyPrivacy, and ad networks from EasyList. It stops requests to known advertising, analytics and fingerprinting domains. On its own it is deliberately not an ad blocker: it cannot remove YouTube ads or stop ads a site serves from its own domain — that is what the two filters below do. The Allowlist switches it off per-site, and what it stops is counted in the Protection Dashboard.
- **YouTube & Facebook ad filters** *(beta, one opt-in switch each)* — the two sites that serve their ads first-party, so no domain blocker can reach them. Each edits the ads out of the site's own page data as it loads: on YouTube, the pre-roll and mid-roll breaks plus the sponsored tiles in the feed, search, sidebar and Shorts; on Facebook, the sponsored posts in the feed, the right-hand column, and Marketplace/Watch/search. Facebook's filter also reads the scrambled "Sponsored" badge the way a person does — resolving the split letters, hidden decoys and CSS reordering — so it keeps working when the markup changes. Both are an arms race and will need updating; both fail by letting the ads back, not by breaking the site.
- **Anti-adblock defeat** *(beta, opt-in)* — for the sites that put up a "please disable your ad blocker" wall. Almost all of them decide by loading an advert and checking whether it arrived, so blocking that request is what gives the game away: a failed request is something the page can see. Three answers, in order of how much they touch: the handful of probe scripts are served an empty file that *succeeds* rather than being blocked; the globals a detector reads (`canRunAds`, `adsbygoogle.loaded`, the BlockAdBlock API) are answered honestly-shaped "no blocker here"; and an empty ad-shaped box is told it is 300×250 for the first few seconds of page load, after which the patches are removed and cost nothing. If a wall appears anyway it is cleared by reading what it *says* rather than by matching a per-site selector — so it needs no filter list — and the scroll lock, the blur and the pointer-events trap that come with it are undone. It cannot help with a wall decided on the site's own server. On an allowlisted site neither script is even loaded.
- **URL Shortener Resolver** — expands or blocks shortened links before you land on them.

### Wellbeing & control
- **Site Cleanup** — hides the distracting parts of sites you still want to use. YouTube first, with 21 switches: feeds and Shorts, comments and recommendations, mixes and search filler, the description/channel/action rows, live chat, merch, end cards and info cards, autoplay, thumbnails, the top bar and its bell, and a black-and-white mode.
- **Doomscroll Stopper** — a daily time limit on endless feeds, with a gentle pause overlay.
- **Guardian self-lock** — an optional PIN that gates *weakening* your protection (turning things off, allowlisting) while strengthening it stays free.
- **Protection Dashboard** — a today/this-week breakdown of everything Sieve blocked for you, including an **Ads & trackers** section counting tracking requests, ad-network requests, the YouTube and Facebook ads removed, and the ad-blocker walls cleared. Only running totals are stored — never which site or which tracker. The two request counters read back which of Sieve's own block rules fired, which Chrome allows and Firefox does not, so they stay at zero on Firefox while the blocking itself is unaffected.
- **Usage Insights** — an opt-in screen-time report: total time, a per-day and per-hour curve, and which sites took it. Only the tab you are looking at counts, the clock stops when you step away, and the record never leaves your device (7/30/90-day retention, clearable at any time).

---

## Privacy

Sieve is built to be trustworthy by design:

- **No account, no sign-up, no telemetry, no tracking.** Sieve only *downloads*
  files (blocklists, the optional toxicity model, and a settings-page announcement
  check) — it never uploads anything about you. See [PRIVACY.md](PRIVACY.md).
- **All processing is local**, including the optional toxicity model.
- Settings and stats live only in your browser's local storage.
- **Usage Insights is off by default.** Switch it on and Sieve keeps a local
  tally of site names and durations so it can draw you a report; it stores no
  URLs or page content, and uploads nothing. Set its retention window or clear
  it whenever you like.

---

## Install (load unpacked)

The repository ships with the prebuilt bundles, so you can load it directly —
no build step required.

1. Download or clone this repository:
   ```bash
   git clone https://github.com/codepurse/Sieve.git
   ```
2. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder.
5. Pin Sieve from the toolbar and open its options to configure the modules.

> Tested on Chrome / Chromium browsers (Chrome, Edge, Brave, Opera). A Firefox
> build target exists (`npm run build:firefox`) but is still experimental — the
> optional on-device toxicity model relies on the offscreen API, which Firefox
> does not support, so that one feature is skipped there.

---

## Build (optional)

The extension itself is plain JavaScript loaded directly by the manifest. You
only need Node.js if you want to **regenerate** the optional bundles.

```bash
npm install          # install dev/build dependencies

npm run build        # rebuild the optional TensorFlow.js toxicity model bundle
node build-cookie-engine.mjs   # rebuild the Consent-O-Matic cookie engine + rules
```

Rebuild only if you change the toxicity model or the cookie engine — otherwise
the committed bundles are all you need.

### Packaging for Chrome & Firefox

To produce clean, store-ready builds (and zips) for each browser, use the
PowerShell build scripts. Each one copies only the runtime files into
`dist/<browser>/` — dev-only folders (`node_modules/`, `src/`, `vendor/`,
`test/`, …) are excluded — verifies the required bundles are present, and
optionally zips the result.

```bash
npm run build:chrome    # → dist/chrome/   + dist/sieve-chrome.zip
npm run build:firefox   # → dist/firefox/  + dist/sieve-firefox.zip
npm run build:all       # both of the above
```

The npm scripts run with `-Bundle -Zip`, so they **regenerate the esbuild
bundles first** and then package. To run a script directly with different
options:

```powershell
# copy only (uses the committed bundles, no rebuild, no zip)
powershell -ExecutionPolicy Bypass -File .\build-chrome.ps1

# copy + zip, still using the committed bundles
powershell -ExecutionPolicy Bypass -File .\build-firefox.ps1 -Zip

# regenerate bundles, then copy + zip
powershell -ExecutionPolicy Bypass -File .\build-chrome.ps1 -Bundle -Zip
```

Chrome builds from `manifest.json`; Firefox builds from `manifest.firefox.json`
(renamed to `manifest.json` in the output). Build output under `dist/` is
git-ignored.

---

## Project structure

```
background/   Service worker + blockers (safety shield, financial protection, popup hijack, stats, usage tracker)
common/       Shared helpers (guardian, stats store, list store, usage store)
content/      Content scripts (bad language, dark patterns, toxic comments, doomscroll, …)
data/         Blocklists and word lists (gambling, MLM, profanity, cookie rules, …)
rules/        declarativeNetRequest rulesets
options/      Settings page (options.html / .css / .js) + the Usage Insights chart module
popup/        Toolbar popup
pages/        Blocked-site interstitial + onboarding
offscreen/    Offscreen document for the toxicity model
vendor/       Vendored Consent-O-Matic (MIT) — do not edit by hand
src/          esbuild entry points for the optional bundles
dist/         Packaged builds produced by the build scripts (git-ignored)
```

Chrome loads `manifest.json`; the Firefox packaging uses `manifest.firefox.json`.
`build-chrome.ps1` / `build-firefox.ps1` produce the per-browser bundles.

---

## Contributing

Contributions are welcome! Please read:

- [Contributing guide](.github/CONTRIBUTING.md)
- [Code of Conduct](.github/CODE_OF_CONDUCT.md)
- [Security policy](.github/SECURITY.md)

---

## Acknowledgements

- [Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic) (MIT) — cookie-banner rejection rules, vendored under `vendor/`.
- [EasyPrivacy and EasyList](https://easylist.to/) — © The EasyList authors. The bundled domain list in `data/tracker-domains.json` is derived from them and used under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). See [`data/ATTRIBUTION-easylist.md`](data/ATTRIBUTION-easylist.md).
- [TensorFlow.js](https://www.tensorflow.org/js) and the [toxicity model](https://github.com/tensorflow/tfjs-models/tree/master/toxicity) — optional on-device comment classification.

---

## License

Released under the [MIT License](LICENSE). © 2026 Alfon.

One exception: **`data/tracker-domains.json`** is an adaptation of EasyPrivacy and EasyList, and is
licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), not MIT.
Sieve elects the CC arm of their shared GPLv3 / CC BY-SA 3.0 dual licence; BY-SA's
"Collection" clause is what keeps the rest of the project MIT. Editing that one file
means editing a BY-SA file — see [`data/ATTRIBUTION-easylist.md`](data/ATTRIBUTION-easylist.md).

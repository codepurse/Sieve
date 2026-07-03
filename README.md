# Sieve

**Clean Internet Suite — a privacy-first browser extension that quietly cleans up the modern web.**

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![Version](https://img.shields.io/badge/version-1.2.0-green.svg)
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

### Blocked websites
- **Gambling Blocker** — blocks gambling and betting sites (with an opt-in Prediction Markets tier).
- **Financial Protection** — opt-in tiers for crypto scams, trading/exchange sites, and MLM schemes.
- **Safety Shield** — opt-in blocking for phishing/malware, cryptojacking, piracy, AI-slop content farms, fraud, gore/shock, and dating sites.
- **Custom block list + allowlist** — a global block list and allowlist that apply across every blocker.
- **URL Shortener Resolver** — expands or blocks shortened links before you land on them.

### Wellbeing & control
- **Doomscroll Stopper** — a daily time limit on endless feeds, with a gentle pause overlay.
- **Guardian self-lock** — an optional PIN that gates *weakening* your protection (turning things off, allowlisting) while strengthening it stays free.
- **Protection Dashboard** — a today/this-week breakdown of everything Sieve blocked for you.

---

## Privacy

Sieve is built to be trustworthy by design:

- **No account, no sign-up, no telemetry.** Nothing is sent anywhere.
- **All processing is local**, including the optional toxicity model.
- Settings and stats live only in your browser's local storage.

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

> Tested on Chrome / Chromium browsers (Chrome, Edge, Brave, Opera). Firefox
> support is a future goal.

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

---

## Project structure

```
background/   Service worker + blockers (safety shield, financial protection, popup hijack, stats)
common/       Shared helpers (guardian, stats store, list store)
content/      Content scripts (bad language, dark patterns, toxic comments, doomscroll, …)
data/         Blocklists and word lists (gambling, MLM, profanity, cookie rules, …)
rules/        declarativeNetRequest rulesets
options/      Settings page (options.html / .css / .js)
popup/        Toolbar popup
pages/        Blocked-site interstitial + onboarding
offscreen/    Offscreen document for the toxicity model
vendor/       Vendored Consent-O-Matic (MIT) — do not edit by hand
src/          esbuild entry points for the optional bundles
```

---

## Contributing

Contributions are welcome! Please read:

- [Contributing guide](.github/CONTRIBUTING.md)
- [Code of Conduct](.github/CODE_OF_CONDUCT.md)
- [Security policy](.github/SECURITY.md)

---

## Acknowledgements

- [Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic) (MIT) — cookie-banner rejection rules, vendored under `vendor/`.
- [TensorFlow.js](https://www.tensorflow.org/js) and the [toxicity model](https://github.com/tensorflow/tfjs-models/tree/master/toxicity) — optional on-device comment classification.

---

## License

Released under the [MIT License](LICENSE). © 2026 Alfon.

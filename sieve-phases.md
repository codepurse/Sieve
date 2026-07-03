# Sieve — Build Phases
**Clean Internet Suite · Browser Extension (Chrome + Firefox)**

> Separate product from your porn blocker. Sieve covers everything else:
> gore, gambling, toxic comments, bad language, doomscrolling, dark patterns, and social media addiction.

---

## Overview

| Phase | Name | Difficulty | Modules | Timeline |
|-------|------|------------|---------|----------|
| 1 | Foundation | ⭐ Easiest | Bad language filter + Gambling blocker | Month 1–2 |
| 2 | Wellbeing | ⭐⭐ Easy–Medium | Doomscroll stopper + Social media timer | Month 3–4 |
| 3 | Smart Blocking | ⭐⭐⭐ Medium | Dark pattern blocker | Month 5–6 |
| 4 | AI Features | ⭐⭐⭐⭐ Hard | Toxic comment hider + Gore/violence filter | Month 7–9 |
| 5 | Polish & Expand | ⭐⭐⭐⭐⭐ Ongoing | Sync, parental PIN, reports, Edge support | Month 10+ |

---

## Phase 1 — Foundation
**Difficulty: ⭐ Easiest**
**Timeline: Month 1–2**
**Goal: Ship fast, get first users, cross-promote with your porn blocker**

These two modules use techniques you already know from building the porn blocker — URL/domain blocklists and text replacement. No ML, no AI, no external APIs. Pure extension fundamentals.

---

### Module 1A — Bad Language Filter

**What it does:**
Scans all visible text on a page and replaces profanity, slurs, and extreme language with clean alternatives in real time.

**How it works:**
- Content script runs on every page load
- Uses a hardcoded word list (start with ~500 words)
- Uses `TreeWalker` API to find all text nodes in the DOM
- Replaces matched words using regex
- Runs again on DOM mutations (for dynamic pages like social feeds)

**Features:**
- [ ] Replace profanity with clean alternatives (e.g. "f***" or "fudge")
- [ ] Replacements are configurable — user can choose asterisks, blanks, or funny words
- [ ] Custom word list — user can add/remove words
- [ ] Family-safe mode — replaces even mild language
- [ ] Works on all websites automatically
- [ ] Toggle on/off from popup

**Libraries/tools needed:**
- None — pure vanilla JavaScript
- Word list: use open source lists like `words` npm package or `badwords-list`
- DOM mutation: `MutationObserver` API (built into browsers)

**Key files:**
```
content/bad-language.js    — DOM scanner and replacer
data/wordlist.json         — the word list
```

**Gotchas:**
- Watch out for false positives (e.g. "assassin" contains "ass")
- Use whole-word matching with regex word boundaries: `/\bword\b/gi`
- Dynamic sites (Twitter, Reddit) reload content — use `MutationObserver` to catch new text

---

### Module 1B — Gambling Blocker

**What it does:**
Blocks access to online casinos, sports betting sites, poker rooms, and gambling ads.

**How it works:**
- Uses the `declarativeNetRequest` API (Manifest V3) to block requests to known gambling domains
- Maintains a JSON blocklist of gambling domains
- Blocks both the full site and gambling ads appearing on other sites

**Features:**
- [ ] Block full gambling sites (casinos, sports betting, poker)
- [ ] Block gambling ads appearing on non-gambling sites
- [ ] User can add custom sites to block
- [ ] User can whitelist sites (allowlist)
- [ ] Toggle on/off from popup
- [ ] Show a clean "blocked by Sieve" page when a site is blocked

**Libraries/tools needed:**
- `declarativeNetRequest` API — built into Chrome MV3 and Firefox
- Blocklist source: use and extend open source lists from:
  - [oisd.nl](https://oisd.nl) — massive community-maintained blocklist
  - [hagezi/dns-blocklists](https://github.com/hagezi/dns-blocklists) — includes gambling category

**Key files:**
```
rules/gambling-rules.json   — declarativeNetRequest rules
data/gambling-domains.json  — domain blocklist
content/blocked-page.html   — shown when a site is blocked
```

**Gotchas:**
- MV3 `declarativeNetRequest` has a limit of 30,000 static rules — you won't hit this but be aware
- Some gambling sites use subdomains or redirect domains — update the list regularly
- Firefox uses `browser.declarativeNetRequest`, Chrome uses `chrome.declarativeNetRequest` — use a polyfill

---

### Phase 1 — Extension Structure

```
sieve/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── bad-language.js
├── background/
│   └── service-worker.js
├── rules/
│   └── gambling-rules.json
├── data/
│   ├── wordlist.json
│   └── gambling-domains.json
├── pages/
│   └── blocked.html
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

---

## Phase 2 — Wellbeing
**Difficulty: ⭐⭐ Easy–Medium**
**Timeline: Month 3–4**
**Goal: Attract the self-improvement audience — not just parents, but individuals managing themselves**

These modules don't block content — they interrupt addictive patterns. No AI needed. Pure DOM manipulation and timer logic.

---

### Module 2A — Doomscroll Stopper

**What it does:**
Detects when a user has been scrolling a social media feed for too long and shows a gentle pause screen.

**How it works:**
- Content script injects a scroll tracker on known social media sites
- Tracks time spent actively scrolling
- When the daily time limit is hit, injects a full-screen pause overlay
- User can snooze 5 min, stop for the day, or dismiss

**Supported sites (Phase 1):**
- Twitter / X
- Instagram
- TikTok
- Reddit
- Facebook
- YouTube (homepage feed)

**Features:**
- [ ] Time-based limit (e.g. stop after 15 minutes of scrolling)
- [ ] User sets their own time limit per site
- [ ] Pause screen with a mindful message
- [ ] Snooze button (5 min grace period)
- [ ] "Stop for today" button
- [ ] Daily scroll stats shown in popup
- [ ] Toggle on/off per site

**Libraries/tools needed:**
- None — vanilla JS
- `scroll` event listener + `Date.now()` for time tracking
- `chrome.storage.local` for saving limits and daily stats

**Key files:**
```
content/doomscroll.js      — scroll tracker per site
content/pause-overlay.js   — the pause screen injected into page
data/site-configs.json     — list of supported sites and their feed selectors
```

**Gotchas:**
- TikTok and Instagram use virtualized scroll — detect by `scroll` event on `window`, not the feed element
- Pause overlay must be above everything — use `z-index: 2147483647`
- Reset daily stats at midnight using `chrome.alarms` API

---

### Module 2B — Social Media Timer

**What it does:**
Gives each social media site a daily time budget. When the budget runs out, shows a soft nudge overlay.

**How it works:**
- Background service worker tracks active tab time per domain
- When daily limit for a domain is reached, sends message to content script
- Content script injects a soft overlay (not a hard block)

**Features:**
- [ ] Set daily time budget per site (e.g. 30 min on YouTube, 20 min on Instagram)
- [ ] Soft nudge overlay when limit reached — not a hard block
- [ ] User can dismiss the nudge and keep browsing (it's their choice)
- [ ] Weekly usage summary in popup (bar chart per site)
- [ ] Resets at midnight every day
- [ ] Countdown timer shown in popup while on a tracked site
- [ ] Toggle per site

**Libraries/tools needed:**
- `chrome.tabs` API — track active tab
- `chrome.alarms` API — midnight reset
- `chrome.storage.local` — save usage data
- Simple bar chart: draw with HTML/CSS, no library needed

**Key files:**
```
background/time-tracker.js   — tracks active tab time per domain
content/nudge-overlay.js     — soft overlay when limit is hit
popup/usage-stats.js         — weekly usage summary UI
```

**Gotchas:**
- Only count time when the tab is actually active and the window is focused
- Use `chrome.tabs.onActivated` and `document.visibilityState` to detect focus
- Store usage as `{ domain: { date: secondsSpent } }` in `chrome.storage.local`

---

## Phase 3 — Smart Blocking
**Difficulty: ⭐⭐⭐ Medium**
**Timeline: Month 5–6**
**Goal: Fight manipulative website design — this is where Sieve becomes truly unique**

These modules require understanding page structure and detecting specific UI patterns. No AI but requires careful DOM analysis per site.

---

### Module 3A — Dark Pattern Blocker

**What it does:**
Detects and removes manipulative UI elements — fake urgency timers, guilt-trip copy, confusing unsubscribe flows, and pre-ticked checkboxes.

**Dark patterns it targets:**

| Pattern | Example | How Sieve handles it |
|---------|---------|---------------------|
| Fake countdown timer | "Offer ends in 09:58!" | Detect and remove timer elements |
| Guilt-trip copy | "No thanks, I don't want to save money" | Detect dismiss buttons with negative framing and rewrite them |
| Pre-ticked checkboxes | Newsletter signup pre-checked | Highlight in yellow so user notices |
| Cookie consent dark patterns | Accept button huge, reject button tiny/hidden | Simplify to equal-size buttons |
| Fake scarcity | "Only 2 left!" (always shows 2) | Detect and dim these elements |
| Roach motel | Easy to subscribe, impossible to cancel | Flag subscribe buttons with a warning |

**How it works:**
- Content script scans DOM after page load
- Uses heuristics: keyword matching in element text + CSS analysis (button size ratios, color contrast between accept/reject)
- Mutates or removes the offending elements
- Shows a subtle "Sieve removed a dark pattern" indicator

**Features:**
- [ ] Remove fake countdown timers
- [ ] Rewrite guilt-trip dismiss copy to neutral ("No thanks")
- [ ] Highlight pre-ticked checkboxes
- [ ] Equalize cookie consent button sizes
- [ ] Dim fake scarcity messages
- [ ] Show counter in popup: "Removed 3 dark patterns on this page"
- [ ] Toggle individual dark pattern types on/off

**Libraries/tools needed:**
- None — vanilla JS DOM manipulation
- Reference: [darkpatterns.org](https://darkpatterns.org) for pattern catalogue
- Reference: [ui-deceptive-patterns](https://github.com/nicktacular/ui-deceptive-patterns) for CSS heuristics

**Key files:**
```
content/dark-patterns.js        — main detector and remover
content/patterns/timers.js      — countdown timer detection
content/patterns/guilt-copy.js  — guilt-trip copy detection
content/patterns/checkboxes.js  — pre-ticked checkbox detection
content/patterns/cookies.js     — cookie banner normalizer
```

**Gotchas:**
- False positives are the enemy — a legitimate timer (e.g. a cooking timer) should not be removed
- Use multiple signals: element position, parent context, text content, CSS classes
- Cookie consent varies hugely by site — start with the most common CMPs (OneTrust, Cookiebot)

---

## Phase 4 — AI Features
**Difficulty: ⭐⭐⭐⭐ Hard**
**Timeline: Month 7–9**
**Goal: The features that make Sieve feel truly intelligent**

These modules require running ML models in the browser. They're harder to build and test, but they're the features no simple extension can easily replicate.

---

### Module 4A — Toxic Comment Hider

**What it does:**
Scans comment sections on supported sites and collapses comments detected as toxic, hateful, or abusive.

**How it works:**
- Content script identifies comment elements on the page using site-specific selectors
- Extracts comment text and passes it to the toxicity model
- Model runs locally in the browser (no API call, no server)
- Toxic comments are collapsed and replaced with a label

**Supported sites (Phase 1):**
- YouTube comments
- Reddit comments
- X (Twitter) replies
- News site comment sections (Disqus)

**AI library:** `@tensorflow-models/toxicity`
- Runs 100% in browser via TensorFlow.js
- Detects: `identity_attack`, `insult`, `obscene`, `severe_toxicity`, `threat`, `toxicity`
- ~25MB model, ~30ms per sentence inference time
- MIT licensed, free, open source

**Features:**
- [ ] Collapse toxic comments and show reason label ("Hidden: insult")
- [ ] User can click to expand and read anyway
- [ ] Adjustable sensitivity: Strict / Moderate / Light
- [ ] Works on YouTube, Reddit, X, Disqus
- [ ] Show count in popup: "Hid 12 toxic comments on this page"
- [ ] Toggle on/off per site

**Key files:**
```
content/toxic-comments.js         — comment finder and classifier
content/site-selectors/youtube.js — YouTube comment DOM selectors
content/site-selectors/reddit.js  — Reddit comment DOM selectors
content/site-selectors/twitter.js — X/Twitter reply DOM selectors
models/toxicity/                  — bundled TF.js toxicity model
```

**Gotchas:**
- Load the TF.js model once in the background service worker and reuse — don't reload per page
- YouTube comments load lazily — use `MutationObserver` to detect new comments as user scrolls
- Batch comments before classifying — don't call `model.classify()` per comment, do 10–20 at a time
- The model is ~25MB — cache it in `chrome.storage` or IndexedDB after first load

**Code example:**
```javascript
import * as toxicity from '@tensorflow-models/toxicity';

const THRESHOLD = 0.85; // only flag if 85%+ confident
const model = await toxicity.load(THRESHOLD);

async function scanComments(comments) {
  const texts = comments.map(c => c.textContent);
  const predictions = await model.classify(texts);
  
  comments.forEach((comment, i) => {
    const isToxic = predictions.some(p => p.results[i].match);
    if (isToxic) collapseComment(comment);
  });
}
```

---

### Module 4B — Gore & Violence Filter

**What it does:**
Detects graphic, violent, or disturbing images on any website and replaces them with a blurred placeholder.

**How it works:**
- Content script finds all `<img>` tags and video thumbnails on the page
- Each image is passed through the NSFWJS model running locally in the browser
- Images classified as graphic/violent are blurred using CSS
- User can click to reveal any blurred image

**AI library:** `nsfwjs`
- Runs 100% in browser via TensorFlow.js
- MIT licensed, free, open source
- ~7MB model size
- Categories: `Neutral`, `Drawing`, `Sexy`, `Hentai`, `Porn`
- **Note:** NSFWJS doesn't have a native "gore" category — use it as a base and supplement with a keyword-based URL heuristic for known gore domains

**Features:**
- [ ] Blur images classified as graphic/disturbing
- [ ] Replace with a clean placeholder showing "Hidden by Sieve"
- [ ] User can click placeholder to reveal image
- [ ] Works on image-heavy sites: Reddit, Twitter, news sites
- [ ] Sensitivity slider: Strict / Moderate (affects confidence threshold)
- [ ] Toggle on/off

**Key files:**
```
content/gore-filter.js       — image scanner and blurrer
models/nsfwjs/               — bundled NSFWJS model
content/image-overlay.css    — blur and placeholder styles
```

**Gotchas:**
- Running NSFWJS on every image is CPU-heavy — only classify images above a minimum size (e.g. 100x100px)
- Use `IntersectionObserver` to only classify images when they enter the viewport — don't classify off-screen images
- Blur is CSS only: `filter: blur(20px)` — easy to apply and reverse
- Images inside `<canvas>` or CSS backgrounds are harder to detect — skip these for v1
- For gore specifically (not just NSFW): supplement NSFWJS with a domain blocklist of known gore sites

**Code example:**
```javascript
import * as nsfwjs from 'nsfwjs';

const model = await nsfwjs.load();

async function checkImage(imgElement) {
  const predictions = await model.classify(imgElement);
  const neutral = predictions.find(p => p.className === 'Neutral').probability;
  
  if (neutral < 0.6) { // less than 60% chance it's safe
    blurImage(imgElement);
  }
}

function blurImage(img) {
  img.style.filter = 'blur(20px)';
  img.style.cursor = 'pointer';
  img.title = 'Hidden by Sieve — click to reveal';
  img.addEventListener('click', () => img.style.filter = 'none', { once: true });
}
```

---

## Phase 5 — Polish & Expand
**Difficulty: ⭐⭐⭐⭐⭐ Ongoing**
**Timeline: Month 10+**
**Goal: Make Sieve feel like a complete, professional product**

---

### 5A — Settings sync across browsers
- Sync user settings between Chrome and Firefox installs
- Use `chrome.storage.sync` for settings under 100KB
- For larger data (blocklists, usage stats), keep local only

### 5B — Parental PIN lock
- Allow a parent to set a PIN that prevents a child from toggling modules off
- PIN stored hashed in `chrome.storage.local`
- Separate "parent mode" and "user mode" in the popup UI

### 5C — Usage reports
- Weekly email-style summary shown in a dedicated report page
- Charts: time saved, comments hidden, sites blocked, dark patterns removed
- Export as CSV or PDF

### 5D — Edge support
- Microsoft Edge uses the same Chromium engine — the Chrome extension works on Edge with zero changes
- Submit to the Microsoft Edge Add-ons store

### 5E — Community blocklists
- Let users subscribe to community-maintained blocklists (gambling, gore domains, etc.)
- Host blocklists as JSON files on GitHub — users can add custom list URLs
- Update blocklists automatically in the background weekly

### 5F — Cross-promotion with your porn blocker
- In Sieve's popup, add a quiet "Also by this developer" section linking to your porn blocker
- In your porn blocker, add the same for Sieve
- Same branding language: "From the maker of [Porn Blocker Name]"

---

## Technical Stack Summary

| Layer | Technology |
|-------|-----------|
| Extension framework | Manifest V3 (Chrome + Firefox) |
| Language | JavaScript (vanilla) — no framework needed |
| Content blocking | `declarativeNetRequest` API |
| DOM manipulation | Vanilla JS + `MutationObserver` |
| Time tracking | `chrome.tabs` + `chrome.alarms` |
| Storage | `chrome.storage.local` + `chrome.storage.sync` |
| Toxicity detection | `@tensorflow-models/toxicity` (TF.js) |
| Image classification | `nsfwjs` (TF.js) |
| Word list | `badwords-list` npm package + custom list |
| Build tool | Webpack or esbuild (needed for TF.js bundling) |

---

## Privacy Commitments (build these in from day 1)

- All AI models run locally in the browser — no images or text are ever sent to a server
- No user data is collected or transmitted
- No analytics, no tracking
- Usage stats are stored locally on the user's device only
- Open source — users can verify the code themselves

---

## What to build on Day 1

1. Set up the extension scaffold (manifest.json, popup, background service worker)
2. Implement the bad language filter — this is the fastest win
3. Add the gambling blocklist using a free open source domain list
4. Build the popup UI with two toggles
5. Submit to Chrome Web Store and Firefox Add-ons
6. Add a cross-promotion link to your porn blocker

That's your v1.0. Ship it, get users, then move to Phase 2.

# Sieve — Phase 3 Prompt & TODO
**Phase 3: Smart Blocking**
**Module: Dark Pattern Blocker (3A)**

---

## How to use this file

1. Copy the **PROMPT** section below into Claude / Claude Code
2. Make sure your `sieve-phases.md` is also attached or in the project
3. Work through the TODO checklist — tick items off as each is confirmed

> ⚠️ **Phase 3 is a real step up in difficulty.** The dark pattern blocker is
> the trickiest thing you've built so far because **false positives are the enemy**.
> A legitimate countdown (a cooking timer, a real auction) must NOT be removed.
> Go slow. Test on lots of real sites. Tune the heuristics carefully.

---

## THE PROMPT (copy this)

```
Phase 1 (Bad Language + Gambling Blocker) and Phase 2 (Doomscroll Stopper + 
Social Media Timer) are complete, tested, and working. Do not touch any 
Phase 1 or Phase 2 code unless absolutely required — and if so, tell me 
exactly what you are changing and why.

Now we are building Phase 3 — Smart Blocking.
Refer to sieve-phases.md for the full spec.

Phase 3 has one module:
- Module 3A: Dark Pattern Blocker

RULES:
1. Build one step at a time. Wait for my "confirmed" before each next step.
2. No AI, no external libraries — vanilla JS and browser APIs only.
3. FALSE POSITIVES ARE THE ENEMY. Every detection must use multiple signals,
   not just one keyword. When unsure, do NOT remove — flag instead.
4. After writing any code, explain what it does in plain English AND tell me
   what could trigger a false positive so I can test for it.
5. If anything in the spec is unclear, ask before assuming.
6. Keep functions small and focused — one pattern type per file.

=== MODULE 3A — DARK PATTERN BLOCKER ===

Build each dark pattern type as its own separate file so they can be 
toggled independently and tested in isolation.

Step 1: content/dark-patterns.js (the coordinator)
- Runs on page load + on DOM mutations (MutationObserver)
- Calls each individual pattern detector
- Keeps a running count of patterns removed on the page
- Sends the count to the popup

Step 2: content/patterns/timers.js — Fake countdown timers
- Detect elements counting DOWN in real time (e.g. "09:58", "09:57"...)
- REQUIRE multiple signals before acting:
  a) Element text matches a time pattern (MM:SS or "ends in X")
  b) The number is actively decreasing
  c) Nearby text contains urgency words (offer, hurry, ends, limited, sale)
- If all signals present: remove or neutralize the timer
- If only ONE signal: do nothing (could be a legit clock/timer)

Step 3: content/patterns/guilt-copy.js — Guilt-trip dismiss buttons
- Detect dismiss/close buttons with manipulative negative-framing text
- Examples: "No thanks, I don't want to save money", "No, I hate discounts"
- Rewrite the button text to a neutral "No thanks" / "Close"
- Do NOT remove the button — just neutralize the manipulative copy

Step 4: content/patterns/checkboxes.js — Pre-ticked checkboxes
- Find checkboxes that are checked by default on page load
- Especially near keywords: subscribe, newsletter, marketing, offers, consent
- Do NOT uncheck them automatically (could break forms)
- Instead: highlight them with a yellow outline + small "pre-checked" label
- Let the user decide

Step 5: content/patterns/cookies.js — Cookie consent dark patterns
- Detect cookie consent banners (start with common CMPs: OneTrust, Cookiebot)
- If the "Accept" button is visually dominant and "Reject" is hidden/tiny:
  make both buttons equal size and visibility
- Do NOT auto-click anything — just level the playing field

Step 6: content/patterns/scarcity.js — Fake scarcity
- Detect "Only X left!" messages
- Multiple signals: phrase match + the number never changes on reload
- If detected: dim the element and add a small "unverified" tag
- Do NOT remove — just reduce its visual pressure

Step 7: popup (update)
- Add a "Dark Pattern Blocker" section
- Master toggle + individual toggles per pattern type
- Show count: "Removed 3 dark patterns on this page"
- Keep all Phase 1 + Phase 2 toggles untouched

After Step 7, I will test Module 3A on MANY real sites (shopping sites, 
news sites, sign-up forms) to confirm it works and false positives are 
acceptable.

After each step:
- Show me the code
- Explain it in plain English
- Tell me what could cause a false positive or bug
- Wait for my "confirmed"

Start with Module 3A, Step 1 only.
```

---

## TODO CHECKLIST

### Module 3A — Dark Pattern Blocker
- [ ] Step 1: `content/dark-patterns.js` — coordinator + page counter
- [ ] Step 2: `content/patterns/timers.js` — fake countdown timers
- [ ] Step 3: `content/patterns/guilt-copy.js` — guilt-trip buttons
- [ ] Step 4: `content/patterns/checkboxes.js` — pre-ticked checkboxes
- [ ] Step 5: `content/patterns/cookies.js` — cookie banner normalizer
- [ ] Step 6: `content/patterns/scarcity.js` — fake scarcity messages
- [ ] Step 7: popup — master + per-pattern toggles, removed count
- [ ] **TEST 3A on many real sites** (see testing list below)
- [ ] Confirm no false positives on legit timers/forms
- [ ] Confirm guilt-trip copy gets neutralized
- [ ] Confirm pre-checked boxes get highlighted (not auto-unchecked)
- [ ] Confirm cookie banners get leveled (nothing auto-clicked)

### Phase 3 Final Checks
- [ ] All Phase 1 + Phase 2 features still work (nothing broke)
- [ ] All Phase 3 toggles save state independently
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Bump version to 1.2.0 in manifest.json
- [ ] Ready to ship Phase 3

---

## Sites to test Module 3A on (false-positive hunting)

**Should trigger (real dark patterns):**
- Fast fashion sites (SHEIN, Temu-style) — fake timers + scarcity
- Booking sites (hotels, flights) — "Only 2 rooms left!" scarcity
- Newsletter popups — guilt-trip dismiss copy
- Sign-up forms — pre-ticked marketing checkboxes
- Most news/blog sites — cookie consent dark patterns

**Should NOT trigger (legit elements — false-positive risk):**
- A real cooking timer app — legit countdown, must NOT be removed
- An online auction (eBay) — legit countdown to auction end
- A genuine limited event countdown (concert tickets going on sale)
- A normal form with an intentionally checked "remember me" box
- A site with a simple, fair cookie banner

If anything in the second list gets touched, the heuristics are too 
aggressive — tighten them by requiring more signals.

---

## Gotchas to watch (from the spec)

- A single keyword is NEVER enough — always require multiple signals
- For timers: confirm the number is actually *decreasing* before acting
- Never auto-click cookie buttons — just resize/reveal, let the user choose
- Never auto-uncheck checkboxes — highlight only, or you may break form submissions
- Cookie consent varies hugely by site — start with OneTrust + Cookiebot, expand later

---

## When Phase 3 is done

Come back and we'll prep the **Phase 4 prompt — AI Features**
(Toxic Comment Hider + Gore/Violence Filter). That's the hardest phase —
it brings in the TensorFlow.js models that run locally in the browser.
We'll go extra slow and careful there since ML in an extension has its
own set of challenges (model size, caching, performance).

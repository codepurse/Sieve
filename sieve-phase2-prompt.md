# Sieve — Phase 2 Prompt & TODO
**Phase 2: Wellbeing Guard**
**Modules: Doomscroll Stopper (2A) + Social Media Timer (2B)**

---

## How to use this file

1. Copy the **PROMPT** section below into Claude / Claude Code
2. Make sure your `sieve-phases.md` is also attached or in the project
3. Work through the TODO checklist as you go — tick items off as each is confirmed
4. Build Module 2A completely before starting Module 2B

---

## THE PROMPT (copy this)

```
Phase 1 (Bad Language Filter + Gambling Blocker) is complete, tested, 
and working on real websites. Do not touch any Phase 1 code.

Now we are building Phase 2 — Wellbeing Guard.
Refer to sieve-phases.md for the full spec.

Phase 2 has two modules:
- Module 2A: Doomscroll Stopper
- Module 2B: Social Media Timer

RULES:
1. Build Module 2A completely first. Do not start 2B until I confirm 2A works.
2. Build one step at a time. Wait for my "confirmed" before each next step.
3. No AI, no external libraries — vanilla JS and browser APIs only.
4. Do not modify any Phase 1 files unless absolutely required, and if so, 
   tell me exactly what you are changing and why.
5. After writing any code, explain what it does in plain English.
6. If anything in the spec is unclear, ask me before assuming.
7. Keep functions small and focused.

=== MODULE 2A — DOOMSCROLL STOPPER ===

Build in this order:

Step 1: data/site-configs.json
- List of supported social media sites
- For each site: domain, display name, and the CSS selector for its main feed
- Start with: Twitter/X, Instagram, TikTok, Reddit, Facebook, YouTube

Step 2: content/doomscroll.js
- Detect which supported site the user is on
- Track time spent actively scrolling (using scroll events + timestamps)
- Read the user's daily time limit from chrome.storage.local
- When the time limit is hit, trigger the pause overlay
- Use MutationObserver only if needed for dynamic feeds

Step 3: content/pause-overlay.js
- Full-screen overlay injected when limit is reached
- z-index must be 2147483647 (above everything)
- Show a calm, mindful message
- Three buttons: "Snooze 5 min", "Stop for today", "Dismiss"
- Snooze resets the timer for 5 minutes
- Stop for today blocks scrolling tracking until midnight

Step 4: background/service-worker.js (update)
- Use chrome.alarms to reset daily scroll stats at midnight
- Store daily stats: { site: { date: minutesScrolled } }
- Keep all Phase 1 logic untouched

Step 5: popup (update)
- Add a "Doomscroll Stopper" section to the popup
- Per-site toggle (user picks which sites to track)
- Let user set their daily time limit (minutes)
- Show today's scroll time per site
- Keep all Phase 1 toggles untouched

After Step 5, I will test Module 2A on real sites. 
Only after I confirm it works do we start Module 2B.

=== MODULE 2B — SOCIAL MEDIA TIMER ===
(Do NOT start this until I confirm 2A is working)

Step 1: background/time-tracker.js
- Track active tab time per domain
- Only count time when tab is active AND window is focused
- Use chrome.tabs.onActivated and document.visibilityState
- Store usage as { domain: { date: secondsSpent } }

Step 2: content/nudge-overlay.js
- Soft overlay shown when a site's daily time budget is reached
- NOT a hard block — user can dismiss and keep browsing
- Gentle message reminding them of their goal

Step 3: background/service-worker.js (update)
- When a domain hits its daily budget, message the content script
- Reset budgets at midnight using chrome.alarms

Step 4: popup (update)
- Add a "Social Media Timer" section
- Let user set daily budget per site (in minutes)
- Show a weekly usage summary as a simple bar chart (HTML/CSS, no library)
- Countdown of remaining time shown while on a tracked site
- Keep everything else untouched

After each step:
- Show me the code
- Explain it in plain English
- Wait for my "confirmed"

Start with Module 2A, Step 1 only.
```

---

## TODO CHECKLIST

### Module 2A — Doomscroll Stopper
- [ ] Step 1: `data/site-configs.json` — supported sites + feed selectors
- [ ] Step 2: `content/doomscroll.js` — scroll tracker (time)
- [ ] Step 3: `content/pause-overlay.js` — pause screen with 3 buttons
- [ ] Step 4: `background/service-worker.js` — midnight reset + daily stats
- [ ] Step 5: popup — per-site toggle, limit settings, today's stats
- [ ] **TEST 2A on real sites** (Instagram, X, TikTok, Reddit, YouTube)
- [ ] Confirm pause overlay appears at the right time
- [ ] Confirm snooze works (5 min grace)
- [ ] Confirm "stop for today" works until midnight
- [ ] Confirm stats reset at midnight

### Module 2B — Social Media Timer
- [ ] Step 1: `background/time-tracker.js` — active tab time tracking
- [ ] Step 2: `content/nudge-overlay.js` — soft nudge overlay
- [ ] Step 3: `background/service-worker.js` — budget check + midnight reset
- [ ] Step 4: popup — per-site budgets, weekly chart, live countdown
- [ ] **TEST 2B on real sites**
- [ ] Confirm time only counts when tab is active + focused
- [ ] Confirm soft nudge appears at budget limit
- [ ] Confirm nudge is dismissible (not a hard block)
- [ ] Confirm weekly summary chart is accurate
- [ ] Confirm budgets reset at midnight

### Phase 2 Final Checks
- [ ] All Phase 1 features still work (nothing broke)
- [ ] All Phase 2 toggles save state independently
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Bump version to 1.1.0 in manifest.json
- [ ] Ready to ship Phase 2

---

## Testing Tips for Phase 2

**Doomscroll Stopper:**
- Set a very low time limit (e.g. 30 seconds) while testing so you don't have to scroll forever
- Test that the overlay doesn't appear on non-social sites
- Test that closing and reopening a tab doesn't reset the daily counter

**Social Media Timer:**
- Set a 1-minute budget for testing
- Switch between tabs to confirm time only counts on the active focused tab
- Leave a tab open but unfocused — time should NOT count
- Check the weekly chart updates correctly across days

---

## Gotchas to watch (from the spec)

- TikTok and Instagram use virtualized scroll → track `scroll` on `window`, not the feed element
- Pause overlay needs `z-index: 2147483647` to sit above everything
- Only count active tab time when `document.visibilityState === 'visible'` AND window is focused
- Use `chrome.alarms` for midnight resets — `setTimeout` won't survive the service worker sleeping
- Store stats per-date so the weekly summary can read back history

---

## When Phase 2 is done

Come back and we'll prep the **Phase 3 prompt — Smart Blocking** 
(Dark Pattern Blocker). That's the phase where Sieve 
becomes truly unique — no other extension does dark pattern blocking well.

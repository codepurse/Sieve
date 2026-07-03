# Sieve — Financial Protection Module — Build Prompt & TODO

**A Phase 5 addition. Extends your existing gambling-blocker mechanism.**
**Adds a "Financial Protection" settings section with two independent opt-in toggles.**

---

## What this module is

A new settings section called **Financial Protection** containing two SEPARATE,
independent, opt-in toggles:

1. **Block crypto & investment scams** — uses an auto-updating community scam
   feed. This is fraud, safe to block aggressively.
2. **Block trading & exchange sites** — uses a SMALL, hand-maintained list of
   legitimate platforms (Coinbase, Kraken, Robinhood, forex brokers, etc.).
   For users who want to stay away from legit-but-addictive trading.

Both are OFF by default. The two lists are kept completely separate — a scam
feed must NEVER flag a legitimate exchange.

---

## KEY DECISIONS (locked in — do not deviate)

- **Opt-in only.** Both toggles default OFF. Sieve never decides crypto is bad
  for everyone — the user chooses, same logic as the gambling blocker.
- **Two separate lists, never mixed:**
  - Scam tier -> auto-updating feed (scamsniffer primary)
  - Trading tier -> small hand-maintained JSON list, shipped in the extension
- **Auto-update the scam list.** Crypto scam domains churn FAST — a static
  bundled list is worthless within weeks. The scam feed must refresh in the
  background on a schedule. (This is the big difference from the gambling
  blocker, where a static list ages gracefully.)
- **Reuse the gambling-blocker mechanism.** Same declarativeNetRequest approach,
  same blocked-page pattern, same allowlist logic. Do not invent a new system.
- **Respect declarativeNetRequest rule limits.** Do NOT load a million-domain
  list. Cap the scam list to a safe subset (e.g. 25,000-30,000 most-recent /
  highest-confidence domains) that fits within MV3 limits.
- **Grouped UI, not a standalone crypto section.** One "Financial Protection"
  section with two toggles inside it.

---

## DATA SOURCES

**Scam tier (auto-updating):**
- Primary: scamsniffer/scam-database
  https://github.com/scamsniffer/scam-database
  (industry-trusted, refreshed daily, free data has a 7-day delay — acceptable)
- Optional supplement for freshness: spmedia Crypto-Scam Threat Intel Feed
  https://github.com/spmedia/Crypto-Scam-and-Crypto-Phishing-Threat-Intel-Feed
- NOTE: verify the exact current raw file URLs at build time — these repos
  change paths. Do not hardcode a URL without confirming it resolves.

**Trading tier (hand-maintained, shipped in extension):**
- A small JSON file YOU control, e.g. data/trading-sites.json
- Starter entries: coinbase.com, kraken.com, binance.com, robinhood.com,
  etoro.com, kucoin.com, bybit.com, crypto.com, gemini.com, plus major
  forex/CFD brokers. Keep it short and curated. NEVER auto-populate this from
  a scam feed.

---

## THE PROMPT (copy this)

```
Context: Sieve is a browser extension (MV3, Chrome + Firefox). Phases 1-4 are
complete and working, including a gambling blocker that uses declarativeNetRequest
with a domain list, a blocked page, and an allowlist. Do not touch existing code
unless absolutely required — and if so, tell me exactly what and why.

Now build a new "Financial Protection" module. It REUSES the existing
gambling-blocker mechanism (declarativeNetRequest + blocked page + allowlist).

CRITICAL DESIGN (do not deviate):
- One new settings section called "Financial Protection" with TWO independent,
  opt-in toggles, both OFF by default:
    1) "Block crypto & investment scams"  (auto-updating scam feed)
    2) "Block trading & exchange sites"   (small hand-maintained list)
- The two lists are SEPARATE and must NEVER be mixed. A scam feed must never
  flag a legitimate exchange.
- The scam list AUTO-UPDATES in the background on a schedule (crypto scam
  domains churn fast — a static list goes stale in weeks).
- The trading list is a small JSON file shipped inside the extension that I
  maintain by hand.
- Respect declarativeNetRequest limits — cap the scam list to a safe subset
  (target ~25,000-30,000 domains max) so we stay within MV3 static+dynamic
  rule limits. Explain how you're staying under the limit.

RULES:
1. Build one step at a time. Wait for my "confirmed" before each next step.
2. After each step, explain it in plain English.
3. Reuse the gambling blocker's patterns — do not invent a parallel system.
4. Verify any remote list URL actually resolves before relying on it; if a URL
   is uncertain, tell me and I'll confirm the correct one.
5. If anything is unclear, ask before assuming.

BUILD STEPS:

Step 1: data/trading-sites.json
- Small hand-maintained JSON array of legitimate trading/exchange domains
- Seed it with: coinbase.com, kraken.com, binance.com, robinhood.com,
  etoro.com, kucoin.com, bybit.com, crypto.com, gemini.com (+ a few major
  forex/CFD brokers)
- Structure it so subdomains are covered (e.g. block *.coinbase.com)

Step 2: Scam list fetch + storage
- Write a background function that fetches the crypto scam domain list from the
  scamsniffer source (confirm the correct raw URL with me first)
- Parse it into clean domains (strip comments, hosts-file prefixes, blank lines)
- Cap to the most recent / top ~25,000-30,000 domains to respect rule limits
- Store the parsed list in chrome.storage.local with a "lastUpdated" timestamp

Step 3: Auto-update scheduler
- Use chrome.alarms to re-fetch the scam list on a schedule (e.g. every 24h)
- On update: re-parse, re-cap, replace stored list, refresh the dynamic rules
- If a fetch fails (offline, 404), keep the last good list and try again next
  cycle — never wipe the working list on a failed fetch
- Show "last updated" time in the options page

Step 4: Build the blocking rules
- Convert BOTH lists into declarativeNetRequest rules, but keep them as TWO
  separate rule groups/rulesets so each toggle enables/disables independently:
    - scamRules  (from the fetched scam list)
    - tradingRules (from data/trading-sites.json)
- Block main domain + subdomains
- Reuse the existing blocked-page; pass which category triggered the block so
  the page can show an appropriate message

Step 5: Allowlist integration
- Reuse the existing gambling-blocker allowlist logic so a user can unblock a
  specific site if needed
- Allowlist entries override both scam and trading rules

Step 6: Settings UI — "Financial Protection" section
- Add ONE new section titled "Financial Protection" (grouped, not a standalone
  crypto section)
- Inside it, two independent toggles, both OFF by default:
    [ ] Block crypto & investment scams
        subtext: "Blocks known crypto scams, phishing, and fraud sites.
                  Auto-updated daily."
    [ ] Block trading & exchange sites
        subtext: "Blocks legitimate exchanges and trading platforms
                  (Coinbase, Robinhood, forex, etc.) — for staying away
                  from speculative trading."
- Each toggle independently enables/disables its ruleset
- Show "Scam list last updated: <time>" under the scam toggle
- Keep all existing settings (Phase 1-4) untouched

Step 7: Blocked page messaging
- When a scam site is blocked: clear warning tone
  ("This site is a known crypto scam or phishing site — blocked by Sieve")
- When a trading site is blocked: gentle/self-control tone
  ("You chose to block trading sites. Blocked by Sieve.")
- Both reuse the existing blocked-page template

Step 8: Test pass
- Confirm both toggles work independently (one on, one off, both, neither)
- Confirm scam list fetches, parses, and caps correctly
- Confirm auto-update runs and a failed fetch keeps the last good list
- Confirm allowlist overrides both
- Confirm we stay within declarativeNetRequest rule limits
- Confirm NO legitimate exchange appears in the scam list (the lists are separate)
- Confirm Phase 1-4 features still work

Start with Step 1 (data/trading-sites.json) only.
```

---

## TODO CHECKLIST

- [ ] Step 1: `data/trading-sites.json` — small hand-maintained exchange list
- [ ] Step 2: scam list fetch + parse + cap + store with timestamp
- [ ] Step 3: auto-update scheduler (chrome.alarms, keep-last-good-on-failure)
- [ ] Step 4: two SEPARATE rule groups (scamRules + tradingRules)
- [ ] Step 5: allowlist integration (reuse gambling logic)
- [ ] Step 6: "Financial Protection" settings section, two opt-in toggles
- [ ] Step 7: blocked-page messaging per category
- [ ] Step 8: test pass
- [ ] Confirm both toggles independent
- [ ] Confirm scam list auto-updates + survives failed fetch
- [ ] Confirm under declarativeNetRequest rule limits
- [ ] Confirm scam list and trading list never mix
- [ ] Confirm Phase 1-4 untouched
- [ ] Bump version in manifest.json

---

## Why the two tiers are separate (the core principle)

| | Scam tier | Trading tier |
|---|---|---|
| What it blocks | Fraud, phishing, fake platforms | Legitimate exchanges/brokers |
| List source | Auto-updating community feed | Hand-maintained by you |
| Update cadence | Daily (domains churn fast) | Rarely (legit platforms are stable) |
| Block tone | "This is a scam" (warning) | "You chose to block this" (self-control) |
| Safe to block hard? | Yes | Only because user opted in |

Mixing them is the one mistake that would hurt users — telling someone Coinbase
is a "scam" because it leaked in from a feed would destroy trust. Keep them apart.

---

## Honest cautions (carry these into the build)

- **Churn:** the scam list MUST auto-update. Verify the update actually runs
  (test by checking the "last updated" timestamp changes).
- **URL drift:** these GitHub repos move file paths over time. Confirm the raw
  list URL resolves before depending on it; don't hardcode blindly.
- **Rule limits:** MV3 caps static + dynamic rules. A 1.7M-domain list will NOT
  fit — that's why you cap to a recent/high-confidence subset. If you later want
  the giant list, that becomes an optional "aggressive mode" + a different
  loading strategy, not the default.
- **False positives:** even good scam feeds occasionally list a domain wrongly.
  The allowlist is the user's escape hatch — make sure it's easy to find.
- **Don't over-scope:** this section is for financial HARM (scams + opt-in
  trading). It is not a general "block all finance" tool. Resist adding
  unrelated categories here.

---

## Where this fits in settings (grouped, not standalone)

```
Harm Blockers
├── Gambling               [ existing ]
└── Financial Protection   [ new ]
    ├── Block crypto & investment scams   [ OFF ]
    └── Block trading & exchange sites    [ OFF ]
```

One logical home that can later hold more financial-harm categories (predatory
lending, fake investment schemes) without cluttering the settings page.

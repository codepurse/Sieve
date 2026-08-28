# Privacy Policy for Sieve

**Last updated: August 28, 2026**

## The short version

**Sieve does not collect, store, sell, or transmit any personal data.**
Everything it does happens locally, on your own device. There is no account,
no sign-up, no analytics, and nothing about you is ever sent anywhere.

One feature deliberately keeps a record for you: **Usage Insights**, the
screen-time report, which is off until you switch it on. What it stores, and how
to limit or erase it, is spelled out [below](#usage-insights-screen-time--off-unless-you-turn-it-on).
That record lives in your browser and is yours alone — it is not telemetry, and
we never see it.

Sieve is open source, so anyone can verify these claims:
<https://github.com/codepurse/Sieve>

---

## What data Sieve handles, and where it stays

All of the following is stored **only in your browser, on your device**
(`chrome.storage.local` and IndexedDB). None of it is ever sent to us or to any
third party.

| Data | Purpose | Stays on device? |
|------|---------|------------------|
| Your settings and toggle states | Remember which filters you turned on | Yes |
| Per-site time limits and daily counters | Enforce doomscroll limits and show stats | Yes |
| Custom blocked-sites and allowlist entries | Block/allow the sites you choose | Yes |
| Guardian PIN | Lock your own settings; stored as a **hash**, never in plain text | Yes |
| Cached blocklists | Match sites quickly and offline | Yes |
| Screen-time tally, **only if you turn Usage Insights on** | Show you where your time goes | Yes |

Sieve also reads the content of web pages you visit **in the page itself** — for
example, to mask profanity, hide toxic comments, remove dark patterns, or count
how long you have been scrolling. This processing is momentary and local: the
page content is **never copied, stored, or transmitted** anywhere.

### Usage Insights (screen time) — off unless you turn it on

Usage Insights is the one feature that keeps a record of where you have been, so
it is worth being exact about it. It is **off by default**. While it is on, Sieve
stores, on your device only:

- the **site name** of the page in the tab you are looking at (`youtube.com`),
  never the full URL, the page title, or anything you did there;
- **how many milliseconds** you spent on it, and in which hour of which day.

It counts only the tab you are actually looking at, in a focused window, while
the screen is unlocked. Extension pages, the new-tab page, local files and
private windows are never counted.

You are in control of the record: choose how long it is kept (7, 30 or 90 days
— anything older is deleted automatically), clear it at any time with **Clear
history**, and turn the feature off to stop it entirely. Turning it off keeps
what was already measured; **Clear history** is what erases it.

This data is never transmitted anywhere, is not used for any purpose other than
drawing your own report back to you, and is deleted with the extension.

---

## What Sieve does NOT do

- It does **not** create an account or ask you to log in.
- It does **not** collect your name, email, location, or any identifier.
- It does **not** upload your browsing history, the URLs you visit, page
  content, keystrokes, or activity — to us or to anyone else. (If you switch on
  Usage Insights, a site-name-and-duration tally is kept **on your device**, as
  described above; it is still never uploaded.)
- It does **not** use analytics, telemetry, advertising, or fingerprinting.
- It does **not** sell or share any data with third parties.
- It does **not** use any data to determine creditworthiness or for lending.

---

## Network activity (full transparency)

Sieve makes outbound network requests only to **download files to your device** —
never to upload anything about you. Specifically:

- **Blocklists** — publicly available lists (for example, known gambling, scam,
  malware, and phishing domains) are downloaded so protection stays current.
- **Optional toxicity model** — if you enable smart toxic-comment detection, that
  on-device model is **downloaded once and cached** for local use.
- **Announcement check** — when you open Sieve's settings page, it fetches a small
  public JSON file from the project's GitHub repository to see whether there's an
  optional in-app notice to show (for example, a new feature). It sends no
  information about you, and if the file is unreachable nothing is shown. You can
  dismiss any notice permanently.

These are all **downloads to your device**. They do not include your identity, your
browsing history, page content, or any personal information beyond the normal
network request needed to fetch a file. As with any web request, the host serving
a file (a blocklist provider, the model host, or GitHub for the announcement) may
observe your IP address. No user data is sent in the other direction.

---

## Permissions

Sieve requests only the permissions needed to filter content locally:

- **storage / unlimitedStorage** — save your settings and cache large blocklists on your device.
- **declarativeNetRequest** — block requests to harmful sites by URL (it does not read page content to do this).
- **alarms** — refresh blocklists on a schedule and reset daily counters at midnight.
- **webNavigation** — detect navigations so a harmful page can be blocked before it loads.
- **tabs** — open the local "blocked"/settings pages and close popup/hijack tabs. It does not read your browser history. If you switch Usage Insights on, it also reads the site name of the tab you are looking at, in order to time it.
- **idle** — used only by Usage Insights, to stop the clock when you step away or lock the screen. It reports how long it has been since you touched the keyboard or mouse; it cannot see what you typed.
- **offscreen** — run the optional toxicity model locally, off the main page.
- **host access (all sites)** — required because harmful content can appear on any site; used only to run the local filters. No browsing data is collected.

---

## Chrome Web Store data disclosure

In the Chrome Web Store's terms, "collect" means transferring data off the
user's device. Sieve transfers nothing, so it declares that it does **not**
collect any of the following: personally identifiable information, health
information, financial and payment information, authentication information,
personal communications, location, web history, user activity, or website
content.

To be plain about the one case where that wording could mislead: if you switch
on Usage Insights, a tally of site names and durations is written **to your own
browser storage**, and you can inspect, limit or erase it at any time. Nothing
about it is ever sent to us or to a third party, which is why the declaration
above is still accurate.

---

## Children

Sieve does not knowingly collect data from anyone, including children, because
nothing it records ever leaves the device.

## Changes to this policy

If this policy changes, the updated version will be posted here with a new
"Last updated" date.

## Contact

Questions about privacy? Email **support@monolab.dev** or open an issue at
<https://github.com/codepurse/Sieve/issues>.

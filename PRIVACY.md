# Privacy Policy for Sieve

**Last updated: October 29, 2026**

## The short version

**Sieve does not collect, store, sell, or transmit any personal data.**
Everything it does happens locally, on your own device. There is no account,
no sign-up, no analytics, and nothing about you is ever sent anywhere.

One feature deliberately keeps a record for you: **Usage Insights**, the
screen-time report, which is off until you switch it on. What it stores, and how
to limit or erase it, is spelled out [below](#usage-insights-screen-time--off-unless-you-turn-it-on).
That record lives in your browser and is yours alone — it is not telemetry, and
we never see it.

The Dark Pattern Blocker also keeps a small memory, because the only way to
prove a countdown is fake is to see it restart: for 30 days it remembers the
end time a countdown gave, a stock number, or the day a sale said it "ends
today", so it can compare them on your next visit. It is described
[below](#what-the-dark-pattern-blocker-remembers), stays on your device, and can
be erased with one button.

There is one exception to "nothing is sent": **Sieve Pro**, the optional one-time
purchase. If you buy it and type in your licence key, that key is sent to Polar,
the company that sells Sieve Pro for us, to check that it is valid, along with a
plain name for the browser ("Sieve · Edge on Windows") so you can tell your
browsers apart on your purchases page. That happens when you enter or remove the
key and about once a week in between, and only from Sieve's settings page. It is
described [below](#sieve-pro-licence-check). Without Pro, nothing changes.

Sieve is open source, so anyone can verify these claims:
<https://github.com/codepurse/Sieve>. The one exception is Sieve Pro's
features (the Seal, the urge screen and streaks), which are not open source.
They make no network requests and keep everything on your device, and the
licence check, the only request Pro makes, is part of the open-source code
(`common/pro.js`), so what it sends can be checked by anyone.

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
| Cool-off requests, **only if you set a cool-off** | The changes you have asked for and when each unlocks — the change's name, which includes the site when you asked to allow one; each is deleted once used, called off, or lapsed | Yes |
| Cached blocklists | Match sites quickly and offline | Yes |
| Screen-time tally, **only if you turn Usage Insights on** | Show you where your time goes | Yes |
| What a page claimed, while the Dark Pattern Blocker is on | Tell a fake countdown or stock number from a real one on your next visit — see [below](#what-the-dark-pattern-blocker-remembers) | Yes |
| Free-trial reminders, **only the ones you ask for** | Remind you before a free trial starts charging — see [below](#free-trial-reminders) | Yes |
| When the block page last stopped each kind of site | One date and time per kind (gambling, dating, games, AI tools, trading, your own blocked sites) and your longest gap, for Sieve Pro's streaks — never the site or its address | Yes |
| Sieve Pro licence key, **only if you enter one** | Turn on the Pro features | Kept on your device; checked with Polar — see [below](#sieve-pro-licence-check) |
| Seal, **only if you start one** | When it ends, and its emergency key stored as a **hash**, never in plain text | Yes |
| Urge screen, **only what you fill in** | Your reason, an optional photo (shrunk to fit 800 pixels), and a contact's name and number or email address, shown on the block page | Yes |
| Streak settings, **only for what you track** | The day you stopped, and what it used to cost you, to count streaks and money kept | Yes |

Sieve also reads the content of web pages you visit **in the page itself** — for
example, to mask profanity, hide toxic comments, remove dark patterns, or count
how long you spend on a site you set a daily limit for. This processing is momentary and local: the
page content is **never copied or transmitted** anywhere, and it is not stored,
apart from the few numbers described next.

### What the Dark Pattern Blocker remembers

A countdown that starts again every time you reload, or an "only 3 left" that
has said 3 all week, can only be caught by remembering what the page said last
time. So while the Dark Pattern Blocker is on, Sieve keeps, on your device only:

- for a **countdown**: the time it said it would end, and when you saw it;
- for a **"low stock" message**: the number it gave, and the days you saw it;
- for a **"people are viewing this" count**: the number it gave, and when;
- for an **"ends today" sale**: the days the shop said it.

Each is filed under a **scrambled code** made from the site, the page's path and
the claim's wording — never the page address, the page's title, or anything you
did there. Entries are deleted after 30 days, the whole memory is capped at 800
entries, and **nothing seen in a private window is kept**. Settings →
Browsing → *What Sieve remembers* shows how much it holds, and *Forget it all*
erases it. It is never transmitted anywhere.

### Free-trial reminders

When a page offers a free trial that will start charging by itself, Sieve
says what it will cost and when, and offers to remind you before it does.
Nothing is kept unless you press **Remind me**. Then Sieve keeps, on your device
only:

- the **site's name** (`stream.example`), never the full address;
- the day the trial **ends**, and the day to **remind** you;
- the **price** the page gave, if it gave one ("$14.99 a month").

The reminder is shown at the top of a page you visit once it falls due — no
account, no email, and no notification permission needed. It is deleted when
you press **Done** or cancel it from the toolbar popup, and on its own a few
days after the trial ends. A reminder cannot be set from a private window. It is
never transmitted anywhere.

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

### Sieve Pro licence check

Sieve Pro is sold by Polar (polar.sh), who handle the payment, the receipt and
the licence key. Sieve itself never sees your payment details or your email
address.

When you type a licence key into Sieve's settings, Sieve sends **that key and
Sieve's own shop ID** to Polar's licence service (`api.polar.sh`) to ask whether
it is valid. A key works in a few browsers at once, so entering it also takes
one of its places for this browser, under a plain name for the browser and
operating system ("Sieve · Edge on Windows"), never anything that identifies you
or the machine. Sieve asks again about once a week, only when you open its
settings page, so a refunded key stops working; that check carries the key, the
shop ID and this browser's place on the key. **Remove from this browser** gives
the place back (the same three things) and then deletes the key here.

Nothing else is sent: not your browsing, not your settings, not anything the
Pro features keep. Polar knows which purchase the key belongs to, because they
sold it, and may see your IP address, as with any web request.

**In Firefox**, Sieve asks your permission before it sends the key, the first
time you press Activate, through Firefox's own question about data an
extension sends. If you say no, nothing is sent and Pro stays off. Nobody who
does not activate Pro is ever asked.

The key is kept on your device so it can be checked again. The Pro features
themselves (the Seal, the urge screen and streaks) run entirely on your device,
like the rest of Sieve.

---

## What Sieve does NOT do

- It does **not** create an account or ask you to log in.
- It does **not** collect your name, email, location, or any identifier. (A Sieve
  Pro licence key you type in is sent to Polar to check it, as described above.)
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
never to upload anything about you — with the one exception of the Sieve Pro
licence check. Specifically:

- **Blocklists** — publicly available lists (for example, known gambling, scam,
  malware, and phishing domains) are downloaded so protection stays current.
- **Optional toxicity model** — if you enable smart toxic-comment detection, that
  on-device model is **downloaded once and cached** for local use.
- **Lists you subscribe to** — if you add a list to the Search Result Filter, it is
  downloaded from the address you entered when you subscribe, then checked for
  changes about once a day. Only you choose these addresses, and they are stored
  on your device with the list.
- **Announcement check** — when you open Sieve's settings page, it fetches a small
  public JSON file from the project's GitHub repository to see whether there's an
  optional in-app notice to show (for example, a new feature). It sends no
  information about you, and if the file is unreachable nothing is shown. You can
  dismiss any notice permanently.
- **Sieve Pro licence check, only if you enter a licence key** — the key,
  Sieve's shop ID and a plain browser name are sent to Polar's licence service
  (`api.polar.sh`) when you enter or remove it, then about once a week when you
  open the settings page. See [above](#sieve-pro-licence-check).

Apart from that licence check, these are all **downloads to your device**. They do not include your identity, your
browsing history, page content, or any personal information beyond the normal
network request needed to fetch a file. As with any web request, the host serving
a file (a blocklist provider, the model host, GitHub for the announcement, or the
host of a list you subscribed to) may observe your IP address. No user data is sent
in the other direction.

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
- **scripting** — run Sieve's own filters in pages. For example, the Dark Pattern Blocker's on-page notes are added only to a page where it has found something to show, rather than to every page.
- **host access (all sites)** — required because harmful content can appear on any site; used only to run the local filters. No browsing data is collected.

---

## Chrome Web Store data disclosure

In the Chrome Web Store's terms, "collect" means transferring data off the
user's device. The only thing Sieve transfers is a Sieve Pro licence key, if you
enter one, to Polar to check it. Sieve declares that as **authentication
information**, used only to check the licence, never sold, and never used for
anything else. It declares that it does **not** collect any of the following:
personally identifiable information, health information, financial and payment
information, personal communications, location, web history, user activity, or
website content.

To be plain about the cases where that wording could mislead: if you switch
on Usage Insights, a tally of site names and durations is written **to your own
browser storage**; the Dark Pattern Blocker writes the numbers described
above under scrambled codes; a free-trial reminder you ask for keeps that
site's name and dates; and Sieve Pro's streaks and urge screen keep what is
listed in the table above. You can erase any of them at any time. Nothing about
them is ever sent to us or to a third party, which is why the declaration above
is still accurate.

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

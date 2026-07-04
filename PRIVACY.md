# Privacy Policy for Sieve

**Last updated: July 4, 2026**

## The short version

**Sieve does not collect, store, sell, or transmit any personal data.**
Everything it does happens locally, on your own device. There is no account,
no sign-up, no analytics, and no tracking of any kind.

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

Sieve also reads the content of web pages you visit **in the page itself** — for
example, to mask profanity, hide toxic comments, remove dark patterns, or count
how long you have been scrolling. This processing is momentary and local: the
page content is **never copied, stored, or transmitted** anywhere.

---

## What Sieve does NOT do

- It does **not** create an account or ask you to log in.
- It does **not** collect your name, email, location, or any identifier.
- It does **not** record or upload your browsing history, the URLs you visit,
  page content, keystrokes, or activity.
- It does **not** use analytics, telemetry, advertising, or fingerprinting.
- It does **not** sell or share any data with third parties.
- It does **not** use any data to determine creditworthiness or for lending.

---

## Network activity (full transparency)

Sieve makes outbound network requests for one reason only: to **download
publicly available blocklists** (for example, lists of known gambling, scam,
malware, and phishing domains) so protection stays current. If you enable the
optional on-device toxicity model, that model is likewise **downloaded once and
cached** for local use.

These are **downloads to your device**. They do not include your identity, your
browsing history, page content, or any personal information beyond the normal
network request needed to fetch a file. As with any web request, the host
serving a list or the model may observe your IP address. No user data is sent
in the other direction.

---

## Permissions

Sieve requests only the permissions needed to filter content locally:

- **storage / unlimitedStorage** — save your settings and cache large blocklists on your device.
- **declarativeNetRequest** — block requests to harmful sites by URL (it does not read page content to do this).
- **alarms** — refresh blocklists on a schedule and reset daily counters at midnight.
- **webNavigation** — detect navigations so a harmful page can be blocked before it loads.
- **tabs** — open the local "blocked"/settings pages and close popup/hijack tabs. It does not read your browsing history.
- **offscreen** — run the optional toxicity model locally, off the main page.
- **host access (all sites)** — required because harmful content can appear on any site; used only to run the local filters. No browsing data is collected.

---

## Chrome Web Store data disclosure

Because Sieve collects and transmits none of it, Sieve declares that it does
**not** collect any of the following: personally identifiable information,
health information, financial and payment information, authentication
information, personal communications, location, web history, user activity, or
website content.

---

## Children

Sieve does not knowingly collect data from anyone, including children, because
it collects no data at all.

## Changes to this policy

If this policy changes, the updated version will be posted here with a new
"Last updated" date.

## Contact

Questions about privacy? Email **support@monolab.dev** or open an issue at
<https://github.com/codepurse/Sieve/issues>.

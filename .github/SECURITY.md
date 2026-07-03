# Security Policy

Sieve is a browser extension with broad host access (`<all_urls>`), so we take
security seriously. Thank you for helping keep users safe.

## Supported versions

Sieve is developed as a rolling release; only the latest version receives
security fixes.

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
pull requests, or discussions.**

Instead, report privately through GitHub:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** to open a private advisory
   ([direct link](../../security/advisories/new)).

> Maintainer note: enable this under **Settings → Code security and analysis →
> Private vulnerability reporting**. If you'd rather receive reports by email,
> add a dedicated address here instead.

Please include:

- A description of the issue and its potential impact.
- Step-by-step instructions to reproduce it.
- The affected version, browser, and OS.
- Any proof-of-concept code, screenshots, or logs.

## What to expect

- We'll acknowledge your report as soon as we reasonably can.
- We'll investigate, keep you updated on progress, and let you know when a fix
  ships.
- We're happy to credit you in the release notes once the issue is resolved —
  let us know if you'd prefer to stay anonymous.

Please give us a reasonable chance to fix the issue before any public
disclosure.

## Out of scope

The following are **not** security vulnerabilities — please use a normal issue
instead:

- A legitimate site being blocked, or something slipping past a filter
  (blocklist false positive / negative).
- Feature requests or general bugs that don't have a security impact.
- Vulnerabilities in third-party sites that Sieve merely runs on.

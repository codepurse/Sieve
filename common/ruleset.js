// common/ruleset.js
// Sieve — reads a subscribed list for the Search Result Filter.
// Ported from BlockNSFW's shared/ruleset.js, with two more formats.
//
// A list is UTF-8 text, optionally opening with uBlacklist's YAML front matter
// (name, homepage), then one rule per line. Four dialects are read, because a
// list people already keep is the whole point of subscribing to it:
//
//     *://*.spam.example/*        uBlacklist match pattern (what its rulesets use)
//     spam.example                a bare site, also *.spam.example and .spam.example
//     /example\.(net|org)/        a regex over the URL; title/Example/ for the title
//     0.0.0.0 spam.example        a hosts file (127.0.0.1 and :: work too)
//     ||spam.example^             an AdGuard / uBlock Origin domain rule
//
// Everything that is really "this site" becomes a bare host, whichever way the
// list spelled it, and goes into the packed host index (common/host-index.js):
// a lookup, where a pattern is a loop. Paths, regexes and titles stay patterns,
// validated by common/keyword-pattern.js exactly as a rule typed into settings
// is, so a broken regex in a stranger's file is dropped before it reaches a page.
//
// What this file will never do is produce an allow rule. uBlacklist's "@" lines
// (allow and highlight) and AdGuard's "@@" exceptions are skipped and counted.
// A subscribed list can hide results and nothing else; a file someone else
// edits that could bring a hidden site back would be a remote off switch.
//
// Not a YAML parser: only flat `key: value` scalars in the header are read.

(function (root) {
  "use strict";

  if (root.SieveRuleset) return;

  // Limits are about keeping a hostile or broken file from wedging the browser.
  // The host cap is per list; the service worker also caps the total across
  // lists, because every results page reads them back from storage.
  const MAX_FILE_BYTES = 16 * 1024 * 1024;
  const MAX_ENTRIES = 500000;
  const MAX_LINE_LENGTH = 2000;
  const MAX_NAME_LENGTH = 80;

  // Non-host rules are walked one by one for every search result, so they get
  // a cap of their own; regexes, the one rule that costs more than its length to
  // validate, get a lower one. Past either cap a rule is counted as skipped.
  const MAX_PATTERN_ENTRIES = 1000;
  const MAX_REGEX_ENTRIES = 200;

  // A host as the index stores it: lower case, ASCII (punycode for IDNs), at
  // least two labels. Underscores are allowed because real lists carry them.
  const PLAIN_HOST_RE = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/;
  const SINGLE_LABEL_RE = /^[a-z0-9-]+$/;
  // scheme://host/path, the shape of a uBlacklist match pattern.
  const MATCH_PATTERN_RE = /^([a-z*][a-z0-9+.-]*):\/\/([^/]*)(\/.*)?$/i;
  // A hosts-file line: a sink address, then the host.
  const HOSTS_LINE_RE = /^(?:0\.0\.0\.0|127\.0\.0\.1|::1?)\s+(\S+)/;
  // Names a hosts file maps to itself; never a site anyone meant to list.
  const HOSTS_FILE_SELF = new Set([
    "localhost", "localhost.localdomain", "local", "broadcasthost",
    "ip6-localhost", "ip6-loopback", "0.0.0.0",
  ]);
  // An AdGuard / uBO network rule anchored to a domain: ||host^ with options.
  const ABP_DOMAIN_RE = /^\|\|([^/^$|*]+)\^?(?:\$(.*))?$/;
  // Options that still mean "the site itself". Anything else (third-party,
  // script, image, domain=…) is about requests a page makes, not a page you
  // would find in a search result, so those rules are skipped.
  const ABP_SITE_OPTIONS = new Set(["document", "doc", "all", "important", "popup", "1p", "first-party", "~third-party"]);

  const KP = typeof KeywordPattern !== "undefined" ? KeywordPattern : null;

  function isCommentLine(line) {
    if (KP && KP.isCommentEntry) return KP.isCommentEntry(line);
    const value = String(line || "").trim();
    return !!value && (value.charAt(0) === "#" || value.charAt(0) === "!");
  }

  // A plain (non-regex) rule must still look like a site. validateListEntry is
  // generous with anything that is not a regex, which is right for a box the
  // user types into but lets the lines of an HTML error page through as rules,
  // so subscribing to a GitHub page instead of its raw file would look like it
  // worked.
  function looksLikeSiteRule(entry) {
    const value = String(entry || "");
    if (/[\s<>"'`]/.test(value)) return false;
    const hostPart = value.split("/")[0];
    if (!hostPart || hostPart.indexOf(".") === -1) return false;
    return /^[A-Za-z0-9*._-]+$/.test(hostPart);
  }

  function clampText(value, max) {
    const text = String(value == null ? "" : value).trim();
    return text.length > max ? text.slice(0, max) : text;
  }

  // The host a rule names, as the search filter looks it up, or "". "www."
  // goes because every lookup strips it first, so an entry keeping it could
  // never be found.
  function canonicalHost(value) {
    let host = String(value || "").trim().toLowerCase().replace(/\.+$/, "");
    if (!host) return "";
    if (/[^\x00-\x7f]/.test(host)) {
      try {
        host = new URL("http://" + host + "/").hostname;
      } catch (_) {
        return "";
      }
    }
    if (host.length > 253) return "";
    if (host.indexOf("www.") === 0 && host.indexOf(".", 4) !== -1) host = host.slice(4);
    return host;
  }

  function asHost(value) {
    const host = canonicalHost(value);
    return PLAIN_HOST_RE.test(host) ? host : "";
  }

  // One rule: {host} for anything naming a whole site and its subdomains,
  // {pattern} for what the general rule syntax handles, null for a line that
  // must be skipped.
  //
  // One deliberate widening, kept from BlockNSFW: uBlacklist reads
  // *://example.com/* (no "*.") as that exact host, and this reads it as the
  // host and its subdomains, as every site rule in Sieve does. For a list that
  // can only hide, that errs toward hiding.
  function classifyRule(entry) {
    // Allow and highlight rules (uBlacklist "@", AdGuard "@@"): never here.
    if (entry.charAt(0) === "@") return null;
    // Cosmetic filters and AdGuard's list header are not site rules.
    if (/#[@?$%]?#/.test(entry) || /^\[.*\]$/.test(entry)) return null;

    const hostsLine = HOSTS_LINE_RE.exec(entry);
    if (hostsLine) {
      const name = hostsLine[1].toLowerCase();
      if (HOSTS_FILE_SELF.has(name)) return null;
      const host = asHost(name);
      return host ? { host } : null;
    }

    if (entry.indexOf("||") === 0) {
      const abp = ABP_DOMAIN_RE.exec(entry);
      if (!abp) return null; // a path or wildcard inside a network rule
      if (abp[2]) {
        const options = abp[2].split(",").map((o) => o.trim().toLowerCase()).filter(Boolean);
        if (!options.every((o) => ABP_SITE_OPTIONS.has(o))) return null;
      }
      const host = asHost(abp[1]);
      return host ? { host } : null;
    }

    const match = MATCH_PATTERN_RE.exec(entry);
    if (match) {
      const scheme = match[1].toLowerCase();
      if (scheme !== "*" && scheme !== "http" && scheme !== "https") return null;
      const hostPart = match[2].toLowerCase();
      const path = match[3] || "";
      const wholeHost = path === "" || path === "/" || path === "/*";
      // *://*/* is every site there is. No list means that.
      if (!hostPart || hostPart === "*" || hostPart.indexOf(":") !== -1) return null;
      const bare = hostPart.indexOf("*.") === 0 ? hostPart.slice(2) : hostPart;
      if (bare.indexOf("*") !== -1) return null;
      const host = canonicalHost(bare);
      if (PLAIN_HOST_RE.test(host)) return wholeHost ? { host } : { pattern: host + path };
      // A whole top-level domain (*://*.xyz/*) stays a pattern: ".xyz".
      if (wholeHost && SINGLE_LABEL_RE.test(host)) return { pattern: "." + host };
      return null;
    }

    const plain = entry.replace(/\/\*?$/, "");
    if (plain.indexOf("/") === -1) {
      let candidate = plain;
      if (candidate.indexOf("*.") === 0) candidate = candidate.slice(2);
      else candidate = candidate.replace(/^\.+/, "");
      const host = asHost(candidate);
      if (host) return { host };
    }
    return { pattern: entry };
  }

  function readFrontMatter(lines) {
    const meta = { name: "", homepage: "" };
    if (!lines.length || lines[0].trim() !== "---") return { meta, start: 0 };
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "---") return { meta, start: i + 1 };
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key === "name") meta.name = clampText(value, MAX_NAME_LENGTH);
      else if (key === "homepage") meta.homepage = clampText(value, 300);
    }
    // Unterminated: read the whole file as rules rather than swallow it.
    return { meta: { name: "", homepage: "" }, start: 0 };
  }

  /**
   * @param {string} text  raw file contents
   * @returns {{name: string, homepage: string, hosts: string[], patterns: string[],
   *            skipped: number, allowSkipped: number, truncated: boolean}}
   *   skipped counts every line not used; allowSkipped the allow and
   *   highlight rules among them.
   */
  function parseRuleset(text) {
    const source = String(text == null ? "" : text).replace(/^﻿/, "");
    const lines = source.split(/\r?\n/);
    const header = readFrontMatter(lines);

    const hosts = [];
    const patterns = [];
    const seen = new Set();
    let skipped = 0;
    let allowSkipped = 0;
    let truncated = false;
    let regexCount = 0;

    for (let i = header.start; i < lines.length; i++) {
      let entry = lines[i].trim();
      if (!entry) continue;
      if (isCommentLine(entry)) continue;
      if (entry.length > MAX_LINE_LENGTH) {
        skipped++;
        continue;
      }
      // A note after the rule ("*://*.example.com/*  # why"), which real
      // uBlacklist lists use by the thousand. Not on a regex, where " #" could
      // be part of the pattern.
      if (entry.charAt(0) !== "/" && !/^title\s*\//i.test(entry)) entry = entry.replace(/\s+#.*$/, "");

      // Counted apart, so a list made only of these can be told from a page
      // that is not a list at all.
      if (entry.charAt(0) === "@") {
        allowSkipped++;
        skipped++;
        continue;
      }

      const rule = classifyRule(entry);
      if (!rule) {
        skipped++;
        continue;
      }

      if (rule.host) {
        if (seen.has(rule.host)) continue;
        seen.add(rule.host);
        hosts.push(rule.host);
      } else {
        const pattern = rule.pattern;
        const key = pattern.toLowerCase();
        if (seen.has(key)) continue;
        if (patterns.length >= MAX_PATTERN_ENTRIES) {
          skipped++;
          continue;
        }
        // Counted BEFORE validating: validation is the expensive step, so a
        // file of 50,000 regexes must not pay for 50,000 to learn it is over.
        const looksRegex = pattern.charAt(0) === "/" || /^title\s*\//i.test(pattern);
        if (looksRegex) {
          if (regexCount >= MAX_REGEX_ENTRIES) {
            skipped++;
            continue;
          }
          regexCount++;
        }
        if (KP && KP.validateListEntry) {
          const verdict = KP.validateListEntry(pattern);
          if (!verdict.ok || (verdict.kind === "wildcard" && !looksLikeSiteRule(pattern))) {
            skipped++;
            continue;
          }
        } else if (!looksRegex && !looksLikeSiteRule(pattern)) {
          skipped++;
          continue;
        }
        seen.add(key);
        patterns.push(pattern);
      }

      if (hosts.length + patterns.length >= MAX_ENTRIES) {
        truncated = true;
        break;
      }
    }

    return { name: header.meta.name, homepage: header.meta.homepage, hosts, patterns, skipped, allowSkipped, truncated };
  }

  function isHttpUrl(value) {
    return /^https?:\/\/[^\s/]+/i.test(String(value || "").trim());
  }

  const exported = {
    MAX_FILE_BYTES,
    MAX_ENTRIES,
    MAX_PATTERN_ENTRIES,
    MAX_REGEX_ENTRIES,
    parseRuleset,
    isHttpUrl,
  };
  root.SieveRuleset = exported;
  if (typeof module !== "undefined" && module.exports) module.exports = exported;
})(typeof self !== "undefined" ? self : this);

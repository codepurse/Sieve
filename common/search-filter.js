// common/search-filter.js
// Sieve — Search Result Filter: the rule model, shared by the settings page and
// the search-page content script.
//
// A rule is { pattern, color }:
//   color === 0   hide this result from the search page
//   color >= 1    keep it, but tint it with palette colour N (1-based)
//
// Storing the colour ALONGSIDE the pattern is the whole design. uBlacklist,
// which is where users know this feature from, encodes it in the text instead
// ("@1*://*.example.com/*") because its rules live in one big textarea and
// there is nowhere else to put it. Sieve's lists are real rows, so the colour is
// a control on the row and there is no syntax to get wrong.
//
// Pattern syntax is uBlacklist's, via common/keyword-pattern.js, so a user can
// paste a list they already keep:
//
//     example.com          the domain and its subdomains
//     *.example.com        the same thing, written the other way
//     example.com/docs/*   only under that path
//     .edu                 any host ending in .edu
//     *://*.example.com/*  a full match pattern (the scheme part is ignored)
//     /example\.(net|org)/ a regex over the whole URL
//     title/Example/       a regex over the result's title
//
// This module is pure: no storage, no DOM. It is loaded in the settings page and
// in the content script, and both must agree about what a rule means.

(() => {
  "use strict";

  if (window.SieveSearchFilter) return;

  const HIDE = 0;

  // Characters that mean something to a regex and must be neutralised before a
  // user's glob is turned into one. "*" is deliberately absent: it is the one
  // character we DO want to translate.
  const REGEX_SPECIALS = /[.+?^${}()|[\]\\]/g;

  // --- wildcard patterns --------------------------------------------------

  // Split "*://*.example.com/docs/*" into { host: "example.com", path: "/docs/*" }.
  // The scheme is dropped: Sieve has no reason to treat http and https results
  // differently, and keeping it would only be a way for a rule to silently miss.
  function parseWildcard(raw) {
    let value = String(raw || "").trim().toLowerCase();
    value = value.replace(/^(\*|https?|ftp):\/\//, "").replace(/^\/\//, "");
    const slash = value.indexOf("/");
    const host = (slash === -1 ? value : value.slice(0, slash)).replace(/^\*\./, "");
    const path = slash === -1 ? "" : value.slice(slash);
    return { host, path };
  }

  // "example.com" covers its subdomains; ".edu" (or bare "edu") covers the TLD.
  function hostMatches(ruleHost, host) {
    if (!ruleHost || ruleHost === "*") return true;
    if (ruleHost.startsWith(".")) return host.endsWith(ruleHost);
    return host === ruleHost || host.endsWith("." + ruleHost);
  }

  // An empty path, "/" or "/*" means "anywhere on the site". Otherwise the rule
  // is a prefix glob, so "/docs/*" matches /docs/a but not /blog.
  function pathMatches(rulePath, path) {
    if (!rulePath || rulePath === "/" || rulePath === "/*") return true;
    const source = "^" + rulePath.replace(REGEX_SPECIALS, "\\$&").replace(/\*/g, ".*");
    try {
      return new RegExp(source).test(path);
    } catch (_) {
      return false;
    }
  }

  // --- rules --------------------------------------------------------------

  // A pattern is valid if KeywordPattern accepts it. Wildcards always pass;
  // the regex forms go through its syntax, flag and catastrophic-backtracking
  // checks, so a pattern that could hang a page is refused while the user is
  // still looking at it.
  function validate(pattern) {
    if (typeof KeywordPattern === "undefined") {
      return { ok: String(pattern || "").trim().length > 0, error: "" };
    }
    const result = KeywordPattern.validateListEntry(pattern);
    return { ok: result.ok, error: result.error || "" };
  }

  // Turn stored rules into matchers once, so the per-result work is cheap.
  // A rule that no longer compiles is dropped rather than thrown: one bad line
  // in a long list should not stop the other lines working.
  // `source` is carried through untouched so the page can say WHERE a rule came
  // from — the user's own list, or the global Blocked list, which is the whole
  // point of being able to ask "why did this disappear?".
  function compile(rules) {
    const out = [];
    for (const rule of rules || []) {
      const pattern = String((rule && rule.pattern) || "").trim();
      if (!pattern) continue;
      const color = Number(rule.color) || HIDE;
      const source = (rule && rule.source) || "rule";
      if (typeof KeywordPattern === "undefined") {
        out.push({ pattern, source, color, kind: "wildcard", ...parseWildcard(pattern) });
        continue;
      }
      const compiled = KeywordPattern.compileListEntry(pattern);
      if (compiled.kind === "wildcard") {
        out.push({ pattern, source, color, kind: "wildcard", ...parseWildcard(pattern) });
      } else if (compiled.regex) {
        out.push({ pattern, source, color, kind: compiled.kind, regex: compiled.regex });
      }
    }
    return out;
  }

  function ruleMatches(rule, url, host, path, title) {
    if (rule.kind === "wildcard") return hostMatches(rule.host, host) && pathMatches(rule.path, path);
    if (rule.kind === "title") return rule.regex.test(title || "");
    return rule.regex.test(url);
  }

  // What should happen to this result? Returns a colour index, or null for
  // "leave it alone".
  //
  // Hiding beats highlighting when both match. A user who has asked for a site
  // to be gone has made the stronger statement, and the failure modes are not
  // symmetric: a result wrongly tinted is a wrong colour, a result wrongly shown
  // is the thing they were trying not to look at.
  function match(compiled, url, title) {
    return explain(compiled, url, title).color;
  }

  // The same decision, with its reasons kept: { host, color, matched, winner }.
  //   matched  every rule that matched, in list order
  //   winner   the one that decided the outcome, or null if nothing matched
  // Unlike match() this cannot short-circuit on the first hide, because a
  // result can be caught by several rules and a user asking "why is this gone?"
  // deserves all of them, not just the first.
  function explain(compiled, url, title) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_) {
      return { host: "", color: null, matched: [], winner: null };
    }
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname + parsed.search;

    const matched = [];
    for (const rule of compiled) {
      if (ruleMatches(rule, url, host, path, title)) matched.push(rule);
    }

    let winner = null;
    for (const rule of matched) {
      if (rule.color === HIDE) {
        winner = rule;
        break; // hiding always wins
      }
      if (!winner || rule.color < winner.color) winner = rule;
    }
    return { host, color: winner ? winner.color : null, matched, winner };
  }

  window.SieveSearchFilter = {
    HIDE,
    validate,
    compile,
    match,
    explain,
    parseWildcard,
    hostMatches,
    pathMatches,
  };
})();

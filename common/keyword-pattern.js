// common/keyword-pattern.js
// Lets a custom word-list entry be a regular expression instead of a literal
// phrase, so one line can cover many spellings of the same word.
//
// Shared with BlockNSFW (shared/keyword-pattern.js) — keep the two in step. The
// syntax, the refused flags and the slow-pattern guard are deliberately
// identical, so a user's list means the same thing in both extensions.
//
// Two lists use this file. The WORD lists take the /regex/ form above. The
// BLOCKED-SITES list takes a wider syntax of its own (wildcards, whole TLDs, a
// regex over the address, a regex over the page title, and comments) — see the
// "Blocked-site entries" section further down. The allowlist stays literal
// domains, because declarativeNetRequest's allow rules can only express those.
//
// Syntax follows uBlacklist's, which users of these tools already know:
//
//     /p[o0]rn/          a regex
//     porn               a literal phrase, exactly as before
//
// Everything that is not wrapped in slashes stays a literal, so existing lists
// keep working untouched.
//
// The reason this file exists rather than a call to `new RegExp` at the match
// site: these patterns run against the text of every page the user visits, and
// a regex is the one kind of user input that can hang the browser. Two
// safeguards, both here so the options page and the content script agree:
//
//   1. `g` and `y` are refused. They make a RegExp stateful — `lastIndex`
//      advances between calls — so a reused pattern would match on one page and
//      silently skip the next. That is far worse than an error.
//
//   2. Catastrophic backtracking is caught by measurement, not by inspection.
//      Patterns like /(a+)+$/ are perfectly valid and take exponential time on
//      the right input; you cannot reliably spot that by reading the source. So
//      a candidate is timed against a handful of adversarial strings before it
//      is ever allowed near a real page, and rejected if it is slow. This
//      catches the realistic cases at the moment the user can still fix them.

(function (root) {
  'use strict';

  // Long enough for real patterns, short enough to bound the damage.
  var MAX_PATTERN_LENGTH = 400;

  // Flags a user may set. 'i' is added regardless: literal matching here has
  // always been case-insensitive, and a regex behaving differently would be a
  // trap ("apricot" matching but "Apricot" not).
  var ALLOWED_FLAGS = ['i', 'm', 's', 'u'];

  // Per-probe budget. A healthy pattern finishes the probes below in well under
  // a millisecond; a catastrophic one takes tens of milliseconds on them.
  var PROBE_BUDGET_MS = 10;

  // Deliberately SHORT. The measurement happens after `test()` returns, so the
  // probe input has to be small enough that even an exponential pattern comes
  // back — feed /(a+)+$/ a 2000-character string and it never returns at all,
  // and the timer that was supposed to catch it never runs.
  //
  // Backtracking on these patterns costs roughly 2^n, so 22 characters is about
  // four million steps: tens of milliseconds, far above the budget and plainly
  // detectable, while an honest pattern finishes in microseconds. Long enough
  // to expose the blow-up, short enough to survive it.
  var PROBE_REPEAT = 22;

  function isRegexEntry(entry) {
    var value = String(entry == null ? '' : entry).trim();
    return value.length >= 2 && value.charAt(0) === '/' && value.lastIndexOf('/') > 0;
  }

  // Splits "/body/flags" into its parts. Returns null when the entry is not in
  // regex form (i.e. it is a literal).
  function splitRegexEntry(entry) {
    var value = String(entry == null ? '' : entry).trim();
    if (!isRegexEntry(value)) return null;
    var close = value.lastIndexOf('/');
    if (close <= 0) return null;
    return { body: value.slice(1, close), flags: value.slice(close + 1) };
  }

  // Inputs chosen to provoke backtracking: a run of one character, the same run
  // failing only at the final character (the worst case for a nested
  // quantifier), an alternating run, and ordinary prose as a sanity check.
  // A generic run of "a" only blows up patterns written with "a". /(x+x+)+y/ is
  // just as catastrophic but sails through an all-"a" probe, so the probe
  // alphabet is taken from the pattern itself: the literal characters it
  // mentions are the ones capable of driving its own backtracking.
  function probeAlphabet(body) {
    var chars = [];
    for (var i = 0; i < body.length; i++) {
      var ch = body.charAt(i);
      if (ch === '\\') { i++; continue; } // skip escapes: \d is not a literal d
      if (!/[A-Za-z0-9]/.test(ch)) continue;
      if (chars.indexOf(ch) === -1) chars.push(ch);
      if (chars.length >= 3) break;       // keep the probe set small
    }
    if (chars.indexOf('a') === -1) chars.push('a'); // always try the classic
    return chars;
  }

  function probeStrings(body) {
    var strings = [];
    var alphabet = probeAlphabet(body || '');
    for (var i = 0; i < alphabet.length; i++) {
      var run = new Array(PROBE_REPEAT + 1).join(alphabet[i]);
      strings.push(run);
      strings.push(run + '!'); // failing at the very end is the worst case
    }
    strings.push(new Array(Math.floor(PROBE_REPEAT / 2) + 1).join('a1') + ' ');
    strings.push('the quick brown fox jumps over the lazy dog');
    return strings;
  }

  /**
   * Validates one entry. Literals are always valid. Regexes must compile, may
   * not use stateful flags, and must survive the timing probe.
   *
   * @param {string} entry
   * @returns {{ok: boolean, isRegex: boolean, error: string}}
   */
  function validateEntry(entry) {
    var value = String(entry == null ? '' : entry).trim();
    if (!value) return { ok: false, isRegex: false, error: 'Empty entry' };

    var parts = splitRegexEntry(value);
    if (!parts) return { ok: true, isRegex: false, error: '' };

    if (value.length > MAX_PATTERN_LENGTH) {
      return { ok: false, isRegex: true, error: 'Pattern is too long (max ' + MAX_PATTERN_LENGTH + ' characters)' };
    }
    if (!parts.body) {
      return { ok: false, isRegex: true, error: 'Empty pattern between the slashes' };
    }

    var flags = parts.flags || '';
    for (var i = 0; i < flags.length; i++) {
      var flag = flags.charAt(i);
      if (flag === 'g' || flag === 'y') {
        return { ok: false, isRegex: true, error: 'The "' + flag + '" flag is not supported — it would make the pattern match only every other time' };
      }
      if (ALLOWED_FLAGS.indexOf(flag) === -1) {
        return { ok: false, isRegex: true, error: 'Unknown flag "' + flag + '"' };
      }
    }

    var compiled;
    try {
      compiled = new RegExp(parts.body, flags.indexOf('i') === -1 ? flags + 'i' : flags);
    } catch (err) {
      // The engine's own message names the mistake far better than we could.
      return { ok: false, isRegex: true, error: (err && err.message) ? String(err.message) : 'Invalid pattern' };
    }

    var probes = probeStrings(parts.body);
    for (var p = 0; p < probes.length; p++) {
      var started = (root.performance && root.performance.now) ? root.performance.now() : Date.now();
      try {
        compiled.test(probes[p]);
      } catch (_) {
        return { ok: false, isRegex: true, error: 'Pattern failed while being tested' };
      }
      var elapsed = ((root.performance && root.performance.now) ? root.performance.now() : Date.now()) - started;
      if (elapsed > PROBE_BUDGET_MS) {
        return {
          ok: false,
          isRegex: true,
          error: 'Pattern is too slow and would freeze pages. Nested repeats like (a+)+ are the usual cause'
        };
      }
    }

    return { ok: true, isRegex: true, error: '' };
  }

  /**
   * Compiles an entry for matching. Returns null for literals (the caller keeps
   * its existing literal path) and null for anything that fails validation, so
   * a bad pattern that somehow reached storage is skipped rather than thrown.
   *
   * @param {string} entry
   * @returns {RegExp|null}
   */
  function compileEntry(entry) {
    var result = validateEntry(entry);
    if (!result.ok || !result.isRegex) return null;
    var parts = splitRegexEntry(entry);
    if (!parts) return null;
    var flags = parts.flags || '';
    try {
      return new RegExp(parts.body, flags.indexOf('i') === -1 ? flags + 'i' : flags);
    } catch (_) {
      return null;
    }
  }

  // --- Blocked-site entries -------------------------------------------------
  //
  // The site list accepts five forms, following uBlacklist so a user can paste
  // in a list they already keep:
  //
  //     example.com, *.example.com, example.com/adult/*   wildcard (as before)
  //     .xyz  (or the bare xyz)                           a whole top-level domain
  //     /example\.(net|org)/                              regex over the address
  //     title/Example Domain/                             regex over the page title
  //     # a note      ! a note                            comment, never matched
  //
  // Wildcards stay the default so existing lists are untouched. The two regex
  // forms differ in WHEN they can act, and the difference is worth knowing: an
  // address is available before the request goes out, so those entries are
  // enforced by declarativeNetRequest and the page never loads; a title is not
  // known until the document has parsed, so those are matched by the content
  // script and the page flashes up briefly before it is replaced.
  //
  // A TLD entry is the broadest thing a user can write — ".xyz" covers every
  // site under it — which is both why it is worth having (some TLDs are almost
  // entirely spam and malware) and why the settings page says so plainly.

  var REGEX_SPECIALS = /[.+?^${}()|[\]\\]/g;
  var COMMENT_RE = /^[#!]/;
  var HOST_CHARS_RE = /^[a-z0-9.\-*]+$/;

  function escapeRegex(text) {
    return String(text).replace(REGEX_SPECIALS, '\\$&');
  }

  // A note. Kept in the list, shown as a heading, never matched against a page.
  function isCommentEntry(entry) {
    return COMMENT_RE.test(String(entry == null ? '' : entry).trim());
  }

  // Split "*://*.example.com/adult/*" into { host: "example.com", path: "/adult/*" }.
  // The scheme is dropped: there is no reason to block http and https differently,
  // and keeping it would only be a way for an entry to silently miss.
  function splitWildcard(raw) {
    var value = String(raw || '').trim().toLowerCase();
    value = value.replace(/^(\*|https?|ftp):\/\//, '').replace(/^\/\//, '');
    var slash = value.indexOf('/');
    var host = slash === -1 ? value : value.slice(0, slash);
    var path = slash === -1 ? '' : value.slice(slash);
    host = host.split('?')[0].split('#')[0].replace(/:\d+$/, '').replace(/^www\./, '');
    // A bare trailing slash is not a path. "example.com/" is how a browser
    // writes the whole site, and reading it as the exact path "/" would turn
    // the commonest way of copying an address into an entry that blocks the
    // front page and nothing else.
    if (path === '/') path = '';
    return { host: host, path: path };
  }

  // Which of the five forms is this, and what are its parts?
  function parseListEntry(entry) {
    var value = String(entry == null ? '' : entry).trim();
    if (!value) return { kind: 'empty', body: '', flags: '', source: '', raw: '' };

    if (COMMENT_RE.test(value)) {
      return { kind: 'comment', text: value.replace(/^[#!]\s?/, ''), source: value, raw: value };
    }

    // "title/.../flags" — only when it really carries a pattern, so a literal
    // domain that happens to start with "title" is left alone.
    var titleMatch = /^title\s*(\/.*)$/i.exec(value);
    if (titleMatch) {
      var titleParts = splitRegexEntry(titleMatch[1]);
      if (titleParts) {
        return { kind: 'title', body: titleParts.body, flags: titleParts.flags, source: titleMatch[1], raw: value };
      }
    }

    var parts = splitRegexEntry(value);
    if (parts) return { kind: 'url', body: parts.body, flags: parts.flags, source: value, raw: value };

    var split = splitWildcard(value);
    // A leading "*." or "." is just another way of writing the same host, so
    // strip it before deciding whether what is left is a single label (a TLD).
    var host = split.host.replace(/^\*\./, '').replace(/^\./, '');
    if (!split.path && host && host.indexOf('.') === -1 && host.indexOf('*') === -1) {
      return { kind: 'tld', tld: host, source: value, raw: value };
    }
    return { kind: 'wildcard', host: host, path: split.path, source: value, raw: value };
  }

  /**
   * Validates one blocked-site entry. Comments, TLDs and wildcards are checked
   * by shape; the two regex forms go through the same syntax, flag and timing
   * checks as blocked words, so a pattern that would freeze pages is refused
   * here — while the user is still looking at it — rather than at match time.
   */
  // One message for every malformed literal, because the user cannot be
  // expected to know which of the two branches below they landed in — "not a
  // domain" parses as a single label and would otherwise be told it is not a
  // valid domain ENDING, which is a confusing answer to a typo.
  var SHAPE_ERROR =
    'Enter a site like example.com, *.example.com or example.com/path/*, a domain ending like .xyz, ' +
    'a pattern like /example\\.(net|org)/ or title/Example/, or start the line with # to make it a note';

  function validateListEntry(entry) {
    var parsed = parseListEntry(entry);

    if (parsed.kind === 'empty') return { ok: false, kind: parsed.kind, error: 'Empty entry' };
    if (parsed.kind === 'comment') return { ok: true, kind: parsed.kind, error: '' };

    if (parsed.kind === 'tld') {
      if (!HOST_CHARS_RE.test(parsed.tld) || parsed.tld.indexOf('*') !== -1) {
        return { ok: false, kind: parsed.kind, error: SHAPE_ERROR };
      }
      return { ok: true, kind: parsed.kind, error: '' };
    }

    if (parsed.kind === 'wildcard') {
      if (!parsed.host || !HOST_CHARS_RE.test(parsed.host) || parsed.host.indexOf('.') === -1) {
        return { ok: false, kind: parsed.kind, error: SHAPE_ERROR };
      }
      if (/\s/.test(parsed.path)) {
        return { ok: false, kind: parsed.kind, error: 'A path cannot contain spaces' };
      }
      return { ok: true, kind: parsed.kind, error: '' };
    }

    var result = validateEntry(parsed.source);
    return { ok: result.ok, kind: parsed.kind, error: result.error };
  }

  /**
   * Compiles a blocked-site entry for matching.
   * @returns {{kind: string, regex: RegExp|null}} kind is one of the five forms;
   *   regex is null for everything that is not a regex form, and for anything
   *   that fails validation, so a bad entry is skipped rather than thrown.
   */
  function compileListEntry(entry) {
    var parsed = parseListEntry(entry);
    if (parsed.kind !== 'url' && parsed.kind !== 'title') {
      return { kind: parsed.kind, regex: null };
    }
    return { kind: parsed.kind, regex: compileEntry(parsed.source) };
  }

  // --- matching -------------------------------------------------------------
  //
  // compileList() below is the API the content script uses. Compiling happens
  // ONCE per list, never per candidate: validateEntry() runs timing probes, so
  // calling compileEntry() inside a loop over every image on a page would cost
  // far more than the matching it is there to do.

  // A host rule always covers subdomains: "example.com" matches
  // "shop.example.com" too. A "*" inside a label matches within that label, so
  // "spam*.com" matches "spam7.com" but not "spam.evil.com".
  function hostRegExp(ruleHost) {
    var body = escapeRegex(ruleHost).replace(/\*/g, '[^.]*');
    return new RegExp('^(?:.+\\.)?' + body + '$');
  }

  // No "*" in a path means an exact path; the usual form ends in "*", which
  // makes it a prefix. An empty path matches the whole site.
  function pathRegExp(rulePath) {
    if (!rulePath) return null;
    return new RegExp('^' + escapeRegex(rulePath).replace(/\*/g, '.*') + '$');
  }

  function urlPartsOf(url) {
    try {
      var u = new URL(String(url));
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return {
        host: u.hostname.toLowerCase().replace(/^www\./, ''),
        path: u.pathname + u.search,
        href: u.href
      };
    } catch (_) {
      return null;
    }
  }

  /**
   * Turns a saved list into ready-to-use matchers. Comments, empty lines and
   * entries that no longer validate are dropped here, so callers never have to
   * think about them.
   *
   * @param {string[]} entries
   * @returns {Array<object>} each with { kind, source } plus its compiled parts
   */
  function compileList(entries) {
    var compiled = [];
    var list = Array.isArray(entries) ? entries : [];
    for (var i = 0; i < list.length; i++) {
      var parsed = parseListEntry(list[i]);
      if (parsed.kind === 'comment' || parsed.kind === 'empty') continue;
      if (!validateListEntry(list[i]).ok) continue;
      if (parsed.kind === 'url' || parsed.kind === 'title') {
        var regex = compileEntry(parsed.source);
        if (!regex) continue;
        compiled.push({ kind: parsed.kind, source: parsed.raw, regex: regex });
      } else if (parsed.kind === 'tld') {
        compiled.push({ kind: 'tld', source: parsed.raw, tld: parsed.tld });
      } else {
        compiled.push({
          kind: 'wildcard',
          source: parsed.raw,
          hostRe: hostRegExp(parsed.host),
          pathRe: pathRegExp(parsed.path)
        });
      }
    }
    return compiled;
  }

  /**
   * @returns {string|null} the entry that blocks this URL, or null. Title
   *   entries never match here — a title is not part of a URL.
   */
  function matchCompiledUrl(compiled, url) {
    var loc = urlPartsOf(url);
    if (!loc || !compiled) return null;
    for (var i = 0; i < compiled.length; i++) {
      var rule = compiled[i];
      if (rule.kind === 'wildcard') {
        if (rule.hostRe.test(loc.host) && (!rule.pathRe || rule.pathRe.test(loc.path))) return rule.source;
      } else if (rule.kind === 'tld') {
        if (loc.host === rule.tld || loc.host.slice(-(rule.tld.length + 1)) === '.' + rule.tld) return rule.source;
      } else if (rule.kind === 'url') {
        if (rule.regex.test(loc.href)) return rule.source;
      }
    }
    return null;
  }

  /** @returns {string|null} the title entry that blocks this title, or null. */
  function matchCompiledTitle(compiled, title) {
    var text = String(title == null ? '' : title);
    if (!text || !compiled) return null;
    for (var i = 0; i < compiled.length; i++) {
      if (compiled[i].kind === 'title' && compiled[i].regex.test(text)) return compiled[i].source;
    }
    return null;
  }

  // --- tidying a saved list -------------------------------------------------

  /**
   * De-duplicates and sorts a blocked-site list WITHOUT breaking up its notes.
   *
   * A note heads the entries written under it, so sorting the list as one flat
   * run would scatter a section across the alphabet and leave its heading
   * stranded over somebody else's domains. Instead each note (or run of notes)
   * opens a section: sections keep the order the user put them in, and only the
   * entries inside a section are sorted A-Z. Entries written before the first
   * note stay at the top — which is the whole list for someone who has never
   * used a note, so an existing list sorts exactly as it always did.
   *
   * De-duplication is case-insensitive and runs across the whole list; the
   * first spelling, in the first section it appears in, wins. Notes are never
   * de-duplicated: the same "# ads" heading over two sections is two headings.
   */
  function tidyListEntries(entries) {
    var list = Array.isArray(entries) ? entries : [];
    var sections = [{ notes: [], items: [] }];
    var seen = {};

    for (var i = 0; i < list.length; i++) {
      var raw = String(list[i] == null ? '' : list[i]).trim();
      if (!raw) continue;
      if (COMMENT_RE.test(raw)) {
        // A note that follows entries opens a new section; consecutive notes
        // head the same one, so a multi-line heading stays together.
        var current = sections[sections.length - 1];
        if (current.items.length > 0) sections.push({ notes: [raw], items: [] });
        else current.notes.push(raw);
        continue;
      }
      var key = raw.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(seen, key)) continue;
      seen[key] = true;
      sections[sections.length - 1].items.push(raw);
    }

    var out = [];
    for (var s = 0; s < sections.length; s++) {
      var section = sections[s];
      if (section.notes.length === 0 && section.items.length === 0) continue;
      section.items.sort(function (a, b) {
        return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
      });
      out = out.concat(section.notes, section.items);
    }
    return out;
  }

  var exported = {
    MAX_PATTERN_LENGTH: MAX_PATTERN_LENGTH,
    PROBE_BUDGET_MS: PROBE_BUDGET_MS,
    isRegexEntry: isRegexEntry,
    splitRegexEntry: splitRegexEntry,
    validateEntry: validateEntry,
    compileEntry: compileEntry,
    parseListEntry: parseListEntry,
    validateListEntry: validateListEntry,
    compileListEntry: compileListEntry,
    isCommentEntry: isCommentEntry,
    compileList: compileList,
    matchCompiledUrl: matchCompiledUrl,
    matchCompiledTitle: matchCompiledTitle,
    tidyListEntries: tidyListEntries
  };

  root.KeywordPattern = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
})(typeof self !== 'undefined' ? self : this);

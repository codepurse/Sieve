// build-tracker-list.mjs — converts the upstream EasyPrivacy filter list into
// Sieve's bundled tracker-domain list (data/tracker-domains.json).
//
// What this does:
//   EasyPrivacy is an Adblock-Plus-syntax filter list: ~57,000 lines of which
//   only the DOMAIN-ANCHOR rules ("||example.com^") can be expressed as a
//   declarativeNetRequest `requestDomains` condition. This script reads the
//   upstream list, keeps exactly those, drops everything else WITH A REASON,
//   and writes a sorted, de-duplicated, subdomain-collapsed domain array.
//
// Why it's a build step and not a runtime fetch:
//   The Ad & Tracker tier ships BUNDLED (like the MLM / dating / gore-shock /
//   game tiers), so there is no first-run network dependency and no stale-list
//   failure mode — refreshing the list costs a release, which is the trade the
//   spec chose deliberately. Converting at build time also means the service
//   worker never parses 57,000 lines of filter syntax on a user's machine.
//
// Why it's separate from build.mjs / build-cookie-engine.mjs:
//   Same reason those two are separate from each other — neither build touches
//   the other, and refreshing the list from upstream is just one command.
//
// LICENCE — READ THIS BEFORE CHANGING THE OUTPUT FORMAT.
//   EasyPrivacy is dual-licensed GPLv3-or-later OR CC BY-SA 3.0-or-later
//   (https://easylist.to/pages/licence.html). Sieve ELECTS CC BY-SA 3.0, which
//   keeps Sieve's own code MIT: BY-SA §4(b)'s "Collection" carve-out means
//   bundling the list inside the extension does not subject the extension to
//   BY-SA. The generated list IS an Adaptation, so it stays BY-SA 3.0 and must
//   carry attribution + the licence URI wherever it is distributed. That is why
//   emit() writes a `_license` block into the JSON and why the upstream
//   "! Licence:" notice is preserved verbatim — BY-SA §4(a) requires keeping
//   intact all notices that refer to the licence. Do not strip either.
//   Full detail + refresh procedure: data/ATTRIBUTION-easylist.md
//
// Usage:
//   node build-tracker-list.mjs                 # fetch upstream, convert, write
//   node build-tracker-list.mjs --from ./cache   # convert from a local copy
//   node build-tracker-list.mjs --dry-run        # report only, write nothing

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The subresource types this tier blocks, mirroring
// background/ad-tracker-blocker.js. Kept here because a negated type option
// ("$~script") is expressed as the complement of this set.
const SUBRESOURCE_TYPES = [
  "sub_frame", "script", "image", "stylesheet", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other",
];

const OUT_FILE = "data/tracker-domains.json";
const REPORT_FILE = "tracker-list-report.md";

// ===========================================================================
// Sources
//
// One entry per upstream list → one group in the output JSON → one DNR rule
// band in background/ad-tracker-blocker.js. Deliberately a table rather than a
// hardcoded single source: if the "Ad networks" second toggle is approved it is
// EasyList (same dual licence, same syntax, same parser) added as one more
// entry here, and nothing else in this file changes.
//
// `url` is the canonical combined list published by the EasyList project.
// `mirrorUrl` is the Adblock Plus download mirror of the same file — used only
// if the primary fails, the same primary/mirror shape background/safety-shield.js
// uses for its fetched lists. NB: the GitHub repo holds the list SPLIT into ~40
// part files and does not publish the combined build, so it is not usable as a
// mirror.
// ===========================================================================

const SOURCES = {
  trackers: {
    label: "Trackers & analytics",
    upstreamTitle: "EasyPrivacy",
    fileName: "easyprivacy.txt",
    url: "https://easylist.to/easylist/easyprivacy.txt",
    mirrorUrl: "https://easylist-downloads.adblockplus.org/easyprivacy.txt",
  },
  // Ad networks and exchanges. EasyPrivacy is a TRACKER list and genuinely does
  // not contain doubleclick.net, googlesyndication.com, adnxs.com or pubmatic.com
  // — those live here. Same project, same dual licence, same syntax, so the
  // parser and the CC BY-SA 3.0 election cover both without change.
  //
  // NB: most of EasyList is cosmetic rules (~24,500 of them, the half that hides
  // the leftover blank ad slot) and every one is dropped here. This tier blocks
  // the ad DOMAIN; it does not tidy up the hole left behind.
  ads: {
    label: "Ad networks",
    upstreamTitle: "EasyList",
    fileName: "easylist.txt",
    url: "https://easylist.to/easylist/easylist.txt",
    mirrorUrl: "https://easylist-downloads.adblockplus.org/easylist.txt",
  },
};

// ===========================================================================
// Safety guard
//
// A converter that will be re-run against a list we do not control needs a
// backstop. These are domains (and two-label public suffixes) that must NEVER
// reach a block rule: shared CDN / API / font infrastructure whose loss breaks
// a large fraction of the web at once, and registry suffixes that would take
// every site under them.
//
// EasyPrivacy contains none of these today. That is the point — if a refresh
// ever trips this guard, the run reports it LOUDLY as `guard` drops, which is
// the signal that something changed upstream and needs a human look before the
// list ships. It is cheaper to keep this here than to discover it from reviews.
// ===========================================================================

const NEVER_BLOCK = new Set([
  // Shared script / font / asset infrastructure.
  "googleapis.com", "gstatic.com", "googleusercontent.com", "googlevideo.com",
  "cloudflare.com", "cloudflare.net", "cloudfront.net", "akamai.net",
  "akamaihd.net", "akamaized.net", "fastly.net", "fbcdn.net",
  "jsdelivr.net", "unpkg.com", "jquery.com", "bootstrapcdn.com",
  "amazonaws.com", "azureedge.net", "windows.net", "cdn77.org",
  // Sign-in / identity surfaces — blocking these locks users out of accounts.
  "accounts.google.com", "login.microsoftonline.com", "appleid.apple.com",
  // DDoS-check endpoints. Upstream blocks check.ddos-guard.net but excepts
  // "/check.js" — the script that performs the check — so the exception IS the
  // host's whole purpose. Blocking it does not cost an ad, it locks the user out
  // of every site behind that CDN. Added after the fragile-surface audit caught
  // it: once path-scoped exceptions stopped sparing whole hosts, this one needed
  // saying explicitly rather than falling out of a general rule.
  "ddos-guard.net", "check.ddos-guard.net",
]);

// Two-label public suffixes. A rule on one of these would match every domain
// registered under it. Not exhaustive (that needs the full Public Suffix List,
// which is not worth a dependency here) — just the common registry shapes, as a
// catastrophe backstop rather than a complete check.
const PUBLIC_SUFFIXES = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk", "net.uk", "sch.uk",
  "com.au", "net.au", "org.au", "edu.au", "gov.au",
  "com.br", "com.cn", "com.mx", "com.tr", "com.ar", "com.sg", "com.hk",
  "com.tw", "com.my", "com.ph", "com.vn", "com.pl", "com.ua", "com.ru",
  "co.jp", "or.jp", "ne.jp", "ac.jp", "go.jp", "co.kr", "or.kr",
  "co.in", "co.za", "co.nz", "co.il", "co.th", "co.id",
  "github.io", "herokuapp.com", "blogspot.com", "wordpress.com",
  "s3.amazonaws.com", "web.app", "firebaseapp.com", "pages.dev", "workers.dev",
]);

// ===========================================================================
// Upstream metadata
//
// The combined list carries its own identity in the header ("! Version:",
// "! Commit:", "! Licence:"). We copy that into the output so a later refresh
// is REPRODUCIBLE — you can tell exactly which upstream build a shipped list
// came from — and so the licence notice survives, as BY-SA §4(a) requires.
// Deliberately NOT stamping a generation timestamp: it would make the file diff
// on every run even when the upstream content is identical, which hides real
// changes in review.
// ===========================================================================

export function parseUpstreamMeta(text) {
  const meta = {};
  // The header block ends at the first non-comment line; only scan that far so a
  // stray "! Version:" further down a part file cannot overwrite the real one.
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line && !line.startsWith("!") && !line.startsWith("[")) break;
    const m = line.match(/^!\s*([A-Za-z ]+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    if (!(key in meta)) meta[key] = m[2].trim();
  }
  return {
    version: meta["version"] || "unknown",
    lastModified: meta["last modified"] || "unknown",
    commit: meta["commit"] || "unknown",
    licenceUrl: meta["licence"] || meta["license"] || "https://easylist.to/pages/licence.html",
    homepage: meta["homepage"] || "https://easylist.to/",
  };
}

// ===========================================================================
// Classification
//
// Every non-blank, non-comment line lands in EXACTLY ONE bucket, and the
// buckets are counted — so `kept + dropped + exceptions === considered` always
// holds and the shipped count is honest (no silent truncation).
//
// KEPT — the two rule forms DNR can express as a domain condition:
//   "||example.com^"               → `always`     (block in every context)
//   "||example.com^$third-party"   → `thirdParty` (block only cross-site)
//
// `$third-party` is kept as its OWN group rather than folded into `always`
// because DNR expresses it natively via `condition.domainType: "thirdParty"`.
// Folding it in would over-block: the option exists precisely because those
// domains also serve legitimate FIRST-party content, and blocking them
// unconditionally would break the site that owns them.
//
// EXCEPTIONS — "@@||example.com^" and friends. An exception exists because
// blocking that domain broke something, so we honour it in the safest possible
// direction for a domain blocker: the domain (and everything under it) is
// removed from the block list entirely, even when the upstream exception was
// narrower (scoped to one site, one resource type, or one path). That
// UNDER-blocks by design — a missed tracker is a smaller failure than a broken
// checkout, which is the whole thesis of shipping this tier behind a beta banner.
//
// DROPPED — everything a domain-only tier cannot express, each with a reason:
//   cosmetic / scriptlet   "##.ad", "#@#", "#$#"     — out of scope for 1.4.0
//   regex                  "/pattern/"               — not a domain
//   path or query rule     "/track?id=", "|http://…" — not a domain
//   wildcard domain        "||ads.*.example.com^"    — requestDomains needs a
//                                                      literal domain
//   scoped option          "$domain=", "$script", …  — expressible only as a
//                                                      different rule shape
//                                                      (initiatorDomains /
//                                                      resourceTypes), which is
//                                                      not this tier
//   guard                  see NEVER_BLOCK           — refused on purpose
//   malformed              anything else
// ===========================================================================

const COSMETIC_RE = /#[@?$%]?#/; // "##", "#@#", "#?#", "#$#", "#%#"

export function classifyList(text) {
  const always = new Set();
  const thirdParty = new Set();
  const exceptions = new Set();
  const narrowExceptions = new Set();
  const siteScopedExceptions = new Map(); // host → Set(initiator domains)
  // Type-scoped blocks, grouped by their exact condition so many domains share
  // one rule: key = "script,xmlhttprequest|3p" → { resourceTypes, thirdParty, domains }.
  const typed = new Map();
  const drops = new Map(); // reason → { count, examples: string[] }
  let considered = 0;
  // Counted so the reconciliation in main() can BALANCE exactly. A rule that is
  // neither kept nor dropped has to land somewhere, or the shipped count stops
  // being checkable and "no silent truncation" becomes a claim instead of a fact.
  let exceptionRules = 0; // @@ rules honoured as a whole-domain exception
  let duplicateRules = 0; // a rule naming a domain already in its own group

  const drop = (reason, line) => {
    let bucket = drops.get(reason);
    if (!bucket) drops.set(reason, (bucket = { count: 0, examples: [] }));
    bucket.count++;
    if (bucket.examples.length < 5) bucket.examples.push(line);
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue; // blank
    if (line.startsWith("!") || line.startsWith("[")) continue; // comment / header
    considered++;

    // Cosmetic and scriptlet rules first — they can contain "||" and "$" and
    // would otherwise be misread as network rules.
    if (COSMETIC_RE.test(line)) {
      drop("cosmetic or scriptlet rule", line);
      continue;
    }

    // Exception rules. Only a domain-anchored exception tells us which domain to
    // spare; a path/regex exception does not, so it is dropped like any other
    // unexpressible form (it cannot make us block MORE, so this is safe).
    if (line.startsWith("@@")) {
      const d = domainFromAnchor(line.slice(2));
      if (d.ok) {
        exceptionRules++;
        exceptions.add(d.domain);
      } else {
        const host = looseHost(line.slice(2));
        const sites = exceptionSites(line);
        if (host && sites.length) {
          // A SITE-SCOPED exception: upstream still blocks this host by default and
          // carved it out on a named list of sites. Sparing the host everywhere —
          // which is what this used to do — is a catastrophic over-read of a narrow
          // rule. It silently unblocked 118 hosts including googletagmanager.com,
          // criteo.com, scorecardresearch.com and clarity.ms: upstream excepted GTM
          // on ~500 sites, and we stopped blocking it on all of them. DNR expresses
          // the real rule directly, so keep the block and carry the site list
          // through to excludedInitiatorDomains (see `scoped` in reduce()).
          const set = siteScopedExceptions.get(host) || new Set();
          sites.forEach((sitename) => set.add(sitename));
          siteScopedExceptions.set(host, set);
        } else if (host && d.reason !== "domain-anchored but path/query/port-scoped") {
          // A HOST-level exception with no site list — "@@||host^$script". It
          // conflicts with blocking the host itself, and nothing says where it
          // applies, so spare the host: a human found that blocking it broke a
          // real page.
          //
          // A PATH-scoped exception is deliberately NOT treated this way. Upstream
          // blocks the domain and carves out one file; reading that as "never block
          // this domain" inverts the intent and costs enormously. One exception on
          // "/widgets/q?" was unblocking the whole of amazon-adsystem.com, and one
          // on a jwplayer plugin was unblocking scorecardresearch.com. We cannot
          // express the per-path carve-out, and between over-blocking one endpoint
          // and unblocking an entire ad network, upstream's intent is much nearer
          // the former.
          narrowExceptions.add(host);
        }
        drop(`exception, ${d.reason}`, line);
      }
      continue;
    }

    // Network rules. Only the domain-anchor form yields a domain.
    if (!line.startsWith("||")) {
      drop(
        line.startsWith("/") && line.endsWith("/")
          ? "regex rule"
          : "not domain-anchored (path, query or substring match)",
        line
      );
      continue;
    }

    const parsed = domainFromAnchor(line);
    if (!parsed.ok) {
      drop(parsed.reason, line);
      continue;
    }
    if (parsed.resourceTypes) {
      const key = `${parsed.resourceTypes.join(",")}|${parsed.thirdPartyOnly ? "3p" : "any"}`;
      let bucket = typed.get(key);
      if (!bucket) {
        typed.set(key, (bucket = {
          resourceTypes: parsed.resourceTypes,
          thirdParty: parsed.thirdPartyOnly,
          domains: new Set(),
        }));
      }
      if (bucket.domains.has(parsed.domain)) duplicateRules++;
      else bucket.domains.add(parsed.domain);
      continue;
    }
    const target = parsed.thirdPartyOnly ? thirdParty : always;
    if (target.has(parsed.domain)) duplicateRules++;
    else target.add(parsed.domain);
  }

  return {
    always,
    thirdParty,
    exceptions,
    narrowExceptions,
    siteScopedExceptions,
    typed,
    drops,
    considered,
    exceptionRules,
    duplicateRules,
  };
}

// The sites a "$domain=" exception applies to. Only POSITIVE entries count:
// "domain=~foo.com" means "everywhere except foo.com", which is not a site list
// and must not be read as one. Returns [] for an exception with no site scope.
function exceptionSites(rule) {
  const dollar = rule.indexOf("$");
  if (dollar === -1) return [];
  const m = rule.slice(dollar + 1).match(/(?:^|,)domain=([^,]+)/);
  if (!m) return [];
  return m[1]
    .split("|")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d && !d.startsWith("~") && d.includes(".") && !/[^a-z0-9.\-_]/.test(d));
}

// The host a rule names, however narrowly the rule was scoped. Used ONLY for
// narrow exceptions, where we want the host even though the rule itself carries
// a path or an option — the opposite of domainFromAnchor, which refuses those on
// purpose because widening a block rule over-blocks. Widening an EXCEPTION only
// ever blocks less, so being lenient here is safe.
function looseHost(rule) {
  const body = rule.startsWith("||") ? rule.slice(2) : rule;
  let h = body.split("$")[0].split("^")[0].split("/")[0].split("?")[0].toLowerCase();
  h = h.replace(/^\*\./, "").replace(/\.$/, "").split(":")[0];
  if (!h || h.includes("*") || !h.includes(".")) return null;
  if (/[^a-z0-9.\-_]/.test(h) || /^[0-9.]+$/.test(h)) return null;
  return h;
}

// Pull a bare domain out of one domain-anchor rule ("||example.com^$opts").
// Returns { ok:true, domain, thirdPartyOnly } or { ok:false, reason }.
//
// The option string is checked STRICTLY: the only option this tier can honour
// is exactly "third-party". Anything else — a resource type, "$domain=", a
// negated option, "$redirect=" — needs a rule shape this tier does not build,
// so it is dropped rather than approximated. Approximating would over-block.
function domainFromAnchor(rule) {
  const body = rule.startsWith("||") ? rule.slice(2) : rule;
  const dollar = body.indexOf("$");
  const opts = dollar === -1 ? "" : body.slice(dollar + 1);
  let host = (dollar === -1 ? body : body.slice(0, dollar)).toLowerCase();

  // A whole-domain rule is EXACTLY "domain" or "domain^" — nothing else. This
  // check is the difference between a domain blocker and a broken browser:
  // "||example.com^*/track?id=" narrows the rule to one path, and silently
  // widening it to the whole of example.com would take the entire site down with
  // it. Anything carrying a path, query, inner wildcard or port is therefore a
  // rule this tier cannot express, not a domain to block.
  if (host.endsWith("^")) host = host.slice(0, -1);
  host = host.replace(/^\*\./, "").replace(/\.$/, ""); // leading wildcard, trailing dot
  if (/[/?^:]/.test(host)) return { ok: false, reason: "domain-anchored but path/query/port-scoped" };

  if (!host) return { ok: false, reason: "malformed rule" };
  if (host.includes("*")) return { ok: false, reason: "wildcard domain" };
  if (!host.includes(".")) return { ok: false, reason: "malformed rule" };
  if (/[^a-z0-9.\-_]/.test(host)) return { ok: false, reason: "malformed rule" };
  if (/^[0-9.]+$/.test(host)) return { ok: false, reason: "bare IP address" };
  if (NEVER_BLOCK.has(host) || PUBLIC_SUFFIXES.has(host)) {
    return { ok: false, reason: "guard: refused as shared infrastructure" };
  }

  if (opts === "") return { ok: true, domain: host, thirdPartyOnly: false, resourceTypes: null };
  if (opts === "third-party") {
    return { ok: true, domain: host, thirdPartyOnly: true, resourceTypes: null };
  }

  // A rule scoped to RESOURCE TYPES is expressible after all — DNR conditions
  // take a `resourceTypes` array, so "||google-analytics.com^$script,third-party,
  // xmlhttprequest" is a rule we can build exactly, not one to drop. Dropping
  // these was over-cautious and it cost the single most-loaded tracker on the web.
  const types = resourceTypesFromOptions(opts);
  if (types) {
    return { ok: true, domain: host, thirdPartyOnly: types.thirdParty, resourceTypes: types.list };
  }

  // Collapse the "$domain=" family into ONE bucket: there are dozens of distinct
  // host lists and naming each would fragment the drop table into one-off rows
  // that say nothing. The option name is what matters, not its argument.
  const named = opts.includes("domain=") ? "domain=…" : opts;
  return { ok: false, reason: `scoped option ($${named})` };
}

// ABP resource-type option → DNR resourceType. Only the types DNR actually has;
// "document"/"popup" are page-level concepts this subresource tier does not build.
const ABP_TO_DNR_TYPE = {
  script: "script",
  image: "image",
  stylesheet: "stylesheet",
  font: "font",
  media: "media",
  object: "object",
  "object-subrequest": "object",
  xmlhttprequest: "xmlhttprequest",
  subdocument: "sub_frame",
  ping: "ping",
  websocket: "websocket",
  other: "other",
};

// Turn an option string into { list, thirdParty } if EVERY option in it is one
// this tier can express, or null if any option is not.
//
// Negated types are honoured as a complement: "$~script" means every type except
// script, which is a real DNR condition (all subresource types minus that one).
// Mixing positive and negated types is not valid ABP and is refused rather than
// guessed at. `third-party` may ride along with either form.
function resourceTypesFromOptions(opts) {
  const parts = opts.split(",").map((o) => o.trim()).filter(Boolean);
  const positive = [];
  const negated = [];
  let thirdParty = false;
  for (const opt of parts) {
    if (opt === "third-party") {
      thirdParty = true;
      continue;
    }
    const negatedOpt = opt.startsWith("~");
    const name = negatedOpt ? opt.slice(1) : opt;
    const dnr = ABP_TO_DNR_TYPE[name];
    if (!dnr) return null; // $domain=, $redirect=, $csp, $important, $document, …
    (negatedOpt ? negated : positive).push(dnr);
  }
  if (positive.length && negated.length) return null; // not valid ABP; do not guess
  if (positive.length) {
    return { list: [...new Set(positive)].sort(), thirdParty };
  }
  if (negated.length) {
    const excluded = new Set(negated);
    return { list: SUBRESOURCE_TYPES.filter((t) => !excluded.has(t)), thirdParty };
  }
  return null; // only "third-party", which the caller already handled
}

// ===========================================================================
// Set reduction
// ===========================================================================

// Is `domain` already covered by an entry in `set`, given that a DNR
// requestDomains condition matches a domain AND all of its subdomains? True if
// any ANCESTOR of the domain is in the set ("a.b.example.com" is covered by
// "example.com"). The domain itself does not count as its own ancestor.
export function coveredByAncestor(set, domain) {
  const labels = domain.split(".");
  for (let i = 1; i < labels.length - 1; i++) {
    if (set.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

// Collapse a domain set against itself: drop every entry whose parent domain is
// already listed, because requestDomains already matches subdomains. Purely a
// size optimisation — it cannot change what gets blocked — and it matters here
// because EasyPrivacy's CNAME-cloaking sections list thousands of per-site
// subdomains. Returns { kept, collapsed }.
export function collapseSubdomains(domains, extraCover = new Set()) {
  const set = new Set(domains);
  const kept = [];
  let collapsed = 0;
  for (const d of [...set].sort()) {
    if (coveredByAncestor(set, d) || extraCover.has(d) || coveredByAncestor(extraCover, d)) {
      collapsed++;
      continue;
    }
    kept.push(d);
  }
  return { kept, collapsed };
}

// Remove every domain covered by an exception — the domain itself, or any
// ancestor of it ("@@||example.com^" spares "a.example.com" too, matching what
// the "||" anchor means upstream). Returns { kept, removed }.
export function applyExceptions(domains, exceptions) {
  const kept = [];
  let removed = 0;
  for (const d of domains) {
    if (exceptions.has(d) || coveredByAncestor(exceptions, d)) {
      removed++;
      continue;
    }
    kept.push(d);
  }
  return { kept, removed };
}

// Full reduction for one source, in the order that keeps the arithmetic honest:
//   1. drop anything spared by an exception (both groups),
//   2. a domain in BOTH groups keeps only its `always` entry — blocking in
//      every context is a superset of blocking cross-site only,
//   3. collapse redundant subdomains (thirdParty is also collapsed against
//      `always`, for the same superset reason).
export function reduce({
  always,
  thirdParty,
  exceptions,
  narrowExceptions = new Set(),
  siteScopedExceptions = new Map(),
  typed = new Map(),
}) {
  const afterExcAlways = applyExceptions([...always].sort(), exceptions);
  const afterExcThird = applyExceptions([...thirdParty].sort(), exceptions);

  // Narrow exceptions, applied second so their count is reported separately.
  // Measured against EasyPrivacy 202609010808 this spares ~500 domains (~1% of
  // the list) and they are the WORST 1% to get wrong: anti-bot and DDoS-check
  // endpoints (check.ddos-guard.net, api-js.datadome.co), analytics SDKs sites
  // gate their own UI on (cdn.segment.com, api.amplitude.com). Blocking those
  // does not cost the user an ad, it costs them the login. Trading 1% of
  // coverage for that is the trade this whole tier is premised on.
  const narrowAlways = applyExceptions(afterExcAlways.kept, narrowExceptions);
  const narrowThird = applyExceptions(afterExcThird.kept, narrowExceptions);

  const alwaysSet = new Set(narrowAlways.kept);
  const thirdOnly = narrowThird.kept.filter((d) => !alwaysSet.has(d));
  const dedupedAcrossGroups = narrowThird.kept.length - thirdOnly.length;

  const collapsedAlways = collapseSubdomains(narrowAlways.kept);
  const collapsedThird = collapseSubdomains(thirdOnly, new Set(collapsedAlways.kept));

  // Taking an excepted host OFF the list is not enough to spare it. A DNR
  // requestDomains condition matches every subdomain of what it lists, so an
  // excepted host whose PARENT is still listed goes on being blocked — removing
  // "api-js.datadome.co" achieves nothing while "datadome.co" is in the list.
  //
  // Found by auditing the built list against known bot-check and checkout
  // endpoints, not by reading the code: 73 hosts upstream had explicitly spared
  // were still blocked, among them DataDome's first-party proxies for Venmo and
  // CuriosityStream — i.e. exactly the checkout and sign-in breakage this tier is
  // supposed to avoid.
  //
  // DNR expresses the carve-out directly, so we emit these separately and the
  // rule builder attaches them as `excludedRequestDomains`, which takes
  // precedence over requestDomains. Dropping the PARENT instead would unblock
  // the whole tracker; this spares only what upstream actually spared.
  // Hosts upstream blocks by default but carves out on a NAMED LIST OF SITES.
  // They stay blocked; they just move out of the bulk groups into their own
  // entries so each can carry its own excludedInitiatorDomains. Without this they
  // would sit inside a 10,000-domain chunk rule that has nowhere to put a
  // per-host exception — which is exactly how googletagmanager.com ended up
  // unblocked everywhere instead of on the ~500 sites upstream meant.
  const scoped = [];
  const pull = (list, group) => {
    const kept = [];
    for (const d of list) {
      const sites = siteScopedExceptions.get(d);
      if (sites && sites.size) scoped.push({ domain: d, group, exceptInitiators: [...sites].sort() });
      else kept.push(d);
    }
    return kept;
  };
  const finalAlways = pull(collapsedAlways.kept, "always");
  const finalThird = pull(collapsedThird.kept, "thirdParty");

  // The same case one level down: a host upstream carved out on named sites that
  // is not listed itself, only caught by a listed PARENT. api-js.datadome.co is
  // the example — nothing lists it, datadome.co covers it, and upstream excepts it
  // on sso.garena.com, a login page. It needs both halves: carved out of the
  // parent's bulk rule, and given its own rule so it is still blocked everywhere
  // upstream did not name.
  const alwaysSetFinal = new Set(finalAlways);
  const thirdSetFinal = new Set(finalThird);
  const parentCarveOuts = new Set();
  for (const [host, sites] of siteScopedExceptions) {
    if (!sites.size) continue;
    if (alwaysSetFinal.has(host) || thirdSetFinal.has(host)) continue; // pull() had it
    if (scoped.some((e) => e.domain === host)) continue;
    const group = coveredByAncestor(alwaysSetFinal, host)
      ? "always"
      : coveredByAncestor(thirdSetFinal, host)
        ? "thirdParty"
        : null;
    if (!group) continue; // nothing blocks it, so there is nothing to carve out of
    // `viaParent` marks this as derived rather than a kept upstream rule, so the
    // reconciliation does not double-count a rule it already counted as dropped.
    scoped.push({ domain: host, group, exceptInitiators: [...sites].sort(), viaParent: true });
    parentCarveOuts.add(host);
  }
  scoped.sort((a, b) => a.domain.localeCompare(b.domain));

  // Type-scoped buckets get the same exception treatment as the bulk groups: a
  // host upstream spared must not come back in through a narrower rule.
  const allExceptions = new Set([...exceptions, ...narrowExceptions]);
  const typedOut = [];
  let typedDomains = 0;
  let typedRemovedByException = 0;
  for (const bucket of typed.values()) {
    const kept = [...bucket.domains].sort().filter((d) => {
      const spare = allExceptions.has(d) || coveredByAncestor(allExceptions, d);
      if (spare) typedRemovedByException++;
      return !spare;
    });
    if (!kept.length) continue;
    typedDomains += kept.length;
    typedOut.push({
      resourceTypes: bucket.resourceTypes,
      thirdParty: bucket.thirdParty,
      domains: kept,
    });
  }
  typedOut.sort((a, b) => a.resourceTypes.join().localeCompare(b.resourceTypes.join()));

  const blocked = new Set([...finalAlways, ...finalThird, ...scoped.map((e) => e.domain)]);
  const spared = [
    ...new Set([...exceptions, ...narrowExceptions, ...parentCarveOuts]),
  ]
    .filter((d) => coveredByAncestor(blocked, d))
    .sort();

  return {
    always: finalAlways,
    thirdParty: finalThird,
    scoped,
    typed: typedOut,
    spared,
    stats: {
      exceptionsHonoured: exceptions.size,
      removedByException: afterExcAlways.removed + afterExcThird.removed,
      narrowExceptionsHonoured: narrowExceptions.size,
      removedByNarrowException: narrowAlways.removed + narrowThird.removed,
      sparedUnderABlockedParent: spared.length,
      siteScopedBlocks: scoped.length,
      typeScopedDomains: typedDomains,
      typeScopedBuckets: typedOut.length,
      removedByExceptionFromTyped: typedRemovedByException,
      dedupedAcrossGroups,
      collapsedSubdomains: collapsedAlways.collapsed + collapsedThird.collapsed,
    },
  };
}

// ===========================================================================
// Fragile-surface audit
//
// The drop log says what the converter left behind. This says what it KEPT that
// somebody is going to feel. A tracker that slips through costs the user a bit
// of privacy; a bot check, a payment SDK or a consent manager that gets blocked
// costs them the checkout, and they will blame Sieve rather than the filter list.
//
// This exists because a hand-run version of it found a real bug: 73 hosts
// upstream had explicitly excepted were still being blocked through a listed
// parent domain (see `spared` in reduce()). That class of mistake is invisible in
// the domain counts and invisible in the drop log — the only way to see it is to
// ask "is anything load-bearing in here?" So the question is now asked on every
// build, and a refresh that starts blocking a payment provider says so out loud
// instead of shipping quietly.
//
// A hit is NOT automatically a bug. EasyPrivacy blocks fingerprinting and
// session-recording vendors on purpose, and those are legitimate third-party
// blocks. The audit's job is to make each one a decision someone made, not an
// accident — the surviving hits are what the settings page's known-issues line
// is written from.
// ===========================================================================

const FRAGILE_SURFACES = {
  "consent / CMP (interacts with Sieve's own cookie auto-reject)": [
    "onetrust.com", "cookielaw.org", "cdn.cookielaw.org", "cookiebot.com", "consent.cookiebot.com",
    "consensu.org", "quantcast.com", "trustarc.com", "consent.trustarc.com", "usercentrics.eu",
    "sp-prod.net", "didomi.io", "sdk.privacy-center.org", "iubenda.com", "cdn.iubenda.com",
    "cookieyes.com", "termly.io", "osano.com", "civicuk.com", "cookie-script.com",
  ],
  "bot / fraud checks (failure locks the user out, it does not remove an ad)": [
    "datadome.co", "api-js.datadome.co", "perimeterx.net", "px-cloud.net", "ddos-guard.net",
    "check.ddos-guard.net", "hcaptcha.com", "recaptcha.net", "arkoselabs.com", "funcaptcha.com",
    "sift.com", "siftscience.com", "riskified.com", "forter.com", "castle.io",
    "fingerprint.com", "fpjs.io", "iovation.com",
  ],
  "sign-in / identity": [
    "auth0.com", "cdn.auth0.com", "okta.com", "oktacdn.com", "onelogin.com", "duosecurity.com",
    "pingidentity.com", "accounts.google.com", "login.microsoftonline.com", "appleid.apple.com",
    "connect.facebook.net", "clerk.com",
  ],
  "payments / checkout": [
    "stripe.com", "js.stripe.com", "m.stripe.network", "paypal.com", "c.paypal.com",
    "paypalobjects.com", "adyen.com", "braintreegateway.com", "braintree-api.com", "klarna.com",
    "klarnacdn.net", "afterpay.com", "affirm.com", "squareup.com", "checkout.com",
    "worldpay.com", "plaid.com", "venmo.com",
  ],
  "embedded players / media": [
    "player.vimeo.com", "vimeo.com", "jwplayer.com", "cdn.jwplayer.com", "brightcove.net",
    "kaltura.com", "wistia.com", "fast.wistia.net", "dailymotion.com", "youtube-nocookie.com",
    "vidyard.com", "mux.com",
  ],
  "comments / support widgets": [
    "disqus.com", "disquscdn.com", "livefyre.com", "commento.io", "intercom.io",
    "widget.intercom.io", "zendesk.com", "static.zdassets.com", "freshchat.com", "crisp.chat",
    "tawk.to", "drift.com", "hubspot.com", "js.hs-scripts.com",
  ],
  "error reporting / session replay (sites sometimes gate their own UI on these)": [
    "sentry.io", "browser.sentry-cdn.com", "bugsnag.com", "datadoghq.com",
    "browser-intake-datadoghq.com", "newrelic.com", "js-agent.newrelic.com", "bam.nr-data.net",
    "rollbar.com", "logrocket.com", "fullstory.com",
  ],
};

// Which fragile-surface domains does the built list actually block? Honours
// `spared` — a host carved out by excludedRequestDomains is NOT blocked, which is
// the whole point of that array.
export function auditFragileSurfaces({ always, thirdParty, scoped = [], spared }) {
  // A `scoped` domain is still blocked everywhere upstream did not name a site,
  // so it counts as blocked here. A `spared` one genuinely is not.
  const alwaysSet = new Set([...always, ...scoped.filter((e) => e.group === "always").map((e) => e.domain)]);
  const thirdSet = new Set([...thirdParty, ...scoped.filter((e) => e.group === "thirdParty").map((e) => e.domain)]);
  const sparedSet = new Set(spared.filter((d) => !scoped.some((e) => e.domain === d)));
  const out = {};
  for (const [surface, domains] of Object.entries(FRAGILE_SURFACES)) {
    const hits = [];
    for (const d of domains) {
      if (sparedSet.has(d)) continue; // explicitly carved out
      const group = alwaysSet.has(d) || coveredByAncestor(alwaysSet, d)
        ? "always"
        : thirdSet.has(d) || coveredByAncestor(thirdSet, d)
          ? "thirdParty"
          : null;
      if (!group) continue;
      const via = alwaysSet.has(d) || thirdSet.has(d) ? null : "parent domain";
      hits.push({ domain: d, group, via });
    }
    if (hits.length) out[surface] = hits;
  }
  return out;
}

// ===========================================================================
// Fetch / read
// ===========================================================================

// Download one list. Tries the canonical URL first, then the mirror; throws only
// if BOTH fail. Same primary/mirror shape as background/safety-shield.js — a
// transient failure on one host must not fail a release build.
async function fetchListText(spec) {
  const urls = [spec.url, spec.mirrorUrl].filter(Boolean);
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.text();
    } catch (err) {
      lastErr = err;
      console.warn(`[Sieve] tracker list: fetch failed for ${url} (${err}); trying next source.`);
    }
  }
  throw new Error(`all sources failed (last: ${lastErr && lastErr.message})`);
}

// Read one list, from a local directory when --from was given (so a build is
// reproducible offline and a refresh can be re-run against the exact bytes that
// were reviewed) or from the network otherwise.
async function readSource(spec, fromDir) {
  if (!fromDir) return fetchListText(spec);
  const file = path.join(fromDir, spec.fileName);
  console.log(`[Sieve] tracker list: reading local copy ${file}`);
  return fs.readFileSync(file, "utf8");
}

// ===========================================================================
// Output
// ===========================================================================

function emit(groups, dryRun) {
  // `_license` is not decoration — it is the CC BY-SA 3.0 §4(a)/(c) attribution
  // travelling with the Adaptation, and it ships inside the extension package.
  // The in-app credit line and README entry are the other two places it appears.
  const titles = [...new Set(Object.values(groups).map((g) => g.upstreamTitle))];
  const first = Object.values(groups)[0];
  const out = {
    _comment: [
      "Sieve — Ad & Tracker Blocker: bundled tracker-domain list.",
      "GENERATED FILE — do not edit by hand. Regenerate with:",
      "  node build-tracker-list.mjs",
      "Each group is one DNR rule band in background/ad-tracker-blocker.js.",
      "'always' blocks the domain in every context; 'thirdParty' blocks it only",
      "cross-site (DNR condition.domainType = 'thirdParty'), because upstream",
      "marked it $third-party — those domains also serve first-party content.",
      "requestDomains matches each domain AND all its subdomains, so subdomains",
      "redundant with a listed parent are collapsed away at build time.",
      "The shared Allowlist (priority 2, ID 20000) overrides every rule built here.",
    ],
    _license: {
      work: titles.join(" + "),
      author: "The EasyList authors",
      source: first.homepage,
      licence: "CC BY-SA 3.0 (elected from EasyPrivacy's GPLv3 / CC BY-SA 3.0 dual licence)",
      licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      upstreamLicenceNotice: first.licenceUrl,
      adaptation:
        `Derived from ${titles.join(" and ")}: filtered to plain-domain entries expressible ` +
        "as a declarativeNetRequest requestDomains condition, exceptions honoured, " +
        "redundant subdomains collapsed. See data/ATTRIBUTION-easylist.md.",
    },
    _upstream: {},
    _dropped: {},
    // Not every domain in this file came from upstream. The hand-added ones are
    // named here so the file stays an honest account of its own provenance: the
    // BY-SA attribution above covers the Adaptation of EasyList, and these are
    // Sieve's own additions (MIT). A licence review reading only `_license`
    // would otherwise conclude the whole list is upstream's.
    _additions: {},
  };

  for (const [name, g] of Object.entries(groups)) {
    out._upstream[name] = {
      title: g.upstreamTitle,
      version: g.version,
      lastModified: g.lastModified,
      commit: g.commit,
    };
    out._dropped[name] = {
      considered: g.considered,
      kept: g.always.length + g.thirdParty.length,
      ...g.stats,
      byReason: Object.fromEntries([...g.drops].map(([r, b]) => [r, b.count])),
    };
    out._additions[name] = (g.additions?.added || []).map((a) => ({
      domain: a.domain,
      bucket: a.bucket,
      added: a.added,
      note: a.note,
    }));
    out[name] = {
      always: g.always,
      thirdParty: g.thirdParty,
      scoped: g.scoped,
      typed: g.typed,
      spared: g.spared,
    };
  }

  if (dryRun) {
    console.log("[Sieve] tracker list: --dry-run, not writing " + OUT_FILE);
    return;
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  const sizeKb = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(`[Sieve] tracker list → ${OUT_FILE} (${sizeKb} kB)`);
}

// The full drop report. Written to a repo-root markdown file (committed, NOT
// shipped in the extension package) so the count is auditable and a refresh is
// reproducible: the numbers here plus the upstream version pin down exactly what
// a given shipped list contains and what it left behind. The JSON carries the
// same counts; this file adds the examples.
function writeReport(groups, dryRun) {
  const lines = [
    "# Ad & Tracker Blocker — list conversion report",
    "",
    "Generated by `build-tracker-list.mjs`. Committed for auditability; **not**",
    "shipped in the extension package. Regenerate with `node build-tracker-list.mjs`.",
    "",
  ];
  for (const [name, g] of Object.entries(groups)) {
    const droppedTotal = g.droppedTotal;
    lines.push(
      `## ${name} — ${g.upstreamTitle} ${g.version}`,
      "",
      `- upstream commit: \`${g.commit}\` (last modified ${g.lastModified})`,
      `- rules considered: **${g.considered.toLocaleString()}**`,
      `- kept: **${(g.always.length + g.thirdParty.length).toLocaleString()}** ` +
        `(${g.always.length.toLocaleString()} always + ${g.thirdParty.length.toLocaleString()} third-party-only)`,
      `- dropped: **${droppedTotal.toLocaleString()}**`,
      `- whole-domain exceptions honoured: ${g.stats.exceptionsHonoured.toLocaleString()} ` +
        `(removed ${g.stats.removedByException.toLocaleString()} domains)`,
      `- narrow exceptions honoured: ${g.stats.narrowExceptionsHonoured.toLocaleString()} hosts ` +
        `(removed ${g.stats.removedByNarrowException.toLocaleString()} domains — upstream spared ` +
        `part of these, and we cannot express the narrower rule, so we spare the whole domain)`,
      `- blocked with a site carve-out: ${g.stats.siteScopedBlocks.toLocaleString()} ` +
        `(upstream excepts these on a named list of sites — kept blocked everywhere else, ` +
        `via excludedInitiatorDomains, instead of being unblocked globally)`,
      `- spared under a still-blocked parent: ${g.stats.sparedUnderABlockedParent.toLocaleString()} ` +
        `(emitted as \`spared\` → DNR excludedRequestDomains; removing them from the list alone ` +
        `would not have worked, because a listed parent matches every subdomain)`,
      `- de-duplicated across groups: ${g.stats.dedupedAcrossGroups.toLocaleString()}`,
      `- redundant subdomains collapsed: ${g.stats.collapsedSubdomains.toLocaleString()}`,
      `- duplicate rules (same domain twice in one group): ${g.duplicateRules.toLocaleString()}`,
      "",
      "Every considered rule is accounted for by exactly one outcome — the build",
      "fails if this does not balance (see `reconcile()`):",
      "",
      "```",
      `${g.always.length} always + ${g.thirdParty.length} third-party + ${droppedTotal} dropped +`,
      `${g.exceptionRules} exception rules + ${g.duplicateRules} duplicates +`,
      `${g.stats.removedByException} spared (whole-domain exc) + ${g.stats.removedByNarrowException} spared (narrow exc) +`,
      `${g.stats.dedupedAcrossGroups} cross-group + ${g.stats.collapsedSubdomains} collapsed = ${g.considered} considered`,
      "```",
      "",
      "### Hand-added domains",
      "",
      "Merged from `data/tracker-additions.json` AFTER conversion, so the tally",
      "above counts upstream rules only. These are Sieve's own (MIT), not part of",
      "the BY-SA Adaptation, and each went through the same guard and host checks",
      "as an upstream rule. An empty section is the normal state.",
      ""
    );
    const added = g.additions?.added || [];
    const redundant = g.additions?.redundant || [];
    if (!added.length) {
      lines.push("None.", "");
    } else {
      lines.push("| domain | bucket | added | why |", "| --- | --- | --- | --- |");
      for (const a of added) {
        lines.push(`| \`${a.domain}\` | ${a.bucket} | ${a.added || "—"} | ${(a.note || "—").replace(/\|/g, "\\|")} |`);
      }
      lines.push("");
    }
    if (redundant.length) {
      lines.push(
        "**Now redundant — delete these from `data/tracker-additions.json`.** Upstream",
        "has picked them up, so the hand-added entry no longer does anything:",
        ""
      );
      for (const r of redundant) lines.push(`- \`${r.domain}\` — already covered by \`${r.coveredBy}\``);
      lines.push("");
    }

    lines.push(
      "### Blocked on fragile surfaces",
      "",
      "Domains this list blocks whose failure costs more than an ad. A hit is not",
      "automatically a bug — EasyPrivacy blocks fingerprinting and session-replay",
      "vendors deliberately — but each one should be a decision, and these are what",
      "the settings page's known-issues line is written from. An empty section is",
      "the good outcome. Carve-outs in `spared` are already excluded here.",
      ""
    );
    const fragile = Object.entries(g.fragile);
    if (!fragile.length) {
      lines.push("None. Every fragile-surface domain checked is either unlisted or carved out.", "");
    } else {
      lines.push("| surface | domain | group | matched |", "| --- | --- | --- | --- |");
      for (const [surface, hits] of fragile) {
        for (const h of hits) {
          lines.push(`| ${surface} | \`${h.domain}\` | ${h.group} | ${h.via || "listed directly"} |`);
        }
      }
      lines.push("");
    }
    lines.push(
      "### Dropped, by reason",
      "",
      "| reason | count | examples |",
      "| --- | --- | --- |"
    );
    for (const [reason, b] of [...g.drops].sort((a, z) => z[1].count - a[1].count)) {
      // Examples are truncated: a few upstream cosmetic rules carry a 2,000-char
      // domain prefix, which would make this table unreadable.
      const ex = b.examples
        .map((e) => (e.length > 70 ? e.slice(0, 70) + "…" : e))
        .map((e) => "`" + e.replace(/\|/g, "\\|") + "`")
        .join(" ");
      lines.push(`| ${reason.replace(/\|/g, "\\|")} | ${b.count.toLocaleString()} | ${ex} |`);
    }
    lines.push("");
  }
  if (dryRun) {
    console.log(lines.join("\n"));
    return;
  }
  fs.writeFileSync(REPORT_FILE, lines.join("\n") + "\n");
  console.log(`[Sieve] tracker list report → ${REPORT_FILE}`);
}

// ===========================================================================
// Reconciliation
//
// Spec rule 4: log what was dropped and why, "so the count is honest and a
// future refresh is reproducible. No silent truncation." A tally that nearly
// adds up is not honest, so this proves it instead of asserting it: every rule
// the converter considered must be accounted for by exactly one outcome. A
// mismatch means a code path is losing rules silently, which is precisely the
// failure this rule exists to prevent — so it FAILS THE BUILD rather than
// printing a warning nobody reads.
// ===========================================================================

function reconcile(name, g) {
  const accounted =
    g.always.length + // kept, blocked in every context
    g.thirdParty.length + // kept, blocked cross-site only
    g.scoped.filter((e) => !e.viaParent).length + // kept, blocked except on the sites upstream named
    g.stats.typeScopedDomains + // kept, blocked only for the resource types named
    g.stats.removedByExceptionFromTyped + // a type-scoped host upstream spared
    g.droppedTotal + // unexpressible, itemised by reason in the report
    g.exceptionRules + // @@ rules honoured as whole-domain exceptions
    g.duplicateRules + // the same domain named twice in one group
    g.stats.removedByException + // spared by a whole-domain exception
    g.stats.removedByNarrowException + // spared by a narrower upstream exception
    g.stats.dedupedAcrossGroups + // in both groups; the `always` entry wins
    g.stats.collapsedSubdomains; // redundant: a listed parent already covers it
  if (accounted !== g.considered) {
    throw new Error(
      `[Sieve] tracker list "${name}": ${accounted} rules accounted for but ` +
        `${g.considered} were considered (difference ${g.considered - accounted}). ` +
        `Some rules are being lost silently — fix the classifier before shipping.`
    );
  }
}

// ===========================================================================
// Hand-maintained additions
// ===========================================================================
//
// EasyList has holes. `trinitymedia.ai` was the one found on indiewire.com: the
// only ad iframe still rendering after the entire list was applied, and carried
// by neither upstream list in any form. Without somewhere to put it, closing a
// gap like that means either waiting for upstream or hand-editing a GENERATED
// file, which the next build destroys.
//
// So data/tracker-additions.json is merged in here, and three properties of how
// that is done matter more than the merging itself:
//
//   1. It happens AFTER convert(), never inside it. reconcile() proves that
//      every UPSTREAM rule is accounted for, and it can only do that if the
//      upstream tally is untouched by entries that were never upstream. Adding
//      to `considered` to make the sums work would destroy the one guarantee
//      the equation gives.
//   2. Every entry goes through domainFromAnchor(), the same function every
//      upstream rule goes through — so the shared-infrastructure guard, the
//      public-suffix backstop and the malformed-host checks all apply. Nobody
//      gets to add `cloudfront.net` by hand.
//   3. A refused entry FAILS THE BUILD. The alternative is skipping it with a
//      warning, and a warning in a build log is how you end up shipping a list
//      that silently does not contain the domain you added to it.
//
// A domain upstream has since picked up is reported as redundant rather than
// duplicated, which is the signal to delete it from the additions file.

const ADDITIONS_FILE = "data/tracker-additions.json";

function readAdditions(path = ADDITIONS_FILE) {
  if (!fs.existsSync(path)) return {};
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`[Sieve] ${path} is not valid JSON: ${err.message}`);
  }
}

// Merge one group's additions into a converted group, in place. Returns what was
// done, for the report.
export function applyAdditions(name, group, additions, sourceLabel = ADDITIONS_FILE) {
  const spec = (additions && additions[name]) || {};
  const result = { added: [], redundant: [] };

  // Already covered if the domain itself, or any parent of it, is on the list —
  // requestDomains matches every subdomain, so a listed parent covers it.
  const listed = new Set([
    ...group.always,
    ...group.thirdParty,
    ...group.scoped.map((e) => e.domain),
  ]);
  const covered = (host) => {
    const parts = host.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join(".");
      if (listed.has(candidate)) return candidate;
    }
    return null;
  };

  for (const bucket of ["always", "thirdParty"]) {
    for (const raw of spec[bucket] || []) {
      const entry = typeof raw === "string" ? { domain: raw } : raw || {};
      const domain = String(entry.domain || "").trim().toLowerCase();
      if (!domain) {
        throw new Error(`[Sieve] ${sourceLabel}: an entry in ${name}.${bucket} has no "domain".`);
      }

      // Validated exactly as an upstream rule would be.
      const verdict = domainFromAnchor(`||${domain}^`);
      if (!verdict.ok) {
        throw new Error(
          `[Sieve] ${sourceLabel}: refusing "${domain}" in ${name}.${bucket} — ${verdict.reason}. ` +
            `Fix or remove the entry; it will not be skipped silently.`
        );
      }

      const already = covered(domain);
      if (already) {
        result.redundant.push({ domain, coveredBy: already, note: entry.note });
        continue;
      }

      group[bucket].push(domain);
      listed.add(domain);
      result.added.push({ domain, bucket, note: entry.note, added: entry.added });
    }
  }

  // Keep the emitted arrays sorted, like the converter's own output, so the
  // committed JSON diff stays readable.
  group.always.sort();
  group.thirdParty.sort();
  group.additions = result;
  return result;
}

// The whole conversion for one list's raw text: classify → reduce → prove the
// tally. One entry point so the build and test/tracker-list-test.mjs exercise
// the SAME pipeline — a test that reimplemented the wiring could pass while the
// build shipped something else.
export function convert(text, name = "list") {
  const classified = classifyList(text);
  const reduced = reduce(classified);
  const out = {
    considered: classified.considered,
    exceptionRules: classified.exceptionRules,
    duplicateRules: classified.duplicateRules,
    drops: classified.drops,
    droppedTotal: [...classified.drops.values()].reduce((n, b) => n + b.count, 0),
    always: reduced.always,
    thirdParty: reduced.thirdParty,
    scoped: reduced.scoped,
    typed: reduced.typed,
    spared: reduced.spared,
    stats: reduced.stats,
  };
  out.fragile = auditFragileSurfaces(out);
  reconcile(name, out);
  return out;
}

// ===========================================================================
// Main
// ===========================================================================

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const fromIdx = argv.indexOf("--from");
  const fromDir = fromIdx !== -1 ? argv[fromIdx + 1] : null;

  const additions = readAdditions();

  const groups = {};
  for (const [name, spec] of Object.entries(SOURCES)) {
    const text = await readSource(spec, fromDir);
    const meta = parseUpstreamMeta(text);
    const converted = convert(text, name);
    // After convert(), and therefore after reconcile() — see the note above
    // applyAdditions for why that order is not negotiable.
    const merged = applyAdditions(name, converted, additions);
    groups[name] = { upstreamTitle: spec.upstreamTitle, ...meta, ...converted };
    if (merged.added.length || merged.redundant.length) {
      console.log(
        `[Sieve] ${name}: ${merged.added.length} hand-added domain(s)` +
          (merged.redundant.length
            ? `, ${merged.redundant.length} now redundant (upstream carries them — delete from ${ADDITIONS_FILE}: ` +
              merged.redundant.map((r) => r.domain).join(", ") + ")"
            : "")
      );
    }
    console.log(
      `[Sieve] ${name}: ${spec.upstreamTitle} ${meta.version} — ` +
        `${converted.considered.toLocaleString()} rules considered, ` +
        `${(converted.always.length + converted.thirdParty.length).toLocaleString()} domains kept ` +
        `(${converted.always.length.toLocaleString()} always + ${converted.thirdParty.length.toLocaleString()} 3p), ` +
        `${converted.droppedTotal.toLocaleString()} dropped.`
    );
    const fragileCount = Object.values(converted.fragile).flat().length;
    if (fragileCount) {
      console.log(
        `[Sieve] ${name}: ${fragileCount} fragile-surface domain(s) are blocked — ` +
          `review the "Blocked on fragile surfaces" table in ${REPORT_FILE} before shipping.`
      );
      for (const [surface, hits] of Object.entries(converted.fragile)) {
        console.log(`           ${surface}: ${hits.map((h) => h.domain).join(", ")}`);
      }
    }
  }

  emit(groups, dryRun);
  writeReport(groups, dryRun);
}

// Only run the CLI when executed directly — test/tracker-list-test.mjs imports
// the pure functions above.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

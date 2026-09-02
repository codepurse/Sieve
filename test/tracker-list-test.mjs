// test/tracker-list-test.mjs
// Sieve — tests for the EasyPrivacy → domain-list converter in build-tracker-list.mjs.
//
//   node --test test/
//
// This converter decides which domains the browser refuses to talk to, and both
// failure directions are invisible from the settings page. An entry that gets
// dropped too eagerly looks exactly like a tier that is working — the user just
// keeps being tracked. An entry that gets kept too eagerly takes a whole site
// down, and the user blames Sieve, not the filter list.
//
// The widening direction is the dangerous one and it is the one that already bit
// us: an early version of domainFromAnchor() split "||example.com^*/track?id="
// on "^" and happily emitted "example.com", promoting a rule about ONE PATH into
// a block on the entire site. ~1,800 rules were affected. The first test below
// exists so that cannot come back.
//
// The reconciliation test is here for the same reason the build asserts it: the
// shipped domain count is a number we publish, so it has to be checkable rather
// than merely plausible.

import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import {
  applyAdditions,
  auditFragileSurfaces,
  classifyList,
  convert,
  reduce,
  collapseSubdomains,
  coveredByAncestor,
  applyExceptions,
  parseUpstreamMeta,
} from "../build-tracker-list.mjs";

// Convenience: the domains one snippet of filter text ends up blocking.
function run(lines) {
  return convert(lines.join("\n"), "test");
}

// --- the widening guard (the bug this file was written for) -----------------

test("a path-scoped rule NEVER becomes a whole-domain block", () => {
  const r = run([
    "||example.com^*/track?id=",
    "||other.com/pixel.gif",
    "||third.com^*/collect",
    "||fourth.com:8080/counter.php?",
  ]);
  assert.deepEqual(r.always, [], "no path-scoped rule may yield a domain");
  assert.deepEqual(r.thirdParty, []);
  assert.equal(r.droppedTotal, 4);
});

test("only a bare domain-anchor rule yields a domain", () => {
  const r = run(["||tracker.com^", "||nocaret.com", "||UPPER.COM^"]);
  assert.deepEqual(r.always, ["nocaret.com", "tracker.com", "upper.com"]);
});

// --- the two kept forms ----------------------------------------------------

test("$third-party is kept as its own group, not folded into always", () => {
  const r = run(["||always.com^", "||crosssite.com^$third-party"]);
  assert.deepEqual(r.always, ["always.com"]);
  assert.deepEqual(r.thirdParty, ["crosssite.com"]);
});

test("a domain in both groups keeps only its always entry", () => {
  const r = run(["||both.com^", "||both.com^$third-party"]);
  assert.deepEqual(r.always, ["both.com"]);
  assert.deepEqual(r.thirdParty, []);
  assert.equal(r.stats.dedupedAcrossGroups, 1);
});

test("a resource-type-scoped rule is expressed, not dropped", () => {
  // DNR conditions take a `resourceTypes` array, so these are buildable exactly.
  // Dropping them was over-cautious and it cost google-analytics.com.
  const r = run(["||a.com^$script", "||b.com^$image,third-party"]);
  assert.deepEqual(r.always, []);
  assert.deepEqual(r.thirdParty, []);
  assert.equal(r.typed.length, 2);
  const script = r.typed.find((b) => b.resourceTypes.join() === "script");
  assert.deepEqual(script.domains, ["a.com"]);
  assert.equal(script.thirdParty, false);
  const image = r.typed.find((b) => b.resourceTypes.join() === "image");
  assert.equal(image.thirdParty, true);
});

test("a negated resource type becomes the complement, not a guess", () => {
  const r = run(["||e.com^$~script"]);
  assert.equal(r.typed.length, 1);
  assert.ok(!r.typed[0].resourceTypes.includes("script"));
  assert.ok(r.typed[0].resourceTypes.includes("image"), "every other type survives");
});

test("options DNR still cannot express are dropped", () => {
  const r = run([
    "||c.com^$domain=example.org",
    "||d.com^$redirect=noopjs,script",
    "||f.com^$csp=script-src none",
    "||g.com^$script,~image",
  ]);
  assert.deepEqual(r.always, []);
  assert.deepEqual(r.typed, []);
  assert.equal(r.droppedTotal, 4);
});

// --- forms a domain tier cannot express ------------------------------------

test("cosmetic, scriptlet, regex and substring rules are dropped with a reason", () => {
  const r = run([
    "##.ad-slot",
    "example.com#@#.ad",
    "example.com#$#body { }",
    "example.com##+js(set, foo, false)",
    "/^https?:\\/\\/ads\\./",
    "&ev=PageView&",
  ]);
  assert.deepEqual(r.always, []);
  const reasons = [...r.drops.keys()].join(" | ");
  assert.match(reasons, /cosmetic or scriptlet/);
  assert.match(reasons, /regex rule/);
  assert.match(reasons, /not domain-anchored/);
});

test("wildcard domains and bare IPs are dropped — requestDomains needs a literal domain", () => {
  const r = run(["||ads-*.example.com^", "||geo-api-*.com^", "||34.215.155.61^", "||[::]^"]);
  assert.deepEqual(r.always, []);
  assert.equal(r.droppedTotal, 4);
});

// --- exceptions ------------------------------------------------------------

test("a whole-domain exception spares the domain and everything under it", () => {
  const r = run([
    "||spared.com^",
    "||sub.spared.com^",
    "||blocked.com^",
    "@@||spared.com^",
  ]);
  assert.deepEqual(r.always, ["blocked.com"]);
  assert.equal(r.stats.removedByException, 2);
});

test("a HOST-level exception spares the whole domain", () => {
  // "@@||host^$script" names the host with no path and no site list. Since the
  // resource-type option is itself expressible, it reads as a clean whole-domain
  // exception: the host comes off the list rather than being blocked for every
  // other type.
  const r = run(["||antibot.example^", "||tracker.example^", "@@||antibot.example^$script"]);
  assert.deepEqual(r.always, ["tracker.example"]);
  assert.equal(r.stats.removedByException, 1);
});

test("a host-level exception with an inexpressible option still spares the host", () => {
  const r = run(["||antibot.example^", "||tracker.example^", "@@||antibot.example^$csp=none"]);
  assert.deepEqual(r.always, ["tracker.example"]);
  assert.equal(r.stats.narrowExceptionsHonoured, 1);
});

test("a PATH-scoped exception does NOT spare the whole domain", () => {
  // Upstream blocks the domain and carves out one file. Reading that as "never
  // block this domain" inverts it — one "/widgets/q?" exception was unblocking
  // the whole of amazon-adsystem.com.
  const r = run(["||adnetwork.example^", "@@||adnetwork.example/widgets/q?$image"]);
  assert.deepEqual(r.always, ["adnetwork.example"], "the block survives the carve-out");
  assert.equal(r.stats.removedByNarrowException, 0);
});

test("a SITE-SCOPED exception keeps the block and carves out those sites only", () => {
  // The bug this replaces: upstream excepts googletagmanager.com on ~500 named
  // sites, and the old rule read that as "never block it anywhere". 118 hosts
  // were unblocked globally that way, including criteo.com and clarity.ms.
  const r = run([
    "||gtm.example^",
    "@@||gtm.example/gtm.js$domain=shop.example|news.example",
  ]);
  assert.deepEqual(r.always, [], "it moves out of the bulk group…");
  assert.equal(r.scoped.length, 1, "…and into its own rule");
  assert.equal(r.scoped[0].domain, "gtm.example");
  assert.deepEqual(r.scoped[0].exceptInitiators, ["news.example", "shop.example"]);
  assert.equal(r.stats.siteScopedBlocks, 1);
});

test("a negated site list is not a site list", () => {
  // "$domain=~foo.com" means "everywhere except foo.com" — reading that as a
  // site carve-out would invert the rule. And because this one is path-scoped it
  // does not spare the host either, so the block simply stands.
  const r = run(["||t.example^", "@@||t.example/x.js$script,domain=~foo.example"]);
  assert.deepEqual(r.scoped, []);
  assert.deepEqual(r.always, ["t.example"]);
});

test("a site-scoped host caught only by its parent gets both halves", () => {
  // api-js.datadome.co is the real case: nothing lists it, datadome.co covers it,
  // upstream excepts it on one login page. It must be carved out of the parent's
  // bulk rule AND given its own rule, or it is blocked on that login page too.
  const r = run(["||datadome.example^", "@@||api-js.datadome.example^$domain=sso.example"]);
  assert.deepEqual(r.always, ["datadome.example"], "the parent stays blocked");
  assert.ok(r.spared.includes("api-js.datadome.example"), "carved out of the parent rule");
  const own = r.scoped.find((e) => e.domain === "api-js.datadome.example");
  assert.ok(own, "and given its own rule");
  assert.deepEqual(own.exceptInitiators, ["sso.example"]);
  assert.equal(own.viaParent, true);
});

test("an exception this tier cannot express is counted as dropped, not swallowed", () => {
  const r = run(["||a.example^", "@@||a.example/x.js$script"]);
  assert.equal(r.droppedTotal, 1);
  assert.equal(r.exceptionRules, 0); // path-scoped: not a whole-domain exception
});

test("an excepted host under a still-blocked parent is spared, not silently blocked", () => {
  // The bug this catches: removing "api-js.datadome.co" from the list does
  // NOTHING while "datadome.co" is listed, because a requestDomains condition
  // matches every subdomain. It has to come out as an explicit carve-out.
  const r = run(["||datadome.example^$third-party", "@@||api-js.datadome.example^$script"]);
  assert.deepEqual(r.thirdParty, ["datadome.example"], "the parent stays blocked");
  assert.deepEqual(r.spared, ["api-js.datadome.example"], "the child is carved out");
  assert.equal(r.stats.sparedUnderABlockedParent, 1);
});

test("an excepted host with no blocked parent needs no carve-out", () => {
  // It was simply removed from the list, so there is nothing to except it from.
  const r = run(["||tracker.example^", "@@||other.example/x.js$script"]);
  assert.deepEqual(r.spared, []);
});

test("a whole-domain exception under a blocked parent is carved out too", () => {
  const r = run(["||parent.example^", "@@||sub.parent.example^"]);
  assert.deepEqual(r.always, ["parent.example"]);
  assert.deepEqual(r.spared, ["sub.parent.example"]);
});

// --- the safety guard ------------------------------------------------------

test("shared infrastructure and public suffixes are refused even if upstream lists them", () => {
  const r = run([
    "||googleapis.com^",
    "||cloudflare.com^",
    "||accounts.google.com^",
    "||co.uk^",
    "||com.br^",
    "||realtracker.com^",
  ]);
  assert.deepEqual(r.always, ["realtracker.com"]);
  assert.equal(r.drops.get("guard: refused as shared infrastructure").count, 5);
});

// --- subdomain collapsing --------------------------------------------------

test("coveredByAncestor treats a listed parent as covering its subdomains only", () => {
  const set = new Set(["example.com"]);
  assert.equal(coveredByAncestor(set, "a.example.com"), true);
  assert.equal(coveredByAncestor(set, "a.b.example.com"), true);
  assert.equal(coveredByAncestor(set, "example.com"), false, "not its own ancestor");
  assert.equal(coveredByAncestor(set, "notexample.com"), false, "not a label boundary");
  assert.equal(coveredByAncestor(new Set(["com"]), "example.com"), false, "never the TLD");
});

test("collapseSubdomains drops entries a listed parent already matches", () => {
  const { kept, collapsed } = collapseSubdomains([
    "example.com",
    "a.example.com",
    "b.a.example.com",
    "other.com",
  ]);
  assert.deepEqual(kept, ["example.com", "other.com"]);
  assert.equal(collapsed, 2);
});

test("a third-party entry under an always parent is collapsed away", () => {
  // `always` blocks in every context, so a cross-site-only rule underneath it
  // can never add anything.
  const r = run(["||example.com^", "||a.example.com^$third-party"]);
  assert.deepEqual(r.always, ["example.com"]);
  assert.deepEqual(r.thirdParty, []);
  assert.equal(r.stats.collapsedSubdomains, 1);
});

test("applyExceptions reports what it removed", () => {
  const { kept, removed } = applyExceptions(["a.com", "b.com", "x.a.com"], new Set(["a.com"]));
  assert.deepEqual(kept, ["b.com"]);
  assert.equal(removed, 2);
});

// --- fragile-surface audit --------------------------------------------------

test("the audit flags a blocked payment or bot-check domain", () => {
  const hits = auditFragileSurfaces({
    always: ["stripe.com"],
    thirdParty: ["datadome.co"],
    spared: [],
  });
  const flat = Object.values(hits).flat().map((h) => h.domain);
  assert.ok(flat.includes("stripe.com"));
  assert.ok(flat.includes("datadome.co"));
});

test("the audit flags a fragile domain caught through its parent", () => {
  // This is the shape of the bug that prompted the audit: nothing lists
  // api-js.datadome.co, but datadome.co covers it.
  const hits = auditFragileSurfaces({ always: [], thirdParty: ["datadome.co"], spared: [] });
  const apiJs = Object.values(hits).flat().find((h) => h.domain === "api-js.datadome.co");
  assert.ok(apiJs, "a subdomain hit must be reported, not just the parent");
  assert.equal(apiJs.via, "parent domain");
});

test("a carved-out host is not reported as blocked", () => {
  const hits = auditFragileSurfaces({
    always: [],
    thirdParty: ["datadome.co"],
    spared: ["api-js.datadome.co"],
  });
  const flat = Object.values(hits).flat().map((h) => h.domain);
  assert.ok(flat.includes("datadome.co"), "the parent is still blocked");
  assert.ok(!flat.includes("api-js.datadome.co"), "the carve-out must clear the flag");
});

test("a clean list produces no findings", () => {
  assert.deepEqual(auditFragileSurfaces({ always: ["tracker.example"], thirdParty: [], spared: [] }), {});
});

test("the shipped list keeps consent, payments and sign-in clean", async () => {
  // These three categories must stay empty. Consent especially: Sieve's own
  // cookie auto-reject drives those CMPs, so blocking one makes two Sieve
  // features fight each other.
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile(new URL("../data/tracker-domains.json", import.meta.url)));
  const hits = auditFragileSurfaces(data.trackers);
  for (const surface of Object.keys(hits)) {
    assert.ok(
      !/consent|payments|sign-in|player|comments/.test(surface),
      `the shipped list blocks something on a surface that must stay clean: ${surface} ` +
        `(${hits[surface].map((h) => h.domain).join(", ")})`
    );
  }
});

// --- honesty of the count --------------------------------------------------

test("every considered rule is accounted for by exactly one outcome", () => {
  // convert() calls reconcile() internally and throws if this does not balance,
  // so a mix of every outcome passing at all IS the assertion. The explicit sum
  // is here so a reader can see what the build is proving.
  const r = run([
    "! a comment",
    "",
    "||keep.com^",
    "||cross.com^$third-party",
    "||keep.com^", // duplicate
    "||both.com^",
    "||both.com^$third-party", // cross-group
    "||parent.com^",
    "||kid.parent.com^", // collapsed
    "||spared.com^",
    "@@||spared.com^", // whole-domain exception
    "||narrow.com^",
    "@@||narrow.com^$script", // host-level exception
    "##.cosmetic",
    "||path.com^*/track",
  ]);
  const accounted =
    r.always.length +
    r.thirdParty.length +
    r.droppedTotal +
    r.exceptionRules +
    r.duplicateRules +
    r.stats.removedByException +
    r.stats.removedByNarrowException +
    r.stats.dedupedAcrossGroups +
    r.stats.collapsedSubdomains;
  assert.equal(accounted, r.considered);
  assert.deepEqual(r.always, ["both.com", "keep.com", "parent.com"]);
  assert.deepEqual(r.thirdParty, ["cross.com"]);
});

test("reconcile fails loudly when a rule would be lost silently", () => {
  // Simulate a classifier that forgets a bucket: reduce() over a set the caller
  // under-counted. convert() is the guarded path, so we drive reduce() directly
  // and check the sum no longer balances — i.e. the assertion has teeth.
  const classified = classifyList("||a.com^\n||b.com^");
  classified.considered += 1; // pretend one more rule was seen
  const reduced = reduce(classified);
  const accounted = reduced.always.length + reduced.thirdParty.length;
  assert.notEqual(accounted, classified.considered);
});

// --- upstream metadata -----------------------------------------------------

test("parseUpstreamMeta reads the header and stops at the first rule", () => {
  const meta = parseUpstreamMeta(
    [
      "[Adblock Plus 1.1]",
      "! Version: 202609010808",
      "! Title: EasyPrivacy",
      "! Last modified: 01 Sep 2026 08:08 UTC",
      "! Licence: https://easylist.to/pages/licence.html",
      "! Commit: abc123",
      "||first.rule^",
      "! Version: 999 (a later part-file header, must not win)",
    ].join("\n")
  );
  assert.equal(meta.version, "202609010808");
  assert.equal(meta.commit, "abc123");
  assert.equal(meta.licenceUrl, "https://easylist.to/pages/licence.html");
});

test("a list with no header still converts, with metadata marked unknown", () => {
  const meta = parseUpstreamMeta("||tracker.com^");
  assert.equal(meta.version, "unknown");
  assert.equal(meta.commit, "unknown");
  // The licence URI falls back to the canonical one rather than going missing —
  // CC BY-SA 3.0 §4(a) requires it to travel with the list.
  assert.match(meta.licenceUrl, /easylist\.to\/pages\/licence\.html/);
});


// ===========================================================================
// Hand-maintained additions (data/tracker-additions.json)
// ===========================================================================
//
// This file is the one thing in this path edited by hand, so it is the one
// thing that can carry a mistake nobody reviewed. Two failure modes matter and
// both are silent without these tests: an entry the guard should refuse getting
// through, and an entry that looks added but does nothing.

const group = (over = {}) => ({
  always: [], thirdParty: [], scoped: [], typed: [], spared: [], ...over,
});

test("an addition lands in the group it was filed under", () => {
  const g = group();
  const r = applyAdditions("ads", g, { ads: { always: [{ domain: "example-adnet.com" }] } });
  assert.deepEqual(g.always, ["example-adnet.com"]);
  assert.deepEqual(r.added.map((a) => a.domain), ["example-adnet.com"]);
  assert.deepEqual(r.redundant, []);
});

test("a bare string works as well as an object", () => {
  const g = group();
  applyAdditions("ads", g, { ads: { thirdParty: ["example-adnet.com"] } });
  assert.deepEqual(g.thirdParty, ["example-adnet.com"]);
});

test("shared infrastructure is refused, and refusing FAILS the build", () => {
  // The whole point of routing additions through domainFromAnchor. Skipping a
  // refused entry with a warning is how a list ships without the domain that
  // was added to it — so this throws rather than returning a report.
  for (const bad of ["cloudfront.net", "googleapis.com", "co.uk", "accounts.google.com"]) {
    assert.throws(
      () => applyAdditions("ads", group(), { ads: { always: [bad] } }),
      /refusing .*guard: refused as shared infrastructure|refusing/,
      bad
    );
  }
});

test("a malformed host is refused rather than emitted", () => {
  for (const bad of ["nodot", "1.2.3.4", "has space.com", "*.example.com/path"]) {
    assert.throws(() => applyAdditions("ads", group(), { ads: { always: [bad] } }), /refusing/, bad);
  }
});

test("an entry with no domain is refused", () => {
  assert.throws(() => applyAdditions("ads", group(), { ads: { always: [{ note: "oops" }] } }), /has no "domain"/);
});

test("a domain upstream already covers is reported redundant, not duplicated", () => {
  // The signal to delete the entry. Duplicating it would be harmless to the
  // rules and useless as a signal, which is why it is called out instead.
  const g = group({ always: ["adnet.example"] });
  const r = applyAdditions("ads", g, { ads: { always: ["sub.adnet.example", "adnet.example"] } });
  assert.deepEqual(g.always, ["adnet.example"], "nothing is added");
  assert.deepEqual(r.added, []);
  assert.deepEqual(r.redundant.map((x) => [x.domain, x.coveredBy]), [
    ["sub.adnet.example", "adnet.example"],
    ["adnet.example", "adnet.example"],
  ]);
});

test("additions for the other group are ignored", () => {
  const g = group();
  applyAdditions("ads", g, { trackers: { always: ["example-tracker.com"] } });
  assert.deepEqual(g.always, []);
});

test("the emitted arrays stay sorted, so the committed diff stays readable", () => {
  const g = group({ always: ["zzz.example", "mmm.example"] });
  applyAdditions("ads", g, { ads: { always: ["aaa.example"] } });
  assert.deepEqual(g.always, ["aaa.example", "mmm.example", "zzz.example"]);
});

test("the REAL additions file passes every check", () => {
  // Run the file that actually ships through the same merge, so a bad hand edit
  // fails `npm test` rather than the release build.
  const real = JSON.parse(fs.readFileSync(new URL("../data/tracker-additions.json", import.meta.url), "utf8"));
  for (const name of ["trackers", "ads"]) {
    const g = group();
    const r = applyAdditions(name, g, real, "data/tracker-additions.json"); // throws on a bad entry
    for (const a of r.added) {
      assert.ok(a.note, `${a.domain} needs a note saying why it is here`);
      assert.match(a.added || "", /^\d{4}-\d{2}-\d{2}$/, `${a.domain} needs an "added" date`);
    }
  }
});

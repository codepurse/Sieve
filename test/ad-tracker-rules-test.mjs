// test/ad-tracker-rules-test.mjs
// Sieve — tests for the rule shapes in background/ad-tracker-blocker.js.
//
//   node --test test/
//
// This tier is the first one whose dominant action is `block` on subresources
// rather than `redirect` to the blocked page, and the difference is invisible
// until a real page breaks: redirecting a subresource hands a page an HTML
// interstitial where it asked for a script, which is worse than blocking it.
// The three rule shapes are pinned here so that cannot drift back.
//
// The allowlist assertions matter most. On every other tier the shared allowlist
// works for free, because those tiers block the domain the user is navigating
// TO. This tier blocks a third domain the page pulled in, so the shared rule
// never matches and the escape hatch has to be built into these conditions. A
// regression there would look like nothing at all — the toggle would work, the
// allowlist would appear to save, and the user's bank would still be broken.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// The module registers chrome listeners at import time, so it needs a chrome
// object to exist before it loads. Only the registration surfaces are exercised
// here — the pure builders under test take their inputs as arguments.
globalThis.chrome = {
  runtime: {
    onInstalled: { addListener() {} },
    onStartup: { addListener() {} },
    getURL: (p) => p,
  },
  storage: { local: { get: async (d) => d }, onChanged: { addListener() {} } },
  declarativeNetRequest: {
    getDynamicRules: async () => [],
    updateDynamicRules: async () => {},
  },
};

const {
  buildTrackerRules,
  allowlistInitiators,
  AD_TRACKER_ENABLED_KEY,
  AD_NETWORK_ENABLED_KEY,
  AD_TRACKER_GROUPS,
} = await import("../background/ad-tracker-blocker.js");

const ID_START = 180000;
const ID_END = 190000;

const build = (always = [], thirdParty = [], allow = [], spared = [], scoped = [], typed = []) =>
  buildTrackerRules({ always, thirdParty, spared, scoped, typed }, allow);

const pages = (rules) => rules.filter((r) => r.condition.resourceTypes.includes("main_frame"));
const subresource = (rules) => rules.filter((r) => !r.condition.resourceTypes.includes("main_frame"));

// --- the three shapes ------------------------------------------------------

test("an empty list produces no rules", () => {
  assert.deepEqual(build(), []);
  assert.deepEqual(build([], []), []);
});

test("an `always` domain yields one page redirect and one subresource block", () => {
  const rules = build(["tracker.com"]);
  assert.equal(rules.length, 2);

  const [page] = pages(rules);
  assert.equal(page.action.type, "redirect");
  assert.match(page.action.redirect.extensionPath, /category=trackers/);
  assert.deepEqual(page.condition.requestDomains, ["tracker.com"]);

  const [sub] = subresource(rules);
  assert.equal(sub.action.type, "block", "subresources are blocked, never redirected");
  assert.ok(sub.condition.resourceTypes.includes("script"));
  assert.ok(sub.condition.resourceTypes.includes("xmlhttprequest"));
});

test("no subresource rule may ever redirect", () => {
  const rules = build(["a.com"], ["b.com"]);
  for (const r of subresource(rules)) {
    assert.equal(r.action.type, "block", `subresource rule ${r.id} must block, not redirect`);
  }
});

test("a $third-party domain is blocked cross-site only, and never as a page", () => {
  const rules = build([], ["crosssite.com"]);
  assert.equal(rules.length, 1, "no main_frame rule — a top-level load is always first-party");
  assert.equal(rules[0].condition.domainType, "thirdParty");
  assert.equal(rules[0].action.type, "block");
  assert.deepEqual(pages(rules), []);
});

test("`always` rules carry no domainType — they block in every context", () => {
  const rules = build(["tracker.com"]);
  for (const r of rules) assert.equal(r.condition.domainType, undefined);
});

// --- the allowlist escape hatch --------------------------------------------

test("allowlisted sites are excluded as INITIATORS from every block rule", () => {
  const rules = build(["tracker.com"], ["cross.com"], ["mybank.com"]);
  for (const r of subresource(rules)) {
    assert.deepEqual(
      r.condition.excludedInitiatorDomains,
      ["mybank.com"],
      `rule ${r.id} must not run while the user is on an allowlisted site`
    );
  }
});

test("the page redirect is NOT initiator-scoped — the shared allow rule covers it", () => {
  // Excluding initiators on a main_frame rule would key off the page the user
  // clicked FROM, which is not what allowlisting a tracker domain means. The
  // shared priority-2 allow rule (id 20000) is what lets that navigation through.
  const [page] = pages(build(["tracker.com"], [], ["mybank.com"]));
  assert.equal(page.condition.excludedInitiatorDomains, undefined);
});

test("an empty allowlist omits the key entirely — DNR rejects an empty array", () => {
  for (const r of build(["tracker.com"], ["cross.com"], [])) {
    assert.equal(
      "excludedInitiatorDomains" in r.condition,
      false,
      "an empty exclusion list must be absent, not []"
    );
  }
});

test("allowlistInitiators keeps real domains and discards what DNR would reject", () => {
  assert.deepEqual(
    allowlistInitiators([
      "Example.COM",
      "https://shop.example.org/checkout",
      "*.wild.example",
      "example.com:8443",
      "  spaced.example  ",
      "example.com", // duplicate of the first, after normalising
      "# a note",
      "/regex\\.example/", // a blocked-list pattern form, not a domain
      "title/Some Page/",
      "notadomain",
      "",
    ]),
    ["example.com", "shop.example.org", "wild.example", "spaced.example"]
  );
});

test("a non-array allowlist cannot take the tier down", () => {
  assert.deepEqual(allowlistInitiators(undefined), []);
  assert.deepEqual(allowlistInitiators(null), []);
  assert.deepEqual(allowlistInitiators("example.com"), []);
});

// --- upstream carve-outs ---------------------------------------------------

test("spared hosts are excluded from every rule shape, page redirect included", () => {
  const rules = build(["datadome.example"], ["cross.example"], [], ["api-js.datadome.example"]);
  assert.ok(rules.length >= 3);
  for (const r of rules) {
    assert.deepEqual(
      r.condition.excludedRequestDomains,
      ["api-js.datadome.example"],
      `rule ${r.id} must carve out the host upstream vouched for`
    );
  }
});

test("no spared hosts means the key is absent, not an empty array", () => {
  for (const r of build(["tracker.example"], ["cross.example"], [], [])) {
    assert.equal("excludedRequestDomains" in r.condition, false);
  }
});

test("spared and allowlist carve-outs coexist on one condition", () => {
  const [, sub] = build(["t.example"], [], ["mybank.example"], ["spared.t.example"]);
  assert.deepEqual(sub.condition.excludedRequestDomains, ["spared.t.example"]);
  assert.deepEqual(sub.condition.excludedInitiatorDomains, ["mybank.example"]);
});

test("the shipped list carries its carve-outs into the bulk rules", async () => {
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile(new URL("../data/tracker-domains.json", import.meta.url)));
  assert.ok(data.trackers.spared.length > 0, "the shipped list should have carve-outs");
  const rules = buildTrackerRules(data.trackers, []);
  // The bulk rules pack many domains and carry the shared carve-out list; the
  // per-host `scoped` rules target one domain each and carry their own site list.
  const bulk = rules.filter((r) => r.condition.requestDomains.length > 1);
  assert.ok(bulk.length > 0);
  for (const r of bulk) {
    assert.deepEqual(r.condition.excludedRequestDomains, data.trackers.spared);
  }
});

test("a site-carve-out host gets its own rule, blocked everywhere else", () => {
  const rules = build([], [], [], [], [
    { domain: "gtm.example", group: "always", exceptInitiators: ["shop.example"] },
  ]);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].action.type, "block");
  assert.deepEqual(rules[0].condition.requestDomains, ["gtm.example"]);
  assert.deepEqual(rules[0].condition.excludedInitiatorDomains, ["shop.example"]);
  assert.equal(rules[0].condition.domainType, undefined);
});

test("a scoped rule merges the user's allowlist with upstream's site list", () => {
  const rules = build([], [], ["mybank.example"], [], [
    { domain: "gtm.example", group: "thirdParty", exceptInitiators: ["shop.example"] },
  ]);
  assert.deepEqual(rules[0].condition.excludedInitiatorDomains, ["shop.example", "mybank.example"]);
  assert.equal(rules[0].condition.domainType, "thirdParty");
});

test("the shipped list's flagship trackers are actually blocked", async () => {
  // Guards the regression this whole shape exists to fix: these are the most-used
  // trackers on the web, and a too-blunt exception rule silently unblocked them.
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile(new URL("../data/tracker-domains.json", import.meta.url)));
  const t = data.trackers;
  const blocked = new Set([...t.always, ...t.thirdParty, ...t.scoped.map((e) => e.domain)]);
  for (const d of ["googletagmanager.com", "criteo.com", "clarity.ms", "hotjar.com"]) {
    assert.ok(blocked.has(d), `${d} must be blocked`);
  }
});

// --- packing and the id band ------------------------------------------------

test("domains are packed 10,000 to a rule, not one rule each", () => {
  const many = Array.from({ length: 25000 }, (_, i) => `d${i}.example`);
  const rules = build(many);
  assert.equal(pages(rules).length, 3, "3 chunks => 3 page rules");
  assert.equal(subresource(rules).length, 3);
  assert.equal(pages(rules)[0].condition.requestDomains.length, 10000);
  assert.equal(pages(rules)[2].condition.requestDomains.length, 5000);
});

test("every rule stays inside the 180000-189999 band and at priority 1", () => {
  const many = Array.from({ length: 25000 }, (_, i) => `d${i}.example`);
  const rules = build(many, many.slice(0, 15000), ["a.example"]);
  const ids = rules.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "ids must be unique");
  for (const r of rules) {
    assert.ok(r.id >= ID_START && r.id < ID_END, `id ${r.id} escaped the band`);
    assert.equal(r.priority, 1, "priority 1 keeps the shared allowlist (priority 2) winning");
  }
});

test("the real shipped list fits the band with room to spare", async () => {
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile(new URL("../data/tracker-domains.json", import.meta.url)));
  const rules = buildTrackerRules(data.trackers, []);
  assert.ok(rules.length < 1000, `${rules.length} rules is far below the band's 10,000`);
  for (const r of rules) assert.ok(r.id >= ID_START && r.id < ID_END);
});

// --- the toggle ------------------------------------------------------------

test("both toggle keys are in the ss… namespace", () => {
  assert.equal(AD_TRACKER_ENABLED_KEY, "ssAdTrackerEnabled");
  assert.equal(AD_NETWORK_ENABLED_KEY, "ssAdNetworkEnabled");
});

test("the two groups own separate, non-overlapping id bands", () => {
  const { trackers, ads } = AD_TRACKER_GROUPS;
  assert.equal(trackers.idStart, 180000);
  assert.equal(trackers.idEnd, 190000);
  assert.equal(ads.idStart, 190000);
  assert.equal(ads.idEnd, 200000);
  assert.ok(trackers.idEnd <= ads.idStart, "bands must not overlap");
  assert.notEqual(trackers.category, ads.category);
});

test("each shipped group builds inside its own band", async () => {
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile(new URL("../data/tracker-domains.json", import.meta.url)));
  for (const [name, spec] of Object.entries(AD_TRACKER_GROUPS)) {
    const rules = buildTrackerRules(data[name], [], spec.idStart, spec.category);
    assert.ok(rules.length > 0, `${name} should build rules`);
    for (const r of rules) {
      assert.ok(r.id >= spec.idStart && r.id < spec.idEnd, `${name} rule ${r.id} escaped its band`);
    }
    const page = rules.find((r) => r.condition.resourceTypes.includes("main_frame"));
    assert.match(page.action.redirect.extensionPath, new RegExp(`category=${spec.category}`));
  }
});

// --- type-scoped blocks ------------------------------------------------------

test("a typed bucket becomes one rule scoped to those resource types", () => {
  const rules = build([], [], [], [], [], [
    { resourceTypes: ["script", "xmlhttprequest"], thirdParty: true, domains: ["ga.example"] },
  ]);
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0].condition.resourceTypes, ["script", "xmlhttprequest"]);
  assert.equal(rules[0].condition.domainType, "thirdParty");
  assert.deepEqual(rules[0].condition.requestDomains, ["ga.example"]);
});

test("a typed bucket naming an unknown resource type is skipped, not shipped broken", () => {
  const rules = build([], [], [], [], [], [
    { resourceTypes: ["main_frame", "popup"], thirdParty: false, domains: ["x.example"] },
  ]);
  assert.deepEqual(rules, [], "main_frame/popup are not subresource types this tier builds");
});

test("google-analytics.com is actually blocked by the shipped list", async () => {
  // It only appears upstream as "$script,third-party,xmlhttprequest". Dropping
  // type-scoped rules meant the most-loaded tracker on the web went unblocked.
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile(new URL("../data/tracker-domains.json", import.meta.url)));
  const bucket = data.trackers.typed.find((b) => b.domains.includes("google-analytics.com"));
  assert.ok(bucket, "google-analytics.com must be in a type-scoped bucket");
  assert.ok(bucket.resourceTypes.includes("script"));
});

// ===========================================================================
// Neutered stubs — the one place this tier answers instead of blocking
// ===========================================================================
//
// Blocking static.doubleclick.net/instream/ad_status.js fails the request with
// ERR_BLOCKED_BY_CLIENT, and a script by that name failing to load tells the site
// exactly what it wanted to know. Serving an empty script delivers the same
// amount of advertising — none — without the receipt. These pin the properties
// that make that work, each of which is silently wrong if it drifts.

const stubsOf = (rules) => rules.filter((r) => r.action.type === "redirect" && /noop/.test(r.action.redirect.extensionPath));

// The host a stub's urlFilter is about — "||host/path" → "host".
const hostOf = (stub) => stub.condition.urlFilter.replace(/^\|\|/, "").split("/")[0];

test("the ad-network group serves stubs for the adblock probes instead of blocking them", () => {
  const rules = buildTrackerRules(
    { always: ["static.doubleclick.net"], thirdParty: [], scoped: [], typed: [], spared: [] },
    [],
    190000,
    "ads"
  );
  const stubs = stubsOf(rules);
  assert.ok(stubs.length >= 1, "the ads group must build at least one stub");
  for (const stub of stubs) {
    assert.equal(stub.action.redirect.extensionPath, "/rules/noop.js");
    assert.deepEqual(stub.condition.resourceTypes, ["script"], "a script URL must be answered with a script");
    assert.match(stub.condition.urlFilter, /^\|\|[a-z0-9.-]+\/.+\.js$/, "a stub names one URL, not a host");
  }
  // The three probes the anti-adblock feature depends on, plus the original.
  const filters = stubs.map((s) => s.condition.urlFilter).join("\n");
  assert.match(filters, /ad_status\.js/);
  assert.match(filters, /adsbygoogle\.js/);
  assert.match(filters, /show_ads\.js/);
  assert.match(filters, /gpt\.js/);
});

test("the stubs outrank this tier's own block on the same host", () => {
  // Same host, two rules. If the stub does not win, the request still fails with
  // ERR_BLOCKED_BY_CLIENT and the whole exercise is pointless.
  const rules = buildTrackerRules(
    { always: ["static.doubleclick.net"], thirdParty: [], scoped: [], typed: [], spared: [] },
    [],
    190000,
    "ads"
  );
  const blocks = rules.filter((r) => r.action.type === "block");
  assert.ok(blocks.length, "the host must still be blocked for everything else");
  for (const stub of stubsOf(rules)) {
    for (const b of blocks) {
      assert.ok(stub.priority > b.priority, `stub priority ${stub.priority} must beat block priority ${b.priority}`);
    }
  }
});

test("an allowlisted site gets the real script, not our empty one", () => {
  // On a site the user allowlisted, this tier should not be interfering at all —
  // handing it a neutered script is still interfering.
  const rules = buildTrackerRules(
    { always: ["static.doubleclick.net"], thirdParty: [], scoped: [], typed: [], spared: [] },
    ["example.com"],
    190000,
    "ads"
  );
  for (const stub of stubsOf(rules)) {
    assert.deepEqual(stub.condition.excludedInitiatorDomains, ["example.com"]);
  }
});

test("a stub stands down on the sites upstream carved out for its host", () => {
  // The trap this pins. Shape 4 stops BLOCKING a scoped host on the sites
  // upstream named, because a human found that blocking it there broke the page.
  // A stub that kept firing on those sites would hand out an empty script
  // instead — the same breakage by a different route, and invisible because the
  // request succeeds.
  const rules = buildTrackerRules(
    {
      always: [],
      thirdParty: [],
      scoped: [
        { domain: "googletagservices.com", group: "always", exceptInitiators: ["chegg.com", "downdetector.ca"] },
      ],
      typed: [],
      spared: [],
    },
    ["mybank.example"],
    190000,
    "ads"
  );
  const gpt = stubsOf(rules).find((s) => hostOf(s) === "googletagservices.com");
  assert.ok(gpt, "the gpt.js stub must be built");
  // Upstream's carve-outs AND the user's allowlist, together.
  assert.deepEqual(
    [...gpt.condition.excludedInitiatorDomains].sort(),
    ["chegg.com", "downdetector.ca", "mybank.example"]
  );

  // And a stub whose host was not scoped keeps only the user's allowlist.
  const other = stubsOf(rules).find((s) => hostOf(s) === "static.doubleclick.net");
  assert.deepEqual(other.condition.excludedInitiatorDomains, ["mybank.example"]);
});

test("every stub names a host this tier actually blocks", () => {
  // DNR has no "$redirect-rule" — no way to say "redirect only if it would have
  // been blocked". So a stub for a host that is NOT on the list does not remove
  // a failed request, it replaces a script that was working. This checks each
  // stub host against the list Sieve really ships, for the group that builds it.
  const shipped = JSON.parse(fs.readFileSync(new URL("../data/tracker-domains.json", import.meta.url), "utf8"));

  for (const group of ["trackers", "ads"]) {
    const listed = new Set();
    for (const key of ["always", "thirdParty", "scoped", "typed", "spared"]) {
      for (const entry of shipped[group][key] || []) {
        if (typeof entry === "string") listed.add(entry);
        else if (entry && entry.domain) listed.add(entry.domain);
        else if (entry && Array.isArray(entry.domains)) for (const d of entry.domains) listed.add(d);
      }
    }

    const rules = buildTrackerRules(
      { always: ["placeholder.example"], thirdParty: [], scoped: [], typed: [], spared: [] },
      [],
      group === "ads" ? 190000 : 180000,
      group
    );
    for (const stub of stubsOf(rules)) {
      assert.ok(
        listed.has(hostOf(stub)),
        `${hostOf(stub)} is stubbed for the ${group} group but is not on that group's list`
      );
    }
  }
});

test("the tracker group builds no stubs — the probe host is not in its list", () => {
  const rules = buildTrackerRules(
    { always: ["example-tracker.com"], thirdParty: [], scoped: [], typed: [], spared: [] },
    [],
    180000,
    "trackers"
  );
  assert.deepEqual(stubsOf(rules), [], "a stub belongs only to the group that blocks its host");
});

test("stub ids sit inside the group's band and never collide with the chunk rules", () => {
  // The chunk rules count up from idStart; the stubs count from the top of the
  // band. A collision would make updateDynamicRules reject the whole batch.
  const many = Array.from({ length: 25000 }, (_, i) => `d${i}.example.com`);
  const rules = buildTrackerRules(
    { always: many, thirdParty: many, scoped: [], typed: [], spared: [] },
    [],
    190000,
    "ads"
  );
  const ids = rules.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "every rule id must be unique");
  for (const id of ids) {
    assert.ok(id >= 190000 && id < 200000, `id ${id} escaped the ads band`);
  }
});

// test/facebook-ads-test.mjs
// Sieve — tests for the Facebook payload scriptlet in content/facebook-ads.js.
//
//   node --test test/
//
// This file patches JSON.parse on a site nobody at Sieve controls and then
// deletes things out of the object Facebook is about to render. Too little and
// the ads come back; too much and someone's feed loses real posts, or stops
// paginating, and both failures look identical from the settings page.
//
// The tests run the REAL file in a vm sandbox with a fake window, rather than
// re-implementing its logic — a test that reimplemented the pruning could pass
// while the shipped scriptlet did something else entirely.
//
// The "must survive" assertions matter as much as the ad ones. Every one of them
// corresponds to something a user would notice within seconds: the cursor is
// infinite scroll, the sibling edges are their friends' posts, and an organic
// story carrying a null sponsored_data is the single most likely false positive
// this design has.

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const SOURCE = fs.readFileSync(new URL("../content/facebook-ads.js", import.meta.url), "utf8");

// Build a window the scriptlet can attach to, run the real file against it, and
// hand back a parse() that goes through the installed hook.
function runScriptlet() {
  const posted = [];
  const timers = [];
  const sandbox = {
    console: { debug() {}, log() {}, error() {} },
    // Its OWN JSON facade, not the host's. The scriptlet replaces JSON.parse,
    // and a shared object would stack a wrapper per sandbox and leave Node's own
    // JSON patched after the run.
    JSON: { parse: JSON.parse.bind(JSON), stringify: JSON.stringify.bind(JSON) },
    Object,
    Array,
    Number,
    Set,
    // Timers are collected rather than run: the count flush is on a 1s timer and
    // a test that waited for it would be a slow test proving nothing extra.
    setTimeout: (fn) => {
      timers.push(fn);
      return timers.length;
    },
  };
  sandbox.window = sandbox;
  sandbox.window.location = { origin: "https://www.facebook.com" };
  sandbox.window.postMessage = (msg) => posted.push(msg);
  sandbox.window.addEventListener = () => {};

  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);

  return {
    sandbox,
    posted,
    flush: () => timers.splice(0).forEach((fn) => fn()),
    // The scriptlet only inspects strings, so every test goes in as one — the
    // same way Facebook's own code calls it.
    parse: (obj) => sandbox.JSON.parse(JSON.stringify(obj)),
    stats: () => sandbox.window.__sieveFacebookAdFilter.stats,
  };
}

// A feed page shaped like the real thing: two friends' posts around one ad, each
// edge carrying the cursor that drives infinite scroll.
function feed() {
  return {
    data: {
      viewer: {
        news_feed: {
          edges: [
            {
              cursor: "AQHR1",
              node: { __typename: "Story", id: "1", message: { text: "hello from a friend" } },
            },
            {
              cursor: "AQHR2",
              node: {
                __typename: "Story",
                id: "2",
                story: {
                  sponsored_data: { ad_id: "1203", brs_filter_setting: null },
                  message: { text: "buy this thing" },
                },
              },
            },
            {
              cursor: "AQHR3",
              // The false positive this design most has to avoid: an ORGANIC
              // story that still carries the key, with no ad id in it.
              node: { __typename: "Story", id: "3", story: { sponsored_data: { ad_id: null } } },
            },
          ],
          page_info: { end_cursor: "AQHR3", has_next_page: true },
        },
      },
    },
  };
}

test("a sponsored feed node is removed", () => {
  const { parse } = runScriptlet();
  const out = parse(feed());
  const edges = out.data.viewer.news_feed.edges;
  assert.equal("node" in edges[1], false, "the ad's node should be gone");
});

test("the ad's edge and cursor survive, so infinite scroll still works", () => {
  const { parse } = runScriptlet();
  const out = parse(feed());
  const edges = out.data.viewer.news_feed.edges;
  assert.equal(edges.length, 3, "edges must not be spliced — the cursors go with them");
  assert.equal(edges[1].cursor, "AQHR2");
  assert.deepEqual(out.data.viewer.news_feed.page_info, {
    end_cursor: "AQHR3",
    has_next_page: true,
  });
});

test("real posts either side of an ad are untouched", () => {
  const { parse } = runScriptlet();
  const out = parse(feed());
  const edges = out.data.viewer.news_feed.edges;
  assert.equal(edges[0].node.message.text, "hello from a friend");
  assert.equal(edges[0].node.id, "1");
});

test("an organic story with sponsored_data but no ad_id is NOT removed", () => {
  // The most dangerous false positive available to this design: Facebook puts
  // the key on ordinary stories with a null id inside. Matching the key rather
  // than the id would empty a feed.
  const { parse } = runScriptlet();
  const out = parse(feed());
  assert.ok(out.data.viewer.news_feed.edges[2].node, "organic node must survive");
  assert.equal(out.data.viewer.news_feed.edges[2].node.id, "3");
});

test("sponsored_data nested under node.story is found", () => {
  const { parse } = runScriptlet();
  const out = parse({
    data: {
      node: {
        edges: [
          { cursor: "c1", node: { story: { sponsored_data: { ad_id: "77" } } } },
          { cursor: "c2", node: { story: { sponsored_data: { ad_id: null } } } },
        ],
      },
    },
  });
  const edges = out.data.node.edges;
  assert.equal("node" in edges[0], false);
  assert.ok(edges[1].node, "the organic sibling must survive");
});

test("an ad id sitting DIRECTLY on the node is deliberately left alone", () => {
  // The regression guard for a shipped bug, and the one assertion here that
  // looks backwards. `node.sponsored_data.ad_id` — no `story` in the path — is
  // attached to something the feed needs, and deleting that node makes Facebook
  // refetch the feed without stopping. uBlock ships the identical filter
  // DISABLED, directly under a bug report titled "facebook loading slow"; the
  // `.story.` variant next to it is the one they left on.
  //
  // Anything missed here is caught on the page by content/facebook-ads-dom.js.
  const { parse } = runScriptlet();
  const out = parse({
    data: {
      viewer: {
        news_feed: {
          edges: [
            {
              cursor: "d1",
              node: { __typename: "Story", id: "d1", sponsored_data: { ad_id: "555" } },
            },
          ],
        },
      },
    },
  });
  assert.ok(
    out.data.viewer.news_feed.edges[0].node,
    "pruning this shape is what made the feed reload without stopping"
  );
});

test("the deep relay_rendering_strategy path is found", () => {
  const { parse } = runScriptlet();
  const out = parse({
    data: {
      serpResponse: {
        results: {
          edges: [
            {
              cursor: "s1",
              node: {
                relay_rendering_strategy: {
                  view_model: { story: { sponsored_data: { ad_id: "9" } } },
                },
              },
            },
          ],
        },
      },
    },
  });
  assert.equal("node" in out.data.serpResponse.results.edges[0], false);
});

test("Marketplace ad stories and search ads are removed by typename and role", () => {
  const { parse } = runScriptlet();
  const out = parse({
    data: {
      a: { edges: [{ cursor: "m", node: { __typename: "MarketplaceFeedAdStory", id: "m1" } }] },
      b: { edges: [{ cursor: "s", node: { role: "SEARCH_ADS", id: "s1" } }] },
      c: { edges: [{ cursor: "k", node: { __typename: "MarketplaceFeedStory", id: "k1" } }] },
    },
  });
  assert.equal("node" in out.data.a.edges[0], false, "MarketplaceFeedAdStory is an ad");
  assert.equal("node" in out.data.b.edges[0], false, "SEARCH_ADS is an ad");
  assert.ok(out.data.c.edges[0].node, "an ordinary Marketplace story is not");
});

test("in-stream video ads are removed, and the scrubber is left alone", () => {
  // The scrubber drives the seek bar. uBlock prunes it alongside the ads; we do
  // not, because a video you cannot seek is worse than an ad.
  const { parse } = runScriptlet();
  const out = parse({
    data: {
      viewer: {
        instream_video_ads: { edges: [{ node: { ad_id: "1" } }] },
        video: { id: "v1" },
      },
      scrubber: { thumbnails: [1, 2, 3] },
    },
  });
  assert.equal("instream_video_ads" in out.data.viewer, false);
  assert.deepEqual(out.data.scrubber, { thumbnails: [1, 2, 3] });
  assert.deepEqual(out.data.viewer.video, { id: "v1" });
});

test("a container of many stories is never taken down by one ad inside it", () => {
  // The guard that stops a screenful of real posts vanishing. It comes free from
  // naming exact paths: an ad nested somewhere below the outer node is not on
  // the outer node's own `story`, so only the inner one goes.
  const { parse } = runScriptlet();
  const out = parse({
    data: {
      edges: [
        {
          cursor: "outer",
          node: {
            __typename: "FeedUnit",
            id: "outer",
            edges: [{ cursor: "inner", node: { story: { sponsored_data: { ad_id: "42" } } } }],
          },
        },
      ],
    },
  });
  const outer = out.data.edges[0].node;
  assert.ok(outer, "the container must survive");
  assert.equal("node" in outer.edges[0], false, "only the inner ad goes");
});

test("payloads with no ad marker are handed back unwalked", () => {
  const h = runScriptlet();
  const before = h.stats().parsesSeen;
  const plain = { data: { viewer: { news_feed: { edges: [{ cursor: "x", node: { id: "1" } }] } } } };
  const out = h.parse(plain);
  assert.deepEqual(out, plain);
  assert.equal(h.stats().parsesSeen, before, "no marker means no walk at all");
});

test("strings too short to hold an ad are passed straight through", () => {
  const h = runScriptlet();
  assert.equal(h.sandbox.JSON.parse('"sponsored_data"').length, 14);
  assert.equal(h.stats().parsesSeen, 0, "under the size floor, nothing is walked");
});

test("a single deferred chunk holding one ad edge is still caught", () => {
  // Facebook streams GraphQL as newline-delimited JSON and parses it a line at a
  // time, so one ad edge can arrive as a very short string of its own. A size
  // floor set at "roughly what a feed page looks like" would wave this through.
  const h = runScriptlet();
  const out = h.parse({ cursor: "c", node: { story: { sponsored_data: { ad_id: "1" } } } });
  assert.equal("node" in out, false);
  assert.equal(out.cursor, "c");
});

test("a malformed payload still parses — the hook never breaks the parse", () => {
  const h = runScriptlet();
  assert.throws(() => h.sandbox.JSON.parse("{not json"), SyntaxError);
});

test("the removal count is reported once, batched, as a bare integer", () => {
  const h = runScriptlet();
  h.parse(feed());
  assert.deepEqual(h.posted, [], "nothing is posted before the timer fires");
  h.flush();
  assert.equal(h.posted.length, 1);
  // Spread first: the message was built inside the vm realm, so it does not
  // share this realm's Object.prototype and a strict deep-equal on it would fail
  // for a reason that has nothing to do with the message.
  assert.deepEqual({ ...h.posted[0] }, {
    __sieveFacebookAds: true,
    dir: "to-bridge",
    kind: "ads",
    count: 1,
  });
});

test("a second injection into the same page does not stack the hook", () => {
  const h = runScriptlet();
  const first = h.sandbox.JSON.parse;
  vm.runInContext(SOURCE, h.sandbox);
  assert.equal(h.sandbox.JSON.parse, first, "the guard must return before patching again");
});

// common/host-index.js
// Sieve — the stored form of a subscribed list's sites, and the lookup over it.
// Ported from BlockNSFW's shared/ruleset.js (packHosts / createHostIndex).
//
// A subscribed list is overwhelmingly bare sites, and can run to tens of
// thousands of them. Compiled as rules, each would be another entry walked for
// every search result; held as a Set, it would be rebuilt from storage on every
// results page. Instead a list's sites are kept as ONE sorted, newline-joined
// string: a single value to read back, an index of line offsets built with
// indexOf, and a binary search per lookup.
//
// Loaded by the service worker (which packs) and by the search-filter content
// script (which looks up), so both are guaranteed the same sort order: the
// default sort compares UTF-16 code units, which is the order compareLineTo
// walks, and the two must agree or lookups miss.
//
// Kept small on purpose. The search filter's scripts are injected into every
// page and return at once on anything that is not a results page, so whatever
// is in this file is parsed everywhere.

(function (root) {
  "use strict";

  if (root.SieveHostIndex) return;

  /** Sorted, deduplicated, newline-joined: the stored form of a site list. */
  function packHosts(hosts) {
    const unique = Array.from(new Set(hosts || []));
    unique.sort();
    return unique.join("\n");
  }

  function compareLineTo(text, start, end, host) {
    const length = end - start;
    const shorter = length < host.length ? length : host.length;
    for (let i = 0; i < shorter; i++) {
      const difference = text.charCodeAt(start + i) - host.charCodeAt(i);
      if (difference !== 0) return difference;
    }
    return length - host.length;
  }

  /**
   * @param {string} packed  output of packHosts
   * @returns {{size: number, has: function(string): boolean, find: function(string): string}}
   */
  function createHostIndex(packed) {
    const text = typeof packed === "string" ? packed : "";
    let count = 0;
    let at;
    if (text) {
      count = 1;
      for (at = text.indexOf("\n"); at !== -1; at = text.indexOf("\n", at + 1)) count++;
    }
    // starts[i] is where line i begins; starts[count] is one past the end, so
    // line i always ends at starts[i + 1] - 1.
    const starts = new Uint32Array(count + 1);
    if (text) {
      let line = 1;
      for (at = text.indexOf("\n"); at !== -1; at = text.indexOf("\n", at + 1)) starts[line++] = at + 1;
    }
    starts[count] = text.length + 1;

    function has(host) {
      if (!count || !host) return false;
      let low = 0;
      let high = count - 1;
      while (low <= high) {
        const middle = (low + high) >>> 1;
        const order = compareLineTo(text, starts[middle], starts[middle + 1] - 1, host);
        if (order === 0) return true;
        if (order < 0) low = middle + 1;
        else high = middle - 1;
      }
      return false;
    }

    // The listed site that covers this host, or "": the host itself, or the
    // nearest parent. A list entry covers its subdomains, as every site rule in
    // Sieve does, so news.example.com is caught by an entry for example.com.
    function find(host) {
      let name = String(host || "").toLowerCase();
      while (name) {
        if (has(name)) return name;
        const dot = name.indexOf(".");
        if (dot === -1) return "";
        name = name.slice(dot + 1);
      }
      return "";
    }

    return { size: count, has, find };
  }

  const exported = { packHosts, createHostIndex };
  root.SieveHostIndex = exported;
  if (typeof module !== "undefined" && module.exports) module.exports = exported;
})(typeof self !== "undefined" ? self : this);

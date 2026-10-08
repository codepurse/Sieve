// common/claim-ledger.js
// Sieve — the Claim Ledger: what a page claimed last time, so Sieve can tell
// when it lied.
//
// Fake urgency only works because nobody can check it. A countdown that starts
// again when you reload, an "only 3 left" that has said 3 all week, a sale that
// "ends today" every day: each one is a claim about the future, and the future
// arrives. So Sieve writes the claim down and compares it the next time the
// page makes it. That is evidence, not a guess, which is why a verdict from
// here can be trusted further up the intervention ladder than anything a word
// list decides on its own.
//
// It works in both directions. A countdown that gives the same end time on
// every visit is behaving like a real one, and the verdict says so — the
// detector then stops hiding it.
//
// PURE: no storage, no DOM, no chrome.*. The service worker (background/
// tells.js) holds the ledger object and persists it; the tests drive the same
// rules directly. Loaded as a plain script, like common/keyword-pattern.js:
// importing it for its side effect puts SieveClaimLedger on `self`.
//
// WHAT IS STORED, and what is not. An entry is keyed by a hash of the site,
// the page's path and the claim's wording with its numbers taken out — never
// the address itself — and holds numbers and times: the deadline a countdown
// gave, the stock count, a "people viewing" count, the days an "ends today"
// banner was seen. Entries
// expire after 30 days and the whole ledger is capped, oldest out first.

(() => {
  "use strict";

  const root = typeof self !== "undefined" ? self : globalThis;
  if (root.SieveClaimLedger) return;

  const MINUTE_MS = 60 * 1000;
  const HOUR_MS = 60 * MINUTE_MS;
  const DAY_MS = 24 * HOUR_MS;

  const MAX_AGE_MS = 30 * DAY_MS;
  const MAX_ENTRIES = 800;

  // The wording a detector sends is a normalised sentence, not page content in
  // bulk. Anything longer than this is not a claim and is refused.
  const MAX_SIG_LENGTH = 160;

  // ---------------------------------------------------------------------------
  // Keys
  // ---------------------------------------------------------------------------

  // Two 32-bit FNV-1a passes with different primes, as 16 hex characters. Not
  // cryptographic, and it does not need to be: it exists so the ledger holds no
  // readable address, and two claims colliding costs one wrong comparison.
  function hash(str) {
    let a = 0x811c9dc5;
    let b = 0x9747b28c;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193);
      b = Math.imul(b ^ c, 0x5bd1e995);
    }
    return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
  }

  // The calendar day in the browser's own time zone, as "YYYY-MM-DD". "Ends
  // today" means the user's today.
  function dayKey(ts) {
    const d = new Date(ts);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  // Whole days between two day keys, b - a.
  function dayGap(a, b) {
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
  }

  // ---------------------------------------------------------------------------
  // Countdowns
  //
  // A countdown is a promise about one moment: "this ends at 3:42". Turn the
  // time it shows into that moment and keep it. On the next visit:
  //
  //   - the old moment has not come yet, and the countdown now names a LATER
  //     one: it restarted. That is the fake, and nothing innocent does it.
  //   - it names the same moment, within a tolerance for clocks and rounding:
  //     it is behaving like a real countdown.
  //   - the old moment has passed: a new sale, or tomorrow's delivery cut-off.
  //     Nothing can be concluded, so start watching again.
  //
  // Once a countdown has been caught restarting it stays caught for as long as
  // the ledger remembers it — the next load showing a fresh fifteen minutes is
  // the same trick again, not new evidence of innocence.
  // ---------------------------------------------------------------------------

  function observeTimer(ledger, key, deadline, now) {
    const prev = ledger[key];
    if (!prev) {
      ledger[key] = { k: "t", f: now, l: now, n: 1, d: deadline, r: 0 };
      return { status: "new" };
    }

    const tolerance = Math.max(90 * 1000, (deadline - now) * 0.02);
    prev.l = now;
    prev.n += 1;

    if (prev.d > now && deadline > prev.d + tolerance) {
      const promised = prev.d;
      prev.r += 1;
      prev.p = promised; // the end time it gave before it restarted
      prev.d = deadline;
      return { status: "restarted", promised, deadline, since: prev.f, restarts: prev.r };
    }

    if (prev.r > 0) {
      const promised = prev.p || prev.d;
      prev.d = deadline;
      return { status: "restarted", promised, deadline, since: prev.f, restarts: prev.r };
    }

    if (Math.abs(deadline - prev.d) <= tolerance) {
      return { status: "consistent", deadline: prev.d, since: prev.f, sightings: prev.n };
    }

    // The old deadline passed, or this one is EARLIER than the last: either way
    // it is not the countdown we were watching. Start over.
    ledger[key] = { k: "t", f: now, l: now, n: 1, d: deadline, r: 0 };
    return { status: "new" };
  }

  // ---------------------------------------------------------------------------
  // Stock counts
  //
  // "Only 3 left" is not proven false by staying at 3 — a slow-selling item can
  // sit at 3 for a week. What staying put DOES disprove is the pressure: if it
  // has been 3 since Monday, there is no rush. That is what the verdict says,
  // and it is why "unchanged" never climbs past medium confidence.
  //
  // What real stock does not do is go UP within the hour, back and forth,
  // which is what a number made up on each page load does. One jump is
  // suspicious; two is the pattern.
  //
  // And a real shop does not have exactly 3 left of everything. The second
  // entry, keyed on the site rather than the page, counts how many different
  // products have shown the same sentence with the same number. "Only 1 left"
  // is exempt: a shop of one-off items genuinely has one of each.
  // ---------------------------------------------------------------------------

  const JUMP_WINDOW_MS = HOUR_MS;
  const MAX_PRODUCTS = 8;

  // A page caught jumping keeps that on its record, whatever it shows next.
  function jumpRecord(entry) {
    return { status: "jumped", from: entry.jf, to: entry.jt, minutes: entry.jm, jumps: entry.j };
  }

  function observeStock(ledger, pageKey, siteKey, pathTag, value, now) {
    const today = dayKey(now);
    let page;
    const prev = ledger[pageKey];

    if (!prev) {
      ledger[pageKey] = { k: "s", f: now, l: now, n: 1, v: value, j: 0, days: [today] };
      page = { status: "new" };
    } else if (value === prev.v) {
      prev.n += 1;
      prev.l = now;
      if (!prev.days.includes(today)) prev.days = prev.days.concat(today).slice(-6);
      page =
        prev.j > 0
          ? jumpRecord(prev)
          : { status: "unchanged", since: prev.f, sightings: prev.n, days: prev.days.length };
    } else if (value > prev.v && now - prev.l <= JUMP_WINDOW_MS) {
      const from = prev.v;
      const minutes = Math.max(1, Math.round((now - prev.l) / MINUTE_MS));
      prev.j += 1;
      prev.jf = from;
      prev.jt = value;
      prev.jm = minutes;
      prev.v = value;
      prev.n = 1;
      prev.l = now;
      page = { status: "jumped", from, to: value, minutes, jumps: prev.j };
    } else {
      // Down (a sale), or up after a long gap (a restock). Both are what real
      // stock does, so the count starts again — unless the page is already on
      // record for jumping.
      const dropped = value < prev.v;
      prev.v = value;
      prev.n = 1;
      prev.f = now;
      prev.l = now;
      prev.days = [today];
      page = prev.j > 0 ? jumpRecord(prev) : { status: dropped ? "dropped" : "new" };
    }

    let products = 0;
    if (value >= 2) {
      const site = ledger[siteKey];
      if (!site || site.v !== value) {
        ledger[siteKey] = { k: "S", f: now, l: now, v: value, p: [pathTag] };
        products = 1;
      } else {
        site.l = now;
        if (!site.p.includes(pathTag) && site.p.length < MAX_PRODUCTS) site.p.push(pathTag);
        products = site.p.length;
      }
    }

    // The strongest evidence wins. A jump outranks everything: it is the one
    // thing real stock cannot do.
    if (page.status === "jumped") return { ...page, value };
    if (products >= 3) return { status: "everywhere", value, products };
    return { ...page, value };
  }

  // ---------------------------------------------------------------------------
  // "Ends today"
  //
  // Keyed on the site, not the page: a sale banner is shop-wide. The claim is
  // caught when it is seen on two different days no more than three apart —
  // "ends tonight" on Saturday and again on Sunday. A shop that runs a genuine
  // one-day sale every Saturday is seen a week apart, and is not caught.
  // ---------------------------------------------------------------------------

  const REPEAT_WINDOW_DAYS = 3;

  function observeDeadline(ledger, key, now) {
    const today = dayKey(now);
    const prev = ledger[key];
    if (!prev) {
      ledger[key] = { k: "d", f: now, l: now, days: [today] };
      return { status: "new" };
    }
    prev.l = now;
    if (!prev.days.includes(today)) prev.days = prev.days.concat(today).slice(-6);

    let earlier = null;
    for (const day of prev.days) {
      const gap = dayGap(day, today);
      if (gap >= 1 && gap <= REPEAT_WINDOW_DAYS && (!earlier || day > earlier)) earlier = day;
    }
    if (earlier) prev.rp = earlier;
    if (prev.rp) return { status: "repeated", earlier: prev.rp, days: prev.days.length };
    return { status: "new" };
  }

  // ---------------------------------------------------------------------------
  // "23 people are viewing this"
  //
  // A live count of who is looking moves: people arrive and leave by the
  // minute. So the same number on visits at least ten minutes apart is a
  // number nobody is counting, and the verdict says so. A number that changes
  // proves nothing either way — a made-up one changes too — so it stays
  // unverified rather than being called genuine.
  // ---------------------------------------------------------------------------

  const FROZEN_AFTER_MS = 10 * MINUTE_MS;

  function observeViewers(ledger, key, value, now) {
    const prev = ledger[key];
    if (!prev) {
      ledger[key] = { k: "v", f: now, l: now, v: value, s: 1, sf: now };
      return { status: "new" };
    }
    prev.l = now;
    if (value !== prev.v) {
      prev.v = value;
      prev.s = 1;
      prev.sf = now;
      return { status: "varies" };
    }
    prev.s += 1;
    if (now - prev.sf >= FROZEN_AFTER_MS) {
      return { status: "frozen", value, sightings: prev.s, since: prev.sf, span: now - prev.sf };
    }
    return { status: "new" };
  }

  // ---------------------------------------------------------------------------
  // The one entry point
  // ---------------------------------------------------------------------------

  const KINDS = new Set(["timer", "stock", "deadline", "viewers"]);

  /**
   * Record one claim and judge it against what the ledger already holds.
   *
   * @param {object} ledger  the ledger object; MUTATED in place
   * @param {object} claim   { kind, sig, value?, deadline? } from a detector
   * @param {object} page    { host, path } — from the sender, never the page
   * @param {number} now     ms since the epoch
   * @returns {object|null}  a verdict, or null for a claim that is malformed
   */
  function observe(ledger, claim, page, now) {
    if (!ledger || typeof ledger !== "object") return null;
    if (!claim || !KINDS.has(claim.kind)) return null;
    if (typeof claim.sig !== "string" || !claim.sig || claim.sig.length > MAX_SIG_LENGTH) return null;
    if (!page || typeof page.host !== "string" || !page.host) return null;

    const host = page.host.toLowerCase().replace(/^www\./, "");
    const path = typeof page.path === "string" && page.path ? page.path : "/";

    if (claim.kind === "timer") {
      const deadline = claim.deadline;
      if (!Number.isFinite(deadline) || deadline <= now || deadline - now > MAX_AGE_MS) return null;
      return observeTimer(ledger, hash(`t|${host}|${path}|${claim.sig}`), deadline, now);
    }

    if (claim.kind === "stock") {
      const value = claim.value;
      if (!Number.isInteger(value) || value < 0 || value > 100000) return null;
      return observeStock(
        ledger,
        hash(`s|${host}|${path}|${claim.sig}`),
        hash(`S|${host}|${claim.sig}`),
        hash(path).slice(0, 8),
        value,
        now
      );
    }

    if (claim.kind === "viewers") {
      const value = claim.value;
      if (!Number.isInteger(value) || value < 0 || value > 100000) return null;
      return observeViewers(ledger, hash(`v|${host}|${path}|${claim.sig}`), value, now);
    }

    return observeDeadline(ledger, hash(`d|${host}|${claim.sig}`), now);
  }

  // Drop anything older than 30 days, then the oldest entries until the ledger
  // is back under its cap. Returns how many were removed.
  function prune(ledger, now) {
    let removed = 0;
    for (const key of Object.keys(ledger)) {
      const entry = ledger[key];
      if (!entry || typeof entry !== "object" || !(now - entry.l <= MAX_AGE_MS)) {
        delete ledger[key];
        removed++;
      }
    }
    const keys = Object.keys(ledger);
    if (keys.length > MAX_ENTRIES) {
      keys.sort((a, b) => ledger[a].l - ledger[b].l);
      for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
        delete ledger[key];
        removed++;
      }
    }
    return removed;
  }

  root.SieveClaimLedger = { observe, prune, hash, dayKey, MAX_ENTRIES, MAX_AGE_MS };
})();

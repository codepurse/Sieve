// content/facebook-ads-dom.js
// Sieve — Facebook feed-ad remover, DOM half. Runs in the ISOLATED world at
// document_start, registered dynamically by background/facebook-ads.js only
// while the toggle is on.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN content/facebook-ads.js ALREADY REMOVES THE ADS
//
// The payload half deletes ad nodes before Facebook renders them, which is the
// better fix: no element is created, so no gap is left. This is the backstop for
// the cases that route around it —
//
//   • a payload parsed by something other than JSON.parse,
//   • a field rename: the payload half matches `sponsored_data.ad_id` and
//     Facebook can call it something else tomorrow,
//   • ad surfaces that are not feed edges at all (the right-hand column).
//
// The two layers fail in opposite directions, which is the point of having both:
// the payload pass is precise and might miss, this one is blunt and slower but
// looks at what is actually on screen.
//
// ---------------------------------------------------------------------------
// HOW YOU TELL A SPONSORED POST FROM A REAL ONE
//
// By the word "Sponsored" under the advertiser's name — and Facebook knows that,
// so it goes to considerable lengths to make that word unreadable to a script
// while leaving it readable to a person. The techniques, all of which have been
// seen in the wild:
//
//   • the word is split into single-letter <span>s,
//   • decoy letters are mixed in and hidden with display:none, visibility,
//     opacity:0, a font-size of 0, or by being positioned off-screen,
//   • the letters are put in a flex container and reordered with CSS `order`, so
//     the DOM order is not the reading order,
//   • some letters are not text at all but ::before/::after `content`.
//
// Reading textContent therefore gets you something like "SdpxoznsyoAred". The
// answer is to reconstruct what a PERSON sees: walk the label, ask the browser
// for each element's computed style, drop what is not visible, honour flex
// order, and fold in pseudo-element content. That is visibleLabelText() below,
// and it is the one detector here that does not care what Facebook renames next.
//
// It is also the most expensive, so it is the LAST thing tried, in a ladder:
//
//   1. attributes that mean "ad" outright — an /ads/about link, Facebook's own
//      data-ad-* markers, the right-hand-column link target,
//   2. the ACCESSIBLE NAME. Facebook scrambles the badge a person reads, but
//      the label it hands a screen reader has to stay a real word, so where one
//      exists `aria-label` answers the question for the cost of a string
//      compare. Nothing else here is both that cheap and that reliable.
//   3. innerText, which is already layout-aware — the browser has done the
//      display:none and visibility work for us. Enough for an unscrambled
//      badge; defeated by flex `order` and blind to pseudo-element content.
//   4. the reconstruction, for everything else.
//
// All four live in ONE function, adVerdict(), and that is load-bearing rather
// than tidy. The ladder used to exist twice — once in the sweep and once in the
// second opinion asked before releasing a collapse — and the two copies had
// drifted: the second was missing rung 2. So a unit collapsed by its accessible
// name was released by a function that could not see accessible names, and
// re-collapsed, and released, at a class change and a forced layout per turn.
// That was the feed that would not stop refreshing. Two detectors cannot
// disagree when there is only one of them.
//
// ---------------------------------------------------------------------------
// THE SHAPE OF A SWEEP
//
//   discover  one querySelectorAll per changed subtree, for anything that could
//             possibly sit inside an ad. Marks are cheap and generous.
//   resolve   each mark names the UNIT to collapse (unitFor). Deduped, so an ad
//             carrying six marks is one unit, judged once.
//   judge     adVerdict per undecided unit; the answer is cached per unit per
//             generation in a WeakMap. This is the only place that writes.
//   reconsider  units Facebook emptied and refilled — a real recycle — get their
//             verdict taken again. Nothing else reopens a decided unit.
//
// Reads and writes are in that order and not interleaved, because innerText and
// getComputedStyle flush layout and a class change invalidates it: alternating
// them forces a synchronous layout per element, and on a page whose own
// virtualiser is measuring the same elements, every forced layout is an
// invitation to re-render.
//
// ---------------------------------------------------------------------------
// WHY COLLAPSE RATHER THAN display:none
//
// The unit is given a class that sets height:0 and overflow:hidden (see
// content/facebook-ads.css). display:none is deliberately NOT used, following
// uBlock Origin's long-standing choice for this site: Facebook's feed is
// virtualised and measures its items, and taking them out of the layout tree
// entirely upsets that. Zero height leaves the node measurable and in flow.
//
// ---------------------------------------------------------------------------
// FALSE POSITIVES, AND HOW THEY HEAL
//
// Hiding a friend's post is worse than showing an ad, so every heuristic here is
// scoped as tightly as it can be, and a collapse is not permanent: Facebook
// recycles feed wrappers, so a wrapper that comes back holding real content gets
// a second opinion and is released if it is no longer an ad.
//
// That release valve is the most dangerous thing in the file, because it is half
// of a loop — the other half being Facebook's own feed virtualisation. What
// closes it is that the valve now opens on an EVENT rather than on a
// measurement: a wrapper is reconsidered when Facebook emptied it and put
// something back, not when its text got longer. See reconsider().

(() => {
  "use strict";

  if (window.__sieveFacebookAdSweeper) return;
  window.__sieveFacebookAdSweeper = true;

  // Must match content/facebook-ads.css. The stylesheet carries the declaration;
  // this file only ever adds and removes the class.
  const COLLAPSE_CLASS = "sieve-fb-ad-collapsed";

  const STATS_CATEGORY = "facebookAds";

  // ==========================================================================
  // Characters that must not decide a match
  //
  // Written as escapes rather than the literal characters they used to be: every
  // one of these is invisible in an editor, and a file whose correctness depends
  // on invisible characters is a file nobody can review.
  //
  //   U+0300-U+036F  Latin combining marks, what NFKD leaves behind (an accented
  //                  "sponsorise" normalises to an unaccented one)
  //   U+064B-U+0652  the Arabic vowel marks, U+0640 the tatweel
  //   U+00AD         soft hyphen
  //   U+200B-U+200F  ZERO WIDTH SPACE, ZWNJ, ZWJ, and the directional marks
  //   U+2060, U+FEFF word joiner and the zero-width no-break space
  //
  // U+200B IS NOT A THEORETICAL CASE. Read from a live sidebar on 2 September
  // 2026, the heading Facebook renders is:
  //
  //     "Sponsored" + \u200B
  //
  // — the word with a zero-width space welded to the end. Nothing on screen
  // looks different; a person reads "Sponsored". But the whole-label compare in
  // isSponsoredLabel() asked whether the string EQUALS "sponsored", and
  // "sponsored"+\u200B does not, so every detector in this file that rests on the
  // word list said no. The old list stripped U+200C and U+200D — the joiners
  // either side of it — and missed the one Facebook actually uses.
  //
  // Whole-label matching is what makes this fatal rather than cosmetic: one
  // invisible character on the end defeats an equality test completely, where a
  // substring test would have shrugged it off. The rest of the range is here for
  // the same reason: if one of them is the next thing Facebook appends, it costs
  // nothing to have already stripped it.
  // ==========================================================================
  const MARKS = /[\u0300-\u036F\u0640\u064B-\u0652\u00AD\u200B-\u200F\u2060\uFEFF]/g;

  function normaliseWord(s) {
    return String(s)
      .normalize("NFKD")
      .replace(MARKS, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  // ==========================================================================
  // The word, in the languages Facebook ships it in
  //
  // Compared after normalise(): lower-cased, diacritics stripped, whitespace
  // collapsed. Stripping diacritics is what lets one entry cover the spellings
  // that differ only by accent, and Arabic with and without its vowel marks.
  //
  // A missing language means ads are not caught by THIS detector on that
  // locale — the attribute signals still are — so adding to this list is always
  // safe. Matching is whole-label, never substring, so no entry here can catch a
  // post that merely mentions the word.
  // ==========================================================================
  const SPONSORED_WORDS = [
    // ------------------------------------------------------------------------
    // THE SHORT FORM. Facebook has moved the feed byline from "Sponsored" to
    // plain "Ad" — visible in a feed screenshot from 2 September 2026, where a
    // Spotify ad's byline under the advertiser name reads "Ad · 🌐". Without
    // this entry the entire word list below misses every ad on that layout.
    //
    // Two letters is as short as a matchable word gets, so it is worth being
    // explicit about why it is safe enough. isSponsoredLabel() compares the
    // WHOLE label — the segment before any "·" — never a substring, and only on
    // elements in LABEL_CANDIDATE_SELECTOR, which is the post header. So this
    // catches a byline that says "Ad" and cannot catch a post that says "ad"
    // anywhere in its text, a name containing those letters, or a caption.
    //
    // What it CAN catch wrongly is a page or person whose header byline is
    // exactly the word "Ad". That is rare enough to accept against missing every
    // ad on the feed, and if it ever bites, the fix is to require a second
    // signal for entries this short rather than to drop the entry.
    "ad",
    "sponsored",
    "sponsorisé",
    "commandité",
    "patrocinado",
    "publicidad",
    "gesponsert",
    "sponsorizzato",
    "gesponsord",
    "sponsrad",
    "sponsoreret",
    "sponset",
    "sponsoroitu",
    "sponsorowane",
    "sponzorováno",
    "sponzorované",
    "szponzorált",
    "hirdetés",
    "sponsorizat",
    "sponsorlu",
    "sponzorirano",
    "χορηγούμενη",
    "реклама",
    "спонсорирано",
    "спонзорисано",
    "ממומן",
    "إعلان ممول",
    "ممول",
    "حمایت‌شده",
    "प्रायोजित",
    "স্পনসর্ড",
    "ได้รับการสนับสนุน",
    "được tài trợ",
    "bersponsor",
    "ditaja",
    "may sponsor",
    "広告",
    "광고",
    "赞助内容",
    "贊助",
    "广告",
    "廣告",
  ].map(normaliseWord);

  // Longest word above, in characters, plus room for a " · something" suffix.
  // A label longer than this is prose, not a badge, and is not worth walking.
  const MAX_LABEL_TEXT = 48;

  // The label as Facebook writes it is often "Sponsored · Paid partnership" or
  // "Sponsored · " followed by an audience note, so compare the first segment.
  function isSponsoredLabel(text) {
    const norm = normaliseWord(text);
    if (!norm || norm.length > MAX_LABEL_TEXT) return false;
    const head = norm.split(/[·•∙|]/)[0].trim();
    for (let i = 0; i < SPONSORED_WORDS.length; i++) {
      if (head === SPONSORED_WORDS[i]) return true;
    }
    return false;
  }

  // Cheap pre-filter before the expensive reconstruction: whatever obfuscation is
  // in play, the letters are mostly still in textContent, because the decoys are
  // ADDED rather than substituted. So a candidate missing too many of some
  // sponsored word's characters cannot be made to spell it, however the styles
  // fall, and is not worth walking.
  //
  // "Mostly", not "all", and the slack is not sloppiness — it is the one way a
  // letter can be on screen and absent from textContent: delivered as
  // ::before / ::after content. A strict all-present test would throw away
  // exactly the labels the reconstruction exists to read, and it did: a label
  // whose S and d came from generated content failed this check and was never
  // looked at.
  //
  // The allowance is a QUARTER of the word's DISTINCT characters, capped at two.
  //
  // Proportional rather than flat because a flat allowance would wave through
  // every short candidate on a page in Japanese or Korean, where the whole badge
  // is two characters long. A quarter rather than a third because the difference
  // is what the filter is for: measured against ordinary feed bylines, a third
  // lets roughly half of them through to the reconstruction and a quarter lets
  // through almost none, while both still catch a label missing a letter or two.
  // Distinct characters, because the words repeat letters — "sponsored" survives
  // losing both its S and its d to generated content with only one distinct
  // character actually absent, since the s appears twice.
  const MAX_MISSING = 2;

  // ---------------------------------------------------------------------------
  // THE SHORT-WORD PROBLEM, and why a length bound comes with "ad"
  //
  // This filter asks "does the candidate contain enough of some word's letters
  // to possibly spell it?" — and for a two-letter word the answer is yes for
  // almost everything. Adding "ad" to the list made "Yesterday at 18:02" a
  // candidate, and a timestamp is what a feed is mostly made of: the filter that
  // exists to keep bylines out of the style walk would have been waving them
  // through by the hundred.
  //
  // So a short word only vouches for a SHORT candidate. The reasoning is about
  // the obfuscation rather than the word: decoy letters are added, not
  // substituted, and Facebook adds a few of them — a scrambled two-letter badge
  // is a handful of characters, never eighteen. Four times the word's length is
  // well past anything observed and still an order of magnitude tighter than the
  // timestamps.
  //
  // Only words of three characters or fewer are bounded, so every existing entry
  // behaves exactly as it did. And the bound costs nothing in coverage for the
  // ordinary case: an UNSCRAMBLED "Ad" byline never reaches here at all, because
  // adVerdict() reads innerText first and that path has no pre-filter.
  const SHORT_WORD = 3;
  const SHORT_WORD_HAY = 4; // multiple of the word's length

  function couldSpell(raw) {
    const hay = normaliseWord(raw);
    if (!hay) return false;
    for (let i = 0; i < SPONSORED_WORDS.length; i++) {
      const word = SPONSORED_WORDS[i];
      if (word.length <= SHORT_WORD && hay.length > word.length * SHORT_WORD_HAY) continue;
      const distinct = new Set(word.split("").filter((c) => c !== " "));
      const allowed = Math.min(MAX_MISSING, Math.floor(distinct.size / 4));
      let missing = 0;
      for (const ch of distinct) {
        if (hay.indexOf(ch) === -1 && ++missing > allowed) break;
      }
      if (missing <= allowed) return true;
    }
    return false;
  }

  // ==========================================================================
  // Reconstructing what a person actually sees
  // ==========================================================================

  // Elements visited per label. Real labels are a dozen nodes even fully
  // obfuscated; this stops a mis-chosen candidate turning into a subtree walk.
  const LABEL_NODE_BUDGET = 240;

  function isVisuallyHidden(cs) {
    if (!cs) return true;
    if (cs.display === "none") return true;
    if (cs.visibility === "hidden" || cs.visibility === "collapse") return true;
    if (parseFloat(cs.opacity) === 0) return true;
    const fontSize = parseFloat(cs.fontSize);
    if (Number.isFinite(fontSize) && fontSize < 3) return true;
    // The classic off-screen tricks.
    const indent = parseFloat(cs.textIndent);
    if (Number.isFinite(indent) && indent < -500) return true;
    if (cs.position === "absolute" && cs.width === "1px" && cs.height === "1px") return true;
    return false;
  }

  // A ::before / ::after whose content is a literal string. Anything computed
  // (counters, attr(), none, normal, an image) yields "" — this only wants the
  // case where a letter of the word is delivered as generated content.
  function pseudoText(el, pseudo, getStyle) {
    try {
      const raw = getStyle(el, pseudo).content;
      if (!raw || raw === "none" || raw === "normal") return "";
      const m = /^"((?:[^"\\]|\\.)*)"$|^'((?:[^'\\]|\\.)*)'$/.exec(raw.trim());
      if (!m) return "";
      return (m[1] !== undefined ? m[1] : m[2]).replace(/\\(.)/g, "$1");
    } catch {
      return "";
    }
  }

  // The reconstruction. Returns the text a person would read, in reading order.
  //
  // getStyle is injected so the tests can drive this without a browser engine;
  // in the page it is always window.getComputedStyle.
  function visibleLabelText(el, getStyle, budget) {
    if (!el || el.nodeType !== 1) return "";
    if (budget.left-- <= 0) return "";

    let cs;
    try {
      cs = getStyle(el);
    } catch {
      return "";
    }
    if (isVisuallyHidden(cs)) return "";

    // Children of a flex container are laid out by `order`, not DOM order, and
    // that is one of the ways the word gets scrambled. Sorting is stable, so
    // equal orders keep their DOM sequence — which is what text nodes need,
    // since an anonymous flex item cannot carry an order of its own.
    const flex = cs.display === "flex" || cs.display === "inline-flex";

    const kids = [];
    const childNodes = el.childNodes || [];
    for (let i = 0; i < childNodes.length; i++) {
      const child = childNodes[i];
      if (child.nodeType === 3) {
        kids.push({ order: 0, i, node: child, text: true });
      } else if (child.nodeType === 1) {
        let order = 0;
        if (flex) {
          try {
            order = parseInt(getStyle(child).order, 10) || 0;
          } catch {
            order = 0;
          }
        }
        kids.push({ order, i, node: child, text: false });
      }
    }
    if (flex) kids.sort((a, b) => a.order - b.order || a.i - b.i);

    let out = pseudoText(el, "::before", getStyle);
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      out += k.text ? k.node.data || "" : visibleLabelText(k.node, getStyle, budget);
    }
    return out + pseudoText(el, "::after", getStyle);
  }

  // ==========================================================================
  // Finding the thing to collapse
  // ==========================================================================

  // The wrappers a single story lives in, across the surfaces Facebook renders
  // one on. `div[aria-posinset]` is the virtualised home-feed story;
  // `div[role="article"]` covers search, groups and permalinks.
  const UNIT_SELECTOR =
    'div[aria-posinset], div[aria-describedby], div[role="article"], div[data-pagelet^="FeedUnit"]';

  // Containers whose DIRECT CHILDREN are individual stories. Being a child of
  // one of these is itself proof of "this element is one story", which is what
  // lets the walk take an element that matched no selector at all.
  const STORY_LIST = '[role="feed"], #watch_feed, [data-pagelet="MainFeed"]';

  // ==========================================================================
  // REGIONS — where the walk stops, and why the right-hand column used to be
  // invisible to it
  //
  // A region holds MANY independent things. The walk never selects one and never
  // climbs past one, so a wrong answer can never take more than one region's
  // worth of page down with it.
  //
  // `[role="complementary"]` is the modern right-hand column, and its ABSENCE
  // from this list is the whole reason sidebar ads survived. The walk had no
  // idea it had arrived anywhere: it climbed from the ad's "Why am I seeing
  // this ad?" link, matched no wrapper (the rail has no aria-posinset and no
  // role="article"), reached <body> and returned null. The signal was found on
  // every sweep and thrown away every time. See test/facebook-ads-dom-test.mjs,
  // "a right-hand-column ad is collapsed".
  //
  // #right_rail_container and [data-pagelet="RightRail"] are the older layouts,
  // still served to some sessions — they were previously in STORY_LIST, which
  // was worse than useless: it authorised taking a DIRECT CHILD of the rail,
  // and the rail's direct child is the whole column, contacts and birthdays
  // included. They are regions, not story lists.
  // ==========================================================================
  const CONTAINER = [
    '[role="feed"]',
    '[role="main"]',
    '[role="complementary"]',
    '[role="banner"]',
    '[role="navigation"]',
    '[role="dialog"]',
    "#watch_feed",
    "#right_rail_container",
    '[data-pagelet="RightRail"]',
    '[data-pagelet="MainFeed"]',
    '[data-pagelet="Stories"]',
  ].join(",");

  const MAX_WALK_UP = 30;

  // How far the walk may climb on a surface with NO recognised story wrapper —
  // the right-hand column, Marketplace, Reels. An ad card sits a handful of
  // levels above its own link; a Marketplace GRID sits a good deal further. The
  // cap is what keeps a surface this file has never seen from turning one signal
  // into a collapsed grid, and it is deliberately short: too low only means the
  // ad's outer frame survives as a thin band, which is a cosmetic bug.
  const MAX_UNANCHORED_UP = 8;

  // Signals that occur exactly ONCE per ad, so counting them counts ads. The
  // "Why am I seeing this ad?" link and the right-rail ad target are both
  // one-per-unit; data-ad-preview and attributionsrc are NOT (a single feed ad
  // carries several), which is why they are counted separately below.
  const AD_COUNT_SELECTOR = 'a[href*="/ads/about"], a[target^="rhcad"]';
  const ATTRIBUTION_SELECTOR = 'a[attributionsrc^="/privacy_sandbox/"]';

  // One feed ad can register two attribution sources (the creative and the call
  // to action). A row of four Marketplace tiles registers four. Three is the
  // line between them.
  const MAX_ATTRIBUTION_PER_UNIT = 2;

  const STORY_ROOT = 'div[aria-posinset], div[role="article"]';

  // Longest a heading may be and still count as part of the ad block rather than
  // as content of its own. "Sponsored" is nine characters; a real section of the
  // sidebar reads "Simplyme Malou and Analyn Raposas Taberna have birthdays…".
  const MAX_BLOCK_HEADING = 24;

  // Does this element hold nothing but ads and the heading over them?
  //
  // The shape it is written for, read from a live right-hand column on
  // 2 September 2026 — each level is one ancestor up from an ad's link:
  //
  //   lvl 4   div            1 ad     the ad card
  //   lvl 5   div (2 kids)   2 ads    the list of cards
  //   lvl 6   div (3 kids)   2 ads    "Sponsored" + the list        ← wanted
  //   lvl 7+  div (1 kid)    2 ads    padding wrappers
  //   …       div                     …and eventually Birthdays and Contacts
  //
  // Stopping at lvl 4 (which the plain "more than one ad" veto forces) collapses
  // both cards and leaves a bare "Sponsored" heading sitting in the sidebar with
  // nothing under it — which is what a user reasonably calls "the sponsored
  // section is still there". Climbing to lvl 6 removes the section.
  //
  // The test is per element child: it either contains an ad, or it is a short
  // piece of text, or it is empty. Birthdays fails it on both counts — no ad
  // link, and far too long to be a heading — which is what stops the climb
  // before it reaches the rest of the column.
  function holdsOnlyAds(el) {
    try {
      const kids = el.children;
      if (!kids || !kids.length) return false;
      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if (kid.querySelector(AD_COUNT_SELECTOR) || kid.matches(AD_COUNT_SELECTOR)) continue;
        const txt = (kid.textContent || "").trim();
        if (txt.length <= MAX_BLOCK_HEADING) continue; // a heading, or empty
        return false; // something that is neither an ad nor a label for one
      }
      return true;
    } catch {
      return false;
    }
  }

  // Is this element ONE ad and nothing else? The guard against the single worst
  // thing this file can do: pick an ancestor so high that collapsing it takes a
  // screenful of real content down with the ad.
  //
  // Every clause is a way of asking "does this hold something that is not part
  // of the ad?" — a second story, a second ad, or a whole region of the page.
  //
  // `anchored` says whether a story wrapper was positively identified on the way
  // up. It gates one clause, and the difference is the difference between
  // knowing what an element is and guessing.
  function isSelfContained(el, anchored) {
    try {
      // A region is never "an ad", and neither is anything containing one.
      if (el.matches(CONTAINER)) return false;
      if (el.querySelector(CONTAINER)) return false;

      // THE DIRECT-CHILD VETO, and it is the one that keeps the right-hand
      // column's contacts and birthdays on screen.
      //
      // On an unanchored surface the climb runs out of ancestors at the region
      // boundary, and the last thing it reaches is the region's own direct
      // child — which is not "the ad", it is EVERYTHING THE REGION HOLDS. In the
      // right-hand column that single element is the Sponsored section and the
      // contacts list and the group chats, and collapsing it empties the sidebar
      // to remove one ad.
      //
      // A story list is the exception it is worth naming: the direct child of a
      // [role="feed"] IS one story, which is the whole reason STORY_LIST is
      // separate from CONTAINER.
      if (!anchored) {
        const parent = el.parentElement;
        if (parent && parent.matches(CONTAINER) && !parent.matches(STORY_LIST)) return false;
      }

      // Two story roots means a list of stories.
      if (el.querySelectorAll(STORY_ROOT).length > 1) return false;
      // Two ad links means a LIST of ads — normally a reason to stop, because
      // whatever wraps two ads wraps something that is not this one ad. The
      // exception is a block that holds nothing BUT ads and their heading, which
      // is exactly the right-hand column's Sponsored section: taking the whole
      // block there is not overreach, it is the correct answer, and it is the
      // difference between removing the two ads and removing the section.
      if (el.querySelectorAll(AD_COUNT_SELECTOR).length > 1 && !holdsOnlyAds(el)) return false;
      if (el.querySelectorAll(ATTRIBUTION_SELECTOR).length > MAX_ATTRIBUTION_PER_UNIT) return false;
      return true;
    } catch {
      return false;
    }
  }

  // Walk up from a signal to the element worth collapsing.
  //
  // The OUTERMOST wrapper is preferred, because collapsing an inner one leaves
  // the outer one's padding behind as a visible gap — but never past a region
  // and never past isSelfContained(). Candidates are collected on the way up and
  // the outermost safe one wins.
  //
  // TWO MODES, and the distinction is what lets one function serve both the feed
  // and the sidebar without the sidebar's looser rule ever reaching the feed:
  //
  //   ANCHORED — something on the way up matched UNIT_SELECTOR, or was a direct
  //     child of a story list. Those matches are the only candidates. This is
  //     the feed, and it behaves exactly as it did before.
  //   UNANCHORED — nothing did, which is every surface Facebook renders without
  //     a story wrapper: the right-hand column, Marketplace, Reels. Here EVERY
  //     ancestor within MAX_UNANCHORED_UP is a candidate and isSelfContained()
  //     is the only thing standing between us and the whole column. Which is
  //     why that function is written to veto rather than to permit.
  function unitFor(el) {
    const anchors = [];
    const ancestors = [];
    let node = el;

    for (let i = 0; node && node !== document.body && i < MAX_WALK_UP; i++) {
      try {
        if (node.matches(CONTAINER)) break;
        if (node.matches(UNIT_SELECTOR)) anchors.push(node);
        if (ancestors.length < MAX_UNANCHORED_UP) ancestors.push(node);

        const parent = node.parentElement;
        if (!parent || parent === document.body) break;

        if (parent.matches(CONTAINER)) {
          // A direct child of a STORY LIST is the story wrapper, whether or not
          // it matched a selector. A child of any OTHER region is not — it is
          // that region's whole contents, and taking it is the mistake the
          // CONTAINER list exists to describe.
          if (parent.matches(STORY_LIST) && anchors[anchors.length - 1] !== node) {
            anchors.push(node);
          }
          break;
        }
        node = parent;
      } catch {
        break;
      }
    }

    const anchored = anchors.length > 0;
    const chain = anchored ? anchors : ancestors;
    for (let i = chain.length - 1; i >= 0; i--) {
      if (isSelfContained(chain[i], anchored)) return chain[i];
    }
    return null;
  }

  // ==========================================================================
  // The signals
  // ==========================================================================

  // Attributes that mean "ad" on their own, and are therefore allowed to collapse
  // a unit with no further evidence. Every one is Facebook's own naming: the
  // link to the "Why am I seeing this ad?" page, the right-hand-column ad link
  // target, Facebook's data-ad-* preview attributes, and a Privacy Sandbox
  // attribution source, which is registered for ad clicks and nothing else.
  //
  // The bar for entry here is high, because a wrong one hides real posts with no
  // second opinion asked. `[data-ad-rendering-role]` is the obvious next
  // candidate and is deliberately NOT here: it is used to LOOK for the label
  // below, where a false positive still has to survive reading the word.
  //
  // ---------------------------------------------------------------------------
  // WHAT WAS REMOVED FROM THIS LIST, AND WHY IT MATTERS MORE THAN WHAT IS IN IT
  //
  // `[data-ad-preview]` and `[data-ad-comet-preview]` were here, and they are a
  // FALSE POSITIVE. Read from a live feed on 2 September 2026:
  //
  //   [data-ad-preview="message"]  →  a post by "John Pavl Dahao", a real
  //                                   person, with a __cft__ profile link
  //
  // The whole `data-ad-*` family turns out to be Facebook's rendering vocabulary
  // rather than its ad vocabulary — the same feed carried
  // data-ad-rendering-role="profile_name" / "story_message" / "like_button" on
  // that same organic post. Collapse-on-sight on either attribute hides a
  // friend's post with nothing asked and nothing to appeal to, which is the
  // worst outcome this file can produce.
  //
  // uBlock Origin ships its equivalent filter — `div[role="feed"] >
  // div[class]:has([data-ad-preview])` — COMMENTED OUT, and this is why.
  //
  // ---------------------------------------------------------------------------
  // `rhcad2` IS NOW `rhcad` + A DIGIT
  //
  // Facebook increments that counter. The live sidebar on 2 September 2026 uses
  // `target="rhcad3"`, so the exact match here — and the matching rules in
  // content/facebook-ads.css, and uBlock's own filter list — selected nothing
  // at all. Prefix-matched now, so the next increment costs nobody a release.
  const SIGNAL_SELECTOR = [
    'a[href*="/ads/about"]',
    'a[attributionsrc^="/privacy_sandbox/"]',
    'a[target^="rhcad"]',
  ].join(",");

  // Where the Sponsored badge is rendered. Kept narrow on purpose — this is the
  // list that decides how much style-walking the sweep costs.
  //   • span[aria-labelledby] is where the letter-split version lives,
  //   • h3/h4 is the post header, which is where the badge sits on a normal ad,
  //   • [data-ad-rendering-role] is Facebook's own ad-header markup.
  const LABEL_CANDIDATE_SELECTOR =
    'span[aria-labelledby], h3 span, h4 span, [data-ad-rendering-role] span';

  // Where an ACCESSIBLE NAME saying "Sponsored" is worth reading. Facebook
  // scrambles the badge a person sees, but the name it hands a screen reader has
  // to stay a real word — so where one exists it answers the question for the
  // cost of a string compare.
  //
  // NARROWED FROM `[aria-label]`, which is what this used to scan. A Facebook
  // page carries a couple of thousand of those — every icon, every button, every
  // avatar — and each one was being NFKD-normalised and compared against the
  // forty-word list on every sweep. That was the single most expensive thing in
  // this file and it ran several times a second. The badge is only ever on a
  // link or a role="button", so ask for those.
  const ARIA_LABEL_SELECTOR = 'a[aria-label], [role="button"][aria-label]';

  // ==========================================================================
  // THE BYLINE, which is not where the name is
  //
  // The selectors above look INSIDE the post's h3/h4, and for a long time that
  // was where the badge lived. It is not where it lives now. Read from a live
  // feed on 2 September 2026, an ad by "Games Story" — the one rendering "Ad ·
  // 🌐" under the name on screen — has an h4 whose subtree is nine nested
  // elements and whose every single one reads:
  //
  //     textContent: "Games Story"
  //
  // The word "Ad" is not in there at all. The same query on an ORGANIC post by
  // INQUIRER.net returns "INQUIRER.net · Follow" — byline included. So Facebook
  // puts the sponsorship line BESIDE the name, as a sibling of the heading,
  // while an organic post's byline stays inside it.
  //
  // The old selector matched eleven elements inside that ad and all eleven were
  // the advertiser's name. Every detector downstream worked perfectly on text
  // that could never contain the answer — which is why adding "ad" to the word
  // list changed nothing, and why this is a selector bug and not a reader bug.
  //
  // So: walk out to the heading's siblings. Bounded hard, because "look at the
  // heading's neighbours" is one careless step away from "look at the whole
  // post" — the climb stops the moment a wrapper holds more than the heading,
  // and only short text is ever considered.
  // ==========================================================================

  // How far up from an h3/h4 to climb while the wrapper holds nothing but the
  // heading. Facebook wraps the name two or three deep; past that we are out of
  // the header and into the story.
  const BYLINE_CLIMB = 3;

  // A header has a handful of siblings. More than this and the structure is not
  // what this function was written for, so stop rather than guess.
  const MAX_BYLINE_CANDIDATES = 8;

  // ==========================================================================
  // AND THE SAME QUESTION ASKED WITHOUT ASSUMING ANY STRUCTURE
  //
  // The sibling walk above is precise, and precision is exactly its problem: it
  // only finds the byline if the byline really is a sibling of the heading, and
  // that is an inference about Facebook's markup rather than something measured.
  // Every previous version of this detector failed the same way — a selector
  // written to a structure that had already moved, and a test suite built from
  // the same assumption, agreeing with itself all the way to green.
  //
  // So this is the version that assumes nothing: the badge is SOMEWHERE in the
  // post, it is SHORT, and it is TEXT. Take the first few dozen spans in the
  // unit and read the short ones. The header is first in document order, so the
  // cap reaches it whatever the nesting looks like this week, and stops well
  // before the comments.
  //
  // It is not elegant. It is the detector that keeps working when Facebook moves
  // the badge again, and on this site that is worth more than elegance.
  // ==========================================================================

  // Spans examined per unit. The name alone is nine of them on a current ad, and
  // the header a few dozen; comments are far past this.
  const MAX_HEADER_SPANS = 60;

  // Short enough to be a badge and not a sentence. Tighter than MAX_LABEL_TEXT
  // because this pass is broad and the tightest bound that still fits
  // "Sponsored · Paid partnership" is the one to use.
  const MAX_BADGE_TEXT = 32;

  function headerCandidates(unit, out) {
    let spans;
    try {
      spans = unit.querySelectorAll("span");
    } catch {
      return;
    }
    const limit = Math.min(spans.length, MAX_HEADER_SPANS);
    for (let i = 0; i < limit; i++) {
      const el = spans[i];
      const raw = el.textContent || "";
      if (!raw || raw.length > MAX_BADGE_TEXT || !raw.trim()) continue;
      out.push(el);
    }
  }

  // The elements sitting beside the post's heading — the byline slot.
  //
  // `out` is the SHARED candidate list, which already holds everything the named
  // selectors matched — and on a real ad that is nine nested spans of the
  // advertiser's name, because Facebook wraps a heading that deep. So the budget
  // below counts what THIS function adds, never the length of the list. Measuring
  // the list instead spends the whole budget before the byline is reached and
  // silently adds nothing, which is exactly what it did.
  function bylineCandidates(unit, out) {
    let heads;
    try {
      heads = unit.querySelectorAll("h3, h4");
    } catch {
      return;
    }
    let added = 0;
    for (let i = 0; i < heads.length; i++) {
      if (added >= MAX_BYLINE_CANDIDATES) return;
      let node = heads[i];
      let col = node.parentElement;
      // Climb past wrappers that contain the heading and nothing else: those are
      // padding, and the byline is a sibling further out.
      for (let up = 0; col && up < BYLINE_CLIMB && col.childElementCount === 1; up++) {
        node = col;
        col = col.parentElement;
      }
      if (!col) continue;
      const kids = col.children;
      for (let k = 0; k < kids.length && added < MAX_BYLINE_CANDIDATES; k++) {
        const kid = kids[k];
        if (kid === node) continue; // the name itself
        const raw = kid.textContent || "";
        // A byline is short. Anything longer is the story, and looking at it is
        // both wasted work and the way this turns into a false positive.
        if (!raw.trim() || raw.length > MAX_LABEL_TEXT) continue;
        out.push(kid);
        added++;
      }
    }
  }

  // The `__cft__` heuristic, from uBlock's current facebook.com rules.
  //
  // Every story header link carries a `__cft__[0]=` tracking token. On a
  // sponsored post that token is dramatically longer than on an organic one,
  // because it encodes the ad's own attribution. It is a magic number and it is
  // the least principled thing in this file, which is why it is scoped hard: the
  // link has to be inside the post HEADER, must not be a group or section link,
  // and the unit is only collapsed if nothing else already decided.
  const CFT_MIN_TOKEN = 290;
  const CFT_SELECTOR = 'h3 span > a[href*="__cft__"], h4 span > a[href*="__cft__"]';
  const CFT_TOKEN = /__cft__(?:%5B|\[)0(?:%5D|\])=([-\w]+)/;

  function looksLikeAdLink(a) {
    let href;
    try {
      href = a.getAttribute("href") || "";
    } catch {
      return false;
    }
    if (!href || href.indexOf("/groups/") === 0) return false;
    if (href.indexOf("section_header_type") !== -1) return false;
    const m = CFT_TOKEN.exec(href);
    return !!m && m[1].length >= CFT_MIN_TOKEN;
  }

  // ==========================================================================
  // The sweep
  // ==========================================================================

  let hiddenSinceFlush = 0;

  // Readable from the page console as
  // window.__sieveFacebookAdDom.stats — the numbers that say which half of this
  // filter is misbehaving when something is wrong on a real feed, which is the
  // only place several of these failures show up.
  const stats = {
    sweeps: 0,
    fullSweeps: 0,
    verdicts: 0, // units actually judged — the cost of a sweep, in one number
    collapsed: 0,
    recycled: 0, // wrappers Facebook emptied and refilled, so re-judged
    released: 0,
    frozen: 0,
  };

  // ==========================================================================
  // THE OSCILLATION — what it was, and the shape of the fix
  //
  // This file shipped with a loop, and the loop was not subtle once you look for
  // it. There were TWO copies of the question "is this an ad?":
  //
  //   sweepRoot()  — four detectors: attribute signals, the ACCESSIBLE NAME, the
  //                  reconstructed badge, and the header-token heuristic.
  //   isAdUnit()   — three of them. The accessible name was missing.
  //
  // So a unit collapsed because a link said aria-label="Sponsored" was, on the
  // very next recheck, asked for a second opinion by a function that could not
  // see the thing that collapsed it. The answer came back "not an ad", the unit
  // was RELEASED, sweepRoot found the aria-label again, and collapsed it again.
  // Each turn is a class change, a height change from 0 to auto and back, a
  // forced layout, and a re-measure by Facebook's own feed virtualiser — which
  // re-renders, which mutates, which schedules the next sweep. That is the feed
  // that will not stop refreshing, and the flip budget below was the only thing
  // stopping it, three flips at a time, on every wrapper, forever.
  //
  // The fix is structural, not another guard: THERE IS NOW EXACTLY ONE VERDICT
  // FUNCTION, adVerdict(), and both paths call it. Two detectors cannot disagree
  // when there is only one of them. Anything added to adVerdict() is
  // automatically part of the second opinion too, which is the property the old
  // split could never have.
  //
  // The second half of the fix is WHEN a unit is re-judged. The old code polled
  // every collapsed element on every sweep and re-judged any whose textContent
  // LENGTH had moved — which a like count ticking over is enough to do. So the
  // expensive detectors ran, constantly, on units whose answer could not have
  // changed. Now a decided unit is re-judged on exactly one event: Facebook
  // emptied it and put something back, which is what recycling actually is. See
  // reconsider().
  // ==========================================================================

  // Per-unit decision, held OFF the element.
  //
  // A WeakMap rather than the expando properties this used to hang on the node:
  // nothing is added to Facebook's DOM, nothing survives the element being
  // collected, and the page cannot read our bookkeeping to find out it is being
  // filtered. It also means a recycled wrapper genuinely starts over, because
  // the entry is keyed on the element and Facebook made a new one.
  //
  //   verdict  — 1 ad (collapsed), 0 clear, undefined never judged
  //   gen      — the generation the verdict was reached in
  //   tries    — how many times a CLEAR verdict has been re-taken; see below
  //   empty    — the unit has been seen virtualised away since its last verdict
  //   pos      — the aria-posinset the verdict was reached at; see reconsider()
  //   flips    — collapse/release changes of state, the backstop budget
  const state = new WeakMap();

  function stateOf(unit) {
    let s = state.get(unit);
    if (!s) {
      s = { verdict: undefined, gen: -1, tries: 0, empty: false, pos: null, flips: 0 };
      state.set(unit, s);
    }
    return s;
  }

  // Facebook's own name for "which story is in this slot". When it changes under
  // a wrapper we already decided about, the wrapper is holding something else —
  // which is recycling, whether or not it passed through an empty placeholder on
  // the way. Free to read and unambiguous, which is more than the old
  // textContent-length heuristic could say for itself.
  function posOf(unit) {
    try {
      return unit.getAttribute("aria-posinset");
    } catch {
      return null;
    }
  }

  // The backstop for the loops nobody has thought of. With one verdict function
  // this should never be reached; `stats.frozen` climbing on a real feed means
  // something in adVerdict() is not deterministic and wants finding.
  const MAX_FLIPS = 4;

  // How many times a unit that judged CLEAR may be judged again. Facebook can
  // insert a story wrapper and fill its header in a moment later, so one look is
  // not always enough — but a post that has not grown a Sponsored badge in three
  // full sweeps is not going to, and asking forever is how the old code spent
  // its afternoons.
  const MAX_CLEAR_RETRIES = 3;

  function frozen(s) {
    return s.flips >= MAX_FLIPS;
  }

  function flip(s) {
    s.flips++;
    if (s.flips === MAX_FLIPS) stats.frozen++;
  }

  function collapse(unit, s) {
    if (unit.classList.contains(COLLAPSE_CLASS)) return;
    if (frozen(s)) return;
    unit.classList.add(COLLAPSE_CLASS);
    flip(s);
    stats.collapsed++;
    hiddenSinceFlush++;
  }

  function release(unit, s) {
    if (!unit.classList.contains(COLLAPSE_CLASS)) return;
    if (frozen(s)) return;
    unit.classList.remove(COLLAPSE_CLASS);
    flip(s);
    stats.released++;
  }

  // ==========================================================================
  // THE VERDICT — the only place this file decides that something is an ad
  //
  // Ordered cheapest-first, and every rung is allowed to answer outright:
  //
  //   1. attributes that mean "ad" — an /ads/about link, the right-rail target,
  //      Facebook's own data-ad-* markers, a Privacy Sandbox attribution source.
  //   2. the ACCESSIBLE NAME. Facebook scrambles the badge a person reads, but
  //      the label it hands a screen reader has to stay a real word.
  //   3. innerText, which is already layout-aware. Enough for an unscrambled
  //      badge; defeated by flex `order` and blind to pseudo-element content.
  //   4. the reconstruction, for everything else — and it is expensive, so it is
  //      last and it is behind couldSpell().
  //   5. the header-token heuristic, least trusted, path-scoped.
  //
  // Deterministic by construction: same DOM, same styles, same answer. That is
  // what makes it safe to use as its own second opinion.
  // ==========================================================================
  function adVerdict(unit) {
    stats.verdicts++;
    try {
      // 1. the free signals
      if (unit.querySelector(SIGNAL_SELECTOR)) return true;

      // 2. the accessible name
      const labelled = unit.querySelectorAll(ARIA_LABEL_SELECTOR);
      for (let i = 0; i < labelled.length; i++) {
        const value = labelled[i].getAttribute("aria-label") || "";
        if (value.length <= MAX_LABEL_TEXT && isSponsoredLabel(value)) return true;
      }

      // 3 and 4. the visible badge, cheaply and then the hard way.
      //
      // Two sources, and the second is the one that catches a modern feed ad:
      // the named selectors look inside the heading, and bylineCandidates()
      // looks beside it, which is where "Ad · 🌐" actually is. See the comment
      // over bylineCandidates for what that cost us.
      const candidates = Array.prototype.slice.call(
        unit.querySelectorAll(LABEL_CANDIDATE_SELECTOR)
      );
      bylineCandidates(unit, candidates);
      headerCandidates(unit, candidates);
      const getStyle = window.getComputedStyle.bind(window);
      for (let i = 0; i < candidates.length; i++) {
        const el = candidates[i];
        const raw = el.textContent || "";
        if (raw.length > MAX_LABEL_TEXT) continue;
        try {
          if (isSponsoredLabel(el.innerText || "")) return true;
        } catch {
          /* innerText can throw on a detached node — fall through */
        }
        if (!couldSpell(raw)) continue;
        if (isSponsoredLabel(visibleLabelText(el, getStyle, { left: LABEL_NODE_BUDGET }))) {
          return true;
        }
      }

      // 5. the header-token heuristic
      if (cftApplies()) {
        const links = unit.querySelectorAll(CFT_SELECTOR);
        for (let i = 0; i < links.length; i++) {
          if (looksLikeAdLink(links[i])) return true;
        }
      }
    } catch {
      // Unreadable, mid-teardown, detached. Say "no change": a unit already
      // collapsed stays collapsed, one not yet judged is looked at again next
      // sweep. Never guess in a direction that writes to the DOM.
      return unit.classList.contains(COLLAPSE_CLASS);
    }
    return false;
  }

  // Kept under its old name because it is the diagnostic people reach for from
  // the console, and because it reads better there than adVerdict.
  const isAdUnit = adVerdict;

  // ==========================================================================
  // Judging a unit — the one path from "this might be an ad" to a DOM write
  //
  // Idempotent by construction. A unit judged in this generation is not judged
  // again, whatever route asked; the answer is in the WeakMap. That is what makes
  // it safe for the same element to arrive from a dozen signals, from a full
  // sweep and from a subtree sweep in the same second.
  //
  // `force` is the one way past that, and there is exactly one caller that sets
  // it: discovery found a HARD ad signal — an /ads/about link, a sponsored
  // accessible name — inside a unit already written off as clear. A wrapper that
  // held somebody's post and now holds an ad is recycling in the direction
  // reconsider() cannot see, because reconsider() only ever looks at wrappers
  // that are already collapsed. Without this the ad would sit there visible for
  // the life of the page, behind a cached "no".
  // ==========================================================================
  function judge(unit, force) {
    if (!unit || unit.nodeType !== 1) return;
    const s = stateOf(unit);
    if (frozen(s)) return;

    // `force` overrules a CLEAR verdict and nothing else. An ad verdict is never
    // re-taken on the strength of a signal that only confirms it — that would be
    // a re-judgement per ad per sweep, bought for no information at all.
    if (s.gen === generation && s.verdict !== undefined && !(force && s.verdict === 0)) {
      // Already answered this generation. A CLEAR answer may be re-taken a
      // couple of times, and only on a FULL sweep, for the story whose header
      // has not arrived yet.
      if (s.verdict === 1 || !fullPass || s.tries >= MAX_CLEAR_RETRIES) return;
    }

    const isAd = adVerdict(unit);
    if (s.gen !== generation) s.tries = 0;
    s.gen = generation;
    s.pos = posOf(unit);

    if (isAd) {
      s.verdict = 1;
      s.empty = false;
      collapse(unit, s);
    } else {
      s.verdict = 0;
      s.tries++;
      release(unit, s);
    }
  }

  // ==========================================================================
  // RECYCLING — the only thing that reopens a decided unit
  //
  // Facebook reuses feed wrappers as you scroll, so a wrapper collapsed as an ad
  // can come back holding somebody's actual post, and a permanently hidden real
  // post is the worst outcome this file can produce. So there has to be a way
  // back — but the old one, "the text length moved", fired on a like count
  // ticking over, and it is half of the loop described above.
  //
  // A recycle has a shape, and Facebook marks it: the story is virtualised away
  // to an empty placeholder (`div[data-virtualized]`, which is Facebook's own
  // attribute — uBlock keys a filter on it) and something is put back later.
  // So the trigger is a TRANSITION, empty then not, rather than a measurement
  // that drifts.
  //
  // The steady-state cost is one attribute read and one small querySelector per
  // collapsed unit per sweep. No textContent, no innerText, no getComputedStyle
  // — none of the expensive detectors run at all unless a wrapper genuinely
  // emptied and refilled.
  // ==========================================================================
  function isPlaceholder(unit) {
    try {
      if (unit.childElementCount === 0) return true;
      return !!unit.querySelector("div[data-virtualized]");
    } catch {
      return false;
    }
  }

  function reconsider() {
    let list;
    try {
      list = document.getElementsByClassName(COLLAPSE_CLASS);
    } catch {
      return;
    }
    // Live HTMLCollection, and removing the class removes the element from it —
    // so snapshot first.
    const units = Array.prototype.slice.call(list);
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const s = stateOf(unit);
      if (frozen(s)) continue;
      if (isPlaceholder(unit)) {
        s.empty = true; // virtualised away; nothing to judge yet
        continue;
      }
      // TWO ways a wrapper comes back holding something else, because Facebook
      // has two: virtualise-and-restore, which passes through an empty
      // placeholder, and React updating the slot's children in place, which does
      // not. The second announces itself by renumbering aria-posinset.
      const pos = posOf(unit);
      const moved = s.pos !== null && pos !== null && pos !== s.pos;
      if (!s.empty && !moved) continue; // same ad, still rendered
      s.empty = false;
      s.verdict = undefined; // a genuine recycle — ask again, properly
      s.tries = 0;
      stats.recycled++;
      judge(unit);
    }
  }

  // ==========================================================================
  // The generation, and why the verdicts have to expire
  //
  // A verdict is remembered per unit (see judge()), which is what stops the same
  // element being re-judged on every one of the many sweeps its subtree will
  // provoke. But a remembered NO cannot be permanent, because of one case: this
  // runs at document_start, and a label examined before Facebook's own
  // stylesheet has applied is examined with none of the hiding in place — every
  // decoy letter counts as visible, the word does not match, and a permanent
  // memo would mean that ad is never looked at again.
  //
  // Bumping a generation counter throws every remembered verdict away, and it is
  // bumped exactly where that risk lives: when the document finishes loading,
  // and on every in-page navigation. SPA navigation is the other reason — a
  // Facebook route change replaces the whole surface without reloading, and the
  // units on the new one deserve a fresh look.
  // ==========================================================================
  let generation = 0;
  let lastHref = "";

  function checkGeneration() {
    let href = "";
    try {
      href = location.href;
    } catch {
      /* nothing to compare against */
    }
    if (href !== lastHref) {
      lastHref = href;
      generation++;
    }
  }

  try {
    document.addEventListener(
      "readystatechange",
      () => {
        if (document.readyState === "complete") generation++;
      },
      false
    );
  } catch {
    /* non-fatal — the URL check still expires the verdicts on navigation */
  }

  // ==========================================================================
  // Where the __cft__ heuristic is allowed to run
  //
  // It is a magic number over a tracking token, and it is the least principled
  // detector in the file — so it runs only where uBlock Origin's own filters run
  // it, which is the home feed and search results, and nowhere else. Applying it
  // everywhere is how a long token in a Group or a Page header collapses
  // somebody's actual post; a false positive there is invisible to us and
  // undiagnosable by the user.
  //
  // uBlock's scoping, for the record:
  //   :matches-path(/^\/(\?[a-z]+=\w+)?$/)   the home feed, 290 characters
  //   :matches-path(/search/)                search results, 265
  // The `div[aria-describedby]` variant is unscoped there; it is scoped here,
  // because we have no filter-list maintainer to fix a bad day for us.
  // ==========================================================================
  const HOME_OR_SEARCH = /^\/(?:$|\?)|^\/search(?:\/|$)/;

  function cftApplies() {
    try {
      return HOME_OR_SEARCH.test(location.pathname + location.search);
    } catch {
      return false;
    }
  }

  // Every element matching `sel` at or below `root`. querySelectorAll excludes
  // the root itself, and when the root IS the newly inserted ad label that is
  // the whole match — so it is checked separately.
  function within(root, sel) {
    const out = [];
    try {
      if (root.nodeType === 1 && root.matches(sel)) out.push(root);
      const found = root.querySelectorAll(sel);
      for (let i = 0; i < found.length; i++) out.push(found[i]);
    } catch {
      /* a detached or exotic root: nothing to scan */
    }
    return out;
  }

  // ==========================================================================
  // DISCOVERY — finding the units worth judging, without judging the page
  //
  // One selector, one querySelectorAll per root. Everything that could POSSIBLY
  // sit inside an ad is a mark; each mark names a unit; the units are deduped;
  // and only then does anything get judged.
  //
  // The order matters and it is the opposite of what this file used to do.
  // Before, each detector ran over the whole root and collapsed as it went, so
  // one ad carrying an /ads/about link, an aria-label and a badge was found
  // three times and its unit walked to three times. Now a unit that six marks
  // point at is judged once. On a feed that is the difference between a handful
  // of verdicts per sweep and a few hundred.
  //
  // `h3 span` / `h4 span` are in here and they match on every ORGANIC post too.
  // That is intended: the discovery pass is deliberately generous and cheap, and
  // the verdict cache is what stops a post being re-examined. A post judged
  // clear costs one cache lookup on every subsequent sweep for the life of the
  // page.
  // ==========================================================================
  const DISCOVERY_SELECTOR = [
    SIGNAL_SELECTOR,
    ARIA_LABEL_SELECTOR,
    LABEL_CANDIDATE_SELECTOR,
    CFT_SELECTOR,
  ].join(",");

  // A mark that means "ad" on its own, as opposed to one that merely means
  // "worth reading" — the difference between finding an /ads/about link and
  // finding an h3 span. Only the first kind is allowed to overrule a cached
  // clear verdict; see judge().
  function isHardMark(el) {
    try {
      if (el.matches(SIGNAL_SELECTOR)) return true;
      if (!el.matches(ARIA_LABEL_SELECTOR)) return false;
      const value = el.getAttribute("aria-label") || "";
      return value.length <= MAX_LABEL_TEXT && isSponsoredLabel(value);
    } catch {
      return false;
    }
  }

  // Sweep ONE subtree. Called with the whole body for a full pass, and with each
  // newly inserted node the rest of the time — see the scheduling section.
  function sweepRoot(root, units, forced) {
    if (!root || root.nodeType !== 1) return;
    const marks = within(root, DISCOVERY_SELECTOR);
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i];
      const unit = unitFor(mark);
      if (!unit) continue;
      // A unit already in the set is not walked to again — the cheapest possible
      // answer to "Facebook re-inserted this subtree", which it does constantly.
      units.add(unit);
      // Gated on the cached verdict so isHardMark() costs nothing in the two
      // common cases — a unit being seen for the first time, and one already
      // known to be an ad. It runs only where its answer can change anything.
      if (!forced.has(unit)) {
        const s = state.get(unit);
        if (s && s.verdict === 0 && isHardMark(mark)) forced.add(unit);
      }
    }
  }

  // `fullPass` is read by judge(): a CLEAR verdict may only be re-taken on a
  // full sweep, so the two-step injections get their second look without every
  // subtree sweep re-running the expensive detectors.
  let fullPass = false;

  function sweep(roots) {
    // A hidden tab still gets mutations — Facebook keeps polling in the
    // background — and sweeping one is pure cost: nothing is on screen to hide,
    // and the next sweep after it is looked at again catches everything.
    if (document.hidden) return;

    stats.sweeps++;
    checkGeneration();

    const list = roots && roots.length ? roots : [document.body];
    fullPass = !roots || !roots.length;
    if (fullPass) stats.fullSweeps++;

    // ----------------------------------------------------------------------
    // READ, then WRITE. Both phases are separated on purpose.
    //
    // Discovery and the verdicts read layout — innerText and getComputedStyle
    // both flush pending style and layout work. Collapsing writes to the class
    // list, which invalidates it again. Interleaving the two is the textbook way
    // to force a synchronous layout per element, and on a page whose own
    // virtualiser is measuring the same elements it is worse than a textbook
    // case: every forced layout is an invitation for Facebook to re-render,
    // which mutates, which schedules the next sweep.
    //
    // So: every unit is discovered first, then every unit is judged, and the
    // class-list writes all land at the end of judge() in one uninterrupted run.
    // ----------------------------------------------------------------------
    const units = new Set();
    const forced = new Set();
    for (let i = 0; i < list.length; i++) {
      if (list[i]) sweepRoot(list[i], units, forced);
    }
    for (const unit of units) judge(unit, forced.has(unit));

    // Last, and only now that nothing else will read layout this pass: the
    // wrappers Facebook has recycled under a collapse.
    reconsider();
    report();
  }

  // ==========================================================================
  // Reporting
  //
  // Isolated world, so this half can talk to the extension directly — no bridge
  // needed. Batched the same way the payload half batches, and carrying nothing
  // but a count: no URL, no advertiser, no page content.
  // ==========================================================================
  function report() {
    if (hiddenSinceFlush <= 0) return;
    const count = hiddenSinceFlush;
    hiddenSinceFlush = 0;
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: STATS_CATEGORY, count })
        ?.catch(() => {});
    } catch {
      /* extension context invalidated — a lost count is not worth surfacing */
    }
  }

  // ==========================================================================
  // Scheduling
  //
  // Facebook mutates the DOM constantly, so sweeping per mutation is not an
  // option — but neither is what this file did first, which was to answer every
  // burst of mutations with three querySelectorAll calls across the WHOLE
  // document plus a style walk per candidate, four times every second and a
  // half, forever. On a document this size that is real, sustained main-thread
  // work, and it is work with nothing to show for it: the parts of the page
  // that did not change cannot have grown an ad.
  //
  // So mutations now carry their PAYLOAD. Each burst hands over the elements
  // that were actually inserted, and only those subtrees are scanned. What that
  // cannot catch is Facebook filling in an attribute on a node it inserted
  // earlier — a two-step injection — so a full pass still runs, on a slow timer.
  // ==========================================================================
  const SWEEP_INTERVAL = 400;
  const FULL_SWEEP_INTERVAL = 5000;

  // ==========================================================================
  // THE ESCALATION BUG, and why the subtree optimisation above was doing nothing
  //
  // The cap used to be sixty, and the rule was: past sixty pending roots, sweep
  // the whole document instead. Both halves of that were wrong on this site.
  //
  // Facebook inserts FAR more than sixty element nodes in any 400ms window in
  // which you are scrolling — one story wrapper arriving brings a couple of
  // hundred with it. So the escalation fired on essentially every sweep, and
  // every sweep was a full-document pass. The optimisation the comment above
  // describes was, in practice, dead code: the file was doing exactly the
  // whole-document scan it was written to avoid, several times a second, for as
  // long as the tab was open.
  //
  // The fix is not a bigger cap, it is COALESCING. Those two hundred nodes are
  // almost all descendants of a handful of roots, and scanning a root scans its
  // descendants — so a node whose ancestor is already pending adds nothing and
  // is dropped. What is left is the handful, comfortably under the cap, and the
  // escalation stops firing because it no longer has to.
  // ==========================================================================
  const MAX_PENDING_ROOTS = 96;

  // How far up to look for an already-pending ancestor. Facebook's inserted
  // subtrees are deep, but a node's pending ancestor is almost always within a
  // few hops — it is the wrapper that was inserted a moment earlier in the same
  // burst. A miss only costs a redundant scan of a subtree we were scanning
  // anyway; there is nothing to be gained by climbing further.
  const COALESCE_DEPTH = 12;

  let armed = false;
  let lastRun = 0;
  let pending = [];
  let pendingSet = new Set();
  let wantFull = true; // the first pass is always a full one

  const idle =
    typeof window.requestIdleCallback === "function"
      ? (fn) => window.requestIdleCallback(fn, { timeout: 1000 })
      : (fn) => setTimeout(fn, 0);

  // Add a root, unless something that already covers it is in the list.
  function addPending(node) {
    if (pendingSet.has(node)) return;
    let p = node.parentElement;
    for (let i = 0; p && i < COALESCE_DEPTH; i++) {
      if (pendingSet.has(p)) return; // an ancestor is already queued
      p = p.parentElement;
    }
    if (pending.length >= MAX_PENDING_ROOTS) {
      // Genuinely more distinct roots than the cap: a whole surface is being
      // replaced. Say so, rather than silently dropping subtrees and letting the
      // ads in them through.
      wantFull = true;
      return;
    }
    pending.push(node);
    pendingSet.add(node);
  }

  function arm() {
    if (armed) return;
    armed = true;
    const wait = Math.max(0, SWEEP_INTERVAL - (Date.now() - lastRun));
    setTimeout(() => {
      idle(() => {
        armed = false;
        lastRun = Date.now();
        // Roots Facebook has since taken back out are not worth scanning, and
        // during fast scrolling they are a real share of the queue.
        const roots = wantFull ? null : pending.filter((n) => n.isConnected !== false);
        pending = [];
        pendingSet = new Set();
        wantFull = false;
        try {
          sweep(roots);
        } catch (err) {
          console.debug("[Sieve] Facebook ad filter: sweep failed", err);
        }
      });
    }, wait);
  }

  function armFull() {
    wantFull = true;
    arm();
  }

  function onMutations(mutations) {
    let sawElement = false;
    for (let i = 0; i < mutations.length; i++) {
      const added = mutations[i].addedNodes;
      for (let j = 0; j < added.length; j++) {
        if (added[j].nodeType !== 1) continue;
        sawElement = true;
        addPending(added[j]);
      }
    }
    // Text and attribute churn on its own changes nothing we look at, and on
    // this site it is most of the traffic.
    //
    // Note what is NOT observed: attributes. Collapsing writes to a class list,
    // and observing attributes would mean every collapse woke the observer that
    // scheduled the sweep that did the collapsing. The one thing the observer
    // must never see is our own writes.
    if (sawElement) arm();
  }

  function start() {
    try {
      new MutationObserver(onMutations).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch (err) {
      console.debug("[Sieve] Facebook ad filter: could not observe the document", err);
    }
    // The safety net for the two-step injections the subtree scan cannot see.
    try {
      setInterval(armFull, FULL_SWEEP_INTERVAL);
    } catch {
      /* non-fatal — inserted nodes are still swept */
    }
    armFull();
  }

  // document_start, so there may be no body yet.
  if (document.documentElement) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  // A one-off sweep on the browser's own back/forward restore, which does not
  // mutate the DOM and so would not arm the observer — and one when the tab is
  // looked at again, since sweep() declines to run while it is hidden.
  try {
    window.addEventListener("pageshow", armFull);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) armFull();
    });
  } catch {
    /* non-fatal */
  }

  // Test hook, and the diagnostic. Exposed on the isolated-world window, which
  // the page cannot see. In a Facebook tab's console:
  //   __sieveFacebookAdDom.stats
  //
  // How to read it on a feed that is misbehaving:
  //   verdicts    should sit near zero once a screenful has settled. Climbing
  //               while you sit still means discovery keeps finding units the
  //               cache has forgotten — the verdict cache is not holding.
  //   released    should be zero, or as near as makes no difference. Anything
  //               else is this half changing its mind about the same element,
  //               which is the oscillation this file was rewritten to remove.
  //   frozen      should be zero. It is the flip budget catching a loop, and
  //               with one verdict function there should be no loop to catch.
  //   recycled    climbs as you scroll, and is meant to: it counts wrappers
  //               Facebook emptied and refilled under a collapse.
  //   fullSweeps  should climb at roughly once per five seconds, no faster.
  window.__sieveFacebookAdDom = {
    stats,
    visibleLabelText,
    isSponsoredLabel,
    couldSpell,
    looksLikeAdLink,
    isAdUnit,
    adVerdict,
    unitFor,
    isSelfContained,
    judge,
    reconsider,
    sweep,
  };
})();

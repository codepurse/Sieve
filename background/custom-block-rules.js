// background/custom-block-rules.js
// Turns the user's blocked-sites list into declarativeNetRequest rules.
//
// Split out of service-worker.js so it can be tested directly. Getting this
// wrong is invisible from the settings page in both directions: a rule that is
// too narrow leaves an entry in the list that never blocks anything, and one
// that is too broad takes down sites the user never listed. Neither shows up
// as an error anywhere.
//
// The list holds five forms (see common/keyword-pattern.js), and what the
// network layer can do with each one differs:
//
//   wildcard, host only     requestDomains — all of them packed into a single
//                           rule pair, which is what this list has always done
//   wildcard with a path    urlFilter, one rule pair per entry
//   whole TLD               regexFilter over the host, PAGES ONLY
//   regex over the address  regexFilter, one rule pair per entry
//   regex over the title    no rule — a title does not exist until the page has
//                           loaded, so content/custom-block.js does those
//   a note (# or !)         no rule — notes are never matched
//
// A TLD gets a page rule but deliberately no subresource rule. ".xyz" is the
// broadest entry a user can write, and a subresource rule for it would run
// against every image, script and XHR on every page they visit. The content
// script hides images from a blocked TLD instead, which costs nothing at all
// until such an entry exists.

/**
 * @param {string[]} entries          the saved blocked-sites list
 * @param {object} opts
 * @param {object} opts.KP            the KeywordPattern module
 * @param {number} opts.idStart       first rule ID to use
 * @param {number} opts.idEnd         one past the last ID this range owns
 * @param {string[]} opts.subresourceTypes
 * @param {(regex: string) => Promise<boolean>} opts.isRegexSupported
 * @param {string} [opts.redirectPath]
 * @param {(msg: string, detail?: any) => void} [opts.warn]
 * @returns {Promise<object[]>} dynamic rules, ready for updateDynamicRules
 */
export async function buildCustomBlockRules(entries, opts) {
  const KP = opts.KP;
  const warn = opts.warn || (() => {});
  const redirectPath = opts.redirectPath || "/pages/blocked.html?category=custom-blocked";
  const list = Array.isArray(entries) ? entries : [];

  // Built fresh per rule: Chrome takes the object by value, and sharing one
  // instance across rules is a trap waiting for the day someone mutates it.
  const redirect = () => ({ type: "redirect", redirect: { extensionPath: redirectPath } });

  const hostDomains = [];
  const urlFilters = [];
  const regexFilters = []; // { regex, pagesOnly }

  for (const entry of list) {
    if (!KP.validateListEntry(entry).ok) continue;
    const parsed = KP.parseListEntry(entry);

    if (parsed.kind === "wildcard") {
      if (!parsed.path && parsed.host.indexOf("*") === -1) {
        hostDomains.push(parsed.host);
      } else {
        // "||host" already covers subdomains, the same way a host entry does.
        // A path with no trailing "*" is an exact path, so it gets the "|" end
        // anchor — without it /adult would also block /adultery, and the
        // network rule would block more than the content script matches.
        const path = parsed.path || "/*";
        urlFilters.push("||" + parsed.host + path + (path.endsWith("*") ? "" : "|"));
      }
    } else if (parsed.kind === "tld") {
      // The TLD is a single label of [a-z0-9-] — validateListEntry guarantees
      // it — so there is nothing in it that needs escaping.
      regexFilters.push({
        regex: "^https?://([^/?#]*\\.)?" + parsed.tld + "(:\\d+)?[/?#]",
        pagesOnly: true,
      });
    } else if (parsed.kind === "url") {
      regexFilters.push({ regex: parsed.body, pagesOnly: false });
    }
    // 'title', 'comment', 'empty' — nothing for the network layer to do
  }

  const rules = [];
  let id = opts.idStart;
  let truncated = false;
  const room = (needed) => id + needed <= opts.idEnd;

  if (hostDomains.length > 0 && room(2)) {
    rules.push({
      id: id++,
      priority: 1,
      action: redirect(),
      condition: { requestDomains: hostDomains, resourceTypes: ["main_frame"] },
    });
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "block" },
      condition: { requestDomains: hostDomains, resourceTypes: opts.subresourceTypes },
    });
  }

  for (const urlFilter of urlFilters) {
    if (!room(2)) { truncated = true; break; }
    rules.push({
      id: id++,
      priority: 1,
      action: redirect(),
      condition: { urlFilter, resourceTypes: ["main_frame"] },
    });
    rules.push({
      id: id++,
      priority: 1,
      action: { type: "block" },
      condition: { urlFilter, resourceTypes: opts.subresourceTypes },
    });
  }

  for (const { regex, pagesOnly } of regexFilters) {
    if (!room(pagesOnly ? 1 : 2)) { truncated = true; break; }
    if (!(await opts.isRegexSupported(regex))) {
      warn("blocked sites: this pattern cannot be used to block pages, skipping it", regex);
      continue;
    }
    rules.push({
      id: id++,
      priority: 1,
      action: redirect(),
      condition: { regexFilter: regex, resourceTypes: ["main_frame"] },
    });
    if (!pagesOnly) {
      rules.push({
        id: id++,
        priority: 1,
        action: { type: "block" },
        condition: { regexFilter: regex, resourceTypes: opts.subresourceTypes },
      });
    }
  }

  if (truncated) {
    warn("blocked sites: the list is longer than its rule range allows; the tail was skipped");
  }
  return rules;
}

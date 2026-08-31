// common/doomscroll-sites.js
// Sieve — Doomscroll Stopper (Module 2A): the site list, shared by the tracker
// (content/doomscroll.js), the settings page and the service worker.
//
// Two kinds of site feed the same machinery:
//   - BUILT-IN sites come from data/site-configs.json. They ship with the
//     extension and are listed in the manifest's content_scripts matches.
//   - CUSTOM sites are domains the user adds themselves. They are stored as a
//     plain list of domains in doomscrollCustomSites and turned into the same
//     config shape here, so nothing downstream needs to know the difference.
//     The tracker is injected into them by a dynamic content-script
//     registration in background/service-worker.js.
//
// A custom site's id is "custom:<domain>", which keeps it distinct from every
// built-in id and makes the per-site settings / stats / "stopped today" maps
// work unchanged.

(() => {
  "use strict";

  // Define the API once (content scripts of one extension share a world).
  if (window.SieveDoomscrollSites) return;

  const CUSTOM_PREFIX = "custom:";

  // A user-added domain, in the same shape as a data/site-configs.json entry.
  // There is no feedSelector: that is only used by built-in, site-specific code.
  function customConfig(domain) {
    return { id: CUSTOM_PREFIX + domain, name: domain, domains: [domain], custom: true };
  }

  // Does this hostname belong to the config? Subdomains count, as in the tracker.
  function hostMatches(cfg, host) {
    const bare = String(host || "").replace(/^www\./, "");
    return cfg.domains.some((d) => bare === d || bare.endsWith("." + d));
  }

  // Is the domain already watched by a built-in site? Adding youtube.com by hand
  // would otherwise create a second, duplicate row with its own separate limit.
  function findBuiltin(builtin, domain) {
    return builtin.find((cfg) => hostMatches(cfg, domain)) || null;
  }

  // The bundled site list. Returns [] rather than throwing so a missing or
  // malformed file degrades to "no built-in sites", not a dead feature.
  async function loadBuiltin() {
    try {
      const res = await fetch(chrome.runtime.getURL("data/site-configs.json"));
      return await res.json();
    } catch (err) {
      console.error("[Sieve] Could not load site-configs.json", err);
      return [];
    }
  }

  async function loadCustomDomains() {
    const { doomscrollCustomSites } = await chrome.storage.local.get({ doomscrollCustomSites: [] });
    return Array.isArray(doomscrollCustomSites) ? doomscrollCustomSites : [];
  }

  // Everything the settings page and the tracker need, in one round trip.
  async function loadAll() {
    const [builtin, domains] = await Promise.all([loadBuiltin(), loadCustomDomains()]);
    const custom = domains.map(customConfig);
    return { builtin, custom, all: builtin.concat(custom) };
  }

  window.SieveDoomscrollSites = {
    CUSTOM_PREFIX,
    customConfig,
    hostMatches,
    findBuiltin,
    loadBuiltin,
    loadCustomDomains,
    loadAll,
  };
})();

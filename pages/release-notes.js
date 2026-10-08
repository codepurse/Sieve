// ===========================================================================
// Sieve — Release notes page
//
// Renders SIEVE_CHANGELOG (common/changelog.js) as a timeline of collapsible
// releases: the newest one is open, older ones are folded so the page stays
// short. Opening the page also clears the "new in this version" dot in the
// settings sidebar, which is the only state this page touches.
// ===========================================================================

(function renderReleaseNotes() {
  const list = document.getElementById("rn-list");
  const releases =
    typeof SIEVE_CHANGELOG !== "undefined" && Array.isArray(SIEVE_CHANGELOG) ? SIEVE_CHANGELOG : [];
  if (!list) return;

  const current = chrome.runtime.getManifest().version;

  const versionPill = document.getElementById("rn-version");
  if (versionPill) versionPill.textContent = `You're on v${current}`;

  releases.forEach((release, index) => {
    const entry = el("li", "rn-release");

    // <details> rather than a click handler: the browser handles the folding,
    // the keyboard, and the accessibility tree for free.
    const details = el("details", "rn-details");
    if (index === 0) details.open = true;

    // version in the margin · date, count and a CURRENT stamp beside it ·
    // a +/− at the end that the stylesheet draws.
    const summary = el("summary", "rn-summary");
    summary.append(el("span", "rn-ver", `v${release.version}`));

    const meta = el("span", "rn-meta");
    meta.append(el("span", "rn-date", release.date));
    const count = release.items.length;
    meta.append(el("span", "rn-count", `${count} ${count === 1 ? "change" : "changes"}`));
    if (release.version === current) meta.append(el("span", "rn-badge", "Current"));
    summary.append(meta);

    const toggle = el("span", "rn-toggle");
    toggle.setAttribute("aria-hidden", "true");
    summary.append(toggle);
    details.append(summary);

    const items = el("ul", "rn-items");
    for (const text of release.items) items.append(el("li", "", text));
    details.append(items);

    entry.append(details);
    list.append(entry);
  });

  // Seeing this page counts as reading the notes, so the sidebar dot in
  // Settings goes away. Mirrors what the sidebar link itself records.
  chrome.storage.local.set({ seenWhatsNewVersion: current });
})();

// Small element helper — mirrors svEl() in options.js.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// pages/blocked.js
// The blocked page shows a message tailored to WHAT was blocked. The blocking
// rule redirects here with a ?category= param:
//   scam     → a known crypto scam / phishing site   (clear warning tone)
//   trading  → a trading/exchange site the user opted to block (gentle tone)
//   mlm      → a known multi-level-marketing site the user opted to block
//   piracy   → a piracy / illegal-streaming site (Safety Shield, often unsafe)
//   safety   → a known phishing / malware site (Safety Shield, clear warning)
//   cryptojacking → a hidden crypto-miner site (Safety Shield, clear warning)
//   aislop   → an AI-generated content farm / spam site (Safety Shield)
//   fraud    → a known fraud / scam / fake-shop site (Safety Shield, clear warning)
//   goreshock → a known gore / shock-content site (Safety Shield, opt-in, static list)
//   dating   → a mainstream/hookup dating site the user opted to block (Safety Shield, opt-in, static)
//   games-portals   → a browser-game portal / .io game     (Game Blocker, opt-in, static)
//   games-stores    → a game download store or launcher    (Game Blocker, opt-in, static)
//   games-platforms → a game platform / social game world  (Game Blocker, opt-in, static)
//   games-streaming → game streaming / cloud gaming / esports (Game Blocker, opt-in, static)
//   ai-chatbots     → an AI assistant / AI search site        (AI Blocker, opt-in, static)
//   ai-writing      → an AI writing / homework / humanizer tool (AI Blocker, opt-in, static)
//   ai-companions   → an AI companion / roleplay chat site    (AI Blocker, opt-in, static)
//   gambling → the Phase-1 gambling blocker           (original wording)
//   prediction-markets → a prediction market / betting platform (2nd Gambling
//                        Blocker toggle; opt-in self-control tone)
// If the param is missing (the gambling rules don't send one) we fall back to
// the gambling wording — which is also the static HTML default, so the page
// still reads correctly even if this script somehow never runs.
//
// The page also shows WHICH url was blocked (a DNR redirect drops it, so the
// background captures it from webNavigation and we ask for it here) and offers a
// one-click "Allow this site". Allowlisting weakens protection, so it is gated
// behind the Guardian PIN when one is set.

(function () {
  const category = new URLSearchParams(location.search).get("category");

  const MESSAGES = {
    scam: {
      shield: "⚠️",
      title: "Scam site blocked by Sieve",
      message:
        "This site is a known crypto scam or phishing site — blocked by Sieve.",
      note:
        "Scam lists can occasionally be wrong. If you're sure this site is safe, add it to the Allowlist in Sieve's settings.",
    },
    trading: {
      shield: "🛡️",
      title: "Trading site blocked by Sieve",
      message: "You chose to block trading sites. Blocked by Sieve.",
      note:
        "You can turn off “Block trading & exchange sites”, or allow this site, under Financial Protection in Sieve's settings.",
    },
    mlm: {
      shield: "🛡️",
      title: "MLM site blocked by Sieve",
      message:
        "This is a known multi-level marketing site — blocked by Sieve. Most participants in these schemes lose money.",
      note:
        "You can turn off “Block MLM / multi-level marketing sites”, or allow this site, under Financial Protection in Sieve's settings.",
    },
    piracy: {
      shield: "⚠️",
      title: "Piracy site blocked by Sieve",
      message:
        "This piracy/streaming site is blocked by Sieve (often unsafe).",
      note:
        "Piracy and illegal-streaming sites are frequently malware-ridden. If you're sure this site is safe, add it to the Allowlist in Sieve's settings.",
    },
    safety: {
      shield: "⚠️",
      title: "Unsafe site blocked by Sieve",
      message:
        "This site is a known phishing or malware site — blocked by Sieve.",
      note:
        "Safety lists can occasionally be wrong. If you're sure this site is safe, add it to the Allowlist in Sieve's settings.",
    },
    cryptojacking: {
      shield: "⚠️",
      title: "Cryptojacking site blocked by Sieve",
      message:
        "This site runs a hidden crypto miner that would use your device's resources without permission — blocked by Sieve.",
      note:
        "Mining lists can occasionally be wrong. If you're sure this site is safe, add it to the Allowlist in Sieve's settings.",
    },
    aislop: {
      shield: "🛡️",
      title: "AI content farm blocked by Sieve",
      message:
        "This site is a known AI-generated content farm / spam site — blocked by Sieve.",
      note:
        "These lists can occasionally flag a legitimate site. If you're sure this site is fine, add it to the Allowlist in Sieve's settings.",
    },
    fraud: {
      shield: "⚠️",
      title: "Fraud site blocked by Sieve",
      message:
        "This site is on a known fraud / scam list — blocked by Sieve.",
      note:
        "Fraud lists can occasionally be wrong. If you're sure this site is safe, add it to the Allowlist in Sieve's settings.",
    },
    goreshock: {
      shield: "⚠️",
      title: "Gore / shock site blocked by Sieve",
      message:
        "This site is known for graphic/shock content — blocked by Sieve.",
      note:
        "You can turn off “Block known gore / shock sites”, or allow this site, under Safety Shield in Sieve's settings.",
    },
    dating: {
      shield: "🛡️",
      title: "Dating site blocked by Sieve",
      message: "You chose to block dating sites. Blocked by Sieve.",
      note:
        "You can turn off “Block dating sites”, or allow this site, under Safety Shield in Sieve's settings.",
    },
    // Ad & Tracker Blocker. Reaching this page at all is unusual: this tier's
    // real work is blocking SUBRESOURCES, which never navigate anywhere. You
    // only land here by opening a tracker or ad-network domain directly, so the
    // wording explains what the address actually is rather than assuming the
    // user meant to go somewhere they were stopped from.
    trackers: {
      shield: "🛡️",
      title: "Tracker domain blocked by Sieve",
      message:
        "This address belongs to an advertising or tracking service, not a site to visit — blocked by Sieve.",
      note:
        "You can turn off “Block ad & tracker domains”, or allow this site, under Ad & Trackers in Sieve's settings.",
    },
    ads: {
      shield: "🛡️",
      title: "Ad-network domain blocked by Sieve",
      message:
        "This address belongs to an advertising network, not a site to visit — blocked by Sieve.",
      note:
        "You can turn off “Block ad-network domains”, or allow this site, under Ad & Trackers in Sieve's settings.",
    },
    "games-portals": {
      shield: "🛡️",
      title: "Game site blocked by Sieve",
      message: "You chose to block browser game sites. Blocked by Sieve.",
      note:
        "You can turn off “Browser game portals”, or allow this site, under Game Blocker in Sieve's settings.",
    },
    "games-stores": {
      shield: "🛡️",
      title: "Game store blocked by Sieve",
      message: "You chose to block game download stores. Blocked by Sieve.",
      note:
        "You can turn off “Game download stores”, or allow this site, under Game Blocker in Sieve's settings.",
    },
    "games-platforms": {
      shield: "🛡️",
      title: "Game platform blocked by Sieve",
      message: "You chose to block game platforms. Blocked by Sieve.",
      note:
        "You can turn off “Game platforms & online worlds”, or allow this site, under Game Blocker in Sieve's settings.",
    },
    "games-streaming": {
      shield: "🛡️",
      title: "Game streaming blocked by Sieve",
      message:
        "You chose to block game streaming and esports sites. Blocked by Sieve.",
      note:
        "You can turn off “Game streaming, cloud gaming & esports”, or allow this site, under Game Blocker in Sieve's settings.",
    },
    // AI Blocker. Self-control, not safety — the same neutral opt-in tone the
    // dating and game groups use. Each note names the exact switch to change,
    // because three switches sit in that card and only one of them let this
    // through.
    "ai-chatbots": {
      shield: "🛡️",
      title: "AI assistant blocked by Sieve",
      message: "You chose to block AI chatbots and assistants. Blocked by Sieve.",
      note:
        "You can turn off “AI chatbots & assistants”, or allow this site, under AI Blocker in Sieve's settings.",
    },
    "ai-writing": {
      shield: "🛡️",
      title: "AI writing tool blocked by Sieve",
      message:
        "You chose to block AI writing and homework tools. Blocked by Sieve.",
      note:
        "You can turn off “AI writing, homework & humanizer tools”, or allow this site, under AI Blocker in Sieve's settings.",
    },
    "ai-companions": {
      shield: "🛡️",
      title: "AI companion site blocked by Sieve",
      message:
        "You chose to block AI companion and roleplay chat sites. Blocked by Sieve.",
      note:
        "You can turn off “AI companions & roleplay chat”, or allow this site, under AI Blocker in Sieve's settings.",
    },
    gambling: {
      shield: "🛡️",
      title: "Blocked by Sieve",
      message:
        "This is a gambling site, and Sieve blocked it to keep your browsing clean.",
      note:
        "You can manage blocked sites and turn the Gambling Blocker on or off from the Sieve icon in your browser toolbar.",
    },
    "prediction-markets": {
      shield: "🛡️",
      title: "Prediction market blocked by Sieve",
      message:
        "This is a prediction market / betting platform — blocked by Sieve.",
      note:
        "You can turn off “Block prediction markets”, or allow this site, in the Gambling Blocker section of Sieve's settings.",
    },
    "custom-blocked": {
      shield: "🛡️",
      title: "Site blocked by Sieve",
      message: "This site is on your personal block list — blocked by Sieve.",
      note:
        "You can remove it from your Blocked sites list in Sieve's settings.",
    },
  };

  const msg = MESSAGES[category] || MESSAGES.gambling;

  // ---------------------------------------------------------------------------
  // Shared Protection Dashboard stats: record this block once per page load.
  // ---------------------------------------------------------------------------
  const STATS_CATEGORY_MAP = {
    gambling: "gambling",
    "prediction-markets": "predictionMarkets",
    scam: "scam",
    trading: "trading",
    mlm: "mlm",
    piracy: "piracy",
    safety: "malware",
    cryptojacking: "cryptojacking",
    aislop: "aiSlop",
    fraud: "fraud",
    goreshock: "goreShock",
    dating: "dating",
    // All four Game Blocker groups roll up into ONE dashboard row ("games") —
    // the per-group wording above is what tells the user which toggle to change;
    // the dashboard only needs the total.
    "games-portals": "games",
    "games-stores": "games",
    "games-platforms": "games",
    "games-streaming": "games",
    // Same roll-up for the three AI Blocker groups: the per-group wording above
    // is what tells the user which switch to change; the dashboard needs a total.
    "ai-chatbots": "aiSites",
    "ai-writing": "aiSites",
    "ai-companions": "aiSites",
    "custom-blocked": "customBlocked",
  };

  // Categories this page must NOT record, because something else already did.
  //
  // The Ad & Tracker tier is counted by background/ad-tracker-stats.js, which
  // polls declarativeNetRequest.getMatchedRules — and that reports EVERY match
  // in the tier's rule band, including the main_frame redirect that brought the
  // user here. Recording it again from this page would count that one navigation
  // twice, on the one tier where the dashboard number is otherwise entirely the
  // poll's work. (This page still shows its normal explanation; it just does not
  // touch the tally.)
  const STATS_SKIP = new Set(["trackers", "ads"]);

  function recordBlockView() {
    const params = new URLSearchParams(location.search);
    const resolved = params.get("resolved");
    const statsCategory = resolved ? "urlShortener" : (STATS_CATEGORY_MAP[category] || category);
    if (!resolved && STATS_SKIP.has(category)) return;
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: statsCategory, count: 1 })
        .catch(() => {});
    } catch (err) {
      // Extension context may be unavailable in unusual conditions.
    }
  }
  recordBlockView();

  // Severity sets the tone: ⚠️ categories are known threats and take the
  // caution colour on the kicker and margin rule; everything else is ink.
  // Read by blocked.html's CSS.
  document.documentElement.dataset.severity =
    msg.shield === "⚠️" ? "warn" : "guard";

  const shieldEl = document.getElementById("block-shield");
  const kickerEl = document.getElementById("block-kicker");
  const titleEl = document.getElementById("block-title");
  const messageEl = document.getElementById("block-message");
  const noteEl = document.getElementById("block-note");
  if (shieldEl) shieldEl.textContent = msg.shield;
  if (messageEl) messageEl.textContent = msg.message;
  if (noteEl) noteEl.textContent = msg.note;
  document.title = msg.title;

  // The kicker says WHY, which is the first thing worth knowing: a list of
  // known threats, the reader's own block list, or a setting they chose.
  if (kickerEl) {
    kickerEl.textContent =
      msg.shield === "⚠️"
        ? "Safety block · known threat"
        : category === "custom-blocked"
          ? "On your block list"
          : "Blocked by your settings";
  }
  // The headline names the kind of site ("Scam site blocked"); the brand is
  // already in the letterhead, so "by Sieve" is dropped here.
  if (titleEl) {
    const headline = msg.title.replace(/\s+by Sieve$/, "");
    titleEl.textContent = headline === "Blocked" ? "This page is blocked" : headline;
  }

  // The commonest thing to do on a blocked page is leave it. Offered only when
  // there is somewhere to go back to — a tab opened straight onto a blocked
  // address has no history, and a button that does nothing is worse than none.
  const backBtn = document.getElementById("back-btn");
  if (backBtn && history.length > 1) {
    backBtn.hidden = false;
    backBtn.addEventListener("click", () => history.back());
  }

  // --- Show the blocked URL + offer a one-click "Allow this site" -----------
  const originWrap = document.getElementById("origin-wrap");
  const originUrlEl = document.getElementById("origin-url");
  const actionsEl = document.getElementById("allow-actions");
  const allowBtn = document.getElementById("allow-btn");
  const resultEl = document.getElementById("allow-result");

  // The registrable-ish host to allow, matching the options page (www stripped).
  function domainOf(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  (async function initAllow() {
    // Our own tab id — extension pages in a tab can read it directly, which is
    // more reliable than sender.tab across browsers. Pass it to the background.
    let tabId;
    try {
      const tab = await chrome.tabs.getCurrent();
      tabId = tab && tab.id;
    } catch {
      /* not in a tab context — leave undefined, background falls back to sender */
    }

    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: "GET_BLOCKED_URL", tabId });
    } catch {
      return; // background unavailable — leave the generic page as-is
    }

    const url = resp && resp.url;
    if (!url || !originWrap || !originUrlEl) return;

    originUrlEl.textContent = url;
    originWrap.hidden = false;

    const domain = domainOf(url);
    if (!domain || !actionsEl || !allowBtn) return;

    allowBtn.textContent = `Allow ${domain}`;
    actionsEl.hidden = false;

    const allowAction = `Allow ${domain} and stop blocking it`;

    // With a cool-off set, say where this site's request stands. Whoever is
    // looking at this page is the one who asked, so the answer belongs here
    // rather than only in the settings.
    async function showCooloffStatus() {
      const CO = window.SieveCooloff;
      if (!CO) return;
      let info;
      try {
        info = await CO.check(allowAction);
      } catch {
        return;
      }
      resultEl.className = "allow-result";
      if (!info.required || info.state === "none") {
        resultEl.textContent = "";
      } else if (info.state === "waiting") {
        const { readyAt } = info.request;
        resultEl.textContent =
          `You asked to allow this site. It unlocks in ${CO.formatDuration(readyAt - Date.now())}, ` +
          `on ${CO.formatWhen(readyAt)}.`;
      } else {
        resultEl.textContent = `The wait is over. Allow works until ${CO.formatWhen(info.request.expiresAt)}.`;
      }
    }
    showCooloffStatus();

    allowBtn.addEventListener("click", async () => {
      // Allowlisting WEAKENS protection, so it goes through the Guardian gate:
      // the cool-off wait if one is set, then the PIN if one is set. With
      // neither, confirmUnlock resolves immediately.
      if (window.SieveGuardian && SieveGuardian.confirmUnlock) {
        // Critical: this is the moment someone stands in front of a blocked site
        // and decides to let themselves in, which is exactly what the access
        // code exists for.
        const ok = await SieveGuardian.confirmUnlock(allowAction, { critical: true });
        if (!ok) {
          showCooloffStatus(); // a wait may have just been started or called off
          return;
        }
      }

      allowBtn.disabled = true;
      resultEl.className = "allow-result";
      resultEl.textContent = "Allowing…";

      let r;
      try {
        r = await chrome.runtime.sendMessage({ type: "SIEVE_ALLOW_SITE", domain });
      } catch {
        r = null;
      }

      if (r && r.ok) {
        resultEl.className = "allow-result ok";
        resultEl.textContent = `Allowed ${r.domain}. Taking you there…`;
        location.href = url; // the allow rule is live — the background confirmed it
      } else {
        allowBtn.disabled = false;
        resultEl.className = "allow-result err";
        resultEl.textContent =
          "Couldn't allow this site automatically. You can add it under Allowlist in Sieve's settings.";
      }
    });
  })();
})();

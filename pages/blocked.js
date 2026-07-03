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
    "custom-blocked": "customBlocked",
  };

  function recordBlockView() {
    const params = new URLSearchParams(location.search);
    const resolved = params.get("resolved");
    const statsCategory = resolved ? "urlShortener" : (STATS_CATEGORY_MAP[category] || category);
    try {
      chrome.runtime
        .sendMessage({ type: "SIEVE_RECORD_BLOCK", category: statsCategory, count: 1 })
        .catch(() => {});
    } catch (err) {
      // Extension context may be unavailable in unusual conditions.
    }
  }
  recordBlockView();

  // Tint the page's accent glow by severity: ⚠️ warnings run warm (amber/rose),
  // everything else keeps the indigo brand accent. Read by blocked.html's CSS.
  document.documentElement.dataset.severity =
    msg.shield === "⚠️" ? "warn" : "guard";

  const shieldEl = document.getElementById("block-shield");
  const messageEl = document.getElementById("block-message");
  const noteEl = document.getElementById("block-note");
  if (shieldEl) shieldEl.textContent = msg.shield;
  if (messageEl) messageEl.textContent = msg.message;
  if (noteEl) noteEl.textContent = msg.note;
  document.title = msg.title;

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

    allowBtn.addEventListener("click", async () => {
      // Allowlisting WEAKENS protection, so gate it behind the Guardian PIN when
      // one is set. In Personal mode (no PIN) confirmUnlock resolves immediately.
      if (window.SieveGuardian && SieveGuardian.confirmUnlock) {
        const ok = await SieveGuardian.confirmUnlock(`Allow ${domain} and stop blocking it`);
        if (!ok) return;
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

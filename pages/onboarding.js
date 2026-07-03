// Sieve first-install onboarding page.
// Step 3: setup wizard UI + module-enable logic.

(async () => {
  "use strict";

  const SET_MODULE_STATE = "SET_MODULE_STATE";

  // Human-readable labels for every module key the wizard can toggle.
  const MODULE_LABELS = {
    badLanguageEnabled: "Bad Language Filter",
    familySafe: "Family-Safe mode",
    toxicHiderEnabled: "Toxic Comment Hider",
    gamblingEnabled: "Gambling Blocker",
    predictionMarketEnabled: "Prediction Markets Blocker",
    doomscrollEnabled: "Doomscroll Stopper",
    darkPatternsEnabled: "Dark Pattern Blocker",
    popupHijackEnabled: "Popup & Click Hijack Blocker",
    urlShortenerResolverEnabled: "URL Shortener Resolver",
    fpScamEnabled: "Financial Protection — Scam sites",
    fpTradingEnabled: "Financial Protection — Trading sites",
    fpMlmEnabled: "Financial Protection — MLM sites",
    ssPiracyEnabled: "Safety Shield — Piracy",
    ssSafetyEnabled: "Safety Shield — Malware & phishing",
    ssCryptojackingEnabled: "Safety Shield — Cryptojacking",
    ssAiSlopEnabled: "Safety Shield — AI slop",
    ssFraudEnabled: "Safety Shield — Fraud sites",
    ssGoreShockEnabled: "Safety Shield — Gore/shock sites",
    ssDatingEnabled: "Safety Shield — Dating sites",
  };

  // Which modules each wizard path enables.
  const PATHS = {
    family: [
      "badLanguageEnabled",
      "familySafe",
      "toxicHiderEnabled",
      "gamblingEnabled",
      "ssGoreShockEnabled",
      "fpScamEnabled",
    ],
    focus: [
      "doomscrollEnabled",
    ],
    scams: [
      "ssSafetyEnabled",
      "ssPiracyEnabled",
      "ssCryptojackingEnabled",
      "ssAiSlopEnabled",
      "fpScamEnabled",
      "fpTradingEnabled",
      "fpMlmEnabled",
      "urlShortenerResolverEnabled",
    ],
    all: Object.keys(MODULE_LABELS),
    skip: [],
  };

  // Reuse the same central toggle plumbing the popup/options pages use:
  // SET_MODULE_STATE is handled by background/service-worker.js.
  async function enableModule(key) {
    await chrome.runtime.sendMessage({ type: SET_MODULE_STATE, key, enabled: true });
  }

  async function applyPath(path) {
    const keys = PATHS[path] || [];
    // Enable sequentially so DNR rule updates in the service worker don't race.
    for (const key of keys) {
      await enableModule(key);
    }
    return keys;
  }

  function setLoading(isLoading) {
    const veil = document.getElementById("loading-veil");
    if (!veil) return;
    veil.hidden = !isLoading;
  }

  function disableWizard() {
    const buttons = document.querySelectorAll("#wizard-options .wizard-option");
    buttons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("is-used");
    });
  }

  function labelForKey(key) {
    return MODULE_LABELS[key] || key;
  }

  function renderConfirmation(path, keys) {
    const body = document.getElementById("confirmation-body");
    body.textContent = "";

    if (path === "skip") {
      const p = document.createElement("p");
      p.textContent = "All protection is off. You can turn modules on anytime in Settings.";
      body.appendChild(p);
    } else {
      const intro = document.createElement("p");
      intro.textContent = `Enabled ${keys.length} protection${keys.length === 1 ? "" : "s"}:`;
      body.appendChild(intro);

      const ul = document.createElement("ul");
      for (const key of keys) {
        const li = document.createElement("li");
        li.textContent = labelForKey(key);
        ul.appendChild(li);
      }
      body.appendChild(ul);
    }

    const reminder = document.createElement("p");
    reminder.textContent = "You can change any of this anytime in Settings.";
    body.appendChild(reminder);

    document.getElementById("confirmation").hidden = false;
    document.getElementById("confirmation").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function onPathChosen(path) {
    disableWizard();

    if (path === "skip") {
      renderConfirmation(path, []);
      return;
    }

    // Show a loading veil for module-heavy paths so the page doesn't feel frozen.
    const heavyPaths = ["family", "scams", "all"];
    const showVeil = heavyPaths.includes(path);
    if (showVeil) setLoading(true);

    try {
      const keys = await applyPath(path);

      if (path === "family") {
        // Family path: enable modules first, then ask for the PIN.
        window._lastChosenPath = path;
        window._lastEnabledKeys = keys;
        setLoading(false);
        document.getElementById("pin-setup").hidden = false;
        document.getElementById("pin-setup").scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }

      setLoading(false);
      renderConfirmation(path, keys);
    } catch (err) {
      setLoading(false);
      console.error("[Sieve] failed to apply onboarding path:", err);
      renderConfirmation(path, []);
    }
  }

  function setupWizard() {
    const container = document.getElementById("wizard-options");
    if (!container) return;

    container.addEventListener("click", (e) => {
      const option = e.target.closest(".wizard-option");
      if (!option || option.disabled) return;
      const path = option.dataset.path;
      if (!path) return;
      onPathChosen(path);
    });

    setupPinFlow();
  }

  function setupPinFlow() {
    const newInput = document.getElementById("pin-new");
    const confirmInput = document.getElementById("pin-confirm");
    const setBtn = document.getElementById("pin-set-btn");
    const skipBtn = document.getElementById("pin-skip-btn");
    const successBtn = document.getElementById("pin-success-btn");
    const errorEl = document.getElementById("pin-error");
    const formEl = document.getElementById("pin-form");
    const successEl = document.getElementById("pin-success");

    if (!setBtn || !SieveGuardian) return;

    function showError(msg) {
      errorEl.textContent = msg;
    }

    function clearError() {
      errorEl.textContent = "";
    }

    async function setPin() {
      clearError();
      const pin = newInput.value.trim();
      const confirm = confirmInput.value.trim();

      if (!/^\d{4,}$/.test(pin)) {
        showError("PIN must be at least 4 digits.");
        return;
      }
      if (pin !== confirm) {
        showError("PINs don't match.");
        return;
      }

      try {
        await SieveGuardian.setPin(pin);
        formEl.hidden = true;
        successEl.hidden = false;
      } catch (err) {
        console.error("[Sieve] onboarding PIN setup failed:", err);
        showError("Could not set PIN. Please try again.");
      }
    }

    function finishPinStep() {
      document.getElementById("pin-setup").hidden = true;
      renderConfirmation(window._lastChosenPath, window._lastEnabledKeys || []);
    }

    setBtn.addEventListener("click", setPin);
    successBtn.addEventListener("click", finishPinStep);
    skipBtn.addEventListener("click", finishPinStep);

    // Allow Enter to submit from either input.
    [newInput, confirmInput].forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") setPin();
      });
    });
  }

  function setupFinish() {
    const finishBtn = document.getElementById("finish-btn");
    if (!finishBtn) return;
    finishBtn.addEventListener("click", async () => {
      // Open the full settings page (matches the popup's "Open Settings" flow),
      // then close the onboarding tab so the user isn't left with two Sieve tabs.
      chrome.runtime.openOptionsPage();
      try {
        const tab = await chrome.tabs.getCurrent();
        if (tab?.id) chrome.tabs.remove(tab.id);
      } catch (err) {
        console.error("[Sieve] could not close onboarding tab:", err);
      }
    });
  }

  function setupBlockNSFWLink() {
    const link = document.getElementById("blocknsfw-link");
    if (!link) return;
    const isFirefox = /firefox/i.test(navigator.userAgent);
    link.href = isFirefox
      ? "https://addons.mozilla.org/en-US/firefox/addon/blocknsfw-porn-adult-content/"
      : "https://chromewebstore.google.com/detail/blocknsfw-%E2%80%93-porn-adult-co/fiecjgpoilkhmoieaboolkfmgbnhlhop?authuser=0&hl=en";
  }

  setupWizard();
  setupFinish();
  setupBlockNSFWLink();
})();

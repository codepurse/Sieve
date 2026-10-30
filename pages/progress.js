// pages/progress.js
// Sieve — starts the Your progress page. What fills it is Sieve Pro
// (pro/progress.js, not open source); in a build without it, that file is an
// empty stand-in and the page says Sieve Pro is not part of this build.

(() => {
  "use strict";

  if (!window.SieveProgress) {
    document.getElementById("pg-absent").hidden = false;
    return;
  }
  window.SieveProgress.start().catch((err) => {
    console.warn("[Sieve] Your progress could not be read:", err);
  });
})();

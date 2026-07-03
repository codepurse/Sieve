// background/url-shortener-resolver.js
// Sieve — URL Shortener Resolver (background half).
//
// Receives shortened URLs from the content script, expands them via fetch()
// following redirects, checks the real destination against the user's currently
// enabled blockers, and returns whether to allow, block, or fail open.
//
// Design notes:
//   - Uses GET (not HEAD) because some shorteners return 405 on HEAD or behave
//     differently; shortener response bodies are small.
//   - A single hard deadline covers BOTH the network resolution AND the blocker
//     check, so the user is never left waiting.
//   - Fail open on network errors, timeouts, or any unexpected condition.
//   - `response.url` is available even for opaque/CORS-limited responses, so we
//     still get the final URL in many cross-origin cases.

import { checkResolvedUrl } from "./url-shortener-checker.js";

const RESOLVE_TIMEOUT_MS = 3000;

function makeDeadline(controller, ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      try {
        controller.abort("timeout");
      } catch {
        /* ignore */
      }
      reject(new Error("timeout"));
    }, ms);
  });
}

async function resolveShortener(url) {
  const controller = new AbortController();
  const deadline = makeDeadline(controller, RESOLVE_TIMEOUT_MS);

  try {
    const response = await Promise.race([
      fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        credentials: "same-origin",
      }),
      deadline,
    ]);

    // fetch() follows redirects automatically; response.url is the final URL
    // after the chain. It is set even for error-status responses.
    const finalUrl = response.url || url;
    if (!finalUrl || !/^https?:\/\//i.test(finalUrl)) {
      return { action: "fail-open" };
    }

    return await Promise.race([checkResolvedUrl(finalUrl), deadline]);
  } catch (err) {
    console.warn("[Sieve] Shortener resolution failed; failing open:", url, err && err.message);
    return { action: "fail-open" };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "SIEVE_RESOLVE_SHORTENER" && typeof message.url === "string") {
    resolveShortener(message.url)
      .then((result) => sendResponse(result))
      .catch(() => {
        // The content script may have already timed out and navigated away;
        // sendResponse throwing is harmless at that point.
        try {
          sendResponse({ action: "fail-open" });
        } catch {
          /* ignore */
        }
      });
    return true; // keep message channel open for the async response
  }
  return false;
});

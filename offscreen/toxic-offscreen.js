// offscreen/toxic-offscreen.js
// Controller for the offscreen model document (Module 4A, Step 7).
// Receives batches of comment text relayed by the service worker, runs them
// through the on-device model, and returns per-text toxicity scores. The model
// is loaded once (lazily, on the first request) and reused for the document's
// lifetime — across every tab.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "sieve:offscreen-classify") return; // not ours

  (async () => {
    try {
      const results = await self.__sieveToxicModel.classify(msg.texts || []);
      sendResponse({ ok: true, results });
    } catch (err) {
      console.error("[Sieve] offscreen classify failed:", err);
      sendResponse({ ok: false, error: String((err && err.message) || err) });
    }
  })();

  return true; // keep the channel open for the async response
});

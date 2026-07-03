// src/toxic-model.entry.js
// Layer-2 toxicity model (Module 4A). esbuild bundles this + TensorFlow.js into
// content/toxic-model.bundle.js, which is loaded by the offscreen document.
//
// It loads the model ONCE from the Step-6 cache (never the network) and exposes:
//   self.__sieveToxicModel.load()            -> Promise (idempotent)
//   self.__sieveToxicModel.classify(texts)   -> [{ prob, label }] aligned to texts
//
// The old toxicity package hardcodes a now-dead tfhub.dev URL, so we install a
// fetch shim that redirects every model request to our cached copy (downloaded
// from Google's live mirror in Step 6). No comment text is ever fetched — only
// model files, and only from the local Cache API.

import * as tf from "@tensorflow/tfjs-core";
import * as toxicity from "@tensorflow-models/toxicity";

const NS = (self.__sieveToxicModel = self.__sieveToxicModel || {});
const BASE = "https://storage.googleapis.com/tfjs-models/savedmodel/";

let model = null;
let loadingPromise = null;
let shimInstalled = false;

// Map any model request (incl. the dead tfhub toxicity URL) to a cache key.
function mapToCache(url) {
  const u = String(url).split("?")[0]; // drop ?tfjs-format=file etc.
  // Toxicity head requested from tfhub.dev → our cached googleapis copy.
  let m = u.match(/toxicity\/1\/default\/1\/(.+)$/);
  if (m) return BASE + "toxicity/" + m[1];
  if (/toxicity\/1\/default\/1$/.test(u)) return BASE + "toxicity/model.json";
  // Anything already pointing at the tfjs-models bucket (the encoder + vocab).
  m = u.match(/\/savedmodel\/(.+)$/);
  if (m) return BASE + m[1];
  return null;
}

// Serve model files from the cache; everything else falls through to network.
// A cache miss on a model file fails fast (no surprise 55 MB download).
function installFetchShim() {
  if (shimInstalled) return;
  shimInstalled = true;
  const orig = self.fetch.bind(self);
  self.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const key = mapToCache(url);
    if (key) {
      const cached = self.SieveModelCache && (await self.SieveModelCache.getResponse(key));
      if (cached) return cached.clone();
      return new Response(null, { status: 504, statusText: "Sieve: model file not cached" });
    }
    return orig(input, init);
  };
}

NS.load = function load() {
  if (model) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    installFetchShim();
    await tf.ready();
    // Threshold is unused — we read raw probabilities and threshold per the
    // user's sensitivity in the content script.
    model = await toxicity.load(0.5);
  })();
  return loadingPromise;
};

// Returns, per input text, the highest toxic probability and its label.
async function runClassify(texts) {
  if (!texts || texts.length === 0) return [];
  await NS.load();
  const predictions = await model.classify(texts);
  const out = texts.map(() => ({ prob: 0, label: null }));
  for (const p of predictions) {
    const results = p.results || [];
    for (let i = 0; i < results.length; i++) {
      const probs = results[i].probabilities;
      const toxicProb = probs && probs.length > 1 ? probs[1] : 0;
      if (toxicProb > out[i].prob) out[i] = { prob: toxicProb, label: p.label };
    }
  }
  return out;
}

// Serialize every classify() through one chain so the single shared model is
// never run concurrently — even when several tabs request at once.
let classifyChain = Promise.resolve();
NS.classify = function classify(texts) {
  const result = classifyChain.then(() => runClassify(texts));
  classifyChain = result.catch(() => {}); // a failure must not break the chain
  return result;
};

Object.defineProperty(NS, "isLoaded", { get: () => !!model });

console.log("[Sieve] Layer-2 model bundle ready.");

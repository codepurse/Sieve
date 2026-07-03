// common/toxic-model-cache.js
// Sieve — download + cache helper for the OPTIONAL toxicity model (Module 4A,
// Layer 2). Plain JS, no TensorFlow.js. Runs in extension-origin contexts only
// (options page now; the offscreen inference document in Step 7) so they share
// one Cache API store. Content scripts never call this — they live in the web
// page's origin and talk to the offscreen document instead.
//
// What it does:
//   - download(onProgress): fetch every model file once (skipping anything
//     already cached, so an interrupted download resumes), store each in the
//     Cache API keyed by its real URL, and report byte progress.
//   - isReady(): offline check — are all files present in the cache?
//   - clear(): delete the cached model (frees ~55 MB).
//   - getResponse(url): hand a cached file back to Step 7's model loader.
//
// Source: Google's still-live tfjs-models bucket. (The toxicity package's own
// hardcoded tfhub.dev URL is dead; this bucket mirrors both models.) Downloading
// weights sends NO user data — it's just the model files.

(() => {
  "use strict";

  const NS = (self.SieveModelCache = self.SieveModelCache || {});

  const CACHE_NAME = "sieve-toxicity-model-v1";
  const BASE = "https://storage.googleapis.com/tfjs-models/savedmodel/";

  // Each model = a model.json (whose manifest lists the weight shards) plus any
  // non-weight extra files it needs (the encoder ships a vocabulary).
  const MODELS = [
    { dir: "toxicity", extras: [] },
    { dir: "universal_sentence_encoder", extras: ["vocab.json"] },
  ];

  // Read a model.json (from cache if present, else network) and return its URL +
  // the URLs of its weight shards. `allowNetwork=false` makes this fully offline.
  async function modelFiles(cache, dir, allowNetwork) {
    const modelJsonUrl = BASE + dir + "/model.json";
    let res = await cache.match(modelJsonUrl);
    if (!res) {
      if (!allowNetwork) return null;
      res = await fetch(modelJsonUrl);
      if (!res.ok) throw new Error("model.json HTTP " + res.status + " (" + dir + ")");
      await cache.put(modelJsonUrl, res.clone());
    }
    const json = await res.clone().json();
    const shards = (json.weightsManifest || []).flatMap((w) => w.paths || []);
    return { modelJsonUrl, shardUrls: shards.map((s) => BASE + dir + "/" + s) };
  }

  // Full list of every URL that makes up the model.
  async function allUrls(cache, allowNetwork) {
    const urls = [];
    for (const m of MODELS) {
      const f = await modelFiles(cache, m.dir, allowNetwork);
      if (!f) return null; // offline check: a model.json is missing → not ready
      urls.push(f.modelJsonUrl);
      for (const e of m.extras) urls.push(BASE + m.dir + "/" + e);
      urls.push(...f.shardUrls);
    }
    return urls;
  }

  // Are all model files already cached? (Offline — never hits the network.)
  async function isReady() {
    try {
      const cache = await caches.open(CACHE_NAME);
      const urls = await allUrls(cache, false);
      if (!urls) return false;
      for (const u of urls) {
        if (!(await cache.match(u))) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Sum the byte sizes of every file (cached size if present, else a HEAD).
  async function totalBytes(cache, urls) {
    const sizes = [];
    let total = 0;
    for (const u of urls) {
      const cached = await cache.match(u);
      if (cached) {
        const n = Number(cached.headers.get("content-length")) || 0;
        sizes.push(n);
        total += n;
        continue;
      }
      let n = 0;
      try {
        const h = await fetch(u, { method: "HEAD" });
        n = Number(h.headers.get("content-length")) || 0;
      } catch {
        /* size unknown — counts as 0 toward the total */
      }
      sizes.push(n);
      total += n;
    }
    return { sizes, total };
  }

  // Download everything (skipping cached files), reporting { loaded, total,
  // fraction } as bytes arrive. Throws on any failed file.
  async function download(onProgress) {
    const cache = await caches.open(CACHE_NAME);
    const urls = await allUrls(cache, true);
    const { sizes, total } = await totalBytes(cache, urls);

    let loaded = 0;
    const report = () =>
      onProgress &&
      onProgress({ loaded, total, fraction: total > 0 ? Math.min(loaded / total, 1) : 0 });
    report();

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      if (await cache.match(u)) {
        loaded += sizes[i];
        report();
        continue;
      }
      const res = await fetch(u);
      if (!res.ok) throw new Error(u + " -> HTTP " + res.status);

      // Stream so we can count bytes for the progress bar.
      const reader = res.body.getReader();
      const chunks = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        report();
      }

      // Rebuild a Response from the bytes, preserving content-type so TF.js
      // reads model.json / weight shards correctly in Step 7.
      const body = new Blob(chunks);
      const headers = new Headers();
      const ct = res.headers.get("content-type");
      if (ct) headers.set("content-type", ct);
      headers.set("content-length", String(body.size));
      await cache.put(u, new Response(body, { status: 200, headers }));
    }
    return true;
  }

  async function clear() {
    return caches.delete(CACHE_NAME);
  }

  async function getResponse(url) {
    const cache = await caches.open(CACHE_NAME);
    return cache.match(url);
  }

  NS.CACHE_NAME = CACHE_NAME;
  NS.BASE = BASE;
  NS.MODELS = MODELS;
  NS.isReady = isReady;
  NS.download = download;
  NS.clear = clear;
  NS.getResponse = getResponse;
})();

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

  // Cache entries are keyed by CANONICAL_BASE regardless of which mirror served
  // the bytes, so switching mirrors never orphans an existing download. It stays
  // the Google URL because that is what already-downloaded users have in their
  // cache — changing it would make every one of them re-download 55 MB.
  const CANONICAL_BASE = "https://storage.googleapis.com/tfjs-models/savedmodel/";

  // Tried in order. Our own mirror is first: multiple users could not reach
  // Google's bucket at all (a VPN, a custom DNS resolver or a browser shield
  // refusing the request before it left the browser), and "download failed"
  // with no way forward is worse than a slower host. Google stays as the
  // fallback in case the mirror is the one being blocked.
  const MIRRORS = [
    "https://raw.githubusercontent.com/codepurse/Sieve/main/models/",
    "https://storage.googleapis.com/tfjs-models/savedmodel/",
  ];

  // Decompressed size of every file, recorded from the upstream source. Used for
  // two things, both of which content-length cannot do:
  //
  //   - the download total, so the progress bar is exact and needs no HEAD
  //     round-trips before starting
  //   - detecting a truncated file, which would otherwise load as a working
  //     model that quietly behaves wrongly
  //
  // content-length is unusable for either. A mirror may serve a file gzipped, in
  // which case the header carries the COMPRESSED length while the browser hands
  // back the decompressed body: raw.githubusercontent.com reports 83,444 bytes
  // for vocab.json and delivers 218,327. Comparing the two rejected a perfectly
  // good file. These figures are the decoded truth and do not vary by mirror.
  const EXPECTED_BYTES = {
    "toxicity/model.json": 173234,
    "toxicity/group1-shard1of7": 4194304,
    "toxicity/group1-shard2of7": 4194304,
    "toxicity/group1-shard3of7": 4194304,
    "toxicity/group1-shard4of7": 4194304,
    "toxicity/group1-shard5of7": 4194304,
    "toxicity/group1-shard6of7": 4194304,
    "toxicity/group1-shard7of7": 4086004,
    "universal_sentence_encoder/model.json": 247026,
    "universal_sentence_encoder/vocab.json": 218327,
    "universal_sentence_encoder/group1-shard1of7": 4194304,
    "universal_sentence_encoder/group1-shard2of7": 4194304,
    "universal_sentence_encoder/group1-shard3of7": 4194304,
    "universal_sentence_encoder/group1-shard4of7": 4194304,
    "universal_sentence_encoder/group1-shard5of7": 4194304,
    "universal_sentence_encoder/group1-shard6of7": 4194304,
    "universal_sentence_encoder/group1-shard7of7": 2737832,
  };

  // Each model = a model.json (whose manifest lists the weight shards) plus any
  // non-weight extra files it needs (the encoder ships a vocabulary).
  const MODELS = [
    { dir: "toxicity", extras: [] },
    { dir: "universal_sentence_encoder", extras: ["vocab.json"] },
  ];

  // The path of a file relative to whichever base serves it, e.g.
  // "toxicity/group1-shard1of7". Cache keys are canonical; fetches are not.
  function canonicalUrl(relPath) {
    return CANONICAL_BASE + relPath;
  }

  function relPathOf(canonical) {
    return canonical.startsWith(CANONICAL_BASE) ? canonical.slice(CANONICAL_BASE.length) : canonical;
  }

  // Fetches one file, trying each mirror in turn. Only the last failure is
  // reported, since that is the one the user can act on — but every attempt is
  // logged so a mirror going bad is visible rather than merely slow.
  async function fetchFromMirrors(relPath) {
    let lastError = null;
    for (const base of MIRRORS) {
      const url = base + relPath;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          lastError = new Error(relPath + " HTTP " + res.status);
          console.warn("[Sieve] mirror returned HTTP " + res.status + ": " + url);
          continue;
        }
        return res;
      } catch (err) {
        lastError = err;
        console.warn("[Sieve] mirror unreachable: " + url + " (" + (err && err.message) + ")");
      }
    }
    throw lastError || new Error("No mirror could serve " + relPath);
  }

  // Read a model.json (from cache if present, else network) and return its URL +
  // the URLs of its weight shards. `allowNetwork=false` makes this fully offline.
  async function modelFiles(cache, dir, allowNetwork) {
    const modelJsonUrl = canonicalUrl(dir + "/model.json");
    let res = await cache.match(modelJsonUrl);
    if (!res) {
      if (!allowNetwork) return null;
      res = await fetchFromMirrors(dir + "/model.json");
      await cache.put(modelJsonUrl, res.clone());
    }
    const json = await res.clone().json();
    const shards = (json.weightsManifest || []).flatMap((w) => w.paths || []);
    return { modelJsonUrl, shardUrls: shards.map((s) => canonicalUrl(dir + "/" + s)) };
  }

  // Full list of every URL that makes up the model.
  async function allUrls(cache, allowNetwork) {
    const urls = [];
    for (const m of MODELS) {
      const f = await modelFiles(cache, m.dir, allowNetwork);
      if (!f) return null; // offline check: a model.json is missing → not ready
      urls.push(f.modelJsonUrl);
      for (const e of m.extras) urls.push(canonicalUrl(m.dir + "/" + e));
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

  // Sum the byte sizes of every file, from the recorded table rather than the
  // network. This previously sent a HEAD request per file to the canonical host
  // — the very host that may be unreachable — and swallowed the failure, so
  // every size came back 0, the total was 0, and the progress bar sat at nothing
  // for the whole download. A user reported exactly that. Reading known values
  // removes 17 round-trips and cannot fail.
  async function totalBytes(cache, urls) {
    const sizes = [];
    let total = 0;
    for (const u of urls) {
      const rel = relPathOf(u);
      let n = EXPECTED_BYTES[rel] || 0;
      if (!n) {
        // Not in the table (an upstream layout change): fall back to whatever a
        // cached copy reports, so the total degrades rather than breaking.
        const cached = await cache.match(u);
        n = cached ? Number(cached.headers.get("content-length")) || 0 : 0;
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
      const rel = relPathOf(u);
      const res = await fetchFromMirrors(rel);
      const expected = EXPECTED_BYTES[rel] || 0;

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

      // A short file must not be cached. A truncated weight shard still loads
      // as a model — it just behaves wrongly, which is far harder to notice
      // than a failed download and impossible for a user to diagnose.
      if (expected > 0 && body.size !== expected) {
        throw new Error(
          rel + " is the wrong size (" + body.size + " bytes, expected " + expected + ")"
        );
      }

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
  // Kept as `BASE` for anything that still reads it: it is the canonical URL
  // prefix that cache entries are keyed by, which is what callers actually
  // want. `MIRRORS` is where the bytes may come from and is exposed separately.
  NS.BASE = CANONICAL_BASE;
  NS.CANONICAL_BASE = CANONICAL_BASE;
  NS.MIRRORS = MIRRORS.slice();
  NS.MODELS = MODELS;
  NS.isReady = isReady;
  NS.download = download;
  NS.clear = clear;
  NS.getResponse = getResponse;
})();

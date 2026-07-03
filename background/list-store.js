// background/list-store.js
// Sieve — IndexedDB-backed store for the LARGE fetched domain lists (scam,
// piracy, phishing, malware, cryptojacking, ai-slop, fraud).
//
// WHY THIS EXISTS
// These lists are hundreds of thousands of domains each — multi-MB JSON arrays.
// They used to live in chrome.storage.local alongside the small settings keys.
// Chrome keeps a storage area's data together and serializes access to it, so a
// few multi-MB arrays made EVERY storage.local.get slow — even a one-key read
// for a toggle on the options page stalled (~2s) behind that bloated area and
// the daily list-refresh writes. Moving the big arrays into IndexedDB (each list
// = one record, off the storage.local hot path) keeps settings reads instant.
//
// Only the big arrays live here. Small values (counts, timestamps, toggles) stay
// in chrome.storage.local, which is where the popup/options UI reads them.
//
// Runs in the service worker (module worker) — IndexedDB is available there.

const DB_NAME = "sieve-lists";
const STORE_NAME = "domainLists";
const DB_VERSION = 1;

let dbPromise = null;

// Open (once) and cache the connection. Recreated only if it errors/closes.
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // key = list name, value = string[]
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    dbPromise = null; // allow a later retry after a failed open
    throw err;
  });
  return dbPromise;
}

// Read one list's array. Returns [] when the record is missing or not an array,
// so callers can treat "no list yet" and "empty list" identically.
async function idbGetList(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error);
  });
}

// Store one list's array under `key`, replacing any previous value.
export async function setBigList(key, list) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(list, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function idbDeleteList(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Read a big list. Prefers IndexedDB; if empty, transparently migrates any legacy
// copy still sitting in chrome.storage.local (from a version before this store
// existed) and returns it. This makes reads self-healing regardless of whether
// the eager migrateBigLists() below has run yet, so callers never see a gap.
export async function getBigList(key) {
  try {
    const fromIdb = await idbGetList(key);
    if (fromIdb.length) return fromIdb;
  } catch (err) {
    console.error(`[Sieve] list-store: IndexedDB read of "${key}" failed:`, err);
  }
  // Nothing in IndexedDB — fall back to (and clean up) any legacy storage.local copy.
  const legacy = await chrome.storage.local.get(key);
  const arr = legacy[key];
  if (Array.isArray(arr) && arr.length) {
    try {
      await setBigList(key, arr);
      await chrome.storage.local.remove(key);
    } catch (err) {
      console.error(`[Sieve] list-store: lazy migration of "${key}" failed:`, err);
    }
    return arr;
  }
  return [];
}

// One-time cleanup: move any of the given keys still stored in chrome.storage.local
// into IndexedDB and remove them from storage.local, so the storage.local area
// stays small and every settings read is fast. Idempotent — once a key is gone
// from storage.local this is a cheap no-op, so it's safe to call on every startup.
// Migrates one key at a time to keep the service worker's peak memory low.
export async function migrateBigLists(keys) {
  for (const key of keys) {
    try {
      const got = await chrome.storage.local.get(key);
      const arr = got[key];
      if (!Array.isArray(arr)) continue; // never stored here (or already migrated)
      if (arr.length) await setBigList(key, arr);
      await chrome.storage.local.remove(key);
      console.log(`[Sieve] list-store: migrated "${key}" (${arr.length} domains) to IndexedDB.`);
    } catch (err) {
      console.error(`[Sieve] list-store: migration of "${key}" failed:`, err);
    }
  }
}

// Delete a list entirely (not used by the blockers today, but rounds out the API
// and keeps the store tidy if a list is ever retired).
export { idbDeleteList as deleteBigList };

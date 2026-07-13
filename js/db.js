/**
 * CricketHub — db.js
 * IndexedDB wrapper for persistent storage
 */

const DB_NAME    = 'CricketHubDB';
const DB_VERSION = 1;

// Store names
export const STORES = {
  MATCHES:  'matches',
  TEAMS:    'teams',
  SETTINGS: 'settings'
};

let _db = null;

/**
 * Open (or create) the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Matches store
      if (!db.objectStoreNames.contains(STORES.MATCHES)) {
        const matchStore = db.createObjectStore(STORES.MATCHES, { keyPath: 'id' });
        matchStore.createIndex('status',    'status',       { unique: false });
        matchStore.createIndex('createdAt', 'createdAt',    { unique: false });
      }

      // Teams store
      if (!db.objectStoreNames.contains(STORES.TEAMS)) {
        db.createObjectStore(STORES.TEAMS, { keyPath: 'id' });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

/**
 * Generic get all from a store
 */
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Generic get by key
 */
export async function getById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Generic put (insert or update)
 */
export async function put(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Generic delete by key
 */
export async function deleteById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Clear all records from a store
 */
export async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Save a setting value
 */
export async function saveSetting(key, value) {
  return put(STORES.SETTINGS, { key, value });
}

/**
 * Get a setting value
 */
export async function getSetting(key, defaultValue = null) {
  const record = await getById(STORES.SETTINGS, key);
  return record ? record.value : defaultValue;
}

/**
 * Save current match (convenience wrapper)
 */
export async function saveMatch(match) {
  match.updatedAt = Date.now();
  return put(STORES.MATCHES, match);
}

/**
 * Get all matches sorted by most recent
 */
export async function getAllMatches() {
  const matches = await getAll(STORES.MATCHES);
  return matches.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Get unfinished (in-progress) matches
 */
export async function getActiveMatches() {
  const all = await getAllMatches();
  return all.filter(m => m.status !== 'complete');
}

/**
 * Export all data as JSON string
 */
export async function exportAllData() {
  const [matches, teams, settings] = await Promise.all([
    getAll(STORES.MATCHES),
    getAll(STORES.TEAMS),
    getAll(STORES.SETTINGS)
  ]);
  return JSON.stringify({ matches, teams, settings, exportedAt: Date.now(), version: 1 }, null, 2);
}

/**
 * Import data from JSON string
 */
export async function importAllData(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.version) throw new Error('Invalid backup format');

  // Clear existing data
  await Promise.all([
    clearStore(STORES.MATCHES),
    clearStore(STORES.TEAMS),
    clearStore(STORES.SETTINGS)
  ]);

  // Import records
  const db = await openDB();
  const tx = db.transaction([STORES.MATCHES, STORES.TEAMS, STORES.SETTINGS], 'readwrite');

  data.matches?.forEach(m => tx.objectStore(STORES.MATCHES).put(m));
  data.teams?.forEach(t => tx.objectStore(STORES.TEAMS).put(t));
  data.settings?.forEach(s => tx.objectStore(STORES.SETTINGS).put(s));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Reset the entire database (nuclear option)
 */
export async function resetDatabase() {
  await Promise.all([
    clearStore(STORES.MATCHES),
    clearStore(STORES.TEAMS),
    clearStore(STORES.SETTINGS)
  ]);
}

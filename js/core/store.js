// Encrypted on-device storage (IndexedDB + AES-GCM).
// - 'data' and 'sessions' hold ONLY ciphertext.
// - 'meta' holds the key material (non-extractable CryptoKey, or a PIN-wrapped key),
//   the PIN lockout counter and the reminder settings that the service worker needs.
//   It holds no health data.
import {
  newDataKey, encryptJSON, decryptJSON, wrapWithSecret, unwrapWithSecret, encryptBackup, decryptBackup,
} from './crypto.js';

const DB_NAME = 'aivoavi';
const DB_VERSION = 1;

let db = null;
let key = null;          // CryptoKey for data, in memory only while unlocked
const cache = new Map(); // decrypted key-value records
let sessions = [];       // decrypted sessions (sorted by time)

const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const txDone = (tx) => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });

export function openDB() {
  if (db) return Promise.resolve(db);
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      if (!d.objectStoreNames.contains('data')) d.createObjectStore('data');
      if (!d.objectStoreNames.contains('sessions')) d.createObjectStore('sessions', { autoIncrement: true });
    };
    r.onsuccess = () => { db = r.result; res(db); };
    r.onerror = () => rej(r.error);
  });
}

async function metaGet(k) { await openDB(); return req(db.transaction('meta').objectStore('meta').get(k)); }
async function metaPut(k, v) {
  await openDB();
  const tx = db.transaction('meta', 'readwrite');
  tx.objectStore('meta').put(v, k);
  return txDone(tx);
}

async function loadAll() {
  cache.clear();
  sessions = [];
  const tx = db.transaction(['data', 'sessions']);
  const dataStore = tx.objectStore('data');
  const sStore = tx.objectStore('sessions');
  // Issue every request before awaiting so the transaction stays alive.
  const [keys, vals, sKeys, sVals] = await Promise.all([
    req(dataStore.getAllKeys()), req(dataStore.getAll()), req(sStore.getAllKeys()), req(sStore.getAll()),
  ]);
  for (let i = 0; i < keys.length; i++) cache.set(keys[i], await decryptJSON(key, vals[i]));
  for (let i = 0; i < sKeys.length; i++) sessions.push({ ...(await decryptJSON(key, sVals[i])), id: sKeys[i] });
  sessions.sort((a, b) => (a.at < b.at ? -1 : 1));
}

export const store = {
  async hasAccount() { return !!(await metaGet('key')); },
  async lockType() { const m = await metaGet('key'); return m ? m.type : null; },
  isUnlocked() { return !!key; },

  /** First run: create a fresh non-extractable device key and save initial records. */
  async create(records) {
    await openDB();
    key = await newDataKey(false);
    await metaPut('key', { type: 'device', key });
    for (const [k, v] of Object.entries(records)) await this.set(k, v);
  },

  async unlockDevice() {
    const m = await metaGet('key');
    if (!m || m.type !== 'device') throw new Error('No device key');
    key = m.key;
    await loadAll();
  },

  async lockout() { return (await metaGet('lockout')) || { fails: 0, until: 0 }; },

  /** Unlock with a PIN. Returns {ok} or {ok:false, waitMs}. Brute force is slowed by PBKDF2 + lockout. */
  async unlockPin(pin) {
    const lo = await this.lockout();
    if (Date.now() < lo.until) return { ok: false, waitMs: lo.until - Date.now() };
    const m = await metaGet('key');
    try {
      key = await unwrapWithSecret(m, pin, false);
    } catch {
      const fails = lo.fails + 1;
      const until = fails >= 5 ? Date.now() + Math.min(3600e3, 30e3 * 2 ** (fails - 5)) : 0;
      await metaPut('lockout', { fails, until });
      return { ok: false, waitMs: until ? until - Date.now() : 0 };
    }
    await metaPut('lockout', { fails: 0, until: 0 });
    await loadAll();
    return { ok: true };
  },

  async verifyPin(pin) {
    const m = await metaGet('key');
    if (!m || m.type !== 'pin') return true;
    try { await unwrapWithSecret(m, pin, false); return true; } catch { return false; }
  },

  get(k, fallback = null) { return cache.has(k) ? structuredClone(cache.get(k)) : fallback; },

  async set(k, v) {
    const rec = await encryptJSON(key, v);
    const tx = db.transaction('data', 'readwrite');
    tx.objectStore('data').put(rec, k);
    await txDone(tx);
    cache.set(k, structuredClone(v));
  },

  sessions() { return sessions; },

  async addSession(s) {
    const rec = await encryptJSON(key, s);
    const tx = db.transaction('sessions', 'readwrite');
    const r = tx.objectStore('sessions').add(rec);
    await txDone(tx);
    const saved = { ...s, id: r.result };
    sessions.push(saved);
    return saved;
  },

  /** Re-encrypt everything with a brand-new key (used when adding/changing a PIN). */
  async _rekey(newKey) {
    // Encrypt first (async crypto can't run inside an IDB transaction), then write in one transaction.
    const dataRecs = [];
    for (const [k, v] of cache) dataRecs.push([k, await encryptJSON(newKey, v)]);
    const sRecs = [];
    for (const s of sessions) { const { id, ...rest } = s; sRecs.push([id, await encryptJSON(newKey, rest)]); }
    const tx = db.transaction(['data', 'sessions'], 'readwrite');
    for (const [k, rec] of dataRecs) tx.objectStore('data').put(rec, k);
    for (const [id, rec] of sRecs) tx.objectStore('sessions').put(rec, id);
    await txDone(tx);
  },

  async setPin(pin) {
    const fresh = await newDataKey(true);         // extractable only so it can be wrapped
    await this._rekey(fresh);
    const w = await wrapWithSecret(fresh, pin);
    await metaPut('key', { type: 'pin', ...w });
    await metaPut('lockout', { fails: 0, until: 0 });
    key = await unwrapWithSecret(w, pin, false);  // keep a non-extractable copy in memory
  },

  async removePin() {
    // Re-encrypt with a new non-extractable device key so the old PIN-wrapped key is useless.
    const fresh = await newDataKey(false);
    await this._rekey(fresh);
    await metaPut('key', { type: 'device', key: fresh });
    key = fresh;
  },

  // Reminder info the service worker reads. Contains no health data.
  async getNotifyMeta() { return (await metaGet('notify')) || { enabled: false, time: null, lastPlayedDay: null }; },
  async setNotifyMeta(patch) { await metaPut('notify', { ...(await this.getNotifyMeta()), ...patch }); },

  async exportBackup(password) {
    const payload = { data: Object.fromEntries(cache), sessions: sessions.map(({ id, ...s }) => s), exportedAt: new Date().toISOString() };
    return encryptBackup(payload, password);
  },

  async importBackup(text, password) {
    const payload = await decryptBackup(text, password); // throws on wrong password
    if (!payload || typeof payload.data !== 'object' || !Array.isArray(payload.sessions)) throw new Error('Bad backup');
    const tx = db.transaction(['data', 'sessions'], 'readwrite');
    tx.objectStore('data').clear();
    tx.objectStore('sessions').clear();
    await txDone(tx);
    cache.clear(); sessions = [];
    for (const [k, v] of Object.entries(payload.data)) await this.set(k, v);
    for (const s of payload.sessions) await this.addSession(s);
    sessions.sort((a, b) => (a.at < b.at ? -1 : 1));
  },

  /** Delete everything: database, caches, service worker, local storage. */
  async wipe() {
    key = null; cache.clear(); sessions = [];
    if (db) { db.close(); db = null; }
    await new Promise((res) => { const r = indexedDB.deleteDatabase(DB_NAME); r.onsuccess = r.onerror = r.onblocked = () => res(); });
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
    if (globalThis.caches) for (const k of await caches.keys()) await caches.delete(k);
    if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  },
};

// All cryptography uses the browser's built-in Web Crypto API. Nothing leaves the device.
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 600000; // OWASP 2023 recommendation for PBKDF2-SHA256

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** New AES-GCM 256 data key. extractable=false means scripts can never read the raw key bytes. */
export function newDataKey(extractable = false) {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);
}

export async function encryptJSON(key, value) {
  const iv = randomBytes(12);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { iv, ct: new Uint8Array(ct) };
}

export async function decryptJSON(key, rec) {
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, key, rec.ct);
  return JSON.parse(dec.decode(pt));
}

/** Derive a key-encryption key from a PIN/password with PBKDF2-SHA256. */
export async function deriveKEK(secret, salt, iterations = PBKDF2_ITERATIONS) {
  const base = await subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );
}

/** Wrap (encrypt) an extractable data key with a PIN. Returns everything needed to unwrap later. */
export async function wrapWithSecret(dataKey, secret) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const kek = await deriveKEK(secret, salt);
  const wrapped = new Uint8Array(await subtle.wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv }));
  return { salt, iv, wrapped, iterations: PBKDF2_ITERATIONS };
}

/** Unwrap a data key. Throws if the PIN is wrong (AES-GCM authentication fails). */
export async function unwrapWithSecret(w, secret, extractable = false) {
  const kek = await deriveKEK(secret, w.salt, w.iterations);
  return subtle.unwrapKey('raw', w.wrapped, kek, { name: 'AES-GCM', iv: w.iv },
    { name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);
}

// ---- Backup files (password-encrypted JSON) ----
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptBackup(payload, password) {
  const salt = randomBytes(16);
  const key = await deriveKEK(password, salt);
  const { iv, ct } = await encryptJSON(key, payload);
  // chunked base64 to avoid call-stack limits on big arrays
  let s = '';
  for (let i = 0; i < ct.length; i += 0x8000) s += String.fromCharCode(...ct.subarray(i, i + 0x8000));
  return JSON.stringify({ app: 'aivoavi', v: 1, kdf: 'PBKDF2-SHA256', iterations: PBKDF2_ITERATIONS, salt: b64(salt), iv: b64(iv), ct: btoa(s) });
}

export async function decryptBackup(text, password) {
  const f = JSON.parse(text);
  if (f.app !== 'aivoavi' || f.v !== 1) throw new Error('Not an aivOavi backup');
  const key = await deriveKEK(password, unb64(f.salt), f.iterations);
  return decryptJSON(key, { iv: unb64(f.iv), ct: unb64(f.ct) });
}

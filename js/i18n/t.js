import { strings, content } from './en.js';

/** Translate a key, filling {placeholders} from vars. */
export function t(key, vars) {
  let s = strings[key];
  if (s === undefined) {
    console.warn('[i18n] missing key:', key);
    return key;
  }
  if (typeof s === 'string' && vars) {
    s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
  }
  return s;
}

/** Pick a random entry from a string-array key (e.g. cheers). */
export function tPick(key) {
  const arr = strings[key];
  return arr[Math.floor(Math.random() * arr.length)];
}

export { content };

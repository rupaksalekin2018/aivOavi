// Soft, generated sounds (Web Audio). No audio files, nothing downloaded.
import { store } from './store.js';

let ctx = null;
function audio() {
  if (!ctx) { const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, vol = 0.12) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.05);
}

const enabled = () => store.isUnlocked() && store.get('settings', {}).sound !== false;

export const sound = {
  tap() { if (enabled()) tone(660, 0, 0.08, 0.05); },
  good() { if (enabled()) { tone(523, 0, 0.18); tone(659, 0.1, 0.2); } },
  soft() { if (enabled()) tone(330, 0, 0.25, 0.07); },
  win() { if (enabled()) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3)); },
  tile(i) { if (enabled()) tone([392, 523, 659, 784][i % 4], 0, 0.35, 0.1); },
};

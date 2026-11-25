// Read-aloud using ONLY on-device voices (voice.localService === true), so no text is sent to a cloud voice.
let voice = null;

function pickVoice() {
  if (!('speechSynthesis' in globalThis)) return null;
  const vs = speechSynthesis.getVoices().filter((v) => v.localService && /^en/i.test(v.lang));
  voice = vs.find((v) => v.default) || vs[0] || null;
  return voice;
}
if ('speechSynthesis' in globalThis) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speechAvailable() { return !!(voice || pickVoice()); }

/** Speak text. Returns false if no on-device voice exists. */
export function speak(text) {
  if (!text || !speechAvailable()) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.88; // a little slower than normal for clarity
  u.pitch = 1.05;
  speechSynthesis.speak(u);
  return true;
}

export function stopSpeech() { if ('speechSynthesis' in globalThis) speechSynthesis.cancel(); }

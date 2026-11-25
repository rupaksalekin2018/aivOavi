// aivOavi app shell: boot, hash router, top bar, shared helpers for screens.
import { store } from './core/store.js';
import { speak, stopSpeech } from './core/speech.js';
import { scheduleInApp } from './core/notify.js';
import { h, logo, toast } from './ui/components.js';
import { t } from './i18n/t.js';

import * as lock from './screens/lock.js';
import * as onboard from './screens/onboard.js';
import * as home from './screens/home.js';
import * as play from './screens/play.js';
import * as games from './screens/games.js';
import * as check from './screens/check.js';
import * as progress from './screens/progress.js';
import * as garden from './screens/garden.js';
import * as settings from './screens/settings.js';
import * as caregiver from './screens/caregiver.js';
import * as summary from './screens/summary.js';

const routes = { home, play, game: play, games, check, progress, garden, settings, caregiver, summary };

const main = document.getElementById('main');
const topbar = document.getElementById('topbar');
let cleanup = null;
let interacted = false;
let caregiverUntil = 0;
document.addEventListener('pointerdown', () => { interacted = true; }, { once: true, capture: true });
document.addEventListener('keydown', () => { interacted = true; }, { once: true, capture: true });

function guessHemisphere() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (/^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham)|^America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|Punta_Arenas)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Maseru|Mbabane)/.test(tz)) return 'south';
  if (/^Asia\/(Singapore|Jakarta|Kuala_Lumpur|Manila|Bangkok|Ho_Chi_Minh|Colombo|Dhaka|Kolkata|Calcutta|Yangon)|^Africa\/(Lagos|Accra|Nairobi|Kampala|Addis_Ababa)|^America\/(Bogota|Caracas|Lima|Guayaquil|Panama)/.test(tz)) return 'off';
  return 'north';
}

export const DEFAULT_SETTINGS = {
  easy: false, textSize: 1, autoRead: false, sound: true, calm: false,
  hemisphere: guessHemisphere(), reminder: 'morning',
};

export const app = {
  speech: '',
  navigate(path) {
    const target = '#/' + path;
    if (location.hash === target) route(); else location.hash = target;
  },
  settings() { return { ...DEFAULT_SETTINGS, ...store.get('settings', {}) }; },
  async saveSettings(patch) {
    const s = { ...this.settings(), ...patch };
    await store.set('settings', s);
    applySettings(s);
    return s;
  },
  easy() { return !!this.settings().easy; },
  /** Text that the 🔊 button reads. Auto-read if the user turned that on. */
  setSpeech(text) {
    this.speech = text;
    if (store.isUnlocked() && this.settings().autoRead && interacted) speak(text);
  },
  /** Used by games for short cues (only spoken when auto-read is on). */
  say(text) { if (store.isUnlocked() && app.settings().autoRead && interacted) speak(text); },
  readNow() {
    if (!app.speech) return;
    if (!speak(app.speech)) toast(t('speechNone'));
  },
  caregiverOk() { return Date.now() < caregiverUntil; },
  grantCaregiver() { caregiverUntil = Date.now() + 10 * 60 * 1000; },
  route: () => route(),
  /** Called once the data is unlocked (device key or PIN). */
  onUnlocked() { applySettings(app.settings()); afterUnlock(); },
};

export function applySettings(s) {
  const root = document.documentElement;
  root.classList.remove('ts-1', 'ts-2', 'ts-3');
  root.classList.add(`ts-${s.textSize || 1}`);
  root.classList.toggle('no-motion', !!s.calm);
}

function renderTopbar({ show, homeBtn }) {
  topbar.hidden = !show;
  if (!show) return;
  topbar.replaceChildren(
    homeBtn
      ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('home'), onclick: () => app.navigate('home') },
        h('span', { class: 'ico', 'aria-hidden': 'true', text: '🏠' }), h('span', { text: t('home') }))
      : h('span', { class: 'icon-btn', 'aria-hidden': 'true', style: { visibility: 'hidden' } }),
    logo(),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('readAloud'), onclick: () => app.readNow() },
      h('span', { class: 'ico', 'aria-hidden': 'true', text: '🔊' }), h('span', { text: t('readAloud') })),
  );
}

async function route() {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  stopSpeech();
  document.getElementById('overlay').replaceChildren();
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  let screen, topCfg = { show: true, homeBtn: name !== 'home' && name !== '' };

  if (!(await store.hasAccount())) {
    screen = onboard; topCfg = { show: true, homeBtn: false };
  } else if (!store.isUnlocked()) {
    if ((await store.lockType()) === 'device') {
      await store.unlockDevice();
      app.onUnlocked();
      return route();
    }
    screen = lock; topCfg = { show: true, homeBtn: false };
  } else {
    screen = routes[name] || home;
    if (!routes[name]) topCfg.homeBtn = false;
  }
  renderTopbar(topCfg);
  main.replaceChildren();
  app.speech = '';
  try {
    cleanup = (await screen.render(main, params, app)) || null;
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'card stack' }, h('h2', { text: 'Oops, something went wrong.' }), h('p', { class: 'muted', text: String(e && e.message) })));
  }
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

export function afterUnlock() {
  scheduleInApp().catch(() => {});
}

async function boot() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch((e) => console.warn('SW not available', e));
  }
  window.addEventListener('hashchange', route);
  await route();
}

boot();

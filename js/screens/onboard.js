import { store } from '../core/store.js';
import { h, btn, avi, logo, keypad, card, marker } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { REMINDER_TIMES, setReminder, enableNotifications } from '../core/notify.js';
import { DEFAULT_SETTINGS } from '../app.js';

export const PATHS = [
  { id: 'check', icon: '🩺', label: 'pathCheck', sub: 'pathCheckSub' },
  { id: 'prevent', icon: '💪', label: 'pathPrevent', sub: 'pathPreventSub' },
  { id: 'train', icon: '🌱', label: 'pathTrain', sub: 'pathTrainSub' },
];

/** Keep names short and plain. */
export const cleanName = (s) => String(s || '').replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 30);

export function render(main, _params, app) {
  const state = { path: null, name: '', reminder: 'morning', pin: null };
  const step = (...children) => main.replaceChildren(h('div', { class: 'stack' }, ...children));
  const STEPS = 5;
  const stepNo = (n) => h('p', { class: 'center muted', text: t('obStep', { n, total: STEPS }) });
  const backBtn = (fn) => btn({ icon: '←', label: t('back'), variant: 'quiet', cls: 'btn-small', onClick: fn });

  function welcome() {
    step(
      h('div', { class: 'center' }, logo('logo-xl')),
      h('div', { class: 'bubble', text: t('obHello') }),
      avi('idle'),
      h('p', { class: 'center', text: t('obHelloBody') }),
      marker('start', t('startHere')),
      btn({ icon: '▶', label: t('obStart'), onClick: why, cls: 'btn-giant' }));
    app.setSpeech(`${t('obHello')} ${t('obHelloBody')}`);
  }

  function why() {
    step(
      stepNo(1),
      h('h1', { text: t('obWhy') }),
      ...PATHS.map((p) => btn({ icon: p.icon, label: t(p.label), sub: t(p.sub), variant: 'secondary', dataset: { path: p.id }, onClick: () => { state.path = p.id; name(); } })),
      backBtn(welcome));
    app.setSpeech(`${t('obWhy')} ${PATHS.map((p) => t(p.label)).join('. ')}`);
  }

  function name() {
    const input = h('input', { class: 'text', type: 'text', id: 'ob-name', autocomplete: 'given-name', maxlength: 30, placeholder: t('obNamePh'), value: state.name });
    const go = () => { state.name = cleanName(input.value); reminder(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    step(
      stepNo(2),
      h('h1', { text: t('obName') }),
      h('label', { class: 'field', for: 'ob-name' }, h('span', { class: 'muted small', text: t('obNameHint') }), input),
      btn({ icon: '➜', label: t('continue'), onClick: go }),
      backBtn(why));
    app.setSpeech(`${t('obName')} ${t('obNameHint')}`);
    setTimeout(() => input.focus(), 50);
  }

  function reminder() {
    const opts = [['morning', '🌅', 'remMorning'], ['afternoon', '☀️', 'remAfternoon'], ['evening', '🌙', 'remEvening'], ['none', '🔕', 'remNone']];
    step(
      stepNo(3),
      h('h1', { text: t('obReminder') }),
      ...opts.map(([id, icon, key]) => btn({ icon, label: t(key), sub: REMINDER_TIMES[id] || '', variant: 'secondary', onClick: async () => {
        state.reminder = id;
        if (id !== 'none') { try { await enableNotifications(); } catch { /* user can enable later */ } }
        pinAsk();
      } })),
      backBtn(name));
    app.setSpeech(t('obReminder'));
  }

  function pinAsk() {
    step(
      stepNo(4),
      h('h1', { text: t('obPin') }),
      h('p', { text: t('obPinBody') }),
      btn({ icon: '🔒', label: t('obPinSet'), variant: 'secondary', onClick: () => pinEnter() }),
      btn({ icon: '➜', label: t('obPinSkip'), variant: 'primary', onClick: () => { state.pin = null; privacy(); } }),
      backBtn(reminder));
    app.setSpeech(`${t('obPin')} ${t('obPinBody')}`);
  }

  function pinEnter(first = null, err = '') {
    const pad = keypad({ submitLabel: t('ok'), onSubmit: (v) => {
      if (!first) return pinEnter(v);
      if (v === first) { state.pin = v; privacy(); } else pinEnter(null, t('pinMismatch'));
    } });
    step(
      h('h1', { text: first ? t('pinRepeat') : t('pinChoose') }),
      err ? h('p', { role: 'alert', class: 'center', text: err }) : null,
      pad, backBtn(pinAsk));
    app.setSpeech(first ? t('pinRepeat') : t('pinChoose'));
    setTimeout(() => pad.focus(), 50);
  }

  function privacy() {
    const lines = t('privacyBody');
    step(
      stepNo(5),
      h('p', { class: 'marker marker-start', text: t('lastStep') }),
      h('h1', {}, '🔐 ', t('obPrivacy')),
      card('card-ok stack', ...lines.map((l) => h('p', { text: '✅ ' + l }))),
      h('p', { class: 'disclaimer small', text: t('ck_disclaimer') }),
      btn({ icon: '🚀', label: t('obGo'), cls: 'btn-giant', onClick: finish }));
    app.setSpeech(`${t('obPrivacy')}. ${lines.join(' ')}`);
  }

  async function finish() {
    main.replaceChildren(h('div', { class: 'boot' }, avi('happy'), h('p', { text: t('loading') })));
    const settings = { ...DEFAULT_SETTINGS, easy: state.path === 'train', autoRead: state.path === 'train', reminder: state.reminder };
    await store.create({
      profile: { name: state.name, path: state.path, createdAt: new Date().toISOString() },
      settings,
      levels: {},
    });
    if (state.pin) await store.setPin(state.pin);
    await setReminder(state.reminder === 'none' ? null : REMINDER_TIMES[state.reminder]);
    app.onUnlocked();
    app.navigate(state.path === 'check' ? 'check' : 'home');
  }

  welcome();
}

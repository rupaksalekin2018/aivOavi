import { store } from '../core/store.js';
import { h, btn, avi, keypad, confirmModal, mood } from '../ui/components.js';
import { t } from '../i18n/t.js';

export async function render(main, _params, app) {
  const msg = h('p', { class: 'center', role: 'alert' });
  const mascot = avi('idle');
  let waitTimer = null;

  async function showWait(ms) {
    clearInterval(waitTimer);
    const until = Date.now() + ms;
    const tick = () => {
      const s = Math.ceil((until - Date.now()) / 1000);
      if (s <= 0) { clearInterval(waitTimer); msg.textContent = ''; return; }
      msg.textContent = t('lockWait', { s });
    };
    tick();
    waitTimer = setInterval(tick, 1000);
  }

  const pad = keypad({ submitLabel: t('unlock'), onSubmit: async (pin) => {
    msg.textContent = t('loading');
    const r = await store.unlockPin(pin);
    if (r.ok) { app.onUnlocked(); app.navigate('home'); return; }
    mood(mascot, 'wiggle');
    if (r.waitMs > 0) showWait(r.waitMs); else msg.textContent = t('lockWrong');
  } });

  const lo = await store.lockout();
  if (Date.now() < lo.until) showWait(lo.until - Date.now());

  main.append(h('div', { class: 'stack' },
    mascot,
    h('h1', { class: 'center', text: t('lockTitle') }),
    h('p', { class: 'center', text: t('lockBody') }),
    pad, msg,
    h('div', { class: 'spacer' }),
    btn({ icon: '🗑️', label: t('pinForgotBtn'), variant: 'quiet', cls: 'btn-small', onClick: async () => {
      if (await confirmModal(t('pinForgotBtn'), t('pinForgot'), t('cg_delete'), t('cancel'))) {
        await store.wipe();
        location.replace(location.pathname + '#/');
        location.reload();
      }
    } })));
  app.setSpeech(`${t('lockTitle')} ${t('lockBody')}`);
  setTimeout(() => pad.focus(), 50);
  return () => clearInterval(waitTimer);
}

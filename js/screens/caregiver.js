import { store } from '../core/store.js';
import { h, btn, card, keypad, modal, confirmModal, toast } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { shuffle, dayKey } from '../core/util.js';
import { segmented } from './settings.js';
import { PATHS } from './onboard.js';

function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function askPassword(title, minLen = 8) {
  const input = h('input', { class: 'text', type: 'password', autocomplete: 'new-password', 'aria-label': t('pass'), minlength: minLen });
  const v = await modal({ title, content: h('label', { class: 'field' }, h('span', { text: t('pass') }), input),
    actions: [{ icon: '✔', label: t('ok'), variant: 'primary', value: () => input.value }, { label: t('cancel'), variant: 'secondary', value: null }] });
  if (v && v.length >= minLen) return v;
  return null;
}

export async function render(main, params, app) {
  const lockType = await store.lockType();

  // ---- Gate: PIN if one is set, otherwise a simple sum (keeps settings away from accidental taps).
  if (!app.caregiverOk()) {
    if (lockType === 'pin') {
      const msg = h('p', { role: 'alert', class: 'center' });
      const pad = keypad({ onSubmit: async (pin) => {
        msg.textContent = t('loading');
        if (await store.verifyPin(pin)) { app.grantCaregiver(); app.route(); } else msg.textContent = t('lockWrong');
      } });
      main.append(h('div', { class: 'stack' }, h('h1', { text: t('cg_title') }), h('p', { text: t('cg_gate_pin') }), pad, msg));
      app.setSpeech(t('cg_gate_pin'));
      return;
    }
    const a = 3 + Math.floor(Math.random() * 6), b = 2 + Math.floor(Math.random() * 6), ans = a + b;
    const opts = shuffle([ans, ans + 1, ans - 2]);
    main.append(h('div', { class: 'stack' },
      h('h1', { text: t('cg_title') }), h('p', { text: t('cg_gate') }),
      h('p', { class: 'prompt', text: t('cg_gate_q', { a, b }) }),
      h('div', { class: 'choices' }, opts.map((o) => h('button', { type: 'button', class: 'choice', text: String(o), onclick: () => {
        if (o === ans) { app.grantCaregiver(); app.route(); } else app.navigate('home');
      } })))));
    app.setSpeech(`${t('cg_gate')} ${t('cg_gate_q', { a, b })}`);
    return;
  }

  // ---- PIN sub-flow
  if (params[0] === 'pin') {
    const first = params[1] || null;
    const pad = keypad({ onSubmit: async (v) => {
      if (!first) return app.navigate(`caregiver/pin/${v}`);
      if (v !== first) { toast(t('pinMismatch')); return app.navigate('caregiver/pin'); }
      main.replaceChildren(h('p', { class: 'center', text: t('loading') }));
      await store.setPin(v);
      toast('🔒 ✓');
      history.replaceState(null, '', '#/caregiver');
      app.route();
    } });
    main.append(h('div', { class: 'stack' }, h('h1', { text: first ? t('pinRepeat') : t('pinChoose') }), pad,
      btn({ icon: '←', label: t('cancel'), variant: 'quiet', onClick: () => app.navigate('caregiver') })));
    // Don't leave the first PIN in browser history.
    if (first) history.replaceState(null, '', '#/caregiver/pin');
    setTimeout(() => pad.focus(), 50);
    app.setSpeech(first ? t('pinRepeat') : t('pinChoose'));
    return;
  }

  const s = app.settings();
  const profile = store.get('profile', {});
  const setProfile = async (patch) => { await store.set('profile', { ...profile, ...patch }); app.route(); };

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async () => {
    const f = fileInput.files[0];
    if (!f || f.size > 20e6) return;
    const pass = await askPassword(t('cg_backup_pass_in'), 1);
    if (!pass) return;
    try { await store.importBackup(await f.text(), pass); toast(t('cg_restore_ok')); app.onUnlocked(); app.route(); } catch { toast(t('cg_restore_bad')); }
  } });

  main.append(h('div', { class: 'stack' },
    h('h1', {}, '🧑‍⚕️ ', t('cg_title')),
    card('stack',
      segmented(t('cg_mode'), [[true, t('on')], [false, t('off')]], !!s.easy, async (v) => { await app.saveSettings({ easy: v }); app.route(); }),
      h('p', { class: 'muted small', text: t('cg_mode_body') })),
    card('stack',
      segmented(t('cg_path'), PATHS.map((p) => [p.id, `${p.icon} ${t(p.label)}`]), profile.path, (v) => setProfile({ path: v }))),
    card('stack',
      h('h2', {}, '🔒 ', t('cg_pin')),
      h('p', { class: 'muted', text: lockType === 'pin' ? t('cg_pin_on') : t('cg_pin_off') }),
      btn({ icon: '🔑', label: lockType === 'pin' ? t('cg_pin_change') : t('cg_pin_add'), variant: 'secondary', onClick: () => app.navigate('caregiver/pin') }),
      lockType === 'pin' ? btn({ icon: '🔓', label: t('cg_pin_remove'), variant: 'quiet', onClick: async () => {
        if (await confirmModal(t('cg_pin_remove'), t('cg_pin_off'))) { await store.removePin(); app.route(); }
      } }) : null),
    h('div', { class: 'grid-2 collapse' },
      btn({ icon: '📈', label: t('cg_details'), variant: 'secondary', onClick: () => app.navigate('progress') }),
      btn({ icon: '🖨️', label: t('cg_summary'), variant: 'secondary', onClick: () => app.navigate('summary') }),
      btn({ icon: '⚙️', label: t('settings'), variant: 'secondary', onClick: () => app.navigate('settings') }),
      btn({ icon: '🎲', label: t('allGames'), variant: 'secondary', onClick: () => app.navigate('games') })),
    card('stack',
      h('h2', {}, '💾 ', t('cg_backup')),
      btn({ icon: '⬇️', label: t('cg_export'), variant: 'secondary', onClick: async () => {
        const pass = await askPassword(t('cg_backup_pass'));
        if (!pass) return;
        download(`aivoavi-backup-${dayKey()}.json`, await store.exportBackup(pass));
        toast(t('cg_backup_ok'));
      } }),
      btn({ icon: '⬆️', label: t('cg_import'), variant: 'secondary', onClick: () => fileInput.click() }),
      fileInput),
    btn({ icon: '🗑️', label: t('cg_delete'), variant: 'danger', onClick: async () => {
      if (await confirmModal(t('cg_delete'), t('cg_delete_confirm'), t('cg_delete'), t('cancel'))) {
        await store.wipe();
        location.replace(location.pathname + '#/');
        location.reload();
      }
    } })));
  app.setSpeech(t('cg_title'));
}

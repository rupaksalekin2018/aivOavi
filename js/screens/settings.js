import { store } from '../core/store.js';
import { h, btn, card, toast } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { REMINDER_TIMES, setReminder, enableNotifications, showReminder, permission, downloadICS } from '../core/notify.js';

/** Row of mutually exclusive big buttons (aria-pressed). */
export function segmented(label, options, current, onPick) {
  return h('div', { class: 'stack', style: { gap: '8px' } },
    h('strong', { text: label }),
    h('div', { class: 'seg', role: 'group', 'aria-label': label }, options.map(([value, text]) => h('button', {
      type: 'button', class: `btn btn-small ${value === current ? 'btn-primary' : 'btn-secondary'}`,
      'aria-pressed': String(value === current), text, onclick: () => onPick(value),
    }))));
}

export async function render(main, _params, app) {
  if (app.easy() && !app.caregiverOk()) return app.navigate('caregiver');
  const s = app.settings();
  const meta = await store.getNotifyMeta();
  const rerender = () => app.route();
  const set = async (patch) => { await app.saveSettings(patch); rerender(); };
  const perm = permission();

  const remKey = meta.enabled ? Object.keys(REMINDER_TIMES).find((k) => REMINDER_TIMES[k] === meta.time) || 'morning' : 'none';
  const permText = perm === 'granted' ? t('st_rem_on') : perm === 'denied' ? t('st_rem_blocked') : perm === 'unsupported' ? t('st_rem_unsupported') : '';

  main.append(h('div', { class: 'stack' },
    h('h1', {}, '⚙️ ', t('st_title')),
    card('stack',
      segmented(t('st_text'), [[1, 'A'], [2, 'A+'], [3, 'A++']], s.textSize, (v) => set({ textSize: v })),
      segmented(t('st_voice'), [[true, t('on')], [false, t('off')]], !!s.autoRead, (v) => set({ autoRead: v })),
      segmented(t('st_sound'), [[true, t('on')], [false, t('off')]], s.sound !== false, (v) => set({ sound: v })),
      segmented(t('st_motion'), [[true, t('on')], [false, t('off')]], !!s.calm, (v) => set({ calm: v }))),
    card('stack',
      h('h2', {}, '🔔 ', t('st_rem')),
      segmented(t('st_rem_time'), [['morning', t('remMorning')], ['afternoon', t('remAfternoon')], ['evening', t('remEvening')], ['none', t('off')]], remKey,
        async (v) => { await setReminder(v === 'none' ? null : REMINDER_TIMES[v]); await app.saveSettings({ reminder: v }); rerender(); }),
      permText ? h('p', { class: perm === 'granted' ? 'status-title' : 'muted', text: permText }) : null,
      perm === 'default' ? btn({ icon: '🔔', label: t('st_rem_enable'), variant: 'secondary', onClick: async () => { await enableNotifications(); rerender(); } }) : null,
      perm === 'granted' ? btn({ icon: '🧪', label: t('st_rem_test'), variant: 'secondary', onClick: () => showReminder(true) }) : null,
      h('p', { class: 'muted small', text: t('st_rem_note') }),
      btn({ icon: '📅', label: t('st_rem_cal'), variant: 'secondary', onClick: () => { downloadICS(meta.time || REMINDER_TIMES.morning); toast('📅 ✓'); } })),
    card('stack',
      segmented(t('st_season'), [['north', t('st_north')], ['south', t('st_south')], ['off', t('st_off')]], s.hemisphere, (v) => set({ hemisphere: v }))),
    btn({ icon: '🧑‍⚕️', label: t('st_care'), variant: 'secondary', onClick: () => app.navigate('caregiver') }),
    card('stack', h('h2', {}, '🔐 ', t('st_privacy')), ...t('privacyBody').map((l) => h('p', { text: '✅ ' + l }))),
    h('p', { class: 'muted small center', text: t('st_install') })));
  app.setSpeech(t('st_title'));
}

// Printable one-page summary for a doctor visit. Generated on the device; printing never uploads anything.
import { store } from '../core/store.js';
import { h, btn, logo, card } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { weekly, checkSessions, daily, trend } from '../core/scoring.js';
import { formatDate, dayKey } from '../core/util.js';
import { lineChart } from '../ui/chart.js';
import { CHECK_DOMAINS } from './check.js';

export function render(main, _params, app) {
  const sessions = store.sessions();
  const profile = store.get('profile', {});
  const checks = checkSessions(sessions);
  const weeks = weekly(sessions).slice(-12);
  const tr = trend(sessions);
  const pts = daily(sessions).slice(-90).map((d) => ({ day: d.day, y: d.avg }));

  main.append(h('div', { class: 'stack' },
    h('div', { class: 'row no-print' },
      btn({ icon: '🖨️', label: t('sm_print'), onClick: () => window.print() }),
      btn({ icon: '←', label: t('back'), variant: 'secondary', onClick: () => history.back() })),
    h('div', { class: 'row' }, logo(), h('h1', { text: t('sm_title') })),
    h('p', {}, t('sm_for', { name: profile.name || '—' }), h('br'), t('sm_made', { date: formatDate(dayKey()) })),
    h('p', { class: 'disclaimer small', text: `${t('sm_note')} ${t('ck_disclaimer')}` }),
    card('stack',
      h('h2', { text: t('pr_checkups') }),
      checks.length ? h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', { text: t('pr_date') }), ...CHECK_DOMAINS.map((d) => h('th', { text: t('d_' + d) })), h('th', { text: t('score') }))),
        h('tbody', {}, checks.map((c) => h('tr', {},
          h('td', { text: formatDate(c.day) }),
          ...CHECK_DOMAINS.map((d) => h('td', { text: String(c.domains[d]) })),
          h('td', { text: `${c.total} ${c.status === 'ok' ? '✅' : '⚠️'}` }))))) : h('p', { text: '–' })),
    card('stack',
      h('h2', { text: t('sm_weekly') }),
      pts.length ? lineChart(pts, { baseline: tr.baseline, ariaLabel: t('pr_overall'), baselineLabel: t('pr_baseline') }) : null,
      weeks.length ? h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', { text: t('sm_week') }), h('th', { text: t('sm_avg') }), h('th', { text: t('sm_n') }))),
        h('tbody', {}, weeks.map((w) => h('tr', {}, h('td', { text: formatDate(w.week) }), h('td', { text: String(w.avg) }), h('td', { text: String(w.n) }))))) : h('p', { text: '–' }),
      h('p', { class: 'small', text: `${t(`tr_${tr.status}_title`)} — ${t(`tr_${tr.status}_body`)}` }))));
  app.setSpeech(t('sm_title'));
}

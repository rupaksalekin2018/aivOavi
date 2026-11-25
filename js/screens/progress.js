import { store } from '../core/store.js';
import { h, card } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { daily, trend, checkSessions, gameSessions } from '../core/scoring.js';
import { lineChart, sparkline } from '../ui/chart.js';
import { DOMAINS } from '../games/index.js';
import { dayKey, addDays, formatDate } from '../core/util.js';
import { trendCard } from './home.js';

export function render(main, _params, app) {
  const sessions = store.sessions();
  const tr = trend(sessions);
  let range = 'month';
  const chartBox = h('div');
  const rangeBtns = {};

  function drawChart() {
    const from = range === 'week' ? addDays(dayKey(), -6) : range === 'month' ? addDays(dayKey(), -29) : '0000-00-00';
    const pts = daily(sessions).filter((d) => d.day >= from).map((d) => ({ day: d.day, y: d.avg, label: `${d.n} ${t('allGames').toLowerCase()}` }));
    chartBox.replaceChildren(pts.length
      ? lineChart(pts, { baseline: tr.baseline, ariaLabel: t('pr_overall'), baselineLabel: t('pr_baseline') })
      : h('p', { class: 'muted', text: t('pr_none') }));
    for (const [k, b] of Object.entries(rangeBtns)) { b.setAttribute('aria-pressed', String(k === range)); b.className = `btn btn-small ${k === range ? 'btn-primary' : 'btn-secondary'}`; }
  }

  for (const k of ['week', 'month', 'all']) {
    rangeBtns[k] = h('button', { type: 'button', class: 'btn btn-small', onclick: () => { range = k; drawChart(); }, text: t('pr_' + k) });
  }

  const games = gameSessions(sessions);
  const checks = checkSessions(sessions);
  const domainRows = DOMAINS.map((d) => {
    const vals = games.filter((s) => s.domain === d).slice(-10).map((s) => s.ability);
    const latest = vals.length ? vals[vals.length - 1] : null;
    return h('div', { class: 'domain-row' },
      h('span', { text: t('d_' + d) }),
      sparkline(vals, t('d_' + d)),
      h('span', { class: 'val', text: latest === null ? '–' : String(latest) }));
  });

  const table = h('details', {},
    h('summary', { class: 'btn btn-quiet btn-small', text: t('pr_table') }),
    h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, h('th', { text: t('pr_date') }), h('th', { text: t('pr_game') }), h('th', { text: t('pr_points') }))),
      h('tbody', {}, games.slice(-40).reverse().map((s) => h('tr', {},
        h('td', { text: formatDate(s.day) }), h('td', { text: t('g_' + s.game) }), h('td', { text: String(s.ability) }))))));

  main.append(h('div', { class: 'stack' },
    h('h1', {}, '📈 ', t('pr_title')),
    trendCard(sessions),
    card('stack',
      h('h2', { text: t('pr_overall') }),
      h('div', { class: 'seg', role: 'group', 'aria-label': t('pr_overall') }, Object.values(rangeBtns)),
      chartBox),
    card('stack', h('h2', { text: t('pr_by_area') }), ...domainRows),
    card('stack', h('h2', { text: t('pr_checkups') }),
      checks.length
        ? h('div', { class: 'stack' }, checks.slice().reverse().map((c) => h('div', { class: 'spread' },
          h('span', { text: formatDate(c.day) }),
          h('span', { class: `chip ${c.status === 'ok' ? 'chip-ok' : 'chip-warn'}`, text: `${c.status === 'ok' ? '✅' : '⚠️'} ${c.total}` }))))
        : h('p', { class: 'muted', text: '–' })),
    games.length ? table : null));
  drawChart();
  app.setSpeech(`${t('pr_title')}. ${trendCard(sessions).textContent}`);
}

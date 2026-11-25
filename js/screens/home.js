import { store } from '../core/store.js';
import { h, btn, avi, card, statusCard, add, marker } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { todaysPlan, planStatus } from '../core/plan.js';
import { streak, totalXP, levelInfo, garden } from '../core/gamify.js';
import { trend, daily, checkSessions } from '../core/scoring.js';
import { gameById } from '../games/index.js';
import { dayKey, addDays, daysBetween } from '../core/util.js';
import { sparkline } from '../ui/chart.js';

export function trendCard(sessions) {
  const tr = trend(sessions);
  const map = { ok: ['ok', 'tr_ok_title', 'tr_ok_body'], up: ['up', 'tr_up_title', 'tr_up_body'], warn: ['warn', 'tr_warn_title', 'tr_warn_body'], new: ['new', 'tr_new_title', 'tr_new_body'] };
  const [kind, title, body] = map[tr.status];
  return statusCard(kind, t(title), t(body));
}

export async function render(main, _params, app) {
  const profile = store.get('profile', {});
  const sessions = store.sessions();
  const easy = app.easy();
  const plan = await todaysPlan();
  const st = planStatus(plan);
  const sk = streak(sessions);
  const xp = totalXP(sessions);
  const lv = levelInfo(xp);
  const greet = profile.name ? t('hi', { name: profile.name }) : t('hiNoName');
  const out = h('div', { class: 'stack' });
  main.append(out);

  // Welcome-back nudge (layer 3 of reminders)
  const lastDay = sessions.length ? sessions[sessions.length - 1].day : null;
  const nudge = lastDay && lastDay < addDays(dayKey(), -1)
    ? card('card-ok', h('p', { text: '👋 ' + t('missedNudge', { name: profile.name || t('friend') }) })) : null;

  // Check-up suggestion: never done (check path) or older than 28 days
  const checks = checkSessions(sessions);
  const lastCheck = checks[checks.length - 1];
  const checkDue = (!lastCheck && profile.path === 'check') || (lastCheck && daysBetween(lastCheck.day, dayKey()) >= 28);

  // Clear start and end: "▼ Start here" above the Play button, "■ You are finished for today" when done.
  const playBtn = st.complete
    ? h('div', { class: 'card card-ok card-hero stack', dataset: { marker: 'end' } },
      h('div', { class: 'stars', text: '🌻' }), h('h2', { class: 'status-title', text: '■ ' + t('allDone') }), h('p', { text: t('allDoneSub') }),
      easy ? null : btn({ icon: '🎲', label: t('playMore'), variant: 'secondary', onClick: () => app.navigate('games') }))
    : h('div', { class: 'stack' }, marker('start', t('startHere')), btn({ icon: '▶', label: t('playToday'), sub: easy ? null : t('playTodaySub'), cls: 'btn-giant', onClick: () => app.navigate('play'), dataset: { testid: 'play-today' } }));

  if (easy) {
    const plants = garden(sessions).slice(-8);
    add(out,
      h('h1', { class: 'center', text: greet }),
      avi(st.complete ? 'happy' : 'idle'),
      nudge,
      playBtn,
      plants.length ? h('div', { class: 'garden', role: 'img', 'aria-label': t('gd_count', { n: plants.length }) }, plants.map((p) => h('div', { class: 'plant', text: p.plant }))) : null,
      h('div', { class: 'grid-2' },
        btn({ icon: '🌻', label: t('myGarden'), variant: 'secondary', onClick: () => app.navigate('garden') }),
        btn({ icon: '⚙️', label: t('settings'), variant: 'quiet', onClick: () => app.navigate('caregiver') })),
    );
    app.setSpeech(`${greet} ${st.complete ? t('allDone') : t('playToday')}`);
    return;
  }

  const recent = daily(sessions).slice(-7).map((d) => d.avg);
  add(out,
    h('h1', { text: greet }),
    st.complete ? playBtn : null, // the end of the day is the first thing the user sees
    h('div', { class: 'chips' },
      h('span', { class: `chip ${sk.current ? 'chip-y' : ''}` }, '🔥 ', sk.current ? t('streakDays', { n: sk.current }) : t('streakStart')),
      h('span', { class: 'chip chip-y' }, '⭐ ', t('xp', { n: xp }))),
    h('div', { class: 'card stack' },
      h('div', { class: 'row' }, h('strong', { text: t('levelLabel', { n: lv.num, name: lv.name }) })),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(lv.progress * 100), 'aria-label': t('levelLabel', { n: lv.num, name: lv.name }) },
        h('span', { style: { width: `${Math.round(lv.progress * 100)}%` } }))),
    nudge,
    checkDue ? btn({ icon: '🩺', label: t('checkDue'), variant: 'secondary', onClick: () => app.navigate('check') }) : null,
    h('div', { class: 'card stack' },
      h('h2', { text: t('todayPlan') }),
      h('ul', { class: 'stack', style: { listStyle: 'none', padding: 0, margin: 0 } },
        plan.games.map((id, i) => {
          const g = gameById(id);
          return h('li', { class: 'spread' },
            h('span', {}, h('span', { 'aria-hidden': 'true', text: g.icon + '  ' }), t('g_' + id)),
            h('span', { class: st.done[i] ? 'chip chip-ok' : 'chip', text: st.done[i] ? '✓ ' + t('done') : `${i + 1}` }));
        })),
      st.complete ? null : playBtn),
    trendCard(sessions),
    recent.length >= 2 ? h('div', { class: 'card' }, h('p', { class: 'small muted', text: t('pr_overall') }), sparkline(recent, t('pr_overall'))) : null,
    h('div', { class: 'grid-2 collapse' },
      btn({ icon: '🩺', label: t('brainCheck'), sub: t('brainCheckSub'), variant: 'secondary', onClick: () => app.navigate('check') }),
      btn({ icon: '📈', label: t('myProgress'), variant: 'secondary', onClick: () => app.navigate('progress') }),
      btn({ icon: '🌻', label: t('myGarden'), variant: 'secondary', onClick: () => app.navigate('garden') }),
      btn({ icon: '🎲', label: t('allGames'), variant: 'secondary', onClick: () => app.navigate('games') })),
    btn({ icon: '⚙️', label: t('settings'), variant: 'quiet', onClick: () => app.navigate('settings') }),
  );
  app.setSpeech(`${greet} ${st.complete ? t('allDone') : t('playToday')}`);
}

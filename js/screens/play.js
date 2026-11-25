import { store } from '../core/store.js';
import { h, btn, avi, card, stars, stepDots, confetti, toast, announce, mood, marker } from '../ui/components.js';
import { t, tPick } from '../i18n/t.js';
import { gameById, GAME_IDS } from '../games/index.js';
import { todaysPlan, planStatus } from '../core/plan.js';
import { getLevel, updateLevel } from '../core/adaptive.js';
import { ability } from '../core/scoring.js';
import { xpForGame, badges, fullDays, totalXP, levelInfo } from '../core/gamify.js';
import { markPlayedToday } from '../core/notify.js';
import { sound } from '../core/sound.js';
import { dayKey, clamp } from '../core/util.js';

export async function render(main, params, app) {
  const single = params[0] && gameById(params[0]) ? params[0] : null;
  let stopGame = null;
  const cleanup = () => { if (stopGame) { stopGame(); stopGame = null; } };

  async function nextFromPlan() {
    const plan = await todaysPlan();
    const st = planStatus(plan);
    if (st.complete) return app.navigate('home');
    intro(plan.games[st.nextIndex], { plan, index: st.nextIndex });
  }

  function intro(id, ctxPlan) {
    cleanup();
    const g = gameById(id);
    const level = getLevel(id);
    const howKey = g.howKey ? g.howKey(level) : `g_${id}_how`;
    main.replaceChildren(h('div', { class: 'stack' },
      ctxPlan ? stepDots(ctxPlan.plan.games.length, ctxPlan.index) : null,
      ctxPlan ? h('p', { class: 'center muted', text: t('gameOf', { n: ctxPlan.index + 1, total: ctxPlan.plan.games.length }) }) : null,
      h('h1', { class: 'center' }, h('span', { 'aria-hidden': 'true', text: g.icon + ' ' }), t('g_' + id)),
      avi('idle avi-sm'),
      card('stack', h('h2', { text: t('howToPlay') }), h('p', { text: t(howKey) })),
      btn({ icon: '▶', label: t('letsGo'), cls: 'btn-giant', onClick: () => playGame(id, ctxPlan), dataset: { testid: 'start-game' } })));
    app.setSpeech(`${t('g_' + id)}. ${t(howKey)}`);
  }

  function playGame(id, ctxPlan) {
    cleanup();
    const g = gameById(id);
    const level = getLevel(id);
    const easy = app.easy();
    const area = h('div', { class: 'game-area', dataset: { game: id } });
    main.replaceChildren(h('div', { class: 'stack' },
      h('div', { class: 'game-head' },
        h('h2', {}, h('span', { 'aria-hidden': 'true', text: g.icon + ' ' }), t('g_' + id)),
        easy ? null : h('span', { class: 'chip chip-y', text: `${t('level')} ${level}` })),
      area));
    app.setSpeech(t(g.howKey ? g.howKey(level) : `g_${id}_how`));
    let finished = false;
    stopGame = g.mount(area, {
      level, easy, sound, say: app.say,
      hemisphere: app.settings().hemisphere,
      onDone: (r) => { if (!finished) { finished = true; save(id, level, r, ctxPlan); } },
    });
  }

  async function save(id, level, r, ctxPlan) {
    cleanup();
    const g = gameById(id);
    const score = Math.round(clamp(r.score || 0, 0, 100));
    const before = store.sessions();
    const prevBest = Math.max(-1, ...before.filter((s) => s.type === 'game' && s.game === id).map((s) => s.score));
    const badgesBefore = new Set(badges(before, GAME_IDS).filter((b) => b.got).map((b) => b.id));
    const daysBefore = fullDays(before).length;
    const lvBefore = levelInfo(totalXP(before)).idx;

    const session = {
      type: 'game', game: id, domain: g.domain, score, level, ability: ability(score, level),
      accuracy: Math.round((r.accuracy ?? score / 100) * 100) / 100, timeMs: Math.round(r.timeMs || 0),
      xp: xpForGame(score), at: new Date().toISOString(), day: dayKey(),
    };
    await store.addSession(session);
    await markPlayedToday();
    const lvlChange = await updateLevel(id, score);

    const after = store.sessions();
    const newBadges = badges(after, GAME_IDS).filter((b) => b.got && !badgesBefore.has(b.id));
    const dayDone = fullDays(after).length > daysBefore;
    const rankUp = levelInfo(totalXP(after)).idx > lvBefore;
    const easy = app.easy();
    const nStars = score >= 85 ? 3 : score >= 55 ? 2 : 1; // always at least one star
    const cheer = nStars >= 2 ? tPick('cheer') : t('great');
    const mascot = avi('happy');

    let nextAction;
    if (ctxPlan) {
      const plan = await todaysPlan();
      const st = planStatus(plan);
      nextAction = st.complete
        ? btn({ icon: '🏠', label: t('finish'), onClick: () => app.navigate('home'), dataset: { testid: 'finish' } })
        : btn({ icon: '➜', label: t('nextGame'), onClick: () => nextFromPlan(), dataset: { testid: 'next-game' } });
    } else {
      nextAction = h('div', { class: 'stack' },
        btn({ icon: '🔁', label: t('playMore'), onClick: () => intro(id), dataset: { testid: 'again' } }),
        btn({ icon: '🏠', label: t('finish'), variant: 'secondary', onClick: () => app.navigate('home'), dataset: { testid: 'finish' } }));
    }

    main.replaceChildren(h('div', { class: 'stack center', dataset: { testid: 'result' } },
      mascot,
      h('h1', { text: cheer }),
      stars(nStars),
      easy ? null : h('p', { class: 'chips', style: { justifyContent: 'center' } },
        h('span', { class: 'chip chip-y', text: `${t('score')}: ${score}` }),
        h('span', { class: 'chip chip-ok', text: t('xpEarned', { n: session.xp }) })),
      score > prevBest && prevBest >= 0 && !easy ? h('p', { class: 'status-title', text: '🏆 ' + t('newBest') }) : null,
      !easy && lvlChange.change > 0 ? h('p', { text: '⬆️ ' + t('levelUp') }) : null,
      !easy && lvlChange.change < 0 ? h('p', { class: 'muted', text: t('levelDown') }) : null,
      dayDone ? h('div', { class: 'stack' }, h('div', { class: 'stars', text: '🌻' }), h('h2', { text: t('dayComplete') }), marker('end', t('endToday'), `${t('plantGrew')} ${t('endTodaySub')}`)) : null,
      newBadges.length ? card('stack', ...newBadges.map((b) => h('p', { text: `${b.emo} ${t('badgeNew', { name: b.name })}` }))) : null,
      rankUp ? h('p', { class: 'status-title', text: '🎉 ' + t('levelLabel', { n: levelInfo(totalXP(after)).num, name: levelInfo(totalXP(after)).name }) }) : null,
      nextAction));
    mood(mascot, 'happy');
    if (dayDone || newBadges.length || rankUp) { confetti(); sound.win(); } else sound.good();
    const spoken = `${cheer} ${dayDone ? `${t('dayComplete')} ${t('endToday')} ${t('endTodaySub')}` : ''}`;
    app.setSpeech(spoken);
    announce(spoken);
    if (newBadges.length) toast(`${newBadges[0].emo} ${t('badgeNew', { name: newBadges[0].name })}`);
  }

  if (single) intro(single);
  else await nextFromPlan();
  return cleanup;
}

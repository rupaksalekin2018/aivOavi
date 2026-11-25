import { store } from '../core/store.js';
import { h, card } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { garden, badges, totalXP, levelInfo, streak } from '../core/gamify.js';
import { GAME_IDS } from '../games/index.js';
import { dayKey } from '../core/util.js';

export function render(main, _params, app) {
  const sessions = store.sessions();
  const plants = garden(sessions);
  const lv = levelInfo(totalXP(sessions));
  const sk = streak(sessions);
  const bs = badges(sessions, GAME_IDS);
  const today = dayKey();

  main.append(h('div', { class: 'stack' },
    h('h1', {}, '🌻 ', t('gd_title')),
    h('div', { class: 'garden', role: 'img', 'aria-label': t('gd_count', { n: plants.length }) },
      plants.length
        ? plants.map((p) => h('div', { class: `plant ${p.day === today ? 'new' : ''}`, title: p.day, text: p.plant }))
        : h('p', { class: 'garden-empty', text: t('gd_empty') })),
    h('div', { class: 'chips' },
      h('span', { class: 'chip chip-ok', text: `🌱 ${t('gd_count', { n: plants.length })}` }),
      h('span', { class: 'chip chip-y', text: `🔥 ${t('streakDays', { n: sk.current })}` })),
    card('stack',
      h('strong', { text: t('levelLabel', { n: lv.num, name: lv.name }) }),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(lv.progress * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': t('levelLabel', { n: lv.num, name: lv.name }) },
        h('span', { style: { width: `${Math.round(lv.progress * 100)}%` } }))),
    h('h2', { text: t('gd_badges') }),
    h('div', { class: 'badges' }, bs.map((b) => h('div', { class: `badge ${b.got ? 'got' : ''}`, 'aria-label': `${b.name}${b.got ? '' : ' (locked)'}` },
      h('span', { class: 'emo', 'aria-hidden': 'true', text: b.got ? b.emo : '🔒' }),
      h('span', { class: 'name', text: b.name }))))));
  app.setSpeech(`${t('gd_title')}. ${plants.length ? t('gd_count', { n: plants.length }) : t('gd_empty')}`);
}

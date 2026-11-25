import { h, btn } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { GAMES } from '../games/index.js';
import { getLevel } from '../core/adaptive.js';

export function render(main, _params, app) {
  const easy = app.easy();
  main.append(h('div', { class: 'stack' },
    h('h1', { text: t('allGames') }),
    ...GAMES.map((g) => btn({
      icon: g.icon, label: t('g_' + g.id),
      sub: `${t('d_' + g.domain)}${easy ? '' : ` · ${t('level')} ${getLevel(g.id)}`}`,
      variant: 'secondary', dataset: { game: g.id }, onClick: () => app.navigate('game/' + g.id),
    }))));
  app.setSpeech(`${t('allGames')}: ${GAMES.map((g) => t('g_' + g.id)).join(', ')}`);
}

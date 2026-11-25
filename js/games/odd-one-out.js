import { h, fill } from '../ui/components.js';
import { t, tPick, content } from '../i18n/t.js';
import { pick, sample, shuffle, sleep } from '../core/util.js';

const ROUNDS = 5;

function makeRound(level) {
  const maxTier = level <= 2 ? 1 : level <= 4 ? 2 : 3;
  const cats = content.categories.filter((c) => c.tier <= maxTier);
  const main = pick(cats);
  // Harder levels pick the odd item from a category of the same tier (more similar).
  const others = cats.filter((c) => c !== main && (level < 5 || c.tier === main.tier));
  const odd = pick(others.length ? others : cats.filter((c) => c !== main));
  const n = level === 1 ? 3 : 4;
  const same = sample(main.items, n - 1);
  const oddItem = pick(odd.items.filter((it) => !main.items.some((m) => m[1] === it[1])));
  return { options: shuffle([...same, oddItem]), answer: oddItem };
}

export default {
  id: 'odd_one_out', domain: 'reasoning', icon: '🔍',
  mount(el, { level, easy, onDone, say, sound }) {
    let alive = true, round = 0, correct = 0;
    const start = performance.now();

    function show() {
      const r = makeRound(level);
      let answered = false;
      const feedback = h('p', { class: 'prompt', 'aria-live': 'polite' });
      const buttons = r.options.map((it) => h('button', {
        type: 'button', class: 'choice', 'aria-label': it[1],
        onclick: async (e) => {
          if (answered) return;
          answered = true;
          const btnEl = e.currentTarget;
          if (it === r.answer) { correct++; btnEl.classList.add('right'); sound.good(); feedback.textContent = tPick('cheer'); }
          else {
            btnEl.classList.add('soft-miss'); sound.soft(); feedback.textContent = tPick('soft');
            buttons[r.options.indexOf(r.answer)].classList.add('right');
          }
          await sleep(easy ? 1500 : 1100);
          if (!alive) return;
          if (++round >= ROUNDS) onDone({ score: Math.round((100 * correct) / ROUNDS), accuracy: correct / ROUNDS, timeMs: performance.now() - start });
          else show();
        },
      }, h('span', { class: 'emo', 'aria-hidden': 'true', text: it[0] }), h('span', { text: it[1] })));
      fill(el, 
        h('p', { class: 'center muted', text: `${round + 1} / ${ROUNDS}` }),
        h('p', { class: 'prompt', text: t('oo_q') }),
        h('div', { class: 'choices' }, buttons),
        feedback,
      );
      if (round === 0) say(t('oo_q'));
    }
    show();
    return () => { alive = false; };
  },
};

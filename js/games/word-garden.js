import { h, btn, fill } from '../ui/components.js';
import { t, content } from '../i18n/t.js';
import { sample, shuffle, sleep } from '../core/util.js';

const N = [0, 3, 4, 5, 6, 7, 8];

/** Pick-the-words grid, reused by the check-up's delayed recall. */
export function recognitionGrid(el, { targets, distractors, prompt, onDone }) {
  const chosen = new Set();
  const all = shuffle([...targets, ...distractors]);
  const done = btn({ icon: '✔', label: t('done'), variant: 'primary', disabled: true, onClick: () => {
    const hits = [...chosen].filter((w) => targets.includes(w)).length;
    const falseAlarms = chosen.size - hits;
    onDone({ hits, falseAlarms, score: Math.round((100 * Math.max(0, hits - falseAlarms)) / targets.length) });
  } });
  const grid = h('div', { class: 'choices' }, all.map((w) => {
    const b = h('button', { type: 'button', class: 'choice', 'aria-pressed': 'false', text: w, onclick: () => {
      if (chosen.has(w)) chosen.delete(w); else chosen.add(w);
      b.classList.toggle('selected', chosen.has(w));
      b.setAttribute('aria-pressed', String(chosen.has(w)));
      done.disabled = chosen.size === 0;
    } });
    return b;
  }));
  fill(el, h('p', { class: 'prompt', text: prompt }), grid, h('div', { class: 'spacer' }), done);
}

export default {
  id: 'word_garden', domain: 'recall', icon: '🌷',
  mount(el, { level, easy, onDone, say, sound }) {
    let alive = true;
    const n = N[level] || 3;
    const pool = sample(content.words, n * 2);
    const targets = pool.slice(0, n), distractors = pool.slice(n);
    const start = performance.now();

    async function learn(i) {
      if (!alive) return;
      if (i >= n) return water();
      const word = targets[i];
      fill(el, 
        h('p', { class: 'prompt', text: t('wg_remember') }),
        h('p', { class: 'center muted', text: `${i + 1} / ${n}` }),
        h('div', { class: 'big-word', 'aria-live': 'polite', text: word }),
        h('div', { class: 'spacer' }),
        easy ? btn({ icon: '➜', label: t('next'), variant: 'primary', onClick: () => learn(i + 1) }) : null,
      );
      say(word);
      if (!easy) { await sleep(Math.max(1600, 2600 - level * 150)); learn(i + 1); }
    }

    function water() {
      let left = 5;
      const stages = ['🌱', '🌿', '🌿', '🪴', '🌷', '🌷'];
      const plant = h('div', { class: 'center water', 'aria-hidden': 'true', text: stages[0] });
      const label = h('p', { class: 'prompt', 'aria-live': 'polite', text: t('wg_water', { n: left }) });
      const drop = btn({ icon: '💧', label: '', variant: 'secondary', aria: 'Water', cls: 'btn-giant', onClick: async () => {
        sound.tap();
        left--;
        plant.textContent = stages[5 - left];
        label.textContent = t('wg_water', { n: left });
        if (left === 0) { drop.disabled = true; sound.good(); await sleep(600); if (alive) recall(); }
      } });
      fill(el, label, plant, drop);
      say(t('wg_water', { n: left }));
    }

    function recall() {
      say(t('wg_pick'));
      recognitionGrid(el, { targets, distractors, prompt: t('wg_pick'), onDone: (r) => onDone({ score: r.score, accuracy: r.hits / n, timeMs: performance.now() - start }) });
    }

    learn(0);
    return () => { alive = false; };
  },
};

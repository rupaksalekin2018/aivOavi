import { h } from '../ui/components.js';
import { t, content } from '../i18n/t.js';
import { shuffle, sample, sleep, clamp } from '../core/util.js';

const PAIRS = [0, 3, 4, 6, 6, 8, 10];

export default {
  id: 'memory_match', domain: 'memory', icon: '🃏',
  mount(el, { level, easy, onDone, say, sound }) {
    let alive = true;
    const pairs = PAIRS[level] || 3;
    const syms = sample(content.memorySymbols, pairs);
    const deck = shuffle([...syms, ...syms]);
    const cols = pairs === 3 ? 3 : pairs === 10 ? 5 : 4;
    const prompt = h('p', { class: 'prompt', 'aria-live': 'polite' });
    const grid = h('div', { class: 'mm-grid', style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } });
    let first = null, lock = true, attempts = 0, matched = 0, start = 0;

    const faceDown = (b) => {
      b.classList.remove('up');
      b.replaceChildren(h('img', { class: 'back', src: 'assets/brain.svg', alt: '' }));
      b.setAttribute('aria-label', t('mm_card', { n: b.idx + 1 }));
    };
    const faceUp = (b) => {
      b.classList.add('up');
      b.textContent = b.sym;
      b.setAttribute('aria-label', t('mm_card_up', { n: b.idx + 1, sym: content.memoryNames[b.sym] || '' }));
    };

    const cards = deck.map((sym, i) => {
      const b = h('button', { type: 'button', class: 'mm-card', onclick: () => flip(b) });
      b.sym = sym; b.idx = i;
      return b;
    });
    grid.append(...cards);
    el.append(prompt, grid);

    // Peek phase: show all cards, so this is a memory game, not a luck game.
    cards.forEach(faceUp);
    prompt.textContent = t('mm_peek');
    say(t('mm_peek'));
    const peekMs = easy ? 3000 + pairs * 800 : Math.max(2000, 3500 + pairs * 450 - level * 350);
    setTimeout(() => {
      if (!alive) return;
      cards.forEach(faceDown);
      prompt.textContent = t('mm_find');
      lock = false;
      start = performance.now();
    }, peekMs);

    async function flip(b) {
      if (lock || b.matched || b === first) return;
      faceUp(b);
      sound.tap();
      if (!first) { first = b; return; }
      attempts++;
      const a = first; first = null;
      if (a.sym === b.sym) {
        a.matched = b.matched = true;
        a.classList.add('matched'); b.classList.add('matched');
        a.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-disabled', 'true');
        sound.good();
        if (++matched === pairs) {
          const score = Math.round(clamp((100 * (pairs + 1)) / (attempts + 1), 0, 100));
          await sleep(600);
          if (alive) onDone({ score, accuracy: pairs / attempts, timeMs: performance.now() - start });
        }
      } else {
        lock = true;
        sound.soft();
        b.classList.add('miss');
        await sleep(easy ? 1400 : 1000);
        if (!alive) return;
        faceDown(a); faceDown(b); b.classList.remove('miss');
        lock = false;
      }
    }
    return () => { alive = false; };
  },
};

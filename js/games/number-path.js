import { h } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { shuffle, clamp } from '../core/util.js';

const LETTERS = 'ABCDEFGHIJ';
/** Build the sequence: plain numbers, or alternating 1, A, 2, B… */
export function pathItems(count, alternate) {
  if (!alternate) return Array.from({ length: count }, (_, i) => String(i + 1));
  const out = [];
  for (let i = 0; out.length < count; i++) { out.push(String(i + 1)); if (out.length < count) out.push(LETTERS[i]); }
  return out;
}

const LEVELS = [null, [5, false], [8, false], [10, false], [12, false], [10, true], [12, true]];

/** One board. Reused by the check-up (trail A and B). */
export function numberBoard(el, { items, easy, onDone, sound, perItemMs = 2500 }) {
  let alive = true, next = 0, errors = 0, hintTimer = null;
  const start = performance.now();
  const n = items.length;
  // A grid with spare cells; each dot sits in its own cell with a little jitter, so dots never overlap.
  const cols = n <= 5 ? 3 : 4, rows = Math.ceil(n / cols) + 1;
  const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, n);
  const prompt = h('p', { class: 'prompt', 'aria-live': 'polite' });
  const board = h('div', { class: 'np-board' });
  const dots = items.map((v, i) => {
    const c = cells[i], cx = c % cols, cy = Math.floor(c / cols);
    const x = ((cx + 0.5 + (Math.random() - 0.5) * 0.25) / cols) * 84 + 8;
    const y = ((cy + 0.5 + (Math.random() - 0.5) * 0.25) / rows) * 84 + 8;
    const d = h('button', { type: 'button', class: 'np-dot', 'aria-label': t('np_dot', { v }), style: { left: `${x}%`, top: `${y}%` }, onclick: () => tap(i) }, v);
    return d;
  });
  board.append(...dots);
  el.append(prompt, board);

  const showNext = () => {
    prompt.textContent = easy ? t('np_next', { v: items[next] }) : '';
    clearTimeout(hintTimer);
    if (easy) hintTimer = setTimeout(() => dots[next]?.classList.add('next-hint'), 6000);
  };
  function tap(i) {
    if (!alive || dots[i].classList.contains('done')) return;
    if (i === next) {
      dots[i].classList.remove('next-hint');
      dots[i].classList.add('done');
      sound.tap();
      next++;
      if (next === n) {
        clearTimeout(hintTimer);
        const timeMs = performance.now() - start;
        const acc = n / (n + errors);
        const speed = easy ? 1 : clamp((n * perItemMs) / timeMs, 0.6, 1);
        sound.good();
        onDone({ score: Math.round(100 * acc * speed), accuracy: acc, timeMs, errors });
      } else showNext();
    } else {
      errors++;
      sound.soft();
      dots[i].classList.remove('miss'); void dots[i].offsetWidth; dots[i].classList.add('miss');
    }
  }
  showNext();
  return () => { alive = false; clearTimeout(hintTimer); };
}

export default {
  id: 'number_path', domain: 'attention', icon: '🔢',
  howKey: (level) => (LEVELS[level][1] ? 'g_number_path_how_alt' : 'g_number_path_how'),
  mount(el, { level, easy, onDone, sound }) {
    const [count, alt] = LEVELS[level] || LEVELS[1];
    return numberBoard(el, { items: pathItems(count, alt), easy, onDone, sound, perItemMs: alt ? 3500 : 2500 });
  },
};

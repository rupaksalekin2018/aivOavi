import { h, announce } from '../ui/components.js';
import { t } from '../i18n/t.js';
import { sleep } from '../core/util.js';

const BASE_LEN = [0, 2, 3, 4, 5, 6, 7];

export default {
  id: 'pattern_echo', domain: 'working', icon: '🔆',
  mount(el, { level, easy, onDone, say, sound }) {
    let alive = true;
    const base = BASE_LEN[level] || 2;
    const lengths = [base, base, base + 1];
    const showMs = easy ? 950 : Math.max(450, 900 - level * 70);
    const names = t('pe_tiles'), shapes = t('pe_shapes');
    const head = h('p', { class: 'prompt', 'aria-live': 'polite' });
    const roundLbl = h('p', { class: 'center muted' });
    const tiles = [0, 1, 2, 3].map((i) => h('button', {
      type: 'button', class: `pe-tile pe-${i}`, 'aria-label': names[i], disabled: true, onclick: () => tap(i),
    }, h('span', { 'aria-hidden': 'true', text: shapes[i] })));
    el.append(roundLbl, head, h('div', { class: 'pe-grid' }, tiles));

    let seq = [], step = 0, round = 0, attempt = 0, best = 0, totalGot = 0, totalLen = 0, accepting = false;
    const start = performance.now();

    const light = async (i, ms) => {
      tiles[i].classList.add('lit'); sound.tile(i);
      await sleep(ms);
      tiles[i].classList.remove('lit');
    };

    async function play() {
      accepting = false;
      tiles.forEach((b) => { b.disabled = true; });
      roundLbl.textContent = t('pe_round', { n: round + 1, total: lengths.length });
      head.textContent = t('pe_watch');
      // Screen-reader / caregiver friendly: the sequence is also announced in words.
      announce(seq.map((i) => names[i]).join(', '));
      await sleep(700);
      for (const i of seq) { if (!alive) return; await light(i, showMs); await sleep(250); }
      if (!alive) return;
      head.textContent = t('pe_your_turn');
      say(t('pe_your_turn'));
      step = 0; accepting = true;
      tiles.forEach((b) => { b.disabled = false; });
    }

    function newRound() {
      seq = Array.from({ length: lengths[round] }, () => Math.floor(Math.random() * 4));
      attempt = 0; best = 0;
      play();
    }

    async function endRound() {
      accepting = false;
      tiles.forEach((b) => { b.disabled = true; });
      totalGot += best; totalLen += seq.length;
      round++;
      if (round >= lengths.length) {
        accepting = false;
        await sleep(500);
        if (alive) onDone({ score: Math.round((100 * totalGot) / totalLen), accuracy: totalGot / totalLen, timeMs: performance.now() - start });
      } else { await sleep(700); if (alive) newRound(); }
    }

    async function tap(i) {
      if (!accepting) return;
      if (i === seq[step]) {
        light(i, 220);
        step++;
        best = Math.max(best, step);
        if (step === seq.length) { accepting = false; sound.good(); head.textContent = t('wellDone'); endRound(); }
      } else {
        accepting = false;
        tiles.forEach((b) => { b.disabled = true; });
        sound.soft();
        tiles[i].animate?.([{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'none' }], 400);
        head.textContent = t('tryAgain');
        attempt++;
        // Easy mode: show the same pattern once more. Normal: move on.
        if (easy && attempt < 2) { await sleep(900); if (alive) play(); } else endRound();
      }
    }

    newRound();
    return () => { alive = false; };
  },
};

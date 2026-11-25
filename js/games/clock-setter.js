import { h, svg, btn, fill } from '../ui/components.js';
import { t, tPick, content } from '../i18n/t.js';
import { pick, sleep } from '../core/util.js';

function targetFor(level) {
  const hr = 1 + Math.floor(Math.random() * 12);
  const mins = level === 1 ? [0] : level === 2 ? [0, 30] : level === 3 ? [0, 15, 30, 45] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  return { hr, m: pick(mins) };
}

function clockFace() {
  const root = svg('svg', { class: 'clock', viewBox: '0 0 200 200', role: 'img' });
  root.append(svg('circle', { cx: 100, cy: 100, r: 94, fill: '#FFFFFF', stroke: '#FFD23F', 'stroke-width': 8 }));
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180, big = i % 5 === 0;
    const r1 = big ? 78 : 83, r2 = 88;
    root.append(svg('line', { x1: 100 + r1 * Math.sin(a), y1: 100 - r1 * Math.cos(a), x2: 100 + r2 * Math.sin(a), y2: 100 - r2 * Math.cos(a), stroke: '#0B3D2E', 'stroke-width': big ? 3 : 1 }));
  }
  for (let n = 1; n <= 12; n++) {
    const a = (n * 30 * Math.PI) / 180;
    root.append(svg('text', { x: 100 + 64 * Math.sin(a), y: 100 - 64 * Math.cos(a) + 7, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: '#0B3D2E', 'font-family': 'system-ui, sans-serif', text: String(n) }));
  }
  const hourHand = svg('line', { x1: 100, y1: 100, x2: 100, y2: 52, stroke: '#0B3D2E', 'stroke-width': 9, 'stroke-linecap': 'round' });
  const minHand = svg('line', { x1: 100, y1: 100, x2: 100, y2: 26, stroke: '#FF8A00', 'stroke-width': 6, 'stroke-linecap': 'round' });
  root.append(hourHand, minHand, svg('circle', { cx: 100, cy: 100, r: 7, fill: '#0B3D2E' }));
  return { root, set(hr, m) {
    hourHand.setAttribute('transform', `rotate(${((hr % 12) + m / 60) * 30} 100 100)`);
    minHand.setAttribute('transform', `rotate(${m * 6} 100 100)`);
    root.setAttribute('aria-label', `Clock showing ${content.timeWords(hr, m)}`);
  } };
}

export default {
  id: 'clock_setter', domain: 'visuospatial', icon: '🕰️',
  mount(el, { level, easy, onDone, say, sound, rounds = 3 }) {
    let alive = true, round = 0, correct = 0;
    const step = level <= 3 || easy ? 15 : 5;
    const start = performance.now();

    function show() {
      const target = targetFor(level);
      if (step === 15 && target.m % 15) target.m = 15 * Math.round(target.m / 15) % 60;
      let hr = 1 + Math.floor(Math.random() * 12), m = step * Math.floor(Math.random() * (60 / step));
      const face = clockFace();
      const words = content.timeWords(target.hr, target.m);
      const digital = `${target.hr}:${String(target.m).padStart(2, '0')}`;
      const showDigital = level <= 4 || easy;
      const hourLbl = h('span', { class: 'lbl', text: t('cs_hour') });
      const minLbl = h('span', { class: 'lbl', text: t('cs_min') });
      const feedback = h('p', { class: 'prompt', 'aria-live': 'polite' });
      const update = () => face.set(hr, m);
      const mk = (icon, label, aria, fn) => btn({ icon, label, aria, variant: 'secondary', cls: 'btn-small', onClick: () => { fn(); sound.tap(); update(); } });
      const checkBtn = btn({ icon: '✔', label: t('check'), variant: 'primary', onClick: async () => {
        checkBtn.disabled = true;
        const ok = hr % 12 === target.hr % 12 && m === target.m;
        if (ok) { correct++; sound.good(); feedback.textContent = tPick('cheer'); }
        else { sound.soft(); feedback.textContent = tPick('soft'); hr = target.hr; m = target.m; update(); }
        await sleep(ok ? 1100 : 1800);
        if (!alive) return;
        if (++round >= rounds) onDone({ score: Math.round((100 * correct) / rounds), accuracy: correct / rounds, timeMs: performance.now() - start });
        else show();
      } });
      update();
      fill(el, h('div', { class: 'clock-wrap' },
        h('p', { class: 'center muted', text: `${round + 1} / ${rounds}` }),
        h('p', { class: 'prompt' }, t('cs_set'), h('br'), h('span', { class: 'logo-text-y', text: words }), showDigital ? ` (${digital})` : ''),
        face.root,
        h('div', { class: 'clock-ctrl' },
          mk('◀', t('cs_earlier'), `${t('cs_hour')}: ${t('cs_earlier')}`, () => { hr = hr === 1 ? 12 : hr - 1; }), hourLbl, mk('▶', t('cs_later'), `${t('cs_hour')}: ${t('cs_later')}`, () => { hr = hr === 12 ? 1 : hr + 1; })),
        h('div', { class: 'clock-ctrl' },
          mk('◀', t('cs_earlier'), `${t('cs_min')}: ${t('cs_earlier')}`, () => { m = (m - step + 60) % 60; }), minLbl, mk('▶', t('cs_later'), `${t('cs_min')}: ${t('cs_later')}`, () => { m = (m + step) % 60; })),
        checkBtn, feedback));
      say(`${t('cs_set')} ${words}`);
    }
    show();
    return () => { alive = false; };
  },
};

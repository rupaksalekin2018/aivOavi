import { h, svg, btn, fill } from '../ui/components.js';
import { t, tPick, content } from '../i18n/t.js';
import { sample, shuffle, sleep } from '../core/util.js';

const N = [0, 2, 3, 4, 5, 6, 6];
const SKIN = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'];
const HAIR = ['#2C1B10', '#6B4423', '#B55239', '#E6CEA8', '#9E9E9E', '#F2F2F2'];
const SHIRT = ['#FF8A00', '#7FD6FF', '#39FF14', '#FFD23F', '#E86FA8', '#B48CFF'];
const EXTRA = ['none', 'glasses', 'hat', 'earrings', 'beard'];

/** Friendly illustrated face, generated as SVG (no photos of real people). */
export function faceSVG(f) {
  const s = svg('svg', { class: 'face', viewBox: '0 0 200 200', role: 'img', 'aria-label': 'face' });
  s.append(svg('circle', { cx: 100, cy: 100, r: 98, fill: '#062A1F' }));
  s.append(svg('path', { d: 'M30 200C35 150 65 135 100 135S165 150 170 200Z', fill: f.shirt }));
  if (f.style === 1) s.append(svg('path', { d: 'M48 95C45 50 70 32 100 32S155 50 152 95L156 150H44Z', fill: f.hair }));
  s.append(svg('ellipse', { cx: 100, cy: 92, rx: 46, ry: 54, fill: f.skin }));
  if (f.style === 0) s.append(svg('path', { d: 'M54 80C54 46 75 34 100 34S146 46 146 80C132 64 110 58 100 58S68 64 54 80Z', fill: f.hair }));
  if (f.style === 1) s.append(svg('path', { d: 'M54 78C58 48 78 36 100 36S142 48 146 78C126 70 112 52 100 50C88 52 74 70 54 78Z', fill: f.hair }));
  if (f.style === 2) { s.append(svg('circle', { cx: 100, cy: 34, r: 20, fill: f.hair })); s.append(svg('path', { d: 'M54 78C56 50 76 40 100 40S144 50 146 78C130 62 70 62 54 78Z', fill: f.hair })); }
  if (f.style === 3) { s.append(svg('path', { d: 'M54 96C50 76 54 66 60 62L64 96Z', fill: f.hair })); s.append(svg('path', { d: 'M146 96C150 76 146 66 140 62L136 96Z', fill: f.hair })); }
  // eyes, smile
  s.append(svg('circle', { cx: 82, cy: 92, r: 6, fill: '#1B1B1B' }), svg('circle', { cx: 118, cy: 92, r: 6, fill: '#1B1B1B' }));
  s.append(svg('path', { d: 'M80 118Q100 134 120 118', fill: 'none', stroke: '#7A2E1F', 'stroke-width': 5, 'stroke-linecap': 'round' }));
  if (f.extra === 'glasses') s.append(svg('g', { fill: 'none', stroke: '#111', 'stroke-width': 4 }, svg('circle', { cx: 82, cy: 92, r: 14 }), svg('circle', { cx: 118, cy: 92, r: 14 }), svg('line', { x1: 96, y1: 92, x2: 104, y2: 92 })));
  if (f.extra === 'hat') s.append(svg('path', { d: 'M40 62H160L150 50C140 20 60 20 50 50Z', fill: f.shirt, stroke: '#062A1F', 'stroke-width': 3 }));
  if (f.extra === 'earrings') s.append(svg('circle', { cx: 54, cy: 110, r: 6, fill: '#FFD23F' }), svg('circle', { cx: 146, cy: 110, r: 6, fill: '#FFD23F' }));
  if (f.extra === 'beard') s.append(svg('path', { d: 'M62 108C66 150 134 150 138 108C128 124 112 128 100 128S72 124 62 108Z', fill: f.hair }));
  return s;
}

function makeFaces(n) {
  const hairs = sample(HAIR, n), shirts = sample(SHIRT, n), extras = shuffle([...EXTRA, ...EXTRA]).slice(0, n);
  const names = sample(content.names, n);
  return names.map((name, i) => ({ name, skin: SKIN[Math.floor(Math.random() * SKIN.length)], hair: hairs[i], shirt: shirts[i], extra: extras[i], style: Math.floor(Math.random() * 4) }));
}

export default {
  id: 'face_name', domain: 'associative', icon: '🙂',
  mount(el, { level, easy, onDone, say, sound }) {
    let alive = true, correct = 0;
    const n = N[level] || 2;
    const faces = makeFaces(n);
    const start = performance.now();

    function meet(i) {
      if (i >= n) return quiz(shuffle(faces), 0);
      const f = faces[i];
      fill(el, 
        h('p', { class: 'center muted', text: `${i + 1} / ${n}` }),
        h('p', { class: 'prompt', text: t('fn_meet') }),
        faceSVG(f),
        h('p', { class: 'face-name', 'aria-live': 'polite', text: f.name }),
        btn({ icon: '👋', label: t('next'), variant: 'primary', onClick: () => meet(i + 1) }));
      say(`${t('fn_meet')} ${f.name}`);
    }

    function quiz(order, i) {
      const f = order[i];
      const others = faces.filter((x) => x !== f).map((x) => x.name);
      const pool = others.length >= 2 ? others : [...others, ...sample(content.names.filter((nm) => !faces.some((x) => x.name === nm)), 2)];
      const options = shuffle([f.name, ...sample(pool, 2)]);
      let answered = false;
      const feedback = h('p', { class: 'prompt', 'aria-live': 'polite' });
      const buttons = options.map((nm) => h('button', { type: 'button', class: 'choice', text: nm, onclick: async (e) => {
        if (answered) return;
        answered = true;
        if (nm === f.name) { correct++; e.currentTarget.classList.add('right'); sound.good(); feedback.textContent = tPick('cheer'); }
        else { e.currentTarget.classList.add('soft-miss'); sound.soft(); feedback.textContent = `${tPick('soft')} ${f.name}`; buttons[options.indexOf(f.name)].classList.add('right'); }
        await sleep(easy ? 1600 : 1100);
        if (!alive) return;
        if (i + 1 >= order.length) onDone({ score: Math.round((100 * correct) / n), accuracy: correct / n, timeMs: performance.now() - start });
        else quiz(order, i + 1);
      } }));
      fill(el, h('p', { class: 'prompt', text: t('fn_who') }), faceSVG(f), h('div', { class: 'choices' }, buttons), feedback);
      say(t('fn_who'));
    }

    meet(0);
    return () => { alive = false; };
  },
};

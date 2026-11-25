// Minimal SVG charts (no library). One series per chart; small multiples for brain areas.
import { h, svg } from './components.js';
import { parseDay, formatDate } from '../core/util.js';

/**
 * Line chart of 0–100 scores over time.
 * points: [{day:'YYYY-MM-DD', y:number, label?:string}]; baseline: number|null
 */
export function lineChart(points, { baseline = null, height = 250, ariaLabel = 'Chart', baselineLabel = '' } = {}) {
  const W = 420, H = height, L = 34, R = 12, T = 12, B = 28;
  const wrap = h('div', { class: 'chart' });
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaLabel });
  const ys = (v) => T + (H - T - B) * (1 - v / 100);
  // recessive grid
  for (const g of [0, 25, 50, 75, 100]) {
    root.append(svg('line', { class: 'grid', x1: L, x2: W - R, y1: ys(g), y2: ys(g) }));
    root.append(svg('text', { class: 'axis-label', x: L - 8, y: ys(g) + 4, 'text-anchor': 'end', text: String(g) }));
  }
  if (!points.length) { wrap.append(root); return wrap; }
  const t0 = parseDay(points[0].day).getTime();
  const t1 = parseDay(points[points.length - 1].day).getTime();
  const span = Math.max(1, t1 - t0);
  const xs = (d) => (points.length === 1 ? (L + W - R) / 2 : L + (W - L - R) * ((parseDay(d).getTime() - t0) / span));

  // x labels: first, middle, last
  const idx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  for (const i of idx) {
    const p = points[i];
    root.append(svg('text', { class: 'axis-label', x: xs(p.day), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle', text: parseDay(p.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) }));
  }
  if (baseline !== null) {
    root.append(svg('line', { class: 'base', x1: L, x2: W - R, y1: ys(baseline), y2: ys(baseline) }));
  }
  root.append(svg('polyline', { class: 'line', points: points.map((p) => `${xs(p.day)},${ys(p.y)}`).join(' ') }));

  const tip = h('div', { class: 'tip', hidden: true });
  const showTip = (p, dot) => {
    root.querySelectorAll('.dot.active').forEach((d) => d.classList.remove('active'));
    dot.classList.add('active');
    tip.textContent = `${formatDate(p.day)}: ${p.y}${p.label ? ' · ' + p.label : ''}`;
    tip.hidden = false;
    tip.style.left = `${(xs(p.day) / W) * 100}%`;
    tip.style.top = `${(ys(p.y) / H) * 100}%`;
  };
  const hideTip = () => { tip.hidden = true; root.querySelectorAll('.dot.active').forEach((d) => d.classList.remove('active')); };
  const showDots = points.length <= 60;
  points.forEach((p) => {
    const dot = svg('circle', { class: 'dot', cx: xs(p.day), cy: ys(p.y), r: showDots ? 5 : 0 });
    // hit target larger than the mark, keyboard-focusable
    const hit = svg('circle', { class: 'hit', cx: xs(p.day), cy: ys(p.y), r: 16, tabindex: 0, role: 'button', 'aria-label': `${formatDate(p.day)}: ${p.y}` });
    hit.addEventListener('pointerenter', () => showTip(p, dot));
    hit.addEventListener('click', () => showTip(p, dot));
    hit.addEventListener('focus', () => showTip(p, dot));
    hit.addEventListener('blur', hideTip);
    root.append(hit, dot);
  });
  root.addEventListener('pointerleave', hideTip);
  wrap.append(root, tip);
  if (baseline !== null && baselineLabel) {
    wrap.append(h('div', { class: 'legend' },
      h('span', {}, h('span', { class: 'k', 'aria-hidden': 'true' }), ariaLabel),
      h('span', {}, h('span', { class: 'k base', 'aria-hidden': 'true' }), `${baselineLabel} (${baseline})`)));
  }
  return wrap;
}

/** Tiny sparkline for brain areas / home. values: number[] (0–100) */
export function sparkline(values, label = '') {
  const W = 120, H = 40, P = 4;
  const root = svg('svg', { class: 'spark', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label, preserveAspectRatio: 'none' });
  if (values.length < 2) {
    root.append(svg('line', { class: 'grid', x1: 0, x2: W, y1: H / 2, y2: H / 2, stroke: '#2C7A60' }));
    return root;
  }
  const xs = (i) => P + (W - 2 * P) * (i / (values.length - 1));
  const lo = Math.min(...values) - 5, hi = Math.max(...values) + 5;
  const ys = (v) => P + (H - 2 * P) * (1 - (v - lo) / (hi - lo));
  root.append(svg('polyline', { points: values.map((v, i) => `${xs(i)},${ys(v)}`).join(' '), fill: 'none', stroke: '#FFD23F', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
  const last = values.length - 1;
  root.append(svg('circle', { cx: xs(last), cy: ys(values[last]), r: 3.5, fill: '#FFD23F' }));
  return root;
}

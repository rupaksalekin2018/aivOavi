// Tiny, safe DOM builder. Text is always set with textContent, never innerHTML (prevents XSS).
import { t } from '../i18n/t.js';

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style') Object.assign(el.style, v); // CSSOM: allowed by our strict CSP
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

/** Replace an element's children, skipping null/false (native replaceChildren would print "null"). */
export function fill(el, ...children) { el.replaceChildren(); append(el, children); return el; }
/** Append children, skipping null/false. */
export function add(el, ...children) { append(el, children); return el; }

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) if (c) el.append(c);
  return el;
}

/** Big button: icon + words (never icon alone). */
export function btn({ icon, label, sub, variant = 'primary', onClick, aria, cls = '', disabled, type = 'button', dataset }) {
  return h('button', { type, class: `btn btn-${variant} ${cls}`, onclick: onClick, 'aria-label': aria, disabled, dataset },
    icon ? h('span', { class: 'ico', 'aria-hidden': 'true', text: icon }) : null,
    sub ? h('span', {}, h('span', { text: label }), h('br'), h('span', { class: 'small muted', text: sub })) : h('span', { text: label }));
}

/** aivOavi logo: "aiv" + yellow brain (as the O) + "avi". */
export function logo(cls = '') {
  return h('span', { class: `logo ${cls}`, role: 'img', 'aria-label': 'aivOavi' },
    h('span', { 'aria-hidden': 'true', text: 'aiv' }),
    h('img', { class: 'logo-o', src: 'assets/brain.svg', alt: '', 'aria-hidden': 'true' }),
    h('span', { 'aria-hidden': 'true', text: 'avi' }));
}

export function avi(cls = 'idle') {
  return h('img', { class: `avi ${cls}`, src: 'assets/avi.svg', alt: 'Avi the brain' });
}

export function mood(img, kind) {
  if (!img) return;
  img.classList.remove('idle', 'happy', 'wiggle');
  void img.offsetWidth; // restart animation
  img.classList.add(kind);
}

/** Start / end marker: shows the user where to begin (▼ Start here) and when to stop (■ finished). */
export function marker(kind, text, sub = '') {
  if (kind === 'start') return h('p', { class: 'marker marker-start', dataset: { marker: 'start' } }, h('span', { 'aria-hidden': 'true', text: '▼ ' }), text);
  return h('div', { class: 'card card-ok marker-end stack', role: 'status', dataset: { marker: 'end' } },
    h('div', { class: 'status-title' }, h('span', { 'aria-hidden': 'true', text: '■ ' }), text),
    sub ? h('p', { text: sub }) : null);
}

export function card(cls, ...children) { return h('div', { class: `card ${cls || ''}` }, ...children); }

/** Status card: kind = ok (neon green) | warn (orange) | info. Always icon + words, never colour alone. */
export function statusCard(kind, title, body) {
  const icon = kind === 'ok' ? '✅' : kind === 'warn' ? '⚠️' : kind === 'up' ? '📈' : '🌱';
  const cls = kind === 'ok' || kind === 'up' ? 'card-ok' : kind === 'warn' ? 'card-warn' : '';
  return h('div', { class: `card status ${cls}`, role: 'status', dataset: { status: kind } },
    h('span', { class: 'status-ico', 'aria-hidden': 'true', text: icon }),
    h('div', {}, h('div', { class: 'status-title', text: title }), h('p', { class: 'muted', text: body })));
}

export function stars(n, of = 3) {
  const el = h('div', { class: 'stars', role: 'img', 'aria-label': `${n} of ${of} stars` });
  for (let i = 0; i < of; i++) el.append(h('span', { class: i < n ? '' : 'off', 'aria-hidden': 'true', text: '★' }));
  return el;
}

export function announce(msg) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 30);
}

let toastTimer;
export function toast(msg, ms = 3200) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status', text: msg });
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}

/** Modal dialog. actions: [{label, icon, variant, value}]. Resolves with the chosen value. */
export function modal({ title, body, actions, content }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(undefined); };
    const box = h('div', { class: 'modal stack', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mdl-title' },
      h('h2', { id: 'mdl-title', text: title }),
      body ? h('p', { text: body }) : null,
      content || null,
      h('div', { class: 'stack' }, actions.map((a) => btn({ ...a, onClick: () => close(typeof a.value === 'function' ? a.value() : a.value) }))));
    const back = h('div', { class: 'modal-back' }, box);
    document.getElementById('overlay').append(back);
    document.addEventListener('keydown', onKey);
    box.querySelector('button')?.focus();
  });
}

export const confirmModal = (title, body, yes = t('yes'), no = t('no')) =>
  modal({ title, body, actions: [{ label: yes, variant: 'primary', value: true }, { label: no, variant: 'secondary', value: false }] });

export function confetti() {
  if (document.documentElement.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#FFD23F', '#39FF14', '#FF8A00', '#FFFFFF', '#7FD6FF'];
  const wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 80; i++) {
    wrap.append(h('i', { style: {
      left: `${Math.random() * 100}%`, background: colors[i % colors.length],
      animationDelay: `${Math.random() * 0.8}s`, animationDuration: `${1.8 + Math.random() * 1.6}s`,
      transform: `rotate(${Math.random() * 360}deg)`,
    } }));
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 4000);
}

/** Number keypad for PINs: big keys, no typing needed. */
export function keypad({ min = 4, max = 6, onSubmit, submitLabel = t('ok') }) {
  let value = '';
  const dots = h('div', { class: 'pin-dots', 'aria-hidden': 'true' });
  const live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
  const submit = btn({ icon: '✔', label: submitLabel, variant: 'primary', disabled: true, onClick: () => { const v = value; value = ''; render(); onSubmit(v); } });
  function render() {
    dots.replaceChildren(...Array.from({ length: Math.max(min, value.length) }, (_, i) => h('span', { class: i < value.length ? 'on' : '' })));
    live.textContent = `${value.length} digits`;
    submit.disabled = value.length < min;
  }
  const key = (d) => h('button', { type: 'button', class: 'btn btn-secondary', 'aria-label': String(d), onclick: () => { if (value.length < max) { value += d; render(); } } }, String(d));
  const pad = h('div', { class: 'keypad' },
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map(key),
    h('button', { type: 'button', class: 'btn btn-quiet', 'aria-label': 'Delete', onclick: () => { value = value.slice(0, -1); render(); } }, '⌫'),
    key(0),
    h('span'));
  render();
  const el = h('div', { class: 'stack' }, dots, live, pad, submit);
  el.addEventListener('keydown', (e) => {
    if (/^\d$/.test(e.key) && value.length < max) { value += e.key; render(); }
    else if (e.key === 'Backspace') { value = value.slice(0, -1); render(); }
    else if (e.key === 'Enter' && value.length >= min) submit.click();
  });
  el.tabIndex = -1;
  return el;
}

/** Progress dots: e.g. game 2 of 3. */
export function stepDots(total, current) {
  return h('div', { class: 'steps', role: 'img', 'aria-label': t('gameOf', { n: current + 1, total }) },
    Array.from({ length: total }, (_, i) => h('span', { class: i < current ? 'done' : i === current ? 'now' : '' })));
}

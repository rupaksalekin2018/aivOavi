// Brain Check-up: a self-screening (NOT a diagnosis). Original tasks covering recall, orientation,
// attention, visuospatial skills and word finding / categorisation.
import { store } from '../core/store.js';
import { h, btn, avi, card, statusCard, confetti, marker } from '../ui/components.js';
import { t, content } from '../i18n/t.js';
import { sample, shuffle, sleep, dayKey, avg, formatDate } from '../core/util.js';
import { orientationQuestions, runQuiz } from '../games/today-quiz.js';
import { numberBoard, pathItems } from '../games/number-path.js';
import { recognitionGrid } from '../games/word-garden.js';
import clockSetter from '../games/clock-setter.js';
import { checkupStatus, checkSessions } from '../core/scoring.js';
import { CHECK_XP } from '../core/gamify.js';
import { markPlayedToday } from '../core/notify.js';
import { sound } from '../core/sound.js';

export const CHECK_DOMAINS = ['recall', 'orientation', 'attention', 'visuospatial', 'fluency'];
const PARTS = 6;

export function domainBar(label, value) {
  const cls = value >= 70 ? 'ok' : value < 50 ? 'warn' : '';
  const word = value >= 70 ? '✅' : value < 50 ? '⚠️' : '•';
  return h('div', { class: 'stack', style: { gap: '6px' } },
    h('div', { class: 'spread' }, h('span', { text: label }), h('strong', { text: `${word} ${value}` })),
    h('div', { class: `bar ${cls}`, role: 'img', 'aria-label': `${label}: ${value} / 100` }, h('span', { style: { width: `${value}%` } })));
}

export async function render(main, _params, app) {
  let stop = null;
  const scores = {};
  const words = sample(content.words, 5);
  const distractors = sample(content.words.filter((w) => !words.includes(w)), 7);
  const settings = app.settings();
  const ctx = { easy: false, sound, say: app.say };
  const frame = (n, ...children) => {
    if (stop) { stop(); stop = null; }
    main.replaceChildren(h('div', { class: 'stack' },
      n ? h('p', { class: 'center muted', text: t('ck_part', { n, total: PARTS }) }) : null, ...children));
  };

  function intro() {
    frame(0,
      h('h1', { class: 'center' }, '🩺 ', t('ck_title')),
      avi('idle avi-sm'),
      h('p', { text: t('ck_intro') }),
      h('p', { class: 'disclaimer', text: t('ck_disclaimer') }),
      marker('start', t('startHere')),
      btn({ icon: '▶', label: t('start'), cls: 'btn-giant', onClick: learnWords, dataset: { testid: 'ck-start' } }));
    app.setSpeech(`${t('ck_title')}. ${t('ck_intro')} ${t('ck_disclaimer')}`);
  }

  function learnWords() {
    frame(1,
      h('p', { class: 'prompt', text: t('ck_words_learn') }),
      h('div', { class: 'stack' }, words.map((w) => h('div', { class: 'big-word', text: w }))),
      btn({ icon: '✔', label: t('ck_words_ready'), onClick: orientation, dataset: { testid: 'ck-words-ready' } }));
    app.setSpeech(`${t('ck_words_learn')} ${words.join(', ')}`);
  }

  function orientation() {
    const area = h('div');
    frame(2, h('h2', { text: t('ck_orient') }), area);
    app.setSpeech(t('ck_orient'));
    stop = runQuiz(area, { ...ctx, questions: orientationQuestions({ hemisphere: settings.hemisphere, options: 4 }), onDone: (r) => { scores.orientation = r.score; trailA(); } });
  }

  function trailA() {
    const area = h('div');
    frame(3, h('h2', { text: t('ck_trail_a') }), area);
    app.setSpeech(t('ck_trail_a'));
    stop = numberBoard(area, { ...ctx, items: pathItems(10, false), perItemMs: 2500, onDone: (r) => { scores.trailA = r.score; trailB(); } });
  }

  function trailB() {
    const area = h('div');
    frame(3, h('h2', { text: t('ck_trail_b') }), area);
    app.setSpeech(t('ck_trail_b'));
    stop = numberBoard(area, { ...ctx, items: pathItems(10, true), perItemMs: 3500, onDone: (r) => { scores.attention = Math.round(avg([scores.trailA, r.score])); clock(); } });
  }

  function clock() {
    const area = h('div');
    frame(4, h('h2', { text: t('ck_clock') }), area);
    app.setSpeech(t('ck_clock'));
    stop = clockSetter.mount(area, { ...ctx, level: 3, rounds: 2, onDone: (r) => { scores.visuospatial = r.score; fluency(); } });
  }

  function fluency() {
    const animals = sample(content.animals, 10), others = sample(content.notAnimals, 10);
    const items = shuffle([...animals, ...others]);
    const chosen = new Set();
    let timer = null, left = 60, finished = false;
    const timerEl = h('span', { class: 'timer', 'aria-live': 'off', text: '60' });
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      const hits = [...chosen].filter((it) => animals.includes(it)).length;
      const fa = chosen.size - hits;
      scores.fluency = Math.round(Math.max(0, (100 * (hits - fa)) / animals.length));
      recall();
    };
    const grid = h('div', { class: 'choices compact', hidden: true }, items.map((it) => {
      const b = h('button', { type: 'button', class: 'choice', 'aria-pressed': 'false', 'aria-label': it[1], onclick: () => {
        if (chosen.has(it)) chosen.delete(it); else { chosen.add(it); sound.tap(); }
        b.classList.toggle('selected', chosen.has(it));
        b.setAttribute('aria-pressed', String(chosen.has(it)));
      } }, h('span', { class: 'emo', 'aria-hidden': 'true', text: it[0] }), h('span', { text: it[1] }));
      return b;
    }));
    const doneBtn = btn({ icon: '✔', label: t('done'), hidden: true, onClick: finish, dataset: { testid: 'ck-fluency-done' } });
    doneBtn.hidden = true;
    const go = btn({ icon: '⏱️', label: t('ck_fluency_go'), cls: 'btn-giant', dataset: { testid: 'ck-fluency-go' }, onClick: () => {
      go.remove(); grid.hidden = false; doneBtn.hidden = false;
      timer = setInterval(() => { left--; timerEl.textContent = String(left); if (left <= 0) finish(); }, 1000);
    } });
    frame(5, h('div', { class: 'game-head' }, h('h2', { text: '🐾' }), timerEl), h('p', { class: 'prompt', text: t('ck_fluency') }), go, grid, doneBtn);
    app.setSpeech(t('ck_fluency'));
    stop = () => clearInterval(timer);
  }

  function recall() {
    const area = h('div');
    frame(6, area);
    app.setSpeech(t('ck_recall'));
    recognitionGrid(area, { targets: words, distractors, prompt: t('ck_recall'), onDone: (r) => { scores.recall = r.score; results(); } });
  }

  async function results() {
    const domains = Object.fromEntries(CHECK_DOMAINS.map((d) => [d, scores[d]]));
    const prior = checkSessions(store.sessions());
    const baseline = prior[0] || null;
    const st = checkupStatus(domains, baseline);
    await store.addSession({ type: 'check', domains, total: st.total, status: st.status, xp: CHECK_XP, at: new Date().toISOString(), day: dayKey() });
    await markPlayedToday();
    const ok = st.status === 'ok';
    frame(0,
      h('h1', { class: 'center', text: t('ck_result') }),
      avi(ok ? 'happy' : 'idle avi-sm'),
      statusCard(ok ? 'ok' : 'warn', t(ok ? 'ck_ok_title' : 'ck_warn_title'), t(ok ? 'ck_ok_body' : 'ck_warn_body')),
      card('stack', ...CHECK_DOMAINS.map((d) => domainBar(t('d_' + d), domains[d])),
        h('p', { class: 'muted small', text: `${t('score')}: ${st.total} / 100 · ${formatDate(dayKey())}` })),
      h('p', { text: baseline ? t('ck_vs', { d: (st.drop >= 0 ? '+' : '') + st.drop }) : t('ck_baseline') }),
      h('p', { class: 'muted', text: t('ck_next') }),
      h('p', { class: 'disclaimer small', text: t('ck_disclaimer') }),
      marker('end', t('ck_end')),
      btn({ icon: '🖨️', label: t('ck_print'), variant: 'secondary', onClick: () => app.navigate('summary') }),
      btn({ icon: '🏠', label: t('home'), onClick: () => app.navigate('home'), dataset: { testid: 'finish' } }));
    app.setSpeech(`${t(ok ? 'ck_ok_title' : 'ck_warn_title')}. ${t(ok ? 'ck_ok_body' : 'ck_warn_body')}`);
    if (ok) { confetti(); sound.win(); }
    await sleep(0);
  }

  intro();
  return () => { if (stop) stop(); };
}

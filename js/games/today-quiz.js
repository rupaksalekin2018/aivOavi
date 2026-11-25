import { h, fill } from '../ui/components.js';
import { t, tPick } from '../i18n/t.js';
import { shuffle, sample, sleep } from '../core/util.js';

export function seasonIndex(date, hemisphere) {
  const m = date.getMonth(); // 0=Jan
  const north = m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3;
  return hemisphere === 'south' ? (north + 2) % 4 : north;
}
const partIndex = (hr) => (hr >= 5 && hr < 12 ? 0 : hr >= 12 && hr < 17 ? 1 : hr >= 17 && hr < 21 ? 2 : 3);

function choicesFrom(correct, pool, n) {
  return shuffle([correct, ...sample(pool.filter((x) => x !== correct), n - 1)]);
}

/** Orientation questions about "now". Shared with the check-up. */
export function orientationQuestions({ now = new Date(), hemisphere = 'north', options = 3 } = {}) {
  const days = t('days'), months = t('months'), seasons = t('seasons'), parts = t('parts');
  const year = now.getFullYear();
  const qs = [
    { id: 'day', q: t('tq_day'), answer: days[now.getDay()], options: choicesFrom(days[now.getDay()], days, options) },
    { id: 'month', q: t('tq_month'), answer: months[now.getMonth()], options: choicesFrom(months[now.getMonth()], months, options) },
    { id: 'year', q: t('tq_year'), answer: String(year), options: shuffle([year, year - 1, year + 1, year - 2].slice(0, options).map(String)) },
  ];
  if (hemisphere !== 'off') {
    const s = seasons[seasonIndex(now, hemisphere)];
    qs.push({ id: 'season', q: t('tq_season'), answer: s, options: choicesFrom(s, seasons, Math.min(options, 4)) });
  } else {
    const p = parts[partIndex(now.getHours())];
    qs.push({ id: 'part', q: t('tq_part'), answer: p, options: choicesFrom(p, parts, Math.min(options, 4)) });
  }
  return qs;
}

function generalQuestion(options) {
  const days = t('days');
  if (Math.random() < 0.5) return { q: t('tq_week'), answer: '7', options: shuffle(['7', '5', '10', '6'].slice(0, options)) };
  const i = Math.floor(Math.random() * 7);
  const ans = days[(i + 1) % 7];
  return { q: t('tq_after', { d: days[i] }), answer: ans, options: choicesFrom(ans, days, options) };
}

/** Plays a list of multiple-choice questions. Reused by the check-up. */
export function runQuiz(el, { questions, easy, say, sound, onDone }) {
  let alive = true, i = 0, correct = 0;
  const results = {};
  function show() {
    const q = questions[i];
    let answered = false;
    const feedback = h('p', { class: 'prompt', 'aria-live': 'polite' });
    const buttons = q.options.map((o) => h('button', { type: 'button', class: 'choice', text: o, onclick: async (e) => {
      if (answered) return;
      answered = true;
      const ok = o === q.answer;
      results[q.id || i] = ok;
      if (ok) { correct++; e.currentTarget.classList.add('right'); sound.good(); feedback.textContent = tPick('cheer'); }
      else { e.currentTarget.classList.add('soft-miss'); sound.soft(); feedback.textContent = tPick('soft'); buttons[q.options.indexOf(q.answer)].classList.add('right'); }
      await sleep(easy ? 1500 : 1000);
      if (!alive) return;
      if (++i >= questions.length) onDone({ score: Math.round((100 * correct) / questions.length), accuracy: correct / questions.length, results });
      else show();
    } }));
    fill(el, 
      h('p', { class: 'center muted', text: `${i + 1} / ${questions.length}` }),
      h('p', { class: 'prompt', text: q.q }),
      h('div', { class: 'choices' }, buttons), feedback);
    say(q.q);
  }
  show();
  return () => { alive = false; };
}

export default {
  id: 'today_quiz', domain: 'orientation', icon: '📅',
  mount(el, { level, easy, onDone, say, sound, hemisphere }) {
    const options = level <= 2 ? 3 : 4;
    const qs = shuffle(orientationQuestions({ hemisphere, options })).slice(0, 4);
    qs.push(generalQuestion(options));
    const start = performance.now();
    return runQuiz(el, { questions: qs, easy, say, sound, onDone: (r) => onDone({ ...r, timeMs: performance.now() - start }) });
  },
};


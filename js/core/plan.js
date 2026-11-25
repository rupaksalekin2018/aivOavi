// Today's 3 games: rotate brain areas, include the weakest one, avoid repeating yesterday.
import { store } from './store.js';
import { gameSessions } from './scoring.js';
import { dayKey, daysBetween, seeded, shuffle, avg } from './util.js';
import { GAME_IDS } from '../games/index.js';

export const PLAN_SIZE = 3;

export async function todaysPlan() {
  const today = dayKey();
  const saved = store.get('plan');
  if (saved && saved.day === today) return saved;
  const rnd = seeded(today + (store.get('profile', {}).createdAt || ''));
  const games = gameSessions(store.sessions());
  const recent = new Set(games.filter((s) => daysBetween(s.day, today) <= 1).map((s) => s.game));

  // Weakest game over the last 30 days (needs 2+ plays to count).
  let weakest = null, low = Infinity;
  for (const id of GAME_IDS) {
    const list = games.filter((s) => s.game === id && daysBetween(s.day, today) <= 30);
    if (list.length >= 2) { const a = avg(list.map((s) => s.ability)); if (a < low) { low = a; weakest = id; } }
  }
  const fresh = shuffle(GAME_IDS.filter((id) => !recent.has(id) && id !== weakest), rnd);
  const rest = shuffle(GAME_IDS.filter((id) => recent.has(id) && id !== weakest), rnd);
  const pickList = [...(weakest ? [weakest] : []), ...fresh, ...rest].slice(0, PLAN_SIZE);
  const plan = { day: today, games: pickList };
  await store.set('plan', plan);
  return plan;
}

/** Which of today's planned games are done. */
export function planStatus(plan) {
  const today = dayKey();
  const playedToday = gameSessions(store.sessions()).filter((s) => s.day === today).map((s) => s.game);
  const done = plan.games.map((id) => playedToday.includes(id));
  return { done, count: done.filter(Boolean).length, complete: done.every(Boolean), nextIndex: done.indexOf(false) };
}

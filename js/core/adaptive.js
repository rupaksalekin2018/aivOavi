// Adaptive difficulty. Normal mode chases a challenge; Easy mode stays in a comfort zone (~80% right).
import { store } from './store.js';

export const MAX_LEVEL = 6;
export const EASY_MAX_LEVEL = 3;

export function getLevel(gameId) {
  const levels = store.get('levels', {});
  const easy = store.get('settings', {}).easy;
  const lvl = levels[gameId] || 1;
  return easy ? Math.min(lvl, EASY_MAX_LEVEL) : lvl;
}

/** Decide the next level after a session. Returns {level, change}. */
export async function updateLevel(gameId, score) {
  const easy = !!store.get('settings', {}).easy;
  const levels = store.get('levels', {});
  const cur = getLevel(gameId);
  const recent = store.sessions().filter((s) => s.type === 'game' && s.game === gameId && s.level === cur).slice(-2).map((s) => s.score);
  const [upAt, downAt, max] = easy ? [90, 65, EASY_MAX_LEVEL] : [85, 50, MAX_LEVEL];
  let next = cur;
  if (recent.length >= 2 && recent.every((s) => s >= upAt)) next = Math.min(max, cur + 1);
  else if (score < downAt) next = Math.max(1, cur - 1);
  if (next !== cur) { levels[gameId] = next; await store.set('levels', levels); }
  return { level: next, change: Math.sign(next - cur) };
}

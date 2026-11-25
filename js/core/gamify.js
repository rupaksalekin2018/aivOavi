// XP, levels, streaks, garden and badges. Everything is computed from the session history,
// so it can never drift out of sync with what actually happened.
import { gameSessions, checkSessions } from './scoring.js';
import { dayKey, addDays, weekOf, seeded } from './util.js';
import { t } from '../i18n/t.js';

export const LEVEL_XP = [0, 100, 300, 700, 1500];
export const DAY_BONUS_XP = 25;
export const CHECK_XP = 50;

export const xpForGame = (score) => 10 + Math.round(score / 10) * 2; // 10..30

export function fullDays(sessions) {
  const count = new Map();
  for (const s of gameSessions(sessions)) count.set(s.day, (count.get(s.day) || 0) + 1);
  return [...count.entries()].filter(([, n]) => n >= 3).map(([d]) => d).sort();
}

export function totalXP(sessions) {
  return sessions.reduce((a, s) => a + (s.xp || 0), 0) + DAY_BONUS_XP * fullDays(sessions).length;
}

export function levelInfo(xp) {
  const names = t('levels');
  let idx = 0;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) idx = i;
  const next = LEVEL_XP[idx + 1];
  const progress = next ? (xp - LEVEL_XP[idx]) / (next - LEVEL_XP[idx]) : 1;
  return { idx, num: idx + 1, name: names[idx], next, progress };
}

/** Current and best streak. One missed day per week is forgiven ("rest day"). */
export function streak(sessions, today = dayKey()) {
  const active = new Set(sessions.map((s) => s.day));
  if (!active.size) return { current: 0, best: 0, activeToday: false };
  const first = [...active].sort()[0];
  let run = 0, best = 0;
  const used = new Set();
  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (active.has(d)) run++;
    else if (d === today) { /* day not over yet */ }
    else if (run > 0 && !used.has(weekOf(d))) used.add(weekOf(d));
    else run = 0;
    best = Math.max(best, run);
  }
  return { current: run, best, activeToday: active.has(today) };
}

const PLANTS = ['🌱', '🌷', '🌻', '🌼', '🌸', '🌹', '🪻', '🌳', '🍀', '🌺', '🌵', '🍄'];
export function garden(sessions) {
  return fullDays(sessions).map((d) => ({ day: d, plant: PLANTS[Math.floor(seeded(d)() * PLANTS.length)] }));
}

export function badges(sessions, gameIds) {
  const games = gameSessions(sessions);
  const played = new Set(games.map((s) => s.game));
  const { best } = streak(sessions);
  const defs = [
    ['first', '🎉', games.length >= 1],
    ['check', '🩺', checkSessions(sessions).length >= 1],
    ['streak3', '🔥', best >= 3],
    ['streak7', '🏅', best >= 7],
    ['streak30', '🏆', best >= 30],
    ['games25', '🎯', games.length >= 25],
    ['games100', '💯', games.length >= 100],
    ['explorer', '🧭', gameIds.every((id) => played.has(id))],
    ['perfect', '⭐', games.some((s) => s.score >= 100)],
    ['garden10', '🌳', fullDays(sessions).length >= 10],
  ];
  return defs.map(([id, emo, got]) => ({ id, emo, got, name: t('b_' + id) }));
}

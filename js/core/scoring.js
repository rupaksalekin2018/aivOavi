// Scores and trends. All maths runs on the device.
// NOTE: thresholds are sensible heuristics for a self-check app, not clinically validated cut-offs.
import { clamp, avg, weekOf } from './util.js';

/**
 * "Ability" folds difficulty level into the score so that the adaptive engine lowering
 * the level cannot hide a real decline. Level 1 @ 60% = 40; each level adds 10.
 */
export function ability(score, level) {
  return Math.round(clamp(40 + (level - 1) * 10 + (score - 60) * 0.5, 0, 100));
}

export const gameSessions = (sessions) => sessions.filter((s) => s.type === 'game');
export const checkSessions = (sessions) => sessions.filter((s) => s.type === 'check');

/** Weekly averages of ability: [{week:'YYYY-MM-DD', avg, n}] sorted by week. */
export function weekly(sessions, filter = () => true) {
  const map = new Map();
  for (const s of gameSessions(sessions)) {
    if (!filter(s)) continue;
    const w = weekOf(s.day);
    if (!map.has(w)) map.set(w, []);
    map.get(w).push(s.ability);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([week, v]) => ({ week, avg: Math.round(avg(v)), n: v.length }));
}

/** Daily averages: [{day, avg, n}] */
export function daily(sessions, filter = () => true) {
  const map = new Map();
  for (const s of gameSessions(sessions)) {
    if (!filter(s)) continue;
    if (!map.has(s.day)) map.set(s.day, []);
    map.get(s.day).push(s.ability);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, v]) => ({ day, avg: Math.round(avg(v)), n: v.length }));
}

/**
 * Trend status for the whole brain score.
 * baseline = average of the first 2 weeks with games.
 * rolling  = average of the last 4 weeks (ending at each week).
 * warn     = the rolling average has been >=10% below baseline for the last 3 weeks in a row.
 */
export function trend(sessions) {
  const weeks = weekly(sessions);
  if (weeks.length < 3) return { status: 'new', weeks, baseline: null };
  const baseline = avg(weeks.slice(0, 2).map((w) => w.avg));
  const rolling = weeks.map((_, i) => avg(weeks.slice(Math.max(0, i - 3), i + 1).map((w) => w.avg)));
  const last3 = rolling.slice(-3);
  const latest = rolling[rolling.length - 1];
  let status = 'ok';
  if (weeks.length >= 4 && last3.every((r) => r <= baseline * 0.9)) status = 'warn';
  else if (latest >= baseline * 1.05) status = 'up';
  return { status, weeks, baseline: Math.round(baseline), latest: Math.round(latest) };
}

/** Per-domain latest average (last 14 days with data, max 10 sessions). */
export function domainSnapshot(sessions, domain) {
  const list = gameSessions(sessions).filter((s) => s.domain === domain).slice(-10);
  return list.length ? Math.round(avg(list.map((s) => s.ability))) : null;
}

/**
 * Check-up result.
 * ok  : total >= 75, no area below 50 and not 10+ points below the first check-up.
 * warn: otherwise.
 */
export function checkupStatus(domains, baseline) {
  const vals = Object.values(domains);
  const total = Math.round(avg(vals));
  const lowArea = vals.some((v) => v < 50);
  const drop = baseline ? total - baseline.total : 0;
  const status = total >= 75 && !lowArea && drop > -10 ? 'ok' : 'warn';
  return { total, status, drop };
}

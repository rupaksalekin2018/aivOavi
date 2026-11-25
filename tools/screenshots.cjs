// Regenerates the README screenshots in docs/screenshots/.
// Run: node tools/screenshots.cjs   (uses the preinstalled Playwright + Chromium)
// Every screenshot runs in a fresh, private browser profile with made-up demo data.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const PORT = 8092;
const BASE = `http://localhost:${PORT}/`;
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const VIEWPORT = { width: 390, height: 844 };
// Larger screens: an iPad-sized tablet (portrait) and a common laptop/desktop window.
const DEVICES = [
  { dir: 'tablet', viewport: { width: 820, height: 1180 }, scale: 2 },
  { dir: 'desktop', viewport: { width: 1440, height: 900 }, scale: 1 },
];

let browser;

async function newPage(viewport = VIEWPORT, deviceScaleFactor = 2) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor, reducedMotion: 'reduce', timezoneId: 'Europe/London', locale: 'en-GB' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(BASE);
  return page;
}

const btnText = (page, text) => page.locator('button', { hasText: text }).first();

async function shot(page, name, { fullPage = false, top = true } = {}) {
  if (!name.includes('/')) name = 'phone/' + name;
  await page.mouse.move(0, 0);
  await page.waitForTimeout(350);
  await page.evaluate((top) => { document.querySelectorAll('.toast').forEach((n) => n.remove()); if (top) window.scrollTo(0, 0); }, top);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage });
  console.log('  ✓', name);
}

async function onboard(page, { path: p = 'prevent', name = 'Rosa', pin = null, shots = false } = {}) {
  if (shots) await shot(page, '01-welcome');
  await btnText(page, 'Start').click();
  if (shots) await shot(page, '02-choose-path');
  await page.locator(`button[data-path="${p}"]`).click();
  await page.fill('#ob-name', name);
  await btnText(page, 'Continue').click();
  if (shots) await shot(page, '03-reminder-time');
  await btnText(page, 'No reminders').click();
  if (pin) {
    await btnText(page, 'Add a PIN').click();
    for (let k = 0; k < 2; k++) {
      for (const d of pin) await page.locator(`.keypad button[aria-label="${d}"]`).click();
      await page.locator('.stack > button.btn-primary', { hasText: 'OK' }).click();
    }
  } else {
    await btnText(page, 'Not now').click();
  }
  await btnText(page, 'Go to my home screen').click();
  await page.waitForSelector(p === 'check' ? '[data-testid=ck-start]' : '[data-testid=play-today]');
}

/** Six weeks of believable demo history (up to yesterday): 3 games most days, a slow upward trend, two check-ups. */
async function seedHistory(page, { weeks = 6, start = 58, end = 74, checks = true } = {}) {
  await page.evaluate(async ({ weeks, start, end, checks }) => {
    const { store } = await import('./js/core/store.js');
    const { GAMES } = await import('./js/games/index.js');
    const { addDays, dayKey } = await import('./js/core/util.js');
    const { checkupStatus } = await import('./js/core/scoring.js');
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const total = weeks * 7;
    for (let i = total; i >= 1; i--) {
      const day = addDays(dayKey(), -i);
      if (i % 7 === 3) continue; // a rest day each week
      const base = start + ((end - start) * (total - i)) / total;
      const n = i % 11 === 5 ? 2 : 3;
      for (let k = 0; k < n; k++) {
        const g = GAMES[(i * 3 + k) % GAMES.length];
        const ability = Math.round(Math.max(30, Math.min(95, base + (rnd() - 0.5) * 10)));
        const level = Math.max(1, Math.min(6, Math.round((ability - 40) / 10) + 1));
        const score = Math.round(Math.max(20, Math.min(100, 60 + (ability - (40 + (level - 1) * 10)) * 2)));
        await store.addSession({ type: 'game', game: g.id, domain: g.domain, score, level, ability, xp: 10 + Math.round(score / 10) * 2, at: `${day}T${String(9 + k).padStart(2, '0')}:30:00Z`, day });
      }
    }
    if (checks) {
      const first = { recall: 70, orientation: 100, attention: 72, visuospatial: 75, fluency: 70 };
      const second = { recall: 80, orientation: 100, attention: 78, visuospatial: 100, fluency: 80 };
      const s1 = checkupStatus(first, null);
      await store.addSession({ type: 'check', domains: first, total: s1.total, status: s1.status, xp: 50, at: `${addDays(dayKey(), -36)}T10:00:00Z`, day: addDays(dayKey(), -36) });
      const s2 = checkupStatus(second, { total: s1.total });
      await store.addSession({ type: 'check', domains: second, total: s2.total, status: s2.status, xp: 50, at: `${addDays(dayKey(), -5)}T10:00:00Z`, day: addDays(dayKey(), -5) });
    }
  }, { weeks, start, end, checks });
}

async function seedDecline(page) {
  await page.evaluate(async () => {
    const { store } = await import('./js/core/store.js');
    const { addDays, dayKey } = await import('./js/core/util.js');
    const weekly = [80, 80, 78, 66, 64, 62, 60, 60];
    const start = addDays(dayKey(), -7 * weekly.length + 1);
    for (let w = 0; w < weekly.length; w++) {
      for (let d = 0; d < 7; d += 2) {
        const day = addDays(start, w * 7 + d);
        if (day >= dayKey()) continue;
        await store.addSession({ type: 'game', game: 'word_garden', domain: 'recall', score: 70, level: 2, ability: weekly[w], xp: 20, at: day + 'T10:00:00Z', day });
      }
    }
  });
}

/** Opens a screen and waits until it has really re-rendered (seeded data is read fresh). */
async function go(page, hash, selector = 'main *') {
  await page.evaluate(() => document.querySelector('main')?.firstElementChild?.setAttribute('data-stale', '1'));
  if (await page.evaluate((h) => location.hash === h, '#/' + hash)) await page.reload();
  else await page.goto(BASE + '#/' + hash);
  await page.waitForFunction(() => !document.querySelector('main [data-stale]'));
  await page.waitForSelector(selector);
}

async function playMemoryMatchPerfectly(page) {
  await page.waitForFunction(() => document.querySelector('.prompt')?.textContent.includes('Remember'));
  const syms = await page.locator('.mm-card').allTextContents();
  await page.waitForFunction(() => document.querySelector('.prompt')?.textContent.includes('Find'), null, { timeout: 30000 });
  const seen = new Map();
  syms.forEach((s, i) => { if (!seen.has(s)) seen.set(s, []); seen.get(s).push(i); });
  for (const [a, b] of seen.values()) {
    await page.locator('.mm-card').nth(a).click();
    await page.locator('.mm-card').nth(b).click();
  }
  await page.waitForSelector('[data-testid=result]', { timeout: 10000 });
}

async function solveClock(page) {
  const target = (await page.locator('.prompt .logo-text-y').textContent()).trim();
  const label = () => page.locator('svg.clock').getAttribute('aria-label');
  for (let hTry = 0; hTry < 12; hTry++) {
    for (let mTry = 0; mTry < 4; mTry++) {
      if ((await label()) === `Clock showing ${target}`) return;
      await page.locator('button[aria-label="Minutes: Later"]').click();
    }
    await page.locator('button[aria-label="Hour: Later"]').click();
  }
}

async function main() {
  for (const d of ['phone', 'tablet', 'desktop']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.mjs'), String(PORT)], { stdio: 'pipe' });
  await new Promise((res) => server.stdout.on('data', (d) => String(d).includes('running') && res()));
  browser = await chromium.launch();
  try {
    // ---- Onboarding + "Keep my brain sharp" (Prevent) with six weeks of history
    console.log('Prevent path');
    let page = await newPage();
    await onboard(page, { shots: true, name: 'Rosa' });
    await seedHistory(page);
    await go(page, 'home', '[data-testid=play-today]');
    await shot(page, '04-home');
    await page.click('[data-testid=play-today]');
    await page.waitForSelector('[data-testid=start-game]');
    await shot(page, '05-game-intro');
    await go(page, 'progress', '[data-status]');
    await shot(page, '06-progress-ok');
    await shot(page, '07-progress-full', { fullPage: true });
    await go(page, 'garden', '.garden');
    await shot(page, '08-garden');
    await go(page, 'games', 'main button');
    await shot(page, '09-all-games');
    await go(page, 'settings', 'main button');
    await shot(page, '10-settings');
    // Caregiver area (sum gate, then the dashboard)
    await go(page, 'caregiver', 'main .prompt');
    await shot(page, '11-caregiver-gate');
    const q = await page.locator('main .prompt').textContent();
    const [, a, b] = q.match(/(\d+)\s*\+\s*(\d+)/);
    await page.locator('main .choice', { hasText: new RegExp(`^${Number(a) + Number(b)}$`) }).click();
    await page.waitForSelector('main h1');
    await page.waitForTimeout(300);
    await shot(page, '12-caregiver');
    await go(page, 'summary', 'main h1');
    await shot(page, '13-doctor-summary', { fullPage: true });

    // ---- Every game in action
    console.log('Games');
    const games = ['memory_match', 'pattern_echo', 'word_garden', 'number_path', 'odd_one_out', 'clock_setter', 'today_quiz', 'face_name'];
    for (const id of games) {
      await go(page, 'game/' + id, '[data-testid=start-game]');
      await page.click('[data-testid=start-game]');
      await page.waitForTimeout(id === 'pattern_echo' ? 600 : 900);
      await shot(page, 'game-' + id.replace(/_/g, '-'));
    }
    // A finished game with its reward screen
    await go(page, 'game/memory_match', '[data-testid=start-game]');
    await page.click('[data-testid=start-game]');
    await playMemoryMatchPerfectly(page);
    await page.waitForTimeout(800);
    await shot(page, '14-game-result');
    await page.context().close();

    // ---- Brain Check-up (Check path)
    console.log('Check-up');
    page = await newPage();
    await onboard(page, { path: 'check', name: 'Sam' });
    await shot(page, '15-checkup-intro');
    await page.click('[data-testid=ck-start]');
    const words = (await page.locator('.big-word').allTextContents()).map((w) => w.trim());
    await shot(page, '16-checkup-words');
    await page.click('[data-testid=ck-words-ready]');
    const answers = await page.evaluate(async () => {
      const { t } = await import('./js/i18n/t.js');
      const { seasonIndex } = await import('./js/games/today-quiz.js');
      const now = new Date();
      return [t('days')[now.getDay()], t('months')[now.getMonth()], String(now.getFullYear()), t('seasons')[seasonIndex(now, 'north')]];
    });
    for (let i = 0; i < 4; i++) {
      await page.waitForSelector('.choice:not(.right):not(.soft-miss)');
      if (i === 0) await shot(page, '17-checkup-orientation');
      const texts = (await page.locator('.choice').allTextContents()).map((s) => s.trim());
      const idx = Math.max(0, texts.findIndex((s) => answers.includes(s)));
      await page.locator('.choice').nth(idx).click();
      await page.waitForTimeout(1200);
    }
    for (let board = 0; board < 2; board++) {
      await page.waitForSelector('.np-dot');
      if (board === 1) await shot(page, '18-checkup-trail');
      const n = await page.locator('.np-dot').count();
      for (let i = 0; i < n; i++) await page.locator('.np-dot').nth(i).click();
      await page.waitForTimeout(150);
    }
    for (let i = 0; i < 2; i++) {
      await page.waitForSelector('svg.clock');
      await solveClock(page);
      if (i === 0) await shot(page, '19-checkup-clock', { top: false });
      await page.locator('button:not([disabled])', { hasText: 'Check' }).click();
      await page.waitForTimeout(1400);
    }
    await page.click('[data-testid=ck-fluency-go]');
    const animals = await page.evaluate(async () => (await import('./js/i18n/t.js')).content.animals.map((a) => a[1]));
    for (const c of await page.locator('.choice').all()) {
      if (animals.includes(await c.getAttribute('aria-label'))) await c.click();
    }
    await shot(page, '20-checkup-animals');
    await page.click('[data-testid=ck-fluency-done]');
    for (const c of await page.locator('.choice').all()) {
      if (words.includes((await c.textContent()).trim())) await c.click();
    }
    await page.locator('button', { hasText: 'Done' }).click();
    await page.waitForSelector('[data-status]');
    await page.waitForTimeout(1500);
    await shot(page, '21-checkup-result', { fullPage: true });
    await page.context().close();

    // ---- Daily brain training (Train path → Easy mode)
    console.log('Easy mode');
    page = await newPage();
    await onboard(page, { path: 'train', name: 'Grandpa Joe' });
    await seedHistory(page, { weeks: 3, start: 50, end: 56, checks: false });
    await go(page, 'home', '[data-testid=play-today]');
    await shot(page, '22-easy-home');
    await page.click('[data-testid=play-today]');
    await page.click('[data-testid=start-game]');
    await page.waitForTimeout(900);
    await shot(page, '23-easy-game');
    await page.context().close();

    // ---- Orange warning: a sustained dip vs. the personal baseline
    console.log('Warning trend');
    page = await newPage();
    await onboard(page, { name: 'Alex' });
    await seedDecline(page);
    await go(page, 'progress', '[data-status]');
    await shot(page, '24-progress-warning');
    await page.context().close();

    // ---- PIN lock
    console.log('PIN lock');
    page = await newPage();
    await onboard(page, { name: 'Rosa', pin: '2468' });
    await page.reload();
    await page.waitForSelector('.keypad');
    await shot(page, '25-pin-lock');
    await page.context().close();

    // ---- End of the day: today's 3 games are played, so Home says "You are finished for today"
    console.log('Finished for today');
    page = await newPage();
    await onboard(page, { name: 'Rosa' });
    await seedHistory(page);
    await page.evaluate(async () => {
      const { store } = await import('./js/core/store.js');
      const { todaysPlan } = await import('./js/core/plan.js');
      const { gameById } = await import('./js/games/index.js');
      const { dayKey } = await import('./js/core/util.js');
      const plan = await todaysPlan();
      for (const id of plan.games) await store.addSession({ type: 'game', game: id, domain: gameById(id).domain, score: 80, level: 3, ability: 72, xp: 26, at: new Date().toISOString(), day: dayKey() });
    });
    await go(page, 'home', '[data-marker=end]');
    await shot(page, '26-home-finished');
    await page.context().close();

    // ---- Tablet and desktop: the same app, laid out for bigger screens
    for (const dev of DEVICES) {
      console.log(dev.dir);
      const s = (name, opts) => shot(page, `${dev.dir}/${name}`, opts);
      page = await newPage(dev.viewport, dev.scale);
      await s('01-welcome');
      await onboard(page, { name: 'Rosa' });
      await seedHistory(page);
      await go(page, 'home', '[data-testid=play-today]');
      await s('02-home');
      await go(page, 'game/memory_match', '[data-testid=start-game]');
      await page.click('[data-testid=start-game]');
      await page.waitForTimeout(900);
      await s('03-game');
      await go(page, 'progress', '[data-status]');
      await s('04-progress');
      await go(page, 'garden', '.garden');
      await s('05-garden');
      await go(page, 'summary', 'main h1');
      await s('06-doctor-summary');
      await page.context().close();

      page = await newPage(dev.viewport, dev.scale);
      await onboard(page, { path: 'train', name: 'Grandpa Joe' });
      await seedHistory(page, { weeks: 3, start: 50, end: 56, checks: false });
      await go(page, 'home', '[data-testid=play-today]');
      await s('07-easy-home');
      await page.context().close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

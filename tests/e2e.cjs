// End-to-end tests for aivOavi. Uses the preinstalled Playwright + Chromium and Node's test runner.
// Run: node --test tests/e2e.cjs
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = 8091;
const BASE = `http://localhost:${PORT}/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'serve.mjs'), String(PORT)], { stdio: 'pipe' });
  await new Promise((res) => server.stdout.on('data', (d) => String(d).includes('running') && res()));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

/** Fresh, isolated browser profile; records problems and every network request. */
async function newPage(viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.problems = [];
  page.requests = [];
  page.on('console', (m) => {
    const txt = m.text();
    if (m.type() === 'error' || /Content Security Policy|missing key/i.test(txt)) page.problems.push(`${m.type()}: ${txt}`);
  });
  page.on('pageerror', (e) => page.problems.push('pageerror: ' + e.message));
  page.on('request', (r) => page.requests.push(r.url()));
  await page.goto(BASE);
  return page;
}
const btnText = (page, text) => page.locator('button', { hasText: text }).first();

async function onboard(page, { path = 'prevent', name = 'Rosa', pin = null } = {}) {
  await btnText(page, 'Start').click();
  await page.locator(`button[data-path="${path}"]`).click();
  await page.fill('#ob-name', name);
  await btnText(page, 'Continue').click();
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
  await page.waitForSelector(path === 'check' ? '[data-testid=ck-start]' : '[data-testid=play-today]');
}

/** Plays whatever game is on screen until the result appears. Works for all 8 games. */
async function playCurrentGame(page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await page.locator('[data-testid=result]').count()) return;
    // Memory Match: read the cards during the peek, then click the pairs.
    if (await page.locator('.mm-card').count()) {
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
      return;
    }
    const dots = page.locator('.np-dot:not(.done)');
    if (await dots.count()) {
      // DOM order == sequence order (1, 2, 3… or 1, A, 2, B…)
      await dots.first().click({ timeout: 3000 }).catch(() => {});
      continue;
    }
    const tile = page.locator('.pe-tile:not([disabled])');
    if (await tile.count()) { await tile.first().click({ timeout: 2000 }).catch(() => {}); continue; }
    const water = page.locator('button[aria-label="Water"]:not([disabled])');
    if (await water.count()) { await water.click({ timeout: 2000 }).catch(() => {}); continue; }
    const doneBtn = page.locator('button', { hasText: 'Done' });
    if (await doneBtn.count() && await page.locator('.choice').count()) {
      if (!(await page.locator('.choice.selected').count())) await page.locator('.choice').first().click({ timeout: 2000 }).catch(() => {});
      await doneBtn.first().click({ timeout: 2000 }).catch(() => {});
      continue;
    }
    const choice = page.locator('.choice:not(.right):not(.soft-miss)');
    if (await choice.count() && !(await page.locator('.choice.right, .choice.soft-miss').count())) { await choice.first().click({ timeout: 2000 }).catch(() => {}); continue; }
    const next = page.locator('button', { hasText: /^(👋|➜)?\s*Next$/ });
    if (await next.count()) { await next.first().click({ timeout: 2000 }).catch(() => {}); continue; }
    const check = page.locator('button:not([disabled])', { hasText: 'Check' });
    if (await check.count() && await page.locator('.clock').count()) { await check.first().click({ timeout: 2000 }).catch(() => {}); continue; }
    await page.waitForTimeout(250);
  }
  throw new Error('Game did not finish in time');
}

const sessionsInDB = (page) => page.evaluate(async () => (await import('./js/core/store.js')).store.sessions().length);

test('onboarding (prevent) → play today\'s 3 games → garden grows', async () => {
  const page = await newPage();
  await onboard(page);
  await page.waitForSelector('[data-testid=play-today]');
  for (let i = 0; i < 3; i++) {
    await page.click(i === 0 ? '[data-testid=play-today]' : '[data-testid=next-game]');
    await page.click('[data-testid=start-game]');
    await playCurrentGame(page);
  }
  assert.match(await page.textContent('main'), /finished today's games/);
  assert.equal(await sessionsInDB(page), 3);
  await page.click('[data-testid=finish]');
  await page.waitForSelector('text=You are finished for today');
  await page.goto(BASE + '#/garden');
  await page.waitForSelector('.garden .plant');
  assert.equal(await page.locator('.garden .plant').count(), 1);
  assert.deepEqual(page.problems, []);
  await page.context().close();
});

test('every game can be played to the end and is saved', async () => {
  const page = await newPage();
  await onboard(page);
  const ids = ['memory_match', 'pattern_echo', 'word_garden', 'number_path', 'odd_one_out', 'clock_setter', 'today_quiz', 'face_name'];
  for (const id of ids) {
    await page.goto(BASE + '#/game/' + id);
    await page.click('[data-testid=start-game]');
    await playCurrentGame(page);
  }
  const games = await page.evaluate(async () => (await import('./js/core/store.js')).store.sessions().map((s) => s.game));
  assert.deepEqual(games.sort(), ids.slice().sort());
  assert.deepEqual(page.problems, []);
  await page.context().close();
});

test('privacy: no request ever leaves our own origin; data at rest is ciphertext', async () => {
  const page = await newPage();
  await onboard(page, { name: 'Secretname' });
  await page.goto(BASE + '#/game/odd_one_out');
  await page.click('[data-testid=start-game]');
  await playCurrentGame(page);
  for (const pageName of ['progress', 'garden', 'settings', 'summary']) { await page.goto(BASE + '#/' + pageName); await page.waitForTimeout(300); }
  const foreign = page.requests.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:'));
  assert.deepEqual(foreign, [], 'third-party requests');
  const raw = await page.evaluate(() => new Promise((resolve) => {
    const r = indexedDB.open('aivoavi');
    r.onsuccess = () => {
      const tx = r.result.transaction(['data', 'sessions']);
      const a = tx.objectStore('data').getAll(), b = tx.objectStore('sessions').getAll();
      tx.oncomplete = () => resolve([...a.result, ...b.result].map((v) => ({
        keys: Object.keys(v).sort().join(','), isBytes: v.ct instanceof Uint8Array,
        text: new TextDecoder('utf-8', { fatal: false }).decode(v.ct),
      })));
    };
  }));
  assert.ok(raw.length >= 4);
  for (const r of raw) {
    assert.equal(r.keys, 'ct,iv');
    assert.ok(r.isBytes);
    assert.ok(!r.text.includes('Secretname') && !r.text.includes('"score"'), 'plaintext leaked');
  }
  // the device key is non-extractable
  const extractable = await page.evaluate(() => new Promise((resolve) => {
    const r = indexedDB.open('aivoavi');
    r.onsuccess = () => { const g = r.result.transaction('meta').objectStore('meta').get('key'); g.onsuccess = () => resolve(g.result.key.extractable); };
  }));
  assert.equal(extractable, false);
  assert.deepEqual(page.problems, []);
  await page.context().close();
});

test('check-up path runs the full screening and shows a coloured result', async () => {
  const page = await newPage();
  await onboard(page, { path: 'check' });
  await page.click('[data-testid=ck-start]');
  await page.click('[data-testid=ck-words-ready]');
  for (let i = 0; i < 4; i++) { await page.locator('.choice').first().click(); await page.waitForTimeout(1100); }
  for (let board = 0; board < 2; board++) {
    await page.waitForSelector('.np-dot');
    const n = await page.locator('.np-dot').count();
    for (let i = 0; i < n; i++) await page.locator('.np-dot').nth(i).click();
    await page.waitForTimeout(100);
  }
  for (let i = 0; i < 2; i++) { await page.locator('button', { hasText: 'Check' }).click(); await page.waitForTimeout(2000); }
  await page.click('[data-testid=ck-fluency-go]');
  const fl = await page.locator('.choice').all();
  for (const c of fl.slice(0, 4)) await c.click();
  await page.click('[data-testid=ck-fluency-done]');
  await page.locator('.choice').first().click();
  await page.locator('button', { hasText: 'Done' }).click();
  await page.waitForSelector('[data-status]');
  const status = await page.getAttribute('[data-status]', 'data-status');
  assert.ok(['ok', 'warn'].includes(status));
  const saved = await page.evaluate(async () => (await import('./js/core/store.js')).store.sessions().filter((s) => s.type === 'check'));
  assert.equal(saved.length, 1);
  assert.deepEqual(Object.keys(saved[0].domains).sort(), ['attention', 'fluency', 'orientation', 'recall', 'visuospatial']);
  assert.match(await page.textContent('main'), /not a medical diagnosis/);
  assert.deepEqual(page.problems, []);
  await page.context().close();
});

test('check-up status: planted good scores → ok, planted weak scores → warn', async () => {
  const page = await newPage();
  const r = await page.evaluate(async () => {
    const { checkupStatus } = await import('./js/core/scoring.js');
    const good = { recall: 90, orientation: 100, attention: 85, visuospatial: 100, fluency: 90 };
    const weak = { recall: 20, orientation: 75, attention: 60, visuospatial: 50, fluency: 70 };
    return [checkupStatus(good, null).status, checkupStatus(weak, null).status, checkupStatus({ ...good, recall: 60, attention: 60 }, { total: 95 }).status];
  });
  assert.deepEqual(r, ['ok', 'warn', 'warn']);
  await page.context().close();
});

async function seedWeeks(page, weeklyAbility) {
  await page.evaluate(async (weekly) => {
    const { store } = await import('./js/core/store.js');
    const { addDays, dayKey } = await import('./js/core/util.js');
    const start = addDays(dayKey(), -7 * weekly.length + 1);
    for (let w = 0; w < weekly.length; w++) {
      for (let d = 0; d < 7; d += 2) {
        const day = addDays(start, w * 7 + d);
        if (day > dayKey()) continue;
        await store.addSession({ type: 'game', game: 'memory_match', domain: 'memory', score: 70, level: 2, ability: weekly[w], xp: 20, at: day + 'T10:00:00Z', day });
      }
    }
  }, weeklyAbility);
}

test('trend: 8 weeks of declining scores → orange warning; stable → neon OK', async () => {
  let page = await newPage();
  await onboard(page);
  await seedWeeks(page, [80, 80, 78, 66, 64, 62, 60, 60]);
  await page.goto(BASE + '#/progress');
  await page.waitForSelector('[data-status]');
  assert.equal(await page.getAttribute('[data-status]', 'data-status'), 'warn');
  assert.ok(await page.locator('.card-warn').count());
  assert.ok(await page.locator('.chart polyline.line').count(), 'chart drawn');
  await page.context().close();

  page = await newPage();
  await onboard(page);
  await seedWeeks(page, [70, 72, 71, 70, 73, 72, 71, 72]);
  await page.goto(BASE + '#/progress');
  await page.waitForSelector('[data-status]');
  assert.equal(await page.getAttribute('[data-status]', 'data-status'), 'ok');
  assert.ok(await page.locator('.card-ok').count());
  await page.context().close();
});

test('PIN lock: data stays locked until the right PIN; wrong PIN is refused', async () => {
  const page = await newPage();
  await onboard(page, { pin: '2468' });
  await page.waitForSelector('[data-testid=play-today]');
  await page.reload();
  await page.waitForSelector('.keypad');
  assert.match(await page.textContent('main'), /Type your PIN/);
  for (const d of '1111') await page.locator(`.keypad button[aria-label="${d}"]`).click();
  await page.locator('button', { hasText: 'Open' }).click();
  await page.waitForFunction(() => /not correct/.test(document.querySelector('main').textContent));
  for (const d of '2468') await page.locator(`.keypad button[aria-label="${d}"]`).click();
  await page.locator('button', { hasText: 'Open' }).click();
  await page.waitForSelector('[data-testid=play-today]');
  assert.match(await page.textContent('main'), /Hello Rosa/);
  const meta = await page.evaluate(() => new Promise((resolve) => {
    const r = indexedDB.open('aivoavi');
    r.onsuccess = () => { const g = r.result.transaction('meta').objectStore('meta').get('key'); g.onsuccess = () => resolve({ type: g.result.type, hasRawKey: 'key' in g.result, iterations: g.result.iterations }); };
  }));
  assert.deepEqual(meta, { type: 'pin', hasRawKey: false, iterations: 600000 });
  assert.deepEqual(page.problems, []);
  await page.context().close();
});

test('easy mode (train path): one big Play button, settings behind caregiver gate', async () => {
  const page = await newPage();
  await onboard(page, { path: 'train' });
  await page.waitForSelector('[data-testid=play-today]');
  assert.equal(await page.locator('.chip').count(), 0, 'no scores/chips in easy mode');
  await page.goto(BASE + '#/settings');
  await page.waitForSelector('text=This area is for caregivers');
  assert.equal(await page.locator('.choice').count(), 3);
  await page.context().close();
});

test('encrypted backup: export then restore with password', async () => {
  const page = await newPage();
  await onboard(page);
  await seedWeeks(page, [70, 71]);
  const ok = await page.evaluate(async () => {
    const { store } = await import('./js/core/store.js');
    const n = store.sessions().length;
    const file = await store.exportBackup('correct horse');
    if (file.includes('Rosa')) return 'leak';
    let wrongFailed = false;
    try { await store.importBackup(file, 'wrong pass'); } catch { wrongFailed = true; }
    await store.importBackup(file, 'correct horse');
    return wrongFailed && store.sessions().length === n && store.get('profile').name === 'Rosa';
  });
  assert.equal(ok, true);
  await page.context().close();
});

test('screens render at phone width without horizontal scrolling', async () => {
  const page = await newPage({ width: 360, height: 740 });
  await onboard(page);
  await seedWeeks(page, [70, 72, 69, 75]);
  for (const r of ['home', 'games', 'progress', 'garden', 'settings', 'caregiver', 'summary', 'check', 'game/clock_setter', 'game/word_garden']) {
    await page.goto(BASE + '#/' + r);
    await page.waitForTimeout(250);
    if (r.startsWith('game/')) { await page.click('[data-testid=start-game]'); await page.waitForTimeout(400); }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${r} overflows by ${overflow}px`);
    assert.doesNotMatch(await page.textContent('main'), /\bnull\b|\bundefined\b|NaN/, `${r} shows a raw value`);
  }
  assert.deepEqual(page.problems, []);
  await page.context().close();
});

test('offline: service worker installs and caches every app file', async () => {
  const fs = require('node:fs');
  const root = path.join(__dirname, '..');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const listed = new Set([...sw.matchAll(/'((?:js|css|assets|icons)\/[^']+)'/g)].map((m) => m[1]));
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  const onDisk = ['js', 'css', 'assets', 'icons'].flatMap(walk);
  assert.deepEqual(onDisk.filter((f) => !listed.has(f)), [], 'files missing from sw.js SHELL');
  assert.deepEqual([...listed].filter((f) => !onDisk.includes(f)), [], 'sw.js lists files that do not exist');

  const page = await newPage();
  const cached = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const c = await caches.open((await caches.keys()).find((k) => k.startsWith('aivoavi-')));
    return (await c.keys()).length;
  });
  assert.ok(cached >= listed.size, `only ${cached} files cached`);
  // Go offline: the app must still load.
  await page.context().setOffline(true);
  await page.reload();
  await page.waitForSelector('text=Start here');
  await page.context().close();
});

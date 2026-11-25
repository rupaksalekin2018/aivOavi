// aivOavi service worker: offline app shell + daily reminder via Periodic Background Sync.
// It never sends data anywhere. It only reads the reminder settings in the 'meta' store.
const VERSION = 'aivoavi-v2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/tokens.css', 'css/app.css',
  'assets/brain.svg', 'assets/avi.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'js/app.js', 'js/i18n/en.js', 'js/i18n/t.js',
  'js/core/crypto.js', 'js/core/store.js', 'js/core/util.js', 'js/core/scoring.js', 'js/core/gamify.js',
  'js/core/adaptive.js', 'js/core/plan.js', 'js/core/notify.js', 'js/core/speech.js', 'js/core/sound.js',
  'js/ui/components.js', 'js/ui/chart.js',
  'js/games/index.js', 'js/games/memory-match.js', 'js/games/pattern-echo.js', 'js/games/word-garden.js',
  'js/games/number-path.js', 'js/games/odd-one-out.js', 'js/games/clock-setter.js', 'js/games/today-quiz.js', 'js/games/face-name.js',
  'js/screens/lock.js', 'js/screens/onboard.js', 'js/screens/home.js', 'js/screens/play.js', 'js/screens/games.js',
  'js/screens/check.js', 'js/screens/progress.js', 'js/screens/garden.js', 'js/screens/settings.js',
  'js/screens/caregiver.js', 'js/screens/summary.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // never touch other origins
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }
  // Stale-while-revalidate for our own static files.
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});

// ---- Reminders ----
function readNotifyMeta() {
  return new Promise((resolve) => {
    const r = indexedDB.open('aivoavi', 1);
    // Same schema as js/core/store.js, so the SW can never create a broken database.
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of ['meta', 'data']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
      if (!d.objectStoreNames.contains('sessions')) d.createObjectStore('sessions', { autoIncrement: true });
    };
    r.onerror = () => resolve(null);
    r.onsuccess = () => {
      const db = r.result;
      try {
        const g = db.transaction('meta').objectStore('meta').get('notify');
        g.onsuccess = () => { resolve(g.result || null); db.close(); };
        g.onerror = () => { resolve(null); db.close(); };
      } catch { resolve(null); db.close(); }
    };
  });
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function maybeRemind() {
  const meta = await readNotifyMeta();
  if (!meta || !meta.enabled || !meta.time) return;
  if (meta.lastPlayedDay === today()) return;
  const [h, m] = meta.time.split(':').map(Number);
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return; // not yet time
  // Generic text only - no scores or health data in notifications.
  await self.registration.showNotification('aivOavi', {
    body: '🧠 Avi misses you! Time for today’s brain games.',
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'aivoavi-daily', data: { url: './#/home' },
  });
}

self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'aivoavi-daily') e.waitUntil(maybeRemind());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './#/home', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.navigate(target).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});

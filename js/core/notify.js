// Reminders without a server. Four layers:
// 1) in-app timer -> service-worker notification while the app is open/in a background tab
// 2) Periodic Background Sync (installed PWA on Chromium) -> sw.js checks once a day
// 3) a "welcome back" nudge inside the app (see home screen)
// 4) a downloadable .ics calendar event that repeats daily (works everywhere, even when closed)
// Notification text NEVER contains scores or health data.
import { store } from './store.js';
import { t } from '../i18n/t.js';
import { dayKey } from './util.js';

export const REMINDER_TIMES = { morning: '09:00', afternoon: '14:00', evening: '18:00' };

export const notifySupported = () => 'Notification' in globalThis && 'serviceWorker' in navigator;
export const permission = () => (notifySupported() ? Notification.permission : 'unsupported');

async function getReg() {
  if (!('serviceWorker' in navigator)) return null;
  try { return (await navigator.serviceWorker.getRegistration()) || null; } catch { return null; }
}

export async function enableNotifications() {
  if (!notifySupported()) return 'unsupported';
  const p = await Notification.requestPermission();
  if (p === 'granted') await registerPeriodic();
  return p;
}

export async function registerPeriodic() {
  const reg = await getReg();
  if (!reg || !('periodicSync' in reg)) return false;
  try {
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (st.state !== 'granted') return false;
    await reg.periodicSync.register('aivoavi-daily', { minInterval: 12 * 3600 * 1000 });
    return true;
  } catch { return false; }
}

export async function showReminder(test = false) {
  if (permission() !== 'granted') return false;
  const opts = { body: test ? t('nf_test') : t('nf_body'), icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'aivoavi-daily', data: { url: './#/home' } };
  const reg = await getReg();
  if (reg) await reg.showNotification(t('nf_title'), opts);
  else new Notification(t('nf_title'), opts);
  return true;
}

let timer = null;
/** Layer 1: while the app is open, fire at the reminder time if the user hasn't played today. */
export async function scheduleInApp() {
  clearTimeout(timer);
  const meta = await store.getNotifyMeta();
  if (!meta.enabled || !meta.time) return;
  const [h, m] = meta.time.split(':').map(Number);
  const at = new Date(); at.setHours(h, m, 0, 0);
  if (at <= new Date()) at.setDate(at.getDate() + 1);
  timer = setTimeout(async () => {
    const now = await store.getNotifyMeta();
    if (now.lastPlayedDay !== dayKey()) await showReminder();
    scheduleInApp();
  }, Math.min(at - new Date(), 2 ** 31 - 1));
}

/** Save reminder choice for the app and the service worker. time = 'HH:MM' or null. */
export async function setReminder(time) {
  await store.setNotifyMeta({ enabled: !!time, time });
  if (time && permission() === 'granted') await registerPeriodic();
  scheduleInApp();
}

export async function markPlayedToday() { await store.setNotifyMeta({ lastPlayedDay: dayKey() }); }

/** Layer 4: a daily repeating calendar event, created on the device and downloaded. */
export function downloadICS(time = '09:00') {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const start = new Date(); start.setDate(start.getDate() + 1);
  const [h, m] = time.split(':').map(Number);
  const local = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(h)}${pad(m)}00`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('') + '@aivoavi.app';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//aivOavi//Reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART:${local}`, 'DURATION:PT10M', 'RRULE:FREQ=DAILY',
    'SUMMARY:🧠 aivOavi brain games', 'DESCRIPTION:Time for today\'s brain games with Avi!',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Time for today\'s brain games with Avi!', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'aivoavi-daily-reminder.ics';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

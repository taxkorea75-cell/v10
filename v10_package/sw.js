// ═══════════════════════════════════════
// 매일흥양 Service Worker v10
// - 버전 바뀔 때마다 이전 캐시 완전 삭제
// - skipWaiting 즉시 실행
// ═══════════════════════════════════════
const CACHE = 'myil-v10-20260312';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

self.addEventListener('push', e => {
  let data = { title: '🚨 매일흥양 사고 발생', body: '즉시 확인하세요!', type: 'accident' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (_) {}
  const options = {
    body: data.body, icon: '/icon-192.png', badge: '/icon-192.png',
    tag: 'myil-accident-' + Date.now(), requireInteraction: true, silent: false,
    vibrate: [500, 200, 500, 200, 500, 200, 1000],
    actions: [{ action: 'open', title: '📱 앱 열기 및 확인' }, { action: 'dismiss', title: '닫기' }],
    data: { type: data.type, url: '/', sentAt: Date.now() }
  };
  e.waitUntil(
    self.registration.showNotification(data.title, options).then(() =>
      self.clients.matchAll({ includeUncontrolled: true }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'ALARM_START', data }))
      )
    )
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.focus(); c.postMessage({ type: 'ALARM_CONFIRM' }); return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

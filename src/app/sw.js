// Service worker til «I stødet»-PWA
const CACHE = 'istoedet-v29';
const SHELL = [
  'index.html',
  'pricing.js',
  'gamify.js',
  'eloverblik.js',
  'forbrug-analyse.js',
  'co2.js',
  'elly.js',
  'view.js',
  'notifications.js',
  'history.js',
  'tariffs.json',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'fonts/figtree.woff2',
  'fonts/fredoka.woff2',
  'fonts/baloo2.woff2',
  'fonts/unbounded.woff2',
  'fonts/space-grotesk.woff2'
];

// Fejler en shell-fil, fejler installationen, og den gamle worker bliver stående
// — hellere det end en halv cache der ser komplet ud.
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Kun app-skallen (samme origin, under SW-scope) håndteres. Priser, CO₂,
  // Eloverblik og /eds-proxyen hentes altid live fra nettet uden caching.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/eds/')) return;

  // Network-first med cache som fallback (virker offline). Kun vellykkede svar
  // caches, så en 404/500 aldrig erstatter en god kopi.
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(m =>
      // Kun sidenavigation falder tilbage til app-skallen; andre requests fejler ærligt.
      m || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});

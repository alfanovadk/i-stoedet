// Canonical list of runtime files, relative to src/app/.
// Bundled i iOS-appen (www/) OG deployet til web (_site/app/ via 11ty-passthrough).
export const APP_DIR = 'src/app';
export const RUNTIME_FILES = [
  'index.html', 'pricing.js', 'gamify.js', 'eloverblik.js', 'forbrug-analyse.js',
  'co2.js', 'elly.js', 'view.js', 'notifications.js', 'history.js', 'tariffs.json', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'apple-touch-icon.png', 'favicon.ico', 'robots.txt', 'icon-maskable-512.png',
  'fonts/figtree.woff2', 'fonts/fredoka.woff2', 'fonts/baloo2.woff2', 'fonts/unbounded.woff2',
  'fonts/space-grotesk.woff2',
];

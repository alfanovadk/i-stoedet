// Serves _site with "now" frozen at 2026-10-10 14:20 (Copenhagen) inside /app/index.html,
// so layout signatures before and after a change are comparable.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = new URL('../_site', import.meta.url).pathname;
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.woff2':'font/woff2' };
const FREEZE = `<script>(() => { const T = Date.parse('2026-10-10T14:20:00+02:00'); const D = Date;
  class F extends D { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } }
  F.parse = D.parse; F.UTC = D.UTC; window.Date = F; })();</script>`;
http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    let body = await readFile(join(ROOT, p));
    if (p === '/app/index.html') body = Buffer.from(body.toString().replace('<head>', '<head>' + FREEZE));
    if (p === '/app/sw.js') body = Buffer.from('/* disabled for layout tests */');
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(8144, '127.0.0.1');

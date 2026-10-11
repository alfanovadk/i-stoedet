// App Store screenshots at exact store sizes, rendered from the app served by serve-frozen.mjs
// (clock frozen at 2026-10-10 14:20, real spot prices for that day). Device metrics are emulated
// via CDP so the page sees phone/iPad points while the capture is in device pixels.
// Run: npm run build && node scripts/serve-frozen.mjs &
//      dev-browser --headless --browser store --timeout 300 < scripts/store-screenshots.js
// Files land in ~/.dev-browser/tmp/store-<dir>-<name>.png; copy them to docs/app-store/screenshots/.
const B = "http://127.0.0.1:8144/app/";
const DEVICES = [
  { dir: '6.9', w: 440, h: 956, scale: 3 },          // 1320 x 2868
  { dir: 'ipad-13', w: 1376, h: 1032, scale: 2 },    // 2752 x 2064 (landscape)
];
const p2 = n => String(n).padStart(2, '0');
const aps = ['bil', 'vask', 'opvask'];
const marks = [];
for (let i = 0; i < 26; i++) { const dt = new Date(2026, 9, 10 - i); if (i % 4 === 3) continue;
  for (let j = 0; j < 1 + (i % 3); j++) marks.push({ id: `s${i}-${j}`, apparat: aps[j], dato: `${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`,
    startHour: i === 0 ? [3, 12, 13][j] : [1, 12, 22][j], varighed: 3, status: i === 0 && j ? 'pending' : 'confirmed', point: 8 + (i * 7) % 15 + j * 4 }); }
const GAMIFY = JSON.stringify({ totalPoint: 1240, streak: 12, badges: { natteravn: true, sparefugl: true, dage30: false, sandsiger: true } });

const page = await browser.getPage("store");
const cdp = await page.context().newCDPSession(page);
await page.emulateMedia({ reducedMotion: 'reduce' });
for (const d of DEVICES) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: d.w, height: d.h, deviceScaleFactor: d.scale, mobile: d.w < 700 });
  await page.goto(B, { waitUntil: 'load' });
  const busy = () => page.evaluate(() => typeof window.setTab !== 'function' || /Henter elpriser|Henter priser/.test(document.body.innerText));
  const settle = async () => { for (let i = 0; i < 120 && await busy(); i++) await page.waitForTimeout(250); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200); };
  const prep = async (st, extra) => {
    await page.evaluate(([st, extra]) => { localStorage.clear(); localStorage.setItem('elpriser_notif_intro', '1');
      localStorage.setItem('elpriser_state', JSON.stringify(st));
      for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, v); }, [st, extra]);
    await page.reload({ waitUntil: 'load' }); await settle();
  };
  const shot = async name => {
    await page.waitForTimeout(600);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: d.w, height: d.h, scale: 1 } });
    await saveScreenshot(Buffer.from(data, 'base64'), `store-${d.dir}-${name}.png`);
  };
  const soft = { theme: 'soft', dso: 'n1', markup: 8 };
  await prep(soft);
  await shot('1-nu');
  if (d.w < 700) {
    await page.evaluate(() => window.selectHour(18)); await shot('2-prisens-dele'); await page.evaluate(() => window.selectHour(null));
  } else {
    await page.evaluate(() => window.setTab('historik')); await page.waitForTimeout(500);
    await page.evaluate(() => window.setHistDays(30)); await page.waitForTimeout(500); await settle();
    await shot('2-historik');
  }
  await prep({ theme: 'bold', dso: 'radius', markup: 8 });
  await shot('3-tema-bold');
  await prep({ theme: 'play', dso: 'n1', markup: 8 });
  await shot('4-tema-legende');
  await prep({ theme: 'play', dso: 'n1', markup: 8 }, { elpriser_claims: JSON.stringify(marks), elpriser_gamify: GAMIFY });
  await page.evaluate(() => window.setTab('point')); await shot('5-point');
  await prep(soft);
  await page.evaluate(() => window.openSettings()); await page.waitForTimeout(500); await shot('6-indstillinger');
  console.log(d.dir, 'done', page.url(), JSON.stringify(await page.evaluate(() => [innerWidth, devicePixelRatio])));
}

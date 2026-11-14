#!/usr/bin/env node
// Local browser checks for /body-map at 375 px (B4: BM-2, BM-7, BM-11). `npm run e2e:bodymap`. Playwright, chromium, touch.
// CI has no browsers, so this is not part of `npm run check` (ARCHITECTURE §B12 Checks).
// It builds the preview page (OHM_BODYMAP_PREVIEW=1) into a temp folder, serves it on 127.0.0.1 (plain http, like the LAN
// preview), and answers the Apps Script endpoint itself: nothing real is called, and every name and note is fake.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bodymap } from '../src/data/bodymap.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const KEY = 'ohm-bodymap-v1';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const failures = [];
const log = (ok, name, why = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${why ? `: ${why}` : ''}`);
  if (!ok) failures.push(name);
};
const check = async (name, fn) => {
  try {
    await fn();
    log(true, name);
  } catch (e) {
    log(false, name, String(e && e.message ? e.message : e));
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tolerance ${tol})`);

// --- build and serve ---------------------------------------------------------------------------------------------------
const out = mkdtempSync(join(tmpdir(), 'ohm-bodymap-e2e-'));
const built = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', out], {
  cwd: root,
  env: { ...process.env, OHM_BODYMAP_PREVIEW: '1' },
  encoding: 'utf8',
});
if (built.status !== 0) {
  console.error(built.stdout + built.stderr);
  process.exit(1);
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };
function locate(url) {
  const full = join(out, normalize(decodeURIComponent(url.split('?')[0])));
  if (full !== out && !full.startsWith(out + sep)) return null;
  for (const c of [full, `${full}.html`, join(full, 'index.html')]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}
const server = createServer((req, res) => {
  const f = locate(req.url || '/');
  if (!f) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed; run "npm i -D playwright" and "npx playwright install chromium"');
  process.exit(1);
}
const browser = await chromium.launch();

// --- helpers -----------------------------------------------------------------------------------------------------------
async function open(opts = {}) {
  // Phones by default (375 px, touch, 2x); `desktop: true` is 1280 px with a mouse (a fine pointer), 1x. `scale` overrides the pixel ratio.
  const context = await browser.newContext(
    opts.desktop
      ? { viewport: { width: 1280, height: 900 }, deviceScaleFactor: opts.scale ?? 1, reducedMotion: 'reduce' }
      : { viewport: { width: 375, height: 700 }, deviceScaleFactor: opts.scale ?? 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' },
  );
  if (opts.seed) await context.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [KEY, JSON.stringify(opts.seed)]);
  const requests = []; // every URL the page asked for, from the first byte
  context.on('request', (r) => requests.push(r.url()));
  const sends = []; // every POST that reached the endpoint, parsed
  const delivered = []; // the ones the stub answered ok
  let mode = opts.mode ?? 'ok'; // 'ok' | 'abort' | 'slow' (answers ok after 1.5 s)
  await context.route(/^https:\/\/script\.google\.com\//, async (r) => {
    if (r.request().method() !== 'POST') return r.abort();
    try {
      sends.push(JSON.parse(r.request().postData() ?? ''));
    } catch {
      sends.push(null);
    }
    if (mode === 'abort') return r.abort();
    if (mode === 'slow') await new Promise((ok) => setTimeout(ok, 1500));
    delivered.push(sends.at(-1));
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true }) });
  });
  const page = await context.newPage();
  if (opts.nocache) await opts.nocache(context, page); // the browser's cache off, so every request shows in the log
  await page.goto(`${origin}/body-map`, { waitUntil: 'networkidle' });
  await page.locator('#bm-figure').scrollIntoViewIfNeeded();
  return { context, page, sends, delivered, requests, setMode: (m) => (mode = m) };
}
const centre = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const viewBox = (page) => page.evaluate(() => document.getElementById('bm-figure').viewBox.baseVal.width);
async function fill(page) {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const p = (n) => String(n).padStart(2, '0');
  await page.fill('#bm-name', 'Test Client');
  await page.fill('#bm-date', `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
}
/** Where each mark's spot is on screen (the glyph's centre, or the map-pin's point), from the marks' own coordinates and the figure's matrix. */
const pinCentres = (page) =>
  page.evaluate(() => {
    const m = document.getElementById('bm-figure').getScreenCTM();
    return [...document.querySelectorAll('.bm-pin-g')].map((g) => ({ x: Number(g.dataset.x) * 2048 * m.a + m.e, y: Number(g.dataset.y) * 4096 * m.d + m.f }));
  });
/** Taps the figure at a fraction of its box and returns the tap point. */
async function tapFigure(page, fx, fy) {
  // Filling the form scrolls up. Put the figure near the top of the screen so it and the toolbar under it both fit: the toolbar is
  // sticky to the bottom of the screen and would cover the lower part of a figure that is scrolled to the middle.
  await page.evaluate(() => window.scrollBy(0, document.getElementById('bm-figure').getBoundingClientRect().top - 10));
  const box = await page.locator('#bm-figure').boundingBox();
  const at = { x: box.x + box.width * fx, y: box.y + box.height * fy };
  await page.touchscreen.tap(at.x, at.y);
  return at;
}

// --- checks ------------------------------------------------------------------------------------------------------------
await check('the page opens at 375 px with the figure, no horizontal scroll, and sets no cookies', async () => {
  const { context, page } = await open();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(!wide, 'the page scrolls sideways');
  assert((await page.locator('#bm-art').getAttribute('href')).length > 0, 'the art has a URL');
  assert((await context.cookies()).length === 0, 'cookies were set');
  await context.close();
});

await check('BM-2: a tap makes a pin where the finger is (within 10 px)', async () => {
  const { context, page } = await open();
  const at = await tapFigure(page, 0.5, 0.3);
  const pins = await pinCentres(page);
  assert(pins.length === 1, `${pins.length} pins`);
  near(pins[0].x, at.x, 10, 'x');
  near(pins[0].y, at.y, 10, 'y');
  await context.close();
});

await check('BM-2: zoom 3x by the buttons, tap lands within 10 px, and zooming out keeps the same coordinates', async () => {
  const { context, page } = await open();
  for (let i = 0; i < 3; i++) await page.click('#bm-zoom-in');
  assert((await viewBox(page)) < 2048 / 3, 'zoomed in at least 3x');
  const at = await tapFigure(page, 0.5, 0.4);
  let pins = await pinCentres(page);
  assert(pins.length === 1, `${pins.length} pins`);
  near(pins[0].x, at.x, 10, 'x at 3x');
  near(pins[0].y, at.y, 10, 'y at 3x');
  const before = (await stored(page)).pins[0];
  await page.click('#bm-zoom-reset');
  const after = (await stored(page)).pins[0];
  assert(before.x === after.x && before.y === after.y, 'the stored coordinates changed on zoom');
  // at zoom 1 the same coordinates sit where 0-1 of the figure box says they should
  const box = await page.locator('#bm-figure').boundingBox();
  pins = await pinCentres(page);
  near(pins[0].x, box.x + after.x * box.width, 3, 'x after zooming out');
  near(pins[0].y, box.y + after.y * box.height, 3, 'y after zooming out');
  // a pin keeps its size on screen at every zoom
  const size1 = (await page.locator('.bm-pin-g .bm-pin-fill').first().boundingBox()).width;
  await page.click('#bm-zoom-in');
  await page.click('#bm-zoom-in');
  near((await page.locator('.bm-pin-g .bm-pin-fill').first().boundingBox()).width, size1, 1.5, 'pin size at 2.25x');
  await context.close();
});

await check('BM-2: a real two-finger pinch (CDP touch) zooms, adds no pin, and the next tap is accurate', async () => {
  const { context, page } = await open();
  const cdp = await context.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  const box = await page.locator('#bm-figure').boundingBox();
  const c = centre(box);
  const w0 = await viewBox(page);
  await touch('touchStart', [{ x: c.x, y: c.y - 20 }, { x: c.x, y: c.y + 20 }]);
  for (let i = 1; i <= 12; i++) await touch('touchMove', [{ x: c.x, y: c.y - 20 - i * 9 }, { x: c.x, y: c.y + 20 + i * 9 }]);
  await touch('touchEnd', []);
  const w1 = await viewBox(page);
  assert(w1 <= w0 / 3, `the pinch zoomed at least 3x (${w0} -> ${w1})`);
  assert((await page.locator('.bm-pin-g').count()) === 0, 'a pinch made a pin');
  const at = await tapFigure(page, 0.5, 0.5);
  const pins = await pinCentres(page);
  assert(pins.length === 1, `${pins.length} pins after the tap`);
  near(pins[0].x, at.x, 10, 'x');
  near(pins[0].y, at.y, 10, 'y');
  // after zooming out, the mark is where its stored 0-1 coordinates say (as for the button zoom)
  const saved = (await stored(page)).pins[0];
  await page.click('#bm-zoom-reset');
  const box1 = await page.locator('#bm-figure').boundingBox();
  const after = await pinCentres(page);
  near(after[0].x, box1.x + saved.x * box1.width, 3, 'x after the pinch, zoomed out');
  near(after[0].y, box1.y + saved.y * box1.height, 3, 'y after the pinch, zoomed out');
  await context.close();
});

await check('BM-2: a drag pans a zoomed figure and makes no pin; at zoom 1 it does nothing', async () => {
  const { context, page } = await open();
  const cdp = await context.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  // The page may have scrolled (the buttons are below the figure), so the figure's box is read fresh for every drag.
  const drag = async (dx, dy) => {
    const from = centre(await page.locator('#bm-figure').boundingBox());
    await touch('touchStart', [from]);
    for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: from.x + (dx * i) / 8, y: from.y + (dy * i) / 8 }]);
    await touch('touchEnd', []);
  };
  const vb = () => page.evaluate(() => document.getElementById('bm-figure').getAttribute('viewBox'));
  const full = await vb();
  await drag(-60, -60);
  assert((await vb()) === full, 'zoom 1 moved');
  for (let i = 0; i < 3; i++) await page.click('#bm-zoom-in');
  const zoomed = await vb();
  await drag(-60, -60);
  assert((await vb()) !== zoomed, 'the zoomed figure did not move');
  assert((await page.locator('.bm-pin-g').count()) === 0, 'a drag made a pin');
  await context.close();
});

await check('touch capture is only as wide as the figure, so a swipe beside it scrolls the page', async () => {
  const { context, page } = await open();
  const stage = await page.locator('#bm-stage').boundingBox();
  const fig = await page.locator('#bm-figure').boundingBox();
  assert(stage.width <= fig.width + 2, `the touch area is ${stage.width}px wide, the figure ${fig.width}px`);
  await context.close();
});

await check('a double tap zooms in on that spot and leaves no mark; a quick two-finger tap zooms back out', async () => {
  const { context, page } = await open();
  const w0 = await viewBox(page);
  const box = await page.locator('#bm-figure').boundingBox();
  const at = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.4 };
  await page.touchscreen.tap(at.x, at.y);
  await page.touchscreen.tap(at.x, at.y);
  assert((await viewBox(page)) < w0 * 0.6, 'the double tap did not zoom');
  assert((await page.locator('.bm-pin-g').count()) === 0, 'a double tap left a mark');
  assert(((await stored(page))?.pins.length ?? 0) === 0, 'a double tap left a stored mark');
  const cdp = await context.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  const c = centre(await page.locator('#bm-figure').boundingBox());
  await touch('touchStart', [{ x: c.x - 25, y: c.y }, { x: c.x + 25, y: c.y }]);
  await touch('touchEnd', []);
  assert((await viewBox(page)) > w0 * 0.9, 'the two-finger tap did not zoom out');
  assert((await page.locator('.bm-pin-g').count()) === 0, 'a two-finger tap left a mark');
  await context.close();
});

await check('BM-7: marks, name and date survive a reload; Start over clears them', async () => {
  const { context, page } = await open();
  await fill(page);
  await tapFigure(page, 0.45, 0.25);
  await tapFigure(page, 0.55, 0.6);
  await page.reload({ waitUntil: 'networkidle' });
  assert((await page.locator('.bm-pin-g').count()) === 2, 'the pins came back');
  assert((await page.inputValue('#bm-name')) === 'Test Client', 'the name came back');
  assert((await page.inputValue('#bm-date')) !== '', 'the date came back');
  await page.locator('#bm-start-over').scrollIntoViewIfNeeded();
  await page.click('#bm-start-over');
  await page.click('#bm-start-yes');
  assert((await page.locator('.bm-pin-g').count()) === 0, 'pins remain after Start over');
  assert((await stored(page)) === null, 'storage remains after Start over');
  await context.close();
});

await check('BM-11: offline, a send says errNetwork and keeps the marks; online, it sends once and clears the device', async () => {
  // Playwright's route answers even when the context is offline, so offline is both: the context and an aborting endpoint.
  const { context, page, sends, delivered, setMode } = await open({ mode: 'abort' });
  await fill(page);
  await tapFigure(page, 0.5, 0.3);
  await context.setOffline(true);
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  await page.locator('#bm-retry:not([hidden])').waitFor();
  const msg = await page.textContent('#bm-status');
  assert(msg.includes("It didn't send"), `status: ${msg}`);
  assert((await page.locator('.bm-pin-g').count()) === 1, 'the pin is gone');
  assert((await stored(page)).pins.length === 1, 'the marks were not kept');
  assert(delivered.length === 0, 'something was delivered while offline');
  assert(!(await page.locator('#bm-retry').isHidden()), 'no retry button');
  // B6: a phone shows the WebP, so Send is the first time the SVG for the PDF is fetched; offline that fetch fails first, which is the
  // same errNetwork path (§B12 Art). The send id was made before it and is kept for the retry.
  const firstId = (await stored(page)).id;
  assert(firstId, 'no send id was kept for the retry');
  await context.setOffline(false);
  setMode('ok');
  await page.click('#bm-retry');
  await page.locator('#bm-done:not([hidden])').waitFor();
  assert(delivered.length === 1, `${delivered.length} delivered`);
  assert(sends.length >= 1 && sends.every((s) => s.id === firstId), 'the retry changed the id');
  assert((await stored(page)) === null, 'the marks stay on the device after a send');
  await context.close();
});

await check('the send: the wire contract, a v4 id, a real PDF, and a retry carries the same id', async () => {
  const { context, page, sends, setMode } = await open({ mode: 'abort' });
  await fill(page);
  await tapFigure(page, 0.5, 0.3);
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  await page.locator('#bm-retry:not([hidden])').waitFor();
  setMode('ok');
  await page.click('#bm-retry');
  await page.locator('#bm-done:not([hidden])').waitFor();
  assert(sends.length === 2, `${sends.length} attempts`);
  const [a, b] = sends;
  assert(a.id === b.id, 'the retry used a new id');
  assert(UUID_V4.test(a.id), `id ${a.id}`);
  assert(JSON.stringify(Object.keys(a)) === JSON.stringify(['v', 'kind', 'id', 'website', 'name', 'apptDate', 'figure', 'report', 'pdf']), `keys ${Object.keys(a)}`);
  assert(a.v === 1 && a.kind === 'ohm-bodymap' && a.website === '' && a.name === 'Test Client' && a.figure === 'female', 'fields');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(a.apptDate), 'apptDate');
  assert(a.report.pins.length === 1 && a.report.name === 'Test Client', 'report');
  const bytes = Buffer.from(a.pdf, 'base64');
  assert(bytes.subarray(0, 5).toString('latin1') === '%PDF-', 'not a PDF');
  assert(a.pdf.length < 1_500_000, `pdf is ${a.pdf.length} base64 characters`);
  await context.close();
});

await check('B5: the Front and Back tabs keep the marks, swap the art and reset the zoom; the sent report carries the zone fields', async () => {
  const { context, page, sends } = await open();
  await fill(page);
  const frontArt = await page.locator('#bm-art').getAttribute('href');
  await tapFigure(page, 0.55, 0.34); // above the navel: the left side of the upper belly on a front view
  assert((await page.locator('.bm-pin-g').count()) === 1, 'the front mark');
  await page.click('#bm-zoom-in');
  await page.click('.bm-tab[data-view="back"]');
  assert((await page.locator('.bm-tab[data-view="back"]').getAttribute('aria-pressed')) === 'true', 'the Back tab is not pressed');
  assert((await page.locator('.bm-tab[data-view="front"]').getAttribute('aria-pressed')) === 'false', 'the Front tab is still pressed');
  assert((await page.locator('#bm-art').getAttribute('href')) !== frontArt, 'the art did not change');
  assert((await page.locator('.bm-pin-g').count()) === 0, 'a front mark shows on the back');
  assert((await viewBox(page)) === 2048, 'the zoom was not reset');
  await tapFigure(page, 0.45, 0.13); // the left base of the skull on a back view
  assert((await stored(page)).pins.length === 2, 'both marks are kept');
  await page.click('.bm-tab[data-view="front"]');
  assert((await page.locator('.bm-pin-g').count()) === 1, 'the front mark did not come back');
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  await page.locator('#bm-done:not([hidden])').waitFor();
  const r = sends[0].report;
  assert(r.v === 2 && r.pins.length === 2, `report v${r.v}, ${r.pins.length} pins`);
  assert(r.pins[0].zone === 'left-belly-upper' && r.pins[0].region === 'belly-upper' && r.pins[0].side === 'left' && r.pins[0].zoneSet === bodymap.zoneSet, JSON.stringify(r.pins[0]));
  assert(r.pins[1].zone === 'left-skull-base' && r.pins[1].view === 'back', JSON.stringify(r.pins[1]));
  await context.close();
});

await check('B5b (BM-1): the Female and Male picker swaps the art, keeps the mark on its spot, survives a reload, and the report says male with the male file\'s zone', async () => {
  const { context, page, sends } = await open();
  await fill(page);
  const femaleArt = await page.locator('#bm-art').getAttribute('href');
  assert((await page.locator('.bm-tab[data-figure="female"]').getAttribute('aria-pressed')) === 'true', 'Female is not pressed at the start');
  await tapFigure(page, 0.65, 0.635); // the female file says lower outer thigh here, the male file outer knee
  const spot = () => page.locator('.bm-pin-g').first().evaluate((el) => [el.dataset.x, el.dataset.y]);
  const before = await spot();
  assert((await page.locator('.bm-pin-g').count()) === 1, 'the mark');
  await page.click('.bm-tab[data-figure="male"]');
  assert((await page.locator('.bm-tab[data-figure="male"]').getAttribute('aria-pressed')) === 'true', 'the Male button is not pressed');
  assert((await page.locator('.bm-tab[data-figure="female"]').getAttribute('aria-pressed')) === 'false', 'Female is still pressed');
  const maleArt = await page.locator('#bm-art').getAttribute('href');
  assert(maleArt && maleArt !== femaleArt, 'the art did not change');
  assert((await page.locator('.bm-tab[data-view="front"]').getAttribute('aria-pressed')) === 'true', 'the view changed with the figure');
  assert((await page.locator('.bm-pin-g').count()) === 1, 'the mark went');
  assert(JSON.stringify(await spot()) === JSON.stringify(before), `the pin moved: ${before} to ${await spot()}`);
  assert((await viewBox(page)) === 2048, 'the zoom was not reset');
  const saved = await stored(page);
  assert(saved.figure === 'male' && saved.pins.length === 1, `stored ${saved.figure}, ${saved.pins.length} pins`);
  await page.reload({ waitUntil: 'networkidle' });
  assert((await page.locator('#bm-art').getAttribute('href')) === maleArt, 'a reload showed the other figure');
  assert((await page.locator('.bm-tab[data-figure="male"]').getAttribute('aria-pressed')) === 'true', 'a reload lost the Male choice');
  await page.click('.bm-tab[data-view="back"]');
  assert((await page.locator('#bm-art').getAttribute('href')) !== maleArt, 'the Back tab did not swap the male art');
  await page.click('.bm-tab[data-view="front"]');
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  await page.locator('#bm-done:not([hidden])').waitFor();
  assert(sends[0].figure === 'male', `figure ${sends[0].figure}`);
  const p = sends[0].report.pins[0];
  assert(sends[0].report.figure === 'male' && p.zone === 'left-knee-outer' && p.region === 'left-knee' && p.side === 'left' && p.zoneSet === bodymap.zoneSet, JSON.stringify(p));
  await context.close();
});

await check('B5b: Start over puts the picker and the art back on Female (the view stays where it was)', async () => {
  const { context, page } = await open();
  const figures = await page.evaluate(() => JSON.parse(document.getElementById('bm-stage').dataset.figures));
  await page.click('.bm-tab[data-figure="male"]');
  await page.click('.bm-tab[data-view="back"]');
  assert((await page.locator('#bm-art').getAttribute('href')) === figures.male_back.svg, 'the male back art is not showing');
  await page.click('#bm-start-over');
  await page.click('#bm-start-yes');
  assert((await page.locator('.bm-tab[data-figure="female"]').getAttribute('aria-pressed')) === 'true', 'Female is not pressed after Start over');
  assert((await page.locator('.bm-tab[data-figure="male"]').getAttribute('aria-pressed')) === 'false', 'Male is still pressed after Start over');
  assert((await page.locator('.bm-tab[data-view="back"]').getAttribute('aria-pressed')) === 'true', 'the view changed');
  assert((await page.locator('#bm-art').getAttribute('href')) === figures.female_back.svg, 'the female back art is not showing');
  await context.close();
});

await check('B5: the open page names no fine zone (they are for the PDF and JSON only)', async () => {
  const { context, page } = await open();
  const html = await page.content();
  for (const side of Object.values(bodymap.zones)) for (const z of side) assert(!html.includes(z.name), `the page shows "${z.name}"`);
  await context.close();
});

await check('while a send is in flight the form is read-only: a tap adds no mark, and the reply clears exactly what was sent', async () => {
  const { context, page, sends } = await open({ mode: 'slow' });
  await fill(page);
  await tapFigure(page, 0.5, 0.3);
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  await page.locator('#bm-send:disabled').waitFor();
  await page.locator('#bm-figure').scrollIntoViewIfNeeded();
  await tapFigure(page, 0.3, 0.5);
  assert((await page.locator('.bm-pin-g').count()) === 1, 'a mark was added while sending');
  assert(await page.locator('#bm-name').evaluate((el) => el.readOnly), 'the name is editable while sending');
  assert((await page.textContent('#bm-status')).includes('Sending'), 'the Sending line was hidden');
  await page.locator('#bm-done:not([hidden])').waitFor();
  assert(sends.length === 1 && sends[0].report.pins.length === 1, 'the send carried a different set of marks');
  await context.close();
});

await check('an empty form is refused with the three messages, and nothing is sent', async () => {
  const { context, page, sends } = await open();
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  for (const id of ['bm-name-err', 'bm-date-err', 'bm-empty-err']) assert(!(await page.locator(`#${id}`).isHidden()), `${id} not shown`);
  assert(sends.length === 0, 'a send went out');
  await context.close();
});

await check('the honeypot field is out of reach (tabindex -1, off screen)', async () => {
  const { context, page } = await open();
  const trap = page.locator('input[name="website"]');
  assert((await trap.getAttribute('tabindex')) === '-1', 'tabindex');
  const box = await trap.boundingBox();
  assert(!box || box.x + box.width < 0, 'the trap is on screen');
  await context.close();
});

// --- B6: the toolbar, the marks, the minimum path, art per device -----------------------------------------------------------

/**
 * The minimum-path flow (BRIEF §15 BM-1, I-177; ARCHITECTURE §B12 Checks): from a fresh load at 375 px with touch, type the name,
 * set the date, tap 3 spots on the front, Back, tap 2 spots, Send. One POST and the done screen, and nothing else touched: no dialog,
 * no checkbox, no required-field error, no panel or helper to dismiss, no confirmation. Every step B6 to B7b keeps it passing.
 */
async function minimumPath() {
  const { context, page, sends } = await open();
  const dialogs = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await fill(page);
  for (const [fx, fy] of [[0.5, 0.2], [0.35, 0.4], [0.62, 0.45]]) await tapFigure(page, fx, fy);
  await page.click('.bm-tab[data-view="back"]');
  for (const [fx, fy] of [[0.5, 0.3], [0.4, 0.5]]) await tapFigure(page, fx, fy);
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  await page.locator('#bm-done:not([hidden])').waitFor();
  assert(sends.length === 1, `${sends.length} POSTs, not one`);
  assert(sends[0].report.pins.length === 5, 'the five marks did not all go');
  assert(dialogs.length === 0, 'a dialog opened');
  assert((await page.locator('input[type="checkbox"]').count()) === 0, 'a checkbox is on the page');
  for (const id of ['bm-name-err', 'bm-date-err', 'bm-empty-err']) assert(await page.locator(`#${id}`).isHidden(), `${id} showed`);
  await context.close();
}

await check('B6 (BM-1, minimum path): name, date, 3 spots, Back, 2 spots, Send: one POST, the done screen, nothing else touched', minimumPath);

await check('B6 (case 7): the toolbar under the figure: 7 glyph-only chips named by type, Pain at load, sticky, each type a glyph, the last the map-pin, a tap on a glyph opens it', async () => {
  const { context, page } = await open();
  const names = Object.values(bodymap.text.types);
  const radios = page.locator('#bm-types').getByRole('radio');
  assert((await radios.count()) === 7, 'seven chips');
  for (const name of names) assert((await page.locator('#bm-types').getByRole('radio', { name, exact: true }).count()) === 1, `a chip named ${name}`);
  for (const chip of await page.locator('.bm-chip').all()) {
    const b = await chip.boundingBox();
    assert(b.width >= 43.9 && b.height >= 43.9, `a chip is ${b.width} x ${b.height}`);
    assert((await chip.locator(':scope > :not(.bm-sr):not(input):not(svg)').count()) === 0, 'a chip shows something besides its glyph');
  }
  assert(await page.locator('#bm-types input[value="pain"]').isChecked(), 'Pain is not chosen at load');
  assert((await page.textContent('#bm-type-name')) === 'Pain', 'the chosen name is not shown beside the row');
  // the toolbar sits under the figure and stays on screen while the figure scrolls
  await page.evaluate(() => window.scrollBy(0, document.getElementById('bm-figure').getBoundingClientRect().top - 10));
  const fig = await page.locator('#bm-figure').boundingBox();
  const tb0 = await page.locator('#bm-toolbar').boundingBox();
  assert(tb0.y >= fig.y + fig.height - 1, `the toolbar is not under the figure: figure ${fig.y}+${fig.height}, toolbar ${tb0.y}+${tb0.height}`);
  await page.evaluate((d) => window.scrollBy(0, d), fig.y - 300);
  const tb = await page.locator('#bm-toolbar').boundingBox();
  const fig2 = await page.locator('#bm-figure').boundingBox();
  assert(fig2.y + fig2.height > 700 && fig2.y < 700, 'the figure is not half on screen');
  near(tb.y + tb.height, 700, 1.5, 'the toolbar sticks to the bottom of the screen');
  // each type tapped, then a spot: its glyph; the last placed is the map-pin
  await page.locator('#bm-figure').scrollIntoViewIfNeeded();
  const keys = bodymap.types.map((t) => t.key);
  for (const [i, key] of keys.entries()) {
    await page.locator(`.bm-chip[data-type="${key}"]`).tap();
    assert((await page.textContent('#bm-type-name')) === bodymap.text.types[key], `the name beside the row after ${key}`);
    await tapFigure(page, 0.3 + (i % 4) * 0.13, 0.25 + Math.floor(i / 4) * 0.12);
  }
  const marks = await page.locator('.bm-pin-g').evaluateAll((gs) => gs.map((g) => [g.dataset.type, g.dataset.open]));
  assert(JSON.stringify(marks.map((m) => m[0])) === JSON.stringify(keys), `one glyph per type: ${marks.map((m) => m[0])}`);
  assert(marks.filter((m) => m[1] === 'true').length === 1 && marks.at(-1)[1] === 'true', 'only the last placed mark is the map-pin');
  // a tap on a glyph makes it the map-pin and adds no mark
  const points = await pinCentres(page);
  await page.touchscreen.tap(points[0].x, points[0].y);
  const after = await page.locator('.bm-pin-g').evaluateAll((gs) => gs.map((g) => [g.dataset.type, g.dataset.open])); // the open mark is drawn last
  assert(after.length === 7, `a tap on a glyph made a mark (${after.length})`);
  assert(after.filter((a) => a[1] === 'true').length === 1 && after.at(-1)[0] === 'pain' && after.at(-1)[1] === 'true', `the tapped glyph is the map-pin: ${after}`);
  // the toggle counts
  await page.click('.bm-tab[data-view="back"]');
  await tapFigure(page, 0.4, 0.3);
  await tapFigure(page, 0.5, 0.35);
  assert((await page.textContent('.bm-tab[data-view="front"]')) === 'Front 7', 'the Front count');
  assert((await page.textContent('.bm-tab[data-view="back"]')) === 'Back 2', 'the Back count');
  await context.close();
});

await check('B6 (case 7): at 1x and 3x, the drawn tip of the map-pin and the drawn centre of a glyph are within 1 px of the tap', async () => {
  const { context, page } = await open();
  const tip = async () => {
    const n = await page.locator(`.bm-pin-g[data-open="true"] .bm-pin-fill`).count();
    assert(n === 1, `open map-pins: ${n}`);
    const b = await page.locator(`.bm-pin-g[data-open="true"] .bm-pin-fill`).boundingBox(); // the map-pin: its lowest point is the spot
    return { x: b.x + b.width / 2, y: b.y + b.height };
  };
  const glyph = async (i) => {
    const n = await page.locator('.bm-pin-g[data-open="false"] .bm-pin-fill').count();
    assert(n > i, `glyphs: ${n}, wanted index ${i}`);
    return centre(await page.locator('.bm-pin-g[data-open="false"] .bm-pin-fill').nth(i).boundingBox());
  };
  for (const zoom of [1, 3]) {
    if (zoom === 3) for (let i = 0; i < 3; i++) await page.click('#bm-zoom-in');
    const a = await tapFigure(page, 0.3, 0.4 + (zoom === 3 ? 0.02 : 0));
    assert((await page.locator(".bm-pin-g").count()) === (zoom === 3 ? 3 : 1), `marks after the first tap at ${zoom}x: ${await page.locator(".bm-pin-g").count()}`);
    const t = await tip();
    near(t.x, a.x, 1, `x of the map-pin's tip at ${zoom}x`);
    near(t.y, a.y, 1, `y of the map-pin's tip at ${zoom}x`);
    const b = await tapFigure(page, 0.7, 0.4 + (zoom === 3 ? 0.02 : 0)); // the first mark is a plain glyph now
    const g = await glyph(zoom === 3 ? 2 : 0);
    near(g.x, a.x, 1, `x of the glyph centre at ${zoom}x`);
    near(g.y, a.y, 1, `y of the glyph centre at ${zoom}x`);
    const t2 = await tip();
    near(t2.x, b.x, 1, `x of the second tip at ${zoom}x`);
    near(t2.y, b.y, 1, `y of the second tip at ${zoom}x`);
  }
  await context.close();
});

await check('B6 (case 8): art per device, cache off: a phone fetches the WebP and no SVG until Send, then Figure 2 fetches male_front.svg; a desktop fetches the SVG and no WebP at all; the same canvas point gives the same x, y and zone', async () => {
  const has = (reqs, re) => reqs.some((u) => re.test(u));
  const nocache = async (c, page) => (await c.newCDPSession(page)).send('Network.setCacheDisabled', { cacheDisabled: true });
  const sendOne = async (o, click) => {
    await fill(o.page);
    await click();
    await o.page.locator('#bm-send').scrollIntoViewIfNeeded();
    await o.page.click('#bm-send');
    await o.page.locator('#bm-done:not([hidden])').waitFor();
    return o.sends[0].report.pins[0];
  };

  const phone = await open({ nocache });
  assert(has(phone.requests, /female_front[^/]*\.webp/), 'the phone did not request the WebP');
  assert(!has(phone.requests, /female_front[^/]*\.svg/), 'the phone requested the SVG before Send');
  const onPhone = await sendOne(phone, () => tapFigure(phone.page, 0.5, 0.3));
  assert(has(phone.requests, /female_front[^/]*\.svg/), 'Send did not request the SVG for the PDF');
  await phone.page.reload({ waitUntil: 'networkidle' });
  // Figure 2 (the Male picker button until B6e's thumbnails): wait for the request instead of racing it
  await Promise.all([phone.page.waitForRequest(/male_front[^/]*\.svg/), phone.page.click('.bm-tab[data-figure="male"]')]);
  await phone.context.close();

  const desk = await open({ desktop: true, nocache });
  assert(has(desk.requests, /female_front[^/]*\.svg/), 'the desktop did not request the SVG');
  const onDesk = await sendOne(desk, async () => {
    const box = await desk.page.locator('#bm-figure').boundingBox();
    await desk.page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.3);
  });
  await desk.page.reload({ waitUntil: 'networkidle' }); // the done screen hides the form; a reload shows it again
  await Promise.all([desk.page.waitForRequest(/male_front[^/]*\.svg/), desk.page.click('.bm-tab[data-figure="male"]')]); // Figure 2
  assert(!has(desk.requests, /\.webp/), 'the desktop requested a WebP');
  assert(Math.abs(onPhone.x - onDesk.x) < 0.01 && Math.abs(onPhone.y - onDesk.y) < 0.01, `the same point gave ${onPhone.x},${onPhone.y} and ${onDesk.x},${onDesk.y}`);
  assert(onPhone.zone === onDesk.zone && onPhone.zone !== null, `the zone differs: ${onPhone.zone} vs ${onDesk.zone}`);
  await desk.context.close();
});

// --- screens for Brian (`npm run e2e:bodymap -- --shots`): docs/build/screens/B6/ ---------------------------------------------
if (process.argv.includes('--shots')) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const sharp = (await import('sharp')).default;
  const dir = join(root, 'docs/build/screens/B6');
  mkdirSync(dir, { recursive: true });
  const keys = bodymap.types.map((t) => t.key);
  const row = (star = false) => ({
    v: 2, savedAt: Date.now(), name: '', apptDate: '', figure: 'female', id: null, whole: null, visit: null, forWhom: null, helperName: '', firstAt: null,
    pins: keys.map((type, i) => ({ id: `p${i}`, view: 'front', x: 0.375 + i * 0.0417, y: 0.45, type, intensity: null, quality: [], worst: [], course: null, started: '', worse: '', better: '', since: null, note: '', star: star && type !== 'avoid', fromList: false, mirror: null })),
  });
  const shot = async (page, name, clip) => writeFileSync(join(dir, name), await page.screenshot(clip ? { clip } : {}));

  // The toolbar at 375 and 1280 px
  for (const [label, o] of [['375', {}], ['1280', { desktop: true }]]) {
    const { context, page } = await open({ ...o, seed: row() });
    await page.locator('#bm-figure').scrollIntoViewIfNeeded();
    await page.locator('#bm-toolbar').screenshot({ path: join(dir, `toolbar-${label}.png`) });
    await shot(page, `page-${label}.png`);
    await context.close();
  }
  // Each type as a glyph and as the map-pin at 3x, colour and greyscale, plus the starred pair
  for (const star of [false, true]) {
    for (const grey of [false, true]) {
      const { context, page } = await open({ scale: 3, seed: row(star) });
      if (grey) await page.addStyleTag({ content: 'html { filter: grayscale(1); }' });
      await page.locator('#bm-figure').scrollIntoViewIfNeeded();
      for (let i = 0; i < 3; i++) await page.click('#bm-zoom-in');
      const tag = `${star ? 'starred-' : ''}${grey ? 'grey' : 'colour'}`;
      const g = page.locator('#bm-pins');
      const glyphs = await g.boundingBox();
      const pts = await pinCentres(page);
      const clip = { x: Math.max(0, pts[0].x - 30), y: pts[0].y - 30, width: pts.at(-1).x - pts[0].x + 60, height: 60 };
      const glyphRow = await page.screenshot({ clip });
      writeFileSync(join(dir, `glyphs-${tag}.png`), glyphRow);
      const cells = [];
      for (const [i, p] of pts.entries()) {
        await page.touchscreen.tap(p.x, p.y);
        cells.push(await page.screenshot({ clip: { x: p.x - 17, y: p.y - 70, width: 34, height: 90 } }));
        void i;
      }
      const w = 34 * 3;
      const strip = await sharp({ create: { width: w * 7, height: 90 * 3, channels: 3, background: '#ffffff' } })
        .composite(await Promise.all(cells.map(async (c, i) => ({ input: c, left: i * w, top: 0 }))))
        .png()
        .toBuffer();
      writeFileSync(join(dir, `mappins-${tag}.png`), strip);
      if (grey && !star) {
        const gl = await sharp(glyphRow).metadata();
        writeFileSync(join(dir, 'legend-grey.png'), await sharp({ create: { width: Math.max(w * 7, gl.width), height: gl.height + 90 * 3, channels: 3, background: '#ffffff' } })
          .composite([{ input: glyphRow, left: 0, top: 0 }, { input: strip, left: 0, top: gl.height }]).png().toBuffer());
      }
      void glyphs;
      await context.close();
    }
  }
  console.log(`\nscreens written to ${dir}`);
}

await browser.close();
server.close();
rmSync(out, { recursive: true, force: true });
if (failures.length) {
  console.error(`\ne2e:bodymap: ${failures.length} failed`);
  process.exit(1);
}
console.log('\ne2e:bodymap: ok');

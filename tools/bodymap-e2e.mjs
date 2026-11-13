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
  const context = await browser.newContext({ viewport: { width: 375, height: 700 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
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
  await page.goto(`${origin}/body-map`, { waitUntil: 'networkidle' });
  await page.locator('#bm-figure').scrollIntoViewIfNeeded();
  return { context, page, sends, delivered, setMode: (m) => (mode = m) };
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
const pinCentres = async (page) => {
  const out = [];
  for (const b of await page.locator('.bm-pin').all()) out.push(centre(await b.boundingBox()));
  return out;
};
/** Taps the figure at a fraction of its box and returns the tap point. */
async function tapFigure(page, fx, fy) {
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
  const size1 = (await page.locator('.bm-pin').first().boundingBox()).width;
  await page.click('#bm-zoom-in');
  await page.click('#bm-zoom-in');
  near((await page.locator('.bm-pin').first().boundingBox()).width, size1, 1.5, 'pin size at 2.25x');
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
  assert((await page.locator('.bm-pin').count()) === 0, 'a pinch made a pin');
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
  assert((await page.locator('.bm-pin').count()) === 0, 'a drag made a pin');
  await context.close();
});

await check('BM-7: marks, name and date survive a reload; Start over clears them', async () => {
  const { context, page } = await open();
  await fill(page);
  await tapFigure(page, 0.45, 0.25);
  await tapFigure(page, 0.55, 0.6);
  await page.reload({ waitUntil: 'networkidle' });
  assert((await page.locator('.bm-pin').count()) === 2, 'the pins came back');
  assert((await page.inputValue('#bm-name')) === 'Test Client', 'the name came back');
  assert((await page.inputValue('#bm-date')) !== '', 'the date came back');
  await page.locator('#bm-start-over').scrollIntoViewIfNeeded();
  await page.click('#bm-start-over');
  await page.click('#bm-start-yes');
  assert((await page.locator('.bm-pin').count()) === 0, 'pins remain after Start over');
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
  assert((await page.locator('.bm-pin').count()) === 1, 'the pin is gone');
  assert((await stored(page)).pins.length === 1, 'the marks were not kept');
  assert(delivered.length === 0, 'something was delivered while offline');
  assert(!(await page.locator('#bm-retry').isHidden()), 'no retry button');
  await context.setOffline(false);
  setMode('ok');
  await page.click('#bm-retry');
  await page.locator('#bm-done:not([hidden])').waitFor();
  assert(delivered.length === 1, `${delivered.length} delivered`);
  assert(sends.length === 2 && sends[0].id === sends[1].id, 'the retry changed the id');
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

await check('while a send is in flight the form is read-only: a tap adds no mark, and the reply clears exactly what was sent', async () => {
  const { context, page, sends } = await open({ mode: 'slow' });
  await fill(page);
  await tapFigure(page, 0.5, 0.3);
  await page.locator('#bm-send').scrollIntoViewIfNeeded();
  await page.click('#bm-send');
  await page.locator('#bm-send:disabled').waitFor();
  await page.locator('#bm-figure').scrollIntoViewIfNeeded();
  await tapFigure(page, 0.3, 0.5);
  assert((await page.locator('.bm-pin').count()) === 1, 'a mark was added while sending');
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

await browser.close();
server.close();
rmSync(out, { recursive: true, force: true });
if (failures.length) {
  console.error(`\ne2e:bodymap: ${failures.length} failed`);
  process.exit(1);
}
console.log('\ne2e:bodymap: ok');

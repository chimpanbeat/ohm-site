#!/usr/bin/env node
// Screenshots of every built route at 375 and 1280 px, with Playwright (the one devDependency, static-site profile only).
// Usage: node tools/shots.mjs [step-id] [--dir dist] [--base /path] [--route /x] [--stub <state>] [--nojs]   (npm run shots -- 1)
// --base: the site's base path (Astro `base`), so built asset URLs resolve.
// --route: only that route. --nojs: JavaScript off (files get -nojs).
// --stub <state>: answer the Apps Script endpoint with a fixture (ok, busy, invalid, server, network, nonjson, sending),
//   run the route's scenario in tools/shots-scenarios.mjs first, and name files <route>-<state>-<width>.png. Logic: tools/shots-stub.mjs.
// Serves the build folder on 127.0.0.1, finds every route from its *.html files, and writes
// docs/build/screens/[<step-id>/]<route>-<width>.png. Run the build first.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';

import { parseShotsArgs, stubAction, shotName } from './shots-stub.mjs';
import { SCENARIOS } from './shots-scenarios.mjs';

const WIDTHS = [375, 1280];

function fail(msg) {
  console.error(`shots: ${msg}`);
  process.exit(1);
}

let opts;
try {
  opts = parseShotsArgs(process.argv.slice(2));
} catch (e) {
  fail(e.message);
}
const { dir, sitePath, step, stub, nojs, route: onlyRoute } = opts;
const root = resolve(dir);
const outDir = resolve('docs/build/screens', step);

if (!existsSync(root) || !statSync(root).isDirectory()) fail(`${dir}/ not found; run the build first`);

function htmlFiles(d) {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = join(d, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith('.html') ? [p] : [];
  });
}
const allRoutes = htmlFiles(root)
  .map((f) => relative(root, f).split(sep).join('/'))
  .map((f) => '/' + f.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, ''))
  .sort();
if (!allRoutes.length) fail(`no .html files in ${dir}/`);
const routes = onlyRoute ? allRoutes.filter((r) => r.replace(/\/$/, '') === onlyRoute.replace(/\/$/, '')) : allRoutes;
if (!routes.length) fail(`--route ${onlyRoute} matches no built route`);
if (stub) {
  const missing = routes.filter((r) => !SCENARIOS[r]);
  if (missing.length) fail(`--stub needs a scenario in tools/shots-scenarios.mjs for: ${missing.join(', ')} (use --route)`);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  fail('playwright is not installed; run "npm i -D playwright" and "npx playwright install chromium"');
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain' };
function locate(urlPath) {
  let u = decodeURIComponent(urlPath.split('?')[0]);
  if (sitePath && (u === sitePath || u.startsWith(sitePath + '/'))) u = u.slice(sitePath.length) || '/';
  const p = normalize(u);
  const full = join(root, p);
  if (full !== root && !full.startsWith(root + sep)) return null;
  // `<route>.html` before `<route>/index.html`, as GitHub Pages resolves them (a folder may hold a redirect page)
  for (const c of [full, full + '.html', join(full, 'index.html')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}
const server = createServer((req, res) => {
  const file = locate(req.url || '/');
  if (!file) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;

mkdirSync(outDir, { recursive: true });
let browser;
let count = 0;
try {
  browser = await chromium.launch();
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce', javaScriptEnabled: !nojs });
    // Stub mode: the Apps Script endpoint gets fixture replies; every other script.google.com URL is aborted.
    const held = [];
    if (stub) {
      await context.route(/^https:\/\/script\.google\.com\//, (r) => {
        const a = stubAction(stub, r.request().method(), r.request().url());
        if (a.kind === 'fulfill') r.fulfill({ status: a.status, contentType: a.contentType, body: a.body });
        else if (a.kind === 'hold') held.push(r);
        else r.abort();
      });
    }
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(base + sitePath + route, { waitUntil: 'networkidle' });
      // JS off has no page script to drive, so the scenario runs only with JS on.
      if (stub && !nojs) await SCENARIOS[route](page);
      await page.screenshot({ path: join(outDir, shotName(route, stub, width, nojs)), fullPage: true });
      count++;
    }
    for (const r of held) await r.abort().catch(() => {});
    await context.close();
  }
} catch (e) {
  fail(String(e && e.message ? e.message : e));
} finally {
  if (browser) await browser.close();
  server.close();
}
console.log(`shots: ok (${routes.length} routes x ${WIDTHS.length} widths = ${count} images in ${relative(process.cwd(), outDir) || '.'}/)`);

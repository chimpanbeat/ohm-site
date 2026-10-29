// Prints /client-policies to public/ohm-client-policies.pdf and writes src/data/client-policies.pdf.json
// (ARCHITECTURE §B5, §B9). Run by hand after any change to the policy text, a figure it reads from site.ts,
// or the page: `npm run policies:pdf [-- --no-build]`. Never in CI; the PDF is committed.
// A test (tests/client-policies.test.ts) fails while the PDF or the hash file is stale.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { site } from '../src/data/site.ts';
import { clientPolicies } from '../src/data/client-policies.ts';

const root = resolve('dist');
const PDF = resolve('public/ohm-client-policies.pdf');
const HASHES = resolve('src/data/client-policies.pdf.json');
const base = site.deploy.base.replace(/\/+$/, '');

function fail(msg) {
  console.error(`policies:pdf: ${msg}`);
  process.exit(1);
}

if (!process.argv.includes('--no-build')) {
  const r = spawnSync('npm run build', { stdio: 'inherit', shell: true });
  if (r.status !== 0) fail('npm run build failed');
}
if (!existsSync(join(root, 'client-policies.html'))) fail('dist/client-policies.html not found; run the build');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  fail('playwright is not installed; run "npm ci" and "npx playwright install chromium"');
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };
// `<route>.html` before `<route>/index.html`, as GitHub Pages resolves them.
function locate(urlPath) {
  let u = decodeURIComponent(urlPath.split('?')[0]);
  if (base && (u === base || u.startsWith(base + '/'))) u = u.slice(base.length) || '/';
  const full = join(root, normalize(u));
  if (full !== root && !full.startsWith(root + sep)) return null;
  for (const c of [full, full + '.html', join(full, 'index.html')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}
const server = createServer((req, res) => {
  const file = locate(req.url || '/');
  if (!file) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const footer = `<div style="font-size:8pt;width:100%;text-align:center;">${site.name} · Client policies, version ${clientPolicies.version} · Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`;

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${origin}${base}/client-policies`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.querySelectorAll('details.policy').forEach((d) => (d.open = true)));
  await page.pdf({
    path: PDF,
    format: 'Letter',
    printBackground: false,
    tagged: true,
    outline: true,
    margin: { top: '0.6in', right: '0.7in', bottom: '0.7in', left: '0.7in' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: footer,
  });
} catch (e) {
  fail(String(e && e.message ? e.message : e));
} finally {
  if (browser) await browser.close();
  server.close();
}

const sha = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(PDF);
const hashes = {
  version: clientPolicies.version,
  date: clientPolicies.date,
  sourceSha256: sha(JSON.stringify(clientPolicies)),
  pdfSha256: sha(bytes),
};
writeFileSync(HASHES, JSON.stringify(hashes, null, 2) + '\n');
console.log(`policies:pdf: wrote ${PDF} (${(bytes.length / 1024).toFixed(0)} KB) and ${HASHES}`);
if (bytes.length >= 400 * 1024) fail(`the PDF is ${bytes.length} bytes; it must stay under 400 KB`);

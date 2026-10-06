// /hello guard (ARCHITECTURE §B8, steps/9C-hello.md, 10B). Run after `npm run build`.
// `/hello` must stay noindex, unlinked, out of the sitemap, limited to one inline script, and Home must have no splash.
// Usage: node scripts/check-dist.mjs [--dist <dir>]. Exit 0 ok, 1 problem found, 2 dist missing.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { site, indexable } from '../src/data/site.ts';

const args = process.argv.slice(2);
const flag = args.indexOf('--dist');
const DIST = flag !== -1 && args[flag + 1] ? args[flag + 1] : 'dist';
if (!existsSync(DIST)) {
  console.error(`check:dist: ${DIST}/ not found. Run \`npm run build\` first.`);
  process.exit(2);
}

const base = site.deploy.base.replace(/\/+$/, '');
const HELLO_PATH = `${base}/hello`;
const rel = (p) => relative(DIST, p).split(sep).join('/');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.html')) yield p;
  }
}
const read = (name) => {
  const p = join(DIST, name);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
};

const problems = [];
const fail = (msg) => problems.push(msg);

const hello = read('hello.html');
if (hello === null) {
  fail('hello.html is missing from dist/.');
} else {
  // 1. noindex, whatever `indexable` says.
  if (!/<meta\b[^>]*\bname="robots"[^>]*\bcontent="[^"]*\bnoindex\b[^"]*"/i.test(hello)) {
    fail('hello.html lacks <meta name="robots" content="noindex">.');
  }
  // 2. Self canonical.
  const canonical = hello.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/i)?.[1];
  if (canonical) {
    let path = canonical;
    try {
      path = new URL(canonical, 'https://placeholder.invalid').pathname;
    } catch {}
    if (path.replace(/\/+$/, '') !== HELLO_PATH) fail(`hello.html canonical is "${canonical}", expected the path ${HELLO_PATH}.`);
  }
  // 7. JavaScript: the JSON-LD data block, plus at most one inline script (the click pause), never a src.
  let inline = 0;
  for (const m of hello.matchAll(/<script\b([^>]*)>/gi)) {
    if (/\btype="application\/ld\+json"/i.test(m[1])) continue;
    if (/\bsrc\s*=/i.test(m[1])) fail('hello.html has a <script src> (only one inline script is allowed).');
    else inline++;
  }
  if (inline > 1) fail(`hello.html has ${inline} inline scripts (at most one is allowed).`);
}

// 3. Not in the sitemap.
const sitemap = read('sitemap.xml');
if (sitemap !== null && /hello/i.test(sitemap)) fail('sitemap.xml mentions hello.');

// 4. robots.txt: no rule for /hello by name. A whole-site `Disallow: /` is the pre-launch state and is allowed.
const robots = read('robots.txt');
if (robots !== null) {
  for (const line of robots.split(/\r?\n/)) {
    const m = line.match(/^\s*Disallow:\s*(\S+)/i);
    if (m && (m[1].startsWith('/hello') || m[1].startsWith(`${base}/hello`))) fail(`robots.txt disallows /hello ("${line.trim()}").`);
  }
}

// 5. Nothing links to /hello. 6. Home carries no splash.
const HELLO_LINK = /href\s*=\s*["']?[^"'\s>]*\/hello(?:\.html)?(?=[/"'#?\s>]|$)/i;
for (const file of walk(DIST)) {
  const name = rel(file);
  if (name === 'hello.html' || name === 'hello/index.html') continue;
  const html = readFileSync(file, 'utf8');
  if (HELLO_LINK.test(html)) fail(`${name} links to /hello (it must stay unlinked).`);
}
const index = read('index.html');
if (index !== null && /class="hello"|omega-|splash/i.test(index)) fail('index.html contains class="hello", "omega-" or "splash" (Home has no splash).');

if (problems.length) {
  console.error('check:dist FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check:dist OK (${DIST}, indexable: ${indexable}).`);

// /hello guard (ARCHITECTURE §B8, steps/9C-hello.md, 10B). Run after `npm run build`.
// `/hello` must stay noindex, unlinked, out of the sitemap, limited to one inline script, and Home must have no splash.
// Usage: node scripts/check-dist.mjs [--dist <dir>]. Exit 0 ok, 1 problem found, 2 dist missing.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { site, indexable } from '../src/data/site.ts';
import { analytics } from '../src/data/analytics.ts';

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

const isAnalyticsScript = (attrs) => attrs.includes(analytics.scriptSrc); // /hello is bare: the Umami tag only, no click script

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
    if (/\bsrc\s*=/i.test(m[1])) {
      // A1: /hello is tracked. The Umami tag is the only src script allowed.
      if (!isAnalyticsScript(m[1])) fail('hello.html has a <script src> other than the analytics scripts (only one inline script is allowed).');
    }
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

// A1 / I-115: /body-map never loads analytics (it carries health information). Passes when the file does not exist yet.
const ANALYTICS_MARKERS = [new URL(analytics.scriptSrc).hostname, 'data-website-id', 'data-umami', 'analytics-rules', analytics.websiteId];
for (const name of ['body-map.html', 'body-map/index.html']) {
  const html = read(name);
  if (html === null) continue;
  for (const marker of ANALYTICS_MARKERS) {
    if (html.includes(marker)) fail(`${name} contains "${marker}" (/body-map must load no analytics, I-115).`);
  }
  if (/<script\b[^>]*\bsrc="[^"]*\/Base\.astro_astro_type_script[^"]*\.js"/i.test(html)) fail(`${name} loads Base's analytics script (I-115).`);
}

// B4 / ARCHITECTURE §B12 Checks: the body map page. Passes when the file does not exist. It is noindex with a self
// canonical, in no sitemap or robots.txt rule, linked from nowhere, and has no zone markup. While closed (no form) it
// has no script and no endpoint URL; while open (a preview build, or after B10) exactly one script, whose chunk names
// no host but the site, script.google.com and www.w3.org. Every src and href is relative or on the site.
{
  const BODY_MAP_PATH = `${base}/body-map`;
  const html = read('body-map.html');
  if (html !== null) {
    if (!/<meta\b[^>]*\bname="robots"[^>]*\bcontent="[^"]*\bnoindex\b[^"]*"/i.test(html)) fail('body-map.html lacks <meta name="robots" content="noindex">.');
    const canonical = html.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/i)?.[1];
    if (!canonical) fail('body-map.html has no <link rel="canonical"> (a self canonical is required).');
    else {
      let path = canonical;
      try {
        path = new URL(canonical, 'https://placeholder.invalid').pathname;
      } catch {}
      if (path.replace(/\/+$/, '') !== BODY_MAP_PATH) fail(`body-map.html canonical is "${canonical}", expected the path ${BODY_MAP_PATH}.`);
    }
    const found = [...html.matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/\btype="application\/ld\+json"/i.test(m[1]));
    const open = /<form\b/i.test(html);
    if (!open) {
      if (found.length) fail(`body-map.html is closed (no form) but has ${found.length} script(s); a closed page has none.`);
      if (html.includes('script.google.com')) fail('body-map.html is closed but names script.google.com (the endpoint URL must not ship while closed).');
    } else {
      const srcs = found.map((m) => m[1].match(/\bsrc="([^"]*)"/)?.[1]).filter(Boolean);
      if (found.length !== 1 || srcs.length !== 1) fail(`body-map.html is open and needs exactly one script, a <script src> (found ${found.length}, ${found.length - srcs.length} inline).`);
      const own = new Set([new URL(site.deploy.site).host, new URL(site.deploy.customDomain).host]);
      const allowed = new Set([...own, 'script.google.com', 'www.w3.org']);
      for (const src of srcs) {
        const rel = src.replace(/^https?:\/\/[^/]+/, '').replace(base ? new RegExp(`^${base}`) : /^/, '').replace(/^\/+/, '');
        const js = read(rel);
        if (js === null) fail(`body-map.html loads ${src}, which is not in ${DIST}/.`);
        else {
          for (const h of new Set([...js.matchAll(/https?:\/\/([\w.-]+)/g)].map((m) => m[1]))) {
            if (!allowed.has(h)) fail(`${rel} names the host ${h} (only the site, script.google.com and www.w3.org are allowed).`);
          }
        }
      }
    }
    if (/\bdata-zone\b|bodymap-zones?\b|\bzone-key\b|class="[^"]*\bbm-zone\b/i.test(html)) fail('body-map.html contains zone markup (zones are never in the HTML, §B12).');
    const own = new Set([new URL(site.deploy.site).host, new URL(site.deploy.customDomain).host]);
    for (const m of html.matchAll(/\s(?:src|href)="([^"]*)"/gi)) {
      if (!/^(?:https?:)?\/\//i.test(m[1])) continue;
      let host = '';
      try {
        host = new URL(m[1].startsWith('//') ? `https:${m[1]}` : m[1]).host;
      } catch {}
      if (!own.has(host)) fail(`body-map.html has a src or href to ${host || m[1]} (same-origin only).`);
    }
  }
  const map = read('sitemap.xml');
  if (map !== null && /body-map/i.test(map)) fail('sitemap.xml mentions body-map.');
  const bots = read('robots.txt');
  if (bots !== null && /body-map/i.test(bots)) fail('robots.txt mentions body-map (a rule would announce the page).');
  const LINK = /href\s*=\s*["']?[^"'\s>]*\/body-map(?:\.html)?(?=[/"'#?\s>]|$)/i;
  for (const file of walk(DIST)) {
    const name = rel(file);
    if (/^body-map(\/index)?\.html$/.test(name)) continue;
    if (LINK.test(readFileSync(file, 'utf8'))) fail(`${name} links to /body-map (it must stay unlinked).`);
  }
}

// A1: every other page carries the Umami tag exactly once, with the website ID and data-domains set to the production hostname only.
const UMAMI_TAG = /<script\b[^>]*\bsrc="([^"]*)"[^>]*>/gi;
for (const file of walk(DIST)) {
  const name = rel(file);
  if (/^body-map(\/index)?\.html$/.test(name)) continue;
  const html = readFileSync(file, 'utf8');
  if (/http-equiv="refresh"/i.test(html) && !/<main\b/i.test(html)) continue; // redirect stubs
  const tags = [...html.matchAll(UMAMI_TAG)].filter((m) => m[1] === analytics.scriptSrc).map((m) => m[0]);
  if (tags.length !== 1) fail(`${name} has ${tags.length} Umami tags (expected 1).`);
  else if (!tags[0].includes(`data-domains="${analytics.domain}"`) || !tags[0].includes(`data-website-id="${analytics.websiteId}"`)) {
    fail(`${name}: the Umami tag needs data-website-id and data-domains="${analytics.domain}".`);
  }
}

// Brian, Nov 9: every link to another site opens in a new tab, with rel="noopener" (never noreferrer-only: PocketSuite and
// John-Mark may want the referrer). Checked on every built page, so a new outbound link can't miss the rule. Own-site
// links, mailto: and tel: are not outbound. (The site's own domain and the Pages host count as ours.)
{
  const own = new Set([new URL(site.url ?? 'https://ohmprecisionbodywork.com').host]);
  for (const file of walk(DIST)) {
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/<a\b[^>]*>/g)) {
      const tag = m[0];
      const url = tag.match(/\shref="(https?:\/\/[^"]+)"/)?.[1];
      if (!url) continue;
      let host;
      try {
        host = new URL(url.replace(/&amp;/g, '&')).host;
      } catch {
        continue;
      }
      if (own.has(host) || host.endsWith('.github.io')) continue;
      if (!/\starget="_blank"/.test(tag) || !/\srel="[^"]*\bnoopener\b/.test(tag)) fail(`${rel(file)}: outbound link to ${host} must have target="_blank" rel="noopener".`);
    }
  }
}

if (problems.length) {
  console.error('check:dist FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check:dist OK (${DIST}, indexable: ${indexable}).`);

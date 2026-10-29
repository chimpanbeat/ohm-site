// Wording guard (brief §7, ARCHITECTURE §B5). Run after `npm run build`.
// Exit 0 ok, 1 forbidden wording found, 2 dist/ missing.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { site } from '../src/data/site.ts';
import { wording } from '../src/data/wording.ts';

// --dist <dir> and --licensed true|false let the test run both states on synthetic trees.
const flag = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const DIST = flag('dist') ?? 'dist';
const LICENSED = flag('licensed') === undefined ? site.licensed : flag('licensed') === 'true';
if (!existsSync(DIST)) {
  console.error('check:wording: dist/ not found. Run `npm run build` first.');
  process.exit(2);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.html')) yield p;
  }
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

function visibleText(html) {
  let h = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  const attrs = [];
  for (const m of h.matchAll(/\b(?:alt|title|aria-label|placeholder)="([^"]*)"/gi)) attrs.push(m[1]);
  for (const m of h.matchAll(/<meta\b[^>]*\bcontent="([^"]*)"/gi)) attrs.push(m[1]);
  const body = h.replace(/<[^>]+>/g, ' ');
  return decode([body, ...attrs].join(' \n '));
}

const FORBIDDEN = /\bmassage\s+therap(?:ist|y)\b|\bLMT\b|\blicensed\b/i;
const MEDICAL = /\b(?:treat|cure|diagnos|fix|heal)\w*/i;
const NUMBER_LABEL = /\blicen[cs]e\s*(?:no\b\.?|number\b|#)/i;
const JSON_LD = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
const [CREDENTIAL, LICENSED_IN] = [wording.credential[1], wording.licensedIn[1]];
const verifyHref = `href="${site.licenseVerifyUrl}"`;
// The required scope note (brief §5). It is removed before the medical-word scan.
const ALLOW = /not a substitute for medical diagnosis or treatment/gi;

const context = (text, idx, len) => text.slice(Math.max(0, idx - 30), idx + len + 30).replace(/\s+/g, ' ');

const count = (text, needle) => text.split(needle).length - 1;
const isHello = (rel) => /(?:^|\/)hello(?:\/index)?\.html$/.test(rel);

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`FAIL ${msg}`);
};

if (site.licenseNumber) fail('licenseNumber must stay empty (I-035)');

const seen = new Set();
for (const file of walk(DIST)) {
  const raw = readFileSync(file, 'utf8');
  const text = visibleText(raw);
  const rel = relative(DIST, file).replaceAll('\\', '/');
  seen.add(rel);

  if (site.licenseNumber && raw.includes(site.licenseNumber)) fail(`${rel}: contains the license number`);

  if (!LICENSED) {
    const g = new RegExp(FORBIDDEN.source, 'gi');
    for (const m of text.matchAll(g)) fail(`${rel}: "${m[0]}" ... ${context(text, m.index, m[0].length)}`);
  } else if (!isHello(rel)) {
    if (!text.includes(CREDENTIAL)) fail(`${rel}: missing the credential "${CREDENTIAL}"`);
    if (!text.includes(LICENSED_IN)) fail(`${rel}: missing "${LICENSED_IN}"`);
    if (!raw.includes(verifyHref)) fail(`${rel}: missing the ${verifyHref} link`);
    if ((rel === 'about.html' || rel === 'book.html') && count(text, CREDENTIAL) < 2) {
      fail(`${rel}: the credential must appear twice (page block and footer)`);
    }
  }

  for (const m of raw.matchAll(JSON_LD)) {
    if (/"hasCredential"|"identifier"/.test(m[1])) fail(`${rel}: JSON-LD carries a credential or identifier (I-035)`);
  }
  const label = text.match(NUMBER_LABEL);
  if (label) fail(`${rel}: "${label[0]}" ... ${context(text, label.index, label[0].length)}`);

  const g2 = new RegExp(MEDICAL.source, 'gi');
  const scan = text.replace(ALLOW, ' ');
  for (const m of scan.matchAll(g2)) {
    console.warn(`WARN ${rel}: medical-claim word "${m[0]}" ... ${context(scan, m.index, m[0].length)}`);
  }
}

if (LICENSED) {
  for (const required of ['about.html', 'book.html']) {
    if (!seen.has(required)) fail(`${required}: page not found in ${DIST}`);
  }
}

if (failed) process.exit(1);
console.log('check:wording OK');

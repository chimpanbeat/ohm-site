// Wording guard (brief §7, ARCHITECTURE §B5). Run after `npm run build`.
// Exit 0 ok, 1 forbidden wording found, 2 dist/ missing.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { site } from '../src/data/site.ts';

const DIST = 'dist';
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
// The required scope note (brief §5). It is removed before the medical-word scan.
const ALLOW = /not a substitute for medical diagnosis or treatment/gi;

const context = (text, idx, len) => text.slice(Math.max(0, idx - 30), idx + len + 30).replace(/\s+/g, ' ');

let failed = false;
for (const file of walk(DIST)) {
  const text = visibleText(readFileSync(file, 'utf8'));
  const rel = relative('.', file);

  if (!site.licensed) {
    const g = new RegExp(FORBIDDEN.source, 'gi');
    for (const m of text.matchAll(g)) {
      failed = true;
      console.error(`FAIL ${rel}: "${m[0]}" ... ${context(text, m.index, m[0].length)}`);
    }
  }

  const g2 = new RegExp(MEDICAL.source, 'gi');
  const scan = text.replace(ALLOW, ' ');
  for (const m of scan.matchAll(g2)) {
    console.warn(`WARN ${rel}: medical-claim word "${m[0]}" ... ${context(scan, m.index, m[0].length)}`);
  }
}

if (failed) process.exit(1);
console.log('check:wording OK');

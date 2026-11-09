// Footer brand credit (Brian, Nov 9, 2026; ARCHITECTURE §A4, copy deck → Global).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';
import { launchParty, SESSION_LIMIT, CHAI_NOTE } from '../src/data/events.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const skip = existsSync(join(dist, 'index.html')) ? false : 'dist missing: run npm run build';

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function pages(dir = dist): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...pages(p));
    else if (n.endsWith('.html')) out.push(p);
  }
  return out;
}

test('footer 1. site.brandCredit is the launch party credit: same name, role and URL, both event-day versions', () => {
  assert.deepEqual(site.brandCredit, { name: 'John-Mark', role: 'Brand design', url: 'https://johnmark.co' });
  for (const chai of [null, CHAI_NOTE]) {
    const c = launchParty(SESSION_LIMIT, chai).credits!.items.find((i) => i.url === site.brandCredit.url);
    assert.ok(c, 'the launch party credits John-Mark');
    assert.deepEqual({ name: c!.name, role: c!.role, url: c!.url }, site.brandCredit);
  }
  const u = new URL(site.brandCredit.url);
  assert.equal(u.protocol, 'https:');
  assert.equal(u.host, 'johnmark.co');
});

test('footer 2. every page with the site footer ends it with the credit; the name links, new tab, noopener', { skip }, () => {
  let checked = 0;
  for (const f of pages()) {
    const rel = relative(dist, f).replaceAll('\\', '/');
    const html = readFileSync(f, 'utf8');
    if (rel === 'hello.html' || /http-equiv="refresh"/i.test(html)) {
      // /hello is bare (§B8) and redirect stubs have no layout: no footer, so no credit
      assert.doesNotMatch(html, /<footer\b/, rel);
      continue;
    }
    const footer = html.match(/<footer\b[^>]*class="[^"]*\bsite-footer\b[^"]*"[^>]*>([\s\S]*?)<\/footer>/)?.[1];
    assert.ok(footer, `${rel}: site footer`);
    const ps = [...footer!.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)];
    const last = ps.at(-1)!;
    assert.match(last[0], /class="[^"]*\bsite-footer__credit\b/, `${rel}: the credit is the footer's last line`);
    assert.equal(text(last[1]), 'Brand design by John-Mark (opens in a new tab)', `${rel}: credit text`);
    const links = [...last[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)];
    assert.equal(links.length, 1, `${rel}: one link in the credit`);
    const [a, inner] = [links[0][0], links[0][1]];
    assert.equal(attr(a, 'href'), site.brandCredit.url);
    assert.equal(attr(a, 'target'), '_blank');
    assert.match(attr(a, 'rel')!, /\bnoopener\b/);
    assert.equal(text(inner), 'John-Mark (opens in a new tab)', `${rel}: accessible name`);
    assert.match(inner, /<span\b[^>]*class="[^"]*\bvisually-hidden\b[^"]*"[^>]*> \(opens in a new tab\)<\/span>/, `${rel}: hint is visually hidden`);
    assert.equal(html.split(site.brandCredit.url).length - 1, rel === 'events/launch-party.html' ? 2 : 1, `${rel}: credit URL count`);
    checked++;
  }
  // Home, Services, Pricing, About, Book, five /book/<zone>, Client policies, the launch party, 404
  assert.ok(checked >= 13, `checked ${checked} pages`);
});

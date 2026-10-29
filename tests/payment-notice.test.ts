import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, bookingUrl } from '../src/data/site.ts';
import {
  clientPolicies,
  coloradoNotice,
  surchargeLine,
  acceptedPayments,
  zelleDetails,
  paymentMethodsLine,
} from '../src/data/client-policies.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const built = existsSync(join(dist, 'book.html'));
const skip = built ? false : 'dist/book.html missing: run npm run build';
const read = (f: string) => readFileSync(join(dist, f), 'utf8');

const SHOWN = ['book.html', 'book/central.html', 'book/midnorth.html', 'book/north.html', 'book/office.html', 'services.html', 'pricing.html'];

// Visible text: scripts, styles and tags dropped, entities decoded, whitespace collapsed.
function text(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
const missing = (html: string) => [paymentMethodsLine, surchargeLine, coloradoNotice].filter((s) => !text(html).includes(s));
const noticeCount = (html: string) => (html.match(/class="[^"]*\bpayment-notice\b/g) ?? []).length;

function distHtml(dir = dist): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? distHtml(p) : n.endsWith('.html') ? [p] : [];
  });
}
function srcFiles(dir = join(root, 'src')): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? srcFiles(p) : [p];
  });
}

test('1. data: methods line, surcharge line and the booking bullets share one source', () => {
  assert.equal(
    paymentMethodsLine,
    "I accept cash, Zelle, and credit or debit cards through PocketSuite (Tap to Pay in person, or the booking link). Ask me for Zelle details. I don't accept Venmo, PayPal or other payment apps.",
  );
  assert.equal(surchargeLine, 'Ohm Precision Bodywork adds a 3% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.');
  assert.equal(paymentMethodsLine, `${acceptedPayments} ${zelleDetails}`);
  const bullets = clientPolicies.sections.find((s) => s.id === 'booking')!.blocks.find((b) => b.type === 'bullets') as { items: { text: unknown }[] };
  assert.equal(bullets.items[2].text, acceptedPayments);
  assert.equal(bullets.items[3].text, zelleDetails);
});

test('2. source: one place for the text, none typed in the component or pages', () => {
  const comp = readFileSync(join(root, 'src/components/PaymentNotice.astro'), 'utf8');
  for (const name of ['paymentMethodsLine', 'surchargeLine', 'coloradoNotice']) assert.ok(comp.includes(name), `component imports ${name}`);
  assert.ok(comp.includes('../data/client-policies.ts'));
  assert.doesNotMatch(comp, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(comp, /<script/);
  assert.doesNotMatch(comp, /<h[1-6]/);
  for (const f of srcFiles()) {
    if (f.endsWith(join('data', 'client-policies.ts'))) continue;
    const s = readFileSync(f, 'utf8');
    for (const lit of ['Tap to Pay', '5-2-212', '3% surcharge', 'Venmo']) assert.ok(!s.includes(lit), `${f} contains "${lit}"`);
  }
});

test('3. dist: every shown page has the notice once, in order', { skip }, () => {
  for (const f of SHOWN) {
    const html = read(f);
    assert.deepEqual(missing(html), [], f);
    assert.equal(noticeCount(html), 1, `${f} payment-notice count`);
    const t = text(html);
    const boxAt = html.search(/class="[^"]*\bpayment-notice__box/);
    const box = html.slice(html.lastIndexOf('<div', boxAt));
    assert.ok(text(box.slice(0, box.indexOf('</div>'))).startsWith('Colorado notice'), `${f} head inside the box`);
    assert.ok(t.indexOf(paymentMethodsLine) < t.indexOf(surchargeLine), `${f} methods before surcharge`);
    assert.ok(t.indexOf(surchargeLine) < t.indexOf(coloradoNotice), `${f} surcharge before notice`);
  }
});

test('4. /book/out has no notice and keeps its contact request', { skip }, () => {
  const html = read('book/out.html');
  assert.equal(noticeCount(html), 0);
  for (const s of [paymentMethodsLine, surchargeLine, coloradoNotice]) assert.ok(!text(html).includes(s));
  assert.match(text(html), /Send a request/);
});

test('5. placement', { skip }, () => {
  for (const f of ['services.html', 'pricing.html']) {
    const html = read(f);
    const at = html.search(/class="[^"]*\bpayment-notice\b/);
    const cta = html.lastIndexOf('<a class="btn" href="' + site.deploy.base + '/book"');
    assert.ok(at > -1 && cta > at, `${f} notice before BookCta`);
    // Nothing but the notice sits between its start and the button.
    const gap = text(html.slice(at, cta));
    assert.ok(gap.endsWith(coloradoNotice), `${f} notice is the last text before the button`);
  }
  for (const f of SHOWN.filter((x) => x.startsWith('book/'))) {
    const html = read(f);
    const at = html.search(/class="[^"]*\bpayment-notice\b/);
    const map = html.search(/class="[^"]*service-map/);
    const key = f === 'book/office.html' ? site.office.linkKey : site.zones[f.slice(5, -5) as 'central'].linkKey!;
    const link = html.indexOf(`href="${bookingUrl(key).replace(/&/g, '&amp;')}"`);
    assert.ok(link > -1 && at > link, `${f} notice after the card's booking link`);
    assert.ok(map > at, `${f} notice before the map`);
  }
  const book = read('book.html');
  const at = book.search(/class="[^"]*\bpayment-notice\b/);
  assert.ok(at > book.indexOf('id="mobile"'), 'after #mobile opens');
  assert.ok(at > book.indexOf('</section>', book.indexOf('id="mobile"')), 'after #mobile closes');
  assert.ok(at < book.indexOf('<template'), 'before the templates');
});

test('6. sequence: removing a line is caught, restoring clears it', { skip }, () => {
  const html = read('book/central.html');
  assert.deepEqual(missing(html.replace(surchargeLine, '')), [surchargeLine]);
  assert.deepEqual(missing(html), []);
  assert.deepEqual(missing(html.replace('Venmo, PayPal', 'Venmo')), [paymentMethodsLine]);
});

test('7. nothing wrong anywhere in dist', { skip }, () => {
  for (const p of distHtml()) {
    const t = text(readFileSync(p, 'utf8'));
    assert.doesNotMatch(t, /\bACH\b/i, p);
    assert.doesNotMatch(t, /bank transfer|wire transfer/i, p);
    assert.doesNotMatch(t, /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/, p);
    for (const e of t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? []) assert.equal(e, site.email, `${p} email`);
    for (const sentence of t.split(/(?<=[.!?])\s+/).filter((s) => /Venmo|PayPal/.test(s))) assert.match(sentence, /don't accept/, p);
    assert.doesNotMatch(t, /Zelle.{0,20}[@\d]/, p);
  }
});

test('8. /client-policies is unchanged', { skip }, () => {
  const html = read('client-policies.html');
  assert.equal(noticeCount(html), 0);
  const t = text(html);
  assert.ok(t.includes(acceptedPayments) && t.includes(zelleDetails));
  assert.equal(t.split(coloradoNotice).length - 1, 1);
});

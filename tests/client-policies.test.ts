import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy } from 'unpdf';
import { site, mailHref } from '../src/data/site.ts';
import {
  clientPolicies,
  coloradoNotice,
  surchargeLine,
  lateCancelFee,
  packageSavings,
  policiesPdfPath,
  terms,
} from '../src/data/client-policies.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const base = site.deploy.base;
const host = new URL(site.deploy.customDomain).host;

// Every string and Run.text in a block, section or the whole document, as plain text.
function flat(x: unknown): string {
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x.map(flat).join(typeof x[0] === 'string' && x.every((r) => typeof r === 'string' || (r && 'href' in r)) ? '' : '\n');
  if (x && typeof x === 'object' && 'href' in x && 'text' in x) return String(x.text);
  if (x && typeof x === 'object') return Object.values(x).map(flat).join('\n');
  return '';
}
const section = (id: string) => clientPolicies.sections.find((s) => s.id === id)!;

const IDS = ['booking', 'cancelling', 'late-arrival', 'illness', 'mobile-visits', 'packages', 'not-right', 'tips', 'communication', 'conduct'];
const TITLES = [
  'Booking and payment',
  'Cancelling and rescheduling',
  'Late arrival and no-shows',
  'Illness and skin conditions',
  'Mobile visits and travel',
  'Packages',
  "If a session wasn't right",
  'Tips',
  'Communication',
  'Conduct and safety',
];
const NOTICE =
  'To cover the cost of processing a credit or charge card transaction, and pursuant to section 5-2-212, Colorado Revised Statutes, a seller or lessor may impose a processing surcharge in an amount not to exceed the merchant discount fee that the seller or lessor incurs in processing the sales or lease transaction. A seller or lessor shall not impose a processing surcharge on payments made by use of cash, a check, or a debit card or redemption of a gift card.';
const ZELLE = "Ask me for Zelle details. I don't accept Venmo, PayPal or other payment apps.";
const FASTEST = `The fastest way to reach me is the contact form or chat at ${host}.`;
const PHONE = /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;

test('1. ten sections in order with stable ids and titles', () => {
  assert.deepEqual(clientPolicies.sections.map((s) => s.id), IDS);
  assert.deepEqual(clientPolicies.sections.map((s) => s.title), TITLES);
});

test('2. version 1.4, dated Oct 29, 2026', () => {
  assert.equal(clientPolicies.version, '1.4');
  assert.equal(clientPolicies.date, '2026-10-29');
  assert.equal(clientPolicies.displayDate, 'Oct 29, 2026');
  const shown = new Date(`${clientPolicies.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  assert.equal(clientPolicies.displayDate, shown);
});

test('3. late-cancel fee and package savings are derived', () => {
  assert.equal(lateCancelFee(site.rates.s60), 45);
  assert.equal(lateCancelFee(site.rates.s90), 60);
  assert.equal(lateCancelFee({ label: 'x', minutes: 60, price: 100 }), 50);
  assert.equal(lateCancelFee(site.rates.s60), 45);
  assert.equal(packageSavings('s60', 'office'), 75);
  assert.equal(packageSavings('s60', 'mobile'), 100);
  assert.equal(packageSavings('s90', 'office'), 100);
  assert.equal(packageSavings('s90', 'mobile'), 125);
});

test('4. price tables and quoted figures match the doc', () => {
  const tables = clientPolicies.sections.flatMap((s) => s.blocks).filter((b) => b.type === 'table') as { caption: string; rows: string[][] }[];
  const byCaption = (c: string) => tables.find((t) => t.caption === c)!;
  assert.deepEqual(byCaption('Session prices').rows, [
    ['60 minutes', '$90', '$90 + $25 travel'],
    ['90 minutes', '$120', '$120 + $25 travel'],
  ]);
  assert.deepEqual(byCaption('Package prices').rows, [
    ['5 × 60 minutes', '$375 (save $75)', '$475 (save $100)'],
    ['5 × 90 minutes', '$500 (save $100)', '$600 (save $125)'],
  ]);
  assert.ok(flat(section('cancelling')).includes('$45 for a 60-minute session, $60 for a 90-minute session'));
  assert.ok(flat(section('booking')).includes('about 75 minutes start to finish'));
  assert.ok(flat(section('booking')).includes('and a 90-minute session about 105.'));
});

test('5. both I-037 changes are in, and the links are the site contacts', () => {
  const all = flat(clientPolicies);
  assert.ok(all.includes(ZELLE));
  assert.ok(all.includes(FASTEST));
  const runs = section('communication').blocks.flatMap((b) => (b.type === 'bullets' ? b.items.flatMap((i) => (Array.isArray(i.text) ? i.text : [])) : []));
  const hrefs = runs.filter((r) => typeof r !== 'string').map((r) => (r as { href: string }).href);
  assert.deepEqual(hrefs, [site.contact.lead, site.contact.chat, mailHref]);
});

test('6. nothing private or typed in: no placeholders, phone, Zelle address or literal figures', () => {
  const all = flat(clientPolicies);
  assert.doesNotMatch(all, /[[\]]/);
  assert.doesNotMatch(all, /Drafting|TODO/);
  const json = JSON.stringify(clientPolicies);
  assert.doesNotMatch(json, PHONE);
  assert.doesNotMatch(json, /tel:|sms:/);
  assert.doesNotMatch(json, /\bhome[\s-]+(?:visits?|office|mobile)\b/i);
  assert.deepEqual([...new Set(json.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [])], [site.email]);
  const src = readFileSync(join(root, 'src/data/client-policies.ts'), 'utf8');
  assert.doesNotMatch(src, /\$\d/);
  assert.doesNotMatch(src, /@/);
  assert.doesNotMatch(src, /ohmprecisionbodywork\.com/);
});

test('7. the Colorado notice is verbatim and sits beside the surcharge line', () => {
  assert.equal(coloradoNotice, NOTICE);
  assert.equal(surchargeLine, 'Ohm Precision Bodywork adds a 3% surcharge to credit card payments. No surcharge on cash, Zelle, or debit cards.');
  const notice = section('booking').blocks.find((b) => b.type === 'notice') as { columns: { head: string; text: string }[] };
  assert.deepEqual(notice.columns, [
    { head: 'Colorado notice', text: coloradoNotice },
    { head: site.name, text: `${surchargeLine} The surcharge appears as its own line on your receipt.` },
  ]);
});

// 8. The committed PDF is the doc kit's branded build (I-043). Its extracted text must carry every sentence of the source.
const STALE = 'rebuild the PDF in the doc kit from src/data/client-policies.ts and save it as public/ohm-client-policies.pdf';
const pdfPath = join(root, 'public/ohm-client-policies.pdf');
const pdfBytes = existsSync(pdfPath) ? readFileSync(pdfPath) : Buffer.alloc(0);
// Typographic quotes to straight, a word broken at a hyphen across lines rejoined, whitespace collapsed.
const norm = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ /g, ' ')
    .replace(/(\w-)[ \t]*\r?\n\s*(?=\w)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
async function readPdf(bytes: Buffer) {
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  const links: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    for (const a of await (await doc.getPage(p)).getAnnotations()) if (a.url || a.unsafeUrl) links.push(String(a.url || a.unsafeUrl));
  }
  const { text } = await extractText(doc, { mergePages: true });
  return { text: norm(text), links };
}
const pdf = pdfBytes.length ? await readPdf(pdfBytes) : { text: '', links: [] as string[] };

type Doc = typeof clientPolicies;
const runText = (r: string | ({ text: string } | string)[]) => (typeof r === 'string' ? r : r.map((x) => (typeof x === 'string' ? x : x.text)).join(''));
// Every printed unit of the source: intro, titles, paragraphs, bullets (with lead), table heads and rows, notice columns.
function units(d: Doc): string[] {
  const out = [d.intro];
  for (const s of d.sections) {
    out.push(s.title);
    for (const b of s.blocks) {
      if (b.type === 'paragraph') out.push(runText(b.text));
      else if (b.type === 'bullets') for (const i of b.items) out.push(i.lead ? `${i.lead} ${runText(i.text)}` : runText(i.text));
      else if (b.type === 'table') out.push(b.head.join(' '), ...b.rows.map((r) => r.join(' ')));
      else if (b.type === 'notice') for (const c of b.columns) out.push(c.head, c.text);
    }
  }
  return out;
}
const sentences = (d: Doc) => units(d).flatMap((u) => norm(u).split(/(?<=[.?!])\s+(?=[A-Z0-9])/));
const missing = (d: Doc) => sentences(d).filter((s) => !pdf.text.includes(s));

test('8. the committed PDF carries every sentence of the source text, and nothing private', () => {
  assert.ok(pdfBytes.length, `public/ohm-client-policies.pdf missing: ${STALE}`);
  assert.equal(pdfBytes.subarray(0, 5).toString('latin1'), '%PDF-', STALE);
  assert.ok(pdfBytes.length < 400 * 1024, `PDF is ${pdfBytes.length} bytes; keep it under 400 KB`);
  assert.deepEqual(missing(clientPolicies), [], `sentences missing from the PDF: ${STALE}`);
  assert.ok(pdf.text.includes(ZELLE), 'the I-037 Zelle line');
  assert.ok(pdf.text.includes(FASTEST), 'the I-037 Communication sentence');
  assert.ok(pdf.text.includes(`Version ${clientPolicies.version}`), `version: ${STALE}`);
  const longDate = new Date(`${clientPolicies.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  assert.ok(pdf.text.includes(longDate), `date ${longDate}: ${STALE}`);
  // No phone number, Zelle address, other email, placeholder or phone link.
  assert.doesNotMatch(pdf.text, PHONE);
  assert.deepEqual([...new Set((pdf.text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []).map((e) => e.replace(/\.+$/, '')))], [site.email]);
  assert.doesNotMatch(pdf.text, /\bTODO\b|\bTBD\b|\bXX+\b|Drafting|lorem ipsum|[[\]{}]/i);
  assert.doesNotMatch(pdf.text, /\bhome[\s-]+(?:visits?|office|mobile)\b/i);
  assert.deepEqual(pdf.links.filter((u) => /^(?:tel|sms):/i.test(u)), []);
  // Sequence: a one-bullet change to the source leaves exactly that sentence missing from the PDF.
  const copy = structuredClone(clientPolicies);
  const b = copy.sections[1].blocks[0] as { items: { text: string }[] };
  b.items[0].text += ' x';
  assert.equal(missing(copy).length, 1);
  assert.deepEqual(missing(clientPolicies), []);
});

// Dist tests: skipped when the site has not been built (deploy.yml runs npm test before the build).
const built = existsSync(join(dist, 'client-policies.html'));
const skip = built ? false : 'dist/client-policies.html missing: run npm run build';
const read = (f: string) => readFileSync(join(dist, f), 'utf8');
const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (html: string) => decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

test('9. one closed <details> per section, with heading and anchor', { skip }, () => {
  const html = read('client-policies.html');
  const found = [...html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)].filter((m) => /\bclass="[^"]*\bpolicy\b/.test(m[1]));
  assert.equal(found.length, 10);
  found.forEach((m, i) => {
    assert.equal(m[1].match(/\bid="([^"]+)"/)?.[1], IDS[i]);
    assert.doesNotMatch(m[1], /\bopen\b/);
    const h2 = m[2].match(/<summary\b[^>]*>\s*<h2\b[^>]*>([\s\S]*?)<\/h2>/);
    assert.ok(h2, `${IDS[i]} has a summary with an h2`);
    assert.equal(decode(h2[1]).trim(), TITLES[i]);
    const body = decode(m[2]);
    assert.ok(new RegExp(`href="#${IDS[i]}"`).test(body), `${IDS[i]} anchor href`);
    assert.ok(body.includes(`aria-label="Link to ${TITLES[i]}"`), `${IDS[i]} anchor label`);
  });
});

test('10. version line, PDF link and hidden controls', { skip }, () => {
  const html = read('client-policies.html');
  assert.ok(text(html).includes('Version 1.4 · Oct 29, 2026'));
  assert.ok(html.includes(`href="${base}${policiesPdfPath}"`));
  assert.ok(existsSync(join(dist, 'ohm-client-policies.pdf')), 'dist carries the PDF: run npm run build');
  assert.match(html, /<div\b[^>]*class="[^"]*policies-controls[^"]*"[^>]*\bhidden\b/);
  for (const label of ['Expand all', 'Collapse all']) {
    const btn = html.match(new RegExp(`<button\\b([^>]*)>\\s*${label}\\s*</button>`));
    assert.ok(btn, label);
    assert.match(btn[1], /type="button"/);
  }
});

test('11. the page carries the notice and both I-037 sentences, and no phone', { skip }, () => {
  const html = read('client-policies.html');
  const t = text(html);
  assert.ok(t.includes(coloradoNotice));
  assert.ok(t.includes(ZELLE));
  assert.ok(t.includes(FASTEST));
  assert.doesNotMatch(t, PHONE);
  assert.doesNotMatch(html, /tel:|sms:/);
});

test('13. the footer, Services, Pricing and Book link to the policies', { skip }, () => {
  for (const f of ['index.html', 'services.html', 'pricing.html', 'book.html', 'about.html']) {
    assert.ok(read(f).includes(`href="${base}/client-policies"`), `${f} links to /client-policies`);
  }
  for (const f of ['services.html', 'pricing.html']) assert.ok(text(read(f)).includes('Cancellations, packages and payment are covered in my'), f);
  assert.ok(text(read('book.html')).includes('Booking means you agree to my'));
});

test('14. the sitemap lists the policies and still not /hello', { skip }, () => {
  const map = read('sitemap.xml');
  assert.ok(map.includes(`${base}/client-policies</loc>`));
  assert.doesNotMatch(map, /hello/);
});

test('15. only Book, the policies and /hello carry a script besides JSON-LD', { skip }, () => {
  const withScript: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n.endsWith('.html')) {
        const scripts = [...readFileSync(p, 'utf8').matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/application\/ld\+json/.test(m[1]));
        if (scripts.length) withScript.push(p.slice(dist.length + 1).replaceAll('\\', '/'));
      }
    }
  };
  walk(dist);
  assert.deepEqual(withScript.sort(), ['book.html', 'client-policies.html', 'hello.html']);
});

test('16. Pricing states the group rule once, in the intro; the travel-fee note does not repeat it (Oct 29)', { skip }, () => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const rule = `one fee covers up to ${words[terms.groupMax]} back-to-back sessions at the same address`;
  const t = text(read('pricing.html'));
  assert.equal(t.split(rule).length - 1, 1, 'the group rule appears exactly once on Pricing');
  assert.ok(t.includes(`Travel fee $${site.travelFee.amount}. ${site.travelFee.note}`), 'Travel fee paragraph');
  assert.doesNotMatch(t, /One travel fee covers up to/);
  // The zone card shows the same short note.
  assert.ok(text(read('book/central.html')).includes(`Travel fee $${site.travelFee.amount}. ${site.travelFee.note}`));
});

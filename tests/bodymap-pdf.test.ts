// B4 (I-073, BM-8 client half): the hand-written PDF writer (src/lib/pdf.ts) and the body map report (src/lib/bodymap-pdf.ts),
// read back with unpdf. ARCHITECTURE §B12 Report and PDF. Names, dates and notes are fake.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { extractImages, extractText, getDocumentProxy } from 'unpdf';
import { PdfWriter, textWidth, winAnsi, wrapText } from '../src/lib/pdf.ts';
import { buildPdf, buildReport, toBase64 } from '../src/lib/bodymap-pdf.ts';
import { bodymap } from '../src/data/bodymap.ts';
import { site } from '../src/data/site.ts';
import { DEFAULT_COLORS } from '../src/lib/bodymap-pdf.ts';

const SENT = new Date('2026-12-01T17:00:00Z'); // 10:00 in Denver

async function jpeg(w = 60, h = 120) {
  const bytes = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } } }).jpeg().toBuffer();
  return { jpeg: new Uint8Array(bytes), width: w, height: h };
}
const pin = (i: number, over: Record<string, unknown> = {}) => ({ id: `p${i}`, view: 'front' as const, x: 0.2 + (i % 5) * 0.1, y: 0.1 + (i % 7) * 0.1, type: 'pain' as const, intensity: null, note: '', star: false, fromList: false, ...over });
const state = (pins = [pin(1, { note: 'fake note' })], over: Record<string, unknown> = {}) => ({ name: 'Test Client', apptDate: '2026-12-03', figure: 'female' as const, pins, id: '3f2a9c1e-5b7d-4e8a-9c0b-1a2b3c4d5e6f', ...over });

async function read(bytes: Uint8Array) {
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  const { text, totalPages } = await extractText(doc, { mergePages: true });
  return { text: text as string, pages: totalPages, doc };
}

test('winAnsi: Latin-1 letters stay, anything else becomes ?', () => {
  assert.equal(winAnsi('José Muñoz'), 'José Muñoz');
  assert.equal(winAnsi('Łukasz'), '?ukasz');
  assert.equal(winAnsi('é'), 'é', 'a combining accent is composed first (NFC)');
  assert.equal(winAnsi('x́'), 'x?', 'a combining accent with no Latin-1 letter becomes ?');
  assert.equal(winAnsi('emoji 🌿!'), 'emoji ?!', 'one ? per character, never a throw');
});

test('wrapText never makes a line wider than the box', () => {
  const words = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon.';
  for (const size of [9, 10, 12]) {
    for (const max of [120, 200, 300]) {
      const lines = wrapText(words, max, size);
      assert.ok(lines.length >= 1);
      for (const l of lines) assert.ok(textWidth(l, size) <= max + 1e-6, `"${l}" at ${size}pt in ${max}`);
      assert.equal(lines.join(' ').replace(/\s+/g, ' '), words);
    }
  }
  const long = wrapText('x'.repeat(200), 100, 10);
  assert.ok(long.length > 1 && long.every((l) => textWidth(l, 10) <= 100 + 1e-6), 'one very long word is broken');
  assert.deepEqual(wrapText('', 100, 10), ['']);
});

test('the writer: a one-page PDF with text, shapes and one image reads back in unpdf', async () => {
  const w = new PdfWriter();
  const img = await jpeg();
  const idx = w.addImage(img.jpeg, img.width, img.height);
  const page = w.addPage(612, 792);
  page.text(50, 60, 'Hello (Test) \\ Client', { size: 14, bold: true });
  page.setFill(0.5, 0.2, 0.1).circle(100, 200, 8).setStroke(0, 0, 0).line(10, 10, 100, 10).polygon([[10, 300], [40, 300], [25, 330]]).rect(300, 300, 50, 50);
  page.image(idx, 300, 100, 100, 200);
  const bytes = w.build();
  assert.equal(new TextDecoder('latin1').decode(bytes.slice(0, 5)), '%PDF-');
  assert.match(new TextDecoder('latin1').decode(bytes.slice(-8)), /%%EOF\s*$/);
  const { text, pages, doc } = await read(bytes);
  assert.equal(pages, 1);
  assert.match(text, /Hello \(Test\) \\ Client/);
  const images = await extractImages(doc, 1);
  assert.equal(images.length, 1);
  assert.equal(images[0].width, 60);
  assert.equal(images[0].height, 120);
});

test('the report PDF holds the name, appointment, sent time, pin list and 1 image; é survives and ł becomes ?', async () => {
  const fig = await jpeg();
  const s = state([pin(1, { note: 'fake note' }), pin(2, { note: 'Zażółć café' })], { name: 'José Test Łukasz' });
  const bytes = buildPdf(s, SENT, { front: fig }, { siteName: site.name });
  const { text, pages, doc } = await read(bytes);
  assert.equal(pages, 1);
  assert.match(text, /José Test \?ukasz/, 'é kept, ł becomes ?');
  assert.match(text, /Dec 3, 2026/);
  assert.match(text, /2026-12-01 10:00/);
  assert.match(text, new RegExp(bodymap.text.pdf.title));
  assert.match(text, /Female/);
  assert.match(text, /1\b.*Pain/s);
  assert.match(text, /fake note/);
  assert.match(text, /café/);
  assert.match(text, new RegExp(bodymap.text.unlabelled), 'regions are unlabelled until B5');
  assert.match(text, new RegExp(`${site.name} · private client record`));
  assert.equal((await extractImages(doc, 1)).length, 1);
});

test('sixty pins with long notes run onto more pages, and every pin is listed', async () => {
  const fig = await jpeg();
  const pins = Array.from({ length: 60 }, (_, i) => pin(i + 1, { note: `fake note ${i + 1} ` + 'lorem ipsum '.repeat(9).trim().slice(0, 100) }));
  const { text, pages } = await read(buildPdf(state(pins), SENT, { front: fig }));
  assert.ok(pages >= 2, `${pages} pages`);
  for (let i = 1; i <= 60; i++) assert.match(text, new RegExp(`fake note ${i}\\b`), `pin ${i}`);
});

test('no pins still makes a valid PDF; a missing image leaves a note, not a crash', async () => {
  const { text } = await read(buildPdf(state([]), SENT, {}));
  assert.ok(text.includes(bodymap.text.marksEmpty), text);
});

test('the report: fixed keys, the pins numbered in order, no regions yet, and the whole record is in it (I-145)', () => {
  const r = buildReport(state([pin(1, { note: 'fake note' }), pin(2, { type: 'pain', star: true, intensity: 3 })]), SENT);
  assert.deepEqual(Object.keys(r).sort(), ['apptDate', 'figure', 'name', 'pins', 'sent', 'v']);
  assert.equal(r.v, 1);
  assert.equal(r.name, 'Test Client');
  assert.equal(r.apptDate, '2026-12-03');
  assert.equal(r.figure, 'female');
  assert.equal(r.sent, '2026-12-01T17:00:00.000Z');
  assert.deepEqual(r.pins.map((p) => p.n), [1, 2]);
  assert.deepEqual(Object.keys(r.pins[0]).sort(), ['intensity', 'n', 'note', 'region', 'star', 'type', 'view', 'x', 'y']);
  assert.equal(r.pins[0].region, null);
  assert.equal(r.pins[0].note, 'fake note');
  assert.equal(r.pins[1].star, true);
  assert.equal(r.pins[1].intensity, 3);
  assert.ok(JSON.stringify(r).length < bodymap.limits.reportBytes);
  assert.ok(!('id' in r), 'the send id stays out of the record');
});

test('toBase64 round-trips bytes, including a large buffer', () => {
  const bytes = new Uint8Array(200_000).map((_, i) => (i * 31) & 255);
  assert.deepEqual(new Uint8Array(Buffer.from(toBase64(bytes), 'base64')), bytes);
  assert.equal(toBase64(new Uint8Array([37, 80, 68, 70, 45])), 'JVBERi0=');
});

test('the fallback PDF colours equal the tokens in tokens.css (the page normally reads them live)', () => {
  const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  const raw = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))![1].trim();
  const hex = (name: string): string => {
    const v = raw(name);
    const ref = v.match(/^var\(--([\w-]+)\)$/);
    return ref ? hex(ref[1]) : v;
  };
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const same = (got: number[], token: string) => got.forEach((c, i) => assert.ok(Math.abs(c - rgb(hex(token))[i]) < 0.005, `${token}: ${got} vs ${hex(token)}`));
  for (const p of bodymap.pinTypes) same(DEFAULT_COLORS.pin[p.key], p.token);
  same(DEFAULT_COLORS.halo, 'pin-halo');
  same(DEFAULT_COLORS.edge, 'pin-edge');
  same(DEFAULT_COLORS.text, 'ink');
  same(DEFAULT_COLORS.rule, 'bodymap-figure');
});

test('bodymap-pdf.ts never imports the zone files (regions come from the lookup)', () => {
  const src = readFileSync(new URL('../src/lib/bodymap-pdf.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /bodymap-zones|zones\.geojson/);
  assert.doesNotMatch(readFileSync(new URL('../src/lib/pdf.ts', import.meta.url), 'utf8'), /bodymap-zones/);
});

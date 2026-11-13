// B0 (I-073, I-108): the body map contract data (ARCHITECTURE §B12). No page exists yet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { bodymap, artName, folderKey } from '../src/data/bodymap.ts';
import { site } from '../src/data/site.ts';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/** Follow `var(--x)` aliases in tokens.css to a hex value; null when the token is missing or not a colour. */
function resolve(name: string, depth = 0): string | null {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m || depth > 5) return null;
  const v = m[1].trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const alias = v.match(/^var\(--([\w-]+)\)$/);
  return alias ? resolve(alias[1], depth + 1) : null;
}

test('1. closed until B10; the endpoint is a web-app /exec URL (B2), never an editor address', () => {
  assert.equal(bodymap.open, false);
  assert.match(site.bodymapUrl, /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/);
  assert.notEqual(site.bodymapUrl, site.rsvpUrl, 'its own project, not the RSVP script');
});

test('2. figures, views and art names', () => {
  assert.deepEqual([...bodymap.figures], ['female', 'male']);
  assert.deepEqual([...bodymap.views], ['front', 'back']);
  assert.deepEqual([...bodymap.laterViews], ['left_side', 'right_side']);
  assert.equal(artName('female', 'front'), 'female_front');
  assert.equal(artName('male', 'back'), 'male_back');
});

test('3. five pin types, unique shapes, tokens resolve', () => {
  const keys = bodymap.pinTypes.map((p) => p.key);
  assert.deepEqual(keys, ['pain', 'discomfort', 'injury', 'numb', 'avoid']);
  assert.equal(new Set(bodymap.pinTypes.map((p) => p.shape)).size, 5);
  for (const p of bodymap.pinTypes) {
    assert.ok(resolve(p.token), `--${p.token} resolves to a hex value`);
    assert.ok(bodymap.text.types[p.key], `type ${p.key} has a label`);
  }
  for (const t of ['pin-halo', 'pin-edge', 'bodymap-figure']) assert.ok(resolve(t), `--${t} resolves`);
  assert.equal(resolve('bodymap-figure'), '#d3d7dc');
  assert.equal(bodymap.pinTypes.find((p) => p.key === 'avoid')?.starrable, false);
  assert.ok(bodymap.pinTypes.filter((p) => p.key !== 'avoid').every((p) => p.starrable));
});

test('4. limits', () => {
  assert.deepEqual({ ...bodymap.limits }, {
    stars: 3, pins: 60, noteChars: 140, nameChars: 80, expiryHours: 24, pdfBytes: 1_500_000, reportBytes: 64_000,
  });
});

test('5. regions: 28 front, 31 back, unique names, left/right twins', () => {
  assert.equal(bodymap.regions.front.length, 28);
  assert.equal(bodymap.regions.back.length, 31);
  for (const view of bodymap.views) {
    const list = bodymap.regions[view];
    const keys = list.map((r) => r.key);
    assert.equal(new Set(keys).size, keys.length, `${view} keys unique`);
    assert.equal(new Set(list.map((r) => r.name)).size, list.length, `${view} names unique`);
    for (const r of list) {
      assert.match(r.key, /^[a-z]+(-[a-z]+)*$/);
      assert.ok(r.name.trim(), `${r.key} has a name`);
      if (r.key.startsWith('left-')) assert.ok(keys.includes('right-' + r.key.slice(5)), `${r.key} has a right twin`);
      if (r.key.startsWith('right-')) assert.ok(keys.includes('left-' + r.key.slice(6)), `${r.key} has a left twin`);
    }
  }
});

test('6. every text is non-empty and has no licensure words', () => {
  const strings: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') strings.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(bodymap.text);
  walk(bodymap.regions);
  walk(bodymap.zones);
  assert.ok(strings.length > 60);
  for (const s of strings) {
    assert.ok(s.trim(), 'non-empty');
    assert.doesNotMatch(s, /massage therapist|\bLMT\b|licensed/i);
  }
});

test('7. folder matching: unsorted name, then a sequence of names against one folder', () => {
  assert.equal(bodymap.unsortedFolder, '_Unsorted_Intakes');
  const folder = folderKey('Alex_Example');
  assert.equal(folder, 'alex example');
  for (const typed of ['Alex Example', 'alex  EXAMPLE', ' Álex Example ', 'Alex_Example']) {
    assert.equal(folderKey(typed), folder, typed);
  }
  for (const typed of ['Alex Examples', 'Alex', 'Example Alex']) assert.notEqual(folderKey(typed), folder, typed);
  assert.equal(folderKey("O'Brien_Sam"), folderKey('obrien sam'));
  assert.equal(folderKey('   '), '');
});

test('8. check:contrast still passes with the new tokens', () => {
  const r = spawnSync(process.execPath, ['scripts/check-contrast.mjs'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

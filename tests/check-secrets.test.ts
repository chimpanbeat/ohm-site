// E13: the phone-number pattern in tools/check-secrets.mjs (check:secrets), run in a throwaway git repo.
// Real-looking numbers are built at run time, so this file itself never trips the scan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../tools/check-secrets.mjs', import.meta.url));
const n = (...parts: string[]) => parts.join('');

function scan(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'ohm-secrets-'));
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0, 'git init');
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  const r = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

test('check:secrets finds a phone number in each US format and in tel:/sms: links, and names only the line', () => {
  const formats = [
    n('719', '-', '867', '-', '5309'),
    n('(719)', ' ', '867', '-', '5309'),
    n('719', '.', '867', '.', '5309'),
    n('+1', ' ', '719', ' ', '867', ' ', '5309'),
    n('1-', '719', '-867', '-5309'),
    n('call ', '719', ' 867', ' 5309', ' today'),
  ];
  for (const f of formats) {
    const r = scan({ 'a.txt': `ok line\nphone: ${f}\n` });
    assert.equal(r.code, 1, `${f} is found`);
    assert.match(r.out, /a\.txt:2: phone number/);
    assert.ok(!r.out.includes(f) && !r.out.includes('5309'), 'the value is never printed');
  }
  for (const link of [n('tel:', '+1', '7198675309'), n('<a href="sms:', '7198675309', '">')]) {
    const r = scan({ 'b.html': link });
    assert.equal(r.code, 1, `${link} is found`);
    assert.match(r.out, /b\.html:1: phone number/);
  }
});

test('check:secrets skips the phone pattern for the body map art SVGs (path data), and nowhere else (B1)', () => {
  const path = `<path d="M ${n('719', ' 867', ' 5309')} C 20 30 40"/>\n`;
  const art = scan({ 'src/assets/bodymap/svg/female_front.svg': path });
  assert.equal(art.code, 0, art.out);
  const other = scan({ 'src/assets/other.svg': path, 'src/assets/bodymap/svg/note.txt': path });
  assert.equal(other.code, 1, 'only the art SVGs are exempt');
  const email = scan({ 'src/assets/bodymap/svg/female_front.svg': `<title>${n('a@real-', 'domain.com')}</title>\n` });
  assert.equal(email.code, 1, 'the other checks still run on the art');
});

// B2 (§B12 Privacy): the Script ID and the Drive folder ID never go in the repo. Every ID below is fake and built at
// run time, so this file itself never trips the scan.
const fakeId = n('1AbC', 'dEfGhIjKlMnOpQrStUvWxYz', '0123456789', '_-aBcDeFgHiJ');

test('check:secrets finds Drive folder URLs, script editor URLs, a scriptId key and .clasp.json files (B2)', () => {
  const cases: [string, string, RegExp][] = [
    ['notes.md', n('The folder: https://drive.google', '.com/drive/folders/', fakeId, '?usp=sharing'), /notes\.md:1: Drive folder URL/],
    ['notes.md', n('open https://drive.google', '.com/drive/u/0/folders/', fakeId), /notes\.md:1: Drive folder URL/],
    ['a.ts', n("const where = '/fold", "ers/", fakeId, "';"), /a\.ts:1: Drive folder URL/],
    ['notes.md', n('https://script.google', '.com/home/projects/', fakeId, '/edit'), /notes\.md:1: Apps Script editor URL/],
    ['notes.md', n('https://script.google', '.com/d/', fakeId, '/edit'), /notes\.md:1: Apps Script editor URL/],
    ['ids.json', n('{\n  "script', 'Id": "', fakeId, '"\n}'), /ids\.json:2: Script ID key/],
    ['src/x.ts', n('const ids = { "script', 'Id" : "x" };'), /src[\\/]x\.ts:1: Script ID key/],
  ];
  for (const [file, text, found] of cases) {
    const r = scan({ [file]: `${text}\n` });
    assert.equal(r.code, 1, `${file}: ${found}`);
    assert.match(r.out, found);
    assert.ok(!r.out.includes(fakeId), 'the value is never printed');
  }
  for (const name of ['.clasp.json', 'apps-script/bodymap/.clasp.json']) {
    const r = scan({ [name]: '{}\n' });
    assert.equal(r.code, 1, name);
    assert.match(r.out, /\.clasp\.json: clasp project file/);
  }
});

test('check:secrets exempts .apps-script-ids.example.json only while its values are placeholder sentences (B2)', () => {
  const key = n('"script', 'Id"');
  const example = (value: string) => `{\n  ${key}: "${value}",\n  "bodymap": { ${key}: "${value}" }\n}\n`;
  const sentences = scan({ '.apps-script-ids.example.json': example('Project Settings > IDs > Script ID (Ohm account)') });
  assert.equal(sentences.code, 0, sentences.out);
  const filled = scan({ '.apps-script-ids.example.json': example(fakeId) });
  assert.equal(filled.code, 1, 'a real-looking value in the example file is found');
  assert.match(filled.out, /\.apps-script-ids\.example\.json:2: Script ID key/);
  assert.match(filled.out, /\.apps-script-ids\.example\.json:3: Script ID key/);
  const elsewhere = scan({ 'docs/ids.json': example('Project Settings > IDs > Script ID (Ohm account)') });
  assert.equal(elsewhere.code, 1, 'only the example file is exempt');
  const real = spawnSync(process.execPath, [script], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
  assert.equal(real.status, 0, `the repo itself passes: ${real.stdout}${real.stderr}`);
});

test('check:secrets leaves the public web-app URL, the user-settings page and plain words alone (B2)', () => {
  const clean = scan({
    'site.ts': n("const url = 'https://script.google", ".com/macros/s/", fakeId, "/exec';\n"),
    'runbook.md': [
      n('Switch the API on at script.google', '.com/home/usersettings, signed in as Ohm.'),
      'The repo never holds the Script ID or a Drive folder URL. Folders are named First_Last.',
      'writeFileSync(`${dir}/.clasp.json`, JSON.stringify({ scriptId, rootDir }));',
      'See the folders/ directory and /folders/short.',
    ].join('\n'),
  });
  assert.equal(clean.code, 0, clean.out);
});

test('check:secrets allows the fictional 555-01xx range, the allow marker, and numbers that are not phones', () => {
  const clean = scan({
    'fake.ts': [
      "const SIG_PHONE = '719-555-0100';",
      "const other = '(719) 555-0199';",
      'href="tel:7195550123"',
    ].join('\n'),
    'allowed.ts': `const n = '${n('719', '-867-', '5309')}'; // secrets-scan: allow\n`,
    'numbers.txt': [
      '2026-11-22T14:00:00-07:00',
      'center: 38.89985450733466,-104.8154571',
      'd="M 12.5 340.25 L 100 200"',
      'id 1765b1d 9626e29 3368412',
      'limit 20, maxGuests 10, 1,500 recipients',
      'v1.2.3-719.867.5309x', // part of a longer token
    ].join('\n'),
  });
  assert.equal(clean.code, 0, clean.out);
  assert.match(clean.out, /0 findings/);
  const real = scan({ 'real.ts': `const SIG_PHONE = '${n('719-555-', '0200')}';\n` });
  assert.equal(real.code, 1, '555-0200 is outside the fictional range');
});

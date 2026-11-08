// E13: the phone-number pattern in tools/check-secrets.mjs (check:secrets), run in a throwaway git repo.
// Real-looking numbers are built at run time, so this file itself never trips the scan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../tools/check-secrets.mjs', import.meta.url));
const n = (...parts: string[]) => parts.join('');

function scan(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'ohm-secrets-'));
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0, 'git init');
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
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

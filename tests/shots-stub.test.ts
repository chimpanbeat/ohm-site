// MF3 (I-122): the screenshot tool's stub mode. Pure logic, no browser (CI has none).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STATES, parseShotsArgs, isScriptEndpoint, stubAction, shotName } from '../tools/shots-stub.mjs';
import { parseReply, parseStatus } from '../src/lib/rsvp.ts';

const EXEC = 'https://script.google.com/macros/s/AKfycbExample123/exec';

test('shots-stub 1. parseShotsArgs keeps the old options and reads --stub, --nojs, --route', () => {
  assert.deepEqual(parseShotsArgs([]), { step: '', dir: 'dist', sitePath: '', stub: null, nojs: false, route: null });
  const a = parseShotsArgs(['MF3', '--dir', 'out', '--base', '/ohm/', '--stub', 'busy', '--nojs', '--route', '/events/launch-party']);
  assert.deepEqual(a, { step: 'MF3', dir: 'out', sitePath: '/ohm', stub: 'busy', nojs: true, route: '/events/launch-party' });
});

test('shots-stub 2. an unknown stub state throws and lists the valid ones', () => {
  assert.throws(() => parseShotsArgs(['--stub', 'bogus']), (e: Error) => STATES.every((s) => e.message.includes(s)) && e.message.includes('bogus'));
  assert.throws(() => parseShotsArgs(['--stub']), /needs a state/);
});

test('shots-stub 3. the endpoint matcher takes the Apps Script exec URL, with or without a query, and nothing else', () => {
  assert.equal(isScriptEndpoint(EXEC), true);
  assert.equal(isScriptEndpoint(EXEC + '?slug=launch-party'), true);
  assert.equal(isScriptEndpoint('https://script.google.com/macros/s/x/dev'), false);
  assert.equal(isScriptEndpoint('https://example.com/macros/s/x/exec'), false);
  assert.equal(isScriptEndpoint('http://127.0.0.1:4321/macros/s/x/exec'), false);
  assert.equal(isScriptEndpoint('not a url'), false);
});

test('shots-stub 4. replies per state are what the RSVP client parses', () => {
  const post = (s: string) => stubAction(s, 'POST', EXEC);
  const body = (s: string) => (post(s) as { body: string }).body;
  assert.deepEqual(parseReply(body('ok')).ok, true);
  assert.deepEqual(parseReply(body('busy')), { ok: false, error: 'busy' });
  assert.deepEqual(parseReply(body('server')), { ok: false, error: 'server' });
  assert.deepEqual(parseReply(body('invalid')), { ok: false, error: 'invalid', fields: ['email'] });
  assert.deepEqual(parseReply(body('nonjson')), { ok: false, error: 'server' });
  assert.deepEqual(post('network'), { kind: 'abort' });
  assert.deepEqual(post('sending'), { kind: 'hold' });
  // a status read (GET) is answered the same way for every state but network
  const get = stubAction('ok', 'GET', EXEC + '?slug=x') as { body: string };
  assert.equal(parseStatus(get.body).ok, true);
  assert.deepEqual(stubAction('network', 'GET', EXEC + '?slug=x'), { kind: 'abort' });
});

test('shots-stub 5. any other script.google.com request is aborted, never passed through', () => {
  assert.deepEqual(stubAction('ok', 'GET', 'https://script.google.com/macros/s/x/dev'), { kind: 'abort' });
  assert.deepEqual(stubAction('ok', 'POST', 'https://script.google.com/other'), { kind: 'abort' });
  assert.deepEqual(stubAction('ok', 'GET', 'http://127.0.0.1:4321/'), { kind: 'continue' });
});

test('shots-stub 6. file names are <route>-<state>-<width> and -nojs, and repeat exactly', () => {
  assert.equal(shotName('/events/launch-party', null, 375, false), 'events-launch-party-375.png');
  assert.equal(shotName('/events/launch-party', 'busy', 375, false), 'events-launch-party-busy-375.png');
  assert.equal(shotName('/', 'ok', 1280, true), 'index-ok-nojs-1280.png');
  assert.equal(shotName('/book/', null, 1280, true), 'book-nojs-1280.png');
  assert.equal(shotName('/book/', 'ok', 1280, true), shotName('/book/', 'ok', 1280, true));
});

test('shots-stub 7. privacy: the stub never reads or logs a request body', () => {
  for (const f of ['../tools/shots-stub.mjs', '../tools/shots.mjs', '../tools/shots-scenarios.mjs']) {
    const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
    assert.doesNotMatch(src, /postData/, f);
  }
});

test('shots-stub 8. shots.mjs wires the options', () => {
  const src = readFileSync(fileURLToPath(new URL('../tools/shots.mjs', import.meta.url)), 'utf8');
  assert.match(src, /parseShotsArgs/);
  assert.match(src, /javaScriptEnabled/);
  assert.match(src, /\.route\(/);
});

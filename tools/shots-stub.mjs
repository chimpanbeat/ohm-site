// Pure logic for `npm run shots` stub mode (I-122): arguments, the Apps Script endpoint matcher, fixture replies, file names.
// No browser here, so tests/shots-stub.test.ts runs in CI. Never reads or logs a request body.

/** Stub states: what the Apps Script endpoint answers. `sending` holds the request until the capture is done. */
export const STATES = ['ok', 'busy', 'invalid', 'server', 'network', 'nonjson', 'sending'];

export function parseShotsArgs(argv) {
  const out = { step: '', dir: 'dist', sitePath: '', stub: null, nojs: false, route: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') out.dir = argv[++i] || out.dir;
    else if (a === '--base') out.sitePath = (argv[++i] || '').replace(/\/+$/, '');
    else if (a === '--nojs') out.nojs = true;
    else if (a === '--route') out.route = argv[++i] || null;
    else if (a === '--stub') {
      const s = argv[++i];
      if (!s || s.startsWith('--')) throw new Error(`--stub needs a state: ${STATES.join(', ')}`);
      if (!STATES.includes(s)) throw new Error(`unknown stub state "${s}"; valid: ${STATES.join(', ')}`);
      out.stub = s;
    } else rest.push(a);
  }
  out.step = rest[0] || '';
  return out;
}

/** The Apps Script web app: https://script.google.com/macros/s/<id>/exec, with or without a query. */
export function isScriptEndpoint(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'script.google.com' && /^\/macros\/s\/[^/]+\/exec$/.test(u.pathname);
  } catch {
    return false;
  }
}

const json = (o) => ({ kind: 'fulfill', status: 200, contentType: 'application/json', body: JSON.stringify(o) });
const POST_BODIES = {
  ok: () => json({ ok: true, status: 'going', outcomes: ['confirmed'], pending: false }),
  busy: () => json({ ok: false, error: 'busy' }),
  server: () => json({ ok: false, error: 'server' }),
  invalid: () => json({ ok: false, error: 'invalid', fields: ['email'] }),
  nonjson: () => ({ kind: 'fulfill', status: 200, contentType: 'text/html', body: '<html><body>Error</body></html>' }),
};

/** What to do with one request. `abort` also covers every other script.google.com URL, so nothing real is ever called. */
export function stubAction(state, method, url) {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return { kind: 'continue' };
  }
  if (host !== 'script.google.com') return { kind: 'continue' };
  if (!isScriptEndpoint(url) || state === 'network') return { kind: 'abort' };
  if (method === 'GET') return json({ ok: true, open: true, session: null, tips: [] });
  if (state === 'sending') return { kind: 'hold' };
  return POST_BODIES[state]();
}

export function shotName(route, state, width, nojs) {
  const slug = route.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'index';
  return `${slug}${state ? '-' + state : ''}${nojs ? '-nojs' : ''}-${width}.png`;
}

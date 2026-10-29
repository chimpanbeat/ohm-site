#!/usr/bin/env node
// Token use of this repo's Claude Code sessions, from the local transcripts. Read-only, Node 22, no dependencies.
// Usage: node tools/method-metrics.mjs [repo-dir]   (default: the current directory)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const FIELDS = ['input_tokens', 'output_tokens', 'cache_read_input_tokens'];
const repo = resolve(process.argv[2] || process.cwd());
// Claude Code names a project's folder after its path, every non-alphanumeric character replaced by "-".
const folder = repo.replace(/[^a-zA-Z0-9]/g, '-');
const root = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects', folder);

if (!existsSync(root)) {
  console.log(`no transcripts found: ${root} does not exist`);
  process.exit(0);
}

const sessions = readdirSync(root).filter((f) => f.endsWith('.jsonl')).sort();
if (!sessions.length) {
  console.log(`no transcripts found: no .jsonl files in ${root}`);
  process.exit(0);
}

const found = new Set(); // every key seen on assistant usage objects, for the failure report
let assistantLines = 0;
let withUsage = 0;

// Transcript files for one session: the main file plus any subagent files under <sessionId>/subagents/.
function filesFor(name) {
  const id = name.replace(/\.jsonl$/, '');
  const files = [join(root, name)];
  const sub = join(root, id, 'subagents');
  if (existsSync(sub)) for (const f of readdirSync(sub).sort()) if (f.endsWith('.jsonl')) files.push(join(sub, f));
  return files;
}

const out = [];
for (const name of sessions) {
  const seen = new Set(); // a streamed reply repeats under one message id: count it once
  const s = { session: name.replace(/\.jsonl$/, ''), input: 0, output: 0, cacheRead: 0, messages: 0, first: null, last: null };
  for (const file of filesFor(name)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (o.timestamp) {
        if (!s.first || o.timestamp < s.first) s.first = o.timestamp;
        if (!s.last || o.timestamp > s.last) s.last = o.timestamp;
      }
      if (o.type !== 'assistant' || !o.message) continue;
      assistantLines++;
      const u = o.message.usage;
      if (!u || typeof u !== 'object') continue;
      Object.keys(u).forEach((k) => found.add(k));
      if (!FIELDS.every((k) => typeof u[k] === 'number')) continue;
      withUsage++;
      const key = o.message.id || o.requestId || o.uuid;
      if (seen.has(key)) continue;
      seen.add(key);
      s.input += u.input_tokens;
      s.output += u.output_tokens;
      s.cacheRead += u.cache_read_input_tokens;
      s.messages++;
    }
  }
  out.push(s);
}

if (assistantLines > 0 && withUsage === 0) {
  console.error(`transcripts in ${root} do not have the expected fields (assistant lines: message.usage.{${FIELDS.join(', ')}}).`);
  console.error(`assistant lines: ${assistantLines}; message.usage keys found: ${[...found].join(', ') || '(none)'}`);
  process.exit(1);
}

const total = out.reduce((t, s) => ({ input: t.input + s.input, output: t.output + s.output, cacheRead: t.cacheRead + s.cacheRead }), { input: 0, output: 0, cacheRead: 0 });
console.log(JSON.stringify({ repo, folder: root, sessionCount: out.length, total, sessions: out }, null, 2));
console.log(`${out.length} sessions · input ${total.input} · output ${total.output} · cache-read ${total.cacheRead} tokens`);

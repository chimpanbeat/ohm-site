#!/usr/bin/env node
// Secrets scan (check:secrets): credential files, keys, tokens, real email addresses and (E13) phone numbers in tracked files and in
// untracked files that aren't gitignored. Prints file:line and the kind of finding, never the value.
// A line containing "secrets-scan: allow" is skipped (e.g. a public business contact address); the reviewer sees it.
// Usage: node tools/check-secrets.mjs   (run from the repo root; exit 1 on any finding)
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
if (git.status !== 0) {
  console.error(`check-secrets: git ls-files failed: ${git.stderr.trim()}`);
  process.exit(1);
}
const files = [...new Set(git.stdout.split('\0').filter(Boolean))];

const badNames = [
  [/^\.env(\..+)?$/, 'env file'],
  [/^\.clasprc\.json$/, 'clasp credentials'],
  [/^\.clasp\.json$/, 'clasp project file'], // B2: it holds a Script ID; the push script writes it only in the gitignored staging folder
  [/\.(pem|key|p12|pfx)$/, 'key or certificate file'],
  [/^id_(rsa|dsa|ecdsa|ed25519)/, 'SSH key'],
  [/^credentials\.json$/, 'credentials file'],
];
const patterns = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\bya29\.[0-9A-Za-z_-]{20,}/, 'Google OAuth token'],
  [/\b(ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36}\b|\bgithub_pat_[0-9A-Za-z_]{22,}/, 'GitHub token'],
  [/\bxox[abposr]-[0-9A-Za-z-]{10,}/, 'Slack token'],
  [/\b(sk|rk)_live_[0-9A-Za-z]{16,}/, 'Stripe live key'],
  [/\bsk-ant-[0-9A-Za-z_-]{20,}/, 'Anthropic API key'],
  // B2 (ARCHITECTURE §B12 Privacy): where the client folders and the filing script live stays out of the repo.
  // The public web-app address (…/macros/s/<deployment>/exec) is not an editor address and is allowed.
  [/drive\.google\.com\/[^\s"'<>)]*folders\/|\/folders\/[A-Za-z0-9_-]{20,}/, 'Drive folder URL'],
  [/script\.google\.com\/(home\/projects|d)\//, 'Apps Script editor URL'],
];
// B2: a "scriptId" key with a value, in any file. The example IDs file is exempt only while each such value is a
// placeholder sentence (it has a space; a real Script ID has none).
const scriptIdKey = /"scriptId"\s*:\s*("[^"]*")?/g;
const idsExample = '.apps-script-ids.example.json';
const email = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g;
const fakeDomain = /(^|\.)(example\.(com|org|net)|test|example|invalid|localhost|users\.noreply\.github\.com)$/i;
// E13: phone numbers. Brian's and the event host's are Script Properties of the RSVP script, never in the repo (the site
// shows no phone, Brian, Oct 6 2026). US numbers with separators (719-555-0100, (719) 555-0100, 719.555.0100,
// +1 719 555 0100) and tel:/sms: links with digits. The fictional 555-0100 to 555-0199 range is allowed: tests use it.
const phone = /(?<![\w.+-])(?:\+?1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]\d{4}(?![\w-])/g;
const phoneLink = /\b(?:tel|sms):\+?[\d().\s-]{7,}/gi;
const fakePhone = (s) => /55501\d\d$/.test(s.replace(/\D/g, ''));

const findings = [];
let scanned = 0;
for (const file of files) {
  const name = basename(file);
  if (name !== '.env.example') {
    for (const [re, kind] of badNames) if (re.test(name)) findings.push(`${file}: ${kind}`);
  }
  let buf;
  try {
    if (statSync(file).size > 5_000_000) continue;
    buf = readFileSync(file);
  } catch {
    continue; // deleted from the working tree but still in the index
  }
  if (buf.subarray(0, 8192).includes(0)) continue; // binary
  scanned++;
  // B1: the body map art's SVG path data is long runs of numbers that read as phone numbers. Only those files skip the phone pattern.
  const artSvg = /^src\/assets\/bodymap\/svg\/[\w-]+\.svg$/.test(file.replace(/\\/g, '/'));
  buf.toString('utf8').split('\n').forEach((line, i) => {
    if (line.includes('secrets-scan: allow')) return;
    for (const [re, kind] of patterns) if (re.test(line)) findings.push(`${file}:${i + 1}: ${kind}`);
    for (const m of line.matchAll(scriptIdKey)) {
      const placeholder = file === idsExample && /\s/.test(m[1] ?? '');
      if (!placeholder) findings.push(`${file}:${i + 1}: Script ID key`);
    }
    for (const m of line.matchAll(email)) {
      if (!fakeDomain.test(m[0].split('@')[1])) findings.push(`${file}:${i + 1}: email address`);
    }
    for (const re of artSvg ? [] : [phone, phoneLink]) {
      for (const m of line.matchAll(re)) if (!fakePhone(m[0])) findings.push(`${file}:${i + 1}: phone number`);
    }
  });
}

if (findings.length) {
  findings.forEach((f) => console.error(`check-secrets: ${f}`));
  console.error(`check-secrets: ${findings.length} finding(s) in ${scanned} files. Remove them, or mark a deliberate public address with "secrets-scan: allow".`);
  process.exit(1);
}
console.log(`check-secrets: ok (${scanned} files, 0 findings)`);

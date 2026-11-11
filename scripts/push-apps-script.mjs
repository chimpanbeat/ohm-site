// Push one Apps Script project from this repo and move its existing deployment to the new version (I-107, B2).
// Usage: npm run push:script -- "what changed"                     the RSVP script (the default target)
//        npm run push:script -- --target bodymap "what changed"    the body map filing script
//        add --dry to only stage the files
// Needs `clasp login` as the Ohm account and .apps-script-ids.json (gitignored; see the .example file).
// Each run stages only its own target's two files in a fresh folder, so neither project can receive the other's (I-109).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const TARGETS = {
  rsvp: { code: 'apps-script/rsvp.js', manifest: 'apps-script/appsscript.json' },
  bodymap: { code: 'apps-script/bodymap/bodymap.js', manifest: 'apps-script/bodymap/appsscript.json' },
};

const fail = (m) => { console.error(m); process.exit(1); };
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const at = args.indexOf('--target');
const target = at < 0 ? 'rsvp' : args[at + 1];
if (!Object.hasOwn(TARGETS, target ?? '')) fail(`--target must be one of: ${Object.keys(TARGETS).join(', ')}.`);
const message = args.filter((a, i) => a !== '--dry' && i !== at && (at < 0 || i !== at + 1)).join(' ') || 'push from ohm-site';

if (!existsSync('.apps-script-ids.json')) fail('Missing .apps-script-ids.json. Copy .apps-script-ids.example.json and fill in the IDs.');
const all = JSON.parse(readFileSync('.apps-script-ids.json', 'utf8'));
// The RSVP IDs sit at the top level (as E16 left them); every other target has its own entry.
const ids = target === 'rsvp' ? all : all[target];
if (!ids || typeof ids !== 'object') fail(`.apps-script-ids.json has no "${target}" entry. See .apps-script-ids.example.json.`);
const scriptId = ids.scriptId ?? '';
const deploymentId = ids.deploymentId ?? '';
if (target === 'rsvp') {
  if (!scriptId || !deploymentId || /\s/.test(scriptId + deploymentId)) fail('.apps-script-ids.json needs a real scriptId and deploymentId.');
} else if (!scriptId || /\s/.test(scriptId + deploymentId)) {
  // A new project has no deployment until its first web-app deployment is made in the editor.
  fail(`.apps-script-ids.json needs a real ${target}.scriptId (and ${target}.deploymentId once the web app is deployed; leave it empty until then).`);
}

// The live project's file is Code.js, so stage the script under that name (pushing its own name would add a second file).
const dir = '.apps-script-build';
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir);
copyFileSync(TARGETS[target].code, `${dir}/Code.js`);
copyFileSync(TARGETS[target].manifest, `${dir}/appsscript.json`);
writeFileSync(`${dir}/.clasp.json`, JSON.stringify({ scriptId, rootDir: '.' }));
console.log(target === 'rsvp' ? `Staged ${dir}/Code.js and appsscript.json` : `Staged ${dir}/Code.js and appsscript.json (${target})`);
if (dry) process.exit(0);

const clasp = (...args) => {
  const win = process.platform === 'win32';
  const argv = win ? args.map((a) => (/\s/.test(a) ? '"' + a.replace(/"/g, '') + '"' : a)) : args; // cmd.exe splits on spaces
  const r = spawnSync('clasp', argv, { cwd: dir, encoding: 'utf8', shell: process.platform === 'win32' });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.status !== 0) fail(`clasp ${args[0]} failed:\n${out}`);
  return out;
};

const who = clasp('show-authorized-user');
if (!/@ohmprecisionbodywork\.com/.test(who)) fail(`clasp is not logged in as the Ohm account:\n${who}\nRun: clasp logout, then clasp login.`);

console.log(clasp('push', '--force').trim());
if (!deploymentId) {
  console.log(`Pushed. No deployment yet: follow docs/runbooks/${target}.md (run setup(), then Deploy > New deployment > Web app), then put its ID in .apps-script-ids.json as ${target}.deploymentId.`);
  process.exit(0);
}
const made = clasp('create-version', message);
const version = made.match(/version\s+(\d+)/i)?.[1];
if (!version) fail(`Could not read the new version number from:\n${made}`);
clasp('update-deployment', deploymentId, '-V', version, '-d', message);

const listed = clasp('list-deployments');
const line = listed.split('\n').find((l) => l.includes(deploymentId)) || '';
if (!new RegExp(`@${version}(?!\\d)`).test(line)) fail(`Deployment is not on version ${version}:\n${listed}`);
console.log(`Done: deployment ${deploymentId.slice(0, 10)}… is now on version ${version}. The /exec URL is unchanged.`);

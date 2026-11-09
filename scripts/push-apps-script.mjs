// Push apps-script/rsvp.js to the live RSVP project and move the existing deployment to it (I-107).
// Usage: npm run push:script -- "what changed"        (add --dry to only stage the files)
// Needs `clasp login` as the Ohm account and .apps-script-ids.json (gitignored; see the .example file).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const dry = process.argv.includes('--dry');
const message = process.argv.slice(2).filter((a) => a !== '--dry').join(' ') || 'push from ohm-site';
const fail = (m) => { console.error(m); process.exit(1); };

if (!existsSync('.apps-script-ids.json')) fail('Missing .apps-script-ids.json. Copy .apps-script-ids.example.json and fill in the two IDs.');
const { scriptId, deploymentId } = JSON.parse(readFileSync('.apps-script-ids.json', 'utf8'));
if (!scriptId || !deploymentId || /\s/.test(scriptId + deploymentId)) fail('.apps-script-ids.json needs a real scriptId and deploymentId.');

// The live project's file is Code.js, so stage rsvp.js under that name (pushing rsvp.js would add a second file).
const dir = '.apps-script-build';
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir);
copyFileSync('apps-script/rsvp.js', `${dir}/Code.js`);
copyFileSync('apps-script/appsscript.json', `${dir}/appsscript.json`);
writeFileSync(`${dir}/.clasp.json`, JSON.stringify({ scriptId, rootDir: '.' }));
console.log(`Staged ${dir}/Code.js and appsscript.json`);
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
const made = clasp('create-version', message);
const version = made.match(/version\s+(\d+)/i)?.[1];
if (!version) fail(`Could not read the new version number from:\n${made}`);
clasp('update-deployment', deploymentId, '-V', version, '-d', message);

const listed = clasp('list-deployments');
const line = listed.split('\n').find((l) => l.includes(deploymentId)) || '';
if (!new RegExp(`@${version}(?!\\d)`).test(line)) fail(`Deployment is not on version ${version}:\n${listed}`);
console.log(`Done: deployment ${deploymentId.slice(0, 10)}… is now on version ${version}. The /exec URL is unchanged.`);

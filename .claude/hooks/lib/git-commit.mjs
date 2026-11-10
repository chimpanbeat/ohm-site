// Finds the real `git commit` commands in a Bash tool call (I-117).
// commitCommands(cmd) returns the text of each command segment that commits, or [] when none does.
//
// What counts: a command whose first word is git (after VAR=x and env/command/exec prefixes, and git's
// own -c/-C/--git-dir options) and whose subcommand is `commit`. Heredoc bodies and quoted text are not
// commands. Fail closed: a segment run by bash/sh/zsh/dash/ksh/eval, or any word holding $( or a backtick,
// counts as a commit when it contains `git` and `commit` as words anywhere; so does a command line whose
// quotes do not balance.

const SEPARATORS = ['&&', '||', ';', '|', '&', '(', ')', '`', '\r'];
const PREFIXES = new Set(['env', 'command', 'exec', 'time', 'nohup', 'sudo', 'builtin']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'eval']);
const GIT_OPTIONS_WITH_VALUE = new Set(['-c', '-C', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
const LOOSE = /\bgit\b[\s\S]*\bcommit\b/;

function parse(cmd) {
  const segs = [];
  const heredocs = [];
  let words = [];
  let cur = '';
  let hasCur = false;
  let raw = '';
  let i = 0;
  const endWord = () => { if (hasCur) words.push(cur); cur = ''; hasCur = false; };
  const endSeg = () => {
    endWord();
    if (words.length) segs.push({ words, raw: raw.trim() });
    words = []; raw = '';
  };
  while (i < cmd.length) {
    const c = cmd[i];
    if (c === "'") {
      const end = cmd.indexOf("'", i + 1);
      if (end < 0) return { ok: false, segs };
      cur += cmd.slice(i + 1, end); hasCur = true; raw += cmd.slice(i, end + 1); i = end + 1;
    } else if (c === '"') {
      let j = i + 1;
      let depth = 0;
      while (j < cmd.length) {
        const ch = cmd[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '$' && cmd[j + 1] === '(') { depth++; j += 2; continue; }
        if (depth > 0 && ch === ')') { depth--; j++; continue; }
        if (ch === '"' && depth === 0) break;
        j++;
      }
      if (j >= cmd.length) return { ok: false, segs };
      cur += cmd.slice(i + 1, j); hasCur = true; raw += cmd.slice(i, j + 1); i = j + 1;
    } else if (c === '\\') {
      if (cmd[i + 1] !== '\n') { cur += cmd[i + 1] ?? ''; hasCur = true; raw += c + (cmd[i + 1] ?? ''); }
      i += 2;
    } else if (c === '\n') {
      endSeg(); i++;
      for (const delim of heredocs.splice(0)) {
        while (i < cmd.length) {
          let eol = cmd.indexOf('\n', i);
          if (eol < 0) eol = cmd.length;
          const line = cmd.slice(i, eol).trim();
          i = eol + 1;
          if (line === delim) break;
        }
      }
    } else if (c === '<' && cmd[i + 1] === '<' && cmd[i + 2] !== '<') {
      let j = i + 2;
      if (cmd[j] === '-') j++;
      while (cmd[j] === ' ' || cmd[j] === '\t') j++;
      let delim = '';
      if (cmd[j] === "'" || cmd[j] === '"') {
        const end = cmd.indexOf(cmd[j], j + 1);
        if (end < 0) return { ok: false, segs };
        delim = cmd.slice(j + 1, end); j = end + 1;
      } else {
        while (j < cmd.length && !/[\s;&|<>()]/.test(cmd[j])) delim += cmd[j++];
      }
      if (delim) heredocs.push(delim);
      endWord();
      i = j;
    } else if (c === ' ' || c === '\t') {
      endWord(); raw += c; i++;
    } else {
      const sep = SEPARATORS.find((s) => cmd.startsWith(s, i));
      if (sep) { endSeg(); i += sep.length; } else { cur += c; hasCur = true; raw += c; i++; }
    }
  }
  endSeg();
  return { ok: true, segs };
}

function isGitCommit(args) {
  let j = 0;
  while (j < args.length && args[j].startsWith('-')) j += GIT_OPTIONS_WITH_VALUE.has(args[j]) ? 2 : 1;
  return args[j] === 'commit';
}

export function commitCommands(cmd) {
  if (typeof cmd !== 'string' || !cmd.trim()) return [];
  const { ok, segs } = parse(cmd);
  if (!ok) return LOOSE.test(cmd) ? [cmd] : [];
  const found = [];
  for (const { words, raw } of segs) {
    let k = 0;
    while (k < words.length && (/^[A-Za-z_]\w*=/.test(words[k]) || PREFIXES.has(words[k]))) k++;
    const name = (words[k] ?? '').split(/[\\/]/).pop().replace(/\.exe$/i, '');
    const rest = words.slice(k + 1);
    if (name === 'git' && isGitCommit(rest)) found.push(raw);
    else if (SHELLS.has(name) && rest.some((w) => LOOSE.test(w))) found.push(raw);
    else if (words.some((w) => /\$\(|`/.test(w) && LOOSE.test(w))) found.push(raw);
  }
  return found;
}

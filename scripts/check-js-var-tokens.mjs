// CC-CMD-2026-08-09-ufl-epa-inline-token, done condition.
//
// The UFL EPA bug lived in a blind spot no CSSOM sweep can reach: a var()
// reference inside a JS string, which only becomes a style when that code
// path renders. token_resolution_probe.js can only report the SIZE of that
// blind spot; it cannot look inside it.
//
// This closes the class, not the instance. It scans src/legacy/field.js for
// every var(--x) reference and checks --x resolves -- either defined in
// index.html's :root, or set at runtime via setProperty/inline custom
// property, which is a legitimate override hook rather than a phantom.
//
// Two buckets, never merged, for the same reason the CSS probe splits them:
//   no fallback   -> the declaration is INVALID and silently dropped. Fatal.
//   with fallback -> renders the fallback forever. Silent, reported, not fatal.

import { readFileSync } from 'node:fs';

const raw = readFileSync('src/legacy/field.js', 'utf8');

// Blank out comments before scanning, preserving offsets so reported line
// numbers stay true. The first version skipped this and reported two "fatal"
// references that were both PROSE -- one a pre-existing comment mentioning
// var(--sport-*), one a comment I had written minutes earlier describing this
// very bug. A checker that flags its own documentation is noise, and noise is
// what gets a check switched off.
//
// A state machine, not a regex: `//` appears inside URLs and inside template
// literals throughout this file, and a naive strip would delete live code.
function stripComments(src) {
  const out = src.split('');
  let i = 0, state = 'code', quote = '';
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '*') { state = 'block'; out[i] = out[i + 1] = ' '; i += 2; continue; }
      if (c === '/' && d === '/') { state = 'line'; out[i] = out[i + 1] = ' '; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') { state = 'str'; quote = c; }
    } else if (state === 'str') {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) state = 'code';
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; i++; continue; }
      out[i] = ' ';
    } else if (state === 'block') {
      if (c === '*' && d === '/') { out[i] = out[i + 1] = ' '; state = 'code'; i += 2; continue; }
      if (c !== '\n') out[i] = ' ';
    }
    i++;
  }
  return out.join('');
}

const js = stripComments(raw);
const html = readFileSync('index.html', 'utf8');

const defined = new Set([...html.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
// Runtime-set hooks: --x set via setProperty or written as a custom property
// anywhere in the JS. Not phantoms -- the value arrives at runtime.
const runtimeSet = new Set([
  ...[...js.matchAll(/setProperty\(\s*['"`](--[\w-]+)['"`]/g)].map((m) => m[1]),
  ...[...js.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
]);

// The state machine above cannot fully tokenise JS: telling a regex literal
// from division needs a real parser, and a regex containing a quote flips it
// into string state until the next matching quote. Observed: a comment at
// field.js:1258 survived stripping while one at 6509 did not.
//
// Writing a JS lexer is the wrong tool here, so this guard backstops it: a
// match whose RAW line begins with // or * is prose. It is deterministic, and
// it can only ever suppress a comment line -- a real declaration never starts
// its line with a comment marker -- so it removes noise without hiding a bug.
const rawLines = raw.split('\n');
const isProseLine = (n) => /^\s*(\/\/|\*|\/\*)/.test(rawLines[n - 1] || '');

const fatal = [];
const silent = [];
for (const m of js.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
  const [, token, hasFallback] = m;
  if (defined.has(token) || runtimeSet.has(token)) continue;
  const line = js.slice(0, m.index).split('\n').length;
  if (isProseLine(line)) continue;
  // Snippet from the RAW source so the report shows real code, not blanks.
  const snippet = raw.split('\n')[line - 1].trim().slice(0, 100);
  (hasFallback ? silent : fatal).push({ token, line, snippet });
}

console.log(`js var() references scanned in src/legacy/field.js`);
console.log(`  UNRESOLVABLE, no fallback (fatal): ${fatal.length}`);
for (const f of fatal) console.log(`    field.js:${f.line}  ${f.token}  ${f.snippet}`);
console.log(`  unresolvable, with fallback (silent): ${silent.length}`);
for (const s of silent) console.log(`    field.js:${s.line}  ${s.token}  ${s.snippet}`);

process.exit(fatal.length === 0 ? 0 : 1);

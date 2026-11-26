#!/usr/bin/env node
// Rule 90 (MUTATE-FIRST-A) for docs/CC-CMD-2026-11-26-night-owl-sport-label-predicates.md: smoke A748, smoke A749 and the isNonSoccerFootballLabel unit tests are each shown red under
// a deliberate break before they are trusted. Every mutation puts one piece of the fix back to the defect, in a COPY: of index.html (read by smoke.js through argv) or of
// field_utils.js (run through a copy of field_unit.js in a temp dir). The repository's own files are never written.
//
// A mutation counts as CAUGHT only when (a) the run exits non-zero AND (b) a failing line (`❌`) names the clause the mutation breaks (`expect`). An anchor that does not
// occur exactly once in its file applies NOTHING and fails the harness by name; a mutant identical to its source is refused; a crash with no `❌` line is a harness error,
// not a catch. The CONTROL (unmutated copies) must pass both runs first. Rule 91: the result line states how many mutants of how many assertions were reached.
//
//   node scripts/mutate-night-owl-sport-label-predicates.mjs      (from the repository root, after `node scripts/sync-source.mjs`)
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HTML = readFileSync('index.html', 'utf8');
const UTILS = readFileSync('field_utils.js', 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'owl-label-predicates-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

const run = (cmd, args, opts = {}) => {
  let out = '', code = 0;
  try { out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000, maxBuffer: 1 << 28, ...opts }); }
  catch (e) { code = e.status ?? 1; out = (e.stdout || '') + (e.stderr || ''); }
  return { code, out };
};
const runSmoke = (htmlText) => { const f = join(dir, 'mutant.html'); writeFileSync(f, htmlText); return run('node', ['smoke.js', f]); };
const runUnit = (utilsText) => {
  writeFileSync(join(dir, 'field_utils.js'), utilsText);
  copyFileSync('field_unit.js', join(dir, 'field_unit.js'));
  return run('node', ['field_unit.js'], { cwd: dir });
};
const occurrences = (text, s) => text.split(s).length - 1;

// the exact strings, as they stand in the source
const TERMS_COLLEGE = " || /\\b(college|ncaa) football\\b|\\bcfb\\b/.test(_sp)";
const UNIT_EXCL = '!isNonSoccerFootballLabel(_sp) && _sp.includes(\'football\')';
const VOICE_EXCL = "(sp.includes('football') && !isNonSoccerFootballLabel(sp))";
const HELPER_RE = "return /\\bfootball\\b/.test(s) && /\\b(college|ncaa|american|canadian|australian)\\b/.test(s);";

const MUTANTS = [
  // ---- smoke A748, on index.html ---------------------------------------------------------------------------------------------------------------------------------------
  { name: "_terms: College Football no longer joins the American football line", target: 'html', anchor: TERMS_COLLEGE, replacement: '', expect: 'A748' },
  { name: "_terms: only 'college football' (NCAA Football and CFB fall back to soccer)", target: 'html', anchor: TERMS_COLLEGE, replacement: " || _sp.includes('college football')", expect: 'A748' },
  { name: 'margin unit: the bare football test takes College Football again', target: 'html', anchor: UNIT_EXCL, replacement: "_sp.includes('football')", expect: 'A748' },
  { name: 'voice: the soccer clause takes College and Australian Football again', target: 'html', anchor: VOICE_EXCL, replacement: "sp.includes('football')", expect: 'A748' },
  { name: 'inline helper drops australian (copy no longer identical, and AFL falls to soccer voice)', target: 'html', anchor: HELPER_RE, replacement: HELPER_RE.replace('|australian', ''), expect: 'A748' },
  { name: 'inline helper drops the football-word requirement', target: 'html', anchor: HELPER_RE, replacement: "return /\\b(college|ncaa|american|canadian|australian)\\b/.test(s);", expect: 'A748' },
  { name: 'inline helper is never true', target: 'html', anchor: HELPER_RE, replacement: 'return false;', expect: 'A748' },
  { name: 'voice: AFL clause loses its label (Australian Football gets no voice)', target: 'html', anchor: "if (sp.includes('afl') || sp.includes('australian')) return 'Australian Rules Football", replacement: "if (sp.includes('afl-x') || sp.includes('australian-x')) return 'Australian Rules Football", expect: 'A748' },
  // ---- smoke A749, on index.html ---------------------------------------------------------------------------------------------------------------------------------------
  { name: 'getQualityTarget: soccer back ahead of the other football codes', target: 'html', anchor: "      nfl:        ['nfl','american football'],\n      cfb:", replacement: "      soccer:     ['epl','mls','ucl','soccer','liga','football','bundesliga','serie','ligue','efl','fa cup','wc26','world cup'],\n      nfl:        ['nfl','american football'],\n      cfb:", also: { anchor: "      soccer:     ['epl','mls','ucl','soccer','liga','football','bundesliga','serie','ligue','efl','fa cup','wc26','world cup'],\n    };", replacement: "    };" }, expect: 'A749' },
  { name: 'getQualityTarget: the cfb key is gone (College Football is soccer again)', target: 'html', anchor: "      cfb:        ['college football','ncaa football','cfb'],\n", replacement: '', expect: 'A749' },
  { name: "getQualityTarget: NFL is called 'soccer' in the coaching text again", target: 'html', anchor: "basketball: 'NBA/WNBA', nfl: 'NFL', ", replacement: "basketball: 'NBA/WNBA', ", expect: 'A749' },
  { name: 'getQualityTarget: AFL is called CFL', target: 'html', anchor: "afl: 'AFL', ", replacement: "afl: 'CFL', ", expect: 'A749' },
  { name: 'getQualityTarget: college football is called NFL', target: 'html', anchor: "cfb: 'college football', ", replacement: "cfb: 'NFL', ", expect: 'A749' },
  { name: 'getQualityTarget: tennis is called soccer again', target: 'html', anchor: ", tennis: 'tennis' }", replacement: ' }', expect: 'A749' },
  // ---- unit tests, on field_utils.js ------------------------------------------------------------------------------------------------------------------------------------
  { name: 'unit: the helper drops australian', target: 'utils', anchor: HELPER_RE, replacement: HELPER_RE.replace('|australian', ''), expect: 'isNonSoccerFootballLabel' },
  { name: 'unit: the helper drops the football-word requirement', target: 'utils', anchor: HELPER_RE, replacement: "return /\\b(college|ncaa|american|canadian|australian)\\b/.test(s);", expect: 'isNonSoccerFootballLabel' },
  { name: 'unit: the helper is case-sensitive', target: 'utils', anchor: "const s = sport.toLowerCase();\n  return /\\bfootball", replacement: "const s = sport;\n  return /\\bfootball", expect: 'isNonSoccerFootballLabel' },
  { name: 'unit: a non-string label throws', target: 'utils', anchor: "if(typeof sport !== 'string') return false;\n  const s = sport.toLowerCase();\n  return /\\bfootball", replacement: "const s = sport.toLowerCase();\n  return /\\bfootball", expect: 'isNonSoccerFootballLabel' },
  { name: 'unit: the helper is true for every label', target: 'utils', anchor: HELPER_RE, replacement: 'return true;', expect: 'isNonSoccerFootballLabel' },
];

// ---- control ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const c1 = runSmoke(HTML), c2 = runUnit(UTILS);
if (c1.code !== 0 || !/A748/.test(c1.out) || !/A749/.test(c1.out) || /❌/.test(c1.out)) { console.log('CONTROL FAILED (smoke):\n' + c1.out.split('\n').filter((l) => /❌|Results/.test(l)).join('\n')); process.exit(2); }
if (c2.code !== 0 || /❌/.test(c2.out)) { console.log('CONTROL FAILED (unit):\n' + c2.out.split('\n').filter((l) => /❌|Results/.test(l)).join('\n')); process.exit(2); }
console.log('control: smoke and unit tests pass on the unmutated copies');

let caught = 0, notCaught = 0, harnessErr = 0;
const reached = new Set();
for (const m of MUTANTS) {
  const src = m.target === 'html' ? HTML : UTILS;
  const want = m.expectOccurrences === 'any' ? null : (m.expectOccurrences ?? 1);
  const n = occurrences(src, m.anchor);
  if (want === null ? n < 1 : n !== want) { console.log(`HARNESS ERROR  ${m.name}: anchor occurs ${n} times (want ${want === null ? '>=1' : want})`); harnessErr++; continue; }
  let text = want === null ? src.split(m.anchor).join(m.replacement) : src.replace(m.anchor, () => m.replacement);
  if (m.also) { if (occurrences(text, m.also.anchor) !== 1) { console.log(`HARNESS ERROR  ${m.name}: second anchor occurs ${occurrences(text, m.also.anchor)} times`); harnessErr++; continue; } text = text.replace(m.also.anchor, () => m.also.replacement); }
  if (text === src) { console.log(`HARNESS ERROR  ${m.name}: mutant identical to source`); harnessErr++; continue; }
  const r = m.target === 'html' ? runSmoke(text) : runUnit(text);
  const failing = r.out.split('\n').filter((l) => l.includes('❌'));
  const named = failing.some((l) => l.includes(m.expect));
  if (r.code !== 0 && named) { caught++; reached.add(m.expect); console.log(`CAUGHT      ${m.name}`); }
  else if (r.code !== 0 && failing.length === 0) { harnessErr++; console.log(`HARNESS ERROR  ${m.name}: non-zero exit with no failing line (a crash is not a catch)`); }
  else { notCaught++; console.log(`NOT CAUGHT  ${m.name}${r.code !== 0 ? ` (failed, but not on ${m.expect}: ${failing[0]?.slice(0, 120)})` : ''}`); }
}
console.log(`\ncoverage: ${MUTANTS.length} mutants of 3 suites (smoke A748 and A749: ${MUTANTS.filter((m) => m.target === 'html').length}; isNonSoccerFootballLabel unit tests: ${MUTANTS.filter((m) => m.target === 'utils').length}); caught ${caught}, not caught ${notCaught}, harness errors ${harnessErr}`);
process.exit(notCaught === 0 && harnessErr === 0 ? 0 : 1);

#!/usr/bin/env node
// Rule 90 (MUTATE-FIRST-A) for docs/CC-CMD-2026-11-26-night-owl-soccer-invented-numbers.md: smoke A747 and the owlSoccerNumbersRule unit tests are each shown red under a
// deliberate break before they are trusted. Every mutation puts one piece of the fix back to the defect, in a COPY: of index.html (read by smoke.js through argv) or of
// field_utils.js (run through a copy of field_unit.js in a temp dir). The repository's own files are never written.
//
// A mutation counts as CAUGHT only when (a) the run exits non-zero AND (b) a failing line (`❌`) names the clause the mutation breaks (`expect`). An anchor that does not
// occur exactly once in its file applies NOTHING and fails the harness by name; a mutant identical to its source is refused; a crash with no `❌` line is a harness error,
// not a catch. The CONTROL (unmutated copies) must pass both runs first. Rule 91: the result line states how many mutants of how many assertions were reached.
//
//   node scripts/mutate-night-owl-soccer-numbers.mjs      (from the repository root, after `node scripts/sync-source.mjs`)
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HTML = readFileSync('index.html', 'utf8');
const UTILS = readFileSync('field_utils.js', 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'owl-numbers-'));
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
const T_GENERIC = 'one-possession, touchdown. Use: clean sheet, pressing.\'';
const T_WC = 'overtime). Use: clean sheet, group stage standings, knockout bracket.\'';
const NB_SOCCER = 'write from score, margin, and drama context only. Cite a figure only where it is written above; a sentence with no number is fine.\'';
const FB_RULE = 'owlSoccerNumbersRule(_sp, _owlStatCtx),\n';
const Q_RULE = 'owlSoccerNumbersRule(_owlQ_sp, entry.statCtx),\n';

const MUTANTS = [
  // ---- smoke A747, on index.html -----------------------------------------------------------------------------------------------------------------------------------
  { name: 'generic soccer vocabulary list invites shots, possession, xG again', target: 'html', anchor: T_GENERIC, replacement: 'one-possession, touchdown. Use: shots, possession percentage, xG, clean sheet, pressing.\'', expect: 'A747' },
  { name: 'World Cup vocabulary list invites shots, possession, xG again', target: 'html', anchor: T_WC, replacement: 'overtime). Use: shots, possession, xG, clean sheet, group stage standings, knockout bracket.\'', expect: 'A747' },
  { name: 'generic list invites only xG', target: 'html', anchor: T_GENERIC, replacement: 'one-possession, touchdown. Use: clean sheet, xG, pressing.\'', expect: 'A747' },
  { name: 'soccer no-stats rule demands a number in every sentence again', target: 'html', anchor: NB_SOCCER, replacement: 'write from score, margin, and drama context only. Every sentence must include a specific number (final score, margin, or drama peak if meaningful).\'', expect: 'A747' },
  { name: 'the other branch of the no-stats pair loses its number demand', target: 'html', anchor: '- No box stats available — write from score, margin, series record, and drama context only. Every sentence must include a specific number (final score, margin, series record, or drama peak if meaningful).', replacement: '- No box stats available — write from score, margin, series record, and drama context only.', expect: 'A747' },
  { name: 'fallback prompt loses the numbers rule', target: 'html', anchor: FB_RULE, replacement: '', expect: 'A747' },
  { name: 'fallback prompt rule moves ahead of the voice block', target: 'html', anchor: FB_RULE, replacement: '', expect: 'A747', also: { anchor: '      getFieldVoice(_sp),\n', replacement: '      owlSoccerNumbersRule(_sp, _owlStatCtx),\n      getFieldVoice(_sp),\n' } },
  { name: 'fallback prompt passes an empty stat context, so a [MATCH STATS] line never lifts the rule', target: 'html', anchor: 'owlSoccerNumbersRule(_sp, _owlStatCtx),', replacement: "owlSoccerNumbersRule(_sp, ''),", expect: 'A747' },
  { name: 'queue prompt loses the numbers rule', target: 'html', anchor: Q_RULE, replacement: '', expect: 'A747' },
  { name: 'inline copy checks for "Shot:" instead of "Shots:"', target: 'html', anchor: "if(!/\\bShots:/.test(ctx)) missing.push('shots');", expectOccurrences: 1, replacement: "if(!/\\bShot:/.test(ctx)) missing.push('shots');", expect: 'A747' },
  { name: 'inline copy loses the corners check', target: 'html', anchor: "  if(!/\\bCorners:/.test(ctx)) missing.push('corners');\n", expectOccurrences: 1, replacement: '', expect: 'A747' },
  { name: 'inline copy no longer gates on a soccer label', target: 'html', anchor: "function owlSoccerNumbersRule(sport, statCtx){\n  if(!isSoccerSportLabel(sport)) return '';", replacement: "function owlSoccerNumbersRule(sport, statCtx){\n  if(false) return '';", expect: 'A747' },
  { name: "NHL's own vocabulary list loses its shots (the other sports must stay as they were)", target: 'html', anchor: 'Use: shots, save percentage', replacement: 'Use: save percentage', expect: 'A747', expectOccurrences: 'any' },
  { name: 'fallback prompt always carries the quality coaching, even with no figure', target: 'html', anchor: "owlSoccerNoFigures(_sp, _owlStatCtx) ? '' : getQualityTarget(_sp),", replacement: 'getQualityTarget(_sp),', expect: 'A747' },
  { name: 'fallback prompt leaves the quality coaching out for every sport', target: 'html', anchor: "owlSoccerNoFigures(_sp, _owlStatCtx) ? '' : getQualityTarget(_sp),", replacement: "'',", expect: 'A747' },
  { name: 'fallback prompt tests the wrong context for the coaching', target: 'html', anchor: "owlSoccerNoFigures(_sp, _owlStatCtx) ? '' : getQualityTarget(_sp),", replacement: "owlSoccerNoFigures(_sp, '') ? '' : getQualityTarget(_sp),", expect: 'A747' },
  { name: 'inline owlSoccerNoFigures drops the all-four test (any one figure missing leaves the coaching out)', target: 'html', anchor: 'owlSoccerMissingFigures(statCtx).length === 4;', replacement: 'owlSoccerMissingFigures(statCtx).length >= 1;', expect: 'A747' },
  // ---- unit tests, on field_utils.js ------------------------------------------------------------------------------------------------------------------------------------
  { name: 'unit: xG is no longer named when absent', target: 'utils', anchor: "  if(!/\\bxG\\b/.test(ctx)) missing.push('xG');\n", replacement: '', expect: 'owlSoccerNumbersRule' },
  { name: 'unit: the possession check matches the word in prose', target: 'utils', anchor: "if(!/\\bPossession:/.test(ctx)) missing.push('possession');", replacement: "if(!/possession/i.test(ctx)) missing.push('possession');", expect: 'owlSoccerNumbersRule' },
  { name: 'unit: every sport gets the rule', target: 'utils', anchor: "function owlSoccerNumbersRule(sport, statCtx){\n  if(!isSoccerSportLabel(sport)) return '';", replacement: "function owlSoccerNumbersRule(sport, statCtx){\n  if(false) return '';", expect: 'owlSoccerNumbersRule' },
  { name: 'unit: a context that carries all four still returns the rule', target: 'utils', anchor: "  if(!missing.length) return '';\n  const list", replacement: "  const list", expect: 'owlSoccerNumbersRule' },
  { name: 'unit: the list is joined with the wrong word', target: 'utils', anchor: "' or ' + missing[missing.length - 1]", replacement: "' and ' + missing[missing.length - 1]", expect: 'owlSoccerNumbersRule' },
  { name: 'unit: the rule stops saying a sentence without a number is fine', target: 'utils', anchor: " a sentence with no number is fine.';\n}", replacement: "';\n}", expect: 'owlSoccerNumbersRule' },
  { name: 'unit: owlSoccerNoFigures says true when any one figure is missing', target: 'utils', anchor: 'owlSoccerMissingFigures(statCtx).length === 4;', replacement: 'owlSoccerMissingFigures(statCtx).length >= 1;', expect: 'owlSoccerNoFigures' },
  { name: 'unit: owlSoccerNoFigures is true for every sport', target: 'utils', anchor: 'return isSoccerSportLabel(sport) && owlSoccerMissingFigures(statCtx).length === 4;', replacement: 'return owlSoccerMissingFigures(statCtx).length === 4;', expect: 'owlSoccerNoFigures' },
  { name: 'unit: a non-string context throws', target: 'utils', anchor: "const ctx = typeof statCtx === 'string' ? statCtx : '';", replacement: "const ctx = statCtx.toString();", expect: 'owlSoccerNumbersRule' },
];

// ---- control ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const c1 = runSmoke(HTML), c2 = runUnit(UTILS);
if (c1.code !== 0 || !/A747/.test(c1.out) || /❌/.test(c1.out)) { console.log('CONTROL FAILED (smoke):\n' + c1.out.split('\n').filter((l) => /❌|Results/.test(l)).join('\n')); process.exit(2); }
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
console.log(`\ncoverage: ${MUTANTS.length} mutants of 2 suites (smoke A747: ${MUTANTS.filter((m) => m.target === 'html').length}; owlSoccerNumbersRule and owlSoccerNoFigures unit tests: ${MUTANTS.filter((m) => m.target === 'utils').length}); caught ${caught}, not caught ${notCaught}, harness errors ${harnessErr}`);
process.exit(notCaught === 0 && harnessErr === 0 ? 0 : 1);

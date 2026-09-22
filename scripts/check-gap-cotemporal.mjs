// THE GAP MUST BE A SAME-DAY COMPARISON.
//
// `sections_model_not_in_dom` is the field this project's longest-running open
// defect is measured by. Until 2026-09-22 it compared:
//
//   the model   — read at odds_line_probe.js's slate_state capture, AFTER the
//                 step-back loop, so on the date the probe stepped to
//   the DOM     — read in the settle loop, BEFORE the step-back loop, so on
//                 the date the page loaded
//
// Every scheduled run steps back one day, so every scheduled gap figure was
// yesterday's model minus today's DOM sections. The sections that "vanished"
// were the ones the two dates do not share. That is a source-versus-copy
// substitution inside the instrument built to measure one.
//
// This gate asserts the ORDER, not the spelling: the census the gap is computed
// from is read after the last thing that can change the date.
import { readFileSync } from 'node:fs';

const SRC = process.env.PROBE_SRC || 'odds_line_probe.js';
const src = readFileSync(SRC, 'utf8');

let bad = 0, n = 0;
const ok = (label, cond, why) => { n++;
  if (cond) console.log(`ok    ${label}`);
  else { bad++; console.log(`FAIL  ${label}\n        ${why}`); } };

const at = (needle) => src.indexOf(needle);

// STATEMENT POSITION, not "the text appears somewhere". `if (false) m.slate_... =`
// contains the same characters and assigns nothing, and the first version of
// this gate passed on exactly that mutation — the vacuous-assertion shape,
// caught by the mutation harness rather than by reading.
const _censusStmt = /^[ \t]*m\.slate_sections_at_model_read = await page\.evaluate\(/m.exec(src);
const CENSUS  = _censusStmt ? _censusStmt.index : -1;
const MODEL   = at('m.slate_state = await page.evaluate');
const STEPLOOP= at('for (let i = 0; i < STEP_BACK; i++)');
const PRESTEP = at('m.slate_sections_present = census ? census.sections : null;');
const GAPUSE  = at('const dom = m.slate_sections_at_model_read || null;');

ok('the gap is computed from a census read at the model read, not the settle loop',
  GAPUSE !== -1,
  'sections_model_not_in_dom must be computed from slate_sections_at_model_read');

ok('that census exists AS A STATEMENT, not behind a disabled branch',
  CENSUS !== -1,
  'm.slate_sections_at_model_read is never unconditionally assigned; the gap then compares the model against null, which reads as "comparison not run" rather than as a defect');

ok('THE ORDER: the gap census is read AFTER the step-back loop',
  CENSUS !== -1 && STEPLOOP !== -1 && CENSUS > STEPLOOP,
  'a census read before the date can change describes a different day than the model');

ok('the gap census sits beside the model read, not pages away from it',
  CENSUS !== -1 && MODEL !== -1 && Math.abs(CENSUS - MODEL) < 2000,
  'the two must be read within the same moment, or a render between them makes them disagree');

ok('the pre-step census is still taken, and is still BEFORE the step loop',
  PRESTEP !== -1 && STEPLOOP !== -1 && PRESTEP < STEPLOOP,
  'slate_by_sport is paired with it and must keep describing the loaded date');

ok('the pre-step census carries its own date label',
  src.includes('m.slate_sections_present_date_label = await dateLabel();'),
  'without it, two censuses from two dates are indistinguishable in the artifact');

ok('the gap census carries its own date label',
  src.includes('m.slate_sections_at_model_read_date_label = await dateLabel();'),
  'the artifact must state which date the gap was computed on');

ok('the summary prints the date the gap was compared on',
  src.includes('but NOT in the DOM on ${m.gap_compared_on}'),
  'a gap figure with no date is what let this go unnoticed for ten days');

console.log(`\n${n - bad} of ${n} passed.`);
console.log(`COVERAGE: the read ORDER inside ${SRC} only — 1 file. It does NOT check`);
console.log('that any run actually produced a same-day comparison; that is the');
console.log('manifest’s two date labels, which a reader compares.');
process.exit(bad ? 1 : 0);

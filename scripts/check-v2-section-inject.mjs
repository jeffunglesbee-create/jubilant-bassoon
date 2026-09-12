#!/usr/bin/env node
// Behavioural test of injectV2SportSection
// (CC-CMD-2026-09-12-v2-sections-never-injected). smoke.js is structural: it
// can see the function exists. It cannot see that the function DOES NOTHING
// when allData.sports is falsy — which is the defect, and which produced a
// clean reading on every instrument for an unknown length of time.
//
// The function lives in field.js's IIFE and is not exported, so its source is
// extracted and run against stubs. The extraction asserts exactly one match
// before any assertion runs, so a pattern that stops matching fails loudly
// rather than passing vacuously.
//
// Coverage (Rule 91): 4 branches of one function against stubs. It says
// nothing about whether allData.sports is ever actually falsy in the live app
// — that is the probe manifest's job, not this.

import fs from 'node:fs';
const src = fs.readFileSync('src/legacy/field.js', 'utf8');

function extract(name, re) {
  const all = [...src.matchAll(re)];
  if (all.length !== 1) {
    console.error(`FAIL — extraction for ${name} matched ${all.length} time(s), expected 1. Nothing was checked.`);
    process.exit(1);
  }
  return all[0][0];
}
const srcGame   = extract('_v2SectionGame',        /function _v2SectionGame\([\s\S]*?\n\}/g);
const srcInject = extract('injectV2SportSection',  /function injectV2SportSection\(sportKey, sectionLabel\) \{[\s\S]*?\n\}/g);

const make = (espnScores, allData) => {
  const errors = [];
  const captureFieldError = (tag, err) => errors.push({ tag, msg: String(err?.message ?? err) });
  const injected = {};
  const buildFilters = () => {};
  const fn = new Function('espnScores', 'allData', 'captureFieldError', '_v2SectionInjected', 'buildFilters',
    `${srcGame}\n${srcInject}\nreturn injectV2SportSection;`
  )(espnScores, allData, captureFieldError, injected, buildFilters);
  return { fn, errors, injected };
};

const scores = (sport, n) => {
  const o = {};
  for (let i = 0; i < n; i++) o[`Home${i}|Away${i}`] = { _sport: sport, _gameId: `g${i}`, state: 'post' };
  return o;
};

let failed = 0, ran = 0;
// Counted, not declared. The first version of this file printed "18 assertions"
// against 21 — a hardcoded denominator drifts the moment a case is added, and a
// coverage line that is wrong is worse than none (Rule 91).
const check = (l, c, d) => { ran++; if (c) console.log(`  ok    ${l}`); else { failed++; console.error(`  FAIL  ${l}${d ? ` — ${d}` : ''}`); } };

// ── 1. the push path: a fresh section lands in allData.sports ──
{
  const allData = { sports: [{ sport: 'Baseball (MLB)', section: 'Baseball (MLB)', games: [] }] };
  const { fn, errors, injected } = make(scores('cfb', 80), allData);
  fn('cfb', 'College Football');
  check('1a the section is pushed', allData.sports.length === 2, `len ${allData.sports.length}`);
  check('1b it carries the label as both sport and section',
        allData.sports[1]?.sport === 'College Football' && allData.sports[1]?.section === 'College Football');
  check('1c all 80 games came with it', allData.sports[1]?.games?.length === 80, `${allData.sports[1]?.games?.length}`);
  check('1d the memo records it', injected.cfb === true);
  check('1e nothing was reported on the happy path', errors.length === 0, JSON.stringify(errors));
}

// ── 2. THE DEFECT: allData.sports falsy — the branch must report, not vanish ──
for (const [label, allData] of [
  ['allData is null',            null],
  ['allData has no .sports',     {}],
  ['allData.sports is undefined', { sports: undefined }],
]) {
  const { fn, errors, injected } = make(scores('cfb', 80), allData);
  fn('cfb', 'College Football');
  check(`2 ${label}: the failure is captured by sport name`,
        errors.some(e => e.tag === 'v2-section-inject:no-target:cfb'), JSON.stringify(errors));
  check(`2 ${label}: the report says how many games were ready`,
        errors.some(e => /80 game/.test(e.msg)), JSON.stringify(errors.map(e => e.msg)));
  check(`2 ${label}: the memo does NOT claim success`, injected.cfb !== true, String(injected.cfb));
}

// ── 3. the merge path: an existing section is updated, not duplicated ──
{
  const allData = { sports: [{ sport: 'College Football', section: 'College Football',
                               games: [{ home: 'Home0', away: 'Away0', _id: 'old', extra: 'keep' }] }] };
  const { fn, errors } = make(scores('cfb', 2), allData);
  fn('cfb', 'College Football');
  check('3a no duplicate section', allData.sports.length === 1, `len ${allData.sports.length}`);
  check('3b the merged section has both games', allData.sports[0].games.length === 2, `${allData.sports[0].games.length}`);
  check('3c a pre-existing field survives the overlay',
        allData.sports[0].games.some(g => g.extra === 'keep'), JSON.stringify(allData.sports[0].games));
  check('3d nothing reported on the merge path', errors.length === 0, JSON.stringify(errors));
}

// ── 4. no games for the sport: an early return, and NOT a failure ──
{
  const allData = { sports: [] };
  const { fn, errors, injected } = make(scores('mlb', 5), allData);
  fn('cfb', 'College Football');
  check('4a nothing is pushed', allData.sports.length === 0);
  check('4b a sport with no games is NOT reported as a failure',
        errors.length === 0, JSON.stringify(errors));
  check('4c and is not memoed as injected', injected.cfb !== true);
}

console.log(`\nchecked 4 branch(es) of injectV2SportSection across ${ran} assertions against extracted `
          + `source (not a copy); allData and espnScores are stubs, so this says nothing about `
          + `whether the live app ever reaches the no-target branch`);
if (failed) { console.error(`FAIL — ${failed} assertion(s).`); process.exit(1); }
console.log('PASS');

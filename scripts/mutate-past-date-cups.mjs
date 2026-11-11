#!/usr/bin/env node
// Rule 90 (MUTATE-FIRST-A) for the past-date cups change: relay CC-CMD-2026-08-08-fa-cup-coverage Task 6 (owner: "yes all 3", 2026-11-11).
//
// What it proves: that scripts/check-relay-date-sections.mjs (5a to 5g), scripts/check-v2-section-labels.mjs (section 4) and smoke.js (PD-1 to PD-3) can each go RED
// for the defect they exist to catch. Each mutation puts one piece of the change back to a defect, in a COPY of src/legacy/field.js (read by the two checks through
// FIELD_SRC) and the same text in a COPY of index.html (read by smoke.js through argv). The repository's own files are never written.
//
// A mutation counts as CAUGHT only when (a) at least one of the three runs exits non-zero, AND (b) a FAIL or failed-assertion line in that output names the clause the
// mutation breaks (`expect`). An anchor that does not occur exactly once in BOTH copies applies NOTHING and fails the harness by name (a mutation that did not apply
// would otherwise print "not caught" for the wrong reason, or worse, nothing); a mutant identical to its source is refused; a crash with no FAIL line is a harness
// error, not a catch. The CONTROL (the unmutated copies) must pass all three first.
//
// NOT re-tested here, on purpose: the pre-existing allSettled isolation (assertion 2a). Measured 2026-11-11 while writing this: replacing Promise.allSettled with
// Promise.all makes check-relay-date-sections.mjs CRASH in test 1 (TypeError on r.status) before 2a can report, so that guard is caught by a crash and not by the
// assertion that names it. Adjacent to this change, not part of it (TOUCH-ONLY); recorded in the CC-CMD rather than fixed.
//
// Rule 91: it prints which of the new assertions went red under at least one mutation and lists the ones that none reached, so "N mutants caught" is never read as
// "every assertion can fail".
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FIELD = readFileSync('src/legacy/field.js', 'utf8');
const HTML = readFileSync('index.html', 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'past-date-cups-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));

const run = (cmd, args, env) => {
  let out = '', code = 0;
  try { out = execFileSync(cmd, args, { env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000, maxBuffer: 1 << 28 }); }
  catch (e) { code = e.status ?? 1; out = (e.stdout || '') + (e.stderr || ''); }
  return { code, out };
};
const runAll = (fieldFile, htmlFile) => ({
  dates:  run('node', ['scripts/check-relay-date-sections.mjs'], { FIELD_SRC: fieldFile }),
  labels: run('node', ['scripts/check-v2-section-labels.mjs'], { FIELD_SRC: fieldFile }),
  smoke:  run('node', ['smoke.js', htmlFile], {}),
});
// the lines that say something went red, from all three runs
const redLines = r => [
  ...r.dates.out.split('\n').filter(l => /^\s*FAIL\b/.test(l)),
  ...r.labels.out.split('\n').filter(l => /^\s{2}[A-Z][A-Z0-9-]+\b/.test(l) || /^FAIL\b/.test(l)),
  ...r.smoke.out.split('\n').filter(l => /❌/.test(l) && /PD-/.test(l)),
];

const F = join(dir, 'field.js'), H = join(dir, 'index.html');
writeFileSync(F, FIELD); writeFileSync(H, HTML);
const control = runAll(F, H);
const controlOk = control.dates.code === 0 && control.labels.code === 0 && control.smoke.code === 0;
console.log(`CONTROL  check-relay-date-sections ${control.dates.code === 0 ? 'pass' : 'FAIL'} | check-v2-section-labels ${control.labels.code === 0 ? 'pass' : 'FAIL'} | smoke ${control.smoke.code === 0 ? 'pass' : 'FAIL'}`);
if (!controlOk) { console.log('FAIL  the unmutated copies do not pass; nothing below means anything'); process.exit(1); }

const M = (id, what, old, neu, expect) => ({ id, what, old, neu, expect });
const mutants = [
  M('M1', 'fetchRelayDateSections stops asking for the past-date-only keys', "    ...Object.keys(V2_PAST_DATE_ONLY),\n  ];", '  ];', /5a|5b|5c|PD-1/),
  M('M2', 'the label lookup loses its V2_PAST_DATE_ONLY fallback', 'V2_SECTION_LABEL[key] ?? V2_PAST_DATE_ONLY[key]', 'V2_SECTION_LABEL[key]', /5b|5c|5e|PD-1/),
  M('M3', 'the three cups are added to FIELD_V2_SOURCES (the live-poll leak the design avoids)', "  cfb: new Date() >= new Date('2026-08-29T00:00:00Z'),\n};", "  cfb: new Date() >= new Date('2026-08-29T00:00:00Z'),\n  facup: true, eflcup: true, efltrophy: true,\n};", /LIVE-LEAK|PD-2/),
  M('M4', "the FA Cup's past-date label drifts from its SOCCER_LEAGUES section", "{ facup: 'FA Cup', eflcup:", "{ facup: 'FA Cup (England)', eflcup:", /PAST-LABEL-DRIFT|PD-1|PD-3|5b/),
  M('M5', 'the EFL Trophy is dropped from the map', ", efltrophy: 'EFL Trophy' };", ' };', /PAST-MISSING|5a|5b|PD-1/),
  M('M6', 'a cup is also put in V2_SECTION_LABEL (the poll-side map)', "  wc26: 'FIFA World Cup 2026',\n};", "  wc26: 'FIFA World Cup 2026', facup: 'FA Cup',\n};", /PAST-IN-LABEL-MAP|UNKNOWN/),
  M('M7', "the SOCCER_LEAGUES section of the EFL Cup is renamed (the other side of the label pair)", "{ league: 'eng.league_cup', section: 'EFL Cup',", "{ league: 'eng.league_cup', section: 'Carabao Cup',", /PAST-LABEL-DRIFT|PD-3/),
  M('M8', "the SOCCER_LEAGUES entry of the EFL Trophy is renamed, so its label has nothing to be held against", "{ league: 'eng.trophy', section: 'EFL Trophy',", "{ league: 'eng.trophy2', section: 'EFL Trophy',", /NO-SWEEP-ENTRY|PD-3/),
  M('M9', 'one empty source blanks every section (a cup with no games that day takes the whole slate with it)', '  const sections = settled.filter(s => s && s.games.length);', '  const sections = settled.every(s => s && s.games.length) ? settled : [];', /5f/),
  M('M10', 'the map is renamed, so the extraction and the wiring both lose it', 'const V2_PAST_DATE_ONLY = {', 'const V2_PAST_DATE_ONLYX = {', /extraction for V2_PAST_DATE_ONLY|PD-1/),
  M('M12', 'asking for the cups ALSO switches them on in FIELD_V2_SOURCES at run time (the same live-poll leak, made from inside the function)', "    ...Object.keys(V2_PAST_DATE_ONLY),\n  ];", "    ...Object.keys(V2_PAST_DATE_ONLY),\n  ];\n  for (const k of Object.keys(V2_PAST_DATE_ONLY)) FIELD_V2_SOURCES[k] = true;", /5d/),
  M('M13', 'fetchRelayDateSections stops filtering on the enabled flag, so it asks for switched-off sports too (reviewer D29)', '.filter(([, v]) => v).map(([k]) => k),\n    ...Object.keys(V2_PAST_DATE_ONLY),', '.filter(([, v]) => true).map(([k]) => k),\n    ...Object.keys(V2_PAST_DATE_ONLY),', /1a|5a|5b/),
  M('M14', 'the section-level sport field of a cup is the wrong value (it builds the filter chip) (reviewer D09)', 'sport: label, section: label,', "sport: V2_PAST_DATE_ONLY[key] ? 'soccer' : label, section: label,", /5b/),
  M('M15', "a game's _section is lost (the cups flow through this pre-existing builder) (reviewer D12)", '_section: sectionLabel', "_section: 'x'", /5c/),
  M('M11', 'a failing cup is no longer reported (the capture is removed)', "captureFieldError(`relay-date-sections:${enabled[i]}`, r.reason, false);", '', /5g/),
];

let bad = 0, caught = 0;
const wentRed = new Set();
for (const m of mutants) {
  const nf = FIELD.split(m.old).length - 1, nh = HTML.split(m.old).length - 1;
  if (nf !== 1 || nh !== 1) { bad++; console.log(`FAIL  ${m.id} ANCHOR occurs ${nf} time(s) in field.js and ${nh} in index.html, not once each; NOTHING WAS MUTATED (${JSON.stringify(m.old.slice(0, 60))})`); continue; }
  const f2 = FIELD.replace(m.old, () => m.neu), h2 = HTML.replace(m.old, () => m.neu);
  if (f2 === FIELD || h2 === HTML) { bad++; console.log(`FAIL  ${m.id} the mutant is identical to its source`); continue; }
  writeFileSync(F, f2); writeFileSync(H, h2);
  const r = runAll(F, H);
  const red = redLines(r);
  const anyNonZero = r.dates.code !== 0 || r.labels.code !== 0 || r.smoke.code !== 0;
  const named = red.some(l => m.expect.test(l));
  if (anyNonZero && named) {
    caught++;
    for (const l of red) for (const id of (l.match(/\b(5[a-g]|PD-[123]|LIVE-LEAK|PAST-MISSING|PAST-UNKNOWN|PAST-IN-LABEL-MAP|PAST-LABEL-DRIFT|NO-SWEEP-ENTRY|extraction for V2_PAST_DATE_ONLY|2[abc])\b/g) || [])) wentRed.add(id);
    const which = [r.dates.code !== 0 && 'dates', r.labels.code !== 0 && 'labels', r.smoke.code !== 0 && 'smoke'].filter(Boolean).join('+');
    console.log(`ok    ${m.id} CAUGHT by ${which} (${red.length} red line(s); first: ${red[0].trim().slice(0, 110)}) — ${m.what}`);
  } else {
    bad++;
    console.log(`FAIL  ${m.id} ${anyNonZero ? 'went red but no red line names the clause (expected ' + m.expect + ')' : 'NOT CAUGHT, every run still passed'} — ${m.what}`);
    if (red.length) console.log(`        red lines: ${red.slice(0, 3).map(l => l.trim().slice(0, 100)).join(' | ')}`);
  }
}
const mustReach = ['5a', '5b', '5c', '5d', '5e', '5f', '5g', 'PD-1', 'PD-2', 'PD-3', 'LIVE-LEAK', 'PAST-MISSING', 'PAST-IN-LABEL-MAP', 'PAST-LABEL-DRIFT', 'NO-SWEEP-ENTRY'];
const unreached = mustReach.filter(id => !wentRed.has(id));
console.log(`\n${caught} of ${mutants.length} mutants caught (control passed). New assertions that went red under at least one mutation: ${[...wentRed].filter(id => mustReach.includes(id)).sort().join(', ')}.`);
console.log(unreached.length ? `NOT REACHED by any mutation: ${unreached.join(', ')}` : `every one of the ${mustReach.length} named new assertions was reached by a mutation.`);
process.exit(bad || unreached.length ? 1 : 0);

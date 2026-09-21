// Rule 90 for runOf. It decides what counts toward the done condition, so every
// way of NOT counting has to be distinguishable — a PASS on a small slate, a
// PASS that rendered fewer cards than matches, and a real FAIL are three
// different facts and only one of them is a defect.
//
// Imports the module the counter imports, not a copy.
const MOD = process.env.TENNIS_STREAK_MODULE || './check-tennis-pass-streak.mjs';
const { runOf, doneVerdict, qualifyingSince } = await import(MOD);

let bad = 0, n = 0;
const eq = (label, got, want) => { n++;
  if (got === want) console.log(`ok    ${label}`);
  else { bad++; console.log(`FAIL  ${label} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };

const m = (o) => ({ ts: '2026-09-21T22:00:00Z', sw: '2026-09-21c', triggered_by: 'schedule', ...o });

eq('a qualifying PASS is green',
  runOf(m({ verdict: 'PASS', relayLiveMatches: 42, tennisCardCount: 42 })).state, 'green');
eq('exactly at the bar is green',
  runOf(m({ verdict: 'PASS', relayLiveMatches: 34, tennisCardCount: 34 })).state, 'green');

// THE LOOPHOLE THIS BAR EXISTS FOR: 2026-09-17 passed at 19 with the bug in
// place, because the slate was under the overflow threshold that day.
eq('A PASS BELOW THE BAR IS SMALL, NOT GREEN',
  runOf(m({ verdict: 'PASS', relayLiveMatches: 19, tennisCardCount: 19 })).state, 'small');
eq('one short of the bar is still small',
  runOf(m({ verdict: 'PASS', relayLiveMatches: 33, tennisCardCount: 33 })).state, 'small');

// A PASS that rendered fewer cards than the relay served is not the same as a
// slate too small to judge, and neither is a plain FAIL.
eq('a PASS with missing cards is partial',
  runOf(m({ verdict: 'PASS', relayLiveMatches: 42, tennisCardCount: 40 })).state, 'partial');
eq('a FAIL is red',
  runOf(m({ verdict: 'FAIL', relayLiveMatches: 42, tennisCardCount: 0 })).state, 'red');
eq('UNKNOWN is red, never green',
  runOf(m({ verdict: 'UNKNOWN', relayLiveMatches: 42, tennisCardCount: 0 })).state, 'red');
eq('NO PLAY is red, never green',
  runOf(m({ verdict: 'NO PLAY', relayLiveMatches: 0, tennisCardCount: 0 })).state, 'red');

// An absent count must not read as a match.
eq('missing counts do not satisfy cards == matches',
  runOf(m({ verdict: 'PASS' })).state, 'small');

// The two fields computeStreak reads have to survive.
eq('the trigger is carried through',
  runOf(m({ verdict: 'PASS', relayLiveMatches: 42, tennisCardCount: 42, triggered_by: 'workflow_dispatch' })).trigger,
  'workflow_dispatch');
eq('an unset trigger is named, not blank',
  runOf({ ts: 'x', verdict: 'FAIL', triggered_by: undefined }).trigger, '(unset)');
eq('a missing sw is null so the fix filter excludes it',
  runOf({ ts: 'x', verdict: 'PASS', relayLiveMatches: 42, tennisCardCount: 42 }).sw, null);

// THE CONDITION'S OWN ARITHMETIC, asked at specific inputs rather than by
// reading REQUIRED back. One qualifying run must not close a two-run bar:
// 2026-09-06 went red and green six minutes apart at the same slate size.
eq('zero scheduled runs leaves it open', doneVerdict(0), 'OPEN');
eq('ONE SCHEDULED RUN DOES NOT CLOSE IT', doneVerdict(1), 'OPEN');
eq('two scheduled runs meet it', doneVerdict(2), 'MET');
eq('more than two still meets it', doneVerdict(5), 'MET');

// FIX_SW is load-bearing only through this filter, so the filter is what gets
// tested: a green measured BEFORE the fix shipped is not evidence for it.
const pre = { ts: 'a', sw: '2026-09-12u', trigger: 'schedule', state: 'green' };
const post = { ts: 'b', sw: '2026-09-21c', trigger: 'schedule', state: 'green' };
eq('A PRE-FIX RUN IS NOT ADMITTED', qualifyingSince([pre, post]).length, 1);
eq('...and the one admitted is the post-fix one', qualifyingSince([pre, post])[0].ts, 'b');
eq('a run with no sw is excluded, not assumed current',
  qualifyingSince([{ ts: 'c', sw: null, trigger: 'schedule', state: 'green' }]).length, 0);

console.log(`\n${n - bad}/${n} checks passed`);
console.log('COVERAGE: runOf only. computeStreak has its own logic test, and neither');
console.log('reads a manifest from disk or runs the probe.');
process.exit(bad ? 1 : 0);

#!/usr/bin/env node
// Rule 90 (MUTATE-FIRST-A) + CC-CMD-2026-09-12-odds-movement-sequence-discipline.
//
// buildOddsMovement claims "unchanged from open" or a points shift. Both are
// claims about CHANGE, and a claim about change needs two observations in a
// known order. ODDS-PROOF.md records the day that was false: the "closing"
// snapshot was captured ~22 SECONDS BEFORE the opening one, identical across
// moneyline, spread and total — one snapshot written to two columns.
//
// This runs the real exported function against enumerated fixtures rather than
// matching source text. Seven earlier assertions in this repo's history passed
// against source that never ran; a regex cannot tell you what a function says.

globalThis.document = {
  createElement: () => ({ className: '', textContent: '', appendChild() {} }),
};

const { buildOddsMovement } = await import('../src/debrief/index.ts');

const ML = (home, away = 150) => ({ home, away });
const odds = (openML, openAt, closeML, closeAt) => ({
  oddsOutcome: {
    opening: { moneyline: ML(openML), ...(openAt !== undefined ? { captured_at: openAt } : {}) },
    closing: closeML === null ? null
           : { moneyline: ML(closeML), ...(closeAt !== undefined ? { captured_at: closeAt } : {}) },
    homeScore: 4, awayScore: 2, home: 'H', away: 'A', wentToOT: false,
  },
});

const T0 = '2026-09-11T10:01:39.754Z';
const T1 = '2026-09-11T11:55:36Z';        // strictly after T0
const TBEFORE = '2026-09-11T10:01:17Z';   // 22s BEFORE T0 — the real 2026-08-09 shape

// Each case: name, debrief, and what the rendered text must START with.
// "opened" is the honest answer for every pair that is not a sequence.
const CASES = [
  ['no closing snapshot',                 odds(-199, T0, null),              'Home line opened'],
  ['identical timestamps (one reading)',   odds(-199, T0, -199, T0),          'Home line opened'],
  ['closing captured BEFORE opening',      odds(-199, T0, -250, TBEFORE),     'Home line opened'],
  ['opening captured_at absent',           odds(-199, undefined, -250, T1),   'Home line opened'],
  ['closing captured_at absent',           odds(-199, T0, -250, undefined),   'Home line opened'],
  ['neither captured_at present',          odds(-199, undefined, -250, undefined), 'Home line opened'],
  ['captured_at unparseable',              odds(-199, 'not a date', -250, T1), 'Home line opened'],
  ['a real sequence, price unchanged',     odds(-199, T0, -199, T1),          'Home moneyline'],
  ['a real sequence, price moved',         odds(-199, T0, -250, T1),          'Home moneyline'],
];

let failed = 0;
for (const [name, debrief, wantPrefix] of CASES) {
  const el = buildOddsMovement(debrief);
  const text = el ? el.textContent : '(null element)';
  if (!text.startsWith(wantPrefix)) {
    failed++;
    console.error(`  MISMATCH  ${name}\n            got:  ${text}\n            want: ${wantPrefix}…`);
  }
}

// A pair that is not a sequence must never carry either change claim, whatever
// the prefix check said.
for (const [name, debrief, wantPrefix] of CASES) {
  if (wantPrefix !== 'Home line opened') continue;
  const t = buildOddsMovement(debrief)?.textContent || '';
  if (/unchanged from open|pts toward/.test(t)) {
    failed++;
    console.error(`  CLAIMS CHANGE without a sequence: ${name} → ${t}`);
  }
}

// No opening odds at all renders nothing — the dominant state.
if (buildOddsMovement({ oddsOutcome: null }) !== null) {
  failed++;
  console.error('  MISMATCH  no odds at all → expected null element');
}

const notSeq = CASES.filter(c => c[2] === 'Home line opened').length;
console.log(`checked ${CASES.length + 1} of ${CASES.length + 1} enumerated fixtures `
          + `(${notSeq} pairs that are NOT a sequence, ${CASES.length - notSeq} that are, 1 with no odds)`);

if (failed) { console.error(`FAIL — ${failed} mismatch(es).`); process.exit(1); }
console.log('PASS');

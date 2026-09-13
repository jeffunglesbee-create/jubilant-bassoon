#!/usr/bin/env node
// buildOddsStory's scenario, run as the real exported function against
// enumerated input/output pairs (CC-CMD-2026-09-12-debrief-odds-scenario-chip).
//
// Structural smoke can see the labels exist in the bundle. It cannot see that
// a game with NO SCORE rendered UPSET/MUST — the strongest label in the
// vocabulary, built entirely out of absent data. That is what these pairs are
// for, and it is measured, not asserted: every row below was run before the
// guard was written and the four absent-score rows returned a chip.
//
// Coverage (Rule 91): 1 function, 10 enumerated cases. It says nothing about
// whether the MUST/HOT/QUIET vocabulary is appropriate — that is an ADR-002
// question flagged for human review, not settled here.

const mk = () => ({ className: '', textContent: '', children: [],
                    appendChild(c) { this.children.push(c); return c; } });
globalThis.document = { createElement: () => mk() };
const { buildOddsStory, initDebriefModule } = await import('../src/debrief/index.ts');

const seen = [];
initDebriefModule({ fieldChip: (label, variant) => { seen.push(`${label}/${variant}`); const e = mk(); e.textContent = label; return e; } });

const homeFavML = { moneyline: { home: -150, away:  130 } };
const awayFavML = { moneyline: { home:  130, away: -150 } };

// [ label, oddsOutcome, expected — a chip string, or null for "no render" ]
const CASES = [
  ['no opening odds at all',        { home:'H', away:'A', homeScore:3, awayScore:1 },                       null],

  // Absent scores. Four shapes, because `?? 0` treated every one of them as a
  // real 0 and produced UPSET/MUST. A scenario is a claim about how a game
  // finished; there is no claim to make about one with no score.
  ['both scores null',              { opening:homeFavML, homeScore:null,      awayScore:null },             null],
  ['both scores undefined',         { opening:homeFavML },                                                   null],
  ['home score null, away real',    { opening:homeFavML, homeScore:null,      awayScore:2 },                 null],
  ['away score undefined, home real',{ opening:homeFavML, homeScore:2 },                                     null],

  // Decisive results — the cases the layer exists for.
  ['home favourite wins big',       { opening:homeFavML, homeScore:30, awayScore:20 },             'CHALK/QUIET'],
  ['home favourite loses',          { opening:homeFavML, homeScore:20, awayScore:30 },             'UPSET/MUST'],
  ['favourite wins by one',         { opening:homeFavML, homeScore:21, awayScore:20 },             'SWEAT/HOT'],
  ['favourite wins, went to OT',    { opening:homeFavML, homeScore:30, awayScore:20, wentToOT:true }, 'SWEAT/HOT'],

  // DRAWS — current behaviour, PINNED DELIBERATELY AND NOT ENDORSED.
  //
  // The same 1-1 draw renders UPSET/MUST when the home side was favoured and
  // SWEAT/HOT when the away side was, because `homeWon = homeScore > awayScore`
  // is false in a draw and `favWon = homeFav === homeWon` therefore flips with
  // homeFav. One real-world outcome, two labels, decided by which team the
  // bookmaker preferred.
  //
  // These two rows exist so that behaviour cannot change silently. They are NOT
  // a claim that either label is right — what a draw should render is an open
  // question raised with the user on 2026-09-12 and not answered here.
  ['1-1 draw, HOME favoured  [pinned, not endorsed]', { opening:homeFavML, homeScore:1, awayScore:1 }, 'UPSET/MUST'],
  ['1-1 draw, AWAY favoured  [pinned, not endorsed]', { opening:awayFavML, homeScore:1, awayScore:1 }, 'SWEAT/HOT'],
];

let failed = 0;
for (const [label, odds, want] of CASES) {
  seen.length = 0;
  const out = buildOddsStory({ oddsOutcome: odds });
  const got = out === null ? null : (seen[0] ?? '(rendered, no chip)');
  if (got === want) console.log(`  ok    ${label.padEnd(46)} -> ${got === null ? 'no render' : got}`);
  else { failed++; console.error(`  FAIL  ${label.padEnd(46)} -> ${got}, wanted ${want === null ? 'no render' : want}`); }
}

console.log(`\nchecked ${CASES.length} enumerated case(s) against the real buildOddsStory. Two rows pin the `
          + `draw inconsistency as CURRENT behaviour, deliberately, and endorse neither label. `
          + `Whether MUST/HOT/QUIET is an appropriate vocabulary at all is an ADR-002 question `
          + `flagged for human review and NOT settled by this file.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');

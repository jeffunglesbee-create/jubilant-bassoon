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
  ['favourite wins by one',         { opening:homeFavML, homeScore:21, awayScore:20 },             'SWEAT/WATCH'],
  ['favourite wins, went to OT',    { opening:homeFavML, homeScore:30, awayScore:20, wentToOT:true }, 'SWEAT/WATCH'],
  ['underdog wins by one',          { opening:homeFavML, homeScore:20, awayScore:21 },             'UPSET/MUST'],

  // DRAWS — resolved 2026-09-12. These rows were previously pinned as
  // [not endorsed]: the same 1-1 draw rendered UPSET/MUST when the home side
  // was favoured and SWEAT/HOT when the away side was, because `homeWon` is
  // false in any draw and `favWon = homeFav === homeWon` flipped with homeFav.
  //
  // A draw is now its own scenario. The symmetry is the point, and it is what
  // these two rows exist to hold: the SAME result must render the SAME label
  // whichever team the bookmaker preferred.
  ['1-1 draw, HOME favoured',       { opening:homeFavML, homeScore:1, awayScore:1 },               'DRAW/INFO'],
  ['1-1 draw, AWAY favoured',       { opening:awayFavML, homeScore:1, awayScore:1 },               'DRAW/INFO'],
  ['0-0 draw',                      { opening:homeFavML, homeScore:0, awayScore:0 },               'DRAW/INFO'],
  ['high-scoring draw',             { opening:awayFavML, homeScore:3, awayScore:3 },               'DRAW/INFO'],

  // Every tier this function can emit must be a real fieldChip tier with a CSS
  // rule. 'HOT' was not: `.field-chip--HOT` had ZERO rules in index.html, so
  // every SWEAT chip rendered with the base class alone while UPSET and CHALK
  // were styled. check-odds-story-tiers below enforces it against index.html.
];

let failed = 0;
for (const [label, odds, want] of CASES) {
  seen.length = 0;
  const out = buildOddsStory({ oddsOutcome: odds });
  const got = out === null ? null : (seen[0] ?? '(rendered, no chip)');
  if (got === want) console.log(`  ok    ${label.padEnd(46)} -> ${got === null ? 'no render' : got}`);
  else { failed++; console.error(`  FAIL  ${label.padEnd(46)} -> ${got}, wanted ${want === null ? 'no render' : want}`); }
}

// Every tier emitted must exist as a CSS rule. A tier outside fieldChip's
// vocabulary renders an unstyled chip and nothing else complains — which is
// exactly how 'HOT' survived.
const html = (await import('node:fs')).readFileSync('index.html', 'utf8');
const TIERS = ['MUST', 'WATCH', 'INFO', 'QUIET'];
for (const t of TIERS) {
  const has = html.includes(`field-chip--${t}`);
  if (has) console.log(`  ok    tier ${t} has a .field-chip--${t} rule in index.html`);
  else { failed++; console.error(`  FAIL  tier ${t} is emitted but .field-chip--${t} has NO rule in index.html`); }
}

console.log(`\nchecked ${CASES.length} enumerated case(s) against the real buildOddsStory, plus `
          + `${TIERS.length} emitted tier(s) against index.html's CSS. The ADR-002 clearance for this `
          + `layer is cited at its call site and enforced by check-debrief-postgame-only.mjs; `
          + `this file does not re-derive it.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');

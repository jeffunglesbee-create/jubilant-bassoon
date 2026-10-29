#!/usr/bin/env node
// The debrief's two "opening" layers skip a line captured after kickoff
// (CC-CMD-2026-10-19-cfb-saturday-coverage-and-join-probe, TASK A2, client half; the relay half is
// field-relay-nba scripts/check-opening-odds-late.mjs).
//
// THE DEFECT. The relay's CI backfill writes one snapshot into BOTH odds columns, so a game that kicked off before
// the 23:59Z snapshot has an "opening" captured during it. Priced opening lines carrying the late mark, D1
// 2026-09-16 to 2026-10-29: CFB 116 of 183, NHL 97 of 202, NBA 15 of 69, NFL 4 of 33. buildOddsStory turned that
// line into CHALK / UPSET / SWEAT and buildOddsMovement printed "Home line opened ...".
//
// THE PREDICATE is a finite `_kickoff.late_minutes`, not `verified: false`: kickoffMark also writes verified:false for
// a kickoff nobody could read (late_minutes null). The three `_kickoff` shapes below are the three real ones, copied
// from rows in field-archive on 2026-10-29 (NHL_2026-09-29_e401891827 served live by /context/game as the late shape,
// NBA_2026-10-20_e401909090 verified, 2026-09-18-mls-mtl-clb unreadable). A capture at the kickoff instant has
// late_minutes 0 and is late; a falsy test would miss it.
//
// Coverage (Rule 91): 2 exported layer builders plus the assembler, run as the real functions on 5 enumerated
// openings (10 layer cases and 2 assembler cases). It says nothing about rows 9 and 10 of the relay-side census (_isUpset and the market-consensus
// functions): they have no feed (no /archive/upsets route; /archive/query reads the briefs table).

const mk = () => ({ className: '', textContent: '', children: [],
                    appendChild(c) { this.children.push(c); return c; } });
globalThis.document = { createElement: () => mk() };
const { buildOddsStory, buildOddsMovement, buildDebrief, initDebriefModule } = await import('../src/debrief/index.ts');
const seen = [];
initDebriefModule({ fieldChip: (label, variant) => { seen.push(`${label}/${variant}`); const e = mk(); e.textContent = label; return e; } });

const LATE       = { at: '2026-09-29T23:00Z', verified: false, late_minutes: 55 };
const AT_KICKOFF = { at: '2026-09-29T23:00Z', verified: false, late_minutes: 0 };
const VERIFIED   = { at: '2026-10-21T01:50Z', verified: true,  late_minutes: null };
const UNREADABLE = { at: null,                verified: false, late_minutes: null };

const T0 = '2026-10-20T14:00:00Z', T1 = '2026-10-20T23:55:00Z';
// The closing blob carries no mark and a different price, so a guard that read the closing column would let a late opening through.
const closing = { moneyline: { home: -180, away: 160 }, captured_at: T1 };
const outcome = (kick, extra = {}) => ({
  opening: { moneyline: { home: -150, away: 130 }, captured_at: T0, ...(kick === undefined ? {} : { _kickoff: kick }) },
  closing, homeScore: 30, awayScore: 20, home: 'H', away: 'A', wentToOT: false, ...extra,
});

// [ label, kickoff mark on the OPENING, renders? ]
const CASES = [
  ['opening captured 55 minutes after kickoff', LATE,       false],
  ['opening captured at the kickoff instant (0)', AT_KICKOFF, false],
  ['opening verified before kickoff',           VERIFIED,   true],
  ['kickoff unreadable (verified:false, late_minutes null)', UNREADABLE, true],
  ['no _kickoff mark at all (MLB, unmarked rows)', undefined, true],
];

let failed = 0;
const want = (label, ok, detail) => {
  if (ok) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}${detail ? ' -> ' + detail : ''}`); }
};

for (const [label, kick, renders] of CASES) {
  seen.length = 0;
  const story = buildOddsStory({ oddsOutcome: outcome(kick) });
  const chip = story === null ? null : (seen[0] ?? '(rendered, no chip)');
  want(`story: ${label}`, renders ? chip === 'CHALK/QUIET' : story === null, `got ${chip}`);

  const mv = buildOddsMovement({ oddsOutcome: outcome(kick) });
  want(`movement: ${label}`, renders ? !!mv && mv.textContent.startsWith('Home moneyline') : mv === null,
       mv ? mv.textContent : 'null');
}

// The assembler: a late opening with no other layer leaves nothing to show.
const lateOnly = { debrief: { dramaSealed: null, dramaArc: null, oddsOutcome: outcome(LATE), preGameBrief: null, seriesArc: null, bracketDelta: null } };
const okOnly   = { debrief: { ...lateOnly.debrief, oddsOutcome: outcome(VERIFIED) } };
want('assembler: a late opening alone yields no debrief', buildDebrief(lateOnly) === null);
want('assembler: a verified opening alone still yields one', buildDebrief(okOnly) !== null);

console.log(`\nchecked ${CASES.length} enumerated opening(s) against the real buildOddsStory and buildOddsMovement `
          + `(${CASES.length * 2} cases) plus 2 through buildDebrief. Rows 9 and 10 of the relay census have no feed `
          + `and are not covered here.`);
if (failed) { console.error(`FAIL — ${failed} case(s).`); process.exit(1); }
console.log('PASS');

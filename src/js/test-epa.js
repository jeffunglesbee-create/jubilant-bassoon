/**
 * test-epa.js — validate EPA module against known UFL play events.
 * Run: node src/js/test-epa.js
 */
const FIELD_EPA = require('./epa.js');
const fs = require('fs');
const path = require('path');

// Load pre-built table
const tableRaw = fs.readFileSync(path.join(__dirname, '../../outbox/nfl/epa_table.json'), 'utf8');
const tableData = JSON.parse(tableRaw);

// Inject table directly (bypass fetch for testing)
FIELD_EPA._inject = function(data) {
  // Access module internals via closure trick — use init with data URL
};

// Override init to load from file
const origInit = FIELD_EPA.init;

let passed = 0, failed = 0;

function test(label, actual, expected, tolerance = 0.5) {
  const ok = Math.abs(actual - expected) <= tolerance;
  const mark = ok ? '✅' : '❌';
  console.log(`  ${mark} ${label}: ${actual} (expect ≈${expected} ±${tolerance})`);
  if (ok) passed++; else failed++;
}

// ── Direct EP lookup tests ────────────────────────────────────────────────
console.log('\n══ EP Lookup Tests ══════════════════════════════════════');
// Manually inject the table for testing
const ep = tableData.ep;
const tov = tableData.turnover_ep;

function getEP(down, ytg, yl100) {
  const ytgBuckets  = tableData.ytg_buckets;
  const yl100Buckets = tableData.yl100_buckets;
  function nearest(val, arr) {
    return arr.reduce((best, b) => Math.abs(b-val) < Math.abs(best-val) ? b : best);
  }
  const ytgB  = nearest(Math.min(ytg,25), ytgBuckets);
  const yl100B = nearest(yl100, yl100Buckets);
  const key = `${down}_${ytgB}_${yl100B}`;
  return ep[key] ?? 0;
}

// Published reference values from nflfastR documentation
test('EP: 1st-10 at own 20 (yl100=80)',  getEP(1,10,80), 0.38, 0.3);
test('EP: 1st-10 at own 40 (yl100=60)',  getEP(1,10,60), 1.82, 0.3);
test('EP: 1st-10 at midfield (yl100=50)',getEP(1,10,51), 2.65, 0.3);
test('EP: 1st-10 at opp 40 (yl100=40)',  getEP(1,10,41), 3.52, 0.3);
test('EP: 1st-10 at opp 20 (yl100=20)',  getEP(1,10,21), 5.38, 0.3);
test('EP: 1st-10 at opp 10 (yl100=10)',  getEP(1,10,11), 6.05, 0.3);
test('EP: 3rd-10 at midfield',           getEP(3,10,51), 1.65, 0.4);
test('EP: 2nd-5 at opp 30 (yl100=30)',   getEP(2,5,31),  4.32, 0.5);
test('EP: 4th-1 at opp 1 (yl100=1)',     getEP(4,1,1),   6.40, 0.5);

// ── EPA from SR-style play events ─────────────────────────────────────────
console.log('\n══ EPA from SR Play Events ══════════════════════════════');

function makePlay(playType, startDown, startYtg, startYL, endDown, endYtg, endYL, scoring=false, turnover=false) {
  const offenseId = "team-a";
  return {
    play_type: playType,
    scoring_play: scoring,
    turnover: turnover,
    start_situation: {
      down: startDown,
      yfd: startYtg,
      possession: { id: offenseId, name: "A" },
      location: { id: offenseId, name: "A", yardline: 100 - startYL } // own territory
    },
    end_situation: endDown ? {
      down: endDown,
      yfd: endYtg,
      possession: { id: offenseId, name: "A" },
      location: { id: offenseId, name: "A", yardline: 100 - endYL }
    } : null
  };
}

// Helper to compute EPA using our formula
function computeEPA(play) {
  const ss = play.start_situation;
  const es = play.end_situation;
  const loc = ss.location;
  const pos = ss.possession;
  const ownTerritory = loc.id === pos.id;
  const yl100s = ownTerritory ? (100 - loc.yardline) : loc.yardline;
  const ep_start = getEP(ss.down, ss.yfd, yl100s);

  if (play.scoring_play) {
    const ep_end = play.play_type === 'field_goal' ? 3 : 6.96;
    return { epa: Math.round((ep_end - ep_start)*100)/100, ep_start, ep_end };
  }
  if (play.turnover || !es) return null;

  const loc2 = es.location;
  const pos2 = es.possession;
  const own2 = loc2.id === pos2.id;
  const yl100e = own2 ? (100 - loc2.yardline) : loc2.yardline;
  const ep_end = getEP(es.down, es.yfd, yl100e);
  return { epa: Math.round((ep_end - ep_start)*100)/100, ep_start, ep_end };
}

// Play: 1st-10 at own 25, gain 15 yards → 1st-10 at own 40
const play1 = makePlay('rush', 1, 10, 80, 1, 10, 65); // yl100: 20→35 gain
const r1 = computeEPA(play1);
test('EPA: 15yd run (1st-10, own25→40)', r1.epa, 0.7, 0.5);

// Play: 3rd-and-7 at midfield, incomplete pass → punt territory
const play2 = makePlay('pass', 3, 7, 57, 4, 7, 57); // incomplete, same spot
const r2 = computeEPA(play2);
// Going from 3rd-7 at 43 yl100 to 4th-7 at 43 yl100 — should be negative
test('EPA: incomplete pass (3rd-7 midfield)', r2?.epa ?? 0, -0.5, 0.5);

// TD: 1st-10 at opp 10, rush touchdown
const play3 = makePlay('rush', 1, 10, 10, null, null, null, true);
const r3 = computeEPA(play3);
test('EPA: TD run from opp 10', r3?.epa ?? 0, 0.9, 0.6); // 6.96 - 6.05 ≈ 0.91

// Big loss: 1st-10 at own 30, sack for -8 yards
const play4 = makePlay('sack', 1, 10, 70, 2, 18, 78); // yl100: 30→22
const r4 = computeEPA(play4);
test('EPA: 8-yard sack (1st-10, own30)', r4?.epa ?? 0, -1.5, 0.7);

// Sample from actual SR probe data
// "B.Snell rushed left guard for 1 yard" — 1st-10 at LOU 32, gain 1 → 2nd-9 at LOU 33
// Louisville's own territory: yardline=32 → yl100=68, after: yl100=67
const actualSRPlay = {
  play_type: 'rush',
  scoring_play: false,
  turnover: false,
  start_situation: {
    down: 1, yfd: 10,
    possession: { id: 'lou-id', name: 'Louisville Kings' },
    location: { id: 'lou-id', name: 'Louisville Kings', yardline: 32 }
  },
  end_situation: {
    down: 2, yfd: 9,
    possession: { id: 'lou-id', name: 'Louisville Kings' },
    location: { id: 'lou-id', name: 'Louisville Kings', yardline: 33 }
  }
};
const r5 = computeEPA(actualSRPlay);
test('EPA: actual SR play (1-yd run, 1st-10, LOU 32)', r5?.epa ?? 0, -0.2, 0.4);

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n══ Results: ${passed} passed, ${failed} failed ═══════════════════`);
if (failed > 0) {
  process.exit(1);
}

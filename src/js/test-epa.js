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

// ── EP validation by INVARIANT, not by point-value ──────────────────────────
// This test used to assert exact point values (0.38, 6.05, ...) hand-picked to
// match the POLYNOMIAL fallback surface. But the builder's primary path samples
// nflverse `ep` — which IS nflfastR's model output — and the real EP surface
// differs from those hand anchors at the field-position extremes by more than the
// ±0.3 tolerance (measured 2024: own-20 ≈ 0.69 not 0.38; opp-10 ≈ 5.0 not 6.05).
// The point-anchors were the wrong reference, and asserting them made a CORRECT
// rebuild fail and get discarded (build→test→push, test blocks push).
//
// So validate the properties a real EP surface MUST have — these hold for both the
// empirical and the polynomial table, catch a genuinely broken one, and don't
// rubber-stamp whatever the builder emitted:

function assert(label, cond, detail = '') {
  const mark = cond ? '✅' : '❌';
  console.log(`  ${mark} ${label}${detail ? ': ' + detail : ''}`);
  if (cond) passed++; else failed++;
}

// 1. Completeness — every grid cell present (a missing key computes broken EPA).
const expectedCells = 4 * tableData.ytg_buckets.length * tableData.yl100_buckets.length;
assert('completeness: every grid cell present', Object.keys(ep).length === expectedCells,
  `${Object.keys(ep).length}/${expectedCells}`);

// 2. Field-position monotonicity — 1st-10 EP rises as the offense nears the goal.
let monoOk = true, monoDetail = '';
let last = null;
for (const yl of [...tableData.yl100_buckets].sort((a,b)=>b-a)) { // 96 → 1
  const v = getEP(1,10,yl);
  if (last !== null && v < last - 0.2) { monoOk = false; monoDetail = `yl100=${yl}: ${v} < ${last}`; break; }
  last = v;
}
assert('monotonic: 1st-10 EP rises toward opponent goal', monoOk, monoDetail);

// 3. Down ordering — at a fixed spot, earlier downs are worth more.
const spot = [10, 51]; // ytg, yl100
const byDown = [1,2,3,4].map(d => getEP(d, spot[0], spot[1]));
assert('down ordering: EP(1st) ≥ EP(2nd) ≥ EP(3rd) ≥ EP(4th) at midfield',
  byDown[0] >= byDown[1] && byDown[1] >= byDown[2] && byDown[2] >= byDown[3],
  byDown.join(' ≥ '));

// 4. Sane bounds — a snap is never worth a TD-and-a-half or less than a safety-ish.
const vals = Object.values(ep);
assert('bounds: all EP within [-4, 7.5]', Math.min(...vals) >= -4 && Math.max(...vals) <= 7.5,
  `[${Math.min(...vals)}, ${Math.max(...vals)}]`);

// 5. Reference BANDS from nflfastR literature — wide enough that both the real
//    empirical surface and the polynomial approximation pass, narrow enough to
//    catch a mis-scaled or flipped table. (Own-20 low-positive; midfield ~2;
//    red-zone high; goal-line highest; a snap deep in own end near zero/negative.)
function band(label, val, lo, hi) {
  assert(`${label} in [${lo}, ${hi}]`, val >= lo && val <= hi, String(val));
}
band('EP 1st-10 own 20',   getEP(1,10,80), -0.2, 1.5);
band('EP 1st-10 midfield', getEP(1,10,51),  1.4, 3.2);
band('EP 1st-10 opp 20',   getEP(1,10,21),  3.5, 6.0);
band('EP 1st-10 opp 10',   getEP(1,10,11),  4.0, 6.5);
band('EP 3rd-10 midfield', getEP(3,10,51),  0.6, 2.4);
band('EP 4th-goal opp 1',  getEP(4,1,1),    3.5, 6.8);

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
// 3rd-and-7 incomplete → 4th down, no gain. EPA must be clearly negative; the
// magnitude (~-0.5 poly, ~-1.4 empirical) is surface-dependent, the SIGN is not.
assert('EPA: 3rd-7 incomplete is a real loss', (r2?.epa ?? 0) < -0.2 && (r2?.epa ?? 0) > -2.5,
  String(r2?.epa));

// TD: 1st-10 at opp 10, rush touchdown. EPA = 6.96 − EP_start; EP_start at the
// opp-10 is 4–6.5 across surfaces, so a TD there is worth ~+0.4..+3.0. Band, not
// a point value tied to one surface's EP_start.
const play3 = makePlay('rush', 1, 10, 10, null, null, null, true);
const r3 = computeEPA(play3);
assert('EPA: TD run from opp 10 is positive and plausible',
  (r3?.epa ?? 0) >= 0.3 && (r3?.epa ?? 0) <= 3.2, String(r3?.epa));

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

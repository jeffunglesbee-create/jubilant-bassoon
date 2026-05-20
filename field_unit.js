// field_unit.js — unit tests for FIELD pure utility functions
// Run: node field_unit.js  (from repo root)
// Exit 0 = all pass; 1 = any failures
//
// Functions imported directly from field_utils.js — no new Function() hacks.
// Rule 17: add a test when a function contract is defined or a bug is fixed.
// Rule 19: pure functions live in field_utils.js, not index.html.

const {
  trimToCompleteSentence,
  toImpliedNum,
  espnTeamMatch,
  wxAlert,
  parseMatchweek,
  dramaTier,
  espnPeriodLabel,
} = require('./field_utils.js');

let pass = 0, fail = 0;
function test(label, fn) {
  try { fn(); pass++; console.log('  ✅', label); }
  catch(e) { fail++; console.error('  ❌', label, '—', e.message); }
}
function assert(condition, msg='assertion failed') {
  if (!condition) throw new Error(msg);
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

console.log('\n── FIELD Unit Tests ─────────────────────────────────────\n');

// ── trimToCompleteSentence ─────────────────────────────────────────────────
test('trimToCompleteSentence: clean ending — unchanged', () => {
  assertEqual(trimToCompleteSentence('Hello world.'), 'Hello world.');
  assertEqual(trimToCompleteSentence('Hello world!'), 'Hello world!');
  assertEqual(trimToCompleteSentence('Hello world?'), 'Hello world?');
});

test('trimToCompleteSentence: trims incomplete second sentence', () => {
  const result = trimToCompleteSentence('This is a complete first sentence here. Second fragment without end');
  assertEqual(result, 'This is a complete first sentence here.');
});

test('trimToCompleteSentence: no boundary — returns full text not empty string', () => {
  // Bug fixed May 20: used to return '' → caller fell back to generic static text
  const input = 'A single long fragment with no sentence ending anywhere in it at all';
  assertEqual(trimToCompleteSentence(input), input);
});

test('trimToCompleteSentence: null/undefined/empty passthrough', () => {
  assertEqual(trimToCompleteSentence(''), '');
  assertEqual(trimToCompleteSentence(null), null);
  assertEqual(trimToCompleteSentence(undefined), undefined);
});

// ── toImpliedNum ───────────────────────────────────────────────────────────
test('toImpliedNum: favourite (-150) → >50%', () => {
  const r = toImpliedNum(-150);
  assert(r > 50 && r < 100, `expected 50-100, got ${r}`);
});

test('toImpliedNum: underdog (+130) → <50%', () => {
  const r = toImpliedNum(130);
  assert(r > 0 && r < 50, `expected 0-50, got ${r}`);
});

test('toImpliedNum: even money (+100/-100) → ~50%', () => {
  const pos = toImpliedNum(100), neg = toImpliedNum(-100);
  assert(Math.abs(pos - 50) < 1, `+100 → ~50%, got ${pos}`);
  assert(Math.abs(neg - 50) < 1, `-100 → ~50%, got ${neg}`);
});

test('toImpliedNum: EV/EVEN/PK → exactly 50', () => {
  assertEqual(toImpliedNum('EV'), 50);
  assertEqual(toImpliedNum('EVEN'), 50);
  assertEqual(toImpliedNum('PK'), 50);
});

test('toImpliedNum: null/empty → null', () => {
  assertEqual(toImpliedNum(''), null);
  assertEqual(toImpliedNum(null), null);
});

// ── espnTeamMatch ──────────────────────────────────────────────────────────
test('espnTeamMatch: exact match', () => {
  assert(espnTeamMatch('Knicks', 'Knicks'));
  assert(espnTeamMatch('Warriors', 'Warriors'));
});

test('espnTeamMatch: ESPN full name vs FIELD short name', () => {
  assert(espnTeamMatch('New York Knicks', 'Knicks'));
  assert(espnTeamMatch('Golden State Warriors', 'Warriors'));
});

test('espnTeamMatch: no false positives', () => {
  assert(!espnTeamMatch('Boston Celtics', 'Lakers'));
  assert(!espnTeamMatch('Miami Heat', 'Knicks'));
});

test('espnTeamMatch: null inputs → false', () => {
  assert(!espnTeamMatch(null, 'Knicks'));
  assert(!espnTeamMatch('Knicks', null));
  assert(!espnTeamMatch(null, null));
});

// ── wxAlert ────────────────────────────────────────────────────────────────
test('wxAlert: heavy rain (>5) → alert string mentioning rain', () => {
  const r = wxAlert({ rain: 6, wind: 10, temp: 72 });
  assert(typeof r === 'string' && r.toLowerCase().includes('rain'), `got: ${r}`);
});

test('wxAlert: extreme heat (>100) → alert string', () => {
  const r = wxAlert({ rain: 0, wind: 5, temp: 105 });
  assert(typeof r === 'string' && r.toLowerCase().includes('heat'), `got: ${r}`);
});

test('wxAlert: high wind (>30mph) → alert string', () => {
  const r = wxAlert({ rain: 0, wind: 35, temp: 72 });
  assert(typeof r === 'string' && r.toLowerCase().includes('wind'), `got: ${r}`);
});

test('wxAlert: normal conditions → null', () => {
  assertEqual(wxAlert({ rain: 0, wind: 8, temp: 72 }), null);
});

// ── parseMatchweek ─────────────────────────────────────────────────────────
test('parseMatchweek: extracts number from league string', () => {
  assertEqual(parseMatchweek('Premier League - Matchweek 38'), 38);
  assertEqual(parseMatchweek('Premier League - Matchweek 1'), 1);
});

test('parseMatchweek: returns null for non-matchweek strings', () => {
  assertEqual(parseMatchweek('UEFA Champions League — Final'), null);
  assertEqual(parseMatchweek(null), null);
  assertEqual(parseMatchweek(''), null);
});

// ── dramaTier ──────────────────────────────────────────────────────────────
test('dramaTier: returns tier string for known scores', () => {
  const t = dramaTier(85);
  assert(typeof t === 'string' && t.length > 0, `got: ${t}`);
});

test('dramaTier: low score returns different tier than high', () => {
  const low = dramaTier(20);
  const high = dramaTier(90);
  assert(low !== high, `expected different tiers: low=${low} high=${high}`);
});

// ── espnPeriodLabel ────────────────────────────────────────────────────────
test('espnPeriodLabel: basketball Q labels', () => {
  const r = espnPeriodLabel('Q', 1, '10:00');
  assert(typeof r === 'string' && r.includes('1'), `got: ${r}`);
});

test('espnPeriodLabel: OT label', () => {
  const r = espnPeriodLabel('Q', 5, '2:00');
  assert(typeof r === 'string', `got: ${r}`);
});

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${pass} passed, ${fail} failed ─────────────\n`);
if (fail > 0) process.exit(1);

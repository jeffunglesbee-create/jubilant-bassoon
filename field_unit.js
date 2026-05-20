// field_unit.js — unit tests for FIELD pure functions
// Run: node field_unit.js
// Exit 0 = all pass; 1 = any failures
// Rule 17: add a test when a function's contract is defined or a bug is fixed.

const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

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

// Extract and run a named function from source in isolation
function makeFn(name) {
  const pattern = new RegExp(
    `(function ${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\})`
  );
  const m = html.match(pattern);
  if (!m) throw new Error(`Function ${name} not found`);
  // eslint-disable-next-line no-new-func
  return new Function(`${m[1]}; return ${name}(...arguments)`);
}

console.log('\n── FIELD Unit Tests ────────────────────────────────────────\n');

// ── trimToCompleteSentence ───────────────────────────────────────────────────
const trim = makeFn('trimToCompleteSentence');

test('trimToCompleteSentence: already clean ending — unchanged', () => {
  assertEqual(trim('Hello world.'), 'Hello world.');
  assertEqual(trim('Hello world!'), 'Hello world!');
  assertEqual(trim('Hello world?'), 'Hello world?');
});

test('trimToCompleteSentence: trims incomplete second sentence', () => {
  // First sentence must be ≥30 chars to pass the length floor
  const result = trim('This is a complete first sentence here. Second fragment without end');
  assertEqual(result, 'This is a complete first sentence here.');
});

test('trimToCompleteSentence: no boundary — returns full text (not empty string)', () => {
  // Bug fixed May 20: used to return '' → caller fell back to generic static text
  // Europa League final was getting "Premier League fixture" blurb because of this
  const input = 'A single long fragment with no sentence ending anywhere in it at all';
  assertEqual(trim(input), input);
});

test('trimToCompleteSentence: null/undefined/empty passthrough', () => {
  assertEqual(trim(''), '');
  assertEqual(trim(null), null);
  assertEqual(trim(undefined), undefined);
});

// ── toImpliedNum ─────────────────────────────────────────────────────────────
// Returns 0-100 (percentage), not 0-1 decimal
const toImpl = makeFn('toImpliedNum');

test('toImpliedNum: favourite (-150) → >50%', () => {
  const r = toImpl(-150);
  assert(r > 50 && r < 100, `expected 50-100, got ${r}`);
});

test('toImpliedNum: underdog (+130) → <50%', () => {
  const r = toImpl(130);
  assert(r > 0 && r < 50, `expected 0-50, got ${r}`);
});

test('toImpliedNum: even money (+100/-100) → ~50%', () => {
  const pos = toImpl(100), neg = toImpl(-100);
  assert(Math.abs(pos - 50) < 1, `+100 should be ~50%, got ${pos}`);
  assert(Math.abs(neg - 50) < 1, `-100 should be ~50%, got ${neg}`);
});

test('toImpliedNum: EV/EVEN/PK → exactly 50', () => {
  assertEqual(toImpl('EV'), 50);
  assertEqual(toImpl('EVEN'), 50);
  assertEqual(toImpl('PK'), 50);
});

test('toImpliedNum: null/empty → null', () => {
  assertEqual(toImpl(''), null);
  assertEqual(toImpl(null), null);
});

// ── espnTeamMatch ────────────────────────────────────────────────────────────
const teamMatch = makeFn('espnTeamMatch');

test('espnTeamMatch: exact match', () => {
  assert(teamMatch('Knicks', 'Knicks'));
  assert(teamMatch('Warriors', 'Warriors'));
});

test('espnTeamMatch: ESPN full name vs FIELD short name', () => {
  // ESPN sends "New York Knicks", FIELD stores "Knicks"
  assert(teamMatch('New York Knicks', 'Knicks'));
  assert(teamMatch('Golden State Warriors', 'Warriors'));
});

test('espnTeamMatch: no false positives', () => {
  assert(!teamMatch('Boston Celtics', 'Lakers'));
  assert(!teamMatch('Miami Heat', 'Knicks'));
});

test('espnTeamMatch: null inputs → false', () => {
  assert(!teamMatch(null, 'Knicks'));
  assert(!teamMatch('Knicks', null));
  assert(!teamMatch(null, null));
});

// ── wxAlert ──────────────────────────────────────────────────────────────────
const wxAlert = makeFn('wxAlert');

test('wxAlert: heavy rain (>5in) → alert string', () => {
  const r = wxAlert({ rain: 6, wind: 10, temp: 72, precip: 6 });
  assert(typeof r === 'string' && r.length > 0, `expected string, got ${r}`);
  assert(r.toLowerCase().includes('rain'), `expected rain mention, got: ${r}`);
});

test('wxAlert: extreme heat → alert string', () => {
  const r = wxAlert({ rain: 0, wind: 5, temp: 105 });
  assert(typeof r === 'string' && r.includes('heat'), `got: ${r}`);
});

test('wxAlert: high wind → alert string', () => {
  const r = wxAlert({ rain: 0, wind: 35, temp: 72 });
  assert(typeof r === 'string' && r.includes('wind'), `got: ${r}`);
});

test('wxAlert: normal conditions → null', () => {
  const r = wxAlert({ rain: 0, wind: 8, temp: 72, precip: 0 });
  assertEqual(r, null);
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${pass} passed, ${fail} failed ──────────────\n`);
if (fail > 0) process.exit(1);

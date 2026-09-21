// Rule 90 for boundaryLine. It is the one clause a reader of a FAIL actually
// acts on, so it must name the FIRST boundary that explains the loss and never
// a later one — naming two is naming none.
//
// It imports the module the probe imports, not a copy.
import { createRequire } from 'node:module';
// The mutation harness points this at a COPY so it never writes to the tree.
// Defaults to the real module, so a plain run tests what ships.
const MODULE = process.env.TENNIS_BOUNDARY_MODULE || './tennis-boundary-line.cjs';
const { boundaryLine } = createRequire(import.meta.url)(MODULE);

let failed = 0, checked = 0;
const has = (label, m, needle) => {
  checked++;
  const got = boundaryLine(m);
  if (got.includes(needle)) console.log(`ok    ${label}`);
  else { failed++; console.log(`FAIL  ${label}\n        want to contain: ${needle}\n        got:             ${got}`); }
};
const hasnt = (label, m, needle) => {
  checked++;
  const got = boundaryLine(m);
  if (!got.includes(needle)) console.log(`ok    ${label}`);
  else { failed++; console.log(`FAIL  ${label}\n        must NOT contain: ${needle}\n        got:              ${got}`); }
};

// A page that reached every boundary cleanly. Each case below breaks exactly
// one thing in this, so a wrong branch order shows up as the wrong clause.
const WHOLE = {
  diagRan: true, producerThrew: null,
  feedLiveOutcome: 'ok:42', feedByDateOutcome: 'ok:133',
  rowsBeforeTier: 133, rowsAfterTier: 42, sectionReturned: 42,
  sectionInAllData: true,
};

has('no instrumentation is its own answer, not "never ran"',
  { ...WHOLE, diagRan: 'absent' }, 'no tennis instrumentation');
has('the producer not running is named before any feed outcome',
  { ...WHOLE, diagRan: false, feedLiveOutcome: null }, 'never ran');
has('a throw outranks the feed outcomes',
  { ...WHOLE, producerThrew: 'TypeError: x is not a function' }, 'threw: TypeError');

// THE DISTINCTION THIS PROBE EXISTS TO MAKE. Both feeds returning nothing is a
// day with no tennis when the outcomes say `empty`, and a double failure when
// they say `timeout`. Same zero, opposite meanings.
has('two failing feeds are named as a failure',
  { ...WHOLE, feedLiveOutcome: 'timeout', feedByDateOutcome: 'http:502', rowsBeforeTier: 0 },
  'NEITHER FEED DELIVERED');
hasnt('...and a genuinely empty day is NOT called a failure',
  { ...WHOLE, feedLiveOutcome: 'empty', feedByDateOutcome: 'empty', rowsBeforeTier: 0 },
  'NEITHER FEED DELIVERED');
has('...and says so plainly instead',
  { ...WHOLE, feedLiveOutcome: 'empty', feedByDateOutcome: 'empty', rowsBeforeTier: 0 },
  'both feeds returned no rows');
// One feed alive is not a double failure, whatever the other did.
hasnt('one good feed and one timeout is not NEITHER',
  { ...WHOLE, feedLiveOutcome: 'ok:42', feedByDateOutcome: 'timeout', rowsBeforeTier: 0 },
  'NEITHER FEED DELIVERED');

has('the tier filter is named when it eats every row',
  { ...WHOLE, rowsAfterTier: 0, sectionReturned: 0 }, 'TIER FILTER dropped all 133');
has('the mapping is named when the tier filter passed rows through',
  { ...WHOLE, sectionReturned: 0 }, 'row MAPPING dropped all 42');
has('a section that never reached allData blames the merge',
  { ...WHOLE, sectionInAllData: false }, 'the async merge dropped it');
has('a section that DID reach allData blames the render',
  WHOLE, 'the RENDER dropped it, not the producer');

// ORDER, stated as its own case. With everything broken at once the earliest
// boundary wins: a reader given four causes has none.
has('the FIRST boundary wins when several are broken',
  { ...WHOLE, producerThrew: 'Error: boom', rowsBeforeTier: 0, rowsAfterTier: 0, sectionReturned: 0, sectionInAllData: false },
  'threw: Error: boom');
hasnt('...and the later ones are not also named',
  { ...WHOLE, producerThrew: 'Error: boom', rowsBeforeTier: 0, rowsAfterTier: 0, sectionReturned: 0, sectionInAllData: false },
  'TIER FILTER');

// A null sectionInAllData is neither true nor false and must not be read as
// either — the getter returns null when allData is unreadable.
hasnt('an unreadable allData is not reported as a merge failure',
  { ...WHOLE, sectionInAllData: null }, 'async merge dropped it');
hasnt('...nor as a render failure',
  { ...WHOLE, sectionInAllData: null }, 'RENDER dropped it');

console.log(`\n${checked - failed}/${checked} checks passed`);
console.log('COVERAGE: boundaryLine only — the branch order and the empty-vs-failed');
console.log('distinction. It does NOT read a manifest, run the probe, or verify that');
console.log('the page publishes these values correctly.');
process.exit(failed ? 1 : 0);

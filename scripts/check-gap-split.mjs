// Rule 90 for splitGap. It decides which of the eight "missing" sections are a
// defect, so every way of NOT being one has to stay distinguishable.
import { createRequire } from 'node:module';
const MOD = process.env.GAP_SPLIT_MODULE || './gap-split.cjs';
const { splitGap } = createRequire(import.meta.url)(MOD);

let bad = 0, n = 0;
const eq = (label, got, want) => { n++;
  if (JSON.stringify(got) === JSON.stringify(want)) console.log(`ok    ${label}`);
  else { bad++; console.log(`FAIL  ${label}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`); } };

const C = [
  { label: 'NHL', games: 6 },
  { label: 'La Liga', games: 0 },
  { label: 'Serie A', games: null },
];

eq('A SECTION WITH GAMES THAT DID NOT RENDER IS THE DEFECT',
  splitGap(['NHL'], C).dropped, [{ label: 'NHL', games: 6 }]);
eq('a section with zero games is NOT a defect — renderAll returns "" for it',
  splitGap(['La Liga'], C).empty, ['La Liga']);
eq('...and it is not counted as dropped',
  splitGap(['La Liga'], C).dropped, []);
eq('a null count is unknown, never empty',
  splitGap(['Serie A'], C).unknown, ['Serie A']);
eq('a label absent from the counts is unknown, never empty',
  splitGap(['Ligue 1'], C).unknown, ['Ligue 1']);
eq('...and an unknown is not silently a defect either',
  splitGap(['Ligue 1'], C).dropped, []);

eq('the three buckets partition the input',
  (() => { const r = splitGap(['NHL', 'La Liga', 'Serie A', 'Ligue 1'], C);
           return r.dropped.length + r.empty.length + r.unknown.length; })(), 4);

// null, not an empty split. An empty split reads as "checked, no defect"; null
// says the check could not run — the distinction this whole file is about.
eq('an unreadable model yields null, not a clean bill', splitGap(['NHL'], null), null);
eq('an unreadable gap yields null too', splitGap(null, C), null);
eq('an empty gap is a real empty split, not null',
  splitGap([], C), { dropped: [], empty: [], unknown: [] });

console.log(`\n${n - bad}/${n} checks passed`);
console.log('COVERAGE: splitGap only. It does NOT read a manifest, run the probe, or');
console.log('verify that the page reports sportsGameCounts correctly.');
process.exit(bad ? 1 : 0);

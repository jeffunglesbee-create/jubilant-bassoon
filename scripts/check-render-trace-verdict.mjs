// Rule 90 for traceVerdicts. It is the thing that finally names WHERE each
// missing section was lost, so every way of being lost has to stay distinct.
import { createRequire } from 'node:module';
const MOD = process.env.RENDER_TRACE_MODULE || './render-trace-verdict.cjs';
const { traceVerdicts, verdictCensus } = createRequire(import.meta.url)(MOD);

let bad = 0, n = 0;
const eq = (label, got, want) => { n++;
  if (JSON.stringify(got) === JSON.stringify(want)) console.log(`ok    ${label}`);
  else { bad++; console.log(`FAIL  ${label}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`); } };

// Shaped after the 2026-09-22 08:49Z manifest: NHL 8 games, WNBA 2, NFL 1, all
// in allData, none in the DOM, while Baseball (MLB) rendered from the same
// model in the same pass.
const TRACE = {
  outcome: 'rendered',
  modelSections: [
    { label: 'Baseball (MLB)', sport: 'mlb', games: 12 },
    { label: 'NHL', sport: 'NHL', games: 8 },
    { label: 'WNBA', sport: 'WNBA', games: 2 },
    { label: 'NFL', sport: 'NFL', games: 1 },
    { label: 'La Liga', sport: 'La Liga', games: 0 },
    { label: 'Ligue 1', sport: 'Ligue 1', games: null },
    { label: 'Serie A', sport: 'Serie A', games: 3 },
  ],
  sections: [
    { label: 'Baseball (MLB)', sport: 'mlb', games: 12, emitted: true, chars: 40123 },
    { label: 'NHL', sport: 'NHL', games: 8, emitted: false, chars: 0 },
    { label: 'WNBA', sport: 'WNBA', games: 2, emitted: true, chars: 5200 },
    { label: 'La Liga', sport: 'La Liga', games: 0, emitted: false, chars: 0 },
    { label: 'Ligue 1', sport: 'Ligue 1', games: null, emitted: false, chars: 0 },
    { label: 'Serie A', sport: 'Serie A', games: 3, emitted: false, chars: 0 },
  ],
};
const v = (label) => traceVerdicts([label], TRACE)[0];

eq('A SECTION THE RENDER ITERATED, WITH GAMES, THAT EMITTED NOTHING IS THE DEFECT',
  v('NHL'), { label: 'NHL', verdict: 'dropped-at-render', games: 8, chars: 0 });
eq('...and so is a second one, so the verdict is not pinned to one label',
  v('Serie A'), { label: 'Serie A', verdict: 'dropped-at-render', games: 3, chars: 0 });
eq('a section that EMITTED and is still absent is a different defect, downstream of the join',
  v('WNBA'), { label: 'WNBA', verdict: 'emitted-but-absent', games: 2, chars: 5200 });
eq('a section with zero games emitted nothing correctly',
  v('La Liga'), { label: 'La Liga', verdict: 'empty-by-design', games: 0, chars: 0 });
eq('an unreadable game count is unknown, never empty-by-design',
  v('Ligue 1'), { label: 'Ligue 1', verdict: 'unknown-count', games: null, chars: 0 });
eq('a section in the model the render read but not in what it iterated was filtered out',
  v('NFL'), { label: 'NFL', verdict: 'filtered-out', games: null, chars: null });
eq('a section in neither list was never iterated — it entered allData after the pass',
  v('AFL'), { label: 'AFL', verdict: 'not-iterated', games: null, chars: null });

eq('every missing section gets exactly one verdict',
  traceVerdicts(['NHL', 'WNBA', 'NFL', 'AFL'], TRACE).length, 4);
eq('the census counts them',
  verdictCensus(traceVerdicts(['NHL', 'Serie A', 'NFL', 'AFL'], TRACE)),
  { 'dropped-at-render': 2, 'filtered-out': 1, 'not-iterated': 1 });

// null, not []. An empty list reads as "checked, nothing unaccounted for";
// null says the verdict could not be reached — the distinction this whole
// instrumentation chain is about.
eq('no trace at all yields null, not a clean bill', traceVerdicts(['NHL'], null), null);
eq('a trace missing its sections array yields null',
  traceVerdicts(['NHL'], { outcome: 'rendered', modelSections: [] }), null);
eq('a trace missing its modelSections array yields null',
  traceVerdicts(['NHL'], { outcome: 'rendered', sections: [] }), null);
eq('an unreadable gap yields null too', traceVerdicts(null, TRACE), null);
eq('an empty gap is a real empty verdict list, not null', traceVerdicts([], TRACE), []);
eq('a census of nothing is null, not an empty census', verdictCensus(null), null);

console.log(`\n${n - bad} of ${n} passed.`);
console.log('COVERAGE: traceVerdicts’ six-way decision and its null guards. It does');
console.log('NOT cover whether the page publishes the trace, nor whether the trace is');
console.log('the one from the render that produced the DOM being compared.');
process.exit(bad ? 1 : 0);

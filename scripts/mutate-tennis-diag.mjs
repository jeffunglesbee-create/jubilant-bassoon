// Rule 90 for the tennis instrumentation assertions (A-TENNIS-14, A-TENNIS-15).
//
// THE MUTATION IS APPLIED TO A COPY OF THE ARTIFACT, not to src/legacy/field.js.
// The first version of this harness mutated field.js and re-ran
// `scripts/sync-source.mjs`, which REFUSED every time: while Task 1 is
// uncommitted, index.html's script block matches neither the mutated field.js
// nor the last committed index.html, which is exactly what the direct-edit
// guard exists to catch. The sync's output was captured and discarded, so the
// harness printed NOT CAUGHT four times for mutations that were never applied.
//
// A verdict from a mutation that did not happen is worse than no test — it is a
// green light with nothing behind it. This version cannot make that mistake,
// because `smoke.js` takes its artifact path as argv[2] and the mutated copy is
// a real file on disk that is checked for having actually changed.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ARTIFACT = 'index.html';
const original = readFileSync(ARTIFACT, 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'tennis-mut-'));

// BOTH STREAMS. smoke.js writes its failures to STDERR, so a reader that looks
// only at stdout sees a clean run for a mutation that went red — which is how
// this harness reported `0 of 6 caught` while printing six red assertions to
// the terminal it was running in. The mutations were landing; the reader was
// blind. Second harness defect in one hour, same shape both times: a verdict
// about something the harness never actually observed.
const smoke = (path) => {
  try {
    const out = execFileSync(process.execPath, ['smoke.js', path],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, red: redLabels(out) };
  } catch (e) {
    return { ok: false, red: redLabels(`${e.stdout || ''}\n${e.stderr || ''}`) };
  }
};
const redLabels = (out) => out.split('\n')
  .filter(l => l.includes('❌'))
  .map(l => (l.match(/❌\s*(\S+)/) || [])[1])
  .filter(Boolean);

const base = smoke(ARTIFACT);
if (!base.ok || base.red.length) {
  console.log(`FAIL — smoke is already red on the unmutated artifact: ${base.red.join(', ')}`);
  process.exit(1);
}
console.log(`baseline: smoke passes on ${ARTIFACT}\n`);

const MUTATIONS = [
  ['D1 a non-200 reads as an empty feed again',
   "      if(!res.value?.ok) return { rows: [], outcome: `http:${res.value?.status ?? '?'}` };",
   "      if(!res.value?.ok) return { rows: [], outcome: 'empty' };",
   'A-TENNIS-14',
   'THE ORIGINAL DEFECT: a 404 and a day with no tennis become the same fact, which is what left five days of probe reds with no diagnostic'],

  ['D2 a timeout is filed as a generic rejection',
   "        return { rows: [], outcome: n === 'TimeoutError' ? 'timeout' : `rejected:${n}` };",
   "        return { rows: [], outcome: `rejected:${n}` };",
   'A-TENNIS-14',
   'the 5s AbortSignal.timeout is this CC-CMD’s leading suspect; merging it into rejected:TypeError hides the one reading that would name it'],

  ['D3 an unparseable body reads as empty',
   "      catch(_e){ return { rows: [], outcome: 'unparseable' }; }",
   "      catch(_e){ return { rows: [], outcome: 'empty' }; }",
   'A-TENNIS-14',
   'a 200 whose body is not JSON is not an empty feed'],

  ['D4 the diag channel moves behind proof mode',
   'window._fieldTennisDiag = { ran: false };',
   'window.__FIELD_PROOF_TENNIS__ = { ran: false };',
   'A-TENNIS-15',
   'THE ONE THAT LOOKS RIGHT AND REPORTS NOTHING: __FIELD_PROOF__ is built only inside if (_proofMode), so the probe loading the plain URL would read undefined'],

  ['D5 the post-tier count is never published',
   '    _tennisDiag({ rowsAfterTier: rows.length });',
   '    void rows;',
   'A-TENNIS-15',
   'without it the manifest cannot tell a tier filter that dropped everything from a feed that returned nothing'],

  ['D7 a section where NOTHING qualifies is split anyway — the shipped defect',
   '    const _splitBySignal = _overThreshold && _featured.length > 0;',
   '    const _splitBySignal = _overThreshold;',
   'A-FTO-3',
   'THE ONE THIS FIX IS FOR: 42 tennis matches, no curated ranks, nobody followed, so every game went to .overflow-strip.collapsed and the section rendered its own "42 matches" header over an empty games-list'],

  ['D8 the featured set is recomputed instead of reused, so the guard reads a different list',
   '    const cardGames = _splitBySignal ? _featured : games;',
   '    const cardGames = _splitBySignal ? games.filter(g => isFeaturedTierGame(g, MY_TEAMS)) : games;',
   'A-FTO-3',
   'a guard that tests one list while the render uses another is the vacuous-assertion shape, and the filter would run a third time per section for nothing'],

  ['D9 the per-section array collapses back into one expression',
   '  const _renderAllHTML = _sectionHTML.filter(Boolean).join("");',
   '  const _renderAllHTML = filtered.map(() => "").filter(Boolean).join("");',
   'A-TRACE-1',
   'THE STATE THE TRACE EXISTS TO END: the map result is thrown away in the same expression, so nothing can say WHICH section produced nothing — which is why the gap has been a count for ten days'],

  ['D10 `emitted` is recorded without consulting the section output',
   "          emitted: typeof html === 'string' && html.length > 0,",
   '          emitted: true,',
   'A-TRACE-1',
   'a section that produced nothing would report as emitted, and the trace would agree with the defect instead of naming it'],

  ['D11 the trace drops the filters',
   '      activeFilter: (typeof activeFilter !== \'undefined\') ? activeFilter : null,',
   '      activeFilter: null,',
   'A-TRACE-2',
   'a myTeams or freeOnly filter can legitimately empty a section; a trace that cannot say so invites blaming the renderer for a filter doing its job'],

  ['D12 the bail-out exit stops stamping, so it leaves the previous render’s trace',
   "  if(!allData){ _stampRenderTrace('no-alldata'); return; }",
   '  if(!allData){ return; }',
   'A-TRACE-3',
   'THE STALE-TRACE TRAP: a render that bailed leaves the LAST render’s object in place with its own `at`, and a reader has no way to tell a current trace from a copy of an older one — the source-versus-copy substitution this whole chain exists to stop'],

  ['D13 the model’s own section list is dropped from the trace',
   '      modelSections: Array.isArray(sports) ? sports.map(desc) : [],',
   '      modelSections: [],',
   'A-TRACE-4',
   'a section lost BEFORE the map vanishes from the trace exactly as it vanishes from the DOM, so the trace agrees with the defect; render-trace-verdict.cjs would then file the entire gap as not-iterated'],

  ['D6 the sectionInAllData getter becomes a value read too early',
   "Object.defineProperty(window._fieldTennisDiag, 'sectionInAllData', {",
   "Object.defineProperty(window._fieldTennisDiag, 'sectionInAllDataSnapshot', {",
   'A-TENNIS-15',
   'the merge happens in the CALLER, after fetchTennisLive returns — a value captured at return time reports a thing that has not happened'],
];

let caught = 0;
for (const [name, anchor, repl, expect, why] of MUTATIONS) {
  const hits = original.split(anchor).length - 1;
  if (hits !== 1) {
    console.log(`FAIL       ${name}\n            anchor matched ${hits} times, expected 1 — NOTHING MUTATED.`);
    continue;
  }
  const mutated = original.replace(anchor, repl);
  if (mutated === original) {
    console.log(`FAIL       ${name}\n            artifact unchanged — NOTHING MUTATED.`);
    continue;
  }
  const path = join(dir, `mutant-${expect}-${caught}-${Math.random().toString(36).slice(2, 8)}.html`);
  writeFileSync(path, mutated);
  // The copy is re-read from disk, so a write that did not land cannot pass as
  // a mutation that did.
  if (readFileSync(path, 'utf8') === original) {
    console.log(`FAIL       ${name}\n            the written copy is identical — NOTHING MUTATED.`);
    continue;
  }
  const r = smoke(path);
  const hit = r.red.includes(expect);
  console.log(`${hit ? 'CAUGHT    ' : 'NOT CAUGHT'} ${name}\n            expected ${expect} red; red: ${r.red.join(', ') || 'none'}\n            (${why})`);
  if (hit) caught++;
}

console.log(`\n${caught} of ${MUTATIONS.length} mutations caught.`);
console.log('COVERAGE: A-TENNIS-14/15, A-FTO-3 and A-TRACE-1..4 — 7 of the 1055 smoke');
console.log('assertions. It does NOT cover the other 1048, and it proves nothing about');
console.log('whether the instrumented values are CORRECT at runtime: that is the live');
console.log('probe’s job, not this one’s.');
process.exit(caught === MUTATIONS.length ? 0 : 1);

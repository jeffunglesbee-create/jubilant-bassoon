#!/usr/bin/env node
// Rule 90 harness for scripts/check-probe-meta-read.mjs.
//
// Each mutation breaks one clause of the module (or of the probe's wiring) in a COPY of the file, points the check at the
// copy through META_SRC / PROBE_SRC, and requires the check to go red on that clause's own FAIL line. The real files are
// never written. The check also needs a browser, so PLAYWRIGHT_MODULE is passed through unchanged.
//
// A mutation counts as CAUGHT only when the check exits non-zero AND prints a FAIL line AND that line names the clause.
// An anchor that is not unique, a mutation that did not apply, or a crash with no FAIL line is a harness defect and is
// reported as one (NOT CAUGHT with nothing mutated is worse than no test).
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const META = 'scripts/probe-meta-read.cjs';
const PROBE = 'forward_window_probe.js';
const MUT_META = 'scripts/__mut_probe_meta_read__.cjs';
const MUT_PROBE = 'scripts/__mut_probe_meta_probe__.js';

const RETRY_LINE = 'if (!NAVIGATION_LOST.test(msg) || attempt >= attempts) throw e;';

const MUTATIONS = [
  { name: 'M1  a lost context is never retried (the probe as it was)',
    file: 'meta', anchor: RETRY_LINE, replace: 'throw e;',
    expect: 'A2: a context lost at jsonValue is retried' },
  { name: 'M2  every error is retried, so a 30 s timeout is paid three times',
    file: 'meta', anchor: RETRY_LINE, replace: 'if (attempt >= attempts) throw e;',
    expect: 'A5: a timeout is NOT retried' },
  { name: 'M3  one retry too many',
    file: 'meta', anchor: RETRY_LINE, replace: 'if (!NAVIGATION_LOST.test(msg) || attempt > attempts) throw e;',
    expect: 'A4: three losses in a row end in the error' },
  { name: 'M4  a survived loss is not recorded',
    file: 'meta', anchor: "state.readFailures.push({ attempt, stage: 'meta', error: msg.slice(0, 200) });", replace: 'void 0;',
    expect: 'A2: the survived loss is kept in readFailures' },
  { name: 'M5  the loss is recorded somewhere the manifest does not read',
    file: 'meta', anchor: 'state.readFailures.push(', replace: '[].push(',
    expect: 'A2: the survived loss is kept in readFailures' },
  { name: 'M6  the loss is recorded under the wrong stage',
    file: 'meta', anchor: "stage: 'meta'", replace: "stage: 'read'",
    expect: 'A2: the survived loss is kept in readFailures' },
  { name: 'M7  the attempt number is not recorded',
    file: 'meta', anchor: 'push({ attempt, stage', replace: 'push({ attempt: 0, stage',
    expect: 'A4: the two retried losses are recorded' },
  { name: 'M8  the timeout is dropped from the options',
    file: 'meta', anchor: '{ timeout: timeoutMs }', replace: '{}',
    expect: 'A8: waitForFunction gets the predicate' },
  { name: 'M9  the options are passed as the predicate\'s argument (as the probe once did)',
    file: 'meta', anchor: 'page.waitForFunction(META_PREDICATE, null, { timeout: timeoutMs })', replace: 'page.waitForFunction(META_PREDICATE, { timeout: timeoutMs })',
    expect: 'A8: waitForFunction gets the predicate' },
  { name: 'M10 the default timeout is not 30 s',
    file: 'meta', anchor: 'timeoutMs = 30000', replace: 'timeoutMs = 1000',
    expect: 'A8: waitForFunction gets the predicate' },
  { name: 'M11 the handle is returned unawaited, so its rejection escapes the retry',
    file: 'meta', anchor: 'return await handle.jsonValue();', replace: 'return handle.jsonValue();',
    expect: 'A2: a context lost at jsonValue is retried' },
  { name: 'M12 the lost-context pattern matches nothing real',
    file: 'meta', anchor: 'const NAVIGATION_LOST = /Execution context was destroyed/;', replace: 'const NAVIGATION_LOST = /Execution context was destroyedX/;',
    expect: 'A2: a context lost at jsonValue is retried' },
  { name: 'M13 the lost-context pattern also matches a timeout',
    file: 'meta', anchor: 'const NAVIGATION_LOST = /Execution context was destroyed/;', replace: 'const NAVIGATION_LOST = /Execution context was destroyed|Timeout/;',
    expect: 'A5: a timeout is NOT retried' },
  { name: 'M14 the schema is read from the wrong field',
    file: 'meta', anchor: 'schema: m.schema_version,', replace: 'schema: m.schema,',
    expect: 'A9: the metadata is mapped' },
  { name: 'M15 a missing window_dates becomes an empty list',
    file: 'meta', anchor: 'window_dates: m.window_dates || null,', replace: 'window_dates: m.window_dates || [],',
    expect: 'A9: a missing window_dates and games_found_by_date are null' },
  { name: 'M16 a missing games_found_by_date becomes an empty object',
    file: 'meta', anchor: 'by_date: m.games_found_by_date || null,', replace: 'by_date: m.games_found_by_date || {},',
    expect: 'A9: a missing window_dates and games_found_by_date are null' },
  { name: 'M17 a page without metadata still reads as accepted',
    file: 'meta', anchor: '} : false;', replace: '} : { schema: null, for_date: null, window_dates: null, by_date: null };',
    expect: 'A9: no _plVerify -> falsy' },
  { name: 'M18 a retried wait waits forever',
    file: 'meta', anchor: '{ timeout: timeoutMs }', replace: '{ timeout: attempt === 1 ? timeoutMs : 0 }',
    expect: 'A10: a lost context followed by a timeout' },
  { name: 'M19 a retried wait gets a 5 s timeout',
    file: 'meta', anchor: '{ timeout: timeoutMs }', replace: '{ timeout: attempt === 1 ? timeoutMs : 5000 }',
    expect: 'A10: a lost context followed by a timeout' },
  { name: 'M20 any error is retried once a loss has happened',
    file: 'meta', anchor: RETRY_LINE, replace: 'if ((attempt === 1 && !NAVIGATION_LOST.test(msg)) || attempt >= attempts) throw e;',
    expect: 'A10: a lost context followed by a timeout' },
  { name: 'M21 the lost-context pattern is the single word "destroyed"',
    file: 'meta', anchor: 'const NAVIGATION_LOST = /Execution context was destroyed/;', replace: 'const NAVIGATION_LOST = /destroyed/;',
    expect: 'A6c: only the exact phrase' },
  { name: 'M22 the lost-context pattern is "Execution context"',
    file: 'meta', anchor: 'const NAVIGATION_LOST = /Execution context was destroyed/;', replace: 'const NAVIGATION_LOST = /Execution context/;',
    expect: 'A6c: only the exact phrase' },
  { name: 'M23 the recorded error is a constant, not what was thrown',
    file: 'meta', anchor: 'error: msg.slice(0, 200)', replace: "error: 'Execution context was destroyed'",
    expect: 'A2: the survived loss is kept in readFailures' },
  { name: 'M24 the recorded error is cut to 55 characters',
    file: 'meta', anchor: 'error: msg.slice(0, 200)', replace: 'error: msg.slice(0, 55)',
    expect: 'A2: the survived loss is kept in readFailures' },
  { name: 'M25 the second recorded loss has the wrong stage',
    file: 'meta', anchor: "stage: 'meta'", replace: "stage: attempt === 1 ? 'meta' : 'x'",
    expect: 'A4: the two retried losses are recorded' },
  { name: 'W1  the probe does not use the module',
    file: 'probe', anchor: "const { readFieldDataMeta } = require('./scripts/probe-meta-read.cjs');\n", replace: '',
    expect: 'C: the probe requires the module' },
  { name: 'W2  the probe reads the metadata itself again, single-shot',
    file: 'probe', anchor: 'await readFieldDataMeta(page, STATE).catch(e => {',
    replace: 'await page.waitForFunction(() => window._plVerify.fieldDataMeta(), null, { timeout: 30000 }).then(h => h.jsonValue()).catch(e => {',
    expect: 'C: the first read goes through readFieldDataMeta(page, STATE)' },
  { name: 'W3  a read that still fails is no longer kept as metaError',
    file: 'probe', anchor: '    STATE.metaError = String(e && e.message || e).slice(0, 300);\n', replace: '',
    expect: 'C: a read that still fails is kept as metaError' },
];

let bad = 0;
const cleanup = () => { for (const f of [MUT_META, MUT_PROBE]) { try { unlinkSync(f); } catch { /* not created */ } } };
process.on('exit', cleanup);

for (const m of MUTATIONS) {
  const orig = m.file === 'meta' ? META : PROBE;
  const mut = m.file === 'meta' ? MUT_META : MUT_PROBE;
  const before = readFileSync(orig, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) { bad++; console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED — harness defect, not a result.`); continue; }
  const after = before.replace(m.anchor, () => m.replace);
  if (after === before) { bad++; console.error(`  NO EFFECT  ${m.name}`); continue; }
  writeFileSync(mut, after);
  const env = { ...process.env,
    META_SRC: m.file === 'meta' ? MUT_META : META,
    PROBE_SRC: m.file === 'probe' ? MUT_PROBE : PROBE };
  let out = '', code = 0;
  try { out = execFileSync('node', ['scripts/check-probe-meta-read.mjs'], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  finally { cleanup(); }
  const red = out.split('\n').filter((l) => /^\s*FAIL {2}/.test(l));
  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          the check still passed.`); }
  else if (!red.length) { bad++; console.error(`  CRASH  ${m.name}\n          exit ${code} with no FAIL line (a harness or syntax error, not a catch). Output tail:\n${out.slice(-500)}`); }
  else if (!red.some((l) => l.includes(m.expect))) { bad++; console.error(`  WRONG REASON  ${m.name}\n          no FAIL line mentioned "${m.expect}". Red lines:\n${red.join('\n')}`); }
  else console.log(`  caught  ${m.name}\n          by "${m.expect}" (${red.length} red)`);
}

// The unmutated check must be green, or every "caught" above could be the check failing for its own reasons.
let base = 0;
try { execFileSync('node', ['scripts/check-probe-meta-read.mjs'], { stdio: 'ignore' }); } catch (e) { base = e.status ?? 1; }
if (base) { bad++; console.error('  BASELINE  the unmutated check is red, so no catch above means anything.'); }
else console.log('  baseline  the unmutated check is green');

console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-probe-meta-read.mjs; each asserted its anchor unique and its text change applied; the real files were not written`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');

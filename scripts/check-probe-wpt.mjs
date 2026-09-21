// Every browser probe that loads the deployed page must pass ?wpt.
//
// WHY. ?wpt sets field_setup_done, which skips the first-visit My Services
// modal (field.js:42-53, PM-26-A / Rule 54). Every headless run is a first
// visit, so a probe without it works with the modal on screen for its whole
// life — screenshots included.
//
// MEASURED, 2026-09-21. The tennis probe's section screenshot at 21:42Z showed
// "Tennis Channel", "MLB Network" and a STREAMING SUBSCRIPTIONS heading. Read
// as a picture it said the Tennis element was streaming chrome, which is wrong
// and sent this session looking for a second producer. It was the modal. The
// DOM anatomy read six minutes later showed the real section. The screenshot
// was the misleading half of the evidence and the structured read was the
// reliable one — which is the argument for BOTH, not for dropping either.
//
// Ten probes already passed ?wpt. tennis_live_probe.js and odds_line_probe.js
// did not, and nothing said so.
import { readdirSync, readFileSync } from 'node:fs';

// An opt-out for a probe whose subject IS the modal. It has to be written down
// in the file, so the exception is visible where the decision lives rather than
// as a list in here that drifts from the probes it names.
const OPT_OUT = 'probe-wpt: intentional — this probe tests the first-visit path';

/**
 * Which offenders the baseline does not already admit.
 *
 * A NAMED FUNCTION WITH A SELF-TEST, not an inline filter, because the inline
 * form could be replaced with `[]` and nothing would notice: on a day when no
 * probe is new the check is green either way, so the ratchet can be turned into
 * a pass-everything wildcard undetectably. That is the abuse
 * docs/probe-wpt-baseline.json's header warns about, and mutation W4 proved the
 * warning was not enforced.
 */
export function newOffenders(offenders, baseline) {
  const known = new Set(baseline ?? []);
  return (offenders ?? []).filter(f => !known.has(f));
}

if (process.argv.includes('--self-test')) {
  let bad = 0, n = 0;
  const eq = (label, got, want) => { n++;
    if (JSON.stringify(got) === JSON.stringify(want)) console.log(`ok    ${label}`);
    else { bad++; console.log(`FAIL  ${label} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); } };

  eq('a baselined offender is not new', newOffenders(['a.js'], ['a.js']), []);
  eq('AN UNBASELINED OFFENDER IS NEW', newOffenders(['a.js', 'b.js'], ['a.js']), ['b.js']);
  eq('every offender is new when the baseline is empty', newOffenders(['a.js'], []), ['a.js']);
  eq('a missing baseline does not swallow offenders', newOffenders(['a.js'], null), ['a.js']);
  eq('no offenders yields none', newOffenders([], ['a.js']), []);
  // A baseline naming a file that is no longer an offender must not make a real
  // new one disappear.
  eq('a stale baseline entry does not mask a new offender', newOffenders(['b.js'], ['a.js']), ['b.js']);

  console.log(`\n${n - bad}/${n} checks passed`);
  console.log('COVERAGE: newOffenders only. It does NOT read the probes, the baseline');
  console.log('file, or run the scan.');
  process.exit(bad ? 1 : 0);
}

const files = readdirSync('.').filter(f => /_probe\.js$/.test(f));
let failed = 0, checked = 0, exempt = 0, noNav = 0;
const offenders = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  // Only probes that actually navigate to the site. A probe that only fetches
  // the relay has no modal to skip, and failing it would be a red nobody can
  // clear — the shape this repo family keeps re-learning.
  if (!/page\.goto\(/.test(src)) { noNav++; continue; }
  if (src.includes(OPT_OUT)) { exempt++; continue; }
  checked++;
  // `?wpt`, `&wpt`, and `'wpt=1'` appended with a computed separator are all
  // correct — field.js reads it with `new URLSearchParams(location.search)
  // .has('wpt')`, which does not care which one built the string.
  //
  // THE FIRST VERSION OF THIS LINE MATCHED `\?wpt` ONLY and reported
  // nfl_standings_render_probe.js as an offender. That file does
  // `BASE + (BASE.includes('?') ? '&' : '?') + 'wpt=1'` — correct, and flagged.
  // A detector whose first run produces a wrong verdict on a real file is the
  // third harness defect in this session; it was caught by checking one name
  // against the earlier grep rather than by trusting the list.
  if (!/['"&?]wpt\b/.test(src)) { failed++; offenders.push(f); }
}

// THE RATCHET. See docs/probe-wpt-baseline.json for why the seventeen already
// here are recorded rather than fixed blind.
let baseline = [];
try { baseline = JSON.parse(readFileSync('docs/probe-wpt-baseline.json', 'utf8')).known_without_wpt || []; }
catch (_e) { console.log('FAIL  docs/probe-wpt-baseline.json is unreadable — the ratchet cannot be applied'); process.exit(1); }

const isNew = newOffenders(offenders, baseline);
// A baseline entry that no longer offends is reported and does NOT fail, so
// fixing one is never punished.
const stale = baseline.filter(f => !offenders.includes(f));

for (const f of isNew) console.log(`FAIL  ${f} navigates to the page without ?wpt and is not in the baseline`);
for (const f of stale) console.log(`ok    ${f} now passes ?wpt — remove it from docs/probe-wpt-baseline.json`);
if (!isNew.length) console.log('ok    no NEW probe navigates the deployed page without ?wpt');
failed = isNew.length;

// Rule 91: the denominator, beside the result.
console.log(`\nchecked ${checked} of ${files.length} *_probe.js — ${noNav} never call page.goto, ${exempt} opted out by name`);
console.log(`${offenders.length} without ?wpt, of which ${baseline.length} are baselined and ${isNew.length} are new`);
console.log('COVERAGE: the presence of the ?wpt token in the file. It does NOT verify');
console.log('that the token reaches page.goto, that the modal is actually skipped at');
console.log('runtime, or that any probe outside *_probe.js at the repo root is correct.');
process.exit(failed ? 1 : 0);

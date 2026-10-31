'use strict';
// The last step of field-data.yml: turns the generator's own record of unread sources into a failed run.
//
// WHY A STEP AND NOT AN EXIT IN THE BUILD. A source that could not be read is written to the file as null with its reason
// in _meta.source_errors (scripts/build-field-data.js), and the rest of the file is still good: MLB and MLS do not
// depend on the NBA or WNBA boards. If the build step exited non-zero, "Push overlay" would not run and the day's good data would
// stay unpublished. So the build ships the honest file, the push step commits it, and this step then fails the run, which is
// what makes the unread source visible without costing the day.
//
// ABSENCE IS NOT CLEAN. A file with no `_meta.source_errors` record at all fails here too: a generator that stopped writing
// the record would otherwise read as "nothing went wrong". So does a file with no `_meta.source_errors_cover` list.
//
// WHAT A GREEN RUN VOUCHES FOR. Only the sources in `source_errors_cover`. The generator's other readers (NHL, MLB, MLS)
// still turn a failed read into [] without recording it, so this step says which sources it checked and that the rest are not.
//
// Usage: node scripts/field-data-source-errors.cjs <path to field-data-today.json>
const fs = require('fs');

function judge(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return { ok: false, lines: [`cannot read ${file}: ${e.message}`] }; }
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { ok: false, lines: [`${file} is not JSON: ${e.message}`] }; }
  const errs = data && data._meta && data._meta.source_errors;
  if (!errs || typeof errs !== 'object' || Array.isArray(errs)) {
    return { ok: false, lines: [`${file} has no _meta.source_errors record, so a clean run cannot be told from a generator that stopped recording`] };
  }
  const keys = Object.keys(errs);
  if (keys.length) return { ok: false, lines: keys.map((k) => `${k}: ${errs[k]}`) };
  const cover = data._meta.source_errors_cover;
  if (!Array.isArray(cover) || !cover.length || !cover.every((c) => typeof c === 'string')) {
    return { ok: false, lines: [`${file} has no _meta.source_errors_cover list, so what an empty source_errors vouches for is unknown`] };
  }
  return { ok: true, lines: [], cover };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/field-data-source-errors.cjs <field-data-today.json>'); process.exit(2); }
  const r = judge(file);
  if (r.ok) { console.log(`source_errors: none recorded for ${r.cover.join(', ')}. Other sources are not checked by this step.`); process.exit(0); }
  console.error('A source could not be read. The file was still written; each unread day is null in it, not empty:');
  for (const l of r.lines) console.error(`  ${l}`);
  process.exit(1);
}

module.exports = { judge };

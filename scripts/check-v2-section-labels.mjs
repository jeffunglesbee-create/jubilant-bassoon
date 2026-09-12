#!/usr/bin/env node
// Every injectV2SportSection() call site's label must be IN V2_SECTION_LABEL,
// and every map entry must be a label something actually uses. The nineteen
// strings lived only at their call sites before 2026-09-12; a second consumer
// (fetchRelayDateSections) now reads the map, and a drift between the two would
// silently rename or vanish a whole section on past-date navigation.
//
// Both counts are printed, not just a verdict (Rule 91).

import fs from 'node:fs';
const src = fs.readFileSync('src/legacy/field.js', 'utf8');

const mapBlock = src.match(/const V2_SECTION_LABEL = \{([\s\S]*?)\n\};/);
if (!mapBlock) { console.error('FAIL — V2_SECTION_LABEL not found. Nothing checked.'); process.exit(1); }
const map = new Map();
for (const m of mapBlock[1].matchAll(/([a-z0-9]+):\s*'([^']+)'/g)) map.set(m[1], m[2]);

const sites = [...src.matchAll(/injectV2SportSection\('([a-z0-9]+)',\s*'([^']+)'\)/g)]
  .map(m => ({ key: m[1], label: m[2] }));

let failed = 0;
for (const { key, label } of sites) {
  if (!map.has(key))            { failed++; console.error(`  MISSING   ${key} is called but absent from V2_SECTION_LABEL`); }
  else if (map.get(key) !== label) { failed++; console.error(`  DRIFT     ${key}: call site '${label}' vs map '${map.get(key)}'`); }
}
// Sports the map carries that no injector uses are legitimate (nba/nhl/mlb come
// from the ESPN sweep) — but every one must be a key the relay accepts.
// FIELD_V2_SOURCES packs several keys per line ("nba: true, nhl: true, mlb: ..."),
// so a line-anchored match sees only the first on each and reports the rest as
// unknown. Twelve false UNKNOWNs on the first run said so.
const v2Block = (src.match(/const FIELD_V2_SOURCES = \{[\s\S]*?\n\};/) || [''])[0];
const v2Keys = new Set([...v2Block.matchAll(/(?:^|[{,\s])([a-z0-9]+)\s*:/g)].map(m => m[1]));
if (v2Keys.size < 10) { console.error(`FAIL — parsed only ${v2Keys.size} FIELD_V2_SOURCES keys; the parse is wrong, nothing was checked.`); process.exit(1); }
for (const key of map.keys()) {
  if (!v2Keys.has(key)) { failed++; console.error(`  UNKNOWN   ${key} is in the map but not a FIELD_V2_SOURCES key`); }
}

const uniqueSites = new Set(sites.map(s => s.key));
console.log(`checked ${sites.length} call site(s) across ${uniqueSites.size} distinct sport key(s) `
          + `against ${map.size} map entries (${map.size - uniqueSites.size} map-only: sports whose `
          + `sections come from the ESPN sweep)`);

if (failed) { console.error(`FAIL — ${failed} mismatch(es).`); process.exit(1); }
console.log('PASS');

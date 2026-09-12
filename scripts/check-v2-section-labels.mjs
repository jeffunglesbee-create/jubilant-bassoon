#!/usr/bin/env node
// V2_SECTION_LABEL is read by fetchRelayDateSections, which iterates
// FIELD_V2_SOURCES. So the map has TWO obligations, in two directions, and the
// first version of this script only checked one of them:
//
//   1. call site  -> map   every injectV2SportSection('key','Label') key must be
//                          in the map, with the same label (no silent rename).
//   2. SOURCES    -> map   every FIELD_V2_SOURCES key must have a label, because
//                          that set is what fetchRelayDateSections walks. A key
//                          without one takes the no-label branch and its whole
//                          section vanishes from every past-date slate.
//   3. map        -> SOURCES  a map entry for a key the relay is never asked for
//                          is dead weight; flag it.
//
// Direction 2 is the one that was missing. The map was built from the injector
// call sites, which is a SUBSET of FIELD_V2_SOURCES: afl, bundesliga and wc26
// are enabled today and had no call site, so all three were absent and all
// three would have disappeared. Checking a subset and printing PASS is exactly
// what Rule 91 is about — so all three counts print, not just a verdict.

import fs from 'node:fs';
const src = fs.readFileSync('src/legacy/field.js', 'utf8');

const mapBlock = src.match(/const V2_SECTION_LABEL = \{([\s\S]*?)\n\};/);
if (!mapBlock) { console.error('FAIL — V2_SECTION_LABEL not found. Nothing checked.'); process.exit(1); }
const map = new Map();
for (const m of mapBlock[1].matchAll(/([a-z0-9]+):\s*'([^']+)'/g)) map.set(m[1], m[2]);
if (map.size < 10) { console.error(`FAIL — parsed only ${map.size} map entries; the parse is wrong, nothing was checked.`); process.exit(1); }

const sites = [...src.matchAll(/injectV2SportSection\('([a-z0-9]+)',\s*'([^']+)'\)/g)]
  .map(m => ({ key: m[1], label: m[2] }));
if (!sites.length) { console.error('FAIL — no injectV2SportSection call sites parsed; the parse is wrong.'); process.exit(1); }

// Two parse traps, both hit for real while writing this:
//   - FIELD_V2_SOURCES packs several keys per line ("nba: true, nhl: true, ..."),
//     so a line-anchored match sees only the first on each and reports the rest
//     as missing. Twelve false readings on the first run said so.
//   - the block is half comments, and "// Date coverage:" parses as a key named
//     `coverage` — one false UNLABELLED on the run after that. Strip comments
//     before parsing; the guard below only catches parsing too FEW keys, and
//     this trap produces too MANY.
const v2Block = (src.match(/const FIELD_V2_SOURCES = \{[\s\S]*?\n\};/) || [''])[0]
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const v2Keys = new Set([...v2Block.matchAll(/(?:^|[{,\s])([a-z0-9]+)\s*:/g)].map(m => m[1]));
if (v2Keys.size < 10) { console.error(`FAIL — parsed only ${v2Keys.size} FIELD_V2_SOURCES keys; the parse is wrong, nothing was checked.`); process.exit(1); }

let failed = 0;
for (const { key, label } of sites) {
  if (!map.has(key))               { failed++; console.error(`  MISSING   ${key} is injected but absent from V2_SECTION_LABEL`); }
  else if (map.get(key) !== label) { failed++; console.error(`  DRIFT     ${key}: call site '${label}' vs map '${map.get(key)}'`); }
}
for (const key of v2Keys) {
  if (!map.has(key)) { failed++; console.error(`  UNLABELLED ${key} is a FIELD_V2_SOURCES key with no label — its section vanishes on past-date navigation`); }
}
for (const key of map.keys()) {
  if (!v2Keys.has(key)) { failed++; console.error(`  UNKNOWN   ${key} is in the map but not a FIELD_V2_SOURCES key`); }
}

const uniqueSites = new Set(sites.map(s => s.key));
console.log(`checked ${sites.length} injector call site(s) across ${uniqueSites.size} distinct key(s), `
          + `and all ${v2Keys.size} FIELD_V2_SOURCES key(s), against ${map.size} map entries `
          + `(${v2Keys.size - uniqueSites.size} key(s) have no injector: their sections are built elsewhere, `
          + `but fetchRelayDateSections still asks the relay for them)`);

if (failed) { console.error(`FAIL — ${failed} mismatch(es).`); process.exit(1); }
console.log('PASS');

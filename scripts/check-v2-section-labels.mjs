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
// FIELD_SRC points the check at a mutated COPY (scripts/mutate-past-date-cups.mjs); the default is the real file.
const src = fs.readFileSync(process.env.FIELD_SRC || 'src/legacy/field.js', 'utf8');

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

const siteKeys = new Set(sites.map(x => x.key));
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


// ── 4. past-date-only keys (relay CC-CMD-2026-08-08-fa-cup-coverage Task 6, owner's order 2026-11-11: "yes all 3") ──
// fetchRelayDateSections asks for V2_PAST_DATE_ONLY's keys IN ADDITION to the FIELD_V2_SOURCES ones. They are the ESPN-sweep cups
// (SOCCER_LEAGUES creates their cards), and they must stay OUT of FIELD_V2_SOURCES: that object also drives fetchV2AllScores, the live
// poll, which would start calling /v2/games for them every cycle. Four obligations, each printed:
//   a. the map parses to exactly the three keys (a parse that finds fewer would pass every other line of this section vacuously);
//   b. none is a FIELD_V2_SOURCES key (the live-poll leak) and none is in V2_SECTION_LABEL (directions 2 and 3 above would then disagree
//      with the poll about which set a key belongs to);
//   c. each label equals the section label of the SOCCER_LEAGUES entry for the same ESPN league, verbatim, so the competition has the
//      same section name on a past day as on today;
//   d. that SOCCER_LEAGUES entry exists (a rename of the entry would otherwise make c compare against nothing).
// The relay sport key -> ESPN slug pairs below are the relay's own (field-relay-nba src/index.js SOCCER_LEAGUES: facup eng.fa,
// eflcup eng.league_cup, efltrophy eng.trophy), read there on 2026-11-11; /v2/games?sport=facup and ?sport=eflcup were probed live
// the same day (33 and 5 games on 2026-11-07 and 2026-10-28); efltrophy answered 200 with no games on four dates.
const PAST_SLUG = { facup: 'eng.fa', eflcup: 'eng.league_cup', efltrophy: 'eng.trophy' };
const pastBlock = src.match(/const V2_PAST_DATE_ONLY = \{([^}]*)\};/);
if (!pastBlock) { console.error('FAIL — V2_PAST_DATE_ONLY not found. Section 4 checked nothing.'); process.exit(1); }
const past = new Map([...pastBlock[1].matchAll(/([a-z0-9]+):\s*'([^']+)'/g)].map(m => [m[1], m[2]]));
for (const key of Object.keys(PAST_SLUG)) {
  if (!past.has(key)) { failed++; console.error(`  PAST-MISSING ${key} is not in V2_PAST_DATE_ONLY — its games vanish from every past-date slate`); }
}
for (const key of past.keys()) {
  if (!(key in PAST_SLUG)) { failed++; console.error(`  PAST-UNKNOWN ${key} is in V2_PAST_DATE_ONLY but this check has no ESPN league for it; add it to PAST_SLUG with the relay's slug`); }
}
const sweepBySlug = new Map();
for (const m of src.matchAll(/\{\s*league:\s*'([^']+)',\s*section:\s*'([^']+)'/g)) {
  if (!sweepBySlug.has(m[1])) sweepBySlug.set(m[1], []);
  sweepBySlug.get(m[1]).push(m[2]);
}
for (const [key, label] of past) {
  if (v2Keys.has(key)) { failed++; console.error(`  LIVE-LEAK ${key} is a FIELD_V2_SOURCES key AND a V2_PAST_DATE_ONLY key — the live poll would call /v2/games for it every cycle`); }
  if (map.has(key))    { failed++; console.error(`  PAST-IN-LABEL-MAP ${key} is in V2_SECTION_LABEL as well; that map is for FIELD_V2_SOURCES keys (direction 3 above)`); }
  const slug = PAST_SLUG[key];
  const sweep = slug ? sweepBySlug.get(slug) : null;
  if (!sweep || !sweep.length) { failed++; console.error(`  NO-SWEEP-ENTRY ${key}: no SOCCER_LEAGUES entry for ${slug}; nothing to hold its label against`); }
  else if (sweep.some(s => s !== label)) { failed++; console.error(`  PAST-LABEL-DRIFT ${key}: past-date label '${label}' vs SOCCER_LEAGUES section(s) ${JSON.stringify(sweep)} for ${slug}`); }
}

// A FIELD_V2_SOURCES key with no injectV2SportSection call renders no section
// from the V2 poll. Some legitimately do not need one — their section is built
// by a different path. That set must be ENUMERATED WITH A REASON, not inferred
// from a count.
//
// This check used to print "6 key(s) have no injector" and PASS. bundesliga was
// one of those six: eight games per poll reaching espnScores, no call site, no
// section, for two days, while the other seven European leagues rendered. The
// number was right and said nothing. An unlisted key now fails.
const SECTION_BUILT_ELSEWHERE = {
  mlb:   'FETCH_LEAGUES / the ESPN fixture sweep builds Baseball (MLB)',
  afl:   "the sections.push at the Squiggle merge (field.js ~9343) owns 'Australian Football (AFL)'",
  wc26:  'the dedicated FIFA injection block, which dedups against the hardcoded WC schedule',
};
for (const key of v2Keys) {
  if (siteKeys.has(key)) continue;
  if (!(key in SECTION_BUILT_ELSEWHERE)) {
    failed++;
    console.error(`  NO INJECTOR ${key} is a FIELD_V2_SOURCES key with no injectV2SportSection call `
                + `and no documented alternative path — its games reach espnScores and render nothing. `
                + `Add the call, or add ${key} to SECTION_BUILT_ELSEWHERE with the path that builds it.`);
  }
}

const uniqueSites = new Set(sites.map(s => s.key));
console.log(`checked ${sites.length} injector call site(s) across ${uniqueSites.size} distinct key(s), `
          + `and all ${v2Keys.size} FIELD_V2_SOURCES key(s), against ${map.size} map entries `
          + `(${v2Keys.size - uniqueSites.size} key(s) have no injector, each named in `
          + `SECTION_BUILT_ELSEWHERE with the path that builds it: `
          + `${Object.keys(SECTION_BUILT_ELSEWHERE).join(', ')}); `
          + `plus ${past.size} past-date-only key(s) (${[...past.entries()].map(([k, l]) => `${k}='${l}'`).join(', ')}) checked as: all ${Object.keys(PAST_SLUG).length} present, `
          + `none in FIELD_V2_SOURCES or V2_SECTION_LABEL, each label equal to its SOCCER_LEAGUES section (${[...past.keys()].map(k => PAST_SLUG[k]).join(', ')})`);

if (failed) { console.error(`FAIL — ${failed} mismatch(es).`); process.exit(1); }
console.log('PASS');

#!/usr/bin/env node
/**
 * ESPN NFL standings data-contract probe.
 *
 * Answers four questions with real payloads (no assumptions):
 *  Q1 preseason playoffSeed semantics  — is it meaningful at 0-0?
 *  Q2 entry.note shape                 — clinch indicator structure in/after season
 *  Q3 division availability            — can seeds 1-7 be derived from this endpoint?
 *  Q4 data-gate expression             — what boolean proves the season started?
 *
 * Writes outbox/espn-nfl-standings-contract-<ts>.json
 */
import fs from 'node:fs';

const OUT = [];
const log = (...a) => { console.log(...a); OUT.push(a.join(' ')); };

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (FIELD probe)' } });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: r.status, json, len: text.length };
}

// stats[] -> {name: value} and {name: displayValue}
function statMap(entry) {
  const v = {}, d = {};
  for (const s of (entry.stats || [])) {
    v[s.name] = s.value;
    d[s.name] = s.displayValue ?? s.display ?? null;
  }
  return { v, d };
}

function summarizeGroup(g) {
  const entries = g?.standings?.entries || [];
  const rows = entries.map(e => {
    const { v, d } = statMap(e);
    return {
      team: e.team?.displayName,
      abbr: e.team?.abbreviation,
      playoffSeed: v.playoffSeed ?? null,
      wins: v.wins ?? null,
      losses: v.losses ?? null,
      ties: v.ties ?? null,
      winPercent: v.winPercent ?? null,
      gamesBehind: v.gamesBehind ?? null,
      divisionRecord: d.divisionRecord ?? null,
      divisionWins: v.divisionWins ?? null,
      divisionLosses: v.divisionLosses ?? null,
      overall: d.overall ?? null,
      streak: v.streak ?? null,
      note: e.note ?? null,          // raw note object, whatever it is
      noteKeys: e.note ? Object.keys(e.note) : null,
    };
  });
  const seeds = rows.map(r => r.playoffSeed).filter(x => x != null);
  const gp = rows.map(r => (r.wins || 0) + (r.losses || 0) + (r.ties || 0));
  return {
    name: g?.name,
    abbreviation: g?.abbreviation,
    entryCount: entries.length,
    childGroupCount: (g?.children || []).length,
    childGroupNames: (g?.children || []).map(c => c.name),
    seedMin: seeds.length ? Math.min(...seeds) : null,
    seedMax: seeds.length ? Math.max(...seeds) : null,
    seedDistinct: new Set(seeds).size,
    seedCount: seeds.length,
    totalGamesPlayed: gp.reduce((a, b) => a + b, 0),
    notesPresent: rows.filter(r => r.note).length,
    rows,
  };
}

async function probe(label, url) {
  log(`\n=== ${label} ===\n${url}`);
  const { status, json, len } = await get(url);
  log(`HTTP ${status}  bytes=${len}`);
  if (!json) { log('NON-JSON or empty body'); return { label, url, status, error: 'non-json' }; }

  const season = json.season;
  log(`season: ${JSON.stringify({
    year: season?.year,
    type: season?.type?.type ?? season?.type,
    typeName: season?.type?.name,
    displayName: season?.displayName ?? season?.type?.name,
  })}`);
  log(`topLevelKeys: ${Object.keys(json).join(', ')}`);

  const groups = json.children || [];
  const summaries = groups.map(summarizeGroup);
  for (const s of summaries) {
    log(`  group "${s.name}" entries=${s.entryCount} childGroups=${s.childGroupCount} ${s.childGroupNames.length ? '[' + s.childGroupNames.join(' | ') + ']' : ''}`);
    log(`    playoffSeed: min=${s.seedMin} max=${s.seedMax} distinct=${s.seedDistinct}/${s.seedCount}`);
    log(`    totalGamesPlayed(sum W+L+T)=${s.totalGamesPlayed}  entriesWithNote=${s.notesPresent}`);
    // print seed-ordered table
    const byseed = [...s.rows].sort((a, b) => (a.playoffSeed ?? 99) - (b.playoffSeed ?? 99));
    for (const r of byseed) {
      log(`      seed=${String(r.playoffSeed).padStart(2)}  ${String(r.abbr).padEnd(4)} ${String(r.team).padEnd(24)} ` +
          `${r.wins}-${r.losses}-${r.ties} div=${r.divisionRecord} note=${r.note ? JSON.stringify(r.note) : 'null'}`);
    }
  }
  return { label, url, status, season: { year: season?.year, type: season?.type?.type ?? season?.type, name: season?.type?.name }, groups: summaries };
}

const BASE = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';
const results = [];

// Q1/Q4 — current (preseason 2026) default payload
results.push(await probe('CURRENT default (no params)', BASE));

// Is ESPN defaulting to a preseason season type? force regular season explicitly.
results.push(await probe('CURRENT seasontype=2 (regular)', `${BASE}?seasontype=2`));

// Q2 — completed season: do clinch notes persist in final standings?
results.push(await probe('2025 season final (season=2025)', `${BASE}?season=2025`));
results.push(await probe('2025 regular season (season=2025&seasontype=2)', `${BASE}?season=2025&seasontype=2`));

// Q3 — division availability via level param (1=league 2=conference 3=division)
for (const lvl of [1, 2, 3]) {
  results.push(await probe(`2025 level=${lvl}`, `${BASE}?season=2025&level=${lvl}`));
}

// Q3 alt — the core API group tree (does it expose division membership?)
log('\n=== CORE API groups tree (division membership source) ===');
const coreUrl = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/groups?limit=50';
const core = await get(coreUrl);
log(`${coreUrl}\nHTTP ${core.status} count=${core.json?.count} pageCount=${core.json?.pageCount}`);
let coreGroups = null;
if (core.json?.items) {
  coreGroups = [];
  for (const it of core.json.items.slice(0, 12)) {
    const g = await get(it.$ref.replace('http://', 'https://'));
    const j = g.json || {};
    coreGroups.push({ id: j.id, name: j.name, abbreviation: j.abbreviation, isConference: j.isConference, parentId: j.parent?.$ref?.match(/groups\/(\d+)/)?.[1] || null });
    log(`  group id=${j.id} name="${j.name}" abbr=${j.abbreviation} isConference=${j.isConference} parent=${j.parent?.$ref ? j.parent.$ref.match(/groups\/(\d+)/)?.[1] : 'none'}`);
  }
}

// Q3 — does the site API expose divisions when asked for a division group id?
results.push(await probe('2025 group=1 (AFC via group param)', `${BASE}?season=2025&group=1`));

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync('outbox', { recursive: true });
fs.writeFileSync(`outbox/espn-nfl-standings-contract-${ts}.json`,
  JSON.stringify({ generatedAt: new Date().toISOString(), results, coreGroups }, null, 2));
fs.writeFileSync(`outbox/espn-nfl-standings-contract-${ts}.log`, OUT.join('\n'));
console.log(`\nWROTE outbox/espn-nfl-standings-contract-${ts}.json`);

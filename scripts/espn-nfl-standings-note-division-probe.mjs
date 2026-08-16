#!/usr/bin/env node
/**
 * Follow-up probe: settle (a) level=3 division nesting, (b) whether entry.note
 * exists at all in this endpoint family, (c) raw entry key enumeration.
 */
import fs from 'node:fs';
const OUT = [];
const log = (...a) => { console.log(...a); OUT.push(a.join(' ')); };

async function getJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (FIELD probe)' } });
  const t = await r.text();
  try { return { status: r.status, json: JSON.parse(t), raw: t }; }
  catch { return { status: r.status, json: null, raw: t }; }
}
const sv = (e) => Object.fromEntries((e.stats || []).map(s => [s.name, s.value]));

// ---- (a) level=3 division nesting, fully recursed -------------------------
log('=== NFL 2025 level=3 : recursed division tree ===');
{
  const { json } = await getJson('https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025&level=3');
  for (const conf of json.children || []) {
    log(`CONF "${conf.name}" ownEntries=${(conf.standings?.entries || []).length} children=${(conf.children || []).length}`);
    for (const div of conf.children || []) {
      const entries = div.standings?.entries || [];
      log(`  DIV "${div.name}" id=${div.id} abbr=${div.abbreviation} entries=${entries.length}`);
      for (const e of entries) {
        const v = sv(e);
        log(`     ${String(e.team?.abbreviation).padEnd(4)} ${String(e.team?.displayName).padEnd(24)} ` +
            `${v.wins}-${v.losses}-${v.ties}  playoffSeed=${v.playoffSeed ?? 'ABSENT'}  note=${e.note ? JSON.stringify(e.note) : 'null'}`);
      }
    }
  }
}

// ---- (b) does `note` appear ANYWHERE in the raw payloads? ------------------
log('\n=== raw "note" key scan across payload variants ===');
const variants = [
  ['NFL 2026 default (preseason)', 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings'],
  ['NFL 2025 final',               'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025'],
  ['NFL 2025 level=3',             'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025&level=3'],
  ['NFL 2024 final',               'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2024'],
  ['MLB 2026 (in-season now)',     'https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings'],
  ['MLB 2025 final',               'https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings?season=2025'],
  ['NBA 2025 final',               'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2025'],
];
const noteScan = [];
for (const [label, url] of variants) {
  const { status, json, raw } = await getJson(url);
  const hasNoteKey = /"note"\s*:/.test(raw);
  const nonNull = (raw.match(/"note"\s*:\s*\{/g) || []).length;
  // sample a note object if present
  let sample = null;
  const walk = (n) => {
    if (sample || !n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.note && typeof n.note === 'object') { sample = n.note; return; }
    Object.values(n).forEach(walk);
  };
  if (json) walk(json);
  log(`${label.padEnd(30)} HTTP ${status} hasNoteKey=${hasNoteKey} noteObjects=${nonNull} sample=${sample ? JSON.stringify(sample) : 'none'}`);
  noteScan.push({ label, url, status, hasNoteKey, noteObjects: nonNull, sample });
}

// ---- (c) enumerate every key on a real entry ------------------------------
log('\n=== raw entry key enumeration (NFL 2025 final, first AFC entry) ===');
{
  const { json } = await getJson('https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025');
  const e = json.children[0].standings.entries[0];
  log(`entry keys: ${Object.keys(e).join(', ')}`);
  log(`team keys : ${Object.keys(e.team || {}).join(', ')}`);
  log(`stat[0]   : ${JSON.stringify(e.stats[0])}`);
  const seedStat = e.stats.find(s => s.name === 'playoffSeed');
  log(`playoffSeed stat object: ${JSON.stringify(seedStat)}`);
  const clinchLike = e.stats.filter(s => /clinch|elimin|seed|rank/i.test(s.name));
  log(`clinch/seed-like stats: ${JSON.stringify(clinchLike.map(s => s.name))}`);
}

// ---- (d) does the site-API (v3 site path) carry clinch notes? -------------
log('\n=== alternate path: apis/site/v2 ... /standings (does it differ?) ===');
for (const u of [
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings?season=2025',
  'https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings?season=2025&type=0',
]) {
  const { status, raw } = await getJson(u);
  log(`${u}\n   HTTP ${status} bytes=${raw.length} hasNoteKey=${/"note"\s*:/.test(raw)} hasClinch=${/clinch/i.test(raw)}`);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync('outbox', { recursive: true });
fs.writeFileSync(`outbox/espn-nfl-note-division-${ts}.log`, OUT.join('\n'));
fs.writeFileSync(`outbox/espn-nfl-note-division-${ts}.json`, JSON.stringify({ noteScan }, null, 2));
console.log(`\nWROTE outbox/espn-nfl-note-division-${ts}.log`);

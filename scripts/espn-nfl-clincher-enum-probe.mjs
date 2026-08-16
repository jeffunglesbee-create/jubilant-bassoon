#!/usr/bin/env node
/** Final probe: enumerate the `clincher` stat across seasons + confirm gate expression. */
import fs from 'node:fs';
const OUT = []; const log = (...a) => { console.log(...a); OUT.push(a.join(' ')); };
const get = async (u) => (await (await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (FIELD probe)' } })).json());
const BASE = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';

for (const [label, url] of [
  ['2026 default (preseason NOW)', BASE],
  ['2026 seasontype=2 (regular, not started)', `${BASE}?seasontype=2`],
  ['2025 final', `${BASE}?season=2025`],
  ['2024 final', `${BASE}?season=2024`],
]) {
  const j = await get(url);
  log(`\n=== ${label} ===\n${url}`);
  let anyClincher = false, gamesTotal = 0, seedVals = [];
  for (const conf of j.children || []) {
    const entries = conf.standings?.entries || [];
    log(` ${conf.name}`);
    for (const e of entries) {
      const stats = e.stats || [];
      const m = Object.fromEntries(stats.map(s => [s.name, s]));
      const cl = m.clincher;
      if (cl) anyClincher = true;
      const w = m.wins?.value || 0, l = m.losses?.value || 0, t = m.ties?.value || 0;
      gamesTotal += w + l + t;
      if (m.playoffSeed) seedVals.push(m.playoffSeed.value);
      if (cl) {
        log(`   ${String(e.team.abbreviation).padEnd(4)} seed=${String(m.playoffSeed?.value).padStart(2)} ${w}-${l}-${t} ` +
            `clincher{value:${cl.value}, displayValue:"${cl.displayValue}", description:"${cl.description}"}`);
      }
    }
  }
  log(` SUMMARY: clincherStatPresentOnAnyEntry=${anyClincher} sumGamesPlayed=${gamesTotal} ` +
      `seedMin=${Math.min(...seedVals)} seedMax=${Math.max(...seedVals)} seedsAllZero=${seedVals.every(v => v === 0)}`);

  // ---- candidate gate expressions evaluated against this payload ----
  const gate_gamesPlayed = (j.children || []).some(c => (c.standings?.entries || [])
    .some(e => { const m = Object.fromEntries((e.stats || []).map(s => [s.name, s.value])); return (m.wins || 0) + (m.losses || 0) + (m.ties || 0) > 0; }));
  const gate_seedNonZero = (j.children || []).some(c => (c.standings?.entries || [])
    .some(e => { const m = Object.fromEntries((e.stats || []).map(s => [s.name, s.value])); return (m.playoffSeed || 0) > 0; }));
  log(` GATE gamesPlayed>0 => ${gate_gamesPlayed}   GATE anySeed>0 => ${gate_seedNonZero}`);
}

// Enumerate every distinct clincher description/displayValue pair seen in 2025+2024
log('\n=== distinct clincher (displayValue, description, value) pairs ===');
const seen = new Map();
for (const s of ['2025', '2024', '2023']) {
  const j = await get(`${BASE}?season=${s}`);
  for (const conf of j.children || []) for (const e of conf.standings?.entries || []) {
    const cl = (e.stats || []).find(x => x.name === 'clincher');
    if (cl) { const k = `${cl.displayValue} | ${cl.description} | value=${cl.value}`; seen.set(k, (seen.get(k) || 0) + 1); }
  }
}
for (const [k, n] of [...seen.entries()].sort()) log(`  ${k}   (count=${n})`);

const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(`outbox/espn-nfl-clincher-enum-${ts}.log`, OUT.join('\n'));
console.log(`\nWROTE outbox/espn-nfl-clincher-enum-${ts}.log`);

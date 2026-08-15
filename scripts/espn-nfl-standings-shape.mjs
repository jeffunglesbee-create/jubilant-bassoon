// Rule 68 PRE-BUILD: dump the real ESPN NFL standings JSON shape so the playoff
// tracker's seed/clinch logic is written against actual fields, not assumptions.
// GH Actions egress reaches ESPN (sandbox 000s it). Preseason: records ~0-0 and
// playoffSeed may be absent — that's fine, we're mapping structure.
const URL = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';
const out = [];
const log = (s) => { console.log(s); out.push(String(s)); };
try {
  const r = await fetch(URL);
  log(`HTTP ${r.status}`);
  const j = await r.json();
  log(`top-level keys: ${Object.keys(j).join(', ')}`);
  const groups = j.children || [j];
  log(`children (groups): ${groups.length}`);
  groups.forEach((g, i) => {
    const ents = g.standings?.entries || [];
    log(`  [${i}] name="${g.name || g.abbreviation || '?'}"  entries=${ents.length}  childGroups=${(g.children||[]).length}`);
    // nested? NFL is conferences → divisions in some shapes
    (g.children || []).forEach((sub) => {
      const se = sub.standings?.entries || [];
      log(`      sub="${sub.name}"  entries=${se.length}`);
    });
  });
  // sample entry: team + every stat name + note
  const firstGroup = groups.find(g => (g.standings?.entries||[]).length) ||
                     (groups.flatMap(g => g.children||[]).find(s => (s.standings?.entries||[]).length));
  const e0 = firstGroup?.standings?.entries?.[0];
  if (e0) {
    log(`\nSAMPLE ENTRY team: ${e0.team?.displayName} (${e0.team?.abbreviation})`);
    log(`  note: ${JSON.stringify(e0.note || null)}`);
    log(`  stat names: ${(e0.stats||[]).map(s => s.name).join(', ')}`);
    const seed = (e0.stats||[]).find(s => /seed/i.test(s.name));
    const clinch = (e0.stats||[]).find(s => /clinch|playoff/i.test(s.name));
    log(`  seed stat: ${seed ? JSON.stringify({name:seed.name,value:seed.value,display:seed.displayValue}) : 'ABSENT (preseason)'}`);
    log(`  clinch-ish stat: ${clinch ? JSON.stringify({name:clinch.name,value:clinch.value}) : 'none'}`);
  } else {
    log('no entries found');
  }
} catch (e) { log('ERR ' + e.message); }
const fs = await import('fs');
fs.mkdirSync('outbox', { recursive: true });
fs.writeFileSync('outbox/espn-nfl-standings-shape.txt', out.join('\n'));

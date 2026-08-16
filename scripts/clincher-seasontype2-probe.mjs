// Resolves the one UNVERIFIED claim in the playoff tracker (Rule 73).
// Gap: no probed payload was BOTH regular-season-scoped AND far enough along for
// anyone to have clinched. A COMPLETED season under seasontype=2 is exactly that
// combination — 2025 is finished (teams clinched) and seasontype=2 scopes to the
// regular season, which is the query the live tracker actually issues.
const BASE = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';
const CASES = [
  ['CONTROL  season=2025 default seasontype', `${BASE}?season=2025`],
  ['SUBJECT  season=2025 seasontype=2      ', `${BASE}?season=2025&seasontype=2`],
];
const out = [];
const log = s => { console.log(s); out.push(String(s)); };
let subjectHasClincher = null;
for (const [label, url] of CASES) {
  try {
    const r = await fetch(url);
    const j = await r.json();
    let entries = 0, withClincher = 0, seeds = 0; const markers = {};
    for (const g of (j.children || [])) {
      for (const e of (g.standings?.entries || [])) {
        entries++;
        const c = (e.stats || []).find(s => s.name === 'clincher');
        if ((e.stats || []).find(s => s.name === 'playoffSeed')) seeds++;
        if (c) { withClincher++; const k = `${c.displayValue}=${c.description}`; markers[k] = (markers[k] || 0) + 1; }
      }
    }
    log(`${label} HTTP ${r.status} season=${j.season?.year} entries=${entries} withPlayoffSeed=${seeds} withClincher=${withClincher}`);
    log(`    markers: ${JSON.stringify(markers)}`);
    if (label.startsWith('SUBJECT')) subjectHasClincher = withClincher > 0;
  } catch (e) { log(`${label} ERROR ${e.message}`); }
}
log('');
log(`VERDICT: seasontype=2 carries clincher => ${subjectHasClincher}`);
log(subjectHasClincher
  ? 'RESOLVED: the tracker will show real clinch markers in-season. Claim upgraded from UNVERIFIED.'
  : 'RESOLVED (NEGATIVE): seasontype=2 omits clincher — the tracker must query differently or drop the clinch column. Fix required.');
const fs = await import('fs');
fs.mkdirSync('outbox', { recursive: true });
fs.writeFileSync('outbox/clincher-seasontype2-probe.txt', out.join('\n'));
process.exit(subjectHasClincher === null ? 1 : 0);

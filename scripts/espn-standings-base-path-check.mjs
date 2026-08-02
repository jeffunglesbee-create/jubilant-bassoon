#!/usr/bin/env node
// Verify whether the apis/site/v2 -> apis/v2 standings shape change is
// MLB-specific or affects ESPN_BASE (shared by every sport in field.js)
// before changing shared code blindly.
import { writeFileSync } from 'fs';

const sports = [
  ['baseball', 'mlb'],
  ['basketball', 'nba'],
  ['hockey', 'nhl'],
  ['football', 'nfl'],
];

const out = {};
for (const [sport, league] of sports) {
  const oldUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/standings`;
  const newUrl = `https://site.api.espn.com/apis/v2/sports/${sport}/${league}/standings`;
  const results = {};
  for (const [label, url] of [['old_apis_site_v2', oldUrl], ['new_apis_v2', newUrl]]) {
    try {
      const r = await fetch(url);
      const json = await r.json();
      const groups = json.children || [json];
      let entryCount = 0;
      groups.forEach(g => { entryCount += (g.standings?.entries || []).length; });
      results[label] = { status: r.status, entryCount, topLevelKeys: Object.keys(json) };
    } catch (e) {
      results[label] = { error: String(e).slice(0, 150) };
    }
  }
  out[`${sport}/${league}`] = results;
}
writeFileSync('outbox/espn-standings-base-path-check.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

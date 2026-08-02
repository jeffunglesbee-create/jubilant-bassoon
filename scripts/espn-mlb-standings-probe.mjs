#!/usr/bin/env node
// CC-CMD-2026-08-02-warm-mlb-standings-for-streak-bonuses Task 1.
// One-off probe: real ESPN MLB standings shape, specifically the streak field.
import { writeFileSync } from 'fs';

const url = 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/standings';
const r = await fetch(url);
const json = await r.json();
const groups = json.children || [json];
const sample = [];
groups.forEach(g => {
  (g.standings?.entries || []).slice(0, 3).forEach(e => {
    const streakStat = (e.stats || []).find(s => s.name === 'streak');
    sample.push({
      team: e.team?.displayName,
      streakStat: streakStat || null,
      allStatNames: (e.stats || []).map(s => s.name),
    });
  });
});
const out = { httpStatus: r.status, groupCount: groups.length, sample };
writeFileSync('outbox/espn-mlb-standings-streak-shape.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

#!/usr/bin/env node
// CC-CMD-2026-08-02-warm-mlb-standings-for-streak-bonuses Task 1.
// One-off probe: real ESPN MLB standings shape, specifically the streak field.
import { writeFileSync } from 'fs';

// First real run: the plain /standings URL now returns only a
// {"fullViewLink":...} stub, not structured entries -- a real ESPN API
// shape change, not a bug in the fetch logic. Trying real variants
// (season/seasontype/level params, the v2 core API used elsewhere in this
// project) rather than guessing once and concluding.
const candidates = [
  'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/standings',
  'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/standings?season=2026',
  'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/standings?season=2026&seasontype=2',
  'https://site.api.espn.com/apis/v2/sports/baseball/mlb/standings',
  'https://cdn.espn.com/core/mlb/standings?xhr=1',
];

const attempts = [];
for (const url of candidates) {
  try {
    const r = await fetch(url);
    let json = null;
    try { json = await r.json(); } catch (e) {}
    const groups = json?.children || (json ? [json] : []);
    let entryCount = 0;
    groups.forEach(g => { entryCount += (g.standings?.entries || []).length; });
    attempts.push({
      url,
      httpStatus: r.status,
      topLevelKeys: json ? Object.keys(json) : null,
      entryCount,
      rawSnippet: json ? JSON.stringify(json).slice(0, 800) : null,
    });
  } catch (e) {
    attempts.push({ url, error: String(e).slice(0, 200) });
  }
}

const working = attempts.find(a => a.entryCount > 0);
let sample = [];
if (working) {
  const r = await fetch(working.url);
  const json = await r.json();
  const groups = json.children || [json];
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
}

const out = { workingUrl: working?.url || null, sample, attempts };
writeFileSync('outbox/espn-mlb-standings-streak-shape.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

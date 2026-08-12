// CC-CMD-2026-08-12-scouting-coverage-gaps — Task 1, resolved differently.
//
// The first attempt measured the RENDERED OUTPUT and got a number I could not
// defend: parkRowMissing 7/15, while four of the seven named home teams
// (MIN, NYY, TOR, LAD) are present in PARK_FACTORS under exactly those keys.
// The detector matched the literal word "Park", which appears inside some
// venue names ("Oracle Park") and not others ("Target Field"), so absence of
// a match did not mean absence of a row.
//
// The novel move is to stop measuring the output at all.
//
// buildScoutingReport pushes the Park row on exactly one condition
// (src/legacy/field.js:16388-16397):
//
//     const abbr = game._homeAbbr || game.homeTeam;
//     const pf   = abbr ? getParkFactor(abbr) : null;
//     if (pf) rows.push({ lbl: 'Park', ... })
//
// and getParkFactor (src/legacy/field.js:3831) is a pure lookup:
//
//     const a = (teamAbbr||'').toUpperCase().replace(/^THE /,'');
//     const d = PARK_FACTORS[a];
//     if (!d) return null;
//
// So the boolean the DOM probe was trying to infer is a SET MEMBERSHIP TEST
// between two things obtainable exactly:
//
//   1. the PARK_FACTORS keys -- parsed from the checked-out source at HEAD,
//      not hardcoded here, so this cannot drift from what ships
//   2. the abbreviation the app actually receives -- `team.abbreviation` from
//      the same MLB Stats API call fetchMLBSchedule makes
//      (src/legacy/field.js:17806, `const homeAbbr = home.team.abbreviation`)
//
// Intersect them and the answer is deterministic, enumerated per game, with
// no rendering, no regex over prose, and no ambiguity about what a miss means.
//
// Read-only.

const fs = require('fs');

const MLB_STATS_BASE = 'https://statsapi.mlb.com/api/v1';
const DATE = process.env.PROBE_DATE || new Date().toISOString().slice(0, 10);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

// Brace-matched extraction rather than a line regex: PARK_FACTORS' values are
// themselves objects, so a naive `/\}/` would stop at the first nested close
// and silently under-report the key set -- which would fake the very finding
// this probe exists to establish.
function parkFactorKeysFromSource(path) {
  const s = fs.readFileSync(path, 'utf8');
  const m = /const PARK_FACTORS\s*=\s*\{/.exec(s);
  if (!m) throw new Error('PARK_FACTORS not found in source');
  let i = m.index + m[0].length, depth = 1, j = i;
  while (depth > 0 && j < s.length) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}') depth--;
    j++;
  }
  const body = s.slice(i, j - 1);
  // Top-level keys only: nested stat keys sit at a deeper indent inside {...}.
  const keys = [];
  let d = 0;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (d === 0) {
      const km = /^'?([A-Za-z0-9_]+)'?\s*:/.exec(trimmed);
      if (km) keys.push(km[1]);
    }
    d += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
  }
  return [...new Set(keys)];
}

// getParkFactor's normalisation, reproduced exactly.
const normalize = (a) => String(a || '').toUpperCase().replace(/^THE /, '');

(async () => {
  const out = { ts: TS, date: DATE };
  try {
    const keys = parkFactorKeysFromSource('src/legacy/field.js');
    out.parkFactorKeys = keys.sort();
    out.parkFactorKeyCount = keys.length;

    const url = `${MLB_STATS_BASE}/schedule?sportId=1&date=${DATE}&hydrate=team`;
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    out.httpStatus = r.status;
    const j = await r.json();
    const games = (j.dates || []).flatMap((d) => d.games || []);

    out.games = games.map((g) => {
      const t = g.teams?.home?.team;
      const apiAbbr = t?.abbreviation ?? null;
      const norm = normalize(apiAbbr);
      return {
        homeTeam: t?.name ?? null,
        awayTeam: g.teams?.away?.team?.name ?? null,
        apiAbbr,
        normalized: norm,
        // THE ANSWER. Not inferred from pixels -- computed from the same two
        // inputs the app itself uses.
        resolvesToParkFactor: keys.includes(norm),
      };
    });

    const unresolved = out.games.filter((x) => !x.resolvesToParkFactor);
    out.summary = {
      gameCount: out.games.length,
      resolves: out.games.length - unresolved.length,
      doesNotResolve: unresolved.length,
      unresolvedAbbrs: [...new Set(unresolved.map((x) => x.apiAbbr))].sort(),
      unresolvedTeams: unresolved.map((x) => `${x.homeTeam} (${x.apiAbbr})`),
      // Keys the table has that no API abbreviation matches. A non-empty
      // intersection here is the smoking gun for a naming-scheme drift rather
      // than genuinely absent data: the factor EXISTS, under another name.
      tableKeysUnusedToday: keys.filter(
        (k) => !out.games.some((x) => x.normalized === k)).sort(),
    };
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }

  console.log(JSON.stringify(out.summary || out, null, 2));
  if (out.games) {
    console.log('\nper game:');
    for (const x of out.games) {
      console.log(`  ${x.resolvesToParkFactor ? 'OK  ' : 'MISS'}  ${String(x.apiAbbr).padEnd(4)}  ${x.homeTeam}`);
    }
  }
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/park-abbr-resolution-manifest-${TS}.json`, JSON.stringify(out, null, 2));
  process.exit(0);
})();

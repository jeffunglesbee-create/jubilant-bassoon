// CC-CMD-2026-08-12-mlb-pitcher-payload-audit — Task 1 (source side) + Task 2.
//
// Runs on a GitHub runner: this sandbox's proxy returns HTTP 000 for
// statsapi.mlb.com, same class of block as *.workers.dev.
//
// WHY THE SOURCE AND NOT THE FORMATTER
//
// Four independent enrichments (ERA, W-L, tempo, arsenal) were all blank on
// all seven observed games. Four unrelated lookups failing together points at
// one upstream cause. `normalizeMLBPitcher` (src/legacy/field.js:17837) reads:
//
//   const season = p.stats?.find(s => s.type?.displayName === 'season');
//   const stat   = season?.splits?.[0]?.stat;
//   era: stat?.era ?? null, wins: stat?.wins ?? null, losses: stat?.losses ?? null
//
// So the entire ERA/W-L path hangs on one string literal matching a
// `type.displayName` in the API response. This probe prints the displayName
// values the API ACTUALLY returns rather than assuming 'season' is among them.
//
// URL and hydrate string copied verbatim from fetchMLBSchedule
// (src/legacy/field.js:17857), not composed here -- a probe against a
// different hydrate would measure a different payload than the app receives.

const fs = require('fs');

const MLB_STATS_BASE = 'https://statsapi.mlb.com/api/v1';
const HYDRATE = 'broadcasts(all),team,linescore,probablePitcher(stats),officials';
const DATE = process.env.PROBE_DATE || new Date().toISOString().slice(0, 10);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

// Mirrors src/legacy/field.js:3881 lastNameOf + the PITCHER_TEMPO /
// PITCHER_ARSENAL key shape, so the probe can report whether a last name
// WOULD match those tables -- the 2026-07-01 arsenal/tempo fix established
// that those tables are last-name-keyed while p.name is a full name, and
// Rule 72 says re-verify an inherited claim rather than trust it.
const lastNameOfStr = (s) => String(s || '').trim().split(/\s+/).pop();

(async () => {
  const out = { ts: TS, date: DATE, hydrate: HYDRATE, url: null, games: [] };
  try {
    const url = `${MLB_STATS_BASE}/schedule?sportId=1&date=${DATE}&hydrate=${HYDRATE}`;
    out.url = url;
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    out.httpStatus = r.status;
    if (!r.ok) throw new Error(`MLB Stats API ${r.status}`);
    const j = await r.json();

    const games = (j.dates || []).flatMap((d) => d.games || []);
    out.gameCount = games.length;

    const displayNames = new Set();
    let withProbables = 0, withSeasonSplit = 0, withEra = 0, withWins = 0;

    for (const g of games) {
      const home = g.teams?.home, away = g.teams?.away;
      const rec = (side, t) => {
        const p = t?.probablePitcher;
        if (!p) return { side, team: t?.team?.name ?? null, pitcher: null };
        for (const s of (p.stats || [])) if (s?.type?.displayName) displayNames.add(s.type.displayName);
        // The app's exact predicate, reproduced rather than approximated.
        const season = p.stats?.find((s) => s.type?.displayName === 'season');
        const stat = season?.splits?.[0]?.stat;
        return {
          side,
          team: t?.team?.name ?? null,
          pitcher: p.fullName || p.name || null,
          lastName: lastNameOfStr(p.fullName || p.name),
          statsBlockCount: (p.stats || []).length,
          statTypeNames: (p.stats || []).map((s) => s?.type?.displayName ?? null),
          seasonSplitFound: !!season,
          era: stat?.era ?? null,
          wins: stat?.wins ?? null,
          losses: stat?.losses ?? null,
        };
      };
      const h = rec('home', home), a = rec('away', away);
      if (h.pitcher || a.pitcher) withProbables++;
      for (const p of [h, a]) {
        if (p.seasonSplitFound) withSeasonSplit++;
        if (p.era != null) withEra++;
        if (p.wins != null) withWins++;
      }
      out.games.push({
        gamePk: g.gamePk,
        // Task 2's pairing check. teams.home/.away is the API's own labelling,
        // and src/legacy/field.js:17806 assigns homePitcher from teams.home --
        // so a swap could only come from the render pairing, which this table
        // makes checkable against the DOM probe's rendered labels.
        homeTeam: home?.team?.name ?? null,
        awayTeam: away?.team?.name ?? null,
        homeProbable: h.pitcher,
        awayProbable: a.pitcher,
        home: h, away: a,
      });
    }

    out.summary = {
      gamesWithAnyProbable: withProbables,
      pitcherRecords: out.games.length * 2,
      seasonSplitFound: withSeasonSplit,
      eraPresent: withEra,
      winsPresent: withWins,
      // THE DISCRIMINATOR. If 'season' is absent from this list while the
      // records themselves carry stats, the literal in normalizeMLBPitcher is
      // simply wrong and every ERA/W-L is null by construction.
      allStatTypeDisplayNames: [...displayNames].sort(),
      seasonLiteralPresent: displayNames.has('season'),
    };
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/mlb-pitcher-source-manifest-${TS}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ...out, games: out.games.slice(0, 4) }, null, 2));
  console.log(`\n(full per-game detail in outbox/mlb-pitcher-source-manifest-${TS}.json)`);
  // Exit 0 regardless: a null-everywhere result is the FINDING, not a probe
  // failure, and a red run invites re-running until green (Rule 77).
  process.exit(0);
})();

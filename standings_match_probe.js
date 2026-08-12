// CC-CMD-2026-08-12-scouting-coverage-gaps — Gap 2, same method as Gap 1.
//
// The records line is emitted only when BOTH lookups hit
// (src/legacy/field.js:31036):
//
//   const hT = _tgStandings.find(t => (t.team||'').toLowerCase().includes(hSlug));
//   const aT = _tgStandings.find(t => (t.team||'').toLowerCase().includes(aSlug));
//   if (hT && aT) _tgStandingsStr = `...`;
//
// where the slugs are teamNick(game.home/away).toLowerCase(). So, exactly as
// with the park row, the rendered boolean is a pure function of two obtainable
// inputs: the standings `team.name` values (MLB Stats API /standings, the same
// call fetchMLBStandingsParsed makes at src/legacy/field.js:27378) and the
// nicknames derived from the schedule's team names.
//
// Note `if (hT && aT)` -- one unmatched nickname silently removes the OTHER
// team's record too, so the failing side is not visible from the rendered
// output. This probe reports each side separately, which the DOM cannot.
//
// Read-only.

const fs = require('fs');

const MLB_STATS_BASE = 'https://statsapi.mlb.com/api/v1';
const DATE = process.env.PROBE_DATE || new Date().toISOString().slice(0, 10);
const SEASON = DATE.slice(0, 4);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

// teamNick, reproduced from src/legacy/field.js:2962. _multiWordNicks is
// parsed from source rather than reimplemented -- it is the exception table,
// and guessing its contents would defeat the point of measuring.
function multiWordNicksFromSource(path) {
  const s = fs.readFileSync(path, 'utf8');
  const m = /_multiWordNicks\s*=\s*\{/.exec(s);
  if (!m) return {};
  let i = m.index + m[0].length, depth = 1, j = i;
  while (depth > 0 && j < s.length) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}') depth--;
    j++;
  }
  const out = {};
  for (const mm of s.slice(i, j - 1).matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) out[mm[1]] = mm[2];
  return out;
}

(async () => {
  const out = { ts: TS, date: DATE };
  try {
    const nicks = multiWordNicksFromSource('src/legacy/field.js');
    out.multiWordNickCount = Object.keys(nicks).length;
    const teamNick = (name) => {
      if (!name) return '';
      if (nicks[name]) return nicks[name];
      const parts = String(name).split(' ');
      return parts.length > 1 ? parts[parts.length - 1] : name;
    };

    const sr = await fetch(`${MLB_STATS_BASE}/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason`,
      { signal: AbortSignal.timeout(30000) });
    const sj = await sr.json();
    const standings = [];
    for (const div of (sj.records || [])) {
      for (const t of (div.teamRecords || [])) {
        standings.push({ team: t.team?.name || '', wins: t.wins, losses: t.losses });
      }
    }
    out.standingsCount = standings.length;
    out.standingsNames = standings.map((t) => t.team).sort();

    const gr = await fetch(`${MLB_STATS_BASE}/schedule?sportId=1&date=${DATE}&hydrate=team`,
      { signal: AbortSignal.timeout(30000) });
    const gj = await gr.json();
    const games = (gj.dates || []).flatMap((d) => d.games || []);

    const find = (slug) => standings.find((t) => (t.team || '').toLowerCase().includes(slug));
    out.games = games.map((g) => {
      const home = g.teams?.home?.team?.name || '';
      const away = g.teams?.away?.team?.name || '';
      const hSlug = teamNick(home).toLowerCase();
      const aSlug = teamNick(away).toLowerCase();
      const hT = find(hSlug), aT = find(aSlug);
      return {
        matchup: `${away} @ ${home}`,
        homeNick: teamNick(home), homeSlug: hSlug, homeMatched: !!hT,
        awayNick: teamNick(away), awaySlug: aSlug, awayMatched: !!aT,
        // The rendered condition, reproduced exactly.
        recordsLineWouldRender: !!(hT && aT),
      };
    });

    const fails = out.games.filter((x) => !x.recordsLineWouldRender);
    out.summary = {
      gameCount: out.games.length,
      wouldRender: out.games.length - fails.length,
      wouldNotRender: fails.length,
      // Which SIDE failed -- invisible from the DOM, because one miss
      // suppresses both records.
      failures: fails.map((x) => ({
        matchup: x.matchup,
        homeSlug: x.homeSlug, homeMatched: x.homeMatched,
        awaySlug: x.awaySlug, awayMatched: x.awayMatched,
      })),
      unmatchedSlugs: [...new Set(fails.flatMap((x) =>
        [!x.homeMatched && x.homeSlug, !x.awayMatched && x.awaySlug].filter(Boolean)))],
    };
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }

  console.log(JSON.stringify(out.summary || out, null, 2));
  if (out.standingsNames) console.log('\nstandings names:', JSON.stringify(out.standingsNames));
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/standings-match-manifest-${TS}.json`, JSON.stringify(out, null, 2));
  process.exit(0);
})();

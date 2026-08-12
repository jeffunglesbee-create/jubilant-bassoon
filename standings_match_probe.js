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

    // The un-hydrated call is what fetchMLBStandingsParsed makes today, and it
    // returns a MINIMAL team object -- id/name/link, no abbreviation. So its
    // `abbrev: t.team?.abbreviation || ''` has been an empty string for all 30
    // teams the whole time, and the abbreviation second key added to the
    // matcher could never fire. Measured, after the fix shipped and the DOM
    // still showed the same game missing.
    //
    // Both forms are fetched here so the difference is the artifact rather
    // than a claim about what hydrate does.
    const SURL = `${MLB_STATS_BASE}/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason`;
    const bare = await (await fetch(SURL, { signal: AbortSignal.timeout(30000) })).json();
    const hyd = await (await fetch(`${SURL}&hydrate=team`, { signal: AbortSignal.timeout(30000) })).json();
    const abbrevCount = (j) => (j.records || []).flatMap((d) => d.teamRecords || [])
      .filter((t) => t.team?.abbreviation).length;
    out.abbrevAvailability = {
      bare: abbrevCount(bare),
      hydrated: abbrevCount(hyd),
      total: (bare.records || []).flatMap((d) => d.teamRecords || []).length,
    };
    console.log('abbrev availability:', JSON.stringify(out.abbrevAvailability));
    // Use whichever actually carries abbreviations for the predicate test.
    const sj = out.abbrevAvailability.hydrated > out.abbrevAvailability.bare ? hyd : bare;
    out.usedHydrated = sj === hyd;
    const standings = [];
    for (const div of (sj.records || [])) {
      for (const t of (div.teamRecords || [])) {
        // abbrev captured because the shipped fix uses it as a second key.
        // The first version of this probe did not capture it, so the fix was
        // written on an ASSUMPTION that /standings and /schedule agree on
        // team.abbreviation -- asserted in a code comment as "cannot drift",
        // immediately after this same API was caught disagreeing with itself
        // on team.name. That assumption is what this now measures.
        standings.push({
          team: t.team?.name || '',
          abbrev: t.team?.abbreviation || '',
          wins: t.wins, losses: t.losses,
        });
      }
    }
    out.standingsCount = standings.length;
    out.standingsNames = standings.map((t) => t.team).sort();

    const gr = await fetch(`${MLB_STATS_BASE}/schedule?sportId=1&date=${DATE}&hydrate=team`,
      { signal: AbortSignal.timeout(30000) });
    const gj = await gr.json();
    const games = (gj.dates || []).flatMap((d) => d.games || []);

    // OLD predicate: nickname substring only.
    const findOld = (slug) => standings.find((t) => (t.team || '').toLowerCase().includes(slug));
    // NEW predicate, as shipped: substring OR abbreviation equality.
    const findNew = (slug, abbr) => standings.find((t) =>
      (t.team || '').toLowerCase().includes(slug) ||
      (abbr && (t.abbrev || '').toUpperCase() === String(abbr).toUpperCase()));

    out.games = games.map((g) => {
      const home = g.teams?.home?.team?.name || '';
      const away = g.teams?.away?.team?.name || '';
      const hAbbr = g.teams?.home?.team?.abbreviation || null;
      const aAbbr = g.teams?.away?.team?.abbreviation || null;
      const hSlug = teamNick(home).toLowerCase();
      const aSlug = teamNick(away).toLowerCase();
      const hOld = findOld(hSlug), aOld = findOld(aSlug);
      const hNew = findNew(hSlug, hAbbr), aNew = findNew(aSlug, aAbbr);
      return {
        matchup: `${away} @ ${home}`,
        homeNick: teamNick(home), homeSlug: hSlug, homeScheduleAbbr: hAbbr,
        awayNick: teamNick(away), awaySlug: aSlug, awayScheduleAbbr: aAbbr,
        // The standings row this team SHOULD join to, found by nothing more
        // than position in the league, so the two abbreviations can be
        // compared side by side even when neither predicate matches.
        homeStandingsAbbr: (standings.find((t) => (t.team || '').toLowerCase()
          .includes(home.split(' ').pop().toLowerCase())) || {}).abbrev ?? null,
        oldWouldRender: !!(hOld && aOld),
        newWouldRender: !!(hNew && aNew),
      };
    });

    const fails = out.games.filter((x) => !x.newWouldRender);
    out.summary = {
      gameCount: out.games.length,
      oldWouldRender: out.games.filter((x) => x.oldWouldRender).length,
      newWouldRender: out.games.length - fails.length,
      newWouldNotRender: fails.length,
      // Every abbreviation pair, so a /standings vs /schedule disagreement is
      // visible directly rather than inferred from a failure.
      abbrevPairs: out.games.map((x) => ({
        home: x.homeNick, schedule: x.homeScheduleAbbr, standings: x.homeStandingsAbbr,
        agree: x.homeScheduleAbbr === x.homeStandingsAbbr,
      })),
      // Which SIDE failed -- invisible from the DOM, because one miss
      // suppresses both records.
      failures: fails.map((x) => ({
        matchup: x.matchup,
        homeSlug: x.homeSlug, homeScheduleAbbr: x.homeScheduleAbbr,
        homeStandingsAbbr: x.homeStandingsAbbr,
        awaySlug: x.awaySlug, awayScheduleAbbr: x.awayScheduleAbbr,
      })),
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

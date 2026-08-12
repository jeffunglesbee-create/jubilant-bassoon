// CC-CMD-2026-08-12-mlb-pitcher-payload-audit — Task 3 input.
//
// mlb-pitcher-source-manifest (2026-08-12) established the cause is NOT the
// `type.displayName === 'season'` literal in normalizeMLBPitcher:
//
//   statsBlockCount: 0 for all 30 pitcher records
//   allStatTypeDisplayNames: []
//
// The stats array is EMPTY, not mislabelled. `probablePitcher(stats)` is
// returning pitchers with no stats at all, so every ERA and W-L is null by
// construction and the formatter is innocent.
//
// The fix is a corrected hydrate string. Which one is an empirical question,
// not a guessable one -- so this measures candidates against the real API
// instead of shipping the most plausible-looking syntax and hoping (Rule 88:
// probe more, do not guess faster).
//
// Read-only. GETs only, one per variant, against a single date.

const fs = require('fs');

const MLB_STATS_BASE = 'https://statsapi.mlb.com/api/v1';
const DATE = process.env.PROBE_DATE || new Date().toISOString().slice(0, 10);
const SEASON = DATE.slice(0, 4);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

// The current production string is FIRST so it appears in the artifact as a
// measured control rather than an assumption carried from the other probe.
const VARIANTS = [
  'broadcasts(all),team,linescore,probablePitcher(stats),officials',
  'probablePitcher(stats)',
  `probablePitcher(stats(type=season,season=${SEASON}))`,
  'probablePitcher(note,stats)',
  `probablePitcher(person(stats(type=season,season=${SEASON},group=pitching)))`,
  `probablePitcher(stats(group=pitching,type=season,season=${SEASON}))`,
];

async function measure(hydrate) {
  const url = `${MLB_STATS_BASE}/schedule?sportId=1&date=${DATE}&hydrate=${hydrate}`;
  const out = { hydrate, url };
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    out.httpStatus = r.status;
    if (!r.ok) { out.body = (await r.text()).slice(0, 200); return out; }
    const j = await r.json();
    const games = (j.dates || []).flatMap((d) => d.games || []);
    out.gameCount = games.length;

    let records = 0, withStatsArray = 0, withAnyEra = 0, withSeasonType = 0;
    const typeNames = new Set();
    const sample = [];
    for (const g of games) {
      for (const side of ['home', 'away']) {
        const p = g.teams?.[side]?.probablePitcher;
        if (!p) continue;
        records++;
        const stats = p.stats || p.person?.stats || [];
        if (stats.length) withStatsArray++;
        for (const s of stats) if (s?.type?.displayName) typeNames.add(s.type.displayName);
        const season = stats.find((s) => s.type?.displayName === 'season');
        if (season) withSeasonType++;
        // Any ERA anywhere in the payload, regardless of which split carries
        // it -- a variant that delivers ERA under a different type name is
        // still a working variant, and the literal can be adjusted to match.
        const anyEra = stats.some((s) => s?.splits?.[0]?.stat?.era != null);
        if (anyEra) withAnyEra++;
        if (sample.length < 2 && stats.length) {
          sample.push({
            pitcher: p.fullName || p.name,
            statTypeNames: stats.map((s) => s?.type?.displayName ?? null),
            firstSplitStatKeys: Object.keys(stats[0]?.splits?.[0]?.stat || {}).slice(0, 12),
            era: stats.find((s) => s?.splits?.[0]?.stat?.era != null)?.splits?.[0]?.stat?.era ?? null,
            wins: stats.find((s) => s?.splits?.[0]?.stat?.wins != null)?.splits?.[0]?.stat?.wins ?? null,
          });
        }
      }
    }
    Object.assign(out, {
      pitcherRecords: records,
      withStatsArray,
      withSeasonType,
      withAnyEra,
      statTypeNames: [...typeNames].sort(),
      sample,
      // A variant only WORKS if it delivers ERA for essentially every
      // probable. Partial delivery is a different finding, not a fix.
      works: records > 0 && withAnyEra >= records - 1,
    });
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }
  return out;
}

(async () => {
  const out = { ts: TS, date: DATE, season: SEASON, results: [] };
  for (const v of VARIANTS) {
    const r = await measure(v);
    out.results.push(r);
    console.log(`${r.works ? 'WORKS  ' : 'no     '} records=${r.pitcherRecords ?? '-'} ` +
      `withStats=${r.withStatsArray ?? '-'} withEra=${r.withAnyEra ?? '-'} ` +
      `types=${JSON.stringify(r.statTypeNames ?? [])}  ${r.hydrate}`);
  }
  out.workingVariants = out.results.filter((r) => r.works).map((r) => r.hydrate);
  out.currentProductionWorks = out.results[0]?.works === true;
  console.log('\nworking variants:', JSON.stringify(out.workingVariants, null, 2));
  console.log('current production hydrate works:', out.currentProductionWorks);

  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/mlb-hydrate-variant-manifest-${TS}.json`, JSON.stringify(out, null, 2));
  // Exit 0: "no variant works" is a finding, not a probe failure.
  process.exit(0);
})();

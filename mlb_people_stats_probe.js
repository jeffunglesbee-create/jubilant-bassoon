// CC-CMD-2026-08-12-mlb-pitcher-payload-audit — Task 3 input, second round.
//
// mlb-hydrate-variant-manifest (2026-08-12) measured SIX hydrate forms,
// including the one in production, and every one returned 30 pitcher records
// with `stats: []`:
//
//   working variants: []
//   current production hydrate works: false
//
// So the schedule endpoint does not deliver probable-pitcher season stats at
// all, by any hydrate this probe could find. That rules out a one-string fix
// and makes the real question a different one: does ANY endpoint serve them?
//
// Answering that BEFORE writing the follow-on spec is the point. A CC-CMD
// that says "fetch the stats from somewhere else" without knowing such a
// somewhere exists is speculative work, and the alternative -- shipping a
// placeholder ERA -- is a Rule 1 violation. If nothing here works, the honest
// outcome is that the ERA/W-L display is not currently obtainable and the
// blank is correct.
//
// Read-only. GETs only.

const fs = require('fs');

const MLB_STATS_BASE = 'https://statsapi.mlb.com/api/v1';
const DATE = process.env.PROBE_DATE || new Date().toISOString().slice(0, 10);
const SEASON = DATE.slice(0, 4);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

(async () => {
  const out = { ts: TS, date: DATE, season: SEASON, candidates: [] };
  try {
    // Pitcher ids come from the SAME schedule call the app makes, so the ids
    // tested are the ids the app would have in hand -- not ids looked up by
    // name, which would test a path the client does not have.
    const schedUrl = `${MLB_STATS_BASE}/schedule?sportId=1&date=${DATE}&hydrate=probablePitcher`;
    const sr = await fetch(schedUrl, { signal: AbortSignal.timeout(30000) });
    const sj = await sr.json();
    const pitchers = [];
    for (const d of (sj.dates || [])) {
      for (const g of (d.games || [])) {
        for (const side of ['home', 'away']) {
          const p = g.teams?.[side]?.probablePitcher;
          if (p?.id) pitchers.push({ id: p.id, name: p.fullName || p.name });
        }
      }
    }
    out.pitcherCount = pitchers.length;
    out.sampleIds = pitchers.slice(0, 5);
    if (!pitchers.length) throw new Error('no probable pitchers with ids on this date');

    const probe = pitchers.slice(0, 5);   // 5 is enough to separate works from does-not
    const CANDIDATES = [
      (id) => `${MLB_STATS_BASE}/people/${id}/stats?stats=season&group=pitching&season=${SEASON}`,
      (id) => `${MLB_STATS_BASE}/people/${id}?hydrate=stats(group=pitching,type=season,season=${SEASON})`,
      (id) => `${MLB_STATS_BASE}/people/${id}/stats?stats=statsSingleSeason&group=pitching&season=${SEASON}`,
    ];

    for (const build of CANDIDATES) {
      const shape = build('{id}');
      const res = { urlShape: shape, tested: probe.length, withEra: 0, withWins: 0, samples: [] };
      for (const p of probe) {
        try {
          const r = await fetch(build(p.id), { signal: AbortSignal.timeout(25000) });
          if (!r.ok) { res.samples.push({ name: p.name, httpStatus: r.status }); continue; }
          const j = await r.json();
          // Two documented response shapes: a top-level `stats` array
          // (/stats route) or `people[0].stats` (hydrate route). Checked
          // both rather than assuming which one this candidate returns.
          const blocks = j.stats || j.people?.[0]?.stats || [];
          const stat = blocks?.[0]?.splits?.[0]?.stat || null;
          if (stat?.era != null) res.withEra++;
          if (stat?.wins != null) res.withWins++;
          if (res.samples.length < 3) {
            res.samples.push({
              name: p.name,
              httpStatus: r.status,
              blockCount: blocks.length,
              era: stat?.era ?? null,
              wins: stat?.wins ?? null,
              losses: stat?.losses ?? null,
              statKeys: Object.keys(stat || {}).slice(0, 10),
            });
          }
        } catch (e) {
          res.samples.push({ name: p.name, error: String(e.message || e) });
        }
      }
      res.works = res.withEra === res.tested && res.tested > 0;
      out.candidates.push(res);
      console.log(`${res.works ? 'WORKS  ' : 'no     '} era=${res.withEra}/${res.tested} wins=${res.withWins}/${res.tested}  ${shape}`);
    }
    out.workingUrlShapes = out.candidates.filter((c) => c.works).map((c) => c.urlShape);

    // BULK. The per-id routes work, but a slate is 30 probables and 30 calls
    // per schedule refresh is exactly the shape Rule 78 exists to catch. If
    // /people?personIds= carries the same stats, the whole fix is ONE extra
    // request and the rate-limit question disappears rather than being
    // mitigated.
    const ids = pitchers.map((p) => p.id).join(',');
    const bulkUrl = `${MLB_STATS_BASE}/people?personIds=${ids}&hydrate=stats(group=pitching,type=season,season=${SEASON})`;
    const bulk = { urlShape: `${MLB_STATS_BASE}/people?personIds={csv}&hydrate=stats(group=pitching,type=season,season=${SEASON})`, requested: pitchers.length };
    try {
      const r = await fetch(bulkUrl, { signal: AbortSignal.timeout(30000) });
      bulk.httpStatus = r.status;
      bulk.urlLength = bulkUrl.length;
      if (r.ok) {
        const j = await r.json();
        const people = j.people || [];
        bulk.returned = people.length;
        bulk.withEra = people.filter((p) => p.stats?.[0]?.splits?.[0]?.stat?.era != null).length;
        bulk.withWins = people.filter((p) => p.stats?.[0]?.splits?.[0]?.stat?.wins != null).length;
        bulk.sample = people.slice(0, 2).map((p) => ({
          id: p.id, name: p.fullName,
          era: p.stats?.[0]?.splits?.[0]?.stat?.era ?? null,
          wins: p.stats?.[0]?.splits?.[0]?.stat?.wins ?? null,
          losses: p.stats?.[0]?.splits?.[0]?.stat?.losses ?? null,
        }));
        bulk.works = bulk.returned === bulk.requested && bulk.withEra >= bulk.requested - 1;
      } else {
        bulk.body = (await r.text()).slice(0, 200);
      }
    } catch (e) { bulk.error = String(e.message || e); }
    out.bulk = bulk;
    console.log(`\n${bulk.works ? 'BULK WORKS' : 'bulk no'} requested=${bulk.requested} returned=${bulk.returned} ` +
      `era=${bulk.withEra} urlLength=${bulk.urlLength} http=${bulk.httpStatus}`);
    console.log('bulk sample:', JSON.stringify(bulk.sample || bulk.body || bulk.error));
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }

  console.log('\nworking url shapes:', JSON.stringify(out.workingUrlShapes || [], null, 2));
  fs.mkdirSync('outbox', { recursive: true });
  fs.writeFileSync(`outbox/mlb-people-stats-manifest-${TS}.json`, JSON.stringify(out, null, 2));
  process.exit(0);
})();

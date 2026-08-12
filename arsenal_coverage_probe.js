// CC-CMD-2026-08-12-scouting-coverage-gaps — arsenal residual, same method.
//
// gamesWithArsenal has been 0 of 15 through every probe today, while
// gamesWithTempo is 15 of 15. That pairing is the whole lead: both getters key
// the SAME way --
//
//   getPitchTempo  : PITCHER_TEMPO[_mlbPlayerKey(lastNameOf(p))]
//   getPitchArsenal: PITCHER_ARSENAL[_mlbPlayerKey(lastNameOf(p))]
//
// and both tables are patched at runtime from the SAME endpoint shape by
// mlbStatsInit (src/legacy/field.js:4220):
//
//   /mlb-stats/pitch_tempo.json     -> Object.assign(PITCHER_TEMPO, d)
//   /mlb-stats/pitch_arsenals.json  -> Object.assign(PITCHER_ARSENAL, d)
//
// So key derivation is already PROVEN good by tempo's 15/15 -- whatever is
// wrong is downstream of the key. Three candidates, which this separates:
//
//   (a) the arsenals file does not load (404 / empty / different filename)
//   (b) it loads but is keyed differently from pitch_tempo
//   (c) it loads and keys match, but the entries fail the render gate:
//         getPitchArsenal needs  d.pitches.length
//         the render needs       topWhiff.whiffRate != null
//       -- and the source comment at src/legacy/field.js:3928 warns Savant's
//       arsenal export has no velocity column and uses runValuePer100, so a
//       field-name mismatch on whiffRate is a live possibility.
//
// Measuring the INPUTS rather than the rendered row, exactly as the park and
// standings gaps were settled today.
//
// Read-only.

const fs = require('fs');

const MLB_RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const MLB_STATS_BASE = 'https://statsapi.mlb.com/api/v1';
const DATE = process.env.PROBE_DATE || new Date().toISOString().slice(0, 10);
const TS = new Date().toISOString().replace(/[:.]/g, '-');

// Reproduced from src/legacy/field.js. _MLB_SUFFIX_TOKENS is parsed from
// source rather than guessed -- it is the exception set, and inventing it
// would defeat the measurement.
function suffixTokensFromSource(path) {
  const s = fs.readFileSync(path, 'utf8');
  const m = /_MLB_SUFFIX_TOKENS\s*=\s*new Set\(\[([^\]]*)\]/.exec(s);
  if (!m) return new Set();
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1].toLowerCase()));
}
const SUFFIXES = suffixTokensFromSource('src/legacy/field.js');

function lastNameOf(raw) {
  const parts = String(raw || '').split(' ').filter(Boolean);
  if (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    const suffix = parts.pop();
    return `${parts.pop() || ''} ${suffix}`.trim();
  }
  return parts.pop() || '';
}
function mlbPlayerKey(lastName) {
  let s = String(lastName || '').toLowerCase();
  s = s.split(',')[0].trim();
  s = s.replace(' jr.', '').replace(' sr.', '').replace(' ii', '').replace(' iii', '');
  return s.replace(/[\s-]/g, '_');
}

async function loadTable(name) {
  const url = `${MLB_RELAY}/mlb-stats/${name}.json`;
  const out = { name, url };
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
    out.httpStatus = r.status;
    // X-Source distinguishes the relay's R2-first hit from its
    // raw.githubusercontent fallback (field-relay-nba src/index.js:13623).
    // Without it, "the relay serves 0 entries" cannot be attributed to a
    // layer -- and the whole question here is WHICH layer is empty.
    out.xSource = r.headers.get('x-source') || null;
    if (!r.ok) { out.body = (await r.text()).slice(0, 200); return out; }
    const json = await r.json();
    // mlbStatsInit unwraps `json.data || json` -- reproduced, because a
    // wrapper mismatch is itself one of the candidate causes.
    const data = json.data || json;
    out.wrapped = !!json.data;
    out.isObject = data && typeof data === 'object';
    out.entryCount = out.isObject ? Object.keys(data).length : 0;
    out.sampleKeys = out.isObject ? Object.keys(data).slice(0, 8) : [];
    out._data = data;
  } catch (e) { out.error = String(e.message || e); }
  return out;
}

(async () => {
  const out = { ts: TS, date: DATE, suffixTokenCount: SUFFIXES.size };
  try {
    const [tempo, arsenal] = await Promise.all([
      loadTable('pitch_tempo'), loadTable('pitch_arsenals'),
    ]);

    // The relay's own fallback target, fetched directly. If this is populated
    // while the relay serves 0, the R2 object is shadowing good data rather
    // than the data being absent -- two very different bugs in two different
    // repos.
    const RAW = 'https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/mlb';
    for (const n of ['pitch_arsenals', 'pitch_tempo']) {
      const o = { name: n };
      try {
        const rr = await fetch(`${RAW}/${n}.json`, { signal: AbortSignal.timeout(25000) });
        o.httpStatus = rr.status;
        if (rr.ok) {
          const jj = await rr.json();
          const dd = jj.data || jj;
          o.entryCount = dd && typeof dd === 'object' ? Object.keys(dd).length : 0;
          o.updated = jj.updated ?? null;
        }
      } catch (e) { o.error = String(e.message || e); }
      (out.githubRaw ||= {})[n] = o;
    }
    console.log('github raw:', JSON.stringify(out.githubRaw));

    const sr = await fetch(`${MLB_STATS_BASE}/schedule?sportId=1&date=${DATE}&hydrate=probablePitcher`,
      { signal: AbortSignal.timeout(30000) });
    const sj = await sr.json();
    const pitchers = [];
    for (const d of (sj.dates || [])) {
      for (const g of (d.games || [])) {
        for (const side of ['home', 'away']) {
          const p = g.teams?.[side]?.probablePitcher;
          if (p?.fullName) pitchers.push(p.fullName);
        }
      }
    }
    out.probableCount = pitchers.length;

    const T = tempo._data || {}, A = arsenal._data || {};
    out.pitchers = pitchers.map((full) => {
      const key = mlbPlayerKey(lastNameOf(full));
      const a = A[key];
      const pitches = a?.pitches;
      const topWhiff = Array.isArray(pitches) && pitches.length
        ? [...pitches].sort((x, y) => (y.whiffRate ?? -1) - (x.whiffRate ?? -1))[0]
        : null;
      return {
        fullName: full, key,
        tempoHit: key in T,
        arsenalHit: key in A,
        // The two conditions BEYOND the key that the render also needs.
        hasPitchesArray: Array.isArray(pitches) && pitches.length > 0,
        topWhiffRate: topWhiff ? (topWhiff.whiffRate ?? null) : null,
        // Field names actually present on a pitch object -- this is what
        // distinguishes "no data" from "data under a different field name".
        pitchFieldNames: (Array.isArray(pitches) && pitches[0])
          ? Object.keys(pitches[0]) : null,
        wouldRender: !!(topWhiff && topWhiff.whiffRate != null),
      };
    });

    const n = out.pitchers.length;
    out.summary = {
      tables: {
        pitch_tempo:    { status: tempo.httpStatus,   xSource: tempo.xSource,   entries: tempo.entryCount,   sampleKeys: tempo.sampleKeys },
        pitch_arsenals: { status: arsenal.httpStatus, xSource: arsenal.xSource, entries: arsenal.entryCount, sampleKeys: arsenal.sampleKeys, error: arsenal.error, body: arsenal.body },
        githubRawFallback: out.githubRaw,
      },
      probables: n,
      tempoKeyHits:   out.pitchers.filter((x) => x.tempoHit).length,
      arsenalKeyHits: out.pitchers.filter((x) => x.arsenalHit).length,
      withPitchesArray: out.pitchers.filter((x) => x.hasPitchesArray).length,
      withNonNullWhiff: out.pitchers.filter((x) => x.topWhiffRate != null).length,
      wouldRender:      out.pitchers.filter((x) => x.wouldRender).length,
      // If arsenalKeyHits is 0 while tempoKeyHits is high, the tables are keyed
      // differently -- and these two lists say how.
      arsenalSampleKeys: arsenal.sampleKeys,
      todayKeysSample: out.pitchers.slice(0, 8).map((x) => x.key),
      pitchFieldNamesSeen: [...new Set(out.pitchers.flatMap((x) => x.pitchFieldNames || []))],
    };
  } catch (e) {
    out.error = String(e && e.message ? e.message : e);
  }

  console.log(JSON.stringify(out.summary || out, null, 2));
  fs.mkdirSync('outbox', { recursive: true });
  // _data stripped: the full tables are large and the manifest is evidence,
  // not a cache.
  const slim = { ...out };
  fs.writeFileSync(`outbox/arsenal-coverage-manifest-${TS}.json`, JSON.stringify(slim, null, 2));
  process.exit(0);
})();

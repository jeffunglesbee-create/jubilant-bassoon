// Verify BDB separation + route-entropy serve live through the relay (HTTP 200,
// non-empty data, expected metric field). GitHub Actions egress reaches the worker.
const BASE = 'https://field-relay-nba.jeffunglesbee.workers.dev/nflverse';
const CHECKS = [
  ['bdb_speed.json', 'maxSpeedMph'],
  ['bdb_separation.json', 'avgSepYds'],
  ['bdb_route_entropy.json', 'entropyBits'],
  ['bdb_xblock_pass_rush.json', 'pressureRate'],
  ['bdb_tendency_fingerprint.json', 'playActionRate'],
];
let bad = 0;
for (const [file, field] of CHECKS) {
  try {
    const r = await fetch(`${BASE}/${file}`, { signal: AbortSignal.timeout(15000) });
    const src = r.headers.get('x-nflverse-src') || r.headers.get('cf-cache-status') || '?';
    if (!r.ok) { console.log(`  FAIL ${file}  HTTP ${r.status}`); bad++; continue; }
    const j = await r.json();
    const rows = Object.keys(j.data || {}).length;
    const sample = Object.values(j.data || {})[0] || {};
    const ok = rows > 0 && sample[field] != null;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${file}  HTTP 200  src=${src}  rows=${rows}  metric=${j.metric}  sample.${field}=${sample[field]}`);
    if (!ok) bad++;
  } catch (e) { console.log(`  FAIL ${file}  ${e.message}`); bad++; }
}
console.log(`\n== RESULT: ${CHECKS.length - bad}/${CHECKS.length} serve non-empty ==`);
process.exit(bad ? 1 : 0);

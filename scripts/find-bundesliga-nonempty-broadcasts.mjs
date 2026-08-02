// One-shot CI probe (workflow_dispatch only). Every check so far
// (this session and prior ones) returned data.broadcasts: []. Before
// trusting _fetchBundesligaRealBroadcastStreams's field-name extraction,
// find a REAL matchday with a non-empty broadcasts array to inspect its
// actual shape -- searching several real matchdays across the completed
// 2025-26 season (not just the one already checked, MD33).

import { writeFileSync } from 'fs';

const RELAY_BASE = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const SEASON = '2025-2026';
const MATCHDAYS_TO_CHECK = [1, 5, 10, 15, 20, 25, 30, 34];

async function main() {
  const results = [];
  for (const md of MATCHDAYS_TO_CHECK) {
    const entry = { matchday: md, resolveOk: null, dayId: null, comId: null, broadcastsOk: null, broadcastCount: null, sampleBroadcast: null };
    try {
      const r1 = await fetch(`${RELAY_BASE}/bundesliga-bapi/resolve-dayid?season=${SEASON}&matchday=${md}`);
      const b1 = await r1.json();
      entry.resolveOk = b1?.ok === true;
      entry.dayId = b1?.dayId; entry.comId = b1?.comId;
      if (entry.resolveOk) {
        const r2 = await fetch(`${RELAY_BASE}/bundesliga-bapi/broadcasts?comId=${encodeURIComponent(b1.comId)}&dayId=${encodeURIComponent(b1.dayId)}`);
        const b2 = await r2.json();
        entry.broadcastsOk = b2?.available === true;
        const arr = b2?.data?.broadcasts;
        entry.broadcastCount = Array.isArray(arr) ? arr.length : null;
        if (Array.isArray(arr) && arr.length) entry.sampleBroadcast = arr[0];
      }
    } catch (e) {
      entry.error = String(e).slice(0, 200);
    }
    console.log(JSON.stringify(entry));
    results.push(entry);
  }
  const nonEmpty = results.filter(r => r.broadcastCount > 0);
  const out = { season: SEASON, results, nonEmptyFound: nonEmpty.length > 0, nonEmptyEntries: nonEmpty };
  writeFileSync('outbox/find-bundesliga-nonempty-broadcasts-result.json', JSON.stringify(out, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(out, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

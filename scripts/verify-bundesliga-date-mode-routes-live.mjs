// One-shot CI probe (workflow_dispatch only). CC-CMD-2026-08-02-wire-
// bundesliga-broadcasts-date-mode TASK 1: fresh, live confirmation that
// both /bundesliga-bapi/resolve-dayid (date-mode) and
// /bundesliga-bapi/broadcasts are still deployed and working, for a real
// known (season, date) pair -- reusing the same one already cross-
// verified in field-relay-nba's own CC-CMD (2025-2026, 2026-05-09,
// matchday 33).

import { writeFileSync } from 'fs';

const RELAY_BASE = 'https://field-relay-nba.jeffunglesbee.workers.dev';
const SEASON = '2025-2026';
const DATE = '2026-05-09';

async function main() {
    const out = { season: SEASON, date: DATE, resolveOk: null, broadcastsOk: null, error: null };
    try {
        const r1 = await fetch(`${RELAY_BASE}/bundesliga-bapi/resolve-dayid?season=${SEASON}&date=${DATE}`);
        const b1 = await r1.json();
        out.resolve = b1;
        out.resolveOk = b1?.ok === true && !!b1.dayId && !!b1.comId;

        if (out.resolveOk) {
            const r2 = await fetch(`${RELAY_BASE}/bundesliga-bapi/broadcasts?comId=${encodeURIComponent(b1.comId)}&dayId=${encodeURIComponent(b1.dayId)}`);
            const b2 = await r2.json();
            out.broadcasts = b2;
            out.broadcastsOk = b2?.available === true && b2?.data && typeof b2.data === 'object';
        }
    } catch (e) {
        out.error = String(e).slice(0, 300);
    }
    console.log(JSON.stringify(out, null, 2));
    writeFileSync('outbox/verify-bundesliga-date-mode-routes-live-result.json', JSON.stringify(out, null, 2));
    if (!out.resolveOk || !out.broadcastsOk) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

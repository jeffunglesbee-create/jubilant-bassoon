// One-shot CI probe (workflow_dispatch only). CC-CMD-2026-08-02-URGENT-
// trigger-deploy-gate TASK 2: real, live verification that the deployed
// site actually reflects what's been on main -- deploy-gate.yml is now
// confirmed firing successfully on push (most recent: cb80abea,
// success), but this task's own curl verification was never completed
// in the original session. Closing that gap for real.

import { writeFileSync } from 'fs';

const SITE = 'https://jubilant-bassoon.jeffunglesbee.workers.dev/';

async function main() {
  const out = { hasNflDramaProfiles: null, nflSample: null, hasPeriodGte5: null, error: null, swVersionMatch: null, swVersionSample: null };
  try {
    const r = await fetch(SITE);
    const html = await r.text();
    const nflMatch = html.match(/NFL_DRAMA_PROFILES\s*=\s*\{[^}]{0,80}/);
    out.hasNflDramaProfiles = !!nflMatch;
    out.nflSample = nflMatch ? nflMatch[0] : null;
    out.hasPeriodGte5 = /period\s*>=\s*5/.test(html);
    out.status = r.status;
    // Real diagnostic for deploy-drift-detector.yml run 2 (2026-08-02) reporting
    // liveStatus:200 but liveSwVersion:null -- fetch worked, extraction didn't.
    // Same regex detect-deploy-drift.mjs uses: /SW_VERSION\s*=\s*'([^']+)'/
    const swMatch = html.match(/SW_VERSION\s*=\s*'([^']+)'/);
    out.swVersionMatch = swMatch ? swMatch[1] : null;
    out.swVersionSample = swMatch ? html.slice(Math.max(0, swMatch.index - 40), swMatch.index + 60) : null;
    out.htmlLength = html.length;
  } catch (e) {
    out.error = String(e).slice(0, 300);
  }
  console.log(JSON.stringify(out, null, 2));
  writeFileSync('outbox/verify-live-deploy-content-result.json', JSON.stringify(out, null, 2));
  if (!out.hasNflDramaProfiles) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

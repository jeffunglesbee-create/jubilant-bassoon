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
    // Round 2 diagnostic: swVersionMatch came back null even with real,
    // full-length (1.9MB) HTML fetched. Find out whether "SW_VERSION" as a
    // bare substring exists ANYWHERE in the deployed bundle, and if so, in
    // what shape -- esbuild's ESM bundler renames top-level identifiers to
    // avoid cross-module collisions even with minify:false, which could
    // turn `const SW_VERSION = '...'` into `const SW_VERSION2 = '...'` or
    // similar in the bundled output actually served.
    const idx = html.indexOf('SW_VERSION');
    out.rawSwVersionIndexOf = idx;
    out.rawSwVersionContext = idx === -1 ? null : html.slice(Math.max(0, idx - 60), idx + 120);
    // Also check the window-global assignment form and the sw.js registration line.
    out.hasWindowSwVersion = /window\.SW_VERSION/.test(html);
    out.hasSwJsQueryParam = /\/sw\.js\?v=/.test(html);
  } catch (e) {
    out.error = String(e).slice(0, 300);
  }
  console.log(JSON.stringify(out, null, 2));
  writeFileSync('outbox/verify-live-deploy-content-result.json', JSON.stringify(out, null, 2));
  if (!out.hasNflDramaProfiles) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

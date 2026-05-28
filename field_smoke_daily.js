// FIELD daily snapshot check — SLATE ACCURACY for a specific day.
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS (read STANDARDS.md → "Smoke Gate Architecture (2026-05-28)")
//   smoke.js          → structural invariants (feature/function presence). BLOCKS every commit.
//   field_smoke.js    → per-day INVARIANTS (render well-formedness). BLOCKS every commit.
//                       Self-syncing (system date), no answer-key → can NEVER false-fail.
//   field_smoke_daily.js (THIS FILE) → per-day SNAPSHOT ACCURACY (exact slate).
//                       Run by the DAILY-UPDATE workflow ONLY, where the real slate is known.
//                       NOT wired into the pre-commit hook, so it never blocks code/doc commits.
//
// The split exists so a code change (refactor, fix, doc) is never blocked by whether
// today's game cards happen to be configured. That coupling is what used to force
// `git commit --no-verify`. Snapshot accuracy is a daily-update concern, enforced here.
//
// DAILY WORKFLOW USAGE:
//   1. After updating today's slate in index.html, fill DAILY_EXPECTED below.
//   2. Run:  node field_smoke_daily.js [path/to/index.html]
//   3. Must exit 0 before the daily-update commit is pushed.
//
// Verifies against index.html DATA (string presence), not the rendered DOM —
// the Node harness does not drive renderAll(), so DOM-based slate checks are unreliable.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');

const INDEX_PATH = process.argv[2] || path.join(__dirname, 'index.html');
const html = fs.readFileSync(INDEX_PATH, 'utf8');

// today in America/New_York
const _ny = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
const TODAY_ISO = _ny.getFullYear() + '-' +
  String(_ny.getMonth() + 1).padStart(2, '0') + '-' +
  String(_ny.getDate()).padStart(2, '0');

// ═══════════════════════════════════════════════════════════════════════════
// DAILY_EXPECTED — EDIT THIS BLOCK during every daily update, then run this file.
//   date     : must equal today (America/NY). Guards against a stale, unsynced config.
//   games    : the slate you verified against source (MLB.com / Sports Media Watch / etc.).
//              Each {home, away} must appear in index.html data; optional `network`
//              (a bundle key or chip text) must also appear.
//   networks : extra network/bundle keys that must be present for today (optional).
// Leave games:[] only on a day with no slate to verify. DO NOT invent matchups.
// ═══════════════════════════════════════════════════════════════════════════
const DAILY_EXPECTED = {
  date: TODAY_ISO,          // set explicitly to the date you verified, e.g. '2026-05-28'
  games: [
    // { home: 'San Antonio Spurs', away: 'Oklahoma City Thunder', network: 'NBA_NBC' },
  ],
  networks: [
    // 'MLB_APPLE', 'NBA_NBC'
  ],
};

let fail = 0;
const ok  = (m) => console.log('  ✅ ' + m);
const bad = (m) => { fail++; console.log('  ❌ ' + m); };

console.log('\n── FIELD Daily Snapshot Check ──────────────────────');
console.log('   today (NY): ' + TODAY_ISO + '  ·  index: ' + INDEX_PATH + '\n');

// 1. Config freshness — the daily gate. A stale config means the slate was not synced.
if (DAILY_EXPECTED.date !== TODAY_ISO)
  bad(`Config stale: DAILY_EXPECTED.date=${DAILY_EXPECTED.date} but today=${TODAY_ISO} — sync the slate`);
else
  ok(`Config date matches today (${TODAY_ISO})`);

// 2. Today's date must appear in index.html data (data overlay is current).
if (!html.includes(TODAY_ISO))
  bad(`Today (${TODAY_ISO}) not found in index.html data — daily data overlay not applied`);
else
  ok(`Today's date present in index.html data`);

// 3. Each expected matchup must be present in the data.
if (DAILY_EXPECTED.games.length === 0) {
  ok('No games configured to verify (set DAILY_EXPECTED.games during daily update)');
} else {
  for (const g of DAILY_EXPECTED.games) {
    const hasHome = g.home && html.includes(g.home);
    const hasAway = g.away && html.includes(g.away);
    if (!hasHome || !hasAway)
      bad(`Matchup missing in data: ${g.away||'?'} @ ${g.home||'?'}` +
          (!hasHome ? ' [home not found]' : '') + (!hasAway ? ' [away not found]' : ''));
    else if (g.network && !html.includes(g.network))
      bad(`${g.away} @ ${g.home}: network/bundle "${g.network}" not found in data`);
    else
      ok(`${g.away} @ ${g.home}${g.network ? ' · ' + g.network : ''}`);
  }
}

// 4. Extra required networks/bundles.
for (const n of DAILY_EXPECTED.networks) {
  if (!html.includes(n)) bad(`Required network/bundle "${n}" not found in data`);
  else ok(`Network/bundle present: ${n}`);
}

console.log(`\n── Daily snapshot: ${fail === 0 ? 'PASS' : fail + ' FAILED'} ──────────────\n`);
process.exit(fail > 0 ? 1 : 0);

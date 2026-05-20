#!/usr/bin/env node
/**
 * FIELD Daily Brief — Email builder & sender
 * Called by daily-brief.yml after schedule data is fetched and timing wait completes.
 *
 * Reads from env vars pre-set by the workflow:
 *   TODAY, DAY, NBA_COUNT, NHL_COUNT, SOCCER_COUNT, TENNIS_NOTE,
 *   SW_STATUS, RELAY_STATUS, EARLIEST_GAME, SEND_REASON,
 *   NBA_GAMES_JSON, SOCCER_GAMES_JSON
 */

const https = require('https');

const {
  RESEND_API_KEY,
  FIELD_EMAIL,
  TODAY,
  DAY,
  NBA_COUNT = '0',
  NHL_COUNT = '0',
  MLB_COUNT = '0',
  WNBA_COUNT = '0',
  AFL_COUNT = '0',
  SOCCER_COUNT = '0',
  TENNIS_NOTE = '',
  SW_STATUS = 'unknown',
  RELAY_STATUS = 'unknown',
  EARLIEST_GAME = 'none',
  SEND_REASON = 'scheduled',
  NBA_GAMES_JSON = '[]',
  NHL_GAMES_JSON = '[]',
  MLB_GAMES_JSON = '[]',
  WNBA_GAMES_JSON = '[]',
  AFL_GAMES_JSON = '[]',
  SOCCER_GAMES_JSON = '[]',
} = process.env;

function parseGames(jsonStr) {
  try { return JSON.parse(jsonStr); } catch { return []; }
}

const nbaGames = parseGames(NBA_GAMES_JSON);
const nhlGames = parseGames(NHL_GAMES_JSON);
const mlbGames = parseGames(MLB_GAMES_JSON);
const wnbaGames = parseGames(WNBA_GAMES_JSON);
const aflGames = parseGames(AFL_GAMES_JSON);
const soccerGames = parseGames(SOCCER_GAMES_JSON);

const nbaLines = nbaGames.length
  ? nbaGames.map(g => `  ${g.away} @ ${g.home} — ${g.time}`).join('\n')
  : '  (no NBA games today)';

const nhlLines = nhlGames.length
  ? nhlGames.slice(0, 6).map(g => `  ${g.away} @ ${g.home} — ${g.time} UTC`).join('\n')
  : '  (no NHL games today)';

const mlbLines = mlbGames.length
  ? mlbGames.slice(0, 6).map(g => `  ${g.away} @ ${g.home} — ${g.time} UTC`).join('\n')
  : '  (no MLB games today)';

const wnbaLines = wnbaGames.length
  ? wnbaGames.slice(0, 6).map(g => `  ${g.away} @ ${g.home} — ${g.time}`).join('\n')
  : '  (no WNBA games today)';

const aflLines = aflGames.length
  ? aflGames.slice(0, 5).map(g => `  ${g.away} @ ${g.home} [${g.round}] — ${g.time} UTC`).join('\n')
  : '  (no AFL games today)';

const soccerLines = soccerGames.length
  ? soccerGames.slice(0, 6).map(g =>
      `  ${g.away} @ ${g.home} [${g.comp}] — ${g.time}`
    ).join('\n')
  : '  (no tracked soccer today)';

const trigger = `Run the daily FIELD update for ${TODAY}`;

// ── HTML email ───────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html>
<body style="font-family:monospace;max-width:600px;margin:0 auto;padding:20px;background:#0f0f0f;color:#e5e5e5">

<h1 style="color:#facc15;font-size:22px;margin:0 0 4px">&#9889; FIELD Daily Brief</h1>
<p style="color:#6b7280;margin:0 0 20px;font-size:13px">${DAY}</p>

<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-bottom:14px">
  <p style="color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px">Today's Slate</p>
  <p style="margin:0 0 6px;font-size:13px">&#127944; NBA &mdash; <strong>${NBA_COUNT} games</strong></p>
  <pre style="color:#d1d5db;font-size:11px;margin:0 0 12px;line-height:1.5">${nbaLines}</pre>
  <p style="margin:0 0 6px;font-size:13px">&#127944; NHL &mdash; <strong>${NHL_COUNT} games</strong></p>
  <pre style="color:#d1d5db;font-size:11px;margin:0 0 12px;line-height:1.5">${nhlLines}</pre>
  <p style="margin:0 0 6px;font-size:13px">&#9918; MLB &mdash; <strong>${MLB_COUNT} games</strong></p>
  <pre style="color:#d1d5db;font-size:11px;margin:0 0 12px;line-height:1.5">${mlbLines}</pre>
  <p style="margin:0 0 6px;font-size:13px">&#127944; WNBA &mdash; <strong>${WNBA_COUNT} games</strong></p>
  <pre style="color:#d1d5db;font-size:11px;margin:0 0 12px;line-height:1.5">${wnbaLines}</pre>
  <p style="margin:0 0 6px;font-size:13px">&#127944; AFL &mdash; <strong>${AFL_COUNT} games</strong></p>
  <pre style="color:#d1d5db;font-size:11px;margin:0 0 12px;line-height:1.5">${aflLines}</pre>
  <p style="margin:0 0 6px;font-size:13px">&#9917; Soccer &mdash; <strong>${SOCCER_COUNT} games</strong></p>
  <pre style="color:#d1d5db;font-size:11px;margin:0 0 10px;line-height:1.5">${soccerLines}</pre>
  ${TENNIS_NOTE ? `<p style="margin:0;font-size:13px">&#127939; Tennis &mdash; ${TENNIS_NOTE}</p>` : ''}
</div>

<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:16px;margin-bottom:14px">
  <p style="color:#9ca3af;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin:0 0 8px">System Health</p>
  <p style="margin:0 0 4px;font-size:12px">SW_VERSION: ${SW_STATUS}</p>
  <p style="margin:0;font-size:12px">Relay: ${RELAY_STATUS}</p>
</div>

</body>
</html>`;

// ── Plain text fallback ──────────────────────────────────────────────────────
const text = [
  `FIELD Daily Brief — ${DAY}`,
  '',
  `TRIGGER: ${trigger}`,
  '',
  `NBA: ${NBA_COUNT} games`,
  nbaLines,
  '',
  `NHL: ${NHL_COUNT} games`,
  nhlLines,
  '',
  `MLB: ${MLB_COUNT} games`,
  mlbLines,
  '',
  `WNBA: ${WNBA_COUNT} games`,
  wnbaLines,
  '',
  `AFL: ${AFL_COUNT} games`,
  aflLines,
  '',
  `Soccer: ${SOCCER_COUNT} games`,
  soccerLines,
  TENNIS_NOTE ? `Tennis: ${TENNIS_NOTE}` : '',
  '',
  `SW_VERSION: ${SW_STATUS}`,
  `Relay: ${RELAY_STATUS}`,
].filter(l => l !== undefined).join('\n');

// ── Send via Resend ──────────────────────────────────────────────────────────
const payload = JSON.stringify({
  from: 'FIELD <onboarding@resend.dev>',
  to: [FIELD_EMAIL],
  subject: `\u26A1 FIELD Brief \u2014 ${DAY}`,
  html,
  text,
});

// Preflight checks — surface config issues before making the API call
if (!RESEND_API_KEY) {
  console.error('FATAL: RESEND_API_KEY is not set. Check GitHub Actions secret.');
  process.exit(1);
}
if (!FIELD_EMAIL) {
  console.error('FATAL: FIELD_EMAIL is not set in workflow env.');
  process.exit(1);
}

console.log(`Sending to: ${FIELD_EMAIL} via Resend`);
console.log(`From: FIELD <onboarding@resend.dev>`);
console.log(`Subject: ⚡ FIELD Brief — ${DAY}`);

const req = https.request({
  hostname: 'api.resend.com',
  path: '/emails',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    if (ok) {
      console.log(`✅ Sent successfully — HTTP ${res.statusCode}: ${body}`);
    } else {
      console.error(`❌ Resend API error — HTTP ${res.statusCode}: ${body}`);
      if (res.statusCode === 401) console.error('→ Check RESEND_API_KEY in GitHub Secrets');
      if (res.statusCode === 422) console.error('→ Domain restriction: onboarding@resend.dev may require a verified custom domain');
      if (res.statusCode === 429) console.error('→ Rate limited by Resend — will self-resolve');
    }
    process.exit(ok ? 0 : 1);
  });
});

req.on('error', e => {
  console.error(`❌ Network error calling Resend API: ${e.message}`);
  process.exit(1);
});
req.write(payload);
req.end();

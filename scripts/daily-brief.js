#!/usr/bin/env node
/**
 * FIELD Daily Brief — Email builder & sender
 * Called by daily-brief.yml with env vars pre-set.
 * Sends via Resend API.
 */

const https = require('https');

const {
  RESEND_API_KEY,
  FIELD_EMAIL,
  TODAY,
  DAY,
  NBA_COUNT,
  NHL_COUNT,
  SW_STATUS,
  RELAY_STATUS,
  EARLIEST_GAME,
  SEND_REASON,
  NBA_GAMES_JSON,
} = process.env;

const nbaGames = JSON.parse(NBA_GAMES_JSON || '[]');
const gameLines = nbaGames.map(g =>
  `  ${g.away} @ ${g.home} — ${g.time}`
).join('\n') || '  (no NBA data)';

const trigger = `Run the daily FIELD update for ${TODAY}`;

const html = `<!DOCTYPE html>
<html>
<body style="font-family:monospace;max-width:600px;margin:0 auto;padding:20px;background:#111;color:#e5e5e5">

<h1 style="color:#facc15;font-size:20px;margin:0 0 4px">⚡ FIELD Daily Brief</h1>
<p style="color:#6b7280;margin:0 0 20px">${DAY}</p>

<div style="background:#1c1c1c;border:1px solid #333;border-radius:8px;padding:16px;margin-bottom:16px">
  <p style="color:#9ca3af;font-size:11px;text-transform:uppercase;margin:0 0 8px">TRIGGER — paste into Claude</p>
  <code style="color:#4ade80;font-size:15px">${trigger}</code>
</div>

<div style="background:#1c1c1c;border:1px solid #333;border-radius:8px;padding:16px;margin-bottom:16px">
  <p style="color:#9ca3af;font-size:11px;text-transform:uppercase;margin:0 0 12px">TODAY'S SLATE</p>
  <p style="margin:0 0 6px">🏀 NBA: <strong>${NBA_COUNT} games</strong></p>
  <pre style="color:#d1d5db;font-size:12px;margin:0 0 12px">${gameLines}</pre>
  <p style="margin:0">🏒 NHL: <strong>${NHL_COUNT} games</strong></p>
</div>

<div style="background:#1c1c1c;border:1px solid #333;border-radius:8px;padding:16px;margin-bottom:16px">
  <p style="color:#9ca3af;font-size:11px;text-transform:uppercase;margin:0 0 8px">REPO STATE</p>
  <p style="margin:0 0 4px">SW_VERSION: ${SW_STATUS}</p>
  <p style="margin:0">Relay: ${RELAY_STATUS}</p>
</div>

<p style="color:#374151;font-size:11px;margin-top:20px">
  Triggered by: ${SEND_REASON}<br>
  Earliest game: ${EARLIEST_GAME}<br>
  daily-brief.yml &middot; jubilant-bassoon
</p>

</body>
</html>`;

const text = [
  `FIELD Daily Brief — ${DAY}`,
  '',
  `TRIGGER: ${trigger}`,
  '',
  `NBA today: ${NBA_COUNT} games`,
  gameLines,
  '',
  `NHL today: ${NHL_COUNT} games`,
  '',
  `SW_VERSION: ${SW_STATUS}`,
  `Relay: ${RELAY_STATUS}`,
  `Triggered by: ${SEND_REASON}`,
].join('\n');

const payload = JSON.stringify({
  from: 'FIELD <onboarding@resend.dev>',
  to: [FIELD_EMAIL],
  subject: `⚡ FIELD Brief — ${DAY}`,
  html,
  text,
});

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
    console.log(`HTTP ${res.statusCode}: ${body}`);
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});

req.on('error', e => { console.error(e); process.exit(1); });
req.write(payload);
req.end();

#!/usr/bin/env node
/**
 * FIELD Night Owl Email — Morning-after drama alert
 * Rule 28 action layer for the Night Owl intelligence feature.
 *
 * Called by night-owl-email.yml after fetching yesterday's ESPN results.
 * Finds the highest-drama completed game and emails a recap.
 *
 * Drama detection from final scores (CI-side heuristic — no live drama history):
 *   - Any OT/extra innings game: always qualifies (overtime = drama by definition)
 *   - Basketball: score diff ≤ 5 in final (close game signal)
 *   - Baseball: score diff ≤ 2 runs (tight game)
 *   - Hockey: score diff ≤ 1 goal or shootout
 *   - Soccer: draw or score diff ≤ 1
 *   - Any sport: score diff ≤ 3 in a playoff game
 *
 * Threshold: DRAMA_THRESHOLD env var (default: heuristic score ≥ 3)
 *
 * Reads from env vars set by night-owl-email.yml:
 *   YESTERDAY_DATE, RESEND_API_KEY, FIELD_EMAIL
 *   ESPN_GAMES_JSON — array of completed games from ESPN API
 */

const https = require('https');

const {
  RESEND_API_KEY,
  FIELD_EMAIL = 'jeffunglesbee@gmail.com',
  YESTERDAY_DATE,
  ESPN_GAMES_JSON = '[]',
} = process.env;

if (!RESEND_API_KEY) {
  console.log('ℹ️  RESEND_API_KEY not set — night owl email skipped');
  process.exit(0);
}

function parseGames(jsonStr) {
  try { return JSON.parse(jsonStr); } catch { return []; }
}

// ── Drama heuristic ──────────────────────────────────────────────────────────
// Returns a drama score 0-10. 0 = not dramatic, ≥3 = send email.
function dramaTierHeuristic(game) {
  const {
    sport = '', homeScore = 0, awayScore = 0,
    isOT = false, isShootout = false,
    isPlayoff = false, scoreDiff,
  } = game;

  const diff = scoreDiff !== undefined
    ? scoreDiff
    : Math.abs((homeScore || 0) - (awayScore || 0));

  let score = 0;

  // OT/extra innings: always dramatic
  if (isOT || isShootout) score += 5;

  // Playoff games: baseline bump
  if (isPlayoff) score += 2;

  // Sport-specific close game thresholds
  const sp = sport.toLowerCase();
  if (sp === 'basketball' || sp === 'nba' || sp === 'wnba') {
    if (diff <= 3) score += 4;
    else if (diff <= 6) score += 2;
    else if (diff <= 10) score += 1;
  } else if (sp === 'baseball' || sp === 'mlb') {
    if (diff === 0) score += 3; // tie = extra innings (already counted above usually)
    else if (diff === 1) score += 4;
    else if (diff === 2) score += 2;
  } else if (sp === 'hockey' || sp === 'nhl') {
    if (diff <= 1) score += 4;
    else if (diff === 2) score += 1;
  } else if (sp === 'soccer' || sp === 'football') {
    if (diff === 0) score += 3; // draw
    else if (diff === 1) score += 2;
  } else {
    // Generic: any close game
    if (diff <= 3) score += 3;
    else if (diff <= 7) score += 1;
  }

  return score;
}

// ── Email builder ────────────────────────────────────────────────────────────
function buildEmailHTML(game, yesterdayStr) {
  const {
    away, home, awayScore, homeScore,
    sport, league, isOT, isShootout,
    isPlayoff, seriesRecord,
    startTime,
  } = game;

  const homeWon = (homeScore || 0) >= (awayScore || 0);
  const winner  = homeWon ? home : away;
  const loser   = homeWon ? away : home;
  const winnerScore = homeWon ? homeScore : awayScore;
  const loserScore  = homeWon ? awayScore : homeScore;
  const diff    = Math.abs((homeScore || 0) - (awayScore || 0));
  const score   = `${awayScore}–${homeScore}`;

  let descriptor = 'tight';
  if (isOT)       descriptor = 'overtime';
  if (isShootout) descriptor = 'shootout';
  if (diff <= 1)  descriptor = 'one-possession';
  if (diff === 0) descriptor = 'extra-innings';

  const overtimeStr = isOT       ? ' (OT)'
                    : isShootout ? ' (SO)'
                    : '';

  const leagueDisplay = league || sport || 'Sports';
  const seriesStr = seriesRecord ? `<br><span style="color:#94a3b8;font-size:.85em">${seriesRecord}</span>` : '';
  const playoffStr = isPlayoff ? `<span style="background:#1e3a5f;color:#60a5fa;font-size:.7em;font-weight:700;padding:.15rem .4rem;border-radius:4px;text-transform:uppercase;letter-spacing:.06em;margin-right:.4rem">Playoffs</span>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FIELD Night Owl — ${yesterdayStr}</title>
</head>
<body style="background:#0a0f14;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="margin-bottom:24px">
      <span style="color:#f97316;font-size:.65em;font-weight:800;letter-spacing:.12em;text-transform:uppercase">🦉 FIELD Night Owl</span>
      <div style="color:#64748b;font-size:.8em;margin-top:.2rem">${yesterdayStr}</div>
    </div>

    <!-- Game hero card -->
    <div style="background:#111827;border:1px solid #1e293b;border-left:3px solid #f97316;border-radius:10px;padding:20px 22px;margin-bottom:20px">
      <div style="margin-bottom:12px">
        ${playoffStr}<span style="color:#94a3b8;font-size:.7em;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${leagueDisplay}</span>
      </div>

      <!-- Matchup -->
      <div style="font-size:1.05em;font-weight:700;color:#f1f5f9;line-height:1.3;margin-bottom:8px">
        ${away} @ ${home}${seriesStr}
      </div>

      <!-- Score -->
      <div style="font-size:2rem;font-weight:900;color:#f1f5f9;letter-spacing:-.02em;margin-bottom:4px">
        ${score}${overtimeStr}
      </div>

      <!-- Headline -->
      <div style="color:#94a3b8;font-size:.85em;line-height:1.5">
        ${winner} ${diff <= 1 ? 'edged' : diff <= 3 ? 'held off' : 'defeated'} ${loser} ${winnerScore}–${loserScore} in a ${descriptor} finish.
      </div>
    </div>

    <!-- Why this matters -->
    <div style="background:#0f172a;border-radius:8px;padding:14px 16px;margin-bottom:20px;color:#94a3b8;font-size:.82em;line-height:1.6">
      <span style="color:#f97316;font-weight:700">FIELD Drama Signal: </span>
      ${isOT || isShootout
        ? `Game went to ${isShootout ? 'a shootout' : 'overtime'} — maximum late-game tension.`
        : diff <= 2
        ? `Final margin of ${diff === 1 ? 'one' : 'two'} — decided in the final moments.`
        : `Close finish — ${winner} held on against ${loser}.`
      }
    </div>

    <!-- Open FIELD CTA -->
    <div style="text-align:center;margin:24px 0">
      <a href="https://jubilant-bassoon.jeffunglesbee.workers.dev"
         style="background:#f97316;color:#fff;text-decoration:none;font-weight:800;font-size:.82em;letter-spacing:.07em;text-transform:uppercase;padding:.6rem 1.6rem;border-radius:7px;display:inline-block">
        Open FIELD →
      </a>
    </div>

    <!-- Footer -->
    <div style="color:#334155;font-size:.7em;text-align:center;padding-top:16px;border-top:1px solid #1e293b">
      FIELD · Global Sports Intelligence · Not affiliated with any broadcaster
    </div>

  </div>
</body>
</html>`;
}

// ── Resend sender ────────────────────────────────────────────────────────────
function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from:    'FIELD <onboarding@resend.dev>',
      to:      [to],
      subject,
      html,
    });
    const req = https.request({
      hostname: 'api.resend.com',
      path:     '/emails',
      method:   'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Resend ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const games = parseGames(ESPN_GAMES_JSON);

  if (!games.length) {
    console.log('ℹ️  No completed games found for yesterday — no night owl email');
    process.exit(0);
  }

  console.log(`📊 Evaluating ${games.length} completed games for drama...`);

  // Score each game and pick the highest drama one
  const scored = games
    .map(g => ({ game: g, drama: dramaTierHeuristic(g) }))
    .filter(({ drama }) => drama >= 3) // threshold: 3+ = notable
    .sort((a, b) => b.drama - a.drama);

  if (!scored.length) {
    console.log('💤 No high-drama games found — night owl email skipped');
    console.log('Games evaluated:', games.map(g =>
      `${g.away||'?'} @ ${g.home||'?'} (${g.sport||'?'}) diff=${Math.abs((g.homeScore||0)-(g.awayScore||0))} OT=${g.isOT||false}`
    ).join(', '));
    process.exit(0);
  }

  const top = scored[0];
  console.log(`🔥 Top drama game: ${top.game.away} @ ${top.game.home} (score: ${top.drama}/10)`);

  const yesterdayStr = YESTERDAY_DATE
    ? new Date(YESTERDAY_DATE + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
    : 'Last Night';

  const diff = Math.abs((top.game.homeScore || 0) - (top.game.awayScore || 0));
  const subject = top.game.isOT || top.game.isShootout
    ? `🦉 Night Owl: ${top.game.away} vs ${top.game.home} went to ${top.game.isShootout ? 'a shootout' : 'overtime'}`
    : diff <= 2
    ? `🦉 Night Owl: ${top.game.away} vs ${top.game.home} — decided by ${diff === 1 ? '1' : '2'}`
    : `🦉 Night Owl: Close finish — ${top.game.away} @ ${top.game.home}`;

  const html = buildEmailHTML(top.game, yesterdayStr);

  try {
    const result = await sendEmail({ to: FIELD_EMAIL, subject, html });
    console.log(`✅ Night owl email sent (id: ${result.id})`);
    console.log(`   To: ${FIELD_EMAIL}`);
    console.log(`   Subject: ${subject}`);
  } catch (err) {
    console.error('❌ Resend error:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

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

const FETCH_HAS_TIMEOUT = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function';

// ── Level 1: relay journalism brief ─────────────────────────────────────────
// Calls /journalism/game/{espnEventId} with an 8s timeout. Returns the brief
// string or null. Any failure (no id, non-2xx, timeout, parse error) returns
// null so the caller falls back to template prose — email never blocks on the
// relay being up.
async function fetchRelayBrief(espnEventId /* sport unused — relay routes by id */) {
  if (!espnEventId) return null;
  try {
    const url = `https://field-relay-nba.jeffunglesbee.workers.dev/journalism/game/${espnEventId}`;
    const opts = FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(8000) } : {};
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const data = await res.json();
    return data.brief || data.text || null;
  } catch (e) {
    console.log('Relay brief unavailable, using template fallback:', e.message);
    return null;
  }
}

// ── Level 2: chip taxonomy + design tokens ──────────────────────────────────
function buildLeagueChip(game) {
  const chips = {
    nba:    { bg: '#1e3a5f', color: '#60a5fa', label: 'NBA'     },
    nhl:    { bg: '#1a2e1a', color: '#4ade80', label: 'NHL'     },
    mlb:    { bg: '#2d1a1a', color: '#f87171', label: 'MLB'     },
    soccer: { bg: '#1a1a2e', color: '#a78bfa', label: 'WC 2026' },
    wnba:   { bg: '#2d1a2e', color: '#f472b6', label: 'WNBA'    },
  };
  const s  = (game.sport || '').toLowerCase();
  const sp = s.includes('soccer')     ? 'soccer'
           : s.includes('hockey')     ? 'nhl'
           : s.includes('baseball')   ? 'mlb'
           : s.includes('basketball') ? 'nba'
           : s.includes('wnba')       ? 'wnba'
           : 'nba';
  const c = chips[sp] || chips.nba;
  return `<span style="background:${c.bg};color:${c.color};font-size:.65em;`
       + `font-weight:700;padding:.15rem .45rem;border-radius:4px;`
       + `text-transform:uppercase;letter-spacing:.06em">${c.label}</span>`;
}

const PLAYOFF_CHIP = `<span style="background:#1e3a5f;color:#0d9488;font-size:.65em;`
  + `font-weight:700;padding:.15rem .45rem;border-radius:4px;`
  + `text-transform:uppercase;letter-spacing:.06em;margin-left:.4rem">PLAYOFF</span>`;

const OT_CHIP = `<span style="background:#2d2000;color:#f59e0b;font-size:.65em;`
  + `font-weight:700;padding:.15rem .45rem;border-radius:4px;`
  + `text-transform:uppercase;letter-spacing:.06em;margin-left:.4rem">OT</span>`;

// ── Level 5: Scorecard (CI adaptation — no localStorage) ────────────────────
function scoreToGrade(score) {
  const base = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
  const threshold = { A: 90, B: 75, C: 60, D:  0 }[base];
  const next      = { A: 100, B: 90, C: 75, D: 60 }[base];
  const range = next - threshold;
  const pos = range > 0 ? (score - threshold) / range : 0;
  const mod = pos >= 0.75 ? (base !== 'A' ? '+' : (score >= 96 ? '+' : ''))
            : pos <= 0.15 ? '-' : '';
  return base + mod;
}

function ciDramaScore(game) {
  const h = dramaTierHeuristic(game);
  return Math.min(h * 10, 100);
}

function ciClosenessScore(game) {
  const diff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
  if (game.isOT || game.isShootout) return 90;
  const sp = (game.sport || '').toLowerCase();
  if (sp.includes('basketball')) {
    if (diff <= 2)  return 85;
    if (diff <= 5)  return 75;
    if (diff <= 8)  return 62;
    if (diff <= 12) return 48;
    return 30;
  }
  if (sp.includes('hockey') || sp.includes('soccer')) {
    if (diff === 0) return 85;
    if (diff === 1) return 78;
    if (diff === 2) return 55;
    return 30;
  }
  // Baseball / generic
  if (diff === 1) return 82;
  if (diff === 2) return 68;
  if (diff === 3) return 50;
  return 32;
}

function ciPlotScore(game) {
  if (!game.isPlayoff) return game.isNational ? 68 : 35;
  const sr = (game.seriesRecord || '').toLowerCase();
  const isElimination = sr.includes('leads 3') || sr.includes('3-0') || sr.includes('3-1');
  const isDeciding    = sr.includes('3-3') || sr.includes('3-2');
  if (isElimination) return 95;
  if (isDeciding)    return 90;
  if (sr && sr !== '0-0') return 80;
  return 72;
}

function computeScorecardCI(game) {
  return {
    dramaGrade:     scoreToGrade(ciDramaScore(game)),
    closenessGrade: scoreToGrade(ciClosenessScore(game)),
    plotGrade:      scoreToGrade(ciPlotScore(game)),
  };
}

function gradeColor(grade) {
  const base = grade[0];
  return base === 'A' ? '#c9a84c'
       : base === 'B' ? '#4a9eff'
       : base === 'C' ? '#888888'
       : '#555555';
}

function becauseSentence(dimension, grade, game) {
  if (!['A+','A','A-','B+'].includes(grade)) return '';
  const diff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
  if (dimension === 'drama') {
    if (game.isOT || game.isShootout) return 'Went to overtime — maximum late-game tension.';
    if (diff <= 2) return `Final margin of ${diff === 1 ? 'one' : 'two'} — decided in the closing moments.`;
    return 'High-drama finish by heuristic score.';
  }
  if (dimension === 'closeness') {
    if (game.isOT) return 'Tied at the buzzer — competitive throughout.';
    return `Final margin of ${diff} — closely contested from start.`;
  }
  if (dimension === 'plot') {
    const sr = game.seriesRecord || '';
    if (sr.toLowerCase().includes('leads 3')) return 'Elimination game — winner advances, loser goes home.';
    if (sr.includes('3-3')) return 'Game 7 — winner-take-all.';
    if (game.isPlayoff) return sr ? `Series: ${sr}.` : 'Playoff game.';
    return '';
  }
  return '';
}

function buildScorecardHTML(scorecard, game) {
  const { dramaGrade, closenessGrade, plotGrade } = scorecard;
  const dims = [
    { label: 'DRAMA',     grade: dramaGrade,     dim: 'drama'     },
    { label: 'CLOSENESS', grade: closenessGrade, dim: 'closeness' },
    { label: 'PLOT',      grade: plotGrade,      dim: 'plot'      },
  ];
  const becauses = dims
    .map(d => becauseSentence(d.dim, d.grade, game))
    .filter(Boolean);

  const cells = dims.map(d => `
          <td style="padding-right:24px;vertical-align:top">
            <div style="font-size:.55rem;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-bottom:3px">
              ${d.label}
            </div>
            <div style="font-size:1.2rem;font-weight:800;color:${gradeColor(d.grade)};font-family:'DM Mono',monospace">
              ${d.grade}
            </div>
          </td>`).join('');

  return `
    <div style="margin:16px 0;padding:14px 16px;background:#0d1117;border:1px solid #1e293b;border-radius:8px">
      <div style="font-size:.55em;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:10px">
        THE FIELD SCORECARD
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
      ${becauses.length ? `
        <div style="margin-top:10px;font-size:.75em;color:#64748b;line-height:1.5">
          ${becauses.join(' ')}
        </div>` : ''}
    </div>`;
}

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

// ── Sport-specific language helper ───────────────────────────────────────────
// Returns sport-accurate terminology for OT labels, descriptors, and signals.
// Centralises all sport-language decisions so they're only in one place.
function getSportLanguage(game, diff) {
  const sp = (game.sport || '').toLowerCase();
  const isBB  = sp === 'baseball' || sp === 'mlb';
  const isHK  = sp === 'hockey'   || sp === 'nhl';
  const isSoc = sp === 'soccer'   || sp === 'football';
  const { isOT = false, isShootout = false } = game;

  let otShort   = '';   // appended to score: ' (OT)', ' (XI)', ' (SO)', ''
  let otSubject = '';   // subject-line phrase: 'overtime', 'extra innings', 'a shootout'
  let otSignal  = '';   // drama signal sentence opener
  let descriptor = 'tight';

  if (isShootout) {
    otShort    = ' (SO)';
    otSubject  = 'a shootout';
    otSignal   = 'Game went to a shootout';
    descriptor = 'shootout';
  } else if (isOT) {
    if (isBB) {
      otShort    = ' (XI)';           // XI = extra innings (standard baseball notation)
      otSubject  = 'extra innings';
      otSignal   = 'Game went to extra innings';
      descriptor = 'extra-innings';
    } else {
      otShort    = ' (OT)';
      otSubject  = 'overtime';
      otSignal   = 'Game went to overtime';
      descriptor = 'overtime';
    }
  } else {
    // Non-OT close-game descriptor — sport-specific
    if (isBB) {
      descriptor = diff === 1 ? 'one-run' : diff === 2 ? 'two-run' : 'tight';
    } else if (isHK || isSoc) {
      descriptor = diff <= 1 ? 'one-goal' : diff <= 2 ? 'two-goal' : 'tight';
    } else {
      // Basketball / generic
      descriptor = diff <= 1 ? 'one-possession' : diff <= 3 ? 'close' : 'tight';
    }
  }

  return { otShort, otSubject, otSignal, descriptor };
}

// ── Level 3: Quick Recap row (template-only) ────────────────────────────────
function buildQuickRecapRow(game) {
  const diff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
  const homeWon = (game.homeScore || 0) >= (game.awayScore || 0);
  const winner = homeWon ? game.home : game.away;
  const { descriptor } = getSportLanguage(game, diff);
  const seriesTail = game.isPlayoff && game.seriesRecord
    ? `<span style="color:#64748b;font-size:.85em"> Series: ${game.seriesRecord}</span>`
    : '';
  return `<tr>
    <td style="padding:6px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:.8em">
      <span style="color:#f1f5f9;font-weight:600">${game.away} ${game.awayScore}-${game.homeScore} ${game.home}</span>
      &nbsp;— ${winner} in a ${descriptor} finish.${seriesTail}
    </td>
  </tr>`;
}

// ── Level 3: Tonight slate (NBA + NHL + MLB + WC pre-game) ──────────────────
async function fetchTonightSlate(dateStr) {
  if (!dateStr) return [];
  const espnDate = dateStr.replace(/-/g, '');
  const sports = [
    { key: 'basketball/nba',   label: 'NBA' },
    { key: 'hockey/nhl',       label: 'NHL' },
    { key: 'baseball/mlb',     label: 'MLB' },
    { key: 'soccer/fifa.world',label: 'WC'  },
  ];
  const upcoming = [];
  for (const { key, label } of sports) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${key}/scoreboard?dates=${espnDate}`;
      const opts = FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(5000) } : {};
      const res = await fetch(url, opts);
      if (!res.ok) continue;
      const data = await res.json();
      for (const ev of data.events || []) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const status = comp.status?.type?.state;
        if (status !== 'pre') continue;
        const teams = comp.competitors || [];
        const home = teams.find(t => t.homeAway === 'home');
        const away = teams.find(t => t.homeAway === 'away');
        const notes = (comp.notes || []).map(n => n.headline || '').join(' ').toLowerCase();
        const isPlayoff = notes.includes('playoff') || ev.season?.type === 3
          || (ev.season?.slug || '').includes('knockout');
        const startTime = ev.date
          ? new Date(ev.date).toLocaleTimeString('en-US',
              { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET'
          : 'TBD';
        upcoming.push({
          label,
          espnEventId: ev.id,
          isPlayoff,
          home: home?.team?.shortDisplayName || home?.team?.displayName || '?',
          away: away?.team?.shortDisplayName || away?.team?.displayName || '?',
          startTime,
          priority: isPlayoff ? 2 : label === 'WC' ? 1 : 0,
        });
      }
    } catch (_) { /* silent per game source */ }
  }
  return upcoming.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

// ── Level 4a: Odds Story (line movement narrative) ──────────────────────────
async function fetchOddsStory(espnEventId) {
  if (!espnEventId) return null;
  try {
    const url = `https://field-relay-nba.jeffunglesbee.workers.dev/odds/history/${espnEventId}`;
    const opts = FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(5000) } : {};
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.opening || !data.current) return null;
    const drift = Math.abs(data.current.spread - data.opening.spread);
    if (drift < 2) return null;
    const dir = data.current.spread < data.opening.spread ? 'shortened' : 'drifted out';
    const fmt = n => `${n > 0 ? '+' : ''}${n}`;
    return `Line ${dir} from ${fmt(data.opening.spread)} to ${fmt(data.current.spread)}.`;
  } catch (_) { return null; }
}

// ── Level 4b: Lineup staleness (MLB only — SP change since brief written) ──
async function checkLineupsChanged(espnEventId, briefText) {
  if (!espnEventId || !briefText) return null;
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${espnEventId}`;
    const opts = FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(5000) } : {};
    const res = await fetch(url, opts);
    if (!res.ok) return null;
    const data = await res.json();
    const starterName = data.lineups?.home?.starters?.[0]?.athlete?.displayName;
    if (!starterName) return null;
    const lastName = starterName.split(' ').pop();
    if (!briefText.includes(lastName)) {
      return 'Lineup may have changed since this was written.';
    }
    return null;
  } catch (_) { return null; }
}

// ── Email builder ────────────────────────────────────────────────────────────
// Level 1: briefText (relay journalism) replaces the template headline when present.
// Level 2: design system — Chakra Petch + DM Mono, gold #f59e0b, chip taxonomy,
//          hyphen score format.
// Level 3: quickRecaps + tonightSlate render as Sections 2 and 3 below the
//          hero card. Each is optional — empty array hides the section.
// Level 4a: tonightOdds map ({espnEventId: "Line shortened from ..."} ) appends
//           a line-movement sentence under matching slate rows.
// Level 4b: stalenessWarning (string|null) renders above briefText prose when
//           the MLB summary endpoint says SP changed since the brief was written.
// Level 5: scorecard (precomputed in main()) injected between brief and CTA.
function buildEmailHTML(game, yesterdayStr, briefText, scorecard,
                        quickRecaps = [], tonightSlate = [], tonightOdds = {},
                        stalenessWarning = null) {
  const {
    away, home, awayScore, homeScore,
    sport, isOT, isShootout,
    isPlayoff, seriesRecord,
  } = game;

  const homeWon = (homeScore || 0) >= (awayScore || 0);
  const winner  = homeWon ? home : away;
  const loser   = homeWon ? away : home;
  const winnerScore = homeWon ? homeScore : awayScore;
  const loserScore  = homeWon ? awayScore : homeScore;
  const diff    = Math.abs((homeScore || 0) - (awayScore || 0));
  const score   = `${awayScore}-${homeScore}`;

  const { otSignal, descriptor } = getSportLanguage({ sport, isOT, isShootout }, diff);

  const leagueChip   = buildLeagueChip(game);
  const playoffChip  = isPlayoff               ? PLAYOFF_CHIP : '';
  const otChip       = (isOT || isShootout)    ? OT_CHIP      : '';
  const seriesStr    = seriesRecord ? `<br><span style="color:#94a3b8;font-size:.85em">${seriesRecord}</span>` : '';

  const headlineProse = briefText
    ? briefText
    : `${winner} ${diff <= 1 ? 'edged' : diff <= 3 ? 'held off' : 'defeated'} ${loser} ${winnerScore}-${loserScore} in ${/^[aeiou]/i.test(descriptor) ? 'an' : 'a'} ${descriptor} finish.`;

  const scorecardHTML = scorecard ? buildScorecardHTML(scorecard, game) : '';

  // Level 4b: SP-changed warning above the brief prose
  const stalenessHTML = stalenessWarning ? `
        <div style="color:#f59e0b;font-size:.75em;font-weight:600;margin-bottom:6px">
          ⚠ ${stalenessWarning}
        </div>` : '';

  // Level 3: Quick Recaps section (template, no LLM)
  const recapsHTML = quickRecaps.length ? `
    <div style="margin-bottom:20px">
      <div style="font-size:.55em;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">
        QUICK RECAPS
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
        ${quickRecaps.map(buildQuickRecapRow).join('')}
      </table>
    </div>` : '';

  // Level 3: What to Watch Tonight section + Level 4a odds story
  const tonightHTML = tonightSlate.length ? `
    <div style="margin-bottom:20px">
      <div style="font-size:.55em;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">
        WHAT TO WATCH TONIGHT
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
        ${tonightSlate.map(g => {
          const oddsLine = tonightOdds[g.espnEventId];
          return `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:.8em;line-height:1.5">
              <span style="background:#1e293b;color:#94a3b8;font-size:.65em;font-weight:700;padding:.12rem .4rem;border-radius:4px;letter-spacing:.06em;margin-right:.4rem">${g.label}</span>
              ${g.isPlayoff ? '<span style="background:#1e3a5f;color:#0d9488;font-size:.65em;font-weight:700;padding:.12rem .4rem;border-radius:4px;letter-spacing:.06em;margin-right:.4rem">PLAYOFF</span>' : ''}
              <span style="color:#f1f5f9;font-weight:600">${g.away} @ ${g.home}</span>
              <span style="color:#64748b"> · ${g.startTime}</span>
              ${oddsLine ? `<div style="color:#64748b;font-size:.85em;margin-top:3px">${oddsLine}</div>` : ''}
            </td>
          </tr>`;
        }).join('')}
      </table>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FIELD Night Owl — ${yesterdayStr}</title>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;800&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
</head>
<body style="background:#0a0f14;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="margin-bottom:24px">
      <span style="color:#f59e0b;font-size:.65em;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-family:'Chakra Petch',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">🦉 FIELD Night Owl</span>
      <div style="color:#64748b;font-size:.8em;margin-top:.2rem">${yesterdayStr}</div>
    </div>

    <!-- Game hero card -->
    <div style="background:#111827;border:1px solid #1e293b;border-left:3px solid #f59e0b;border-radius:10px;padding:20px 22px;margin-bottom:20px">
      <div style="margin-bottom:12px">
        ${leagueChip}${playoffChip}${otChip}
      </div>

      <!-- Matchup -->
      <div style="font-size:1.05em;font-weight:700;color:#f1f5f9;line-height:1.3;margin-bottom:8px;font-family:'Chakra Petch',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        ${away} @ ${home}${seriesStr}
      </div>

      <!-- Score -->
      <div style="font-size:2rem;font-weight:500;color:#f1f5f9;letter-spacing:-.02em;margin-bottom:4px;font-family:'DM Mono',ui-monospace,Menlo,Consolas,monospace">
        ${score}
      </div>

      <!-- Headline / relay brief -->
      <div style="color:#94a3b8;font-size:.85em;line-height:1.5">${stalenessHTML}
        ${headlineProse}
      </div>
    </div>

    <!-- Why this matters -->
    <div style="background:#0f172a;border-radius:8px;padding:14px 16px;margin-bottom:20px;color:#94a3b8;font-size:.82em;line-height:1.6">
      <span style="color:#f59e0b;font-weight:700">FIELD Drama Signal: </span>
      ${isOT || isShootout
        ? `${otSignal} — maximum late-game tension.`
        : diff <= 2
        ? `Final margin of ${diff === 1 ? 'one' : 'two'} — decided in the final moments.`
        : `Close finish — ${winner} held on against ${loser}.`
      }
    </div>
${scorecardHTML}
${recapsHTML}
${tonightHTML}
    <!-- Open FIELD CTA -->
    <div style="text-align:center;margin:24px 0">
      <a href="https://jubilant-bassoon.jeffunglesbee.workers.dev"
         style="background:#f59e0b;color:#0a0f14;text-decoration:none;font-weight:800;font-size:.82em;letter-spacing:.07em;text-transform:uppercase;padding:.6rem 1.6rem;border-radius:7px;display:inline-block;font-family:'Chakra Petch',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
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
  const { otSubject } = getSportLanguage(top.game, diff);

  const subject = top.game.isOT || top.game.isShootout
    ? `🦉 Night Owl: ${top.game.away} vs ${top.game.home} went to ${otSubject}`
    : diff <= 2
    ? `🦉 Night Owl: ${top.game.away} vs ${top.game.home} — decided by ${diff === 1 ? '1' : '2'}`
    : `🦉 Night Owl: Close finish — ${top.game.away} @ ${top.game.home}`;

  // Level 1: relay journalism brief (graceful null on any failure).
  const briefText = await fetchRelayBrief(top.game.espnEventId, top.game.sport);
  if (briefText) {
    console.log(`📝 Relay brief: ${briefText.substring(0, 80)}…`);
  }

  // Level 5: precompute scorecard so buildEmailHTML stays presentational.
  const scorecard = computeScorecardCI(top.game);
  console.log(`🏷️  Scorecard: drama ${scorecard.dramaGrade} · close ${scorecard.closenessGrade} · plot ${scorecard.plotGrade}`);

  // Level 3: Quick recaps — next 2-3 drama-scoring games (excluding the top).
  const quickRecaps = scored.slice(1, 4)
    .filter(s => s.drama >= 2)
    .map(s => s.game);
  if (quickRecaps.length) {
    console.log(`📰 Quick recaps: ${quickRecaps.length} game(s)`);
  }

  // Level 3: Tonight slate (only when TODAY_DATE is set by the workflow).
  const tonightSlate = process.env.TODAY_DATE
    ? await fetchTonightSlate(process.env.TODAY_DATE)
    : [];
  console.log(`🌙 Tonight slate: ${tonightSlate.length} game(s)`);

  // Level 4a: Odds story per slate row (silent null on failure).
  const tonightOdds = {};
  for (const g of tonightSlate) {
    const line = await fetchOddsStory(g.espnEventId);
    if (line) {
      tonightOdds[g.espnEventId] = line;
      console.log(`📈 Odds story (${g.away} @ ${g.home}): ${line}`);
    }
  }

  // Level 4b: Staleness warning — MLB top game only.
  let stalenessWarning = null;
  const topSport = (top.game.sport || '').toLowerCase();
  if (briefText && (topSport === 'baseball' || topSport === 'mlb')) {
    stalenessWarning = await checkLineupsChanged(top.game.espnEventId, briefText);
    if (stalenessWarning) {
      console.log(`⚠ Staleness warning: ${stalenessWarning}`);
    }
  }

  const html = buildEmailHTML(
    top.game, yesterdayStr, briefText, scorecard,
    quickRecaps, tonightSlate, tonightOdds, stalenessWarning,
  );

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

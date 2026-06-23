# CC-CMD: fetchKeyPlayer — Level 6 Night Owl Email Attribution
**Date:** 2026-06-23  
**Target:** jubilant-bassoon `scripts/night-owl-email.js`  
**Status:** READY — copy file content below verbatim, commit, run node --check

## What changed (vs current file at HEAD 3b24374)

1. New `fetchKeyPlayer(espnEventId, sport, homeTeam, awayTeam, homeWon)` function inserted before `// ── Email builder` comment
2. `buildEmailHTML` signature: added `keyPlayer = null` as 9th param
3. `keyPlayerHTML` variable in `buildEmailHTML`: DM Mono div, null-safe
4. `${keyPlayerHTML}` injected in template after score div, before brief prose  
5. `main()`: calls `fetchKeyPlayer` after scorecard, logs `🏅 Key player:` if non-null
6. `buildEmailHTML` call in `main()`: passes `keyPlayer` as 9th argument

## Sport logic

- **Soccer**: `keyEvents` type=goal → group by player → `"⚽ Messi 38' · 90+5'"`
- **NHL**: `keyEvents` type=gwg (fallback: last goal) → `"🥅 GWG: McDavid 14:32"`
- **MLB**: `boxscore.teams` pitching stats, W decision flag → `"🏆 W: Cole 7.0 IP, 1 ER"`
- **NBA**: `leaders` array, points leader → `"⭐ Jokic · 34 pts"`

All failures silent null — email never blocks on ESPN being up.

## Root cause of original blocker

Python `\uD83E\uDD45` in f-strings → `UnicodeEncodeError: surrogates not allowed`.  
Fix: use `chr(0x1F945)` in Python; the JS file carries literal UTF-8 emoji which commit cleanly.

## Verification

```bash
node --check scripts/night-owl-email.js
# exits 0

ESPN_GAMES_JSON='[{"away":"Argentina","home":"France","awayScore":3,"homeScore":3,"isShootout":true,"sport":"soccer","espnEventId":"760456"}]' \
RESEND_API_KEY=re_test FIELD_EMAIL=jeffunglesbee@gmail.com \
node scripts/night-owl-email.js
# logs: 🔥 Top drama game, 🏅 Key player: ⚽ ..., fails at Resend (expected)
```

## Full replacement file

```javascript
#!/usr/bin/env node
/**
 * FIELD Night Owl Email — Morning-after drama alert
 * Levels 1-6 implemented.
 */

const https = require('https');
const FETCH_HAS_TIMEOUT = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function';

async function fetchRelayBrief(espnEventId) {
  if (!espnEventId) return null;
  try {
    const res = await fetch(`https://field-relay-nba.jeffunglesbee.workers.dev/journalism/game/${espnEventId}`, FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(8000) } : {});
    if (!res.ok) return null;
    const d = await res.json();
    return d.brief || d.text || null;
  } catch (e) { console.log('Relay brief unavailable:', e.message); return null; }
}

function buildLeagueChip(game) {
  const chips = { nba: { bg: '#1e3a5f', color: '#60a5fa', label: 'NBA' }, nhl: { bg: '#1a2e1a', color: '#4ade80', label: 'NHL' }, mlb: { bg: '#2d1a1a', color: '#f87171', label: 'MLB' }, soccer: { bg: '#1a1a2e', color: '#a78bfa', label: 'WC 2026' }, wnba: { bg: '#2d1a2e', color: '#f472b6', label: 'WNBA' } };
  const s = (game.sport || '').toLowerCase();
  const sp = s.includes('soccer') ? 'soccer' : s.includes('hockey') ? 'nhl' : s.includes('baseball') ? 'mlb' : s.includes('basketball') ? 'nba' : s.includes('wnba') ? 'wnba' : 'nba';
  const c = chips[sp] || chips.nba;
  return `<span style="background:${c.bg};color:${c.color};font-size:.65em;font-weight:700;padding:.15rem .45rem;border-radius:4px;text-transform:uppercase;letter-spacing:.06em">${c.label}</span>`;
}

const PLAYOFF_CHIP = `<span style="background:#1e3a5f;color:#0d9488;font-size:.65em;font-weight:700;padding:.15rem .45rem;border-radius:4px;text-transform:uppercase;letter-spacing:.06em;margin-left:.4rem">PLAYOFF</span>`;

function buildOTChip(sport, isShootout) {
  const sp = (sport || '').toLowerCase();
  const label = isShootout ? 'SO' : sp.includes('baseball') ? 'XI' : sp.includes('soccer') ? 'ET' : 'OT';
  return `<span style="background:#2d2000;color:#f59e0b;font-size:.65em;font-weight:700;padding:.15rem .45rem;border-radius:4px;text-transform:uppercase;letter-spacing:.06em;margin-left:.4rem">${label}</span>`;
}

function scoreToGrade(score) {
  const base = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
  const threshold = { A: 90, B: 75, C: 60, D: 0 }[base], next = { A: 100, B: 90, C: 75, D: 60 }[base];
  const pos = next > threshold ? (score - threshold) / (next - threshold) : 0;
  const mod = pos >= 0.75 ? (base !== 'A' ? '+' : score >= 96 ? '+' : '') : pos <= 0.15 ? '-' : '';
  return base + mod;
}

function ciDramaScore(game) { return Math.min(dramaTierHeuristic(game) * 10, 100); }

function ciClosenessScore(game) {
  const diff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
  if (game.isOT || game.isShootout) return 90;
  const sp = (game.sport || '').toLowerCase();
  if (sp.includes('basketball')) { if (diff <= 2) return 85; if (diff <= 5) return 75; if (diff <= 8) return 62; if (diff <= 12) return 48; return 30; }
  if (sp.includes('hockey') || sp.includes('soccer')) { if (diff === 0) return 85; if (diff === 1) return 78; if (diff === 2) return 55; return 30; }
  if (diff === 1) return 82; if (diff === 2) return 68; if (diff === 3) return 50; return 32;
}

function ciPlotScore(game) {
  if (!game.isPlayoff) return game.isNational ? 68 : 35;
  const sr = (game.seriesRecord || '').toLowerCase();
  if (sr.includes('leads 3') || sr.includes('3-0') || sr.includes('3-1')) return 95;
  if (sr.includes('3-3') || sr.includes('3-2')) return 90;
  if (sr && sr !== '0-0') return 80; return 72;
}

function computeScorecardCI(game) {
  return { dramaGrade: scoreToGrade(ciDramaScore(game)), closenessGrade: scoreToGrade(ciClosenessScore(game)), plotGrade: scoreToGrade(ciPlotScore(game)) };
}

function gradeColor(grade) { return grade[0] === 'A' ? '#c9a84c' : grade[0] === 'B' ? '#4a9eff' : grade[0] === 'C' ? '#888888' : '#555555'; }

function becauseSentence(dimension, grade, game) {
  if (!['A+','A','A-','B+'].includes(grade)) return '';
  const diff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
  if (dimension === 'drama') { if (game.isOT || game.isShootout) { return (game.sport||'').toLowerCase().includes('baseball') ? 'Went to extra innings — maximum late-game tension.' : 'Went to overtime — maximum late-game tension.'; } if (diff <= 2) return `Final margin of ${diff === 1 ? 'one' : 'two'} — decided in the closing moments.`; return 'High-drama finish by heuristic score.'; }
  if (dimension === 'closeness') { if (game.isOT) { const _sp = (game.sport||'').toLowerCase(); if (_sp.includes('baseball')) return 'Tied through nine — competitive throughout.'; if (_sp.includes('soccer')) return 'Tied through ninety — contested throughout.'; return 'Tied through regulation — competitive throughout.'; } return `Final margin of ${diff} — closely contested from start.`; }
  if (dimension === 'plot') { const sr = game.seriesRecord || ''; if (sr.toLowerCase().includes('leads 3')) return 'Elimination game — winner advances, loser goes home.'; if (sr.includes('3-3')) return 'Game 7 — winner-take-all.'; if (game.isPlayoff) return sr ? `Series: ${sr}.` : 'Playoff game.'; return ''; }
  return '';
}

function buildScorecardHTML(scorecard, game) {
  const dims = [{ label: 'DRAMA', grade: scorecard.dramaGrade, dim: 'drama' }, { label: 'CLOSENESS', grade: scorecard.closenessGrade, dim: 'closeness' }, { label: 'PLOT', grade: scorecard.plotGrade, dim: 'plot' }];
  const becauses = dims.map(d => becauseSentence(d.dim, d.grade, game)).filter(Boolean);
  const cells = dims.map(d => `<td style="padding-right:24px;vertical-align:top"><div style="font-size:.55rem;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-bottom:3px">${d.label}</div><div style="font-size:1.2rem;font-weight:800;color:${gradeColor(d.grade)};font-family:'DM Mono',monospace">${d.grade}</div></td>`).join('');
  return `<div style="margin:16px 0;padding:14px 16px;background:#0d1117;border:1px solid #1e293b;border-radius:8px"><div style="font-size:.55em;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:10px">THE FIELD SCORECARD</div><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>${becauses.length ? `<div style="margin-top:10px;font-size:.75em;color:#64748b;line-height:1.5">${becauses.join(' ')}</div>` : ''}</div>`;
}

const { RESEND_API_KEY, FIELD_EMAIL = 'jeffunglesbee@gmail.com', YESTERDAY_DATE, ESPN_GAMES_JSON = '[]' } = process.env;
if (!RESEND_API_KEY) { console.log('ℹ️  RESEND_API_KEY not set — night owl email skipped'); process.exit(0); }

function parseGames(jsonStr) { try { return JSON.parse(jsonStr); } catch { return []; } }

function dramaTierHeuristic(game) {
  const { sport = '', homeScore = 0, awayScore = 0, isOT = false, isShootout = false, isPlayoff = false, scoreDiff } = game;
  const diff = scoreDiff !== undefined ? scoreDiff : Math.abs((homeScore || 0) - (awayScore || 0));
  let score = 0;
  if (isOT || isShootout) score += 5;
  if (isPlayoff) score += 2;
  const sp = sport.toLowerCase();
  if (sp === 'basketball' || sp === 'nba' || sp === 'wnba') { if (diff <= 3) score += 4; else if (diff <= 6) score += 2; else if (diff <= 10) score += 1; }
  else if (sp === 'baseball' || sp === 'mlb') { if (diff === 0) score += 3; else if (diff === 1) score += 4; else if (diff === 2) score += 2; }
  else if (sp === 'hockey' || sp === 'nhl') { if (diff <= 1) score += 4; else if (diff === 2) score += 1; }
  else if (sp === 'soccer' || sp === 'football') { if (diff === 0) score += 3; else if (diff === 1) score += 2; }
  else { if (diff <= 3) score += 3; else if (diff <= 7) score += 1; }
  return score;
}

function getSportLanguage(game, diff) {
  const sp = (game.sport || '').toLowerCase();
  const isBB = sp === 'baseball' || sp === 'mlb', isHK = sp === 'hockey' || sp === 'nhl', isSoc = sp === 'soccer' || sp === 'football';
  const { isOT = false, isShootout = false } = game;
  let otShort = '', otSubject = '', otSignal = '', descriptor = 'tight';
  if (isShootout) { otShort = ' (SO)'; otSubject = 'a shootout'; otSignal = 'Game went to a shootout'; descriptor = 'shootout'; }
  else if (isOT) { if (isBB) { otShort = ' (XI)'; otSubject = 'extra innings'; otSignal = 'Game went to extra innings'; descriptor = 'extra-innings'; } else { otShort = ' (OT)'; otSubject = 'overtime'; otSignal = 'Game went to overtime'; descriptor = 'overtime'; } }
  else { if (isBB) descriptor = diff === 1 ? 'one-run' : diff === 2 ? 'two-run' : 'tight'; else if (isHK || isSoc) descriptor = diff <= 1 ? 'one-goal' : diff <= 2 ? 'two-goal' : 'tight'; else descriptor = diff <= 1 ? 'one-possession' : diff <= 3 ? 'close' : 'tight'; }
  return { otShort, otSubject, otSignal, descriptor };
}

function buildQuickRecapRow(game) {
  const diff = Math.abs((game.homeScore || 0) - (game.awayScore || 0));
  const winner = (game.homeScore || 0) >= (game.awayScore || 0) ? game.home : game.away;
  const { descriptor } = getSportLanguage(game, diff);
  const seriesTail = game.isPlayoff && game.seriesRecord ? `<span style="color:#64748b;font-size:.85em"> Series: ${game.seriesRecord}</span>` : '';
  return `<tr><td style="padding:6px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:.8em"><span style="color:#f1f5f9;font-weight:600">${game.away} ${game.awayScore}-${game.homeScore} ${game.home}</span> &nbsp;— ${winner} in a ${descriptor} finish.${seriesTail}</td></tr>`;
}

async function fetchTonightSlate(dateStr) {
  if (!dateStr) return [];
  const espnDate = dateStr.replace(/-/g, '');
  const sports = [{ key: 'basketball/nba', label: 'NBA' }, { key: 'hockey/nhl', label: 'NHL' }, { key: 'baseball/mlb', label: 'MLB' }, { key: 'soccer/fifa.world', label: 'WC' }];
  const upcoming = [];
  for (const { key, label } of sports) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${key}/scoreboard?dates=${espnDate}`, FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(5000) } : {});
      if (!res.ok) continue;
      const data = await res.json();
      for (const ev of data.events || []) {
        const comp = ev.competitions?.[0]; if (!comp || comp.status?.type?.state !== 'pre') continue;
        const home = (comp.competitors || []).find(t => t.homeAway === 'home'), away = (comp.competitors || []).find(t => t.homeAway === 'away');
        const notes = (comp.notes || []).map(n => n.headline || '').join(' ').toLowerCase();
        const isPlayoff = notes.includes('playoff') || ev.season?.type === 3 || (ev.season?.slug || '').includes('knockout');
        const startTime = ev.date ? new Date(ev.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET' : 'TBD';
        upcoming.push({ label, espnEventId: ev.id, isPlayoff, home: home?.team?.shortDisplayName || '?', away: away?.team?.shortDisplayName || '?', startTime, priority: isPlayoff ? 2 : label === 'WC' ? 1 : 0 });
      }
    } catch (_) {}
  }
  return upcoming.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

async function fetchOddsStory(espnEventId) {
  if (!espnEventId) return null;
  try {
    const res = await fetch(`https://field-relay-nba.jeffunglesbee.workers.dev/odds/history/${espnEventId}`, FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(5000) } : {});
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

async function checkLineupsChanged(espnEventId, briefText) {
  if (!espnEventId || !briefText) return null;
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${espnEventId}`, FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(5000) } : {});
    if (!res.ok) return null;
    const data = await res.json();
    const starterName = data.lineups?.home?.starters?.[0]?.athlete?.displayName;
    if (!starterName) return null;
    const lastName = starterName.split(' ').pop();
    return briefText.includes(lastName) ? null : 'Lineup may have changed since this was written.';
  } catch (_) { return null; }
}

// ── Level 6: Key Player attribution ──────────────────────────────────────────
async function fetchKeyPlayer(espnEventId, sport, homeTeam, awayTeam, homeWon) {
  if (!espnEventId) return null;
  const sp = (sport || '').toLowerCase();
  const isSoccer = sp.includes('soccer') || sp.includes('football');
  const isHockey = sp.includes('hockey') || sp === 'nhl';
  const isBaseball = sp.includes('baseball') || sp === 'mlb';
  const isBasketball = sp.includes('basketball') || sp === 'nba' || sp === 'wnba';
  let espnPath = null;
  if (isSoccer) espnPath = 'soccer/fifa.world';
  else if (isHockey) espnPath = 'hockey/nhl';
  else if (isBaseball) espnPath = 'baseball/mlb';
  else if (isBasketball) espnPath = 'basketball/nba';
  if (!espnPath) return null;
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${espnPath}/summary?event=${espnEventId}`, FETCH_HAS_TIMEOUT ? { signal: AbortSignal.timeout(6000) } : {});
    if (!res.ok) return null;
    const data = await res.json();

    if (isSoccer) {
      const goals = (data.keyEvents || []).filter(e => (e.type?.id === 'goal' || (e.type?.text || '').toLowerCase() === 'goal') && Array.isArray(e.athletesInvolved) && e.athletesInvolved.length > 0);
      if (!goals.length) return null;
      const byPlayer = {};
      for (const g of goals) { const name = g.athletesInvolved[0]?.displayName || g.athletesInvolved[0]?.shortName; if (!name) continue; if (!byPlayer[name]) byPlayer[name] = []; byPlayer[name].push(g.clock?.displayValue || ''); }
      const parts = Object.entries(byPlayer).map(([name, clocks]) => name + ' ' + clocks.join(' \u00B7 '));
      return parts.length ? '\u26BD ' + parts.join(', ') : null;
    }

    if (isHockey) {
      const keyEvents = data.keyEvents || [];
      const gwg = keyEvents.find(e => (e.type?.id === 'gwg') || (e.type?.text || '').toLowerCase().includes('game winning') || (e.type?.text || '').toLowerCase().includes('game-winning'));
      const scorer = gwg?.athletesInvolved?.[0];
      if (!scorer) {
        const last = (keyEvents.filter(e => e.type?.id === 'goal' || (e.type?.text || '').toLowerCase() === 'goal')).pop();
        const fb = last?.athletesInvolved?.[0]; if (!fb) return null;
        return '\uD83E\uDD45 GWG: ' + (fb.displayName || fb.shortName) + (last?.clock?.displayValue ? ' ' + last.clock.displayValue : '');
      }
      return '\uD83E\uDD45 GWG: ' + (scorer.displayName || scorer.shortName) + (gwg.clock?.displayValue ? ' ' + gwg.clock.displayValue : '');
    }

    if (isBaseball) {
      const winnerName = homeWon ? homeTeam : awayTeam; let wp = null;
      for (const teamBlock of (data.boxscore?.teams || [])) {
        const dn = teamBlock.team?.displayName || '', sn = teamBlock.team?.shortDisplayName || '';
        if (!winnerName || (!dn.includes(winnerName) && !winnerName.includes(sn) && !sn.includes(winnerName))) continue;
        const pitchGroup = (teamBlock.statistics || []).find(s => (s.name||s.label||'').toLowerCase() === 'pitching'); if (!pitchGroup) continue;
        for (const athlete of (pitchGroup.athletes || [])) { if ((athlete.stats || []).map(s => (s.label||s.name||'').toLowerCase()).some(d => d === 'w' || d === 'win' || d === 'wins')) { wp = athlete; break; } }
        if (wp) break;
      }
      if (!wp) return null;
      const name = wp.athlete?.shortName || wp.athlete?.displayName; if (!name) return null;
      const ip = (wp.stats || []).find(s => (s.label||s.name||'').toUpperCase() === 'IP')?.displayValue;
      const er = (wp.stats || []).find(s => (s.label||s.name||'').toUpperCase() === 'ER')?.displayValue;
      return '\uD83C\uDFC6 W: ' + name + (ip ? ' ' + ip + ' IP' : '') + (er != null ? ', ' + er + ' ER' : '');
    }

    if (isBasketball) {
      const ptsGroup = (data.leaders || []).find(g => (g.statisticName||g.name||'').toLowerCase().includes('point') || (g.abbreviation||'').toUpperCase() === 'PTS');
      if (!ptsGroup) return null;
      const leader = ptsGroup.leaders?.[0]; if (!leader?.athlete) return null;
      const name = leader.athlete.shortName || leader.athlete.displayName; if (!name) return null;
      const pts = leader.value !== undefined ? Math.round(leader.value) : null;
      return '\u2B50 ' + name + (pts !== null ? ' \u00B7 ' + pts + ' pts' : '');
    }
    return null;
  } catch (_) { return null; }
}

function buildEmailHTML(game, yesterdayStr, briefText, scorecard, quickRecaps = [], tonightSlate = [], tonightOdds = {}, stalenessWarning = null, keyPlayer = null) {
  const { away, home, awayScore, homeScore, sport, isOT, isShootout, isPlayoff, seriesRecord } = game;
  const homeWon = (homeScore || 0) >= (awayScore || 0), winner = homeWon ? home : away, loser = homeWon ? away : home;
  const winnerScore = homeWon ? homeScore : awayScore, loserScore = homeWon ? awayScore : homeScore;
  const diff = Math.abs((homeScore || 0) - (awayScore || 0)), score = `${awayScore}-${homeScore}`;
  const { otSignal, descriptor } = getSportLanguage({ sport, isOT, isShootout }, diff);
  const leagueChip = buildLeagueChip(game), playoffChip = isPlayoff ? PLAYOFF_CHIP : '', otChip = (isOT || isShootout) ? buildOTChip(sport, isShootout) : '';
  const seriesStr = seriesRecord ? `<br><span style="color:#94a3b8;font-size:.85em">${seriesRecord}</span>` : '';
  const headlineProse = briefText || `${winner} ${diff <= 1 ? 'edged' : diff <= 3 ? 'held off' : 'defeated'} ${loser} ${winnerScore}-${loserScore} in ${/^[aeiou]/i.test(descriptor) ? 'an' : 'a'} ${descriptor} finish.`;
  const scorecardHTML = scorecard ? buildScorecardHTML(scorecard, game) : '';
  const keyPlayerHTML = keyPlayer ? `<div style="font-size:.8em;color:#94a3b8;margin-top:2px;margin-bottom:8px;font-family:'DM Mono',ui-monospace,Menlo,Consolas,monospace">${keyPlayer}</div>` : '';
  const stalenessHTML = stalenessWarning ? `<div style="color:#f59e0b;font-size:.75em;font-weight:600;margin-bottom:6px">\u26A0 ${stalenessWarning}</div>` : '';
  const recapsHTML = quickRecaps.length ? `<div style="margin-bottom:20px"><div style="font-size:.55em;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">QUICK RECAPS</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">${quickRecaps.map(buildQuickRecapRow).join('')}</table></div>` : '';
  const tonightHTML = tonightSlate.length ? `<div style="margin-bottom:20px"><div style="font-size:.55em;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px">WHAT TO WATCH TONIGHT</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">${tonightSlate.map(g => { const ol = tonightOdds[g.espnEventId]; return `<tr><td style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:.8em;line-height:1.5"><span style="background:#1e293b;color:#94a3b8;font-size:.65em;font-weight:700;padding:.12rem .4rem;border-radius:4px;letter-spacing:.06em;margin-right:.4rem">${g.label}</span>${g.isPlayoff ? '<span style="background:#1e3a5f;color:#0d9488;font-size:.65em;font-weight:700;padding:.12rem .4rem;border-radius:4px;letter-spacing:.06em;margin-right:.4rem">PLAYOFF</span>' : ''}<span style="color:#f1f5f9;font-weight:600">${g.away} @ ${g.home}</span><span style="color:#64748b"> \u00B7 ${g.startTime}</span>${ol ? `<div style="color:#64748b;font-size:.85em;margin-top:3px">${ol}</div>` : ''}</td></tr>`; }).join('')}</table></div>` : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FIELD Night Owl \u2014 ${yesterdayStr}</title><link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700;800&family=DM+Mono:wght@500&display=swap" rel="stylesheet"></head><body style="background:#0a0f14;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0"><div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="margin-bottom:24px"><span style="color:#f59e0b;font-size:.65em;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-family:'Chakra Petch',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">\uD83E\uDD89 FIELD Night Owl</span><div style="color:#64748b;font-size:.8em;margin-top:.2rem">${yesterdayStr}</div></div><div style="background:#111827;border:1px solid #1e293b;border-left:3px solid #f59e0b;border-radius:10px;padding:20px 22px;margin-bottom:20px"><div style="margin-bottom:12px">${leagueChip}${playoffChip}${otChip}</div><div style="font-size:1.05em;font-weight:700;color:#f1f5f9;line-height:1.3;margin-bottom:8px;font-family:'Chakra Petch',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${away} @ ${home}${seriesStr}</div><div style="font-size:2rem;font-weight:500;color:#f1f5f9;letter-spacing:-.02em;margin-bottom:4px;font-family:'DM Mono',ui-monospace,Menlo,Consolas,monospace">${score}</div>${keyPlayerHTML}<div style="color:#94a3b8;font-size:.85em;line-height:1.5">${stalenessHTML}${headlineProse}</div></div><div style="background:#0f172a;border-radius:8px;padding:14px 16px;margin-bottom:20px;color:#94a3b8;font-size:.82em;line-height:1.6"><span style="color:#f59e0b;font-weight:700">FIELD Drama Signal: </span>${isOT || isShootout ? `${otSignal} \u2014 maximum late-game tension.` : diff <= 2 ? `Final margin of ${diff === 1 ? 'one' : 'two'} \u2014 decided in the final moments.` : `Close finish \u2014 ${winner} held on against ${loser}.`}</div>${scorecardHTML}${recapsHTML}${tonightHTML}<div style="text-align:center;margin:24px 0"><a href="https://jubilant-bassoon.jeffunglesbee.workers.dev" style="background:#f59e0b;color:#0a0f14;text-decoration:none;font-weight:800;font-size:.82em;letter-spacing:.07em;text-transform:uppercase;padding:.6rem 1.6rem;border-radius:7px;display:inline-block;font-family:'Chakra Petch',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">Open FIELD \u2192</a></div><div style="color:#334155;font-size:.7em;text-align:center;padding-top:16px;border-top:1px solid #1e293b">FIELD \u00B7 Global Sports Intelligence \u00B7 Not affiliated with any broadcaster</div></div></body></html>`;
}

function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ from: 'FIELD <onboarding@resend.dev>', to: [to], subject, html });
    const req = https.request({ hostname: 'api.resend.com', path: '/emails', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Length': Buffer.byteLength(body) } }, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => { if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data)); else reject(new Error(`Resend ${res.statusCode}: ${data}`)); });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function main() {
  const games = parseGames(ESPN_GAMES_JSON);
  if (!games.length) { console.log('\u2139\uFE0F  No completed games found for yesterday \u2014 no night owl email'); process.exit(0); }
  console.log(`\uD83D\uDCCA Evaluating ${games.length} completed games for drama...`);
  const scored = games.map(g => ({ game: g, drama: dramaTierHeuristic(g) })).filter(({ drama }) => drama >= 3).sort((a, b) => b.drama - a.drama);
  if (!scored.length) { console.log('\uD83D\uDCA4 No high-drama games found \u2014 night owl email skipped'); console.log('Games evaluated:', games.map(g => `${g.away||'?'} @ ${g.home||'?'} (${g.sport||'?'}) diff=${Math.abs((g.homeScore||0)-(g.awayScore||0))} OT=${g.isOT||false}`).join(', ')); process.exit(0); }
  const top = scored[0];
  console.log(`\uD83D\uDD25 Top drama game: ${top.game.away} @ ${top.game.home} (score: ${top.drama}/10)`);
  const yesterdayStr = YESTERDAY_DATE ? new Date(YESTERDAY_DATE + 'T12:00:00Z').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }) : 'Last Night';
  const diff = Math.abs((top.game.homeScore || 0) - (top.game.awayScore || 0));
  const { otSubject } = getSportLanguage(top.game, diff);
  const subject = top.game.isOT || top.game.isShootout ? `\uD83E\uDD89 Night Owl: ${top.game.away} vs ${top.game.home} went to ${otSubject}` : diff <= 2 ? `\uD83E\uDD89 Night Owl: ${top.game.away} vs ${top.game.home} \u2014 decided by ${diff === 1 ? '1' : '2'}` : `\uD83E\uDD89 Night Owl: Close finish \u2014 ${top.game.away} @ ${top.game.home}`;
  const briefText = await fetchRelayBrief(top.game.espnEventId, top.game.sport);
  if (briefText) console.log(`\uD83D\uDCDD Relay brief: ${briefText.substring(0, 80)}\u2026`);
  const scorecard = computeScorecardCI(top.game);
  console.log(`\uD83C\uDFF7\uFE0F  Scorecard: drama ${scorecard.dramaGrade} \u00B7 close ${scorecard.closenessGrade} \u00B7 plot ${scorecard.plotGrade}`);
  const homeWon = (top.game.homeScore || 0) >= (top.game.awayScore || 0);
  const keyPlayer = await fetchKeyPlayer(top.game.espnEventId, top.game.sport, top.game.home, top.game.away, homeWon);
  if (keyPlayer) console.log(`\uD83C\uDFC5 Key player: ${keyPlayer}`);
  const quickRecaps = scored.slice(1, 4).filter(s => s.drama >= 2).map(s => s.game);
  if (quickRecaps.length) console.log(`\uD83D\uDCF0 Quick recaps: ${quickRecaps.length} game(s)`);
  const tonightSlate = process.env.TODAY_DATE ? await fetchTonightSlate(process.env.TODAY_DATE) : [];
  console.log(`\uD83C\uDF19 Tonight slate: ${tonightSlate.length} game(s)`);
  const tonightOdds = {};
  for (const g of tonightSlate) { const line = await fetchOddsStory(g.espnEventId); if (line) { tonightOdds[g.espnEventId] = line; console.log(`\uD83D\uDCC8 Odds story (${g.away} @ ${g.home}): ${line}`); } }
  let stalenessWarning = null;
  const topSport = (top.game.sport || '').toLowerCase();
  if (briefText && (topSport === 'baseball' || topSport === 'mlb')) { stalenessWarning = await checkLineupsChanged(top.game.espnEventId, briefText); if (stalenessWarning) console.log(`\u26A0 Staleness warning: ${stalenessWarning}`); }
  const html = buildEmailHTML(top.game, yesterdayStr, briefText, scorecard, quickRecaps, tonightSlate, tonightOdds, stalenessWarning, keyPlayer);
  try {
    const result = await sendEmail({ to: FIELD_EMAIL, subject, html });
    console.log(`\u2705 Night owl email sent (id: ${result.id})`);
    console.log(`   To: ${FIELD_EMAIL}`);
    console.log(`   Subject: ${subject}`);
  } catch (err) { console.error('\u274C Resend error:', err.message); process.exit(1); }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
```

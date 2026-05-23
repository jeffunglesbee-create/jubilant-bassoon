#!/usr/bin/env node
/**
 * FIELD Data — Daily Overlay Builder
 * Builds outbox/field-data-today.json from live NHL/NBA relay data.
 * Called by .github/workflows/field-data.yml each morning.
 *
 * Reads:  /tmp/nhl.json  (from relay /nhl/v1/scoreboard/now)
 *         /tmp/nba.json  (from relay /nba/liveData/scoreboard/todaysScoreboard_00.json)
 * Env:    TODAY=YYYY-MM-DD  (set by workflow)
 *         GEMINI_KEY        (optional — primary AI for matchupNotes, gemini-3.1-flash-lite)
 *         ANTHROPIC_API_KEY (optional — Claude Sonnet 4 fallback if Gemini absent/fails)
 * Writes: /tmp/field-data-today.json
 */

const fs    = require('fs');
const https = require('https');

const TODAY = process.env.TODAY || new Date().toISOString().slice(0, 10);

// ── NHL abbreviation → full name (mirrors index.html NHL_ABBREV_MAP) ──────
const NHL_TEAMS = {
  ANA:'Anaheim Ducks',       BOS:'Boston Bruins',        BUF:'Buffalo Sabres',
  CGY:'Calgary Flames',      CAR:'Carolina Hurricanes',  CHI:'Chicago Blackhawks',
  COL:'Colorado Avalanche',  CBJ:'Columbus Blue Jackets',DAL:'Dallas Stars',
  DET:'Detroit Red Wings',   EDM:'Edmonton Oilers',      FLA:'Florida Panthers',
  LAK:'Los Angeles Kings',   MIN:'Minnesota Wild',       MTL:'Montreal Canadiens',
  NSH:'Nashville Predators', NJD:'New Jersey Devils',    NYI:'New York Islanders',
  NYR:'New York Rangers',    OTT:'Ottawa Senators',      PHI:'Philadelphia Flyers',
  PIT:'Pittsburgh Penguins', SEA:'Seattle Kraken',       SJS:'San Jose Sharks',
  STL:'St. Louis Blues',     TBL:'Tampa Bay Lightning',  TOR:'Toronto Maple Leafs',
  UTA:'Utah Hockey Club',    VAN:'Vancouver Canucks',    VGK:'Vegas Golden Knights',
  WSH:'Washington Capitals', WPG:'Winnipeg Jets',
};

function nhlFullName(abbrev, fallback) {
  return NHL_TEAMS[abbrev] || fallback || abbrev;
}

// ── Parse NHL scoreboard ──────────────────────────────────────────────────
function parseNHL() {
  try {
    const raw = JSON.parse(fs.readFileSync('/tmp/nhl.json', 'utf8'));
    // /v1/scoreboard/now returns data.games (today's games) OR data.gamesByDate[].games
    const games = raw.games ||
      (raw.gamesByDate || []).filter(d => d.date === TODAY).flatMap(d => d.games || []);

    return games.map(g => {
      const homeAbbr = g.homeTeam?.abbrev;
      const awayAbbr = g.awayTeam?.abbrev;
      if (!homeAbbr || !awayAbbr) return null;

      const home = nhlFullName(homeAbbr, g.homeTeam?.commonName?.default);
      const away = nhlFullName(awayAbbr, g.awayTeam?.commonName?.default);

      // Series status — try seriesStatus.seriesAbbrev first, fall back to computing from wins
      const ss = g.seriesStatus;
      let seriesRecord = ss?.seriesAbbrev || null;
      if (!seriesRecord && ss != null) {
        const hw = ss.topSeedWins ?? 0, aw = ss.bottomSeedWins ?? 0;
        if (hw > aw)      seriesRecord = `${home} leads ${hw}-${aw}`;
        else if (aw > hw) seriesRecord = `${away} leads ${aw}-${hw}`;
        else if (hw > 0)  seriesRecord = `Series tied ${hw}-${aw}`;
      }

      return { home, away, seriesRecord, league: 'NHL' };
    }).filter(Boolean);
  } catch (e) {
    console.error('NHL parse error:', e.message); return [];
  }
}

// ── Parse NBA scoreboard ──────────────────────────────────────────────────
function parseNBA() {
  try {
    const raw = JSON.parse(fs.readFileSync('/tmp/nba.json', 'utf8'));
    return (raw.scoreboard?.games || [])
      .filter(g => !(g.gameStatusText || '').match(/Final/))
      .map(g => ({
        home: `${g.homeTeam.teamCity} ${g.homeTeam.teamName}`,
        away: `${g.awayTeam.teamCity} ${g.awayTeam.teamName}`,
        seriesRecord: g.seriesText || null,
        league: 'NBA',
      }));
  } catch (e) {
    console.error('NBA parse error:', e.message); return [];
  }
}

// ── Optional: generate matchupNote via Claude ─────────────────────────────
// Only runs if ANTHROPIC_API_KEY is set. Set in repo secrets to enable.
// Each call: ~1-2s, ~100 tokens. Total budget: ~4-8 calls per day.
function callClaude(prompt) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).content?.[0]?.text?.trim() || null); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body); req.end();
  });
}

// ── Optional: generate matchupNote via Gemini 3.1 Flash-Lite ────────────
// Primary AI backend — free tier, 1500 RPD. Same model as journalism proxy.
function callGemini(prompt) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 120, temperature: 0.4 },
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body); req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const nhlGames = parseNHL();
  const nbaGames = parseNBA();
  console.log(`Parsed: ${nhlGames.length} NHL + ${nbaGames.length} NBA game(s) for ${TODAY}`);

  const overlays = [];
  const useGemini = !!process.env.GEMINI_KEY;
  const useClaude = !!process.env.ANTHROPIC_API_KEY;
  const useAI = useGemini || useClaude;
  if (useGemini) console.log('GEMINI_KEY present — matchupNotes via gemini-3.1-flash-lite (Claude fallback: ' + (useClaude ? 'yes' : 'no') + ')');
  else if (useClaude) console.log('ANTHROPIC_API_KEY present — matchupNotes via Claude (no Gemini key).');

  for (const g of [...nhlGames, ...nbaGames]) {
    const ov = { _match_key: `${g.home}|${g.away}` };
    if (g.seriesRecord) ov.seriesRecord = g.seriesRecord;

    if (useAI && g.seriesRecord) {
      const prompt =
        `Write a sharp 1-2 sentence FIELD sports brief matchupNote.\n` +
        `Game: ${g.away} @ ${g.home} (${g.league})\n` +
        `Series: ${g.seriesRecord}\n` +
        `Style: punchy sports journalism, focus on stakes. No preamble. Respond with ONLY the text.`;
      let note = null;
      let backend = null;
      if (useGemini) {
        note = await callGemini(prompt);
        if (note) backend = 'gemini-3.1-flash-lite';
        else if (useClaude) {
          note = await callClaude(prompt);
          if (note) backend = 'claude-sonnet-4 (fallback)';
        }
      } else {
        note = await callClaude(prompt);
        if (note) backend = 'claude-sonnet-4';
      }
      if (note) { ov.matchupNote = note; console.log(`  ✓ ${backend}: ${g.away} @ ${g.home}`); }
    }

    if (Object.keys(ov).length > 1) overlays.push(ov); // skip if only _match_key
  }

  const output = {
    _meta: {
      schema_version: '1.0',
      generated_at: new Date().toISOString(),
      for_date: TODAY,
      source: 'field-data workflow (automated)',
      games_found: { nhl: nhlGames.length, nba: nbaGames.length },
      ai_notes: useAI,
      ai_backend: useGemini ? 'gemini-3.1-flash-lite' : (useClaude ? 'claude-sonnet-4' : 'none'),
      note: 'Auto-generated daily at 7:30 AM UTC. Manual edits persist until the next run.',
    },
    game_overlays: overlays,
  };

  fs.writeFileSync('/tmp/field-data-today.json', JSON.stringify(output, null, 2));
  console.log(`✅ Overlay: ${overlays.length} game(s) written to /tmp/field-data-today.json`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

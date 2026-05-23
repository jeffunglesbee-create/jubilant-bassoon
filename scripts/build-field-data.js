#!/usr/bin/env node
/**
 * FIELD Data — Daily Overlay Builder
 * Builds outbox/field-data-today.json from live NHL/NBA relay data.
 * Called by .github/workflows/field-data.yml each morning.
 *
 * Reads:  /tmp/nhl.json  (from relay /nhl/v1/scoreboard/now)
 *         /tmp/nba.json  (from relay /nba/liveData/scoreboard/todaysScoreboard_00.json)
 *         statsapi.mlb.com (live schedule — postponed game detection)
 * Env:    TODAY=YYYY-MM-DD  (set by workflow)
 *         GEMINI_KEY        (optional — primary AI for matchupNotes, gemini-3.1-flash-lite)
 *         ANTHROPIC_API_KEY (optional — Claude Sonnet 4 fallback if Gemini absent/fails)
 * Writes: /tmp/field-data-today.json
 */

const fs    = require('fs');
const https = require('https');

const TODAY = process.env.TODAY || new Date().toISOString().slice(0, 10);

// ── NHL abbreviation → full name ──────────────────────────────────────────
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
    const games = raw.games ||
      (raw.gamesByDate || []).filter(d => d.date === TODAY).flatMap(d => d.games || []);

    return games.map(g => {
      const homeAbbr = g.homeTeam?.abbrev;
      const awayAbbr = g.awayTeam?.abbrev;
      if (!homeAbbr || !awayAbbr) return null;

      const home = nhlFullName(homeAbbr, g.homeTeam?.commonName?.default);
      const away = nhlFullName(awayAbbr, g.awayTeam?.commonName?.default);

      // Series status — check multiple field paths the NHL API uses
      const ss = g.seriesStatus;
      let seriesRecord = ss?.seriesAbbrev || ss?.seriesStatusShort || null;
      if (!seriesRecord && ss != null) {
        const hw = ss.topSeedWins ?? 0, aw = ss.bottomSeedWins ?? 0;
        if (hw > aw)      seriesRecord = `${home} leads ${hw}-${aw}`;
        else if (aw > hw) seriesRecord = `${away} leads ${aw}-${hw}`;
        else if (hw > 0)  seriesRecord = `Series tied ${hw}-${aw}`;
      }
      // Also check game.seriesStatus at top level (alternate NHL API shape)
      if (!seriesRecord && g.seriesStatusShort) seriesRecord = g.seriesStatusShort;

      // Detect playoff context from game type or round info
      const isPlayoff = g.gameType === 3 || g.gameType === 'P' ||
        g.seriesStatus != null || seriesRecord != null ||
        (g.gameSubType || '').includes('P') ||
        (g.seasonType || '').includes('playoff');

      // Round label for context
      const round = g.seriesStatus?.round?.names?.name ||
                    g.seriesStatus?.roundLabel || null;

      return { home, away, seriesRecord, league: 'NHL', isPlayoff, round };
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
      .map(g => {
        // seriesText may be on game or team objects
        const seriesRecord = g.seriesText ||
          g.homeTeam?.seriesWins != null
            ? (() => {
                const hw = g.homeTeam?.seriesWins ?? 0;
                const aw = g.awayTeam?.seriesWins ?? 0;
                const home = `${g.homeTeam.teamCity} ${g.homeTeam.teamName}`;
                const away = `${g.awayTeam.teamCity} ${g.awayTeam.teamName}`;
                if (hw > aw)      return `${home} leads ${hw}-${aw}`;
                if (aw > hw)      return `${away} leads ${aw}-${hw}`;
                if (hw > 0)       return `Series tied ${hw}-${aw}`;
                return null;
              })()
            : null;

        const isPlayoff = g.seasonType === 'Playoffs' ||
          g.gameSubtype === '4' ||
          seriesRecord != null ||
          (g.gameLabel || '').toLowerCase().includes('playoff');

        return {
          home: `${g.homeTeam.teamCity} ${g.homeTeam.teamName}`,
          away: `${g.awayTeam.teamCity} ${g.awayTeam.teamName}`,
          seriesRecord: g.seriesText || seriesRecord,
          league: 'NBA',
          isPlayoff,
          gameLabel: g.gameLabel || null,
        };
      });
  } catch (e) {
    console.error('NBA parse error:', e.message); return [];
  }
}

// ── Detect MLB postponed games ────────────────────────────────────────────
function parseMLBPostponed() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'statsapi.mlb.com',
      path: `/api/v1/schedule?sportId=1&date=${TODAY}&gameType=R&hydrate=game,team`,
      method: 'GET',
      headers: { 'User-Agent': 'FIELD-DataBot/1.0', 'Accept': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const sched = JSON.parse(data);
          const games = (sched.dates || [])[0]?.games || [];
          const ppd = games.filter(g =>
            g.status?.statusCode === 'DR' ||
            (g.status?.detailedState || '').toLowerCase().includes('postpone')
          ).map(g => ({ home: g.teams.home.team.name, away: g.teams.away.team.name }));
          if (ppd.length) console.log(`MLB PPD today: ${ppd.map(g => g.away + ' @ ' + g.home).join(', ')}`);
          resolve(ppd);
        } catch (e) { console.warn('MLB postponed check failed:', e.message); resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ── Build matchupNote prompt ──────────────────────────────────────────────
// Generates a prompt using whatever context is available.
// Series context included when present; prompt stays useful without it.
function buildPrompt(g) {
  const lines = [
    `Write a sharp 1-2 sentence FIELD sports brief matchupNote.`,
    `Game: ${g.away} @ ${g.home} (${g.league})`,
  ];
  if (g.round)         lines.push(`Round: ${g.round}`);
  if (g.seriesRecord)  lines.push(`Series: ${g.seriesRecord}`);
  if (g.gameLabel)     lines.push(`Context: ${g.gameLabel}`);
  if (!g.seriesRecord && !g.isPlayoff) {
    lines.push(`Context: regular season game`);
  }
  lines.push(`Style: punchy sports journalism, focus on stakes and why it matters tonight.`);
  lines.push(`No preamble. Respond with ONLY the note text.`);
  return lines.join('\n');
}

// ── AI backends ───────────────────────────────────────────────────────────
function callGemini(prompt) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 120, temperature: 0.4 },
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Log error details if present
          if (parsed.error) console.warn('Gemini API error:', JSON.stringify(parsed.error));
          resolve(parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null);
        } catch { resolve(null); }
      });
    });
    req.on('error', (e) => { console.warn('Gemini request error:', e.message); resolve(null); });
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body); req.end();
  });
}

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

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const nhlGames = parseNHL();
  const nbaGames = parseNBA();
  const mlbPPD   = await parseMLBPostponed();
  console.log(`Parsed: ${nhlGames.length} NHL + ${nbaGames.length} NBA game(s) + ${mlbPPD.length} MLB PPD for ${TODAY}`);

  // Log raw series data for debugging
  [...nhlGames, ...nbaGames].forEach(g =>
    console.log(`  ${g.league}: ${g.away} @ ${g.home} | seriesRecord=${g.seriesRecord || 'null'} | isPlayoff=${g.isPlayoff}`));

  const overlays = [];
  const useGemini = !!process.env.GEMINI_KEY;
  const useClaude = !!process.env.ANTHROPIC_API_KEY;
  const useAI = useGemini || useClaude;
  if (useGemini) console.log('GEMINI_KEY present — matchupNotes via gemini-2.5-flash-lite');
  else if (useClaude) console.log('ANTHROPIC_API_KEY present — matchupNotes via Claude Sonnet 4');
  else console.log('No AI key — overlays only (no matchupNotes)');

  for (const g of [...nhlGames, ...nbaGames]) {
    const ov = { _match_key: `${g.home}|${g.away}` };
    if (g.seriesRecord) ov.seriesRecord = g.seriesRecord;

    // FIX: generate matchupNote for ANY game when AI is available —
    // not just when seriesRecord is present. Series context is included
    // in the prompt when available; note is useful either way.
    if (useAI) {
      const prompt = buildPrompt(g);
      let note = null, backend = null;
      if (useGemini) {
        note = await callGemini(prompt);
        if (note) backend = 'gemini-2.5-flash-lite';
        else if (useClaude) {
          note = await callClaude(prompt);
          if (note) backend = 'claude-sonnet-4 (fallback)';
        }
      } else {
        note = await callClaude(prompt);
        if (note) backend = 'claude-sonnet-4';
      }
      if (note) {
        ov.matchupNote = note;
        console.log(`  ✓ ${backend}: ${g.away} @ ${g.home}`);
        console.log(`    "${note.slice(0, 100)}${note.length > 100 ? '...' : ''}"`);
      } else {
        console.warn(`  ✗ AI failed for ${g.away} @ ${g.home}`);
      }
    }

    // Include overlay if it has any content beyond _match_key
    if (Object.keys(ov).length > 1) overlays.push(ov);
  }

  // MLB postponed overlays
  for (const g of mlbPPD) {
    const key = `${g.home}|${g.away}`;
    const existing = overlays.find(o => o._match_key === key);
    if (existing) { existing._postponed = true; }
    else { overlays.push({ _match_key: key, _postponed: true }); }
    console.log(`  ⛈ PPD overlay: ${g.away} @ ${g.home}`);
  }

  const output = {
    _meta: {
      schema_version: '1.0',
      generated_at: new Date().toISOString(),
      for_date: TODAY,
      source: 'field-data workflow (automated)',
      games_found: { nhl: nhlGames.length, nba: nbaGames.length },
      ai_notes: useAI,
      ai_backend: useGemini ? 'gemini-2.5-flash-lite' : (useClaude ? 'claude-sonnet-4' : 'none'),
      note: 'Auto-generated daily at 7:30 AM UTC. Manual edits persist until the next run.',
    },
    game_overlays: overlays,
  };

  fs.writeFileSync('/tmp/field-data-today.json', JSON.stringify(output, null, 2));
  console.log(`✅ Overlay: ${overlays.length} game(s) written to /tmp/field-data-today.json`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

#!/usr/bin/env node
/**
 * FIELD Data — Daily Overlay Builder
 * Builds outbox/field-data-today.json from live NHL/NBA/MLB relay data.
 * Called by .github/workflows/field-data.yml each morning.
 *
 * PHASE 1 (May 28 2026): Added full MLB schedule + broadcast assignment.
 *   TYPE A sessions now verify output rather than hardcoding game entries.
 *
 * Reads:  /tmp/nhl.json  (from relay /nhl/v1/scoreboard/now)
 *         /tmp/nba.json  (from relay /nba/liveData/scoreboard/todaysScoreboard_00.json)
 *         /tmp/mlb.json  (NEW: from relay /mlb/schedule)
 *         statsapi.mlb.com (live schedule — postponed game detection)
 * Env:    TODAY=YYYY-MM-DD
 *         GEMINI_KEY / ANTHROPIC_API_KEY
 *         ESPN_GOTD_IDS=home|away,home|away (comma-sep, for ESPN GOTD flag)
 *         PEACOCK_GOTD_IDS=home|away (for Peacock GOTD flag)
 * Writes: /tmp/field-data-today.json
 */

const fs    = require('fs');
const https = require('https');

const TODAY = process.env.TODAY || new Date().toISOString().slice(0, 10);

// ESPN GOTD flags — set via workflow_dispatch input or env var
// Format: "Team A|Team B,Team C|Team D" (home|away per game)
const ESPN_GOTD_IDS   = (process.env.ESPN_GOTD_IDS   || '').split(',').filter(Boolean);
const PEACOCK_GOTD_IDS= (process.env.PEACOCK_GOTD_IDS || '').split(',').filter(Boolean);

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

// ── MLB Broadcast Assignment (Phase 1) ───────────────────────────────────
// Maps today's games to the correct national broadcast bundle.
// PRIMARY: parses live broadcast data from statsapi.mlb.com broadcasts(all) hydration.
// Detects: MLB Network (mlbnShowcase), ESPN Unlimited GOTD (espnGOTD), Peacock GOTD (peacockGOTD).
// FALLBACK: day-of-week rules when broadcast data absent or game is pre-game/no hydration.
// Manual ESPN_GOTD_IDS / PEACOCK_GOTD_IDS env overrides always win.
function assignMLBBroadcast(game, dateStr, rawBroadcasts) {
  const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
  const startUTC = game.start_time ? new Date(game.start_time) : null;
  const startHourUTC = startUTC ? startUTC.getUTCHours() : 18;

  // Manual env overrides always win
  const matchKey = `${game.home}|${game.away}`;
  if (ESPN_GOTD_IDS.includes(matchKey)) {
    game.espnGOTD = true;
    game.nationalBundle = 'MLB_ESPN';
    return;
  }
  if (PEACOCK_GOTD_IDS.includes(matchKey)) {
    game.peacockGOTD = true;
  }

  // Parse live broadcast array from statsapi hydration
  const bcast = Array.isArray(rawBroadcasts) ? rawBroadcasts : [];
  const names = bcast.map(b => (b.name || b.callSign || '').toLowerCase());
  const hasMLBN    = names.some(n => n.includes('mlb network') || n === 'mlbn');
  const hasApple   = names.some(n => n.includes('apple') || n.includes('apple tv'));
  const hasESPN    = names.some(n => n === 'espn' || n.startsWith('espn '));
  const hasFOX     = names.some(n => n === 'fox');
  const hasFS1     = names.some(n => n === 'fs1');
  const hasTBS     = names.some(n => n === 'tbs');
  const hasNBC     = names.some(n => n === 'nbc' || n === 'nbcsn');
  const hasPeacock = names.some(n => n.includes('peacock'));

  // Detect Peacock GOTD: Peacock-branded national broadcast on a non-Sunday
  // (Sunday Leadoff and SNB are always on Peacock — only tag GOTD for non-Sunday nationals)
  if (hasPeacock && dow !== 0) {
    game.peacockGOTD = true;
  }

  // Detect ESPN GOTD: ESPN national broadcast on a non-national-window day
  // (ESPN has ~30 select games/season; Mon/Wed aren't guaranteed ESPN days)
  if (hasESPN && !game.espnGOTD) {
    game.espnGOTD = true;
  }

  // Detect MLB Network: any MLBN national carry
  if (hasMLBN) {
    game.mlbnShowcase = true;
  }

  // Assign primary nationalBundle from live broadcast data
  if (bcast.length > 0) {
    if (hasApple)          { game.nationalBundle = 'MLB_APPLE'; return; }
    if (hasFOX)            { game.nationalBundle = 'MLB_FOX';   return; }
    if (hasFS1)            { game.nationalBundle = 'MLB_FS1';   return; }
    if (hasTBS)            { game.nationalBundle = 'MLB_TBS';   return; }
    if (hasNBC || hasPeacock) {
      // Sunday noon (Leadoff) vs evening (SNB)
      if (dow === 0 && startHourUTC >= 15 && startHourUTC < 18) {
        game.nationalBundle = 'MLB_LEADOFF';
        game.peacockGOTD = true;
      } else if (dow === 0) {
        game.nationalBundle = 'MLB_NBC';
      } else {
        // Weekday Peacock GOTD
        game.nationalBundle = 'MLB_PEACOCK_GOTD';
        game.peacockGOTD = true;
      }
      return;
    }
    if (hasESPN) { game.nationalBundle = 'MLB_ESPN'; return; }
    if (hasMLBN) { game.nationalBundle = 'MLB_NETWORK'; return; }
    // Has broadcasts but only local — fall through to day-of-week for any remaining nationals
  }

  // Fallback: day-of-week rules (used when broadcasts array is empty or all-local)
  switch (dow) {
    case 5: game.nationalBundle = 'MLB_APPLE'; break;   // Friday: Apple TV+
    case 6: game.nationalBundle = 'MLB_FOX';   break;   // Saturday: FOX
    case 1: game.nationalBundle = 'MLB_FOX';   break;   // Monday: FOX
    case 2: game.nationalBundle = 'MLB_TBS';   break;   // Tuesday: TBS
    case 0: {
      if (startHourUTC >= 15 && startHourUTC < 18) {
        game.nationalBundle = 'MLB_LEADOFF';
        game.peacockGOTD = true;
      } else {
        const [yr, mo, dy] = dateStr.split('-').map(Number);
        const isPostMay31 = (mo > 5) || (mo === 5 && dy >= 31);
        game.nationalBundle = isPostMay31 ? 'MLB_NBC' : 'MLB_PEACOCK_SNB';
      }
      break;
    }
    default: game.nationalBundle = null;
  }
}

// ── Parse NHL scoreboard
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

      const ss = g.seriesStatus;
      let seriesRecord = ss?.seriesAbbrev || ss?.seriesStatusShort || null;
      if (!seriesRecord && ss != null) {
        const hw = ss.topSeedWins ?? 0, aw = ss.bottomSeedWins ?? 0;
        if (hw > aw)      seriesRecord = `${home} leads ${hw}-${aw}`;
        else if (aw > hw) seriesRecord = `${away} leads ${aw}-${hw}`;
        else if (hw > 0)  seriesRecord = `Series tied ${hw}-${aw}`;
      }
      if (!seriesRecord && g.seriesStatusShort) seriesRecord = g.seriesStatusShort;

      const isPlayoff = g.gameType === 3 || g.gameType === 'P' ||
        g.seriesStatus != null || seriesRecord != null ||
        (g.gameSubType || '').includes('P') ||
        (g.seasonType || '').includes('playoff');

      const round = g.seriesStatus?.round?.names?.name ||
                    g.seriesStatus?.roundLabel || null;

      // Venue from game object
      const venue = g.venue?.default || null;

      // Start time
      const start_time = g.startTimeUTC || g.gameDate || null;

      return { sport: 'NHL', home, away, seriesRecord, league: 'NHL', isPlayoff, round, venue, start_time };
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
      .map(g => {
        const seriesRecord = g.seriesText ||
          (g.homeTeam?.seriesWins != null
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
            : null);

        const isPlayoff = g.seasonType === 'Playoffs' ||
          g.gameSubtype === '4' || seriesRecord != null ||
          (g.gameLabel || '').toLowerCase().includes('playoff');

        return {
          sport: 'NBA',
          home: `${g.homeTeam.teamCity} ${g.homeTeam.teamName}`,
          away: `${g.awayTeam.teamCity} ${g.awayTeam.teamName}`,
          seriesRecord: g.seriesText || seriesRecord,
          league: 'NBA', isPlayoff,
          gameLabel: g.gameLabel || null,
          start_time: g.gameTimeUTC || null,
          venue: g.arenaName ? `${g.arenaName}${g.arenaCity ? ', ' + g.arenaCity : ''}` : null,
        };
      });
  } catch (e) {
    console.error('NBA parse error:', e.message); return [];
  }
}

// ── Fetch full MLB schedule (Phase 1) ─────────────────────────────────────
// Returns full game objects: home, away, start_time, venue, nationalBundle
function parseMLBFull() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'statsapi.mlb.com',
      path: `/api/v1/schedule?sportId=1&date=${TODAY}&gameType=R,F,D,L,W&hydrate=game,team,venue,broadcasts(all)&limit=30`,
      method: 'GET',
      headers: { 'User-Agent': 'FIELD-DataBot/1.0', 'Accept': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const sched = JSON.parse(data);
          const raw = (sched.dates || [])[0]?.games || [];
          const games = raw.map(g => {
            const home = g.teams?.home?.team?.name || '';
            const away = g.teams?.away?.team?.name || '';
            if (!home || !away) return null;

            const isPPD = g.status?.statusCode === 'DR' ||
              (g.status?.detailedState || '').toLowerCase().includes('postpone');

            // Venue from hydrated game data
            const venue = g.venue?.name
              ? `${g.venue.name}${g.venue.location?.city ? ', ' + g.venue.location.city + (g.venue.location.stateAbbrev ? ' ' + g.venue.location.stateAbbrev : '') : ''}`
              : null;

            const isPlayoff = g.gameType !== 'R';
            const seriesRecord = isPlayoff
              ? (() => {
                  const hw = g.teams?.home?.isWinner != null ? null : null; // series wins not always in schedule
                  return null; // series record comes from live scoreboard
                })()
              : null;

            // Extract broadcast array from hydrated data
            const rawBroadcasts = g.broadcasts || [];

            const game = {
              sport: 'MLB',
              home, away,
              start_time: g.gameDate || null,
              venue,
              league: isPlayoff ? 'MLB Playoffs' : 'MLB',
              isPlayoff,
              seriesRecord: null,
              nationalBundle: null,
              espnGOTD: false,
              peacockGOTD: false,
              mlbnShowcase: false,
              _postponed: isPPD,
              confirmed: true,
            };

            // Assign broadcast: live broadcasts(all) first, then day-of-week fallback
            if (!isPlayoff) assignMLBBroadcast(game, TODAY, rawBroadcasts);

            return game;
          }).filter(Boolean);

          const ppd = games.filter(g => g._postponed);
          if (ppd.length) console.log(`MLB PPD: ${ppd.map(g => g.away + ' @ ' + g.home).join(', ')}`);
          console.log(`MLB full schedule: ${games.length} game(s) (${ppd.length} PPD) for ${TODAY}`);
          resolve(games);
        } catch (e) { console.warn('MLB full parse failed:', e.message); resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ── ESPN Soccer (generic) ─────────────────────────────────────────────────
// leagueSlug: 'usa.1' (MLS), 'eng.1' (EPL), 'esp.1' (La Liga), etc.
function parseESPNSoccer(leagueSlug, leagueName) {
  return new Promise((resolve) => {
    const dateStr = TODAY.replace(/-/g, '');
    const req = https.request({
      hostname: 'site.api.espn.com',
      path: `/apis/site/v2/sports/soccer/${leagueSlug}/scoreboard?dates=${dateStr}&limit=30`,
      method: 'GET',
      headers: { 'User-Agent': 'FIELD-DataBot/1.0', 'Accept': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const games = (parsed.events || []).map(ev => {
            const comp = (ev.competitions || [])[0]; if (!comp) return null;
            const comps = comp.competitors || [];
            const home = comps.find(t => t.homeAway === 'home') || comps[0];
            const away = comps.find(t => t.homeAway === 'away') || comps[1];
            if (!home || !away) return null;
            const isPlayoff = (ev.season?.type === 4) ||
              (ev.name || '').toLowerCase().includes('playoff') ||
              (ev.name || '').toLowerCase().includes('cup');
            return {
              sport: 'Soccer',
              home: home.team?.displayName || '?',
              away: away.team?.displayName || '?',
              league: isPlayoff ? `${leagueName} Cup Playoffs` : leagueName,
              start_time: ev.date || '',
              venue: comp.venue?.fullName || null,
              isPlayoff,
              gameLabel: ev.name || null,
              nationalBundle: null,
              confirmed: true,
            };
          }).filter(Boolean);
          if (games.length) console.log(`${leagueName}: ${games.length} game(s) for ${TODAY}`);
          resolve(games);
        } catch (e) { console.warn(`${leagueName} parse error:`, e.message); resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ── Build matchupNote prompt ──────────────────────────────────────────────
function buildPrompt(g) {
  const lines = [
    `Write a sharp 1-2 sentence FIELD sports brief matchupNote.`,
    `Game: ${g.away} @ ${g.home} (${g.league || g.sport})`,
  ];
  if (g.round)        lines.push(`Round: ${g.round}`);
  if (g.seriesRecord) lines.push(`Series: ${g.seriesRecord}`);
  if (g.gameLabel)    lines.push(`Context: ${g.gameLabel}`);
  if (!g.seriesRecord && !g.isPlayoff) {
    if ((g.league || '').includes('MLS') || (g.sport === 'Soccer' && g.league?.includes('MLS'))) {
      lines.push(`Context: MLS regular season. Playoff spots: top 9 each conference.`);
    } else if (g.sport === 'MLB') {
      lines.push(`Context: MLB regular season.`);
    } else {
      lines.push(`Context: regular season game`);
    }
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
      path: `/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
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
      model: 'claude-haiku-4-5-20251001',
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

// ── Fetch MLS ─────────────────────────────────────────────────────────────
// (kept as before, uses parseESPNSoccer internally)
async function parseMLS() {
  return parseESPNSoccer('usa.1', 'MLS');
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const nhlGames  = parseNHL();
  const nbaGames  = parseNBA();
  const mlbGames  = await parseMLBFull();   // Phase 1: full MLB schedule
  const mlsGames  = await parseMLS();

  console.log(`Parsed: ${nhlGames.length} NHL + ${nbaGames.length} NBA + ${mlbGames.length} MLB + ${mlsGames.length} MLS game(s) for ${TODAY}`);

  // Structured schedule: full game entries for Phase 2 consumption
  // Phase 2 will use schedules.mlb, schedules.nhl, etc. to build game arrays.
  const schedules = {
    nhl: nhlGames.map(g => ({
      sport: 'NHL', home: g.home, away: g.away,
      start_time: g.start_time, venue: g.venue,
      seriesRecord: g.seriesRecord, isPlayoff: g.isPlayoff,
      round: g.round, confirmed: true,
    })),
    nba: nbaGames.map(g => ({
      sport: 'NBA', home: g.home, away: g.away,
      start_time: g.start_time, venue: g.venue,
      seriesRecord: g.seriesRecord, isPlayoff: g.isPlayoff,
      gameLabel: g.gameLabel, confirmed: true,
    })),
    mlb: mlbGames.map(g => ({
      sport: 'MLB', home: g.home, away: g.away,
      start_time: g.start_time, venue: g.venue,
      league: g.league, isPlayoff: g.isPlayoff,
      nationalBundle: g.nationalBundle,
      espnGOTD: g.espnGOTD || false,
      peacockGOTD: g.peacockGOTD || false,
      mlbnShowcase: g.mlbnShowcase || false,
      _postponed: g._postponed || false,
      confirmed: true,
    })),
    soccer: mlsGames.map(g => ({
      sport: 'Soccer', home: g.home, away: g.away,
      start_time: g.start_time, venue: g.venue,
      league: g.league, isPlayoff: g.isPlayoff,
      nationalBundle: g.nationalBundle, confirmed: true,
    })),
  };

  // Log MLB broadcast assignments for verification
  const mlbWithBroadcast = schedules.mlb.filter(g => g.nationalBundle);
  if (mlbWithBroadcast.length) {
    console.log('MLB broadcast assignments:');
    mlbWithBroadcast.forEach(g => console.log(`  ${g.away} @ ${g.home}: ${g.nationalBundle}${g.espnGOTD?' ESPN-GOTD':''}${g.peacockGOTD?' PCK-GOTD':''}`));
  }

  // ── Overlays (backward compat + AI matchupNotes) ──────────────────────
  const overlays = [];
  const useGemini = !!process.env.GEMINI_KEY;
  const useClaude = !!process.env.ANTHROPIC_API_KEY;
  const useAI = useGemini || useClaude;

  if (useGemini) console.log('GEMINI_KEY present — matchupNotes via gemini-3.1-flash-lite');
  else if (useClaude) console.log('ANTHROPIC_API_KEY present — matchupNotes via Claude Sonnet 4');
  else console.log('No AI key — overlays only (no matchupNotes)');

  // Generate matchupNotes for NHL/NBA/MLS (high-value; MLB gets notes too for key games)
  const noteTargets = [
    ...nhlGames.filter(g => g.isPlayoff || g.seriesRecord),
    ...nbaGames.filter(g => g.isPlayoff || g.seriesRecord),
    ...mlsGames,
    // MLB: generate notes for national broadcast games only (keep API costs down)
    ...mlbGames.filter(g => g.nationalBundle && !g._postponed),
  ];

  for (const g of noteTargets) {
    const ov = { _match_key: `${g.home}|${g.away}` };
    if (g.seriesRecord) ov.seriesRecord = g.seriesRecord;

    if (useAI) {
      const prompt = buildPrompt(g);
      let note = null, backend = null;
      if (useGemini) {
        note = await callGemini(prompt);
        if (note) backend = 'gemini-3.1-flash-lite';
        else if (useClaude) { note = await callClaude(prompt); if (note) backend = 'claude-sonnet-4 (fallback)'; }
      } else {
        note = await callClaude(prompt); if (note) backend = 'claude-sonnet-4';
      }
      if (note) {
        ov.matchupNote = note;
        console.log(`  ✓ ${backend}: ${g.away} @ ${g.home}`);
        console.log(`    "${note.slice(0, 100)}${note.length > 100 ? '...' : ''}"`);
      } else {
        console.warn(`  ✗ AI failed for ${g.away} @ ${g.home}`);
      }
    }

    if (Object.keys(ov).length > 1) overlays.push(ov);
  }

  // MLB PPD overlays (all games, not just national)
  for (const g of mlbGames.filter(g => g._postponed)) {
    const key = `${g.home}|${g.away}`;
    const existing = overlays.find(o => o._match_key === key);
    if (existing) { existing._postponed = true; }
    else { overlays.push({ _match_key: key, _postponed: true }); }
    console.log(`  ⛈ PPD: ${g.away} @ ${g.home}`);
  }

  const output = {
    _meta: {
      schema_version: '2.0',  // Phase 1: adds schedules block
      generated_at: new Date().toISOString(),
      for_date: TODAY,
      source: 'field-data workflow (automated)',
      games_found: {
        nhl: nhlGames.length,
        nba: nbaGames.length,
        mlb: mlbGames.length,
        mls: mlsGames.length,
      },
      ai_notes: useAI,
      ai_backend: useGemini ? 'gemini-3.1-flash-lite' : (useClaude ? 'claude-sonnet-4' : 'none'),
      note: 'Phase 1: schedules block added. index.html reads schedules.mlb for full schedule. game_overlays remain for backward compat.',
    },
    // Phase 2 will consume this block. All sports, full game entries.
    schedules,
    // Backward compat: overlay patches keyed by home|away
    game_overlays: overlays,
  };

  fs.writeFileSync('/tmp/field-data-today.json', JSON.stringify(output, null, 2));
  const totalSchedule = Object.values(schedules).flat().length;
  console.log(`✅ Phase 1 output: ${totalSchedule} scheduled games + ${overlays.length} overlay(s)`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

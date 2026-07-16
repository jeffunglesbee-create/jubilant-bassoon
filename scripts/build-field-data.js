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

// ESPN GOTD schedule — authoritative source: ESPN Press Room (espnpressroom.com/us)
// Format: 'YYYY-MM-DD': 'Away Team|Home Team' (full team names as returned by statsapi)
const ESPN_GOTD_LOOKUP = {
  '2026-06-02':'Los Angeles Dodgers|Arizona Diamondbacks',
  '2026-06-03':'Texas Rangers|St. Louis Cardinals',
  '2026-06-04':'Baltimore Orioles|Boston Red Sox',
  '2026-06-05':'Milwaukee Brewers|Colorado Rockies',
  '2026-06-06':'Kansas City Royals|Minnesota Twins',
  '2026-06-07':'Boston Red Sox|New York Yankees',
  '2026-06-08':'Cincinnati Reds|San Diego Padres',
  '2026-06-09':'Washington Nationals|San Francisco Giants',
  '2026-06-10':'St. Louis Cardinals|New York Mets',
  '2026-06-11':'Chicago Cubs|Colorado Rockies',
  '2026-06-12':'Miami Marlins|Pittsburgh Pirates',
  '2026-06-13':'Arizona Diamondbacks|Cincinnati Reds',
  '2026-06-14':'Philadelphia Phillies|Milwaukee Brewers',
  '2026-06-15':'Kansas City Royals|Washington Nationals',
  '2026-06-16':'Tampa Bay Rays|Los Angeles Dodgers',
  '2026-06-17':'Cleveland Guardians|Milwaukee Brewers',
  '2026-06-18':'Minnesota Twins|Texas Rangers',
  '2026-06-19':'Baltimore Orioles|Los Angeles Dodgers',
  '2026-06-20':'Washington Nationals|Tampa Bay Rays',
  '2026-06-21':'Milwaukee Brewers|Atlanta Braves',
  '2026-06-22':'Houston Astros|Toronto Blue Jays',
  '2026-06-23':'Atlanta Braves|San Diego Padres',
  '2026-06-24':'Kansas City Royals|Tampa Bay Rays',
  '2026-06-25':'Arizona Diamondbacks|St. Louis Cardinals',
  '2026-06-26':'New York Yankees|Boston Red Sox',
  '2026-06-27':'Cincinnati Reds|Pittsburgh Pirates',
  '2026-06-28':'Philadelphia Phillies|New York Mets',
  '2026-06-29':'Los Angeles Angels|Seattle Mariners',
  '2026-06-30':'Los Angeles Dodgers|Athletics',
};

// CC-CMD-2026-06-16 broadcast overhaul Commit 3: ESPN cable / ABC schedule.
// The ESPN cable slate is the ~30-games-per-season national EXCLUSIVE
// window — distinct from ESPN App / Unlimited GOTD (which is the daily
// out-of-market streaming pick handled by ESPN_GOTD_LOOKUP above).
//
// Format: '<YYYY-MM-DD>': '<Away Team>|<Home Team>' (statsapi full names).
// 'abc: true' marks dates the slate airs on ABC OTA (simulcast on ESPN
// App). Without the flag, the game maps to MLB_ESPN_CABLE.
//
// Authoritative source: ESPN Press Room MLB schedule pages + ESPN PR
// announcements. Confirmed dates per the CC spec:
//   2026-04-15 NYM|LAD · 2026-05-07 TB|BOS · 2026-05-07 STL|SD
//   2026-05-25 NYY|KC  · 2026-06-11 SEA|BAL · 2026-06-14 CHC|SFG (ABC)
//   2026-06-15 TB|LAD  · 2026-06-22 ATL|SD  · 2026-06-27 NYY|BOS (ABC)
//   2026-07-16 NYM|PHI · 2026-08-16 STL|CHC (ABC) · 2026-08-23 ATL|MIL
const ESPN_CABLE_SCHEDULE = {
  '2026-04-15': { matchup: 'New York Mets|Los Angeles Dodgers',         abc: false },
  '2026-05-07': [
    { matchup: 'Tampa Bay Rays|Boston Red Sox',                          abc: false },
    { matchup: 'St. Louis Cardinals|San Diego Padres',                   abc: false },
  ],
  '2026-05-25': { matchup: 'New York Yankees|Kansas City Royals',        abc: false },
  '2026-06-11': { matchup: 'Seattle Mariners|Baltimore Orioles',         abc: false },
  '2026-06-14': { matchup: 'Chicago Cubs|San Francisco Giants',          abc: true  },
  '2026-06-15': { matchup: 'Tampa Bay Rays|Los Angeles Dodgers',         abc: false },
  '2026-06-22': { matchup: 'Atlanta Braves|San Diego Padres',            abc: false },
  '2026-06-27': { matchup: 'New York Yankees|Boston Red Sox',            abc: true  },
  '2026-07-16': { matchup: 'New York Mets|Philadelphia Phillies',        abc: false },
  '2026-08-16': { matchup: 'St. Louis Cardinals|Chicago Cubs',           abc: true  },
  '2026-08-23': { matchup: 'Atlanta Braves|Milwaukee Brewers',           abc: false },
};

// _lookupEspnCableSlot — returns the slot object {matchup, abc} that matches
// the away|home pair on this date, or null. Tolerates the multi-game day
// shape (May 7 has two slate entries).
function _lookupEspnCableSlot(dateStr, awayHomeKey) {
  const entry = ESPN_CABLE_SCHEDULE[dateStr];
  if (!entry) return null;
  const list = Array.isArray(entry) ? entry : [entry];
  return list.find(s => s.matchup === awayHomeKey) || null;
}

// ── ESPN MLB GOTD structural detection ───────────────────────────────────
// Fetches site.api.espn.com MLB scoreboard and returns a Set of 'home|away'
// keys (ESPN displayName strings) for games where 'ESPN Unlmtd' appears as a
// national broadcast — the specific GOTD signal, distinct from generic 'ESPN'
// (cable exclusive) which is NOT a reliable GOTD indicator.
// Called once per build in main(); passed into parseMLBFull → assignMLBBroadcast.
function fetchEspnMlbGotd(dateStr) {
  const espnDate = dateStr.replace(/-/g, '');
  const gotdKeys = new Set();
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'site.api.espn.com',
      path: `/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${espnDate}`,
      method: 'GET',
      headers: { 'User-Agent': 'FIELD-DataBot/1.0', 'Accept': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          for (const ev of parsed.events || []) {
            const comp = (ev.competitions || [])[0];
            if (!comp) continue;
            const national = (comp.broadcasts || []).find(b => b.market === 'national');
            const names = (national?.names || []).map(n => n.toLowerCase());
            if (names.some(n => n.includes('espn unlmtd') || n.includes('espn unlimited'))) {
              const home = (comp.competitors || []).find(c => c.homeAway === 'home')?.team?.displayName;
              const away = (comp.competitors || []).find(c => c.homeAway === 'away')?.team?.displayName;
              if (home && away) {
                gotdKeys.add(`${home}|${away}`);
                console.log(`ESPN GOTD (structural): ${away} @ ${home}`);
              }
            }
          }
        } catch (e) { console.warn('ESPN GOTD fetch error:', e.message); }
        resolve(gotdKeys);
      });
    });
    req.on('error', () => resolve(gotdKeys));
    req.setTimeout(10000, () => { req.destroy(); resolve(gotdKeys); });
    req.end();
  });
}

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
function assignMLBBroadcast(game, dateStr, rawBroadcasts, espnGotdKeysFromApi) {
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
  const hasFOX     = names.some(n => n === 'fox');
  const hasFS1     = names.some(n => n === 'fs1');
  const hasTBS     = names.some(n => n === 'tbs');
  const hasNBC     = names.some(n => n === 'nbc' || n === 'nbcsn');
  const hasPeacock = names.some(n => n.includes('peacock'));
  // CC-CMD-2026-06-16 broadcast overhaul Commit 5: Netflix MLB carries
  // the small exclusive-event slate — Opening Night (Mar 25), Field of
  // Dreams (Aug 13), Home Run Derby. EXCLUSIVE; locals blacked out.
  const hasNetflix = names.some(n => n === 'netflix' || n.startsWith('netflix '));

  // Detect Peacock GOTD: check broadcast type field for streaming-only Peacock
  // Sunday Leadoff and SNB are always on Peacock — only tag GOTD for non-Sunday
  // where Peacock appears with type 'N' (national) not 'H'/'A' (local RSN)
  if (hasPeacock && dow !== 0) {
    const peacockEntry = bcast.find(b => (b.name || '').toLowerCase().includes('peacock'));
    const pType = (peacockEntry?.type || '').toUpperCase();
    // Type 'N' = national broadcast, type 'I' = internet/streaming — both indicate GOTD on non-Sunday
    // Type 'H'/'A' = local home/away RSN simulcast — NOT a GOTD indicator
    if (pType === 'N' || pType === 'I' || pType === '') {
      game.peacockGOTD = true;
    }
  }

  // Detect ESPN GOTD: cross-reference against ESPN Press Room schedule lookup
  // AND structural signal from site.api.espn.com (espnGotdKeysFromApi).
  // DO NOT auto-tag from broadcast name — 'ESPN' appears for many non-GOTD games.
  // 'ESPN Unlmtd' in ESPN's own feed IS the specific GOTD signal (distinct from 'ESPN' cable).
  if (!game.espnGOTD) {
    const lookupKey = `${game.away}|${game.home}`;
    const scheduledGOTD = ESPN_GOTD_LOOKUP[dateStr];
    const structuralKey = `${game.home}|${game.away}`;
    if (scheduledGOTD === lookupKey
        || ESPN_GOTD_IDS.includes(structuralKey)
        || (espnGotdKeysFromApi && espnGotdKeysFromApi.has(structuralKey))) {
      game.espnGOTD = true;
    }
  }

  // Detect MLB Network: any MLBN national carry
  if (hasMLBN) {
    game.mlbnShowcase = true;
  }

  // CC-CMD-2026-07-16-broadcast-chip-durable-fix: ESPN cable schedule,
  // moved OUT of the `if (bcast.length > 0)` / `hasESPN` gate below and
  // checked unconditionally, mirroring the GOTD lookup above it. Real bug,
  // confirmed live: this table is the file's OWN documented "authoritative
  // source" (see its comment) precisely because plain 'ESPN' in
  // broadcasts() is NOT a reliable signal -- but gating it behind hasESPN
  // (a signal from LIVE statsapi broadcasts(all) hydration) meant a build
  // run before statsapi had attached that morning's/evening's broadcast
  // assignment (this workflow runs 3:30 AM ET, hours before most first
  // pitches) never even checked the authoritative table, silently leaving
  // nationalBundle null for a real, confirmed, already-scheduled ESPN
  // cable game (2026-07-16 NYM@PHI). The table itself needs no live
  // confirmation to be trusted -- that's the whole point of it being a
  // hand-verified, ESPN Press Room-sourced lookup.
  if (!game.nationalBundle) {
    const slot = _lookupEspnCableSlot(dateStr, `${game.away}|${game.home}`);
    if (slot) {
      game.nationalBundle = slot.abc ? 'MLB_ABC' : 'MLB_ESPN_CABLE';
    }
  }

  // Assign primary nationalBundle from live broadcast data
  if (!game.nationalBundle && bcast.length > 0) {
    if (hasNetflix)        { game.nationalBundle = 'MLB_NETFLIX'; return; }
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
    if (hasMLBN) { game.nationalBundle = 'MLB_NETWORK'; return; }
    // Has broadcasts but no national signal — leave nationalBundle = null
    // (game is local-only). The day-of-week fallback below was removing
    // 14/15 games' local-only status per day; the broadcasts(all) hydration
    // is authoritative.
  }

  // CC-CMD-2026-06-16 broadcast overhaul Commit 4: day-of-week fallback
  // removed. The previous switch(dow) block applied a national bundle to
  // EVERY game on Apple Friday / FOX Saturday / FOX Monday / TBS Tuesday
  // / Peacock Sunday — but only ONE game per day actually gets the
  // national pick. The result was 14/15 games per day mis-tagged with a
  // national bundle they don't carry.
  //
  // The MLB Stats API broadcasts(all) hydration is authoritative. If it
  // does NOT identify a national broadcast (no FOX/FS1/TBS/Apple/Peacock/
  // ESPN-cable/Netflix entry in the broadcast array AND the game is not
  // in any GOTD lookup), the game is local-only and nationalBundle stays
  // null. The client side defaults local-only games to MLB_LOCAL via
  // loadMLBSlate.
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
function parseMLBFull(espnGotdKeys) {
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
            if (!isPlayoff) assignMLBBroadcast(game, TODAY, rawBroadcasts, espnGotdKeys);

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

// ── Parse WNBA (V2 relay endpoint) ────────────────────────────────────────
// Unlike NHL/NBA/MLB (pre-fetched /tmp/*.json from older dedicated relay
// paths) or MLS (site.api.espn.com direct), WNBA has no dedicated relay
// path -- the daily-brief.yml WNBA fetch was found broken May 23 2026
// (appended ?leagueId=10 to an NBA-only CDN file) and was replaced with an
// explicit empty slate + TODO rather than publish wrong data. That TODO
// was never completed. field-relay-nba's newer V2 multi-sport endpoint
// (/v2/games?sport=wnba&date=YYYY-MM-DD) is confirmed live and working
// (CC-CMD-2026-07-13-wnba-daily-discovery: probed fresh, real 2 games for
// today with real venue/team/start-time data) -- a genuinely different
// response shape than the other parsers in this file, not the same shape
// as parseNBA()'s pre-fetched CDN JSON.
function parseWNBA() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'field-relay-nba.jeffunglesbee.workers.dev',
      path: `/v2/games?sport=wnba&date=${TODAY}`,
      method: 'GET',
      headers: { 'User-Agent': 'FIELD-DataBot/1.0', 'Accept': 'application/json' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const games = (parsed.games || []).map(g => {
            const home = g.home?.name || '';
            const away = g.away?.name || '';
            if (!home || !away) return null;
            return {
              sport: 'WNBA', home, away,
              start_time: g.start || null,
              venue: g.venue || null,
              league: 'WNBA',
            };
          }).filter(Boolean);
          console.log(`WNBA: ${games.length} game(s) for ${TODAY}`);
          resolve(games);
        } catch (e) { console.warn('WNBA parse error:', e.message); resolve([]); }
      });
    });
    req.on('error', (e) => { console.warn('WNBA request error:', e.message); resolve([]); });
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
  const espnGotdKeys = await fetchEspnMlbGotd(TODAY);  // once per build — structural GOTD signal
  const mlbGames  = await parseMLBFull(espnGotdKeys);   // Phase 1: full MLB schedule
  const mlsGames  = await parseMLS();
  const wnbaGames = await parseWNBA();

  console.log(`Parsed: ${nhlGames.length} NHL + ${nbaGames.length} NBA + ${mlbGames.length} MLB + ${mlsGames.length} MLS + ${wnbaGames.length} WNBA game(s) for ${TODAY}`);

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
    wnba: wnbaGames.map(g => ({
      sport: 'WNBA', home: g.home, away: g.away,
      start_time: g.start_time, venue: g.venue,
      league: g.league, confirmed: true,
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
        wnba: wnbaGames.length,
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

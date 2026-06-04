// ═══════════════════════════════════════════════════════════════════════════════
// field_utils.js — FIELD Domain Vocabulary
// ═══════════════════════════════════════════════════════════════════════════════
//
// PURPOSE: Pure utility functions for the FIELD app. No globals. No side effects.
//   Loaded first in <head> so helpers are available to all scripts and
//   inline handlers before the main app script runs.
//
// RULE (Standards Rule 20): Before writing ANY inline pattern, check here first.
//   If a helper doesn't exist for your domain operation, ADD IT HERE before
//   writing it inline. Name the concept, write the function, add a unit test.
//
// ADDING FUNCTIONS:
//   Pure (no globals)   → add here, export below, test in field_unit.js
//   Needs globals       → add to utility block in index.html (near scheduleRenderAll)
//
// INVENTORY (npm run inventory for full catalog):
// ─────────────────────────────────────────────────────────────────────────────
//
// ── TEAM NAMES ────────────────────────────────────────────────────────────────
//   teamNick(name)                 "New York Knicks" → "Knicks" (last word)
//   teamSlug(name, len, fromEnd)   Normalized alphanum slug for matching/keys
//   teamSlugPair(home, away)       "home6_away6" cache key for H2H/FD lookups
//
// ── GAME / SCHEDULE ───────────────────────────────────────────────────────────
//   gameNetwork(g, default)        Primary broadcast label from g.streams[0].label
//   shiftTime(iso, minutes)        Offset ISO timestamp by ±minutes
//   parseMatchweek(league)         "Premier League - Matchweek 38" → 38
//   espnPeriodLabel(pfx, n, clk)   ESPN period number → "Q3", "OT", "2OT"
//
// ── VENUE / WEATHER ───────────────────────────────────────────────────────────
//   isOutdoorVenue(g)              true if game is at an outdoor stadium
//   getVenueCoords(g)              {lat, lon} for weather fetch, or null
//   wxAlert(wx)                    Weather object → alert string or null
//   wxDescription(wx)              Human-readable weather description
//   wxIcon(wx)                     Emoji weather icon
//   wxWindDir(deg)                 Degrees → compass direction string
//   wxBadge(wx)                    Full weather badge HTML string
//
// ── PROBABILITY / SCORING ─────────────────────────────────────────────────────
//   toImpliedNum(odds)             Moneyline → implied probability (0-100)
//   dramaTier(score)               Drama score → tier label string
//
// ── TEXT / AI RESPONSES ───────────────────────────────────────────────────────
//   trimToCompleteSentence(text)   Trim to last complete sentence
//   stripJsonFences(text)          Remove ```json...``` AI response fences
//   extractJsonBlock(text)         Find first {...} JSON block in prose
//
// ── MATCHING ──────────────────────────────────────────────────────────────────
//   espnTeamMatch(espnName, field) Fuzzy match ESPN team name to FIELD name
//
// ─────────────────────────────────────────────────────────────────────────────
/* eslint-env browser */

// ── TEAM NAMES ────────────────────────────────────────────────────────────────

/**
 * Last word of a team name. "New York Knicks" → "Knicks".
 * Replaces (name||'').split(' ').pop() — handles null/undefined safely.
 * @param {string} name — full team name
 * @returns {string}
 */
// Overrides for teams where the last word is misleading or wrong.
// "Greater Western Sydney" → last word "Sydney" is ambiguous (multiple Sydney teams).
// "New York" teams → last word is the correct nick, no override needed.
const TEAM_NICK_OVERRIDES = {
  'greater western sydney': 'GWS',
  'gws giants':             'GWS',
  // Add further overrides here as needed (Rule: last word must be unambiguous)
};

function teamNick(name) {
  if (!name) return '';
  const override = TEAM_NICK_OVERRIDES[name.trim().toLowerCase()];
  if (override) return override;
  return name.trim().split(/\s+/).pop() || '';
}

/**
 * Normalized alphanumeric slug for team name matching and cache keys.
 * TWO STRATEGIES — do not mix:
 *   teamSlug(name, 6, false) → first 6 chars — for H2H cache key construction
 *   teamSlug(name, 6, true)  → last 6 chars  — for fuzzy .endsWith() matching
 * Default is last-6 (consistent with resolveGameIdByHome, renderScoreTicker).
 * @param {string} name
 * @param {number} [len=6]
 * @param {boolean} [fromEnd=true] — true=last N chars, false=first N chars
 * @returns {string}
 */
function teamSlug(name, len=6, fromEnd=true) {
  if (!name) return '';
  const norm = name.toLowerCase().replace(/[^a-z]/g, '');
  return fromEnd ? norm.slice(-len) : norm.slice(0, len);
}

/**
 * Build "home6_away6" cache key for H2H and FD match lookups.
 * Uses first-6 strategy (not last-6) — must match fdPrefetchSoccerLive key construction.
 * @param {string} home — home team name
 * @param {string} away — away team name
 * @returns {string}
 */
function teamSlugPair(home, away) {
  return teamSlug(home, 6, false) + '_' + teamSlug(away, 6, false);
}

// ── GAME / SCHEDULE ───────────────────────────────────────────────────────────

/**
 * Primary broadcast label from a game's streams array.
 * Replaces g.streams?.[0]?.label patterns with varying fallbacks.
 * @param {Object} g — game object with optional .streams array
 * @param {string} [defaultLabel=''] — returned when no stream is set
 * @returns {string}
 */
function gameNetwork(g, defaultLabel='') {
  return (g && g.streams && g.streams[0] && g.streams[0].label) || defaultLabel;
}

/**
 * Offset an ISO timestamp by ±minutes. Returns ISO string.
 * Replaces new Date(iso).getTime() ± n*60*1000 arithmetic patterns.
 * @param {string} iso — ISO 8601 timestamp
 * @param {number} minutes — positive=forward, negative=backward
 * @returns {string|null}
 */
function shiftTime(iso, minutes) {
  if (!iso) return iso;
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

/**
 * Extract matchweek number from a league string.
 * "Premier League - Matchweek 38" → 38. Returns null for non-matchweek strings.
 * @param {string} league
 * @returns {number|null}
 */
function parseMatchweek(leagueStr) {
  const m = (leagueStr||'').match(/Matchweek\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

// ESPN_OT_PERIODS: used by espnPeriodLabel to identify overtime
const ESPN_OT_PERIODS = {
  "Q": 4,  // NBA, WNBA, NCAA Basketball (Q5+ = OT)
  "P": 3,  // NHL (P4+ = OT)
  "H": 2,  // College basketball halves (H3 = OT)
  "T": 9,  // Baseball innings (T10+ = extra innings)
};

/**
 * Convert ESPN period number to a display label.
 * espnPeriodLabel("Q", 5, "2:30") → "OT". espnPeriodLabel("Q", 6) → "2OT".
 * @param {string} periodPrefix — "Q" NBA/WNBA, "P" NHL, "H" CBB, "T" MLB
 * @param {number} period
 * @param {string} [clock]
 * @returns {string}
 */
function espnPeriodLabel(periodPrefix, period, clock){
  const maxPeriod = ESPN_OT_PERIODS[periodPrefix];
  if(maxPeriod && period > maxPeriod){
    return period === maxPeriod + 1 ? "OT" : `${period - maxPeriod}OT`;
  }
  return `${periodPrefix}${period}`;
}

// ── VENUE / WEATHER ───────────────────────────────────────────────────────────

/**
 * True if the game is played at an outdoor venue (baseball, NFL, soccer, AFL).
 * Used to gate weather bonus in drama scoring and weather alert in compound prompt.
 * @param {Object} g — game object
 * @returns {boolean}
 */
function isOutdoorVenue(venueName){
  if(!venueName) return false;
  const coords = getVenueCoords(venueName);
  if(coords) return coords[2] === true;
  // Fallback heuristic for unlisted venues
  const lower = venueName.toLowerCase();
  return !INDOOR_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * {lat, lon} coordinates for a game's venue, or null if unknown.
 * Used to fetch Open-Meteo weather data for outdoor games.
 * @param {Object} g — game object
 * @returns {{lat: number, lon: number}|null}
 */
function getVenueCoords(venueName){
  if(!venueName) return null;
  if(VENUE_COORDS[venueName]) return VENUE_COORDS[venueName];
  const needle = venueName.toLowerCase().split(",")[0].trim();
  for(const [key, coords] of Object.entries(VENUE_COORDS)){
    const hay = key.toLowerCase().split(",")[0].trim();
    if(needle === hay || hay.includes(needle) || needle.includes(hay.split(" ")[0])){
      return coords;
    }
  }
  return null;
}

/**
 * Weather alert string from a wx data object, or null if conditions are normal.
 * Triggers: heavy rain (>5in), high wind (>30mph), extreme heat (>100°F).
 * Used in: dramaScoreLive (+10 bonus), buildCompoundPrompt [WEATHER ALERT] field.
 * @param {{rain: number, wind: number, temp: number}} wx
 * @returns {string|null}
 */
function wxAlert(wx){
  if(wx.rain > 5)   return "Heavy rain — delay risk";
  if(wx.rain > 1)   return "Rain in forecast";
  if(wx.temp > 100) return "Extreme heat advisory";
  if(wx.wind > 30)  return "High wind advisory";
  return null;
}

/**
 * Human-readable weather description string.
 * @param {Object} wx — weather data object
 * @returns {string}
 */
function wxDescription(wx){
  if(wx.rain > 3)   return "Heavy rain";
  if(wx.rain > 0.5) return "Light rain";
  if(wx.precip > 2) return "Wet conditions";
  if(wx.temp > 95)  return "Extreme heat";
  if(wx.temp < 32)  return "Freezing";
  if(wx.wind > 25)  return "Windy";
  return wx.isDay ? "Clear" : "Clear night";
}

/**
 * Emoji icon for current weather conditions.
 * @param {Object} wx
 * @returns {string}
 */
function wxIcon(wx){
  if(wx.rain > 3)   return "⛈";
  if(wx.rain > 0.5) return "🌧";
  if(wx.precip > 1) return "🌦";
  if(wx.temp > 95)  return "🥵";
  if(wx.temp < 32)  return "🥶";
  if(wx.wind > 25)  return "💨";
  if(wx.isDay)      return "☀️";
  return "🌙";
}

/**
 * Wind direction degrees → compass string. 0/360 → "N", 90 → "E", etc.
 * @param {number} deg
 * @returns {string}
 */
function wxWindDir(deg){ return WX_DIR[Math.round((deg||0)/22.5) % 16]; }

/**
 * Full weather badge HTML for display in game cards.
 * Combines wxIcon, wxDescription, and alert state into a styled badge string.
 * @param {Object} wx
 * @returns {string}
 */
function wxBadge(wx){
  const icon   = wxIcon(wx);
  const rain   = wx.rain > 0.1 ? ` · 🌧 ${wx.rain.toFixed(1)}"` : "";
  const wind   = wx.wind >= 8  ? ` · ${wx.wind}mph ${wxWindDir(wx.windDir)}` : "";
  const alert  = wx.alert ? ` ⚠️` : "";
  const bgCol  = wx.alert ? "rgba(239,68,68,.12)" : "rgba(148,163,184,.06)";
  const txCol  = wx.alert ? "#fbbf24" : "var(--smoke)";
  return `<span class="wx-badge" title="${wx.desc}${wx.alert?" — "+wx.alert:""}"
    style="display:inline-flex;align-items:center;gap:.2rem;font-size:.6rem;
    background:${bgCol};color:${txCol};padding:.1rem .35rem;border-radius:.25rem;
    margin-top:.2rem;letter-spacing:.01em">
    ${icon} ${wx.temp}°F${rain}${wind}${alert}
  </span>`;
}

// ── PROBABILITY / SCORING ─────────────────────────────────────────────────────

/**
 * Convert American moneyline odds to implied probability (0–100).
 * -150 → 60, +130 → 43.5, EV/EVEN/PK → 50, null/'' → null.
 * @param {number|string} odds — American moneyline
 * @returns {number|null}
 */
function toImpliedNum(oddsStr){
  if(!oddsStr) return null;
  const s = String(oddsStr).trim();
  if(["EV","PK","EVEN","+0","0"].includes(s.toUpperCase())) return 50;
  const n = parseInt(s);
  if(isNaN(n)) return null;
  return n < 0 ? (-n / (-n + 100)) * 100 : (100 / (n + 100)) * 100;
}

/**
 * Drama score → tier label string for display and compound prompt context.
 * @param {number} score — drama score (0–100)
 * @returns {string}
 */
function dramaTier(score){
  if(score>=80) return 'fire';
  if(score>=60) return 'hot';
  if(score>=40) return 'warm';
  return '';
}

// ── TEXT / AI RESPONSES ───────────────────────────────────────────────────────

/**
 * Trim text to the last complete sentence (ending in . ! ?).
 * When no sentence boundary found, returns the full text — never returns ''
 * (empty string causes callers to fall back to generic static text).
 * Bug fixed May 20: used to return '' → Europa League got PL matchday blurb.
 * @param {string} text
 * @returns {string}
 */
function trimToCompleteSentence(text) {
  if(!text) return text;
  const trimmed = text.trim();
  // Already ends cleanly
  if(/[.!?]["']?$/.test(trimmed)) return trimmed;
  // Find the last complete sentence boundary
  const lastEnd = Math.max(
    trimmed.lastIndexOf('. ') + 1,
    trimmed.lastIndexOf('! ') + 1,
    trimmed.lastIndexOf('? ') + 1,
    trimmed.lastIndexOf('."') + 2,
    trimmed.lastIndexOf('!"') + 2,
    trimmed.lastIndexOf('?"') + 2,
  );
  // Trim if result is at least 30 chars (one meaningful sentence).
  if(lastEnd >= 30 && lastEnd > trimmed.length * 0.3) {
    return trimmed.slice(0, lastEnd).trim();
  }
  // No sentence boundary found — return full text rather than ''.
  // A slightly incomplete sentence is almost always better than the generic
  // static fallback (e.g. "Premier League fixture — one of 38 games...").
  return trimmed;
}

/**
 * Remove ```json...``` code fences from AI response text.
 * Replaces inline fence-strip patterns in compound prompt callers.
 * Always pair with extractJsonBlock when AI may add prose around JSON.
 * @param {string} text
 * @returns {string}
 */
function stripJsonFences(text) {
  if (!text) return text;
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

/**
 * Find the first {...} JSON block in a string (after fence-stripping).
 * Returns null if no JSON block found.
 * @param {string} text
 * @returns {string|null}
 */
function extractJsonBlock(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

// ── MATCHING ──────────────────────────────────────────────────────────────────

/**
 * Fuzzy match an ESPN team name against a FIELD team name.
 * ESPN sends full names ("New York Knicks"); FIELD stores short names ("Knicks").
 * Tries last-word match, then substring match in both directions.
 * @param {string} espnName — name from ESPN API response
 * @param {string} fieldName — name from allData game object
 * @returns {boolean}
 */
function espnTeamMatch(espnName, fieldName){
  if(!espnName||!fieldName) return false;
  // Normalize: lowercase, remove diacritics, strip punctuation
  const norm = s => s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9 ]/g,"");
  const a = norm(espnName), b = norm(fieldName);
  if(a===b) return true;
  if(a.includes(b)||b.includes(a)) return true;
  // Word match: any word > 3 chars shared between names
  return a.split(" ").some(w=>w.length>3&&b.includes(w))
      || b.split(" ").some(w=>w.length>3&&a.includes(w));
}

// ─────────────────────────────────────────────────────────────────────────────
// ── WC GROUP-STAGE PERMUTATIONS ENGINE ─────────────────────────────────────────
// Pure function. Given a group's current standings and remaining fixtures,
// enumerate every possible final outcome and summarize per-team qualification
// scenarios. Used by the WC Groups view to answer "what does Team X need?"
//
// MARGIN MODEL (documented limit): outcomes are enumerated as W/D/L only.
// Each scenario assumes minimum-margin goals — a win is 1-0, a draw is 0-0.
// Goal differential and goals-for therefore shift by ±1 per win and 0 per draw.
// This is the most conservative model — it answers "can this team finish 1st
// REGARDLESS of how many goals" rather than projecting actual scorelines.
// A future v1.1 can extend to margin tiers (close / comfortable / blowout).
//
// FIFA TIEBREAKERS (2026 group stage, applied in order):
//   1. Points
//   2. Goal difference
//   3. Goals scored
//   4. Head-to-head points (between the tied teams only)
//   5. Head-to-head goal difference
//   6. Head-to-head goals scored
// Fair play and drawing of lots are not modelled (rare, and FP requires
// season-long card tracking out of scope here).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort a slice of teams by FIFA group-stage tiebreakers (1–6).
 * Mutates and returns the input array.
 * @param {Array<Object>} teams — each has {name, P, W, D, L, GF, GA, Pts}
 * @param {Array<Object>} playedMatches — [{home, away, homeScore, awayScore}, ...]
 *   Used for H2H tiebreakers among teams tied on points + GD + GF.
 * @returns {Array<Object>} the same array, sorted in finishing order (1st first).
 */
function wcSortByTiebreakers(teams, playedMatches) {
  // Stage A — sort by base tiebreakers (Pts → GD → GF)
  const gd = t => t.GF - t.GA;
  teams.sort((a, b) =>
    (b.Pts - a.Pts) || (gd(b) - gd(a)) || (b.GF - a.GF)
  );
  // Stage B — resolve ties using head-to-head among the tied subset
  let i = 0;
  while (i < teams.length) {
    let j = i + 1;
    while (j < teams.length
        && teams[j].Pts === teams[i].Pts
        && gd(teams[j]) === gd(teams[i])
        && teams[j].GF === teams[i].GF) {
      j++;
    }
    if (j - i > 1) {
      // Tied subset is teams[i..j-1]. Compute mini-table from H2H matches.
      const tied = teams.slice(i, j);
      const tiedNames = new Set(tied.map(t => t.name));
      const h2h = {};
      tied.forEach(t => { h2h[t.name] = {Pts:0, GF:0, GA:0}; });
      for (const m of playedMatches) {
        if (!tiedNames.has(m.home) || !tiedNames.has(m.away)) continue;
        h2h[m.home].GF += m.homeScore;
        h2h[m.home].GA += m.awayScore;
        h2h[m.away].GF += m.awayScore;
        h2h[m.away].GA += m.homeScore;
        if (m.homeScore > m.awayScore)      h2h[m.home].Pts += 3;
        else if (m.homeScore < m.awayScore) h2h[m.away].Pts += 3;
        else { h2h[m.home].Pts += 1; h2h[m.away].Pts += 1; }
      }
      tied.sort((a, b) => {
        const ha = h2h[a.name], hb = h2h[b.name];
        return (hb.Pts - ha.Pts)
            || ((hb.GF - hb.GA) - (ha.GF - ha.GA))
            || (hb.GF - ha.GF);
      });
      for (let k = i; k < j; k++) teams[k] = tied[k - i];
    }
    i = j;
  }
  return teams;
}

/**
 * Apply a single match outcome to the group standings (mutates copies).
 * Uses minimum-margin model: home win = 1-0, draw = 0-0, away win = 0-1.
 * @param {Object} teamMap — {teamName: {name, P, W, D, L, GF, GA, Pts}, ...}
 * @param {string} home
 * @param {string} away
 * @param {('H'|'D'|'A')} outcome — Home win / Draw / Away win
 * @param {Array<Object>} playedSink — push the synthetic match here so H2H sees it
 */
function wcApplyOutcome(teamMap, home, away, outcome, playedSink) {
  const h = teamMap[home], a = teamMap[away];
  h.P += 1; a.P += 1;
  if (outcome === 'H') {
    h.W += 1; h.Pts += 3; h.GF += 1;
    a.L += 1; a.GA += 1;
    playedSink.push({home, away, homeScore: 1, awayScore: 0});
  } else if (outcome === 'A') {
    a.W += 1; a.Pts += 3; a.GF += 1;
    h.L += 1; h.GA += 1;
    playedSink.push({home, away, homeScore: 0, awayScore: 1});
  } else {
    h.D += 1; h.Pts += 1;
    a.D += 1; a.Pts += 1;
    playedSink.push({home, away, homeScore: 0, awayScore: 0});
  }
}

/**
 * Deep-copy a team-state map (small enough that JSON round-trip is fine).
 */
function wcCloneTeamMap(teamMap) {
  const out = {};
  for (const k in teamMap) out[k] = Object.assign({}, teamMap[k]);
  return out;
}

/**
 * Enumerate every W/D/L outcome combination for the remaining fixtures and
 * compute the resulting standings under FIFA tiebreakers. Returns one entry
 * per scenario.
 * @param {Object} teamMap — current standings keyed by team name
 * @param {Array<Object>} played — already-played matches (for H2H seeding)
 * @param {Array<Object>} remaining — [{home, away}, ...] unplayed
 * @returns {Array<{outcomes, final}>} list of 3^N scenarios
 */
function wcEnumerateScenarios(teamMap, played, remaining) {
  const N = remaining.length;
  if (N > 8) {
    // 3^9 = 19683; over 8 unplayed matches is well outside group-stage size (6).
    throw new Error(`wcEnumerateScenarios: ${N} remaining > supported max of 8`);
  }
  const total = Math.pow(3, N);
  const scenarios = [];
  const codes = ['H', 'D', 'A'];
  for (let s = 0; s < total; s++) {
    const tm = wcCloneTeamMap(teamMap);
    const playedCopy = played.slice();
    const outcomeList = [];
    let bits = s;
    for (let k = 0; k < N; k++) {
      const code = codes[bits % 3];
      bits = Math.floor(bits / 3);
      outcomeList.push({home: remaining[k].home, away: remaining[k].away, outcome: code});
      wcApplyOutcome(tm, remaining[k].home, remaining[k].away, code, playedCopy);
    }
    const finalArr = Object.values(tm);
    wcSortByTiebreakers(finalArr, playedCopy);
    scenarios.push({outcomes: outcomeList, final: finalArr.map(t => t.name)});
  }
  return scenarios;
}

/**
 * Summarize per-team qualification possibilities across all scenarios.
 * @param {Array<string>} teamNames
 * @param {Array<{outcomes, final}>} scenarios — output of wcEnumerateScenarios
 * @returns {Object} per-team summary
 */
function wcSummarizePerTeam(teamNames, scenarios) {
  const out = {};
  for (const name of teamNames) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    for (const sc of scenarios) {
      const idx = sc.final.indexOf(name);
      if (idx === 0) pos1++;
      else if (idx === 1) pos2++;
      else if (idx === 2) pos3++;
      else                pos4++;
    }
    const total = scenarios.length;
    out[name] = {
      canTopGroup:      pos1 > 0,
      canQualifyTop2:   (pos1 + pos2) > 0,
      canFinish3rd:     pos3 > 0,
      alwaysTopGroup:   pos1 === total,
      alwaysQualify:    (pos1 + pos2) === total,
      alwaysEliminated: pos1 === 0 && pos2 === 0 && pos3 === 0,
      scenarioCounts:   {first: pos1, second: pos2, third: pos3, fourth: pos4},
    };
  }
  return out;
}

/**
 * Main entrypoint — compute WC group-stage scenarios.
 *
 * @param {Object} input
 * @param {string} input.groupId — 'A' through 'L'
 * @param {Array<Object>} input.teams — current standings, each:
 *   {name, P, W, D, L, GF, GA, Pts}. Length must be 4.
 * @param {Array<Object>} input.played — already-played matches in this group:
 *   [{home, away, homeScore, awayScore}, ...]
 * @param {Array<Object>} input.remaining — unplayed fixtures: [{home, away}, ...]
 * @returns {Object} {
 *   groupId,
 *   matchesRemaining: number,
 *   scenariosEnumerated: number,
 *   currentTable: [{name, ...}] sorted by FIFA tiebreakers,
 *   perTeam: { [name]: { canTopGroup, canQualifyTop2, ... } },
 *   marginModel: 'minimum' — documents that wins = +1 GD, draws = +0 GD
 * }
 */
function computeGroupScenarios({groupId, teams, played, remaining}) {
  if (!Array.isArray(teams) || teams.length !== 4) {
    throw new Error('computeGroupScenarios: teams must be an array of 4');
  }
  if (!Array.isArray(played))    played    = [];
  if (!Array.isArray(remaining)) remaining = [];
  // Build team map for fast lookup during enumeration.
  const teamMap = {};
  for (const t of teams) {
    teamMap[t.name] = Object.assign({}, t);
  }
  // Current table (under tiebreakers, no future outcomes applied).
  const currentSorted = Object.values(wcCloneTeamMap(teamMap));
  wcSortByTiebreakers(currentSorted, played);
  // Enumerate.
  const scenarios = wcEnumerateScenarios(teamMap, played, remaining);
  const perTeam   = wcSummarizePerTeam(teams.map(t => t.name), scenarios);
  return {
    groupId,
    matchesRemaining:    remaining.length,
    scenariosEnumerated: scenarios.length,
    currentTable:        currentSorted,
    perTeam,
    marginModel:         'minimum',
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Node.js compatibility — used by field_unit.js for direct imports
// Browser: all functions are global (loaded via <script src> in <head>)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    teamNick, teamSlug, teamSlugPair,
    gameNetwork, shiftTime, parseMatchweek, espnPeriodLabel,
    isOutdoorVenue, getVenueCoords,
    wxAlert, wxDescription, wxIcon, wxWindDir, wxBadge,
    toImpliedNum, dramaTier,
    trimToCompleteSentence, stripJsonFences, extractJsonBlock,
    espnTeamMatch,
    // WC Permutations Engine
    computeGroupScenarios,
    wcSortByTiebreakers,
    wcEnumerateScenarios,
    wcSummarizePerTeam,
  };
}

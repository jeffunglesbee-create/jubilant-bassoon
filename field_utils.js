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
function teamNick(name) {
  if (!name) return '';
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
  };
}

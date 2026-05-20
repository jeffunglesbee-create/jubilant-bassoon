// field_utils.js — pure utility functions extracted from index.html
// No global state. No side effects. Safe to import in Node.js and browser.
///
// Browser: functions are globally available (loaded via <script src>)
// Node.js: require("./field_utils.js") returns all functions as exports
//           used by field_unit.js for direct imports (no new Function() hacks)
//
// Rule 19 (STANDARDS.md): extracted functions stay here.
//   Do not re-add them to index.html.
//   When adding a new pure function: add here first, then use in index.html.

/* eslint-env browser */
/* global WX_TTL */

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
function toImpliedNum(oddsStr){
  if(!oddsStr) return null;
  const s = String(oddsStr).trim();
  if(["EV","PK","EVEN","+0","0"].includes(s.toUpperCase())) return 50;
  const n = parseInt(s);
  if(isNaN(n)) return null;
  return n < 0 ? (-n / (-n + 100)) * 100 : (100 / (n + 100)) * 100;
}
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
function wxAlert(wx){
  if(wx.rain > 5)   return "Heavy rain — delay risk";
  if(wx.rain > 1)   return "Rain in forecast";
  if(wx.temp > 100) return "Extreme heat advisory";
  if(wx.wind > 30)  return "High wind advisory";
  return null;
}
function wxDescription(wx){
  if(wx.rain > 3)   return "Heavy rain";
  if(wx.rain > 0.5) return "Light rain";
  if(wx.precip > 2) return "Wet conditions";
  if(wx.temp > 95)  return "Extreme heat";
  if(wx.temp < 32)  return "Freezing";
  if(wx.wind > 25)  return "Windy";
  return wx.isDay ? "Clear" : "Clear night";
}
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
function wxWindDir(deg){ return WX_DIR[Math.round((deg||0)/22.5) % 16]; }
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
function parseMatchweek(leagueStr) {
  const m = (leagueStr||'').match(/Matchweek\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}
function isOutdoorVenue(venueName){
  if(!venueName) return false;
  const coords = getVenueCoords(venueName);
  if(coords) return coords[2] === true;
  // Fallback heuristic for unlisted venues
  const lower = venueName.toLowerCase();
  return !INDOOR_KEYWORDS.some(kw => lower.includes(kw));
}
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
// ESPN_OT_PERIODS: used by espnPeriodLabel to detect overtime
const ESPN_OT_PERIODS = {
  "Q": 4,  // NBA, WNBA, NCAA Basketball (Q5+ = OT)
  "P": 3,  // NHL (P4+ = OT)
  "H": 2,  // College basketball halves (H3 = OT)
  "T": 9,  // Baseball innings (T10+ = extra innings)
};
function espnPeriodLabel(periodPrefix, period, clock){
  const maxPeriod = ESPN_OT_PERIODS[periodPrefix];
  if(maxPeriod && period > maxPeriod){
    return period === maxPeriod + 1 ? "OT" : `${period - maxPeriod}OT`;
  }
  return `${periodPrefix}${period}`;
}
function dramaTier(score){
  if(score>=80) return 'fire';
  if(score>=60) return 'hot';
  if(score>=40) return 'warm';
  return '';
}

// ── Team name helpers ──────────────────────────────────────────────────────
// teamNick: last word of a team name — "New York Knicks" → "Knicks"
// Replaces 73 occurrences of (name||'').split(' ').pop() across index.html.
// Always use this instead of split/pop — it handles null/undefined safely.
function teamNick(name) {
  if (!name) return '';
  return name.trim().split(/\s+/).pop() || '';
}

// teamSlug: normalized alphanumeric slug for cache keys and fuzzy matching.
// Two strategies, both documented:
//   teamSlug(name, 6, false)  → first 6 chars  — use for H2H cache keys (exact match)
//   teamSlug(name, 6, true)   → last 6 chars   — use with .endsWith() for fuzzy match
// Default: last 6 chars (consistent with resolveGameIdByHome, renderScoreTicker).
function teamSlug(name, len=6, fromEnd=true) {
  if (!name) return '';
  const norm = name.toLowerCase().replace(/[^a-z]/g, '');
  return fromEnd ? norm.slice(-len) : norm.slice(0, len);
}

// teamSlugPair: builds "home6_away6" key used by fdMatchIdCache.
// Both sides use first-6 to match fdPrefetchSoccerLive key construction.
function teamSlugPair(home, away) {
  return teamSlug(home, 6, false) + '_' + teamSlug(away, 6, false);
}

// ── AI response helpers ────────────────────────────────────────────────────
// stripJsonFences: removes ```json ... ``` fences from AI responses.
// Replaces 3 duplicated regex patterns across compound prompt callers.
function stripJsonFences(text) {
  if (!text) return text;
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

// extractJsonBlock: finds first {...} block in an AI response string.
// Use after stripJsonFences when the AI may add prose around the JSON.
function extractJsonBlock(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}


// ── Time arithmetic ────────────────────────────────────────────────────────
// shiftTime: offset an ISO timestamp by ±minutes. Returns ISO string.
// Replaces 13 inline new Date(iso).getTime() ± n*60*1000 patterns.
function shiftTime(iso, minutes) {
  if (!iso) return iso;
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

// ── Stream/network helpers ─────────────────────────────────────────────────
// gameNetwork: primary broadcast label for a game.
// Replaces 13 inline g.streams?.[0]?.label patterns with varying fallbacks.
// Pass defaultLabel to override the empty-string default.
function gameNetwork(g, defaultLabel='') {
  return (g && g.streams && g.streams[0] && g.streams[0].label) || defaultLabel;
}


// Node.js compatibility — used by field_unit.js for direct imports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    trimToCompleteSentence,
    toImpliedNum,
    espnTeamMatch,
    wxAlert,
    wxDescription,
    wxIcon,
    wxWindDir,
    wxBadge,
    parseMatchweek,
    isOutdoorVenue,
    getVenueCoords,
    espnPeriodLabel,
    dramaTier,
  teamNick,
  teamSlug,
  teamSlugPair,
  stripJsonFences,
  extractJsonBlock,
  shiftTime,
  gameNetwork,
  };
}

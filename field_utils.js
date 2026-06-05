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
 * Sort a slice of teams by FIFA group-stage tiebreakers (1–7).
 * Mutates and returns the input array.
 * @param {Array<Object>} teams — each has {name, P, W, D, L, GF, GA, Pts}
 * @param {Array<Object>} playedMatches — [{home, away, homeScore, awayScore}, ...]
 *   Used for H2H tiebreakers among teams tied on points + GD + GF.
 * @param {Object} [fairPlayPoints] — optional {[teamName]: number}. FIFA FP schedule:
 *   yellow = −1, two-yellow red = −3, direct red = −3 (cumulative in tournament).
 *   Higher (less negative) is better. Omit to skip tiebreaker #7.
 * @returns {Array<Object>} the same array, sorted in finishing order (1st first).
 */
function wcSortByTiebreakers(teams, playedMatches, fairPlayPoints) {
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
        // H2H pts → H2H GD → H2H GF → fair-play points (tiebreaker #7)
        return (hb.Pts - ha.Pts)
            || ((hb.GF - hb.GA) - (ha.GF - ha.GA))
            || (hb.GF - ha.GF)
            || (fairPlayPoints ? ((fairPlayPoints[b.name] || 0) - (fairPlayPoints[a.name] || 0)) : 0);
      });
      for (let k = i; k < j; k++) teams[k] = tied[k - i];
    }
    i = j;
  }
  return teams;
}

/**
 * Apply a single match outcome to the group standings (mutates copies).
 * v1.0/minimum model: home win = 1-0, draw = 0-0, away win = 0-1.
 * v1.4/poisson model: uses expected GD/GF derived from Poisson(λH, λA).
 *   Caller passes lambdaHome, lambdaAway via matchMeta to activate.
 * @param {Object} teamMap — {teamName: {name, P, W, D, L, GF, GA, Pts}, ...}
 * @param {string} home
 * @param {string} away
 * @param {('H'|'D'|'A')} outcome — Home win / Draw / Away win
 * @param {Array<Object>} playedSink — push the synthetic match here so H2H sees it
 * @param {{lambdaHome?: number, lambdaAway?: number}} [matchMeta]
 */
function wcApplyOutcome(teamMap, home, away, outcome, playedSink, matchMeta) {
  const h = teamMap[home], a = teamMap[away];
  h.P += 1; a.P += 1;
  // v1.4: Poisson-expected GD if lambdas provided; else minimum-margin (1 or 0).
  const lH = matchMeta && matchMeta.lambdaHome > 0 ? matchMeta.lambdaHome : null;
  const lA = matchMeta && matchMeta.lambdaAway > 0 ? matchMeta.lambdaAway : null;
  if (outcome === 'H') {
    // Expected scoreline for a home win, rounded to nearest integer
    const hg = lH && lA ? Math.round(wcPoissonExpectedGoals(lH, lA, 'H', 'home')) : 1;
    const ag = lH && lA ? Math.round(wcPoissonExpectedGoals(lH, lA, 'H', 'away')) : 0;
    const safeHg = Math.max(hg, ag + 1);  // ensure result is actually a home win
    h.W += 1; h.Pts += 3; h.GF += safeHg; h.GA += ag;
    a.L += 1; a.GF += ag; a.GA += safeHg;
    playedSink.push({home, away, homeScore: safeHg, awayScore: ag});
  } else if (outcome === 'A') {
    const ag = lH && lA ? Math.round(wcPoissonExpectedGoals(lH, lA, 'A', 'away')) : 1;
    const hg = lH && lA ? Math.round(wcPoissonExpectedGoals(lH, lA, 'A', 'home')) : 0;
    const safeAg = Math.max(ag, hg + 1);
    a.W += 1; a.Pts += 3; a.GF += safeAg; a.GA += hg;
    h.L += 1; h.GF += hg; h.GA += safeAg;
    playedSink.push({home, away, homeScore: hg, awayScore: safeAg});
  } else {
    // Draw — expected goals each side (whole goals; uses ceiling so at least 0)
    const drHg = lH ? Math.round(lH * 0.6) : 0;  // rough fraction of shots in draw
    const drAg = lA ? Math.round(lA * 0.6) : 0;
    h.D += 1; h.Pts += 1; h.GF += drHg; h.GA += drAg;
    a.D += 1; a.Pts += 1; a.GF += drAg; a.GA += drHg;
    playedSink.push({home, away, homeScore: drHg, awayScore: drAg});
  }
}

/**
 * Poisson expected goals for the WINNING side in a given outcome.
 * Computes E[goals | result] = Σ k × P(k goals) / P(result) for scorelines
 * where the result is consistent (home > away for H, etc.). Caps at 8 goals.
 * @param {number} lH — home team lambda (expected goals)
 * @param {number} lA — away team lambda
 * @param {('H'|'D'|'A')} outcome
 * @param {('home'|'away')} side — which team's goals to return
 * @returns {number} expected goals for that side, conditioned on the outcome
 */
function wcPoissonExpectedGoals(lH, lA, outcome, side) {
  const pois = (lam, k) => {
    let p = Math.exp(-lam), r = p;
    for (let i = 1; i <= k; i++) { r = r * lam / i; p = r; }
    return p;
  };
  let num = 0, den = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const relevant = outcome === 'H' ? h > a : outcome === 'A' ? a > h : h === a;
      if (!relevant) continue;
      const p = pois(lH, h) * pois(lA, a);
      den += p;
      num += p * (side === 'home' ? h : a);
    }
  }
  return den > 0 ? num / den : (side === 'home' ? lH : lA);
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
 * per scenario, optionally weighted by per-match outcome probabilities.
 * @param {Object} teamMap — current standings keyed by team name
 * @param {Array<Object>} played — already-played matches (for H2H seeding)
 * @param {Array<Object>} remaining — [{home, away}, ...] unplayed
 * @param {Array<Object>} [outcomeProbs] — optional, parallel to remaining:
 *   [{pHome, pDraw, pAway}, ...]. When provided, each scenario carries a
 *   joint probability (product of per-match probs). When omitted, scenarios
 *   are returned with probability null and downstream code must treat them
 *   as a uniform distribution (1 / total).
 * @returns {Array<{outcomes, final, probability}>} list of 3^N scenarios
 */
function wcEnumerateScenarios(teamMap, played, remaining, outcomeProbs, fairPlayPoints) {
  const N = remaining.length;
  if (N > 8) {
    throw new Error(`wcEnumerateScenarios: ${N} remaining > supported max of 8`);
  }
  // Validate outcomeProbs if provided.
  let useProbs = false;
  if (Array.isArray(outcomeProbs) && outcomeProbs.length > 0) {
    if (outcomeProbs.length !== N) {
      throw new Error(`wcEnumerateScenarios: outcomeProbs length ${outcomeProbs.length} != remaining length ${N}`);
    }
    for (let i = 0; i < N; i++) {
      const p = outcomeProbs[i];
      if (!p || typeof p.pHome !== 'number' || typeof p.pDraw !== 'number' || typeof p.pAway !== 'number') {
        throw new Error(`wcEnumerateScenarios: outcomeProbs[${i}] missing pHome/pDraw/pAway`);
      }
      const sum = p.pHome + p.pDraw + p.pAway;
      if (Math.abs(sum - 1) > 0.01) {
        throw new Error(`wcEnumerateScenarios: outcomeProbs[${i}] sums to ${sum.toFixed(3)}, must be ~1.0`);
      }
    }
    useProbs = true;
  }
  const total = Math.pow(3, N);
  const scenarios = [];
  const codes = ['H', 'D', 'A'];
  for (let s = 0; s < total; s++) {
    const tm = wcCloneTeamMap(teamMap);
    const playedCopy = played.slice();
    const outcomeList = [];
    let bits = s;
    let prob = useProbs ? 1 : null;
    for (let k = 0; k < N; k++) {
      const code = codes[bits % 3];
      bits = Math.floor(bits / 3);
      outcomeList.push({home: remaining[k].home, away: remaining[k].away, outcome: code});
      // v1.4: pass matchMeta with Poisson lambdas when provided in outcomeProbs
      const matchMeta = (useProbs && outcomeProbs[k]?.lambdaHome != null)
          ? { lambdaHome: outcomeProbs[k].lambdaHome, lambdaAway: outcomeProbs[k].lambdaAway }
          : null;
      wcApplyOutcome(tm, remaining[k].home, remaining[k].away, code, playedCopy, matchMeta);
      if (useProbs) {
        const p = outcomeProbs[k];
        prob *= (code === 'H' ? p.pHome : code === 'D' ? p.pDraw : p.pAway);
      }
    }
    const finalArr = Object.values(tm);
    wcSortByTiebreakers(finalArr, playedCopy, fairPlayPoints);
    scenarios.push({outcomes: outcomeList, final: finalArr.map(t => t.name), probability: prob});
  }
  return scenarios;
}

/**
 * Summarize per-team qualification possibilities across all scenarios.
 * If scenarios carry probability weights (probability !== null), the per-team
 * output additionally includes pFirst/pSecond/pThird/pFourth — probabilities
 * for each finishing position. If unweighted, those fields are null.
 * @param {Array<string>} teamNames
 * @param {Array<{outcomes, final, probability}>} scenarios
 * @returns {Object} per-team summary
 */
function wcSummarizePerTeam(teamNames, scenarios) {
  const out = {};
  const weighted = scenarios.length > 0 && scenarios[0].probability !== null;
  for (const name of teamNames) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    for (const sc of scenarios) {
      const idx = sc.final.indexOf(name);
      if (idx === 0)      { pos1++; if (weighted) p1 += sc.probability; }
      else if (idx === 1) { pos2++; if (weighted) p2 += sc.probability; }
      else if (idx === 2) { pos3++; if (weighted) p3 += sc.probability; }
      else                { pos4++; if (weighted) p4 += sc.probability; }
    }
    out[name] = {
      canTopGroup:      pos1 > 0,
      canQualifyTop2:   (pos1 + pos2) > 0,
      canFinish3rd:     pos3 > 0,
      alwaysTopGroup:   pos1 === scenarios.length,
      alwaysQualify:    (pos1 + pos2) === scenarios.length,
      alwaysEliminated: pos1 === 0 && pos2 === 0 && pos3 === 0,
      scenarioCounts:   {first: pos1, second: pos2, third: pos3, fourth: pos4},
      // Probability fields populated only when caller provided outcomeProbabilities.
      pFirst:           weighted ? p1 : null,
      pSecond:          weighted ? p2 : null,
      pThird:           weighted ? p3 : null,
      pFourth:          weighted ? p4 : null,
      pQualifyTop2:     weighted ? (p1 + p2) : null,
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
 * @param {Array<Object>} [input.outcomeProbabilities] — optional, parallel to
 *   remaining: [{pHome, pDraw, pAway}, ...]. Each row must sum to ~1.0.
 *   When provided, perTeam output includes pFirst/pSecond/pThird/pFourth.
 * @returns {Object} {
 *   groupId, matchesRemaining, scenariosEnumerated,
 *   currentTable, perTeam, marginModel, weighted
 * }
 */
function computeGroupScenarios({groupId, teams, played, remaining, outcomeProbabilities, fairPlayPoints}) {
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
  wcSortByTiebreakers(currentSorted, played, fairPlayPoints);
  // Enumerate (with optional probability weighting and fair-play tiebreaker).
  const scenarios = wcEnumerateScenarios(teamMap, played, remaining, outcomeProbabilities, fairPlayPoints);
  const perTeam   = wcSummarizePerTeam(teams.map(t => t.name), scenarios);
  return {
    groupId,
    matchesRemaining:    remaining.length,
    scenariosEnumerated: scenarios.length,
    currentTable:        currentSorted,
    perTeam,
    marginModel:         'minimum',
    weighted:            Array.isArray(outcomeProbabilities) && outcomeProbabilities.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ── v1.2 — BEST-3rd CROSS-GROUP ENGINE ──────────────────────────────────────
// The 2026 WC format: 12 groups of 4 → top 2 from each group (24 teams) +
// best 8 third-place finishers across the 12 groups = 32 to Round of 32.
// Comparing third-place teams from DIFFERENT groups uses FIFA criteria:
// points → goal difference → goals scored → fair-play points → drawing of
// lots. H2H tiebreakers don't apply (the teams didn't play each other).
//
// Exhaustive enumeration across 12 groups is combinatorially infeasible
// (9^12 ≈ 2.8×10^11 at MD3, 729^12 ≈ 10^34 at MD0), so this is Monte Carlo.
// Default 10,000 samples is enough for stable P(qualify) estimates within
// roughly ±0.5% on a single team across runs. Increase samples for tighter
// confidence intervals.
//
// Determinism: pass a numeric `seed` to use a Mulberry32 PRNG for repeatable
// results in tests. Omit `seed` to use Math.random() (non-deterministic).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mulberry32 — tiny deterministic PRNG. Returns a function that yields
 * uniform [0, 1) on each call. State is closed over via `state`.
 * Reference: https://en.wikipedia.org/wiki/Mulberry32
 */
function wcMakePRNG(seed) {
  let state = (seed | 0) || 1;
  return function() {
    state = (state + 0x6D2B79F5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sample ONE outcome combination for a group's remaining matches and
 * compute the resulting final table. Used as the inner loop of the
 * cross-group Monte Carlo.
 * @param {Object} input — same shape as computeGroupScenarios inputs
 * @param {Function} rand — () => [0,1) PRNG
 * @returns {{finalTable: Array, thirdPlaceTeam: Object|null}}
 *   finalTable: sorted [{name, P, W, D, L, GF, GA, Pts}, ...]
 *   thirdPlaceTeam: the 3rd-place finisher's full record (or null on bad input)
 */
function wcSampleScenario({teams, played, remaining, outcomeProbabilities}, rand) {
  if (!Array.isArray(teams) || teams.length !== 4) return {finalTable: [], thirdPlaceTeam: null};
  if (!Array.isArray(played))    played    = [];
  if (!Array.isArray(remaining)) remaining = [];
  const useProbs = Array.isArray(outcomeProbabilities) && outcomeProbabilities.length === remaining.length;
  const teamMap = {};
  for (const t of teams) teamMap[t.name] = Object.assign({}, t);
  const playedCopy = played.slice();
  for (let k = 0; k < remaining.length; k++) {
    const r = rand();
    let outcome;
    if (useProbs) {
      const p = outcomeProbabilities[k];
      if      (r < p.pHome)             outcome = 'H';
      else if (r < p.pHome + p.pDraw)   outcome = 'D';
      else                              outcome = 'A';
    } else {
      // Uniform — equal probability for H/D/A
      outcome = r < 1/3 ? 'H' : r < 2/3 ? 'D' : 'A';
    }
    wcApplyOutcome(teamMap, remaining[k].home, remaining[k].away, outcome, playedCopy);
  }
  const finalArr = Object.values(teamMap);
  wcSortByTiebreakers(finalArr, playedCopy);
  return {
    finalTable:     finalArr,
    thirdPlaceTeam: finalArr.length >= 3 ? finalArr[2] : null,
  };
}

/**
 * Sort the third-place finishers across groups by FIFA cross-group criteria
 * (points → GD → GF). Returns the array sorted with index 0 = best 3rd.
 */
function wcSortThirdPlaceAcrossGroups(thirdPlaceArr) {
  return thirdPlaceArr.slice().sort((a, b) =>
    (b.Pts - a.Pts)
      || ((b.GF - b.GA) - (a.GF - a.GA))
      || (b.GF - a.GF)
  );
}

/**
 * Run cross-group Monte Carlo. For each sample, draws one scenario per
 * group, identifies each group's 3rd-place team, sorts them by FIFA
 * cross-group criteria, and credits the top 8 with one "qualify" count.
 *
 * @param {Object} input
 * @param {Array<Object>} input.groupInputs — array of group input objects,
 *   each {groupId, teams, played, remaining, outcomeProbabilities?}
 * @param {number} [input.samples=10000] — Monte Carlo iterations
 * @param {number|null} [input.seed=null] — PRNG seed (null = Math.random)
 * @param {number} [input.bestN=8] — how many third-place spots qualify (8 for WC 2026)
 * @returns {Object} {
 *   samples,
 *   bestN,
 *   perTeam: { [name]: { groupId, samplesAsThird, pAsThird, pQualifyAsBest3rd, pMissAsBest3rd } }
 * }
 */
function computeBest3rdRanking({groupInputs, samples = 10000, seed = null, bestN = 8}) {
  if (!Array.isArray(groupInputs) || groupInputs.length === 0) {
    throw new Error('computeBest3rdRanking: groupInputs must be a non-empty array');
  }
  const rand = (seed !== null && seed !== undefined) ? wcMakePRNG(seed) : Math.random;
  // Per-team counters across the run
  const counters = {};
  for (const gi of groupInputs) {
    for (const t of (gi.teams || [])) {
      counters[t.name] = counters[t.name] || {
        groupId:        gi.groupId,
        samplesAsThird: 0,
        samplesQualify: 0,
      };
    }
  }
  for (let s = 0; s < samples; s++) {
    // Sample one scenario per group, collect the third-place team
    const thirdPlace = [];
    for (const gi of groupInputs) {
      const res = wcSampleScenario(gi, rand);
      if (res.thirdPlaceTeam) {
        thirdPlace.push(Object.assign({groupId: gi.groupId}, res.thirdPlaceTeam));
      }
    }
    // Sort by FIFA cross-group criteria; top bestN qualify
    const sorted = wcSortThirdPlaceAcrossGroups(thirdPlace);
    for (let i = 0; i < sorted.length; i++) {
      const tp = sorted[i];
      counters[tp.name].samplesAsThird++;
      if (i < bestN) counters[tp.name].samplesQualify++;
    }
  }
  // Derive probabilities
  const perTeam = {};
  for (const name in counters) {
    const c = counters[name];
    perTeam[name] = {
      groupId:           c.groupId,
      samplesAsThird:    c.samplesAsThird,
      pAsThird:          c.samplesAsThird / samples,
      pQualifyAsBest3rd: c.samplesQualify / samples,
      // P(team finishes 3rd AND misses best-N cut) = P(3rd) − P(qualify as best-3rd)
      pMissAsBest3rd:    (c.samplesAsThird - c.samplesQualify) / samples,
    };
  }
  return {samples, bestN, perTeam};
}


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
    wcApplyOutcome,
    wcPoissonExpectedGoals,
    // v1.2 — best-3rd cross-group
    computeBest3rdRanking,
    wcSampleScenario,
    wcSortThirdPlaceAcrossGroups,
    wcMakePRNG,
  };
}

/**
 * epa.js — Expected Points Added (EPA) module for FIELD
 *
 * Computes EPA for American football plays using a pre-computed EP lookup table
 * sourced from nflfastR (nflverse). Works with SportRadar UFL/NFL play event schema.
 *
 * Usage:
 *   const epa = await FIELD_EPA.init();       // loads table once
 *   const result = epa.fromSRPlay(srEvent);   // {epa, ep_start, ep_end, label}
 *   const ep = epa.getEP(down, ytg, yl100);   // raw EP lookup
 *
 * Sources:
 *   - EP table: outbox/nfl/epa_table.json (nflverse-derived, served via relay)
 *   - SR play schema: api.sportradar.com/ufl/trial/v7/en/games/{id}/pbp.json
 *   - Reference: Yurko, Ventura, Horowitz (2019) nflfastR paper
 */

const FIELD_EPA = (() => {

  // ── Table metadata (matches build-epa-table.py output) ───────────────────
  const YTG_BUCKETS  = [1,2,3,4,5,6,7,8,9,10,11,15,20,25];
  const YL100_BUCKETS = [1,6,11,16,21,26,31,36,41,46,51,56,61,66,71,76,81,86,91,96];

  // ── Lookup table (loaded async) ───────────────────────────────────────────
  let _ep = null;
  let _turnover = null;
  let _loading = null;

  const TABLE_URL = '/nflverse/epa_table.json';  // served via relay: /nflverse/{file}

  // ── Nearest-neighbor helpers ──────────────────────────────────────────────
  function nearestBucket(val, buckets) {
    let best = buckets[0], bestDist = Infinity;
    for (const b of buckets) {
      const d = Math.abs(val - b);
      if (d < bestDist) { bestDist = d; best = b; }
    }
    return best;
  }

  function clampYtg(ytg, yl100) {
    // Can't need more yards than distance to end zone
    return Math.max(1, Math.min(ytg, yl100));
  }

  // ── Core EP lookup ────────────────────────────────────────────────────────
  /**
   * Get Expected Points for a given game situation.
   * @param {number} down      - 1–4
   * @param {number} ytg       - yards to go for first down
   * @param {number} yl100     - yards from opponent end zone (1 = at opponent 1, 99 = at own 1)
   * @returns {number} EP value, or 0 if table not loaded
   */
  function getEP(down, ytg, yl100) {
    if (!_ep) return 0;
    down  = Math.max(1, Math.min(4, Math.round(down)));
    yl100 = Math.max(1, Math.min(99, Math.round(yl100)));
    ytg   = Math.max(1, clampYtg(Math.round(ytg), yl100));

    const ytgB  = nearestBucket(Math.min(ytg, 25), YTG_BUCKETS);
    const yl100B = nearestBucket(yl100, YL100_BUCKETS);
    const key = `${down}_${ytgB}_${yl100B}`;

    if (_ep[key] !== undefined) return _ep[key];

    // Fallback: try relaxing down constraint
    for (const d of [down-1, down+1, 1]) {
      if (d < 1 || d > 4) continue;
      const k2 = `${d}_${ytgB}_${yl100B}`;
      if (_ep[k2] !== undefined) return _ep[k2];
    }
    return 0;
  }

  // ── SportRadar yardline → yardline_100 conversion ────────────────────────
  /**
   * Convert SportRadar situation to yardline_100 (yards from opponent end zone).
   * SR stores yardline as the numeric yard mark + which team's side.
   * When location.id === possession.id → own territory → yl100 = 100 - yardline
   * When location.id !== possession.id → opponent territory → yl100 = yardline
   */
  function srSituationToYL100(situation) {
    if (!situation) return null;
    const loc = situation.location || {};
    const pos = situation.possession || {};
    const yardline = loc.yardline;
    if (yardline === undefined || yardline === null) return null;

    // Same team ID = own territory
    const ownTerritory = loc.id === pos.id || loc.name === pos.name;
    const yl100 = ownTerritory ? (100 - yardline) : yardline;
    return Math.max(1, Math.min(99, yl100));
  }

  // ── EPA computation for a SportRadar play event ───────────────────────────
  /**
   * Compute EPA for a SportRadar UFL/NFL play event.
   * @param {Object} srEvent - event from SR pbp.json → periods[].pbp[].events[]
   * @returns {{epa:number, ep_start:number, ep_end:number, label:string, situation:string}|null}
   */
  function fromSRPlay(srEvent) {
    if (!srEvent || !_ep) return null;
    const pt = srEvent.play_type;

    // Skip non-play events
    const SKIP_TYPES = ['timeout', 'two_minute_warning', 'game_over', 'period_end',
                        'kickoff', 'extra_point', 'two_point_conversion', 'no_play'];
    if (SKIP_TYPES.includes(pt)) return null;

    const ss = srEvent.start_situation;
    if (!ss || ss.down === undefined) return null;

    const yl100_start = srSituationToYL100(ss);
    if (yl100_start === null) return null;

    const down_start = ss.down;
    const ytg_start  = ss.yfd;
    const ep_start   = getEP(down_start, ytg_start, yl100_start);

    // ── Scoring plays ────────────────────────────────────────────────────────
    if (srEvent.scoring_play) {
      let ep_end;
      if (pt === 'field_goal' || pt === 'field_goal_missed') {
        ep_end = pt === 'field_goal' ? 3 : 0;
      } else if (pt === 'safety') {
        ep_end = 2;
      } else {
        // Touchdown
        ep_end = 6.96;
      }
      const epa = ep_end - ep_start;
      return { epa: round2(epa), ep_start: round2(ep_start), ep_end: round2(ep_end),
               label: epaLabel(epa), situation: formatSit(down_start, ytg_start, yl100_start) };
    }

    // ── Turnover ─────────────────────────────────────────────────────────────
    if (srEvent.turnover) {
      const es = srEvent.end_situation;
      let ep_end;
      if (es && es.possession) {
        const yl100_end = srSituationToYL100(es);
        if (yl100_end !== null) {
          // Opponent now has the ball — their EP is negative from original team's perspective
          const opp_yl100 = 100 - yl100_end;
          ep_end = -getEP(1, 10, Math.max(1, Math.min(99, opp_yl100)));
        } else {
          ep_end = _turnover ? (_turnover[String(nearestBucket(yl100_start, YL100_BUCKETS))] || 0) : -ep_start;
        }
      } else {
        ep_end = _turnover ? (_turnover[String(nearestBucket(yl100_start, YL100_BUCKETS))] || 0) : -ep_start;
      }
      const epa = ep_end - ep_start;
      return { epa: round2(epa), ep_start: round2(ep_start), ep_end: round2(ep_end),
               label: epaLabel(epa), situation: formatSit(down_start, ytg_start, yl100_start) };
    }

    // ── Normal play ──────────────────────────────────────────────────────────
    const es = srEvent.end_situation;
    if (!es || es.down === undefined) return null;

    const yl100_end = srSituationToYL100(es);
    if (yl100_end === null) return null;

    const down_end = es.down;
    const ytg_end  = es.yfd;
    const ep_end   = getEP(down_end, ytg_end, yl100_end);

    const epa = ep_end - ep_start;
    return { epa: round2(epa), ep_start: round2(ep_start), ep_end: round2(ep_end),
             label: epaLabel(epa), situation: formatSit(down_start, ytg_start, yl100_start) };
  }

  // ── Cumulative EPA for a drive ────────────────────────────────────────────
  /**
   * Compute cumulative EPA for all plays in a SportRadar drive.
   * @param {Object} srDrive - drive object from pbp.json → periods[].pbp[]
   * @returns {{plays: Array, total_epa: number, play_count: number}}
   */
  function fromSRDrive(srDrive) {
    const events = srDrive.events || [];
    const plays = events
      .map(e => ({ ...fromSRPlay(e), type: e.play_type, desc: e.description }))
      .filter(p => p && p.epa !== undefined);
    const total_epa = plays.reduce((sum, p) => sum + p.epa, 0);
    return { plays, total_epa: round2(total_epa), play_count: plays.length };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function round2(n) { return Math.round(n * 100) / 100; }

  function epaLabel(epa) {
    if (epa >= 4)    return 'explosive';
    if (epa >= 2)    return 'big gain';
    if (epa >= 0.5)  return 'positive';
    if (epa >= -0.5) return 'neutral';
    if (epa >= -2)   return 'negative';
    if (epa >= -4)   return 'loss';
    return 'disaster';
  }

  function formatSit(down, ytg, yl100) {
    const ownYL = 100 - yl100;
    const side  = yl100 <= 50 ? `OPP ${yl100}` : `OWN ${ownYL}`;
    const downs = ['1st','2nd','3rd','4th'];
    return `${downs[down-1] || down} & ${ytg} @ ${side}`;
  }

  // ── Init (loads table from relay) ─────────────────────────────────────────
  /**
   * Load the EP table. Returns the EPA interface. Safe to call multiple times.
   * @param {string} [url] - Override table URL (e.g. for testing)
   */
  async function init(url) {
    if (_ep) return api;
    if (_loading) return _loading;
    _loading = (async () => {
      try {
        const resp = await fetch(url || TABLE_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        _ep = data.ep || data;
        _turnover = data.turnover_ep || null;
        console.log(`[FIELD_EPA] Loaded ${Object.keys(_ep).length} EP entries (${data.method || 'table'})`);
      } catch (e) {
        console.warn('[FIELD_EPA] Table load failed, EPA unavailable:', e.message);
        _ep = {};
      }
      return api;
    })();
    return _loading;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  const api = { init, getEP, fromSRPlay, fromSRDrive, epaLabel, formatSit, srSituationToYL100 };
  return api;

})();

// CommonJS export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FIELD_EPA;
}

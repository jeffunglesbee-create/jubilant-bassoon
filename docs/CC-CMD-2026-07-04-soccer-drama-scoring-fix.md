# CC-CMD: Soccer drama scoring fixes + WC26 backfill (real gaps found investigating a user-reported case)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Three real, separately-verified issues found while investigating
a specific complaint (Argentina 3-2 Cape Verde showing "drama peak of
43/100"). One explicitly NOT attempted — see EXCLUDED below.

**Why — three real, verified findings, not one:**

1. **`regular_season_games.drama_peak`/`drama_arc` are NULL for ALL 31
   completed WC26 games** (`SELECT COUNT(*)... WHERE sport LIKE '%World
   Cup%' AND home_score IS NOT NULL` → total:31, null_count:31, run
   2026-07-04). This is a 100% backfill gap, not a one-off. The "43"
   shown in the Argentina/Cape Verde Night Owl brief was never actually
   persisted anywhere — it only exists inside that one brief's text
   (`source:"client"`, `model:null`).

2. **`fetchSoccerHistoricalStates` (index.html:33839) only samples
   `data.keyEvents`** (goals/cards/subs) — it has no representation of
   time passing without an event. Confirmed via the Argentina/Cape
   Verde case: the game's own `game_recap` brief already recorded "1-1
   draw... 5 minutes remaining in this second half" — plugging that
   moment into `dramaScoreLive` by hand gives `1.0×52+10≈62`, well
   above the 43 that was actually computed. The tense, scoreless
   stretch approaching stoppage time has no keyEvent marking it, so the
   peak-finder never evaluates that moment at all — it can only see
   drama at discrete goal/card timestamps, missing the tightest
   *quiet* moments entirely.

3. **`dramaScoreLive`'s soccer branch has no dedicated extra-time bonus**
   (index.html ~23400-23410) — every other sport in this function has
   one (MLB `period>=10`:+22, NHL `period>3`:+25, NBA `period>4`:+22,
   NFL `period>4`:+20). Soccer's time bonus is purely clock-minute-based
   (`minNum>=90`:+18) with no `period` check at all, meaning stoppage
   time and genuine extra time score identically, capped at the same
   +18 ceiling that's the LOWEST overtime bonus of any sport in this
   function.

**EXCLUDED, deliberately, not attempted here:** a team-ranking/upset
factor (the "#1 vs 67th" dimension). Confirmed via source search: there
is no FIFA ranking, seed, or pot data anywhere in this codebase —
`grep` for `fifaRank`/`worldRanking`/seed/pot data returns nothing
relevant. Adding this would require integrating a new external data
source (a FIFA rankings API or similar), which is a materially larger
scope than the three fixes above and needs its own investigation into
what's actually available and how it'd be fetched/cached — not
something to bolt onto this CC-CMD as an afterthought.

**Target time:** ~1.5 hrs (fixes) + backfill runs opportunistically per
the existing session-capped mechanism (see TASK 3)

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95 on the CC-verifiable portion. Real
observation of a backfilled WC26 game's corrected drama_peak actually
looking right (e.g., a genuinely tense tied match scoring meaningfully
higher than before) is deferred to chat — requires waiting for the
existing session-capped discovery loop to actually run against real
data after this ships.

## PROBE BLOCK (run before any edits)
```bash
grep -n "^function dramaScoreLive" index.html
grep -n "^async function fetchSoccerHistoricalStates" index.html
grep -n "^function computeDramaRetroactive" index.html
grep -n "runDramaBackfillDiscovery" index.html
```
**Also required before TASK 1:** find a real WC26 game that went to
extra time (check D1: `SELECT id,home,away,home_score,away_score FROM
regular_season_games WHERE sport LIKE '%World Cup%'` and cross-reference
against known knockout-stage results, or query ESPN's summary endpoint
for a confirmed extra-time match) and inspect its actual `keyEvents[].
period.number` values. Confirm whether extra-time halves are numbered
3/4 (matching the existing `period===2` "second half" convention seen
elsewhere in this file) before hardcoding a threshold — do not assume
this without a real example, this doc's suggested values below are a
starting hypothesis, not a verified fact.

## TASK 1 — Add soccer extra-time bonus to dramaScoreLive

In the soccer branch of the time-bonus section (index.html ~23400,
re-verify exact line via probe):
```javascript
} else if(sp.includes('soccer')||sp.includes('league')||sp.includes('mls')||
          sp.includes('liga')||sp.includes('ligue')||sp.includes('premier')){
  const minNum = parseInt(clock)||0;
  // Extra time gets its own tier, matching every other sport's overtime
  // bonus in this function (NHL +25, NBA/MLB +22, NFL +20) — soccer
  // previously had none, conflating stoppage time and actual extra time
  // into the same generic "≥90 minute" bucket. Verify period>=3 really
  // means extra time via the PROBE BLOCK's real-game check before
  // trusting this threshold.
  if(period>=3) timeBonus=24;         // extra time — verify threshold via probe
  else if(minNum>=90) timeBonus=18;   // stoppage time (unchanged)
  else if(minNum>=80) timeBonus=10;
  else if(minNum>=70) timeBonus=5;
}
```

## TASK 2 — Fix fetchSoccerHistoricalStates to interpolate quiet stretches

Modify `fetchSoccerHistoricalStates` (index.html ~33839) so that after
building the keyEvents-based timeline, it inserts synthetic sample
points at fixed intervals (every 5 real minutes of wallclock time)
between consecutive events, carrying forward the last-known score and
period, with a clock value advanced to match — so a tense scoreless
stretch produces multiple evaluable data points instead of zero:
```javascript
async function fetchSoccerHistoricalStates(espnEventId, league) {
  try {
    const slug = league || 'fifa.world';
    const url = `${ESPN_SUMMARY_RELAY}/sports/soccer/${slug}/summary?event=${encodeURIComponent(String(espnEventId))}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return [];
    const data = await r.json();
    const competitors = data.header?.competitions?.[0]?.competitors || [];
    const homeTeamId = competitors.find(c => c.homeAway === 'home')?.team?.id;
    if (!homeTeamId) return [];
    let homeScore = 0, awayScore = 0;
    const eventStates = (data.keyEvents || [])
      .filter(e => e.wallclock)
      .map(e => {
        if (e.scoringPlay) {
          if (String(e.team?.id) === String(homeTeamId)) homeScore++; else awayScore++;
        }
        return {
          homeScore, awayScore,
          period: e.period?.number || 1,
          clock: e.clock?.displayValue || '',
          t: new Date(e.wallclock).getTime(),
        };
      });
    if (eventStates.length < 2) return eventStates; // nothing to interpolate between

    // Interpolate: every 5 real minutes between consecutive events, carry
    // forward score/period, synthesize an advancing clock value so
    // dramaScoreLive's time-bonus logic still sees rising urgency even
    // when nothing "key" happened.
    const FIVE_MIN_MS = 5 * 60 * 1000;
    const interpolated = [eventStates[0]];
    for (let i = 1; i < eventStates.length; i++) {
      const prev = eventStates[i - 1];
      const curr = eventStates[i];
      const gap = curr.t - prev.t;
      const steps = Math.floor(gap / FIVE_MIN_MS);
      for (let s = 1; s < steps; s++) {
        const prevClockMin = parseInt(prev.clock) || 0;
        interpolated.push({
          homeScore: prev.homeScore,
          awayScore: prev.awayScore,
          period: prev.period,
          clock: String(prevClockMin + s * 5), // approximate advancing minute
          t: prev.t + s * FIVE_MIN_MS,
        });
      }
      interpolated.push(curr);
    }
    return interpolated;
  } catch(e) {
    if (typeof FIELD_DEBUG !== 'undefined' && FIELD_DEBUG) console.log('[DRAMA-BACKFILL] Soccer fetch error:', e?.message);
    return [];
  }
}
```

## TASK 3 — Backfill the 31 existing NULL WC26 games

Do NOT write a new backfill mechanism — `runDramaBackfillDiscovery`
already exists and already does exactly this (discovery + retroactive
compute + POST-back), currently capped at a small number of games per
app session (confirm the real current cap via probe — this doc doesn't
assume a specific number without checking). With TASK 1/2's fixes in
place, this existing loop will naturally correct all 31 games over
however many sessions it takes at its current cap. **Do not raise the
cap in this CC-CMD** without first checking whether a higher cap has
other cost implications (ESPN API rate limits, session startup time) —
if the existing cap means 31 games will take many days to fully
backfill, report that plainly as a real tradeoff for Jeff to decide on,
don't unilaterally change it.

## TASK 4 — Smoke assertions

```javascript
smoke.assert(!!html.match(/soccer[\s\S]{0,400}period>=3\)\s*timeBonus=24/), 'A[NEXT]: soccer dramaScoreLive has an extra-time bonus tier');
smoke.assert(html.includes('FIVE_MIN_MS'), 'A[NEXT+1]: fetchSoccerHistoricalStates interpolates quiet stretches');
smoke.assert(!!html.match(/interpolated\.push\(curr\)/), 'A[NEXT+2]: interpolation preserves real event data points, does not replace them');
```
(CC: assign real sequential A-numbers; adjust the first assertion's
exact match if the probe-verified threshold differs from 24.)

## SCOPE BOUNDARY

DO:
- Add the extra-time bonus tier (TASK 1), verified against a real extra-time game first
- Add interpolation to the soccer historical-state fetcher (TASK 2)
- Let the existing backfill discovery loop do its job (TASK 3) — do not build new backfill infrastructure
- 3 smoke assertions
- Bump SW_VERSION

DO NOT:
- Add any ranking/seed/upset factor — explicitly out of scope, needs its own data-source investigation (see EXCLUDED above)
- Touch MLB/NHL/NBA/NFL/AFL/CFL/tennis branches of `dramaScoreLive` — soccer only
- Raise the backfill session cap without flagging the tradeoff explicitly
- Apply interpolation to `fetchMLBHistoricalStates` or any other sport's historical-state fetcher — scoped to soccer, where the keyEvents-only gap was specifically found

## DONE CONDITIONS
- [ ] Probe block re-run; a real extra-time WC26 game's `period` values confirmed before finalizing TASK 1's threshold
- [ ] Extra-time bonus added, using the verified (not assumed) period threshold
- [ ] Interpolation added, preserves all real event data points unchanged, only fills gaps between them
- [ ] `node smoke.js index.html` exits 0 with all 3 new assertions green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-soccer-drama-scoring-fix-{date}.md`, explicitly recording the real extra-time period values found during probe (not the hypothesized ones in this doc, if they differ)

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation that the backfill discovery loop, run after this ships, actually produces a materially different (higher, where warranted) drama_peak for the Argentina/Cape Verde game or another genuinely tense WC26 match — confirms the fix works end-to-end, not just that the code is correct in isolation.

## COMPLIANCE
- Rule 47/ADR-002/RUWT: this modifies an internal scoring computation only — verify the existing RUWT constraint (drama scores are internal signals feeding display logic, not raw displayed "excitement ratings") still holds; do not change what gets displayed to users, only how the internal drama_peak number is computed and backfilled
- Rule 68: probe block first, especially the real extra-time game check — do not hardcode period thresholds from assumption
- Rule 87: self-completing on the CC-verifiable portion; end-to-end backfill observation is necessarily deferred by the existing session-cap mechanism's own timing

## CONFIDENCE SCORING TABLE
+25  Extra-time threshold verified against a real game before use, not assumed
+25  Interpolation logic correct — confirmed via code read that real event points are preserved unchanged, only gaps are filled
+25  Smoke 3/3 green
+25  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-soccer-drama-scoring-fix.md. Find
a real extra-time WC26 game and confirm its period values BEFORE
writing TASK 1 — do not hardcode period>=3 on assumption alone.
Implement exactly as specified. The ranking/upset factor is explicitly
excluded, do not attempt it. Do not commit unless confidence ≥ 95. If
score < 95 report verbatim and stop — do not invent results.

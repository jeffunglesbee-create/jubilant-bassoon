# CC-CMD: Soccer drama scoring fixes + WC26 backfill (real gaps found investigating a user-reported case)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Three real, separately-verified issues found while investigating
a specific complaint (Argentina 3-2 Cape Verde showing "drama peak of
43/100"). A fourth item — the ranking/upset factor — was initially
excluded as needing its own investigation, then actually investigated
per direct instruction: real, usable data sources were found (see
TASK 4 below), so it's included here as a paired, dependent task rather
than left out.

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

**RANKING/UPSET FACTOR — now included as TASK 4, not excluded.**
Investigated directly: ESPN itself does not carry FIFA ranking data
(confirmed via live probe of both `site.api.espn.com` team and summary
endpoints for Argentina/Cape Verde specifically — no rank field in
either response). Real, usable external sources do exist —
footballdata.io's FIFA Rankings API returns clean JSON with real rank/
points data. **Hard dependency:** `CC-CMD-2026-07-04-fifa-rankings-relay.md`
(field-relay-nba repo) must be deployed first, and it in turn needs a
real API key Jeff provisions — this is NOT something CC or chat can
acquire. Verify the relay endpoint is live before starting TASK 4:
```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/fifa-rankings/Argentina"
```
If this returns a 503 "not configured" error, the key hasn't been
provisioned yet — TASK 4 can still be written and its logic reviewed,
but cannot be verified live until it has been.

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

## TASK 5 — Smoke assertions

```javascript
smoke.assert(!!html.match(/soccer[\s\S]{0,400}period>=3\)\s*timeBonus=24/), 'A[NEXT]: soccer dramaScoreLive has an extra-time bonus tier');
smoke.assert(html.includes('FIVE_MIN_MS'), 'A[NEXT+1]: fetchSoccerHistoricalStates interpolates quiet stretches');
smoke.assert(!!html.match(/interpolated\.push\(curr\)/), 'A[NEXT+2]: interpolation preserves real event data points, does not replace them');
smoke.assert(html.includes('upsetBonus'), 'A[NEXT+3]: soccer upset-factor bonus exists');
smoke.assert(!!html.match(/rankGap >= 30 && diff <= 1/), 'A[NEXT+4]: upset bonus is conditional on the underdog actually competing now, not a flat pre-game bonus');
```
(CC: assign real sequential A-numbers; adjust the first assertion's
exact match if the probe-verified threshold differs from 24.)

## TASK 4 — Upset bonus in dramaScoreLive (soccer only, hard dependency on the relay CC-CMD above)

```javascript
// Upset-factor bonus. Real FIFA rank data via the relay (7-day cached,
// see CC-CMD-2026-07-04-fifa-rankings-relay.md). Deliberately
// CONDITIONAL, not a flat bonus for any big ranking-gap game: only
// applies when the underdog is actually competing RIGHT NOW (tied or
// within 1 goal) -- a 5-0 blowout by the favorite gets nothing extra
// just because the ranking gap is large. This matches how every other
// bonus in this function only rewards currently-true conditions, not
// pre-game expectations (RUWT/ADR-002: internal signal, not a
// pre-game-narrative score).
let upsetBonus = 0;
if (sp.includes('soccer') || sp.includes('league') || sp.includes('mls') ||
    sp.includes('liga') || sp.includes('ligue') || sp.includes('premier')) {
    const rankGap = (typeof eData.homeRank === 'number' && typeof eData.awayRank === 'number')
        ? Math.abs(eData.homeRank - eData.awayRank) : 0;
    // Threshold: verify against real FIFA rank spread once live data
    // exists -- 30+ is a reasonable starting guess (top-10 vs 40+) but
    // not verified against real rank distributions. CC: sanity-check
    // this threshold against a handful of real WC26 matchups once the
    // relay endpoint has real data, adjust if it fires too often/rarely.
    if (rankGap >= 30 && diff <= 1) {
        upsetBonus = Math.min(15, Math.floor(rankGap / 10)); // capped, scales with gap size
    }
}
```

Thread `homeRank`/`awayRank` into the `eData` object passed to
`dramaScoreLive` — find the real call sites (live path in the main
render loop, and `computeDramaRetroactive`'s historical-state mapping)
via probe, and fetch each team's rank via the new relay endpoint,
cached client-side (localStorage, matching the existing drama-history
caching pattern) since ranks don't change per-game.

Add `upsetBonus` into the final `raw` calculation (find the exact
current line via probe — this doc read it as
`const raw = base*52 + timeBonus + sitBonus;` on 2026-07-04, re-verify
before editing):
```javascript
const raw = base*52 + timeBonus + sitBonus + upsetBonus;
```



DO:
- Add the extra-time bonus tier (TASK 1), verified against a real extra-time game first
- Add interpolation to the soccer historical-state fetcher (TASK 2)
- Let the existing backfill discovery loop do its job (TASK 3) — do not build new backfill infrastructure
- 3 smoke assertions
- Bump SW_VERSION

DO NOT:
- Start TASK 4 without first confirming the relay's `/fifa-rankings/:team` endpoint is at least deployed (even if returning 503 pending a key) — the paired CC-CMD must exist first
- Invent a ranking data source other than the one specified — if footballdata.io turns out to be unworkable, stop and report rather than substituting a different, unverified provider
- Touch MLB/NHL/NBA/NFL/AFL/CFL/tennis branches of `dramaScoreLive` — soccer only
- Raise the backfill session cap without flagging the tradeoff explicitly
- Apply interpolation to `fetchMLBHistoricalStates` or any other sport's historical-state fetcher — scoped to soccer, where the keyEvents-only gap was specifically found

## DONE CONDITIONS
- [ ] Probe block re-run; a real extra-time WC26 game's `period` values confirmed before finalizing TASK 1's threshold
- [ ] Extra-time bonus added, using the verified (not assumed) period threshold
- [ ] Interpolation added, preserves all real event data points unchanged, only fills gaps between them
- [ ] Relay dependency (`/fifa-rankings/:team`) confirmed live before starting TASK 4 — if it 503s (key not yet provisioned), TASK 4's code can still be written and reviewed, but report clearly that live verification is blocked, don't fabricate a working test
- [ ] Upset bonus added, confirmed conditional (rank gap AND close-game check both required), not a flat pre-game bonus
- [ ] `node smoke.js index.html` exits 0 with all 5 new assertions green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-soccer-drama-scoring-fix-{date}.md`, explicitly recording the real extra-time period values found during probe, and explicitly stating whether the FIFA rankings relay endpoint had a real key configured at the time of this work or was still in graceful-failure mode

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation that the backfill discovery loop, run after this ships, actually produces a materially different (higher, where warranted) drama_peak for the Argentina/Cape Verde game or another genuinely tense WC26 match — confirms the fix works end-to-end, not just that the code is correct in isolation.
- [ ] Real observation that the upset bonus fires correctly for a genuine ranking-mismatch match once real FIFA rank data exists (blocked on Jeff provisioning the API key — see the relay CC-CMD)

## COMPLIANCE
- Rule 47/ADR-002/RUWT: this modifies an internal scoring computation only — verify the existing RUWT constraint (drama scores are internal signals feeding display logic, not raw displayed "excitement ratings") still holds; do not change what gets displayed to users, only how the internal drama_peak number is computed and backfilled. The upset bonus specifically must remain conditional on currently-true game state (close score), never a pre-game-expectation-only score.
- Rule 68: probe block first, especially the real extra-time game check — do not hardcode period thresholds from assumption
- Rule 87: self-completing on the CC-verifiable portion; end-to-end backfill observation and real upset-bonus firing are necessarily deferred — the former by the existing session-cap mechanism's timing, the latter by external API key provisioning

## CONFIDENCE SCORING TABLE
+20  Extra-time threshold verified against a real game before use, not assumed
+20  Interpolation logic correct — confirmed via code read that real event points are preserved unchanged, only gaps are filled
+20  Upset bonus correctly conditional (rank gap AND close-game both required), threading of rank data into eData confirmed via code read
+20  Smoke 5/5 green
+20  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-soccer-drama-scoring-fix.md. Find
a real extra-time WC26 game and confirm its period values BEFORE
writing TASK 1 — do not hardcode period>=3 on assumption alone. For
TASK 4, verify the FIFA rankings relay endpoint's current live status
first (paired CC-CMD, field-relay-nba repo) — if the API key isn't
provisioned yet, write and review the code but report clearly that live
verification is blocked, don't fabricate a working test. Implement
exactly as specified. Do not commit unless confidence ≥ 95. If score
< 95 report verbatim and stop — do not invent results.

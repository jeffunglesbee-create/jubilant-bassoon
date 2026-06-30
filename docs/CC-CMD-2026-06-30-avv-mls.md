# CC-CMD — AVV-MLS: Adapter Visible Value Proof for MLS

**Repo:** jubilant-bassoon ONLY (Playwright tests; all relay infra below is
already shipped and deployed — this doc adds no relay code)
**Date:** 2026-06-30
**Baseline:** jubilant-bassoon HEAD 9d23203b · field-relay-nba HEAD 810ccce
**Builds on:** CC-CMD-2026-06-29-avv-workflow-generalize.md (the MLB/AFL
describe-block pattern this doc follows), tournament multiplexer (shipped),
soccer-stats-dual-source (shipped, deployed), buildSoccerXGContext gate fix
(shipped, deployed — relay commit 810ccce)

git pull. Read CLAUDE.md. Run `git log --oneline -5` first.

Write findings to outbox/cc-avv-mls-2026-06-30.md.

---

## CRITICAL CONTEXT — READ BEFORE WRITING ANY TEST

**MLS is between seasons right now.** Paused May 24 for the World Cup,
resumes July 22. Today is June 30. There are ZERO live or recent MLS games
to test a running-app DOM check against — confirmed live via
`/journalism/context-probe`, which returned no MLS entry today.

This is the same situation AFL was in on 2026-06-29 (between Round 16 and
17) and the precedent set then applies directly: **tests that genuinely
require a live game skip gracefully rather than fail, with a clear log line
explaining why, and self-activate automatically once the season resumes.**
Do not weaken assertions to force a pass against fixture data not designed
for this, and do not skip a test that doesn't actually need a live game —
three of the five tests below test data/route layers that don't depend on
the season being active at all. Get this distinction right per test; it's
the difference between an honest proof and a padded one.

| Test | Needs live game today? | Why |
|---|---|---|
| AVV-MLS-001 | **Yes — graceful skip until Jul 22** | Tests DOM card rendering from `allData`, which only reflects today's live ESPN scoreboard |
| AVV-MLS-002 | No — runs today | Tests `postseason_games.round` via direct relay fetch against known future tournament dates (data already seeded) |
| AVV-MLS-003 | No — runs today | Tests `/soccer/xg` directly against a known historical event id |
| AVV-MLS-004 | Partial — see Task 1 below | Full pipeline needs a live game; underlying preconditions are independently checkable today |
| AVV-MLS-005 | No — runs today | Tests `/soccer/season-form` directly against a known club id |

---

## PRE-BUILD PROBES (Rule 68)

```bash
# 1. Confirm current spec file structure (MLB + AFL describe blocks, helpers)
grep -n "describe\|AVV-PW\|AVV-AFL\|awaitReady\|LIVE_URL" tests/adapter-visible-value.spec.js | head -20

# 2. Re-confirm MLS is still paused (re-verify, do not trust this doc's
#    June 30 finding if running this later — the whole graceful-skip
#    structure below depends on getting this right at execution time)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/journalism/context-probe" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print([r for r in d.get('results',[]) if r.get('league')=='MLS'])"

# 3. Re-confirm /soccer/xg works for the known historical event (AVV-MLS-003 target)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/soccer/xg?league=usa.1&event=761644" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('_hasXG:',d['_hasXG'],'_hasMatchStats:',d.get('_hasMatchStats'))"

# 4. Re-confirm /soccer/season-form works for the known club id (AVV-MLS-005 target)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/soccer/season-form?team_id=MLS-CLU-000008" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('_hasForm:',d['_hasForm'],'xG:',d.get('xG'))"

# 5. Confirm tournament dates still match what's seeded (AVV-MLS-002 target —
#    these were correct as of 2026-06-30, re-verify in case the weekly/daily
#    sync changed anything)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/d1/execute" \
  -H "X-FIELD-Relay: field-relay-cron-2026" -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" \
  -d '{"sql":"SELECT DISTINCT date, league, round FROM postseason_games WHERE sport='"'"'MLS'"'"' ORDER BY date LIMIT 5"}'
```

If probe 2 shows MLS games exist now (this doc is being run after July 22,
or earlier if a friendly/preseason game appears), AVV-MLS-001 and the full
pipeline portion of AVV-MLS-004 should be written as un-gated, normal
assertions instead of the graceful-skip pattern below — update accordingly,
do not blindly paste the skip-pattern code if the precondition for it no
longer holds.

---

## TASK 1 — Add MLS describe block to tests/adapter-visible-value.spec.js

Follow the exact structure of the existing AFL block. Insert after the AFL
describe block (after line ~300, before the final `});` of the file if one
exists — check actual file structure via probe 1, don't assume the AFL
block is last).

```javascript
// ── MLS — Tournament Multiplexer + Soccer Stats Dual-Source ───────────────
test.describe('MLS — Tournament + Stats', () => {

  // AVV-MLS-001: Live MLS game card appears in DOM on a day with MLS fixtures
  // MLS is paused May 24 – Jul 22 2026 for the World Cup. This test will find
  // no MLS games until the season resumes — that's expected, not a failure.
  // Skips gracefully exactly like AVV-AFL-001 does between rounds. Self-
  // activates automatically once ESPN's usa.1 scoreboard has live fixtures.
  test('AVV-MLS-001 — Live MLS game card appears in DOM', async ({ page }) => {
    await page.goto(LIVE_URL + '/?wpt=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await awaitReady(page, 5000);

    const mlsData = await page.evaluate(() => {
      if (typeof allData === 'undefined') return { error: 'allData undefined' };
      const mls = (allData.sports || []).find(s =>
        (s.sport || s.label || '').toLowerCase() === 'mls'
      );
      if (!mls || !mls.games || mls.games.length === 0) {
        return { found: false, sports: (allData.sports || []).map(s => s.sport || s.label) };
      }
      const g = mls.games[0];
      return {
        found: true,
        gameCount: mls.games.length,
        home: g.home?.name || g.homeTeam || null,
        away: g.away?.name || g.awayTeam || null,
        round: g.round || null,
      };
    });

    console.log('[AVV-MLS-001] MLS allData:', JSON.stringify(mlsData, null, 2));

    if (!mlsData.found || mlsData.gameCount === 0) {
      console.log('[AVV-MLS-001] No MLS games today — expected during World Cup pause (May 24 - Jul 22 2026). Skipping, not failing.');
      return;
    }

    // Confirm the card has a visible score line in the DOM, mirroring AVV-PW-001
    const cardCount = await page.locator('.game-card').count();
    expect(cardCount, 'at least one game card should be visible').toBeGreaterThan(0);
    console.log(`[AVV-MLS-001] ${mlsData.gameCount} MLS games found, ${cardCount} total cards in DOM`);
  });

  // AVV-MLS-002: game.round is non-empty on postseason/tournament rows
  // Tests the tournament multiplexer's seeded data directly via the relay's
  // context endpoint for a known future tournament date — does not depend on
  // today having live games, since this reads D1 directly, not allData.
  test('AVV-MLS-002 — tournament round data present in postseason_games', async ({ page }) => {
    // Use a known seeded date — re-verify via probe 5 this is still accurate
    // at execution time; the daily sync may shift things.
    const KNOWN_TOURNAMENT_DATE = '2026-07-09'; // TELUS Canadian Championship QF
    const resp = await page.evaluate(async (date) => {
      const r = await fetch(`https://field-relay-nba.jeffunglesbee.workers.dev/context/date/${date}`);
      if (!r.ok) return { error: `HTTP ${r.status}` };
      const d = await r.json();
      const mlsRows = (d.games?.postseason || []).filter(g => g.sport === 'MLS');
      return {
        count: mlsRows.length,
        sample: mlsRows[0] ? { round: mlsRows[0].round, home: mlsRows[0].home, away: mlsRows[0].away, league: mlsRows[0].league } : null,
      };
    }, KNOWN_TOURNAMENT_DATE);

    console.log('[AVV-MLS-002] Tournament data for', '2026-07-09:', JSON.stringify(resp, null, 2));

    expect(resp.count, `expected MLS tournament rows on ${'2026-07-09'}`).toBeGreaterThan(0);
    expect(resp.sample?.round, 'round field should be non-empty').toBeTruthy();
    console.log(`[AVV-MLS-002] DEFINITIVE: round="${resp.sample.round}" — tournament multiplexer confirmed live`);
  });

  // AVV-MLS-003: /soccer/xg for an MLS event returns _hasMatchStats: true
  // Tests the relay route directly against a known historical event — no
  // live game needed. Verifies dual-source CC-CMD Task 1 (relay commit
  // ea84747d) is deployed and working.
  test('AVV-MLS-003 — /soccer/xg returns match stats for MLS', async ({ page }) => {
    const resp = await page.evaluate(async () => {
      const r = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/soccer/xg?league=usa.1&event=761644');
      return r.ok ? await r.json() : { error: `HTTP ${r.status}` };
    });

    console.log('[AVV-MLS-003] /soccer/xg response:', JSON.stringify(resp, null, 2));

    expect(resp._hasMatchStats, '_hasMatchStats should be true for MLS (no xG, but real match stats)').toBe(true);
    expect(resp.home?.possessionPct, 'home possession % should be present').toBeDefined();
    expect(resp.away?.possessionPct, 'away possession % should be present').toBeDefined();
    console.log(`[AVV-MLS-003] DEFINITIVE: _hasXG=${resp._hasXG} _hasMatchStats=${resp._hasMatchStats} — MLS gets real context despite no xG`);
  });

  // AVV-MLS-004: buildSoccerXGContext produces non-empty string for an MLS game
  // Full pipeline (assembleContext -> buildSoccerXGContext -> relay -> format)
  // can only be proven end-to-end via a live game (context-probe needs a real
  // ESPN scoreboard entry for usa.1 today). During the World Cup pause, this
  // test instead confirms the PRECONDITIONS the fix depends on: the relay
  // route returns the right shape (already proven in AVV-MLS-003) AND the
  // consumer-side gate fix (relay commit 810ccce, 2026-06-30) is deployed.
  // The gate fix itself isn't independently HTTP-testable (buildSoccerXGContext
  // is server-internal, not a route) — this test documents that boundary
  // honestly rather than fabricating a way around it.
  test('AVV-MLS-004 — soccer context no longer gates on xG alone', async ({ page }) => {
    const probeData = await page.evaluate(async () => {
      const r = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/journalism/context-probe');
      return r.ok ? await r.json() : { error: `HTTP ${r.status}` };
    });

    const mlsResult = (probeData.results || []).find(r => r.league === 'MLS');

    if (!mlsResult) {
      console.log('[AVV-MLS-004] No live MLS game today (World Cup pause, May 24 - Jul 22 2026) — full pipeline cannot be exercised via context-probe.');
      console.log('[AVV-MLS-004] Preconditions independently confirmed: relay route returns _hasMatchStats (AVV-MLS-003), consumer gate fix deployed (relay commit 810cccea, verified via code presence below).');

      // Precondition check: confirm the gate-fix commit is actually the
      // currently-deployed HEAD, as a substitute signal (not a full proof).
      const headCheck = await page.evaluate(async () => {
        const r = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/health');
        return r.ok ? await r.text() : null;
      });
      console.log('[AVV-MLS-004] Relay health (informational, not a HEAD-sha proof):', headCheck);
      return; // Not a failure — same pattern as AVV-AFL-001/002
    }

    console.log('[AVV-MLS-004] Live MLS context found:', JSON.stringify(mlsResult, null, 2));
    expect(mlsResult.contextLength, 'context should be non-empty for MLS even without xG').toBeGreaterThan(0);
    expect(mlsResult.context, 'context should not be the empty placeholder').not.toBe('(empty)');
    console.log(`[AVV-MLS-004] DEFINITIVE: contextLength=${mlsResult.contextLength} — buildSoccerXGContext confirmed working end-to-end for MLS`);
  });

  // AVV-MLS-005: /soccer/season-form returns _hasForm:true for a known club id
  // Tests the relay route directly — no live game needed. Verifies dual-source
  // CC-CMD Task 2b (relay commit 4daaf058) is deployed and working.
  test('AVV-MLS-005 — /soccer/season-form returns real club data', async ({ page }) => {
    const resp = await page.evaluate(async () => {
      const r = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/soccer/season-form?team_id=MLS-CLU-000008');
      return r.ok ? await r.json() : { error: `HTTP ${r.status}` };
    });

    console.log('[AVV-MLS-005] /soccer/season-form response:', JSON.stringify(resp, null, 2));

    expect(resp._hasForm, '_hasForm should be true for Inter Miami CF').toBe(true);
    expect(typeof resp.xG, 'xG should be a numeric field').toBe('number');
    expect(resp.team_name, 'team_name should be present').toBe('Inter Miami CF');
    console.log(`[AVV-MLS-005] DEFINITIVE: ${resp.team_name} season xG=${resp.xG}, ${resp.matches_played}MP — season-form route confirmed working`);
  });

}); // end MLS describe
```

---

## VERIFY

```bash
npx eslint tests/adapter-visible-value.spec.js 2>&1 | tail -5
grep -n "describe\|AVV-PW\|AVV-AFL\|AVV-MLS" tests/adapter-visible-value.spec.js
```

---

## COMMIT + TRIGGER CI

```bash
git add tests/adapter-visible-value.spec.js
git commit -m "feat(avv): add MLS describe block — AVV-MLS-001 through 005"
git push origin main  # 2 attempts max
```

Trigger and fetch CI logs:
```python
requests.post(
    ".../workflows/adapter-visible-value.yml/dispatches",
    headers=H, json={"ref": "main"}
)
# poll + fetch logs — look for AVV-MLS lines in output
```

---

## DONE CONDITION

```
npx playwright test tests/adapter-visible-value.spec.js \
  --config=tests/adapter-proof.playwright.config.js \
  --reporter=list 2>&1
```

Must produce (MLS section; MLB/AFL sections unchanged from prior runs):
```
✓ AVV-MLS-001 — Live MLS game card appears in DOM (or graceful skip logged)
✓ AVV-MLS-002 — tournament round data present in postseason_games
✓ AVV-MLS-003 — /soccer/xg returns match stats for MLS
✓ AVV-MLS-004 — soccer context no longer gates on xG alone (or graceful skip + precondition log)
✓ AVV-MLS-005 — /soccer/season-form returns real club data
```

AVV-MLS-002, 003, 005 must show DEFINITIVE log lines with real data — these
have no excuse to skip, they don't depend on season timing. If any of these
three skip or fail, that's a real regression, not an expected gap — do not
treat it the same as AVV-MLS-001/004's graceful-skip path.

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

Repo: jubilant-bassoon only.

DO:
- Add the MLS describe block (Task 1)
- eslint clean
- Commit + trigger CI
- Confirm 002/003/005 produce real DEFINITIVE output (not skips)

DO NOT:
- Weaken AVV-MLS-002/003/005 to also skip gracefully — they don't need to,
  unlike 001/004
- Touch field-relay-nba — all relay work for this proof chain is already
  shipped and deployed
- Attempt to fabricate a live-game test for 001/004 by mocking data —
  the graceful-skip pattern is correct and honest; do not paper over it
- Modify the MLB or AFL describe blocks

---

## OUTBOX MANIFEST (last task)

Write `outbox/cc-avv-mls-2026-06-30.md` with: probe results (especially
probe 2's live MLS-pause confirmation), full CI log output for all 5 MLS
tests, and explicit confirmation that 002/003/005 produced real data (not
skips) while 001/004 logged the expected graceful-skip message.

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|---|---|---|
| MLS describe block added, all 5 tests present | 20 | grep confirms |
| AVV-MLS-002 produces real round data (not skip) | 20 | CI log shows DEFINITIVE line |
| AVV-MLS-003 produces real match-stats data (not skip) | 20 | CI log shows DEFINITIVE line |
| AVV-MLS-005 produces real season-form data (not skip) | 20 | CI log shows DEFINITIVE line |
| AVV-MLS-001/004 either pass or skip gracefully with correct log | 10 | No hard failures |
| eslint clean | 10 | No new violations |

Score < 95: do not push. If 002/003/005 skip instead of producing real
data, that's the signal something regressed since this doc was written —
stop and investigate via the probe block, do not paper over it by relaxing
the assertions.

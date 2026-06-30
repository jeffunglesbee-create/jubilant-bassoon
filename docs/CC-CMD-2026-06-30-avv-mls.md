# CC-CMD — AVV-MLS: Adapter Visible Value Proof

**Repo:** jubilant-bassoon only
**Date:** 2026-06-30 (replaces CC-CMD-2026-06-30-avv-mls.md and
CC-CMD-2026-06-30-avv-mls-proof-mode.md — both deleted, this is the single
source of truth)
**Depends on:** field-relay-nba commit 1a2d7696 (`/journalism/
context-probe?date=` param) — shipped, deployed, re-verified live
2026-06-30 immediately before this doc was written.

git pull. Read CLAUDE.md. Run `git log --oneline -5` first.

Write findings to outbox/cc-avv-mls-2026-06-30.md.

---

## Reference data (verified live, do not substitute)

Event 761644, ESPN usa.1, 2026-05-23: St. Louis CITY SC 3 – Austin FC 0,
Energizer Park, broadcast FOX/Apple TV, status STATUS_FULL_TIME.

`context-probe?date=2026-05-23` returns 3 MLS games:
ATX @ STL (contextLength 245), RSL @ MIN (273), NE @ CLT (281). All three
produce `[SOCCER XG CONTEXT]` with possession/shots/passes/cards — no xG
fields (MLS doesn't have them), proving `buildSoccerXGContext`'s gate
correctly falls back to match stats.

A previous game is sufficient for every test below. MLS's World Cup pause
(May 24–Jul 22) blocks nothing here — none of these five tests need a live
game today.

---

## Probes

```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/journalism/context-probe?date=2026-05-23" \
  | python3 -c "import json,sys; print(len([r for r in json.load(sys.stdin)['results'] if r['league']=='MLS']))"
# Expect 3. If 0, STOP — the relay dependency above isn't live, do not proceed.

grep -n "_MLB_PROOF_FIXTURES\|_proofAdapter === 'mlb-stats-api'" index.html
grep -n "/v2/games" index.html | head -20
grep -n "describe\|AVV-PW\|AVV-AFL\|awaitReady\|LIVE_URL" tests/adapter-visible-value.spec.js | head -20
```

Probe 2's second command finds what client-side code populates
`allData.sports` for soccer/MLS. MLB's proof mode overrides a sport-named
function (`fetchMLBSchedule`); MLS goes through the generic
`V2_LEAGUES`/`adaptESPNWCSoccer` pipeline, so the override target is
different — find the real call site, read 40 lines around it, confirm
the shape. Do not guess a function name.

**Stop condition:** if that call site is shared with other live soccer
leagues closely enough that overriding it for MLS risks breaking EPL/La
Liga test isolation, narrow the override to fire only when both
`_proofAdapter === 'mls-stats-api'` and the request targets `sport=mls`.
Document the shared path in the outbox either way.

---

## Task 1 — MLS fixture in Adapter Proof Mode

Add `_MLS_PROOF_FIXTURES` next to `_MLB_PROOF_FIXTURES`, same `ok`/`empty`/
`malformed` shape. `ok` fixture is the real game above:

```javascript
const _MLS_PROOF_FIXTURES = {
  ok: { events: [{
    id: '761644', date: '2026-05-23T18:45Z',
    status: { type: { name: 'STATUS_FULL_TIME', state: 'post', completed: true } },
    competitions: [{
      venue: { fullName: 'Energizer Park' },
      competitors: [
        { homeAway: 'home', team: { displayName: 'St. Louis CITY SC', abbreviation: 'STL' }, score: '3' },
        { homeAway: 'away', team: { displayName: 'Austin FC', abbreviation: 'ATX' }, score: '0' },
      ],
      broadcasts: [{ market: 'national', names: ['FOX', 'Apple TV'] }],
      status: { type: { completed: true } },
    }],
  }] },
  empty: { events: [] },
  malformed: { events: [{ id: 'bad', competitions: [{ competitors: null, status: null }] }] },
};
```

Verify field names against `adaptESPNWCSoccer` (field-relay-nba
src/index.js:1270) before finalizing — this is a starting shape built from
the raw ESPN response, not guaranteed pixel-perfect against the parser.
Wire the override at the real call site from probe 2 — adjust the pattern
below to match what's actually there:

```javascript
if (_proofMode && _proofAdapter === 'mls-stats-api') {
  // override target confirmed via probe 2
}
```

---

## Task 2 — test.describe('MLS — Tournament + Stats')

Five tests, one describe block, inserted after the AFL block.

```javascript
test.describe('MLS — Tournament + Stats', () => {

  test('AVV-MLS-001 — MLS game card renders from fixture data', async ({ page }) => {
    await page.goto(`${LIVE_URL}/?wpt=1&proofAdapter=mls-stats-api&fixture=ok`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await awaitReady(page, 5000);
    const d = await page.evaluate(() => {
      const mls = (allData?.sports || []).find(s => (s.sport || s.label || '').toLowerCase() === 'mls');
      const g = mls?.games?.[0];
      return g ? { home: g.home?.name, away: g.away?.name, homeScore: g.home?.score, awayScore: g.away?.score } : null;
    });
    console.log('[AVV-MLS-001]', JSON.stringify(d));
    expect(d, 'fixture game should appear in allData').toBeTruthy();
    expect(d.home).toBe('St. Louis CITY SC');
    expect(d.away).toBe('Austin FC');
    expect(d.homeScore).toBe(3);
    expect(d.awayScore).toBe(0);
    expect(await page.locator('.game-card').count()).toBeGreaterThan(0);
  });

  test('AVV-MLS-002 — tournament round data present in postseason_games', async ({ page }) => {
    const r = await page.evaluate(async () => {
      const res = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/context/date/2026-07-09');
      const d = await res.json();
      return (d.games?.postseason || []).filter(g => g.sport === 'MLS');
    });
    console.log('[AVV-MLS-002]', JSON.stringify(r));
    expect(r.length, 'expected MLS tournament rows on 2026-07-09').toBeGreaterThan(0);
    expect(r[0].round, 'round should be non-empty').toBeTruthy();
  });

  test('AVV-MLS-003 — /soccer/xg returns match stats for MLS', async ({ page }) => {
    const d = await page.evaluate(async () => {
      const res = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/soccer/xg?league=usa.1&event=761644');
      return res.json();
    });
    console.log('[AVV-MLS-003]', JSON.stringify(d));
    expect(d._hasMatchStats).toBe(true);
    expect(d.home?.possessionPct).toBeDefined();
    expect(d.away?.possessionPct).toBeDefined();
  });

  test('AVV-MLS-004 — soccer context no longer gates on xG alone', async ({ page }) => {
    const results = await page.evaluate(async () => {
      const res = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/journalism/context-probe?date=2026-05-23');
      const d = await res.json();
      return (d.results || []).filter(r => r.league === 'MLS');
    });
    console.log('[AVV-MLS-004]', JSON.stringify(results));
    expect(results.length, 'expected MLS games in context-probe').toBeGreaterThan(0);
    const stl = results.find(r => r.game === 'ATX @ STL');
    expect(stl, 'STL/ATX game should be present').toBeTruthy();
    expect(stl.contextLength).toBeGreaterThan(0);
    expect(stl.context).toContain('[SOCCER XG CONTEXT]');
    expect(stl.context).toContain('Possession:');
  });

  test('AVV-MLS-005 — /soccer/season-form returns real club data', async ({ page }) => {
    const d = await page.evaluate(async () => {
      const res = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/soccer/season-form?team_id=MLS-CLU-000008');
      return res.json();
    });
    console.log('[AVV-MLS-005]', JSON.stringify(d));
    expect(d._hasForm).toBe(true);
    expect(typeof d.xG).toBe('number');
    expect(d.team_name).toBe('Inter Miami CF');
  });

});
```

No test in this block has a skip branch. All five assert real data.

---

## Verify

```bash
npx eslint tests/adapter-visible-value.spec.js index.html 2>&1 | tail -10
npx playwright test tests/adapter-visible-value.spec.js \
  --config=tests/adapter-proof.playwright.config.js \
  --reporter=list --grep "AVV-MLS" 2>&1 | tee /tmp/avv-mls-results.txt
cat /tmp/avv-mls-results.txt
```

Report the complete file verbatim in the outbox. A failure gets reported
and investigated — never weaken an assertion to force a pass.

---

## Commit + trigger CI

```bash
git rm docs/CC-CMD-2026-06-30-avv-mls.md docs/CC-CMD-2026-06-30-avv-mls-proof-mode.md
git add index.html tests/adapter-visible-value.spec.js
git commit -m "feat(avv): MLS describe block — 5 tests, real data, no skip logic"
git push origin main
```

Trigger CI: `POST .../workflows/adapter-visible-value.yml/dispatches {"ref":"main"}`

---

## Scope

DO: Task 1, Task 2, verify, commit, CI trigger. Single commit.

DO NOT: touch MLB/AFL blocks. Invent the override function name if probe 2
doesn't clearly identify it — stop and document instead. Hardcode exact
`contextLength` values in assertions — `toBeGreaterThan(0)` plus content
checks are stable; exact numbers could shift slightly without being wrong.
Touch field-relay-nba.

---

## Outbox manifest

`outbox/cc-avv-mls-2026-06-30.md`: probe 2's real override target, full
verbatim Playwright output, confirmation both superseded docs were
removed.

---

## Confidence scoring

| Factor | Points |
|---|---|
| Real override target confirmed via probe, not guessed | 25 |
| All 5 tests pass with real data, zero skips | 50 |
| MLB/AFL blocks unchanged | 10 |
| eslint clean | 15 |

Score < 95: do not push.

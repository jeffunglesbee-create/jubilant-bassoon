# CC-CMD — MLS Adapter Proof Mode Fixture + AVV-MLS-001/004 Real Assertions

**Repo:** jubilant-bassoon ONLY
**Date:** 2026-06-30
**Baseline:** jubilant-bassoon HEAD (re-confirm via `git log -1` — this doc was
written after CC-CMD-2026-06-30-avv-mls.md shipped, commit ae588c2a)
**Amends:** docs/CC-CMD-2026-06-30-avv-mls.md (AVV-MLS-001 and AVV-MLS-004
specifically — 002/003/005 are unchanged and already correct)
**Depends on:** field-relay-nba commit 1a2d7696 (the `/journalism/
context-probe?date=` parameter, already shipped and deployed)

git pull. Read CLAUDE.md. Run `git log --oneline -5` first.

Write findings to outbox/cc-avv-mls-proof-mode-2026-06-30.md.

---

## WHY THIS CC-CMD EXISTS

The original AVV-MLS doc wrote AVV-MLS-001 and AVV-MLS-004 as graceful-skip
tests, reasoning that MLS's World Cup pause (May 24–Jul 22 2026) made live
verification impossible until the season resumes. That reasoning was wrong
for both tests — it's possible to verify both using a previous game, the
same way AVV-AFL-001/002 used past-round data via relay probe during AFL's
own between-rounds gap. This doc replaces the skip-logic with real
assertions, using a confirmed real game: **event 761644, St. Louis CITY SC
3–0 Austin FC, May 23 2026, Energizer Park, broadcast FOX/Apple TV** —
live-verified via ESPN's scoreboard API immediately before this doc was
written, not fabricated.

This also corrects a process error from the prior session: the relay-side
fix that unblocked AVV-MLS-004 (a `?date=` parameter on `/journalism/
context-probe`) was executed directly via chat tooling instead of being
routed through a CC-CMD, violating the standing FIELD workflow-routing rule.
That relay change is already shipped and deployed — field-relay-nba commit
`1a2d7696` — and is not re-done here. This doc covers only the remaining
client-side work (jubilant-bassoon), which is properly routed through CC
from this point forward.

---

## PRE-BUILD PROBES (Rule 68 — run before writing any code)

```bash
# 1. Re-confirm the relay's context-probe date param is live (dependency check —
#    if this fails, STOP, do not proceed, the AVV-MLS-004 rewrite below depends on it)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/journalism/context-probe?date=2026-05-23" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); mls=[r for r in d['results'] if r['league']=='MLS']; print(len(mls),'MLS results found')"
# Expected: 3 (or more — the relay's LEAGUES loop caps at 3 events per league,
# more may exist on this date; 3 is the confirmed minimum from prior verification)

# 2. Find the existing MLB proof-mode fixture block (the pattern to mirror exactly)
grep -n "_MLB_PROOF_FIXTURES\|_proofAdapter === 'mlb-stats-api'" index.html

# 3. CRITICAL — find what actually populates allData.sports for MLS in production.
#    MLB's proof mode overrides a function named fetchMLBSchedule. MLS does NOT
#    have a same-named sport-specific fetch function — it goes through the
#    generic V2_LEAGUES + adaptESPNWCSoccer pipeline (relay-side) reached via a
#    client-side call to /v2/games?sport=mls&date=. Find that client-side call
#    site — search for where the client requests /v2/games for soccer sports
#    and assigns the result into allData.sports.
grep -n "/v2/games" index.html | head -20

# 4. Once the call site from probe 3 is found, read 40 lines around it to
#    understand exactly what needs to be intercepted/overridden in proof mode —
#    do not assume it matches fetchMLBSchedule's shape, confirm directly.

# 5. Confirm AVV-MLS-001/004's current (skip-logic) text in the test file,
#    to know exactly what's being replaced
grep -n "AVV-MLS-001\|AVV-MLS-004" -A 5 tests/adapter-visible-value.spec.js | head -40
```

STOP CONDITION: if probe 3/4 finds that soccer sports (including MLS) are
fetched through a generic, deeply shared code path where intercepting it
for MLS-only proof-mode would risk affecting EPL/La Liga/other live soccer
testing, do not proceed with a blanket override. Instead scope the
interception narrowly (e.g., only when `_proofAdapter === 'mls-stats-api'`
AND the request is specifically for `sport=mls`), and document the shared
code path in the outbox so it's understood, not papered over.

---

## TASK 1 — Add MLS fixture to Adapter Proof Mode

File: `index.html`, the Adapter Proof Mode section (probe 2's location).

Add a new fixture object, `_MLS_PROOF_FIXTURES`, mirroring
`_MLB_PROOF_FIXTURES`'s exact structure (`ok` / `empty` / `malformed` keys).
Use this confirmed-real game as the `ok` fixture (live-verified via ESPN
2026-06-30, do not substitute placeholder data):

```javascript
const _MLS_PROOF_FIXTURES = {
  ok: {
    events: [{
      id: '761644',
      date: '2026-05-23T18:45Z',
      status: { type: { id: '28', name: 'STATUS_FULL_TIME', state: 'post', completed: true, description: 'Full Time', detail: 'FT', shortDetail: 'FT' } },
      competitions: [{
        date: '2026-05-23T18:45Z',
        venue: { fullName: 'Energizer Park' },
        competitors: [
          { homeAway: 'home', team: { displayName: 'St. Louis CITY SC', abbreviation: 'STL' }, score: '3' },
          { homeAway: 'away', team: { displayName: 'Austin FC', abbreviation: 'ATX' }, score: '0' },
        ],
        broadcasts: [{ market: 'national', names: ['FOX', 'Apple TV'] }],
        status: { type: { id: '28', name: 'STATUS_FULL_TIME', state: 'post', completed: true } },
        notes: [],
      }],
    }],
  },
  empty: { events: [] },
  malformed: { events: [{ id: 'bad', competitions: [{ competitors: null, status: null }] }] },
};
```

Adjust field names to exactly match what `adaptESPNWCSoccer` (the function
that normally parses this shape, confirmed earlier this session at
index.js:1270 in field-relay-nba — read it again if needed to confirm field
names) expects, rather than assuming the structure above is pixel-perfect —
this is a starting point built from the raw ESPN response, verify it
parses correctly in Task 3.

Wire the override using whatever function/call-site probe 3/4 identified —
**do not invent a function name**; use the real one found. Pattern (adjust
to match actual findings):

```javascript
if (_proofMode && _proofAdapter === 'mls-stats-api') {
  // override the actual fetch path found in probe 3/4
}
```

---

## TASK 2 — Rewrite AVV-MLS-001 (no more graceful skip)

In `tests/adapter-visible-value.spec.js`, replace the current AVV-MLS-001
test body. Use the proof-mode URL pattern matching AVV-PW-001's structure:

```javascript
test('AVV-MLS-001 — MLS game card renders from fixture data', async ({ page }) => {
  await page.goto(`${LIVE_URL}/?wpt=1&proofAdapter=mls-stats-api&fixture=ok`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page, 5000);

  const mlsData = await page.evaluate(() => {
    if (typeof allData === 'undefined') return { error: 'allData undefined' };
    const mls = (allData.sports || []).find(s => (s.sport || s.label || '').toLowerCase() === 'mls');
    if (!mls || !mls.games?.length) return { found: false, sports: (allData.sports || []).map(s => s.sport || s.label) };
    const g = mls.games[0];
    return { found: true, home: g.home?.name, away: g.away?.name, homeScore: g.home?.score, awayScore: g.away?.score, venue: g.venue };
  });

  console.log('[AVV-MLS-001] Fixture data:', JSON.stringify(mlsData, null, 2));

  expect(mlsData.found, 'MLS fixture game should appear in allData').toBe(true);
  expect(mlsData.home).toBe('St. Louis CITY SC');
  expect(mlsData.away).toBe('Austin FC');
  expect(mlsData.homeScore).toBe(3);
  expect(mlsData.awayScore).toBe(0);

  const cardCount = await page.locator('.game-card').count();
  expect(cardCount, 'at least one game card should be visible').toBeGreaterThan(0);
  console.log(`[AVV-MLS-001] DEFINITIVE: STL 3-0 ATX rendered, ${cardCount} cards in DOM`);
});
```

If Task 1's field-name adjustments mean `g.home?.score` etc. don't match —
adjust the assertions to match what the adapter ACTUALLY produces, confirmed
via the `console.log` output, not what this doc guessed.

---

## TASK 3 — Rewrite AVV-MLS-004 (no more graceful skip)

Replace the current AVV-MLS-004 test body. This uses the relay's now-live
`?date=` parameter (field-relay-nba commit 1a2d7696) against the same real
May 23 game — no proof-mode/fixture needed, this hits the real relay with
a real past date:

```javascript
test('AVV-MLS-004 — soccer context no longer gates on xG alone', async ({ page }) => {
  await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const probeData = await page.evaluate(async () => {
    const r = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/journalism/context-probe?date=2026-05-23');
    return r.ok ? await r.json() : { error: `HTTP ${r.status}` };
  });

  const mlsResults = (probeData.results || []).filter(r => r.league === 'MLS');
  console.log('[AVV-MLS-004] MLS context results:', JSON.stringify(mlsResults, null, 2));

  expect(mlsResults.length, 'expected MLS games in context-probe for 2026-05-23').toBeGreaterThan(0);

  const stlGame = mlsResults.find(r => r.game === 'ATX @ STL');
  expect(stlGame, 'STL/ATX game should be present').toBeTruthy();
  expect(stlGame.contextLength, 'context should be non-empty despite no xG').toBeGreaterThan(0);
  expect(stlGame.context).toContain('[SOCCER XG CONTEXT]');
  expect(stlGame.context).toContain('Possession:');
  expect(stlGame.context).not.toBe('(empty)');

  console.log(`[AVV-MLS-004] DEFINITIVE: contextLength=${stlGame.contextLength} — buildSoccerXGContext confirmed producing real output for MLS via match stats, not xG`);
});
```

This is a direct, deterministic assertion — re-verified live by chat
immediately before this doc was written (the exact `contextLength` values
seen were 245/273/281 for the three May 23 games; do not hardcode the exact
number in the assertion since relay formatting could shift slightly, but
`toBeGreaterThan(0)` plus the content checks above are sufficient and stable).

---

## TASK 4 — Update CC-CMD-2026-06-30-avv-mls.md's CRITICAL CONTEXT table

Amend the table in that doc — AVV-MLS-001 and AVV-MLS-004 both move from
"Yes — graceful skip" to "No — runs today via fixture/past-date param,
see CC-CMD-2026-06-30-avv-mls-proof-mode.md". Keep the rest of that doc
unchanged (002/003/005 sections are still accurate as written).

---

## VERIFY

```bash
npx eslint tests/adapter-visible-value.spec.js index.html 2>&1 | tail -10
npx playwright test tests/adapter-visible-value.spec.js \
  --config=tests/adapter-proof.playwright.config.js \
  --reporter=list --grep "AVV-MLS" 2>&1 | tee /tmp/avv-mls-results.txt
cat /tmp/avv-mls-results.txt
```

Report the complete contents of `/tmp/avv-mls-results.txt` verbatim in the
outbox — every line, including all `console.log` output. If any assertion
fails, report the full failure message before attempting any fix; do not
weaken an assertion to make it pass.

---

## COMMIT + TRIGGER CI

```bash
git add index.html tests/adapter-visible-value.spec.js docs/CC-CMD-2026-06-30-avv-mls.md
git commit -m "feat(avv): MLS proof-mode fixture + real AVV-MLS-001/004 assertions"
git push origin main
```

Trigger CI and fetch logs (same pattern as prior AVV CC-CMDs):
```python
requests.post(".../workflows/adapter-visible-value.yml/dispatches", headers=H, json={"ref":"main"})
```

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

DO:
- Add `_MLS_PROOF_FIXTURES` to Adapter Proof Mode (Task 1)
- Wire the override using the REAL function/call-site found in probes 3-4
- Rewrite AVV-MLS-001 and AVV-MLS-004 only (Tasks 2-3)
- Amend CC-CMD-2026-06-30-avv-mls.md's context table (Task 4)
- Single commit, all tasks together

DO NOT:
- Modify the MLB or AFL proof-mode fixtures or describe blocks
- Modify AVV-MLS-002/003/005 — already correct, no change needed
- Invent field names or function names not confirmed via probe — if probe
  3/4 doesn't clearly identify the override target, STOP and document the
  ambiguity in the outbox rather than guessing
- Hardcode exact contextLength numbers in assertions (use `toBeGreaterThan(0)`
  + content checks — formatting could shift slightly without being wrong)
- Touch field-relay-nba — the dependency (context-probe `?date=`) is already
  shipped and deployed

---

## OUTBOX MANIFEST (last task)

Write `outbox/cc-avv-mls-proof-mode-2026-06-30.md` with: probe 1's
confirmation the relay dependency is live, probe 3/4's findings on the real
override target (function/call-site name), full verbatim Playwright output
for AVV-MLS-001 and AVV-MLS-004, and confirmation Task 4's doc amendment
landed.

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|---|---|---|
| Real override target confirmed via probe, not guessed | 25 | outbox documents the actual function/call-site found |
| AVV-MLS-001 passes with real STL 3-0 ATX assertions | 25 | CI log shows DEFINITIVE line, no skip |
| AVV-MLS-004 passes with real contextLength/content assertions | 25 | CI log shows DEFINITIVE line, no skip |
| MLB/AFL describe blocks unchanged | 10 | diff confirms |
| eslint clean | 15 | no new violations |

Score < 95: do not push. Neither AVV-MLS-001 nor AVV-MLS-004 has a skip
excuse left after this doc — a skip in either means something in this
doc's plan was wrong, not that the test should fall back to graceful
degradation.

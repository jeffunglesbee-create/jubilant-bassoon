# CC-CMD — MLB Stats API Client Audit + Live Verification

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Source audit of all 15 MLB Stats API endpoints + live browser test
**Why:** Relay proved the API works. Client must prove it consumes the data.
         Two questions: (1) what does the client use today, (2) do the other
         12 endpoints have any client code at all.
**Target time:** 40 min

---

## ENVIRONMENT CONSTRAINTS

- Client repo only. No relay edits.
- *.workers.dev blocked from CC — browser tests run via GitHub Actions CI
- eslint baseline before any code edit
- Relay probe data available at:
  `field-relay-nba/outbox/mlb-probe-raw-2026-06-29.json` (schedule)
  `field-relay-nba/outbox/mlb-full-probe-2026-06-29.json` (12 endpoints)
  `field-relay-nba/outbox/mlb-complete-probe-2026-06-29.json` (3 final-game endpoints)

---

## DONE CONDITION

File `outbox/mlb-client-audit-2026-06-29.md` committed containing:
- All 15 endpoints categorized as CONSUMED / SPECCED-ONLY / NOT REFERENCED
- For each CONSUMED endpoint: function name, line number, what it does with the data
- For each SPECCED-ONLY: Drive doc reference + "no client code found"
- Playwright test results from CI confirming live MLB data renders in browser
- Confidence ≥ 95

---

## PHASE A — Source audit: every MLB Stats API reference in index.html

```bash
# A1: Every URL or domain reference
grep -n "statsapi.mlb.com\|mlb.*api.*v1\|MLB_STATS_BASE\|mlb-stats" index.html | head -40

# A2: Every function with MLB in the name
grep -n "function.*[Mm][Ll][Bb]\|MLB.*function\|async.*MLB\|mlb.*async" index.html | head -30

# A3: Every endpoint path
grep -n "game.*feed.*live\|boxscore\|linescore\|winProbability\|playByPlay\|gamePace\|standings.*leagueId\|transactions\|jobType=UMP\|stats.*leaders\|schedule.*sportId=1" index.html | head -40

# A4: Every reference to GUMBO fields
grep -n "gameData\.\|liveData\.\|gameDurationMinutes\|probablePitcher\|currentPlay\.\|scoringPlays\|noHitter\|perfectGame\|absChallenges" index.html | head -30

# A5: Every reference to standings-specific fields
grep -n "magicNumber\|clinched\|wildCardGamesBack\|divisionRank\|leagueRank\|streak\." index.html | head -20

# A6: Every reference to pace/tempo
grep -n "gamePace\|pitchTempo\|gameDuration\|pace.*badge\|PACE\|QUICK.*WORKER" index.html | head -20

# A7: Every reference to transactions/IL
grep -n "transaction\|IL.*move\|injured.*list\|came.*off.*IL" index.html | head -10

# A8: Savant references (separate from statsapi)
grep -n "baseballsavant\|statcast\|savant\|exit.*velocity\|sprint.*speed\|barrel.*rate" index.html | head -20
```

**Document every finding. Do not skip any grep results.**

---

## PHASE B — Categorize each of the 15 endpoints

Using Phase A grep results, fill in this table. Be honest — if no code found, say so.

```
ENDPOINT                    STATUS          FUNCTION(S)          LINE(S)
─────────────────────────────────────────────────────────────────────────
1.  schedule                ?               ?                    ?
2.  game_feed_live (GUMBO)  ?               ?                    ?
3.  game_boxscore           ?               ?                    ?
4.  game_linescore          ?               ?                    ?
5.  game_playByPlay         ?               ?                    ?
6.  game_winProbability     ?               ?                    ?
7.  game_content            ?               ?                    ?
8.  game_decisions          ?               ?                    ?
9.  game_contextMetrics     ?               ?                    ?
10. standings               ?               ?                    ?
11. transactions            ?               ?                    ?
12. umpires                 ?               ?                    ?
13. gamePace                ?               ?                    ?
14. statLeaders             ?               ?                    ?
15. seasons                 ?               ?                    ?
```

Status values:
- **CONSUMED** — client code calls this endpoint and processes the response
- **SPECCED-ONLY** — Drive docs describe it, code may reference the concept, but no fetch call exists
- **NOT REFERENCED** — no trace in index.html at all

For each CONSUMED endpoint, read the consuming function (20-30 lines) and document:
- What URL it calls
- What fields it extracts
- Where the extracted data appears in the UI (card, bottom sheet, health panel, etc.)

---

## PHASE C — Live browser test via Playwright + CI

Write a Playwright test that loads the live app (NOT localhost) and verifies
real MLB data appears. This tests that the browser can reach statsapi.mlb.com
and that the normalizer produces visible output from real data (not fixtures).

Add to `tests/adapter-visible-value.spec.js`:

```javascript
// ── AVV-PW-006: Live MLB data renders (no fixture injection) ─────────────
test('AVV-PW-006 — live MLB data renders from statsapi.mlb.com', async ({ page }) => {
  // Load WITHOUT ?proofAdapter — this is the real app, real data
  await page.goto(LIVE_URL + '/?wpt=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page, 5000);  // extra buffer for real API calls

  // Check if any MLB game cards exist
  // normalizeMLBGame sets source: 'mlb-stats' on each game object
  // The card template should reflect this in the data or the UI

  // Method 1: Check __FIELD_PROOF__ is NOT set (no fixture injection)
  const proof = await page.evaluate(() => window.__FIELD_PROOF__);
  expect(proof, '__FIELD_PROOF__ should be null when not in proof mode').toBeFalsy();

  // Method 2: Check for Baseball cards in allData
  const mlbData = await page.evaluate(() => {
    if (typeof allData === 'undefined') return null;
    const baseball = (allData.sports || []).find(s => s.sport === 'Baseball');
    if (!baseball) return { found: false, sports: allData.sports?.map(s => s.sport) };
    return {
      found: true,
      gameCount: (baseball.games || []).length,
      sources: [...new Set((baseball.games || []).map(g => g.source))],
      firstGame: baseball.games?.[0] ? {
        homeTeam: baseball.games[0].homeTeam,
        awayTeam: baseball.games[0].awayTeam,
        source: baseball.games[0].source,
        status: baseball.games[0].status,
        hasAdapterProof: !!baseball.games[0]._adapterProof,
      } : null,
    };
  });

  console.log('[AVV-PW-006] MLB data from live app:', JSON.stringify(mlbData, null, 2));

  // We expect MLB games to exist (13 games today)
  expect(mlbData, 'allData should be accessible').toBeTruthy();
  expect(mlbData.found, `No Baseball section in allData. Sports present: ${mlbData.sports}`).toBe(true);
  expect(mlbData.gameCount, 'Expected MLB games today').toBeGreaterThan(0);

  // Verify source — should be 'mlb-stats' not 'espn'
  console.log('[AVV-PW-006] MLB sources:', mlbData.sources);
  console.log('[AVV-PW-006] First game:', JSON.stringify(mlbData.firstGame));
});

// ── AVV-PW-007: MLB card renders visibly (not just in memory) ────────────
test('AVV-PW-007 — MLB game card visible in DOM', async ({ page }) => {
  await page.goto(LIVE_URL + '/?wpt=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page, 5000);

  // Find game cards — look for Baseball cards specifically
  const cards = page.locator('.game-card');
  const cardCount = await cards.count();
  console.log('[AVV-PW-007] Total game cards:', cardCount);

  // Find MLB-specific content: broadcast chips with MLB networks
  const mlbChips = page.locator('.stream-chip');
  const chipCount = await mlbChips.count();
  const chipTexts = await mlbChips.allTextContents();
  const mlbRelated = chipTexts.filter(t =>
    /MASN|YES|NESN|SNY|FOX|ESPN|MLB|Apple|Peacock|TBS|NBC/i.test(t));
  console.log('[AVV-PW-007] MLB-related broadcast chips:', mlbRelated);

  // At least some cards should be visible
  expect(cardCount, 'No game cards rendered at all').toBeGreaterThan(0);
});
```

---

## PHASE D — Run via CI and fetch results

Same pattern as the AVV CI fetch CC-CMD (confidence gate approach):

```bash
# Commit the new tests
git add tests/adapter-visible-value.spec.js
git commit -m "test(avv): AVV-PW-006+007 — live MLB data + card visibility [skip ci]"
git push origin main
```

Then trigger CI and fetch logs:

```python
import requests, time, zipfile, io, json

REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

# Trigger adapter-visible-value.yml
requests.post(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/dispatches",
    headers=H, json={"ref": "main"}
)
print("Triggered. Waiting...")
time.sleep(15)

# Poll for completion
for i in range(45):
    runs = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/runs",
        headers=H, params={"per_page": 1}
    ).json()
    run = runs["workflow_runs"][0]
    status = run["status"]
    concl = run.get("conclusion", "—")
    print(f"  [{i*20}s] {status}/{concl}")
    if status == "completed":
        break
    time.sleep(20)

run_id = run["id"]
run_url = run["html_url"]

# Fetch logs
log_resp = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}/logs",
    headers=H, allow_redirects=True
)
with zipfile.ZipFile(io.BytesIO(log_resp.content)) as zf:
    for name in zf.namelist():
        content = zf.read(name).decode("utf-8", errors="replace")
        if "AVV-PW" in content:
            for line in content.split("\n"):
                if any(x in line for x in ["AVV-PW", "✓", "✗", "passed", "failed",
                                            "console.log", "[AVV-PW"]):
                    print(line)

print(f"\nRun: {run_url}")
print(f"Conclusion: {concl}")
```

---

## PHASE E — Write results and commit

Combine Phase A (source audit), Phase B (categorization), Phase C/D (live test results):

```markdown
# MLB Client Audit — 2026-06-29

## Endpoint Categorization (15 endpoints)

| # | Endpoint | Status | Function | Line | Notes |
|---|----------|--------|----------|------|-------|
| 1 | schedule | ? | ? | ? | ? |
| ... | ... | ... | ... | ... | ... |
| 15 | seasons | ? | ? | ? | ? |

CONSUMED: X/15
SPECCED-ONLY: Y/15
NOT REFERENCED: Z/15

## Live Browser Test Results

AVV-PW-006: ? — MLB sources: [?]
AVV-PW-007: ? — Card count: ?, MLB chips: [?]

## Key Findings

...
```

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| Source audit ran all 8 grep patterns (A1–A8) | 15 | All produced output or confirmed empty |
| All 15 endpoints categorized with evidence | 25 | No "?" in table — every cell filled |
| CONSUMED endpoints have function name + line | 15 | At least 1 endpoint confirmed CONSUMED |
| AVV-PW-006 ran against live app (CI, not localhost) | 20 | CI conclusion = success |
| AVV-PW-006 console.log shows source = 'mlb-stats' | 15 | Not 'espn' — proves MLB Stats API path active |
| Results doc committed | 10 | outbox/mlb-client-audit exists |

Score < 95: do not commit results. Investigate.

**Critical factor:** If AVV-PW-006 shows `source: 'espn'` instead of `source: 'mlb-stats'`,
that is a real finding — the ESPN fallback is firing in production. Report it truthfully.
Do not inflate the score. That answer is worth more than a passing grade.

---

## WHAT SUCCESS LOOKS LIKE

```
Endpoint Categorization:
  CONSUMED: 2/15 (schedule, standings)
  SPECCED-ONLY: 10/15 (GUMBO, boxscore, transactions, etc.)
  NOT REFERENCED: 3/15

AVV-PW-006: ✓
  MLB sources: ['mlb-stats']
  First game: { homeTeam: 'BAL', awayTeam: 'CWS', source: 'mlb-stats' }
  13 games from statsapi.mlb.com

AVV-PW-007: ✓
  Total cards: 47
  MLB broadcast chips: ['MASN', 'CHSN', 'FOX', 'ESPN']
```

If the answer is "1/15 CONSUMED" — that's the answer. The other 14 are the backlog.
If the source is 'espn' — that's the answer. The adapter exists but isn't active.

---

**Session: 2026-06-29 · CLIENT ONLY · 40 min target · Confidence gate: 95**

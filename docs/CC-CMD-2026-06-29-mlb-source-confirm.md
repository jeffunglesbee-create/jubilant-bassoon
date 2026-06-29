# CC-CMD — MLB Source Field Confirmation

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Fix AVV-PW-006 to read correct property name, get definitive source proof
**Why:** C2 audit scored 85/100 because g.source was undefined. The allData game
         object schema differs from normalizeMLBGame output. Need to find the actual
         property name and confirm mlb-stats vs espn.
**Target time:** 15 min

---

## THE PROBLEM

AVV-PW-006 reads `g.source` from `allData.sports['Baseball (MLB)'].games[0]`.
That returned `undefined`. But 13 games matched the MLB Stats API probe count,
and MASN/CHSN broadcast chips appeared (ESPN doesn't provide RSN detail).
The source IS mlb-stats — the test just reads the wrong property.

---

## DONE CONDITION

AVV-PW-006 reports the actual source property value from the live app.
Confidence ≥ 95 requires one of:
- `source: 'mlb-stats'` confirmed, OR
- A different property name containing 'mlb-stats' confirmed, OR
- Definitive evidence the path is active (with the correct property name documented)

---

## STEP 1: Probe the allData game object schema

Replace AVV-PW-006 in `tests/adapter-visible-value.spec.js` with a version
that dumps the full game object keys and any source-like fields:

```javascript
test('AVV-PW-006 — live MLB data renders from statsapi.mlb.com', async ({ page }) => {
  await page.goto(LIVE_URL + '/?wpt=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await awaitReady(page, 5000);

  const mlbData = await page.evaluate(() => {
    if (typeof allData === 'undefined') return { error: 'allData undefined' };
    const baseball = (allData.sports || []).find(s =>
      s.sport === 'Baseball' || s.sport === 'Baseball (MLB)' || s.label === 'MLB');
    if (!baseball) return {
      found: false,
      sportNames: allData.sports?.map(s => s.sport || s.label || s.name)
    };
    const g = baseball.games?.[0];
    if (!g) return { found: true, gameCount: 0 };
    return {
      found: true,
      gameCount: (baseball.games || []).length,
      sportKey: baseball.sport || baseball.label || baseball.name,
      // Dump ALL keys on the game object so we find the source field
      game0_allKeys: Object.keys(g).sort(),
      // Check every plausible source property name
      source: g.source,
      _source: g._source,
      dataSource: g.dataSource,
      sourceId: g.sourceId,
      provider: g.provider,
      adapter: g.adapter,
      origin: g.origin,
      // Check _adapterProof
      _adapterProof: g._adapterProof || null,
      // Also grab identifying fields to cross-reference
      id: g.id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      status: g.status,
      // Broadcast chips — RSN detail is the indirect signal
      broadcasts: g.broadcasts || g.nationalBundle || g.localRsn || null,
      nationalBundle: g.nationalBundle,
      localRsn: g.localRsn,
      mlbnShowcase: g.mlbnShowcase,
      espnGOTD: g.espnGOTD,
    };
  });

  console.log('[AVV-PW-006] allData MLB game object:', JSON.stringify(mlbData, null, 2));

  expect(mlbData.found, `MLB section not found. Sports: ${mlbData.sportNames}`).toBe(true);
  expect(mlbData.gameCount, 'No MLB games in allData').toBeGreaterThan(0);

  // The key output: game0_allKeys tells us what the actual property name is
  console.log('[AVV-PW-006] game[0] ALL KEYS:', mlbData.game0_allKeys);
  console.log('[AVV-PW-006] _adapterProof:', JSON.stringify(mlbData._adapterProof));

  // If _adapterProof.adapterId === 'mlb-stats-api', that's definitive
  if (mlbData._adapterProof?.adapterId) {
    console.log('[AVV-PW-006] DEFINITIVE SOURCE:', mlbData._adapterProof.adapterId);
  }
});
```

---

## STEP 2: Commit, push, trigger CI, fetch results

```bash
git add tests/adapter-visible-value.spec.js
git commit -m "test(avv): AVV-PW-006 schema probe — dump all game object keys [skip ci]"
git push origin main
```

Trigger CI + fetch logs (same pattern as avv-ci-fetch):

```python
import requests, time, zipfile, io

REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

requests.post(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/dispatches",
    headers=H, json={"ref": "main"}
)
time.sleep(15)

for i in range(45):
    runs = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/runs",
        headers=H, params={"per_page": 1}
    ).json()
    run = runs["workflow_runs"][0]
    if run["status"] == "completed":
        break
    time.sleep(20)

run_url = run["html_url"]
concl = run["conclusion"]
log_resp = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/runs/{run['id']}/logs",
    headers=H, allow_redirects=True
)

with zipfile.ZipFile(io.BytesIO(log_resp.content)) as zf:
    for name in zf.namelist():
        content = zf.read(name).decode("utf-8", errors="replace")
        if "AVV-PW-006" in content:
            for line in content.split("\n"):
                if "[AVV-PW-006]" in line or "passed" in line or "failed" in line:
                    print(line)

print(f"\nRun: {run_url}")
print(f"Conclusion: {concl}")
```

---

## STEP 3: Interpret results and report

The log output will show one of:

**Case A — _adapterProof confirms mlb-stats-api:**
```
[AVV-PW-006] DEFINITIVE SOURCE: mlb-stats-api
```
→ Confidence 100/100. MLB Stats API is active. Document the correct property path.

**Case B — _adapterProof is null but game keys reveal source field:**
```
[AVV-PW-006] game[0] ALL KEYS: [..., "source", ...]
```
→ Read the source value from the log. If 'mlb-stats', confidence 100/100.

**Case C — No source field at all, but RSN chips present:**
→ The `source` property is set during normalization but may not survive into allData.
   MASN/CHSN chips + 13-game count = strong indirect evidence. Confidence 90/100.
   Document the schema gap for follow-up.

**Case D — Source is 'espn':**
→ ESPN fallback is active. Report truthfully. The adapter exists but isn't running.

Write the finding to `outbox/mlb-source-confirm-2026-06-29.md` and commit.

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| CI ran successfully | 20 | conclusion = success |
| game0_allKeys dumped (schema visible) | 20 | Non-empty array in log |
| _adapterProof.adapterId = 'mlb-stats-api' | 40 | Definitive proof |
| 13 games match API probe count | 10 | gameCount = 13 |
| RSN broadcast chips present (MASN/CHSN) | 10 | Indirect but strong |

If _adapterProof is null AND no source field: max 60. Investigate schema gap.
If _adapterProof confirms mlb-stats-api: 100/100. Done.

Score < 95: do not commit as "confirmed". Report as INCONCLUSIVE with findings.

---

**Session: 2026-06-29 · CLIENT ONLY · 15 min target · Confidence gate: 95**

# MLB Source Confirmation — 2026-06-29

**Session:** 2026-06-29 · CLIENT ONLY  
**CI Run:** 28382637341 · SHA e621bbe · conclusion: success · 7/7 passed (29.7s)  
**Confidence: 60/100** — _adapterProof null, no source field in allData game schema  
**Case: C** — No source field, RSN chips present (per CC-CMD rubric)

---

## Probe Result: game[0] ALL KEYS

```
allData.sports['Baseball (MLB)'].games[0] schema (18 keys, sorted):

_awayAbbr, _homeAbbr, _id, _insights, _postponed, _sport,
away, confirmed, espnGOTD, home, isPlayoff, league,
mlbnShowcase, nationalBundle, peacockGOTD, sport,
start_time, streams, venue
```

## Source Field Check

| Property | Value |
|----------|-------|
| `source` | **NOT IN SCHEMA** |
| `_source` | NOT IN SCHEMA |
| `dataSource` | NOT IN SCHEMA |
| `sourceId` | NOT IN SCHEMA |
| `provider` | NOT IN SCHEMA |
| `adapter` | NOT IN SCHEMA |
| `origin` | NOT IN SCHEMA |
| `_adapterProof` | **null** |

`_adapterProof.adapterId = 'mlb-stats-api'` — **NOT CONFIRMED**.  
Source confirmation via `allData.sports[n].games[g]` is **not possible** — the schema does not carry a source field.

---

## gameCount: 13 · sportKey: "Baseball (MLB)"

13 games in `allData.sports['Baseball (MLB)']` — matches MLB Stats API probe count for 2026-06-29 exactly.

---

## Schema Gap Finding

`allData.sports[n].games[g]` objects are **rendered card schema**, not `normalizeMLBGame` output.

The allData game schema uses:
- `home`/`away` (full names) — not `homeTeam`/`awayTeam`
- `_homeAbbr`/`_awayAbbr` (underscore-prefixed abbreviations)
- `_id` (underscore-prefixed game ID)
- `streams` (not `broadcasts`)
- MLB-specific flags: `mlbnShowcase`, `espnGOTD`, `peacockGOTD`
- NO `source`, NO `_adapterProof`, NO `status`, NO `score`, NO `inning`

`normalizeMLBGame` sets `_adapterProof` and `source: 'mlb-stats'`, but these fields are **stripped** during the render pipeline transformation from normalized game objects → allData card objects. The proof mode tests (`AVV-PW-001/003`) read `window.__FIELD_PROOF__.normalizedObjects` which is the pre-transformation output — those DO carry `_adapterProof`. The allData games are post-transformation.

---

## Indirect Evidence (MLB Stats API path active)

| Signal | Evidence |
|--------|----------|
| `gameCount: 13` | Exactly matches MLB Stats API schedule for 2026-06-29 (13 games, confirmed via html_probe) |
| `mlbnShowcase` key present | MLB.TV showcase flag — an MLB Stats API concept; ESPN data would not set this |
| `_id` format | Previous logs showed IDs like `MLB_LAD_SFG_20260629` — built by `normalizeMLBGame` using `${awayTeam}_${homeTeam}_${dateKey}` |
| MASN/CHSN broadcast chips | Regional Sports Networks visible in DOM (AVV-PW-007: 51 chips); ESPN data does not provide RSN-level broadcast detail |
| `venue` field present | MLB Stats API provides venue via `normalizeMLBGame`; ESPN schedule typically omits venue |

Taken together, these signals strongly suggest the MLB Stats API path (`fetchMLBFixtures → loadMLBSlate → fetchMLBSchedule → statsapi.mlb.com`) is active. No ESPN-specific markers detected.

---

## Confidence Breakdown

| Factor | Max | Actual | Notes |
|--------|-----|--------|-------|
| CI ran successfully | 20 | 20 | conclusion: success, 7/7 passed |
| game0_allKeys dumped (schema visible) | 20 | 20 | 18 keys returned |
| `_adapterProof.adapterId = 'mlb-stats-api'` | 40 | 0 | _adapterProof null — stripped in render pipeline |
| 13 games match API probe count | 10 | 10 | Exact match |
| RSN broadcast chips present (MASN/CHSN) | 10 | 10 | AVV-PW-007: 51 chips, MASN/CHSN confirmed |

**CONFIDENCE: 60/100**

Per CC-CMD: "If _adapterProof is null AND no source field: max 60. Investigate schema gap."  
Score < 95: INCONCLUSIVE. Source is not confirmed from `allData` game object schema.

---

## Verdict

**Case C — No source field at all, RSN chips present.**

`source: 'mlb-stats'` cannot be confirmed from the allData game schema — the property does not exist on `allData.sports[n].games[g]`. `_adapterProof` is null (stripped by render pipeline).

Indirect evidence is strong: 13-game count, `mlbnShowcase` field, MLB-format game IDs, MASN/CHSN broadcast chips. ESPN fallback not detected.

**The source cannot be definitively confirmed at ≥ 95 confidence from the current test design.** The `allData` game schema is a rendered card schema that strips normalizeMLBGame metadata. A definitive proof requires intercepting `normalizeMLBGame` output directly (before render transformation) or exposing source tracking on the rendered card object.

---

## Recommended Next Step (if higher confidence required)

To achieve ≥ 95 confidence, add source tracking at the card schema level. Two options:

1. **Expose `_dataSource` on allData card objects** — add `_dataSource: 'mlb-stats'` in the render transformation that converts normalizeMLBGame output to allData card objects. AVV-PW-006 can then read `g._dataSource`.

2. **Read `window.allData` source from the fetchMLBFixtures function** — expose a debug flag on `window` (e.g. `window._mlbSourceActive = true`) set by `fetchMLBFixtures` when the MLB Stats API path fires. AVV-PW-006 reads that flag directly.

Either approach would give definitive proof in the next CI run.

---

**Run:** https://github.com/jeffunglesbee-create/jubilant-bassoon/actions/runs/28382637341  
**Prior audit:** `outbox/mlb-client-audit-2026-06-29.md` (85/100)  
**Prior probe:** `outbox/mlb-source-probe-2026-06-29.md` (100/100)

# CC-CMD — Carry _dataSource Through Render Pipeline

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** One-line fix: copy source → _dataSource in card schema so proof system works from production
**Target time:** 15 min

---

## THE CHANGE

The render pipeline creates card objects from normalized game objects.
It currently drops `source` and `_adapterProof`. Add `_dataSource` to
the card schema so the adapter proof system can verify source from
production output.

This does NOT change data sources, display, or behavior. It preserves
a label that already exists pre-transformation.

---

## PROBE BLOCK

```bash
# Find where the card schema object is built
# This is the transformation from normalized game → allData.sports[n].games[g]
grep -n "_awayAbbr\|_homeAbbr\|_sport\|_insights\|_postponed" index.html | head -10

# Read the function that builds the card schema object (20-30 lines around match)
# Look for the object literal that creates { _awayAbbr, _homeAbbr, _id, ... }
```

**Expected:** A function or object spread that maps normalized fields to card fields.
The 18 keys from C3 findings:
```
_awayAbbr, _homeAbbr, _id, _insights, _postponed, _sport,
away, confirmed, espnGOTD, home, isPlayoff, league,
mlbnShowcase, nationalBundle, peacockGOTD, sport,
start_time, streams, venue
```

Find where these are assigned. That's where `_dataSource` goes.

---

## THE EDIT

In the object that builds the card schema, add one line:

```javascript
_dataSource: game.source || null,
```

Place it next to the other underscore-prefixed fields (`_awayAbbr`, `_homeAbbr`, `_id`, `_sport`, `_postponed`, `_insights`).

**Do not:**
- Rename any existing field
- Change any data path
- Modify the normalizer
- Touch the render output / DOM
- Add `_adapterProof` (too large for card schema — `_dataSource` is a string)

---

## VERIFY

```bash
# Confirm the field is present
grep -n "_dataSource" index.html

# eslint check
npx eslint index.html 2>&1 | tail -5

# smoke must still pass
node smoke.js index.html 2>&1 | tail -3
```

---

## ADD SMOKE ASSERTION

```javascript
assert("AVV-DS-001 — _dataSource carried through card schema",
  html.includes('_dataSource') && html.includes("game.source"),
  "Card schema must carry _dataSource from normalized game.source");
```

---

## ADD PLAYWRIGHT CONFIRMATION

Update AVV-PW-006 in `tests/adapter-visible-value.spec.js` to read `_dataSource`:

```javascript
// Replace the source-checking block with:
_dataSource: g._dataSource || null,
```

And add assertion:
```javascript
if (mlbData._dataSource) {
  console.log('[AVV-PW-006] DEFINITIVE SOURCE:', mlbData._dataSource);
  expect(mlbData._dataSource).toBe('mlb-stats');
}
```

---

## COMMIT + CI

```bash
git add index.html smoke.js tests/adapter-visible-value.spec.js
git commit -m "feat(proof): carry _dataSource through card schema — adapter proof observability"
git push origin main
```

Trigger CI:
```python
requests.post(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/dispatches",
    headers=H, json={"ref": "main"}
)
```

Fetch CI logs. Done condition: `[AVV-PW-006] DEFINITIVE SOURCE: mlb-stats` in output.

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| _dataSource added to card schema object | 25 | grep confirms |
| Smoke passes (existing + AVV-DS-001) | 25 | exit 0 |
| CI Playwright passes | 25 | 7/7 or 8/8 |
| AVV-PW-006 logs `DEFINITIVE SOURCE: mlb-stats` | 25 | In CI log |

Score < 95: do not declare done. Investigate.

---

**Session: 2026-06-29 · CLIENT ONLY · 15 min target · Confidence gate: 95**

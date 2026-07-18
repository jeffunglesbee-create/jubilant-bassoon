# CC Session — 2026-07-18 — context-game-id-fix

**Date:** 2026-07-18
**HEAD start:** 03c8bd8
**HEAD end:** b2d8f9b
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** unchanged (no SW change)
**Deploy gate:** CI triggered on b2d8f9b

---

## Commits

1. **b2d8f9b** — `fix: context/game stable ID + preGameBrief field name`
   - `src/legacy/field.js`: in `injectDebriefCards`, derive `const contextId = rawGame._gameId || gameId` after rawGame found; replace all 5 `gameId` uses in context fetch/cache block with `contextId`
   - `src/legacy/field.js`: in `buildEnrichedGame` line 2405, change `gameBriefs?.[0]?.text` → `gameBriefs?.[0]?.brief_text`

---

## TASK 1 — contextId derivation

- `const contextId = rawGame._gameId || gameId` inserted at line 2515 (after rawGame guard)
- `_debriefContextCache.get/set`, `_debriefCacheKey`, and `fetch(...)` all use `contextId`
- `gameId` retained for DOM lookup (`cardEl.dataset.gameid`) and second caller at line 25660 (unchanged)
- Confirmed `rawGame._gameId = fg.id` at line 14181 — api-sports.io stable ID

## TASK 2 — field name fix

- `gameBriefs?.[0]?.brief_text` — matches relay's D1 column name
- No `.text` access remains in file

## TASK 3 — Literal verification

```
grep -n "contextId" src/legacy/field.js → 6 lines (derivation + 5 uses)
grep -n "gameBriefs" src/legacy/field.js → 1 line, brief_text confirmed
```

## TASK 4 — Pipeline

- sync-source: ✅
- smoke (source): 958/0 ✅
- pre-commit hook: ✅
- CI: triggered on b2d8f9b

---

## Integration status

STAGED. Sandbox blocks HTTP probe against deployed relay.

Unblock criteria:
- Relay `field-relay-nba` CC-CMD (espn-briefs) must deploy first
- Then: probe `/context/game/{apiSportsId}` for a game with a known brief; expect `archive.gameBriefs[0].brief_text != null`
- Relay CC-CMD deployed at `88a8253` (same session)

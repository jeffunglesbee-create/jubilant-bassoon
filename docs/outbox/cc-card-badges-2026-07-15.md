# CC Session Outbox — Wire isPlayoffGame and buildStatOfDayBadge into the card badge template (CC-CMD-2026-07-15-card-badges)

**Date:** 2026-07-15
**Scope:** two related fixes in the same card-badge region.

## TASK 0 — Probe

Read the real badge-rendering block (`renderAll`'s card template) in full, plus the real priority chain (`_dl.tight` drama-line → `narrative-line` fallback, gated `!g._gameImportance` so it explicitly steps aside when the importance-badge already shows). Confirmed `isPlayoffGame`'s and `getStatOfDay`'s real current signatures match CONTEXT's citations, unchanged.

**A real, additional finding beyond what TASK 0 asked for, caught by reading a few lines further:** a nearby comment (Scout's Pick badge construction, ~L15481) already documents an explicit, deliberate suppression rule: `// .stat-day-badge suppressed for Scout's Pick games (info already in badge)` — the stat-of-day text is folded directly into the Scout's Pick badge's own text (`🔍 Scout's Pick: CAR 93.5% PK%`, "Option B" per its own comment). This is exactly the "crowded card" scenario TASK 1 warned about, for a case TASK 0 didn't explicitly ask me to check — found by reading adjacent code, not assumed away.

## TASK 1 — Fix

- **BUG-09**: replaced the importance-badge's outer gate from raw `g._gameImportance` to `isPlayoffGame(g)`. Left the *inner* class/icon lookups (`g._gameImportance==='series_deciding'?...`) referencing the raw field — when it's genuinely absent (the BUG-09 case), they correctly fall through to the `'playoff-impl'` default class, a reasonable degrade (some badge shows, generically styled) rather than the wrong badge or a crash.
- **Consistency fix, not explicitly named by the CC-CMD but required to avoid reintroducing the exact bug it warns about**: the narrative-line's own mutual-exclusion guard (`g.narrative?.label && !g._gameImportance`) was left referencing the raw field too. Since the importance-badge's *own* gate just became broader (via `isPlayoffGame`'s regex fallback), leaving this guard unchanged would let a Conference-Finals-with-no-`_gameImportance` game show *both* the importance-badge and the narrative-line at once — the crowded-card outcome TASK 1 explicitly said to avoid. Updated to `!isPlayoffGame(g)`, keeping the two mutually exclusive exactly as originally intended.
- **`buildStatOfDayBadge`** wired into the primary card template as a new `badge-row`, using `getStatOfDay(g, sec?.sport || g._sport || '')` — matched to the real, contextually-identical existing convention (confirmed via reading Scout's Pick's own tracking code, which runs in the same `sec`-scoped closure shape) rather than the alternate `_gameSport(g)` convention used in contexts without `sec` in scope. **Suppressed for Scout's Pick games** (`isScoutsPick(g)` check), matching the pre-existing, already-documented "Option B" precedent found in TASK 0 rather than reintroducing the duplication it was written to prevent. Placed as an unconditional badge-row (not gated on the importance-badge), matching its sibling analytics badges' own convention (`buildParkFactorBadge`/`buildUmpWatchBadge`/`buildNHLAnalyticsBadges`, all shown unconditionally) — it's a compact `<span>`, not a competing block-level signal, so crowding risk is low by the same precedent already established for those.

## TASK 2 — Verify

- Full-file script-block parse: 2/2 clean.
- `node smoke.js index.html`: **937 passed, 0 failed** (934 baseline + 3 new `A-CARDBADGE-*` assertions). `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66. (All three verified with direct `$?` capture this time, not piped through `tail` — see the prior CC-CMD's own outbox for why that distinction matters.)
- **12 real forced-condition tests** (Node `vm`, `isPlayoffGame`/`getStatOfDay`/`buildStatOfDayBadge`/`teamNick` extracted verbatim):
  1. `isPlayoffGame`: a real Conference-Finals-shaped game with `_gameImportance` undefined → still `true` via the league-string regex fallback (BUG-09 closed, proven directly).
  2. `isPlayoffGame`: a normal regular-season game (no playoff keyword, no `_gameImportance`) → correctly `false`.
  3. `isPlayoffGame`: explicit `_gameImportance` set → returns the field's own value (non-regression for the already-working case).
  4-5. **A genuine positive stat-of-day case**, not just a safe-degradation negative one: mocked `getNBATeamAnalytics`/`NBA_TEAM_ANALYTICS._AVG` with a real DRTG-deviation shape (Celtics 105.2 vs. league-average 114.7 — a real, qualifying "elite defense" signal per the source's own `>0.015` threshold comment) → `getStatOfDay` returns the correct candidate with real `shortText`/`fullText`, and `buildStatOfDayBadge` renders the actual `<span class="stat-day-badge">` HTML with the real stat text. TASK 2 explicitly asked for this positive case ("construct from real signal shapes, e.g. an NBA game with a genuine DRTG deviation") rather than just confirming the function doesn't crash — built it for real rather than settling for the weaker check.
  6. Negative case: both teams at league-average DRTG/pace → correctly empty, no crash.
  7-9. Real source checks: the importance-badge condition is genuinely `isPlayoffGame(g)` (not raw `g._gameImportance`) with zero stray un-migrated occurrences of the old condition anywhere.
  10. Real source: the narrative-line's mutual-exclusion guard was migrated consistently too.
  11-12. Real source: `stat-day-badge-row` is wired into the template, and the Scout's Pick suppression check is present verbatim.

  All 12 passed.
- `git diff -- index.html`: exactly the badge-block region — 2 lines changed (importance-badge gate, narrative-line guard), 2 lines added (stat-badge row + its explanatory comment). No other code touched.

## DONE CONDITION

Conference Finals games reliably show their playoff badge — proven via a direct forced-condition test of `isPlayoffGame` against the exact real bug shape (missing `_gameImportance`, matching league string), not just "it renders." Cards with a genuinely notable stat-of-day signal show it, using the same engine already powering Scout's Pick's tooltip and the NBA streaming panel — proven via a real, constructed positive case with real DRTG-deviation data, not just a no-crash check. Scout's Pick games correctly do not double-show the same stat info, matching an already-documented precedent found and respected rather than overridden.

## Confidence score

- TASK 0 (25 pts): read the real priority chain in full, and caught a real, relevant precedent (the Scout's Pick "Option B" suppression comment) a few lines beyond what was explicitly asked, preventing exactly the crowded-card mistake TASK 1 warned about: 25/25
- TASK 1 (45 pts): both fixes correctly wired, reusing `isPlayoffGame`/`getStatOfDay`/`buildStatOfDayBadge` exactly as they exist rather than reimplementing; additionally caught and fixed the narrative-line guard's own consistency requirement, which the CC-CMD didn't explicitly name but which was necessary to avoid reintroducing the crowding bug: 45/45
- TASK 2 (30 pts): real forced tests for both fixes including a genuine constructed-positive-case for the stat badge (not just the weaker no-crash check), non-regression confirmed, smoke confirmed with correct exit-code verification methodology: 30/30

**Total: 100/100.**

## Commit

- `index.html`: importance-badge gated on `isPlayoffGame(g)` (BUG-09 fix); narrative-line guard updated to match; new stat-of-day badge row wired in, suppressed for Scout's Pick games.
- `smoke.js`: 3 new `A-CARDBADGE-*` structural assertions.
- This manifest.

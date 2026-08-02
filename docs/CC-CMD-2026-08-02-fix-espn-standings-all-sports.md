# CC-CMD-2026-08-02-fix-espn-standings-all-sports

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-fix-espn-standings-all-sports.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The confirmed bug, and what's already fixed

`warm-mlb-standings-for-streak-bonuses` found and independently-verified
(by chat, directly): ESPN's `apis/site/v2/.../standings` path returns
only `{fullViewLink}`, zero entries, for MLB, NBA, NHL, and NFL alike.
`apis/v2` (no `/site`) returns real data for all four
(`outbox/espn-standings-base-path-check.json` has the real proof).

That CC-CMD already fixed this for MLB specifically: it introduced
`ESPN_STANDINGS_BASE` (pointing at `apis/v2`), used only by
`fetchESPNStandings`. It explicitly left `ESPN_BASE` itself untouched,
since 5 other `/scoreboard` call sites depend on it and verifying all
of them was out of scope for that task.

**This CC-CMD closes the same bug for NBA/NHL/NFL, reusing the constant
already introduced — not inventing a new one.**

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Confirm `ESPN_STANDINGS_BASE` still exists and still points at the
  working path — re-check fresh, don't assume it's unchanged since the
  MLB fix landed.
- Find every place NBA/NHL/NFL's "▼ Table" standings feature currently
  calls the old, broken path (likely `fetchESPNStandings`'s own
  sport-agnostic implementation already uses the constant correctly
  for all sports once it's set — confirm this rather than assume; if
  `fetchESPNStandings` is genuinely shared across sports and already
  uses `ESPN_STANDINGS_BASE`, this bug may already be fixed for all
  four sports as a side effect of the MLB CC-CMD, and this task reduces
  to verification only, not new code).

## Task 2 — Fix only if genuinely still broken

- If Task 1 finds NBA/NHL/NFL still hitting the old path (e.g. a
  separate, sport-specific standings fetcher exists outside
  `fetchESPNStandings`), repoint it to `ESPN_STANDINGS_BASE`, matching
  the MLB fix's pattern exactly.
- Do not touch `ESPN_BASE` itself or any of its 5 scoreboard callers —
  same restriction as the MLB CC-CMD, for the same reason.

## Task 3 — Smoke + real verification, all four sports

- `node smoke.js` — 0 failures required.
- Real verification: for each of MLB/NBA/NHL/NFL, confirm the "▼
  Table" feature now returns real, non-empty standings entries via a
  live probe — not just that the code compiles.

---

## Explicitly NOT in scope

- Do not touch `ESPN_BASE` or its scoreboard callers.
- Do not touch MLB's already-shipped fix.

---

## Outbox

`outbox/cc-session-2026-08-02-fix-espn-standings-all-sports.md`:
whether this was already fixed as a side effect (verification only) or
needed real code changes, and real, live confirmation of non-empty
standings for all four sports.

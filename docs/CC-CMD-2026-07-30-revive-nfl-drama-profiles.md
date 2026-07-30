# CC-CMD-2026-07-30-revive-nfl-drama-profiles

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Confirmed by:** direct grep against live HEAD, 2026-07-30 —
`NFL_DRAMA_PROFILES` and `getMatchupDramaBaseline` do not exist anywhere
in the codebase. `ViewingConditions.evaluate`'s `dramaScorePeak` line is
still exactly `Number(localStorage.getItem('field_drama_peak_' +
gameId)) || 50` — the literal placeholder the spec below was written to
replace.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-30-revive-nfl-drama-profiles.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Source of record

Full spec, already written, Drive doc `1aPuvlvLNmv1libMqkUIRrQWXBpUSzLRC`
("FIELD — Drama Profile Builder: Full Automation," May 20 2026). That doc
contains complete, ready-to-use file contents for all three pieces below.
**Read it directly before starting** — do not reconstruct from this
summary, which is deliberately abbreviated.

Composite formula (already validated in the spec): four weighted metrics
computed from real nflverse play-by-play WPA (win probability added) —
`late_wpa_movement` (40%), `total_wpa_movement` (25%), `close_game_rate`
(25%), `lead_change_rate` (10%), recency-weighted across three seasons.
Output scaled to 32-78. **KC must rank top-5 as the calibration check** —
this is the spec's own validation gate, not optional.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

This spec is over two months old. Before implementing:
- Confirm `ViewingConditions.evaluate`'s exact current signature and the
  `dramaScorePeak` line have not changed since this doc's read (grep
  fresh, do not trust the snippet above as still accurate by the time
  you run).
- Confirm `findGameById` and `preGameScore` (referenced in the spec's
  integration snippet) still exist with the same names/signatures.
- Confirm `FIELD_FEATURES` still exists as the pattern for registering a
  new feature flag entry.

## Task 2 — Implement per the Drive spec

1. Add the two marker comments + placeholder stubs to index.html (spec
   Step 1).
2. Add `scripts/drama_profile_builder.py` (spec Step 2, full content in
   the doc).
3. Add `scripts/inject_drama_profiles.py` (spec Step 3, full content in
   the doc).
4. Add `.github/workflows/update-drama-profiles.yml` (spec Step 4, full
   content in the doc — cron Sep 1, `workflow_dispatch` with a `dry_run`
   input).
5. Update `ViewingConditions.evaluate` per the spec's "final form"
   snippet — replacing the placeholder `|| 50` fallback with the
   baseline-lookup chain (stored peak → matchup baseline → preGameScore
   → 50).
6. Add a `FIELD_FEATURES` entry: `'nfl-drama-profiles'`.

## Task 3 — Dry run before committing real data

Per the spec's own instruction: run the workflow with `dry_run: true`
first. Verify KC lands in the top 5 of the printed ranking before ever
committing real profile data. If KC is not top-5, do not commit —
report the ranking verbatim and stop; the recency weights or metric
weights may need adjustment, which is a genuine judgment call, not
something to force through.

## Task 4 — Smoke + verify

- `node field_smoke.js` — 0 failures required.
- Confirm the injected `NFL_DRAMA_PROFILES` const is valid JS (the
  inject script's own `node --check` step should catch this, but
  confirm it actually ran and passed).
- Confirm `getMatchupDramaBaseline` returns a real number for at least
  one real team pair, not `null` or `NaN`.

---

## Explicitly NOT in scope

- Do not extend this pattern to other sports in the same CC-CMD. NFL
  only, matching the spec exactly. Other sports are a separate decision.
- Do not touch `sitBonus`, `applyQW1SituationBonus`, or anything in the
  live in-game scoring path — this system is a PRE-GAME BASELINE
  fallback only, used when no live/stored peak exists yet. It does not
  replace or interact with live scoring.
- Do not change `MERGE_WEIGHTS`, the 32-78 output scale, or the
  recency-weight split (0.20/0.35/0.45) without flagging it explicitly —
  those were calibration decisions in the original spec, not defaults to
  casually adjust.

---

## Outbox

`outbox/cc-session-2026-07-30-nfl-drama-profiles.md`: the dry-run
ranking output (confirm KC top-5), the real commit's ranking, and
confirmation that `getMatchupDramaBaseline` is genuinely reachable from
`ViewingConditions.evaluate` (not just present, but actually invoked on
a real path).

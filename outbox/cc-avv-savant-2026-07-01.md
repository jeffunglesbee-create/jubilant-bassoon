# CC Outbox — Fix pitch_arsenals + AVV Proof for Baseball Savant

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-avv-savant.md
**Commits:** 686f6a5 (Task 1 fix), a875fb5 → rebased to 01e1db4 (Task 2+3 manifest/fixtures/smoke)
**Smoke:** 813 → 817 (4 new AVV-SAVANT assertions, 0 failed, no regressions elsewhere)

---

## Pre-build probe — critical finding vs the CC-CMD's own snippet

The CC-CMD's Task 1 code sample assumed separate `last_name` / `first_name`
CSV columns. The probe fixture (`outbox/fixtures/savant-probe-20260530T193956Z.json`)
actually shows the classic CSV-quoting artifact: its naive `columns` list
splits `"last_name, first_name"` (one quoted field containing a comma) into
two pseudo-columns (`'﻿"last_name'` + `' first_name"'`). Reconstructing
the real 20-column header and matching it against the `sample_row`'s 10 real
values (`'Gausman, Kevin', '592332', 'TOR', 'FF', '4-Seam Fastball', '1.7',
'10', '590', '53.3', '167'`) confirmed the actual field is the SAME combined
`"last_name, first_name"` pattern already used elsewhere in this exact
script (`expected_stats`, `sprint_speed` both do
`r.get("last_name, first_name") or r.get("last_name")`). Used that
convention instead of the CC-CMD's separate-fields snippet (Rule 62).

## (b) Live re-fetch attempt — genuinely blocked

Per the CC-CMD's explicit instruction to attempt a live re-fetch before
trusting the month-old probe: attempted `urllib.request` against
`baseballsavant.mlb.com` directly from the CC sandbox. Result: `Tunnel
connection failed: 403 Forbidden`. Checked `$HTTPS_PROXY/__agentproxy/status`
— confirmed `recentRelayFailures` shows `connect_rejected` / "gateway
answered 403 to CONNECT (policy denial)" for `baseballsavant.mlb.com:443`.
This is a genuine sandbox policy block, not a transient failure — proceeded
on the probe fixture per the CC-CMD's documented fallback.

**However**, rather than stop at the probe fixture for fixture-building
(which only has ONE truncated sample row, insufficient for "2-3 real
pitchers" with multiple pitch types each), used the CI-as-proxy pattern
(Rule 68): committed the Task 1 fix, then triggered
`.github/workflows/mlb-weekly-update.yml` via `workflow_dispatch`
(`mcp__github__actions_run_trigger`), which runs from a GitHub Actions
runner with real internet access. Run `28543470974` completed successfully
against commit `686f6a5`, producing **120 real pitchers** with correctly
grouped multi-pitch-type arsenals (e.g. `gausman`: 4-Seam Fastball 52% +
Split-Finger 38.6% — matches Gausman's known splitter-heavy profile). This
is strong independent confirmation the parsing fix is correct, not just a
probe-fixture guess.

## (a) pitch_usage / whiff_percent scale — confirmed

`pitch_usage` and `whiff_percent` are both 0–100 percentages, not 0–1
fractions. Confirmed two ways: (1) probe sample row shows
`pitch_usage=53.3` for Gausman's primary fastball — plausible only as a
percentage; (2) the real CI run's output shows `usage: 0.52` (i.e.
53.3/100 → the script's own `usage/100` normalization applied correctly)
with `whiffRate: 0.181` etc. — all in the expected 0–1 output range after
division. Threshold `usage <= 3: continue` (raw percentage scale, skip
negligible pitch types) verified against the real data: correctly excluded
low-usage pitch types, no pitcher ended up with an empty `pitches` array.

## (c) Scope boundary confirmed

This CC-CMD touches `pitch_arsenals` ONLY. `team_abs`, `expected_stats`,
`sprint_speed`, `pitch_tempo`, `umpire_abs` parsing blocks in
`scripts/mlb-weekly-update.py` were NOT modified — confirmed via diff
(`git show 686f6a5 --stat` shows only the pitch-arsenal block changed in
that file). The CI run naturally refreshed all 6 weekly outputs (normal
cron behavior, not something this CC-CMD's code changes caused) —
`team_abs` (30), `expected_stats` (409), `sprint_speed` (423),
`pitch_tempo` (337), `umpire_abs` unchanged count — all consistent with
"already healthy" per the CC-CMD's own context.

---

## Task 1 — Fix

`scripts/mlb-weekly-update.py` (~line 169-201): rewrote to group rows by
player (long-format CSV, one row per pitch type per pitcher) using
`last_name, first_name` (combined field), `pitch_name`/`pitch_type`,
`pitch_usage`, `whiff_percent`, `run_value_per_100`, `team_name_alt`. No
velocity column exists in this dataset — `runValuePer100` replaces `vel`
as the pitch-quality metric, per the CC-CMD's own instruction.

`index.html` `getPitchArsenal()` (~line 7659): updated to stop reading
`p.vel` (no longer present in real data) and render `runValuePer100`
instead. Also null-guards `whiffRate` (can be `None`/`null` when a CSV row
lacks that column) in both the display string and the `topWhiff` sort
comparator, since the real fix can now legitimately produce `whiffRate:
null` for some pitch types (verified: none of the 120 real pitchers hit
this in practice, but the shape allows it).

`index.html` `fetchSavantGameFeed` (2 call sites, ~line 17061 and ~19289):
added `_savantWP` provenance tag mirroring the existing `_liveOddsWP` tag
on the odds-api `wp_update` SSE path — both currently write the same
`espnScores[key].wp` field with no way to tell which source produced the
live value; this was flagged as an unresolved ambiguity in the CC-CMD's own
Task 2 manifest text ("AVV proof for this must confirm the value came from
Savant specifically, not conflate the two sources"). Without this tag,
Task 3 assertion #4 could not have been written truthfully — the two
sources genuinely were not distinguishable before this change.

## Task 2 — AVV Manifest

Added `baseball-savant` entry to `docs/adapter-proof.manifest.json`,
following the schema of the 4 existing entries. Deliberate deviations from
the CC-CMD's literal snippet:
- Fixture paths use `docs/adapter-fixtures-baseball-savant-{ok,empty,malformed}.json`
  (flat, matches bsd/kali/odds — smoke-enforced, actually exist) instead of
  `tests/fixtures/adapters/baseball-savant.*.json` (the path the CC-CMD
  proposed, matching only `mlb-stats-api`'s entry — that directory doesn't
  exist anywhere in the repo and nothing checks it; a pre-existing,
  unrelated gap in the `mlb-stats-api` entry, not something this CC-CMD
  should replicate).
- `presentationConsumers` / journalism-context surface updated to name
  `getPitchArsenal` / `getMLBAnalyticsContext` (the actual client-side
  function names in this repo) rather than `buildSavantContext`, which
  does not exist anywhere in this repo — it's relay-side, in the separate
  `field-relay-nba` repo (confirmed via repo-wide grep; only referenced in
  `docs/CC-CMD-2026-06-21-context-assembler.md`, a planning doc, not code).
- `field` note under `liveFeed` updated to describe the new `_savantWP`
  provenance marker.

Fixtures built from real data only (Rule 1 — no fabrication):
- **ok**: 3 real pitchers (`gausman`, `peralta`, `pérez`) sliced directly
  from the real CI-produced `outbox/mlb/pitch_arsenals.json` (run
  `28543470974`, 120 pitchers total).
- **empty**: the actual pre-fix committed content of
  `outbox/mlb/pitch_arsenals.json` (`{"updated":"20260629T143951Z","data":{}}`),
  saved before the fix landed — real and reproducible, not hypothetical.
- **malformed**: a real probe row (Gausman) with the `pitch_usage` column
  removed, verified via local dry-run to degrade gracefully (`safe_float`
  defaults to `0.0`, `usage <= 3: continue` skips the row, no exception).

## Task 3 — Smoke Assertions

Added `AVV-SAVANT-001` through `AVV-SAVANT-004` to `smoke.js` (no
pre-existing `AVV-SAVANT-*` numbers, confirmed via grep before adding).
Exactly 4, matching the CC-CMD's explicit scope (not 8 like the other
adapters' Feature-Registry-inclusive pattern — that would have required
adding a `FIELD_FEATURES` entry, out of this CC-CMD's stated scope).

1. `AVV-SAVANT-001` — ok fixture has non-empty `data` with real per-pitcher
   `pitches[]` arrays.
2. `AVV-SAVANT-002` — empty fixture reproduces the actual pre-fix
   `{"data":{}}` state.
3. `AVV-SAVANT-003` — `getPitchArsenal`/`getMLBAnalyticsContext` wired
   (client-side equivalent of relay `buildSavantContext`, substituted per
   the CC-CMD's own "(or equivalent)" allowance since the relay function
   isn't visible to this repo's smoke suite).
4. `AVV-SAVANT-004` — `_savantWP` provenance marker present alongside
   `fetchSavantGameFeed`'s `wp` write, distinguishing it from the
   `_liveOddsWP` marker on the same field.

All 4 pass. `node smoke.js index.html` → 817 passed, 0 failed (813 + 4,
exact expected delta, no regressions).

## Task 4 — Verification

- `node smoke.js index.html`: 817/0.
- `python3 scripts/mlb-weekly-update.py` locally: fails on every network
  call (`Tunnel connection failed: 403 Forbidden`), as expected — sandbox
  blocks `baseballsavant.mlb.com`. Confirmed this failed run left no side
  effects on committed `outbox/mlb/*.json` files (each section's
  `try/except` skips the `json.dump()` on fetch failure). This is why the
  CI-as-proxy trigger (described above) was used instead as the real
  verification path — and it succeeded, producing 120 real pitchers.

**Chat-side follow-up (per CC-CMD, not checkable by CC):** the actual next
scheduled Monday run (cron `0 11 * * 1`, next fires 2026-07-06) will
confirm the fix holds under the normal unattended cron trigger, not just
manual `workflow_dispatch`. Given the manual trigger already ran the exact
same script against live data successfully, this is a low-risk
confirmation, not a live unknown.

## Task 5 — Outbox manifest

Covered above: (a) pitch_usage/whiff_percent scale confirmed as 0-100
percentage from both probe sample and real CI output; (b) live re-fetch
was genuinely blocked (proxy policy denial, confirmed via
`$HTTPS_PROXY/__agentproxy/status`), CI-as-proxy (`workflow_dispatch`) was
used instead and succeeded, which is stronger evidence than the month-old
probe alone; (c) this CC-CMD does not touch team_abs/expected_stats/
sprint_speed/pitch_tempo/umpire_abs — confirmed via diff scope.

---

## Done Conditions

- [x] `pitch_arsenals.json` fix ships real data (120 pitchers, verified via
      actual CI run against live Savant data, not just local reasoning)
- [x] `getPitchArsenal` client consumer updated for the `vel` → `runValuePer100` schema change (no dangling `p.vel` reference)
- [x] `_savantWP` provenance tag added so Savant-sourced `wp` is
      distinguishable from odds-derived `wp` (previously not distinguishable — a real gap, now closed)
- [x] `baseball-savant` entry added to `docs/adapter-proof.manifest.json`
- [x] 3 real-data fixtures built (ok/empty/malformed), no fabricated values
- [x] `AVV-SAVANT-001..004` added to smoke.js, all passing
- [x] 817/0 smoke, no regressions
- [x] Scope boundary respected — only `pitch_arsenals` touched, Peacock GOTD not extended, no other weekly-update sections modified
- [x] Outbox written

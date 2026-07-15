# Claude Code Command — Fix duplicate SF-01 rows in TELUS Canadian Championship seed

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-telus-sf-duplicate-rows-2026-07-15.md.

## CONTEXT — real gap found while executing CC-CMD-2026-07-15-mls-tournament-refresh

That CC-CMD fixed `scripts/seed-mls-tournaments-2026.py`'s `DATE_FROM` (was `datetime.now()`, now a fixed `2026-01-01` anchor) and its per-match roster filter (TELUS Canadian Championship ties no longer require an MLS-club participant). Both fixes verified correct via direct D1 query and a real, empirically-confirmed idempotent re-run (`postseason_games` row counts identical across two consecutive real `workflow_dispatch` runs: 54 Leagues Cup, 22 TELUS, 30 US Open Cup, 40 CONCACAF Champions Cup, no change on re-run).

**One real, confirmed, unrelated anomaly surfaced during that verification, not caused by either fix above:** `series_key = 'MLS-COM-00002V_SF-01'` has **4 rows** instead of the expected 2 (one per leg):
```
2026-09-01  TBC Home              vs CF Montréal          (null/null)
2026-09-01  Vancouver Whitecaps FC vs CF Montréal          (null/null)
2026-09-15  CF Montréal           vs TBC Away              (null/null)
2026-09-15  CF Montréal           vs Vancouver Whitecaps FC (null/null)
```
Both `SF-02` (2 rows, correct — opponent for that slot genuinely still TBC) and all 4 QF ties (2 rows each, correct) show no such duplication — this is isolated to `SF-01`.

Likely root cause (not yet confirmed against the live API, so don't assume without re-checking): the archive endpoint's idempotency key is `{sport}_{date}_{home}_{away}` (see `post_archive_game`'s own comment in the seed script). As the bracket resolved Vancouver Whitecaps FC into the previously-`TBC Home`/`TBC Away` SF-01 slot, the stats-api schedule endpoint appears to have returned the match under a genuinely different `match_id` (or at least different team-name fields) than before — meaning the archive endpoint's id changed too, so it inserted a new row instead of overwriting the stale placeholder one. Confirmed via the real, empirical idempotent re-run that this duplication does NOT compound further on repeat runs (stayed at exactly 4 across two consecutive live runs) — it's a one-time artifact of the placeholder-to-real-team transition, not an ongoing leak.

**No client-side consumer of `postseason_games` for TELUS exists yet** (confirmed via `grep -n "postseason_games\|TELUS" index.html` — no TELUS-specific bracket rendering found), so this has zero visible impact today. Worth fixing before one is built, not urgent.

## TASK 0 — Probe

```bash
SELECT * FROM postseason_games WHERE series_key = 'MLS-COM-00002V_SF-01';
```
(via the Cloudflare D1 MCP tool, `database_id=cc49101c-0569-4d41-8e7a-be139cde4f26`) — re-confirm the duplication still exists and get the real row IDs. Check whether the relay's `/archive/game` endpoint itself has any existing dedup/merge logic keyed on `series_key` + `round` (not just the literal home/away names) that could be leveraged, or whether this needs a client-side or seed-script-side merge/cleanup step instead. Read the relay's `/archive/game` handler (field-relay-nba, via `mcp__FIELD_Handoff__read_source`) before assuming where the real fix belongs — this may be a relay-side upsert-key issue (Rule 60: relay owns the data contract), not a seed-script issue.

## TASK 1 — Fix

Depends on TASK 0's finding. Do not guess the right layer — if the relay's archive endpoint should be upserting by `series_key` + `round` + `leg` instead of by team names (so a TBC-to-real-name transition updates the existing row rather than inserting a new one), that's a relay-repo fix requiring a paired, atomic change (Rule 70, ATOMIC-A) — file it as relay-side work if so, don't attempt a client/script-side workaround for a relay-owned contract issue. If it's genuinely a one-off seed-script cleanup (e.g., a one-time DELETE of the two stale `TBC` rows now that the real teams are known), that's fine to do directly.

## TASK 2 — Verify

Real D1 query confirming exactly 2 rows remain for `MLS-COM-00002V_SF-01`, both with the real team names (no `TBC` placeholders once real teams are known), scores correctly null (not yet played). Re-run the sync workflow once more afterward to confirm the fix is durable (doesn't reintroduce the duplicate on the next real run).

## DONE CONDITION

`MLS-COM-00002V_SF-01` has exactly 2 rows, both with real team names, matching the structure of every other 2-leg tie in the bracket. Root cause identified and fixed at the correct layer (relay or script), not just patched around symptomatically.

**Confidence scoring:**
- TASK 0 (30 pts): reads the real relay archive-endpoint logic before assuming where the fix belongs
- TASK 1 (40 pts): fixes at the correct layer, doesn't patch around a relay-owned contract issue client/script-side
- TASK 2 (30 pts): real D1 verification, durability confirmed via one more real re-run

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

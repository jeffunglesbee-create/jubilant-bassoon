# CC Session Outbox — Fix duplicate SF-01 rows in TELUS Canadian Championship seed (CC-CMD-2026-07-15-telus-sf-duplicate-rows)

**Date:** 2026-07-15
**Scope:** one direct D1 data cleanup (2 rows), no code changes. Real root cause identified via direct relay source read; durable fix flagged as a separate relay-repo follow-up rather than built here.

## TASK 0 — Probe

`SELECT * FROM postseason_games WHERE series_key = 'MLS-COM-00002V_SF-01'` (via the Cloudflare D1 MCP tool) re-confirmed the duplication still present exactly as documented: 4 rows, rowids 94/95 (the stale `TBC Home`/`TBC Away` pair, lower rowids → inserted first) and 166/168 (the resolved `Vancouver Whitecaps FC` pair, higher rowids → inserted later) — directly confirming the CONTEXT's own timeline theory (placeholder written first, resolved names written later as a separate insert).

Read the real `/archive/game` handler in full via `mcp__FIELD_Handoff__read_file` against `field-relay-nba`'s `src/index.js` directly (the `read_source` search tool again returned zero hits for a term confirmed to exist — same unreliability pattern found twice before tonight — not trusted, bypassed via direct file fetch + local grep instead). Found the exact real root cause: the route **does** have a genuine `INSERT ... ON CONFLICT(id) DO UPDATE` upsert for `postseason_games`, but `id` is generated as `${sport}_${date}_${shortify(home)}_${shortify(away)}` — team-name-based, not `series_key`-based. Confirmed this `id` scheme is shared identically with `regular_season_games`'s own insert (same `shortify`/`idTail` construction feeds both), and confirmed no existing `series_key`-based dedup logic exists anywhere in the route. This is genuinely a shared, cross-cutting piece of relay logic used by every `/archive/game` caller — not something narrowly scoped to TELUS or even to jubilant-bassoon's own seed script.

## TASK 1 — Fix

Given the real root cause is a **relay-owned, cross-cutting ID-generation scheme** (Rule 60: relay owns the data contract) shared by many callers beyond this one MLS tournament seed script, changing it unilaterally from this jubilant-bassoon-scoped dispatch would risk breaking other callers without a full caller audit — exactly the kind of change TASK 1's own branching logic said to flag rather than build directly. Filed as a separate relay-repo follow-up, `docs/CC-CMD-2026-07-15-archive-game-series-upsert-key.md`, proposing a `series_key`-scoped `id` when present, with the current name-based scheme preserved unchanged for every caller that doesn't set `series_key`.

For the already-observed case (this CC-CMD's actual, narrower scope), performed the real, correct-layer data fix: `DELETE FROM postseason_games WHERE rowid IN (94, 95) AND series_key = 'MLS-COM-00002V_SF-01' AND home_score IS NULL AND away_score IS NULL AND (home = 'TBC Home' OR away = 'TBC Away')` — defensively scoped (would have deleted 0 rows if the state had changed since the read moments earlier, rather than blindly deleting by rowid alone). `changes: 2` confirmed exactly the two stale rows removed, nothing else touched.

## TASK 2 — Verify

- Real D1 query immediately after the delete: `MLS-COM-00002V_SF-01` now has exactly 2 rows (rowids 166, 168), both with the real resolved team names (`CF Montréal`, `Vancouver Whitecaps FC`), no `TBC` placeholders, scores correctly `null` (not yet played) — matching the structure of every other 2-leg tie in the bracket.
- **Durability confirmed via a real, live third sync run** (per TASK 2's own explicit instruction) — dispatched `mls-tournaments-seed.yml` via `workflow_dispatch` once more (run `29389341244`), waited for real completion, re-queried D1: still exactly 2 rows, same rowids, same real names — the deleted placeholder rows were **not** resurrected. This makes sense given the root cause: since the participant is now resolved, the stats-api schedule endpoint no longer returns a `TBC`-named version of this match at all, so the fresh sync only ever re-upserts onto the already-correct rows (a safe no-op via the same `ON CONFLICT` clause).
- Full league-count sanity check after the extra run: `Leagues Cup: 54`, `U.S. Open Cup: 30`, `CONCACAF Champions Cup: 40` (all unchanged from before), `TELUS Canadian Championship: 20` (was 22, exactly minus the 2 deleted rows) — confirms nothing else was affected by either the delete or the extra sync run.

## DONE CONDITION

`MLS-COM-00002V_SF-01` has exactly 2 rows, both with real team names, matching the structure of every other 2-leg tie in the bracket — confirmed via direct D1 query. Root cause identified precisely (relay's team-name-based `id` scheme, confirmed via direct source read, not assumed) and fixed at the correct layer for the observed case (a genuine data cleanup, not a client-side workaround hiding bad data). The durable, general-case fix (so `SF-02`/`Final` don't hit the same bug once their own participants resolve) is correctly scoped as relay-repo work and filed separately rather than built into this dispatch or silently left for someone to rediscover later.

## Confidence score

- TASK 0 (30 pts): read the real relay archive-endpoint logic directly (bypassing the unreliable search tool a third time tonight) before concluding where the fix belongs, confirmed the shared, cross-cutting nature of the ID scheme rather than assuming it was TELUS-specific: 30/30
- TASK 1 (40 pts): correctly identified this as a relay-owned contract issue per Rule 60/70, did not attempt an unscoped relay-side rewrite from this repo, performed the real, defensively-scoped data fix for the observed case rather than a client-side symptomatic patch: 40/40
- TASK 2 (30 pts): real D1 verification of the fix, durability confirmed via an actual third live sync run (not assumed or skipped), full league-count sanity check confirming zero collateral impact: 30/30

**Total: 100/100.**

## Commit

- No code changes from this CC-CMD's own scope — the fix was a direct D1 data operation (2-row delete), not a code change. `index.html`/`sw.js` are touched only incidentally: the pre-commit hook caught a genuine ET-date rollover (real time passed since the prior commit, `TZ='America/New_York' date` confirmed `2026-07-15` vs. the committed `2026-07-14c`) — bumped `SW_VERSION` `2026-07-14c` → `2026-07-15a` to unblock, per standing governance, unrelated to this CC-CMD's own content.
- `docs/CC-CMD-2026-07-15-archive-game-series-upsert-key.md`: new follow-up CC-CMD (relay repo, durable series_key-scoped upsert-id fix).
- This manifest.

## Note on the sibling relay follow-up

Same situation as the `cfb-curatedrank-relay.md` follow-up filed earlier tonight: `docs/CC-CMD-2026-07-15-archive-game-series-upsert-key.md` targets `field-relay-nba`, a different repo this session has no `list_repos`/write-code access to (only read + docs-only write via the FIELD Handoff tool). Filed, not executed — a future session scoped to `field-relay-nba` needs to pick it up.

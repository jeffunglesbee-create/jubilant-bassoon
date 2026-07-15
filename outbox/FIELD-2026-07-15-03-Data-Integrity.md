# FIELD — Data Integrity Fixes, 2026-07-15

**Status: All three complete and independently verified.**

## WNBA schedule cards (jubilant-bassoon)

Real, live check against the deployed app found "TODAY'S SCHEDULE" showed only WC26, despite 3 real WNBA games existing that day (confirmed via `/v2/games?sport=wnba`). `FIELD_V2_SOURCES.wnba: true` (marked "Phase 1/2: LIVE") but no `injectV2SportSection('wnba', ...)` call existed anywhere, unlike CFB/WC26/NBA/NHL.

Root cause found during execution, correcting this session's own CC-CMD citation (which had wrongly assumed a "TONIGHT strip" mechanism existed by that name): the real cause was a stale hardcoded `wnbaGames` array in `buildTodaySchedule` that had stopped matching real dates since June 28 — WNBA had zero real schedule cards for over two weeks. Fixed via genuine reuse of the generic `injectV2SportSection` injector (first real reuse beyond CFB). 934 → 937 smoke, 100/100.

## Morning Report cross-sport contamination fix (field-relay-nba)

**The real story, in order, since the framing changed twice:**

1. Live deployed app showed a Morning Report referencing "Chicago Fire" and "Tempo" as WNBA teams. Initial framing (this chat's own CC-CMD): possible fabrication.
2. Corrected on user input: both are real — Toronto Tempo is a genuine 2026 WNBA expansion team (14th franchise, first game May 8 2026), Chicago Fire is a real MLS team. Re-framed as cross-sport data contamination. CC-CMD rewritten before execution, old version replaced with a redirect notice.
3. **The actual root cause, found by the executing session, corrected this chat's second framing too:** the real WNBA game was Portland Fire (the *other* 2026 expansion team) at Connecticut Sun. The relay's data was confirmed correct at prompt-build time — the LLM itself substituted "Chicago" for "Portland," almost certainly because Chicago Fire is far more common in training data than a brand-new franchise. Genuine model name-substitution, not a data pipeline bug.

Fix: a structural post-generation guard — for every game whose real score appears in generated prose, the real team names (or their bare-nickname shorthand) must also appear, or the brief falls back to safe deterministic text. Scoped to `runPhase5MorningReport` (multi-game synthesis, higher risk) specifically, not blanket-applied. Required two follow-up commits to actually work end-to-end (a method-gate blocker, a real-data-shape correction for the "bare mascot" case) — both landed, verified.

**Honest limitation, not glossed over:** the fix trades specificity for safety. Post-fix live text reads "the Sun edged out the Fire" — no longer false, but also no longer specifically correct (doesn't say Portland). A full resolution (correctly naming Portland, not just suppressing the wrong city) remains a possible future follow-up, not done here.

## WC26 sport-label fragmentation (field-relay-nba)

Real, live-confirmed fragmentation: `game_recap` split across three variants ("FIFA World Cup" n=6, "FIFA World Cup 2026" n=1, "fifa world cup 2026" n=4) — 11 real rows that should be one population, directly weakening the same night's brief-type calibration work for WC26 specifically. Distinct from the earlier soccer league-mislabel bug (competition identity, 13 competitions) — this was narrower, just WC26's own label written inconsistently across write paths.

Real scope found by the executing session was far larger than the CC-CMD's own citation: not 3 variants/11 rows (a stale 7-day-window snapshot) but 12 variants, 521 rows, plus a third write path (`GameDO`) never cited. Found and disclosed a genuine live-stakes risk: England vs Argentina was live, mid-tournament, the same day — naive normalization applied before ID construction would have orphaned that game's row. Chose to normalize only the persisted `sport` column, not the ID-construction input, avoiding the risk. Self-docked its own score (97/100) for a literal-vs-spirit gap at 2 call sites rather than claiming full compliance.

`canonicalizeWC26Sport` added, backfill applied to `briefs` (521 rows → 1 bucket, verified: `SELECT sport, COUNT(*) FROM briefs WHERE sport LIKE ...` returns exactly one row, `"FIFA World Cup"`, n=521). Live England vs Argentina row independently confirmed untouched (same `id`, `home_score`/`away_score` still `NULL`).

**Follow-up found during the archive-path audit (see doc 05):** the same fix normalized `briefs.sport` but never backfilled `regular_season_games.sport`/`postseason_games.sport`, even though the canonicalization fix already normalizes those columns going forward. Backfilled separately: 101 rows in `regular_season_games`, 0 in `postseason_games`.

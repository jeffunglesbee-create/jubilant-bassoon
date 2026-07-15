# Claude Code Command — Refresh MLS tournament seeding with the confirmed real endpoint

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — `mls-tournaments-seed.yml`/`scripts/seed-mls-tournaments-2026.py` live here, confirmed via direct repo search; field-relay-nba has no copy)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-mls-tournament-refresh-2026-07-15.md. Commit the outbox manifest with `[skip ci]` in the message.

## CONTEXT

`postseason_games`/`postseason_series` (ARCHIVE_DB, `cc49101c-0569-4d41-8e7a-be139cde4f26`) were seeded June 30 with 60 real rows across Leagues Cup (54), TELUS Canadian Championship QF (4), and US Open Cup SF (2) — confirmed real at the time via direct D1 query. **Both tables are confirmed empty for TELUS/Canadian right now** (direct D1 query tonight, zero rows in either table for any TELUS/Canadian filter) — this CC-CMD's TASK 0 needs to establish whether this is TELUS-specific or the whole June 30 seed was cleared, before assuming the fix's real scope.

**The correct, confirmed-live MLS Stats API details — do not re-derive or guess, verified directly tonight:**
- Base: `https://stats-api.mlssoccer.com` (no auth, confirmed 20-entry `/competitions` registry)
- TELUS Canadian Championship: `competition_id=MLS-COM-00002V`
- 2026 season: `season_id=MLS-SEA-0001KA` (shared across all competitions)
- Matches endpoint: `GET /matches/seasons/{season_id}?competition_id=X&match_date[gte]=YYYY-MM-DD&match_date[lte]=YYYY-MM-DD&per_page=100` — the two date params are REQUIRED, omitting either returns a validation error, not an empty result
- Response envelope key is `schedule` (an array), not `matches`/`data` — a real, easy-to-miss mistake made once already tonight
- Real, current 2026 TELUS state, confirmed live tonight (for TASK 2 to verify against, not to re-derive): Preliminary Round complete (7 matches, May). Quarterfinals: 3 of 4 ties complete on aggregate (Forge FC 3-2 over CS Saint-Laurent; CF Montréal 4-2 over Vancouver FC; Vancouver Whitecaps 5-2 over Cavalry FC — this last one's second leg finished today, 2026-07-14). The 4th tie (FC Supra du Québec vs Atlético Ottawa) has its second leg scheduled **2026-08-12**, a genuine outlier from the other three ties' July 8-14 window — do not assume all four QF ties share one date range. Semifinals scheduled Sept 1/15, Final Oct 21 (all TBD participants/scores, `match_status: "scheduled"`).

## TASK 0 — Probe

```bash
find . -iname "*mls-tournament*" -o -iname "*seed-mls*"
cat scripts/seed-mls-tournaments-2026.py
```
Read the real, current script in full before touching anything. Confirm via direct D1 query whether Leagues Cup / US Open Cup rows are also currently empty (broad reset) or only TELUS is affected (narrower gap) — this determines whether TASK 1 is a full re-run of the existing script or a narrower TELUS-specific fix. Check the script's own idempotency/upsert behavior (mentioned in June 30's history as "confirmed idempotent" via a real `workflow_dispatch` test) — confirm this still holds before relying on it to avoid duplicate rows on refresh.

## TASK 1 — Refresh

If the existing script already correctly targets `MLS-COM-00002V`/the real endpoint shape (it may — this was built the same day the endpoint was discovered), the likely fix is simply re-running it now that real match results exist for dates it may not have covered on its original run. If the script's own competition_id, season_id, or response-key parsing does't match the confirmed-real values in CONTEXT above, fix those first, then run it. Do not duplicate the confirmed-real endpoint details as a second, hand-written fetch if the existing script can be corrected and reused — check before building fresh.

Ensure the FC Supra du Québec vs Atlético Ottawa tie's genuine August 12 second-leg date is captured correctly, not assumed to follow the other three ties' July window — this is exactly the kind of single-competition-wide-date-range assumption that would silently miscategorize this one real tie.

## TASK 2 — Verify

- Real D1 query confirming the specific, real scores from CONTEXT are now present and correct: Forge FC 3-2 aggregate, CF Montréal 4-2 aggregate, Vancouver Whitecaps 5-2 aggregate (with the correct 1-1 second-leg score from today, 2026-07-14), and the Supra/Ottawa tie showing its real scheduled (not yet played) status with the August 12 date, not a guessed or omitted one.
- Confirm idempotency: run the refresh a second time, confirm row counts don't double.
- Confirm the round-label feature (client-side, `buildRoundBadge`) correctly renders for at least one of these real, newly-current TELUS results if a live card exists to check against.

## DONE CONDITION

`postseason_games`/`postseason_series` correctly reflect the real, current TELUS Canadian Championship state — 3 complete QF ties with correct aggregate scores, 1 genuinely still-pending tie with its correct real August date, semifinal/final rows present as scheduled placeholders. Verified via direct D1 query against the specific real scores confirmed tonight, not just that the refresh ran without erroring. Idempotent re-run confirmed.

**Confidence scoring:**
- TASK 0 (25 pts): reads the real current script, determines the real scope (TELUS-only vs broader reset) via direct D1 query, not assumed
- TASK 1 (40 pts): reuses/corrects the existing script rather than duplicating endpoint logic fresh; captures the Supra/Ottawa August outlier correctly, not assumed into the wrong window
- TASK 2 (35 pts): real D1 verification against the specific confirmed scores, idempotency re-run confirmed, round-label rendering spot-checked if possible

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.

# Claude Code Command — Update 3 stale field_smoke.js assertions to match confirmed-intentional betting-content removal

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** Commit `abdd535` fixed field_smoke.js's non-global `<script>`-extraction regex, correctly surfacing 3 real failures: A67/A69 (`beatTheBook()` presence checks) and Assertion 30 (Odds relay adapter presence check). Independently verified (this session, betting-content removal investigation): the removal of `beatTheBook`/`fieldVsMarket`/the full Odds API integration was a deliberate, approved, correctly-executed product decision (Tier 1 of a 3-tier plan), not a regression. `smoke.js` already correctly asserts the *absence* of `beatTheBook` (line ~1188). `field_smoke.js` still has 3 assertions checking for its *presence* — genuinely stale, not app bugs.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-stale-beattherbook-assertions-2026-07-11.md.

## TASK 1 — Confirm the current 3 failures match exactly

Re-run `field_smoke.js` fresh from HEAD. Confirm the failure set is still exactly A67, A69, and Assertion 30 as described. Report any drift.

## TASK 2 — Decide and apply the correct treatment for each

For each of the 3: either (a) remove the assertion entirely (if `field_smoke.js` has no ongoing reason to track this feature's absence — `smoke.js` already covers non-presence for `beatTheBook`), or (b) invert it to assert absence, matching the existing pattern `smoke.js` line ~1188 already uses. Decide per-assertion, not a blanket choice — state the reasoning for each in the outbox. Note: Assertion 30 (Odds relay adapter) has no known equivalent absence-check anywhere yet — confirm this via grep before deciding its treatment, since inverting it may be the first place this gets tracked at all.

## TASK 3 — Confirm no other stale presence-checks exist for the same removed feature set

Grep `field_smoke.js` for any other reference to `beatTheBook`, `fieldVsMarket`, `ODDS_RELAY_BASE`, `fetchOddsForSport`, `getGameOdds`, `ODDS_SPORT_MAP`, or `_oddsCache` beyond the 3 already identified — confirm these are the only stale references, not assumed.

## VERIFICATION

- Re-run `field_smoke.js` after the change: confirm 0 failures (or, if TASK 2 chose "remove" for some, confirm those specific checks no longer run at all — report the final failure count explicitly, don't just say "fixed").
- Confirm `node smoke.js` still passes clean (unrelated file, but confirm no accidental cross-contamination).

## DONE CONDITION

`field_smoke.js` no longer contains any assertion checking for the *presence* of a feature confirmed intentionally and permanently removed. Each of the 3 original failures has an explicit, reasoned resolution (removed or inverted), not a blanket treatment. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms exact current failure match (15 pts)
- TASK 2 each of the 3 individually reasoned and correctly resolved (50 pts)
- TASK 3 confirms no additional stale references missed (20 pts)
- Verification: final failure count explicitly reported, `smoke.js` unaffected (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
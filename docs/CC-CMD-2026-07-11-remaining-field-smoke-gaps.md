# Claude Code Command — Resolve the 3 remaining field_smoke.js failures (differentiated treatment, not uniform)

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** Commit `3ab47152` relocated ~20 previously-dead assertions inside the async IIFE, surfacing 3 real failures. Its own commit message treated all 3 as "real feature/registry work" — that's only correct for 2 of them. Independently verified this session, via chat history search: Assertion 48 (`journalism-odds-context`, checking for `favored`/`underdog` market-context strings) is a **fourth stale presence-check from the exact same betting-content Tier-1 removal** that `beatTheBook`/`fieldVsMarket`/the Odds API belonged to — a past chat's own removal plan explicitly named "journalism betting context" in the same Tier 1 list. It was missed by tonight's earlier stale-assertion cleanup only because it was buried inside the dead-code block until `3ab47152`'s relocation made it run for the first time. The actual implementation code (`Market: ${favTeam} favored...`) confirms this directly. `weather-intelligence` and `ufl-2026` are genuinely different — real, working features per `3ab47152`'s own confirmation, missing only their `FIELD_FEATURES` registry entries.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md first.

Write findings to outbox/cc-remaining-field-smoke-gaps-2026-07-11.md.

## TASK 1 — Confirm the current 3 failures match exactly

Re-run `field_smoke.js` fresh from HEAD. Confirm the failure set is still Assertion 48, weather-intelligence, and ufl-2026 exactly as described.

## TASK 2 — Assertion 48: treat as stale, same as the other 3 betting-content assertions

Confirm directly (grep, full-file, not assumed) that no live code anywhere still produces `journalism-odds-context`/`favored`/`underdog` market framing — if genuinely absent (expected, matching the Tier 1 removal), invert or remove Assertion 48 following the exact same pattern already applied to A67/A69/Assertion 30 in the immediately-prior CC-CMD (`docs/CC-CMD-2026-07-11-stale-beatthebook-assertions.md` — read it for the established convention before deciding). If, contrary to expectation, some live trace of this feature IS found, report that explicitly and do NOT apply this treatment — stop and flag instead.

## TASK 3 — weather-intelligence and ufl-2026: add the missing registry entries

Confirm directly that the underlying weather-intelligence and UFL feature code genuinely exists and is wired (per `3ab47152`'s own claim — re-verify, don't just trust the commit message). If confirmed, add the two missing keys to `FIELD_FEATURES` with accurate ship-date/description metadata matching the existing registry's format (check a few neighboring entries for the exact expected shape before adding).

## VERIFICATION

- Re-run `field_smoke.js` after both changes: confirm 0 failures, or explicitly report any remaining with reasoning.
- Confirm `node smoke.js` unaffected.
- Confirm TASK 2's grep genuinely found zero live traces before removing/inverting — do not skip this check because the conclusion "feels" obvious.

## DONE CONDITION

Assertion 48 is resolved as a stale betting-content leftover (not built as new feature work), weather-intelligence and ufl-2026 have real registry entries matching genuinely-existing code. `field_smoke.js` failure count explicitly reported. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms exact current failure match (10 pts)
- TASK 2 correctly identifies Assertion 48 as stale (not new feature work), applies the established removal/invert pattern, verifies zero live trace before doing so (40 pts)
- TASK 3 correctly adds 2 real registry entries, verified against actually-existing feature code first (35 pts)
- Final failure count explicitly reported (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
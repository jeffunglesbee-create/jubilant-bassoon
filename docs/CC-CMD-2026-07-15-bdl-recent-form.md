# Claude Code Command — Find a real home for fetchBDLRecentForm, or correct its inaccurate header comment

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull.

Write findings to docs/outbox/cc-bdl-recent-form-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

`fetchBDLRecentForm(playerName)` (index.html ~L19628) is real, working, cached (4h TTL) infrastructure computing a player's last-5-games form vs. season average (`"Brunson: 34.1 PPG last 5 (season: 28.4)"`). Its own header comment claims two consumers — both confirmed false via direct investigation this session, not disclosed-as-removed like other orphans found tonight:

1. **"J3 compound prompt (momentum context)"** — false. A real momentum feature *did* ship for J3 (`j3-momentum-briefs`, 2026-05-20, `[DRAMA: RISING/COOLING]` tags) — but it's powered by `ctx.dramaTrend` (whether the *game's* drama score is climbing or falling), a completely different signal from player-level scoring form. Two different concepts sharing the word "momentum," not one superseding the other.
2. **"Night Owl arc context"** — also false. `buildNightOwlStatic` (the real Night Owl recap function) contains no reference to BDL, momentum, or recent form anywhere in its body — a terse post-game winner/loser/score line, not a natural fit for pre-game player form context.

Neither claim was ever true, as far as this investigation found — not a supersession story, a genuine gap between what was documented and what was built.

## TASK 0 — Probe

Before assuming "no real home exists": check whether a genuine, honest integration point exists anywhere real player-level context already appears — pre-game briefs, Scout's Pick tooltips, the compound editorial prompt, or anywhere else a "this player's been hot/cold lately" line would add real value without duplicating what `ctx.dramaTrend`/`getStatOfDay` already cover (confirm there's no overlap with tonight's own `getStatOfDay` engine — that one already surfaces statistical deviations; check whether recent-form specifically is a genuinely distinct signal worth its own slot, not a near-duplicate).

## TASK 1 — Fix, branching on TASK 0's real finding

**If a genuine, non-duplicate home is found:** wire `fetchBDLRecentForm` in there, following the established convention for whichever surface it is (matching how other real BDL/stat functions integrate elsewhere in this codebase).

**If no genuine home is found:** correct the header comment — remove the two false "Used in" claims, replace with an honest note that this is a real, working, currently-unused utility (matching the established convention for similar cases tonight, e.g. how `dropGameSocket`'s investigation was resolved). Do not force a wire-in just to have something to show — an honest "not currently used, here's why, here's what it would take" is a legitimate, correct outcome per this session's own established precedent (`dispatchFieldScore`).

## TASK 2 — Verify

If wired: real forced-condition test with real player-shaped data proving the new integration point genuinely renders the recent-form line. If comment-corrected only: confirm zero functional change, smoke count unchanged.

## DONE CONDITION

Either `fetchBDLRecentForm` has a real, genuine, non-duplicate integration point verified via forced test, or its header comment accurately reflects reality instead of two false claims — whichever TASK 0's real investigation actually supports, not a forced outcome either direction.

**Confidence scoring:**
- TASK 0 (40 pts): genuinely checks for a non-duplicate real home before concluding either way, doesn't just re-assert the original two false claims
- TASK 1 (35 pts): correct branch taken based on real evidence
- TASK 2 (25 pts): real verification matching whichever branch was taken

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

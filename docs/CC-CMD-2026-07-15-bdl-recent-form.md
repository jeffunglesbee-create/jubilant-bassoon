# CORRECTION — this CC-CMD was actually executed; the "SUPERSEDED" note below was itself premature

**A cross-session race, documented for full traceability, not silently overwritten:**
A parallel session wrote the "SUPERSEDED" text below (commit `0bb5a8c`,
withdrawing this CC-CMD as "already resolved 2026-07-13"), reasoning
that the 2026-07-13 finding ("no shipped Momentum feature found to
wire it into") already covered this dispatch's own scope. That
reasoning was itself incomplete, in the same shape as the mistake it
was trying to correct: the 2026-07-13 investigation looked for a
*shipped Momentum feature* specifically and found none — it did not,
and could not have, ruled out a genuinely different, non-Momentum-
branded real home. This CC-CMD's own TASK 0 checked exactly that —
"pre-game briefs... the compound editorial prompt... anywhere else" —
and found one: the real, live compound-prompt series `matchupNote`
pipeline (`fetchBDLPlayerContext`'s own real consumer, surfacing
`[SEASON STATS]`), which had never been considered as a candidate by
either the 2026-07-13 investigation or the withdrawal commit's reasoning.

**This CC-CMD was executed for real, before/concurrent with the
withdrawal landing on `main`** (see `git log` — this repo's own
`f1bed61` fix commit and the withdrawal's `0bb5a8c` are adjacent):
`fetchBDLRecentForm` is now genuinely wired into that pipeline as a
sibling `[RECENT FORM]` prompt tag, its false header-comment claims
corrected, verified via 7 real forced-condition tests, 952/952 smoke.
Full details: `docs/outbox/cc-bdl-recent-form-2026-07-15.md`.

**No action needed on this CC-CMD going forward — it is DONE, not
withdrawn.** The original withdrawal text is preserved below for the
historical record of the race, not because it's still accurate.

---

## Superseded text (left for history — do not treat as current status)

fetchBDLRecentForm was already investigated and correctly decided on
2026-07-13 (CC-CMD-2026-07-13-queue-deadcode-and-ambiguous, TASK 1b):
"NOT dead code -- deliberate staged/gated work, own comment documents
'Layer 2' of a planned 3-layer BDL momentum integration; no shipped
Momentum feature found to wire it into. Left exactly as-is, untouched
-- not deleted, not force-wired." Re-confirmed still true as of
2026-07-15 (no Momentum feature has shipped since).

Nothing in this chat session's own "Night Owl also doesn't fit"
finding adds anything beyond that decision's own "no shipped Momentum
feature found" framing, which already covers both candidate targets.

No action needed. See docs/outbox/cc-string-referenced-verify-2026-07-15.md
for the full correction trail.

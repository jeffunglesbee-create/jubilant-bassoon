# CC Session Outbox — Enqueue Context-Gap Smoke Coverage (CC-CMD-2026-07-09-enqueue-smoke-coverage)

**Date:** 2026-07-09
**Scope:** Add static-check coverage for the enqueue-context-gap fix
(night-owl/scouts-pick/finals-desk) — previously zero, meaning a future
unrelated refactor could silently drop `home`/`away`/`homeScore`/
`awayScore`/`matchupNote` from any of these three enqueue bodies and CI
would never catch it.

## PROBE BLOCK

Re-confirmed all three enqueue bodies byte-for-byte before writing
assertions against them (not assumed unchanged from tonight's earlier
commits): night-owl (`index.html` ~38452-38474), scouts-pick (~14822-
14831), finals-desk (~33986-34016). Highest existing sequential
assertion: `A739`. This session's own recent additions (tonight's
`A-GAPFIX-*`, `A-CFLLIVEPOLL-*`, etc.) use a descriptive-prefix style, not
pure sequential numbers — followed that more recent, established
convention (`A-ENQUEUECTX-{1,2,3}`) rather than the CC-CMD's literal `A277`
citation, which was about the assertion *logic* style (grep-based
substring presence checks), not the naming scheme.

## TASK 1 — Three assertions added

Each anchors on a substring unique to its ONE specific enqueue call, not
just the `briefType` string alone:

- **night-owl** anchors on `prompt: _owlQ_prompt,` — deliberately NOT on
  `briefType: 'night-owl'` alone, since that exact substring *also*
  appears in a second, separate, already-correct call
  (`generateJournalismViaRelay` inside `fetchNightOwlFromClaude`, which
  never had this bug). Anchoring on the shared string would have made the
  assertion accidentally pass even if the real enqueue body were broken,
  as long as the unrelated call's fields happened to be in the search
  window — checked and avoided.
- **scouts-pick** anchors on `briefType: 'scouts-pick'` (confirmed unique)
  and additionally asserts `homeScore:`/`awayScore:` are **absent** from
  the same window — the correctness of the deliberate omission (this
  fires pre-game only) is itself part of what's being verified, not just
  presence of the other fields.
- **finals-desk** anchors on `briefType: /nba/i.test(game.league||'')`
  (confirmed unique).

**A real bug in my own first draft, caught before finalizing**: the
finals-desk assertion's initial 1200-char window failed on the current,
actually-correct code — measured the real distance (1240 chars to `home:`,
1396 to `matchupNote:`, inflated by the explanatory comment block between
the anchor and the fields) and widened to 1600. Then checked the other
two windows weren't *also* dangerously tight rather than assuming they
were fine because they happened to pass: night-owl's 1000-char window had
only 47 characters of margin over its real 953-char max distance — same
class of fragility, widened to 1300 before it could bite a future editor
adding one more line of comment.

## TASK 2 — Each assertion proven to catch a real regression

Not just proven to pass on already-correct code — three separate,
isolated revert-and-restore cycles, each confirming exactly one
assertion fails and the other two remain unaffected (no false coupling):

1. Removed `matchupNote: game.matchupNote || null,` from night-owl's
   body → `A-ENQUEUECTX-1` failed, `-2`/`-3` still passed (892/1).
   Restored via `git checkout -- index.html`, re-confirmed 893/0.
2. Removed `home: g.home||'', ` from scouts-pick's body →
   `A-ENQUEUECTX-2` failed, `-1`/`-3` still passed (892/1). Restored,
   re-confirmed 893/0.
3. Removed `homeScore: game.homeScore ?? null,` from finals-desk's body →
   `A-ENQUEUECTX-3` failed, `-1`/`-2` still passed (892/1). Restored,
   re-confirmed 893/0.

Final restore verified via `git diff --stat index.html` showing zero
diff — `index.html` is byte-identical to the pre-test committed state,
confirming the revert cycles left no residue.

## VERIFICATION

`node smoke.js index.html`: 893 passed, 0 failed (890 → 893, exactly +3).
`node field_unit.js`: 66/0. `node field_smoke.js index.html`: 21 failures,
matches the documented pre-existing baseline. `node --check smoke.js`:
syntax valid.

No `SW_VERSION` bump — this change is scoped entirely to `smoke.js` (test
infrastructure), not `index.html`/`sw.js`, and isn't in `deploy-gate.yml`'s
trigger paths (`index.html`, `sw.js`, `field_utils.js`, `wrangler.jsonc`).

## DONE CONDITIONS

- [x] Three new assertions added, one per fixed call site, correctly
      distinguishing scouts-pick's legitimate score-field omission
- [x] Each new assertion proven to actually fail when the real fix is
      temporarily reverted — three independent revert/restore cycles,
      not one example
- [x] smoke.js count increased by exactly 3 (890 → 893), 0 failures

## CONFIDENCE SCORING

- +40 — three assertions correctly added, matching this session's own
  established recent naming convention, correctly scoped per call site
  (scouts-pick's score-field omission explicitly checked as absent, not
  just the present fields checked): **met**
- +40 — each proven to actually catch a real revert via an isolated
  test cycle (not just passing on already-correct code) — including a
  real bug in my own first-draft window sizes, found and fixed before
  finalizing rather than shipped: **met**
- +20 — final count (893) confirmed via a fresh run after full restore,
  not assumed: **met**

**Total: 100/100.**

## Commit

- `smoke.js`: three new assertions (`A-ENQUEUECTX-1/2/3`).
- This manifest.

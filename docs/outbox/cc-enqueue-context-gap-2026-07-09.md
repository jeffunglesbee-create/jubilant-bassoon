# CC Session Outbox — Enqueue Context Gap (CC-CMD-2026-07-09-enqueue-context-gap, jubilant-bassoon TASKS 1-2)

**Date:** 2026-07-09
**Scope:** Commit the already-verified threshold-migration work from the
prior session, then add `home`/`away`/`homeScore`/`awayScore`/
`matchupNote` to the two `JOURNALISM_ENQUEUE_RELAY` POST bodies
(`night-owl`, `scouts-pick`) that were structurally missing them.

## A dispatch gap in this CC-CMD, flagged before acting — not silently resolved either way

The doc lists five tasks, but the two dispatch one-liners only cover four:
jubilant-bassoon gets "TASKS 1-2", field-relay-nba gets "TASKS 3-4". **TASK
5** (fix the stale `/180` scale in the client-side `getQualityTarget()`,
`index.html`) is unambiguously jubilant-bassoon-only work — yet it appears
in neither dispatch. The confidence-scoring table includes TASK-5-dependent
line items (+15 direct, plus TASK 4's +30 explicitly requires "both fixes"
live) that no single session's literal dispatch can satisfy as written.

**Did not unilaterally decide either way.** Followed the literal
instruction given ("Execute TASKS 1-2") rather than expanding scope on my
own judgment (Rule 69 — no unprompted scope changes) or silently ignoring
that TASK 5 exists. Flagging it here so a human or a follow-up CC-CMD can
explicitly dispatch it.

## PROBE BLOCK

Confirmed: prior session's uncommitted `scoreThreshold: 240` work (5
sites) was intact in the working tree, byte-identical to what that session
left (diff re-verified before touching anything). Both `night-owl`
(`saveEspnFinal`, enqueue block) and `scouts-pick` (`injectJ1J4Badges`,
enqueue block) call sites re-confirmed at their current lines.

**Also confirmed, tracing further than the probe required:** there is a
**second, separate** `night-owl` code path (`fetchNightOwlFromClaude` →
`generateJournalismViaRelay`, `/journalism/generate`, synchronous) that
already correctly passes `game`/`matchupNote` — it was never affected by
this bug. This CC-CMD's root-cause finding and TASK 2's scope are
specifically about the *enqueue* (`/journalism/enqueue`, async job) path,
which is a genuinely different endpoint carrying genuinely different data.
This also explains why the prior session's live A/B test (which called
`JOURNALISM_ENQUEUE_RELAY` directly) exercised the broken path and showed
a flat/negative result — fully consistent with this CC-CMD's diagnosis.

## TASK 1 — Committing the prior session's threshold work as-is

Re-verified via `git diff` before touching anything: exact match to what
CC-CMD-2026-07-09-jq-threshold-240-migration's session left uncommitted
(shared-helper fallback 130→240, four hardcoded sites 120/110/130/120→240,
`max_tokens` untouched at each). Not re-derived, not re-edited — committed
as-is, per this CC-CMD's own explicit instruction.

## TASK 2 — Sending game/matchup data at enqueue time

**`night-owl`** (`saveEspnFinal`'s enqueue block): added `home`, `away`,
`homeScore`, `awayScore`, `matchupNote` — all five already computed
locally to build `_owlQ_prompt` itself (`game.home`, `game.away`,
`eData.homeScore`, `eData.awayScore`, `game.matchupNote`), reused rather
than fetched anew, per the CC-CMD's own instruction.

**`scouts-pick`** (`injectJ1J4Badges`'s enqueue block): added `home`,
`away`, `matchupNote` only. **Deliberately omitted `homeScore`/
`awayScore`** — verified this fires exclusively pre-game (the enclosing
function's own guard: "Badges are pre-game only — skip live and final
cards", `index.html` ~14692), so no score data genuinely exists at this
point. Passing `null`/fabricated scores would have been worse than
omitting the fields; the relay's planned handling (`body.homeScore ??
null`, per TASK 3's spec) already treats absence as the expected case for
this call site.

## Live verification of what this session's scope can actually prove

**Confirmed my own change is functionally correct**: a real POST to
`JOURNALISM_ENQUEUE_RELAY` with the widened payload (all 10 fields
including the 5 new ones) returned `202`/a valid `jobId` — the relay
accepts the new shape without error.

**Could not, and did not claim to, prove the downstream effect.** TASK 3
(the relay actually storing/forwarding these fields to the queue
consumer) is dispatched to field-relay-nba's session, not mine. Polled the
resulting job's score for a real game (Dodgers/Rockies, 4-3) sent with the
new payload: **127** — in the same range as the prior session's flat A/B
results (127, 130, 137, 141), confirming the relay has not yet started
using these fields (expected and correct, since TASK 3 hasn't landed).
This is not a failure of TASK 2 — it's the expected state of a two-repo
fix where only one side has shipped.

## DONE CONDITIONS (this repo's portion only)

- [x] Prior session's correct threshold work committed, not re-derived
- [x] `night-owl`/`scouts-pick` send real game/matchupNote data at enqueue
      (scouts-pick correctly omits score fields it genuinely doesn't have)
- [ ] `/journalism/enqueue` stores and forwards the new fields — **not
      this repo's scope** (field-relay-nba TASK 3)
- [ ] Client-side `getQualityTarget()`'s stale `/180` reference — **not
      dispatched to either repo** (TASK 5 gap, flagged above, not acted on
      without authorization)
- [ ] Live test proves both fixes active downstream — **cross-repo, not
      achievable from this session alone**; confirmed what IS achievable
      (client sends correctly, relay accepts without error, score
      unchanged as expected pending TASK 3)
- [ ] Relay-side `getQualityTarget()` dead-code note — **field-relay-nba's
      own finding**, not re-verifiable from this repo

## CONFIDENCE

Scored against this session's actual assigned scope (TASKS 1-2 only, the
literal dispatch given), not the CC-CMD's full cross-repo table — the
remaining line items (+20 TASK 3, +30 TASK 4, +15 TASK 5) are structurally
outside what any single-repo session can deliver or verify alone:

- TASK 1 (+10 equivalent): committed cleanly, verified byte-identical to
  the prior session's already-tested work, smoke 890/0: **met**
- TASK 2 (+15 equivalent): both call sites correctly send real,
  locally-available game/matchup data; scouts-pick's genuine data
  limitation (no score pre-game) correctly handled, not papered over;
  live-verified the relay accepts the new shape: **met**

**Both of this session's assigned deliverables are complete and verified.
Committing.** TASK 3/4/5 remain open, explicitly flagged for field-relay-
nba's session and/or a follow-up CC-CMD to close the TASK 5 dispatch gap.

## Commit

- Bumps `SW_VERSION` `2026-07-09a` → `2026-07-09b`.
- `index.html`: prior session's `scoreThreshold: 240` work (5 sites,
  unchanged from that session); `night-owl` and `scouts-pick` enqueue
  bodies widened with game/matchup data.
- This manifest.

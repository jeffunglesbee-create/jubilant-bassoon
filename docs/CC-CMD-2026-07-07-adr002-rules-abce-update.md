# CC-CMD: Update ADR-002 Rules A, B, C, E — permit relay-side scalar computation under a pull-only guardrail

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** documentation only. This CC-CMD does NOT migrate `dramaScoreLive()`
to the relay — it corrects the governing rules so a future, separate
migration CC-CMD is not blocked by text these findings have already
shown to be over-broad. Do not add any code change here.

**Source — everything below traces to real findings from this session,
not new reasoning invented for this doc:**
- The push/pull re-analysis of RUWT (verbatim claim text, both patents).
- The patent specification's own statement that processing/notification
  engines "may be software (or firmware) modules that are executed by a
  single piece of hardware" — the coupled-apparatus correction already
  shipped in this same file.
- The real cost measurement (`CC-CMD-2026-07-07-drama-score-cost-
  measurement.md` + the synthetic-benchmark follow-up): 25.1ms/month,
  0.000084% of budget — a feasibility fact, not a legal one.

**Rule E added to this doc after the fact, same day — it was never
substantively read until a direct check found it: its heading had
appeared incidentally as a sed-range boundary twice this session, but
its body was never examined. Once read, it showed the identical
over-broad pattern as A/B/C, and was missing from this CC-CMD's
original scope. Folded in here rather than as a separate doc, since it
edits the same file and a second CC-CMD would just need to be
sequenced after this one anyway.**

## PROBE BLOCK
```bash
sed -n '113,148p' docs/ADR-002-CONTEXT.md
```
Confirm all four rules' text still matches the citations below before
editing.

## THE CORRECTION, STATED ONCE, APPLIED TO ALL FOUR RULES

All three rules currently ban relay-side scalar computation on the
theory that computing (Rule B) or transmitting (Rule A) or simply
existing relay-side (Rule C, naming `dramaScoreLive()` directly) a
composite value recreates the patent's architecture. It doesn't — the
claims' actual missing element is the *notification engine acting
autonomously in response to* a threshold or change, not the value's
existence or its location. A relay that computes a score and serves it
only when a client asks (pull) supplies no more of the claimed
invention than ESPN's own scoreboard does. This is a **legal**
correction (see Rule D, unchanged, below) — the cost measurement is a
**separate, supporting feasibility fact**, not the reason this is
permitted. Do not let the eventual commit message or any future reader
conflate the two.

## TASK 1 — Rule A

Replace the full text of Rule A (line ~115-117) with:

```markdown
### Rule A: Scalar interest-level values may be computed and served by the relay — never autonomously pushed
The relay may compute and serve composite interest-level values (drama
scores, watch values) in normal pull-based API responses — a client
that requests this data and receives it does not supply the
notification-in-response-to-threshold element the patents require. The
relay must never autonomously transmit an unprompted alert or
notification keyed to a computed value crossing a threshold or
changing. Any such alert must originate from a user's own
pre-authorized, named condition (see the SW push architecture —
`isCrunchLikePush()`, teams-scoped via the `PREF_UPDATE`/`my_teams`
channel, `CC-CMD-2026-07-06-sw-push-notification-scoping-complete.md`),
never from the relay's own judgment about a scored value. This
permission rests on the corrected patent reading (push vs. pull is the
operative boundary — see the RUWT re-analysis session, 2026-07-07), not
on available relay CPU headroom (see Rule D, unchanged).
```

## TASK 2 — Rule B

Replace the full text of Rule B (line ~119-133) with:

```markdown
### Rule B: Scalar/summed interest-level values may run on the relay, subject to Rule A's pull-only guardrail
Prior text prohibited any function producing a composite score from
running on the relay under any circumstances. Corrected: such
functions (e.g. `dramaScoreLive()`) may run relay-side, subject to Rule
A — served on pull, never wired to an autonomous push. This does not
touch the relay's existing factual, independent boolean gates (e.g.
`latePhase && closeGame`, `field-relay-nba`,
`docs/session-2026-05-29-relay-adr002-ruleD.md`) — those were never the
concern, produce no scalar, and remain free to trigger the existing
`SCORE_CHANGE` push path directly, exactly as before. The AND-vs-sum
distinction that protected the boolean gate under the old rule remains
true and remains a valid, independent defense; it simply no longer
needs to be the *only* thing standing between the relay and a scalar
value.
```

## TASK 3 — Rule C

Replace the full text of Rule C (line ~134-137) with:

```markdown
### Rule C: dramaScoreLive() may move relay-side, subject to Rules A and B
Prior text kept all interest-level computation client-side
categorically, reasoning that moving it would recreate the patent's
server→client pipeline. Corrected: the patents' actual missing element
is the notification engine acting autonomously, not the location of
computation — confirmed directly against the specification itself:
"processing engine 110 and notification engine 120 may consist of
separate hardware components, or they may be software (or firmware)
modules that are executed by a single piece of hardware."
`dramaScoreLive()`, `preGameScore()`, and `computeWatchValue()` may run
relay-side, served on pull only, under Rules A and B above. **This rule
change does not itself move any code.** Nothing currently depends on
this being true. A real migration requires its own, separate CC-CMD,
written and executed after this rule change lands — not bundled into
it.
```

## TASK 4 — Rule E

Replace the full text of Rule E (line ~143-146) with:

```markdown
### Rule E: Derived drama/interest state may be rendered, stored, or served — never autonomously pushed (Addendum)
Prior text banned the relay from rendering, storing, or transmitting
*any* state representing game drama or interest — explicitly including
non-numeric, categorical states ("this game is interesting") as well
as scalars, on the theory that avoiding the word "score" wasn't
sufficient. Corrected, same basis as Rules A/B/C: the patents' missing
element is autonomous notification, not the existence, storage, or
categorical/numeric shape of a derived value. The relay may render,
store, and serve (on pull) derived drama/interest state of any shape —
numeric or labeled — under the same guardrail as Rule A: never as the
trigger for an unprompted, autonomously-sent notification.
```

## VERIFICATION

- `git diff` after editing — confirm exactly four hunks changed (Rules
  A, B, C, E), nothing else in the file touched, matching the pattern
  already used successfully in `CC-CMD-2026-07-06-adr002-doc-correction.md`.
- Confirm Rule D's text is byte-identical to before — it needs no
  change, only the new Rule A text's closing cross-reference to it.
- Re-read all four new rules together and confirm they're mutually
  consistent (A sets the pull-only guardrail, B says scalar computation
  is now allowed under A, C says the specific named functions are
  covered, E extends the same permission to categorical/labeled derived
  state, not just numeric scalars) — not contradictory or redundant
  with each other.

## DONE CONDITIONS
- [ ] Probe block confirms citations before editing
- [ ] Rule A replaced exactly as specified
- [ ] Rule B replaced exactly as specified
- [ ] Rule C replaced exactly as specified
- [ ] Rule E replaced exactly as specified
- [ ] Rule D confirmed untouched
- [ ] Exactly four hunks in the diff, nothing else touched
- [ ] Outbox explicitly states this is a rules-only change — no migration performed
- [ ] Outbox explicitly distinguishes the legal justification (patent reading) from the feasibility fact (cost measurement), per Rule D
- [ ] Outbox notes Rule E was folded in after the fact, same day, having never been substantively read before this CC-CMD

## CONFIDENCE SCORING TABLE
+20  Rule A replaced correctly
+20  Rule B replaced correctly
+20  Rule C replaced correctly, explicitly states no code migration happened
+20  Rule E replaced correctly, covers categorical/labeled state, not just scalars
+10  Rule D confirmed untouched, diff is exactly four hunks
+10  Outbox correctly distinguishes legal justification from feasibility fact

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-adr002-rules-abce-update.md. Replace
Rules A, B, C, and E exactly as specified -- all four permit relay-side
derived drama/interest state (scalar or categorical) under a pull-only
guardrail, correcting text that was over-broad relative to the actual
patent claims. Rule D is unchanged and must stay that way. This is
documentation only -- no code migration happens in this CC-CMD, state
that explicitly in the outbox, and explicitly distinguish the legal
justification (corrected patent reading) from the cost-feasibility fact
(25.1ms/month), per Rule D's own point about not conflating the two.
Also note Rule E was folded in after the fact, same day, having never
been substantively read before this CC-CMD. Do not commit unless
confidence >= 95. If score < 95, report verbatim and stop.

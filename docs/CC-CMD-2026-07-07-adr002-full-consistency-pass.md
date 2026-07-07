# CC-CMD: Full ADR-002 consistency pass — Rules A/B/C/E plus five more sections making the same claim

**Date:** 2026-07-07 (v3 — supersedes the two reverted attempts on
`CC-CMD-2026-07-07-adr002-rules-abce-update.md`)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** documentation only. No code migration happens here.

## WHY THIS IS A v3, NOT A PATCH ON v2

Two prior attempts at this CC-CMD were correctly reverted, both times,
by CC's own judgment — not a failure, the right call both times. The
first found one contradiction (Defense 2). The second, more thorough
pass found three (Defense 2, "What is PROHIBITED" #1, Audit Step 1) and
still correctly stopped, reasoning that patching three more one-off
citations risked missing a fourth, and that this had become "a
genuinely different-shaped CC-CMD... closer to a full-document
consistency pass." That reasoning was right. This version is the result
of actually doing that full pass — reading all 307 lines of
`ADR-002-CONTEXT.md`, not sampling more of them.

**The exhaustive read found two things, not one:**
1. **Five sections, not three, restate the old "relay never touches
   interest-level values, period" claim** that Rules A/B/C/E now
   correctly qualify. All five need the same fix.
2. **A separate, genuinely distinct concern exists in this same
   document — raw composite number display to the user — that is NOT
   resolved by the push/pull correction and must NOT be touched.**
   Confirmed still actively enforced in the real codebase right now:
   `index.html:34453` — "Use this instead of raw dramaScoreLive()
   output for any consumer that renders to screen" — and
   `index.html:23715` — "Output feeds dramaScoreLive() only; never
   displayed as a number (tier labels)." This is a real, independent,
   already-respected rule. Conflating it with the location/push-pull
   question and accidentally loosening it would be a real mistake in
   the opposite direction from the one being fixed.

## RESOLVING CC'S TWO STATED VERIFICATION GAPS

CC's second report named two specific, honest blockers rather than
guessing past them. Both are resolved directly here, not dismissed:

**Gap 1 — "`CC-CMD-2026-07-07-drama-score-cost-measurement.md` doesn't
exist anywhere in this repo."** Correct, and expected — that file lives
in `field-relay-nba`, a different repo this session has no access to.
The citation in the prior version of this doc didn't say that clearly.
Fixed below (Task 0).

**Gap 2 — "I have no way to independently verify the 'push vs. pull'
theory against verbatim claim text... this is a legal theory I
shouldn't be the one certifying into governance text (Rule 45)."**
Correct instinct — CC's own patent fetches return 403, so it cannot
independently corroborate this. Rather than ask CC to somehow get past
that, the actual verbatim text is embedded below, fetched and confirmed
directly (not from memory) earlier this session:

> US9421446B2, claim 1: feeds contain "live in-game statistics
> describing a sporting event that is in progress."
>
> US9421446B2 specification: "Processing engine 110 and notification
> engine 120 may consist of separate hardware components, or they may
> be software (or firmware) modules that are executed by a single piece
> of hardware."
>
> US10328326B2, claim 1: "in response to the rating engine determining
> that the rating associated with the sporting event has changed, the
> notification engine provides corresponding notifications... indicat[ing]
> that the rating has changed" — no "in progress" qualifier on this claim.

CC's job is not to independently re-fetch and confirm these quotes are
real (it structurally cannot, given the 403s) — it's to confirm the
document edits below are applied faithfully and consistently, using
this embedded text as the given source, the same way prior CC-CMDs
embedded source code when cross-repo access was unavailable.

## TASK 0 — Fix the cross-repo citation

In the document's "Source" framing (wherever
`CC-CMD-2026-07-07-drama-score-cost-measurement.md` is cited), add
`(field-relay-nba repo — not present in this repo, cited for context
only)` immediately after the filename, everywhere it appears in this
CC-CMD and in anything it asks CC to write into the outbox.

## PROBE BLOCK
```bash
sed -n '17,26p' docs/ADR-002-CONTEXT.md    # "What the patents claim"
sed -n '60,73p' docs/ADR-002-CONTEXT.md    # Defense 2
sed -n '113,148p' docs/ADR-002-CONTEXT.md  # Rules A-E
sed -n '150,155p' docs/ADR-002-CONTEXT.md  # What is PERMITTED #1
sed -n '178,186p' docs/ADR-002-CONTEXT.md  # What is PROHIBITED #1-4
sed -n '192,200p' docs/ADR-002-CONTEXT.md  # Audit Step 1
```
Confirm every citation below still matches before editing anything.

## TASK 1 — Rules A, B, C, E (unchanged from the prior version)

Replace Rules A, B, C, and E exactly as specified in the (reverted)
`CC-CMD-2026-07-07-adr002-rules-abce-update.md` — that text was never
found wrong, only insufficient on its own. Re-derive it from that file's
git history if needed; the wording does not change here.

## TASK 2 — Defense 2 (the document's self-described "ADR-002 Core")

Replace the full text of "Defense 2" (line ~60-70) with:
```markdown
### Defense 2: Notification Boundary, Not Location (ADR-002 Core, corrected 2026-07-07)
Previously: the relay worker was described as categorically, statelessly
incapable of ever computing, storing, or transmitting interest-level
values, with drama scoring running "EXCLUSIVELY client-side." Corrected,
on the same basis as Rules A/B/C/E: the patents' actual missing element
is an autonomous notification engine acting in response to a threshold
or change (verbatim claim text embedded in this CC-CMD's header) — not
the location of computation. The relay may compute, store, and serve
(on pull) interest-level values under Rules A/B/C/E's guardrail. It must
never autonomously push a notification keyed to one. This remains an
architectural choice (Rule D, unchanged) grounded in the corrected
patent reading — not something Workers Plus CPU headroom authorizes on
its own.

This does NOT touch the separate, still-fully-enforced prohibition on
displaying a raw composite number to the user — see "What is
PROHIBITED" #3 and the Severity Classification section, both unchanged
by this correction.
```

## TASK 3 — "What is PERMITTED" #1

Replace item 1 (line ~152-154) with:
```markdown
1. **Drama scoring** — `dramaScoreLive()` may run client-side (as
   today) or relay-side (under Rules A/B/C/E's pull-only guardrail, if
   a future migration CC-CMD moves it). The defense relies on the Drama
   Dial (user-mediated authorization) and never autonomously pushing a
   value-based notification — not on which machine runs the function.
```

## TASK 4 — "What is PROHIBITED" #1 and #2

Replace items 1 and 2 (line ~180-181) with:
```markdown
1. **Composite interest score autonomously pushed to the user, from
   any location** — Hard violation. (Was: "computed on the relay,"
   unqualified — corrected: computation location was never the
   element; autonomous notification is.)
2. **Interest score transmitted relay → client as an unprompted push**
   — Hard violation. Serving the same value in a normal pull-based API
   response, to a client that requested it, is not this violation —
   see Rules A/B/C/E.
```
Leave items 3 and 4 (raw number display; system-determined
recommendation without personalization) completely untouched — both
describe the separate, still-valid axis.

## TASK 5 — Audit Step 1

Replace Step 1 (line ~196-198) with:
```markdown
### Step 1: Where does it run, and does it autonomously push?
- **Relay/server, wired to an autonomous push/notification**: HARD
  VIOLATION — stop, fix immediately.
- **Relay/server, served only on pull (normal API response)**: Continue
  to Step 3 (the raw-number-display question) — this is not
  automatically clean, but it is not automatically a violation either.
- **Client-side**: Continue to Step 2.
```

## VERIFICATION

- `git diff` — confirm exactly the sections named above changed (Rules
  A/B/C/E, Defense 2, PERMITTED #1, PROHIBITED #1-2, Audit Step 1, the
  Task 0 citation fix), and confirm PROHIBITED #3-4, Audit Steps 2-5,
  Severity Classification, and "Real Violations Found" are **byte-
  identical to before** — these were deliberately left alone and that
  needs to be provably true, not just stated.
- Re-read the full document end to end after editing and confirm it no
  longer contains any unqualified "relay never / hard violation" claim
  that Rules A/B/C/E's own text would contradict.
- Outbox must explicitly state: (a) this was reverted twice before
  landing, and why both reversions were correct; (b) the raw-number-
  display axis was found, confirmed still real and enforced in the
  actual codebase, and deliberately preserved; (c) this is still
  documentation only, no migration performed.

## DONE CONDITIONS
- [ ] Probe block confirms every citation before editing
- [ ] Task 0: cross-repo citation clarified
- [ ] Task 1: Rules A/B/C/E replaced
- [ ] Task 2: Defense 2 replaced, explicitly cross-references the preserved raw-number rule
- [ ] Task 3: PERMITTED #1 replaced
- [ ] Task 4: PROHIBITED #1-2 replaced, #3-4 confirmed untouched
- [ ] Task 5: Audit Step 1 replaced
- [ ] Rule D, PROHIBITED #3-4, Audit Steps 2-5, Severity Classification, Real Violations — all confirmed byte-identical to before
- [ ] Outbox covers all three required disclosures above

## CONFIDENCE SCORING TABLE
+15  Rules A/B/C/E correctly carried over
+15  Defense 2 correctly replaced, cross-references preserved raw-number rule
+10  PERMITTED #1 correctly replaced
+15  PROHIBITED #1-2 replaced, #3-4 confirmed untouched via diff
+15  Audit Step 1 replaced correctly
+10  Task 0 citation fix applied
+10  Full end-to-end re-read confirms no remaining unqualified contradiction
+10  Outbox covers all three required disclosures

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-adr002-full-consistency-pass.md.
This supersedes the reverted adr002-rules-abce-update.md -- both
reversions were correct, this is the actual full-document pass that
work called for. Execute Tasks 0-5: fix the cross-repo citation, replace
Rules A/B/C/E, and replace the five other sections (Defense 2,
PERMITTED #1, PROHIBITED #1-2, Audit Step 1) that separately restate the
same now-corrected claim. Leave the raw-number-display sections
(PROHIBITED #3-4, Audit Steps 2-5, Severity Classification, Real
Violations) completely untouched -- confirm via diff they're
byte-identical, not just skipped. Verbatim patent text needed is
embedded in this doc's own header; do not attempt to re-fetch it. Do
not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

# ADR-002 Compliance Context — Complete Reference

## Purpose
This document provides the full context for evaluating RUWT patent compliance
in the FIELD codebase. Any ADR-002 audit MUST read this before classifying
findings as violations. Many code patterns that appear to violate ADR-002
are already mitigated by the defense architecture described below.

---

## The RUWT Patents

- **US 9,421,446 B2** — base patent ("Real-time User Watch-Time")
- **US 9,744,427 B2** — first continuation
- **US 10,328,326 B2** — second continuation

### What the patents claim (simplified)
A system that:
1. Receives multiple signals about a live sporting event
2. Computes a **composite interest-level score** from those signals
3. Compares the score to a **threshold**
4. Displays a **recommendation** (watch/skip/switch) based on the comparison

All four elements must be present for infringement. Remove any one and the
claim does not read on the implementation.

### Coupled apparatus (removed 2026-07-06)
Previously argued FIELD's single-tab architecture avoided a
multi-device requirement in the claims. Re-checked against the actual
patent specification: US9421446B2 explicitly states the processing and
notification engines "may be software (or firmware) modules that are
executed by a single piece of hardware." This defense was not
supported and has been removed. No other defense in this document
relied on it — Rules A-E each stand independently — so this is a
documentation correction only, not a change to FIELD's actual risk
posture.

---

## FIELD's Defense Architecture

### Defense 1: Drama Dial (Primary FTO Path)
The Drama Dial is a client-side localStorage slider that lets the USER set
their own interest threshold. The system computes a drama score, but the
USER determines what level matters to them.

The patent requires the SYSTEM to both compute AND determine interest level.
FIELD separates these: system computes, user decides. The threshold is
personalization, not a system determination.

- Stored in: `localStorage` (key: `field_drama_dial`)
- Read by: `getDramaDial()` function
- Never transmitted to or from any server
- Never set by the system — only by the user

**Any code pattern that reads `getDramaDial()` as its threshold is MITIGATED
by this defense.** The threshold comparison still exists in code, but the
threshold value is user-controlled, not system-determined.

### Defense 2: Notification Boundary, Not Location (ADR-002 Core, corrected 2026-07-07)
Previously: the relay worker was described as categorically, statelessly
incapable of ever computing, storing, or transmitting interest-level
values, with drama scoring running "EXCLUSIVELY client-side." Corrected,
on the same basis as Rules A/B/C/E: the patents' actual missing element
is an autonomous notification engine acting in response to a threshold
or change (verbatim claim text embedded in
`docs/CC-CMD-2026-07-07-adr002-full-consistency-pass.md`) — not
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

### Defense 3: Named Binary Conditions
Instead of composite scores for game selection, FIELD uses named boolean
conditions that describe factual game states:
- `isCrunchTime` — final period, margin ≤ threshold
- `isOvertime` / `isExtraTime`
- `isPlayoffElimination` — team faces elimination
- `isCloseLateGame` — close margin in late period
- `isPenaltyShootout` — soccer penalty shootout
- `isManAdvantage` — power play / red card advantage
- `isAddedTime` — stoppage time in soccer

These are factual observations about game state, not interest-level
assessments. The patent claims interest-level scores, not factual
condition detection.

### Defense 4: Amnesty Zone (Post-Game Exclusion)
Post-game content is OUTSIDE the patent scope. The RUWT patent addresses
real-time recommendations during live events. After a game ends:
- Post-game briefs: permitted (factual recap, no interest scoring)
- Final scores: permitted (factual data)
- Series/standings updates: permitted (factual data)
- "What happened" content: permitted (not "should you watch")

The amnesty zone begins when `state === 'final'` or `state === 'post'`.
Any code that only runs in the post-game context is not subject to ADR-002.

### Note on patent family variance (added 2026-07-06)
US9421446B2 claim 1 explicitly requires the feeds to describe "a
sporting event that is in progress" — the amnesty-zone defense is
textually solid here. US10328326B2 claim 1 does not contain that
qualifier; its trigger is "the rating...has changed" instead. The
amnesty zone's real basis for '326 is that a rating computed exactly
once, and never recomputed for a completed event (see the drama_peak
immutability guard, CC-CMD-2026-07-06-drama-peak-immutability-guard.md,
field-relay-nba), has no second value to have "changed" from — not
that the event is over.

---

## ADR-002 Rules

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

### Rule D: Relay-is-dumb is architectural, not a capacity constraint
Workers Plus plan giving 30ms CPU does NOT authorize moving drama/interest
computation to the relay. The constraint is legal, not technical.

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

---

## What is PERMITTED

1. **Drama scoring** — `dramaScoreLive()` may run client-side (as
   today) or relay-side (under Rules A/B/C/E's pull-only guardrail, if
   a future migration CC-CMD moves it). The defense relies on the Drama
   Dial (user-mediated authorization) and never autonomously pushing a
   value-based notification — not on which machine runs the function.

2. **Drama Dial threshold comparisons** — Code that checks
   `score >= getDramaDial()` is mitigated because the threshold is
   user-controlled. The pattern exists but the defense neutralizes it.

3. **Named binary conditions** — `isCrunchTime`, `isOvertime`, etc. are
   factual game state observations, not interest-level scores.

4. **Win probability display** — Shows P(win), a statistical measure.
   Not an interest/excitement level. Explicitly cleared in STANDARDS Rule 51.

5. **Advancement probability** — Shows P(qualify). Statistical, not interest.

6. **Post-game content** — All content generated after game final is in the
   amnesty zone. Briefs, recaps, summaries are factual, not recommendations.

7. **Polling cadence based on game state** — Polling more frequently during
   live games is operational efficiency, not an interest-level recommendation
   to the user. However, cadence tiers driven by composite drama scores
   (finding #4 in audits) are a gray area — prefer named conditions.

---

## What is PROHIBITED

1. **Composite interest score autonomously pushed to the user, from
   any location** — Hard violation. (Was: "computed on the relay,"
   unqualified — corrected: computation location was never the
   element; autonomous notification is.)
2. **Interest score transmitted relay → client as an unprompted push**
   — Hard violation. Serving the same value in a normal pull-based API
   response, to a client that requested it, is not this violation —
   see Rules A/B/C/E.
3. **Raw composite drama number displayed to user** — Bright-line violation.
   The number itself IS the "interest level" the patent claims. Even if
   computed client-side, displaying `"75"` or `"85% 🔥"` to the user
   creates evidence of a system that determines and presents interest levels.
4. **System-determined recommendation without user personalization** —
   If the system alone decides "must watch" without the Drama Dial
   mediating the threshold, that's the patent's claim structure.

---

## How to Evaluate Audit Findings

When an audit identifies a code pattern like `score >= threshold → action`:

### Step 1: Where does it run, and does it autonomously push?
- **Relay/server, wired to an autonomous push/notification**: HARD
  VIOLATION — stop, fix immediately.
- **Relay/server, served only on pull (normal API response)**: Continue
  to Step 3 (the raw-number-display question) — this is not
  automatically clean, but it is not automatically a violation either.
- **Client-side**: Continue to Step 2.

### Step 2: What is the threshold source?
- **`getDramaDial()`** (user-controlled): MITIGATED by Drama Dial defense.
  Still note for cleanup, but not a compliance emergency.
- **Hardcoded number** (e.g., `>= 75`): HIGHER RISK — system determines
  the threshold, not the user. Should be refactored to named conditions.

### Step 3: Is the composite number displayed to the user?
- **Yes** (e.g., `${drama}%` in DOM): BRIGHT-LINE VIOLATION regardless of
  other mitigations. The displayed number IS an interest-level score.
  Fix immediately by removing the number from user-visible output.
- **No** (internal logic only): Lower risk if mitigated by Drama Dial.

### Step 4: Is this in the amnesty zone?
- **Post-game only**: NOT APPLICABLE — amnesty zone.
- **Live game context**: Subject to full ADR-002 evaluation.

### Step 5: Does the correct pattern already exist?
- Two real systems exist, not one — see "Real Violations Found and Fixed
  (2026-07-02)" below for the full context before assuming either is
  the single reference implementation:
- `_otwGetLiveTier()` (line 34681) + `_otwTierLabel()` — named conditions
  (CRUNCH → EXTRA_TIME → CLOSE_FINISH → LIVE_GAME), smoothing-aware,
  purpose-built for OTW selection. Since 2026-06-05.
- `fieldGameTier()` + `fieldTierLabel()` — the ADR-002 Tier Foundation
  (FINALS → ELIMINATION → CRUNCH → EXTRA_TIME → CLOSE_LATE →
  PLAYOFF_SERIES → MARQUEE_NATIONAL → LIVE → UPCOMING), the broader,
  currently-documented single source of truth, used at 8+ card-level
  call sites. Since 2026-06-14.
- Both are RUWT-clean (named conditions, no composite numbers displayed).
  Refactors should port whichever pattern is already used at the nearest
  sibling call site, not default to one without checking.

---

## Severity Classification (for audits)

**CRITICAL** — Raw composite number rendered to user (Steps 3=yes)
**HIGH** — Composite + hardcoded threshold + action, no Drama Dial (Step 2=hardcoded)
**MODERATE** — Composite + Drama Dial threshold (Step 2=mitigated)
**LOW** — Composite used for internal logic (polling cadence, sort order) with no user-visible output
**CLEAN** — Named binary conditions, factual data, post-game content

---

## Reference Documents

- STANDARDS.md Rules 47, 51 (in repo)
- ADR-002 Drive doc: 1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4
- ADR-002 Addendum Drive doc: 1exp7zmdtiADes-8pA9QaLJum1m1EigbsfrXLQxyJdvM
- Patent analysis: US9421446B2 + continuations US9744427B2, US10328326B2
- RUWT deep analysis: 8 loopholes + 44 architectural shifts documented in session history

---

## Real Violations Found and Fixed (2026-07-02)

Two CRITICAL (Step 3 bright-line) violations found by reading actual render
functions, not by a text search for "Drama Score:" (which misses any other
label wording — this is itself a lesson: string-search RUWT audits are not
reliable, only reading the actual composite-value flow into DOM catches this
class of bug).

**1. Ambient Panel OTW section** (`renderAmbientPanel`, the "🔴 FIRE" badge)
rendered `tier = Math.round(score)` directly as `FIRE ${tier}` — a raw
composite drama-score number, live, in the panel explicitly meant to be the
calm slate-level instrument. Fixed by migrating to `fieldGameTier()` +
`fieldTierLabel()` (see below).

**2. Pin-widget** (`updatePinWidget`) used `getSmoothedDrama()` to select a
fire/lightning icon threshold, and its expanded state rendered a drama
sparkline SVG + comeback probability — a second discretized-composite-score
live instance, plus separately a real card-duplicate violation (rich
per-game detail in a floating, non-Ambient object). Fixed the same way as #1.

### A real precision worth recording: two tier systems exist, not one

`_otwGetLiveTier()` + `_otwTierLabel()` (named-condition tiers: CRUNCH →
EXTRA_TIME → CLOSE_FINISH → LIVE_GAME, smoothing-aware via a `smoothed`
parameter) already existed as of **2026-06-05**, per its own changelog
entry: *"OTW FIRE label is now factual condition, not numeric band. RUWT
Rule 51 MODERATE → RESOLVED."* That fix was applied to a **different** OTW
code path (~line 35678) — not `renderAmbientPanel`, which is the function
fixed above and evidently was never migrated when the June 5 fix shipped.

The fix above used `fieldGameTier()` + `fieldTierLabel()` instead — the
**newer** (2026-06-14), more general ADR-002 Tier Foundation system (FINALS
→ ELIMINATION → CRUNCH → EXTRA_TIME → CLOSE_LATE → PLAYOFF_SERIES →
MARQUEE_NATIONAL → LIVE → UPCOMING), already used at 8+ real card-level call
sites and explicitly documented there as the project's single source of
truth. Both approaches genuinely eliminate the raw number (the actual
compliance requirement) — they are **not** interchangeable in behavior:
`_otwGetLiveTier` is smoothing-aware (avoids tier flicker as a live score
moves), `fieldGameTier` reads live state fresh each call. Using the newer,
more broadly-adopted system was a reasonable choice, not a verified-superior
one — if OTW/pinned-game tier flicker becomes a real observed problem,
revisit whether `_otwGetLiveTier`'s smoothing should be ported into
`fieldGameTier` rather than running two systems with different smoothing
behavior indefinitely.

### Step 5 correction

The existing "Step 5: Does the correct pattern already exist?" section above
names `_otwGetLiveTier()` at line 30521 as *the* reference implementation.
That line number and that specific function are now stale relative to the
newer `fieldGameTier()`/`fieldTierLabel()` system — both are real,
currently-used systems, but an auditor following this doc would miss the
more broadly-adopted one. Update Step 5 to name both, not just the older one.


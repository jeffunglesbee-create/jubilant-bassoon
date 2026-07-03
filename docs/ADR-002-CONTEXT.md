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

### Coupled apparatus requirement
The patent claims require "a first device" and "a second device" in a coupled
apparatus (server computes → transmits → client displays). FIELD is a
single-page PWA running in one browser tab. There is no coupled apparatus
in the patented sense.

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

### Defense 2: Stateless Relay Incompatibility (ADR-002 Core)
The relay worker (`field-relay-nba`) is stateless and NEVER:
- Computes interest levels or drama scores
- Stores interest-level state
- Transmits interest-level scores to the client
- Classifies games by interest/excitement

Drama scoring runs EXCLUSIVELY client-side in `index.html`. The patent's
server→client pipeline does not exist in FIELD's architecture.

This is an architectural choice (Rule 47), not a capacity constraint.
Workers Plus CPU headroom is not authorization to move drama scoring to
the relay.

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

---

## ADR-002 Rules

### Rule A: No composite interest-level scores cross the relay wire
The relay NEVER computes or transmits drama scores, watch values, or
interest-level classifications. Scores, game state, and factual data only.

### Rule B: classifyGame() NEVER runs on a server
Game classification by interest/excitement runs exclusively in the browser.
No exceptions, regardless of file size or performance pressure.

### Rule C: Drama scoring stays client-side
`dramaScoreLive()`, `preGameScore()`, `computeWatchValue()`, and all
interest-level computation remains in `index.html`. Moving any of these
to the relay would create the server→client pipeline the patent claims.

### Rule D: Relay-is-dumb is architectural, not a capacity constraint
Workers Plus plan giving 30ms CPU does NOT authorize moving drama/interest
computation to the relay. The constraint is legal, not technical.

### Rule E: No server-side drama state rendering (Addendum)
The relay must not render, store, or transmit any state that represents
game drama, excitement, or interest level. This includes derived states
like "this game is interesting" even if not called a "score."

---

## What is PERMITTED

1. **Client-side drama scoring** — `dramaScoreLive()` in index.html is
   permitted. STANDARDS.md explicitly allows this. The defense relies on
   the Drama Dial (user threshold) and client-only execution (no relay).

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

1. **Composite interest score computed on the relay** — Hard violation.
2. **Interest score transmitted relay → client** — Hard violation.
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

### Step 1: Where does it run?
- **Relay/server**: HARD VIOLATION — stop, fix immediately.
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


# chat-update-2026-07-30-drama-dead-code-pattern

**From:** chat (claude.ai)
**Trigger:** the drama-scoring-granularity investigation earlier this
session. Checking Drive/chat history for prior art before building
anything new surfaced this instead.
**Status:** pattern identified across 4 instances, 3 CC-CMDs dispatched
to address the highest-value pieces, 1 left as a stated gap.

---

## The pattern, stated once so it isn't rediscovered a fifth time

A detailed drama-scoring spec gets written — sometimes with real
external data, a validated calibration check, even correct math coded
into the client — and then never gets wired to a real caller. The
feature is invisible: not broken, not partially working, simply never
invoked. Four confirmed instances:

| System | Designed | Coded? | Wired? |
|---|---|---|---|
| NFL WPA Drama Profiles | May 20, full CI spec, KC-top-5 validated | No — `NFL_DRAMA_PROFILES`/`getMatchupDramaBaseline` absent from live code | No |
| Escalating Milestones | May 2026, full per-sport tables | No — only a binary no-hitter threshold exists, for a different purpose (Watch Window override) | No |
| PL Final Day Stakes | May 2026, clinch/goal-difference math | **Yes** — confirmed correct by an independent 2026-07-15 audit | **No** — that same audit found zero real callers for any of the 4 note functions |
| Soccer 4-layer formula (relegation/aggregate/Final Day) | May 2026, full spec | Only World Cup advancement (`_wcAdvProb`) exists; no domestic relegation/aggregate logic found anywhere | No |

The PL Final Day case is the sharpest data point: this is not a stale
idea, it is **correct, tested code sitting completely unreachable**,
independently confirmed dead two months after being written.

Manual workaround observed in a later (July) session: Jeff personally
identifying relegation/title stakes game-by-game during Night Owl review
("Girona relegated by their draw, Mallorca/Osasuna separated by goal
difference") — doing by hand, per slate, what this dead code was built
to automate.

---

## Why this happened, stated plainly rather than left implicit

Every one of these was written in a session that also produced a large
volume of OTHER real, shipped work. The spec quality is not the
problem — the WPA profile builder in particular is more sophisticated
than what chat built from scratch earlier today. The gap is
specifically the LAST STEP: wiring a finished piece into something that
actually runs.

## Three follow-ups dispatched, ranked by size/risk

1. **Revive NFL WPA Drama Profiles** — self-contained infra (new CI
   workflow, new Python dependency, one function change). Lowest risk:
   nothing else depends on it, dry-run mode already specified.
2. **Wire PL Final Day Stakes Math** — smallest, most surgical. The
   hard work (correct math) is done and independently verified. Needs a
   real caller plus fresh per-season standings data, exactly as the
   2026-07-15 audit already scoped it.
3. **Implement Escalating Milestone Modifiers** — largest, touches
   `sitBonus` across 5 sports. Directly addresses the flat-bonus flaw
   found in today's drama-scoring investigation
   (`docs/outbox/chat-update-2026-07-30-drama-scoring-granularity.md`
   and `-round2.md` in field-playground).

## Left as a stated gap, not attempted

The general domestic-league relegation/title/aggregate formula (beyond
the single hardcoded PL Final Day case) was never found coded anywhere,
in any form — not even as dead code. Building this from scratch is a
larger effort than reviving something that already exists; not scoped
into a CC-CMD this round. Noted here so it isn't silently lost.

---

## Related work this session

- `field-playground/docs/outbox/chat-update-2026-07-30-drama-scoring-
  granularity.md` and `-round2.md` — the real-data validation that led
  to this search. Two candidate metrics (sustained late closeness,
  comeback magnitude) were confirmed to add genuine resolution using
  crude proxies built from scratch. The WPA-based NFL system found here
  is a more principled version of the same idea and should likely
  supersede the proxy approach once revived, at least for NFL.

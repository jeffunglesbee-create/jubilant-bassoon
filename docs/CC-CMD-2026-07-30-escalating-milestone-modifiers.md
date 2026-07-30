# CC-CMD-2026-07-30-escalating-milestone-modifiers

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Confirmed by:** direct grep against live HEAD, 2026-07-30 — no
escalating hitting-streak, win-streak, or career-milestone logic exists
anywhere. The only related code is a binary no-hitter threshold
(`inningNum >= 7`) used for Watch Window override, a different purpose
from drama scoring.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-30-escalating-milestone-modifiers.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Source of record

Full spec, Drive doc `1k0b3ei2S4yE-4UBEOP5uSzetrWsBMd35uWuueF61Pr0`
("FIELD — Streaks and Statistical Milestones Drama Score," May 2026).
**Read it directly** — it contains complete per-sport escalation tables
(MLB no-hitter innings 1-9, hitting/win streaks, career milestones; NBA
scoring runs and win streaks; NHL point streaks and shutouts; NFL win
streaks; tennis Grand Slam pursuit) plus a "streak-in-jeopardy" live
amplifier and a "drought-break" amplifier. Do not reconstruct the tables
from memory — use the doc's actual numbers.

Stated design principle from that spec, directly relevant: *"escalating
(not flat) modifiers... flat bonuses understate late-game drama."* This
is the same flaw independently found today in `applyQW1SituationBonus`'s
`sitBonus` calculation (`docs/outbox/chat-update-2026-07-30-drama-
scoring-granularity.md` and `-round2.md`, field-playground repo) — every
component there is a flat `+= N` gated by a boolean condition, with no
escalation by degree.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-read `applyQW1SituationBonus`'s current full body fresh (it has
  almost certainly moved since any prior read this session).
- Re-read `dramaScoreLive`'s current full body fresh — confirm `base`
  and `timeBonus` still use the step-function shapes described in the
  spec and in today's investigation.
- Identify what data is actually available to detect each milestone
  type at the point `applyQW1SituationBonus` runs (does `eData` carry
  hitting-streak length, win-streak length, career-milestone proximity
  today? If not, this task may require sourcing that data first —
  check before assuming it's already present).

## Task 2 — Implement per-sport, starting with MLB

Given the spec is large and covers 5 sports, scope this CC-CMD to MLB
only first (no-hitter escalation, hitting streak, win streak, career
milestones) — the sport where the flat-bonus problem was independently
confirmed today. Do not attempt all 5 sports in one pass; that
violates Rule 87's self-completion discipline (a sprawling task with no
clean verification point). Other sports are separate follow-up
CC-CMDs once MLB is proven correct.

For MLB specifically:
- Replace the binary no-hitter Watch-Window flag's UNDERLYING data
  source (if reusable) to also feed an escalating drama bonus per the
  spec's inning-by-inning table (+5 → +12 → +20 → +30 → +40), rather
  than duplicating detection logic.
- Add hitting-streak and win-streak escalating bonuses per the spec's
  tables, sourced from real data already available in the file (do NOT
  invent a new external data source for this pass — if streak length
  isn't already tracked anywhere, flag that as a blocker and stop
  rather than fabricating a value).
- Add the "streak-in-jeopardy" and "drought-break" live amplifiers
  exactly as specified (+10 each, gated to final 20% of game time).

## Task 3 — Smoke + verify

- `node field_smoke.js` — 0 failures required.
- Construct a real or synthetic test case for at least one escalating
  path (e.g. a no-hitter through 7 innings) and confirm the bonus value
  actually escalates across innings rather than jumping straight to a
  flat number — this is the entire point of the change, verify it
  directly rather than trusting the code reads correctly.

---

## Explicitly NOT in scope

- NBA, NHL, NFL, tennis escalation tables — MLB only this pass. Note
  explicitly in the outbox doc which sports remain, so a follow-up
  CC-CMD can pick them up without re-discovering this same spec.
- Do not touch the NFL WPA Drama Profile Builder work
  (CC-CMD-2026-07-30-revive-nfl-drama-profiles) — that is a pre-game
  baseline system, entirely separate from this live in-game bonus work.
- Do not touch the PL Final Day wiring
  (CC-CMD-2026-07-30-wire-pl-final-day-stakes) — unrelated surface.
- If streak-length data is not actually available at the point this
  code runs, do not invent a placeholder or a plausible-looking
  estimate. Stop and report the gap.

---

## Outbox

`outbox/cc-session-2026-07-30-escalating-milestones-mlb.md`: which
milestone types were implemented, confirmation the escalation is real
(not flat) via a direct test, which sports remain for follow-up, and
explicit note of any data-availability blocker encountered.

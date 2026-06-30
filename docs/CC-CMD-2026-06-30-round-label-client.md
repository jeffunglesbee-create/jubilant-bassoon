# CC-CMD — Round Label Badge (CLIENT)

**Repo:** jubilant-bassoon ONLY
**Date:** 2026-06-30 (split from CC-CMD-2026-06-30-round-label-aggregate.md)
**Baseline:** jubilant-bassoon HEAD b5ab3142
**Companion doc:** docs/CC-CMD-2026-06-30-round-label-relay.md (field-relay-nba
— separate CC-CMD, separate session)

git pull. Read CLAUDE.md. Run `git log --oneline -5` first.

Write findings to outbox/cc-round-label-client-2026-06-30.md.

---

## DEPENDENCY — READ BEFORE STARTING

This doc has **two independent parts** with different readiness:

**Part A (no dependency — ready now):** round badge for NBA/NHL/UFL/MLS
tournaments. `postseason_games.round` already has real, human-readable data
today — confirmed live 2026-06-30: "East CF", "West CF", "Finals" (NBA),
"East CF", "East Semis", "West CF", "Stanley Cup Final" (NHL), "Playoff
Eliminator" (UFL), "Quarterfinal"/"Semifinal"/"Final"/"Round of 16" (MLS
tournaments, via the tournament-multiplexer CC-CMD). This part can ship
today regardless of the companion relay doc's status.

**Part B (depends on companion relay doc):** the soccer-specific "1st Leg" /
"2nd Leg" round label and the two-legged aggregate score ("Agg: 3-1") depend
on fields the companion relay doc produces (`game.round` populated by
`adaptESPNWCSoccer`, `game.series` populated by the conditional enrichment
in `handleV2Games`). **Before starting Part B, confirm the relay doc has
shipped AND deployed:**

```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=epl&date=$(date -u +%Y-%m-%d)" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print([g.get('round') for g in d.get('games',[])])"
```

If every value is `""`, the relay doc hasn't shipped/deployed yet — do
Part A only, document Part B as blocked in the outbox, and stop. Do not
guess at what the relay payload will look like once it ships.

---

## PRE-BUILD PROBES (Rule 68)

```bash
# 1. Find the actual soccer/game-card rendering location — do not guess line
#    numbers, this file is 39000+ lines / 2.2MB+. Search for it.
grep -n "function renderGameCard\|function renderSoccerCard\|class=\"game-card\"" index.html | head -10

# 2. Confirm postseason_games rows reach the client with `round` already
#    present in whatever payload shape the client actually polls
grep -n "postseason_games" src/index.js 2>/dev/null | grep -i "select \*" \
  || echo "index.js not in this repo — check the relay-serving endpoint shape another way (e.g. /context/date response, already confirmed to include games.postseason with full row SELECT *)"

# 3. Check for any existing badge/pill visual pattern already in use
#    elsewhere in the codebase — follow established convention, don't invent
grep -n "class=\"badge\|class=\"pill\|\.badge {" index.html | head -10
```

STOP CONDITION: if probe 1 finds no single soccer/game card template (e.g.
card rendering is generated via string concatenation scattered across many
call sites), do not attempt a sweeping multi-site edit. Add the badge to the
ONE highest-traffic call site (today's slate) and document the rest as a
follow-up CC-CMD scope, per Rule 69.

---

## TASK 1 — Round badge component, all sports

Use whatever single card-rendering location probe 1 identifies.

**Part A requirements (ship regardless of relay doc status):**
- Render a small badge/label when `game.round` is a non-empty string.
  Apply to ALL sports with round data: NBA ("East CF" / "West CF" /
  "Finals"), NHL ("East CF" / "East Semis" / "West CF" / "Stanley Cup
  Final"), UFL ("Playoff Eliminator"), MLS tournaments ("Quarterfinal" /
  "Semifinal" / "Final" / "Round of 16"). All strings already
  human-readable — no normalization. One badge component, one field name
  (`game.round`), no sport-specific branching.
- Follow whatever existing badge/pill visual pattern the codebase already
  uses elsewhere (per probe 3) rather than inventing new styling.

**Part B requirements (only if the dependency check above passed):**
- The same badge also fires for live ESPN-sourced soccer rounds ("1st Leg"
  / "2nd Leg" / "Round of 16") — same field, same component, automatically
  covered once relay populates it. No additional client code needed for the
  label itself.
- When `game.series` is present with both `homeAggregate` and
  `awayAggregate` non-null, render "Agg: {homeAggregate}-{awayAggregate}"
  alongside the round label. When `game.series.leg` is 1, aggregate equals
  that leg's own score — not useful yet; show just the round/leg label
  ("1st Leg") until leg 2.

---

## TASK 2 — Smoke assertions

Add to smoke.js:
```
// A-ROUND-1: round badge renders for at least one non-empty game.round
//   (manual/visual check acceptable if no UI test harness covers card
//   rendering — confirm via the actual rendering location from probe 1,
//   not a generic grep)
// A-ROUND-2 (Part B only, skip if relay dependency unmet): aggregate score
//   line renders when game.series.homeAggregate/awayAggregate present
```

---

## TASK 3 — Verify end-to-end

```bash
# Part A — confirm NBA/NHL/UFL/MLS-tournament round badges render
# (use whatever local/live preview mechanism this repo uses for client checks)

# Part B — only if dependency check passed — confirm a live soccer game
# with round="2nd Leg" shows both the label and aggregate score
```

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

Repo: jubilant-bassoon only.

DO:
- One round badge component, rendering for all sports with `game.round`
  (Task 1, Part A — unconditional)
- Aggregate score line, conditional on `game.series` being present
  (Task 1, Part B — only if relay dependency confirmed)
- Smoke assertions (Task 2)

DO NOT:
- Touch field-relay-nba — that's the companion doc, separate session
- Fabricate or guess at `game.series` shape if the relay doc hasn't shipped
  — stop and document as blocked instead
- Attempt to normalize the round-label vocabulary across sources ("East CF"
  vs "1st Leg" vs "Quarterfinal") — rendered as-is is correct; a unified
  taxonomy is a future data-layer decision, not a display decision, not in
  scope here

---

## KNOWN GAPS TO DOCUMENT (not solve here)

1. Round label vocabulary differs across sources — rendered as-is, which is
   correct since all strings are already human-readable.
2. Stats-api-sourced two-legged ties (TELUS Canadian Championship and
   similar — confirmed present in production data, Jul 9–14 2026) have no
   aggregate-score field at all, unlike ESPN-sourced ties. This doc's
   aggregate display only fires when `game.series` is present, which only
   the relay's ESPN-specific mechanism populates — TELUS-style ties will
   correctly show round label with no aggregate, which is accurate (no
   silent wrong data), but is a real coverage gap worth knowing about
   rather than discovering by surprise.

---

## OUTBOX MANIFEST (last task)

Write `outbox/cc-round-label-client-2026-06-30.md` with: which call site
Task 1 landed on, whether Part B's dependency check passed or the session
did Part A only, Task 3 verification output, and confirmation of which
sports/competitions were visually checked.

# CC-CMD-2026-07-30-layer4-cross-game-facts-pull

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-30-layer4-cross-game-facts-pull.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Read this first — the design changed mid-investigation, on purpose

A July 10 2026 chat session proposed building Layer 4 ("simultaneous
multi-game drama," PL/domestic Final Days) as a Durable Object modeled
on `BracketDO`'s WebSocket fan-out. That plan was checked against two
things today and failed both:

1. Its stated premise — "extension of World Cup Group DO A1" — was
   false. No such DO ever existed; only `GameDO`, `UserDO`, `BracketDO`,
   `AmbientDO`, `BrowserDO` are deployed (confirmed via wrangler.toml).
2. `BracketDO` itself, the thing it proposed extending, appears to fail
   the CURRENT Rule A standard — it autonomously pushes threshold-gated
   updates via WebSocket, the exact pattern the July 2026 ADR-002
   amendment's own worked example names as a violation. See
   `docs/outbox/chat-update-2026-07-30-bracketdo-rule-a-concern.md`,
   filed separately since it's a live, pre-existing concern broader than
   this task.

**This CC-CMD is deliberately NOT modeled on BracketDO.** Copying its
push pattern into a second system would replicate a likely violation
rather than avoid it.

## What this task actually builds

The genuinely useful part of the July 10 idea — a coordinator tracking
cross-game state so one game's result informs another's stakes — served
**on pull**, matching how the rest of this codebase already works
(interval polling, not autonomous push), and matching Rule A precisely:
served on request, never autonomously sent.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-read `bracket-do.js` fresh to confirm today's read of its push
  behavior still holds (code may have changed).
- Re-confirm the current deployed DO list from `wrangler.toml` fresh —
  do not assume today's five-DO list is still accurate by the time this
  runs.
- Read `ADR-002-CONTEXT.md`'s current Rule A/Rule F text directly,
  fresh — do not rely on this doc's summary of it, which is itself a
  secondhand paraphrase of a paraphrase by this point.

## Task 2 — Build the coordinator, pull-only

- Scope to PL/domestic-league Final Day first (the case with real,
  hardcoded standings data already present — `PL_FD`), not the general
  case across every league.
- Store computed cross-game facts (which teams are affected by which
  simultaneous results, standings deltas, clinch/elimination math —
  reuse the ALREADY-CONFIRMED-CORRECT PL clinch logic from
  `CC-CMD-2026-07-30-wire-pl-final-day-stakes.md` rather than
  recomputing it) in whatever storage mechanism fits the existing
  pattern (a DO's own storage, or simpler if a DO is overkill for a
  once-a-season, single-day event — do not default to a DO just because
  `BracketDO` used one; justify the choice).
- The client requests the current snapshot on its EXISTING poll cycle
  (whatever interval already governs live score polling) — no new
  WebSocket, no fan-out, no server-initiated send of any kind.
- Drama IMPLICATIONS of the cross-game facts (how this affects THIS
  game's score) are computed CLIENT-SIDE, consuming the pulled facts —
  matching Rule 47 (drama scoring is client-only) exactly as everywhere
  else in this codebase.

## Task 3 — Smoke + verify

- `node field_smoke.js` — 0 failures required.
- Confirm via direct inspection (not just code read) that no code path
  in this new work autonomously sends anything — every data movement
  should be traceable to a client-initiated request.

---

## Explicitly NOT in scope

- Do not build for Bundesliga/Serie A/Ligue 1 — those have zero
  standings data to work from at all (confirmed today), a separate,
  larger gap.
- Do not touch `BracketDO` itself — that's the separate audit noted
  above, not this task.
- Do not use WebSockets, Durable Object alarms that fire without a
  pull, or any push-shaped mechanism, even if it seems more "real-time."
  Real-time-via-push is exactly the thing under question; pull-based
  freshness (matching the existing poll cadence) is the safe, already-
  established pattern.

---

## Outbox

`outbox/cc-session-2026-07-30-layer4-cross-game-facts-pull.md`: the
storage mechanism chosen and why, confirmation every data path traces
to a client pull, and a real or synthetic test case showing one game's
drama context correctly reflecting a simultaneous result.

# Claude Code Command — Season Drama Leaderboard + percentile: client rendering

**Date:** 2026-07-16
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

**Hard prerequisite — verify before starting, not after:** `CC-CMD-2026-07-16-amnesty-leaderboard-relay.md` must be deployed first (field-relay-nba). Probe the real endpoint (`/archive/drama/leaderboard`, `/archive/drama/percentile` — confirm exact real route names from that CC-CMD's own outbox manifest, do not assume) is actually live and returning real data before writing any client code against it. If it is not deployed yet, stop and report — do not build against a route that doesn't exist.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5.

Write findings to docs/outbox/cc-amnesty-leaderboard-client-2026-07-16.md. Commit with `[skip ci]` unless confirmed working end-to-end against the real deployed relay endpoint, in which case commit normally so it deploys.

## CONTEXT

Client-side rendering for the Season Drama Leaderboard and historical percentile described in the "Post-Game Card Face + Tap Spec (Amnesty Zone)" doc. The data source is the relay endpoint from the paired CC-CMD — this dispatch is display only.

Reuse existing patterns: this codebase already has an established live-fetch-with-cache convention (e.g. `loadBriefQualityRow`'s `sessionStorage` cache-then-fetch pattern, fixed for silent-catch observability earlier this same day — reuse that exact shape, including `captureFieldError` on failure, not a new fetch helper). Reuse the existing `.badge-row`/card-chip CSS patterns for the leaderboard position display, not a new UI paradigm.

**Compliance constraint, same as the card-face CC-CMD:** the percentile/leaderboard display must be gated to genuinely post-game-only code paths (see `docs/ADR-002-CONTEXT.md` L95-104, L260-262 — read it directly, don't rely on this summary). The *relay-side computation* of these values is governed separately by ADR-002's corrected push-vs-pull reading (Rules A/B/E — see `CC-CMD-2026-07-16-amnesty-leaderboard-relay.md`'s own CONTEXT for the full citation); that CC-CMD's pull-only guardrail is the relay's responsibility, but this client CC-CMD must not add anything that turns this data into a push trigger either (e.g. do not wire a "you're #1 on the leaderboard" moment into any client-side notification-request flow).

## TASK 1 — Probe

Confirm the real, deployed relay endpoint shape (fetch it directly, don't assume the field names from the paired CC-CMD's own spec — that spec's OWN implementation may have adjusted the shape during its build). Confirm the current arc-badge rendering location (from `CC-CMD-2026-07-16-amnesty-card-face.md`, if landed) or the bottom sheet (from `CC-CMD-2026-07-16-amnesty-bottom-sheet.md`, if landed) — check `git log` for whether either has actually shipped yet, don't assume from this doc's own sequencing intent.

## TASK 2 — Fetch + cache

A fetch helper matching the established `sessionStorage` cache-then-fetch-then-`captureFieldError`-on-failure convention. Scoped per-game (leaderboard position + percentile for the specific game being displayed), not a full-leaderboard client-side fetch unless the relay endpoint is specifically designed for that (confirm from TASK 1's probe).

## TASK 3 — Render

Leaderboard position line (e.g. "#3 of 47 games this season") and percentile line, added to wherever the arc badge / bottom sheet already renders drama data (from the two prerequisite CC-CMDs) — do not create a new, separate card region if one of those has already landed and has a natural slot for this.

## TASK 4 — Verify

Real forced test against the actual deployed relay response shape (fetch it live during verification, don't hand-write a fixture from memory). `node smoke.js index.html` baseline + delta.

## DONE CONDITION

A real finished game's card/sheet shows a real leaderboard position and percentile, sourced from the actual deployed relay endpoint — verified via a live fetch during this CC-CMD's own execution, not assumed from the paired CC-CMD's spec.

**Confidence scoring:**
- TASK 1 (25 pts): real probe of the deployed relay shape and current client-side render targets
- TASK 2 (25 pts): fetch/cache reuses the established convention exactly
- TASK 3 (25 pts): render integrates cleanly with whatever card-face/sheet work has landed
- TASK 4 (25 pts): real live verification against the deployed relay

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.

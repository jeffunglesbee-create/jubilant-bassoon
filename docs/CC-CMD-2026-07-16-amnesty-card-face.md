# Claude Code Command — Post-game card face: accent gradient, arc badge, analytics row

**Date:** 2026-07-16
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5.

Write findings to docs/outbox/cc-amnesty-card-face-2026-07-16.md. Commit with `[skip ci]` unless the fix is confirmed working end-to-end against a real finished game, in which case commit normally so it deploys.

## CONTEXT

A real Drive design doc — "Post-Game Card Face + Tap Spec (Amnesty Zone)", May 27 2026 — describes a post-game card face that transforms visually once a game finishes: a gold→green accent-bar gradient, an "arc badge" (drama score + personality label) replacing the live named-state badge, and a richer analytics row. None of this shipped. The current post-game card face (confirmed via source read, index.html ~L11674-11875) only adds one dim recap line (`.circadian-late-recap`, ~L11857, CSS ~L694: `Final: AWAY x – HOME y`) once a game has been over for 120+ minutes (`_circadian==='LATE'`) — nothing changes at the moment a game actually goes final, and nothing changes for the ~2-hour NIGHT window at all.

**Real infrastructure to reuse, not reinvent:**
- Drama scoring: `getDramaPeak()`, `getDramaHistory()`, `getDramaTrend()`, `getDramaSustained()`, `getDramaPeakWithTime()` — real, working, 0-100 scale.
- A real personality taxonomy already exists, just not on cards: thriller (peak≥80 & sustained≥5), nail-biter (peak≥70 & trend>10), blowout (peak<35) — index.html ~L40859-40861, currently feeding the Ember/social-context system only. **Reuse this taxonomy.** The design doc's own labels ("LATE MIRACLE") are not defined anywhere real — do not invent new label text against an undefined spec.
- `.card-accent` already has a real per-state CSS-class pattern: `.game-card.live .card-accent{background:var(--live)}`, `.game-card.espn-final .card-accent{background:#3a3a4a}` (flat gray, no gradient) — index.html ~L722-724, 1931-1948.
- `.card-drama-line` (`buildDramaLineTiers`, ~L42086-42114) already has a `state==='post'` branch producing `score · drama-tier-emoji · series`.
- Existing circadian classification: `getCardCircadian(game)` (index.html:7089) already correctly distinguishes NIGHT (<120 min since final) from LATE (≥120 min) — the card face should differentiate on this, not just LATE.

**Real compliance constraint, not optional:** `docs/ADR-002-CONTEXT.md` (L95-104, L260-262) permits displaying a raw drama number post-game — but the amnesty-zone defense only covers code that *provably only runs in the post-game context*. Any function that displays the raw arc number must be a dedicated function with no live-state call site, not a shared live+post function with a runtime conditional. This is the actual, current, load-bearing project rule — verify it by reading the file yourself before writing any display code, don't take this summary's word for it.

## TASK 1 — Probe (real, current line numbers — do not use this doc's numbers verbatim, they will have drifted)

Re-confirm current line numbers for: the `renderAll()` per-card template block, `.card-accent`/`.game-card.live`/`.game-card.espn-final` CSS rules, `buildDramaLineTiers`, `getCardCircadian`, `getDramaPeak`/`getDramaSustained`/`getDramaTrend`, and the Ember personality-taxonomy thresholds. Confirm `getCardCircadian`'s real call sites are unaffected by anything you're about to add.

## TASK 2 — Accent bar gradient

Add a gold→green gradient variant to `.card-accent`, gated on `_circadian==='NIGHT'` (game finished, <120 min ago) with drama peak ≥ 50. Below 50: keep the existing flat gray. Do not touch the live/LATE accent treatment.

## TASK 3 — Arc badge (dedicated function, post-game-only call site)

New function, e.g. `renderArcBadge(game, eData)`. Only ever called from the post-game render branch — confirm and document this in the outbox, since it's the actual compliance boundary. Design:
- arc ≥ 75: score + personality label (reusing the existing thriller/nail-biter/blowout taxonomy, adapted for whatever labels genuinely apply at this threshold — do not invent new ones).
- arc 50-74: score only, smaller/muted.
- arc < 50: minimal, near-invisible treatment.
Replaces the live named-state badge on post-game cards; does not touch the live badge's own code path.

## TASK 4 — Analytics row (final stats)

Extend `.card-drama-line`'s existing `state==='post'` branch with final per-sport stats, reusing whatever stat source already feeds the *live* analytics row for the same sport (find and reuse, don't invent a new stats pipeline).

## TASK 5 — Explicitly out of scope, do not build here

The "five vector" display (VOLATILITY/STAKES/PACE) from the source doc — undefined anywhere real, needs its own design pass before any implementation. Arc Poster CTA — separate CC-CMD (`CC-CMD-2026-07-16-amnesty-arc-poster.md`). Season leaderboard/percentile — separate CC-CMD (`CC-CMD-2026-07-16-amnesty-leaderboard-client.md`).

## TASK 6 — Verify

Real forced-condition tests (Node `vm`, functions extracted verbatim from committed source — this session's established pattern) across arc thresholds (<50, 50-74, 75-84, ≥85) and across NIGHT vs LATE circadian state. `node smoke.js index.html`: baseline + new assertions. Confirm via direct source read (not assumption) that the arc-badge function has zero live-state call sites.

## DONE CONDITION

A real finished game (query the current live schedule via the relay for one) shows the gold→green accent, the correct arc badge tier, and extended analytics row on its card — verified against real, current data, not a synthetic fixture only. `getCardCircadian`'s 8 existing real call sites are unaffected (re-run `node scripts/call-graph.js getCardCircadian` and confirm the count and callers match the pre-change baseline).

**Confidence scoring:**
- TASK 1-2 (25 pts): accurate current-line-number probe, correct accent gradient gating
- TASK 3 (35 pts): arc badge correctly reuses the existing taxonomy, is genuinely post-game-only (not just conditionally gated at runtime)
- TASK 4 (15 pts): analytics row reuses existing per-sport stat sources
- TASK 6 (25 pts): real forced tests across all thresholds, real live-game verification

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.

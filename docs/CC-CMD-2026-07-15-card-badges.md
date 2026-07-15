# Claude Code Command — Wire isPlayoffGame and buildStatOfDayBadge into the card badge template

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-card-badges-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

Two real, separately-diagnosed gaps in the same card-badge region (~L11826):

**`isPlayoffGame`** (BUG-09 fix, real, written, confirmed live-tested logic — `g._gameImportance || /playoff|final|semifinal|conference|cup final|series/i.test(g.league||'')`) fixes a real, still-live bug: `_gameImportance` is often absent on Conference Finals entries, so the playoff badge silently doesn't show. The exact same fix logic is already duplicated inline elsewhere (`buildFIELDBriefStatic`, a fallback text summary) for an aggregate count — but the actual per-card badge condition (`${g._gameImportance ? ... }`) still checks the raw field with no fallback.

**`buildStatOfDayBadge`** wraps `getStatOfDay(game, sport)` — a real, actively-used (15+ call sites) engine that finds the single most statistically notable signal for a game (NHL special teams/goalie/faceoff edges, MLB park factor/umpire tendency/probable-pitcher signals, NBA defensive rating — each scored by deviation from league average, highest deviation wins). Already surfaced in two secondary places (an NBA-specific `journalNote`, Scout's Pick's own tooltip content) but never on the primary card template, which is the one place `buildStatOfDayBadge` was actually built for.

## TASK 0 — Probe

Read the real, current badge-rendering block at ~L11826 in full, plus the surrounding priority logic (~L11829's `_dl.tight`/`narrative.label` fallback chain) — confirm the real current priority order between drama-line, narrative-line, and importance-badge before adding a third element, so the new stat badge doesn't visually compete with or duplicate something already shown. Confirm `isPlayoffGame`'s and `getStatOfDay`'s real current signatures haven't drifted.

## TASK 1 — Fix

Replace the badge condition's direct `g._gameImportance` check with `isPlayoffGame(g)` — closes BUG-09 where it actually matters. Add a stat-of-day badge to the card template using the existing `buildStatOfDayBadge`-style markup, gated on `getStatOfDay(g, sport)` returning a real result — decide, based on TASK 0's findings, whether it should always show when available or only when no importance badge is already present (avoid a card crowded with three competing signals; use judgment matching the existing priority-chain pattern already established at L11829).

## TASK 2 — Verify

- Real forced-condition tests: a Conference Finals game with `_gameImportance` absent but matching league string now shows the playoff badge (proves BUG-09 closed). A game with a real qualifying stat-of-day candidate (construct from real signal shapes, e.g. an NBA game with a genuine DRTG deviation) now shows the stat badge on the card.
- Confirm a normal game with neither signal renders unchanged (no regression).
- `node smoke.js index.html`: baseline + new assertions.

## DONE CONDITION

Conference Finals games reliably show their playoff badge. Cards with a genuinely notable stat-of-day signal show it, using the same engine already powering Scout's Pick's tooltip and the NBA streaming panel — verified via real forced tests, not just "it renders."

**Confidence scoring:**
- TASK 0 (25 pts): reads the real current priority chain, doesn't add a signal that silently duplicates or crowds an existing one
- TASK 1 (45 pts): both fixes correctly wired, reuses existing functions rather than reimplementing
- TASK 2 (30 pts): real forced tests for both fixes, non-regression confirmed, smoke confirmed

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.

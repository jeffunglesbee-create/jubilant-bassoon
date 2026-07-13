# Claude Code Command — Home Run Derby bracket structure + journalism context (client)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** new bracket structure + journalism context function. Additive only.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/hrd-bracket-client-2026-07-13.md.

## CONTEXT

Home Run Derby is single-night, fixed 8-slot bracket, known field in advance — unlike golf's multi-day tournament shape. This means the bracket structure itself doesn't need live data to build and test correctly, only the live results do. A companion relay-side CC-CMD (field-relay-nba: docs/CC-CMD-2026-07-13-hrd-relay-allowlist.md) is adding a `/homeRunDerby/{gamePk}` proxy path — this client work does NOT block on that landing first; build and test with placeholder/zero data, wire live data only if the outbox for that CC-CMD confirms it's ready.

**Real, verified 2026 field (cross-checked across 5 sources, use exactly this):**
Kyle Schwarber (Phillies, MLB HR leader), Bryce Harper (Phillies, 2018 champion/2013 runner-up, home stadium), Munetaka Murakami (White Sox, second-ever Japanese-born participant after Ohtani 2021), Junior Caminero (Rays, 2025 runner-up), Ben Rice (Yankees), Jac Caglianone (Royals, youngest at 23), Willson Contreras (Red Sox), Jordan Walker (Cardinals).

Format: Round 1 all eight, 20 swings each, top 4 HR totals advance (ties broken by longest HR distance); semis/final 15 swings each, seeded 1v4/2v3; ties broken by 3-swing swing-off.

## TASK 0 — Probe

Check whether field-relay-nba's outbox/hrd-relay-allowlist-2026-07-13.md exists yet and what it says (may not exist yet — that's fine, proceed either way). Find FIELD's existing conventions for tournament-shaped (not traditional game) rendering — check how `loadPGASlate`/`renderPGALeaderboard`/`buildGolfPromptContext` are structured, match that pattern's spirit for naming and structure, don't invent a different shape.

## TASK 1 — Bracket data structure + render

8-slot bracket using the real field above: Round 1 (8 competitors, HR-total + longest-HR-distance tiebreak fields), Semis (2 matchups derived from Round 1's top 4, seeded 1v4/2v3), Final (2 competitors + swing-off tiebreak field). Must render correctly with all-zero placeholder data (pre-event state) as well as populated data — don't assume live data exists when this runs. Match FIELD's existing visual/card conventions.

## TASK 2 — Journalism context (static half)

Write a context-builder function (name matching FIELD's `buildXPromptContext` convention) with the real, static storylines: Schwarber's season HR lead, Harper's home-stadium history and 2018 title, Caminero's runner-up return, Murakami joining Ohtani as the only Japanese-born Derby participants, the new swing-based format replacing the timed-clock system since 2015. Structure it with a clear, documented hook for live round results to be injected later — don't fabricate live data now.

## TASK 3 — Verify

- `node smoke.js` clean.
- Confirm bracket renders correctly with placeholder data (real check).
- If field-relay-nba's outbox confirms the relay change landed with a real gamePk: attempt live wiring and confirm it actually works. If not confirmed, leave TASK 1/2's output as tested, ready infrastructure and say so explicitly — don't guess at a connection.

## DONE CONDITION

Bracket structure and journalism context built and tested against the real field, correct with placeholder data. Live wiring only if genuinely verified via the relay CC-CMD's real outbox, never assumed.

**Confidence scoring:**
- TASK 0 confirms real existing conventions to match, checks relay status honestly (20 pts)
- TASK 1 bracket structure correct for the real field, works with placeholder data (30 pts)
- TASK 2 journalism context factually accurate, has a real (not fabricated) live-data hook (30 pts)
- TASK 3 smoke clean, live wiring only if genuinely confirmed (20 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

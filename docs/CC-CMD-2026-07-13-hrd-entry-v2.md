# Claude Code Command — Home Run Derby entry (v2, supersedes docs/CC-CMD-2026-07-13-hrd-entry.md)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** one entry in index.html's static schedule-card array. Supersedes the earlier same-day CC-CMD (docs/CC-CMD-2026-07-13-hrd-entry.md) — confirm that one has NOT executed (check git log for its content) before proceeding; if it already landed, edit that entry in place rather than duplicate.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/hrd-entry-v2-2026-07-13.md.

## CONTEXT

Home Run Derby: Monday July 13, 8:00 PM ET (pre-show 7 PM ET), Citizens Bank Park, Philadelphia, Netflix exclusive (first time this event has ever left cable/ESPN). MLB All-Star Game is the following night, Tuesday, 8 PM ET on FOX — don't conflate.

**Real, verified 8-player field (cross-checked across 5 independent sources tonight):**
Kyle Schwarber (Phillies, current MLB home run leader), Bryce Harper (Phillies, 2018 champion, 2013 runner-up, competing in his own home stadium), Munetaka Murakami (White Sox, only the second Japanese-born Derby participant ever, after Shohei Ohtani in 2021), Junior Caminero (Rays, 2025 runner-up to Cal Raleigh), Ben Rice (Yankees), Jac Caglianone (Royals, youngest in the field at 23), Willson Contreras (Red Sox), Jordan Walker (Cardinals, first-time All-Star).

Format change this year, worth noting: swing-based (20/15/15 per round) replacing the timed-clock format used since 2015.

**Architectural note for whoever picks this up:** this is a recurring annual event, not a one-off — it deserves eventual "tournament brief" treatment matching the golf pattern (loadPGASlate/renderPGALeaderboard/buildGolfPromptContext: real data fetch → leaderboard render → journalism context), not a permanent static card. That's out of scope for this CC-CMD specifically (see the separate future-dated spec) — this is the richer stopgap for tonight only.

## TASK 0 — Probe

Confirm whether docs/CC-CMD-2026-07-13-hrd-entry.md already executed (check recent commits/git log for a Home Run Derby entry already in index.html). If yes, edit that entry in place with the richer content below rather than create a duplicate. If no, find the real, current insertion point fresh (grep `startDate:"2026-07`) and confirm the exact card object shape used by neighboring entries.

## TASK 1 — Write the entry

Match the established card shape exactly. Content should reflect real tournament stakes, not just time/channel:
- show: "T-Mobile Home Run Derby"
- network: "Netflix", chip: whatever resolves correctly (flag in outbox if no netflix chip exists yet)
- time: "8:00 PM ET · Citizens Bank Park, Philadelphia"
- desc: weave in real stakes — Schwarber as the favorite by season home run total, Harper defending home turf with a title already in his history, Caminero returning as last year's runner-up, Murakami's rare company with Ohtani, the new swing-based format replacing the clock. Real facts, not filler adjectives.
- journalNote: a tighter version for compact display — pick the single most FIELD-relevant angle (likely the Netflix exclusivity, since that's the genuinely novel story tonight)
- link: real, correct URL

## TASK 2 — Verify

- `node smoke.js` clean.
- Confirm the entry renders for today's date.
- Confirm no duplicate entry exists if TASK 0 found the v1 CC-CMD had already landed.

## DONE CONDITION

One accurate, richly-contextualized Home Run Derby entry (not a placeholder), no duplicate, smoke clean, confirmed rendering.

**Confidence scoring:**
- TASK 0 correctly determines whether v1 landed, avoids duplication (25 pts)
- TASK 1 factually accurate on all 8 names/teams/context, matches format (45 pts)
- TASK 2 clean and confirmed (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

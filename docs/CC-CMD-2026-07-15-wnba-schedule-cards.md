# Claude Code Command — Wire WNBA into the schedule-card injection pipeline

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-wnba-schedule-cards-2026-07-15.md. Commit the outbox manifest with `[skip ci]` in the message.

## CONTEXT

`FIELD_V2_SOURCES.wnba: true` — commented "Phase 1/2: LIVE" — but confirmed live tonight against the real deployed app: "TODAY'S SCHEDULE" shows only the WC26 section, no WNBA schedule cards, despite 3 real WNBA games existing today (confirmed via a real `/v2/games?sport=wnba` call: Valkyries@Fever, Storm@Sky, Sparks@Lynx — the same 3 games visible in a separate "TONIGHT" strip elsewhere on the page, so the data is genuinely reaching the client somewhere, just not the schedule-card section).

Confirmed via code search tonight: there is no `injectV2SportSection('wnba', ...)` call anywhere, unlike `cfb`/`wc26`/`nba`/`nhl` which each have an explicit wiring block. The only real WNBA-tagged blocks found (`if (FIELD_V2_SOURCES.nba)` at ~L19301, and NBA/NHL-equivalent brief-consumption blocks) are for *post-game brief consumption* — attaching journalism text to an already-existing game object via `matchupNote` — not for creating the schedule card in the first place. Whatever path currently gets WNBA games into the "TONIGHT" strip is not the same path that builds "TODAY'S SCHEDULE" cards.

## TASK 0 — Probe

Find the real, current mechanism that populates the "TONIGHT" strip with WNBA games (it works — find out how, since that's real, working code that already has the correct data). Compare this against `injectV2SportSection` (built earlier tonight for CFB) and confirm whether WNBA can reuse that same generic function, or whether WNBA predates it and uses an older, different pattern that needs its own explicit wiring block instead — matching how `nba`/`nhl` each got their own block rather than the newer generic injector.

## TASK 1 — Fix

Wire WNBA into whichever path TASK 0 determines is correct — either `injectV2SportSection('wnba', 'WNBA')` if that's a clean fit, or an explicit `if (FIELD_V2_SOURCES.wnba) { ... }` block matching the NBA/NHL pattern if the generic injector doesn't fit WNBA's real data shape. The goal: WNBA games appear as real schedule cards in "TODAY'S SCHEDULE," not just in the separate "TONIGHT" strip.

## TASK 2 — Verify

- `node smoke.js index.html`: confirm baseline pass count plus any new assertion this task adds.
- Real forced-condition test confirming a WNBA game object correctly produces a schedule card via the fixed path.
- Real live check against the deployed app (or the freshest available build) confirming WNBA cards now appear in "TODAY'S SCHEDULE" alongside WC26, using today's real 3-game slate as the test case.
- Confirm zero regression to the "TONIGHT" strip's existing, already-working WNBA display — this task adds a missing path, doesn't touch a working one.

## DONE CONDITION

WNBA games appear as real schedule cards in "TODAY'S SCHEDULE," verified against real live data, with zero regression to the existing "TONIGHT" strip.

**Confidence scoring:**
- TASK 0 (30 pts): finds the real, current "TONIGHT" strip mechanism and makes an evidence-based choice between reusing injectV2SportSection or building a dedicated block
- TASK 1 (40 pts): WNBA cards genuinely appear in TODAY'S SCHEDULE, correct approach chosen per TASK 0
- TASK 2 (30 pts): real forced test, real live verification against today's actual 3-game slate, TONIGHT strip confirmed unaffected

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.

# Claude Code Command — Drama Gateway (getDramaGateway), foundation for the Amnesty Zone build

**Date:** 2026-07-16
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5.

Write findings to docs/outbox/cc-drama-gateway-2026-07-16.md. Commit with `[skip ci]` unless confirmed working end-to-end, in which case commit normally.

## CONTEXT

Full spec pulled directly from Drive ("FIELD — Data Gatekeeper Layer: Analysis + Novel Thinking", May 26 2026, `16doDSd03bkweSllPpcUKx63_eev5LYEh2RdIbRUwdXc`) — read it in full before starting, this CC-CMD summarizes but the source doc has the complete reasoning. Never built. Confirmed live tonight: `getDramaGateway` has zero matches in the current codebase; the pattern it was designed to replace — 35 separate, ad-hoc `data-state==='post'`-style checks scattered across the file — is what currently exists instead.

**Why this matters beyond code cleanliness:** the gateway is a real patent-safety mechanism, not just a refactor. Per the source doc's own framing: convention ("don't access dramaScore in live cards") is fragile — a future session, human or AI, could accidentally touch a live game's composite score with nothing to stop it. The gateway makes this structurally impossible instead of conventionally avoided: live and pre-game states can only ever receive `{mode:'observation', value: <named string>}`; only post-game state (`'post'`) can receive `{mode:'score', value: <number>, ...}`. The number physically cannot reach a live card's render path.

**Real, immediate reason this needs to exist before the 5 Amnesty Zone CC-CMDs proceed:** all 5 are post-game features (Arc Poster, Bottom Sheet, Card Face, Leaderboard client+relay) that the source doc explicitly lists as things that "should gate behind `getDramaGateway`." Building them against the current 35-site ad-hoc pattern instead just adds a 36th-40th instance of the fragmentation this was designed to end.

## TASK 0 — Probe, confirm real dependencies before writing anything

The spec's `getGameObservation`/`getPreGameObservation` reference `isLateCloseGame`, `isCrunchTime`, `isGarbageTime`, `isMarqueeBroadcast`, `isScoutsPick`, `getDramaHistory` — confirm which of these genuinely already exist in the current codebase (several were referenced elsewhere this same session, in the `getEmberThreshold`/`evaluateEMBER` patent-safety context, and may already be built) versus which need to be built new. Do not assume the spec's own pseudocode names match real, current function names exactly — verify each one individually. Confirm the real, current shape of a game object's `state` field (`'pre'`/`'in'`/`'post'` per the spec — confirm this matches what's actually used elsewhere in the codebase, not assumed).

## TASK 1 — Build the gateway (Layer 1)

Implement `getDramaGateway(game)` per the spec's exact routing logic: `state==='post'` → `{mode:'score', value, arc, peak}`; `state==='pre'` → `{mode:'observation', value: <named pre-game state>}`; otherwise (live) → `{mode:'observation', value: <named live state>}`. Reuse existing helper functions found in TASK 0 wherever they exist; build genuinely missing ones minimally, matching the spec's own named states (`CLOSE_FINISH`/`CRUNCH_TIME`/`BLOWOUT`/`IN_PROGRESS` for live, `MARQUEE`/`SCOUTS_PICK`/`STANDARD` for pre-game) — don't invent different names than the spec already chose.

## TASK 2 — Wire the proof-of-concept sites (Layer 2, partial)

Per the spec's own stated priority, wire `renderDramaBadge()` and `renderOneToWatch()` (or their real, current equivalents — names may have drifted, confirm) to route through the gateway instead of their current direct/ad-hoc state checks. **Do not attempt to migrate all 35 existing sites in this CC-CMD** — that's real, separate follow-on scope per the spec's own "medium term" framing. This CC-CMD's job is proving the gateway works correctly at 2 real call sites, not a full migration.

## TASK 3 — Smoke enforcement (Layer 3)

Add the exact assertions the spec names: `typeof getDramaGateway === 'function'`, `getDramaGateway({state:'in'}).mode === 'observation'`, `getDramaGateway({state:'post'}).mode === 'score'`. Add a third real case the spec's own examples don't explicitly test but its logic implies: `getDramaGateway({state:'pre'}).mode === 'observation'` (pre-game must also never leak a score).

## TASK 4 — Verify

Real forced-condition tests: a real live game object through the gateway returns a named string, never a number, in `value`. A real post-game game object returns the real numeric score plus `arc`/`peak`. A real pre-game object returns a named pre-game state. Confirm the two proof-of-concept render sites produce identical visible output to their pre-fix behavior for at least one real example of each state (non-regression) — the gateway should change the internal path, not the user-visible result, for this CC-CMD's scope. `node smoke.js index.html`: baseline plus the new Layer 3 assertions.

## DONE CONDITION

`getDramaGateway()` exists, is proven correct via real forced tests for all 3 states, is wired into 2 real proof-of-concept sites with confirmed non-regressed output, and has permanent smoke enforcement. The 5 Amnesty Zone CC-CMDs have a real foundation to build against instead of the ad-hoc pattern.

**Confidence scoring:**
- TASK 0 (20 pts): real dependency check, not assumed; confirms real state-field convention
- TASK 1 (30 pts): gateway matches the spec's exact routing logic and named states, reuses real existing helpers where they exist
- TASK 2 (20 pts): 2 real sites wired, matching spec priority
- TASK 3 (10 pts): exact spec assertions plus the pre-game case
- TASK 4 (20 pts): real forced tests for all 3 states, real non-regression confirmed at both wired sites, smoke confirmed

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.

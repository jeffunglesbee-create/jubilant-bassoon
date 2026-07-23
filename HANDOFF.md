## SESSION CLOSE-OUT — 2026-07-23, chip-overflow-containment (supersedes previous)

**HEAD:** faf7cd5 (jubilant-bassoon) / c854f68 (field-relay-nba, unchanged)
**Smoke count:** 965/0 (unchanged)
**SW version:** 2026-07-23a (bumped from 2026-07-21b)
**Session doc:** outbox/cc-session-2026-07-23-chip-overflow-containment.md

**CC-CMD-2026-07-23-chip-overflow-containment — COMPLETE (confidence 100/100):**
- Root cause: `.stream-chip` had explicit `overflow:visible`; `.watch-now-btn` lacked `white-space:nowrap` and overflow handling; `.stream-row` grid layout needed `grid-column:1/-1` on watch-now-btn to span full 160px width.
- Fix (CSS-only, `index.html`): `.stream-chip` → `overflow:hidden;text-overflow:ellipsis;min-width:0`; `.watch-now-btn` → `+white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0`; `.stream-row>.watch-now-btn{grid-column:1/-1}`. Commit `aa53d8e`.
- Probe GHA (`chip-overflow-probe.yml`) + script (`chip_overflow_probe.js`) committed at `55a141a`.
- **VERIFIED LIVE** — GHA run 30026833587, 2026-07-23T16:50:19Z. Manifest `outbox/chip-overflow-probe-manifest-20260723T165048Z.json`: `noScrollWidthOverflow: true`, `noSiblingOverlap: true`, `allPass: true`, `totalChipsMeasured: 1`, `overflowingChips: 0`, `overlapPairCount: 0`.

**Carry-Forwards:** None.

---

## SESSION CLOSE-OUT — 2026-07-23, playground-write-allowlist (supersedes previous)

**HEAD:** c854f68 (field-relay-nba) / 5d82c04 (jubilant-bassoon, unchanged)
**Session doc:** field-relay-nba outbox/cc-session-2026-07-23-playground-write-allowlist.md

**CC-CMD-2026-07-23-playground-write-allowlist — COMPLETE (confidence 100/100):**
- `isPathAllowed(path, allowlist)` extended: new `if (allowlist === null) return true;` branch added after traversal checks — traversal/absolute-path guards remain unconditional for all repos including field-playground.
- Both `commit_file` and `commit_file_patch` call sites (lines 16063 and 16122) made repo-aware: `repo === 'field-playground' ? null : WRITE_ALLOWLIST`.
- Tool descriptions for both tools updated: appended ", except field-playground, which accepts any path".
- Commit: `fece902` (feat: field-playground writes are unrestricted). Deploy: success.
- **TASK 4 VERIFIED LIVE** — GHA run 30000577353 (`playground-write-allowlist-verify.yml`) at 2026-07-23T10:46:39Z:
  - TEST 1: `commit_file WRITE-ALLOWLIST-TEST.md repo=field-playground` → `{"created":true,"commit":"9925e2b..."}` — PASS
  - TEST 2: `commit_file SHOULD-BE-REJECTED.md repo=jubilant-bassoon` → `"Path not in WRITE_ALLOWLIST: SHOULD-BE-REJECTED.md"` — PASS (rejection intact)
- `WRITE_ALLOWLIST` contents for jubilant-bassoon/field-relay-nba **unchanged** (`['docs/', 'HANDOFF.md', 'CODE_MAP.json']`).

**Carry-Forwards:** None.

---

## SESSION CLOSE-OUT — 2026-07-21, ambient-skeleton-overlap (supersedes previous)

**HEAD:** 5d82c04 (jubilant-bassoon, includes probe results at 0e36412) / d637561 (field-relay-nba, unchanged)
**Smoke count:** 965/0 (+1 from A602b assertion, A602 regex updated)
**SW version:** 2026-07-21b (bumped from 2026-07-21a)
**Session doc:** outbox/cc-session-2026-07-21-ambient-skeleton-overlap.md

**Codex incident `ambient-panel-skeleton-overlap` — RESOLVED:**
- Root cause: Solid fine-grained rewrite (reconcile) does not implicitly clear skeleton siblings; wholesale-innerHTML used to clear them for free.
- Fix: `panel.querySelector('.ambient-skeleton')?.remove()` added inside `if (!panel._solidMounted)` block in `renderAmbientPanel()` (field.js), immediately after `panel._solidMounted = true`.
- CLAUDE.md Rule 89 added (RENDER-CHROME-A) — generalizes the pattern to any future surgical-render conversion.
- Smoke A602b added: regex-verifies `_solidMounted = true` is followed by `.remove()`.
- Live DOM verification VERIFIED: GitHub Actions probe run 3 (29876685790), 2026-07-21T23:18:49Z. wf_desktop_1440: solidMounted=true, skeletonPresent=false. ipad_820: solidMounted=true, skeletonPresent=false. 2/2 PASS. Screenshots + manifest committed at `0e36412`.
- Scroll regression: none. `updateAmbientData(reconcile)` path unchanged; `.ambient-scroll-inner` node never torn down.

---

## SESSION CLOSE-OUT — 2026-07-21, streak-board-client-swap (supersedes previous)

**HEAD:** 89d3350 (jubilant-bassoon) / d637561 (field-relay-nba)
**Smoke count:** 964/0 (+2 from A693b assertion)
**SW version:** 2026-07-21a (bumped from 2026-07-20a)
**Session doc:** outbox/cc-session-2026-07-21-streak-board-client-swap.md

**Codex incident `streak-board-metric-mismatch` — FULLY RESOLVED (both repos):**
- Relay side: field-relay-nba `11e6489` (Phase 13 runPhase13RecordStreakBoard, deployed 2026-07-21), `d637561` (CI probe updated to recompute yesterday+today so newspaper hard-check passes)
- Client side: jubilant-bassoon `89d3350` — Streak Board card now reads `bundle.record_streak_board` (Phase 13 real win/loss) instead of `bundle.streak_board` (Phase 7 journalism quality). Same hot/cold shape, same visual treatment, only source object changed.
- Degraded guard confirmed: `record_streak_board.degraded` checked (TASK 2 done).
- Smoke A693b added: asserts `record_streak_board` read, `streak_board` guard absent.
- All CI workflows passed on 89d3350: Smoke Test + Live Verify ✅, Client Live Invariant ✅, PL client verify ✅.

---

## SESSION CLOSE-OUT — 2026-07-20, pl-card-event-types (supersedes previous)

**HEAD:** 689d17b (jubilant-bassoon) / 8b2ec22 (field-relay-nba)
**Smoke count:** 963/0 (unchanged)
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-card-event-types.md

**PulseLive card event type probe — all types confirmed:**
- Probed fixtures 124837 (Man Utd 2-1 Chelsea GW5) and 125053 (Chelsea 1-1 Burnley GW27) via new `/pl/events/:id` relay endpoint.
- field-relay-nba `8b2ec22`: Added `/pl/events/:id` — returns `{ count, types[], events[] }` (textstream only, no fixture object). Fits in ~20KB, fully visible via probe_relay_route. Probe-only; no client consumer.
- Confirmed: `"red card"` (direct dismissal), `"secondyellow card"` (second yellow → dismissal, no space between "second" and "yellow").
- jubilant-bassoon `689d17b`: Key Moments filter at `field.js:39241` now includes all confirmed dismissal types: `red card`, `secondyellow card`.
- Prior open carry-forward (card types unconfirmed) — CLOSED.

---

## SESSION CLOSE-OUT — 2026-07-20, pl-client-verify (supersedes previous)

**HEAD:** 8d288e0 (jubilant-bassoon) / 45329db (field-relay-nba, unchanged)
**Smoke count:** 963/0 (unchanged)
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-match-client-wiring.md

**PL E2E browser verification — 20/20 passed:**
- jubilant-bassoon `120b829`: Added `window._plVerify` test API block in `field.js` (gated on `?pl-verify` URL param). Exposes `fetchPLMatch`, `openBottomSheet`, `toggleStatsView`, `setEspnScore` (setter for module-level `espnScores`), `pushAllDataSport` (setter for module-level `allData`). Required because `build-bundle.mjs` uses ESM format — all declarations are module-scoped, not globally accessible.
- jubilant-bassoon `8d288e0`: Fixed Probe 3 Lineups assertion to query `.bs-section` ancestor of the Lineups label (instead of `#stats-content` root), accepting `REF:` or `VAR:` or `4-2-3-1` as evidence.
- `pl_client_verify.js`: Fully rewritten to use `window._plVerify.*` for all internal access. 20/20 assertions verified on GH Actions run `29767592199`. Screenshots in `outbox/`.
- `pl-client-verify.yml`: Auto-triggers after every successful "Deploy gate (fast smoke)" run. Results committed to `outbox/` as `[skip ci]`.
- Integration status: VERIFIED — E2E browser tests 20/20, all three probes passing (fetchPLMatch relay contract, Key Moments bottom sheet, Stats tab Lineups).
- Open: card event types (yellow/red) not confirmed — need a booked match to verify type string. Carry-forward only.

---

## SESSION CLOSE-OUT — 2026-07-20, pl-match-probe (supersedes previous)

**HEAD:** 45329db (field-relay-nba) / ba4b233 (jubilant-bassoon, no new code)
**Smoke count:** 963/0 (unchanged)
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-match-probe.md

**PulseLive textstream probe + pagination fix:**
- Probed completed fixture 116197 (Bournemouth 2-0 Leicester GW38 2024/25) directly via PulseLive API. Confirmed event types: goal, substitution, miss, corner, offside, free kick, attempt blocked. Goal events include scorer, assister, foot, location in prose. 135 events per match.
- field-relay-nba `45329db`: `/pl/match/:id` now fetches pageSize=100 and all pages in parallel. Response is `{ fixture, events: <flat array> }`. Verified live via probe_relay_route — 50,400 bytes, formations + teamLists + matchOfficials + halfTimeScore + all events confirmed.
- MCP allow-list: `/pl` prefix already covered `/pl/match/:id` — no change needed.
- `/pl/match/:id` has NO client consumer. Bottom sheet wiring is the next step.

---

## SESSION CLOSE-OUT — 2026-07-20, pl-pulselive (supersedes previous)

**HEAD:** bdfbe82 (jubilant-bassoon) / 8bd5c19 (field-relay-nba)
**Smoke count:** 963/0
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-pulselive.md

**PL PulseLive endpoint + client wiring:**
- field-relay-nba `43c6076`: `/pl/*` route handler — `/pl/fixtures`, `/pl/match/:id`, `/pl/seasons` via `footballapi.pulselive.com`. 30s TTL on live routes, 1h on seasons. `/pl` added to MCP probe allow-list.
- jubilant-bassoon `9545f6c`: `fetchPLFixtures()` wired at boot + poll cycle; writes `espnScores` with `source:'pl'`; priority FD > PL > FPL.
- field-relay-nba `8bd5c19`: `/pl/fixtures` route smoke added to `post-deploy-live-verify.yml` (fires after every deploy).
- jubilant-bassoon `bdfbe82`: smoke.js A124 — PL_RELAY_BASE + fetchPLFixtures definition + boot call. 963/0.
- Integration status: STAGED — sandbox egress blocked E2E HTTP verify. Verify with curl during a live/completed PL fixture window (see session doc).

---

## SESSION CLOSE-OUT — 2026-07-20, adr002-rule-f (supersedes previous)

**HEAD:** f07a26b
**Smoke count:** 962/0
**SW version:** 2026-07-20a
**Session doc:** outbox/cc-session-2026-07-20-bottom-sheet-stats-reconciliation.md (same session, docs addendum)

**ADR-002 Rule F (docs-only, [skip ci]):**
- Added Rule F to `docs/ADR-002-CONTEXT.md`: commodity/proprietary governing test for relay computation
- "Arithmetic and classification ONLY" is imprecise (soccer-wp.js is already a statistical model on relay). Actual rule: relay may compute anything a neutral data vendor could publish; may never compute outputs that function as watch recommendations.
- Added neutral-vendor test, soccer-wp.js rationale, close-game-push prohibition
- Added PERMITTED item 8 (commodity statistical models on relay)
- Updated jubilant-bassoon CLAUDE.md Rule 6 shorthand to reference Rule F
- Updated field-relay-nba CLAUDE.md Rule 1 with the commodity/proprietary test (8088b74)

---

## SESSION CLOSE-OUT — 2026-07-20, bottom-sheet-stats-reconciliation

**HEAD:** 8c501b4
**Smoke count:** 962/0
**SW version:** 2026-07-19d (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-bottom-sheet-stats-reconciliation.md

**Bottom sheet / Stats tab reconciliation (CC-CMD-2026-07-19-bottom-sheet-stats-reconciliation.md):**
- `renderStatsSection()` — new "Today's Games" sub-section iterates allData.sports, renders buildScoutingReport(), standings, milestone alert, comeback probability, BSD pitch per game
- `openBottomSheet()` — removed: scoutReport, standingsStr, seriesMargins, milestoneStr, cb, _bsBsdEventId, _bsIsWC, post-game R2 fetch; Live Intelligence simplified to dramaLabel_bs only; Context simplified to matchupNote||localNote only
- smoke.js A_BSD_9/A_BSD_10 updated to new renderStatsSection location
- Smoke 962/0 before and after

---


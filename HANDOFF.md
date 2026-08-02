## SESSION CLOSE-OUT — 2026-08-02, wire-bsd-epl-live-stats (supersedes previous)

**HEAD:** 67e7885c (jubilant-bassoon)
**Smoke count:** 965/0
**SW version:** 2026-08-01b (bumped from 2026-08-01a)
**Session doc:** outbox/cc-session-2026-08-01-wire-bsd-epl-live-stats.md

**BSD EPL xG/possession wired into journalism context, `[XG]` line.**
Executed `CC-CMD-2026-08-01-wire-bsd-epl-live-stats.md` (found queued,
executed per standard confidence-gate pattern). Real finding: event_id
resolution needed zero new code — the relay's existing generic BSD live
enrichment already sets `game.bsdEventId` for any sport, reused as-is.
Pre-build probe caught the CC-CMD's assumed field names
(`home_xg`/`away_xg`/`possession_home`) were wrong — real shape is
`stats.{home,away}.expected_goals`/`.ball_possession`, verified against
a real finished match (BSD event 383) before writing code. Verified via
direct evaluation (real data + negative control), both passed.

**Honest limit:** EPL 2026-27 season hasn't started (Aug 21) — no live
match exists yet to verify the full path end-to-end. Code-complete,
direct-evaluation-verified; E2E verification has explicit unblock
criteria in the session doc (Rule 74), not an open carry-forward.

**Companion, same session, field-relay-nba:** `CC-CMD-2026-07-30-audit-
bracketdo-rule-a.md` also executed (investigation only, no code change)
— see `field-relay-nba/outbox/cc-session-2026-08-02-audit-bracketdo-rule-a.md`.
Verdict: partial mitigation, not a clean violation or pass — WebSocket
connection establishment is genuinely pull-gated, but no
`visibilitychange` handler exists, so the channel stays open and keeps
processing pushed messages while the tab is backgrounded (not navigated
away from in-app). Outlined, not implemented, two fix options with their
real tradeoffs.

### Carry-forwards
- Live E2E verification of BSD EPL stats — auto-unblocks Aug 21 2026, exact verify steps in the session doc.
- Whether to close the BracketDO visibilitychange gap — Jeff's call, per the audit's own framing.

---

## SESSION CLOSE-OUT — 2026-07-30, uefa-flags-flip (supersedes previous)

**HEAD:** 2452594e (jubilant-bassoon)
**Smoke count:** 965/0
**SW version:** 2026-07-30f (bumped from 2026-07-30e)
**Session doc:** outbox/cc-session-2026-07-30-uefa-flags-flip.md

**`FIELD_V2_SOURCES.ucl/europa/conference` flipped `false → true`.**
`epl` left `false` (genuine off-season). Resolves the carry-forward below
— but resolves it as "flags are correctly off-scope-empty right now, not
broken" rather than "now shows live data," because of two real gaps found
via direct probe (`probe_relay_route`, not assumed):
1. The live 2026-27 UEFA action is entirely under `uclqual`/`europaqual`/
   `conferencequal` sport keys, which have **zero entries** in
   `FIELD_V2_SOURCES` — not wired at all. Confirmed via probe: `sport=ucl`
   date=2026-07-29 → empty (main tournament hasn't started, correct);
   `sport=uclqual` same date → real finished qualifying matches (Kairat
   Almaty, CSU Craiova, etc.).
2. The relay's existing two-legged aggregate enrichment (ESPN-based,
   already fully wired end-to-end — NOT BSD, a stopped BSD-duplicate CC-CMD
   was abandoned this session once this was found) pre-filters on
   `/2nd leg|second leg/i` against ESPN's round string, but real qualifying
   rounds return `"UCL Qualifying, Second Round"` — regex will never match.

Both documented with explicit unblock criteria in the session doc. Neither
actioned this session — out of stated scope ("flip flags now").

### Carry-forwards
- Wire `uclqual`/`europaqual`/`conferencequal` into `FIELD_V2_SOURCES` + client fetch call sites.
- Widen relay's two-legged-aggregate round regex to match qualifying-round naming (scoped to `*qual` sports only).
- BracketDO Rule A concern remains open (separate audit): `docs/outbox/chat-update-2026-07-30-bracketdo-rule-a-concern.md`.

---

## SESSION CLOSE-OUT — 2026-07-30, layer4-cross-game-facts-pull (supersedes previous — closes today's 4-CC-CMD run)

**HEAD:** 8f6d45f0 (jubilant-bassoon)
**Smoke count:** 965/0
**SW version:** 2026-07-30e (bumped from 2026-07-30d)
**Session doc:** outbox/cc-session-2026-07-30-layer4-cross-game-facts-pull.md

**Layer 4 cross-game facts — BUILT, PULL-ONLY, VERIFIED.** Deliberately
NOT modeled on BracketDO (re-confirmed fresh: still autonomously
WebSocket-fans-out on threshold changes, a real Rule A violation shape).
No DO, no relay endpoint, no new storage — all 10 PL Final Day games
already co-located in the same in-memory `eplGames` array on every
render, so no coordinator is needed. `_applyLayer4CrossGameFacts(games)`
is a pure sync function (confirmed zero fetch/WebSocket/postMessage calls
via direct inspection), reads live scores via the same `findESPNScore`
every other card uses, reuses `PL_FD`/the four note functions from the
prior CC-CMD. Direct evaluation caught and fixed a real bug (a hardcoded
team-check mislabeled Man City as its own opponent on its own game) before
shipping — this is exactly the class of bug "looks right" review misses.

**File-size smoke gate note:** index.html's 2,600,000-byte structural
ceiling was crossed by this session's cumulative comment volume across
all 4 CC-CMDs; trimmed verbosity only (zero logic changes, re-verified
after each trim) to fit under it. Disclosed in the outbox, not silently
bundled.

**This closes today's 4-CC-CMD run** (fix-savant-wp-scale,
reconcile-soccer-base-formula, two-legged-aggregate [stopped at
confidence gate], wire-pl-final-day-stakes, layer4-cross-game-facts-pull
— 5 total counting the earlier fix-savant-wp-scale).

### Carry-forwards
- field-relay-nba CC-CMD: diagnose/fix `/v2/games?sport=ucl` (+`europa`/`conference`) not serving real live qualifier data (from the stopped two-legged-aggregate task).
- jubilant-bassoon CC-CMD (blocked on above): flip `FIELD_V2_SOURCES` date-gate, wire aggregate context into `dramaScoreLive`.
- BracketDO Rule A concern remains open (separate audit, not this session's scope): `docs/outbox/chat-update-2026-07-30-bracketdo-rule-a-concern.md`.

---

## SESSION CLOSE-OUT — 2026-07-30, pl-final-day-wiring (supersedes previous)

**HEAD:** 24061749 (jubilant-bassoon)
**Smoke count:** 965/0
**SW version:** 2026-07-30d (bumped from 2026-07-30c)
**Session doc:** outbox/cc-session-2026-07-30-pl-final-day-wiring.md

**PL Final Day notes — WIRED, VERIFIED:** `_plTitleNote`/`_plCityNote`/
`_plTotNote`/`_plWhuNote` (already-correct clinch math, previously zero
callers) now wired via `_applyPLFinalDayNote(g)` at the existing
`applyNarrativeContext(eplGames)` call site — reused, not invented. Sets
`g.matchupNote` when a team match (Arsenal/City/Tottenham/West Ham) AND
date gate (`PL_FINAL_DAY_DATE='2026-05-24'`) both hold. `PL_FD` data left
as-is (2026-27 season hasn't started; refreshing it is a separate, later
decision per the CC-CMD). Verified via direct evaluation (extracted real
committed code, ran against 6 real-shaped game objects) — all 4 notes
fire correctly, both negative controls (wrong team, wrong date) correctly
stay unset. Intentionally seasonal/dormant code, same pattern as
`inEFLPlayoffs()`.

### Carry-forwards
- Next real Final Day: refresh `PL_FD` + `PL_FINAL_DAY_DATE` together.

---

## SESSION CLOSE-OUT — 2026-07-30, two-legged-aggregate (STOPPED — confidence gate, no commit)

**HEAD:** 1d1f0a3e (unchanged — no code committed)
**Session doc:** outbox/cc-session-2026-07-30-two-legged-aggregate.md

**CC-CMD-2026-07-30-build-two-legged-aggregate-tracking — STOPPED, confidence
< 95, per explicit instruction.** Task 1's own required re-verification
surfaced a blocker the CC-CMD didn't anticipate: UCL/Europa/Conference
have no functional live-score pipeline right now, at all. Client-side,
`FIELD_V2_SOURCES.ucl/europa/conference` are flat `false` (not date-gated
like `wc26`/`nfl` in the same object) — stale since before this season's
qualifiers started July 7. Independently, the relay's own
`/v2/games?sport=ucl` returns zero games for a date (2026-07-29) where a
real match is confirmed to exist via direct ESPN probe. Building
aggregate-context scoring on top of a pipeline that never delivers real
`eData` to `dramaScoreLive` for these games would be unverifiable and
likely dead code. Not built. Two follow-up CC-CMDs needed (one
field-relay-nba, one jubilant-bassoon, sequenced) before this becomes
buildable — see outbox doc for exact scope of each.

**What WAS confirmed useful, verified live:** ESPN's own public API
already computes and serves per-competitor `aggregateScore` plus a `leg`
object natively for two-legged ties — real shape confirmed via direct
probe. Once the relay-side gap is fixed, aggregate context should be
cheap to source (either from ESPN directly or via whatever the relay's
UCL fix ends up using).

### Carry-forwards
1. field-relay-nba CC-CMD: diagnose/fix `/v2/games?sport=ucl` (+`europa`/`conference`) not serving real live qualifier data.
2. jubilant-bassoon CC-CMD (blocked on #1): flip `FIELD_V2_SOURCES` date-gate, wire aggregate context into `dramaScoreLive`.

---

## SESSION CLOSE-OUT — 2026-07-30, reconcile-soccer-base-formula (supersedes previous)

**HEAD:** 1d1f0a3e (jubilant-bassoon)
**Smoke count:** 965/0
**SW version:** 2026-07-30c (bumped from 2026-07-30b)
**Session doc:** outbox/cc-session-2026-07-30-reconcile-soccer-base-formula.md

**Soccer base drama formula — RECALIBRATED, VALIDATED:** decision task,
not a bug fix. Live table (0.72/0.32/0.06) confirmed genuinely never
revisited — the July 4 fix referenced in its own adjacent comment only
fixed WC26 sport-label routing, never touched these values; no outbox
record exists; the May 12 spec doc cites no empirical calibration either.
Adopted the May spec's numbers (0.85/0.90-if-bothScored/0.45/0.15) after
validating against 17 real live MLS results (CI-as-proxy): May's numbers
score every non-tied real match higher, one-directional, matching the
spec's own soccer-specific reasoning better than the old table's
basketball-shaped decay. `bothTeamsScored` built as a real signal
(confirmed not vacuous against real games). `timeBonus`/`upsetBonus`/
Layers 2-4 untouched, per explicit scope.

### Carry-forwards
- None from this task.

---

## SESSION CLOSE-OUT — 2026-07-30, fix-savant-wp-scale (supersedes previous)

**HEAD:** 54f4724d (jubilant-bassoon)
**Smoke count:** 965/0
**SW version:** 2026-07-30b (bumped from 2026-07-30a)
**Session doc:** outbox/cc-session-2026-07-30-fix-savant-wp-scale.md

**Savant WP scale bug — FIXED, VERIFIED:** `fetchSavantGameFeed`'s own
adjacent comment claimed a 0-1 fraction; Savant's raw response is actually
0-100 (re-confirmed live today, gamePk 822946, before touching anything).
Two live consumers were silently broken: `dramaScoreLive`'s `wpBonus`
could only ever land at exactly 0 or its 25pt cap (never between), and the
WP chip's `awayWp = 1 - homeWp` fired unconditionally on every live
Savant-sourced MLB game regardless of actual closeness. Fix: normalize
`wp`/`wpa` by `/100` inside `fetchSavantGameFeed` itself — single
function, single point, both consumers untouched (already correct for a
0-1 input). Behavioral proof included: synthetic before/after shows
`wpBonus` going from pinned-25/pinned-25 to genuinely proportional
(4.95/11.25) for the same test sequence. `fetchESPNWinProb` (NBA)
independently re-confirmed correct, not touched.

### Carry-forwards
- None from this fix.

---

## SESSION CLOSE-OUT — 2026-07-27, journalism-archive-link-fix (supersedes previous)

**HEAD:** 00ea8eca (jubilant-bassoon) / 1bed89d (field-relay-nba)
**Smoke count:** 965/0 (unchanged count, fixed 2 pre-existing SW_VERSION-sync failures)
**SW version:** 2026-07-26b (bumped from 2026-07-26a)
**Session doc:** outbox/cc-session-2026-07-27-journalism-archive-link-fix.md

**Journalism archive-link fix — COMPLETE, VERIFIED:**
- User-reported symptom: Journalism tab stuck on single latest brief, no way to browse past ones.
- Investigated first (Rule 72): `renderJournalismArchive()` + relay `/archive/query?brief_type=slate&source=cron&limit=7` already existed and already worked (live-verified: 7 real days returned). Root cause was that `renderJournalism()`'s empty-sections branch never appended the archive link — only the `sections.length>0` branch did. Any visitor opening the tab before today's brief loaded had no entry point to the archive at all.
- Fix: `src/legacy/field.js` — append the same archive link in both branches. Single-concern, matches existing label/onclick exactly.
- Also reconciled pre-existing SW_VERSION drift: a prior CI commit had bumped index.html's SW_VERSION directly without updating field.js, causing field.js → index.html sync to silently regress the version on the next sync. Both files now correctly at 2026-07-26b.
- Live-verified via `html_probe` against the deployed sw.js: `SW_VERSION = '2026-07-26b'` confirmed live, proving the same-commit journalism fix is deployed.
- **Not adopted:** a separately-built field-relay-nba endpoint (`/journalism/brief/history`, commit cff1477) turned out unnecessary — the existing `/archive/query` path already served this need. Left in place as harmless, uncalled infrastructure; flagged in both repos' outboxes so it isn't later mistaken for orphaned dead code.

**Carry-Forwards:**
- None new. Full manual click-through of the archive link (not just live SW_VERSION artifact) not performed — sandbox has no browser access to *.workers.dev.

---

## SESSION CLOSE-OUT — 2026-07-24, playground-run (supersedes previous)

**HEAD:** 49a129c (field-playground, main) / 798fb2b (jubilant-bassoon, unchanged) / c854f68 (field-relay-nba, unchanged)
**Smoke count:** 965/0 (unchanged)
**SW version:** 2026-07-23a (unchanged)
**Session doc:** field-playground main

**playground first run — COMPLETE:**
- `vite.config.js`: added `mockRelay()` Vite plugin. `configureServer` middleware intercepts `/analytics/newspaper/{date}` and `/context/date/{date}` in dev mode, returning real-shaped mock data (real field names, realistic game states: pre/live/final/F-OT, reason arrays, pick tiers). Regex match extracts date from URL so `currentDate` signal works correctly even with mock.
- `src/data/relay.js`: `RELAY_BASE` now uses `import.meta.env.DEV ? '' : 'https://field-relay-nba.jeffunglesbee.workers.dev'` — relative URLs in dev hit the mock middleware; prod still targets the worker. Permanent addition, not a one-off hack.
- **App run confirmed via Playwright headless screenshot** — both panels rendered the happy path: AmbientPanel showing `morning_report` prose + three pick rows with tier badges and reason chips; DeskCard showing 8 games across MLB/MLS/WNBA grouped by sport, mix of pre/live/final/F-OT states with animated live dot. No console errors on second pass (first-pass 404 was Vite HMR WebSocket noise, disappeared on re-run).
- **Skeleton → content transition structurally correct** — `<Switch><Match>` means skeleton and content are mutually exclusive by construction. There is no code path where both could be visible; the bug class the experiment targets is not expressible in this component structure.

**What the run confirmed about the experiment question:**
- The skeleton-overlap bug (Codex: `ambient-panel-skeleton-overlap`) required an explicit `.remove()` call in field.js because the skeleton was a DOM sibling that nothing automatically cleared. In this SolidJS rebuild, the skeleton is the `when={ambientData.loading}` branch of `<Switch>` — it physically cannot coexist with the content branch. The old bug is not "harder to write" here; it is not writable. The conditions that produced it do not exist in this rendering model.
- The chip overflow bug class (CSS containment nobody's job) is not addressed differently by SolidJS — it's a CSS/component-structure question, not a reactivity question. Per-component CSS files make the omission more localized and visible, but don't prevent it.

**Carry-Forwards:**
- Side-by-side comparison with production app still not done — real visual fidelity check pending.
- Remaining newspaper fields unsurfaced: `truth_is`, `night_stars`, `streak_board`, `record_streak_board`, `composite_brief`, `contradiction`, `broken_record`, `completed_games`, `preview`, `late`, `quality_feedback`, `quality_alert`, `sport_of_week`. Shapes unknown.
- `briefs`, `series`, `standings` from context endpoint also unused.
- Experiment write-up not committed to the repo yet — the answer is known (skeleton-overlap class: not writable; overflow class: same footguns, different location) but not written into `docs/SOLIDJS-BUILD.md` as a concluded result.

---

## SESSION CLOSE-OUT — 2026-07-24, playground-setup (supersedes previous)

**HEAD:** 2c3d183 (field-playground, main) / 798fb2b (jubilant-bassoon, unchanged) / c854f68 (field-relay-nba, unchanged)
**Smoke count:** 965/0 (unchanged — field-playground has no smoke suite)
**SW version:** 2026-07-23a (unchanged)
**Session doc:** field-playground main

**CC-CMD playground-setup — COMPLETE + MERGED TO MAIN:**
- `docs/SOLIDJS-BUILD.md` (formerly `docs/GROUND-UP-DESIGN.md`) — design doc for Desk card + Ambient panel SolidJS rebuild. Captures why SolidJS specifically answers the skeleton-overlap experiment question: `<Show>` / `<Switch>` / `<Match>` are reactive expressions, not imperative calls, so the "old content visible while new content mounts" class of bug is structurally awkward to write, not just easy to miss.
- Vite + SolidJS scaffold wired: `package.json` (solid-js ^1.9.0, vite ^6.0.0, vite-plugin-solid ^2.11.0), `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`.
- `src/data/relay.js`: both resources wired to live relay. `currentDate` is a `createSignal(todayStr())` — both `createResource` calls take it as source, so `setCurrentDate('YYYY-MM-DD')` refetches both panels without a page reload. Endpoints: `/analytics/newspaper/{date}` (AmbientPanel) + `/context/date/{date}` (DeskCard), both on `field-relay-nba.jeffunglesbee.workers.dev`, plain GET, no auth.
- `src/components/AmbientPanel/`: `morning_report` as prose block; `pick.ranked` as a list of rows — tier badge (A/B/C with semantic colour), sport tag, matchup, final score, reason badges. `reasons` confirmed array of short tag strings (e.g. `"prime time"`, `"postseason/elimination"`) on live data back to 2026-07-19; rendered as small bordered chips via `<For each={p().reasons}>` directly, no defensive wrapping.
- `src/components/DeskCard/`: `games.regular` + `games.postseason` merged, grouped by sport via a `createMemo`. Each row: animated dot (pre=dim, live=blinking green, final=grey), matchup, score/status derived from `home_score === null` and `finalized_at`. F/OT from `went_to_ot`.
- All state branches handled via `<Switch><Match>` — skeleton/error/content are mutually exclusive by construction, not by flag management.
- Mock artifact published at `https://claude.ai/code/artifact/1f0e9dfd-d387-4ab8-b3d1-c41c658834d2` — static hardcoded data matching real relay shapes, dark/light theme, pulsing live dot.
- Build verified clean (vite build, 13 modules, 20.9KB JS / 4.3KB CSS).

**Merge to main — conflict resolution (2026-07-24):**
- Work was on `claude/playground-setup-njng55` (5 commits, f09e618→f36df12). ChatGPT had pushed 3 commits directly to main while the branch was in progress: `5812e4b` (their own `docs/GROUND-UP-DESIGN.md` — 8-principle founding spec traced to real incidents), `cb2472c` (README update), `d93591d` (stub `package.json` to satisfy environment setup).
- Conflict 1 — `docs/GROUND-UP-DESIGN.md`: two genuinely different documents. ChatGPT's kept as `docs/GROUND-UP-DESIGN.md` (repo founding principles). Ours moved to `docs/SOLIDJS-BUILD.md` (SolidJS implementation plan). Both on main.
- Conflict 2 — `package.json`: ChatGPT's was a stub (empty deps, no scripts). Ours (full SolidJS project) kept.
- Merge commit: `2c3d183`. Branch `claude/playground-setup-njng55` closed.

---

## SESSION CLOSE-OUT — 2026-07-23, chip-probe-coverage-disclosure (supersedes previous)

**HEAD:** 798fb2b (jubilant-bassoon) / c854f68 (field-relay-nba, unchanged)
**Smoke count:** 965/0 (unchanged)
**SW version:** 2026-07-23a (unchanged)
**Session doc:** outbox/cc-session-2026-07-23-chip-probe-coverage-disclosure.md

**CC-CMD-2026-07-23-chip-probe-coverage-disclosure — COMPLETE (confidence 100/100):**
- `chip_overflow_probe.js` only. Added `lowCoverage` (bool, threshold 3) and `coverageNote` (string|null) to manifest. `Result:` console line now appends the coverage note inline when `lowCoverage` is true — caveat visible in same glance as `ALL PASS ✓`, not buried in JSON.
- Commit `798fb2b`. GHA run 30030834080, 2026-07-23T17:46:20Z. Console output (verbatim): `Result: ALL PASS ✓ [LOW COVERAGE: only 1 chip(s) measured this run -- a pass here does not confirm the fix broadly. Re-trigger during a busier live slate for real confidence.]`
- Manifest `outbox/chip-overflow-probe-manifest-20260723T174703Z.json`: `lowCoverage: true`, `coverageNote: "LOW COVERAGE: ..."`, `allPass: true`, `noScrollWidthOverflow: true`, `noSiblingOverlap: true`.

**Carry-Forwards:** None.

---

## SESSION CLOSE-OUT — 2026-07-23, chip-overflow-containment (supersedes previous)

**HEAD:** 6407652 (jubilant-bassoon) / c854f68 (field-relay-nba, unchanged)
**Smoke count:** 965/0 (unchanged)
**SW version:** 2026-07-23a (bumped from 2026-07-21b)
**Session doc:** outbox/cc-session-2026-07-23-chip-overflow-containment.md

**CC-CMD-2026-07-23-chip-overflow-containment — COMPLETE (confidence 100/100):**
- Root cause: `.stream-chip` had explicit `overflow:visible`; `.watch-now-btn` lacked `white-space:nowrap` and overflow handling; `.stream-row` grid layout needed `grid-column:1/-1` on watch-now-btn to span full 160px width.
- Fix (CSS-only, `index.html`): `.stream-chip` → `overflow:hidden;text-overflow:ellipsis;min-width:0`; `.watch-now-btn` → `+white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0`; `.stream-row>.watch-now-btn{grid-column:1/-1}`. Commit `aa53d8e`.
- Probe GHA (`chip-overflow-probe.yml`) + script (`chip_overflow_probe.js`) committed at `55a141a`.
- **VERIFIED LIVE (run 1)** — GHA run 30026833587, 2026-07-23T16:50:19Z. Manifest `outbox/chip-overflow-probe-manifest-20260723T165048Z.json`: `allPass: true`, label `"[object Object]"` (rendering bug, not overflow).
- Bug fix: `field.js:735` — `chipSR` (first stream element) is a legacy object `{name, url, ...}`; direct template interpolation coerced to `"[object Object]"`. Added `chipSRName` extraction: `typeof chipSR === 'string' ? chipSR : (chipSR?.name || '')`. Commit `6407652`.
- **VERIFIED LIVE (run 2)** — GHA run 30028847993, 2026-07-23T17:19:26Z. Manifest `outbox/chip-overflow-probe-manifest-20260723T171918Z.json`: `allPass: true`, `noScrollWidthOverflow: true`, `noSiblingOverlap: true`, `overflowingChips: 0`, `overlapPairCount: 0`, `label: "MLB.TV"` (real name confirmed).

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


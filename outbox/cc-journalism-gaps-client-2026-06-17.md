# Journalism Gap Fixes — Client Side

**Date:** 2026-06-17
**Spec:** Drive 1pMPSqKsIdxrdVI1akPkF5_QliRpaQYfcSqh6r-tLqHg
**Scope:** Desktop journalism nav + companion quality denominator + forward-going client archive wiring (J2 series_preview, stakes_brief).
**Branch:** main (also pushed to claude/elegant-shannon-t2dvt0)

---

## Commits

| Commit | SHA | Summary |
|---|---|---|
| E | `1eb7d53` | Gate `body.journalism-mode` schedule hide list inside `@media(max-width:1199px)` so desktop journalism is additive, not a tab-swap. A630 + A612 rationale update. |
| F | `2f2ef6b` | Companion Quality panel prose-score denominator `/180` → `/300`. A631. |
| D | `81dc5c7` | `_archiveBrief({briefType,sport,gameId,briefText,qualityScore,model})` helper at module scope adjacent to legacy `archiveBrief()`. A632. |
| G | `ee2b025` | Wire `_archiveBrief` into both renderSeriesPreviewCard branches (big-game inline + non-big-game placeholder) after sessionStorage.setItem. A633. |
| I | `ebfc8a4` | Wire `_archiveBrief` into stakes-brief client-generation branch (post `fetchStakesBriefFromClaude`); KV-hit branch left untouched (relay owns archival for that path). No new smoke (covered by A632). |
| J | (this commit) | SW_VERSION 2026-06-17d → 2026-06-17e in index.html + sw.js. Outbox note. |

Final smoke: **668 passed / 0 failed** (664 baseline + A630/A631/A632/A633 = 668).

---

## Desktop journalism layout — verification at ≥1200px

Before this fix, `body.journalism-mode` hid `.main`, `#night-owl`, `#field-desk-section`, `#media-section`, `#streaming-section`, `#wc-section`, `.page-divider`, `.legend-section`, `#upper-slots`, `#field-right-now`, and `#ambient-panel` at all viewports — the journalism tab consumed the full desktop viewport like the mobile/iPad tab-swap. The June 15 "desktop bug fix" had promoted the hide list out of the @media wrapper.

After Commit E: the hide list is wrapped back in `@media(max-width:1199px){ ... }`. Section visibility rules (`#field-journalism-section` show/hide on the `journalism-mode` class) remain global so the section appears in journalism-mode at every width and hides outside journalism-mode at every width. At ≥1200px the schedule + journalism column co-reside (companion `#jrn-companion` populated by renderJournalismCompanion).

`toggleJournalismView()` already gates `window.scrollTo({top:0})` behind `window.innerWidth < 1200` (line 12382-12388). At ≥1200px it calls `sec.scrollIntoView({behavior:'smooth',block:'start'})` instead. No change required.

A630 pins the new contract: the rule must NOT be at column 0 and MUST appear inside an @media(max-width:1199px){ block.

---

## Quality denominator

`renderJournalismCompanion()` Block 5 now renders `${Math.round(avgScore)}/300` for the prose-score row. The scoreClass thresholds (good ≥145, warn <120) were calibrated against the 300-scale Layer 3 composite — only the displayed denominator was off. Stat depth (`${avgStat.toFixed(1)}/sent`) is unchanged.

---

## Stakes brief path — found and wired

The stakes-brief client-generation path was located at `renderStakesBriefCard` (function spans ~lines 27944-28000 in current HEAD). It has two terminal branches:

1. **KV cache hit** via `fetchPrerenderedGameBrief(espnIdS)` — these briefs originate relay-side and the relay queue/sweep already archives them.
2. **Client-side generation** via `fetchStakesBriefFromClaude(game)` — these briefs are generated in the browser via Claude proxy and never enter the relay queue or KV.

Commit I added `_archiveBrief({briefType:'stakes_brief', ...})` to branch 2 only, after the existing `sessionStorage.setItem` + legacy `archiveBrief()` call. Branch 1 was deliberately left untouched (no double-count risk).

`stripMarkdown(text)` was hoisted into a local `_stakesClean` so the displayed text, sessionStorage row, legacy archiveBrief() row, and new _archiveBrief() row all reference the same string instead of re-stripping markdown four times.

---

## Rules honored

- **Rule 5 (try/catch on archive calls)** — `_archiveBrief` wraps body in `try { ... } catch(_) {}` and the `fetch().catch(()=>{})` is mandatory. Backend failure cannot block sessionStorage writes or the visible brief render.
- **Rule 1 (do not invent)** — no fabricated data added.
- **Rule 4 (SW_VERSION sync)** — bumped index.html + sw.js in lockstep to `2026-06-17e`.
- **Rule 5 (single-concern commits)** — six commits, each with one logical change.
- **Game_recap and game_brief untouched** — those types remain owned by the relay queue consumer (8e3745a) + KV sweep (ef1fda7) + reactive /archive/game/{id} capture. The new `_archiveBrief` helper is NOT called from those paths.

---

## Carry-forward / known gaps

- `qualityScore` is passed as `null` from both series_preview call sites because `scoreProse()` resolves asynchronously inside `fetchSeriesPreviewFromClaude` (via `renderProseScore` sink) and is not in scope at the render call site. A future pass could thread the score back through the return value if D1 dashboards want the client-side L3 score for those types. For now the relay-side path captures quality for queue-routed types; client-emitted types accept the gap.
- The legacy positional `archiveBrief()` calls remain alongside the new `_archiveBrief()` calls. This is intentional belt-and-suspenders during the migration window — the relay-side schema columns covered by the old call (e.g., `context_hash`) continue to fill while the new fields (`model`, `quality_score`, `source`) start populating. A follow-up session can collapse the dual writes once the D1 dashboard reads exclusively from the new columns.

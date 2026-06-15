# Combined Cleanup — Task A + B + C — Execution Log

**Date:** 2026-06-15
**Specs:** `docs/CC-CMD-2026-06-15-archive-d1.md` (Tasks 4-5), `docs/CC-CMD-2026-06-15-dead-code.md` (Tasks 2-7)
**Pre-state:** HEAD `954c631`, smoke `653 / 0`, units `66 / 0`, `wc -c index.html` = **2,069,216**

---

## Task A — Remove dead May schedule entries ✅ COMPLETE

D1 `field-archive` is fully seeded (19 postseason_games, 146 regular_season_games,
5 postseason_series), relay endpoints are live, `ARCHIVE_RELAY_READY=true`.
The in-file May entries are now dead — data is served from D1 via the
`/archive/*` routes.

**Method.** Brace-aware Python parser (counts braces inside string-aware state
machine) walks the file. For every entry-opening line matched by
`^\s+\{(\s*[a-zA-Z_]+\s*:|home:|away:|league:)`, extends to the matching close
brace and inspects the joined text for `start_time:"2026-05-`. Single-line and
multi-line entries (matchupNote / streams / nationalBundle / crew on
continuation lines) are removed atomically — zero orphan continuation lines
left behind.

**Result.**
- Entries removed: **193** (matches `grep -c 'start_time:"2026-05-'` baseline)
- May references remaining: 19 — all legitimate: 1 comment, 1 Rome window
  constant, 5 broadcast/preview overlay startDate/endDate ranges, 4 EFL
  playoff start/end constants, 2 French Open / WC preview constants
- JS parse OK across all 3 `<script>` blocks
- Smoke: 653 → **653 / 0** (no assertion targets in removed data)
- SW_VERSION 2026-06-15a → **2026-06-15b**

**Bytes.** `index.html`: 2,069,216 → 2,012,437 (**−56,779 bytes / −2.7%**).

Single commit: `2525c12`.

---

## Task B — Dead code cleanup (CC-CMD-dead-code Tasks 2-7) ✅ COMPLETE

Per-task notes:

### Task 2 — Betting CSS removed
- `.betting-head` + `.betting-head::after`
- `.betting-title`
- `.betting-icon`
- `.betting-disclaimer`
- `@keyframes oddsFlash`
- `.bet-odd.changed`
- `.bet-grid` + `.bet-title` responsive overrides (`@media`)
- `.betting-section` removed from the `@media(min-width:1600px)` comma list (kept `.media-section,.streaming-section`)
- `.bet-grid{ grid-template-columns:1fr !important; }` responsive block deleted
- **Kept:** `.odds-source-ai` (live WP display per spec)

### Task 3 — Dead functions (zero callers)
- `fetchNBAOddsViaRelay()` — 7 lines
- `toImplied(oddsStr)` — 9 lines (line 11658)
- `toImpliedNum(oddsStr)` — 8 lines (line 21142)
- `isVolatileMatchup(game)` **retained** — has 1 live caller in `buildVibeChips`
  (line 32603). Per spec: "find the containing function and verify it has zero
  callers before removing." 1 caller. Body still guards on `game.odds?.moneyline`
  which is always undefined now, so the VOLATILE chip simply never fires. No
  dead-code damage from leaving the inert branch.

### Task 4 — Dead variables
- `let oddsIntervalId = null;` declaration removed (~line 15883)
- `if(oddsIntervalId){...}` cleanup branch removed from the date-change handler (~line 7671)

### Task 5 — Dead localStorage references
- Odds Budget `try` block (~line 4608) — the entire `oddsReq` health-panel row removed
- `field_odds_*` dropped from the delta15 TTL sweep (~line 6016)
- `'odds-relay-adapter': '2026-05-18'` entry removed from the feature inventory map (~line 5156)
- Doc comment updated: `field_odds_*` removed from the "Covers:" list

### Task 6 — Stale comments
- `<!-- Attention bar — live odds urgency (Step 7) -->` → `<!-- Attention bar — live game urgency (Step 7) -->`
- `// Note: odds polling, media and betting are today-specific` → `// Note: media is today-specific`
- Removed: `// Odds chips — inject after sport odds load from The Odds API cache`
- Removed: `// Also re-renders Betting Intelligence section if it was empty on first try`
- `// Media + betting rendered lazily by IntersectionObserver` → `// Media rendered lazily by IntersectionObserver`
- `// All functions below were inadvertently dropped in the betting-engine removal commit.` → `// All Squiggle functions below were inadvertently dropped in an earlier removal commit.` (kept the Squiggle restore context)

### Task 7 — Gray items
**Decision: retain.** Spec says to remove if dead. Verification shows they are alive:

- `_cflSpread` / `_cflTotal` / `_cflBookmakers`: DOM writes exist at lines 9774
  (badge-row trigger) and 9778-9783 (gotd-badge with CFL odds label), plus
  journalism log row at 23378.
- `_cflOddsCache` is fed by live relay `/cfl/odds-probs` at line 28085 — spec's
  "DO NOT TOUCH" list explicitly preserves `_cflOddsCache`.
- CFL `gotd-badge` is therefore reachable when `_cflOddsCache.length > 0`.
- Per CLAUDE.md Rule 48 (DO NOT ASSUME): no removal without verification that
  the relay endpoint is offline. Endpoint is live; code path is live.

Single commit: `741cef4`.

**Smoke:** 653 / 0 (no assertion changes needed for Task B).

---

## Task C — `enrichChampionshipFromArchive` ✅ COMPLETE

**Design.** `buildChampionshipContext` stays synchronous as required. Added
`enrichChampionshipFromArchive(game, ctx)` as a thin async wrapper that:

1. No-ops if `ctx` is null, `ctx.winner` missing, or `fetchSeriesArchive`
   undefined.
2. Looks up `ctx.winner` in `_PATH_TO_FINALS_KEY` — a four-entry map of the 2026
   Finals teams to their conference-final `series_key`:
   - `New York Knicks` → `nba-ecf-2026`
   - `San Antonio Spurs` → `nba-wcf-2026`
   - `Carolina Hurricanes` → `nhl-ecf-2026`
   - `Vegas Golden Knights` → `nhl-wcf-2026`
3. Calls `fetchSeriesArchive(key)` — that helper handles the
   `ARCHIVE_RELAY_READY` gate, sessionStorage cache, 2.5s timeout, and JSON
   parse. Returns `null` on any failure, so the wrapper falls through.
4. On success, builds `pathToFinals` string. Prefers `series.narrative` from D1
   (already written into the seed). Falls back to a one-line composed
   description from `lower_seed/higher_seed/result/round/mvp`.
5. Returns `{ ...ctx, pathToFinals }`. Mutations are non-destructive — original
   keys preserved.

The four call sites all carry the optional `pathToFinals` into their
`[CHAMPIONSHIP CONTEXT]` block via a conditional line:

```
${ctx.pathToFinals ? `\nPath to Finals: ${ctx.pathToFinals}` : ''}
```

So the prompt is byte-for-byte identical for the (a) non-clinch case (ctx is
null upstream), (b) clinch case with no archive match in the key map, or (c)
clinch case where the archive fetch fails or is gated off.

### Wiring per call site

| # | Call site | File location | Pattern |
|---|---|---|---|
| 1 | J2 series brief — `fetchSeriesPreviewFromClaude` | line ~23906 | `let _j2ChampCtx = buildChampionshipContext(...)`; `await enrichChampionshipFromArchive(g, _j2ChampCtx)` |
| 2 | Card-tap brief — `fetchGameBriefOnDemand` | line ~27199 | `let champCtx = buildChampionshipContext(...)`; `await enrichChampionshipFromArchive(game, champCtx)` |
| 3 | Claude Night Owl — `fetchNightOwlFromClaude` | line ~33345 | `let _noChampCtx = buildChampionshipContext(...)`; `await enrichChampionshipFromArchive(topGame, _noChampCtx)` |
| 4 | **Static Night Owl** — post-`renderCard` patch | line ~35011 | IIFE after `renderCard(buildNightOwlStatic(...))`. Computes ctx, awaits enrich, splices `pathToFinals` into rendered text via DOM patch: `_textEl.textContent = _cur.replace(/Full breakdown in tomorrow/, _enriched.pathToFinals + ' Full breakdown in tomorrow')`. |

(1-3) are inside `async function` so direct `await` works. (4) is the
"parallel async enrichment that patches context after initial render" the spec
asks for — first paint never blocks on archive latency; if archive returns
nothing, the rendered card is unchanged.

### Smoke

Two pre-existing assertions (A604, A605) had to widen from `const champCtx` /
`const _j2ChampCtx` to `(?:const|let)` since the refs are now reassigned.
Logic unchanged.

Added **A611** pinning:
- `async function enrichChampionshipFromArchive(game, ctx)` exists
- `_PATH_TO_FINALS_KEY` map present with NBA + NHL entries
- All four call sites use the wrapper

Final smoke: **654 / 0**. Units **66 / 0** (unchanged).

Single commit: pending below.

---

## Combined byte/smoke summary

| Step | `wc -c index.html` | Smoke |
|---|---|---|
| Pre-work (`954c631`) | 2,069,216 | 653 / 0 |
| After Task A (May entries) | 2,012,437 | 653 / 0 |
| After Task B (dead code) | 2,008,962 | 653 / 0 |
| After Task C (archive enrichment + A611) | **2,013,115** | **654 / 0** |

Net: −56,101 bytes / −2.7%. Task C re-adds ~4 KB for the wrapper +
4 call-site patches + DOM-patch IIFE.

---

## ADR-002 status

CLEAN. The archive path-to-finals narrative is factual game outcome text
(series result, MVP, sweep status) sourced from D1 — no drama scoring, no
composite interest level, no recommendation. The wrapper is null-safe under
every failure mode, so the prompt path degrades gracefully to the
unenriched form.

## What ships

- `index.html` — May entries removed; betting CSS/functions/variables/localStorage cleanup; `enrichChampionshipFromArchive` wrapper + 4 wired call sites; SW_VERSION bumped 2026-06-15a → 2026-06-15b.
- `sw.js` — SW_VERSION 2026-06-15a → 2026-06-15b.
- `smoke.js` — A604 / A605 widened to accept `let` reassignment; A611 added.
- `outbox/cc-combined-cleanup-2026-06-15.md` — this file.

## Carry-forward

- `field-relay-nba` lifecycle is out of session scope. Path-to-finals
  enrichment is keyed against the 5 archive series — when 2027 playoffs add
  new finals teams, extend `_PATH_TO_FINALS_KEY` map and seed new series rows.
- `isVolatileMatchup` left intact pending broader pass on V2-only odds
  population.
- CFL odds gray items left intact pending verification of relay
  `/cfl/odds-probs` endpoint health (out of jubilant-bassoon scope).

# Archive-Consuming Client Features Phase 2 — Execution Log

**Date:** 2026-06-15 (ET) / 2026-06-16 UTC
**Spec:** `docs/CC-CMD-2026-06-15-client-features-2.md`
**Pre-state:** HEAD `f323b47`, smoke `660 / 0`, SW_VERSION `2026-06-15e`.
**Post-state:** smoke **664 / 0**, SW_VERSION **`2026-06-15f`**.

Four features, one SW bump, six commits. Every relay fetch is fire-and-forget
with `.catch(() => {})`; every render gracefully no-ops on 404 / empty payload
/ relay outage.

---

## Commit 1 — Upset Archaeology ✅

**Commit:** `0b6a9b4` · `feat(upset-archaeology): journalism tab — underdog wins from D1 archive`

New "Upsets" section in `#field-journalism-section` below the Archive Timeline.

### Added

- **HTML** (line ~4283): `<div id="jrn-upsets" hidden>`.
- **CSS** (after `.jrn-arch-empty`): 14 selectors —
  `.jrn-upsets`, `.jrn-upsets-head`, `.jrn-upsets-eyebrow`, `.jrn-upsets-sub`,
  `.jrn-upsets-list`, `.jrn-upset-card` (+ `.major` for DISCOVERY tier teal accent),
  `.jrn-upset-date`, `.jrn-upset-body`, `.jrn-upset-matchup` (+ `b`),
  `.jrn-upset-meta` (+ `.jrn-upset-tag` with DISCOVERY/standard variants),
  `.jrn-upset-empty`.
- **JS** (after `loadArchiveTimeline`):
  - `_upsetExtractGames(payload)` — tolerates `Array | {results} | {upsets} | {games}` envelopes.
  - `_isUpset(g)` — moneyline-aware: opening_odds.moneyline OR opening_odds OR odds.moneyline with `{home, away}` American odds. Underdog = max price; upset = underdog won.
  - `_upsetDogPrice(g)` — returns the positive (dog) price for sorting + tagging.
  - `renderUpsets(games)` — filters via `_isUpset`, sorts by dog price desc, renders top 8. Major upset (dog price > +300) gets `.major` modifier (teal DISCOVERY accent).
  - `loadUpsets()` — fetches `/archive/upsets` first; on null/error/empty payload, fans out to `/archive/query?limit=20`. Cache: `field_archive_upsets` (30-min TTL). Both paths `.catch(() => {})`.

### Wiring

`renderJournalism()` calls `loadUpsets()` immediately after `loadArchiveTimeline()`, wrapped in `try { … } catch(_) {}`.

---

## Commit 2 — Market Consensus Tracker ✅

**Commit:** `ebafe60` · `feat(market-consensus): journalism tab — MARKET WATCH aggregate stats by sport`

New "Market Watch" section below Upset Archaeology.

### Added

- **HTML** (line ~4287): `<div id="jrn-market-consensus" hidden>`.
- **CSS** (after `.jrn-upset-empty`): 7 selectors —
  `.jrn-market-consensus`, `.jrn-mc-head` (Chakra Petch display font),
  `.jrn-mc-list`, `.jrn-mc-row` (dotted dividers), `.jrn-mc-row:last-child`,
  `.jrn-mc-label`, `.jrn-mc-stats` (+ `b`).
- **JS** (after `loadUpsets`):
  - `_consensusFavoriteWonRate(games)` — favorite = lower (more negative) moneyline. Returns `{rate, n}` or null.
  - `_consensusHomeWinRate(games)` — home wins / games with both scores.
  - `_consensusOverRate(games)` — uses opening_odds.total or odds.total; pushes (sum == line) excluded from denominator.
  - `computeMarketConsensus(games)` — buckets by sport, requires ≥3 games per bucket, returns `[{sport, n, favRate, homeRate, overRate}]` sorted by sample size descending.
  - `renderMarketConsensus(games)` — top 6 sports as `Label | "Favorites X% · Home Y% · Overs Z%"` rows.
  - `loadMarketConsensus()` — reuses the `field_archive_upsets` cache when present (avoids a duplicate `/archive/query` round-trip); otherwise pulls `/archive/query?limit=50` and writes the same cache key.

### Wiring

`renderJournalism()` calls `loadMarketConsensus()` immediately after `loadUpsets()`, same try/catch pattern.

---

## Commit 3 — Brief Corpus Intelligence ✅

**Commit:** `54e9b7f` · `feat(brief-corpus): health panel — Brief Quality row with 7-day trend`

New row in the FIELD Health panel showing rolling brief quality_score average + trend.

### Added

- **HTML in `buildFieldHealthPanel`**: placeholder row
  `<div id="fhp-brief-quality" class="fhp-row" style="opacity:.75">⏳ Brief Quality Loading from /archive/query…</div>`
  rendered synchronously so the panel layout doesn't shift when the async data lands.
- **JS** (after `showFieldHealthPanel`):
  - `_briefQualityClassify(avg)` — returns `{cls, icon}`: `fhp-ok / ✅` if `avg > 200`, `fhp-warn / ⚠️` if `150-200`, `fhp-err / ❌` if `< 150`. Color routing matches the existing Health panel classes.
  - `renderBriefQualityRow(briefs)` — sorts by date desc, takes top 14 with non-null `quality_score`, computes the average, and derives a 7-day trend arrow (`↑` if recent half avg exceeds prior half by >5, `↓` if it falls behind by >5, `→` otherwise). Replaces the placeholder via `outerHTML` so the row keeps its `id`.
  - `loadBriefQualityRow()` — pulls `/archive/query?brief_type=slate&source=cron&limit=14`. Cache: `field_archive_brief_quality` (30-min TTL).

### Wiring

`showFieldHealthPanel()` calls `loadBriefQualityRow()` 120ms after panel mount (after `fetchMCPStatus` is queued). Wrapped in `try { … } catch(_) {}`.

---

## Commit 4 — Crew Tracker ✅

**Commit:** `5c6694f` · `feat(crew-chip): card-right — commentator chip below broadcast stream-row`

Pure client-side — no relay dependency.

### Added

- **CSS** (after `.crew-line`):
  ```css
  .crew-chip{font-size:.7rem;color:var(--text-dim,#888);display:block;margin-top:2px;
             line-height:1.35;letter-spacing:.01em;text-align:right;padding-right:.25rem;opacity:.85}
  ```
  Matches the spec verbatim (font-size, color, display, margin-top) plus right-alignment to sit cleanly under the broadcast pills.
- **Card render** (line ~10078, inside `card-right` block, right after `stream-row`):
  ```html
  ${g.crew?`<span class="crew-chip" title="Broadcast crew">🎙 ${g.crew}</span>`:""}
  ```

The existing `.crew-line` render at line ~10067 in `card-body` is unchanged — the chip is a compact restatement adjacent to the broadcast bundle pills, the line is the full crew with verbose formatting. Crew data is already populated on postseason game objects (NBA Finals, Stanley Cup Final entries have Mike Breen / Sean McDonough crews per network).

---

## Commit 5 — Smoke assertions A618-A621 ✅

**Commit:** `da9abcf` · `test(smoke): A618-A621 pin upsets + market consensus + brief corpus + crew chip`

| Assertion | Pins |
|---|---|
| **A618** | `renderUpsets` + `loadUpsets` + `_isUpset` fns + `/archive/upsets` + fallback `/archive/query?limit=20` + `#jrn-upsets` div + `'field_archive_upsets'` key + wired into `renderJournalism` + `.catch(() => {})` |
| **A619** | `computeMarketConsensus` + `renderMarketConsensus` + `loadMarketConsensus` + three rate helpers + `#jrn-market-consensus` div + `'Market Watch'` label + wired into `renderJournalism` |
| **A620** | `#fhp-brief-quality` row + `renderBriefQualityRow` + `loadBriefQualityRow` + `/archive/query?brief_type=slate&source=cron&limit=14` URL + `↑ ↓ →` trend arrows + `_briefQualityClassify` with the three tiers (`avg > 200` / `avg >= 150` / `< 150`) |
| **A621** | `.crew-chip` CSS class with the spec's exact `font-size:.7rem; color:var(--text-dim,#888); display:block; margin-top:2px` + conditional render `g.crew?` emitting class="crew-chip" span in card-right |

Smoke: 660 → **664 / 0**.

---

## Commit 6 — SW_VERSION bump ✅

**Commit:** `9cacd53` · `chore(sw): bump SW_VERSION 2026-06-15e → 2026-06-15f`

Rule 23: ET is still 2026-06-15 (21:54 ET = 01:54 UTC the next day) so the suffix increments to `f`. A515 (SW_VERSION ET-date check) enforced.

---

## Final state

| Metric | Pre | Post |
|---|---|---|
| Smoke | 660 / 0 | **664 / 0** |
| SW_VERSION | 2026-06-15e | **2026-06-15f** |
| JS parse | 3/0 fail | 3/0 fail |
| `index.html` byte delta | — | +14,720 bytes (+0.71%) |
| Commits this run | — | 6 (`0b6a9b4`, `ebafe60`, `54e9b7f`, `5c6694f`, `da9abcf`, `9cacd53`) |

## Fire-and-forget verification

| Fetch | Caller | Catch handler |
|---|---|---|
| `/archive/upsets` | `loadUpsets()` (primary) | `.catch(() => {})` |
| `/archive/query?limit=20` | `loadUpsets()` (fallback) | `.catch(() => {})` |
| `/archive/query?limit=50` | `loadMarketConsensus()` | `.catch(() => {})` |
| `/archive/query?brief_type=slate&source=cron&limit=14` | `loadBriefQualityRow()` | `.catch(() => {})` |
| (none) | `.crew-chip` render | n/a — pure conditional template |

Every wired call site is additionally wrapped in `try { … } catch(_) {}` so a ReferenceError inside any new function never bubbles into the main render path.

## Graceful 404 behavior

| Feature | Endpoint absent → outcome |
|---|---|
| Upset Archaeology | `/archive/upsets` 404 → falls back to `/archive/query?limit=20`. If that also fails or returns no games, `#jrn-upsets` stays `hidden`. |
| Market Consensus | `/archive/query?limit=50` 404 → `#jrn-market-consensus` stays `hidden`. If response has no games with `opening_odds`, `computeMarketConsensus` returns `[]` → also hidden. |
| Brief Corpus | `/archive/query?brief_type=slate&source=cron&limit=14` 404 → placeholder `⏳ Brief Quality Loading…` stays in place. If response has no briefs with `quality_score`, replaced with `— Brief Quality No archived briefs with quality_score yet`. |
| Crew Chip | No relay dependency. Only renders when `g.crew` is truthy. |

## Mobile-first verification

All four features use the existing responsive breakpoint patterns. P2 (375px) behavior:
- Upset cards wrap inside `.jrn-upset-body` (flex-1, min-width:0, word-break:break-word).
- Market Watch rows use baseline-aligned flex with `.jrn-mc-label` min-width:6.5rem giving the stats area ~8rem of room on a 375px viewport — fits.
- Brief Quality row inherits `.fhp-row` styling (already validated at P2).
- Crew chip is `display:block; text-align:right; padding-right:.25rem` — wraps naturally if long crew strings don't fit in one line.

## ADR-002 status

CLEAN.
- Upset Archaeology surfaces score + odds — factual market vs result delta, not a recommendation or interest score.
- Market Consensus is aggregate win-rate / cover-rate / over-rate by sport — descriptive statistics, no classification of any individual game.
- Brief Quality is the existing JQ telemetry surfaced one level up. No drama or interest scoring.
- Crew chip is broadcast metadata already present in the source object.

## What ships in `jubilant-bassoon`

6 commits, 1 outbox doc:

- `index.html` — helpers, target divs, CSS, wiring, crew chip in card-right, SW bump
- `sw.js` — SW_VERSION bump
- `smoke.js` — A618 / A619 / A620 / A621
- `outbox/cc-client-features-2-2026-06-15.md` — this file

# Archive-Consuming Client Features — Execution Log

**Date:** 2026-06-15 (ET) / 2026-06-16 UTC
**Spec:** `docs/CC-CMD-2026-06-15-client-features.md`
**Pre-state:** HEAD `bb98ba0`, smoke `657 / 0`, SW_VERSION `2026-06-15d`.
**Post-state:** smoke **660 / 0**, SW_VERSION **`2026-06-15e`** (Rule 23 — ET is still 2026-06-15).

Three features ship. Each is a fire-and-forget enhancement on top of the existing
journalism / streaming / filter-bar surfaces. **None can break the main schedule
render** — every relay fetch is wrapped in `.catch(() => {})` and every JS hook
is wrapped in `try { … } catch(_) {}`.

---

## Commit 1 — Historical Narrative Graph ✅

**Commit:** `00ee928` · `feat(archive-timeline): journalism tab — FIELD Archive timeline section`

Inside `#field-journalism-section`, between `#jrn-content` and the existing
"Yesterday's FIELD →" archive link.

### Added

- **HTML** (line ~4279): `<div id="jrn-archive-timeline" class="jrn-archive-timeline" hidden>`.
- **CSS** (after `.jrn-archive-link`): 17 new selectors — `.jrn-archive-timeline`,
  `.jrn-arch-row`, `.jrn-arch-row.expanded`, `.jrn-arch-date`, `.jrn-arch-meta`,
  `.jrn-arch-type` (+ `.slate`, `.wc_tab`, `.game_recap`, `.night_owl` semantic
  routing), `.jrn-arch-qs`, `.jrn-arch-snippet`, `.jrn-arch-empty`.
- **JS** (~line 12183): `renderArchiveTimeline(briefs)` + `loadArchiveTimeline()`.

### Behavior

- Loader fires from `renderJournalism()` right after `renderJournalismCompanion()`.
- URL: `${V2_RELAY_BASE}/archive/query?brief_type=slate&source=cron&limit=7`.
- Response shape tolerated: `Array | {results} | {briefs}`.
- Cache: `sessionStorage['field_archive_timeline']` with `{ ts, data }`, 30-min
  stale-after-write TTL.
- Render: up to 10 rows of `date | type-badge | QS-chip | 110-char snippet`.
- Tap a row → toggles `.expanded`, swaps snippet to full text via
  `decodeURIComponent(dataset.full)`.
- On 404 / network failure / parse failure / `_archiveBase` undefined: the
  section stays `hidden`. `.catch(() => {})` mandatory on the fetch.

---

## Commit 2 — Broadcast Archaeology ✅

**Commit:** `55d842d` · `feat(broadcast-archaeology): streaming section — bundle usage from D1 archive`

Inside `#streaming-section`, below `#streaming-grid`.

### Added

- **HTML** (line ~4358): `<div id="broadcast-archaeology" hidden>`.
- **CSS** (after `.streaming-grid`): 14 new selectors — `.broadcast-archaeology`,
  `.bcast-row`, `.bcast-stripe` (+ 8 sport-specific variants: `sport-nba`,
  `sport-nhl`, `sport-mlb`, `sport-wnba`, `sport-cfl`, `sport-nfl`, `sport-wc26`,
  `sport-epl`), `.bcast-name`, `.bcast-count`, `.bcast-empty`.
- **JS** (right after `renderStreaming`): `buildBroadcastSummary(games)`,
  `renderBroadcastArchaeology(games)`, `loadBroadcastArchaeology()`.

### Behavior

- Loader fires from the existing `streaming-section` IntersectionObserver, in
  the same callback as `renderStreaming()`.
- **Data source resolution.** Per spec note: `/archive/query` returns briefs,
  so the spec's fallback path is used — `fetchArchiveDate(iso)` (existing
  helper from CC-CMD-2026-06-15-archive-d1 wiring) called 14 times in parallel
  for the last 14 days. Each call is independently `.catch(() => null)`-wrapped.
- `Promise.all` flattens all returned arrays into one game list and feeds
  `buildBroadcastSummary`.
- `buildBroadcastSummary(games)` is a **pure function**. Tolerates 4 streams
  shapes per game: `streams: string`, `streams: [string, …]`,
  `streams: [{bundle, label, id}, …]`, plus the WC26-path `nationalBundle`
  string. De-duplicates per game (single game contributing two streams to the
  same bundle counts once). Returns `[{bundle, count, sport}]` sorted by
  count desc → name asc.
- Render: top 12 bundles in a vertical list. Each row has a sport-color
  stripe via the `bcast-stripe.sport-*` class set, the bundle name, and a
  `{count} games` tail.
- Cache: `sessionStorage['field_broadcast_archaeology']` with `{ ts, games }`,
  30-min TTL. Stores the flat game list, not the rendered summary, so
  `buildBroadcastSummary` can re-derive on shape changes without a re-fetch.
- On `ARCHIVE_RELAY_READY=false` or all-null parallel results: target stays
  hidden.

---

## Commit 3 — Schedule Conflict Map ✅

**Commit:** `47a5bb1` · `feat(conflict-map): filter bar — amber CAUTION chip when 3+ games share an hour`

**Pure client-side.** No relay. Hooked into the existing schedule render pipeline.

### Added

- **HTML** (after `#sport-filters` in `nav.controls`):
  `<div id="conflict-chip-wrap" class="conflict-chip-wrap" hidden></div>`.
- **CSS** (after `.bcast-empty`): 11 new selectors — `.conflict-chip-wrap`,
  `.conflict-chip` (+ `:hover`), `.conflict-chip-icon`, `.conflict-chip-count`,
  `.conflict-detail`, `.conflict-detail-head`, `.conflict-detail-row`
  (+ `:last-child`), `.conflict-detail-time`, `.conflict-detail-game`,
  `.conflict-detail-bundle`. Uses the `--caution` token (amber `#f59e0b`).
- **JS** (right before `renderAll`): `findConflicts(games)`,
  `renderConflictChip(conflicts)`, `updateConflictChip()`.

### Behavior

- `findConflicts(games)` — groups by `new Date(g.start_time).toISOString().slice(0,13)`
  (`YYYY-MM-DDTHH`), filters slots with `>= 3` games, returns
  `[{slot, hour, games[], count}]` sorted by `count desc → slot asc`.
- `renderConflictChip(conflicts)` — paints the amber chip:
  - 1 slot: `⚠ {N} games at {hour-am/pm}`
  - Multiple slots: `⚠ {N} games at {hour} · +K more`
- Tap the chip → expands a detail panel listing up to 4 conflicting slots
  with up to 6 games per slot, each row showing `time | matchup | bundle hint`.
  Outside-click closes.
- `updateConflictChip()` — re-derives on every `renderAll()`. Idempotent;
  empty conflicts → wrap goes back to `hidden`.
- Wired into `renderAll()` at the same callsite as `initRightNowIndexer`
  (line ~10130), wrapped in `try { … } catch(_) {}`.

---

## Commit 4 — Smoke assertions A615 / A616 / A617 ✅

**Commit:** `56475fd` · `test(smoke): A615-A617 pin archive timeline + broadcast archaeology + conflict map`

Each assertion is a 5-8 clause AND chain pinning function names, the
target div id, the relay URL pattern, the sessionStorage key, the call-site
wiring, and the fire-and-forget contract.

| Assertion | Pins |
|---|---|
| **A615** | `renderArchiveTimeline` + `loadArchiveTimeline` + `/archive/query?brief_type=slate&source=cron&limit=7` URL + `'field_archive_timeline'` key + `#jrn-archive-timeline` div + wired into `renderJournalism` + `.catch(() => {});` contract |
| **A616** | `buildBroadcastSummary(games)` + `renderBroadcastArchaeology(games)` + `loadBroadcastArchaeology` + `#broadcast-archaeology` div + `fetchArchiveDate(iso).catch(() => null)` fan-out + `'field_broadcast_archaeology'` key + wired into streaming observer |
| **A617** | `findConflicts(games)` + `≥ 3` filter + `renderConflictChip` + `#conflict-chip-wrap` + `.conflict-chip` class + `updateConflictChip` + wired into `renderAll` + `--caution` semantic token |

Smoke: 657 → **660 / 0**.

---

## Commit 5 — SW_VERSION bump ✅

**Commit:** `6fc800b` · `chore(sw): bump SW_VERSION 2026-06-15d → 2026-06-15e`

Rule 23: ET is still 2026-06-15 (21:06 ET, 01:06 UTC the next day) so the
suffix increments rather than rolling to a new day. A515 (SW_VERSION ET-date
check) enforced this — the initial `2026-06-16a` attempt tripped A515.
Both `index.html` and `sw.js` updated.

---

## Final state

| Metric | Pre | Post |
|---|---|---|
| Smoke | 657 / 0 | **660 / 0** |
| SW_VERSION | 2026-06-15d | **2026-06-15e** |
| JS parse | 3/0 fail | 3/0 fail |
| `index.html` byte delta | — | +13,728 bytes (+0.68%) |
| Commits this run | — | 5 (`00ee928`, `55d842d`, `47a5bb1`, `56475fd`, `6fc800b`) |

## Fire-and-forget verification

Every relay fetch in the new code paths:

| Fetch | Caller | Catch handler |
|---|---|---|
| `/archive/query?brief_type=slate&source=cron&limit=7` | `loadArchiveTimeline()` | `.catch(() => {})` |
| `fetchArchiveDate(iso)` × 14 in parallel | `loadBroadcastArchaeology()` | `.catch(() => null)` per call + outer `.catch(() => {})` on `Promise.all` |
| (none) | `findConflicts` / `updateConflictChip` | n/a — pure client-side derivation |

All hook call sites in `renderJournalism`, the streaming-section observer,
and `renderAll` are additionally wrapped in `try { … } catch(_) {}` so a
ReferenceError inside any new function cannot bubble.

## Mobile-first verification

All three features use existing responsive breakpoint patterns:

- Archive timeline rows wrap naturally inside `.jrn-arch-body` (flex-1,
  `min-width:0`, `word-break:break-word`).
- Broadcast Archaeology rows use the same single-column flex pattern as
  the journalism slate list; sport-stripe + name + count fit on a 375px row.
- Conflict chip uses `white-space:nowrap` for the chip itself; the detail
  panel is `min-width:240px;max-width:340px` which fits inside P2 (390px)
  viewport with margins.

## ADR-002 status

CLEAN. The archive timeline shows brief snippets — same editorial prose
already shown in the Journal tab. The broadcast archaeology is aggregate
counts over bundle strings — no drama scoring, no composite interest
levels. The conflict chip is a deterministic count of games sharing a
clock hour — a viewer-need signal, not a recommendation.

## What ships in `jubilant-bassoon`

5 commits, 1 outbox file:

- `index.html` — helpers, target divs, CSS, wiring
- `sw.js` — SW_VERSION bump
- `smoke.js` — A615 / A616 / A617
- `outbox/cc-client-features-2026-06-15.md` — this file

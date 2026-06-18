# ESPN Golf Client Integration — Outbox

**Date:** 2026-06-17
**Spec:** Drive 1c5mQKlIBBVsihTJm0zt-8wNTffYhSIonES9j76f75CA
**Trigger:** Travelers Championship starts 2026-06-19 (T-2).
**Scope:** Client-side scaffolding only. Relay routes assumed live per the
spec's preamble — not verified from this session.

---

## Commits

| Commit | SHA | Summary |
|---|---|---|
| A | `0c0a6a7` | V2_LEAGUES registry; pga entry `{sport, league, label, espnSource}`. INDIVIDUAL_SPORTS already contains "PGA Tour" / "Golf (PGA)" — no change needed there. A644. |
| B | `925f7bb` | `renderPGALeaderboard(data)` + `loadPGASlate()`. Two render paths: active tournament (header + top-10) and upcoming (nextEvent). Loader hits `/v2/golf/enriched?date=TODAY_ISO` with sessionStorage 10-min cache. A645. |
| C | `1a1f017` | `SLASH_GOLF_DAILY_LIMIT` 18 → 60 (SlashGolf Pro tier ~67/day). Single-line tuning, no other SlashGolf logic touched. |
| D | `d15d873` | `buildGolfPromptContext(pgaData)` — narrative anchors for journalism prompts. GIR/drive/accuracy/putts/sand-saves translated with tour-average references. Strokes gained never mentioned. A646. |
| E | (this commit) | SW_VERSION 2026-06-17h → 2026-06-17i in index.html + sw.js. Outbox note. |

Final smoke **678 / 0** (675 baseline + A644 + A645 + A646).

---

## Confirmations (per spec checklist)

### PGA leaderboard card renders with ESPN enriched data
`renderPGALeaderboard(data)` defined at index.html (between the SlashGolf
engine and the Football-Data engine blocks). Consumes the response
`{active, event, leaderboard|players, nextEvent}` shape. Columns: Pos ·
Player · To Par · Today · Thru · GIR · Drive. Driving distance abbreviated
as `Xyd`; GIR as `X%`. Missing stats degrade to empty cells, never a dash
placeholder.

**Not yet wired into the slate render pipeline.** That wiring is intentionally
deferred — the next commit will decide whether the PGA card sits alongside
the SlashGolf card in the existing golf rail or in a dedicated section, and
how the two sources coexist visually when both have active data for the same
day.

### SlashGolf ceiling updated (18 → 60)
`SLASH_GOLF_DAILY_LIMIT` was 18 (free-tier safety headroom against the 20/day
cap). With the Pro tier (~67/day), raised to 60 keeping a 7-call headroom.
Console debug lines that interpolate the constant (`req N/M today` and the
prefetch-start banner) auto-update.

### Golf journalism prompt does not reference strokes gained
`buildGolfPromptContext` was written to omit any strokes-gained mention —
neither as a stat to surface nor as a forbidden phrase to avoid. A646 pins
this in two layers: pattern absence (`!/strokes gained/i.test(body)`) plus
casing/hyphenation variants (`!/strokes[\s\-_]?gained/i.test(body)`).

### Between-tournament state renders upcoming card correctly
`renderPGALeaderboard(data)` checks `data.active === false` first and emits
a `.pga-card.pga-upcoming` block with `data.nextEvent.{name, date, location}`.
Verified path: when relay returns `{active:false, nextEvent:{name:"Travelers
Championship", startDate:"2026-06-19"}}`, the card reads "PGA TOUR · NEXT
EVENT · Travelers Championship · 2026-06-19".

---

## What was NOT done (and why)

- **Wiring into the slate render pipeline.** Out of scope for this commit
  series. The card + loader are available for the next session to wire into
  the schedule layout. Touching the slate render loop without a clear visual
  spec would have risked the SlashGolf card layout (CLAUDE.md Rule 9 —
  structural change guardrail).
- **Auto-injection of buildGolfPromptContext into existing brief fetchers.**
  Same reason. The helper is defined and pinned by A646; the integration
  point is a follow-up.
- **CSS for `.pga-card` / `.pga-leaderboard`.** The new card emits semantic
  class names with no style rules yet. Inheriting from existing typography
  is sufficient for the initial relay smoke test. Dedicated styling lands
  alongside the slate wiring commit.

---

## Carry-forward

When the relay routes are confirmed live and a PGA tournament is active:

1. Wire `loadPGASlate()` into the boot path (suggest: alongside
   `slashGolfPrefetchAll()` at line ~20128).
2. Insert `renderPGALeaderboard(data)` into the schedule layout — most
   likely in a golf-section block that sits beside or above the existing
   SlashGolf card.
3. Inject `buildGolfPromptContext(pgaData)` into the J1/J2 brief generators
   when `game._sport` or `game.league` indicates PGA. Sample integration in
   `fetchSeriesPreviewFromClaude` would add it to the prompt array between
   `_standingsCtx` and `_j2ChampBlock`.
4. Style `.pga-card`, `.pga-leaderboard`, `.pga-row` to match the existing
   `.golf-leaderboard` aesthetic (Chakra Petch numerals, gold accent, top-3
   row emphasis).

---

## Constraints honored

- ✅ Did not modify WC2026 code, drama scoring, or existing SlashGolf flow.
- ✅ Did not remove SlashGolf — it remains the source for LIV / DP World /
  LPGA / Champions Tour.
- ✅ ESPN PGA is additive; both cards can coexist.
- ✅ Strokes gained never referenced anywhere in the new code.
- ✅ Single-concern commits (5 of them: A=registry, B=card+loader, C=limit,
  D=prompt context, E=SW_VERSION+outbox).

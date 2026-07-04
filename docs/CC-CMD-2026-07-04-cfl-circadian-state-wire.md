# CC-CMD: Wire CFL's live `state` field into renderAll's circadian input

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** `renderAll`'s `_circInput` construction (index.html, search
`_circEData=typeof findESPNScore` — line number will have shifted, re-verify).

**Why — real, confirmed gap, found while wiring CFL's live scoreboard,
not new work:** `CC-CMD-2026-07-04-cfl-live-scoreboard-wire` added a
real `state` field (`'pre'|'in'|'post'`) to each live-fetched CFL game
object, derived from the relay's real tournament-level `status`. But
`renderAll`'s per-card circadian computation only ever reads `state`
from `findESPNScore(g)?.state` — never from `g.state` directly:
```javascript
const _circEData=typeof findESPNScore==='function'?findESPNScore(g):null;
const _circInput={state:_circEData?_circEData.state:null,status:g.status,_aflComplete:g._aflComplete,_id:g._id};
```
CFL has no ESPN/V2 score-polling coverage (ESPN's CFL feed is dead,
confirmed frozen since 2023; CFL is not in `FIELD_V2_SOURCES`), so
`findESPNScore(cflGame)` always returns `null` — meaning CFL's new
`state` field is currently **inert**. CFL games still classify as
`'LATE'` via `getCardCircadian`'s final fallback, exactly as before the
live-scoreboard wire, DESPITE now carrying real live state data. This
directly undercuts the circadian-card-sort-order work (CFL games never
sort as PRIME even when actually live) and `getNewspaperVoice`'s
bucketing (CFL games never count as live/finished for voice purposes).

**Confirmed via direct trace, not assumed:** grepped for `_circInput=`
and `_circEData=`, read the exact construction, confirmed `findESPNScore`
matches only via `espnScores`/`findScore` (ESPN/V2 source-tagged score
stores), confirmed CFL writes to neither.

**Target time:** ~15 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95. This touches `_circInput`
construction, which EVERY sport's per-card circadian computation
depends on (MLB via `.status`, AFL via `._aflComplete`, WC26/V2 via
`findESPNScore`) — treat as shared infrastructure per this repo's
structural-change guardrail (CLAUDE.md Rule 9). Map every current
caller/dependent before changing anything.

## PROBE BLOCK (run before any edits)
```bash
grep -n "_circEData=typeof findESPNScore\|_circInput=" index.html
grep -n "^function getCardCircadian" index.html
grep -n "cfl_" index.html   # confirm the live CFL game object's _id prefix + state field, re-verify shape
```
Re-confirm the exact current line and that CFL's live game objects still
set `state: 'pre'|'in'|'post'` the way this doc describes — the prior
CC-CMD's implementation may have changed by the time this runs.

## TASK 1 — Add a direct `g.state` read as a fallback source for `_circInput`

Change:
```javascript
const _circEData=typeof findESPNScore==='function'?findESPNScore(g):null;
const _circInput={state:_circEData?_circEData.state:null,status:g.status,_aflComplete:g._aflComplete,_id:g._id};
```
To (prefer `_circEData`'s state when a real ESPN/V2 match exists —
don't change behavior for any sport that already has coverage — and
fall back to `g.state` only when no such match exists, which is
currently CFL-only but written generically so any FUTURE sport with no
ESPN/V2 coverage but its own `state` field benefits the same way):
```javascript
const _circEData=typeof findESPNScore==='function'?findESPNScore(g):null;
const _circInput={state:(_circEData?_circEData.state:null)??g.state??null,status:g.status,_aflComplete:g._aflComplete,_id:g._id};
```
**Verify this doesn't change behavior for MLB/AFL/WC26/V2**: none of
those sports' game objects carry a `.state` field of their own outside
of what `findESPNScore` already supplies (confirm via grep/read, not
assumption) — so the `?? g.state` fallback should be a no-op for them,
only activating for CFL (and structurally, any future sport in the same
situation).

## TASK 2 — Verify live, not just by code review

Confirm via CI-as-proxy that a CFL card's `data-circadian` attribute now
reflects its real state (`PREVIEW` for a scheduled game, `NIGHT`/`LATE`
appropriately for a completed one, depending on `minutesSinceFinal`) —
not unconditionally `LATE` anymore.

## SCOPE BOUNDARY

DO:
- Add the `?? g.state` fallback exactly as specified, in `_circInput`'s construction only
- Verify no behavior change for MLB/AFL/WC26/V2
- Verify live that CFL cards now classify correctly

DO NOT:
- Change `getCardCircadian`, `isGameOver`, `minutesSinceFinal`, `getNewspaperVoice`, or `applyNewspaperVoice`
- Change anything in `CC-CMD-2026-07-04-cfl-live-scoreboard-wire`'s own scope (the live fetch/mapping itself)
- Add a `g.state` fallback anywhere other than this one `_circInput` construction

## DONE CONDITIONS
- [ ] Probe block re-run, current state confirmed
- [ ] `?? g.state` fallback added exactly as specified
- [ ] Confirmed via read: no behavior change for MLB/AFL/WC26/V2 (none carry their own `.state` outside `findESPNScore`)
- [ ] Live verification via CI-as-proxy: a real CFL card now shows correct circadian classification (not unconditionally LATE)
- [ ] `node smoke.js index.html` exits 0
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-cfl-circadian-state-wire-{date}.md`

## COMPLIANCE
- Rule 68: probe block first
- Rule 87: self-completing

## CONFIDENCE SCORING TABLE
+35  Fallback added exactly as specified, correctly scoped to `_circInput` only
+35  Verified no behavior change for MLB/AFL/WC26/V2
+20  Live verification confirms CFL classification is now correct
+10  CI confirms deployed, smoke clean

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-cfl-circadian-state-wire.md.
Re-confirm current line/shape via PROBE BLOCK. Add the `?? g.state`
fallback to renderAll's `_circInput` construction exactly as specified.
Verify no behavior change for MLB/AFL/WC26/V2. Verify live that CFL
cards now classify correctly. Do not commit unless confidence ≥ 95. If
score < 95 report verbatim and stop — do not invent results.

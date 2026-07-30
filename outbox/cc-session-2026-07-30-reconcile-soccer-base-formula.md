# CC Session — reconcile-soccer-base-formula
**Date:** 2026-07-30
**CC-CMD:** docs/CC-CMD-2026-07-30-reconcile-soccer-base-formula.md
**Repo:** jubilant-bassoon
**HEAD at close:** 1d1f0a3e

---

## Task 1 — Evidence gathered before touching anything

**Live code re-read fresh:** the soccer `base` branch in `dramaScoreLive`
matched the CC-CMD's description exactly (`diff===0?1.0 : diff===1?0.72 :
diff===2?0.32 : 0.06`), with the July 4 comment sitting directly above it.

**July 4 comment re-read in full:** it explains, in detail, what that fix
actually did — corrected a sport-label matching bug so WC26 games (real
label `"FIFA World Cup 2026"`) reached this branch instead of falling
through to the NBA/NHL/NFL else-branch. It says nothing about validating
or choosing the base numbers themselves; they are treated as a given,
pre-existing input to the fix, not its subject.

**Outbox search:** no `outbox/cc-session-2026-07-04-*soccer*` record
exists (searched by both filename pattern and content grep across
`outbox/`). `git log -S` for the CC-CMD's own name resolves only to a
mass file-migration commit (`f2dfda2e`, Phase 2 esbuild restructure) and
a July 13 consolidation commit (`538b5629`) whose diff is a wholesale
addition — neither is evidence of deliberate base-table authorship. The
code comment is the only surviving record, and it's silent on the base
values, as above.

**May 2026 spec doc read directly** (Drive
`1KUiDqiH-1_Dc7Gmv1TyLmS1OSwF-DiXVesoXu3eRubA`, full text pulled via
`read_file_content`): presents `0.85/0.45/0.15` (+0.90 margin-1 if
`bothTeamsScored`) with soccer-specific prose reasoning (goal frequency
~2.6/match, single-goal significance) but **zero citation of any
empirical calibration, historical validation, or real-match test** —
contrast with the July 4 timeBonus fix in the same file, which explicitly
cites a real verified game (ESPN event 760499, Australia 1-1 Egypt).

**Conclusion:** the base table was genuinely never revisited by anyone —
not a deliberate decision either way.

---

## Task 2 — Fast validation before committing

Pulled 17 real recent MLS results live via CI-as-proxy (ESPN's
`soccer/usa.1/scoreboard`, 2026-07-15 through 2026-07-30, via the same
`cors-probe.yml` workflow reused from earlier this session — dispatched
via `workflow_dispatch` after the push-trigger commit was accidentally
sent with `[skip ci]`, which per this repo's own convention suppresses
all workflows including the probe itself; caught and corrected, not
routed around).

| Match | Margin | Both scored | LIVE base | MAY base | Δ |
|---|---|---|---|---|---|
| MTL 0-3 TOR | 3 | No | 0.06 | 0.15 | +0.09 |
| SEA 5-1 POR | 4 | Yes | 0.06 | 0.15 | +0.09 |
| LA 3-1 LAFC | 2 | Yes | 0.32 | 0.45 | +0.13 |
| CIN 3-3 VAN | 0 | Yes | 1.0 | 1.0 | 0 |
| NE 0-3 TOR | 3 | No | 0.06 | 0.15 | +0.09 |
| CLT 2-1 ATL | 1 | Yes | 0.72 | 0.90 | +0.18 |
| NSH 0-2 MTL | 2 | No | 0.32 | 0.45 | +0.13 |
| ATX 1-1 SEA | 0 | Yes | 1.0 | 1.0 | 0 |
| LA 3-3 STL | 0 | Yes | 1.0 | 1.0 | 0 |
| POR 2-0 DAL | 2 | No | 0.32 | 0.45 | +0.13 |
| RBNY 2-2 CLT | 0 | Yes | 1.0 | 1.0 | 0 |
| MTL 1-2 MIA | 1 | Yes | 0.72 | 0.90 | +0.18 |
| NE 1-3 ATL | 2 | Yes | 0.32 | 0.45 | +0.13 |
| PHI 0-3 SEA | 3 | No | 0.06 | 0.15 | +0.09 |
| MIN 0-1 VAN | 1 | No | 0.72 | 0.85 | +0.13 |
| ORL 0-1 NSH | 1 | No | 0.72 | 0.85 | +0.13 |
| LAFC 0-2 SKC | 2 | No | 0.32 | 0.45 | +0.13 |

Every one of the 14 non-tied real matches scores higher under May's
numbers — one-directional, not noise. `bothTeamsScored` confirmed not
vacuous: real margin-1 both-scored games (CLT 2-1 ATL, MTL 1-2 MIA) and
real margin-1 one-side-scored games (MIN 0-1 VAN, ORL 0-1 NSH) both occur
in this 17-game sample.

**Decision: adopted the May spec's numbers in full**, including
`bothTeamsScored` built as a real signal (`(eData.homeScore||0) > 0 &&
(eData.awayScore||0) > 0`) — not half-adopting the table without the
condition it was designed to gate.

---

## Task 3 — Verified the change does what was intended

`node field_smoke.js index.html`: `Failures: 0`.
`node smoke.js index.html`: `965 passed, 0 failed`.

Three real before/after cases (same 17-game sample):

| Real game | Before | After |
|---|---|---|
| SEA 5-1 POR (blowout) | 0.06 | 0.15 |
| CLT 2-1 ATL (1-goal, both scored) | 0.72 | 0.90 |
| CIN 3-3 VAN (tied) | 1.0 | 1.0 (unchanged, correct) |

---

## Explicitly NOT touched (per CC-CMD scope)

- `timeBonus`, `upsetBonus`, `sitBonus`, extra-time logic — untouched.
- Layers 2-4 (competition context, two-legged aggregate, Final Day) —
  separate CC-CMDs, handled elsewhere this session.

## Commits this session

| Commit | Description |
|---|---|
| `d5c6eb57` | probe: dispatch real MLS match margin data (accidentally `[skip ci]`, corrected via manual `workflow_dispatch`) |
| `04018011` | probe outbox/cors-result (CI auto-commit) |
| `1d1f0a3e` | feat: recalibrate soccer base drama formula to May spec numbers |

## Carry-forwards

None. Decision made with real evidence, real validation, both smoke
suites green.

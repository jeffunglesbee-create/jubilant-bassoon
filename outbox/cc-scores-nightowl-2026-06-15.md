# CC-CMD-2026-06-15 — scores + Night Owl execution log

**Spec:** `docs/CC-CMD-2026-06-15-scores-nightowl.md`
**Rules consulted:** CLAUDE.md (incl. STANDARDS Rules 7, 13, 24, 29, 39, 42, 48 via CLAUDE.md Rules 10-16); STANDARDS Rule 59 (CC-AUDIT-A) cross-referenced.

## Pre-work state
- HEAD: `a807625` after pull
- Smoke: 650 / 0
- Units: 66 / 0

---

## Task 1 — SCF G3 duplicate `matchupNote` (Rule 13 cleanup)

**Finding:** Line 10228 had two `matchupNote` keys in the same object literal. The second silently overwrote the first per JS object-literal semantics (last property wins).

**Action:**
- Removed the first (shorter) `matchupNote` ending in `"G4 Tue Jun 9 at T-Mobile Arena, 8pm ET, ABC."`.
- Kept the second (longer) pre-game analysis starting `"VGK leads 2-1. Marner hat trick in G3 (3G 1A, 10 shots) — series-defining..."`.
- The dropped value was already dead code — no behaviour change.

**Verification:** `awk 'NR==10228' index.html | grep -oE "matchupNote" | wc -l` → `1`.

**Smoke after:** 650 / 0. **Commit:** `621fe83`.

**Note on Edit-tool encoding quirk:** the Edit tool failed twice on the same string with the "tried swapping `\uXXXX` escapes and their characters; neither form matched" error, even though the bytes appeared identical. Suspected mid-string em-dash or hidden combining char triggering the mismatch. Fell back to in-place `sed` with a deterministic substring anchor. Recorded for the future-self file — when Edit's `\u` swap heuristic fails on this file, `sed -i` with a unique anchor substring is the reliable escape valve.

---

## Task 2 — Playoff score enrichment

**Approach:** atomic Python script reading the spec's score table, parsing each game's line, inserting `homeScore:X, awayScore:Y, ` BEFORE the existing `seriesMargins` or `matchupNote` key per the spec's placement rule. Each line idempotency-checked (skip if `homeScore:` already present).

**Games enriched (18):**

NHL ECF (CAR vs MTL):
| Line | Game | Home team | Score in text | Inserted |
|---|---|---|---|---|
| 10217 | G2 | CAR  | CAR 3-2 OT | `homeScore:3, awayScore:2` |
| 10218 | G3 | MTL  | CAR 3-2 OT | `homeScore:2, awayScore:3` |
| 10219 | G4 | MTL  | CAR 4-0   | `homeScore:0, awayScore:4` |
| 10220 | G5 | CAR  | CAR 6-1   | `homeScore:6, awayScore:1` |

NHL WCF (VGK vs COL):
| Line | Game | Home | Score in text | Inserted |
|---|---|---|---|---|
| 10237 | G2 | COL  | VGK 3-1 | `homeScore:1, awayScore:3` |
| 10238 | G3 | VGK  | VGK 5-3 | `homeScore:5, awayScore:3` |
| 10239 | G4 | VGK  | VGK 2-1 | `homeScore:2, awayScore:1` |

NBA ECF (NYK vs CLE):
| Line | Game | Home | Score in text | Inserted |
|---|---|---|---|---|
| 10178 | G1 | NYK  | NYK 115-104 | `homeScore:115, awayScore:104` |
| 10179 | G3 | CLE  | NYK 121-108 | `homeScore:108, awayScore:121` |
| 10180 | G4 | CLE  | NYK 130-93  | `homeScore:93,  awayScore:130` |

NBA WCF (SAS vs OKC) — **extended per spec's "ALSO" rule** (G5 and G6 had results, added):
| Line | Game | Home | Score in text | Inserted |
|---|---|---|---|---|
| 10181 | G3 | SAS  | OKC 123-108 | `homeScore:108, awayScore:123` |
| 10182 | G4 | SAS  | SAS 103-82  | `homeScore:103, awayScore:82`  |
| 10183 | G5 | OKC  | OKC 127-114 | `homeScore:127, awayScore:114` |
| 10184 | G6 | SAS  | SAS 118-91  | `homeScore:118, awayScore:91`  |

NBA Finals 2026 (SAS vs NYK) — **extended per spec's "ALSO" rule** (G1-G4 completed, added):
| Line | Game | Home | Score in text | Inserted |
|---|---|---|---|---|
| 10187 | G1 | SAS | NYK 105-95   | `homeScore:95,  awayScore:105` |
| 10188 | G2 | SAS | NYK 105-104  | `homeScore:104, awayScore:105` |
| 10189 | G3 | NYK | SAS 115-111  | `homeScore:111, awayScore:115` |
| 10190 | G4 | NYK | NYK 107-106  | `homeScore:107, awayScore:106` |

**Skipped per DO NOT INVENT (no numeric score in text):**
- Line 10185 — NBA WCF G7: `league` says "SAS wins — WCF Champions", no score in `matchupNote`.
- Lines 10191-10193 — NBA Finals G5-G7: pre-game placeholders, not played.

**Smoke after:** 650 / 0. **Commit:** `a519be2`.

---

## Task 3 — Night Owl championship context

**Two changes (single commit per Rule 7):**

### Change 1 — `buildNightOwlStatic` (static path)
Appended championship context to the static Night Owl line via `buildChampionshipContext(f, _noChampEData)`. When the helper returns non-null:
```
line += ' ' + _noChampCtx.winner + ' wins the ' + _noChampCtx.trophy + '.';
if (_noChampCtx.drought) line += ' ' + _noChampCtx.drought + '.';
```
Variable prefix `_no` to avoid collisions with the J2 path's `_j2` prefix. When the helper returns null (the common case for non-clinch games), the line is unchanged byte-for-byte from prior behaviour.

### Change 2 — `fetchNightOwlFromClaude` (Claude path)
Added a `[CHAMPIONSHIP CONTEXT]` block to the prompt array between the `Series:` line and the `Drama peak:` line. The block carries the same five facts as `fetchGameBriefOnDemand` / `fetchSeriesPreviewFromClaude` plus the "do not undersell a championship" steer. Computed once via `buildChampionshipContext(topGame, _noChampEData)` where `_noChampEData = {homeScore: _homeS, awayScore: _awayS}` (variables already in scope from the existing prompt build).

When the helper returns null, the block is empty string `''` and `.filter(Boolean).join('\n')` removes it — non-clinch prompts unchanged.

### `buildChampionshipContext` call-site map after Task 3
```
24295 — fetchSeriesPreviewFromClaude (J2 inline series brief)
27375 — definition
27496 — fetchGameBriefOnDemand (card-tap brief)
33372 — buildNightOwlStatic (static Night Owl line)
33643 — fetchNightOwlFromClaude (Claude Night Owl prompt)
```

Four user-facing journalism paths now consume championship context.

### Smoke assertion — numbering collision
The spec asked for **A607**, but A607 was already used by the Rule 59 audit postscript commit (`29c99b6`). To preserve the assertion-name → invariant binding (A607 pins the score-overlay `ce676fb` additions), I added the Night Owl wiring under **A608** instead. The audit-collision pattern keeps surfacing; recommend introducing a "next available assertion index" allocator in the audit tooling.

**Smoke after:** 651 / 0. **Commit:** (pending — pushed in this commit alongside this file).

---

## Anomalies / findings beyond the spec

1. **Edit-tool encoding quirk** on line 10228 — see Task 1 note. Sed fallback worked.
2. **A607/A608 numbering collision** — see Task 3 note.
3. **NBA WCF G5 + G6 had completed results but no `homeScore`/`awayScore`** — the spec only listed G3 and G4 explicitly. Per the spec's "ALSO" rule I enriched them too (verified scores against `matchupNote` text).
4. **NBA Finals G1-G4 also had completed results.** Same treatment, same rule.
5. **Relay-side Night Owl wiring still pending** — `field-relay-nba` is the source of cached Night Owl briefs via `/journalism/game/{id}`. The client-side wiring added here only fires when the client builds the Night Owl prompt itself (the Claude direct-proxy path). If the relay's pre-cached briefs reach the user instead, they will NOT carry championship context until the relay's prompt builder is updated. Per spec constraint "DO NOT change the relay worker", I did not touch that. Flagged for a future relay commit.

## Post-work state
- HEAD: (this commit pending push)
- Smoke: 651 / 0 (+1 from A608)
- Units: 66 / 0
- Three commits this session: `621fe83`, `a519be2`, (Task 3 pending)
- SW_VERSION: 2026-06-15a unchanged — none of these commits ship new user-visible logic that warrants a bump. Task 1 is a Rule-13 dedup (no behaviour change), Task 2 is data-only enrichment, Task 3 enables a journalism path that the client may invoke. Whether to bump is a deploy-cadence decision; flagged but not done unilaterally.
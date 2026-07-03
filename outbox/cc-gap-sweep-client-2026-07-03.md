# CC Outbox — Client Gap Sweep + Public Solution Research

**Date:** 2026-07-03
**CC-CMD:** docs/CC-CMD-2026-07-03-gap-sweep-client.md
**Type:** Research/documentation only — no functional code changes. Only this
manifest is committed.

---

## Pre-build probe

`grep -c "^function \|^async function " index.html` → **730** top-level
functions confirmed before scoping. Search was grep-pattern-driven against
the full file, not a linear read.

## Spec sources fetched (Task 1 dependency)

- **FIELD Vision Document (June 13 2026)**, Drive fileId
  `1ZEvy5rSQgVM-_m_liiA7lvz0YDc-jYbxJEUPiGOQ_TQ` — full text fetched. Not
  in `GOVERNANCE.json`'s canonical_docs list; located via Drive search
  (`title contains 'Vision'`).
- **Vision Document CORRECTIONS (June 13 2026)**, fileId
  `1Qxi2WlKfZNuGnOJrFZvQGc_ykyy2tJCMFiDcQYdeFDs` — changelog only (prose
  accuracy fixes: 73 not 67 banned phrases, 320+ not 300+ edge locations,
  "near-zero" not "zero" marginal cost). Does not add/remove any named
  feature from the original doc's "What Exists Today" / "Five Vectors"
  lists, so the original feature list was used for cross-referencing.
- **STANDARDS.md Rule 33 (Product Ethos)** — read directly from this repo
  (lines 1877-1959), not Drive — it already exists locally.
- Two other Drive docs surfaced by the search were explicitly excluded:
  "Gemini Analysis 4: Long-Term Vision Items (v2+ Scope)" is self-labeled
  future/out-of-scope work ("None of these should create urgency or scope
  creep in current sessions") and a June 14 session doc unrelated to the
  Vision doc's feature list.

---

## TASK 1 — Spec-vs-shipped feature sweep

**Confirmed gap: 1 instance — BSD live-pitch momentum (already known,
this CC-CMD's own trigger).**

`_bsdRepaint()` (index.html:31034) renders shots (`_bsdShotData`, each
with `x`/`y`/`xg`/`team`) and ball position (`_bsdBallPos`) onto an SVG
pitch. It has zero code path for a momentum bar/indicator, despite
"momentum" being explicitly named as a real, data-available feature (per
this CC-CMD's own CONTEXT) and the Vision doc's Vector 1 (Attention
Intelligence) describing exactly this class of real-time in-game signal.
No new instances of this pattern were found beyond the one already known.

**Checked and confirmed present (no gap) — every other feature explicitly
named in the Vision doc's "What Exists Today" and "Five Vectors" sections
that claims to be already shipped:**

| Feature (Vision doc) | Client render evidence |
|---|---|
| Broadcast Arbitrage Finder | `buildArbitrageReport()` / `renderArbitrageBar()` (index.html:33063/33136), wired at boot (`setTimeout(renderArbitrageBar,400)`, L10791) and on schedule update (L8736) |
| Bracket trap detection | `.wc-traps` UI, `_wcPathTraps`, TRAP chip on game cards, fetched from `/wc/traps` (L2523-2540, L12334-12348) |
| Movers computation incl. secondary beneficiaries | `.wc-movers` section renders `gainers`/`losers`/`secondaryBeneficiaries`/`secondaryLosers` from `/wc/movers` (L30712-30744) — the exact "secondary beneficiaries" term from the Vision doc is a literal field name consumed |
| UserDO "missed dramatic moments" | Full round trip confirmed: `recordPeakMissed()` POSTs `peak_missed` events (L26905-26912) → `fetchUserState()` (L26954) populates `window._userState.dramaticMomentsMissed` → consumed in the Night Owl brief prompt context (L37357-37367, "Lead with what they missed") and separately in "Since You Were Last Here" (`getWhatYouMissed()`, L21246, rendered in `renderNewspaper()`) |
| Soccer WP (Dixon-Coles / relay-computed) | Client never computes it itself (correct — relay owns the model) but renders it: WP bar injected into WC group standings (`_wcBuildWPBar`, L31936-31943), used in live crunch-tier detection (L35595-35613) |
| MLB team momentum (last-10 form), NBA recent-form signal | `fetchMLBTeamMomentum()` (L8210) and `fetchBDLRecentForm()` (L17602) both feed journalism prompt context (J3/Night Owl), which is a real render path (generated text shown to the user), not a dead fetch |
| Cost/blackout transparency (Rule 33 "extractive practices exposed") | Extensive real inline copy across broadcast service objects: "no blackouts", in-market vs out-of-market carve-outs, bundle pricing — e.g. Apple TV+, MLB+, MASN+, CLEGuardians.TV entries (L5802-5868) |

**Not gaps — explicitly roadmap items in the Vision doc, not claimed as
shipped, so their absence is correctly out of scope for this sweep:**
Subscription ROI calculator / cost-per-game (0 matches; listed under
"WHAT'S NEXT"), true per-shot-location xG model (0 matches for a FIELD-
built xG model — but note FBref-sourced xG *is* already integrated into
soccer journalism prompts via `soccerFBrefInit()`/`xGFor`/`xGAgainst`,
L8176-8177, L26016-26042 — this exceeds what the Vision doc claims as
built, not a gap), NBA/NHL/MLB possession- or period-level WP models
(explicitly "needed" per the doc, not claimed as done).

Rule 33 itself is a philosophy/ethos document, not a feature list — no
additional named-feature candidates beyond the cost-visibility check above
were found in it.

## TASK 2 — Live-frame/SSE consumption completeness sweep

**Confirmed gap: 1 instance — same root cause as Task 1's finding.**

`_bsdOnSSEFrame(type, data)` (index.html:30983-30990) is the only
partial-consumption instance found. On `bsd:stats` frames it reads only
`data.shots || data.shotmap`; any `data.momentum` field the relay sends
is never read. On `bsd:ball` frames it reads the full payload (`data` is
used directly as ball position). This matches the CC-CMD's own
already-confirmed example exactly — not a new finding.

**Checked, no additional gaps found**, across every other real SSE/WS
frame handler in the file:
- `_onMessage(evt, eventType)` (L27078-27315) — the main AmbientDO SSE
  dispatcher for `connected`/`score`/`lead_change`/`final`/`all_final`/
  `wp_update`/`ping`. Traced each branch's field reads against its
  payload: `wp_update` alone consumes `gameId`, `home`, `away`, `homeWP`,
  `awayWP`, `wpDelta`, `drawWP`, `peakCollapse`, `urgency`, `confidence`,
  `ts` — full consumption, nothing silently dropped.
- WebSocket `.onmessage` for per-game `facts` frames (L16744-16763) —
  dispatches to `onFacts(msg)` and records freshness; single-purpose,
  nothing else in the payload to check.
- BracketDO WebSocket `_handleMessage(data)` (L31285-31311) — consumes
  `type`, `delta.significant`, `delta.narrativeSeeds`, `isLive`, then
  triggers a full section re-render/refetch rather than field-by-field
  merging. This is a coarse-but-complete consumption pattern (it doesn't
  drop fields, it just doesn't need to read more before re-rendering) —
  not the same failure mode as the BSD gap.

## TASK 3 — Duplicate-state-population consistency sweep

**`espnScores` — 11 real assignment sites confirmed** (not 10+, exactly
11: index.html:13896, 17037, 17903, 19081, 19327, 20064, 20392, 20464,
21898, 37007, 37039), one per data source (FotMob/FD, V2 primary, NBA
relay, NHL relay, ESPN section fetch, MLS relay, FPL, ESPN soccer
sub-fetch, AFL/Squiggle, finals-cache, schedule-cache).

**No AmbientDO-style stale/wrong-field-name bug found.** All 11 sites
normalize their source-specific raw fields into the same target shape:
`state`, `homeScore`, `awayScore`, `home`, `away`, `homeName`, `awayName`,
`homeWinning`, `clock`, `detail`, `period`, `periodPrefix`, `source` are
consistent by name and semantics across every site. This is a "checked,
consistent" result, not a gap.

**One asymmetry noted but not flagged as a bug:** only the V2-primary
site (L17037) and the two finals/schedule-cache fallback sites
(L37007/37039) explicitly set `wp`/`wp_prev`/`homeLeader`/`awayLeader`/
`homeLinescores`/`awayLinescores` (as `null`/`[]` or merged from `prev`).
The other 8 sites (NBA relay, NHL relay, MLS, FPL, ESPN soccer sub-fetch,
AFL) simply omit these keys on a fresh write. Functionally this is
equivalent to explicit `null` for every downstream `??`/optional-chaining
read site checked — no evidence this causes a real behavioral difference,
since none of those consumers use `'key' in obj`-style presence checks.
Documenting for awareness, not claiming as a confirmed defect per Rule 1/48.

## TASK 4 — Public solution research for confirmed gaps

Both Task 1 and Task 2's finding are the same underlying gap (BSD
momentum), so one research pass covers it.

**Real public-repo match found:**
[`GabrielVelasco/BET-Attack-Momentum`](https://github.com/GabrielVelasco/BET-Attack-Momentum)
— "A Web Site that gather all football live matches pressure graphs,
live scoreboard and stats from SofaScore." This is a genuine technical
match for the problem class (live per-match attacking-momentum/pressure
visualization sourced from a third-party live-data provider, rendered as
a graph alongside the scoreboard) — same shape as what FIELD's BSD pitch
already half-implements (shots + ball, missing momentum).

**Honest fit caveat:** SofaScore's momentum graph (and this repo's
scraper of it) is a time-series pressure chart, not an SVG pitch overlay
— FIELD's `_bsdRepaint()` renders an actual pitch, so the closest
integration would be a small supplementary bar/sparkline alongside the
pitch SVG rather than adopting this repo's chart style wholesale. Also
surfaced but NOT a genuine match (weak analogs, not reported as hits):
`d3-soccer` (event-stream visualization library, no momentum concept),
`JoGall/soccermatics` and `PriyadarshiAkshay/football_visualisation`
(post-match analysis tooling, not live-frame consumption).

## TASK 5 — Outbox manifest (this section)

| Gap-class | Real instances found | Public-repo match |
|---|---|---|
| 1. Spec'd/data-flowing but unrendered feature | 1 (BSD momentum — already known prior to this CC-CMD, not newly discovered) | Yes — `GabrielVelasco/BET-Attack-Momentum` (partial fit, see caveat above) |
| 2. Partial SSE/live-frame consumption | 1 (same root cause as #1 — `_bsdOnSSEFrame` never reads `data.momentum`) | Same as above |
| 3. Duplicate-state population inconsistency | 0 confirmed (11 `espnScores` sites checked, all field-name-consistent; one benign key-presence asymmetry noted, not a defect) | N/A — no gap to solve |
| 4. Comment claims a behavior that isn't real | 0 found in the course of Tasks 1-3 (not separately swept beyond what surfaced incidentally) | N/A |

**Honest scope note on gap-class 4:** this CC-CMD's Task 1-3 instructions
did not include a dedicated grep pass for "comment claims X but X never
happens" outside of what surfaced while investigating the other three
classes (nothing did). A true sweep for this class would need its own
systematic pass (e.g. grep for comment phrases like "when set", "activates",
"powers X" and verify each referenced identifier is genuinely reachable) —
not attempted here to stay within this CC-CMD's actual task list; flagging
as a real gap in *this sweep's own coverage*, not a finding about the app.

**Net result:** the momentum gap that triggered this CC-CMD is the only
confirmed spec-vs-shipped / partial-consumption gap found after a
systematic, grep-driven pass across all four gap-classes' primary
candidates (11 espnScores sites, 4 real SSE/WS handlers, 8+ Vision-doc
named features). No functional code was changed — this manifest is the
only commit.

---

## Done Conditions

- [x] Pre-build probe run and function count confirmed (730) before scoping
- [x] FIELD Vision document + CORRECTIONS + Rule 33 fetched before Task 1
- [x] Task 1: every "already shipped" named feature in the Vision doc
      cross-referenced against real render code; roadmap-only items
      correctly excluded from scope
- [x] Task 2: all 4 real SSE/WS frame handlers traced field-by-field
- [x] Task 3: all 11 real `espnScores` assignment sites compared for
      field-name consistency
- [x] Task 4: honest public-repo search completed, fit caveat stated
      rather than forcing a weak analog
- [x] Task 5: manifest written, including an explicit scope-coverage gap
      in gap-class 4 rather than silently claiming full coverage
- [x] No functional code changes made — only this file is committed

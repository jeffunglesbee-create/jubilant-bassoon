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

---

## Addendum (2026-07-04) — Task 2 correction

Re-verified this manifest against current HEAD after a repeat request to
run this same CC-CMD. The core Task 1/2 finding (BSD momentum) is still
accurate — `_bsdOnSSEFrame`/`_bsdRepaint` are unchanged, `data.momentum`
is still never read anywhere in `index.html`.

**One line in the original Task 2 write-up was wrong.** It called
`ensureGameSocket`'s WebSocket `.onmessage` handler (index.html:16744)
"single-purpose, nothing else in the payload to check." A separate
session, working after this manifest was committed, found a real partial-
consumption gap in that exact handler: the object it built for `onFacts`
dropped `situation`, `matchEvents`, `linescores`, `homeAbbr`, `awayAbbr`
even though the relay was already sending them — the same failure class
as the BSD momentum gap, just in a different handler this sweep didn't
look closely enough at. That session's fix is now live at
index.html:16846-16856 (commit range between 592c5ec and current HEAD).

Net effect on the Task 5 table: gap-class 2's real instance count for
*that specific handler* was actually 2, not 1 — this sweep only caught
one of them at the time. It's since been fixed independently, so there is
no outstanding code change to make; this addendum exists so the record is
accurate rather than leaving an incomplete assessment uncorrected.

---

## Addendum (2026-07-05) — Full re-run, gap-class 4 finally covered, three new findings

The same CC-CMD was dispatched again. `index.html` has grown from 34,574
to 40,965 lines since the original sweep (line numbers below reflect
current HEAD, not the originals above). Rather than re-reading the prior
findings and assuming they still hold, this pass re-ran all four
gap-classes independently — fresh grep-driven agents working directly
from source, with no knowledge of the prior manifest's conclusions — then
cross-checked the fresh results against what's written above. Every
finding below that overlaps a prior claim was independently re-derived,
not copied.

### Task 1 (spec-vs-shipped) — re-confirmed, plus two new findings

BSD momentum gap: **still present, unchanged** — `_bsdRepaint()` still has
zero momentum render path.

Every other "already shipped" Vision-doc feature re-confirmed independently
with fresh line numbers (Attention Intelligence — `dramaScoreLive`/
`injectDramaBadges`/WC WP+advancement bars; Journalism Infrastructure —
`BANNED_PHRASES`/`hasCliche`/`renderProseScore`/`renderJournalismCompanion`;
Tournament Intelligence — `renderWCTournamentBracket`'s movers/third-place/
traps/Monte-Carlo-probability sections, all real call sites).

**New finding — `seriesLedger`: CONFIRMED-GAP, same pattern as BSD momentum.**
`recordSeriesGame()` (index.html:27859) fires real `series_game` events
server-side, with an explicit comment that this "Builds the seriesLedger
for NW-3 Rival Intelligence and PREF-SYNC-QR state sync," and a second
comment (27899-27901) documents that `GET /user/state` returns
`seriesLedger` as part of the hydrated user state. Independently confirmed
via `grep -n "seriesLedger" index.html`: it appears in exactly those two
comment lines and **nowhere else** — no `.seriesLedger` property read
exists anywhere in the file. `grep -rn "NW-3\|Rival Intelligence\|PREF-SYNC-QR"`
across the whole repo returns only that one comment. This is the write
side of a named, spec'd feature with no client-side consumer at all — not
even an orphaned stub render function, the render logic simply doesn't
exist.

**New, minor finding — `recapSnippet`: CONFIRMED-GAP (dead write).**
`hydrateMissedRecaps()` (27950) fetches per-game context and writes
`m.recapSnippet` (27962), with a comment claiming "downstream prompt
injection sees the snippets without a re-assign." Independently confirmed
via `grep -n "\.recapSnippet\b" index.html`: it is written once and its
only other reference is a truthiness guard (line 27953, `m.recapSnippet`
checked only to avoid re-fetching) — never read for its actual string
value anywhere, including the one prompt block (`[MISSED PEAKS]`,
38478-38487) that plausibly should use it. The fetch that populates it is
currently pointless.

**Cross-repo claim flagged, not confirmed either way — `resolveWinProbability`.**
HANDOFF.md (line 57) claims a function literally named
`resolveWinProbability(sport, ...)` was built, routing to ESPN's
`winprobability[]` (MLB/WNBA/NBA), Squiggle `confidence` (AFL), FIELD's
own `computeLiveWP()` (soccer), and market odds via `noVigProb()`
(CFL/NHL/MLS/EPL/NFL/CFB). Per Rule 72, independently checked rather than
trusted: `grep -rn "resolveWinProbability\|computeLiveWP\|noVigProb"`
across the entire repo returns **zero hits in any code file** — the only
match anywhere is the HANDOFF.md line itself. What IS independently
confirmed real and rendered: NBA (`fetchESPNWinProb`, 20004), MLB
(`fetchSavantGameFeed`, 20033), AFL (Squiggle `confidence` in
`injectSquiggleTips`), CFL (`_cflMatchOdds`, 32523), and soccer/WC26
(Dixon-Coles + Monte Carlo) each have their own real, differently-named,
sport-specific pipeline terminating in a genuine DOM render call site —
and the render side is sport-agnostic (gates purely on `.wp != null`, not
on which sport), so it would display a value for NHL/NFL/MLS/EPL/CFB too
if one ever arrived via the generic AmbientDO `wp_update` SSE handler.
Whether those five sports' `.wp` actually gets populated depends on a
server-side `resolveWinProbability`-equivalent that would live in
AmbientDO — code not present anywhere in this checkout, so its existence
can't be confirmed or denied from here. Reporting the discrepancy plainly:
either the HANDOFF entry describes real work in a repo this session can't
see, or the entry is inaccurate — not resolvable from client-side source
alone.

### Task 2 (SSE consumption) — re-confirmed, one new inconclusive flag

BSD momentum gap reconfirmed unchanged (same root cause as Task 1). The
`ensureGameSocket` default-`onFacts` gap documented in the 2026-07-04
addendum above is reconfirmed still fixed and live.

**New, honestly-inconclusive flag — AmbientDO `score`/`lead_change` SSE branch.**
This branch (index.html:28092-28179) reads `data.gameId/sport/home/away/
homeScore/awayScore/period/periodLabel/clock/state`. Given the GameDO
`facts` channel was proven (commit `68d1775`) to have silently dropped
`situation/matchEvents/linescores/homeAbbr/awayAbbr` that the relay was
already sending, it's plausible the AmbientDO SSE channel has the same
gap — but the block's own comment (28106-28107) explicitly says "Only
update the fields SSE knows — preserve leaders, wp, linescores,
espnEventId set by other sources," which reads like deliberate scoping,
not an oversight. Cannot be resolved without the relay's actual
`/live/ambient` `score` event payload shape (relay repo inaccessible this
session) — flagged as inconclusive rather than claimed as a confirmed gap.

### Task 3 (duplicate-state consistency) — re-confirmed writers, THREE new reader-side bugs found

`espnScores` writer-side: now 12 real assignment sites (one more than the
11 originally found — expected, given six weeks of feature work since).
All 12 reconfirmed field-name-consistent on the write side, matching the
original finding.

**New finding — three real, currently-shipping `.status`/`.state` confusion
bugs, CONFIRMED.** Extending the audit to READERS (not just writers, which
is what the original sweep checked) found that every one of the 12
`espnScores` writers sets the game-state field as `.state` (values
`'pre'|'in'|'post'`) — confirmed via direct grep that no writer anywhere
ever sets `.status` on an `espnScores` entry (`.status` is a real field,
but belongs to a *different* object, the raw MLB schedule game with a
different vocabulary `'pregame'|'live'|'final'|'postponed'`, correctly
used elsewhere). Three live, reachable functions read an `eData` object
sourced directly from `espnScores` and check `.status` where they clearly
meant `.state` (the value literals used — `'in'`, `'pre'`, `'post'` — are
the `.state` vocabulary, not the `.status` one):

- **`buildLayer3Rules(games)`** (26634, bug at 26667): `if (eData.status==='in' ...)` never trips, so the "EXTREME EVENT" journalism instruction is never injected into any live game's compound prompt, even though `getStatisticalExtremes` (called inside this same dead branch) is itself correctly implemented and correctly gated elsewhere.
- **`detectAndStoreStoryMoment(gameId, eData, sport)`** (39408, bugs at 39409/39414/39456/39477): the guard at 39409 never trips, `isFinal` (39414) can never be true, so the Story Moments tape never records a "Final: X defeated Y" moment or an "... underway" moment for any game, ever, and the bus-emitted `state` field (39477) is hard-coded to `'pre'` regardless of the real game state — corrupting whatever else subscribes to that event (the code's own comment names "Night Owl, lead change burst, future consumers").
- **`buildComebackProbability(gameId, eData, sport)`** (39790, bug at 39791): the explicit "don't compute comeback odds for a finished game" guard never trips, so a truly final game can still show a comeback-probability percentage in the bottom sheet (the only other guard present checks period number, not game-over-ness).

All three call sites independently confirmed reachable in production
(`injectDramaBadges` calls, journalism compound-prompt build, bottom-sheet
open handler). Root cause: these three sites conflate the MLB-specific
`allData` schedule-object schema with the `espnScores` schema — the value
literals confirm the intent was always `.state`, only the property name is
wrong.

One same-field-name (not naming-mismatch) case flagged as
could-not-determine: `espnScores[key].situation` is set by two writer
families using the identical field name, but the legacy ESPN path and the
`mapV2ToESPN` V2 path may source it from different upstream shapes — can't
confirm a real shape mismatch without the relay's source.

All other keyed caches checked (`_scoresBySource`, `_relayStandingsCache`,
`_mlbBoxscoreCache`, and ~15 others) — no inconsistencies found.

### Gap-class 4 (comment-vs-runtime claims) — swept for the first time, one confirmed finding

The 2026-07-03 manifest explicitly flagged this class as *not attempted*
("A true sweep for this class would need its own systematic pass... not
attempted here"). This pass finally covers it: ~28 falsifiable trigger/
activation comments (phrasing like "when set", "activates", "fires when",
"only fires once") were deep-verified by tracing every read/write/call
site for the named variable or function.

**CONFIRMED-GAP: `isLateCloseGame({ _section: sport }, sport)` malformed
call, index.html:35606.** The comment at 35599 reads "Fires when trailing
team has lineup advantage AND isLateCloseGame" — gating the "CLOSING UNIT"
badge. `isLateCloseGame` is defined (34748) as `function
isLateCloseGame(g, ed, sport)`, but this call site passes only 2 arguments:
`{ _section: sport }` becomes `g`, and the string `sport` itself becomes
`ed` (with the real `sport` parameter left `undefined`). Inside the
function: `if (!ed || ed.state !== 'in') return false;` (34749) — since
`ed` is a plain string, `ed.state` is always `undefined`, so this always
returns `false`, regardless of the real game's period/score/margin.
Independently spot-checked by reading both the call site and the function
definition directly: confirmed. There is exactly one correct call to this
function elsewhere (`evaluateEMBER()`, matching the 3-param signature) —
this is the only broken one. The "CLOSING UNIT" badge described by the
comment is permanently dead.

~25 other claims checked in the same pass all held up as accurate (sample
included Night Owl poll setup, `_espnFirstPoll`'s one-time-set claim,
`bsdEventId`'s activation chain, `wc26`'s date-gate, EMBER's *correct*
`isLateCloseGame` call site, and ~20 more) — reported for sample-size
transparency, not claimed as an exhaustive list.

### Task 4 (public solution research) — this pass's new findings

**`seriesLedger` / "Rival Intelligence" (genuine spec'd-but-unbuilt gap,
same class as BSD momentum):** two honest search passes (general
head-to-head/rivalry-tracker sports repos; personalized cross-device
watch-progress/companion apps) turned up no genuine conceptual match.
Closest candidates considered and rejected as poor fits: generic
football head-to-head stats/analytics repos (league-wide historical
data, not a personal per-user series-progress signal) and `Watcharr`
(open-source self-hostable watched-list tracker — media-library episode/
season tracking, not sports-series rivalry personalization). Reporting
as an honest miss rather than forcing a weak analog, consistent with this
manifest's existing discipline (the BSD momentum search rejected `d3-soccer`/
`soccermatics` on the same grounds).

**`recapSnippet` dead write, the three `.status`/`.state` bugs, and the
`isLateCloseGame` malformed call:** no public-solution search applies to
any of these. They are wiring/typo-class bugs (wrong property name, wrong
argument count, an unconsumed fetch result) — not missing capability the
way BSD momentum or `seriesLedger` are. There is no "existing tool" to
search for when the fix is "use the right property name" or "pass the
right number of arguments." Stating this plainly rather than forcing an
irrelevant search to fill out the section.

### Updated Task 5 summary (this addendum's net new findings)

| Gap-class | New confirmed instances this pass | Public-repo match |
|---|---|---|
| 1. Spec'd/data-flowing but unrendered feature | 1 new (`seriesLedger`) + 1 minor (`recapSnippet` dead write) | No genuine match found for `seriesLedger` (honest miss); N/A for `recapSnippet` (not a capability gap) |
| 2. Partial SSE/live-frame consumption | 0 new confirmed (1 new *inconclusive* flag: AmbientDO score/lead_change, can't resolve without relay access) | N/A |
| 3. Duplicate-state population inconsistency | 3 new (reader-side `.status`/`.state` confusion in `buildLayer3Rules`/`detectAndStoreStoryMoment`/`buildComebackProbability`) | N/A — bug fix, not a capability gap |
| 4. Comment claims a behavior that isn't real | 1 new (`isLateCloseGame` malformed call, permanently disabling the CLOSING UNIT badge) — first real sweep of this class, explicitly skipped in the original manifest | N/A — bug fix, not a capability gap |

No functional code changes were made in this addendum either, per the
CC-CMD's own header ("no functional code changes... commit the outbox
manifest directly") — every finding above is documentation only. The
`.status`/`.state` bugs and the `isLateCloseGame` malformed call in
particular are real, safely-scoped, well-understood one-line fixes that
would be quick to apply in a dedicated follow-up CC-CMD, but fixing them
was out of this task's stated scope.

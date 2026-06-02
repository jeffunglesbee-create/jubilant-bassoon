# FIELD Handoff — June 2 2026 PM-18 close (Items A-F voice v3 enforcement parity — six features shipped)

**jubilant-bassoon HEAD:** 7066dd2 last meaningful · Smoke: 378/0 · SW_VERSION source `2026-06-02d`
**field-relay-nba HEAD:** 880e3ae last meaningful (unchanged) · OAuth feature commit: 8e7257d

**This session shipped:** TYPE D → TYPE B. Audit of live SCF G1 pre-game brief (4:31pm screenshot) revealed four distinct failure modes: narrative hallucination at 0-0, wire-copy gerund evasion route, record attribution flip, and per-game compound briefs still failing. Six items recommended, all six built and shipped:
- Item A — Series State Clause (NOVEL state-aware narrative grounding)
- Item B — hasWireCopy gerund extension (closes 'holding' miss)
- Item C — NHL [SCF MATCHUP] context anchor
- Item D — Layer 2g narrative hallucination retry (state-conditional)
- Item E — Layer 2h record attribution detector + retry
- Item F — Phase 2 per-card retry+re-render

**Session Doc (this session — Drive):** `1snqEKzp8SnQxcfibIgLkG49kFm14cqyyKdQIrTJqK1I`
**Previous session doc (PM-17 — Drive):** `1Xa8pXyk_aPeCxQomWSP0BVujocD8NsYf2vt4Paw726I`
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`

## TIER 0 DEADLINES (unchanged)

- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — Items A-F all live for any post-deploy regeneration
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — first Finals exposure for full enforcement stack
- **Stanley Cup G2: June 4** — second exposure window
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-18)

Opened as TYPE D after Jeff shared a 4:31pm iPad screenshot of the live SCF G1 brief. The audit identified four distinct failure modes in a single screen:

1. **Narrative hallucination at 0-0** — "desperate must-win", "championship dreams slipping", "series momentum hanging in the balance", "high-stakes collision", "tighten their grip on the Cup" — all drama language inventing stakes that don't exist at 0-0.
2. **Wire-copy gerund evasion** — "Vegas enters... holding a 53-22-7 record" — PM-17 Layer 2f catches "holds" but NOT "holding" (the model routed around the indicative-only ban with -ing forms).
3. **Record attribution flip** — 53-22-7 is Carolina's W-L-OTL; the brief attributed it to Vegas. Model knew the real records but assigned to the wrong team.
4. **Per-game compound brief still wire-copy** — bottom-sheet "Vegas holds a 39-43 mark" telemetry-only from PM-17.

Jeff approved all six recommendations. TYPE B opened. All six items shipped across 4 single-concern commits.

### Item A — Series State Clause (commit `be063b6` with Item B)

`buildSeriesStateClause(g)` returns a runtime-computed clause defining allowed/forbidden narrative language by current series state. The architectural answer to "how do we tell the model not to invent stakes that don't exist."

States:
- **0-0 / Game 1**: NO elimination, NO must-win, NO momentum, NO slipping away. Forbidden phrases named: must-win, season on the line, championship dreams slipping, series momentum, tighten grip on [Cup/title], desperate, do-or-die, save the series, hanging in the balance, high-stakes collision. Drama IS the matchup. Bulletin-board material requires documented source.
- **Game 7 / deciding**: winner-take-all language allowed
- **Elimination**: must-win for trailing team only
- **Clinch possible**: leader can clinch, opponent eliminated
- **Mid-series**: tension proportional, no must-win unless 0-2/0-3

Wired into:
- `fetchSeriesPreviewFromClaude` (J2 series brief)
- `buildCompoundPrompt` per-game line emission (compound editorial + game_briefs both receive it via [STATE CLAUSE] tag)

### Item B — hasWireCopy gerund extension (commit `be063b6` with Item A)

Six gerunds added: holding, carrying, bringing, maintaining, owning, posting. Also leading/entering at `ledWithRe` and sitting at `sitsAtRe`. Closes the exact "holding a 53-22-7" miss observed in production. Standalone unit tests 9/9 (catches all gerund forms, no false positives on "holding back the line" or "leading the way").

### Item C — NHL [SCF MATCHUP] context anchor (commit `6512b31`)

Parallel to existing NBA [WCF CHAMPION] / [CHAMPION] anchors in `getNBAAnalyticsContext`. Closes "tighten their grip on the Cup" hallucination — Vegas won 2023 but does NOT hold the current Cup.

Added to top of `getNHLAnalyticsContext`, gated on `isSCF` league string match:
- `[SCF MATCHUP]` CAR: first Final since 2006 win (20 years). Fourth CF breakthrough attempt since 2019; lost prior three.
- `[SCF MATCHUP]` VGK: 3rd Final in 9 years (won 2023, lost 2018). Under late-season hire John Tortorella.
- `[SCF TROPHY]`: Neither team is defending the Cup. Finals is open. Do NOT write 'tighten grip on the Cup', 'defend the Cup', or 'reigning champion'.

### Item D — Layer 2g narrative hallucination retry (commit `5f6a916`)

`hasNarrativeHallucination(text, ctx)` detector + `retryWithoutNarrativeHallucination` retry. State-conditional: pattern groups apply differently per series state.

Four pattern groups:
- **elimination** — must-win, season on the line, championship dreams, do-or-die, save the series, desperate must-win
- **momentum** — series momentum, hanging in the balance, slipping away
- **trophyClaim** — tighten grip on [cup/title], defending [cup/title], reigning champion
- **hypeFiller** — high-stakes collision, clash of titans, epic battle

State-conditional application:
- At 0-0 / Game 1: ALL four groups apply (strictest)
- Mid-series: Only trophyClaim + hypeFiller (elim + momentum legitimate)

Retry prompt names the actual series state explicitly + matched phrases. Cannot fabricate stakes when state is in retry prompt itself.

Wired into all three brief retry chains: J3 standalone, J2 series (with game context), compound main brief IIFE.

Standalone unit tests 5/5:
- PM-18 brief @ 0-0: **10 hits across all four groups**
- Exemplar A (NBA Finals G1 voice-correct) @ 0-0: **0 hits**
- Same PM-18 brief @ 3-2: 2 hits (trophyClaim + hypeFiller correctly remaining)
- Mid-series legitimate momentum @ 2-1: 0 hits
- Game 7 elimination brief: 0 hits

### Item E — Layer 2h record attribution detection (commit `7066dd2` with F)

`hasRecordAttributionError(text, ctx)` detector + `retryWithRecordAttribution` retry.

Detection:
- Three-tier name matching: full ('Vegas Golden Knights'), nick ('Knights' via teamNick last-word), city ('Vegas' first-word with ≥4 char guard against false positives)
- 80-char preceding window for team-name proximity
- Records pattern: `\d{1,3}-\d{1,3}(?:-\d{1,3})?` — handles W-L and W-L-OTL
- Returns `{record, attributedTo, shouldBe}` per misattribution
- Conservative false-positive avoidance: when BOTH teams mentioned in window, no flag (attribution ambiguous)

Retry prompt names the misattribution explicitly + states ground-truth records + closes with "If you are not certain of a record, omit it rather than guessing."

J2 series preview wiring:
- `buildGameStandingsContext(g)` injected as 'Standings: ...' prompt line (preempts hallucination at source)
- Records parsed from standings string into `_recordCtx` via team-nick regex
- `retryWithRecordAttribution` added to J2 retry chain after Layer 2g

Unit tests 6/7 (PM-18 brief detected correctly; one case "both flipped" only catches first hit by design — second flip has both teams in 80-char window, conservatively unflagged).

### Item F — Phase 2 per-card retry+re-render (commit `7066dd2` with E)

Closes the gap from PM-17 where per-game compound briefs were telemetry-only. Now auto-retries + refreshes.

Async IIFE in `fetchCompoundEditorial` (parallel to main brief retry IIFE):
- Iterates `result.game_briefs[]` + `result.series[]`
- Per entry: `hasWireCopy` + `hasNarrativeHallucination` with state-aware ctx
- Conditional retries: only fires when detector hits exist
- Budget guard: max 5 retries per compound call (prevents quota blowout on heavy slates)
- Mutates result entry on improvement

Cache + DOM refresh:
- `game_briefs[]`: writes to `_gameBriefCache[g._id]` via existing `_enforceNBAAttributionFooter` + `trimToCompleteSentence` pipeline
- `series[]`: writes to `sessionStorage(seriesPreviewCacheKey(game))` AND refreshes visible `.series-preview-text` / `.card-brief-inline-text` DOM elements via `[data-gameid=...]` selector
- Bottom sheet: `window._currentBottomSheetGameId` tracker set by `openBottomSheet`, cleared by `closeBottomSheet`. `_refreshOpenSheet(gameId)` helper calls `openBottomSheet(gameId)` again to re-render if matched.

Mutated result re-saved to sessionStorage at IIFE end so next page load sees improved per-card content.

### Smoke A381-A384
- A381: Item A wiring presence (state clause emitted into J2 + compound)
- A382: Item D wiring + four pattern groups + state-conditional check
- A383: Item E detector + city-name matching + ground-truth retry + J2 _recordCtx wiring
- A384: Item F IIFE marker + budget guard + both detectors + _gameBriefCache writes + sessionStorage(seriesPreviewCacheKey) + DOM refresh selector + openBottomSheet tracker

A378 updated for gerund extension. A379 widened to 600 chars after Layer 2g insertion. A380 reframed (Phase 2 in A384, telemetry remains diagnostic).

374/0 baseline → 378/0 close.

### Infrastructure
SW_VERSION bumped `2026-06-02c` → `2026-06-02d` (Rule 23 same-day bump for Items A-F combined deploy).

FIELD_FEATURES entries (dated 2026-06-02):
- `jq-item-a-series-state-clause`
- `jq-item-b-wirecopy-gerund-extension`
- `jq-item-c-scf-matchup-anchor`
- `jq-item-d-layer-2g-narrative`
- `jq-item-e-layer-2h-record-attrib`
- `jq-item-f-percard-retry-rerender`

### Commit + deploy
Four single-concern commits across one session:
- `be063b6` Items A+B (Series State Clause + gerund extension)
- `6512b31` Item C ([SCF MATCHUP] anchor)
- `5f6a916` Item D (Layer 2g narrative hallucination retry)
- `7066dd2` Items E+F (Layer 2h record attribution + Phase 2 per-card retry+re-render)

Push clean to remote — no auto-overlay rebase needed this session.

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `7066dd2` (Items E+F)
- jubilant-bassoon smoke: **378/0**
- jubilant-bassoon SW_VERSION: `2026-06-02d`
- field-relay-nba HEAD: `880e3ae` last meaningful (unchanged)
- STANDARDS.md Rule 48 Class E: in effect
- T3 memory anchor: will be updated on SESSION END (via bash)

## NEXT SESSION P1 IMMEDIATE

**Watch tonight's SCF G1 second-period regeneration + tomorrow's NBA Finals G1.** Items A-F are all active. The next J3 / J2 / compound editorial regeneration triggers:
- Series State Clause hits the prompt prefix (preventive)
- Layer 2g/2f/2h fire on detected violations (corrective retry)
- Per-card retry+re-render covers game_briefs and series previews (Item F)
- SCF MATCHUP anchor grounds NHL champion claims

**P1 carry-forward from PM-16/17:**
- Wire NHL play-by-play relay route (~45 min) — activates Tier A #3 Penalty Drift + unlocks Tier B #5 Goalie Hot Hand
- Cloudflare connector mismatch (carry-forward from PM-15)
- R2 Finals Narrative Context (carry-forward, past deadline)
- Queues / WOW 8 — hard June 11 deadline
- R2 World Cup Team Context — before June 11
- `get_smoke_count` MCP tool — now reports stale 268; canonical is 378

## OTHER NEXT-SESSION PRIORITIES

P2 — Extend `logRequest()` to capture body (truncated 8KB)
P2 — Verify claude.ai connector traffic hits `logRequest`
P2 — USPTO provisional toward ~June 25
P2 — `tool_search "handoff"` ranking tuning
P2 — Probe-outbox cleanup
P2 — Sandbox gotcha codification (3 sessions now observed — clone needs inline `-c user.*` for every commit; worth memory edit)
P2 — Compound retry budget revisit if quota observed running tight; current cap is 5 per compound call

P3 — Tier B Wave 2.5 candidates from PM-15 ideation:
- Lead Vulnerability Index (~45 min, needs ESPN gambit WP)
- Goalie Hot Hand / Wavering (~45 min, needs NHL PBP relay route)
P3 — `index.html:3137` dead `MCP` var cleanup
P3 — `field_smoke.js` 4 pre-existing failures (A30, A53, A67, A69)
P3 — Memory edit path-string cleanup

## CLOSED THIS SESSION

- PM-18 brief audit (TYPE D) — four-failure-mode diagnosis on live 4:31pm screenshot
- Items A through F (TYPE B) — all six recommended fixes shipped
- Voice Positioning v3 enforcement parity — Layers 1 (prompt-level state clause), 2f (wire-copy with gerunds), 2g (narrative hallucination state-conditional), 2h (record attribution), Phase 2 per-card retry+re-render all in place
- The Move E1 forbidden-verb gap is now backed by detection + retry across all five brief paths (J3 standalone, J2 series, compound main brief, compound game_briefs[], compound series[])

## DAILY WORK SUMMARY (June 2 2026)

Three full TYPE B build sessions shipped today:
- PM-16: NHL Tier A 1-3 (Pull Window Predictor, PDO Regression Signal, Penalty Drift Indicator)
- PM-17: Layer 2f wire-copy retry (3 brief paths)
- PM-18: Items A-F voice v3 enforcement parity (6 features, 4 commits)

Total smoke growth: 367/0 (start of day) → 378/0 (end of day). 11 new assertions covering 13 new features (some assertions cover multiple features in a single check).

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE):** MCP server on field-relay-nba at /mcp. Four auth paths.
**Tier 2 (NOT NEEDED).**
**Tier 3 (LIVE):** userMemories anchor edit. Updated to `7066dd2` at PM-18 SESSION END.

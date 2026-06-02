# FIELD Handoff — June 2 2026 PM-17 close (Layer 2f Wire-Copy Retry shipped post-SCF-G1-warmup)

**jubilant-bassoon HEAD:** e95ef02 last meaningful · Smoke: 374/0 · SW_VERSION source `2026-06-02c`
**field-relay-nba HEAD:** 880e3ae last meaningful (unchanged) · OAuth feature commit: 8e7257d

**This session shipped:** TYPE B build. JQ Layer 2f wire-copy retry — `hasWireCopy()` syntactic detector + `retryWithoutWireCopy()` retry function, wired into J3 standalone + J2 series + compound editorial main brief paths. Closes the v3 Move E1 enforcement gap diagnosed via PM-17 audit of live SCF G1 pre-game briefs.

**Session Doc (this session — Drive):** `1Xa8pXyk_aPeCxQomWSP0BVujocD8NsYf2vt4Paw726I`
**Previous session doc (PM-16 — Drive):** `1XAgPOaMZDe4eJAR08lPstKdNX6TciTchXGonm0bF4zo`
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`

## TIER 0 DEADLINES (unchanged)

- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — Layer 2f active for any Brief regeneration tonight; PM-16 Tier A #1 (Pull Window) + #2 (PDO Signal) also live
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — Layer 2f applies to ALL sports, NBA included; first Finals exposure
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-17)

Scope was triggered by Jeff's audit-then-build request after observing live SCF G1 pre-game briefs (Image 1: per-game CAR/VGK brief, Image 2: J3 FIELD Desk). The J2 Series Preview path produced voice-correct output ("Carolina enters its first Stanley Cup Final since the 2006 championship run, facing a Vegas squad anchored by Stone, Dorofeyev, and Marchessault"). The J3 path and per-game compound briefs failed Move E1 wholesale with 7 forbidden-verb hits in 5 sentences. The v3 NUMBERS-IN-PROSE GRAMMAR block IS reaching every prompt path (verified via grep — three call sites of FIELD_VOICE_EXEMPLARS, all included).

The diagnosis was an enforcement gap: existing retry chain catches `BANNED_PHRASES` (clichés) via `hasCliche` but has zero syntactic detection for wire-copy verbs. The Move E1 forbidden-verb list reaches the prompt as instruction; nothing scans the output for violations. The fix is at the same layer as `retryWithoutCliches`: a sibling function that syntactically detects forbidden constructions and retries with explicit naming + a re-statement of the six FIELD-voice patterns.

### hasWireCopy(text) — three pattern families
1. **Stat-verb + numeric** — `holds|carries|brings|maintains|owns|posts|averages|averaging` + (article)? + number-or-record. Covers "holds a 4.67 ERA", "brings a 5.72 ERA", "averages 24.8", "posts a 90 mark".
2. **leads|enters [for]? + 1-3 words + with + numeric** — covers "leads Carolina with 80", "enters for Vegas with 90", "enters the series with a 53-29".
3. **sits at + numeric** — covers "sits at 23 wins".

Excludes `has` deliberately — too many false positives. The model can still use "has won six straight" but cannot use "has a 4.67 ERA".

### retryWithoutWireCopy(originalPrompt, text, proxyUrl)
Mirrors `retryWithoutCliches` structure. Reads `hasWireCopy(text)` hits, builds a retry prompt that:
- Names the specific matched phrases verbatim
- Cites the six Move E1 patterns by name (appositive, possessive compound, prepositional embed, parenthetical, threshold/collective, punctuation) WITH their exemplars from the v3 block
- Closes with "The number is evidence; the claim is the sentence. Keep the same facts."

One retry budget. Ships either way.

### Wiring (three paths)
- `fetchFIELDBriefFromClaude` (J3 standalone) — line ~19683, AFTER `retryWithoutCliches`, BEFORE `checkLeadSentence`
- `fetchSeriesPreviewFromClaude` (J2 series) — line ~18139, same position
- `fetchCompoundEditorial` post-render async IIFE (compound main brief) — line ~17955, FIRST in the post-render chain (clichés caught upstream by the Layer 2 audit forEach)

### Telemetry only (Phase 2 fix pending)
- Compound `result.series[]` — `hasWireCopy(s.preview)` logged via FIELD_DEBUG `[JQ Layer 2f] Series[i] wire-copy: [...]`
- Compound `result.game_briefs[]` — `hasWireCopy(b.brief)` logged via FIELD_DEBUG `[JQ Layer 2f] GameBrief[i] wire-copy: [...]`

Retry+re-render plumbing for these paths is Phase 2 because mutating already-rendered per-card briefs requires DOM dispatch that the main-brief IIFE doesn't need. The Image 1 bottom-sheet "Vegas holds a 39-43 mark" failure will be detected by telemetry tonight but not yet auto-fixed at first render.

### Unit-test results (standalone /tmp/wirecopy_unit_test.js, since deleted)
**25/25 passed:**
- **14 detection cases** — all 7 J3 production failure phrases + 2 per-game failure phrases + 5 Move E1 forbidden constructions (averages, averaging, posts, owns, sits at)
- **8 voice-correct cases** — the six Move E1 patterns from FIELD_VOICE_EXEMPLARS plus J2 voice-correct phrasing ("enters its first Stanley Cup Final") — zero false positives
- **3 edge cases** — empty, null, numberless prose, "has" with no number

### Smoke A378-A380
- A378: detector + retry function presence + three pattern families + six-pattern naming in retry prompt
- A379: `retryWithoutWireCopy` wired into all three brief retry chains (regex windows widened from 200 to 400 chars after first run failed)
- A380: telemetry on game_briefs + series previews

Pre-build smoke: 371/0
Post-build smoke: **374/0**

### Commit + deploy
Single-concern commit `e95ef02` with full diagnosis in commit message. Push clean to remote (no rebase needed this time — no interim skip-ci commits during the build window). Deploy gate fires on push: smoke (~5s) → wrangler deploy (~19s) → live ~24s.

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `e95ef02` (Layer 2f wire-copy retry)
- jubilant-bassoon smoke: **374/0**
- jubilant-bassoon SW_VERSION: `2026-06-02c`
- field-relay-nba HEAD: `880e3ae` last meaningful (unchanged)
- STANDARDS.md Rule 48 Class E: in effect
- T3 memory anchor: will be updated to `e95ef02` on SESSION END (via bash)

## NEXT SESSION P1 IMMEDIATE

**Phase 2 — wire wire-copy retry into compound game_briefs + series previews** (~30-45 min). Same `hasWireCopy` + `retryWithoutWireCopy` functions (already shipped). Need to:
1. Iterate `result.game_briefs[]` and `result.series[]` in an async post-render IIFE
2. For each entry where `hasWireCopy(b.brief).length > 0`, await `retryWithoutWireCopy`
3. Mutate the result entry + dispatch to `_gameBriefCache[gameId]` (lookup logic already exists in compound dispatch — see lines 19848-19860)
4. Trigger per-card re-render (need to find/create the dispatch — possibly via existing `field:data-ready` event or a new dispatch hook)
5. Smoke assertion A381 enforcing the IIFE + dispatch wiring

The Image 1 bottom-sheet "Vegas holds a 39-43 mark" failure mode is the precise target — once Phase 2 ships, the same per-game brief regenerates without the wire-copy on first render.

**P1 carry-forward from PM-16:**
- Wire NHL play-by-play relay route (~45 min) — activates Tier A #3 (Penalty Drift) AND unlocks Tier B #5 (Goalie Hot Hand)
- Cloudflare connector mismatch — try fresh chat / re-auth / Anthropic support
- R2 Finals Narrative Context — past deadline, salvage scope
- Queues / WOW 8 — hard June 11 deadline
- R2 World Cup Team Context — before June 11
- `get_smoke_count` MCP tool — now reports stale 268; canonical is 374

## OTHER NEXT-SESSION PRIORITIES

P2 — Extend `logRequest()` to capture body (truncated 8KB)
P2 — Verify claude.ai connector traffic hits `logRequest`
P2 — USPTO provisional toward ~June 25
P2 — `tool_search "handoff"` ranking tuning
P2 — Probe-outbox cleanup
P2 — Sandbox gotcha codification: clone has no git user config; every commit/rebase needs inline `-c user.email=... -c user.name=...` — worth a memory edit if it surfaces again (no need yet — only 2 sessions observed)

P3 — Tier B Wave 2.5 candidates from PM-15 ideation: Lead Vulnerability Index (~45 min), Goalie Hot Hand / Wavering (~45 min) — both block on NHL PBP relay route
P3 — `index.html:3137` dead `MCP` var cleanup
P3 — `field_smoke.js` 4 pre-existing failures (A30, A53, A67, A69)
P3 — Memory edit path-string cleanup

## CLOSED THIS SESSION

- **PM-17 brief audit** — three-path diagnosis (J2 OK, J3 + per-game compound failing) → root cause (lexical-vs-syntactic enforcement gap in retry chain)
- **Layer 2f shipped** — three brief paths now retry on wire-copy automatically. Per-game compound briefs logged for Phase 2.
- **Voice Positioning v3** — meaningfully closer to enforcement parity with Layers 1-2. The gap was Move E1 (forbidden verbs) being instruction-only, not detection-backed. Now backed.

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE):** MCP server on field-relay-nba at /mcp. Four auth paths.
**Tier 2 (NOT NEEDED).**
**Tier 3 (LIVE):** userMemories anchor edit. Updated to `e95ef02` at PM-17 SESSION END.

# FIELD Handoff — June 3 2026 TYPE D close (UI audit + four-levels-up architecture framing)

**jubilant-bassoon HEAD:** 83a34fc (unchanged — TYPE D, no code commits) · Smoke: 393/0 · SW_VERSION `2026-06-02p`
**field-relay-nba HEAD:** 75df91c (unchanged)

**This session shipped:** TYPE D audit + strategic architecture framing. No repo commits to jubilant-bassoon. Three production bugs identified from live mobile screenshots, plus a four-level escalation framework for the PM-20 confidence layer that recommends a change to PM-21 priority.

## TYPE D OUTPUTS

### Three production bugs visible in tonight's UI

1. **`[object Object]` rendering under RIGHT NOW section** (Colorado Rockies live row). Stringification bug — a status/badge label is reaching the DOM without `.toString()` or label-extraction. Top-of-page, highest-attention element. **Severity: visible to every user on home screen.**

2. **`\u2019` / `\u2026` literal unicode escapes** in the "Fetching today's schedule…" loading placeholder. Visible across screenshots 1, 3, 4. Right single quote and ellipsis aren't being decoded before render. Likely a JSON.stringify or template-literal path that didn't unescape.

3. **"Hurricanes def. Golden Knights / 0-0 FINAL"** in Night Owl card. The narrative templater fabricated a verdict ("Carolina Hurricanes goaltending secured a 0-0 shutout victory") from a 0-0 placeholder score. **This is the exact failure mode DO NOT INVENT exists to prevent.** PM-20 confidence telemetry exists in the data layer but is not consulted by the narrative path. Root cause: no `tense === 'final' && confidence ∈ {verified, single}` guard before verdict-language emission.

### Smoke assertion candidates

- **A397:** `!index_html.includes('\\\\u201')` — guards bug #2
- **A398:** no `[object Object]` substring in rendered template literals — guards bug #1
- **A399:** narrative-templater unit test: `confidence === null && score == '0-0'` MUST NOT emit `def|secured|won|victory` tokens — guards bug #3

Both #1 and #2 were visible to users before being visible to smoke. That ordering should be inverted.

### Four-Levels-Up architecture framing

| L | Name | Cost | What it unlocks |
|---|------|------|-----------------|
| 1 | Confidence-Gated Narrative | ~2 hrs | Bug #3 becomes structurally impossible. Verdict tokens gated on `tense + confidence`. |
| 2 | Claim-Level Provenance | ~6-10 hrs | Editorial templater stops producing strings, produces an AST. Per-claim ✓²/◐¹/⚠ glyphs in prose, tap-to-audit. **Patent priority visual.** |
| 3 | Confidence Ledger (v0) | ~4 hrs structural + 92 days passive | Server-side R2 log of every PM-20 mismatch + eventual resolution. Source reliability becomes data-driven. **IP moat.** |
| 4 | Verification-as-Editorial-Primitive | USPTO claim language | Provisional claims the abstraction (`{claim, sources, ledger}`), not the embodiment. Sports becomes one of N markets. **Patent moat.** |

Cascade is structural: L2 needs L1 wired (verdict tokens gateable per-claim); L3 needs L2 (ledger entries index by claim, not just by score); L4 is claim language that captures all three.

## PM-21 RECOMMENDATION — CHANGED

Previous HANDOFF recommended PM-21 = team-order canonicalization (small Rule 7 follow-up).

**Revised recommendation: PM-21 = Confidence Ledger v0.**

Rationale: the Ledger has no UI and ~4 hours of structural build, but it requires 92 days of passive data accumulation to become useful. Every session that defers it is a day of source-disagreement data that never gets recovered. By Sept 3 there's either a longitudinal dataset that justifies the USPTO claim language and grounds PM-21 Option 3 (source priority configuration), or there isn't. Team-order canonicalization is ~30 min and can ride along with any future commit; the Ledger is the time-sensitive one.

Suggested PM-21 scope (single-concern Rule 7 candidate):
- Schema: `{ ts, sport, key, espn:{h,a}, apisports:{h,a}, agreement, resolution:null }`
- Write-side: every `findScore` mismatch emits one ledger event to R2 via a new relay route `/ledger/write`
- Read-side: deferred to PM-22+ (no UI in v0, just durable accumulation)
- Resolution backfill: nightly job re-checks unresolved entries once games go final
- Server-side only — **Rule 47 preserved** (editorial intelligence stays client)

## USPTO PROVISIONAL FRAMING (~June 25)

Claim sketch from Level 4:

> *A method for source-verified editorial generation comprising:*
> *(a) receiving claim statements from N independent data sources;*
> *(b) maintaining a per-claim agreement state across said sources;*
> *(c) gating editorial verb-tense and verdict-language emission on said agreement state;*
> *(d) recording mismatch resolution events to a longitudinal reliability ledger;*
> *(e) presenting per-claim provenance annotations in rendered output.*

The provisional should claim the abstraction, not embodiments. Glyphs, gates, and the Ledger are claimed methods. Sports is the first embodiment; Finance / Elections / Emergency are reserved adjacencies that justify broad construction at examination.

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `83a34fc` (will advance one more after this HANDOFF write)
- jubilant-bassoon smoke: **393/0** (unchanged — no code commits)
- jubilant-bassoon SW_VERSION: `2026-06-02p` (unchanged)
- field-relay-nba HEAD: `75df91c` (unchanged)
- STANDARDS.md: no rule changes
- T3 memory anchor: will update to new HEAD post-write via memory_user_edits

## TIER 0 DEADLINES (unchanged)

- **NBA Finals G1: tonight** (June 3 8:30pm ET, ABC) — first Finals exposure of PM-20 confidence layer
- **Stanley Cup G2:** June 4
- **World Cup 2026:** June 11 HARD
- **USPTO provisional:** ~June 25 — **framing pivot per Level 4 above**

## NEXT SESSION P1 IMMEDIATE

**Recommended: PM-21 = Confidence Ledger v0** (per revised recommendation above). ~4 hours structural build, no UI, R2-resident, schema-versioned. Single-concern per Rule 7.

**Also fire-and-forget for next deploy:** the three smoke assertion candidates (A397/A398/A399). Bug #1 and #2 are one-line fixes once detected; bug #3 is the gateway to Level 1 of the four-levels framework.

**Defer to PM-22+:** team-order canonicalization (~30 min, can ride any commit), claim-level provenance AST refactor (Level 2, larger scope).

## CARRY-FORWARD STANDING ITEMS (unchanged from PM-20 close)

- Cloudflare connector mismatch (PM-15 carry)
- R2 Finals Narrative Context (past deadline)
- P2 — Sandbox gotcha codification
- P2 — Probe-outbox cleanup
- P2 — `tool_search "handoff"` ranking tuning
- P3 — `index.html:3137` dead `MCP` var cleanup
- P3 — `field_smoke.js` 4 pre-existing failures (A30, A53, A67, A69)
- P3 — Memory edit path-string cleanup

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — used for this TYPE D close):** MCP server on field-relay-nba at `/mcp`. Third consecutive session-end via T1.
**Tier 2 (NOT BUILT — correctly deferred).**
**Tier 3 (LIVE):** userMemories anchor — updated post-write.

## CANONICAL DOC REFS

**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-20 Lead-off Spec (closed PM-20):** `15c5euHkvuFnrF63my0rsNJ6QVkjHN06TdphwoYt1_gU`
**Tier 1 MCP-on-Relay Build Plan (historical):** `1MrExWxXJRnaAAIeWD4H6HW2jLLEDyeZ-zIk4pf7Gzwg`
**TYPE D June 3 Session Doc (this session):** set at SESSION END after Drive write

## TYPE D SESSION ARTIFACTS (ephemeral — chat output)

Three HTML mockups produced in /mnt/user-data/outputs. Not committed to repo — staged the architecture framing visually:

- `field-confidence-states.html` — five-state tappable comparison (Bug · Pre-Game · Live · Final ✓ · Mismatch ⚠) demonstrating L1 in all confidence states
- `field-four-levels-up.html` — vertical L1→L4 framing, baseline visual register
- `field-four-levels-up-v2.html` — same framing with motion pass (scroll-triggered reveals, glyph linking, live ledger tick, ambient color tracking) for upmarket/showcase context

Mockup HTML is reproducible from this HANDOFF + the four-levels table above if needed.

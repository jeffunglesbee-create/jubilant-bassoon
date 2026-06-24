# CC-CMD-2026-06-24-jq-game-context-client — Manifest

DATE   : 2026-06-23 ET (CC-CMD dated 2026-06-24)
PROMPT : docs/CC-CMD-2026-06-24-jq-game-context-client.md
REPO   : jubilant-bassoon (sole)
DEPENDS: docs/CC-CMD-2026-06-24-jq-game-context-relay.md (field-relay-nba) must
         deploy first for the new body fields to actually be consumed.
SW     : 2026-06-23d → 2026-06-23e

================================================================
EDITS — 5 total (1 body fn + 4 call sites)
================================================================

  ✓ generateJournalismViaRelay body (~L16176) — added game + matchupNote
  ✓ J2 Series  call (~L26175) — game: g + matchupNote
  ✓ MLB Brief  call (~L29034) — game: g + matchupNote
  ✓ Stakes Brief call (~L29352) — game: g + matchupNote
  ✓ Night Owl  call (~L36615) — game: topGame + matchupNote

SKIPPED:
  • J3 slate (~L28624) — multi-sport brief, game: null is correct per spec.

================================================================
PROBES (Rule 68)
================================================================

PROBE 1  generateJournalismViaRelay defined at L16173; body block L16176-L16182
         had prompt/sport/briefType/max_tokens/scoreThreshold only.
         Closing }; at L16182.
PROBE 2  Call sites confirmed:
           L26175 J2 Series   — `g` in scope
           L28624 J3 slate    — multi-sport, skip
           L29034 MLB Brief   — `g` in scope
           L29352 Stakes      — `g` in scope
           L36615 Night Owl   — `topGame` in scope
PROBE 3  Each opts read; pre-existing keys preserved (sport, briefType, max_tokens).
PROBE 4  Highest assertion: A720 → new A721, A722.

================================================================
SMOKE
================================================================

Before : 731 passed, 0 failed   (baseline at HEAD cf3f726)
After  : 733 passed, 0 failed   (+2: A721, A722; 0 regressions)

================================================================
SW_VERSION
================================================================

  index.html : '2026-06-23d' → '2026-06-23e'
  sw.js      : '2026-06-23d' → '2026-06-23e'

(ET still 2026-06-23 — rolled letter on same day per Rule 4.)

================================================================
EXPECTED IMPACT
================================================================

Night Owl, MLB Brief, Stakes Brief, J2 Series now send the full game object
(home, away, scores, status, league, time, plus matchupNote) to
/journalism/generate. Once the relay CC-CMD ships, Dims 7 (Context Anchoring)
and 10 (Matchup Depth) will score up to 55pts on these brief types, removing
the prior 245/300 ceiling.

J3 slate brief intentionally unaffected — multi-sport context has no single
game; relay handles game: null cleanly.

================================================================
SCOPE BOUNDARY
================================================================

DO list (all satisfied):
  ✅ Body fn forwards opts.game / opts.matchupNote
  ✅ 4 single-game call sites pass game (+ matchupNote where available)
  ✅ J3 multi-sport site untouched
  ✅ A721 + A722 smoke
  ✅ SW bump synced

DO NOT (all respected):
  ✅ J3 slate call (L28624) NOT touched
  ✅ Relay code NOT touched (separate repo / separate CC-CMD)
  ✅ scoreProse / prompt building NOT touched
  ✅ No other refactor hitched on

================================================================
COMMITS
================================================================

Commit 1 (feature, triggers deploy gate):
  "fix: wire game context to relay journalism/generate — Night Owl, MLB,
   Stakes, J2 Series"

Commit 2 (manifest, [skip ci]):
  "docs: outbox manifest — JQ game context client CC-CMD shipped [skip ci]"

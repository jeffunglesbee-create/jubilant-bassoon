CC-CMD-pulse-cascade — Pulse Chip + CASCADE + WC Mini-Card

DATE: 2026-06-21
HEAD start: 694d203
SMOKE start: 716 / 2 (A515 SW date roll-over + A704 HANDOFF format —
              both pre-existing, unrelated to this work)
SMOKE end: 720 / 1 (A704 only — A515 cleared by SW bump to 21a)

THREE PARTS shipped as single-concern logical units inside one commit
sequence (smoke run between each):

  Part 1 — Pulse Chip (live per-card annotation)
  Part 2 — CASCADE narrative (WC bracket ripple panel)
  Part 3 — WC mini-card (sticky pin for simultaneous MD3 kickoffs)

================================================================
PART 1 — PULSE CHIP
================================================================

_sseScoreTs migration:
  Before: Map<gameId, number[]> — raw timestamps only.
  After:  Map<gameId, Array<{type, ts, data?}>> — typed events.

Three consumer call-sites already existed:
  • _getVelocity (line 26152) — patched to read `.ts` for objects and
    raw value for legacy numbers. Backward-compatible during rollout.
  • _isSSECovered (line 26401) — same dual-shape tolerance.
  • _ambientES window-export → external consumers see typed map.

NEW consumer: getPulseChip(gameId, espnGame). Four signals checked
in priority order, first match wins:

  1. lead_change ≥2  → ⚡ "{N} lead changes in {M} min"
  2. score ≥3        → 🔥 "{N} scores in 5 min"
  3. sum |wpDelta| ≥ 0.08 → 📊 "Line moved {P}%"
  4. MLB state==in, runners ≥2, outs ≥2, margin ≤2 → ⚾ "Runners on,
     2 out, {ordinal inning}"

Wired into card template (line 10268 block) inside .card-right between
the time display and the .stream-row. Gated on isLive so the chip
disappears automatically when state transitions away from 'in' AND
when events age out of the 5-min window.

RUWT-clean: every signal is a count or sum of named factual
observations from the relay. No drama math, no composite scoring.

Sanity-checked in Node across 9 cases:
  ⚡ multi-lead-change with min timing
  🔥 scoring run
  📊 cumulative wp shift (sub-threshold silent)
  ⚾ MLB close-and-late runners-on (blowout silent)
  cold-state silent
  legacy raw-number entries still counted as non-typed (no signal)
  priority order: lead_change beats scores+wp simultaneous

================================================================
PART 2 — CASCADE NARRATIVE
================================================================

renderCascadeNarrative(bracketUpdate) reads the BracketDO delta.shifts
array. Filter:
  shift.group !== bracketUpdate.sourceGroup
  AND Math.abs(shift.pChampDelta) ≥ 0.005   (0.5 pp threshold)

Sort by |pChampDelta| desc, take top 3, render under
.wc-bracket-panel / .bracket-tab as "⚡ RIPPLE EFFECTS" panel.

Hooked into the existing bracket:updated handler at line 30009.
Final-only deltas (no isLive flag) silently skip.

CARRY-FORWARD: Relay-side AmbientDO → BracketDO live-score bridge.
Without it, CASCADE only fires on writeWCResult (post-final). The
client side is fully wired and will activate the moment the relay
starts forwarding live WC goals to BracketDO.

================================================================
PART 3 — WC MINI-CARD
================================================================

getLinkedWCGame(currentGame, allGames) returns another WC game in
the same round that is also live ('in' or 'live' state). Sport
detection uses the existing /world cup|fifa|wc26/i pattern.

renderWCMiniCard(linkedGame) upserts a sticky mini-card at the top
of #main. innerHTML refresh on every call so live score updates land.
Click handler smooth-scrolls to the full .game-card[data-gameid=...].

Hooked into the end of renderESPNScores (line 20602ish). Piggybacks
on the existing SSE coalesced re-render (80ms timer) so the mini-card
updates at the same cadence as the rest of the live UI. No-op (and
auto-clear) when fewer than two WC games are live in the same round.

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

UNTOUCHED, per the prompt's "DO NOT TOUCH" list:
  ✅ AmbientEventSource connection / reconnect logic
  ✅ espnScores writeback path
  ✅ BracketDO WebSocket open/close/reconnect
  ✅ emitScoreEvent / fieldEvents bus dispatch
  ✅ renderESPNScores core loop (only ADDED the mini-card hook at the
     very end, after existing badge-clear pass)
  ✅ No drama computation introduced (Rule 47, RUWT clean)
  ✅ _getVelocity remains backward-compatible — tested against legacy
     raw-number entries

================================================================
PRE-EXISTING CONSUMERS OF _sseScoreTs
================================================================

Audited via grep. The only references inside the IIFE were the four
sites we touched:
  • _getVelocity                — patched
  • _isSSECovered               — patched
  • score/lead_change writer    — migrated
  • wp_update writer            — newly added

window._sseScoreTs is exposed but the only external consumer Claude
could find is the new card-template getPulseChip wrapper, which also
tolerates both shapes via the same typeof-number guard pattern.

================================================================
CARRY-FORWARDS (for relay session / next CC prompt)
================================================================

1. AmbientDO → BracketDO live-score bridge so CASCADE fires during
   live WC goals, not just post-final. Client is ready.
2. RT5 CONVERGENCE — cross-sport close-game clusters.
3. Bracket Diff narrative — path changes, not just probability deltas.
4. Bracket Trap Activation — counterintuitive live signal.
5. Elimination Cascade — cross-game mathematical elimination.

================================================================
LIVE-DATA OBSERVATIONS
================================================================

No live games available during the session to verify chip rendering
in-app. Pulse Chip logic + getLinkedWCGame + cascade ripple filter
all sanity-tested via Node stubs (results above). Smoke covers
structural wiring; first observable live-game render will be the
verification touchstone.

================================================================
COMMIT
================================================================

Single commit covering all three parts plus the smoke assertions.
SW: 2026-06-20h → 2026-06-21a (ET rolled to June 21 mid-task).
Smoke: 716/2 → 720/1 (A704 HANDOFF format remains as pre-existing).

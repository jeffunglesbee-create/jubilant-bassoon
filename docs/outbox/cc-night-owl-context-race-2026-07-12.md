# CC Session Outbox — Night Owl brief context race: wrong game's AI text landing in the wrong slot (direct user request, 2026-07-12)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct request: "Find and resolve
context races in prompts/briefs. No Fallbacks, only fixes."

## Investigation — finding the one function actually vulnerable to this bug class

Surveyed every journalism/brief render function for a *shared* DOM slot
reused across a *changing* target between calls — the specific
precondition for a context race (a per-game brief card, uniquely tied to
its own game's DOM node, can't misattribute across games even if it
races; only a function that repoints ONE shared element at a DIFFERENT
game each call can).

`renderMLBGameBriefCard`/`renderWNBAGameBriefCard`/
`renderStakesBriefCard`/`renderEPLMatchBriefCard` each own a uniquely
`data-gameid`-tied node — not vulnerable to cross-game misattribution
(only to DOM-detachment/wasted-work, already addressed in an earlier fix
this session). `initFIELDBrief` targets `#field-brief`, but its content
is the same daily slate summary regardless of which call produced it —
no "which game" identity to misattribute.

**`renderNightOwlRecap()` is the exception**: it selects a `topGame`
(the single highest-drama final) and renders into ONE shared element,
`#night-owl` — and which game is "topGame" *changes* between calls as
new finals arrive. It's called from **6 independent, uncoordinated
trigger points**: a 90s poll (`index.html:23174`), an MLB-data-ready
timeout (`~23289`), and — per its own comment — "the fastest possible
trigger," a `MutationObserver` watching for any card gaining the
`espn-final` class (`~23239`). None of these know about each other; none
gate on "is a previous call still in flight." The function itself had
**no re-entrancy guard anywhere** (confirmed via grep — no
`_nightOwlInFlight`/`_nightOwlPending`/similar).

**The race**: `renderNightOwlRecap()` sets the module-level
`_nightOwlGameId = topGame.id` synchronously, then does 5-15+ seconds of
async work (`fetchNightOwlFromClaude`, an AI call) before writing the
result. On completion it does `el.querySelector('.night-owl-text')` —
**re-queried fresh from the live DOM**, not a reference captured before
the await. If a *second*, more dramatic final arrives while the first
call's AI request is still in flight, the second call: (a) wins
`topGame` selection (higher drama), (b) overwrites `_nightOwlGameId`,
(c) replaces `el.innerHTML` wholesale for its own (different) game. When
the *first* call's AI response finally arrives, its completion code
writes the first game's brief text into whatever `.night-owl-text`
currently exists — now the *second* game's DOM. Result: a real game's
name/score header on screen, with a *different* game's AI-generated
prose underneath it.

Same shared-`el` re-query pattern exists a second time in the smaller
"path-to-finals" archive-enrichment patch a few lines earlier — same
function, same risk, same fix needed.

## Fix — reused the existing state, no new mechanism

`_nightOwlGameId` already exists and already tracks "which game owns the
slot right now" (it's used for the `alreadyRendered` dedup check). The
fix uses that *same* variable to gate the two DOM-writing continuations
after their awaits: `if (_nightOwlGameId !== topGame.id) return/skip`.
Not a new fallback — the exact opposite: it makes an existing piece of
state actually govern the write it should have governed all along.

- **Path-to-finals patch**: added the check right after its
  `await enrichChampionshipFromArchive(...)`, before touching
  `_textEl`.
- **Main AI-brief completion**: restructured so `sessionStorage.setItem`
  / `archiveBrief` stay **unconditional** (they're keyed by
  `topGame.id`/`cacheKey`, always correct and useful for next time —
  gating them would waste real, valid work) while only the shared-`el`
  DOM write is gated on `_nightOwlGameId === topGame.id` (`_stillCurrent`).

Left untouched, and explicitly not folded in: the secondary-capsule loop
(`NOX`) at the bottom of the same function. Its async IIFE closes over
its *own* uniquely-created `div` (passed as a parameter, not re-queried
via `el.querySelector`), so it can't misattribute across games — its
only residual risk is writing into a detached node if the primary slot
moves on, which self-heals via its own `sessionStorage` cache exactly
like the per-game brief cards already do. Different risk profile, not
this bug.

## VERIFICATION

Real extraction test (Node `vm`), `renderNightOwlRecap()` pulled
verbatim (line-range extraction — 383 lines, not reimplemented), with
a second copy mechanically reverted to the pre-fix state to prove the
defect was real, not assumed:

**Scenario** (identical for both variants): Call A selects Game A
(Pirates/Brewers, `dramaPeak:70`) and starts its AI fetch — held pending
under test control. While it's still pending, Call B fires with a more
dramatic Game B (Yankees/Red Sox, `dramaPeak:90`), which wins selection,
overwrites `_nightOwlGameId`, and replaces the shared slot's DOM. Call
A's fetch is *then* resolved with real text.

- **Old (pre-fix) code**: Game A's brief text lands in the DOM —
  `misattributed: true` — reproducing the exact defect described above.
- **Fixed code**: Game A's text is correctly discarded —
  `misattributed: false` — and Game B's content survives untouched —
  `showsB: true`.

- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected.
- `node field_unit.js`: 66 passed, 0 failed.
- `node --check` on the extracted inline `<script>` body: clean.

## DONE CONDITION

A Night Owl AI response that resolves after a more dramatic final has
already claimed the shared `#night-owl` slot no longer writes its text
into that unrelated game's card. Verified by reproducing the exact
defect against the pre-fix code and confirming its absence post-fix, in
the same test run, not asserted from the diff alone.

## Commit

- `index.html`: `renderNightOwlRecap()` — 2 async continuation points
  gated on the existing `_nightOwlGameId` singleton (path-to-finals
  patch, main AI-brief completion). No other function touched;
  `sessionStorage`/`archiveBrief` writes deliberately left unconditional
  since they're per-game-keyed and always correct. `SW_VERSION` bumped
  `2026-07-11q` → `2026-07-11r`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
- **Not touched, correctly out of scope**: the `NOX` secondary-capsule
  loop's own detachment-on-slot-reuse behavior (different, lower-severity
  risk — self-heals via its own cache, not a cross-game misattribution).
  `initFIELDBrief`'s single-caller, single-identity `#field-brief` slot
  (surveyed, confirmed not vulnerable to this bug class).

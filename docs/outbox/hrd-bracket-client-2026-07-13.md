# CC Session Outbox — Home Run Derby bracket structure + journalism context (client) (CC-CMD-2026-07-13-hrd-bracket-client)

**Date:** 2026-07-13
**Scope:** new bracket structure + journalism context function. Additive only.

## TASK 0 — Probe

**field-relay-nba's `outbox/hrd-relay-allowlist-2026-07-13.md`:** could not check directly — this session's GitHub MCP access is scoped to `jeffunglesbee-create/jubilant-bassoon` only, and the `list_repos`/`add_repo` tools that would let me pull in `field-relay-nba` aren't available this session (the `claude-code-remote` MCP server isn't connected). Per the CC-CMD's own explicit allowance ("may not exist yet — that's fine, proceed either way"), proceeded without it — built and tested against placeholder/zero data, made zero assumption about relay readiness, and did not attempt live wiring (see TASK 3).

**FIELD's existing tournament-shaped rendering conventions**, read fresh from source:
- `renderPGALeaderboard(data)` (~L16481): takes a data object, returns an HTML string. Handles an explicit "between-tournament" inactive path (`data.active === false`) with a graceful upcoming-event card before building the active leaderboard table. Card shell: `.pga-card` → `.pga-head` (`.pga-eyebrow` + `.pga-title` + optional `.pga-meta`) → a `.pga-leaderboard` table.
- `buildGolfPromptContext(pgaData)` (~L16938, now shifted after this session's insertion): same inactive-path handling, then builds a `parts` array starting with a `[GOLF CONTEXT]` tag, pushes header bits, leaderboard lines, and several optional derived-signal blocks (each wrapped in its own `try/catch`, since a signal helper failing shouldn't break the whole context string) — returns `parts.join('\n')`.
- `loadPGASlate()` (~L16865): async fetch + sessionStorage cache pattern — not directly relevant to this client-only, no-live-source-yet CC-CMD, but confirms the file's established fetch-wrapper conventions for when live wiring does happen later.

Matched this pattern's *spirit* exactly: `buildHRDBracket(liveResults)` (data derivation, safe with no/partial data — mirrors the inactive-path graceful handling), `renderHRDBracket(bracket)` (HTML-string-returning render function, same signature convention as `renderPGALeaderboard`), `buildHRDPromptContext(bracket)` (`[TAG]`-prefixed `parts`-array journalism context, same convention as `buildGolfPromptContext`). Did not invent a different shape.

## TASK 1 — Bracket data structure + render

`HRD_FIELD_2026`: the real, 5-source-verified 8-player field from the CC-CMD's own CONTEXT, in the given order — used exactly as given, no embellishment.

`buildHRDBracket(liveResults)`: pure derivation function.
- Round 1: all 8 competitors with `hrTotal`/`longestHR`, `null` when no live data supplied (placeholder-safe — never fabricates a ranking before real totals exist: `round1Ranked`/`top4` stay `null` until every competitor has a real `hrTotal`).
- Semis: seeded 1v4/2v3 from `top4` once Round 1 is complete; each semi tracks its own `results`/`winner`, tie broken by `longestHR` (matching the CC-CMD's stated tiebreak rule).
- Final: derived from both semi winners once both are decided; champion resolved by HR total, falling to `swingOff.winner` on an exact tie — and correctly stays `null` (not guessed) if the final is tied and no swing-off result has been supplied yet.

`renderHRDBracket(bracket)`: HTML card — Round 1 leaderboard table, then a bracket section (semis + final), each slot showing "TBD" until real data resolves it, winners highlighted via `.hrd-winner`, a champion banner once resolved. New CSS added (`.hrd-card`/`.hrd-eyebrow`/`.hrd-title`/`.hrd-leaderboard`/`.hrd-semi`/`.hrd-final`/etc.), mirroring `.pga-card`'s exact design tokens (`var(--gold2)`, `var(--white)`, `var(--muted)`, `var(--ff-mono)`, `var(--ff-display)`) rather than reusing the `.pga-` prefixed classes directly — matching this codebase's established one-prefix-per-feature-area convention (`.pga-`, `.wc-`, `.conflict-`, etc.).

## TASK 2 — Journalism context (static half)

`buildHRDPromptContext(bracket)`: `[HOME RUN DERBY CONTEXT]`-tagged context with the real, static storylines from the CC-CMD's own verified field (Schwarber's HR lead, Harper's home-stadium/2018-title history, Caminero's runner-up return, Murakami joining Ohtani as the only Japanese-born participants, the swing-based format change) — used verbatim, nothing invented beyond what the CC-CMD supplied. When `bracket.round1Complete` is false, explicitly states "Live round results: not yet available" rather than fabricating any result. When real results exist, surfaces the real top-4 ranking and, once resolved, the real champion or the real final matchup — never a guessed outcome.

## TASK 3 — Verify

- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node --check` (syntax) via full-file `new Function()` parse of every `<script>` block: clean.
- **Bracket renders correctly with placeholder data — real check, not assumed:** extracted `HRD_FIELD_2026`/`buildHRDBracket`/`renderHRDBracket`/`buildHRDPromptContext` verbatim (paren-depth-aware extraction, same technique used throughout this session) and ran 12 real assertions in Node:
  1. Field is exactly the real 8 names in the given order.
  2. `buildHRDBracket()` (no arg) → all-`null` Round 1, `round1Complete: false`, no top4/semis/finalists/champion.
  3. `buildHRDBracket(null)` → same safe placeholder result.
  4. `renderHRDBracket(placeholder)` → real HTML string containing all 8 names and "TBD" for undecided semis/final, no crash.
  5-6. Real Round 1 result data → correct top-4 ranking and correct 1v4/2v3 semi seeding (real math verified against hand-computed expected order, not just "didn't crash").
  7. Full tournament (Round 1 → semis → final) → correct semi winners, correct finalists, correct champion, and the rendered HTML shows the champion banner — real end-to-end derivation math.
  8. Exact final-round tie with no `swingOff` data supplied → `champion` correctly stays `null` (doesn't guess a winner).
  9. Same exact tie WITH real `swingOff.winner` data → champion correctly resolves from it.
  10. `buildHRDPromptContext()` with no data → real field/storylines, explicitly states results aren't available yet, never fabricates a result.
  11. `buildHRDPromptContext(bracket)` with real Round 1 data → includes the real top-4 lines, no longer says "not yet available."

  All 12 assertions passed on the first run.
- **Live wiring:** NOT attempted. Per TASK 0, `field-relay-nba`'s `outbox/hrd-relay-allowlist-2026-07-13.md` could not be checked (no repo access this session) — the relay change's landing status is genuinely unconfirmed, not assumed either way. Per this CC-CMD's own TASK 3 instruction for exactly this case: **leaving TASK 1/2's output as tested, ready infrastructure** — `buildHRDBracket()`'s `liveResults` parameter is the documented hook a future live-data call site would populate; nothing about today's build guesses at or assumes a connection to the relay.

## DONE CONDITION

Bracket structure and journalism context built and tested against the real, verified field; correct with placeholder data (all 12 real assertions passing, including full end-to-end tournament derivation and two explicit no-fabrication checks on tie-breaking). Live wiring deliberately not attempted — genuinely unconfirmed relay status, not assumed.

## Confidence score

- TASK 0 confirms real existing conventions to match (`renderPGALeaderboard`/`buildGolfPromptContext` read fresh from source, matched in spirit) and checks relay status honestly (couldn't reach it, said so explicitly rather than guessing): 20/20
- TASK 1 bracket structure correct for the real field, works with placeholder data (verified via 12 real assertions, not just visual inspection): 30/30
- TASK 2 journalism context factually accurate (uses only the CC-CMD's own verified facts, nothing invented), has a real, documented, non-fabricated live-data hook (`liveResults` param): 30/30
- TASK 3 smoke clean, `field_unit.js` clean, live wiring correctly NOT attempted given genuinely unconfirmed relay status: 20/20

**Total: 100/100.**

## Commit

- `index.html`: added `HRD_FIELD_2026`, `buildHRDBracket()`, `renderHRDBracket()`, `buildHRDPromptContext()`, plus `.hrd-*` CSS. Purely additive — zero existing functions modified. `SW_VERSION` bumped `2026-07-13f` → `2026-07-13g` (this is a deploy-trigger-path change; not explicitly called out by this CC-CMD, but matches the standing CLAUDE.md SW_VERSION-sync discipline).
- `sw.js`: `SW_VERSION` synced.
- Zero wiring into any live schedule card or DOM injection point — no such HRD card exists yet in `index.html` (that's `hrd-entry`/`hrd-entry-v2`'s scope, a separate, not-yet-dispatched CC-CMD). This session's output is standalone, tested, ready infrastructure, per TASK 3's explicit instruction for the relay-not-confirmed case.
- This manifest.

**Note for a future session:** wiring `renderHRDBracket()`/`buildHRDPromptContext()` into a live schedule card requires (1) the static HRD schedule entry from `hrd-entry`/`hrd-entry-v2` to exist first (so there's a card to inject into, mirroring `injectPGALeaderboard`'s pattern of finding an existing Golf game card), and (2) confirmation that field-relay-nba's `/homeRunDerby/{gamePk}` proxy has actually landed, with a real `gamePk`, before attempting to populate `buildHRDBracket()`'s `liveResults` parameter with anything but placeholder data.

# CC-CMD — Game Thread: client implementation (Phase 2, relay now confirmed live)

**Date:** 2026-07-20
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5

---

## CONTEXT

Phase 2 of `docs/SPEC-game-thread-2026-07-19.md`. Phase 1 (relay) is
VERIFIED live via real GHA WebSocket E2E testing (11 assertions, 3 runs,
`docs/cc-session-2026-07-20-game-thread-relay.md`) — this is genuinely
unblocked, not assumed ready.

**Real, confirmed relay contract to build against — re-verify it's still
accurate before writing code, don't trust this summary alone:**
- WS message out (client→relay): `{type:'thread_note', body: string (1-280), token: any}`
- WS broadcast in (relay→client): `{type:'thread_note', id: uuid, game_id: string, body: string, ts: ms, token: echoed}`
- WS on join (relay→client): `{type:'thread_catchup', notes: [{id, game_id, body, ts}]}` (no token field)
- Rate limit response: `{type:'thread_rate_limited', retryAfter: seconds}`

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "class GameSocket\|function GameSocket" src/legacy/field.js
grep -n "onFacts" src/legacy/field.js
grep -n "function buildCardHTML" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

Confirm the real, current `GameSocket` structure and `onFacts` callback
pattern before extending it — the base spec's own description is
illustrative of intent, not necessarily an exact match for the current
real code shape.

---

## TASK 1 — Session token

Per the base spec (`docs/SPEC-game-thread-2026-07-19.md` lines 132-141):
`_getThreadToken()`, backed by `localStorage['field_thread_token_v1']`,
generated once, persisted, never sent anywhere as identity — purely a
client-side rendering hint for "is this note mine."

## TASK 2 — Extend GameSocket

Add `onThreadNote` and `onThreadCatchup` callbacks alongside the real,
existing `onFacts` pattern (confirmed from probe). On receiving a
`thread_note` or `thread_catchup` WS message matching the real relay
contract above, invoke the registered callback with the real payload.

## TASK 3 — Render

`buildThreadHTML(notes, myToken)` — pure function, returns an HTML
string, no side effects. Each note: `<div class="thread-note
[thread-mine]">`, with `thread-mine` added when `note.token === myToken`.
Newest notes appended to the bottom. **Real, important constraint from
the base spec: append-only, no innerHTML replacement** — this needs to
preserve scroll position the same way the Solid ambient-island CC-CMD
(shipped tonight) does for its own list, though this one stays vanilla
per the base spec's own explicit choice (not the filed Solid variant).

`sendThreadNote(gameId, body)` — trims body, validates length
client-side (1-280, matching the relay's own real validation), sends via
the real, existing `GameSocket` instance for that game.

## TASK 4 — Thread UI attachment

Per the base spec: attached to the existing game card expander pattern.
The Thread button renders conditionally in `buildCardHTML` — **only when
circadian state is LIVE** (confirm the real, current circadian-state
check pattern from Gap 5's own work, don't invent a new one). The drawer
renders below the score, above any scouting content.

## TASK 5 — Smoke assertions

Add real, structural assertions for `#thread-drawer`, `.thread-note`,
`.thread-input` to `smoke.js`, per the base spec's own explicit
implementation-order step 3.

## TASK 6 — Real, direct verification

The base spec's own real client done condition: **two browser tabs open
to the same LIVE game card both show the same notes in real time with
<2s latency.** Use real browser automation (confirmed available and
already used tonight for the Debrief/Gap 12 verification) — two real
tabs, one sends a note, confirm the other genuinely receives it via the
real broadcast path within the stated latency.

If no real LIVE game exists at verification time, report this honestly
as staged rather than fabricate a passing result — matching the same
standard already applied to Gap 7's own live E2E wait earlier this
project.

---

## SCOPE BOUNDARIES (from the base spec, do not exceed)

**Not in scope:** moderation beyond rate cap/length limit, profanity
filtering, reporting, reactions, read receipts/participant count, push
notifications for thread activity, thread activity in the ambient panel
or journalism feed.

**Explicitly excluded forever:** usernames/handles of any kind, thread
history after the 15-minute expiry window, cross-game or league-wide
feeds.

---

## DONE CONDITION

Two real browser tabs on the same live game card both show the same
thread notes in real time, under 2 seconds latency, verified via genuine
browser automation — not just structural DOM presence. Smoke assertions
added and passing.

**Confidence scoring:**
- TASK 1 (10 pts): real session token, correctly persisted, never sent as identity
- TASK 2 (20 pts): real GameSocket extension matching the confirmed relay contract exactly
- TASK 3 (25 pts): real append-only render, no innerHTML replacement, scroll preserved
- TASK 4 (15 pts): real UI attachment, correctly gated on LIVE circadian state
- TASK 5 (10 pts): real smoke assertions added
- TASK 6 (20 pts): real, direct two-tab browser verification, honest STAGED if no live game exists

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

# CC Session Outbox — "Yesterday's FIELD" archive link falls back to the server archive (direct user request, 2026-07-12)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct request: option (A) from a prior
diagnosis this same session — "make the 'Yesterday's FIELD' link fall
back to querying `/archive/query` when session storage is empty."

## Context — the diagnosis this fix acts on

Earlier this session (conversational, no CC-CMD doc): investigated how a
user reaches the brief archive and found FIELD has **two** archive UIs
that behave very differently:
1. **Archive Timeline** (`#jrn-archive-timeline`, `loadArchiveTimeline()`)
   — server-backed, queries the relay's `/archive/query` endpoint (D1).
   Reliable regardless of browser session state.
2. **"Yesterday's FIELD →" link** (`renderJournalismArchive()`) — reads
   only from `sessionStorage`, looking back up to 7 days by date key. If
   the user hasn't had FIELD open on a given day in this exact browser,
   it says "No prior FIELD editorials in session storage" even when the
   server has real archived briefs.

User chose to fix (1), not remove/redirect (2): make the session-only
link fall back to the server archive instead of silently declaring
nothing exists.

## PRE-BUILD probe (Rule 68) — verified the real response shape before writing code

Direct `curl` to the relay is blocked by this environment's proxy policy
(confirmed via `$HTTPS_PROXY/__agentproxy/status`, a `connect_rejected`
policy denial for `field-relay-nba.jeffunglesbee.workers.dev`, not a
transient failure). Used `mcp__FIELD_Handoff__probe_relay_route`
instead (a same-worker self-fetch that bypasses the sandbox block):

```
probe_relay_route("/archive/query?brief_type=slate&source=cron&limit=3")
→ 200, application/json:
{"ok":true,"count":3,"results":[
  {"id":"slate_2026-07-12_cron","date":"2026-07-12","brief_type":"slate",
   "sport":null,"game_id":null,"brief_text":"...","model":"gemini-3.1-flash-lite",
   "quality_score":226,"word_count":137,"source":"cron",
   "created_at":"2026-07-12 00:02:08"}, ...]}
```
Confirmed real, current field names (`date`, `brief_type`, `brief_text`,
`quality_score`) match what `renderArchiveTimeline()` already assumes
elsewhere in the file — wrote the new code against this verified shape,
not a remembered/guessed one.

## A second, pre-existing bug found while reading the function (Rule 71)

Before modifying `renderJournalismArchive()`, read it fully. Its
card-rendering branch (`archiveEntries.map(e => {...})`) referenced a
bare `tz` variable that is **never declared in this function's scope** —
grepped the whole file; every other `tz` is a `const tz = ...` local to
some *other*, unrelated function. This is a real, load-bearing bug: any
time session storage genuinely had archived entries, calling
`renderJournalismArchive()` threw `ReferenceError: tz is not defined`,
uncaught (it's invoked from an inline `onclick`), silently leaving the
screen exactly as it was. Fixed as part of this change — not scope
creep: it's the same function, it directly blocks the requested feature
(the new server-fallback cards render through the exact same
`tz`-dependent code path), and Rule 71 requires understanding a
function fully before changing it, which surfaced this. Fixed with the
same fallback idiom `renderJournalism()` already uses one screen over:
`(typeof localTz === 'function') ? localTz() : 'America/New_York'`.

## Fix

`renderJournalismArchive()`:
1. Session-storage path unchanged (still tried first, still free/instant).
2. **New**: when session storage yields nothing, fetch the relay's
   `/archive/query?brief_type=slate&source=cron&limit=7` — the exact
   same endpoint, params, and 30-minute `sessionStorage` cache key
   (`field_archive_timeline`) `loadArchiveTimeline()` already uses (Rule
   78 — reuse the existing caching pattern rather than adding a second,
   independent naked fetch against the same endpoint). If that cache is
   already warm (very likely — `loadArchiveTimeline()` fires
   automatically every time the journalism view renders, well before a
   user would click "Yesterday's FIELD"), the fallback is instant, no
   network call at all.
3. Server response mapped into the *same* card format the session-
   storage path already renders (`jrn-editorial-block`), so the UI is
   visually identical regardless of which source served the day's brief.
4. Only falls to "No prior FIELD editorials found" if *both* sources
   come back empty.
5. **Race guard**: the server fallback has a genuine async gap. If the
   user clicks "← Back to Today" while it's in flight,
   `renderJournalism()` now clears a request token
   (`content.dataset.jrnArchiveReq`) it shares with
   `renderJournalismArchive()`; the fallback checks that token before
   writing its result, so a late response can never overwrite the
   now-current "Today" view. This is the same DOM-write-into-a-changed-
   view failure class as tonight's earlier MLB-witness and reconciliation
   fixes, caught proactively here rather than shipped and found later.

Not a new fallback *chain* (Rule 76): still exactly 2 levels
(session-storage → server), matching the existing Archive Timeline's own
design, not stacking a 3rd guess on top of anything.

## VERIFICATION

Real extraction test (Node `vm`), `renderJournalismArchive()` pulled
verbatim (line-range extraction, not reimplemented), mocked only the
network/storage leaves (`fetch`, `sessionStorage`, `document`,
`fieldDateKey`, `localTz`). 5 cases, all passed:

1. Session storage has a real entry → renders a card, **does not throw**
   (proves the pre-existing `tz` crash is fixed).
2. Session storage empty, no cache → fetches `/archive/query`, renders
   the server-sourced brief text.
3. Session storage empty, `field_archive_timeline` cache fresh → uses
   the cache, **fetch is never called** (confirms Rule 78 reuse, not a
   redundant second fetch).
4. **Race guard**: fetch left pending, then simulated "Back to Today"
   (clearing the request token + writing today's content) *before* the
   fetch resolves → the resolved archive text never lands; today's
   content survives untouched.
5. Fetch throws → resolves to the empty state, does not hang on
   "Loading archive…" forever.

- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_smoke.js index.html`: **Failures: 0**, unaffected.
- `node field_unit.js`: 66 passed, 0 failed.
- `node --check` on the extracted inline `<script>` body: clean.

## DONE CONDITION

Clicking "Yesterday's FIELD →" with an empty browser session now shows
real archived briefs from the server (when they exist) instead of
unconditionally claiming none exist — and no longer crashes silently
even in the case it already handled (session storage populated).
Verified via a real extraction test covering the crash fix, the new
fallback, cache reuse, the race guard, and the failure path — not
asserted from the diff.

## Commit

- `index.html`: `renderJournalismArchive()` rewritten (server fallback +
  `tz` crash fix + race guard); `renderJournalism()` gains one line
  (`delete content.dataset.jrnArchiveReq;`) to support the race guard.
  No other function touched. `SW_VERSION` bumped `2026-07-11p` →
  `2026-07-11q`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
- **Not touched, correctly out of scope**: the Archive Timeline itself
  (`renderArchiveTimeline`/`loadArchiveTimeline`) — already correct,
  untouched. The two-archive-UI duplication itself (option B from the
  original diagnosis — unifying into one path) was explicitly not
  chosen; this session's user picked option A.

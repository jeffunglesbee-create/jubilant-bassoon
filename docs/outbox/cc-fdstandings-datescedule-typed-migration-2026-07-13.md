# CC Session Outbox — fdFetchStandings + fetchDateSchedule (queue Bucket A #10, #11, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list. Two
smaller entries combined into one commit — both are small, independently
tested, mechanically similar continuations of the same queue sweep.

## Entry #10 — `fdFetchStandings`

**Investigated the queue's "add a slashGolfFetch-style 429 backoff"
suggestion before building it, per novel-thinking discipline (don't
mechanically implement a suggested fix without checking it actually
fits).** `fdFetchStandings` has exactly 1 real caller (`toggleStandings`,
triggered by a user clicking a "Standings" button — not a poll loop), and
`fdStandingsCache` already prevents repeat fetches for the same
competition within a session. The "hammering a 10 req/min free-tier
limit" risk a dedicated backoff system exists to prevent is real for
functions polled on an interval, but much lower for a user-click-
triggered, already-cached call. Building that machinery here would have
been over-engineering relative to the actual risk profile.

**What was real:** the catch block had zero persistent telemetry — only
a `FIELD_DEBUG`-gated `console.warn`. Added `captureFieldError('standings:fd', ...)`,
matching the established pattern from this session's other fixes. No
return-contract change, no caller updates.

## Entry #11 — `fetchDateSchedule`

Confirmed real via direct read of the sole caller (`goToDate`): a bare
`sections === null` check showed the identical "⚠️ Couldn't load
schedule... Check the browser console for details... Retry" message
whether the AI daily-usage budget was exhausted (`canUseAPI()` returned
false — retrying is futile until the counter resets tomorrow) or a
genuine transient HTTP/JSON failure occurred (retrying might actually
work). The Retry button shown for the budget case would fail again
immediately for the identical reason.

Migrated the return contract from `array|null` to `{ok:true,sections}` /
`{ok:false,reason}` across all 4 return sites (cache hit, budget guard,
empty-schedule success, full success) plus the catch. The caller's ESPN-
first branch (`fetchESPNFixturesForDate`, a separate, not-yet-migrated
queue entry) was wrapped in the same `{ok:true,sections}` shape so both
paths route through one differentiated check.

**New user-facing copy was required here** (unlike entry #8,
`fetchFIELDBriefFromClaude`, which had a pre-existing static fallback to
simply leave alone) — there's no existing safe default to preserve once
the loading spinner is showing. Wrote the budget-exhausted message in the
app's existing calm/informational tone (matching the "no major events"
empty-state pattern: 📅 icon, muted copy, no urgent button) rather than
the alarming ⚠️ style — budget exhaustion is a normal resource state, not
a broken one. No Retry button for this case, since retrying cannot
succeed until the daily counter resets. The genuine-failure path shows
the exact same message and Retry button as before this migration,
unchanged.

## Real verification (Node `vm`, functions extracted verbatim)

**`fetchDateSchedule` (4 scenarios):**

| Scenario | Result |
|---|---|
| Budget exhausted | `{ok:false, reason:'budget-exhausted'}` |
| HTTP failure | `{ok:false, reason:'error', message:'HTTP 500: server error'}` |
| Genuine success, no games | `{ok:true, sections:[]}` |
| Genuine success, real games | `{ok:true, sections:[{sport:'NBA',games:[...]}]}` |

**Caller routing (4 scenarios):** confirmed budget-exhausted routes to
the new calm no-retry message, genuine error routes to the existing
alarm-with-retry message, empty sections routes to "no major events",
and populated sections routes to rendering the schedule — all against the
actual routing logic in the live file.

All 8 assertions passed.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: `fdFetchStandings` gains `captureFieldError` telemetry;
  `fetchDateSchedule` migrated to a tagged result, sole caller updated
  with new (calm-tone) budget-exhausted copy and unchanged genuine-error
  copy. `SW_VERSION` bumped `2026-07-12p` → `2026-07-12q`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: entries #10 and #11 marked ✅ MIGRATED.
- This manifest.

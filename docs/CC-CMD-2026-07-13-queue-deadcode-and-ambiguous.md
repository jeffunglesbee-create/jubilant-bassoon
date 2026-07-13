# CORRECTION — READ THIS FIRST, before TASK 1

Chat researched chat/Drive history for all 7 "dead" functions before this
executes, per explicit instruction. One of the 7 is wrong to remove.

**`fetchBDLRecentForm` is NOT dead code — pull it from TASK 1's removal
list entirely.** Real documented history: it's "Layer 2" of a deliberate
3-layer BDL momentum integration, built as foundational groundwork with
its own comment stating it's "not yet wired to the compound prompt, built
as the foundation." The layer above it ("Layer 3 — team recent record")
was explicitly noted as requiring counsel review before any user-visible
Momentum display ships. This reads as staged work waiting on a legal
gate, not orphaned code — deleting it risks erasing real, deliberately-
staged work mid-review, not cleaning up debt.

**New TASK 1b (do this instead, for fetchBDLRecentForm only):** Check
whether a "Momentum" feature (7-axis framework, individual-player
momentum dimension) has since shipped anywhere in the app — search for
`Momentum`, `momentum`, or any caller that might have been added since.
If found: wire `fetchBDLRecentForm` in the same way (a real caller,
tested). If not found and no evidence the counsel-review gate resolved
either way: leave the function exactly as-is, untouched, and note in the
outbox that this is deliberately deferred pending a real product/legal
decision, not a code-quality gap — do not delete it, do not wire it
unprompted.

The other 6 removal targets are unaffected by this correction — re-verify
each fresh via TASK 0 as originally specified, real research (not this
correction) confirmed 2 of them (`fetchESPNPlays`, `fdFetchLive`) are
genuinely, safely dead for real, understood reasons (ESPN Pivot migration
made the former obsolete; the latter was superseded by a batched-fetch
refactor whose caller `fdPrefetchSoccerLive` is still live and scheduled
today, just via different internal code).

**Second correction, added after this one — a genuine chat-history find
this version missed, not a contradiction of it:** `_plEuroNote` is not
history-less. It computed European-qualification stakes prose
("Bournemouth 6th/EL by 2pts over Brighton 7th/UECL") for specific,
hardcoded EPL Final Day 2026 fixtures. Its callers were removed during
routine date-schedule rotation once that day passed — normal lifecycle
for date-pinned content, correctly safe to delete now, same as the
`fetchESPNPlays`/`fdFetchLive` cases above. But the underlying pattern
(turning live league-table position into stakes prose) worked and was
real, validated value at the time. Add one paragraph to the outbox (not
the code) documenting this pattern for a future session — computing
title/European/relegation stakes from table position generically, not
hardcoded to specific teams/dates, is worth rebuilding next time a
similar run-in situation approaches for any league. Knowledge
preservation, not a code change — delete the dead function itself as
planned.

That leaves only 3 with no rich chat/Drive history surfaced by either
correction pass: `predictNextOpenHour`, `fetchLastMeeting`,
`formatPitcher`. Proceed on TASK 0's fresh code-level re-verification
alone for those, as originally specified.

Everything below this point is the original spec, unchanged except for
the TASK 1 correction above.

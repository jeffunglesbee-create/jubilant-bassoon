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
today, just via different internal code). The remaining 4
(`predictNextOpenHour`, `fetchLastMeeting`, `formatPitcher`,
`_plEuroNote`) had no rich chat/Drive history surfaced — proceed on
TASK 0's fresh code-level re-verification alone for those, as originally
specified.

Everything below this point is the original spec, unchanged except for
the TASK 1 correction above.

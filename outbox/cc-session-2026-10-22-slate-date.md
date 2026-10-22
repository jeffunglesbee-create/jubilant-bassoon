# CC session — TODAY_ISO steps back a calendar day before 4am ET (2026-10-22)

The client half of review finding G2 in field-relay-nba
`docs/CC-CMD-2026-10-22-ambient-capture-coverage-gaps.md`. The relay half
(`getFieldDateKey`, field-relay-nba `86363b7`) deployed first (Rule 70).

**HEAD:** `3b8ae577` → `3e489fd5` (the fix) → this close-out · **Branch:** main · **Smoke:** 1056 passed,
0 failed (1055 before, plus A-SLATE-1) · **Units:** 70 passed, 0 failed ·
**SW_VERSION:** 2026-10-20a → 2026-10-22a

## What changed

- `window.TODAY_ISO` held the ET date until 4am ET by moving the instant back
  24 hours. The spring-forward day is 23 hours long, so from 00:00 to 00:59 EDT
  on the Monday after it (next: 2027-03-15T04:00-04:59Z) it named the Saturday.
  The relay now names the Sunday there, so without this the two would disagree
  for that hour.
- Now `fieldTodayIso(now)` takes the ET date, and before 4am ET steps back one
  calendar day. `window.TODAY_ISO = fieldTodayIso(new Date())`. Every other
  instant is unchanged.
- The function is duplicated verbatim in `field_utils.js` (the repo's
  convention, as for `isAmnestyState` and `scheduleForDate`).

## Verification

| check | result |
|---|---|
| `field_unit.js` `fieldTodayIso` | 9 instants, both DST changes, a year end, a leap day. With the old 24-hour body in `field_utils.js` it fails at 2027-03-15T04:30Z only |
| smoke A-SLATE-1 | pins the body and the assignment in index.html. A changed body fails it |
| deploy gate | run 39838828451 green; Cloudflare 19:19:56Z; its step "assert the LIVE site actually serves this deploy" passed. Smoke Test + Live Verify 39838828256 green |

## Integration state (Rule 65)

- **Contract:** none crosses the wire. The relay and the client each compute
  the slate date; they now agree at every instant.
- **Status:** VERIFIED by the unit table. The wrong hour cannot be observed
  live until 2027-03-15.

## Open items

None from this change. The relay's other items are filed there.

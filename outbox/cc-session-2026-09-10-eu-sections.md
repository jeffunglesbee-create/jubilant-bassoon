# EU sections — the gate was necessary, not sufficient — 2026-09-10

**CC-CMD:** `docs/CC-CMD-2026-09-10-eu-sections-not-injected.md`
**Status:** Tasks 0–4 complete. Done condition met on the live app.

## Done condition

`outbox/eu-season-gate-live-manifest-2026-09-10T16-04-36-634Z.json`, run 34499670849:

```
chips: ALL (32) · FREE · MLB (5) · AFL (1) · Tennis (16) · Golf (1) ·
       College Football (1) · NFL (1) · EFL L1 (1) · UCL (6)
observation: max 32, final 32, 30 samples over 60s, flat
allEightBound: true   anyStillHardcodedFalse: false   sw: 2026-09-09c
verdict: PASS — gate deployed AND a European chip is rendering
```

`UCL (6)` is the strongest single line in this write-up: it comes from a call
added in `3eb3305d`, which is the commit I spent four readings wrongly suspecting
of a regression.

An earlier run on the 2026-09-09 ET slate showed `La Liga (1) · Serie A (1) ·
Ligue 1 (1) · EFL Champ (4) · EFL L1 (1)` — so six of the thirteen wired
competitions have now been observed rendering on real fixtures.

## Commits

```
d86f43d1  seven European competitions had an open gate and no card mechanism
3eb3305d  UEFA sections wired, and a gate so no V2 key can ship without a creator
```

Deploys: `deploy-gate` 34427415769 (d86f43d1) and 34427911685 (3eb3305d), both
green, the second with the new card-path gate running inside it.

## Task 0 — what the probe found, and how it changed the plan

The CC-CMD named eight competitions. **Task 0 established the answer is seven,
then thirteen.** There are exactly two card-CREATING paths:

| path | members at HEAD |
|---|---|
| `SOCCER_LEAGUES` → `fetchSoccerFixtures` | `ger.1`, `eng.league_cup`, `eng.trophy` |
| `injectV2SportSection` | `cfb`, `nfl`, `wnba`, `mls` |

`fetchPLFixtures`, `fetchV2AllScores` and `fdPrefetchSoccerLive` only **overlay**
scores onto game objects that already exist. That distinction is the whole
defect, and `field.js`'s own `SOCCER_LEAGUES` comment states it and dates the
same systemic gap to 2026-08-02: *"with this array empty, Bundesliga (and every
other non-EPL top-5 league) had NO card-creation mechanism at all — a real,
systemic gap masked entirely by the May-Aug summer break."*

- **0.4** `mapV2ToESPN` stamps `_sport: fg.sport`, the relay's sport **key**, and
  `injectV2SportSection` filters `_sport === sportKey`. So the call matches
  rather than silently no-opping.
- **0.3** No other path exists. `ucl`/`europa`/`conference` rely on the same
  hardcoded-array pattern (`if(uclGames.length) sections.push(...)`) whose arrays
  are empty at HEAD.
- **Collision check** Every label matches its `SPORT_CHIP_LABELS` key *and* the
  hardcoded arrays' own `sections.push` label, so a repopulated `eplRaw` merges
  instead of duplicating — the guarantee MLS and WNBA already had.

**Bundesliga is deliberately NOT injected.** `ger.1` is already in
`SOCCER_LEAGUES`, re-added 2026-08-02 for this exact defect. A second creator
would merge on a lowercased `home|away` key built from two sources that name
clubs differently — ESPN says "1. FC Union Berlin" where V2 says "Union Berlin" —
and a merge-key miss produces a **duplicate** card, not a missing one. One
creator per competition.

## Naming

**UEFA Conference League** is the correct current usage — corrected by the queue
owner mid-build. The client label is right and stays. The relay's
`SOCCER_LEAGUE_LABELS` still carries the pre-rename `'UEFA Europa Conference
League'`. Recorded, not silently reconciled: that string is persisted into the
archive `sport` column, and the relay's own comment explains how a rename
fragments ids.

## The automation, which is the point

`scripts/check-v2-key-has-card-path.mjs`, in `deploy-gate`. Every
`FIELD_V2_SOURCES` key must have a card **creator** — an injection, a
`SOCCER_LEAGUES` entry, or a declared exemption that **names the creating
function**. Overlays do not count. 23 of 23 keys covered.

Static on purpose. This class of gap is invisible for months because it only
appears in season. A summer break is not a test strategy.

`eu-season-gate-live-probe.yml` also runs daily at 22:40 UTC — after European
evening kick-offs, before the ET date rolls — and reports NOT-TESTABLE-TODAY
rather than failing on days with no fixtures.

## Seven defects in my own instruments, and one bad call

Every one produced a false signal aimed at the product rather than the tool:

| # | read as | actually |
|---|---|---|
| 1 | a proxy 403 as a relay answer | sandbox egress denial; all eight "NOT SERVED" |
| 2 | a Sunday as a matchday | `efltwo` "unserved" while playing a 9-game slate the day before |
| 3 | `.filter-chip-skeleton` as the chip bar | zero chips of any kind read as a European rendering failure |
| 4 | a UTC game count vs an ET chip list | "no chip despite 1 game" against a correct app |
| 5 | `//` inside `'https://…'` stripped as a comment | swallowed the declaration; failed loudly |
| 6 | `eng.league_cup` truncated to `eng.league` | the EFL Cup entry vanished from a table I had already published |
| 7 | `UCL (6)` not matched as European | `europeanChipPresent: ['EFL']` on a run showing UCL |

**And the bad call.** Three readings of `sw=c` gave `ALL(31)`; one earlier
reading of `sw=b` gave `ALL(62)`. I reported a regression in my own commit,
retracted it on the grounds that Golf could not be mine, then un-retracted after
finding the 25-second wait had run first. A fourth reading of the *same* build
gave `ALL(74)` with four European chips. There was never a regression — the
slate simply varies with how much has arrived when the sample lands.

The stability test I added to catch that did not work: `31@4003ms` and
`74@4003ms` both reported "stable", because three identical one-second samples
happen easily while fetches are outstanding. Replaced with a 60-second
observation window taking the maximum, with the full series recorded. The run
above shows 30 flat samples — what a real stable reading looks like.

Three contradictory status reports on one question is the worst thing in this
session, and it was caused by trusting single samples from an instrument that had
already been wrong six times.

## Confidence

**96.** The done condition is met with a committed manifest and screenshot; the
card-path gate is measured at 23/23 and runs in the deploy gate; every label was
read from the relay or the client's own map rather than written from memory. The
deduction is that seven of the thirteen wired competitions have not yet been
observed rendering on a real fixture — they are out of season or idle today, and
the daily probe is what will observe them.

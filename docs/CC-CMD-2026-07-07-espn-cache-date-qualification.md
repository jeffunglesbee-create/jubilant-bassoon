# CC-CMD: Date-qualify the espnScores cache key — root fix, deliberately deferred

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Status: NOT for tonight.** This is a scoping document, not an
execution-ready CC-CMD. Do not dispatch this with an execution
one-liner until it's been reviewed and staged deliberately.

## WHY THIS EXISTS, SEPARATE FROM TONIGHT'S FIX

`CC-CMD-2026-07-07-pickem-stale-final-resolution-fix.md` (v2) fixes the
one resolution-triggering path that mattered urgently tonight, by
guarding the shared `findEspnEntry()` helper. It does not fix the
underlying reason this class of bug can exist at all: `espnScores` is
keyed by `${home}|${away}` — team names only, no date — so any two
games between the same teams on different days are structurally
indistinguishable as cache keys. Every consumer that reads this cache
inherits the risk, guarded or not, because the guard is a defense
applied *after* an ambiguous lookup, not a fix to the ambiguity itself.

**Confirmed scale, not estimated:** 74 total references to
`espnScores` across the file. At least a dozen independent read sites
do name-only matching (`injectDramaBadges`, `updatePinWidget`, halftime
detection, several others) beyond the two already addressed tonight.
Multiple write sites construct the same unqualified key format.

## WHY THIS IS GENUINELY HIGHER RISK THAN TONIGHT'S FIX

Changing the key format means every write site and every read site
must agree on the new format *simultaneously* — a partial migration
would silently desync (some code writing date-qualified keys, other
code still reading unqualified ones, producing cache misses that look
like missing data rather than a loud failure). This is not a "patch it
and verify" change; it's a coordinated rename touching dozens of call
sites, several of which are in hot, frequently-executed polling paths.

## PROPOSED SHAPE, FOR REVIEW BEFORE STAGING — NOT A COMMITTED DESIGN

- New key format: `${sport}|${league}|${date}|${home}|${away}` — date
  alone isn't sufficient. Team *nicknames* can collide across sports
  on the same day (e.g. a "Rangers" in NHL vs. MLB) if the key doesn't
  also carry sport/league; date-only closes the cross-day gap this
  session found but would leave a cross-sport gap open. `date` is the
  game's own scheduled date, not today's date, so a card's key stays
  stable regardless of when it's read.
- Staged migration, five steps rather than a single cutover:
  1. **Dual-write**: every write site writes both the old and new key,
     so nothing currently reading the old format breaks.
  2. **Preferred-read**: readers try the new key first, falling back
     to the old key *only* for display-safe paths — irreversible-write
     paths should not fall back at all once this stage begins; treat a
     missing new-format entry as absent, not as license to trust a
     possibly-stale old one.
  3. **Migrate all consumers to the central helper** (`findEspnEntry`,
     already the intended consolidation point) rather than leaving any
     inline `.find()`/keyed access in place.
  4. **Remove direct `espnScores.find(...)`/name-only scans** entirely
     — by this point every consumer should be going through the
     guarded helper.
  5. **Remove the old-key fallback** only once the app has verifiably
     survived a few real game slates on the new format alone.
- This should very likely be split into multiple smaller CC-CMDs by
  read-site grouping (display-only vs. resolution-adjacent vs.
  notification-triggering) rather than attempted as one large diff —
  the exact grouping needs its own review, not assumed here.

## WHAT WOULD NEED TO HAPPEN BEFORE THIS IS EXECUTION-READY

- A full, exhaustive enumeration of all 74 reference sites, each
  classified by read vs. write and by risk category (irreversible
  write, notification-triggering, pure display) — this doc identifies
  the problem and a handful of examples, it does not yet have that
  complete list.
- A decision on staging: how many separate CC-CMDs, in what order, with
  what verification gate between each.
- Explicit confirmation that `date` is reliably present and correctly
  formatted on every game object this cache handles across every sport
  — not assumed from the MLB-centric examples found tonight.

## DONE CONDITIONS FOR THIS DOCUMENT (NOT FOR EXECUTION)
- [ ] Reviewed and either approved for staging or revised
- [ ] Full 74-reference enumeration completed before any execution CC-CMD is written
- [ ] Staging plan (number/order/grouping of execution CC-CMDs) decided explicitly, not assumed

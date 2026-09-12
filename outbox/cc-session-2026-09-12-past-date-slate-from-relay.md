# CC session — past-date slate sourced from the relay

**Date:** 2026-09-12
**CC-CMD:** `docs/CC-CMD-2026-09-12-past-date-slate-from-relay.md` (Option B)
**Repos touched:** jubilant-bassoon only. The relay half required no change —
see "Relay half" below.
**HEAD progression:** `c43dba2c` → `d62e02dc` → `f4241be7` → `e721452d` → `678639c4`
**Smoke:** 1037 → 1049, 0 failed throughout
**Units:** 69 passed, 0 failed
**SW_VERSION:** `2026-09-12i` → `j` → `k` → `l`
**Deploy runs:** 956 (`d62e02dc`), 957 (`f4241be7`), 958 (`e721452d`) — all success

---

## The defect

Navigating to a past date rendered "No major events on Yesterday" for a day the
archive holds 24 rows for.

Measured, not inferred — the probe asks ESPN the same question the client asks,
from the live page in CI (sandbox egress to `site.api.espn.com` is blocked):

```
espn_mlb_probe: { status: 200, events: 0 }
archive_rows_for_claimed_empty_date: 24
```

So the client was reporting its input faithfully. ESPN's scoreboard answers
HTTP 200 with an empty `events` array for a past date. The date sweep
(`fetchESPNFixturesForDate`) had nothing to hand back, and `goToDate` reached
its `!sections.length` branch correctly.

The relay serves the same day:

```
GET /v2/games?sport=mlb&date=2026-09-11  ->  15 games, source "espn-wc"
```

Same ESPN data, fetched server-side, through a route this client already calls
on every poll cycle.

## Relay half (Rule 70)

**No change required.** Task R1 of the CC-CMD re-verified the route against the
live worker before any client code was written: `/v2/games?sport=mlb&date=2026-09-11`
returns 15 games with `source: "espn-wc"`. The client half consumes the existing
contract as-is — no new endpoint, no new field, no client-side field mapping, so
no Rule 60/64 exposure and nothing to sync in CONTRACTS.md.

This is why Option B was chosen over `/context/date`: that route would have
required a `streams` mapping invented on the client, which is precisely the
band-aid Rule 64 names.

## What shipped

### `d62e02dc` — the feature

- **`V2_SECTION_LABEL`** — sport key → the section label the rest of the app
  renders and filters on. Extracted so a second caller cannot drift from the
  injector's strings.
- **`_v2SectionGame({...})`** — one game object, built identically whether it
  came from the live V2 poll or a dated fetch. Sets **no `streams` key**,
  matching the fourteen sections injected that way today.
- **`fetchRelayDateSections(iso)`** — fans out over enabled `FIELD_V2_SOURCES`
  via the existing `fetchV2Games`, drops empty sports, returns `null` when every
  sport is empty so the caller's no-events branch still owns that state.
- **Wiring** — `iso < TODAY_ISO` sources from the relay; today and future keep
  the ESPN sweep unchanged.
- `A-DATENAV-4` asserts the past-date branch reads the relay.

### `f4241be7` — three enabled sports would have vanished

`V2_SECTION_LABEL` was built from the `injectV2SportSection()` call sites. That
set is a **subset** of `FIELD_V2_SOURCES`, which is what `fetchRelayDateSections`
actually iterates. `afl`, `bundesliga` and `wc26` had no entry, and all three are
enabled today (`afl` unconditionally; `bundesliga` via `_euSeasonActive()`;
`wc26` since 2026-06-11). All three would have taken the no-label branch and
disappeared from every past-date slate.

Labels probed from where those sections are really pushed:

| key | label | source |
|---|---|---|
| `afl` | `Australian Football (AFL)` | `field.js:9343` `sections.push` |
| `bundesliga` | `Bundesliga` | `FETCH_LEAGUES` `ger.1` |
| `wc26` | `FIFA World Cup 2026` | the FIFA injection block |

**This is a Rule 91 failure committed inside the check written to prevent it.**
`check-v2-section-labels.mjs` reported `PASS` with a coverage line — against the
wrong denominator. It now checks both directions and prints both.

A second parse trap in the same script: the comment `// Date coverage:` inside
`FIELD_V2_SOURCES` parsed as a key named `coverage`, producing one false
`UNLABELLED`. The existing guard only caught parsing too *few* keys; this trap
produces too *many*. Comments are stripped before the key match.

### `e721452d` — one failing sport blanked the whole slate

`fetchRelayDateSections` used `Promise.all`. `fetchV2Games` catches everything
and returns `[]` today, so no rejection is reachable through it right now — but
`Promise.all` made that a load-bearing property of a function this one does not
own, and one rejection would have rejected the whole call, thrown out of
`goToDate`'s await, and left the slate empty for every sport at once.

Not reasoned — measured. Assertion 2b read `got undefined` against the
`Promise.all` version before the change:

```
  FAIL  2a one rejecting sport does not reject the whole call — relay 503
  FAIL  2b the other two sports still render — got undefined
  FAIL  2c the failure is reported, not swallowed — []
```

`allSettled`, with rejected keys captured by name.

New **`scripts/check-relay-date-sections.mjs`**, wired into deploy-gate. `smoke.js`
is structural: it can see the function exists and that `goToDate` calls it, and
cannot see what it *returns*. Every property here is about the return value, so
it extracts `V2_SECTION_LABEL`, `_v2SectionGame` and `fetchRelayDateSections`
from `field.js` and runs them against stubs — reading the source, not a copy.
The extraction asserts it matched **exactly one** of each declaration before any
assertion runs, so a pattern that stops matching fails loudly instead of passing
vacuously.

Four properties, 11 assertions. Its printed result states what it does NOT
cover: the relay fetch is stubbed, so it proves nothing about whether any real
date has data.

### `678639c4` — the mutation harness

Rule 90: both checks had only ever passed, and "passes" looks exactly like
"cannot match the code it is aimed at."

| mutation | caught by |
|---|---|
| M1 `V2_SECTION_LABEL` loses `afl` | `check-v2-section-labels` on `UNLABELLED afl` |
| M2 `allSettled` reverts to `all` | `check-relay-date-sections` 2b |
| M3 empty day returns `[]` not `null` | `check-relay-date-sections` 3a |
| M4 the no-label guard is removed | `check-relay-date-sections` 4b |

All four caught, each on the **specific assertion named** — not merely on a
non-zero exit, which a check passing for the wrong reason would also give.

The harness's own failure mode is one this project has already produced:
reporting `NOT CAUGHT` while nothing was mutated. Before any verdict each
mutation asserts its anchor occurs exactly once, and that the replacement is
present in `field.js` AND in `index.html` after sync. Both guard paths are
self-tested — an absent anchor (0 hits) and a non-unique one (7251 hits) both
report `NOTHING WAS MUTATED — this is a harness defect, not a result`:

```
  ANCHOR  SELFTEST-A anchor that does not exist (0 hits)
          anchor occurs 0 time(s), expected exactly 1. NOTHING WAS MUTATED …
  ANCHOR  SELFTEST-B anchor that is not unique (many hits)
          anchor occurs 7251 time(s), expected exactly 1. NOTHING WAS MUTATED …
```

Restore is `git checkout --`, never a `cp` of a pre-read copy: a `cp` leaves
`index.html` diverged from its last commit, `sync-source`'s guard then blocks,
and the check reads a stale artifact — exactly how an earlier run in this
project produced a meaningless `NOT CAUGHT`.

## Known inconsistency, filed not quietly picked

`FETCH_LEAGUES` labels college football `'CFB'` / `'NCAA Football'` while the V2
injector uses `'College Football'`. The map follows the V2 injector because it
**is** the V2 path. Not resolved here — resolving it means touching the ESPN
sweep's own section labels, which is outside this CC-CMD's scope and would be an
unprompted rewrite (Rule 69).

## Verified vs STAGED

| item | status |
|---|---|
| relay serves past dates | VERIFIED — 15 games, `source: "espn-wc"`, re-probed at Task R1 |
| the four return-value properties | VERIFIED — 11 assertions, 4 mutations |
| every V2 sport key has a label | VERIFIED — both directions, in deploy-gate |
| the live past-date slate renders cards | see done condition below |

## Done condition

A committed probe manifest where stepping back one day gives `cards > 0` AND
`failure_kind: null`. The prior red was `failure_kind: "no-events"` with
`archive_rows_for_claimed_empty_date: 24`.

`odds-line-probe.yml` run 24 (`workflow_dispatch`, `step_back_days: 1`) against
SW `2026-09-12l`. Manifest: `outbox/odds-line-probe-manifest-20260912T190808Z.json`
(commit `5051c464`).

```
sw_version        = "2026-09-12l"
triggered_by      = "workflow_dispatch"
stepped_back_days = 1
slate_by_step     = [ {step 0, "Today",     cards 45},
                      {step 1, "Yesterday", cards 26} ]
slate_settle_series = step 1 "Yesterday": 26 cards at 5s, 10s, 15s, 20s
page_errors       = []

date_nav_check    = { label: "Thu, Sep 10", cards: 14, empty_note: null,
                      loading_wraps: 0, loading_wrap_in_main: 0,
                      main_children: [ section#field-newspaper,
                                       div.sport-section x4 ],
                      rejections: [], failure_kind: null, ok: true }
```

**MET.** `cards: 14 > 0` and `failure_kind: null`. The prior red —
`failure_kind: "no-events"` with `archive_rows_for_claimed_empty_date: 24` — is
the exact assertion that flipped, and it runs on every probe invocation.

Two past dates are covered, not one, because `date_nav_check` clicks `#date-prev`
once more on top of `STEP_BACK_DAYS`: Sep 11 rendered 26 cards (stable across all
four settle samples) and Sep 10 rendered 14. Four `div.sport-section` children in
`main` — multiple sports, not one lucky league. Zero page errors, zero unhandled
rejections.

The composition of `STEP_BACK_DAYS` with `date_nav_check`'s own click is now
documented in `odds_line_probe.js`; the two fields legitimately name different
dates and a reader comparing them would otherwise read it as a bug.

## Carry-forwards

None from this CC-CMD. `CC-CMD-2026-09-12-no-events-is-false` remains open as
the parent: this closes the past-date half of it, and its Task 0/1 findings
(`espn_mlb_probe: {status: 200, events: 0}`) are what selected Option B.

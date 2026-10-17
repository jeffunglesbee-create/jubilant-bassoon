# Claude Code Command — the six original BDB files must carry their season

**Branch:** main — commit directly, do not create a feature branch or PR
**Repo:** jubilant-bassoon
**Confidence gate:** >= 95 before any commit
**Filed:** 2026-10-16 by chat
**Status:** BLOCKED 2026-10-17 — Task 0 done, owner decision needed before Task 1. Report: `outbox/cc-session-2026-10-17-bdb-vintage-task0.md`.
**Related:** codex `incident-2026-10-15-bdb-tables-2022-season-served-as-2026`, OPEN.

## The state, measured 2026-10-15/16

```
bdb_route_entropy        season: 2022   targetYear: 2026
bdb_separation           season: 2022   targetYear: 2026
bdb_speed                season: 2022   targetYear: 2026
bdb_time_to_throw        season: 2022   targetYear: 2026
bdb_xblock_pass_rush     season: 2022   targetYear: 2026
bdb_tendency_fingerprint season: 2022   targetYear: 2026
ngs-passing              season: 2026   targetYear: 2026
```

Source: `kaggle alexandermeau/nfl-big-data-bowl-archived-data-2025`.

The values are well-formed, correctly named, plausible in magnitude, and four
years stale. **`bdb_separation` and `bdb_route_entropy` already have live
client consumers.**

The two vintages **collide on field names**: `bdb_time_to_throw` (2022) and
`ngs-passing` (2026) both carry `avgTimeToThrow`. Joining or comparing them
mixes seasons silently, with no error and a plausible result.

The new `bdb_event_frames.json` carries `season` and `sourceDataset` and omits
`targetYear`. **The six it sits beside on the same route do not.** A consumer
cannot tell from the payload which kind it is holding.

---

## TASK 0 — a decision, not a build step (blocking)

**Is 2022 a knowing proxy, or unnoticed staleness?**

The `targetYear` field suggests someone thought about the mapping. That is not
the same as consumers knowing. The relay's own access probe
(`field-relay-nba outbox/bdb-access-probe-20260815T143125Z.log`) records
`nflverse-releases-tracking: HTTP 404` — **nflverse publishes no tracking
release**, so Kaggle's archive may be the only BDB data that exists to serve.

The two readings have different fixes and **only the owner can choose**:

- **Knowing proxy** → label it loudly and keep serving it. Honest.
- **Unnoticed staleness** → the files should not be served as they are, and
  labelling them would be covering it rather than fixing it.

**Do not pick one and proceed.** Report the evidence and stop. This is the
whole reason Task 0 exists.

Also measure first, and report:

1. **Every consumer of each of the six**, in all four repos, by file and line.
   The 2026-08-15 allow-list cleanup removed five files that "had NO builder
   and NO client consumer." Establish which of these six actually have one;
   `bdb_separation` and `bdb_route_entropy` are known to, the other four are
   **not established**.
2. Whether any consumer **joins or compares** a BDB value with an NGS value.
   `avgTimeToThrow` exists in both at different seasons; a join is a live
   defect, not a labelling question.
3. Whether the builder can produce a current season at all, or whether 2022 is
   the only thing obtainable. That answers Task 0's question more directly than
   any reasoning about intent.

**Stop condition:** report and stop before changing any envelope.

## TASK 1 — the envelopes (gated on Task 0)

Each of the six carries `season` and `sourceDataset` as **mandatory,
non-omittable** fields, matching `bdb_event_frames.json`.

**`targetYear` is removed, not supplemented.** It is the field that made the
staleness invisible, and a consumer reading it as the data's season is the
defect itself rather than a misuse. Removing it is a **breaking change** for
anything reading it — Task 0's consumer census is what makes that safe, and
any consumer that reads it must be fixed in the same change.

## TASK 2 — the consumers

Client consumers are JavaScript, so there is no `Tracked<'T>` to lean on. The
requirement is the same in substance: **a consumer must not render a BDB value
in a context labelled with a different season.** Where it does, it either shows
the data's own season or does not render.

`field-laboratory`'s `src/Vintage.fs` is the typed version of this and is the
model to follow — `Archive`/`Current` private cases, decode fails on a missing
season, render takes the display season and refuses a mismatch. Routing these
six through it is a **separate CC-CMD in that repo**, and the laboratory's
`CC-CMD-2026-10-15-bdb-frame-types.md` already scopes the retrofit as the
obvious next step. Do not attempt it from here; one session, one repo guard.

## TASK 3 — make it fail on purpose

- An envelope with no `season` → the builder exits non-zero, nothing uploaded.
- A consumer handed a 2022 value in a 2026 context → it refuses or labels; it
  does not render silently.
- `targetYear` reintroduced anywhere → caught.

## Done conditions

- Task 0's three measurements reported, with the owner's decision recorded
  before any envelope changed.
- All six envelopes carry `season` and `sourceDataset`, none carries
  `targetYear`.
- Every consumer found in Task 0 is either fixed or recorded as unaffected,
  by name. "No consumers affected" without the census is the claim this whole
  command exists because of.
- `outbox/cc-session-2026-10-16-bdb-vintage-retrofit.md` is the last task
  (Rule 87), named in `HANDOFF.md` (Rule 67).

## Constraints

- Do not change what the six files **measure** in this command. Vintage only.
- Do not re-point the builder at a different dataset without the owner's
  decision from Task 0 — that is a data change wearing a labelling change's
  clothes.

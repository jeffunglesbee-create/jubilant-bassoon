# Impact analysis — extend the schedule beyond the current day

**Date:** 2026-09-04
**Repo:** jubilant-bassoon
**HEAD at analysis:** `da340596`
**Rule 13** (impact analysis before TYPE B/C), **Rule 24** (execution path contracts),
**Rule 78** (rate-limited API guard), **Rule 39** (map dependencies, audit consumers,
write the diagnostic before any commit).

Written before any code. Nothing in this document has been implemented.

---

## 1. What the ask is, and what it is not

> "buildTodaySchedule should look further forward than the current day"

**The nav already goes forward.** `updateDateLabel` (`field.js:3053`):

```js
if(prev) prev.disabled = diff <= -7;  // max 7 days back
if(next) next.disabled = diff >= 3;   // max 3 days ahead
```

So a user can already reach +1, +2, +3. What they get there is a different,
thinner thing. This is not "add forward navigation" — it is **"make the forward
days as good as today."**

### The two paths, measured

`goToDate(iso)` (`field.js:5052`) branches three ways:

| branch | condition | what renders |
|---|---|---|
| A | `iso === TODAY_ISO` | `fetchSchedule()` → `buildTodaySchedule()` — hardcoded arrays + `field-data-today.json` + broadcast assignment + live pollers + drama + journalism |
| B | `buildDateSchedule(iso) !== null` | hardcoded per-date sections |
| C | otherwise | `fetchESPNFixturesForDate(iso)`, then `fetchDateSchedule(iso)` (AI, budgeted) |

**Branch B is dead.** `buildDateSchedule` (`field.js:3152`):

```js
const sched = {
  // Date entries cleaned May 25 2026 — all pre-May 18 entries unreachable (7-day nav limit)
  // Add new date entries here as needed for upcoming dates
};
if(!sched[iso]) return null;
```

The object is empty. It has returned `null` for every input since 2026-05-25.
Every non-today date falls to branch C. (This is also why
`scripts/rotate-schedule.js` reports "removed 0 date blocks" — there are none.)

So in practice there are two paths, not three: **today is rich, everything else
is bare ESPN fixtures.**

---

## 2. The single line that is the cliff

`field.js:8692`:

```js
const _useJsonMlb = _fieldDataCache?.schedules?.mlb?.length > 0 &&
                    _fieldDataCache._meta?.for_date === TODAY_ISO;
```

And a second, upstream, at `field.js:20594`:

```js
if (d._meta?.schema_version === '2.0' && d._meta?.for_date === TODAY_ISO && !d.error) {
  _fieldDataCache = d;
}
```

Two `===` where a window belongs. The second is the harder gate: it rejects the
**entire file** unless it is dated exactly today, so nothing downstream can see
a forward day even if the payload carried one.

This is the same shape as `mlbRaw.filter(g => isToday(g.start_time))`
(`field.js:8696`) — an equality standing in for a range.

---

## 3. What makes this cheap: the generator is already parameterised

`scripts/build-field-data.js:24`:

```js
const TODAY = process.env.TODAY || new Date().toISOString().slice(0, 10);
```

Every fetch inside it takes that date:

| line | call |
|---|---|
| 119 | `/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${espnDate}` |
| 311 | `(raw.gamesByDate \|\| []).filter(d => d.date === TODAY)` |
| 398 | `/api/v1/schedule?sportId=1&date=${TODAY}&…` |
| 474 | `/apis/site/v2/sports/soccer/${leagueSlug}/scoreboard?dates=${dateStr}` |
| 532 | `/v2/games?sport=wnba&date=${TODAY}` |

**Producing N days is a loop, not a rewrite.** No new data source, no relay
change, no new credential.

---

## 4. Consumer audit

### 4a. `_fieldDataCache` — every reader

| line | reader | reads | correct after change? |
|---|---|---|---|
| 1903 | declaration | — | rename comment only |
| 8688-8689 | `_mlbOverlayMap` build | `.game_overlays` | **needs a decision** — overlays are flat and unkeyed by date (§6) |
| 8692-8695 | `_useJsonMlb` / `_mlbSource` | `.schedules.mlb`, `._meta.for_date` | **must change** — window lookup keyed on `viewingISO` |
| 18693 | `_mlbFieldDataByKey` | `.schedules.mlb` | **must change** — same lookup |
| 20594-20595 | `fetchScheduleData` accept gate | `._meta.for_date` | **must change** — window containment, not equality |

Five readers, three must change, one needs a decision. No reader is outside
`field.js`.

### 4b. `buildTodaySchedule` — call chain (Rule 24)

Exactly one caller: `fetchSchedule()` at `field.js:20940`
(`const verified=buildTodaySchedule();`). `fetchSchedule()` is called from
`goToDate` (5066), a mid-boot retry (16404), and boot (41205 region).

**Frequency:** once per boot, once per return-to-today. Not a poll. Extending
it does not multiply any timer.

`fetchScheduleData()` runs "with 1500ms timeout before buildTodaySchedule"
(comment, 20579) — a single fetch of two JSON files, unchanged in count.

### 4c. The data file — every consumer, whole repo

| consumer | how |
|---|---|
| `field.js:20585` | `fetch(_SCHEDULE_BASE + 'field-data-today.json')` |
| `.github/workflows/field-data.yml` | writes and commits it |
| `scripts/build-field-data.js` | generates it |
| `smoke.js:408, 414` | comments only — no assertion reads the file |

`_SCHEDULE_BASE` is
`https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/`
(`field.js:20581`), so `outbox` being in `.assetsignore` is irrelevant — the
client fetches from GitHub raw, not from the Worker. **No CDN or Worker change
is implied.**

**No relay consumer. No cross-repo contract.** CONTRACTS.md (Rule 86) does not
govern this file; it is client↔GitHub-raw, not client↔relay.

### 4d. Size

`outbox/field-data-today.json` is **8,171 bytes** today (16 MLB games, all other
sports 0). A 4-day window is roughly 33 KB worst case in-season. Fetched
`cache:'no-store'` on every boot. Acceptable, and worth restating in the
manifest after the first real build rather than assuming.

---

## 5. Rule 78 — the cost line, and the decision it forces

`build-field-data.js:717` builds `noteTargets`:

```js
const noteTargets = [
  ...nhlGames.filter(g => g.isPlayoff || g.seriesRecord),
  ...nbaGames.filter(g => g.isPlayoff || g.seriesRecord),
  ...mlsGames,
  ...mlbGames.filter(g => g.nationalBundle && !g._postponed),
];
```

Then **one sequential Gemini call per target** (`callGemini`, line 595,
`gemini-3.1-flash-lite`, keyed by `GEMINI_KEY`).

A naive 4-day loop multiplies that spend by 4 and lengthens the job
proportionally — the exact shape of the June-16 Odds-API incident cited in
Rule 78.

**Decision: matchupNotes are generated for day 0 only.** Forward days carry
schedule, venue, broadcast assignment, series records — the deterministic,
free-to-fetch fields. A one-to-two-sentence AI note about a game three days out
is the lowest-value item in the payload and the only paid one.

Net API change: ESPN/statsapi calls ×4 (free, unauthenticated, no quota);
Gemini calls **×1, unchanged**.

---

## 6. The one genuine ambiguity: `game_overlays`

`game_overlays` is a flat array keyed by `_match_key` (`${home}|${away}`), read
at `field.js:8688`. It carries `seriesRecord` and `matchupNote`.

Two teams can meet on more than one day inside a 4-day window (a three-game
series is the normal case in MLB). A flat `home|away` key **collides across
days**.

Since §5 restricts notes to day 0, the safe reading is: `game_overlays` stays
day-0-only and keeps its current shape, and the forward days simply have no
overlays. That is a real limitation, stated rather than hidden: **a +1..+3 card
will show schedule and broadcast, not a matchupNote.**

Widening overlays to be date-keyed is a separate change with its own key-shape
migration. It is not required for the forward window and is **out of scope**.
Per Rule 87 #4, if that is wanted it needs its own CC-CMD before this one closes.

---

## 7. Proposed shape

### Payload (`build-field-data.js`)

Add `schedules_by_date`, keep `schedules` untouched:

```jsonc
{
  "_meta": {
    "schema_version": "2.1",
    "for_date": "2026-09-04",          // unchanged — day 0
    "window_dates": ["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07"],
    "notes_for_dates": ["2026-09-04"]  // honest: which days carry matchupNotes
  },
  "schedules": { "mlb": [...] },        // unchanged — day 0, back-compat
  "schedules_by_date": {
    "2026-09-04": { "mlb": [...], "nhl": [...], ... },
    "2026-09-05": { ... }
  },
  "game_overlays": [ ... ]              // unchanged — day 0 only (§6)
}
```

`schedules` staying is deliberate: an old cached client keeps working against
day 0 while the new field is ignored. Schema bumps to 2.1; the accept gate at
20594 must therefore admit **2.0 or 2.1**, or a stale client rejects the file
outright.

### Client

1. `fetchScheduleData` (20594): accept when `for_date` is day 0 **or**
   `window_dates` contains `TODAY_ISO`. Containment, not equality.
2. `_useJsonMlb` / `_mlbSource` (8692): read
   `schedules_by_date[viewingISO] ?? schedules` — one lookup, two levels of
   fallback, within Rule 76's cap.
3. `_mlbFieldDataByKey` (18693): same lookup.
4. `mlbRaw.filter(g => isToday(...))` (8696): window filter over the same range.
5. `goToDate` (5052): try the JSON window **before** `fetchESPNFixturesForDate`,
   so +1..+3 take the rich path and only +4 and beyond fall to ESPN.

### Window

**+3 days forward, 0 back.** It matches `next.disabled = diff >= 3` exactly.
This change does **not** widen the nav; that is a UI decision and nothing here
forces it. Backfill is not attempted — `prev` already reaches −7 and past days
are served by the archive, not by a schedule generator.

---

## 8. What this does to `mlbRaw`

All 48 entries in `mlbRaw` (`field.js:8599-8685`) are dated 2026-06-02 →
2026-06-10 — outside any forward window from today. Step 4 above replaces the
filter that made them dead, so emptying the array belongs to **this** change,
not to a separate cleanup, and not to `rotate-schedule.js`.

`field.js:18868` already states the intended resting state:

> "Adapter is PRIMARY source. mlbRaw is the OVERRIDE/EXCEPTION list… For
> all-local days, **mlbRaw = []** and adapter provides the full slate."

---

## 9. Rule 9 — is this a structural change needing separate approval?

**No layout paradigm changes.** No CSS, no `position`/`grid`/`flex` change, no
`#ambient-panel` touch, no body-level layout. The renderer, the card markup and
the section structure are untouched — only which day's rows reach them.

It **is** a change to the primary data path, which is why this analysis exists.

---

## 10. Risks, ranked

1. **Schema gate lockout.** Bumping to 2.1 without widening the accept gate
   makes every deployed client reject the file and fall back to `mlbRaw` — which
   is empty after §8. Mitigation: gate accepts 2.0 **and** 2.1; assert both in
   smoke before the first generator run ships.
2. **Job runtime and partial failure.** 4× the upstream fetches in one job. A
   day-2 fetch failing must not void days 0-1. Mitigation: build per-day
   independently; a failed day is absent from `window_dates`, not a failed run.
   `window_dates` is then the honest record of what was actually fetched.
3. **Forward days look emptier than users expect.** No matchupNote by design
   (§5, §6). Mitigation: state it in the manifest; do not fabricate notes.
4. **`_postponed` and broadcast assignment drift.** A game 3 days out can be
   rescheduled. The file regenerates daily at 07:30 UTC, so a forward day is at
   most ~24h stale — and becomes day 0, freshly fetched, before it is played.
5. **Dead payload already shipping.** `schedules.nhl/nba/soccer/wnba` are
   generated every day and **read by nothing** — the client reads only
   `schedules.mlb` (8692, 18693). Measured today: nhl 0, nba 0, mlb 16,
   soccer 0, wnba 0. Not caused by this change; noted because
   `schedules_by_date` would replicate it 4×. Wiring those sports to the client
   is a **separate** change (Rule 69) and must not hitchhike here.

---

## 11. Verification artifacts required (Rule 90)

Not "check that forward days work."

1. **Generator, enumerated:** run `TODAY=2026-09-04 node scripts/build-field-data.js`
   and assert `window_dates.length === 4`, `window_dates[0] === '2026-09-04'`,
   each subsequent entry exactly +1 day, and `notes_for_dates` **equals**
   `[window_dates[0]]`. Print the Gemini call count and assert it did not rise
   against a day-0-only baseline captured first.
2. **Client, enumerated pairs:** unit tests over the window predicate —
   `(day 0 → in)`, `(+3 → in)`, `(+4 → out)`, `(−1 → out)`, `(undefined → out)`,
   `('' → out)`. Mutation-prove it: widening the predicate to +4 must fail the
   block.
3. **Playwright, live deploy** (the `drama-arc-amnesty-probe.yml` pattern):
   navigate to today, click `date-next` three times, and commit a manifest with
   boolean fields per day — `richPathUsed`, `cardCount`, `usedEspnFallback`.
   Pass requires `richPathUsed: true` for +1..+3 and `cardCount > 0` on at least
   day 0. **All-false is a FAIL**, asserted in the script, not left to a reader.
4. **Smoke:** the accept gate admits 2.0 and 2.1; `mlbRaw` contains no entry
   outside the window.

---

## 12. Scope boundary

**In:** `scripts/build-field-data.js`, the five `field.js` sites in §7,
`mlbRaw` emptying, smoke assertions, the probe workflow.

**Out, each needing its own CC-CMD if wanted:** date-keyed `game_overlays`
(§6); wiring nhl/nba/soccer/wnba `schedules` to the client (§10.5); widening
the nav past +3; anything touching the 180 hardcoded `start_time` entries in
other sports' arrays outside `mlbRaw`.

---

## 13. Estimate

Generator loop 20 min · client sites 15 min · `mlbRaw` + smoke 15 min ·
probe workflow 20 min · run and verify 15 min. **~85 minutes**, up from the
55 I quoted before this analysis — the schema-gate back-compat (§10.1) and the
per-day failure isolation (§10.2) are real work that reading the code surfaced.

# CC session — slate size variance: the hypothesis was wrong and the answer is a defect

**Date:** 2026-09-12
**CC-CMD:** `docs/CC-CMD-2026-09-12-slate-size-variance.md` (CLOSED)
**Second CC-CMD filed:** `docs/CC-CMD-2026-09-12-v2-sections-never-injected.md` (OPEN)
**HEAD:** `ccec80a4` → `a6440d34`
**Smoke:** 1049 passed, 0 failed throughout. Units 69/0.
**SW_VERSION:** `2026-09-12l` → `m` → `n`. Deploy runs 959, 960 — both success.

---

## The question

The same page read 129 cards and then 45, 23 minutes apart, zero page errors on
both. The leading hypothesis was poll timing: CFB (80 rows) is injected at the
end of the V2 cycle, so a probe reading before that completes would see a slate
without it, and `45 + 80 = 125` is within one poll's churn of 128–129. Coherent,
and unverified.

## Tasks 0-2: what was built

**Task 0 — composition, not a total.** `slate_by_sport` (section label → card
count), `slate_sections_present` (every `.sport-section`, *including ones with
zero cards* — present-and-empty and absent are different states and the total
cannot tell them apart), `slate_read_at_ms`.

Plus the field-name trap the CC-CMD flagged: `slate_cards` means "cards on
whatever date the probe ended on", and six `STEP_BACK_DAYS=1` manifests reading
0 had been read as a 90-minute site outage. `slate_cards_date_label` and
`slate_cards_after_steps` now travel with the number.

**Task 1 — sample instead of guessing.** The probe waited a flat 12s and
reported whatever the page held. It now samples at 5s intervals and stops on a
criterion: three consecutive equal non-zero readings.

Three, not two — the V2 poll injects one sport at a time, so two equal readings
can straddle a gap between injections. Non-zero — a page that has rendered
nothing is trivially stable at 0, and a two-equal criterion would have declared
the blank past-date page settled.

`scripts/slate-settle.cjs` holds that criterion alone, required by the probe loop
AND by its test, so there is one definition. Deciding settledness inline as well
is the drift that put three enabled sports through a no-label branch earlier the
same day.

`scripts/check-slate-settle.mjs` — 12 enumerated series including the ones a
naive criterion gets wrong: `0,0,0`; a plateau of two mid-climb; the observed
`129,45,129,45`. Four mutations, all caught on their named case:

| mutation | caught by |
|---|---|
| two equal readings are enough | "two equal is NOT enough" |
| the non-zero guard is dropped | "a blank page is stable but not settled" |
| `equalRun` is never reset | "the 129-then-45 shape never settles" |
| `reached` is always true | "monotonic climb, never settles" |

**Task 2 — say which cycle was read.** A settled run prints the settle time and
the series; an unsettled one prints "slate NEVER SETTLED … the counts above are
MID-CYCLE, not final". `slate_settle_reached` carries it in the manifest.

Later, `SLATE_SETTLE_MIN_S`: three equal samples can land at 15s, and that is not
evidence about 40s — it is evidence that nobody looked at 40s. The floor makes
the observation window explicit rather than a side effect of how fast the
criterion converged.

## The hypothesis is disproved

Run 34715990062, `SLATE_SETTLE_MIN_S=60`, SW `2026-09-12l`:

```
series totals       [45 x 12]  — flat across sixty seconds
v2_games_by_sport   cfb 12, nfl 12, every soccer league 12
v2_games_dates      2026-09-12: 142, 2026-09-13: 138
slate_by_sport      MLB 15, Tennis 24, CFL 4, AFL 1, Golf 1
sections present    those five, no others
page_error_count    0
```

and `/v2/games?sport=cfb&date=2026-09-12` returns a full live NCAAF slate from
the relay right now. Asked for, answered, sixty seconds, never rendered.

## Three blind spots closed on the way to the answer

Each one was a place a failure could occur and leave no trace, and each had to
be closed before the next measurement meant anything.

**1. `window._fieldErrors` was never read.** `page.on('pageerror')` sees uncaught
throws; the init-script hook sees unhandled rejections. Neither sees a failure
the app caught on purpose — and `injectV2SportSection` wraps its whole body in
try/catch. Reading it showed 3 captured errors, none about cfb.

**2. The per-sport V2 poll catch swallowed silently** (`6639e5e4`):

```js
} catch(e) { if (FIELD_DEBUG) console.warn('[V2] poll error:', sport, queryDate, e.message); }
```

Any throw while mapping one sport's games loses that entire sport for that poll
with no trace: the fetch succeeded so the network census is clean, the throw is
caught so `pageerror` never fires, nothing reached `_fieldErrors`, and the only
witness was a `console.warn` behind a flag that is off in production. Now
`captureFieldError(\`v2-poll:${sport}\`, e, true)`, the convention every other
swallow in the file already uses.

With it live: **no `v2-poll:*` error fired.** The poll is not throwing.

**3. The `espnScores` census measured nothing, and said so.** First attempt
reported `espn_scores_by_sport: null`. That was honest — `null` means absent,
`{}` would have meant empty (Rule 99) — but `espnScores` is an IIFE-scope
binding at `field.js:15042` and was never on `window`, the same module-scope trap
this session already hit reaching field.js `let`s from esbuild-bundled modules.
Aliased the way `SW_VERSION` already is, which the Health Panel relies on.

## The answer

SW `2026-09-12n`, run 34716744089:

```
espn_scores_by_sport  { "(no _sport)": 44, mlb 15, cfb 80, mls 15, nfl 13,
                        eflchamp 11, efltwo 11, eflone 11, epl 9,
                        bundesliga 8, ligue1 8, laliga 8, seriea 6, afl 1 }
slate_by_sport        { MLB 15, Tennis 24, CFL 4, AFL 1, Golf 1 }
```

**The data is in `espnScores` with the correct `_sport`. The sections are not on
the page.** Eleven sports. Every section that did render comes from a different
builder — the ESPN sweep, CFL's own path, AFL's `sections.push` at the Squiggle
merge. Not one `injectV2SportSection` call produced a visible section.

The loss is its missing `else`:

```js
if (existing) { ...merge... }
else if (allData?.sports) { allData.sports.push({...}); }
// no else. allData.sports falsy: both skipped, nothing reported.
```

The `catch` only fires on a throw. A statement that does not execute is not a
throw, so the failure is invisible to all three instruments that read clean.

Same shape as the `v2-poll` swallow above and as `applyMainHTML`'s zero-change
fast path from earlier today: **a path that declines to act and says nothing.**
Rule 99 one level up — not a value collapsing with its absence, but an action
collapsing with its omission.

## Task 3 — done condition

Met by its first branch. Runs at 20:00, 20:05 and 20:09 read exactly 45 with
byte-identical `slate_by_sport`, 0% apart. The denominator stopped moving; what
it stopped at is a defect. Reporting a broken slate stably is the correct
outcome for a probe — it is what made the defect legible.

## Carried forward

Nothing loose. The cause is filed as
`CC-CMD-2026-09-12-v2-sections-never-injected.md` with its own Task 0 probe
(`allData.sports` shape and `_v2SectionInjected` state, both needing the same
window alias), an explicit instruction to give the no-op branch a voice
regardless of what Task 0 finds, three mutations, and a done condition: every
sport with entries in `espn_scores_by_sport` appears in `slate_by_sport` or is
named in `field_errors_by_fn`.

**Not claimed:** that the 129 readings came from this path working. Nobody has
measured a 129 reading with `espn_scores_by_sport` in the manifest, because the
field did not exist until today. The next run that reads 129 answers it, and the
probe now records what is needed either way.

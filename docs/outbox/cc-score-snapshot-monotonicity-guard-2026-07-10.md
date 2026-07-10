# Session Outbox — recordScoreSnapshot() Monotonicity Guard (follow-up to lead-differential-upper-bound)

**Date:** 2026-07-10
**Scope:** Not a CC-CMD dispatch — a direct follow-up in the same chat
session, requested after discussing the durability of the
lead-differential ceiling fix (`docs/outbox/cc-lead-differential-
upper-bound-2026-07-10.md`). That fix bounds `buildScoreNarrativeContext()`'s
*output* against a bad snapshot already in the log. This adds a
complementary *write-side* defense in `recordScoreSnapshot()` — the
sole path that writes to the log — to reduce how often a bad snapshot
gets there in the first place.

## Investigation (mid-turn, before implementation)

Traced `recordScoreSnapshot()`'s only real caller (`injectDramaBadges()`,
one call site) back to its data source: `card.dataset.gameid` → exact
match via `findGameById()` → `eData = findEspnEntry(game)`. Confirmed
this already routes through the canonical, previously-hardened matcher
(cited inline: `CC-CMD-2026-07-07-pickem-stale-final-resolution-fix
v6`), not a raw scan — so there was no separate, undiscovered
wrong-game-match bug feeding this path. The residual exposure is
exactly `findEspnEntry()`'s known fuzzy-matching risk, which only gets
the real-ID fast path for NBA/NHL/WC26 games touched by 3 narrow
builder functions — most sports (MLB included) always fall through to
fuzzy team-name matching, every poll, for the life of the game.

## Design — caught and fixed a real flaw before shipping

**First attempt (rejected after empirical testing, not assumed safe):**
compare each new snapshot's `homeScore`/`awayScore` against the log's
last entry; if either decreased, reject the write outright.

Ran this against the *exact* shape of the originally reported bug —
`[0-0, 1-0, 4-0 (bad spike), 2-0 (real final)]` — before committing to
it. The bad `4-0` spike is itself monotonic versus `1-0`, so the reject
check doesn't catch it on arrival; it gets written normally. Then the
real `2-0` final arrives and *looks like* a decrease relative to the
bad `4-0` — and gets rejected, permanently entrenching the bad value as
the log's last entry. Confirmed this empirically with the actual
extracted function before touching the design further — the reject
approach would have made the bug *worse*, not better, for its own
namesake scenario.

**Corrected design — repair, not reject:** when a new snapshot is lower
than the log's trailing entry in either team's score, pop the trailing
entry (and keep popping backward until the new value is consistent)
rather than rejecting the new value. Rationale: `findEspnEntry()`
re-resolves independently every poll, so a transient mismatch is
exactly as likely on an *earlier* poll as on this one — the newer read
isn't inherently less trustworthy, and this matches
`buildScoreNarrativeContext()`'s own existing philosophy ("the final
linescore is truth," i.e. the latest read already wins by design
elsewhere in this same feature).

```js
while (log.length && (homeScore < log[log.length - 1].h || awayScore < log[log.length - 1].a)) {
  const dropped = log.pop();
  if (FIELD_DEBUG) console.warn('[recordScoreSnapshot] dropped non-monotonic prior snapshot ...', gameId, dropped.h, dropped.a, homeScore, awayScore);
}
```

Checked per-team, not just on the combined total — a total that still
increases while one team's own score drops (e.g. `5,3` → `2,7`, total
8→9) is equally impossible and would slip past a total-only check.

## Verification — extracted-verbatim, 15/15 checks

**Re-ran the adversarial reject-design failure directly against the
corrected code first**, confirming the fix: the bad `4-0` spike is now
dropped, and the real `2-0` final survives as the log's last entry.

Full suite: (1) a genuinely clean monotonic sequence — untouched, no
false-positive drops; (2) the exact reported bug shape, reconstructed —
bad spike self-heals; (3) an immediate decrease on the very next poll —
healed on first contact; (4) the total-increases-but-one-team-drops
case a total-only check would miss — still caught; (5) regression on
the existing same-score dedup behavior — unaffected; (6) `FIELD_DEBUG=
false` — repair still applies, logging silenced; (7) end-to-end with
`buildScoreNarrativeContext()` — the *underlying log* is now clean, not
just the derived narrative output, so the read-side ceiling doesn't
even need to activate for this scenario anymore; (8) **the honest
boundary case** — if the bad spike is the literal last-ever-recorded
entry with no later correction (e.g. the game ends exactly on a
glitched poll), neither this repair *nor* the read-side ceiling can
recover the true score, since both treat the log's last entry as
"final." Confirmed this explicitly rather than glossing over it: the
narrative still reports the wrong lead in that specific residual case.

## What this does and doesn't guarantee — stated plainly

**Does:** eliminates the specific failure mode that produced the
originally reported bug (a transient mid-game bad snapshot later
corrected by a real poll) — the log self-heals instead of carrying the
bad value forward, and instead of relying on the read-side ceiling to
paper over it every time `buildScoreNarrativeContext()` runs, the data
itself gets fixed once.

**Doesn't:** protect against a wrong match that happens to stay
locally monotonic-consistent by coincidence, and cannot protect against
a bad snapshot that is never followed by a later, correcting poll for
that game (the read-side ceiling is the only remaining defense there,
and even it can't recover the true value if the log's last entry is
itself the corrupted one — a genuinely open gap, not fixed by either
change). Reducing this further would mean tracing whether
`recordScoreSnapshot()` ever runs once a card leaves `.espn-live`
(current read: it doesn't — `injectDramaBadges()` only queries live
cards) and whether a separate, already-hardened final-score source
(e.g. `saveEspnFinal()`) could backfill a trustworthy correction after
the fact. Not built here — flagged as a real, scoped follow-up if
wanted, not chased unprompted.

## Repo verification

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## Commit

- Bumps `SW_VERSION` `2026-07-10c` → `2026-07-10d`.
- `index.html`: `recordScoreSnapshot()` gains a monotonicity-repair
  loop with `FIELD_DEBUG`-gated logging.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.

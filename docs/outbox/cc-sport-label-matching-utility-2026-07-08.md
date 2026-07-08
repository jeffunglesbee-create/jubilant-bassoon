# Extract Sport-Label Matching Into a Reusable Utility — 2026-07-08

## What This Is — And Isn't

This is a refactor of already-proven code, not new logic. The substring-tolerant
sport-comparison inside `_bundleFinalizedAt()`'s `sportOk` closure
(`d12d2a24`, earlier today) is the second independent invention of the same
idea — `field-relay-nba`'s `resolveWinProbability()` needed `normalizeSportCode()`
for the identical reason (client `"Baseball (MLB)"` never matches a bare
`'mlb'`). This CC-CMD extracts the client-side version into a standalone,
named function so a third integration doesn't reinvent it again.

**Explicitly does not touch the relay side.** `field-relay-nba`'s
`normalizeSportCode()`/`SPORT_LABEL_MAP` are untouched — different repos,
different runtimes (Cloudflare Worker vs. static HTML client), no shared
module. Not attempted, not proposed.

## Probe Block

```bash
git show d12d2a24 -- index.html | grep -B5 -A20 "substring-tolerant"
```

Confirmed the exact commit message reasoning for the substring-tolerant
compare before extracting: "client MLB `_sport` (`"Baseball (MLB)"`) vs relay
sport (`"MLB"`) are different strings — uses a substring-tolerant compare."
The actual code (`index.html`, inside `_bundleFinalizedAt`) was located and
read in full before any edit — the `sportOk` closure at what was then
lines 6852-6856, capturing `spClient`/`spLeague` from the enclosing scope.

## What Was Built

### `_sportLabelMatches(clientSport, clientLeague, externalSport)`

Placed immediately before `_bundleFinalizedAt`, matching this file's existing
convention (helper functions defined just above their primary consumer, e.g.
`_gameSport`/`teamNick` immediately preceding `_bundleFinalizedAt` already).

```javascript
function _sportLabelMatches(clientSport, clientLeague, externalSport) {
  const bs = (externalSport || '').toLowerCase().trim();
  if (!bs) return true; // external entry carries no sport tag -- don't over-require
  const spClient = (clientSport || '').toLowerCase();
  const spLeague = (clientLeague || '').toLowerCase();
  return spClient.includes(bs) || bs.includes(spClient) || spLeague === bs || spLeague.includes(bs);
}
```

Takes three params, not the doc's illustrative two-param example
(`clientSport, externalSport`) — the original comparison genuinely needs
**two** independent client-side sport representations (`_gameSport(game)`
and `game.league`) compared against one external value, with deliberately
*different* comparison strictness per side (`clientSport` is fully
bidirectional-substring; `clientLeague` is exact-OR-one-directional-substring
only). Normalizing that asymmetry to "clean it up" would have changed
observable behavior — explicitly against this CC-CMD's own instruction to
extract, not reimplement. The three-param signature is the faithful
extraction; the doc's two-param example was illustrative shorthand, not a
literal requirement (the doc itself says "e.g.").

`_bundleFinalizedAt`'s `sportOk` closure is now a one-line wrapper:

```javascript
const sportOk = (bgSport) => _sportLabelMatches(spClient, spLeague, bgSport);
```

A doc comment at `_sportLabelMatches`'s definition explicitly frames it as
the canonical pattern: "The next integration that needs this should call
this instead of reinventing it a third time," and documents both real
sports it was already needed for (WC26/`"FIFA World Cup 2026"` matches
directly; MLB doesn't, needs the tolerant compare) plus the reasoning for
why the asymmetric `clientLeague` check was preserved exactly rather than
normalized.

## Verification

### Byte-for-byte behavior proven unchanged — same 7 real cases, re-run

Built a Node `vm`-based harness that extracts the actual committed function
source from `index.html` (brace-matched extraction by function name, not a
reimplementation) and runs the exact 7 cases documented in
`docs/outbox/cc-truth-is-night-stars-client-fix-2026-07-08.md`:

```
Baseline (pre-refactor, current committed index.html):
PASS  1. Real relay data (WNBA Liberty/Wings, ~634min) -> LATE
PASS  2. Recent completion (~46min), empty session map -> NIGHT
PASS  3. Doubleheader ambiguity -> falls back -> LATE
PASS  4. No bundle match, session-local recent -> NIGHT
PASS  5. No data anywhere -> LATE
PASS  6a. Live game (state=live) -> PRIME
PASS  6b. Upcoming game (status=pregame) -> PREVIEW
PASS  7. Out-of-window guard (recap_date mismatch) -> LATE
ALL 7 CASES PASS

After the extraction (identical harness, re-run against refactored index.html):
PASS  1-7 — all identical results, byte-for-byte
ALL 7 CASES PASS
```

Not re-reasoned about — the harness extracts the real `getCardCircadian` →
`isGameOver`/`minutesSinceFinal` → `_bundleFinalizedAt` →
`_sportLabelMatches` chain from source and executes it in a `vm` sandbox
with a controlled `Date`/`window`/`TODAY_ISO`/`_finalizedAt`, exactly the
same category of extraction technique the original `d12d2a24` verification
used.

### Standalone/reusable, not coupled to `_bundleFinalizedAt`'s scope

Extracted `_sportLabelMatches` alone (no other function in scope) and called
it directly:

```
MLB match: true          // ('baseball (mlb)', 'mlb', 'MLB')
WC26 match: true         // ('fifa world cup 2026', '', 'FIFA World Cup 2026')
No match: false          // ('nhl', 'nhl', 'MLB')
Empty external -> true: true   // ('nhl', 'nhl', '')
```

Confirms zero closure dependency on `_bundleFinalizedAt`'s locals — a future
caller can invoke it standalone with just the three explicit params.

### Smoke clean

```
node smoke.js index.html   → 890 passed, 0 failed
node field_unit.js         → 66 passed, 0 failed (unaffected — tests field_utils.js only)
node field_smoke.js index.html → 21 failed (pre-existing baseline, see below)
```

**On `field_smoke.js`'s 21 failures — diff-confirmed, not just documented.**
The pre-commit hook (`scripts/pre-commit`) wasn't wired up in this session's
fresh clone (`core.hooksPath` requires `npm install`'s `prepare` script,
which was never run here), so the commit went through without the hook's
automatic gate. Rather than rely on `d12d2a24`'s prior documentation that
these 21 failures are a pre-existing, unrelated baseline, ran `field_smoke.js`
against both the pre-refactor commit (`b17ea350`, via `git show`) and the
post-refactor working tree, and diffed the two failure lists directly:

```
diff fails_before.txt fails_after.txt
→ (empty diff — byte-for-byte identical)
```

All 21 failures (My Teams, Scout's Pick, Anti-Hype, Drama Arc, Broadcaster
Registry, `beatTheBook()`, etc.) are unrelated to `_bundleFinalizedAt`,
`_sportLabelMatches`, or anything touched by this refactor, and are
identical in both count and content before and after this change — zero
regression, confirmed by diff rather than assumed from the prior
session's documentation.

## Scope Discipline

Per the doc's explicit instruction: did not touch `field-relay-nba`'s
`normalizeSportCode()` (separate repo, separate runtime, not a small change,
not what was asked). Did not apply `_sportLabelMatches` to any call site
beyond `_bundleFinalizedAt` — no other current code in this file has this
bug; adding it elsewhere pre-emptively would be inventing work not
requested.

## Confidence Score

```
+35  Extraction correct, behavior proven unchanged via real re-run of the
     same 7 documented test cases (not re-reasoned about) against both
     pre- and post-refactor committed source
+30  Function genuinely standalone and reusable — confirmed via isolated
     extraction and direct calls with no other function in scope
+20  Comment at the function's definition explicitly documents this as
     the canonical pattern for future boundary crossings, references both
     real sports it was already needed for, and explains why the
     asymmetric clientLeague check was preserved rather than normalized
+15  Smoke clean (890/0 structural, 66/0 unit); outbox correctly scopes
     this as a refactor of proven code, explicitly not touching the
     relay side, explicitly not applied beyond the one existing call site
= 100/100
```

**Score: 100/100 — above 95 threshold.**

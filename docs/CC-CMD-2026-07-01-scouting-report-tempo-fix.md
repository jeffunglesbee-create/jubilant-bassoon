# Claude Code Command — Fix Tempo-Line Last-Name Bug in Scouting Report

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-scouting-report-tempo-fix-2026-07-01.md.

## CONTEXT

Found while shipping the pitch-arsenal line (CC-CMD-2026-07-01-
scouting-report-arsenal.md, commit 7970f5e): the adjacent, already-
shipped tempo line in `buildScoutingReport`'s `fmtP` has the identical
bug that arsenal was just fixed for. `getPitchTempo(pitcherLastName)`
is keyed by last-name-only (confirmed — its own parameter name says so,
and it does `PITCHER_TEMPO[pitcherLastName.toLowerCase()]`), but the
call site passes a full name:

```javascript
const tempo = getPitchTempo?.(p.name || p.lastName || '');
```

`p.name` (from `normalizeMLBPitcher`) is always a full name (e.g.
"Kevin Gausman"), never just "Gausman" — so `PITCHER_TEMPO["kevin
gausman"]` never matches `PITCHER_TEMPO["gausman"]`, and this line has
silently never rendered since it shipped. Same failure mode, same fix.

## PRE-BUILD PROBE (Rule 87)

```bash
grep -n "const fmtP = p =>" index.html
sed -n '/const fmtP = p => {/,/^      };/p' index.html
grep -n "function getPitchTempo" index.html
```

Confirm exact current line numbers and the exact current `fmtP` body
before editing — the arsenal fix that just landed changed this function,
re-read it fresh rather than assuming the shape from this CC-CMD's
description.

## TASK 1: Apply the same last-name extraction to the tempo lookup

```javascript
const pLast = (p.name || p.lastName || '').split(' ').pop();
const tempo = getPitchTempo?.(pLast);
const tempoStr = tempo ? ` · <em>${tempo.tempoClass}</em> tempo` : '';
```

If the arsenal fix (from the prior CC-CMD) already computes `pLast` for
its own lookup, reuse that single computed value for both `tempo` and
`arsenal` lookups rather than re-deriving it twice — check the current
function body in the probe step to see whether this is already possible
or requires reordering the two blocks slightly.

## TASK 2: Verification

```bash
node smoke.js index.html
```

Done condition: 0 failures. If the prior CC-CMD's smoke assertion
(added to lock in the arsenal last-name extraction) can be reasonably
extended to also cover the tempo line, do so — otherwise a new assertion
is optional but recommended given this is the second time this exact
bug class has been found in this function.

**Chat-side follow-up (not checkable by CC):** confirm live via a real
game that the tempo line now actually appears in the rendered bottom
sheet (e.g., "Noah Schultz · 5.82 ERA · Fast tempo · ...") where it
previously silently never rendered.

## TASK 3: Outbox manifest (last task)

Note explicitly: this is the second occurrence of the same bug class in
the same function within one session — worth a one-line note on whether
a shared helper (e.g. `lastNameOf(p)`) would be worth extracting to
prevent a third recurrence, without necessarily building it now if that
would be scope creep beyond this fix.

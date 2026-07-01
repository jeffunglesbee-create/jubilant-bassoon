# Claude Code Command — Surface Pitch Arsenal in Scouting Report

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-scouting-report-arsenal-2026-07-01.md.

## CONTEXT

`buildScoutingReport`'s pitcher formatter (`fmtP`, inside the MLB block,
~line 18421) already chains one Savant leaderboard onto the displayed
pitcher line — pitch tempo:

```javascript
const tempo = getPitchTempo?.(p.name || p.lastName || '');
const tempoStr = tempo ? ` · <em>${tempo.tempoClass}</em> tempo` : '';
return `${p.name || p.lastName || '?'}${era}${rec}${tempoStr}`;
```

`getPitchArsenal(pitcherLastName, topN)` (~line 7659, fixed and
AVV-proven this session — CC-CMD-2026-07-01-avv-savant.md, 120 real
pitchers confirmed live) already returns exactly the data needed:
`{ pitches, topWhiff, context }`, where `topWhiff` is the pitcher's
single best swing-and-miss pitch (`{ type, usage, whiffRate,
runValuePer100 }`). This CC-CMD adds one more chained line to `fmtP`,
following the exact existing tempo pattern — not new architecture.

The Scouting Report section already names the starting pitcher but
currently tells the user nothing about them beyond ERA/record/tempo.
This closes that gap using data that already exists and is already
proven live.

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '18382,18430p' index.html
grep -n "function getPitchArsenal" index.html
sed -n '7659,7674p' index.html
```

Confirm exact current line numbers and the precise shape of `fmtP` and
`getPitchArsenal`'s return object before editing — line numbers above
are from the 2026-07-01 probe and may have shifted since other work
landed on `main`.

## TASK 1: Add arsenal line to fmtP

Inside `fmtP` (the pitcher-line formatter within `buildScoutingReport`'s
MLB block), add one more chained metric, matching the exact style of
the existing `tempoStr` line:

```javascript
const arsenal = getPitchArsenal?.(p.name || p.lastName || '');
const arsenalStr = arsenal?.topWhiff
  ? ` · <em>${arsenal.topWhiff.type}</em> ${Math.round((arsenal.topWhiff.whiffRate ?? 0) * 100)}% whiff`
  : '';
return `${p.name || p.lastName || '?'}${era}${rec}${tempoStr}${arsenalStr}`;
```

Guard against `whiffRate` being `null` (confirmed possible in the real
data shape from `getPitchArsenal` — `whiffRate` can be `null` when the
source CSV's `whiff_percent` field is empty for a given pitch) — the
`?? 0` above handles this, but verify this doesn't produce a misleading
"0% whiff" line for a pitch that actually has no whiff data at all.
Consider skipping the arsenal line entirely (not just showing 0%) if
`whiffRate` is null, rather than displaying a false zero — decide based
on what reads better once you see real output, don't just ship the
snippet as-is if it produces a misleading result.

## TASK 2: Verification

```bash
node smoke.js index.html
```

Done condition: 0 failures, existing assertions unaffected. This is
additive to an existing string-building function — should not require
new assertions unless the CC-CMD author judges one is warranted to lock
in the new line's presence (optional, not required by this spec).

**Chat-side follow-up (not checkable by CC):** confirm live via a real
game with both a completed `getPitchArsenal` lookup and a rendered
bottom sheet that the arsenal line actually appears and reads sensibly
(e.g., "Noah Schultz · 5.82 ERA · 4-Seam Fastball 18% whiff") — same
verification standard as everything else tonight.

## TASK 3: Outbox manifest (last task)

Note explicitly how the null-whiffRate case was handled and why.

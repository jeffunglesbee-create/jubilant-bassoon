# Claude Code Command — Live Pitch Arsenal in At-Bat Edge

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-atbat-edge-arsenal-2026-07-01.md.

## CONTEXT

`buildScoutingReport`'s "At-Bat Edge" section (~line 18505-18517)
displays the live current pitcher (`p.pitcherName`, sourced from
`matchup.pitcher?.fullName` via `fetchMLBPlatoon`, 45s TTL, updates
every at-bat including reliever substitutions) but shows the name only
— no arsenal or tempo context, unlike the Scouting Report's starting-
pitcher line which now shows both (CC-CMD-2026-07-01
scouting-report-arsenal + -tempo-fix).

This is the third real call site referencing a full pitcher name that
needs last-name extraction to key into `PITCHER_ARSENAL`/`PITCHER_TEMPO`
— the outbox from the tempo-fix CC-CMD explicitly deferred building a
shared `lastNameOf()` helper until a third site existed rather than
building it speculatively. It now exists. Build it.

**Value note, not just parity:** this surface is live and per-at-bat,
not static pre-game — showing "Split-Finger 39% whiff" for the pitcher
currently on the mound is a "watch for this pitch" signal in the
moment, meaningfully different from the Scouting Report's one-time
pre-game line, not a duplicate feature.

**Explicitly out of scope:** the card-level `.rai-line` written by
`injectMLBPlatoon`/`buildMLBPlatoonLine` (~line 34128-34170) is a
separate, more space-constrained render of the same cache. Do not add
arsenal/tempo text there — it's a single compact line already carrying
platoon + count context, and cramming more in risks illegibility on a
card. Note this as a possible future CC-CMD in the outbox, don't build
it now.

## PRE-BUILD PROBE (Rule 87)

```bash
sed -n '18495,18520p' index.html
grep -n "const fmtP = p =>" index.html
sed -n '/const fmtP = p => {/,/^      };/p' index.html
grep -n "function getPitchArsenal\|function getPitchTempo" index.html
```

Confirm exact current line numbers and the exact current shape of both
the At-Bat Edge block and `fmtP` (which now contains the last-name
extraction logic to generalize) before editing — line numbers above are
from the 2026-07-01 investigation and may have shifted.

## TASK 1: Extract shared lastNameOf() helper

Add near `getPitchArsenal`/`getPitchTempo` (they're adjacent, ~line
7622-7674):

```javascript
// Shared by any call site that needs to key into PITCHER_ARSENAL/
// PITCHER_TEMPO, which are last-name-only. Both scouting-report call
// sites (starting pitcher) and the At-Bat Edge call site (live current
// pitcher) need this — same bug class fixed twice before this helper
// existed (CC-CMD-2026-07-01 scouting-report-arsenal + -tempo-fix).
function lastNameOf(fullNameOrObj) {
  const raw = typeof fullNameOrObj === 'string'
    ? fullNameOrObj
    : (fullNameOrObj?.name || fullNameOrObj?.lastName || fullNameOrObj?.fullName || '');
  return raw.split(' ').pop();
}
```

Accepting either a raw string or an object with `.name`/`.lastName`/
`.fullName` covers both existing shapes (`fmtP`'s `p` object,
`p.pitcherName` raw string) without forcing a call-site rewrite beyond
what's needed.

## TASK 2: Refactor fmtP to use the shared helper

Replace `fmtP`'s inline `const pLast = (p.name || p.lastName || '').split(' ').pop();`
with `const pLast = lastNameOf(p);` — confirm this produces identical
output to the current inline version before committing (same object
shape, same result).

## TASK 3: Add arsenal/tempo to the At-Bat Edge Pitcher row

In the At-Bat Edge block, extend the existing pitcher row:

```javascript
const pitcherLast = p.pitcherName ? lastNameOf(p.pitcherName) : '';
const pArsenal = pitcherLast ? getPitchArsenal?.(pitcherLast) : null;
const pTempo   = pitcherLast ? getPitchTempo?.(pitcherLast)   : null;
const arsenalStr = (pArsenal?.topWhiff && pArsenal.topWhiff.whiffRate != null)
  ? ` · <em>${pArsenal.topWhiff.type}</em> ${Math.round(pArsenal.topWhiff.whiffRate * 100)}% whiff`
  : '';
const tempoStr = pTempo ? ` · <em>${pTempo.tempoClass}</em> tempo` : '';
```

Then extend the existing pitcher row template:

```javascript
${p.pitcherName ? `<div class="rai-row"><span class="rai-lbl">Pitcher</span><span style="font-size:.67rem">${p.pitcherName}${arsenalStr}${tempoStr}</span></div>` : ''}
```

Same null-whiffRate handling as the Scouting Report fix (skip, don't
show a false "0% whiff") — reuse that exact logic, don't reinvent it.

## TASK 4: Verification

```bash
node smoke.js index.html
```

Extend `SCOUT-ARSENAL-1` again (now covering 3 call sites) or add a new
assertion for the At-Bat Edge specifically — CC's judgment, matching the
precedent already set (extend in place when it's testing the same
underlying helper, new assertion when testing a genuinely distinct
render surface). Done condition: 0 failures.

**Chat-side follow-up (not checkable by CC):** confirm live, during an
actual in-progress MLB game with a pitching change, that the At-Bat
Edge pitcher line updates to show the new (relief) pitcher's arsenal/
tempo — not just the original starter's, since that's the entire point
of this being the live surface rather than a duplicate of Scouting
Report.

## TASK 5: Outbox manifest (last task)

Note explicitly whether `lastNameOf()` fully replaced both prior inline
extractions cleanly, and restate the card-level `.rai-line` deferral
from Task-out-of-scope so it isn't lost.

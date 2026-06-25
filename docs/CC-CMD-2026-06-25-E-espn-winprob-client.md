# CC-CMD E: ESPN Win Probability — Client Rendering
**Date:** 2026-06-25 · **Repo:** jubilant-bassoon · **Rule 87:** Self-completing.

## WHAT THIS ADDS

The relay already fetches win probability from ESPN summary (L8838: winprobability[].homeWinPercentage).
This CC-CMD wires it to the CLIENT for the Comeback Framing WOW feature.

Display: a single text chip on live + close post-game cards showing the home team's win probability.
Example: "NYK 23%" when Knicks trail in the 4th. "NYK 8% → won" post-game.

No new API. No new relay route. Extends existing winprobability[] data already in the relay response.
`buildComebackProbability` already exists at L37931 (client) — this wires its output to a chip.

## PROBE BLOCK

```bash
cd /home/claude/jubilant-bassoon

# 1. Find buildComebackProbability
grep -n 'buildComebackProbability\|comebackProb\|winProbability\|homeWinPercentage' index.html | head -20
# Note L37931+ implementation

# 2. Find where winprobability is returned from relay (where it enters the client)
grep -n 'winprobability\|win_probability' index.html | head -10

# 3. Find chip rendering area (where to inject the probability chip)
grep -n 'buildVibeChips\|enrichRow\|chipRow' index.html | head -10

# 4. Confirm current smoke count
node smoke.js 2>&1 | tail -1
```

## TASK 1 — Wire winprobability into buildVibeChips or equivalent

Find the chip-building function for game cards. Add win probability chip
for live games where the trailing team has < 30% win probability:

```javascript
// ── Win probability chip (ESPN data, no new API) ──────────────────────────
// Only shown when: game is live OR final within 24h, and probability is notable.
// Data: game.winprobability from ESPN summary (already in relay response).
if (game.winprobability?.length) {
    const latest = game.winprobability[game.winprobability.length - 1];
    const homePct = Math.round(latest.homeWinPercentage ?? 50);
    const awayPct = 100 - homePct;
    const isLive = game.status?.type?.state === 'in';
    const isFinal = game.status?.type?.completed;
    // Only chip when outcome is in genuine doubt or a dramatic comeback occurred
    if (isLive && (homePct <= 25 || awayPct <= 25)) {
        const trailingTeam = homePct < awayPct ? game.homeTeam : game.awayTeam;
        const trailingPct = Math.min(homePct, awayPct);
        chips.push(fieldChip(`${trailingTeam?.abbreviation || '?'} ${trailingPct}%`, 'LONG', { small: true }));
    }
    if (isFinal && game._winProbabilityAtLowest != null && game._winProbabilityAtLowest <= 15) {
        // Comeback: team won from ≤15% probability
        chips.push(fieldChip(`COMEBACK`, 'DRAMA', { small: true }));
    }
}
```

## TASK 2 — Store minimum win probability for comeback detection

In the game data assembly path (where winprobability[] is processed):

```javascript
// Find the lowest win probability the eventual winner faced
if (game.winprobability?.length && game.status?.type?.completed) {
    const winner = game.homeScore > game.awayScore ? 'home' : 'away';
    const winnerPcts = game.winprobability.map(p =>
        winner === 'home' ? (p.homeWinPercentage ?? 50) : (100 - (p.homeWinPercentage ?? 50))
    );
    game._winProbabilityAtLowest = Math.min(...winnerPcts);
}
```

## TASK 3 — Smoke assertions

```javascript
// A739 — win probability chip
assert('A739 — win probability chip: trailingPct chip', 
    /trailingPct.*chip|fieldChip.*\$\{.*Pct\}%/.test(html) || 
    html.includes('homeWinPercentage') && html.includes('trailingPct'));
assert('A740 — comeback chip', html.includes("'COMEBACK'") || html.includes('"COMEBACK"'));
```

## DONE CONDITIONS

```bash
# 1. Smoke passes (≥ 754, 0 failed)
node smoke.js 2>&1 | tail -3

# 2. Win probability referenced in chip path
grep -c 'homeWinPercentage\|trailingPct\|winprobability' index.html
# Expected: ≥ 3

# 3. SW_VERSION bumped
grep 'SW_VERSION' sw.js index.html | head -2

# 4. diff check
git diff --stat
# Expected: index.html smoke.js sw.js only
```

## COMMIT

```bash
git add index.html smoke.js sw.js
git commit -m "feat(client): win probability chip + comeback detection (ESPN data, A739-A740)"
git push origin main
```

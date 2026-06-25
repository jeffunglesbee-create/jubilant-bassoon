# CC-CMD E (revised): ESPN Win Probability Chip
**Date:** 2026-06-25 · **Repo:** jubilant-bassoon · **Rule 87:** Self-completing.
**Revision:** Rewritten after probe block stopped at 7 contract mismatches.

---

## WHAT CHANGED FROM ORIGINAL SPEC

Original spec had 7 contract mismatches with HEAD — CC correctly stopped.
This revision is ground-truth: all code uses verified client APIs.

Mismatches corrected:
1. No `game.winprobability[]` array — client has scalar `espnScores[key].wp` (0-1 fraction)
2. No `fieldChip()` helper — chip pattern is `chips.push({label, cls})`
3. Scale is 0-1 NOT 0-100 — threshold must be `<= 0.25` not `<= 25`
4. Game state on `eData?.state` NOT `game.status?.type?.state`
5. Team fields: `game.home` + `game._homeAbbr` NOT `game.homeTeam.abbreviation`
6. `buildComebackProbability` already exists at L37931 — do not duplicate
7. Comeback badge (historical WP minimum) deferred — requires relay to pass
   `wpLowest` server-side (Rule 70 atomic cross-repo change, separate CC-CMD)

---

## PROBE BLOCK

```bash
cd /home/claude/jubilant-bassoon && git pull

# 1. Confirm SW_VERSION mismatch (A190 failure from auto-commit)
grep -n "SW_VERSION" sw.js | head -2
grep -n "SW_VERSION" index.html | head -3
# Expected: sw.js has 2026-06-24i, index.html has 2026-06-25a — MISMATCH

# 2. Confirm espnScores[key].wp scalar (not array)
grep -n "\.wp" index.html | grep -i "espn\|winprob\|fetchESPN" | head -10
# Expected: scalar wp field, not winprobability[]

# 3. Find chip push pattern (not fieldChip function)
grep -n "chips.push\|chip.push" index.html | head -5
# Expected: chips.push({label, cls}) or similar object pattern

# 4. Find eData?.state game state pattern
grep -n "eData.*state\|eData\?\.state" index.html | head -5
# Expected: eData?.state used for game state checks

# 5. Find buildComebackProbability and its callers
grep -n "buildComebackProbability\|ComebackProbability" index.html | head -10
# Expected: function at L37931, callers at ~L37904/L38027

# 6. Find game.home and game._homeAbbr pattern
grep -n "game\._homeAbbr\|game\.home[^T]" index.html | head -5
# Expected: string team name + abbrev companion

# 7. Confirm wp value format in a live game (if available)
# Search for where wp is set from ESPN response
grep -n "\.wp\s*=" index.html | grep -v "swap\|newp\|ewp\|checkpoint" | head -10
```

---

## TASK 1 — Fix SW_VERSION sync (A190 blocker)

Auto-commit during git pull bumped index.html SW → 2026-06-25a but sw.js stayed
at 2026-06-24i. Must fix before any deploy or A190 will fail smoke.

In sw.js, find and replace:
```
const SW_VERSION = '2026-06-24i';
```
with:
```
const SW_VERSION = '2026-06-25a';
```

Verify sync:
```bash
grep "SW_VERSION" sw.js index.html
# Expected: both show 2026-06-25a
```

---

## TASK 2 — Win probability chip on live game cards

The scalar `espnScores[key].wp` (0-1 fraction, home team win probability)
is already fetched by the client. Wire it to a chip on live cards when the
trailing team has < 25% win probability.

Find the chip-building section for live game cards — look for where chips
array is populated for a live game. Add AFTER any existing chips:

```javascript
// ── Win probability chip (ESPN scalar wp, 0-1 scale) ─────────────────
// espnScores[key].wp is the home team win probability as a 0-1 fraction.
// Only show when game is live and outcome is genuinely in doubt (<25%).
// eData?.state drives live/final — game.status?.type?.state is unreliable.
const wpVal = game._espnKey && espnScores[game._espnKey]?.wp;
if (wpVal != null && eData?.state === 'in') {
    const homeWp = wpVal;          // 0-1 fraction (e.g. 0.23 = 23%)
    const awayWp = 1 - homeWp;
    const trailingWp = Math.min(homeWp, awayWp);
    if (trailingWp <= 0.25) {
        const trailingAbbr = homeWp < awayWp
            ? (game._homeAbbr || game.home || 'HOME')
            : (game._awayAbbr || game.away || 'AWAY');
        const pct = Math.round(trailingWp * 100);
        chips.push({ label: `${trailingAbbr} ${pct}%`, cls: 'chip-long' });
    }
}
```

NOTE: Find the correct chip push pattern in context first — adapt to whatever
object shape `chips.push` takes in the actual code (may be `{label, cls}` or
`[label, cls]` or another shape). Do NOT invent a new pattern.

---

## TASK 3 — Smoke assertion A739

Add one smoke assertion for the win probability chip:

```javascript
assert('A739 — win probability chip uses 0-1 scale threshold (not 0-100)',
  html.includes('trailingWp <= 0.25') || html.includes('trailingWp < 0.25'),
  'WP threshold must use 0-1 scale: espnScores[key].wp is a fraction not a percent');
```

Do NOT add A740 (comeback badge) — deferred to paired relay+client CC-CMD.

---

## TASK 4 — SW_VERSION bump

SW was fixed in Task 1 (2026-06-24i → 2026-06-25a). Verify both files match:
```bash
grep "SW_VERSION" sw.js index.html | head -4
# Expected: both 2026-06-25a
```

---

## DONE CONDITIONS

```bash
# 1. Smoke passes (A190 now passes because SW synced)
node smoke.js 2>&1 | tail -3
# Expected: N passed, 0 failed (N > 754)

# 2. A739 specifically passes
node smoke.js 2>&1 | grep "A739"
# Expected: pass line, no FAIL

# 3. SW_VERSION synced
grep "SW_VERSION" sw.js index.html
# Expected: 2026-06-25a in both

# 4. Threshold uses correct scale
grep "trailingWp" index.html | head -3
# Expected: 0.25 threshold (not 25)

# 5. diff — only index.html + sw.js + smoke.js
git diff --stat
# Expected: those 3 files only
```

---

## OUT OF SCOPE (deferred)

Comeback badge ("COMEBACK" shown post-game when winner was at ≤15% WP):
- Requires relay to compute `wpLowest` server-side (running min over the array)
  and inject it into the game payload
- Rule 70: atomic cross-repo change (relay + client must ship together)
- Spec as a paired CC-CMD pair: relay adds `wpLowest`, client reads it
- Do NOT implement in this CC-CMD

---

## COMMIT

```bash
git add index.html sw.js smoke.js
git commit -m "feat(client): win probability chip (A739) + SW sync fix 2026-06-25a"
git push origin main
```

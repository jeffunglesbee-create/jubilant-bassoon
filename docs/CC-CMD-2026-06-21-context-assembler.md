# Claude Code Command — Context Assembler + Multi-Sport R2 → Journalism

Target repo: field-relay-nba (NOT jubilant-bassoon).

git pull. Read CLAUDE.md. Read docs/ADR-002-CONTEXT.md.

Write all findings to outbox/cc-context-assembler-2026-06-21.md.

## CONTEXT

The journalism prompt builder currently injects context via hardcoded
function calls: buildFinalsContextBlock(gameLines) and
buildWCTeamContextBlock(gameLines, d1db, patches). FIELD_PROSE_STYLE
is appended as the style block. The LLM is called via callProxy().

R2 has sport-specific statistical data the CLIENT reads at boot
(mlbStatsInit, nhlSeriesInit, nbaCluichInit, soccerFBrefInit) but
the journalism prompt builder gets ZERO of this data. Briefs describe
games without knowing the pitcher's whiff rate, the team's clutch
DRTG, the series PP%, or the xG differential.

This command creates assembleContext() — a priority-ordered source
registry that replaces hardcoded context injection with a generic,
budget-gated, fail-independent pattern. It also ships the first four
sport-specific R2 context builders.

## ADR-002 STATUS: CLEAN

Context injection provides DATA to the LLM. The LLM makes editorial
decisions. The relay doesn't decide which stats are interesting — it
provides all available stats and the prompt instructions guide the
LLM's use. No drama scores cross the wire. Same pattern as existing
buildFinalsContextBlock and buildWCTeamContextBlock.

## PRE-BUILD PROBE (Rule 68 — PROBE-FIRST-A)

Before writing any code, run these probes to verify actual state:

```bash
# 1. Verify R2 data files exist and get their shapes
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/r2/mlb/2026/expected_stats.json | node -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log("MLB expected_stats keys:", Object.keys(d.data||{}).length, "updated:", d.updated)'
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/r2/mlb/2026/pitch_arsenals.json | node -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log("MLB pitch_arsenals keys:", Object.keys(d.data||{}).length)'
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/r2/nhl/scf-2026/series-stats.json | node -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log("NHL series teams:", Object.keys(d.teams||{})); console.log("fields:", Object.keys(d.teams?.[Object.keys(d.teams)[0]]||{}))'
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/r2/nba/2026/clutch_playoffs.json | node -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); console.log("NBA clutch teams:", Object.keys(d.teams||{}).length); console.log("fields:", Object.keys(d.teams?.[Object.keys(d.teams)[0]]||{}))'

# 2. Find where the journalism prompt is assembled
grep -rn "buildFinalsContextBlock\|buildWCTeamContextBlock\|FIELD_PROSE_STYLE\|callProxy" src/ --include="*.js" | head -30

# 3. Find the journalism queue consumer / brief generator
grep -rn "JOURNALISM_QUEUE\|briefType\|function.*brief\|async.*generateBrief\|per-game.*prompt\|gameLine" src/ --include="*.js" | head -30

# 4. Verify env.FIELD_DATA binding exists in wrangler.toml
grep -A2 "FIELD_DATA\|r2_buckets" wrangler.toml
```

Write the probe results to outbox BEFORE writing any code. If any
R2 file returns 404 or has an unexpected shape, document it and
adapt — do not assume the shape from this spec.

## TASK 1: Create src/context-assembler.js

Create a new source file with the assembleContext registry pattern.

```javascript
// src/context-assembler.js
// Context Assembler — priority-ordered source registry for journalism prompts

const CONTEXT_SOURCES = [
  { id: 'savant',       priority: 7, budget: 400, builder: buildSavantContext,      sports: ['mlb'] },
  { id: 'nhl_series',   priority: 7, budget: 150, builder: buildNHLSeriesContext,   sports: ['nhl'] },
  { id: 'nba_clutch',   priority: 7, budget: 120, builder: buildNBAClutchContext,   sports: ['nba'] },
  { id: 'soccer_fbref', priority: 7, budget: 180, builder: buildSoccerFBrefContext, sports: ['epl','mls','ucl','wc26','laliga','seriea','bundesliga','ligue1'] },
];

async function r2Json(env, key) {
  if (!env.FIELD_DATA) return null;
  try {
    const obj = await env.FIELD_DATA.get(key);
    if (!obj) return null;
    return JSON.parse(await obj.text());
  } catch (_) { return null; }
}

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

async function assembleContext(env, game, totalBudget = 1500) {
  const sport = (game.sport || '').toLowerCase();
  const applicable = CONTEXT_SOURCES.filter(s =>
    !s.sports || s.sports.includes(sport)
  );
  applicable.sort((a, b) => a.priority - b.priority);

  let remaining = totalBudget;
  const blocks = [];

  for (const source of applicable) {
    if (remaining <= 0) break;
    try {
      const block = await source.builder(env, game);
      if (block && block.length > 0) {
        const tokens = estimateTokens(block);
        if (tokens <= remaining + 50) {
          blocks.push(block);
          remaining -= tokens;
        }
      }
    } catch (e) {
      console.error(`[context-assembler] source ${source.id} failed:`, e.message);
    }
  }

  return blocks.join('\n');
}

export { assembleContext, r2Json };
```

Then implement the four sport-specific builders in the same file.
Use the ACTUAL R2 field names from the pre-build probe.
Do NOT guess field names — read them from probe output.

Each builder:
- Takes (env, game) where game has { sport, homeAbbr, awayAbbr, home, away }
- Returns a string like '\n[SAVANT CONTEXT]\n...\n' or ''
- Reads from R2 via r2Json()
- Fails gracefully (returns '' on any error)
- Uses only field names confirmed by the probe

### buildSavantContext (MLB)

Read mlb/2026/expected_stats.json and mlb/2026/pitch_arsenals.json.
For each team's probable starter (if identifiable from game metadata),
inject xBA/xSLG/xWOBA and top 3 pitch arsenal entries with whiff rates.
For team-level: read mlb/2026/team_abs.json for ABS challenge grade.
Output as `\n[SAVANT CONTEXT]\n` block, ~200-400 tokens.

### buildNHLSeriesContext (NHL)

Read nhl/scf-2026/series-stats.json (or generalize the path for future
series). Inject ppLabel, pkLabel, pdoLabel for both teams.
Flag PP/PK divergence from season average if delta >= 5%.
Output as `\n[NHL SERIES CONTEXT]\n` block, ~100-150 tokens.

### buildNBAClutchContext (NBA)

Read nba/2026/clutch_playoffs.json (prefer playoffs, fall back to
clutch_regular.json). Inject clutchDrtg, clutchOrtg, clutchNetRtg
for both teams. Flag clutch mismatch if DRTG gap > 5.
Output as `\n[NBA CLUTCH CONTEXT]\n` block, ~80-120 tokens.

### buildSoccerFBrefContext (Soccer)

Soccer FBref data may not yet be in R2 — the probe will confirm.
If the R2 file exists, inject xG for/against, possession %,
progressive passes for both teams. Flag xG divergence if >= 3.
If the R2 file doesn't exist, return '' (graceful degradation).
Output as `\n[SOCCER STATS CONTEXT]\n` block, ~120-180 tokens.

## TASK 2: Wire into journalism prompt builder

Find the function that builds per-game journalism prompts (the one
that calls callProxy with game-specific context including
buildFinalsContextBlock output and FIELD_PROSE_STYLE).

Add one line to inject assembleContext output:

```javascript
import { assembleContext } from './context-assembler.js';

// Inside the prompt builder, after existing context blocks:
const sportContext = await assembleContext(env, {
  sport: game.sport || sport,
  homeAbbr: game.homeAbbr || game.home?.abbr || '',
  awayAbbr: game.awayAbbr || game.away?.abbr || '',
  home: game.home?.name || game.home || '',
  away: game.away?.name || game.away || '',
});
// Append sportContext to the prompt string
```

Do NOT remove buildFinalsContextBlock or buildWCTeamContextBlock.
Those are universal context sources that will migrate into the
registry later. This task only ADDS the sport-specific R2 stats.

Do NOT modify any existing prompt text or FIELD_PROSE_STYLE.

## TASK 3: Verify

```bash
# Deploy
npm run deploy  # or wrangler deploy

# Verify context-assembler doesn't break the build
node --check src/context-assembler.js

# Probe: trigger a brief for an MLB game and check if
# [SAVANT CONTEXT] appears in the prompt log
# (AI Gateway logs show the full prompt)
```

## SCOPE BOUNDARY (Rule 69 — TOUCH-ONLY-A)

DO:
- Create src/context-assembler.js (new file)
- Add one import + one function call in the journalism prompt builder
- Add assembleContext output to the prompt string

DO NOT:
- Modify buildFinalsContextBlock or buildWCTeamContextBlock
- Modify FIELD_PROSE_STYLE or runQualityChain
- Modify analytics-engine.js phases
- Touch any client code (index.html)
- Rename or restructure existing source files
- Add new R2 data fetching (the data already exists)

## INSTRUCTIONS

1. This is a single-repo task: field-relay-nba only.
2. Run pre-build probes FIRST. Write probe results to outbox.
3. Create src/context-assembler.js with all 4 builders.
4. Wire into prompt builder with minimal touch.
5. node --check all modified files before commit.
6. Single commit: "feat: context assembler + 4-sport R2 context builders"
7. Deploy via existing CI.
8. Write manifest to outbox/cc-context-assembler-2026-06-21.md.

## R2 DATA REFERENCE (verify via probe before using)

Expected R2 paths (from runMLBSavantUpdate, runNHLSeriesUpdate,
runNBACluichUpdate in deployed relay):

- mlb/2026/expected_stats.json — { data: { [nameKey]: { ba, xba, slg, xslg, woba, xwoba, pa } } }
- mlb/2026/pitch_arsenals.json — { data: { [nameKey]: { team, pitches: [{ type, vel, whiffRate, usage }] } } }
- mlb/2026/sprint_speed.json — { data: { [nameKey]: { sprintSpeed, pctile, tier, team } } }
- mlb/2026/pitch_tempo.json — { data: { [nameKey]: { medianTempo, tempoClass } } }
- mlb/2026/team_abs.json — { data: { [teamAbbr]: { battingRate, grade } } }
- nhl/scf-2026/series-stats.json — { teams: { [abbr]: { seriesPP, seriesPK, ppLabel, pkLabel, seriesPDO, pdoLabel } } }
- nba/2026/clutch_playoffs.json — { teams: { [abbr]: { clutchDrtg, clutchOrtg, clutchNetRtg, clutchPace } } }
- nba/2026/clutch_regular.json — same shape as playoffs

THESE SHAPES ARE FROM CODE READING. The probe may reveal differences.
Use probe output, not this reference, for field names.

## CROSS-REFERENCES

- Multi-Sport R2 → Journalism spec: Drive 1JgZynP8o6jgsPjmSRjbTYxcntVwtxIYeX9LbtmqxyzA
- Savant → Journalism spec: Drive 1O0G68_lS_HWYWdYYLWkWiJ-8dLWsURuE9RKMhF3_Cjo
- Codex: spec/multi-sport-r2-journalism, spec/savant-journalism
- HANDOFF adapter #3 (Context Assembler) + #7 (Savant → Journalism)

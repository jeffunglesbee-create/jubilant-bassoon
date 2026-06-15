# Championship Brief Enrichment — Spec

## Problem
The post-game brief pipeline treats a Stanley Cup clinching game
the same as a Round 1 Game 3. The journalism prompt receives player
stats and series record but not the historical weight of the moment.
A championship brief should be larger than a regular recap.

## What the prompt needs (all verifiable facts)

### Championship context (injected when series is clinched):
- **Trophy name**: "Stanley Cup" / "Larry O'Brien Trophy" / etc.
- **Franchise drought**: "First championship since [year]" or
  "Back-to-back" or "First in franchise history"
- **Playoff record**: "16-3 through the postseason"
- **Series journey**: "Swept Ottawa, swept Philadelphia, beat
  Montreal 4-1, beat Vegas 4-2"
- **Clinch game headline**: "Shutout on the road" / "Overtime winner"
  / "Blowout at home" (derived from score + venue)

### Data sources (all already in FIELD):
- `_gameImportance === 'clinch'` — already classified
- Series record from playoff data (API/ESPN)
- Prior round results from allData or hardcoded series history
- Franchise championship history — hardcoded lookup table
  (30 NHL teams, 30 NBA teams = 60 entries, static data)

## Implementation outline

### 1. Championship context builder (~15 min)
```js
function buildChampionshipContext(game, seriesData) {
  // Only fires when: clinch game + final round
  // Returns: { trophy, drought, playoffRecord, journey, clinchType }
}
```

### 2. Franchise championship lookup (~10 min)
```js
const FRANCHISE_LAST_TITLE = {
  'Carolina Hurricanes': { year: 2006, trophy: 'Stanley Cup' },
  'Vegas Golden Knights': { year: 2023, trophy: 'Stanley Cup' },
  // ... 30 NHL + 30 NBA entries
};
```

### 3. Prompt injection (~5 min)
When `buildChampionshipContext` returns non-null, append to the
journalism prompt:

```
[CHAMPIONSHIP CONTEXT]
This is a championship-clinching game. {team} wins the {trophy}.
{drought context}. Playoff record: {W}-{L}.
Journey: {round-by-round results}.
Clinch type: {shutout/OT/blowout/close}.
Write this brief at the level the moment deserves.
Do not undersell a championship.
```

### 4. Smoke assertion
A604: championship context builder exists and returns correct
shape when given a clinch + finals input.

## Constraints
- Rule 58: all facts verifiable (scores, years, records)
- DO NOT INVENT: franchise history hardcoded from verified sources
- No structural change to brief pipeline — additive enrichment only
- Same Gemini/Haiku model path, just richer prompt context

## Build estimate: ~30 min total

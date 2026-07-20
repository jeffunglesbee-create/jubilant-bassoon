# CC Session — 2026-07-20 — PulseLive card event type probe + Key Moments filter

## Repos touched
- `jeffunglesbee-create/jubilant-bassoon` — Key Moments filter update
- `jeffunglesbee-create/field-relay-nba` — `/pl/events/:id` probe endpoint added

## HEAD progression

### jubilant-bassoon
| Commit | Message |
|--------|---------|
| `dfbe693` | feat: expand Key Moments filter to confirmed PulseLive event types (yellow card, own goal, penalty goal, VAR cancelled goal) |
| `689d17b` | feat: add red card and secondyellow card to Key Moments filter |

### field-relay-nba
| Commit | Message |
|--------|---------|
| `8b2ec22` | feat: add /pl/events/:id endpoint for PulseLive event type probing |

## Smoke
963/0 throughout — unchanged.

## SW_VERSION
Not bumped (no deploy-triggering changes in jubilant-bassoon; field.js edits do not trigger deploy without index.html SW_VERSION bump).

## What was done

### Card event type probe

Probed six completed PL fixtures across 2024/25 and 2025/26 seasons using `probe_relay_route /pl/events/:id` (new endpoint) and previously saved browser_quick files.

The `/pl/events/:id` endpoint was added to field-relay-nba to work around probe_relay_route's ~12KB body truncation — the full `/pl/match/:id` response is 49–50KB with the fixture object consuming the first ~45KB; the events array is never visible via the existing endpoint. The new endpoint fetches the textstream only and returns `{ count, types, events }` where `types` is a deduplicated sorted array — fitting in ~20KB and fully visible via probe.

**Fixtures probed:**
| Fixture ID | Match | GW | Card events |
|---|---|---|---|
| 116100 | Crystal Palace 1-0 Ipswich (2024/25) | — | yellow card only |
| 115830 | Liverpool 2-0 Ipswich (2024/25) | — | yellow card only |
| 124798 | Chelsea 0-0 Crystal Palace (2025/26 GW1) | 1 | yellow card |
| 124810 | Chelsea 5-1 West Ham (2025/26 GW3) | 3 | yellow card |
| 124816 | Man Utd 3-2 Burnley (2025/26 GW3) | 3 | yellow card |
| 125053 | Chelsea 1-1 Burnley (2025/26 GW27, 21 Feb 2026) | 27 | yellow card + secondyellow card (Fofana 72') |
| 124837 | Man Utd 2-1 Chelsea (2025/26 GW5, 20 Sep 2025) | 5 | red card (Sánchez 5') + secondyellow card (Casemiro 45+5') + yellow card |

### Confirmed PulseLive textstream event type strings

All lowercase. Verified from actual API responses — no assumptions.

| Type string | Meaning | Confirmed in |
|---|---|---|
| `"goal"` | Goal | Multiple fixtures |
| `"own goal"` | Own goal | Previous session |
| `"penalty goal"` | Penalty goal | Previous session |
| `"VAR cancelled goal"` | VAR-disallowed goal | Previous session |
| `"yellow card"` | Yellow card (caution) | Multiple fixtures |
| `"red card"` | Direct red card dismissal | 124837 (Sánchez, 5') |
| `"secondyellow card"` | Second yellow → dismissal | 125053 (Fofana, 72') + 124837 (Casemiro, 45+5') |
| `"substitution"` | Substitution | Multiple fixtures |

**Critical naming note:** Second yellow is `"secondyellow card"` — the word "second" and "yellow" are concatenated with no space before " card". Not `"second yellow card"` and not `"second yellow"`.

Full confirmed type list (all observed across all probed fixtures):
`VAR cancelled goal`, `added time`, `attempt blocked`, `attempt saved`, `contentious referee decisions`, `corner`, `end 1`, `end 14`, `end 2`, `end delay`, `free kick lost`, `free kick won`, `goal`, `lineup`, `miss`, `offside`, `own goal`, `penalty goal`, `penalty lost`, `penalty won`, `post`, `red card`, `secondyellow card`, `start`, `start delay`, `substitution`, `yellow card`

### Key Moments filter update (jubilant-bassoon)

`openBottomSheet()` in `src/legacy/field.js` line 39241 — expanded in two commits:

**dfbe693** (prior session):
```javascript
// Added: own goal, penalty goal, VAR cancelled goal, yellow card
.filter(e => e.type === 'goal' || e.type === 'own goal' || e.type === 'penalty goal' || e.type === 'VAR cancelled goal' || e.type === 'yellow card' || e.type === 'substitution')
```

**689d17b** (this session):
```javascript
// Added: red card, secondyellow card
.filter(e => e.type === 'goal' || e.type === 'own goal' || e.type === 'penalty goal' || e.type === 'VAR cancelled goal' || e.type === 'yellow card' || e.type === 'red card' || e.type === 'secondyellow card' || e.type === 'substitution')
```

### /pl/events/:id relay endpoint (field-relay-nba 8b2ec22)

Added at `src/index.js` after the `/pl/match/:id` handler. Fetches the PulseLive textstream only (no base fixture), paginates all pages, returns:
```json
{ "count": 117, "types": ["added time", "goal", ...sorted deduped...], "events": [...] }
```

Intended as a probe/debug utility. Has no client consumer — probe-only. TTL matches PL_TTL_LIVE (same as /pl/match/:id).

## Integration status
- RELAY CONTRACT: `/pl/events/:id` — probe endpoint, returns `{ count, types[], events[] }`. No client consumer, no smoke assertion.
- CLIENT CONSUMER: `openBottomSheet()` Key Moments filter at `field.js:39241` — VERIFIED all card type strings match confirmed PulseLive values.
- INTEGRATION STATUS: VERIFIED for filter correctness. E2E display verification requires a live or recent match with cards — next session with a card match can confirm rendering.

## Open carry-forwards
None. All confirmed card type strings are now in the Key Moments filter.

Note: `penalty lost`, `penalty won`, `post` were observed in prior sessions but deliberately excluded from Key Moments as lower narrative priority. These remain available if future sessions decide to add them.

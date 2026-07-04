# CC-CMD: Circadian phase detector (client half of Circadian Layout Rules C1/C2/C4)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Minimal, real slice of the documented-but-never-built Circadian Layout Rules (docs/VIEWPORT-V4-SPEC.md, C1-C5). Does NOT attempt the full 5-rule spec — scoped to the 3 rules that map directly to content already sitting unused in KV (C1 night-mode trigger, C2 post-midnight → late content, C4 afternoon → preview content). C3 (morning recap) and C5 (typography weight) are explicitly OUT OF SCOPE for this CC-CMD — see SCOPE BOUNDARY.
**Why:** The relay CC-CMD (CC-CMD-2026-07-04-circadian-kv-read-endpoint.md, field-relay-nba repo) exposes `/circadian/preview/{date}` and `/circadian/late/{date}`. Nothing on the client calls them. The newspaper's existing "TONIGHT" section (bundle.preview) is static — same text regardless of what time of day the user opens the app. This CC-CMD makes it time-aware, closing the loop the June 22 newspaper CC-CMD explicitly deferred ("DO NOT: Add Circadian mode switching — separate spec").
**Target time:** ~45 min
**HARD DEPENDENCY:** Relay CC-CMD must be deployed and its done conditions verified FIRST. Verify before starting:
```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/$(date -u +%Y-%m-%d)"
```
If this 404s or the route doesn't exist, STOP — the relay CC-CMD hasn't shipped yet.

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress (CC Playwright cannot reach live URL)
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- eslint baseline first before any code edit (npx eslint index.html)

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## CONTEXT
The existing `fetchNewspaper`/`renderNewspaper` functions (CC-CMD-2026-06-22-newspaper-client.md) already establish the ET-timezone pattern used elsewhere in the codebase:
```javascript
const tz = 'America/New_York';
const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
```
This CC-CMD reuses that exact pattern for hour-of-day detection, not a new time library.

Circadian phase boundaries (from docs/VIEWPORT-V4-SPEC.md C1-C4, ET local time):
- **C2 (post-midnight):** 00:00–05:59 ET → "late" phase
- **C3 (morning):** 06:00–11:59 ET → already covered by existing morning_report in the newspaper bundle; NO new fetch needed, OUT OF SCOPE here
- **C4 (afternoon):** 12:00–17:59 ET → "preview" phase
- **Evening/night default (18:00–23:59 ET):** live-game viewing hours — no circadian override, existing behavior unchanged

## PROBE BLOCK (run before any edits)
```bash
# P1 — confirm relay dependency is live (see HARD DEPENDENCY above — repeat check)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/$(date -u +%Y-%m-%d)" | head -c 300
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/late/$(date -u +%Y-%m-%d)" | head -c 300

# P2 — confirm current renderNewspaper "preview" section location for the edit anchor
grep -n "np-preview\|bundle.preview" index.html
```

## TASK 1 — getCircadianPhase()

Add near `fetchNewspaper` (same section as the June 22 newspaper functions):

```javascript
// ── CIRCADIAN PHASE DETECTOR (C1/C2/C4 slice) ──────────────────────
// Returns 'late' | 'preview' | null. null means no circadian override
// applies — caller should fall back to existing static behavior.
function getCircadianPhase() {
    const tz = 'America/New_York';
    const hour = parseInt(
        new Date().toLocaleString('en-US', { timeZone: tz, hour: '2-digit', hour12: false }),
        10
    );
    if (hour >= 0 && hour < 6) return 'late';      // C2
    if (hour >= 12 && hour < 18) return 'preview'; // C4
    return null; // C3 (morning) and evening/night: no override, existing behavior
}
```

## TASK 2 — fetchCircadianText(phase, date)

```javascript
async function fetchCircadianText(phase, date) {
    const base = (typeof V2_RELAY_BASE !== 'undefined')
        ? V2_RELAY_BASE : 'https://field-relay-nba.jeffunglesbee.workers.dev';
    try {
        const r = await fetch(`${base}/circadian/${phase}/${date}`, {
            signal: AbortSignal.timeout(3000),
        });
        if (!r.ok) return null;
        const data = await r.json();
        return data.ok ? data.text : null;
    } catch (_) {
        return null;
    }
}
```

## TASK 3 — Wire into bootNewspaper

Find `bootNewspaper` (added by the June 22 CC-CMD). Modify to override `bundle.preview` when a circadian phase applies AND the fetch succeeds — fall back to the existing bundle.preview on any failure (zero-degradation, matching the existing newspaper's own failure-handling philosophy):

```javascript
(async function bootNewspaper() {
    const tz = 'America/New_York';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const bundle = await fetchNewspaper(today);
    if (!bundle) return;

    // Circadian override (C2/C4 slice) — best-effort, never blocks render
    const phase = getCircadianPhase();
    if (phase) {
        const circadianText = await fetchCircadianText(phase, today);
        if (circadianText) {
            if (phase === 'late') {
                // C2: post-midnight — late content replaces morning_report
                // slot conceptually, but morning_report may not exist yet
                // at this hour anyway. Surface as the TONIGHT-equivalent
                // preview slot to avoid adding a new UI section this pass.
                bundle.preview = circadianText;
            } else if (phase === 'preview') {
                bundle.preview = circadianText; // C4: afternoon override
            }
        }
    }

    renderNewspaper(bundle);
})();
```

## TASK 4 — Smoke assertions

```javascript
// A[NEXT]: Circadian — getCircadianPhase function exists
smoke.assert(typeof getCircadianPhase === 'function',
    'A[NEXT]: getCircadianPhase function exists');

// A[NEXT+1]: Circadian — returns one of the three valid values
smoke.assert(['late', 'preview', null].includes(getCircadianPhase()),
    'A[NEXT+1]: getCircadianPhase returns a valid phase or null');

// A[NEXT+2]: Circadian — fetchCircadianText function exists
smoke.assert(typeof fetchCircadianText === 'function',
    'A[NEXT+2]: fetchCircadianText function exists');
```
(CC: assign real sequential A-numbers per current smoke.js state — do not
guess numbers, check the last assertion number in the file first.)

## SCOPE BOUNDARY

DO:
- Add getCircadianPhase(), fetchCircadianText()
- Override bundle.preview for C2/C4 phases only, with graceful fallback
- Add 3 smoke assertions with real sequential numbering
- Bump SW_VERSION

DO NOT:
- Implement C3 (morning recap) — already covered by existing morning_report, no gap to close
- Implement C5 (typography weight reduction) — separate, purely-visual CC-CMD, no relay dependency, can be done independently
- Add a new UI section/label distinguishing "circadian preview" from the existing "TONIGHT" label — this pass reuses the existing np-preview slot rather than growing new UI surface. If Jeff wants a distinct visual treatment (e.g. a moon icon for the 'late' phase), that's a follow-up CC-CMD, not this one.
- Touch the relay repo (field-relay-nba) — that's the paired CC-CMD, already shipped as a prerequisite
- Change existing evening/night (18:00-23:59 ET) behavior at all

## DONE CONDITIONS
- [ ] Relay dependency verified live (P1) before any edit
- [ ] `node smoke.js index.html` exits 0 with all 3 new assertions green
- [ ] CI Playwright confirms `getCircadianPhase` and `fetchCircadianText` are defined in the deployed bundle (via adapter-visible-value.yml pattern or a targeted new CI check — CC's choice, state which)
- [ ] Manual verification: temporarily fake the system clock or math in a local test to confirm both 'late' and 'preview' phases produce a different bundle.preview than the default D1 value, OR verify by checking the actual live text differs from the D1-sourced newspaper text at test time if the current real hour happens to fall in C2/C4
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-circadian-client-phase-{date}.md`

## COMPLIANCE
- Rule 47/ADR-002: this only swaps which prose string renders — no composite scores, no interest values, fully RUWT-clean
- Rule 68: probe block (including the hard relay dependency check) must run and pass before any edits
- Rule 87: self-completing — done conditions checkable in-session

## CONFIDENCE SCORING TABLE
+25  Relay dependency confirmed live before starting (P1 passes)
+25  getCircadianPhase returns correct phase for the actual current hour (verified against real current ET time, not assumed)
+25  fetchCircadianText successfully retrieves real text from the new relay endpoint (not a mock)
+25  Smoke green (3/3 new assertions) + CI confirms functions exist in deployed bundle

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-circadian-client-phase.md. Verify the relay dependency is live FIRST (see HARD DEPENDENCY). Implement exactly as specified. Do not commit unless confidence ≥ 95. If score < 95 report verbatim and stop — do not invent results.

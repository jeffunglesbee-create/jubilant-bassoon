# FIELD Development Standards

**Drive doc**: `14K-WPGsjoFLHq3ss9rKkgilDrRD8pfvf` — full rules, origin, history

---

## Enforcement

**Smoke test** (`field_smoke.js`) — runs before every push, exit 1 blocks it.  
Assertions A51–A54 are semantic contracts: if they fail, a feature silently does nothing.  
Add a new semantic assertion for every feature that depends on a specific variable name, key format, or call wiring.

**Session type** — declare at session start. Types are mutually exclusive. No mixing.

**Feature freeze** — no TYPE C if Night Owl, ESPN polling, or compound prompt is broken.

---

## Session start checklist

```
1. Declare type: A (daily update) / B (bug fix) / C (feature) / D (audit) / E (refactor)
2. git pull && cp index.html /home/claude/index.html
3. node field_smoke.js   ← must be 0 failures before touching anything
4. TYPE B only: write diagnosis (failure modes) before first code change
5. TYPE C only: write spec (inputs / outputs / call sites) before first code change
```

---

## Session types — mutually exclusive

| Type | Scope | Commit prefix |
|------|-------|---------------|
| **A** Daily update | `buildTodaySchedule`, `BETTING_LINES_FALLBACK_DATA`, `MEDIA_SPECIALS`, `MLB_DAILY_OVERRIDES` — data only, zero logic | `Daily update YYYY-MM-DD:` |
| **B** Bug fix | One root cause, fully diagnosed first | `Fix: [root cause]` |
| **C** Feature | One feature, spec written first | `Feature: [name]` |
| **D** Audit | Code vs docs gap analysis — fixes become TYPE B | `Audit: [area]` |
| **E** Refactor | Structure only, zero behavior change | `Refactor: [area]` |

---

## Feature freeze triggers (no TYPE C until resolved)

- Night Owl not displaying  
- ESPN polling dead or erratic  
- Compound prompt failing  
- Smoke test failures  
- console.log count > 22  

---

## Rule: verify in browser, not just smoke

Smoke checks structure. It cannot verify a feature fires at runtime.

Before declaring complete: verify in browser **OR** add a semantic smoke
assertion that would catch the specific failure mode.

Mark features verified in browser-only with comment:
```js
// browser-confirmed: [date] [device]
```

---

## Rule: one concern per commit

`"Fix: _weatherCache → wxCache in dramaScoreLive"` ✓  
`"10 underutilization fixes: [10 unrelated changes]"` ✗

---

*Established May 20 2026 after session audit found 3 features that had
never worked despite being documented as complete.*

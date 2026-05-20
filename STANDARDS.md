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

**Canonical docs** (open the relevant one before starting):
- Build Session List: `1YMgcYTawnVB-QBa7jEZzOLnTfa5uThKi4j3TcNDQe9o`
- Daily Update Reference: `1y_CuzSCh18YKDFjiWaaThBE1opW2LAoaupAwpvEmN58`
- Wow Features: `1h80BrgGXbz6aq3Hgv5LbjhpFkRQjYvd87fOMNJmVMOc`
- UI Evaluation: `1xIZnlczl2kIeslnnzJD1eJrgBu5iw6xgSk1wB1MVyAY`
- Standards (Drive): `1A3OaKNEjR-tASC330R3Aew9TIMwSCj9E`

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

---

## Rule 8 — Four canonical documents, updated in place

**The four living reference documents. IDs are permanent — never create a new version file.**

| Document | Current ID | Update trigger |
|----------|-----------|----------------|
| **Build Session List** (Master backlog) | `1YMgcYTawnVB-QBa7jEZzOLnTfa5uThKi4j3TcNDQe9o` | Every TYPE B/C session end |
| **Wow Features** | `1h80BrgGXbz6aq3Hgv5LbjhpFkRQjYvd87fOMNJmVMOc` | Any session that implements or modifies a Wow item |
| **UI Evaluation** | `1xIZnlczl2kIeslnnzJD1eJrgBu5iw6xgSk1wB1MVyAY` | Any session with CSS, layout, or card design changes |
| **Daily Update Reference** | `1y_CuzSCh18YKDFjiWaaThBE1opW2LAoaupAwpvEmN58` | Any session that changes broadcast chip rules, thresholds, or update protocol |

**The rule: edit the document, don't create a new one.**  
Date-stamp changes at the top of the doc. Never append "v14", "v15" to the title.  
If a format change is significant, add a `--- REVISED [date] ---` marker inside the doc.

### What to update per session type

**TYPE A (daily update):**  
Daily Update Reference — if any broadcast rule, chip mapping, or daily protocol changed.

**TYPE B (bug fix):**  
Build Session List — if the fix closes a backlog item, mark it ✅ with date.  
Wow Features — if the fix restores or corrects a Wow item behavior.

**TYPE C (feature build):**  
Build Session List — mark item ✅ with date and actual time spent.  
Wow Features — if the feature is a Wow item, update its status and implementation notes.  
UI Evaluation — if any new CSS class, layout section, or design pattern was added.  
Daily Update Reference — if the feature adds a new daily check (e.g. new broadcast chip type).

**TYPE D (audit):**  
Build Session List — re-scope any items found to be already done or newly scoped.  
Any doc where a gap was found — add a note at the top with the audit date and finding.

### Session end checklist addition

After smoke test passes and git push:
1. Open the relevant canonical doc(s) for this session type
2. Make the specific updates listed above
3. Do NOT create a new document — edit the existing one
4. The Drive ID in this table never changes


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
0. Read HANDOFF NOTE — Drive ID in canonical table below (first, before everything)
1. Read CI/DEPLOY ERROR REFERENCE — Drive ID: 1aX65p4C3BfeKtdbQPS32wFsm_bktCuaE
   Surface: sandbox constraints, deploy path, worker summary, secrets state
2. Declare: "SESSION START · Type: [A/B/C/D/E] · Scope: [one sentence]"
3. git pull && cp index.html /home/claude/index.html
4. node field_smoke.js   ← must be 0 failures before touching anything
5. Open relevant canonical doc for this session type
6. TYPE B only: write diagnosis (failure modes) before first code change
7. TYPE C only: write spec (inputs / outputs / call sites) before first code change
```

**Canonical docs** (open the relevant one before starting):
- Handoff Note (read first): `1tNiphm4FKqvBw-c8tqs0u_2FLc63Qd35` ← update this ID every session end
- CI/Deploy Error Reference (read every session): `1aX65p4C3BfeKtdbQPS32wFsm_bktCuaE`
- Build Session List: `1YMgcYTawnVB-QBa7jEZzOLnTfa5uThKi4j3TcNDQe9o`
- Daily Update Reference: `1n4fiAaU1uF2X7EKRx9Gm6XpuR6wkpwoa`
- Wow Features: `1h80BrgGXbz6aq3Hgv5LbjhpFkRQjYvd87fOMNJmVMOc`
- UI Evaluation: `1xIZnlczl2kIeslnnzJD1eJrgBu5iw6xgSk1wB1MVyAY`
- Standards (Drive): `1twYHSCalULEWE1XjKB5lUVDRK5lzUP-l`

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
| **Daily Update Reference** | `1n4fiAaU1uF2X7EKRx9Gm6XpuR6wkpwoa` | Any session that changes broadcast chip rules, thresholds, or update protocol |
| **Handoff Note** ← update ID every session | `1tNiphm4FKqvBw-c8tqs0u_2FLc63Qd35` | Every session end — replace ID with new handoff doc |
| **CI/Deploy Error Reference** | `1aX65p4C3BfeKtdbQPS32wFsm_bktCuaE` | When a new CI/deploy failure pattern is resolved |

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


---

## Rule 9 — Explicit session start and end

### Session start protocol (spoken, not just implied)

Every session opens with a typed declaration before any code is touched:

```
SESSION START
Type: [A / B / C / D / E]
Scope: [one sentence — what this session will accomplish]
Baseline: git pull + smoke test result
```

Example:
```
SESSION START
Type: B
Scope: Fix _weatherCache bug — weather drama bonus never fires
Baseline: 0/50 smoke failures, commit ef09989
```

Without this declaration the session has no defined scope, and scope
creep (the source of "too much being done at once") has no boundary.

**Before any code:**
1. `git pull && cp index.html /home/claude/index.html`
2. `node field_smoke.js` — must be 0 failures
3. Open relevant canonical doc for this session type
4. TYPE B: write diagnosis. TYPE C: write spec. Both in plain text before coding.

---

### Session end protocol (all steps required)

A session is not over until all five of these are complete:

**Step 1 — Code clean**
```
node field_smoke.js   ← 0 failures
git add index.html && git commit -m "[type prefix]: [description]"
git push origin main
cp index.html /mnt/user-data/outputs/sportworld.html
```

**Step 2 — Session documentation**
Write session doc to Drive. Plain text. Title format:
`FIELD App — [Date] Session Documentation`
Covers: what was done, commits, architecture changes, bugs fixed.

**Step 3 — Canonical doc updates (Rule 8)**
Edit the relevant living documents in place for this session type.
Do not create new versions.

**Step 4 — Handoff note**
Write the handoff as a **separate Drive doc** (not at the bottom of the session doc):

```
HANDOFF
Last commit: [hash]  File size: [KB]  Smoke: 0/50
Clean state: yes / no — [if no, what's unresolved]
In progress: [anything mid-flight or needs browser verification]
Next session should: [one concrete recommendation]
Blocked on: [anything requiring resolution before TYPE C work]
Watch for: [any known fragile state or timing dependency]
```

Title format: `FIELD App — [Date] Handoff Note`

**Step 5 — Update handoff ID in STANDARDS.md**
Replace the Handoff Note Drive ID in the canonical docs table and checklist
with the new doc's ID. Commit this change:
```
git add STANDARDS.md
git commit -m "Standards: handoff ID → [new_id]"
git push origin main
```
This is the mechanism that makes "Claude reads handoff automatically" actually work.
The ID in STANDARDS.md is always the latest handoff. No Drive search needed.

**Step 6 — State the close**
End the session with a typed declaration:
```
SESSION END
```

Nothing below that line is part of the session.

---

### Why this matters

The audit that produced Rule 1 found three features documented as
"working" that had never fired. All three were introduced in sessions
that mixed multiple session types. A typed scope declaration at the
start would have defined a boundary. A handoff note at the end would
have flagged "smoke-verified only — not browser-confirmed."

The handoff note is the most valuable minute of the session.
It converts implicit context into explicit state. The next session
should be able to start in under 60 seconds: read handoff, declare
type, pull, smoke. If the handoff note is missing, the next session
spends the first 10 minutes reconstructing state from docs.


---

## Rule 10 — Automation and enforcement: who does what

### What requires zero user action

**Pre-commit hook** (`scripts/setup.sh` installs it once after cloning):  
`git commit` automatically runs `field_smoke.js`. If any assertion fails,  
the commit is blocked. User cannot accidentally push broken code.  
Emergency bypass: `git commit --no-verify` — use only when absolutely necessary.

**Claude reads handoff automatically:**  
Every session, Claude reads the latest handoff note from Drive before  
responding to the opening message. No user request needed.

**Claude reads CI/Deploy Error Reference automatically:**  
Every session, Claude reads `1aX65p4C3BfeKtdbQPS32wFsm_bktCuaE`  
and surfaces the sandbox constraints, deploy path, worker architecture,  
and secrets state before any work begins. This prevents wasted time  
attempting blocked operations (api.github.com, *.workers.dev).

**Claude infers session type:**  
"Run daily update" = TYPE A. "Night Owl is broken" = TYPE B.  
"Build Social Contrarian" = TYPE C. "Audit journalism" = TYPE D.  
Claude states the inferred type and asks for confirmation if ambiguous.  
User never needs to say "TYPE B" — just describe what they want.

**Claude runs end sequence automatically on "document session":**  
1. Runs smoke test  
2. Pushes all changes  
3. Copies `sportworld.html` for download  
4. Writes session doc to Drive  
5. Writes handoff note to Drive  
6. Prompts for canonical doc updates  
7. Declares SESSION END  

### What requires one user action

**Opening message** — declares intent ("fix Night Owl", "daily update May 21").  
That's the session declaration. No type letter required.

**"Document session"** — triggers the full end sequence. Already established.

### What requires setup once

After cloning the repo, run either:
```sh
npm install          # preferred — runs prepare script automatically
```
or:
```sh
sh scripts/setup.sh  # alternative if not using npm
```

Both run `git config core.hooksPath scripts`, which tells git to read
hooks directly from `scripts/`. The hook file is committed to the repo,
so any future updates to `scripts/pre-commit` are automatically active —
no need to re-run setup.

This is a one-time step per machine. It cannot be fully eliminated because
git intentionally does not auto-run hooks from cloned repos (security boundary).

### What is never automated (requires human judgment)

- **Diagnosis** (TYPE B): Claude writes it, user reads and approves before coding starts.  
- **Feature spec** (TYPE C): Claude writes it, user confirms scope before coding starts.  
- **Canonical doc content**: Claude proposes updates, user reviews before Drive write.  
- **Session scope**: user's opening message defines what this session is for.  
  Claude cannot override that intent.


---

## Rule 11 — TYPE A sessions must read Daily Update Reference first

Before changing any data in a daily update, open the Daily Update Reference
(`1n4fiAaU1uF2X7EKRx9Gm6XpuR6wkpwoa`) and verify each of the
following. Do not update game data until every check passes.

### TYPE A verification checklist

**Smoke baseline**
```
node field_smoke.js   ← must be 0 failures before any data change
```
If failing: stop. This is now a TYPE B session.

**Broadcast chip rules** (read from Daily Update Reference):
- MLB GOTD: `peacockGOTD` and `espnGOTD` in `MLB_DAILY_OVERRIDES` — one or both, verified against
  peacocktv.com/sports/mlb and ESPN Press Room for today's date
- Apple Friday: 2 games → `MLB_APPLE`. FOX Saturday/Monday → `MLB_FOX`.
  TBS Tuesday → `MLB_TBS`. NBC/Peacock SNB Sunday → chip depends on date vs May 31.
- NBA broadcast rights (2025-26): ESPN/ABC, NBC/Peacock, Prime Video.
  TNT/truTV/Max are no longer NBA rights holders. `NBA_TNT` is deprecated.
- NHL broadcast rights: ESPN, TNT/truTV/Max, ABC/ESPN2 still active for NHL.

**EPL standings** (required before any EPL matchup note or brief):
- If any EPL game is in today's schedule: verify current table before writing
  any `matchupNote` referencing position, points gap, or relegation/European stakes.
- Source: BBC Sport, Sky Sports, or FD standings endpoint.

**Series records** — must reflect result of most recent game:
- Update `seriesRecord` on all active playoff series entries.
- Update `matchupNote` to reflect last game's result if it affects the narrative.

**Expired data removal**:
- Any `BETTING_LINES_FALLBACK_DATA` entry for a game already played → remove or mark past.
- Any `MEDIA_SPECIALS` entry for a series that has ended → remove.
- Any `buildTodaySchedule` entry with `confirmed:false` for a game already known → update.

**Smoke after data changes** (required before commit):
```
node field_smoke.js   ← must still be 0 failures after all changes
```

### Why this matters

The Daily Update Reference contains the rules Claude uses when writing
matchup notes, selecting broadcast chips, and verifying game data.
A TYPE A session that skips reading it produces data that is technically
present but violates the broadcast chip rules established in the reference —
wrong chips, missing GOTD flags, stale series records.
The check takes two minutes. It prevents having to fix data errors in
a follow-up session.


---

## Rule 12 — CI/Deploy Error Reference read at every session start

**Drive ID: `1aX65p4C3BfeKtdbQPS32wFsm_bktCuaE`**

Read this document before any code is touched in any session type.
Not only when something is broken — every session, every type.

### Why every session, not just on failure

The document contains facts that change how you approach a task,
not just how you debug a failure:

**Sandbox network constraints** — these are blocked from the Claude sandbox:
- `api.github.com` — no GitHub REST API calls
- `*.workers.dev` — no direct Worker calls (relay, proxy, deploy, live app)
- Trying to call these wastes 30+ minutes before realising the block.
  Knowing beforehand prevents attempting them at all.

**Canonical deploy path** — git push → GitHub Actions → Cloudflare CI (~19s).
This is the only deploy path available from the sandbox.

**5-worker architecture** — which worker does what, which secrets it holds.
Affects feature implementation decisions (e.g. secrets cannot be set on
Worker 1 — static host — they must go on Worker 2 or 3).

**GitHub secrets state** — DRIVE_FILE_ID deleted May 19. RESEND_API_KEY kept.
Not knowing DRIVE_FILE_ID was deleted led to CI failures #39–#45.

**Quick reference** — exact steps for every known failure type. Using it
takes 30 seconds. Debugging without it takes 30+ minutes.

### What to surface at session start (the critical facts)

Claude reads this document and states the following before any work:

```
SANDBOX CONSTRAINTS:
  Blocked: api.github.com, *.workers.dev
  Deploy path: git push → GitHub Actions → Cloudflare (~19s)
  Trigger autodeploy: push outbox/.trigger-autodeploy

WORKERS:
  W1 jubilant-bassoon  — static host (no env vars)
  W2 field-claude-proxy — AI journalism proxy (GEMINI_KEY, ANTHROPIC_KEY)
  W3 field-relay-nba   — data relay all sports (BDL_API_KEY, ODDS_API_KEY)
  W4 field-deploy      — OIDC deploy bridge (GITHUB_PAT, CI-only)

GITHUB SECRETS: DRIVE_FILE_ID deleted, RESEND_API_KEY active
SMOKE GATE: run BOTH smoke.js AND field_smoke.js before every push
```

### When to update this document

When a new CI/deploy failure is encountered and resolved:
- Add to the Incident Log with root cause and fix
- Update Quick Reference if the failure type is new
- Update Current Workflow State if a workflow changed
- Date-stamp the update at the top

Do not create a new version. Edit in place per Rule 8.


---

## Rule 13 — Code review gate: diff before commit, impact analysis before coding

### Diff review (before every commit)

Before running the smoke test and committing, read the full diff:
```sh
git diff          # unstaged changes
git diff --staged # staged changes (after git add)
```

Claude must explicitly flag before committing:
- Any variable that appears in the diff but is never declared in the file
- Any function removal where the function name still appears elsewhere
- Any change to a function called from more than one place
- Any new key/field name that doesn't match how it's read downstream

This is the cheapest quality gate. The `_weatherCache` bug would have
been visible in the diff — a reference to a name never declared anywhere.

### Impact analysis (before TYPE B fix or TYPE C spec)

Before writing a diagnosis (TYPE B) or spec (TYPE C), answer these:

```
Functions this change touches: [list]
For each function — who calls it? [list callers]
For each function — what does it return/write? [output contract]
Callers confirmed correct after change: yes/no for each
```

The espnScores._gameId fix touched 5 construction sites. The spec listed
them but didn't verify every downstream consumer. Impact analysis
would have surfaced whether getSmoothedDrama in injectDramaBadges
needed the same fix (it didn't — it used card.dataset.gameid correctly).

Add this as step 0 of every TYPE B diagnosis and TYPE C spec.

---

## Rule 14 — Data hygiene: expiry and cleanup triggers

### What expires and when

Each data category has an expiry condition. When the condition is met,
the entry must be removed or marked past — not left to accumulate.

| Data | Location | Expires when |
|------|----------|-------------|
| `BETTING_LINES_FALLBACK_DATA` entries | `buildTodaySchedule` | Game date has passed |
| `MEDIA_SPECIALS` series entries | `MEDIA_SPECIALS` | Series has ended |
| `MEDIA_SPECIALS` event entries | `MEDIA_SPECIALS` | Event date has passed |
| EPL matchday entries | schedule data | Season has ended |
| `MLB_DAILY_OVERRIDES` GOTD flags | `MLB_DAILY_OVERRIDES` | Date has passed |
| `confirmed:false` game entries | anywhere | Game date has passed without confirmation |

### Cleanup rule

TYPE A sessions must remove expired entries for dates before TODAY_ISO.
This is not optional — expired entries cause silent drift between what
the code says is playing tonight and what actually is.

Add to TYPE A verification checklist (Rule 11):
```
Expired data check: scan BETTING_LINES_FALLBACK_DATA, MEDIA_SPECIALS,
MLB_DAILY_OVERRIDES for entries with past dates. Remove them.
```

### Smoke assertion for data freshness

CI compliance-report already checks `confirmed:false` entries.
Add to field_smoke.js per-day config: verify TODAY_ISO matches the
date of the most recent schedule entry. If the most recent game date
is more than 2 days before TODAY_ISO, flag as stale schedule.

---

## Rule 15 — Session documentation template

Every session doc written to Drive must follow this structure.
A doc that doesn't include all required sections is incomplete.

```
FIELD App — [Date] Session Documentation

SESSION START
Type: [A/B/C/D/E]
Scope: [declared scope from session open]
Baseline: [last commit hash + smoke result]

=== PHASES / CHANGES ===

[For each commit or logical unit of work:]

PHASE N — [description] (commit [hash])
  What: [what was changed]
  Why: [root cause or user request]
  Files: [which functions/sections touched]
  Verified: smoke-only / browser-confirmed [date] [device]

=== COMMITS ===
[hash] — [message]
[hash] — [message]

=== ARCHITECTURE NOTES ===
[Any new globals, changed interfaces, data flow changes]

=== BROWSER-CONFIRMED PENDING ===
[List of features that are smoke-verified only, not yet
confirmed working in browser. Carries forward from last handoff.]

HANDOFF
Last commit: [hash]  File size: [KB]  Smoke: 0/N
Clean state: yes/no
In progress: [anything mid-flight]
Browser-confirmed pending: [list — same as section above]
Next session should: [one concrete recommendation]
Blocked on: [anything requiring resolution before TYPE C]
Watch for: [known fragile state]

SESSION END
```

The `Browser-confirmed pending` section is the mechanism for GAP 2.
It carries forward every session until a feature is confirmed or
a smoke assertion is added that would catch its failure mode.

---

## Rule 16 — Special case handling

### --no-verify bypass

`git commit --no-verify` is a last resort only. When used:

1. The commit message MUST include `[no-verify: reason]`
   Example: `"Fix: urgent typo [no-verify: smoke config needs update first]"`
2. A smoke-passing commit MUST follow within the same session
3. The bypass and reason MUST be noted in the session doc under PHASES

The pre-commit hook message already says "emergency bypass" — this rule
makes the documentation requirement explicit.

No bypass is permitted if:
- The reason is "smoke is failing and I don't know why" (fix the smoke)
- The reason is "I'll fix it later" (fix it now)

### Compound prompt changes follow TYPE C rules

Any change to `buildCompoundPrompt()` — new field, changed rule, new
game line format, updated max_tokens, new JSON key — is a TYPE C session.

Required before any compound prompt change:
1. Spec: what field/rule is changing, what output format changes
2. Impact: which downstream consumers read this field (dispatch code,
   session storage cache keys, FIELD Desk, bottom sheet rendering)
3. Smoke assertion: add a semantic assertion for the new field/rule
   if it could silently produce wrong output without being detectable

Compound prompt changes that skip this produce journalism bugs that
are invisible until the AI returns unexpected output at runtime.

---

## Rule 17 — Testing: unit tests and linting

### Unit tests (field_unit.js)

Pure functions with deterministic outputs must have unit tests.
File: `field_unit.js` in repo root. Run: `node field_unit.js`.
Add to CI alongside smoke.js.

Required test coverage (add as each function is confirmed stable):
- `trimToCompleteSentence(text)` — truncation, clean endings, empty input
- `preGameScore(game)` — known game objects produce expected score ranges
- `espnTeamMatch(espnName, fieldName)` — fuzzy match known pairs
- `buildH2HSummary(matchId)` — known H2H cache entries produce correct string
- `getDramaTrend(gameId)` — known history arrays produce correct delta

Test file structure:
```js
// field_unit.js — unit tests for pure functions
// Run: node field_unit.js
// Add a test when a function's contract is defined or a bug is fixed.
let pass = 0, fail = 0;
function test(label, fn) {
  try { fn(); pass++; console.log('✅', label); }
  catch(e) { fail++; console.error('❌', label, '—', e.message); }
}
function assert(condition, msg) { if(!condition) throw new Error(msg||'assertion failed'); }
// ... tests ...
console.log(`
Unit tests: ${pass} passed, ${fail} failed`);
if(fail > 0) process.exit(1);
```

### ESLint (no-undef rule)

Catches undefined variable references — the exact class of the
`_weatherCache` bug — at write time, not audit time.

Config: `.eslintrc.json` in repo root.
Run: `npx eslint index.html` (or add to package.json scripts).
Add to CI smoke job as a non-blocking warning initially,
then upgrade to blocking once false-positive baseline is known.

Minimum config:
```json
{
  "env": { "browser": true, "es2020": true },
  "rules": { "no-undef": "warn", "no-unused-vars": "warn" },
  "globals": { "allData": "readonly", "espnScores": "readonly" }
}
```

---

## Rule 18 — Runtime monitoring and browser-confirmed tracking

### Runtime error capture — IMPLEMENTED May 20 2026

`window._fieldErrors` is live in `index.html`:
- `window.onerror` and `unhandledrejection` write to it automatically
- `renderNightOwlRecap`, `renderFieldDesk`, `initFIELDBrief` catch blocks write to it
- `?debug=1` URL parameter shows a live panel: error list, card count, espnScores count

**`field_browser.test.js`** reads `window._fieldErrors` via Playwright after 15s load.
The browser-test CI job fails if `_fieldErrors` is non-empty.

Extend coverage: when adding a new critical path function, add to its outer catch:
```js
if(typeof window._fieldErrors !== 'undefined')
  window._fieldErrors.push({fn:'myFunction', err: e?.message||String(e), ts: Date.now()});
```

### Browser-confirmed pending list

Maintained in two places:
1. Session doc `BROWSER-CONFIRMED PENDING` section (Rule 15)
2. Handoff note `Browser-confirmed pending:` field

A feature stays on the list until:
- It is observed working in browser on Samsung Galaxy A36, OR
- A semantic smoke assertion is added that would catch its failure mode

Current pending list (as of May 20 2026):
- Night Owl on Android (Samsung Galaxy A36) — MutationObserver path
- FIELD Desk empty state when compound hasn't run at scroll time
- `_nightOwlRendered` filter-change guard (sport filter active at render)

When a feature is confirmed: remove from list, add comment in code:
```js
// browser-confirmed: 2026-05-21 Samsung Galaxy A36
```


# FIELD Development Standards

**Drive doc**: `14K-WPGsjoFLHq3ss9rKkgilDrRD8pfvf` — full rules, origin, history

---

## Enforcement

**Smoke test — three files (see Rule 32 → "Smoke Gate Architecture (2026-05-28)"):**
- `smoke.js` — structural assertions (feature/function presence). Run by CI + pre-commit. `node smoke.js index.html`. **BLOCKS every commit.**
- `field_smoke.js` — per-day **INVARIANTS** (render well-formedness; system-derived date, no answer-key). Run by pre-commit. `node field_smoke.js index.html`. **BLOCKS every commit. Cannot false-fail.**
- `field_smoke_daily.js` — per-day **SNAPSHOT ACCURACY** (exact slate counts/teams/networks). Run by the **daily-update workflow only**. `node field_smoke_daily.js index.html`. Does **not** block code/doc commits.

The pre-commit hook runs smoke.js + field_smoke.js + field_unit.js in sequence; any failure blocks the commit. Because neither smoke gate has a hardcoded answer-key, a correct commit never needs `--no-verify`.
Add a new named assertion in `smoke.js` for every FIELD_FEATURES entry (presence check minimum).

**Session type** — declare at session start. Types are mutually exclusive. No mixing.

**Feature freeze** — no TYPE C if Night Owl, ESPN polling, or compound prompt is broken.

---

## Session start checklist

```
0. Read HANDOFF NOTE — `HANDOFF.md` in repo root (read after git pull, before everything)
   0a. Read FIELD CURRENT STATE — Drive ID: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
       What FIELD is TODAY — features live, smoke state, active rules, known gaps.
       Read after handoff, before CI/Deploy ref. Takes 2 minutes. Prevents stale-state decisions.
   ⚠️  GEMINI QUARANTINE CHECK: if the handoff was produced by a Gemini session,
       STOP — do not proceed. See Rule 25. Run the 4-check audit first.
       Only use this handoff once it reaches CLEARED or PARTIALLY CLEARED status.
1. Read CI/DEPLOY ERROR REFERENCE — Drive ID: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
   Surface: sandbox constraints, deploy path, worker summary, secrets state
2. Declare: "SESSION START · Type: [A/B/C/D/E] · Scope: [one sentence]"
3. git pull && cp index.html /home/claude/index.html
4. node field_smoke.js   ← must be 0 failures before touching anything
5. Open relevant canonical doc for this session type
6. TYPE B only: write diagnosis (failure modes) before first code change
7. TYPE C only: write spec (inputs / outputs / call sites) before first code change
```

**Canonical docs** (open the relevant one before starting):
- Handoff Note (read first): `HANDOFF.md` (repo root — no Drive ID needed)
- CI/Deploy Error Reference (read every session): `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- Build Session List: `19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ`
- FIELD Current State: `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
- Master Improvement Ranking: `1rW90JQ5a4ybrE9l5acrbqd0q0yl_QYmPIOnEJr__GEY`
- Daily Update Reference: `1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E`
- Wow Features: `1QJCiwEav5VEofrdL4ba-jKsSMrcZq7EPdFehTMX-_i8`
- UI Evaluation: `1D98AsQqsNJSe0UKkVaRFrPO9SwDcdTMvS_Ll81kUVqo`
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
| **Build Session List** (Master backlog) | `19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ` | Every TYPE B/C session end — edit in place, never create a new version doc |
| *(Archive copies in Archive/ folder for major milestones only — not routine sessions)* | | |
| **Infrastructure Backlog (Tier 2)** | `1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw` | Any session that ships or scopes an infrastructure item — edit in place |
| **Wow Features** | `1QJCiwEav5VEofrdL4ba-jKsSMrcZq7EPdFehTMX-_i8` | Any session that implements or modifies a Wow item — edit in place, no version numbers |
| **UI Evaluation** | `1D98AsQqsNJSe0UKkVaRFrPO9SwDcdTMvS_Ll81kUVqo` | Any session with CSS, layout, or card design changes — edit in place, no version numbers |
| **Viewport Style Guide** | `1X_u98rkvqB4l6H5fYr1IiOZlLcZzap6cUDojgE85C2A` | Any session that changes section labels, font sizes, touch targets, or surface identifiers |
| **Master Improvement Ranking** | `1rW90JQ5a4ybrE9l5acrbqd0q0yl_QYmPIOnEJr__GEY` | Any session that ships a feature — add to FIELD_FEATURES registry with ship date |
| **FIELD Current State** | `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA` | Every session end — update HEAD, smoke state, and any changed capability sections |
| **Daily Update Reference** | `1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E` | Any session that changes broadcast chip rules, thresholds, or update protocol |
| **Handoff Note** | `HANDOFF.md` (repo root) | Every session end — overwrite file, commit with code |
| **CI/Deploy Error Reference** | `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20` | When a new CI/deploy failure pattern is resolved |

**The rule: edit the document, don't create a new one.**

**Known stale external reference (tracked gap):**
Architecture Index (`1SD5bjd1cZs1p7T4YyDJEpEEaJGUpc2V-Ux6zqUCvEU0`) still references
Build Session v7.2 and Master v29.1. Update in next TYPE D (audit) session.
The 8 Architecture docs remain valid for their content — only cross-reference
pointers are stale.  
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
Viewport Style Guide — if the feature introduces a new named surface, section identifier, or changes how intelligence is surfaced at any viewport. Check the Three Questions Test passes at each breakpoint.  
Master Improvement Ranking — add new FIELD_FEATURES entry with ship date.  
FIELD Current State — update the relevant capability section and HEAD/smoke state.  
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

**Step 1.5 — Unresolved questions check (required before Step 2)**
Before writing the session doc, scan the conversation for:
- Any question asked but not answered (e.g. "what does X mean?", "why is Y?")
- Any screenshot shared but not fully analyzed
- Any "let me check that" or "I'll look into that" that was never followed up
- Any open diagnostic — e.g. waiting on a console result that came back but wasn't actioned
- Any item flagged as "investigate later" or "deferred" that could be resolved now

If any unresolved items are found:
1. List them explicitly in chat before proceeding
2. Ask whether to resolve now or carry forward as OPEN items
3. Only proceed to Step 2 once the user has confirmed the disposition of each

This prevents diagnostic threads, deferred questions, and mid-session pivots from
disappearing into the session doc as silent OPEN items without the user's awareness.

**Step 2 — Session documentation**
Write session doc to Drive. Plain text. Title format:
`FIELD App — [Date] Session Documentation`
Covers: what was done, commits, architecture changes, bugs fixed.

**Step 3 — Canonical doc updates (Rule 8)**
Edit the relevant living documents in place for this session type.
Do not create new versions.

**Step 4 — Handoff note**
Overwrite `HANDOFF.md` in repo root with the handoff for the next session:

```
HANDOFF
Last commit: [hash]  File size: [KB]  Smoke: 0/50
Clean state: yes / no — [if no, what's unresolved]
In progress: [anything mid-flight or needs browser verification]
Next session should: [one concrete recommendation]
Blocked on: [anything requiring resolution before TYPE C work]
Watch for: [any known fragile state or timing dependency]
```

HANDOFF.md is committed with all other changes — no separate Drive doc
or ID update needed. `git pull` at next session start makes it available.

**Step 5 — Final commit and push**
Commit all changes (code + HANDOFF.md) and push:
```
git add -A
git commit -m "session end: [summary]"
git push origin main
```

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
Every session, Claude reads the latest handoff from HANDOFF.md (repo root) before  
responding to the opening message. No user request needed.

**Claude reads CI/Deploy Error Reference automatically:**  
Every session, Claude reads `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`  
and surfaces the sandbox constraints, deploy path, worker architecture,  
and secrets state before any work begins. This prevents wasted time  
attempting blocked operations (api.github.com, *.workers.dev).

**Claude reads FIELD Current State automatically:**  
Two sources, both read before any work begins:  
1. `FIELD-CURRENT-STATE.md` in the repo (auto-updated by CI — always reflects last deploy)  
2. Drive doc `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA` (full narrative version)  
No user request needed. The repo file gives HEAD/smoke/gaps. The Drive doc gives capability depth.

**Claude reads canonical doc IDs from GOVERNANCE.json:**  
Do not use hardcoded IDs from STANDARDS.md prose for get_file_metadata calls.  
Read from `GOVERNANCE.json` in repo root — this is the machine-verified source of truth.  
GOVERNANCE.json is checked by smoke assertions A141–A144 and updated by CI.

**Claude runs staleness check automatically (Rule 30):**  
After reading Current State, Claude calls get_file_metadata on each  
canonical doc whose staleness matters:  
  Wow Features:      `1QJCiwEav5VEofrdL4ba-jKsSMrcZq7EPdFehTMX-_i8`  
  UI Evaluation:     `1D98AsQqsNJSe0UKkVaRFrPO9SwDcdTMvS_Ll81kUVqo`  
  Master:            `1rW90JQ5a4ybrE9l5acrbqd0q0yl_QYmPIOnEJr__GEY`  
  Viewport Guide:    `1X_u98rkvqB4l6H5fYr1IiOZlLcZzap6cUDojgE85C2A`  
Any doc whose modifiedTime is >7 days behind HEAD commit date is flagged  
as potentially stale before work begins. Non-blocking — informational only.  
Docs exempt: Build Session List (always current), Current State (auto-updated),  
Handoff (replaced each session), CI/Deploy Ref (stable by design).

**Claude infers session type:**  
"Run daily update" = TYPE A. "Night Owl is broken" = TYPE B.  
"Build Social Contrarian" = TYPE C. "Audit journalism" = TYPE D.  
Claude states the inferred type and asks for confirmation if ambiguous.  
User never needs to say "TYPE B" — just describe what they want.

**Claude runs end sequence automatically on "document session":**  
1. Scans conversation for unresolved questions (Step 1.5) — lists any and confirms disposition  
2. Runs smoke test  
3. Pushes all changes  
4. Copies `sportworld.html` for download  
5. Writes session doc to Drive  
6. Overwrites HANDOFF.md in repo  
7. Updates canonical docs — two tiers:  
   AUTO (no prompting): FIELD Current State (every session — HEAD, smoke, changed sections)  
   AUTO if features shipped: Master Improvement Ranking FIELD_FEATURES registry  
   PROMPT for judgment: Build Session List, Wow Features, UI Evaluation,  
   Viewport Style Guide, Daily Update Reference (require context to update correctly)  
8. Commits all (code + HANDOFF.md) and pushes  
9. Declares SESSION END  

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
(`1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E`) and verify each of the
following. Do not update game data until every check passes.

### TYPE A verification checklist

**Smoke baseline**
```
node field_smoke.js   ← must be 0 failures before any data change
```
If failing: stop. This is now a TYPE B session.

**Broadcast chip rules** (read from Daily Update Reference):
- MLB GOTD: Auto-tagged from `ESPN_GOTD_SCHEDULE` and `PEACOCK_GOTD_SCHEDULE` lookup tables.
  ESPN: Paste full block when announced (~4x/year, from ESPN Press Room / FutonCritic).
  Peacock: Paste weekly schedule (Mon/Tue, from peacocktv.com/blog).
  No daily manual tagging needed — code matches today's date against tables.
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

**Drive ID: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`**

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

**CI-as-proxy escape hatch — reading results from blocked domains:**
`raw.githubusercontent.com` IS allowed from the sandbox. This enables a
general-purpose pattern for probing any domain the sandbox can't reach:

```
1. Write target URL to outbox/.trigger-cors-probe:
   echo "url=https://target.domain/path" > outbox/.trigger-cors-probe

2. Commit and push → triggers .github/workflows/cors-probe.yml
   The CI runner (GitHub Actions) is NOT egress-restricted.
   It curls the URL, writes headers + body preview to outbox/cors-result.txt,
   commits and pushes the result.

3. Read result ~35s later:
   curl https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/cors-result.txt

4. Interpret:
   access-control-allow-origin: *   → CORS-open, direct call works
   access-control-allow-origin: (absent/specific domain) → CORS-blocked, relay needed
   HTTP 4xx/5xx                      → endpoint unavailable or auth required
```

Use this for: CORS tests, API reachability checks, response structure inspection.
Confirmed working: May 21 2026 — Baseball Savant /gf endpoint (result: CORS-open, `*`).

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
  CORS/domain probe: push outbox/.trigger-cors-probe → read outbox/cors-result.txt via raw.githubusercontent.com

WORKERS:
  W1 jubilant-bassoon  — static host (no env vars)
  W2 field-claude-proxy — AI journalism proxy (GEMINI_KEY, ANTHROPIC_KEY)
  W3 field-relay-nba   — data relay all sports (BDL_API_KEY, ODDS_API_KEY)
  W4 field-deploy      — OIDC deploy bridge (GITHUB_PAT, CI-only)

GITHUB SECRETS: DRIVE_FILE_ID deleted, RESEND_API_KEY active
SMOKE GATE: pre-commit runs smoke.js (structural A1-A123) then field_smoke.js (per-day). Both must pass.
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
| `ESPN_GOTD_SCHEDULE` / `PEACOCK_GOTD_SCHEDULE` | Schedule tables | Block/week has passed |
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

=== BROWSER-CONFIRMED 1zOmxbcsTM66-CBWYGqx6ELllORCFmzPmelwb6_YcbdU
Session doc May 21: 1Rsy6dysrqhxxK_Y5M0a4qcw7HY2zWoKv5SL6p5gysKM ===
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


### Helpers in field_utils.js — use instead of inline patterns

These replace the most-duplicated patterns found in the May 20 audit:

| Function | Replaces | Count found |
|----------|---------|-------------|
| `teamNick(name)` | `(name\|\|'').split(' ').pop()` | 73× |
| `teamSlug(name, len, fromEnd)` | `toLowerCase().replace(/[^a-z]/g,'').slice(n)` | 12× |
| `teamSlugPair(home, away)` | inline `home6_away6` key construction | 3× |
| `stripJsonFences(text)` | `` .replace(/^```(?:json)?...`` | 3× |
| `extractJsonBlock(text)` | `.match(/\{[\s\S]*\}/)` | 3× |

**Rule**: before writing any of the above patterns inline, check field_utils.js first.

**Two slug strategies — documented:**
- `teamSlug(name, 6, false)` → first 6 chars — for cache keys (exact match)
- `teamSlug(name, 6, true)` → last 6 chars — for fuzzy `.endsWith()` matching
These are different operations. Using the wrong one creates silent key mismatches.

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
1. Session doc `BROWSER-CONFIRMED 1zOmxbcsTM66-CBWYGqx6ELllORCFmzPmelwb6_YcbdU
Session doc May 21: 1Rsy6dysrqhxxK_Y5M0a4qcw7HY2zWoKv5SL6p5gysKM` section (Rule 15)
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


---

## Rule 19 — Single-file architecture: decision, costs, and threshold

### The decision

`index.html` is a single-file deployment. One `git push` → 19s → live.
No bundler, no build step, no artifact management. For a solo project
with daily updates, this simplicity is worth the tradeoffs.

**This decision is intentional and not up for casual reversal.**
Any move toward a build step must clear the threshold below.

### Current state (May 20 2026)

| File | Size | Purpose |
|------|------|---------|
| `index.html` | ~841KB | All app logic, data, styles |
| `field_utils.js` | ~6KB | Pure utility functions (no globals) |
| `smoke.js` | ~14KB | Structural assertions A1–A123 (CI + pre-commit) |
| `field_smoke.js` | ~26KB | Per-day assertions (pre-commit only) |
| `field_unit.js` | ~5KB | Unit tests for field_utils.js |
| `field_browser.test.js` | ~5KB | Playwright browser tests |

### What `field_utils.js` solves

Pure functions (no global state, no side effects) now live in `field_utils.js`
and are loaded via `<script src="field_utils.js">` before the main script.

**What this unlocks:**
- `field_unit.js` uses `require('./field_utils.js')` — no more `new Function()` hacks
- ESLint and TypeScript tooling work naturally on `.js` files
- Dead code in utils is detectable by import analysis
- Adding tests for a new pure function takes 30 seconds

**Rule:** Pure functions belong in `field_utils.js`, not `index.html`.
When writing a new function with no global dependencies: write it in
`field_utils.js` first, then call it from `index.html`.

**What goes in field_utils.js** (pure — no globals, no side effects):
- String processing: `trimToCompleteSentence`, `parseMatchweek`
- Math/probability: `toImpliedNum`, `dramaTier`
- Team matching: `espnTeamMatch`
- Weather: `wxAlert`, `wxDescription`, `wxIcon`, `wxWindDir`, `wxBadge`
- Venue data: `isOutdoorVenue`, `getVenueCoords`
- Display helpers: `espnPeriodLabel`

**What stays in index.html** (impure — reads/writes globals):
- Any function that reads `allData`, `espnScores`, `selectedTz`, `wxCache`
- Any function that writes to `_fieldErrors`, `espnScores`, localStorage
- Any function that touches the DOM

### The size threshold

`index.html` currently grows ~30KB per 10 days of active development.
At that rate it crosses 1MB in ~2 weeks.

**When `index.html` exceeds 1MB:**
A build step becomes required before any new TYPE C (feature) work.

The minimum build step is a shell script — not webpack, not a bundler:
```sh
# scripts/build.sh — concatenate source files into index.html
cat src/head.html src/styles.css src/utils.js src/app.js src/tail.html > index.html
```

This preserves single-file deployment while enabling module-level
organisation. The `git push` workflow doesn't change — only the
source file structure does.

**Do not reach 1MB without a build plan.** Audit the file for dead code
and data staleness first (Rule 14) — the growth rate is partly from
accumulating expired schedule entries, stale BETTING_LINES_FALLBACK_DATA,
and past MEDIA_SPECIALS. Cleaning those should recover 20-30KB before
any architectural change is needed.

### What the single file costs (documented honestly)

1. **Unit testing is second-class without field_utils.js** — functions
   that reference globals cannot be tested in isolation. This is
   structural, not fixable without modules or dependency injection.

2. **ESLint fires false positives on browser globals** — `.eslintrc.json`
   needs a manually-maintained `globals` list. In a `.js` file,
   `/* global document */` handles this cleanly.

3. **Dead code requires manual audit** — there's no import graph.
   `field_unit.js` and the TYPE D audit process are the substitutes.

4. **Documentation loses locality** — "where is Night Owl?" requires
   grepping 800KB. A `src/journalism/night-owl.js` file would be
   self-documenting. Session docs compensate but shouldn't have to.


---

## Rule 20 — Duplicate inline pattern standard

### What the pattern audit found (May 20 2026)

192 regex uses in index.html broke into four structural issues — not a
regex problem, a duplicate inline pattern problem expressed as regex.
The same was true of non-regex patterns:

| Pattern | Count | Now |
|---------|-------|-----|
| `.split(' ').pop()` — team last word | 73× | `teamNick(name)` |
| `toLowerCase().replace(/[^a-z]/g,'').slice(n)` | 12× | `teamSlug(name, len, fromEnd)` |
| `` replace(/^```(?:json)?...`` `` AI fence strip | 3× | `stripJsonFences(text)` |
| `.match(/\{[\s\S]*\}/)` — find JSON block | 3× | `extractJsonBlock(text)` |
| `AbortSignal.timeout()` every fetch | 39× | `fieldFetch(url, options)` |
| `(allData?.sports\|\|[]).forEach` nested | 32× | `forEachGame(fn)`, `allGamesFlat()` |
| `g.streams?.[0]?.label` | 13× | `gameNetwork(g)` |
| `new Date(iso).getTime() ± n*60*1000` | 13× | `shiftTime(iso, minutes)` |
| `Object.values(espnScores).find(...)` | 10× | `findEspnEntry(game)` |
| `preGameScore sort + ATP filter` | 4× | `rankGamesByDrama(games)` |
| `localStorage.getItem('field_drama_peak_'...)` | 4× | `getDramaPeak(gameId)` |

### The ongoing standard

**Before writing any inline pattern, check if a helper exists.**

Helpers in `field_utils.js` (pure — importable in Node tests):
- `teamNick`, `teamSlug`, `teamSlugPair`
- `stripJsonFences`, `extractJsonBlock`
- `shiftTime`, `gameNetwork`

Helpers in `index.html` utility block (need globals):
- `fieldFetch`, `forEachGame`, `allGamesFlat`, `findGameById`
- `getDramaPeak`, `findEspnEntry`, `rankGamesByDrama`

**When to add a new helper:**
A pattern warrants a helper when:
1. It appears 3+ times across the codebase, OR
2. It has varying fallback behaviour across sites (gameNetwork fallbacks),
   OR it uses a non-obvious key format (teamSlug two-strategy rule), OR
3. It is testable in isolation — add it to field_utils.js + field_unit.js

**Two slug strategies — don't mix them:**
- `teamSlug(name, 6, false)` → first 6 chars — for cache key construction
- `teamSlug(name, 6, true)` → last 6 chars — for `.endsWith()` fuzzy matching
Using the wrong one creates silent key mismatches (the bug this pattern
was introduced to fix).

### TYPE D audit checklist for patterns

Add to every TYPE D (audit) session:
```
grep -c "split(' ').pop()" index.html       # should use teamNick
grep -c "streams?.\[0\]?.label" index.html  # should use gameNetwork
grep -c "AbortSignal.timeout" index.html    # should use fieldFetch
grep -c "allData?.sports" index.html        # should use forEachGame/allGamesFlat
```

If count > 3 for any pattern not yet in the helper table, it's a
candidate for extraction. Add to field_utils.js or index.html utility
block as appropriate, then write a unit test.


---

## Rule 21 — Upstream discipline: naming, inventory, and the check-first standard

### The three upstream causes of duplicate inline patterns

**1. No ubiquitous language** — domain concepts without canonical names get
re-implemented independently. The fix: when writing ANY domain operation,
name it first. Write the function, put it in field_utils.js (pure) or the
index.html utility block (needs globals), then call it everywhere.

**2. No function inventory** — 286 functions in 800KB with no catalog makes
re-invention the path of least resistance. The fix: `npm run inventory`.
Run it at the start of any session where you're writing a new operation
that touches team names, game data, live scores, or drama history.

**3. Session type mixing suppresses abstraction** — patch mode rewards
inline code. Rule 1 (session type discipline) addresses this directly.

### The check-first standard

Before writing ANY inline pattern involving:
- team name normalization or matching
- game network / broadcast label
- time arithmetic on ISO strings
- allData traversal
- ESPN scores lookup
- drama history access
- AI response parsing

Run `npm run inventory`. If the operation exists: call it.
If it doesn't: add it to field_utils.js or the utility block first,
write a unit test, then call it.

The 73 `.split(' ').pop()` instances accumulated because no one ran
this check. The standard makes the check structural.

### Where field_utils.js lives

`<head>` — loaded before everything else. This communicates architectural
meaning: field_utils.js is the vocabulary. It exists before the app.

Because it loads first:
- All inline `onclick` handlers can call its functions safely
- The main `<script>` block always has access to all helpers
- Developers reading index.html see the `<script src>` in `<head>` and
  know to look at field_utils.js before writing domain operations

### field_utils.js organization (six domain sections)

```
TEAM NAMES        teamNick, teamSlug, teamSlugPair
GAME/SCHEDULE     gameNetwork, shiftTime, parseMatchweek, espnPeriodLabel
VENUE/WEATHER     isOutdoorVenue, getVenueCoords, wxAlert, wxDescription,
                  wxIcon, wxWindDir, wxBadge
PROBABILITY       toImpliedNum, dramaTier
TEXT/AI           trimToCompleteSentence, stripJsonFences, extractJsonBlock
MATCHING          espnTeamMatch
```

All functions have JSDoc comments with:
- What it does (one line)
- What it replaces (the pattern it supersedes)
- Parameter types and return type
- Known bugs fixed or gotchas

### Adding a new function to field_utils.js

1. Determine: pure (no globals) → field_utils.js, needs globals → utility block
2. Write the function with full JSDoc — name the concept, document the contract
3. Add a unit test in field_unit.js
4. Add to the `module.exports` block
5. The inventory updates automatically on next `npm run inventory`
6. Replace any existing inline copies in index.html with the new function

### Adding a new function to the index.html utility block

Same as above but:
1. Place in the utility block near scheduleRenderAll (marked with banner comment)
2. No module.exports needed
3. Document why it can't be in field_utils.js (what global it accesses)


---

## Rule 22 — Auto-session management (no user prompting required)

Claude handles session lifecycle automatically. The user never needs to
say "start a session", "end the session", "write the session doc", or
"switch session types". These happen without prompting.

### Session type inference at conversation open

Claude reads the opening message and declares SESSION START before
any work begins. No user specification needed.

| Opening message pattern | Session type |
|------------------------|-------------|
| "Run the daily FIELD update for [date]" | TYPE A |
| "Fix [bug]" / "something is broken" / "[feature] isn't working" | TYPE B |
| "Build [feature]" / "add [thing]" / "implement [spec]" | TYPE C |
| "Audit [topic]" / "compare [code vs docs]" / "what's the gap" | TYPE D |
| "Clean up" / "remove" / "refactor" / "extract" | TYPE E |

If the type is ambiguous, declare the most conservative interpretation
(TYPE B over TYPE C — diagnose first) and state the assumption.

### Session end without prompting

When work appears complete — commits pushed, smoke passing, user
changes topic or signals "done" — Claude runs the full end checklist
immediately, without being asked:

```
1. Scan conversation for unresolved questions (Step 1.5) — list and confirm disposition
2. Write Rule 15 session doc to Drive
3. Overwrite HANDOFF.md in repo root
4. Update canonical docs:
   AUTO: FIELD Current State (every session) + Master FIELD_FEATURES (if features shipped)
   PROMPT: Build Session List, Wow Features, UI Evaluation, Viewport Style Guide, Daily Update Ref
5. Commit all (code + HANDOFF.md + any doc updates) and push
6. Declare SESSION END in chat
```

Triggers that indicate "done":
- User asks about a different topic (non-FIELD or different session type)
- User says "that's it", "done", "all good", "looks good"
- User asks a question answered by the work just done
- User asks "what should we do next?"

### Session switching without prompting

If work of a different type arrives mid-session, Claude closes the
current session before starting the new one. Silently switching types
is never permitted — each type has different constraints and checklists.

Example sequence when user asks to audit something mid-feature build:
```
[Claude]: Running session end for TYPE C...
[writes session doc, overwrites HANDOFF.md, commits]
SESSION END · Type: C

SESSION START · Type: D · Scope: [audit scope]
[reads CI/Deploy ref, smoke check, begins audit]
```

### What cannot be automated

Claude cannot act between conversations. The automation only covers
within-conversation detection and handling. The memory rules (memory
entries #19, #20, #21) carry the protocol to the next conversation so
Claude opens correctly without prompting.

If a conversation ends abruptly (no SESSION END declared), the next
conversation's Rule 22 automation will detect the missing session end
from the handoff note and run the close procedure before starting new work.


---

## Rule 23 — SW_VERSION must be bumped in every index.html commit

SW_VERSION is a date constant in index.html used to bust the service worker
cache for returning users. It must match today's date on every deploy.

**Rule:** Any commit that changes index.html must set SW_VERSION to today's
date in YYYY-MM-DD format. TYPE A daily update sessions do this automatically.
TYPE B/C/E sessions touching index.html must also bump it.

```javascript
const SW_VERSION = 'YYYY-MM-DD';  // ← must match deploy date
```

The pre-commit hook does not currently enforce this. Failure mode: a non-TYPE-A
deploy leaves SW_VERSION showing a past date. Users who open the app after the
deploy may see "SW_VERSION: STALE" in the daily brief health check.

Until the hook enforces this, verify SW_VERSION = today's date before every
`git push` that includes index.html changes.


---

## Rule 24 — Execution path contracts for live-data consumers

### The class of bug this rule prevents

A function can be fully built, smoke-verified, and browser-invisible — if it reads
poll-cycle data but is never wired into the polling loop.

The canonical example: `injectDramaBadges()` was built May 11 2026. Every function
it depends on exists. Every feature it drives is registered. The smoke assertion for
`drama-score-live` passes. And yet drama badges never updated during live games —
because `injectDramaBadges()` was never called from `renderESPNScores()`.

The async guard that was added (`if(Object.keys(espnScores).length) { injectDramaBadges() }`)
always evaluated false because `fetchESPNScores()` was not awaited before it ran.
That silent failure was never caught because:
  1. The sandbox has no live ESPN polling — the condition was always false and unnoticed
  2. The smoke assertion confirmed the function exists, not that it's called
  3. Naive string search for "is injectDramaBadges near renderESPNScores?" returns
     True — a false positive caused by fetchSchedule() following immediately
     and containing its own injectDramaBadges call

### What is a live-data consumer?

A **live-data consumer** is any function that:
  - Reads `espnScores`, `_oddsCache`, drama arc history, relay data, or any
    value written by a polling function
  - AND renders a result to the DOM or writes to localStorage/sessionStorage
  - AND is expected to update while the user has the app open

Examples: `injectDramaBadges`, `renderOneToWatch`, `detectAndRenderDoubleFeature`,
`renderWatchWindow`, `renderScoreTicker`, `injectWeatherBadges`, `evaluateEMBER`.

Non-examples: `buildCompoundPrompt` (called explicitly, not on a polling cycle),
`renderAll` (re-render from allData, not from live poll state).

### The trigger chain contract

Every live-data consumer must have a documented **trigger chain** — the unbroken
synchronous call path from the polling function that refreshes the data to the
consumer that reads it.

```
trigger chain format:
  [data source] → [fetch fn] → [render fn] → [consumer fn]

example (after fix):
  espnScores ← fetchESPNScores() → renderESPNScores() → injectDramaBadges()
```

The trigger chain must be verified by reading the **function body**, not by string
search. Naive string search is unreliable because adjacent functions can produce
false positives (the `renderESPNScores` / `fetchSchedule` example above).

### Call-site smoke assertion (brace-safe)

For every live-data consumer, add a semantic assertion that verifies the call site
exists inside the correct trigger function body. Use this pattern:

```javascript
// Correct pattern: anchor between a known-preceding and known-following landmark
// within the trigger function, not just searching the whole file.
assert('A_NEW — injectDramaBadges wired to renderESPNScores',
  (() => {
    const renderStart = html.indexOf('function renderESPNScores');
    const renderEnd   = html.indexOf('checkForNewFinals', renderStart);
    // renderEnd is the last known call in renderESPNScores body
    // injectDramaBadges must appear between these two anchors
    return renderStart > 0 && renderEnd > renderStart &&
           html.lastIndexOf('injectDramaBadges', renderEnd) > renderStart;
  })()
);
```

**Never use**: `html.slice(html.indexOf('function X'), html.indexOf('\nfunction ', ...))`
This produces a false positive whenever the next function in the file happens to call
the function you are testing. Only brace-tracked extraction or landmark-anchored search
is reliable.

### When this applies

**TYPE C sessions** that build a live-data consumer must, before closing:

1. State the trigger chain explicitly in the TYPE C spec:
   `trigger chain: fetchESPNScores → renderESPNScores → [new function]`

2. Add the function call at the correct trigger site (e.g. end of `renderESPNScores`)

3. Add a call-site smoke assertion using the landmark-anchor pattern above

4. Verify in browser that the consumer updates on each poll cycle
   (not just that it runs once on page load)

**TYPE D audits** of live-data consumers must run the brace-tracked check:

```javascript
// field_smoke.js check for any live-data consumer under audit
const fnStart = html.indexOf('function renderESPNScores');
const fnEnd   = html.indexOf('\n}', html.indexOf('checkForNewFinals', fnStart));
const body    = html.slice(fnStart, fnEnd);
assert('consumer wired to trigger', body.includes('consumerFunctionName'));
```

### The async corollary

Do not use fire-and-forget async calls as a substitute for correct wiring:

```javascript
// WRONG — fetchESPNScores is async, espnScores is empty when this runs
fetchESPNScores();
if (Object.keys(espnScores).length) { injectDramaBadges(); } // always false

// CORRECT — injectDramaBadges is called from inside renderESPNScores()
// which is called from fetchESPNScores() after data is populated
```

If a function must run after an async operation completes, it must be called
synchronously inside that operation's completion handler — not speculatively
before the operation has had a chance to run.


## Rule 25 — Gemini session handoffs are quarantined until audited

Any session document, handoff note, or commit produced by a Gemini-model
session (identifiable by proxy model reference, session doc authorship, or
commit author metadata indicating non-Claude origin) is **QUARANTINED** and
must not be treated as a trusted source until a rigorous audit has been
completed.

### What quarantine means

A quarantined handoff must NOT be used as the session-start reference.
Claude must NOT act on its OPEN items, architecture decisions, code
descriptions, or stated "current state" without independent verification.

Quarantined content is treated as **untrusted input** — the same way an
external PR from an unknown contributor would be reviewed before merging.

### How to identify a Gemini handoff

- Session doc title includes "Gemini" or model attribution
- Commit author is `field-deploy` or `FIELD Deploy` on a non-standard commit
- Handoff references features, commits, or IDs that cannot be verified in
  the repo (`git show HASH` returns nothing or wrong content)
- Session doc describes architectural decisions with no corresponding smoke
  assertion or commit hash
- Drive doc was written in a different style (more verbose, different
  section structure, uses `"""` instead of `---` delimiters)

### The required audit before lifting quarantine

Before a quarantined handoff can be used, run all four checks:

**1. Commit verification**
Every commit hash cited in the session doc must exist and match its
described purpose:
```bash
git show HASH --stat   # must exist and describe what the doc says it does
```

**2. Code state verification**
Every feature the doc claims is "built" must be confirmed in index.html:
```bash
grep -n "functionName\|CONSTANT_NAME" index.html   # must exist
node smoke.js && node field_smoke.js               # must pass
```

**3. Architecture claim verification**
Every relay route, worker secret, or CI workflow change described must be
confirmed against the actual files:
```bash
grep "route\|secret\|SECRET" .github/workflows/*.yml src/index.js
```

**4. No invented patterns**
If the doc describes a coding pattern not found in STANDARDS.md and not
verifiable in prior Claude sessions, treat it as invented. Do NOT implement
it. Flag it explicitly in the audit report.

### Audit output

Write a Drive doc titled:
`FIELD — Gemini Handoff Audit — [Date] — [QUARANTINED / CLEARED]`

Status must be one of:
- **CLEARED**: all four checks passed, handoff can be used
- **PARTIALLY CLEARED**: some items verified, list of remaining quarantined claims
- **REJECTED**: critical fabrications found, handoff must not be used, roll
  back any commits it produced

Until the audit doc exists and reaches CLEARED or PARTIALLY CLEARED status,
the previous confirmed-clean Claude handoff is the authoritative session start
reference.

**Standing audit record (May 21 2026):** Three Gemini docs audited, all REJECTED.
Audit doc: `1bquWt4FD9-A_07XA2Z3O4Bih_u3kgveEXJ_qAlc-a7o`
Rejected: `1rn6W7bnk9nhIiT0f3cUNPjlFT6UkyL7oz_69DzgUt9o` (Part 1 Architecture),
`1hX4dY8v8FgEi_j988klSA9wfWLHeuC0ycYpgoCjpzBI` (Part 2 Dev Specs),
`1QJu4LpSSrH8kFC2QIyDd3m9S-1vWwuqi` (May 18 Completion Handoff).

### Why this rule exists

Gemini may produce plausible-sounding but fabricated commit hashes, feature
descriptions, or architectural decisions. A quarantined handoff that gets
acted on without audit can silently corrupt the FIELD codebase — changes
built on a false baseline are harder to debug than a clean failure.

The cost of a 15-minute audit is always lower than the cost of unwinding
work built on a fabricated foundation.

## Rule 26 — Feature naming conventions

FIELD uses a consistent naming framework for canonical architectural layers.
Names signal what a feature *does* architecturally, not just what it's about.

### Naming patterns

**[X] Engine** — multi-input computation that produces a structured state
object consumed by multiple features. Complex logic, many inputs, one
canonical output. Example: Story Engine (computeGameNarrative), Watch Engine
(computeWatchValue).

**[X] Classifier** — classification utility that takes an input and returns
flags or categories. Single-purpose, no side effects. Example: Sport
Classifier (classifySport → { isNBA, isSoccer, isAFL, … }).

**[X] Authority** — canonical lookup from known data that returns a resolved
value. Replaces repeated inline derivations with a single source of truth.
Example: Broadcast Authority (resolveGameBroadcast → { isFreeOTA, isNational, … }).

**Pipeline** — a composable sequence of stages where each stage consumes the
previous stage's output. The pipeline runner function is enrichGame().
Individual stages keep their own Engine/Classifier/Authority names.

### When to apply

Before naming a new feature, ask:
- Does it compute a complex state from multiple inputs? → Engine
- Does it classify/categorize something? → Classifier
- Does it look up a canonical value from known data? → Authority
- Does it combine multiple of the above sequentially? → Pipeline stage

### Reference

Game Intelligence Pipeline spec: 1HPd4VIk4Py35iUMSXZ9D__I_1UetpiK0YoAL8Sr4et4
Build Session List v7.6: 1Drrp5eRNdGb8EKodqPNwpuLaC23XcOrlv4DO13zNot0

## Known Issue — classifySport() isConferenceFinals false negative

**Filed: May 21 2026 · Fix in Session B (Broadcast Authority) or next TYPE B**

`classifySport()` builds `sp` via:
```
const sp = (game._sport || game._section || game.league || ...).toLowerCase();
```

Due to `||` short-circuit, when `game._sport = "NBA Playoffs"` is truthy,
`game.league` (which contains "East CF G2", "ECF", "WCF", etc.) is never
evaluated. `isConferenceFinals` therefore returns false for NBA/NHL CF games.

**Workaround in place:** `buildLifeStageContent()` isBigNote and
`fetchCompoundEditorial()` isBig both test `game.league` directly, bypassing
`classifySport()` for this check. All existing consumers are correct.

**Proper fix:** In `classifySport()`, test `isConferenceFinals` against
both `sp` AND `game.league` independently:
```javascript
const isConferenceFinals = /conference finals|cf g\d|wcf|ecf|.../i.test(sp)
  || /conference finals|cf g\d|wcf|ecf|.../i.test((game.league||'').toLowerCase());
```

## Rule 27 — 3-Tier Update Architecture

FIELD uses three distinct data delivery tiers. Choose the right tier
by urgency — never solve a Tier 3 problem with faster Tier 2 polling.

**Tier 1 — Background Pull (~60s)**
  Use for: standings, schedules, pre-game data
  Model: setInterval / batch polling
  Story Score impact: none

**Tier 2 — Game-State Pull (~15-30s, tempo-adjusted)**
  Use for: live score updates across all active games
  Model: tempo-adjusted polling (built May 18)
  Story Score impact: scoreline + statusLine updated each cycle

**Tier 3 — Event Push (~1-2s)**
  Use for: lead changes, game-end events — anything that flips
           Story Score direction or triggers Night Owl
  Model: SSE / EventSource (AFL: sse.squiggle.com.au)
  Story Score impact: near-instant direction flip + score-flash

**Key principle:** don't poll faster — subscribe smarter.
Polling faster than 15s for all games causes battery drain,
CPU churn, DOM thrash, and rate-limiting. Event push handles
the small subset of high-urgency events cleanly.

**AFL SSE** is the proof-of-concept (Update Architecture S1).
Once validated, NBA/NHL/MLB follow via relay (Update Arch S4).

**FIELD Event Bus:** fieldEvents = new EventTarget() — browser-native, ~30 lines.
Event types: field:score / field:lead_change / field:final / field:halftime
Emitters adapt sources (SSE, poll-detected change) → Subscribers get events.
Deduplication on (gameId, scoreline) prevents double-render.
O(sports + consumers): new sport = one emitter, new feature = one subscriber.

Reference: Update Architecture Spec v3: 1YVXFmsUblQJvQA8KtKwtrcI08vWZh5n-uokMaCLJSlM
Build Session List v7.8: 1Drrp5eRNdGb8EKodqPNwpuLaC23XcOrlv4DO13zNot0
SSE Research doc: 1uNl5ua8LHXBJfG_U6DLyGrNQfVt54HhGoiPNuY0Q_PA

## Rule 28 — Intelligence-Action Pairing

**The principle:** Intelligence and action are two halves of the same feature.
Shipping intelligence without the action path is shipping the promise without the delivery.

**The pattern FIELD must avoid:**
Building the "here's what's happening" layer and deferring the
"here's what to do about it" layer to a dependency or a later session.

Examples of the gap:
  - OTW FIRE state showed drama for weeks without a Watch button
  - Betfair intelligence built but never deployed (BETFAIR_RELAY_ENABLED=false)
  - Night Owl recap built; morning-after email never triggered
  - Push notifications specced without requiring watchUrl in the payload

**The test before shipping any intelligence feature:**
Ask: "What action does this intelligence enable?"
If the action requires unbuilt infrastructure, that infrastructure
is a PREREQUISITE of the feature, not a downstream nice-to-have.

**The rule:**
1. When speccing a new intelligence feature, the spec must include
   the action path or explicitly identify it as a bundled build.
2. When building a new intelligence feature, the action path must
   be built in the same session or the immediately following one.
   It may NOT be deferred to Tier 4 or listed as "after Pipeline X."
3. When auditing: if intelligence is built and action is not,
   the action item is promoted to the same tier as the intelligence
   and treated as incomplete work, not future work.

**The audit test for existing features:**
  "Built" means BOTH the intelligence AND the action path are live.
  If only the intelligence shipped, the feature is 50% complete.

**Immediate implications (Rule 28 audit, May 21 2026):**
  OTW FIRE state: 50% complete — Pipeline B + Watch button is the other half
  Night Owl recap: 50% complete — morning-after email is the other half
  Betfair intelligence: 50% complete — deployment is the other half
  Push notifications: must include watchUrl in payload or it's 50% on arrival

Reference: Intelligence-Action Audit May 21 2026
  (written following gap analysis observation that OTW Watch button
  and OTW FIRE state were separate features when they are one)


## Rule 29 — Viewport Style Guide: design contracts per breakpoint

**Drive ID: `1X_u98rkvqB4l6H5fYr1IiOZlLcZzap6cUDojgE85C2A`**

Read this document before any TYPE B/C session that changes CSS, layout,
section labels, surface identifiers, font sizes, touch targets, or the
intelligence layer architecture at any viewport.

### The core principle

Each viewport is a different information contract, not a scaled version
of the same layout. The primary question a user is asking when they open
FIELD differs by viewport:

  360px — "Is anything live right now? Can I watch it?" (20 seconds, scan mode)
  393px — "What's on tonight? What should I watch?" (30-60 seconds, browse mode)
  820px — "Full picture — what's the drama level, what do I need?" (5-10 min)
  1200px — "Give me everything, I'm here for the session." (long, deep mode)

Every visual decision — size, density, surface identifier prominence,
touch target, intelligence layer architecture — flows from that contract.

### The Three Questions Test (gate check)

Before declaring any CSS/layout change complete, verify that a user
can answer their viewport's three questions by visual scan alone
(no reading, no tapping) within the time budget:

  360px (3 seconds at arm's length):
    1. Is anything live right now?
    2. What is it?
    3. Can I watch it for free?

  820px (5 seconds at reading distance):
    1. What's the best game live right now?
    2. What are all of tonight's games?
    3. What's on free or on my services?

  1200px (8 seconds at monitor distance):
    1. What's the full tonight picture?
    2. What are the series standings / stakes?
    3. What should I prioritize?

If the answer to any of these requires a tap to reveal, the layout has not
met its contract. The feature is not done.

### Minimum surface identifier sizes (enforcement)

Surface identifiers — "One to Watch", "Night Owl", "FIELD Brief",
"Watch Free Tonight", "Coming Up" — are headings, not labels.
They must be readable at each viewport's viewing distance.

  360px (arm's length, ~25cm):  .88rem, Barlow 700, no letter-spacing
  393px (arm's length, ~30cm):  .85rem, Barlow 700, no letter-spacing
  820px (reading distance, ~45cm): .80rem, Barlow 700, no letter-spacing
  1200px (monitor, ~65cm):      .75rem, Barlow 700, no letter-spacing

Current minimum (as of May 22 2026): .52rem — below body text.
Section identifiers must not be smaller than body text.
Body text is ~.72-.74rem. Section identifiers must meet or approach it.

### Surfaces that currently have no label (as of May 22 2026)

  Watch Window (#watch-window)       → needs "Coming Up" header
  Arbitrage bar (#field-arb, left)   → needs "Watch Free Tonight" header
  Context pill (ambient panel)       → needs "Season Context" micro-label

These are [LAYER3-EXT] F19 / MOBILE-INTEL-A implications. Any session
that touches these surfaces must add the missing header as part of the work.

### Viewing distance rule

Section identifier sizes do not scale linearly with viewport width.
They scale with viewing distance. Phones are held closer than monitors.

  At 360px / 25cm: .88rem minimum (nearly body text size)
  At 1200px / 65cm: .75rem acceptable (standard desktop label size)

This is counterintuitive — the smaller device needs LARGER relative
labels, not smaller ones. The audit found FIELD uses .52rem at all
viewports, which is unreadable at arm's length.

### What triggers an update to the Viewport Style Guide

- New named surface added (any viewport)
- Intelligence layer architecture changed (e.g. ambient panel moved to phone)
- Touch target requirements changed
- Font stack or typeface changed
- New breakpoint introduced
- Three Questions Test requirements revised

When updating: edit the Drive doc in place (Rule 8 — never create a new version).
Date-stamp the change at the top of the doc.


## Rule 30 — Drive folder hygiene and staleness detection

### Staleness detection (automated at session start)

Claude checks modifiedTime for each canonical doc whose staleness matters
using get_file_metadata immediately after reading Current State.

Docs checked (IDs current as of May 22 2026):
  Wow Features:         `1QJCiwEav5VEofrdL4ba-jKsSMrcZq7EPdFehTMX-_i8`
  UI Evaluation:        `1D98AsQqsNJSe0UKkVaRFrPO9SwDcdTMvS_Ll81kUVqo`
  Master:               `1rW90JQ5a4ybrE9l5acrbqd0q0yl_QYmPIOnEJr__GEY`
  Viewport Style Guide: `1X_u98rkvqB4l6H5fYr1IiOZlLcZzap6cUDojgE85C2A`

Staleness threshold: 7 days behind HEAD commit date.
Flag format: "[DOC NAME] last updated [date] — HEAD is [date]. Features shipped
since then may not be reflected."

Non-blocking — informational. The flag surfaces before work begins so the
session can decide whether updating the doc is required for this session type.

Docs exempt from staleness check:
  Build Session List — always current (every session)
  FIELD Current State — auto-updated (every session end)
  Handoff — replaced each session by design
  CI/Deploy Reference — stable, updates only on new CI failure patterns

### Orphaned doc policy

When a permanent-ID replacement is created for a versioned doc, the original
versioned doc must be copied to the FIELD — Archive folder within the same
session. The root Drive folder is for active canonical documents only.

Archive folder: `1MOug44aTMM2gJLI0hj_pMjW0ZMzQ7wPe`

Archival naming convention: "ARCHIVE — [original title] (superseded)"

Docs archived May 22 2026:
  Build Session v7.23, v7.24, v7.25 (superseded by permanent Build Session List)
  Master v29.1, v30 (superseded by permanent Master Improvement Ranking)

Note: The Drive tools available to Claude support copy_file but not move_file.
Archival is done by copying to the Archive folder + noting in session doc.
Original files remain in root Drive until manually moved by Jeff.
This is an acknowledged limitation — the Archive copies are the record.

### What triggers a new archive entry

1. Any versioned doc is superseded by a permanent-ID replacement
2. Any spec doc that has been fully built and is no longer a build reference
3. Any doc explicitly declared "SUPERSEDED — DO NOT BUILD"

Archive immediately — don't wait for end of session.
Add the archive copy ID to the session doc under "ARCHIVED THIS SESSION."


## Rule 31 — Two-tier governance enforcement model

### The asymmetry this rule addresses

FIELD's code quality is enforced at Tier A: a commit that breaks smoke.js
physically cannot be deployed. Pre-commit hook → CI → deploy is an unbroken
mechanical chain. No Claude judgment involved.

FIELD's documentation quality is enforced at Tier B: a language model with
no persistent memory is supposed to remember to update Drive docs at session
end. This is categorically less reliable. A stale doc can go undetected for
days (confirmed May 22 2026: Wow Features, UI Evaluation both 4 days stale).

### The two tiers

**Tier A — Mechanical enforcement (cannot be bypassed without explicit override):**
  smoke.js (A1–A144) — code structure, GOVERNANCE.json, FIELD-CURRENT-STATE.md
  CI pipeline (L0–L3) — deploy gate, live behavioral tests
  GOVERNANCE.json — machine-readable canonical doc manifest (repo-based)
  FIELD-CURRENT-STATE.md — auto-updated by CI after each successful deploy

**Tier B — Behavioral enforcement (Claude-enforced, session-dependent):**
  Drive doc content (Wow Features narrative, UI Evaluation grades, etc.)
  Session lifecycle (start/end sequence)
  Staleness check (Rule 30 — get_file_metadata calls)
  Archive policy (Rule 30 — orphaned doc copies)
  Canonical doc updates (Rule 8 — judgment-based)

### The upgrade principle

When a governance check can be expressed as a file in the repo or a CI job,
it belongs in Tier A. When it requires judgment, narrative, or language model
capability, it stays in Tier B.

Examples of Tier B → Tier A migrations (implemented May 22 2026):
  Canonical doc IDs: were in STANDARDS.md prose → now in GOVERNANCE.json (smoke-checked)
  Current deployment state: was in Drive doc → now in FIELD-CURRENT-STATE.md (CI-updated)
  Staleness thresholds: were advisory in STANDARDS.md → now in GOVERNANCE.json (machine-readable)

What stays at Tier B by necessity:
  Narrative content (Wow Features reasoning, UI Evaluation grades) — requires judgment
  Session type inference — requires language model reading opening message
  Unresolved questions scan — requires language model reading conversation history
  Drive doc quality (is the content accurate?) — requires judgment

### Implementation

**GOVERNANCE.json** (repo root):
  Machine-readable manifest of all canonical docs with IDs, staleness thresholds,
  update triggers, and last-verified dates.
  Smoke assertions A141–A144 verify it exists and is valid.
  CI job `update-current-state` updates `_last_governance_audit` date after each deploy.
  Claude reads doc IDs from this file, not STANDARDS.md prose.

**FIELD-CURRENT-STATE.md** (repo root):
  Lightweight current-state file: HEAD, file size, smoke count, deploy date, key gaps.
  Updated by CI `update-current-state` job after each successful browser-test.
  Updated by Claude at session end (supplements CI update with narrative changes).
  Zero Claude dependency for the mechanical parts — CI writes it regardless.

**Smoke assertions A141–A144:**
  A141: GOVERNANCE.json exists
  A142: GOVERNANCE.json is valid JSON with canonical_docs array (≥8 docs)
  A143: FIELD-CURRENT-STATE.md exists
  A144: All canonical doc IDs in GOVERNANCE.json are non-empty strings

### Updating GOVERNANCE.json

When a canonical doc changes (new permanent ID, staleness threshold updated,
new doc added): update GOVERNANCE.json and commit. The smoke test gate
ensures the update is verified before deploy.

When updating GOVERNANCE.json last_verified dates at session end: update
the relevant `last_verified` fields for docs touched this session.
The CI job updates `_last_governance_audit` automatically.

---

## Rule 32 — Pre-commit gate composition and the bypass pressure principle

### The bypass pressure principle

A governance gate that takes more than ~3 seconds will be bypassed under
pressure. Developers are not malicious — they are iterating quickly, and
`--no-verify` is always one flag away. Every second added to the pre-commit
gate increases the probability that it gets skipped exactly when it matters
most: rapid debugging, late-night fixes, mid-session pivots.

**The goal of governance is not maximum check coverage at commit time.
It is maximum probability that governance is actually followed.**

A 5-second gate that is never bypassed provides better governance than
a 5-minute gate with a 30% bypass rate.

### Enforcement layer assignment

Each check belongs at the layer where its cost-to-value ratio is optimal:

| Layer | Location | Max time | What belongs here |
|-------|----------|----------|-------------------|
| Pre-commit | Local | ≤3s | Structural checks that prevent broken code entering git history |
| CI post-push | GitHub Actions | Minutes | Quality and correctness checks that would waste CI minutes if skipped |
| CI post-deploy | GitHub Actions | Minutes | Behavioral checks requiring a live URL |
| Scheduled | GitHub Actions | Any | Deep analysis, compliance, AI review |

### What belongs at pre-commit (mandatory)

Per Rule 10 and the SMOKE GATE:
- `smoke.js` — structural assertions. Non-negotiable. Rule 10 mandates it.
- `field_smoke.js` — per-day data assertions. Non-negotiable. Rule 10 mandates it.
- `field_unit.js` — pure function unit tests. Fast (~100ms). Acceptable.

### What does NOT belong at pre-commit

ESLint on `index.html`: Rule 17 specifies "Add to CI smoke job" — CI, not
pre-commit. This was always the specified location. Running ESLint at
pre-commit is additive to the rule, not required by it.

At 905KB, ESLint takes ~5.6s per run without cache (19× slower than smoke.js).
It produces zero additional governance value beyond what CI ESLint provides —
CI catches the same issues 30 seconds after the push.

If ESLint must run pre-commit: add `--cache` flag. Reduces repeat-run
time from 5.6s to ~300ms. Cache stored in `.eslintcache` (gitignored).

### How F16–F20 change this picture

F16–F20 are Playwright behavioral tests. They CANNOT run at pre-commit —
they require a live URL. They are inherently CI post-deploy checks.

This is significant: the highest-value governance checks (F16–F20 test
"does it actually behave?") live in CI by necessity. The pre-commit gate
tests "does the code look structurally correct?" — a lower-value category.

When CI has strong behavioral coverage (F16–F20 built), the argument for
keeping slow lower-value checks at pre-commit weakens further. A CI that
can catch "the card tap doesn't work" is a CI that earns more trust, which
makes it more defensible to run ESLint there rather than pre-commit.

**Recommended implementation sequence:**
1. Build F16–F20 first — strengthens the CI safety net [LAYER3-EXT]
2. Move ESLint from pre-commit to CI — removes bypass pressure [SMOKE-SPEED-A]
3. Add `--cache` as immediate interim fix — costs nothing [SMOKE-SPEED-A]

### [SMOKE-SPEED-A] — implementation

Tracked: Build Session List, Tier 2 Infrastructure
Estimate: ~10 min
No governance conflicts (verified May 22 2026 against Rules 10, 16, 17, 31).

Changes:
1. `scripts/pre-commit`: add `--cache` to ESLint invocation (immediate, ~1 min)
2. `scripts/pre-commit`: remove ESLint block entirely (after F16-F20 built, ~5 min)
3. `.gitignore`: add `.eslintcache` if not already present

Result: pre-commit drops from ~7s to ~1.5s. ESLint runs in CI where
Rule 17 always said it should be.

### Smoke Gate Architecture (2026-05-28) — invariant vs snapshot [ADR]

**Status:** adopted 2026-05-28 (Opus). Changes the session-protocol hard-gate; do not
reverse without Jeff's approval. Documented here for Sonnet 4.6 + Opus continuity.

**Problem.** `field_smoke.js` used to pin a frozen answer-key for one day:
`TODAY_ISO='2026-05-23'`, `NBA_CARDS=1`, specific teams, specific networks,
`NBA_SERIES_ACTIVE=true`. Matching a snapshot is stale by construction — the moment
the day rolls, or you commit anything that isn't a slate refresh, the gate goes red
through no fault of the change. A red gate on a correct commit is exactly the
bypass pressure Rule 32 warns about: it trains `--no-verify` as a reflex, which
erodes *every* gate, not just this one. "Advisory" does not fix this — letting a
red check through without the flag is still shipping past a red check (a silent
bypass). The fix is to make the gate unable to false-fail.

**Principle — invariant vs snapshot.**
- An **invariant** is a property true of *any correct day*: no card older than
  yesterday, no duplicate matchups, no empty `data-home`, no deprecated bundle,
  every series record well-formed, clean empty-state when there are no games.
  An invariant has no answer-key to maintain, so it is green whenever the data is
  correct and red only when something is genuinely malformed. **Safe to block on.**
- A **snapshot** is *today's specific slate*: exactly N cards, this team on that
  network, a series active tonight. Verifying a snapshot needs ground truth you
  only have when you've checked the real slate (MLB.com, Sports Media Watch, …).
  **Not safe to block arbitrary commits on** — it belongs where the ground truth is.

**The three files.**
| File | Asserts | Date source | Runs in | Blocks |
|------|---------|-------------|---------|--------|
| `smoke.js` | structural (feature/function presence) | n/a | CI + pre-commit | every commit |
| `field_smoke.js` | per-day **invariants** (well-formedness) | **system clock (America/NY)** | pre-commit | every commit |
| `field_smoke_daily.js` | per-day **snapshot accuracy** (exact slate) | system clock + `DAILY_EXPECTED` you fill | **daily-update workflow only** | daily commit only |

Both pre-commit gates are hard blocks and neither can false-fail: structural presence
is always satisfiable by correct code; invariants are always satisfiable by correct data
(an empty/pre-update render passes). So a correct commit is always honestly green — no
bypass, ever. Slate correctness is not downgraded; it moved to `field_smoke_daily.js`,
run during the daily update where the real slate is known. Relocation, not weakening.

**What `field_smoke.js` no longer does:** no `TODAY_ISO` pin, no `NBA_CARDS`/
`MLB_CARDS`/`NBA_HOME_TEAM`/`NBA_NETWORK`/`MLB_CHIP_*`/`NBA_SERIES_ACTIVE`/
`NBA_HYPE_TEST`/`MIN_SPORT_SECTIONS` consts. `TODAY_ISO` is derived from the system
clock. Checks #4/#5/#6 became well-formedness invariants; #23 became "series records
must be well-formed" (not "a series must exist"); #25 became a structural infra check.
Paths are argv-driven (`node field_smoke.js <index.html>`; field_utils.js read from the
same dir) so it runs from any checkout, not just `/home/claude` or `/tmp`.

**Daily workflow contract (`field_smoke_daily.js`).** After updating today's slate:
fill `DAILY_EXPECTED` (date = today; games you verified; required network bundles),
run `node field_smoke_daily.js index.html`, require exit 0 before pushing the daily
commit. A stale `DAILY_EXPECTED.date` fails by design — it means the slate wasn't synced.
It checks index.html **data strings**, not the rendered DOM, because the Node harness
does not drive `renderAll()` (the same reason the old DOM-snapshot checks were perma-red
in-container and forced bypasses).

**Dedup (single source of truth).** The `console.log` gating check moved from
`field_smoke.js` into `smoke.js` as **A234** (counts *ungated* `console.log` lines —
those without a line-level `FIELD_DEBUG` — threshold ≤4 for verified context-gated
cases). The divergent A55 duplicate was removed from `field_smoke.js` (smoke.js owns it).
Follow-up (not done 2026-05-28, flagged to avoid coverage loss): `field_smoke.js` still
carries ~500 lines of structural assertions (A54/A56/A57, 24/26–32, weather, UFL)
duplicated from `smoke.js`; consolidate into `smoke.js` once each is confirmed covered.

## Rule 33 — Product Ethos

### What FIELD is

FIELD is a sports intelligence tool for fans. It is not a media company,
a sportsbook partner, a cable industry affiliate, or a fantasy product.
It has no commercial relationship with any broadcaster, streaming service,
betting operator, or sports league. This independence is not incidental —
it is the precondition for honest signal.

### The four founding principles

**DO NOT INVENT** — Every editorial claim, score, broadcast detail, and
statistic is sourced. AI in FIELD is a renderer of verified facts, never
an analyst generating its own assertions. If the data doesn't support it,
FIELD doesn't say it.

**RELAY-FIRST** — Live data comes from the most authoritative source
available. Relay hierarchy: official league APIs > verified third-party
feeds > ESPN unofficial. The hierarchy exists because data quality
affects editorial quality.

**FREE ARCHITECTURE** — Free and cheap viewing options are surfaced first,
always. FIELD does not bury free options to protect paid ones. Antenna,
free trials, and low-cost subscriptions are treated as first-class content,
not footnotes.

**HONEST SIGNAL** — Drama scores, editorial calls, and intelligence signals
reflect actual game quality, not hype, not commercial interest, not what
the sports media industrial complex wants fans to believe is important.

### The user-side principle (Rule 33 addition, May 22 2026)

FIELD is on the user's side. Not the house's side. Not the industry's side.

This means:
- The cost of every decision (subscription, bet, late night, parlay) is
  made visible, not obscured.
- Extractive practices — the vig, the parlay margin, the cable bundle, the
  blackout rule — are exposed through features, not editorialising.
- The intelligence is calibrated to context and constraints, not to salary
  scale. A working-class fan is not less intelligent; they have different
  constraints. The product serves both without condescending to either.
- The voice is the friend who did the research. Not a pundit, not a tout,
  not an analyst. Direct. Honest. Not trying to sell anything.

### The shipping test

Before any feature ships, run this check:

  Does this leave the user better informed than they were before,
  without making them feel stupid, sold to, or managed?

If yes: ship.
If no: fix the language or the feature before it goes out.

Additional checks for betting and broadcast features:

  □ Does this make the cost of something MORE visible? (Good)
  □ Does this make betting look more attractive? (Bad — do not ship)
  □ Does this highlight free/cheap options ahead of expensive ones? (Good)
  □ Does this benefit the house over the user? (Bad — do not ship)
  □ Does this contain deep links or referral paths to sportsbooks? (Remove)
  □ Does the language use analytical register, not promotional register?
    ("market implies" not "great value bet") (Required)

### The contempt principle

FIELD has structural contempt for extractive practices — the parlay margin,
the cable bundle, the blackout rule, the fantasy platform's data asymmetry.
This contempt is expressed through features that make those practices
transparent. It is NOT expressed through editorial language, brand voice,
or rhetorical positioning.

The numbers do the contempt. The voice stays clean.

### Enforcement

Rule 33 is applied at every TYPE C session before spec approval.
Any feature spec must include a Rule 33 checklist pass before it
is added to the Build Session List.
Features that fail the shipping test do not enter the build queue.

---

## Rule 34 — Broadcast Access Labels (HONEST-LABEL-A)

FREE is reserved exclusively for content requiring no subscription
and no account. OTA broadcasts (NBC, ABC, FOX, CBS, ION) and
genuinely free streaming services (Tubi, free-tier where sports
apply) may carry the FREE label and green chip treatment.

Subscription services (Peacock, ESPN+, Max, Apple TV+, Amazon
Prime Video, Paramount+, Fubo, YouTube TV, etc.) must use the
INCLUDED label regardless of whether a user might already subscribe.
The word "free" must not appear in any chip, copy, or Skim sentence
referring to a subscription service.

The Cheap Seats copy rule:
  OTA game: "NBC is free over the air. An antenna receives it (~$12
  one-time). No subscription needed."
  Subscription game: "[Service] carries this game. $X/month — or
  $Y/year. Skip if you already subscribe."

Smoke assertion required: no FREE badge or the word "free" adjacent
to Peacock, ESPN+, Max, Apple TV+, or Amazon in any rendered output.

Violation = DO NOT SHIP.

---

## Rule 35 — Content Budget: JournalismBrief Field Ownership (J-BUDGET-A)

Each field of JournalismBrief has a designated primary renderer.
No field may be surfaced by two primary renderers in the same
render pass. Secondary renderers (mobile story sheet, WHOLE FIELD
centre column in full-depth mode) may access consumed fields only
under explicit secondary allowance in JOURNALISM_BUDGET.

Primary assignments:
  lead           → The Skim (exclusive)
  context        → J3 / centre column
  stakes         → J3 / centre column
  keyFacts[0-2]  → J3 / centre column
  keyFacts[3-5]  → card notes
  keyFacts[6-7]  → mobile story sheet only
  angle/tone/target → all renderers (style, not content)

Special case: the centre column headline in WHOLE FIELD mode must
NOT repeat the lead sentence verbatim when The Skim is visible on
the same viewport. The Skim owns the verdict sentence. The centre
column headline is an editorial title derived from angle + context,
not a repetition of lead.

All renderers must accept a JournalismRenderBudget parameter and
claim fields before rendering. Unclaimed fields must not be rendered.

---

## Rule 36 — Sentence Fingerprint Deduplication (J-DEDUP-A)

All rendered journalism sentences must pass through the
SentenceFingerprintRegistry before commitment to any surface.

Duplicate detection: two sentences sharing 3 or more key entity
tokens (TEAM, PLAYER, VENUE, NETWORK, SCORE, ARC) are considered
duplicates regardless of wording.

Handling policy by surface:
  Card notes:    omit the duplicate sentence entirely
  J3 / centre:   compress to data-only form before AI rendering
  Mobile sheet:  allow (user has explicitly requested full depth)

Sentences with fewer than 2 extractable entities bypass the
registry (too short to fingerprint reliably — typically raw data).

Registry scope: per render pass. Initialised fresh on page load.
For PWA sessions: registry expires after 4 hours (SESSION_TTL).
If restored from background after TTL, reinitialise as new session.

The registry is a secondary defence. The Content Budget (Rule 35)
is the primary structural defence against duplication.

---

## Rule 37 — Semantic Color System (COLOUR-SYS-A)

All color in FIELD must reference a semantic CSS token defined
in the color system spec (COLOUR-SYS-A). No raw hex values in
component JavaScript, template strings, or inline styles.

Token meanings are reserved globally:
  Gold (#c9a84c / --drama-must)   → urgency, must-watch, breakthrough
  Blue (#4a9eff / --drama-watch)  → worth it, editorial depth, informational
  Smoke (#6a6a8a / --drama-low)   → low stakes, honest, no drama, skeptical
  Teal (#2dd4bf / --access-free)  → discovery, free access, hidden gem
  Amber (#f59e0b / --caution)     → caution, something to know before deciding
  Red (#ef4444 / --angle-elim)    → elimination urgency only
  Violet (#a78bfa / --angle-rivalry) → history, rivalry, weight

Sport identity colors (--sport-nba, --sport-nhl, etc.) are used
exclusively for card left border accents and section headers.
Never for badges, chips, or text.

No new color token may be introduced without:
  1. Defining what it means (one sentence)
  2. Defining what it must never be confused with
  3. Verifying it does not conflict with an existing token's meaning

Single-sentence test: what does this color mean to a user who
has never read documentation? If "the same thing [existing token]
means everywhere else" — use that token. If "something new" —
define the token first.

--drama-low is smoke (#6a6a8a), NOT green. Green is reserved
exclusively for --access-free (teal family). Using green for
low-drama content or any badge other than free OTA = violation.

Smoke assertions required after token system ships:
  assert('--drama-low is smoke not green')
  assert('dramaBadgeColor uses var() token refs not raw hex')
  assert('--access-free present in :root')

Violation: using a color against its semantic meaning =
DO NOT SHIP. Example: gold on a free OTA chip is a violation.
Teal on a high-drama badge is a violation.
---

## Rule 38 — Angle Vocabulary (buildLayer3Rules)

FIELD supports named editorial angles injected into the journalism compound prompt
via `g._angle` or `g._gameImportance` on game objects. Each angle produces specific
model instructions that override default match-preview framing.

**Canonical angle list (as of Rule 38):**

| Angle | Trigger | Journalism instruction |
|---|---|---|
| ELIMINATION | `_gameImportance:'elimination'` | Lead with stakes. Who goes home tonight. Stakes before any stat. |
| CLOSEOUT | `_gameImportance:'series_deciding'` | Write the series arc. One team can advance tonight. |
| FREE GAME | game is free OTA | Explicitly name the free network. Write for someone new to the sport. |
| LOW-STAKES NATIONAL | national broadcast + drama < 35 | Prominent broadcast, low interest. Brief mention only. |
| MY TEAM | game in MY_TEAMS | Address reader directly — "your [team]". Personal framing. |
| MILESTONE TONIGHT | BDL milestone pct ≥ 0.97 | Name the player, the gap, the specific record. |
| RISING | drama trend > 12 | Drama climbing fast. Use urgency language. |
| OVERTIME / EXTRA | live period > standard maximum | Sport-correct label. Describe the live situation immediately. |
| RIVALRY | isRivalGame() + MY_TEAMS | Acknowledge the history briefly. |
| SCANDAL | `_angle:'SCANDAL'` | See Rule 38A below. |

### Rule 38A — SCANDAL angle

**Trigger:** `g._angle === 'SCANDAL'`

The scandal IS the story. Off-pitch events define the context of this game.
The journalism layer must not open with a standard match preview.

**Required in first sentence:** what happened — who was found guilty, of what,
and what the consequence was. Why this team is actually in this fixture.

**Sources:** `matchupNote` and `localNote` are the primary data. Do not invent
beyond them. Do not speculate about outcomes or punishments not yet confirmed.

**Compliant openers:**
- "Middlesbrough are here because Southampton were expelled for spying on their training."
- "The richest game in football is being played under extraordinary circumstances — Southampton admitted to filming three opponents' training sessions and were expelled by the EFL."

**Non-compliant openers (VIOLATION — DO NOT SHIP):**
- "Middlesbrough face Hull City in the Championship playoff final at Wembley today." ❌
- "Two sides battle for Premier League promotion..." ❌

**Format:**
- Sentence 1: scandal context (mandatory)
- Sentence 2+: pivot to sporting stakes, what's at risk, what each team brings

**Editorial register:** plain, factual, working-class contempt for obfuscation.
The reader deserves to know why the team on the pitch isn't the one that
earned it on the field. State it directly.

**DO NOT INVENT.** All scandal details must come from `matchupNote` or `localNote`.
The AI adds framing; it does not add facts.



## Rule 39 — Infrastructure change protocol: diagnose before touching

### What this rule prevents

Proposing and committing infrastructure changes (deploy paths, CI configuration,
service integrations, workflow files) before fully mapping the impact. The failure
mode is: identify a problem → immediately build a solution → audit after being
challenged. Rule 13 covers this for code changes. Rule 39 covers it for
infrastructure specifically, where the blast radius is wider.

### The required diagnostic before any infrastructure change

Before creating, modifying, or deleting any workflow file, CI configuration,
or service integration (GitHub app, Cloudflare connection, secrets, webhooks):

**1. Map every communication channel the existing system uses:**
For each integration being changed, explicitly answer:
  - What does system A send to system B?
  - What does system B send back to system A?
  - What does each side lose if the connection is removed or changed?

Example that triggered this rule: proposing to Disconnect the Cloudflare GitHub
app without first establishing that it provides bidirectional communication —
not just push → deploy, but also Cloudflare → GitHub deployment status reporting.
The fix (gitHubToken in wrangler-action) was a one-line addition, but it required
the question to be asked first.

**2. Audit every workflow that touches the affected system:**
List every workflow that pushes to main, calls the affected service, reads from it,
or depends on its output. Check for [skip ci] usage, paths filters, and commit
message patterns. Do this BEFORE creating any new workflows.

**3. Check downstream dependencies in both directions:**
For every workflow change: what currently depends on the OLD behaviour?
For every new workflow: what does it depend on that might not exist yet?

**4. Write the diagnostic before any commit.**
The diagnostic is the TYPE D phase. Only after it is written do any workflow
files get created or modified.

### [skip ci] scope

`[skip ci]` skips GitHub Actions only. It does NOT skip:
  - Cloudflare's own GitHub app CI (if connected)
  - Any external webhook that watches git pushes
  - Any service with its own GitHub app integration

This asymmetry is why `[skip ci]` on `index.html` was a governance gap:
it bypassed GitHub Actions tests but Cloudflare still deployed. Rule 32
covers bypass pressure; this rule covers mapping the full blast radius
before closing such gaps.

### What "going slower is never acceptable" means for infrastructure

Speed applies to outcomes, not to reasoning. Taking 10 minutes to map
a service's communication channels before changing it is not going slower.
Spending 2 sessions cleaning up consequences of an unconsidered change is.

The constraint is: infrastructure decisions that require a session to undo
require a diagnostic that would have taken minutes to write.


## Rule 40 — Session start is unconditional

### The trigger

ANY message from Jeff opens a session. There is no key phrase required.
There is no message type that suspends the protocol. The session start
declaration is Claude's responsibility, not Jeff's.

This includes:
- A screenshot with a question
- A single word
- A mid-topic follow-up
- A post-compaction restart
- A message that seems to need only a quick answer
- Any continuation of prior work

None of these are exceptions. The protocol fires on every conversation open.

### What must happen before any substantive response

Claude's first output in every conversation must be the SESSION START
declaration. "Substantive" means anything beyond a clarifying question.
If Claude finds itself writing an answer before declaring SESSION START,
it stops, declares it, then answers.

Required reading before the declaration (Rule 10, Rule 12):
  1. Read Handoff Note (Drive ID in STANDARDS.md canonical table)
  2. Read FIELD Current State (Drive ID: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA)
  3. Read CI/Deploy Error Reference (Drive ID in STANDARDS.md canonical table)
  4. Run: git pull && node smoke.js index.html

Then declare:
  SESSION START
  Type: [A / B / C / D / E]
  Scope: [one sentence]
  Baseline: [last commit hash] · Smoke: [N]/[N] · SW_VERSION: [date]

### Session type is inferred, not asked for

Claude infers the type from the opening message. Jeff never needs to
specify it. If ambiguous, Claude declares the most conservative type
(B over C — diagnose before build) and states the assumption.

| Opening pattern | Type |
|---|---|
| Daily update for [date] | A |
| [thing] is broken / fix [bug] | B |
| Build / add / implement [feature] | C |
| Audit / gap analysis / compare | D |
| Refactor / clean up / extract | E |

### Why the protocol kept getting skipped

The protocol has no mechanical gate. A commit that breaks smoke.js
cannot be pushed. A conversation can start without SESSION START and
nothing blocks it. This is a Tier B enforcement gap (Rule 31).

The behavioral fix is this rule: the protocol is non-negotiable and
has no exceptions. No question is urgent enough to skip it. The two
minutes it takes to read the handoff and declare a type have prevented
more wasted sessions than any amount of fast initial answers.

### What an opening message looks like in practice

Jeff: [shows a screenshot]
Claude: Reading handoff and current state...
  SESSION START
  Type: D — Governance audit
  Scope: [inferred from screenshot]
  Baseline: [last commit] · Smoke: 0/140 · SW_VERSION: 2026-05-23o
  [then answers the question]

Not:
  Claude: [immediately answers the question about the screenshot]


## Rule 41 — Compaction is a session boundary, not a session end

### What compaction is

A compaction occurs when a conversation fills Claude's context window.
The system compresses prior conversation history into a summary and
continues the conversation. The compacted content is stored in a
transcript file accessible via bash_tool at /mnt/transcripts/.

A compaction is NOT a session end. It is a forced session boundary.

**Session end**: deliberate, complete close — commits pushed, smoke
passing, session doc written to Drive, HANDOFF.md overwritten, canonical docs
updated, SESSION END declared.

**Compaction**: mid-conversation context management — work may be
incomplete, no session doc written, no handoff written, SESSION END
never declared. The prior session may be open.

### The compaction summary is not a handoff note

The compaction summary is a Claude-generated compression artifact.
It is not written by Claude as a deliberate handoff. It does not
follow the Rule 15 session doc template. It does not contain the
verified smoke state, commit hashes, or unresolved questions check
that a proper handoff requires.

The compaction summary CANNOT substitute for reading the Drive
handoff note. Even when the summary appears complete, the
authoritative source is HANDOFF.md in the repo.

### What must happen after a compaction

The first message after a compaction triggers the same protocol
as any opening message (Rule 40) — with one additional step first:

**Step 0 — Check if the prior session was properly closed:**
  Read the transcript:
    view /mnt/transcripts/[latest].txt
  Look for: SESSION END declaration, session doc Drive ID,
  HANDOFF.md commit.
  If any of these are missing: run the session end checklist
  (Rule 9, Step 1–6) before starting new work.

**Then run the full session start protocol (Rule 40):**
  1. git pull — gets latest HANDOFF.md and code
  2. Read HANDOFF.md (not the compaction summary)
  3. Read FIELD Current State from Drive
  4. Read CI/Deploy Error Reference from Drive
  5. node smoke.js index.html
  6. Declare SESSION START · Type · Scope · Baseline

### The explicit pre-check before responding

Before responding to the first message after a compaction, Claude answers
two gating questions out loud. Naming them explicitly makes the verification
a deliberate act rather than an emergent property of following the protocol.

  1. IS NECESSARY CONTEXT AVAILABLE?
     - HANDOFF.md readable + reflects recent state (commit hashes match)
     - userMemories not pruned or contradicted by current session
     - Filesystem persisted (repo at expected HEAD, working tree state known)
     - Transcript accessible at /mnt/transcripts/ for any detail not in
       the compaction summary
     If any answer is no → state the gap, do not proceed silently.

  2. DO ALL NEEDED TOOLS EXIST IN THE SESSION?
     - Required file ops (bash_tool, view, str_replace, create_file)
     - Required external integrations (Drive, web_search, conversation_search)
     - Network allowlist covers what the active priority list requires
       (or the CI-as-proxy escape hatch is available for what it doesn't)
     If a needed tool is missing → state which one + the workaround,
     do not pretend the capability exists.

Both questions must be answered before the first substantive response
to the post-compaction message. The audit is short — usually two or three
sentences — but it MUST be visible. Skipping it because "context looks
fine" is a Rule 11 / Rule 48 (DO NOT ASSUME) violation about Claude's
own working conditions.

### Why the compaction summary is insufficient as context

The compaction summary reflects Claude's compression judgment, not
a verified state. It may omit unresolved questions, soft failures,
or in-flight work. The HANDOFF.md file is written deliberately
at session close, contains specific commit hashes, and flags
anything that needs attention in the next session.

Reading HANDOFF.md after compaction takes 60 seconds.
Proceeding on compaction summary alone risks acting on stale,
incomplete, or mis-summarised state — the same failure mode that
Rule 25 (Gemini quarantine) addresses for external handoffs.

### The specific failure this rule prevents

Post-compaction message arrives. Claude reads compaction summary,
treats it as sufficient context, answers immediately without
declaring SESSION START, without reading HANDOFF.md, without
running smoke baseline. All session governance is bypassed because
the compaction summary created the illusion of continuity.

Rule 40 + Rule 41 together close this: any message = session start
trigger (Rule 40), and a post-compaction message specifically
requires checking the prior session state before proceeding (Rule 41).

---

## Rule 42 — Five-minute novel thinking threshold for infra failures

**Incident trigger:** May 23 2026 — 6.5-hour deploy outage resolved in 15 minutes
once the CF dashboard screenshot was analyzed. ~90 minutes wasted on repeated
variations of the same fixes.

### The rule

If a CI/deploy/infrastructure problem is **not resolved within 5 minutes**,
STOP iterating. Declare the failure mode explicitly and shift to novel thinking.

Novel thinking means: look at what the system is **literally showing you**, not
what you expect it to be saying.

### What "literally showing you" means

- A screenshot of the CF dashboard Settings page
- The raw wrangler error from `npx wrangler deploy --dry-run` (run locally)
- The exact text of the CI step failure (not inferred from step name)
- The CF API response body (not the status code alone)
- What the system says it **cannot do** — that tells you what you're asking it to do

### The May 23 2026 lesson

The CF dashboard Settings tab showed, on every single section:

  "Logpush cannot be added to a Worker that **only has static assets**."

This told Claude exactly: the worker is pure static assets, and the wrangler.jsonc
had `"observability": {"enabled": true}` which the CF API rejects for this type.
The answer was visible on screen. It was not consulted for ~90 minutes.

Running `npx wrangler deploy --dry-run` locally would have immediately shown:
  "Asset too large. FIELD-CURRENT-STATE.md with a size of 70.6 MiB."

Both errors were accessible within 2 minutes of thinking differently.

### Escalation protocol (after 5 minutes without resolution)

1. **Stop** — do not push another variation of the same fix
2. **Get the screenshot** — ask Jeff for the CF dashboard / error UI screenshot
3. **Run locally** — `CLOUDFLARE_API_TOKEN=test npx wrangler deploy --dry-run`
   catches asset errors, config errors, before any API call is needed
4. **Read raw API** — use cf-api-probe for specific CF API calls; read the full
   response body, not just `success: true/false`
5. **State the known facts** — list what is confirmed true vs assumed, then
   reason from the confirmed facts only

### What this rule does NOT mean

This rule does not mean "give up after 5 minutes." It means **change approach**
after 5 minutes. Lateral thinking after exhausting the obvious is not giving up —
it's the only way to find root causes that aren't where you expect them.

Going slower is never acceptable (FIELD principle). Novel thinking is faster,
not slower — the May 23 outage proves this.


## Rule 50 — Sport Display Convention Registry (SPORT-DISPLAY-A)

(Renumbered PM-7 June 1 2026 — was Rule 39, which collided with Rule 39
"Infrastructure change protocol" at line 2140. Cross-reference: any prior
"Rule 39 SPORT-DISPLAY-A" citation refers to this rule, now Rule 50.)

**SPORT_DISPLAY_RULES is the single source of truth for sport identity.**

Sport display conventions (home/away order, separator, score format, period
prefix, table label, FD code, ESPN endpoint, isSoccer) must be declared in
`SPORT_DISPLAY_RULES` — one entry per sport. Do NOT add new sport-specific
checks outside this registry.

Prohibited patterns (all caused Session 9/10 bugs):
- `AMERICAN_SPORTS.has(sport)` → use `!SPORT_DISPLAY_RULES[sport]?.isAmerican`
- `SOCCER_SPORT_SET.has(sport)` → use `SPORT_DISPLAY_RULES[sport]?.isSoccer`
- `sportName.includes("MLS")` → use `SPORT_DISPLAY_RULES[sport]?.isSoccer`
- `FD_LEAGUE_MAP[sport]` → use `SPORT_DISPLAY_RULES[sport]?.fdCode`
- `ESPN_STANDINGS_MAP[sport]` → use `SPORT_DISPLAY_RULES[sport]?.espnLeague`

Spec: FIELD — Unification Specs v1.0 (Drive 1YEh4YAHGyadpiaOO9LMo-w2tGZdRxj3JdU7jkBAbWYY)
Status: Specced, not yet built. Existing code uses legacy constants until migration.

## Rule 51 — Period Prefix Registry (PERIOD-PREFIX-A)

(Renumbered PM-7 June 1 2026 — was Rule 40, which collided with Rule 40
"Session start is unconditional" at line 2202. Cross-reference: any prior
"Rule 40 PERIOD-PREFIX-A" citation refers to this rule, now Rule 51.)

**Period prefix classification uses SPORT_PERIOD_PREFIXES sets.**

Do not add raw string comparisons for period prefixes (pp==="'" etc.).
All period prefix knowledge lives in:
  `SPORT_PERIOD_PREFIXES.soccer` = Set(["'", "1H", "2H"])
  `SPORT_PERIOD_PREFIXES.basketball` = Set(["Q", "H"])
  `SPORT_PERIOD_PREFIXES.hockey` = Set(["P"])
  `SPORT_PERIOD_PREFIXES.baseball` = Set(["T"])
  `SPORT_PERIOD_PREFIXES.football` = Set(["Q"])

Use utility functions: `isSoccerPeriodPrefix(pp)`, `isNonSoccerPeriodPrefix(pp)`.

Spec: FIELD — Unification Specs v1.0 (Drive 1YEh4YAHGyadpiaOO9LMo-w2tGZdRxj3JdU7jkBAbWYY)
Status: Specced, not yet built.

## Rule 52 — Schedule Section Builder (SCHEDULE-BUILDER-A)

(Renumbered PM-7 June 1 2026 — was Rule 41, which collided with Rule 41
"Compaction is a session boundary, not a session end" at line 2278.
Cross-reference: any prior "Rule 41 SCHEDULE-BUILDER-A" citation refers
to this rule, now Rule 52.)

**All buildTodaySchedule sport sections use buildSection() helper.**

Do not copy the 3-line filter/map/push pattern per sport. Use:
  `buildSection(rawGames, sport, idPrefix, opts={})` → filtered+mapped array

Spec: FIELD — Unification Specs v1.0 (Drive 1YEh4YAHGyadpiaOO9LMo-w2tGZdRxj3JdU7jkBAbWYY)
Status: Specced, not yet built.


## Rule 53 — Game Score Uniformity (SCORE-UNIFORM-A)

(Renumbered PM-7 June 1 2026 — was Rule 42, which collided with Rule 42
"Five-minute novel thinking threshold for infra failures" at line 2385.
Cross-reference: any prior "Rule 42 SCORE-UNIFORM-A" citation refers to
this rule, now Rule 53.)

**All game score lookups must use resolveGameScore(). No direct espnScores access.**

The active bug (May 24 2026 screenshot): OTW showed "3-4" while the card
showed "1-1" for the same D.C. United vs CF Montréal game. Root cause:
_otwFindLiveGame() and findESPNScore() are independent lookup strategies
that can land on different espnScores entries for the same physical game.
This happens because FPL and ESPN write under different team-name key
strings (e.g., "CF Montreal" vs "CF Montréal" with accent).

Required: resolveGameScore(game) — tries both lookup strategies, picks
the entry with the most recent espnScoreTs timestamp.

Consumers that MUST use resolveGameScore() instead of direct espnScores access:
  OTW banner (_otwFindLiveGame score display)
  Game card score-wrap (renderESPNScores)
  Drama badge (injectDramaBadges)
  Score ticker (renderScoreTicker)
  Journalism brief (buildGameNotesContext)
  Night Owl email score read (_prevEspnScores)
  Story moments (ed.homeScore/awayScore)

Spec: FIELD — Unification Specs v1.1 (Drive 1EUDxBSvcNd00nT1SxQn110wTcIb--gBXP74RKeXX9iI)
Status: Specced, not yet built.


## MLS 2026 Data Architecture Reference

Permanent spec doc: Drive 138uEqnmWMuyzKaC_i4pzRxZHC_LV61UdJMc0nbhCTCQ
Contains: broadcast corrections (Apple TV+→Apple TV, FOX/FS1 bundles),
stats-api.mlssoccer.com relay plan, 2026 season constants, endpoint reference,
opta_id architecture for SCORE-UNIFORM-A fix.


## Push Notification Architecture Reference

Permanent spec doc: Drive 1DanThEy0VSUQxF7GDAIGhtqmMSXfeyvXvhuVVV3TCHM
Title: FIELD — Push Notification Architecture (S0 + PUSH A/B/C) — May 24 2026
Contains: Event Bus (S0), VAPID keys, PUSH A client subscription,
          PUSH B relay routes + cron + VAPID signing, PUSH C SW handler,
          CI KV bootstrap, notification templates, GDPR, what's not yet built.


## Architectural Decision Records (ADRs)

When Opus and Sonnet disagree on an architectural approach, the resolution
is documented as an ADR in Drive. Future sessions (any model) read the ADR
before revisiting the decision. ADRs are not reversible without Jeff's approval.

ADR-001: AFL Auto-Schedule (Drive 1uQbzKXarVSHNmshM846uxY7Z-60McUqDUib8EHhJlUg)
  Decision: Replace hardcoded round counter with three-tier auto-detection.
  Hardcoded game ENTRIES retained for resilience. Hardcoded round NUMBER removed.
  Policy: hardcode STABLE data (bundles, entries). Do not hardcode COUNTERS that
  change on a regular cycle. Test: "Will this be wrong next week if no one updates it?"


## Rule 43 — Sport-Specific Journalism (sportContext)

All user-visible text about a game MUST call sportContext(sport) for period labels,
score units, and run thresholds. No basketball defaults. "Q" is only correct for
NBA/NFL/WNBA/AFL. Soccer uses "2H 87'", Hockey "P3", MLB "Inn 7", Tennis "Set 3".
Spec: Drive 1jQ5pm1r8Cinu0eeZ7BWLs6N7LO01Mp2qYCXQ6Bu5L0A


## Rule 44 — Client-Side Size Budget

Baseline: ~1MB source, ~250KB Brotli-delivered (May 25 2026).
Target delivered: <400KB (achievable with minification build step).

Any single commit increasing index.html by more than 20KB (source, unminified)
requires explicit justification: what was added, what was offset or deferred,
was a smaller implementation considered?

This rule does not prevent growth. It prevents unnoticed drift.
The upper bound is updated when features justify it (WHOLE FIELD, native app prep).
Checked by smoke A01 (file size in range). See also: minification spec below.

PATENT NOTE: file size and patent defense are unrelated. A larger client-side
codebase is MORE defensible (computation obviously on-device), not less.
Classification (dramaScoreLive, classifyGame, OTW logic) MUST stay client-side
regardless of file size pressure. Ref: ADR-002, Client-Size Analysis May 25 2026.
Doc: Drive 1F1tzmSQm0NeENBi9_pMSR5yWX42ohYjriWZHThkiOxw

ADR-002: Decoupled Three-Component Architecture (Drive 1DZq6I6T4jKiRsnO7DEqVA48WfTX0mIwEiKgYVjCqQs4)
  What can move server-side: prose, templates, raw data relay.
  What MUST stay client-side: all game scoring, classification, badge rendering,
  OTW selection, push notification evaluation.
  Rule B is binding: classifyGame() NEVER runs on a server.

## Rule 45 — No legal verdicts; source-clearance gate (LEGAL-GATE-A)

Established May 29 2026 after the PGA Tour GraphQL incident: Claude first told Jeff the
access was "legally clean / every precaution taken," then later flipped to "RED / delete."
Both were overconfident legal verdicts that Jeff then acted on (built, then deleted). A solo
developer cannot safely build on an AI's legal opinion. The failure was calibration, not which
verdict was "right."

RULES:
1. Claude must NEVER certify a data source or action as legal, "clean," "safe," or claim
   "every precaution taken," and must never green-light a source. Claude is not a lawyer.
2. For any legal / Terms-of-Service / compliance question, Claude must: (a) state plainly it is
   not legal advice; (b) report what the actual terms say plus the genuine uncertainty, as a
   posture note — never a verdict; (c) flag that commercializing/monetizing materially raises the
   risk; (d) recommend a qualified attorney before any commercial launch.
3. SOURCE-CLEARANCE GATE: no new data source enters the FIELD product (relay route or client
   fetch) until (a) its actual terms page has been read and quoted in its source doc with date,
   AND (b) Jeff records an informed, explicit accept-the-risk decision. Ambiguous sources stay
   OUT until that decision. The Data-Sourcing Legitimacy Matrix is run BEFORE wiring, not after.
4. Prefer GREEN (licensed/open) sources for anything shipped. Keep the relay architecture
   swap-ready so any source can be redirected to a licensed feed.

Not reversible without Jeff's approval (ADR-class).

## Rule 46 — Documentation format + size (DOC-FORMAT-A)

All FIELD documentation is written as plain UTF-8 text, **≤220 KB per file**, to match the Drive
→ Google-Doc conversion convention (docs → Drive as contentMimeType text/plain; Rule 25 / memory).
- Content over 220 KB is split into numbered parts ("Doc 1 of N", "Doc 2 of N", …), never one oversize file.
- Destined-for-Drive docs use plain prose, not Markdown syntax — text/plain does not render `##`/tables
  in a Google Doc, so avoid relying on them for the Drive copy.
- When Drive writes are unavailable (sandbox), persist the same plain-text content to repo `docs/` as a
  fallback and migrate to Drive when writes resume. Repo-`.md` is acceptable as the fallback, but the
  Drive version must be plain text under the limit.

## Rule 48 — DO NOT ASSUME (applies to Claude in all sessions)

(Previously banner-numbered Rule 11 — renumbered June 1 2026 to resolve
collision with the formal Rule 11 at line 385. Cross-reference: any prior
"Rule 11 DO NOT ASSUME" citation in canonical docs refers to this rule.
Heading format normalized June 1 2026 PM-7 — was banner-style with `===`
fence which caused programmatic grep checks for `^## Rule 48` to miss it.)

DO NOT INVENT governs what FIELD's journalism AI puts in its output.
DO NOT ASSUME governs what Claude puts in its reasoning.
Both prevent the same failure mode: acting on things that aren't true.

The principle: before making a diagnosis, architectural
recommendation, or system state claim, verify it. If verification
is not possible in the moment, say so explicitly and flag the
assumption rather than proceeding as if it were confirmed.

The violation pattern:
 "I believe X is true, therefore Y is the right fix" -- where X
 was never verified against the actual system state.

THE FOUR ASSUMPTION CLASSES (each requires explicit verification):

 CLASS A -- System state
   "The proxy is on version X" / "Gemini is running" /
   "The deploy succeeded"
   Verification: response headers, dashboard, version number
   in the live system. Code and deployed state diverge.
   The deployed state is the only truth that matters.

 CLASS B -- Limits and quotas
   "The free tier is 30 RPM" / "Multiple keys multiply quota"
   Verification: check the account's Rate Limit page and current
   ToS before advising. Billing tier and limits change.

 CLASS C -- Model and API validity
   "This model string is a typo" / "This endpoint doesn't exist"
   Verification: search before declaring invalid. A string that
   looks wrong may be a newer version postdating training knowledge.

 CLASS D -- Root cause
   "The problem is X" declared before eliminating alternatives.
   Evidence disproving the assumption is often already in the
   screenshot or response. Read all of it before committing.
   A 429 proves a key IS valid. That redirects diagnosis.

 CLASS E -- Capability availability / impossibility (added June 2 2026 PM-14)
   "We can't reach workers.dev from sandbox" / "claude.ai's UI
   doesn't expose an edit option" / "This integration isn't
   supported" -- declared before searching.
   Verification: search past chats + Drive docs + workflow files
   + Anthropic docs (web_search) before declaring a capability
   unavailable. The CI-as-proxy pattern for workers.dev and
   api.cloudflare.com (cf-api-probe.yml, cors-probe.yml,
   post-probe.yml) is the canonical example: a "blocked" domain
   has a documented escape that lives in the repo and Drive.
   Trigger: fires AT THE MOMENT Claude is about to claim
   impossibility, not pre-emptively. Stable infrastructure facts
   (sandbox allowlist, deploy path, probe workflow inventory)
   are already in userMemories and surfaced by the SESSION START
   protocol's mandatory Drive reads; do NOT re-search those at
   every startup. The trigger fires only at decision-points
   where Claude is about to close a door.

ENFORCEMENT:
 Before any architectural recommendation: verify the premise.
 Before declaring root cause: list verified vs assumed evidence.
 Before declaring a deploy successful: require the version number
   in the response header. "I clicked Deploy" is not confirmation.
 Before declaring a capability unavailable (Class E): search
   past chats, Drive, repo workflow files, and Anthropic docs.
   Only then declare the constraint.
 When an assumption proves wrong: correct course immediately.

CASE STUDY -- May 31 2026:
 - Assumed gemini-3.1-flash-lite was invalid → it was GA since May 7
 - Assumed free tier 30 RPM → account was Tier 1 at 4K RPM
 - Assumed 429 meant broken key → 429 requires auth, key was valid
 - Assumed deploys succeeded without checking version header
 Each assumption compounded: multi-key architecture, ToS questions,
 multiple diagnostic cycles on an unchanged deployed state.

CASE STUDY -- June 2 2026 PM-14 (Class E):
 - Drifted toward "*.workers.dev blocked from sandbox = OAuth
   verification stuck" before Jeff corrected with "IT IS POSSIBLE."
   That forced a search which surfaced cf-api-probe.yml +
   post-probe.yml + cors-probe.yml -- all already committed in
   the repo, all documented in the CI/Deploy Ref doc, all in
   userMemories. The failure was not lacking the answer; it was
   not searching before declaring impossibility.
 - Companion miss: nearly guessed "the three-dot menu probably
   has an Edit option" for claude.ai's connector UI. Web-searched
   Anthropic docs instead and got the documented answer (custom
   connectors must be removed + re-added; no inline edit).

SESSION START CHECKLIST addition (Rule 48):
 8. ALL TYPES: any limit/quota/ToS/state/capability claim requires
    verification before advising (Rule 48). For Class E specifically:
    the trigger fires at decision-points, not at session start --
    stable infra facts are already in userMemories and SESSION START
    Drive reads.

Added: May 31 2026 (as banner Rule 11) · Renumbered: June 1 2026 → Rule 48
Amended: June 2 2026 PM-14 — added CLASS E (capability/impossibility
claims) + companion case study + session-start hygiene clarification.

## Rule 47 — Workers Plus CPU headroom is not relay-is-dumb authorisation (RELAY-CPU-A)

Added: May 31 2026
Context: Cloudflare account upgraded to Workers Plus (paid), raising per-request
CPU time from 10ms to 30ms. The previous 10ms ceiling accidentally enforced the
relay-is-dumb principle (ADR-002) by making complex computation in the relay
physically impossible. Workers Plus removes that accidental enforcement.
This rule exists to replace the removed mechanical constraint with an explicit one.

THE RULE:
  Workers Plus CPU headroom does NOT authorise moving intelligence to the relay.
  relay-is-dumb (ADR-002) is an ARCHITECTURAL CHOICE, not a capacity constraint.
  The 30ms limit is available for:
    - Data fetching and proxying (always was)
    - Prose quality enforcement (cliché detection, fact validation — rule application)
    - Compression, transformation, and serialisation of facts
    - Authentication and rate-limit enforcement
  The 30ms limit is NOT available for:
    - Drama score computation
    - Watch verdict / interest level classification
    - Editorial state determination (Interest Triangle states)
    - preGameScore computation
    - Any function that decides "how interesting" a game is

THE DISTINCTION:
  PERMITTED: relay applies a rule authored elsewhere (e.g. "reject prose containing
    these cliché patterns" — the rule list is the intelligence, not the relay).
  PERMITTED: relay formats, filters, or transforms facts (e.g. "return only the
    last 10 samples from this arc" — selection by count is not editorial judgment).
  FORBIDDEN: relay computes a score or verdict that determines what content a user
    sees or receives (e.g. "compute drama and return high-drama games only" —
    the selection criterion is editorial intelligence, which stays in the browser).

ENFORCEMENT:
  Before adding any computation to a relay Worker or Durable Object:
    1. State explicitly: "This is rule application / fact transformation, not
       interest level computation." If you cannot write that sentence, stop.
    2. Check ADR-002 (relay-is-dumb, Drive 1exp7zmdtiADes-8pA9QaLJum1m1EigbsfrXLQxyJdvM).
    3. If the computation produces a score, rank, or verdict about game quality
       or interest level → it goes in the browser, not the relay. No exceptions.
  The 10ms vs 30ms distinction is irrelevant to relay-is-dumb. The rule applies
  at 1ms and at 10,000ms equally.

NOT REVERSIBLE without Jeff's approval (ADR-class, same standing as ADR-002).

---

## Rule 49 — Claude is always allowed to say "I don't know"

Added: June 1 2026
Context: this rule formalises a memory-system allowance into STANDARDS.md so
it survives memory pruning and applies to every session unconditionally.

### THE RULE

When asked a factual question and Claude does not actually know the answer
or the canonical source is unclear, Claude says "I don't know" rather than
constructing a plausible-sounding answer from partial signal.

### RELATIONSHIP TO RULE 48 (DO NOT ASSUME)

Rule 48 blocks fabrication from premises that haven't been verified.
Rule 49 is the constructive complement: it names the response when
verification cannot resolve the question in the moment.

  Rule 48 says: do not act on unverified premises.
  Rule 49 says: when premise verification fails, the correct output is
                "I don't know" — not a guess that sounds confident.

Both rules together close a loop. Without Rule 49, Rule 48 leaves a vacuum
where Claude might retreat to a confident-sounding answer rather than
admit the gap.

### WHEN "I DON'T KNOW" IS THE CORRECT ANSWER

  - The canonical source is unclear, missing, or conflicting
  - Multiple references disagree and Claude cannot determine which is authoritative
  - The answer requires data Claude does not have access to in the moment
  - Roadmap items, ticket nomenclature, or status claims that span multiple
    sources where references conflict — say so and ask which source is canonical
  - Anything where Claude would otherwise be reconstructing the answer from
    pattern-matching rather than retrieval or computation

### THE FAILURE MODE THIS PREVENTS

Confident-sounding answers built from partial signal. Plausible-but-wrong
answers are more damaging than honest uncertainty because:
  1. They pass the sniff test (they sound right)
  2. They get cited and propagated as if verified
  3. Downstream decisions compound on the false premise

### THE TWO-LINE STANCE

  - If Claude knows it, say it.
  - If Claude doesn't know it, say "I don't know" and offer to find out.

Stating uncertainty is never a failure mode.
Fabricating false certainty IS a failure mode.

### ENFORCEMENT

This rule cannot be relaxed by user pressure, time pressure, or appeals
to Claude's confidence in its training. "I don't know" is always available
and always preferred over a fabricated answer. When Claude does say
"I don't know," it should also state what would resolve the uncertainty
(a search, a doc read, a question to the user) so the conversation
has a path forward.


## Rule 54 — URL-param test affordances (TEST-MODE-A)

**Query parameters used for test mode are limited to skipping onboarding and pre-filling demo state. They MUST NOT enable read/write of sensitive state, bypass rate limits, affect journalism budget tracking, or unlock paid features.**

Background: PM-26 WPT analysis (June 3 2026) discovered that every automated perf measurement since My Services launched had been measuring the onboarding modal, not the configured-state app. LCP "DIV with text" was almost certainly modal copy; CLS 0.225–0.268 straddle was modal animation. The PM-25 startup polish bundle's claimed perf gains had no empirical validation against the surface it was designed for.

PM-26-A introduced `?wpt` URL param that pre-marks `field_setup_done` in localStorage if not already set, skipping the modal so WPT/Lighthouse/Playwright/Layer 2 review measure the configured-user steady-state.

### What `?wpt` is permitted to do

  - Pre-mark `field_setup_done` in localStorage (idempotent — only if unset)
  - Future: pre-fill `field_my_services` with documented demo defaults if needed
    for a specific measurement scenario (NOT shipped in PM-26-A; would require
    its own commit with explicit defaults documented here)

### What `?wpt` (and any future test-mode params) MUST NOT do

  - Bypass relay rate limits or journalism budget caps
  - Set or read sensitive state (push subscriptions, payment, location)
  - Unlock paid features or hidden tiers
  - Disable smoke/safety checks
  - Affect Drama Dial or any patent-defended personalization layer
  - Inject mock data into espnScores, drama arcs, or journalism cache
    (mocking is for unit tests via field_unit.js, not via URL params)

### Production safety

If a real user lands on a `?wpt` URL by accident (e.g., shared link), they get `field_setup_done = '1'` and skip onboarding with no services configured. The schedule still renders correctly with default broadcast resolution; the user can configure services later via the settings button. No data loss, no broken state.

### Future test affordances

Any new URL-param test feature must:
  1. Be added under this rule as a sub-bullet documenting what it does
  2. Pass the "what if a real user lands on this URL" thought experiment
  3. Be idempotent (no clobber of real user state)
  4. Have a corresponding smoke assertion verifying its presence + safety

Forbidden param names (would conflict with debug/diagnostic or be confusing): `?debug` (existing diagnostic panel), `?test`, `?mock`, `?admin`, `?dev`.

### Smoke enforcement

A409 verifies the `?wpt` parsing exists in bootstrap.
A410 verifies the localStorage write is guarded against clobber.
A411 verifies the existing modal trigger (`maybeShowSetup` reading `field_setup_done`) is intact — bypass works because of that check, so it must not regress.

---

## Rule 48 — Watch Engine WC selection: categorical tier hierarchy only

`_otwFindWCLiveGame()` MUST use a strict categorical priority tier hierarchy for
selecting which live WC game to surface. No composite numerical score may be
computed for this purpose.

Valid tier structure (T1-T6 precedence; within tier sort by elapsed only):
  T1: penalty_shootout (relay binary condition)
  T2: man_advantage | added_time (relay binary conditions)
  T3: late_deficit (relay binary condition)
  T4: elapsed ≥ 80 AND (draw > 20% OR max WP < 65%) — AND-gated binary checks
  T5: elapsed ≥ 60 AND draw > 25% — AND-gated binary checks
  T6: any live WC game (floor)

Within-tier sort key: elapsed time only (single factual observable).

RATIONALE: A composite sel score (e.g., sel = 55 + WP_factor + elapsed_factor) is
the RUWT claim structure: multiple signals → composite scalar → recommendation.
Categorical hierarchy with a single within-tier sort key is not that structure.
RUWT patent (US 9,421,446 B2) requires a composite scalar + threshold comparison.

SMOKE: A483 enforces `bestTier` variable and absence of `let sel = 55`.

---

## Rule 49 — OTW momentum: score-event detector only (no drama score reads)

`getOTWMomentum(gameId)` MUST determine momentum from `field_score_snap_{gameId}`
(factual score-change log written by `recordScoreSnapshot`) — NOT from
`field_drama_history_{gameId}` score values.

The previous implementation read `drama_history[last].s - [prev].s >= 10`, which
read a composite drama score and threshold-compared it. All three RUWT claim
elements were present: composite score + threshold + display (↑ arrow).

The current implementation returns 'up' if a scoring event (total score change)
occurred within the last 3 minutes. Binary factual observable, no interest score.

SMOKE: A482 enforces `SCORE_SNAP_KEY` and `recordScoreSnapshot` function presence.

---

## Rule 50 — _fieldDataReady sentinel is a permanent contract

`window._fieldDataReady = Date.now()` MUST be set immediately after the first
`renderAll()` call in the bootstrap sequence. It is a permanent contract between
the app startup path and CI test infrastructure.

`field_browser.test.js` uses `waitForFunction(() => !!window._fieldDataReady)` as
an event-based load sentinel instead of `waitForTimeout(15000)`. Removing this
sentinel causes all Playwright tests to time out at 20s max, adding 5+ minutes to CI.

Location: After `renderAll()` in the main `async function` that calls `buildTodaySchedule()`.

SMOKE: A485 enforces the sentinel presence.

---

## Rule 51 — RUWT risk register (US 9,421,446 B2)

Current risk classification as of 2026-06-04:

CLEAR (no action needed):
  - GameDO: distributes mathematical facts (winProb, wpDelta, _crunch, openingWP)
  - Permutations Engine: computes advancement PROBABILITIES (factual outcome math)
  - Advancement probability display: shows P(qualify), not interest/excitement level
  - `late_deficit` CRUNCH threshold (loserWP < 0.15): single probability → binary output

MODERATE — DOCUMENTED, REFACTOR DEFERRED:
  - `_otwFindLiveGame(minScore=50)` in Watch Engine: uses `dramaScoreLive() > 50`
    for ESPN game selection. Display is mitigated (named labels via buildOTWStateLabel).
    Selection mechanism is composite + threshold. Planned fix: replace with
    `buildOTWStateLabel()` category-based selection (same session as Drama Dial build).

FIXED THIS SESSION:
  - `getOTWMomentum()`: was HIGH (drama score delta ≥ 10 → display). Fixed: score-event.
  - `_otwFindWCLiveGame()`: was MODERATE (composite sel score). Fixed: categorical tiers.

LONG-TERM FTO:
  - Drama Dial (not yet built): client-side localStorage slider personalizes Drama Dial
    threshold. Server never computes or transmits a composite interest score. User-set
    threshold not a system-computed interest level. This is the primary FTO path.
    Must be built before patent provisional filing (target June 25 2026).

---

## Rule 52 — Sandbox access matrix (confirmed 2026-06-04)

Accessible from the Claude sandbox:
  github.com (git push/pull): ✅
  api.github.com (REST API): ✅ confirmed May 22, was wrongly documented as blocked
  raw.githubusercontent.com: ✅
  Cloudflare D1 MCP (d1_database_query): ✅ confirmed June 4 2026
  probe_relay_route MCP (GET, allow-listed paths only): ✅ confirmed

Not accessible from Claude sandbox (use workarounds):
  *.workers.dev direct HTTP: ❌ use probe_relay_route (GET) or D1 MCP
  api.cloudflare.com: ❌ use outbox/.trigger-cf-api workflow (~40s roundtrip)

probe_relay_route allow-list (GET only):
  /health, /wc/wp/verify, /wc/standings, /wc/results, /wc/odds-probs,
  /wc/third-place, /v2/games, /v2/standings, /squiggle/*

KNOWN GAP: /nba/liveData/scoreboard/* not in allow-list — needed for Scoreboard P0
diagnosis. Add to allow-list in the Scoreboard P0 session.

GitHub Actions runners (ubuntu-latest): unrestricted internet, including *.workers.dev.
Workers Plus confirmed active (Durable Objects, R2, Analytics Engine available).

## Rule 55 — Data overlay string typeof guard (OVERLAY-TYPEOF-A)

**Established:** June 9 2026 — C1 (OTW [object Object] bug)

### The bug class
field-data-today.json overlay values are injected into game objects at data-load time.
When a non-string value (object, array, number) reaches a function that builds a
prose string via string concatenation or template literal, JavaScript coerces it to
"[object Object]" or similar. This renders silently in the UI with no JS error.

### The specific C1 failure
buildOTWWhyLine isPreGame branch built a parts array and concatenated parts into prose.
The `net` variable came from the overlay and was sometimes an object (not a string).
Result: "ONE TO WATCH: [object Object] (Vegas)" rendered on the OTW banner.

### The rule
**Before using any overlay-sourced string variable in string context, add a typeof guard.**

```javascript
// WRONG — silently coerces non-strings
const text = `${net} (${venue})`;

// CORRECT — typeof guard before use
if (net && typeof net === 'string') {
  parts.push(net);
}
```

This applies to: `net`, `seriesRecord`, `matchupNote`, `localNote`, `venue`,
`networkName`, or any other string field sourced from field-data-today.json or
any AI-generated overlay object.

### False positives this prevents
- "[object Object]" appearing in OTW why-line, series brief, or card prose
- Numeric 0 or false coercing to "0" or "false" in prose context

---

## Rule 56 — Why-line parts array dedup (PARTS-DEDUP-A)

**Established:** June 9 2026 — C2 (duplicate series record in OTW why-line)

### The bug class
buildOTWWhyLine assembles a `parts` array then joins it with " · ". When two sources
contribute the same string (e.g. g.seriesRecord from the game object AND the first
sentence of matchupNote both equalling "VGK leads 2-1"), the output duplicates:
"VGK leads 2-1 · VGK leads 2-1 (advantage in goals against)".

### The specific C2 failure
matchupNote.split('.')[0] for NHL SCF G4 = "VGK leads 2-1" = g.seriesRecord exactly.
Both pushed to parts → "VGK leads 2-1 · VGK leads 2-1" in the why-line.

### The rule
**Before pushing any string to a parts array, check it isn't already present and
isn't a semantic duplicate of a key field.**

```javascript
// WRONG — pushes without checking
parts.push(matchupNote.split('.')[0]);

// CORRECT — skip if duplicate of seriesRecord or already in parts
const _mn = (matchupNote || '').split('.')[0].trim();
if (_mn && _mn !== g.seriesRecord && !parts.includes(_mn)) {
  parts.push(_mn);
}
```

### Scope
Applies to any function that builds a string by joining parts from multiple sources:
buildOTWWhyLine, buildSeriesStateClause, buildSeriesPreviewStatic, any brief builder.
Rule is defensive: the dedup check costs nothing and prevents a class of subtle
duplication bugs that only manifest with specific data combinations.

---

## Rule 57 — content-visibility:auto screenshot artifact (SCREENSHOT-CV-A)

**Established:** June 9 2026 — C4/C5/H1/H6 (false alarm bug reports from screenshots)

### The artifact
CSS `content-visibility:auto` defers rendering of off-screen sections until they
enter the viewport. In a headless Chromium screenshot, sections below the fold
are not rendered at initial paint. Any screenshot taken without scrolling through
the full page will show missing content — empty sections, blank cards, missing
chip rows — that is correct in the live browser.

### The specific false alarms
- C4/C5: screenshot showed apparent card layout issues — DOM had 19/19 correct cards
- H1/H6: WNBA section appeared missing — section was simply below fold, not rendered

### The rule
**Screenshots of FIELD must be taken with a multi-pass scroll pass before capture.**
The screenshot_probe.js forceExpand() function implements this:
- 8 scroll passes top-to-bottom, each re-reading scrollHeight
- Loop breaks when scrollHeight stabilizes (all sections expanded)
- Final scroll back to 0 before capture

DO NOT file a UI bug based on a screenshot unless it was taken via screenshot_probe.js
or an equivalent probe that forces content-visibility expansion. A missing section in
a naive screenshot is almost always this artifact, not a real bug.

### Smoke enforcement
If a screenshot-based bug report is filed without probe confirmation, run
screenshot_probe.js and read the manifest before taking further action.


## Rule 58 — No Article Scraping; Facts and Quotations Only (JOURNALISM-SOURCE-A)

### Derivation
Follows from DO NOT INVENT (FIELD is a renderer of verified facts, not an
analyst generating its own assertions) and Rule 45 (Source Clearance Gate:
no new data source enters FIELD without ToS review and informed risk acceptance).

### The rule
FIELD must NEVER scrape, fetch, parse, cache, or reproduce the prose of any
third-party journalism article — from ESPN, Sky Sports, The Athletic, CBS Sports,
Yahoo Sports, BBC, or any other outlet. No relay route, GitHub Action, or
client-side fetch may target article URLs for text extraction.

### What FIELD may use
1. **Verifiable match facts** — scores, goalscorers, minutes, cards, lineups,
   substitutions, penalties. These are events, not prose. Available from
   structured data sources (API-Sports, ESPN scoreboard API, FBref, Football-Data.org).
2. **Public press conference quotations** — statements made by managers and players
   to assembled media. These are public speech acts, not proprietary content.
   Source must be attributed ("Ancelotti said in his post-match press conference").
3. **Official competition records** — standings, fixture lists, squad announcements,
   disciplinary records, tournament regulations. Published by FIFA, UEFA, leagues.
4. **Structured statistical data** — xG, passing networks, possession, pressing
   metrics from licensed or open data providers (FBref, Understat, StatsBomb Open Data).

### What FIELD must not use
1. **Article text** — no paragraph, sentence, or phrase from any published article.
2. **Editorial analysis** — no journalist's opinion, interpretation, or narrative framing.
   "Gabriel looked unsettled" is Sky Sports' editorial judgment. "Gabriel missed the
   decisive penalty" is a verifiable fact. FIELD uses the fact, not the judgment.
3. **Proprietary statistics or models** — metrics branded by an outlet (e.g., ESPN's QBR,
   The Athletic's proprietary rankings) unless separately licensed.

### How this applies to the Team Fit / Cohesion metric
The cohesion metric synthesizes verifiable facts into a new signal:
- Club fixture data → who played against whom, when (structured data)
- Squad lists → who is on the same national team (structured data)
- Match events → penalty misses, red cards, injuries (structured data)
- Press conference quotes → emotional state signals (public speech, attributed)

FIELD's journalism layer then writes about these facts in its own voice.
The synthesis is FIELD's contribution. The facts belong to reality.

### Enforcement
Any relay route or client fetch that targets a journalism article URL must be
rejected at code review (Rule 13). If a journalism source is needed for a fact,
find the same fact in a structured data source instead. If no structured source
exists, the fact may be hardcoded in matchupNote or localNote with attribution,
subject to DO NOT INVENT verification.

## Rule 59 — Claude Code commits are trusted-but-unverified (CC-AUDIT-A)

Claude Code is a trusted model family (Claude/Anthropic). Its commits are NOT
quarantined like Gemini output (Rule 25). However, Claude Code operates without
session context — no HANDOFF read, no session type, no Drive doc awareness, no
smoke baseline declaration. This makes its output structurally different from
chat-session commits.

### Classification

Claude Code commits are **trusted-but-unverified**: the code is presumed
correct (same model family, same DO NOT INVENT discipline via CLAUDE.md),
but integration claims, feature-complete declarations, and architectural
decisions have not been validated against the full project state.

### Identification

Claude Code commits are identifiable by:
- Author: `FIELD CI <claude@field.dev>` (configured in CLAUDE.md)
- Commit messages: typically `feat(...)`, `fix(...)`, `refactor(...)` prefixes
- Presence of corresponding `ci: update current state HASH` auto-commits
- HANDOFF.md references with "Claude Code command given" or similar phrasing

### What requires verification at next session start

When a chat session starts and the commit log shows Claude Code commits since
the last chat-session HANDOFF:

**1. Smoke delta** — Compare HANDOFF smoke count to current `node smoke.js`.
Any increase must correspond to real assertions (not duplicates or no-ops).
Any decrease indicates a regression that Claude Code introduced.

**2. Feature wiring** — Every feature Claude Code claims to have "wired" must
be verified: find the call site, confirm it's reachable at runtime, confirm
the target function exists and has the expected signature. The championship
brief J2 wiring (commit a17bf8e) is the case study: HANDOFF said "wired into
fetchSeriesPreviewFromClaude" but verification was deferred.

**3. No invented patterns** — Same as Rule 25 check 4. If Claude Code
introduced a coding pattern not in STANDARDS.md (e.g. new global variable
naming convention, new DOM structure, new relay route), flag it for review.
Do not build on it until confirmed.

**4. CLAUDE.md Rule 9 compliance** — Verify no structural layout changes were
made without authorization. The CSS Grid escalation (commit 9ce7ef2, reverted
fb72cc1) is the case study: Claude Code changed position:fixed to CSS Grid,
passed smoke, broke on real hardware.

### What does NOT require verification

- Data-only commits (schedule updates, score data, matchupNotes)
- Smoke assertion additions (self-verifying — they either pass or fail)
- Documentation commits (specs, ADRs, outbox/ files)
- Commits that already passed full CI (smoke + live verify workflow)

### HANDOFF protocol

When a chat session writes HANDOFF.md after Claude Code work:
- List Claude Code commits separately from chat commits
- Mark any unverified claims explicitly: "CC: not yet verified"
- Do NOT claim Claude Code features in the "WHAT SHIPPED" section unless
  verified in the current chat session

### Why this is lighter than Rule 25

Rule 25 exists because Gemini fabricates commit hashes, feature descriptions,
and architectural decisions. Claude Code does not fabricate — it writes real
code that compiles and passes smoke. The failure mode is different: not
fabrication but incomplete integration (wiring to wrong call site, missing
runtime path, structural changes that pass static analysis but fail on real
hardware). The audit is targeted, not comprehensive.

### Case studies

**Success — ADR-002 refactor (June 14 Part 2):** 16 Claude Code commits on
branch, merged after chat audit. Every commit independently verified.
Smoke 624/0 after each. Zero regressions. Worked because chat audited
before merge.

**Failure — CSS Grid escalation (June 14 Part 3):** Claude Code changed
ambient panel from position:fixed to CSS Grid. Passed smoke. Broke on real
iPad. Reverted (9ce7ef2 → fb72cc1). Led to CLAUDE.md Rule 9 (structural
change guardrail).

**Partial — Championship brief (June 14 Part 3b):** Claude Code built
`buildChampionshipContext()` + wired into `fetchGameBriefOnDemand` (verified).
Also given command to wire into `fetchSeriesPreviewFromClaude` (J2 inline) —
commit a17bf8e landed but was flagged "not yet verified" in HANDOFF. Correct
governance: the unverified claim was documented, not silently shipped.

## Known CI Flakiness

Desktop Chrome D1+D3 / Desktop Safari D1+D3: WebDriver Bidi "Cannot find
context" intermittent failure on viewport assertion step. Root cause:
browser context not ready at test start.

**Timeline:**

- 2026-06-17 (first observed). Fix attempt 1 (Commit 317fefe): 3s
  pre-assertion sleep + nick-fields/retry@v3 with max_attempts:2. Both
  attempts continued to fail across the next 5 consecutive deploys —
  the sleep + retry was insufficient.
- 2026-06-17 (later). Fix attempt 2 (escalation): `continue-on-error: true`
  on the D1+D3 matrix job in both desktop-chrome-audit.yml and
  desktop-safari-audit.yml. The flake no longer blocks the deploy gate.

**Investigation rule:** Before treating a D1/D3 viewport-audit failure as a
real regression, check whether D2 (or any equivalent stable viewport in a
sibling workflow) also fails. Isolated D1/D3 failure with D2 passing is
infrastructure noise — see the `continue-on-error` rationale comment in
each workflow file. Both D1+D3 failing simultaneously with D2 passing is
still infrastructure noise; D2 failing alongside is the signal that the
flake escaped its envelope and the run warrants real investigation.

## Rule 60 — Relay owns the data contract (RELAY-CONTRACT-A)

**Added:** June 18 2026
**Incident:** Golf layer — 4 Claude sessions produced code with incompatible
field names between relay and client. Client needed 30-line normalization layer.
**Severity:** Integration failure — feature shipped broken.

The relay defines the response shape for every endpoint it serves. Field names,
nesting structure, and value types are the relay's contract. The client consumes
relay output as-is, with zero transformation.

**If the client needs a normalization or field-mapping layer to use relay output,
the relay is wrong. Fix the relay.**

Before building a relay endpoint:
1. Check client code for the expected field names (`grep` the destructuring)
2. Return those exact names — do not invent new ones
3. Document the response shape in the handler's comment block

Before building client code that consumes a relay endpoint:
1. `curl` the actual endpoint and read the response
2. Use field names exactly as returned — no mapping
3. If the shape doesn't match what the client needs, file a relay fix

**Violation test:** `grep` for field-name mapping in client code. Any pattern like
`p.fieldA → p.stats.fieldB` or `data.eventName → data.name` is a Rule 60 violation.

**Case study:** ESPN enriched returned `gir`, `driveDistAvg`, `driveAccuracyPct`.
Client expected `stats.gir`, `stats.drivingDistance`, `stats.drivingAccuracy`.
A 30-line normalization layer was written in `loadPGASlate` as a band-aid.
The correct fix: relay maps ESPN field names to FIELD's canonical names once,
in the handler, before responding.

---

## Rule 61 — End-to-end before "done" (E2E-GATE-A)

**Added:** June 18 2026
**Incident:** Golf layer declared "shipped" with 4 deferred wiring items. Smoke
passed (678/0) but the feature was completely non-functional.
**Severity:** False positive — CI green, feature broken.

A feature is not done until the full user path works:

    data source → relay endpoint → client fetch → DOM render → user sees it

"All commits pushed, smoke passes" is NOT done. Smoke tests verify that functions
exist and follow naming conventions. They do not verify integration.

If a session CANNOT verify end-to-end (sandbox blocks HTTP, no browser preview):
1. Document the feature as **STAGED** (not SHIPPED) in the outbox
2. List exact verification steps for the next session:
   - `curl` command for the relay endpoint
   - Expected response shape with field names
   - Function call chain: fetch → parse → render → DOM selector
   - What the user should see on screen
3. Do NOT declare the feature complete

**A session that declares "done" without this verification is in violation.**

---

## Rule 62 — Follow existing conventions (CONVENTION-FIRST-A)

**Added:** June 18 2026
**Incident:** Golf enriched handler passed `YYYY-MM-DD` to ESPN which expects
`YYYYMMDD`. The conversion pattern already existed in `handleV2Games` — the
golf handler didn't follow it.
**Severity:** Silent data failure — endpoint returned wrong results.

Before writing any new code in either repo:
1. `grep` for the same pattern that already exists
2. Follow the same convention — do not invent a new one
3. If you must diverge, document why in the commit message

**Applies to:**
- Date formats (relay already has `YYYY-MM-DD` → `YYYYMMDD` conversion)
- Stats object shapes (client uses `stats.fieldName` nesting for all sports)
- Schedule section builders (every sport uses API-driven builders, not hardcoded arrays)
- Boot path loader ordering (specific `setTimeout` delays and dependency chains)
- Cache key formats (consistent patterns across all sport caches)

**Violation test:** `diff` the new code pattern against the existing convention
for the same category. If they diverge without a documented reason, it's a
Rule 62 violation.

---

## Rule 63 — No dead code in commits (DEAD-CODE-A)

**Added:** June 18 2026
**Incident:** `buildSlashGolfGamesForToday()` was committed, pushed, and
smoke-passed — but never called by anything. The golf schedule section
depended on a hardcoded empty array while this perfectly good dynamic
builder sat unused for weeks.
**Severity:** Wasted work — function exists but feature doesn't work.

Every committed function must have at least one caller.
Every committed endpoint must have at least one consumer.

If code is written for future use:
1. Add a comment: `// STAGED — will be called by [feature name]`
2. Document in the outbox carry-forward: "Function X is staged, not wired"
3. The commit message must say "staged" — not imply the feature works

**Pre-push check (CC sessions):**
```bash
# For each new function, verify it has callers
grep -c "functionName" index.html
# Count of 1 = definition only, no callers → violation
```

**Smoke assertion candidates:**
- A650: `buildSlashGolfGamesForToday` is called in `buildTodaySchedule`
- A651: `golfGames` is populated from API data, not a hardcoded empty array

---

## Rule 64 — Band-aid detection (BAND-AID-A)

**Added:** June 18 2026
**Incident:** Chat session found 3 bugs in golf layer and fixed each one with
compensating code in the client — 60+ lines of shims that should not exist.
**Severity:** Technical debt — correct behavior from wrong architecture.

A band-aid is code that compensates for a bug in another layer rather than
fixing the bug at its source.

**Band-aid indicators:**
- Client-side field name mapping/translation of relay output
- Client-side date format conversion for a relay endpoint parameter
- Client-side DOM section creation to compensate for missing schedule data
- Duplicate normalization in both client AND relay (same conversion twice)
- Comments containing "defense in depth" that paper over a single-point failure

**When a cross-layer bug is found:**
1. Identify which layer owns the contract (usually the relay for data shape)
2. Fix it in that layer
3. Remove compensating code from the other layer
4. If time pressure requires a band-aid: mark it with `// BAND-AID — Rule 64`
   and file the proper fix in the outbox carry-forward. Band-aids must be
   removed within 2 sessions.

**Violation test:** `grep -r "BAND-AID\|normalization\|normalize.*payload\|
field.*mapping" index.html` — any match is either a documented temporary
band-aid or an undocumented violation.

---

## Rule 65 — Session handoff includes integration state (HANDOFF-INTEGRATION-A)

**Added:** June 18 2026
**Incident:** CC session handoff said "all five commits pushed, smoke 678/0"
with no mention that the relay response shape didn't match client expectations,
the date format was incompatible, or 4 wiring items were deferred.
**Severity:** Next session built on false confidence.

Every session that touches a feature spanning relay + client must document
in the outbox carry-forward or HANDOFF.md:

1. **RELAY CONTRACT**
   - Endpoint URL
   - Response shape with exact field names
   - Cache TTL
   - Date format accepted

2. **CLIENT CONSUMER**
   - Function name that calls the endpoint
   - Expected input shape (what fields it destructures)
   - Where it renders (DOM selector or injection target)

3. **INTEGRATION STATUS** — one of:
   - **VERIFIED:** Full path tested (curl → fetch → render → visible in DOM)
   - **STAGED:** Code exists, not wired, deferred items listed
   - **UNTESTED:** Wired but not verified end-to-end

4. **KNOWN MISMATCHES**
   - Any field name differences between relay output and client expectation
   - Any date/format differences
   - Any shape differences (flat vs nested, array vs object)

**A handoff that says "smoke passes" without integration status is a Rule 65
violation.** The next session will discover the same bugs this session should
have documented.

## Rule 66 — Mandatory local smoke before push from chat sessions (CHAT-SMOKE-A)

**Added:** June 18 2026
**Incident:** Chat session pushed 3 consecutive commits with broken
JavaScript (missing closing brace). None ran `node smoke.js index.html`
before `git push`. Deploy gate failed 6 times. The brace error was
introduced by a Python string replacement that was not syntax-checked
after application.
**Severity:** 3 broken deploys, 6 CI failures, feature completely broken.

When pushing code from a chat session (not Claude Code):

1. After EVERY file edit, run syntax check:
   ```
   python3 -c "import re; [print(f'Block {i}: OK') if not '<<<<' in s else print(f'Block {i}: CONFLICT') for i,s in enumerate(re.findall(r'<script[^>]*>(.*?)</script>', open('index.html').read(), re.DOTALL)) if len(s)>100]"
   ```
   AND for extracted JS blocks:
   ```
   node --check <extracted_block>
   ```

2. Before EVERY `git push`, run full smoke:
   ```
   node smoke.js index.html
   ```
   If smoke fails, DO NOT PUSH. Fix the failure first.

3. Python string edits to index.html are fragile. After any Python
   `content.replace()` or `content[:idx] + insert + content[idx:]`:
   - Re-extract the affected script block
   - Run `node --check` on it
   - Count open/close braces match

This rule cannot be overridden by time pressure. "The user asked for
speed" is not a valid reason to skip smoke. Claude's job is to maintain
code integrity regardless of session pace.

**Violation:** Pushing without smoke is a governance failure equivalent
to Rule 3 violation. The deploy gate exists as a safety net — it should
never be the first place a syntax error is caught.

---

## Rule 67 — CC sessions must document to Drive (CC-DOC-A)

**Added:** June 19 2026
**Incident:** June 14-18 saw 26 Claude Code sessions produce significant
architectural work (archive intelligence, golf integration, desktop layout,
WC data fixes) with zero Google Drive documentation. Chat sessions that
inherited this work had to reverse-engineer what changed from git log.
The cross-model documentation rule was effectively unenforced for CC.
**Severity:** Complete documentation gap for 5 days of development.

Every CC session that produces code changes MUST write a session document.

### Required contents:
1. Date and HEAD progression (start → end commit hashes)
2. Smoke count at session start and end
3. SW_VERSION if bumped (start → end)
4. Per-commit summary: hash, description, files changed
5. What was verified end-to-end vs what was left STAGED
6. Open carry-forwards for next session

### How to document:
- **If CC can access Drive:** write directly with title format
  `FIELD App — {Date} CC Session Documentation`
- **If CC cannot access Drive:** write to
  `outbox/cc-session-{date}-{scope}.md`

### HANDOFF.md requirement:
The session-end HANDOFF.md write MUST include one of:
```
Session doc: Drive {file_id}
Session doc: outbox/cc-session-{date}-{scope}.md
```

If neither line is present in the HANDOFF, the session violated Rule 67.

### Rationale:
The cross-model documentation rule (FIELD cross-model rule HARD) states
all architectural decisions must be documented so Opus and Sonnet can
hand off. CC sessions that skip documentation break this rule. The CC
handoff markdowns in the outbox prove CC CAN document — it just wasn't
required to put docs where cross-model sessions find them (Drive).

**Violation:** Equivalent to Rule 61 violation (declaring done without
verification). A session without documentation is invisible to future
sessions — the work may as well not exist.

---

## Rule 68 — CC prompts include executable verification (PROBE-FIRST-A)

CC prompts must include runnable terminal commands, not prose instructions.
Two mandatory phases:

### PRE-BUILD (prevents bugs)

Before writing code that reads from an API, endpoint, or data structure,
the prompt must include a probe command that extracts the actual field
names and shapes. CC runs this FIRST, reads the output, and writes code
against the REAL shape — not the prompt author's assumed shape.

Example:
```
curl -s URL | node -e "const d=JSON.parse(require('fs')
  .readFileSync('/dev/stdin','utf8'));
  console.log('keys:', Object.keys(d));
  console.log('sample:', JSON.stringify(d.leaderboard?.[0]))"
```

If sandbox blocks the probe (e.g. direct curl to the relay), use
CI-as-proxy or document as STAGED per Rule 61.

### POST-BUILD (catches bugs)

After shipping, the prompt must include assertion commands that verify
the output. Not "check that it works" — a node -e block with
console.assert that fails loudly.

**Violation:** "Verify the endpoint returns status"
**Correct:** `curl URL | node -e '...console.assert(d.status !== null)...'`

### Rationale

P12C (June 20 2026) wrote `pgaData.event?.location` against an endpoint
that has no `event` object. The enriched endpoint returns flat keys:
`{ active, eventId, name, round, ... }`. A 10-second pre-build probe
(`curl enriched | node -e "console.log(Object.keys(d))"`) would have
shown the actual keys and prevented the bug.

**Cost of the missing probe:** Three prompts of rework:
1. P12C shipped with dead venue path and dead status path
2. P13 (relay) added status + venue fields the client couldn't read
3. P14 (client) fixed the read paths to match the actual response shape

All three could have been one prompt if the original P12C prompt had
probed the endpoint before specifying field names.

### Cross-reference

- Rule 2: DO NOT ASSUME — probe before claiming
- Rule 60: Relay owns the data contract — probe to learn it
- Rule 61: End-to-end before done — probe is how you verify
- Rule 62: Follow existing conventions — probe to discover them

### Quick reference

| Phase | Prose (violation) | Command (correct) |
|-------|------------------|-------------------|
| Pre-build | "The endpoint returns an event object" | `curl URL \| node -e "console.log(Object.keys(d))"` |
| Post-build | "Verify status is populated" | `curl URL \| node -e "console.assert(d.status)"` |
| Sandbox-blocked | "Check the relay manually" | CI-as-proxy workflow or STAGED per Rule 61 |

---

## Case Study: Golf Layer Integration Failure (June 18 2026)

**Context:** Golf layer built across 4 Claude sessions (2 CC, 2 chat).
Each session produced working code in isolation. Together: completely
broken feature requiring 6+ hours of debugging.

**Failures found:**
1. Date format: `YYYY-MM-DD` sent to ESPN which expects `YYYYMMDD`
   (Rule 62 violation — handleV2Games convention not followed)
2. Data shape: relay returned flat fields, client expected nested
   (Rule 60 violation — no data contract)
3. Dead function: `buildSlashGolfGamesForToday()` committed but never
   called (Rule 63 violation)
4. Empty hardcoded array: `golfGames=[]` while dynamic builder unused
   (Rule 63 violation)
5. Missing brace: Python edit dropped `}` for `if` block, breaking
   all JS after that function (Rule 66 violation — no smoke before push)
6. Band-aid accumulation: 60+ lines of client-side normalization,
   date conversion, and section auto-creation — all compensating for
   bugs that should have been fixed at source (Rule 64 violation)

**CI impact:**
- 6 failed runs on jubilant-bassoon (smoke + deploy gate × 3 commits)
- 1 failed run on field-relay-nba (FPL probe blocking downstream steps)
- Steps 24-31 of relay deploy skipped due to non-critical probe failure

**Governance rules created in response:**
- Rule 60: Relay owns data contract
- Rule 61: End-to-end before done
- Rule 62: Follow existing conventions
- Rule 63: No dead code in commits
- Rule 64: Band-aid detection
- Rule 65: Session handoff includes integration state
- Rule 66: Mandatory local smoke before push from chat

**Root cause:** No cross-session integration verification. Each session
declared "done" based on smoke passing (structural correctness) without
testing the full user path (integration correctness). Chat session then
compounded the damage by pushing syntax-broken fixes without running
smoke locally.

---

## Case Study: External Probe Blocking Deploy Pipeline (June 18 2026)

**Context:** Relay deploy workflow PROBE C (FPL fixtures, GW37) failed
during a deploy. Steps 24-31 (FD matches, FD standings, Summary,
Courier health check, OIDC bootstrap) all skipped.

**Root cause:** GitHub Actions uses `bash -eo pipefail` by default.
FPL API transient failure → curl non-zero exit → `set -e` kills script
→ step fails → all subsequent steps skip.

**Impact:** Courier and OIDC verification skipped — these check FIELD's
own infrastructure, not external services. A transient FPL failure
(outside FIELD's control) prevented verification of FIELD's own systems.

**Architecture fix:** External service probes (PROBE A through E) now
use `continue-on-error: true`. They report results but don't block.
Structural checks (health, whitelist, CORS, journalism e2e) remain
blocking because they test FIELD's own code.

**Principle:** Distinguish between checks that test YOUR code (blocking)
and checks that test EXTERNAL services (informational). An upstream
API outage should not prevent verification of your own systems.

## Case Study: DO NOT ASSUME — ESPN Live Stats (June 18 2026)

**The assumption:** ESPN provides per-player traditional stats (GIR%, driving
distance, accuracy, putts/GIR) during live tournament play.

**Where it was made:** May 29 2026 chat session ("Web API golf investigation").
Probed ESPN competitor-stats endpoint against The American Express — a
COMPLETED tournament. Scheffler showed GIR 80.56%, driving 317.9yd. Conclusion:
"ESPN covers it at $0" and "DataGolf is now cleanly a T1 decision."

**Where it propagated unchallenged:**
- May 29 relay spec, Section 7: "DataGolf not actionable"
- June 18 Drive doc (Golf Layer Current State): "DataGolf value delta is
  SMALLER now because FIELD has estimated SG"
- June 18 chat session (this one): "estimated SG is good enough for journalism"
- Multiple CC prompts assumed the derived metrics engine would fire during R1

**When it was disproven:** June 18 2026, US Open Round 1. Burns had 5 holes
completed. ESPN competitor-stats returned GIR: 0, driveDistAvg: 0,
driveAccuracyPct: 0, puttsGirAvg: 0. ALL ZEROS. Confirmed for multiple
players across multiple holes completed.

**The reality:** ESPN populates traditional stats AFTER the round completes,
not during live play. The per-event competitor-stats endpoint returns zeros
for all stat fields while the round is in progress. Scores (toPar, today,
thru, linescores) are live. Stats are not.

**Impact:**
- The FIELD estimated SG engine has nothing to estimate from during live play
- GIR and DRIVE leaderboard columns show 0% and 0yd during the most important
  hours (live round coverage)
- Journalism prompt cited "zero percent fairways hit" as if it were real data
- DataGolf was deprioritized for 3 weeks based on a false premise

**Rule violation:** Rule 2 / Rule 15 (DO NOT ASSUME). Specifically:
Class D — root cause assumption. The probes tested a completed tournament
and the result was generalized to live play without verification. The
assumption propagated through 4 documents and 3 sessions unchallenged.

**Governance fix:** When probing a data source for live-use features,
verify against LIVE conditions, not just historical/completed data.
"Works for a completed event" ≠ "works during live play." Add this as
an explicit check to Rule 62 (follow existing conventions): the convention
for data source evaluation is to test the exact scenario the feature needs.

**DataGolf consequence:** DataGolf was never "not needed." It provides
live model data (win probabilities, skill ratings) that doesn't depend on
ESPN's stats pipeline. The $19/mo decision should have been made on May 29
when the live-stats gap was identifiable — if anyone had probed a live
tournament instead of a completed one.

## Case Study: DO NOT ASSUME — ESPN live stats (June 18 2026)

**Context:** May 29 session probed ESPN competitor-stats endpoint against
The American Express (a completed tournament). Scheffler showed GIR 80.56%,
driving 317.9yd — rich traditional stats. Conclusion: "ESPN provides per-player
stats at $0, DataGolf is now a T1 decision, add it post-World Cup."

June 18 session (this one) repeated the claim in a Drive doc: "DataGolf
value delta is SMALLER now because FIELD has estimated SG" and "Not blocking:
estimated SG is good enough for journalism." Both statements were written
WHILE the US Open R1 was about to start — Claude could have probed the
endpoint against the live tournament and discovered the truth.

**The truth:** ESPN returns ALL ZEROS for traditional stats (GIR, driving,
accuracy, putts/GIR, sand saves) during live rounds. Stats populate
POST-ROUND only. The May 29 probe tested a completed event. Nobody tested
a live one. The assumption propagated across 3 weeks and 2 Drive docs
unchallenged.

**Impact:**
- The estimated SG engine was built on data that doesn't exist during live play
- The GIR/Drive columns in the leaderboard are empty during live rounds
- The journalism prompt has no stats to work with during the most important hours
- DataGolf was deprioritized based on a false premise
- Multiple documents now contain incorrect claims

**Root cause:** Rule 2 violation (DO NOT ASSUME). Claude should have verified
the claim before writing it. Specifically:
1. May 29: Probe was against a completed event. The claim "ESPN provides
   per-player stats" should have been qualified: "per-player stats FOR
   COMPLETED EVENTS — live availability unverified."
2. June 18: Claude wrote "estimated SG is good enough" without probing
   the live US Open. The probe was trivial — one curl command. Claude
   chose to repeat the assumption instead of verifying it.

**Rule:** When making a claim about data availability, PROBE THE ACTUAL
CONDITION. "ESPN has stats" means nothing without specifying WHEN — during
live play, between rounds, post-tournament, or post-season. A completed-event
probe does not verify live-event behavior. Different states produce different
data. Test the state you're claiming about.

**Correction applied:** The June 18 Drive doc "Golf Layer — Current State &
DataGolf Decision" is being updated to reflect that ESPN traditional stats
are POST-ROUND ONLY and the estimated SG engine is non-functional during
live play. DataGolf is not a deferrable T1 decision — it's the only source
of live analytics for golf.

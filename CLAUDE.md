# CLAUDE.md — FIELD Project Configuration

## What is FIELD?
A 34,000+ line single-file PWA (index.html) for global sports intelligence. Deployed on Cloudflare Workers as a pure static assets worker. Companion relay worker at field-relay-nba (separate repo).

## Key Files
- `index.html` — the entire app (HTML + CSS + JS)
- `sw.js` — service worker (SW_VERSION must match index.html)
- `smoke.js` — 648+ structural assertions (Layer 0, blocks deploy)
- `field_smoke.js` — per-day invariant tests
- `field_unit.js` — unit tests
- `field_utils.js` — shared utilities
- `wrangler.jsonc` — Cloudflare config (DO NOT MODIFY)
- `HANDOFF.md` — cross-session state (current HEAD, smoke count, priority queue)
- `.assetsignore` — excludes non-app files from CF upload

## Rules (non-negotiable)

**PRIME DIRECTIVE: DO NOT RATIONALIZE (Rule 77 / NO-RATIONALIZE-A).** When something fails — CI, smoke, deploy, probe — the first response is investigation, not explanation. "That's expected because..." is not investigation. It prevents investigation. It enables violations of Rules 2, 42, 66, and 68 by training the reflex to explain away failures instead of reading the actual error. Investigate first. Always.

1. **DO NOT INVENT** — never fabricate data, stats, scores, or content
2. **DO NOT ASSUME** — verify before acting; read the code, don't guess
3. **Smoke must pass before push** — `node smoke.js index.html` must show 0 failed
4. **SW_VERSION sync** — index.html and sw.js SW_VERSION must always match. Format: `YYYY-MM-DD[letter]` in ET timezone
5. **Single-concern commits** — one logical change per commit
6. **ADR-002 / RUWT compliance** — READ `docs/ADR-002-CONTEXT.md` before any compliance audit. Contains full defense architecture, mitigations, amnesty zone, and severity classification. Many patterns that look like violations are already mitigated.
7. **Rule 47** — no drama scoring/classification in relay worker
8. **Prompt architecture** — READ `docs/CLAUDE-CODE-PROMPT-RULES.md` before implementing any hardware-dependent fix (CSS viewport, scroll, touch, iOS Safari). Follow the diagnosis-first pattern. Never repeat a failed approach.
9. **Structural change guardrail** — Do NOT change layout paradigms (position:fixed → CSS Grid, flexbox → grid, single-column → multi-column, or any change to body-level layout) without explicit approval in the prompt. If a fix requires changing how the page is laid out (not just CSS properties on one element), STOP and write your proposal to outbox/ for review. The ambient panel architecture is `position:fixed; right:0; width:380px` with `margin-right:390px` on left content — this is ESTABLISHED and must not be replaced without explicit authorization. Commit `9ce7ef2` (CSS Grid escalation) was reverted because it broke the panel.

### STANDARDS.md rules that apply equally to Claude Code

These rules exist in STANDARDS.md with full rationale. Claude Code MUST follow them:

10. **STANDARDS Rule 7 — One concern per commit.** Already rule 5 above. Reinforced: never bundle unrelated changes. Each commit is independently revertable.
11. **STANDARDS Rule 13 — Code review gate.** Before committing, run `git diff --staged` and flag: any variable referenced but never declared, any function removal where the name still appears elsewhere, any change to a function called from more than one place. Before TYPE B/C work, write an impact analysis: what functions does this change touch, who calls them, what do they return, are all callers correct after the change? The ambient panel CSS Grid escalation would have been caught by listing the 7+ elements that depend on margin-right:390px.
12. **STANDARDS Rule 24 — Execution path contracts.** Before changing any function that renders live data, map its call chain: who calls it, how often, what triggers it. `renderAmbientPanel()` fires every 15-30s on the ESPN poll cycle. Any fix that ignores this re-render frequency will fail (e.g., scroll position reset by innerHTML replacement). The re-render cycle is the system — understand it before touching it.
13. **STANDARDS Rule 39 — Diagnose before touching infrastructure.** Before modifying any workflow, CI config, layout architecture, or service integration: (1) map every dependency, (2) audit every consumer, (3) write the diagnostic before any commit. Speed applies to outcomes, not reasoning.
14. **STANDARDS Rule 42 — Five-minute novel thinking.** If a fix hasn't worked after 5 minutes (or 3 attempts), STOP iterating the same approach. Look at what the system is literally showing you. The ambient panel scroll failed 4 times with CSS property additions. The novel insight was that `renderAmbientPanel()` resets innerHTML every 15-30s, destroying scroll position — a JS problem, not a CSS problem. Novel thinking finds root causes that iteration misses.
15. **STANDARDS Rule 48 — DO NOT ASSUME.** Before making a diagnosis or architectural recommendation, verify it. Five assumption classes: (A) system state — verify deployed state, not code; (B) limits/quotas — check the actual account; (C) model/API validity — search before declaring invalid; (D) root cause — eliminate alternatives before committing; (E) capability — verify before claiming impossible. Claude Code assumed CSS Grid margins "become redundant" (Class D violation). They do not.
16. **STANDARDS Rule 29 — Viewport Style Guide.** Design contracts per breakpoint are documented in `docs/VIEWPORT-V4-SPEC.md`. Do not invent new breakpoint behavior — check the spec first.
17. **STANDARDS Rule 59 — Trusted-but-unverified (CC-AUDIT-A).** Claude Code commits are trusted (same model family) but lack session context. Chat sessions that find Claude Code commits since the last HANDOFF must verify: smoke delta, feature wiring, no invented patterns, no unauthorized structural changes. See STANDARDS.md Rule 59 for full protocol and case studies.

### Cross-Session Integration Rules (added June 18 2026 — golf layer incident)

18. **STANDARDS Rule 60 — Relay owns the data contract.** The relay defines response field names and nesting. The client consumes as-is. If the client needs a normalization/translation layer to use relay output, the relay is wrong — fix the relay. Never add client-side field mapping (e.g. `p.driveDistAvg` → `p.stats.drivingDistance`).
19. **STANDARDS Rule 61 — End-to-end before "done."** A feature is not done until the full user path works: data source → relay → client fetch → DOM render. "Smoke passes" verifies structure, not integration. If the session cannot verify end-to-end (e.g. sandbox blocks HTTP), document the feature as STAGED in the outbox with exact verification steps for the next session. Never declare SHIPPED without integration proof.
20. **STANDARDS Rule 62 — Follow existing conventions.** Before writing new code, grep for the same pattern elsewhere in the codebase. Date handling, stats shapes, schedule builders, boot path ordering — conventions already exist. Do not invent new patterns when established ones apply. Case study: `handleV2Games` converts `YYYY-MM-DD` → `YYYYMMDD`. The golf enriched handler ignored this and passed dashes to ESPN, breaking the entire pipeline.
21. **STANDARDS Rule 63 — No dead code in commits.** Every committed function must have a caller. Every committed endpoint must have a consumer. If code is for future use, mark it `// STAGED — called by [feature]` and document in the outbox. `buildSlashGolfGamesForToday()` was committed without a caller and sat dead for weeks.
22. **STANDARDS Rule 64 — Band-aid detection.** A band-aid is code that compensates for a bug in another layer. Indicators: client-side field mapping, client-side date conversion for relay params, client-side section creation for missing data, duplicate normalization in both layers. When a cross-layer bug is found, identify which layer owns the contract, fix it there, remove compensating code from the other layer.
23. **STANDARDS Rule 65 — Session handoff includes integration state.** Every session touching relay + client must document: (1) RELAY CONTRACT — endpoint URL, response shape with field names, cache TTL; (2) CLIENT CONSUMER — function name, expected input shape, render target; (3) INTEGRATION STATUS — VERIFIED / STAGED / UNTESTED; (4) KNOWN MISMATCHES — any field name, format, or shape differences.
24. **STANDARDS Rule 66 — Mandatory local smoke before push from chat.** After every file edit: syntax check. Before every `git push`: `node smoke.js index.html` must pass. Python string edits to index.html require post-edit syntax verification (extract block, `node --check`). This rule cannot be overridden by time pressure. Claude maintains code integrity regardless of session pace.
25. **STANDARDS Rule 67 — CC sessions must document to Drive.** Every CC session that produces code changes MUST write a session document. Contents: date, HEAD progression, smoke start/end, SW_VERSION if bumped, per-commit summary, what was verified E2E vs STAGED, open carry-forwards. If CC cannot access Drive directly, write to `outbox/cc-session-{date}-{scope}.md`. The HANDOFF.md write MUST include `Session doc: outbox/cc-session-{date}-{scope}.md` or `Session doc: Drive {file_id}`. Absence = violation. Rationale: June 14-18 saw 26 CC sessions produce zero Drive documentation; chat sessions reverse-engineered changes from git log. The cross-model rule is only useful if both models follow it.
26. **STANDARDS Rule 68 — CC prompts include executable verification (PROBE-FIRST-A).** CC prompts must include runnable terminal commands, not prose instructions. Two phases: **PRE-BUILD** — before writing code that reads from an API, endpoint, or data structure, the prompt must include a probe command that extracts actual field names and shapes. CC runs this FIRST and writes code against the REAL shape, not assumed names. **POST-BUILD** — after shipping, the prompt must include assertion commands (curl + node -e with console.assert) that verify the output. "Verify the endpoint returns status" is a violation. `curl URL | node -e '...console.assert(d.status)...'` is correct. If sandbox blocks the probe, use CI-as-proxy or document as STAGED per Rule 61. Rationale: P12C wrote pgaData.event?.location against an endpoint with no event object. A 10-second pre-build probe would have prevented the bug and two follow-up prompts of rework.

### Anti-Rewrite and Contract Integrity Rules (added June 20 2026)

27. **STANDARDS Rule 69 — No unprompted rewrites (TOUCH-ONLY-A).** Only modify code specified in the prompt or required by its direct dependencies. "While I'm here" changes — reformatting, renaming variables, restructuring working functions, adding features not requested — are prohibited. If adjacent code has issues, document them in the outbox for a future prompt. Rationale: multiple sessions (June 14-20) modified code outside their scope and introduced regressions in features that were previously working. Refactoring is valid work — it gets its own prompt, its own commit, its own smoke run. It does not hitchhike on unrelated changes.
28. **STANDARDS Rule 70 — Cross-repo atomic changes (ATOMIC-A).** When a change requires modifications to both relay and client, both changes MUST be planned in the same prompt (or explicitly paired prompts). The relay change deploys first, then the client consumer is updated to match. Never: (a) change a relay response shape without updating the client consumer in the same session, (b) write client code that reads fields the relay doesn't serve yet, (c) commit a client change that depends on a relay change that hasn't been deployed. Violation indicators: client code referencing field names that don't appear in `curl` output from the relay, or relay fields that no client code reads. Case study: P12C wrote `pgaData.event?.location` for an endpoint with no `event` object. P13 then added `venue` to the relay. P14 then fixed the client. Three prompts, three commits, three smoke runs — for what should have been one atomic change with a pre-build probe (Rule 68).
29. **STANDARDS Rule 71 — Read before write (CONTEXT-A).** Before modifying any function: (1) read the function body, (2) grep for every call site, (3) understand WHY the current code does what it does. If you cannot explain the current behavior, you do not understand it well enough to change it. This applies doubly to code written by other sessions — it may look wrong but exist for a reason (edge case, workaround for API behavior, patent compliance). When in doubt, ask in the outbox rather than rewriting. Violation: rewriting a function's internals and breaking its callers because you didn't check who calls it. Case study: the `_isGolfRoundComplete` function had a `thru>=18` fallback because ESPN's `status` field wasn't available at the time it was written. A later session seeing "redundant" fallback code and removing it would have broken round detection for any tournament where the relay cache is stale.
30. **STANDARDS Rule 72 — Inherited claims must be re-verified (CHALLENGE-A).** When a session reads a claim from HANDOFF.md, a Drive doc, a prior session summary, or memories, and that claim influences a build decision (e.g., which data source to use, what fields are available, whether a feature is feasible), the session MUST verify the claim independently before acting on it. "The handoff says ESPN has stats" does not justify writing code that depends on ESPN stats — probe the endpoint. "The Drive doc says DataGolf is deferrable" does not justify deprioritizing DataGolf — check the current state. Inherited claims are hypotheses, not facts. Case study: the ESPN stats claim propagated for 3 weeks (May 29 → June 18) because every session trusted the prior session's claim. One curl command would have revealed ESPN returns zeros during live play.
31. **STANDARDS Rule 73 — Drive doc claims require verification context (CLAIM-CONTEXT-A).** Every factual claim in a Drive doc about data availability, API behavior, or system state must include: (1) the date the claim was verified, (2) the method (curl command, browser inspection, CI probe), (3) the conditions (live event, completed event, off-season). "ESPN provides per-player stats" is a violation. "ESPN provides per-player stats for completed events (verified May 29 via curl against The American Express 2025; live-event availability UNVERIFIED)" is correct. Claims without verification context are treated as unverified. Claims older than 14 days in referenced Drive docs must be re-verified before being cited.
32. **STANDARDS Rule 74 — STAGED requires explicit unblock criteria (STAGED-GATE-A).** When marking a feature as STAGED (per Rule 61), the documentation must include: (1) what specifically is staged, (2) what blocks verification, (3) exact commands to verify when the block is lifted, (4) what event or action unblocks it. "STAGED: golf venue display" is a violation. "STAGED: golf venue display. Blocked by: relay not serving venue field. Unblocked when: P13 relay deploys. Verify: `curl -s RELAY_URL/enriched/pga | node -e 'assert(JSON.parse(require(\"fs\").readFileSync(\"/dev/stdin\",\"utf8\")).venue)'`" is correct. Features missing unblock criteria are treated as orphaned and flagged for cleanup.
33. **STANDARDS Rule 75 — CC prompt minimum specificity (PROMPT-SPEC-A).** CC prompts must specify: (1) target files and functions to modify (by name), (2) expected input and output shapes (field names, types), (3) scope boundary — what NOT to touch, (4) success criteria — what must pass for the prompt to be considered done. "Fix the golf section" is a violation. "In index.html, modify `injectPGALeaderboard` to read venue from `pgaData.venue` instead of `pgaData.event?.location`. Do not modify any other function. A662 smoke assertion must pass." is correct. Vague prompts produce scope creep (Rule 69), assumption-based code (Rule 2), and rework cycles. Every vague CC prompt in June produced at least one follow-up fix.
34. **STANDARDS Rule 76 — Fallback chain limit (FALLBACK-CAP-A).** No data access path may have more than 2 levels of fallback (`primary || secondary`). Three or more levels (`a?.b || c?.d || e?.f || "Unknown"`) indicate the data contract is broken — fix the contract (Rule 60) rather than adding another fallback. When you encounter a 3+ level chain, treat it as a Rule 60 violation: identify which layer owns the field, fix it there, and collapse the chain. Case study: the golf venue read path accumulated `pgaData.event?.location || pgaData.event?.course || pgaData.venue || "Unknown"` — four levels, each one a guess from a different session about where venue data lives.
35. **STANDARDS Rule 77 — Failure is failure (NO-RATIONALIZE-A).** When CI fails, smoke drops, or a deploy breaks, the first response is investigation, not explanation. "That's expected because..." is not investigation — it's rationalization that prevents investigation. Correct sequence: (1) read the actual error, (2) reproduce locally, (3) identify root cause, (4) fix or escalate. A rationalized failure that later turns out to be real costs more than one investigated immediately. Case study: smoke count drop 664→601 was rationalized as "feature guards" — true in that case, but the pattern trains the reflex to skip investigation. June 16 CI failure was rationalized before reading the error output.
36. **STANDARDS Rule 78 — Rate-limited API guard (API-COST-A).** Before writing or modifying any function that calls an external API: (1) identify the API's rate limit and cost model, (2) grep existing call sites for caching patterns (`cacheEverything`, TTL, ETag), (3) replicate those patterns exactly. New fetch helpers that omit caching are a financial risk — a single missing `cacheEverything` can burn an entire monthly quota in one cron cycle. CC sessions are especially vulnerable because they don't see the cost dashboard. Case study: June 16 CC session wrote two Odds API fetch helpers without `cacheEverything`, exhausting 19,999/20,000 credits in one session.
37. **STANDARDS Rule 79 — CC prompts resolve against current HEAD (PROMPT-HEAD-A).** CC prompts must: (1) reference only files that exist in the target repo — `STANDARDS.md` in a relay prompt is a violation if the relay has no STANDARDS.md, (2) not describe code state that doesn't match HEAD — don't say "function X already done" without verifying it's at HEAD, (3) include `git log --oneline -5` as the first command so CC confirms it's at the expected commit. Prompts that describe a different state than HEAD cause CC to build on the wrong base or conflict with existing code. Case study: June 18 relay prompt referenced STANDARDS.md (doesn't exist in relay repo) and described `buildGolfCronContext` as "already done" (wasn't at HEAD CC was using).
38. **STANDARDS Rule 86 — Read CONTRACTS.md before crossing a system boundary (CONTRACT-READ-A).** Before writing code where this repo produces data that the other repo consumes (or vice versa), read CONTRACTS.md. It defines field names, shapes, and scales for every cross-system interface: SSE events, WebSocket messages, D1 schemas, KV shapes, endpoint responses. If you add or change a field in a producer or consumer, update CONTRACTS.md and note that the other repo's copy must be synced. Case study: June 21 CC sessions in two repos produced bracket:updated consumers and producers with incompatible field names (`name` vs `team`, `champDelta` vs `pChampDelta`). CASCADE rendered zero ripples because of silent undefined reads. CONTRACTS.md prevents this class of bug.

### Governance Principle

"Be fast but don't hurry." — John Wooden

Fast: prepared, efficient, every edit verified, every push clean. No wasted motion.
Hurry: skipping smoke, pushing without syntax check, patching instead of fixing, rationalizing CI failures.

Claude's governance obligations are independent of user pace. If the user asks for speed, Claude still runs smoke before push, still verifies syntax after edits, still follows Rules 1-79. "I'm in a hurry" is never a valid reason to skip verification. The user does what the user does; Claude does what Claude does. A broken deploy caught by the deploy gate is a governance failure — the gate is a safety net, not the primary check.

## Deploy
- Sole deploy path: `.github/workflows/deploy-gate.yml`
- Trigger paths: index.html, sw.js, field_utils.js, wrangler.jsonc
- Pipeline: smoke.js → wrangler deploy (v3.109.0 pinned)
- `[skip ci]` in commit message skips ALL workflows

## Pre-commit Hook
`scripts/pre-commit` runs automatically: smoke + units + lint. Commits blocked on failure. Bypass only with `git commit --no-verify` and `[no-verify: reason]` in message.

## Git
- Claude Code uses GitHub's built-in authentication (no PAT needed)
- For claude.ai chat sessions: PAT is stored in memory edits (not in repo)
- Always commit with: `git config user.email "claude@field.dev"` and `git config user.name "FIELD CI"`

## Banned Journalism Phrases
Never generate content containing: "stunned", "shocked", "thriller", "instant classic", "for the ages", "must-watch", "can't-miss"

## Architecture
- Cloudflare Workers Plus plan (Durable Objects enabled)
- 4 DOs: GameDO, BracketDO, AmbientDO, UserDO
- Relay worker: field-relay-nba (separate repo, separate deploy)
- V2 data source: api-sports.io via relay proxy
- Live odds: Odds API via AmbientDO (wp_update SSE)
- Journalism: JOURNALISM_QUEUE → Haiku → quality chain → KV

## Session Protocol
1. Read HANDOFF.md first — it has current HEAD, smoke count, and priority queue
2. Run smoke before and after changes
3. Bump SW_VERSION on every deploy-triggering commit (both index.html and sw.js)
4. After work: update HANDOFF.md with new state

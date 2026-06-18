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

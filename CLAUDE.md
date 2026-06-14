# CLAUDE.md — FIELD Project Configuration

## What is FIELD?
A 34,000+ line single-file PWA (index.html) for global sports intelligence. Deployed on Cloudflare Workers as a pure static assets worker. Companion relay worker at field-relay-nba (separate repo).

## Key Files
- `index.html` — the entire app (HTML + CSS + JS)
- `sw.js` — service worker (SW_VERSION must match index.html)
- `smoke.js` — 624+ structural assertions (Layer 0, blocks deploy)
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

# FIELD HANDOFF — June 23 2026 (session end ~10:30am ET)

## State
- CLIENT HEAD: 2704a39 · jubilant-bassoon · email key player (surrogate char bug pending)
- RELAY HEAD:  c3494a5 · deployed · CI green
- JB HEAD:     2704a39 · smoke 725/0 · SW_VERSION 2026-06-23a (both files synced)
- Smoke: 725/0 authoritative (tool reports 663 — known 62-assertion drift)
- A190: STRUCTURALLY ENFORCED as of b151efb (deploy-gate commits sync back, smoke-and-verify checks main)

## Session Start Protocol (Rule 85)
Call session_health MCP tool FIRST. Do NOT use read_handoff as primary state.

## What Shipped This Session

### Night Owl Email — Levels 1-5 (jubilant-bassoon scripts/night-owl-email.js)
- **Level 1** (215960a): fetchRelayBrief() — 8s timeout, silent fallback to template
- **Level 2** (215960a): FIELD design system — Chakra Petch, DM Mono, #f59e0b gold,
  buildLeagueChip(), PLAYOFF/OT/XI/ET/SO chips, hyphen score
- **Level 3** (1b7f3b6): Full digest — Quick Recaps + What to Watch Tonight,
  WC fetch step added to night-owl-email.yml, fetchTonightSlate()
- **Level 4** (1b7f3b6): fetchOddsStory() (relay /odds/history/{id}, drift>=2),
  checkLineupsChanged() (MLB SP staleness, ESPN summary)
- **Level 5** (215960a + f1211ce + c55b495): The Scorecard — computeScorecardCI(),
  ciDramaScore/ciClosenessScore/ciPlotScore, scoreToGrade(), gradeColor(),
  becauseSentence() (sport-aware: XI/ET/SO chips, "Tied through nine" vs "Tied at the buzzer")
- **VERIFIED IN INBOX**: 4 test emails sent. Latest (2704a39): XI chip, Scorecard A-/A-/D,
  "Went to extra innings — maximum late-game tension. Tied through nine — competitive throughout."
  Quick Recaps 3 MLB one-run finishes, What to Watch Tonight 3 WC games.
- **Distribution spec staged**: docs/SPEC-email-distribution-beehiiv-2026-06-23.md

### Key Player Attribution — BLOCKED (surrogate char encoding bug)
- fetchKeyPlayer(espnEventId, sport, homeTeam, awayTeam, homeWon) fully specced + coded
- Soccer: keyEvents type=Goal -> "⚽ Messi 38' · 90+5'"
- NHL: GWG from keyEvents -> "🥅 [player] clock"
- MLB: winning team top pitcher from boxscore -> "🏆 W: [name] X.X IP, N ER"
- NBA: points leader from leaders array -> "⭐ [player] · N pts"
- **BLOCKED**: Python surrogate char (emoji in f-strings) blocks API commit.
  Fix: write JS using raw unicode escapes (\uD83C\uDFC6 etc) or use file-based approach.
  All logic is correct — just needs the encoding workaround.

### A190 Structural Fix (4aba2fd + b151efb)
- **Root cause**: Direct API commits to index.html bypass deploy-gate.yml's SW_VERSION sync.
  A190 had failed 5 times (May 23, May 29, May 31, June 23 x2) — always same root cause.
- **deploy-gate.yml** (4aba2fd): permissions: contents: write, new "Commit SW_VERSION sync
  back to repo" step — if sw.js/index.html diverge after sed, commits [skip ci] and pushes.
- **smoke-and-verify.yml** (b151efb): checkout changed to ref: main so it sees the
  deploy-gate sync commit (deploy-gate finishes ~24s before smoke's longer steps).
- **VERIFIED**: b151efb smoke: success.

### SW_VERSION Daily Automation (sw-version-bump.yml, bb6af1d)
- Runs at 4:05 UTC (midnight ET) — bumps BOTH index.html and sw.js to today-a
- Simple sed patterns verified locally before commit
- GITHUB_TOKEN limitation: bump commit doesn't auto-trigger smoke — smoke passes on next real push
- Combined with A190 deploy-gate fix: complete structural enforcement

### GitHub MCP Persistence (.claude/settings.json)
- field-relay-nba: created (.claude/settings.json with mcpServers.github)
- jubilant-bassoon: merged mcpServers.github alongside existing SessionStart hook
- URL-only config — CC harness handles OAuth, no credential in config

### Connectors Unlocked
- **Cloudflare connector**: D1 direct query proven live (592 briefs, quality scores)
- **Exa connector**: web_search_exa for journalism narrative layer
- **Engineering plugin**: /review, /deploy-checklist, /architecture
- **GitHub MCP**: persistent via .claude/settings.json (both repos)

### Specs Committed (jubilant-bassoon docs/)
- docs/SPEC-exa-journalism-narrative-2026-06-23.md (beec12a2)
- docs/SPEC-email-distribution-beehiiv-2026-06-23.md (b1021ea7)
- docs/CC-CMD-2026-06-23-night-owl-email-levels.md (5b2b2ce6)

### Exa Journalism Artifact
- React artifact created for chat-side Exa journalism automation
- Claudeception: Anthropic API + Exa MCP, narrativeDepth gate (THIN/NONE only)
- [NEWS CONTEXT] block ready to inject into journalism prompt

## Probe Endpoints (all live)
- /health/sources · /soccer/xg?league=&event= · /journalism/context-probe
- /quality/report?days=7 · /briefs/spot-check?n=5 · /archive/query
- /odds-story/preview?date= · /fixtures/fetch (POST) · /deploy/verify

## Carry-Forwards
1. **API-Sports Football Pro renewal — JUNE 29 DEADLINE** (6 days, CRITICAL)
2. **fetchKeyPlayer surrogate char bug** — fix unicode escapes in Python commit script,
   then commit the key player attribution to night-owl-email.js
3. Night Owl email Level 1 relay brief — will work for live games, not historical dates
4. wentToOT hardcoded false in newspaper
5. KV editorial keys not consulted by newspaper
6. Club league xG (EPL/MLS/La Liga) — verify August when seasons resume
7. mlb_pitch_arsenals entries:0 false green — Savant scraper issue
8. STAT deploy broken — expired CLOUDFLARE_API_TOKEN GitHub secret
9. assembleContext golf/WNBA — no builder, no active season urgency
10. CLS residual ~0.5 — cosmetic

## Priority (next session)
1. API-Sports Football Pro renewal (JUNE 29 DEADLINE)
2. fetchKeyPlayer surrogate char fix + commit
3. Night Owl email live game verification (test with today's WC game)

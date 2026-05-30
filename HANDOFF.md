# FIELD Handoff — May 30 2026 (Session 3)
**Session Type:** TYPE B/C Mixed (cost investigation + feature build)
**HEAD:** 3652ffb
**Relay HEAD:** d1632fe
**Smoke:** 314/0 (A309–A312)
**Deploy:** SUCCESS

## TIER 0 DEADLINES
- NBA Finals G1: June 3 (NYK at MSG) — shell needed
- World Cup 2026 Phase 1: June 11 HARD
- USPTO provisional: ~June 25

## SESSION START (next session)
1. Declare session type: A / B / C / D / E
2. `git pull && cp index.html /home/claude/index.html`
3. `node smoke.js index.html` — must be 314/0 before touching anything
4. Read CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
5. Read STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`

## WHAT CHANGED THIS SESSION

### Android long-press fix (A309)
settings-btn long-press broken on Galaxy A36 + Pixel 8.
Root cause: touchstart e.preventDefault() suppresses click on Android Chrome.
Fix: pointerdown (passive:true) — works on Android/iOS/desktop.
SMOKE-VERIFIED — needs device confirmation.

### Claude → Haiku swap (A310)
$44 on dashboard was THIS dev session, not FIELD production.
Precautionary: all 18 model strings → claude-haiku-4-5-20251001.
Sonnet kept in Courier/Layer 2 vision only.
A310 smoke assertion prevents regression.

### Gemini RPM guard (A311)
5 quality chain retries in ~2s hit 30 RPM → Claude fallthrough.
Fix: _jqDelay() — 2s stagger before each retry fetch (5 functions).
Happy path returns before delay — zero latency on passing briefs.

### O(1) per-game briefs (A312)
Relay cron now pre-generates card briefs for all ESPN games → KV.
Browser checks KV before proxy (fetchPrerenderedGameBrief).
MLB/WNBA/Stakes wired. After first cron cycle: zero browser AI calls.
SMOKE-VERIFIED — needs live sports night confirmation.

## COST ARCHITECTURE (after this session)
- Browser AI calls: near-zero (relay KV serves most)
- Relay cron: Gemini free tier (RPM guarded)
- Claude fallback: Haiku only on genuine Gemini errors
- Layer 2 vision: Sonnet on CI pushes only
- Dev sessions: main cost — keep sessions efficient

## POSTPONED INDEFINITELY
Claude Code migration — per Jeff May 30 2026

## SMOKE-VERIFIED ONLY — BROWSER CONFIRMATION NEEDED
1. Sport voice arrays (baseball/hockey/soccer)
2. Three-part arc structure (J3 + J2)
3. _bannedExtension active evolution
4. Extra innings Night Owl fix
5. MLB vary-the-angle analytics
6. MCP health panel section
7. Android long-press fix (A309)
8. O(1) per-game KV briefs (A312)

## NEXT PRIORITY
1. NBA Finals G1 shell (June 3 — HARD DEADLINE)
2. Browser confirmation session
3. [PWA-A] Android PWA fixes (~40 min)
4. [MOBILE-INTEL-A] Option A

## KEY DOC IDs
- CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`
- Build Session List v7.27: `1TaywA5e3NLpJLpXcQPZwDMhDG79_rXMsvIa_J_uBOfY`
- Session 3 Doc: `11quRzBRKjPagwbihW4lBkT-UaMiQ0957_bsH1lHnQT4`
- Infrastructure Backlog: `1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw`

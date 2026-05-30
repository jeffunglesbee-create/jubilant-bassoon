# FIELD Handoff — May 30 2026
**Session Type:** TYPE B/C Mixed (pre-declared, Rule 1 exception)
**HEAD:** 6a0be7d
**Smoke:** 309/0 (A283–A307)
**Deploy:** SUCCESS

## TIER 0 DEADLINES
- NBA Finals G1: June 3 (NYK at MSG) — shell needed
- World Cup 2026 Phase 1: June 11 HARD
- USPTO provisional: ~June 25

## SESSION START (next session)
1. Declare session type: A / B / C / D / E
2. `git pull && cp index.html /home/claude/index.html`
3. `node smoke.js index.html` — must be 309/0 before touching anything
4. Read CI/Deploy Ref: Drive `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`

## WHAT CHANGED THIS SESSION

### Journalism completeness audit (A285-A287)
All 9 journalism surfaces now have complete quality chains. See session doc.

### Journalism gaps → strengths (A288-A293)
- journalNote → J2 series prompt as 'Series history:' context
- FIELD_BASEBALL_VOICE + FIELD_HOCKEY_VOICE + FIELD_SOCCER_VOICE + getFieldVoice()
- Mandatory three-part arc structure in J3 and J2
- EPL richer context: GD, position zones, matchupNote
- _bannedExtension active prompt evolution from review queue

### UCL Final / Stakes Brief (A294-A297)
- _isMajorFinalGame: 🏆 UCL FINAL icon, showpiece prompt framing
- cardBriefCallsToday() — separate 15-call budget for card-level briefs
- Versioned cache key + explicit FINAL rules (no semifinal language)

### MLB brief loading fixed (A298-A299)
- umpLine ReferenceError was root cause of all stuck 'Loading brief...' cards
- All card renderers now unconditionally remove card on null

### Venue injection (A300)
- g.venue in EPL, Stakes, J2, Night Owl prompts with DO NOT INVENT rule
- Fixes Allianz/Wembley hallucinations — UCL Final is Puskás Aréna, Budapest

### No peeking behind curtain (A301)
- WNBA card suppressed when no context
- FIELD_PROSE_STYLE global: NEVER explain missing data

### MLB brief variety (A302)
- getMLBAnalyticsContext + fetchMLBTeamMomentum injected
- 'Vary the angle' rule — not always standings

### RSN accuracy — 15 corrections (A303)
- Post-Main Street collapse: Rays.TV, CLEGuardians.TV, Detroit SportsNet,
  Rangers Sports Network, FDSN West, Rockies.TV, SportsNet PIT, Nationals.tv, etc.
- New SR entries: clegtv, dsntv, texrsn, fdsnwest, rockiestv

### Streaming Discovery derived + SMT time-phase (A304-A305)
- SERVICE_FAMILIES + buildStreamingDiscovery() — data-sorted service cards
- getCurrentSMTPhase + scoreSMTCard — currently-airing shows first

### Baseball tie + Athletics (A306-A307)
- Extra innings detection in Night Owl — no more tie narratives
- OAK: NBCS California → Athletics.TV (Sacramento, not Oakland)

## SMOKE-VERIFIED ONLY — BROWSER CONFIRMATION NEEDED
1. Sport voice arrays (baseball/hockey/soccer) — AI output unconfirmed
2. Three-part arc structure — AI adherence unconfirmed
3. _bannedExtension — needs populated field_jq_review
4. Extra innings Night Owl fix — needs real extra-innings game
5. MLB 'vary the angle' — needs PITCHER_ARSENAL / PLAYER_EXPECTED_STATS populated

## NEXT PRIORITY
1. STANDARDS.md canonical update — Jeff must paste Rules 8-10 into
   `1A3OaKNEjR-tASC330R3Aew9TIMwSCj9E` from draft `1MKSQnY8KnWROoJpUIahAnEaXcKlxJZUIDgOzyNLCMPo`
2. [PWA-A] Android PWA fixes (~40 min) — prerequisite for MOBILE-INTEL-A
3. [MOBILE-INTEL-A] Option A — Right Now section above schedule
4. Browser confirmation session for smoke-verified-only features
5. Rule 28 action paths for prose score badge + _bannedExtension surface

## KEY DOC IDs
- CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- Journalism Quality Spec: `1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU`
- Build Session List v7.26: `1C9Lx5WBD9xe_EAeilryNjN8keimpAgpyE_I50RGiKGY`
- STANDARDS.md canonical: `1A3OaKNEjR-tASC330R3Aew9TIMwSCj9E`
- STANDARDS.md draft (Rules 8-10): `1MKSQnY8KnWROoJpUIahAnEaXcKlxJZUIDgOzyNLCMPo`
- Session Doc (this session): `1j09X0Yt7PeUHu_qMXYzFioUi99MqKqxEOXZuMHEGi7w`
- Infrastructure Backlog: `1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw`

# FIELD Handoff — June 1 2026 (JQ-5 → My Services refactor → stale EPL fix → WC2026 corrections)

**jubilant-bassoon HEAD:** 8008759 (code) · 86ffddf (HANDOFF) · Smoke: 241/0 pre-gate · SW_VERSION 2026-06-01d
**field-relay-nba HEAD:** 0ae4c11 · Deploy: SUCCESS · STRUCTURAL 6 green · WOW 8 e2e verified (unchanged this session)
**Session Doc (FULL — Drive):** 1_9ECU61QSWoWFOPgH9oxsCLZ11jj1E_YqZP2lWXwPG8
**Session Doc (JQ-5 segment only):** 1Q35ZOtrttizfbiS2ad2TMnRy3gYJozXJT9Of-9RKCc0
**WC2026 Format Corrections (READ BEFORE ANY WC BUILD):** 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks
**Spec source for this session:** Build Session List v7.27 (`1TaywA5e3NLpJLpXcQPZwDMhDG79_rXMsvIa_J_uBOfY`) TIER 4

## TIER 0 DEADLINES

- **Stanley Cup G1: June 2** — VGK @ CAR (TOMORROW)
- **NBA Finals G1: June 3** — SAS vs NYK
- **World Cup 2026: June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION

Single-feature TYPE C session per Rule 1. User opened with "Run jq-5, DO NOT
ASSUME." Built JQ-ACTION-A/B/C in spec order (A first → B parallel → C after A).

### JQ-ACTION-A — Prose badge tap → detail panel
- `.brief-prose-score` made tappable (role=button, tabindex, click+keydown)
- `buildProseScoreDetail(scoreObj, label)` renders 4 sections:
  - SCORE breakdown (composite + arc + ctx + 5 dims)
  - ROLLING AVG · {label} · last N (filtered from field_jq_scores)
  - PHRASES FLAGGED · {label} (live cliches + historical field_jq_review +
    JQ-ACTION-C VOICE sub-section)
  - SESSION BANNED EXT (sessionStorage field_jq_banned_ext) or "inactive"
- CSS: hover opacity, ▸ chevron rotation, gold-bordered panel
- Smoke A351 added (green)

### JQ-ACTION-B — Session banned ext in ?debug=1 panel
- One row inserted in `buildFieldHealthPanel()` between Phrase Review and
  Runtime Errors
- Reads `sessionStorage.field_jq_banned_ext`
- "Session quality extension: N phrases active — [p1, p2, …]" (or inactive)
- Smoke A352 added (green)

### JQ-ACTION-C — Sport voice violations → field_jq_review
- `retryWithSportVocab(prompt, text, sport, proxyUrl, label)` — label optional
- When violations detected, writes
  `{phrases, sport, label, type:'voice', ts}` to field_jq_review (cap 30)
- Console: `[JQ-ACTION-C] BASEBALL VOICE violation logged: …` (FIELD_DEBUG)
- All 4 callers updated with caller's label: 'MLB Brief', 'EPL Brief',
  'J5 Night Owl', 'Bottom Sheet'
- JQ-ACTION-A panel surfaces with `VOICE · SPORT` tag
- Smoke A353 added (green)

### Side repairs (own the breakage)
- A285 + A273 were pinning the OLD `retryWithSportVocab(…, CLAUDE_PROXY_URL)`
  3-arg form with close paren. Adding label broke their substring match.
  Both updated to the new 5-arg expectation. A273 also had pre-existing
  scoreProse signature drift, fixed in same edit.

### SW_VERSION bump (Rule 23)
- 2026-06-01a → 2026-06-01b in both index.html and sw.js
- Returning users will receive JQ-5 code on next pageview

### FIELD_FEATURES added
- `jq-action-a-prose-detail`: '2026-06-01'
- `jq-action-b-banned-ext`:   '2026-06-01'
- `jq-action-c-voice-log`:    '2026-06-01'

## POST-JQ-5 WORK THIS SESSION (after commit 2c483e0)

### Refactor (commit 46ae3eb) — JQ tech detail moved to My Services
After JQ-5 close-out, user clarified: **no technical information appears in the
UI, only in My Services menu**. The .brief-prose-score badge was stripped
entirely (CSS + DOM); buildProseScoreDetail() and its tap handler deleted;
JQ-ACTION-B row removed from FIELD HEALTH panel (was duplicate).

NEW: `buildJournalismQualitySection()` called from `renderSetupBody` adds 5
subsections to the My Services modal:
1. Aggregate (avg + total briefs scored)
2. Per brief type · last 5 (J3 Brief / MLB Brief / EPL Brief / etc.)
3. Voice violations (writes from JQ-ACTION-C, sport-tagged)
4. Phrases flagged (cliche + voice retries)
5. Session quality extension (sessionStorage.field_jq_banned_ext)

`scoreProse()` + localStorage persistence kept (data, not UI). SW c→c (then →d).
FIELD_FEATURES renamed: `jq-quality-in-my-services`, `jq-banned-ext-tracked`,
`jq-voice-log`. Smoke A267 inverted (was "badge MUST render in UI", now
"must NOT render"). A351/A352 retargeted, A353 unchanged.

**Standing rule established:** spec language describing visible UI elements
does not authorize creating one. When in doubt, DO NOT ASSUME — ask.

### Stale EPL fix (commit 8008759) — belt-and-suspenders
User reported June 1 brief mentioning EPL Final Day results (May 24, 8 days
stale) + EPL score chips in ticker. Diagnosis: SOCCER_LEAGUES empty + V2.epl
false, so no fetch path is bringing EPL — leak is (a) AI hallucinating from
training, (b) stale in-memory `espnScores` from multi-day open tab.

Five gates added:
1. `DOMESTIC_LEAGUE_BREAK_2026` constant + `isDomesticLeagueInBreak()` helper
   with end+resume dates for EPL/LaLiga/SerieA/Ligue1/Bundesliga (11/11
   boundary cases verified)
2. `fetchSoccerFixtures` league + per-event date gates (defensive — current
   path is empty but protects against future re-enable)
3. `buildCompoundPrompt` soccerGames: `.filter(!isDomesticLeagueInBreak)` +
   `.filter(g => isToday(g.start_time))` per game
4. `renderScoreTicker` prune: deletes espnScoreTs entries older than 15min
   at top of function (renderESPNScores does this but only when called)
5. NEW PROSE RULES:
   - **FIELD_PROSE_STYLE: TIME-PERIOD ANCHORING (mandatory)** — every numeric
     stat must be qualified with its time period in the same sentence
     ("this postseason", "this series", "tonight"). Bare "25.0 points" /
     "26.0 PPG" forbidden.
   - **J3 prompt: SLATE BOUNDARY (mandatory)** — every league/sport mentioned
     must appear in TONIGHT'S GAMES. Explicit FABRICATION call-out using
     the actual leak example ("Saying 'In England, Man United routed
     Brighton 3-0' is FABRICATION when no EPL game is in the slate").

Smoke +5 (A354-A358) green. SW c → d.

### WC2026 Format Corrections (Drive doc 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks)
User caught a "32 teams" assumption I'd relayed from the May 31 ASAP Build
Architecture spec. Verified via web search: World Cup 2026 has **48 teams,
12 groups of 4, 104 matches, NEW Round of 32 stage** (top 2 from each group
+ 8 best 3rd-place). The codebase (index.html) already has the correct
numbers throughout — error is exclusively in the May 31 strategic docs.

Corrections doc covers:
- ASAP Build Architecture (`1UIuazvMvY4ewJap2Y4Z4-LbqHGvt8z-QhX28ImnAlt0`):
  Tier 2B "32 teams" → 48, "64 games" → 104, "~90 min" → ~125 min
- Event-Driven Features (`1yt-3ruXqTNNOl9k1jRQARFw9OtHt6IzNG4xkfcjVqTE`):
  A1 "48 group games" → 72, A2 "32 teams/19 KB" → 48 teams/~29 KB,
  A2 "~90 min" → ~125 min, A4 storm event Round of 16 → Round of 32 (16
  games, ~June 27-30), D4 "64 games" → 104
- Five other May 31 docs flagged as likely-affected (not yet verified)

**Future sessions must read the corrections doc before touching any WC2026
build item.** Read in this order: original spec → corrections doc → apply
corrections.

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (now urgent: SW_VERSION 2026-06-01d is live)
1. **JQ-5 + post-JQ-5 browser confirmation:**
   - Open My Services modal (gear icon) — Journalism Quality section renders
     5 subsections (Aggregate / Per brief type / Voice violations /
     Phrases flagged / Session quality extension)
   - .brief-prose-score badge should NOT appear in main UI anywhere
   - Next generated FIELD Brief uses TIME-PERIOD ANCHORING (no bare
     "25.0 points" or "26.0 PPG") and SLATE BOUNDARY (no EPL/LaLiga/etc.
     references unless those leagues are in tonight's slate)
   - Score ticker chips no longer show stale FT entries from prior dates
     (15-min in-memory pruning kicks in on render)
2. **Previously deferred from May 31 P0:**
   - SW `2026-06-01d` active in browser
   - J2/J5/MLB/Stakes brief triggers populate text
   - `window._lastJQAudit` populates non-empty
   - `getQualityTarget(sport)` injection visible post-3-scored-briefs

### P0 — TIER 0 game-day verification
3. **June 2 (TOMORROW):** Stanley Cup G1 VGK @ CAR — NHL endpoints + drama
   arc + journalism brief live test
4. **June 3:** NBA Finals G1 SAS vs NYK — same. Relay `/v2/games?sport=nba`
   first real-traffic

### P0 — Hardcoded calendar flip
5. **June 11 HARD:** flip `wc26:true` in FIELD_V2_SOURCES (~5 min change)

### P1 — Smoke gate fix (carried + now more urgent)
6. **smoke.js gate position (~15 min):** `if (fail > 0) process.exit(1)` at
   line ~1040 fires BEFORE the post-line-1040 asserts run. A273, A285, A313,
   A314, and all my new A351/A352/A353 sit beyond that gate. Fix: move the
   exit check to the very end of smoke.js after the summary print. Expect
   the fix to expose additional hidden reds beyond the known A313/A314.

### P1 — PWA-A manifest fix (A313 + A314, pre-existing)
7. After the gate fix exposes them properly:
   - Split `manifest.json` icons into `any` + `maskable` purpose entries
   - Add `"prefer_related_applications": false`
   - Spec: PWA Android Spec (Drive `1n5-HFuzQfUA5NRH2Rxizgma6fTsU2Tb-qNTEokCo46s`)

### P1 — Documentation amendments (carried)
8. Update 5 morning-sweep docs (STANDARDS / Arch Spec / JQ Spec / 10 Wow /
   Infra) per session `1A7OzCh_psRGvft0hQjJMTH96OkJvkK_GZo1EDIjCCgw`
9. Update CI/Deploy Ref (`1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`) to
   document Phase C + WOW 8 Queues + JQ-5
10. Update JQ Spec to add JQ-ACTION-A/B/C close-out note

### P1 — BDL milestone decision (carried)
11. Upgrade BDL to GOAT plan ($9.99/mo), remove feature, OR find free alt

### P2 — USPTO provisional prep (~June 25)
12. WOW 6 + Phase C + WOW 8 + JQ-3 feedback loop + JQ-5 paired action paths
    = stronger patent narrative. The full Rule 28 close-out (score detect →
    action surface) is now demonstrably built end-to-end.

### P2 — Build backlog (carried)
13. handleCron refactor (~2.5 hr)
14. YouTube highlights (~45 min)
15. Podcast Index (~30 min)
16. SeatGeek (~2 hr)
17. Polymarket (~2.5 hr)
18. Preference Sync QR tier (~45 min) + Passkey tier (~2.5 hr)

### P3 — Deferred console errors (low-pri)
- `/espn-summary/.../nba/summary` 404
- `/mlb-umpire-scrape` 502
- `api.openf1.org` URL encoding (`%3E` for `>=`)
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon: smoke 241/0 pre-gate, deploy SUCCESS on `8008759`
- field-relay-nba: STRUCTURAL 6 green, WOW 8 e2e probe done (May 31)
- Pre-existing post-gate reds: A313, A314 (PWA-A) — hidden by gate position
- JQ pipeline now fully Rule-28-compliant: every silent intelligence layer
  (scoreProse, _bannedExtension, retryWithSportVocab) has a user-visible
  action path — now in MY SERVICES MODAL, not in main UI per standing rule
- JQ quality data flows: scoreProse + voice retry → field_jq_scores +
  field_jq_review → buildJournalismQualitySection in renderSetupBody
- Stale-EPL defense: 5 belt-and-suspenders gates; SW 2026-06-01d will deliver
  the new prose rules (TIME-PERIOD ANCHORING + SLATE BOUNDARY) to next
  generated brief; cached current-day compound brief in sessionStorage may
  still hold the old text until date rollover
- WC2026 format: codebase correct (48 teams, 104 matches throughout); May 31
  strategic specs have 32-team/64-game errors documented in corrections doc
  `17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks`
- Sync + async journalism paths produce identical formatting (PF-1, unchanged)

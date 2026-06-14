# WC Schedule Consistency — Diagnosis-First Spec

## Bug
World Cup 2026 matches do not consistently appear on the schedule.
Sometimes the FIFA World Cup 2026 section renders with 5 games;
sometimes it's missing entirely. The inconsistency suggests a race
condition or data pipeline timing issue, not a permanent failure.

## Impact
The World Cup opened June 11 2026. WC games are the highest-profile
content on FIELD right now. Missing them intermittently is worse than
missing them permanently — it looks broken rather than unbuilt.

---

## What is known about the data pipeline

### Two data sources feed WC games:
1. **wc26Raw** — hardcoded schedule in index.html with matchupNotes,
   streams, venues, group assignments. Static data baked at build time.
   Pushed to allData.sports by `maybePushWorldCup()`.
2. **FIELD_V2_SOURCES.wc26** — V2 polling via api-sports.io relay.
   Returns live state (scores, clock, period). Injected by the
   `fetchV2AllScores` pipeline into espnScores, then merged into the
   FIFA section at line ~15450.

### The merge logic (line 15448-15510):
- On first poll: if no FIFA section exists, splice one from V2 data
- On subsequent polls: merge V2 live state into existing FIFA section
- Dedup flag: `_wcSectionInjected` prevents duplicate sections
- Section lookup: by `sport` OR `section` (fixed after a prior bug
  where lookup failed because wc26Raw set `sport` but not `section`)
- Filter: `isToday()` removes yesterday's late starts

### Known prior bugs (documented in code comments at line 15437):
1. Duplicate FIFA section when wc26Raw + V2 both produced one
2. Section lookup mismatch (`s.section` vs `s.sport`)
3. Live state updates silently skipping the wc26Raw section
4. Games appearing static or vanishing depending on branch timing

---

## Failed Approaches (do NOT repeat)
None documented yet — this is the first diagnosis-first attempt.

---

## Acceptance Criteria
The FIFA World Cup 2026 section MUST appear on every page load when
WC games are scheduled for today. "Today" is defined in ET timezone.
The section must survive across ESPN poll cycles (15-30s) without
disappearing or duplicating. Both wc26Raw (static) and V2 (live)
games must render. A game in wc26Raw that V2 hasn't returned yet
must still appear with its static data (start time, venue, streams).

---

## Instructions for Claude Code

1. **Read** `docs/CLAUDE-CODE-PROMPT-RULES.md` first.

2. **Diagnose** before implementing. Answer these questions and write
   your answers to `outbox/wc-schedule-diagnosis.md`:

   a. **Data presence:** At the time renderAll() fires, what does
      `allData.sports` contain? Is there a FIFA section? How many
      games? Log this to console and report.

   b. **Race condition:** What is the execution order of
      `maybePushWorldCup()` vs `fetchV2AllScores()` vs `renderAll()`?
      Can renderAll fire BEFORE either data source has populated the
      FIFA section? If so, what happens — empty schedule, or schedule
      without WC section?

   c. **isToday filter:** The V2 injection at line ~15458 filters by
      `isToday(e.start_time)`. What timezone does `isToday()` use?
      If it uses UTC and a game starts at 10pm ET (2am UTC next day),
      does `isToday()` exclude it? Read the `isToday()` function
      and the `fieldNowET()` temporal polyfill shipped today.

   d. **_wcSectionInjected flag:** This flag is set to true on first
      injection. If V2 polling fails on the first attempt (network
      error, relay down), does the flag stay false? On the second
      attempt, does `maybePushWorldCup()` run again or has its window
      passed? Can the flag get stuck in a state where neither source
      injects the section?

   e. **maybePushWorldCup:** Where is this function defined? When does
      it fire? What conditions must be true for it to push a FIFA
      section into allData.sports? Can it fail silently?

   f. **V2 relay health:** Is the V2 wc26 endpoint returning data?
      What does a failure look like on the client — empty array,
      null, or error? Does the client handle all three cases?

   g. **Render cycle:** After allData.sports is populated with a FIFA
      section, is renderAll() called? Or does the render happen before
      the injection and never re-fires?

3. **Explain** in 2-3 sentences what causes the inconsistency and why
   your proposed fix will make WC games appear on every load.

4. **Implement** the fix. One commit, smoke gated.

5. **Do NOT make structural changes** to the data pipeline. The
   two-source architecture (wc26Raw + V2) is established. Fix the
   timing, not the architecture. Rule 6/9.

6. **Run smoke.** Push diagnosis + fix together.

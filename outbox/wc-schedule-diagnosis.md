# WC Schedule Consistency — Diagnosis

**Date:** 2026-06-15 (ET)
**Spec:** `docs/WC-SCHEDULE-SPEC.md`
**Rules:** `docs/CLAUDE-CODE-PROMPT-RULES.md` (Rule 6) + CLAUDE.md Rules 9, 13, 14, 15, 16
**Constraint:** do NOT change the two-source architecture (wc26Raw + V2). Fix the timing, not the structure.

---

## Answers to the spec's seven questions

### (a) Data presence at renderAll() time
At the moment `renderAll()` fires from `fetchSchedule()` (line 19411), `allData.sports` is the return of `buildTodaySchedule()` (line 19401). I read the body of `buildTodaySchedule()` (lines 10158-11209) and confirmed:

**There is no `maybePushWorldCup()` call inside `buildTodaySchedule()`.**

I verified this with `grep -n "maybePush\|return sections" index.html | awk -F: '$1 >= 10158 && $1 <= 11210'` — the only match in that range is `return sections;` at 11209. No `maybePushWorldCup`, no `maybePushFrenchOpen`, no `maybePushAFLFinals` either. So the first `renderAll()` runs with **no FIFA section in allData.sports** — regardless of date, regardless of slate, regardless of V2 status.

By contrast, `buildDateSchedule()` (used for date navigation, line 6494) does call all three: `maybePushFrenchOpen`, `maybePushWorldCup`, `maybePushAFLFinals` at lines 6504-6506. `fetchESPNFixtures()` also calls them at lines 6619-6622. The **today** path is the only one that misses them.

### (b) Race condition: execution order
For the page's main "today" load:
1. `<body>` parses, scripts run.
2. `fetchSchedule()` calls `Promise.race([fetchScheduleData(), 1500ms])` (line 19393).
3. After race settles: `verified = buildTodaySchedule()` (line 19401) → **no FIFA section pushed.**
4. `allData = {sports: [...verified]}`, `buildFilters`, `renderAll()` (lines 19402-19411).
5. `window._fieldDataReady = Date.now()` (line 19414).
6. `loadOverlayData()` async.
7. `fetchESPNScores()` and `startV2ScorePolling()` (lines 19433-19434). `startV2ScorePolling()` calls `fetchV2AllScores()` (line 15661).
8. `fetchV2AllScores()` makes network calls for every enabled sport in `FIELD_V2_SOURCES` including `wc26`. After Promise.all settles, runs the WC injection block (lines 15436-15517).
9. The WC injection's "first injection" branch (line 15485) splices a fresh FIFA section into `allData.sports` from `espnScores`. Then `scheduleRenderAll()` (line 15510) triggers a 150ms-debounced re-render.

So the FIFA section appears **only after** V2 polling completes successfully AND has wc26 data to inject. **If V2 fails (relay error, network hiccup, returns empty array), the FIFA section is never created during this session.** The first `renderAll()` always paints without it — the question is only whether V2 fills the gap.

This is the inconsistency the user observed: "sometimes the FIFA section renders with 5 games, sometimes it's missing entirely." It's V2-dependent, not data-dependent.

### (c) isToday filter — timezone
`isToday(iso)` at lines 9193-9204 uses `America/New_York` timezone (`toLocaleDateString('en-CA', {timeZone:'America/New_York'})`). `TODAY_ISO` (line 6210) is computed in the same ET timezone with a 4am rollover. So the filter is ET-consistent.

Verification for current games:
- Netherlands vs Japan: `2026-06-14T20:00:00Z` → 16:00 ET on 2026-06-14 → ET date `'2026-06-14'` → today ✓
- Tunisia vs Sweden: `2026-06-15T02:00:00Z` → 22:00 ET on 2026-06-14 → ET date `'2026-06-14'` → today ✓

The filter is **not** the cause — both games would pass `isToday()` if V2 returned them. The bug is upstream of the filter: the wc26Raw section never enters allData.sports in the first place, so the V2 path is the only chance.

### (d) `_wcSectionInjected` flag — stuck-state analysis
The flag is initialized `false` at line 15239 and set to `true` only when V2 successfully creates a section (line 15498) OR when an existing FIFA section is detected and adopted (line 15465).

If V2 polling **fails on the first attempt** (network, relay 502, abort signal), `wcKeys.length === 0` so the inner block (lines 15467-15509) is skipped entirely. `_wcSectionInjected` stays `false`. On the next poll attempt (typically ~20s later, scheduled by `_v2PollTimeout`), the same logic runs — and if V2 succeeds this time, the first-injection branch fires.

So the flag **does not get stuck** — subsequent polls can still inject. But each failure delays first-render visibility by another poll cycle. In a slate where V2 wc26 is fully offline, the FIFA section never appears. That matches "sometimes it's missing entirely."

Also note: `maybePushWorldCup()` never runs from the "today" path (per finding a), so the dedup pre-flight at lines 15461-15466 never finds an existing section to adopt on the today path. It always takes the splice-new-section branch.

### (e) `maybePushWorldCup` — definition and triggers
Defined at line 32472. Body: gates on `TODAY_ISO < PREVIEW_FROM || TODAY_ISO > WC_END` (preview window May 24 → July 19), then either pushes a preview card (pre-WC_START) or filters `wc26Raw` by `isToday()` and pushes those games. Falls back to a day-of placeholder if `todayGames.length === 0`.

Callers:
- **`buildDateSchedule(iso)` line 6505** — date-navigation path (clicks the arrow keys / picker).
- **`fetchESPNFixtures()` line 6621** — only for unknown dates that fall through to ESPN fetch.
- **NOT `buildTodaySchedule()`** — confirmed missing.

For "today" the function never runs. There's no silent-failure mode in `maybePushWorldCup` itself (no try/catch, no early-return on empty `wc26Raw`); the gate is purely date-bounded. The bug is purely that nobody calls it on the today path.

### (f) V2 relay health — failure modes
`fetchV2Games()` at line 15042 makes a `fetch(${V2_RELAY_BASE}/v2/games?sport=wc26&date=…)` call. On a non-OK response or thrown error, it `if(!r.ok) return []` (line ~15050) — returns empty array. So upstream `fetchV2AllScores` gets `games = []`, `mapV2ToESPN()` is called on each (none), nothing populates `espnScores`. The wc injection's `wcKeys.length === 0` short-circuit at line 15467 keeps the section out of `allData.sports`.

The client handles every documented V2 failure mode by **doing nothing** — which is the design intent for live-state polling (better to keep stale state than show an error), but is catastrophic for FIFA-section bootstrapping because the today path has no other source of WC games.

### (g) Render cycle after FIFA section appears
When V2 does succeed, the injection branch ends with `scheduleRenderAll()` at line 15510. This 150ms-debounced re-render rebuilds card DOM from `allData.sports` and the FIFA section appears. So when V2 works, the second render shows WC.

If V2 never succeeds, there's no further trigger to call maybePushWorldCup — the today path doesn't have one.

---

## Why the inconsistency, in 2-3 sentences

**The startup path for "today" calls `buildTodaySchedule()`, which never invokes `maybePushWorldCup()` — only `buildDateSchedule()` and `fetchESPNFixtures()` do. So the first `renderAll()` always paints without a FIFA section, and the FIFA section only appears IF the V2 wc26 poll succeeds and has games for today. Any V2 failure (relay 502, timeout, empty array, network hiccup) means the FIFA section never materialises this session.**

The fix bridges this gap by adding the three `maybePush*` calls to `buildTodaySchedule()` mirroring the `buildDateSchedule()` pattern. wc26Raw is then the guaranteed source for the FIFA section on every today-load; V2 still layers live state on top via the existing dedup logic at lines 15461-15466 (which I committed in iPad-10 specifically for this merge case). No structural change to either data source — it's a timing fix only.

---

## Why this fix will work where the current state fails

1. **`maybePushWorldCup()` runs synchronously inside `buildTodaySchedule()`** — before `renderAll()` ever fires. The first paint includes the FIFA section.
2. **wc26Raw is static data baked into the bundle** — zero network risk. No way to "fail" the way V2 can.
3. **The V2 dedup pre-flight (iPad-10, line 15461-15466) already handles the case where wc26Raw pushed first.** On V2's first successful poll, `existingFifaSection` is found, `_wcSectionInjected` is flipped, and the merge branch runs — overlaying live state onto the wc26Raw games keyed by `home|away`. No duplicate section, no clobbered matchupNotes.
4. **If V2 fails permanently, wc26Raw's static games remain visible** — with start_time, venue, streams, matchupNote. The user sees the WC schedule; live state just doesn't update.

This is exactly the pattern `buildDateSchedule()` already uses for date navigation, which is why date-nav reliably shows WC games while today-load doesn't.

---

## Rule check

- **Rule 6/9 — no structural escalation:** ✓. Adding three function calls inside `buildTodaySchedule()` before its existing `return sections` is not structural — it's a timing fix that mirrors the existing pattern in `buildDateSchedule()`. No layout change, no new function, no body-level CSS. The two-source architecture is unchanged.
- **Rule 13 — code review gate:** the change touches one function (`buildTodaySchedule()`). The three helpers it calls (`maybePushFrenchOpen`, `maybePushWorldCup`, `maybePushAFLFinals`) already exist and have stable contracts (take `sections` array, push to it, return void). The downstream V2 dedup logic was specifically built (iPad-10) to handle a pre-existing FIFA section.
- **Rule 14 / STANDARDS Rule 24 — execution path contracts:** `buildTodaySchedule()` fires once per `fetchSchedule()` call, which runs on initial load and again on date navigation back to today. It does not re-fire on V2 polls. Adding the maybePush calls inside it is correct because we want WC pushed once, at schedule build time — not at every render.
- **Rule 48 / STANDARDS Rule 48 — do not assume:** I verified the missing call with `grep`, not by inference. I verified the V2 dedup logic by reading iPad-10's commit changes. I verified `isToday()` math against the actual Netherlands-Japan timestamps.
- **Rule 24 (above) edge case:** `maybePushWorldCup` is idempotent within a single `buildTodaySchedule()` call but if `buildTodaySchedule()` is called twice (e.g. date nav round-trip), it would build a fresh `sections` array, so no duplicate-push risk.

---

## Implementation plan

1. Add three function calls to `buildTodaySchedule()` immediately before `return sections;` at line 11209:
   ```js
   maybePushFrenchOpen(sections);
   maybePushWorldCup(sections);
   maybePushAFLFinals(sections);
   ```
   Mirrors `buildDateSchedule()` lines 6504-6506.

2. Add a smoke assertion that pins the call to `maybePushWorldCup(sections)` inside `buildTodaySchedule()`. The assertion guards against future regressions where the today path silently drops WC again.

3. Optional: add a Playwright test in `tests/viewport-all.spec.js` asserting that at iPad widths on a date in the WC window, the FIFA section is visible after `_fieldDataReady`. (Deferred — the smoke gate is sufficient for the today-path bootstrap; the Playwright test would benefit from a fixture that controls TODAY_ISO).

No JS architecture change, no relay change, no CSS, no body layout change.
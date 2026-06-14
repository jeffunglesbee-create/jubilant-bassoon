# ADR-002 Compliance Audit v2 — Reclassified per `docs/ADR-002-CONTEXT.md`

**Date:** 2026-06-14
**Audited HEAD:** `bf6e5f2` (branch `claude/elegant-shannon-t2dvt0`, after merge with `origin/main` `c28b545`)
**Supersedes:** `outbox/adr-002-audit.md` (v1)
**Reference:** `docs/ADR-002-CONTEXT.md` (severity framework, §Severity Classification)

## What changed between v1 and v2

v1 ranked findings on intuition — "RUWT shape", "bright-line", etc. v2 applies the explicit 5-tier framework from `docs/ADR-002-CONTEXT.md`:

- **CRITICAL** — Raw composite number rendered to user
- **HIGH** — Composite + hardcoded threshold + action, no Drama Dial
- **MODERATE** — Composite + Drama Dial threshold (mitigated)
- **LOW** — Composite used for internal logic, no user-visible output
- **CLEAN** — Named binary, factual data, post-game (amnesty zone)

Three v1 findings shift down once the Drama Dial defense (§Defense 1) is credited. Three v1 findings stay at the top — they render the raw composite number to the user, which the context doc calls a bright-line violation regardless of any other mitigation.

---

## CRITICAL (3) — bright-line, fix immediately

The composite drama number itself appears in user-visible DOM. Per §Prohibited #3: *"The number itself IS the 'interest level' the patent claims. Even if computed client-side, displaying `'75'` or `'85% 🔥'` to the user creates evidence of a system that determines and presents interest levels."*

### C1 — `detectAndRenderDoubleFeature()` renders composite drama in banner
`index.html:30831-30866`
```js
const _doubleFeatureThreshold = 75;
const smoothed = getSmoothedDrama(gid) ?? dramaScoreLive(eData, eData._sport||'');
if (smoothed >= _doubleFeatureThreshold) { hotGames.push({…, smoothed, …}); }
…
const text = '🎬 Double Feature — '
  + top2[0].label + ' (' + top2[0].smoothed + ')'
  + ' + ' + top2[1].label + ' (' + top2[1].smoothed + ')';
```
Compounding: hardcoded threshold (`75`) + raw composite rendered to user. Two prohibited patterns in one block.
**Fix:** drop `(smoothed)` from `text`; trigger off `isLiveCloseLateGame(gid)` instead of `>= 75`.

### C2 — Halftime Switch renders `${best.drama}% 🔥`
`index.html:34653-34669`
```js
const best = liveGames
  .filter(g => g.game._id !== htGame.game._id && g.drama >= getDramaDial())
  .sort((a,b) => b.drama - a.drama)[0];
…
<span class="ht-drama">${best.drama}% 🔥</span>
```
Threshold uses `getDramaDial()` (would be MODERATE for the filter alone), but the render of `${best.drama}%` is the bright line.
**Fix:** keep the `getDramaDial()` filter if you want, but drop `${best.drama}%` from the markup — replace with `dramaLabel(best.drama)` (already exists at 20655) or a static glyph.

### C3 — `selectRightNowGames` badge renders integer drama
`index.html:4692-4694`
```js
const dramaEl = drama >= 40
  ? `<span class="drama-mini" …>${drama}</span>`
  : '';
```
Hardcoded `>= 40` + integer drama rendered to user. `renderMobileLiveBar` already fixed this pattern; right-now-games was missed.
**Fix:** replace `${drama}` with `dramaLabel(drama)` tier glyph (already exists at 20655).

---

## HIGH (7) — composite + hardcoded threshold + system-determined action, no Drama Dial

Per §How to Evaluate Step 2: *"Hardcoded number (e.g., `>= 75`): HIGHER RISK — system determines the threshold, not the user. Should be refactored to named conditions."*

### H1 — `computeWatchValue()` — RUWT-shape composite + hardcoded verdict thresholds
`index.html:33183-33247`
```js
let value = 0;
// Factor 1 (state +5..+30), 2 (drama +8..+25), 3 (stakes +12..+20),
// 4 (sweep +8..+10), 5 (free +5), 6 (rivalry/team +5..+10)
value = Math.min(100, value);
const verdict = value >= 60 ? 'must' : value >= 30 ? 'watch' : 'skip';
```
**Severity-relevant nuance:** Rule C explicitly names `computeWatchValue()` as a function that **must remain client-side** (i.e., its existence is permitted as long as it does not move to the relay). However, §Prohibited #4 forbids *"System-determined recommendation without user personalization."* This function's hardcoded `>=60 / >=30` thresholds and `must/watch/skip` verdict are exactly that. The function being client-side does not bless its hardcoded-threshold + verdict architecture.
**Fix:** keep computation client-side, but either (a) gate verdict thresholds through `getDramaDial()` to mediate via the user, or (b) replace with a categorical hierarchy (finals → elimination → live-and-close → free-OTA → my-team).

### H2 — `selectRightNowGames()` — drama + boost summed, hardcoded `>= 50`
`index.html:4632-4674`
```js
const drama = dramaScoreLive(g._id) || 0;
const importanceBoost = g._gameImportance === 'elimination' ? 20
                      : g._gameImportance === 'playoffs'    ? 10 : 0;
const score = (isLive ? drama + 30 : drama) + importanceBoost;
…
if (isP3 && all[1]?.isLive && all[1]?.score >= 50) return [top, all[1]];
```
**Fix:** sort by named tiers (`isLive` → `isPlayoffElim` → `isPlayoffs` → upcoming) instead of summing.

### H3 — `pgScore > 50 && isNationalGame(g)` → `marquee`
`index.html:8798-8803`
```js
const pgScore = (typeof preGameScore === 'function') ? preGameScore(g) : 0;
if (isScoutsPick(g)) return 'hidden-gem';
if (g.seriesRecord && g.seriesRecord !== '0-0') return 'series';
if (pgScore > 50 && isNationalGame(g)) return 'marquee';
```
Sibling miss in the ADR-002 refactor that fixed `pgScore > 70` Scout's Pick.
**Fix:** `isMarqueeBroadcast(g) && (g._gameImportance || hasSeriesContext(g))`.

### H4 — `renderWatchWindow()` selection + display gate, hardcoded `< 20`
`index.html:29251-29252`
```js
const score = preGameScore(g);
if (score > bestScore) { bestScore = score; best = {g, sec, minsAway}; }
…
if (!best || bestScore < 20) { el.style.display = 'none'; … return; }
```
**Fix:** tier ladder (finals → conf finals → playoff → series → national TV); show when top tier non-empty.

### H5 — STATE 4 TOP PICK, hardcoded `>= 55`
`index.html:31455-31472`
```js
const s = preGameScore(g);
if (s > topS) { topS = s; top = {g, sport: sec.sport, score: s}; }
…
if (top && topS >= 55) { … <span class="otw-drama d-pregame">TOP PICK</span> … }
```
**Fix:** named-tier selection (finals → playoff series → marquee national → series-deciding).

### H6 — `renderMobileLiveBar()` 4 hardcoded tier thresholds
`index.html:31519, 31529-31530`
```js
const score = dramaScoreLive(ed, sec.sport);
…
const tier      = drama >= 85 ? 'fire'  : drama >= 65 ? 'crunch' : drama >= 45 ? 'warm' : 'low';
const tierLabel = drama >= 85 ? '🔥'    : drama >= 65 ? '⚡'     : drama >= 45 ? '●'    : '';
```
Raw number already removed (good), but the four hardcoded thresholds determine tier classification system-side.
**Fix:** use `_otwGetLiveTier()` at 30521 (already returns named conditions).

### H7 — `buildCompoundPrompt._importanceScore` bucket thresholds
`index.html:23100-23170`
```js
const _importanceScore = (g) => {
  if (/nba finals|…/i.test(l)) return 10;
  if (/wc.*semifinal|…/i.test(l)) return 9;
  …
};
const hasTier1 = games.some(g => _importanceScore(g) >= 8);
const hasTier2 = games.some(g => _importanceScore(g) >= 6 && _importanceScore(g) < 8);
if (_importanceScore(g) >= 6) return;
```
Single-dimension classifier (not a sum), but consumer treats it as scalar with hardcoded `>=` buckets. Output drives LLM prompt context, not direct user display — but selection IS system-determined.
**Fix:** return named tier string (`'final' | 'semifinal' | …`); switch downstream `>=` to `=== 'final'` style.

---

## MODERATE (2) — composite + Drama Dial threshold (Defense 1 mitigated)

Per §Defense 1: *"Any code pattern that reads `getDramaDial()` as its threshold is MITIGATED by this defense. The threshold comparison still exists in code, but the threshold value is user-controlled, not system-determined."* Still flag for cleanup, but not a compliance emergency.

### M1 — `ViewingConditions.evaluate()` — Drama Dial threshold + deltas
`index.html:19773-19796`
```js
let score = dramaScorePeak;
if (isCrunchTime && margin <= 5) score += 30;
if (margin > 20)                 score -= 20;
const dial = getDramaDial();
if (score >= Math.min(dial+20, 95)) return {badge:'CRUNCH TIME', …};
if (score >= dial)                  return {badge:'WORTH WATCHING', …};
```
Threshold is user-controlled (`getDramaDial()`). Badges are named labels (`CRUNCH TIME`, `WORTH WATCHING`) — no raw number rendered. **Nuance:** the `+30 / -20` deltas and `dial + 20` shift are system-determined adjustments on top of the user's threshold — borderline. The defense holds, but cleanup would simplify to direct named-condition mapping.
**Fix (cleanup, not urgent):** `if (isCrunchTime && margin <= 5) badge = 'CRUNCH TIME'; else if (isCloseAndLate) badge = 'WORTH WATCHING'`.

### M2 — `_otwFindLiveGame(minScore)` — callsites pass `getDramaDial()`
`index.html:31194-31214` (callsites 28889, 31322, 31393)
```js
function _otwFindLiveGame(minScore) {
  let best = null, bestScore = 0;
  …
  const s = dramaScoreLive(ed, sec.sport);
  if (s >= minScore && s > bestScore) { bestScore = s; best = {g, ed, sport: sec.sport, score: s}; }
```
Callsites pass `getDramaDial()` as `minScore` — Drama Dial mediated. STANDARDS.md:2963-2967 already lists this as MODERATE risk. OTW FIRE banner uses named label (no raw number).
**Fix (cleanup, not urgent):** port the categorical-tier pattern from sibling `_otwFindWCLiveGame:31230` (T1 CRUNCH → T2 OT → T3 CLOSE_FINISH → T4 LIVE_GAME). `_otwGetLiveTier:30521` already returns named conditions.

---

## LOW (1) — composite used for internal logic, no user-visible output

Per §Permitted #7: *"Polling cadence based on game state… cadence tiers driven by composite drama scores (finding #4 in audits) are a gray area — prefer named conditions."* (This is the same finding — the framework calls it out by name.)

### L1 — `computeLiveInterval()` polling cadence
`index.html:17081-17101`
```js
const drama = sec ? Math.max(0, …(sec.games||[]).map(g => {
  const smoothed = g._id ? getSmoothedDrama(g._id) : null;
  return smoothed != null ? smoothed : preGameScore(g);
})) : 0;
if (drama > 75) return 20000;
if (drama > 50) return 25000;
if (drama > 30) return 30000;
```
Output is poll interval (ms), not user-visible. Internal operational efficiency. Explicitly named gray area in the framework.
**Fix (preference, not required):** named binary gates (`anyLiveCrunch`, `anyLiveOT`, `anyLiveCloseLate`) → cadence tiers.

---

## CLEAN — Advisory and verified-clean items (unchanged from v1)

### A1 (advisory) — `dramaScoreLive` itself
`index.html:20439-20559` — Per §Permitted #1: *"Client-side drama scoring — `dramaScoreLive()` in index.html is permitted."* The function's existence is blessed. Risk lives in its call sites (handled above), not the function. **No action.**

### Verified clean
- `_otwFindWCLiveGame:31230` — reference correct pattern (categorical tiers, §Step 5)
- `_otwGetLiveTier:30521` — named-condition tier function (the canonical fix target)
- `computeBroadcastNarrativeIndex:29412` — refactored to `!isScoutsPick(g)` boolean gates
- `narrativeGrade:33172` — string verdict mapping
- `field_utils.js dramaTier()` — single-input label (§Permitted)
- `sw.js` — no composite/threshold patterns
- Win probability display — §Permitted #4 (statistical, not interest)
- Post-game briefs — §Defense 4 (amnesty zone)

---

## Severity reclassification: v1 → v2 deltas

| # | v1 tier | v2 tier | Reason for change |
|---|---|---|---|
| C1 (was #9 Double Feature) | Tier A | **CRITICAL** | Raw number rendered → bright-line per §Prohibited #3 |
| C2 (was #10 Halftime) | Tier A | **CRITICAL** | `${best.drama}%` in DOM → bright-line |
| C3 (was #12 RightNow badge) | Tier A | **CRITICAL** | `${drama}` in DOM → bright-line |
| H1 (was #1 computeWatchValue) | Tier B (top) | **HIGH** | Rule C names it as permitted client-side; hardcoded thresholds make it HIGH not CRITICAL |
| H2 (was #2 selectRightNowGames) | Tier B | **HIGH** | Hardcoded `>= 50` |
| H3 (was #5 marquee) | Tier C | **HIGH** | Hardcoded `> 50`, system-determined classification |
| H4 (was #7 WatchWindow) | Tier C | **HIGH** | Hardcoded `< 20` |
| H5 (was #8 STATE 4) | Tier B | **HIGH** | Hardcoded `>= 55` |
| H6 (was #11 mobile bar) | Tier C | **HIGH** | Four hardcoded thresholds, system-determined tier |
| H7 (was #13 _importanceScore) | Tier C | **HIGH** | Hardcoded bucket thresholds |
| M1 (was #3 ViewingConditions) | Tier C | **MODERATE** | Uses `getDramaDial()` → Defense 1 mitigates |
| M2 (was #6 _otwFindLiveGame) | Tier B | **MODERATE** | Callsites pass `getDramaDial()` → Defense 1 mitigates |
| L1 (was #4 polling cadence) | Tier C | **LOW** | Internal logic only, no user-visible output (framework's named gray area) |

**Net effect:** 3 CRITICAL (was "Tier A, 3 items"), 7 HIGH (was a mix), 2 MODERATE (downgraded thanks to Drama Dial), 1 LOW (downgraded to internal-only).

---

## Recommended remediation order (revised)

1. **CRITICAL first** — C1, C2, C3. Each is a few lines, removes a raw composite number from the DOM. Zero architectural change required.
2. **HIGH next, biggest blast radius first** — H1 (`computeWatchValue` — used widely), then H2/H5/H6 (`selectRightNowGames`, STATE 4, mobile bar — UI surfaces), then H3/H4/H7 (smaller-surface or internal-prompt).
3. **MODERATE as time permits** — M1, M2 are mitigated by Drama Dial; refactor for cleanliness but not compliance pressure.
4. **LOW optional** — L1 only if you want defense-in-depth on a pattern the framework already calls a gray area.

---

## Coverage caveat (carried from v1)

~31k of 34k lines of `index.html` were not fully read. Greps caught every `>= number` / sort-by call involving `preGameScore` / `dramaScoreLive`, but custom-named composites under `let v=0` / `score+=` could escape. Follow-up sweep:

```
grep -nE 'value\s*\+=|score\s*\+=|let\s+v\s*=\s*0|let\s+s\s*=\s*0' index.html
```

Run before declaring the audit closed.

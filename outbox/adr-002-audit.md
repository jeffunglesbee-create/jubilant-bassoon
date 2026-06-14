# ADR-002 Compliance Audit — `index.html`

**Date:** 2026-06-14
**Audited HEAD:** `d8ab862` (branch `claude/elegant-shannon-t2dvt0`)
**Scope:** `index.html` + supporting JS (`field_utils.js`, `field_smoke.js`, `sw.js`). Relay worker repo (`field-relay-nba`) not in this checkout.

**Result: 13 actionable violations + 1 advisory.** The codebase shows clear awareness of ADR-002 (mitigations + comments throughout), but the composite-score → threshold → display pattern recurs across multiple call sites. Most severe: `computeWatchValue()` is structurally identical to the RUWT shape ADR-002 forbids.

---

## Findings (ranked by severity)

### 1. `computeWatchValue()` — full RUWT-shape composite + verdict
`index.html:33183-33247`
```
let value=0;
// Factor 1 (state +5..+30), 2 (drama +8..+25), 3 (stakes +12..+20),
// 4 (sweep +8..+10), 5 (free +5), 6 (rivalry/team +5..+10)
value=Math.min(100,value);
const verdict=value>=60?'must':value>=30?'watch':'skip';
```
Six signals summed → one scalar → `must/watch/skip`. Textbook violation.
**Fix:** categorical hierarchy (finals → elimination → live-and-close → free-OTA → my-team), first match wins.

### 2. `selectRightNowGames()` — drama + isLive + importance summed for selection
`index.html:4632-4674`
```
const drama = dramaScoreLive(g._id) || 0;
const importanceBoost = g._gameImportance==='elimination'?20
                      : g._gameImportance==='playoffs'?10 : 0;
const score = (isLive ? drama + 30 : drama) + importanceBoost;
…
if (isP3 && all[1]?.isLive && all[1]?.score >= 50) return [top, all[1]];
```
**Fix:** sort by named binary tiers (`isLive` → `isPlayoffElim` → `isPlayoffs` → upcoming).

### 3. `ViewingConditions.evaluate()` — score mutated by deltas, then thresholded
`index.html:19773-19796`
```
let score = dramaScorePeak;
if (isCrunchTime && margin <= 5) score += 30;
if (margin > 20)                 score -= 20;
if (score >= Math.min(dial+20,95)) return {badge:'CRUNCH TIME', …};
if (score >= dial)                 return {badge:'WORTH WATCHING', …};
```
**Fix:** `if (isCrunchTime && margin<=5) badge='CRUNCH TIME'` — no score variable.

### 4. `computeLiveInterval()` — composite drama → poll cadence bands
`index.html:17081-17101`
```
const drama = …max preGameScore / smoothedDrama across games…
if(drama > 75) return 20000;
if(drama > 50) return 25000;
if(drama > 30) return 30000;
```
Cadence ≠ verdict, but same structure.
**Fix:** named gates (`anyLiveCrunch`, `anyLiveOT`, `anyLiveCloseLate`) → cadence tiers.

### 5. `pgScore > 50 && isNationalGame(g)` → `marquee`
`index.html:8798-8803`
```
const pgScore = (typeof preGameScore === 'function') ? preGameScore(g) : 0;
if (isScoutsPick(g)) return 'hidden-gem';
if (g.seriesRecord && g.seriesRecord !== '0-0') return 'series';
if (pgScore > 50 && isNationalGame(g)) return 'marquee';
```
The block comment immediately above describes the exact ADR-002 refactor for `pgScore>70` Scout's Pick — sibling line was missed.
**Fix:** `isMarqueeBroadcast(g) && (g._gameImportance || hasSeriesContext(g))`.

### 6. `_otwFindLiveGame(minScore)` — composite + threshold for OTW FIRE banner
`index.html:31194-31214` (callsites 28889, 31322, 31393)
```
const s=dramaScoreLive(ed,sec.sport);
if(s>=minScore && s>bestScore){bestScore=s;best={g,ed,sport:sec.sport,score:s};}
```
Already documented as MODERATE risk in `STANDARDS.md:2963-2967`. Mirror function `_otwFindWCLiveGame:31230` is the correct categorical-tier pattern.
**Fix:** port `_otwFindWCLiveGame`'s T1 CRUNCH → T2 OT → T3 CLOSE_FINISH → T4 LIVE pattern (`_otwGetLiveTier:30521` already exists, just unused here).

### 7. `renderWatchWindow()` — preGameScore selection + threshold display gate
`index.html:29251-29252`
```
const score=preGameScore(g);
if(score>bestScore){bestScore=score;best={g,sec,minsAway};}});});
if(!best||bestScore<20){el.style.display='none';…return;}
```
**Fix:** tier ladder (finals → conf finals → playoff → series → national TV); show whenever top tier non-empty.

### 8. STATE 4 Tonight: `preGameScore >= 55` → TOP PICK banner
`index.html:31455-31472`
```
const s=preGameScore(g);if(s>topS){topS=s;top={g,sport:sec.sport,score:s};}
if(top&&topS>=55){ … <span class="otw-drama d-pregame">TOP PICK</span> … }
```
**Fix:** named-tier selection (finals → playoff series → marquee national → series-deciding).

### 9. `detectAndRenderDoubleFeature()` — composite + threshold + **renders raw number**
`index.html:30831-30866`
```
const _doubleFeatureThreshold = 75;
const smoothed = getSmoothedDrama(gid) ?? dramaScoreLive(eData, eData._sport||'');
if (smoothed >= _doubleFeatureThreshold) { hotGames.push({…, smoothed, …}); }
…
const text = '🎬 Double Feature — '
  + top2[0].label + ' (' + top2[0].smoothed + ')'
  + ' + ' + top2[1].label + ' (' + top2[1].smoothed + ')';
```
Worst form — bright-line violation: the composite drama number is printed in the banner.
**Fix:** drop the parenthesized number; trigger off `isLiveCloseLateGame(gid)` instead of `>= 75`.

### 10. Halftime Switch — composite + threshold + **renders `${best.drama}% 🔥`**
`index.html:34653-34669`
```
const best = liveGames
  .filter(g=>g.game._id!==htGame.game._id && g.drama>=getDramaDial())
  .sort((a,b)=>b.drama-a.drama)[0];
…
<span class="ht-drama">${best.drama}% 🔥</span>
```
**Fix:** filter on `isCloseAndLate(g)`, drop `${best.drama}%` from markup.

### 11. `renderMobileLiveBar()` — composite → 4 display bands
`index.html:31519, 31529-31530`
```
const score=dramaScoreLive(ed,sec.sport);
…
const tier=drama>=85?'fire':drama>=65?'crunch':drama>=45?'warm':'low';
const tierLabel=drama>=85?'🔥':drama>=65?'⚡':drama>=45?'●':'';
```
Comment notes the raw number was removed (good), but threshold→tier mapping IS the forbidden shape.
**Fix:** use `_otwGetLiveTier` (already returns named conditions).

### 12. `selectRightNowGames` drama badge — **renders integer drama**
`index.html:4692-4694`
```
const dramaEl = drama >= 40
  ? `<span class="drama-mini" …>${drama}</span>`
  : '';
```
Mobile live bar already fixed this; right-now-games didn't.
**Fix:** replace with tier glyph from `dramaLabel(drama)` (exists at 20655).

### 13. `buildCompoundPrompt._importanceScore` — tier-as-scalar + bucket thresholds
`index.html:23100-23170`
```
const _importanceScore = (g) => {
  if (/nba finals|…/i.test(l)) return 10;
  if (/wc.*semifinal|…/i.test(l)) return 9;
  …
};
const hasTier1 = games.some(g => _importanceScore(g) >= 8);
const hasTier2 = games.some(g => _importanceScore(g) >= 6 && _importanceScore(g) < 8);
```
Single-dimension classifier (not a sum), but consumer treats it as scalar with `>=` buckets — recreates the RUWT shape.
**Fix:** return named tier string (`'final' | 'semifinal' | …`); switch downstream to `=== 'final'`.

---

## Advisory (not a violation)

**`dramaScoreLive` itself (`index.html:20439-20559`)** — composite, but `STANDARDS.md:2588` permits drama scoring client-side. The risk surface is its **call sites** (findings 3, 6, 9, 10, 11, 12), not the function. No fix to the function itself.

---

## Verified clean

- `_otwFindWCLiveGame:31230` — reference correct pattern (categorical tiers)
- `computeBroadcastNarrativeIndex:29412` — refactored to `!isScoutsPick(g)` boolean gates
- `narrativeGrade:33172` — string verdict mapping
- `field_utils.js` — `dramaTier(score)` is single-input label, allowed per STANDARDS 401
- `sw.js` — no composite/threshold patterns

---

## Recommended remediation order

**Tier A (do first, public bright-line violations — composite numbers rendered to the user):**
- #9 Double Feature
- #10 Halftime Switch
- #12 Right-Now badge

**Tier B (RUWT-shape selection drivers):**
- #1 `computeWatchValue` (biggest blast radius)
- #2 `selectRightNowGames`
- #6 `_otwFindLiveGame`
- #8 STATE 4 TOP PICK

**Tier C (cleanup):**
- #3 ViewingConditions
- #4 polling cadence
- #5 marquee sibling miss
- #7 WatchWindow
- #11 mobile bar tier
- #13 `_importanceScore`

---

## Coverage caveat

~31k of 34k lines of `index.html` were not fully read by the audit pass. The greps caught every `>= number` / sort-by call involving `preGameScore` / `dramaScoreLive`, but a hidden composite under a custom variable name (`let v=0` / `score+=`) could escape.

**Recommended follow-up sweep before declaring closed:**
```
grep -nE 'value\s*\+=|score\s*\+=|let\s+v\s*=\s*0|let\s+s\s*=\s*0' index.html
```

## Search log (this pass)

| Pattern | Files | Hits |
|---|---|---|
| `interestScore\|interestLevel\|importanceScore\|compositeScore\|dramaIndex` | index.html | 5 (all `_importanceScore` — finding #13) |
| `_otwFindLiveGame\|dramaScoreLive\s*\(.*\)\s*[><]=?\s*\d` | index.html | 4 |
| `preGameScore.*[<>]=?\s*\d\|preGameScore.*sort` | index.html | 4 |
| `getDramaDial\|dramaScoreLive` | index.html | ~30 |
| `drama\}\|drama:\s*\$\{` | index.html | 3 (numeric drama in DOM) |
| `smoothedDrama\|drama-mini\|d-fire\|d-hot\|d-warm` | index.html | 25 |
| `composite\|interestScore\|interestLevel\|importanceScore\|dramaIndex` | field_*.js | 4 (all clean) |
| `composite\|interestScore\|...\|drama.*[<>]=?\s*\d` | sw.js | 1 (comment only — clean) |
| `narrativeGrade\s*=\|function.*narrativeGrade\|narrativeGrade:` | index.html | 1 (string verdict — clean) |

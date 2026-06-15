# Claude Code Command — Dead Code + Betting Residue Removal

git pull. Read CLAUDE.md. Read STANDARDS.md Rule 14 (expired schedule entries).

Write all findings to outbox/cc-dead-code-removal-2026-06-15.md.

## CONTEXT

Betting intelligence was removed May 29, 2026. CSS, functions, variables, and comments remain. 213 expired May schedule entries (~46KB) are still in index.html. This session removes confirmed-dead code only — no live win probability infrastructure is touched.

## CRITICAL: DO NOT TOUCH THESE (live win probability, not betting)

- `_wcOddsCache` / `fetchWCOddsProbabilities()` — WC Monte Carlo
- `_cflOddsCache` / `_cflMatchOdds()` — CFL drama engine
- `_liveOddsWP` — score overlay WP
- `buildWCBars` `oddsData` reference — WC WP bars
- `sportsbook` in the disclaimer at line ~4147 — editorial content
- Any function with "WP" or "winProb" or "drama" in its name
- `fetchWCOddsProbabilities`, `fetchCFLOddsProbabilities`

## REMOVALS (verified dead, zero callers)

### 1. Expired May 2026 schedule entries (~46KB)

All hardcoded game objects with `start_time` containing `"2026-05-"`. These are NBA Playoffs (ECF/WCF), NHL Playoffs, and other May games. All filtered by `isToday()` — never rendered.

**Method:** Delete every object literal in schedule arrays where `start_time` contains `"2026-05-"`. Preserve the array structure and any June entries adjacent to them.

**Verify after:** `grep -c '"2026-05-' index.html` should return 1 or 2 (the `rawDate` parsing example at ~line 6553 and possibly one comment). NOT 213.

### 2. Betting CSS (~12 rules)

Remove these CSS rules entirely:
- `.betting-head` block (starts `display:flex;align-items:center;gap:.75rem`)
- `.betting-head::after` block
- `.betting-title` rule
- `.betting-icon` block
- `.betting-disclaimer` block
- `.bet-odd.changed` rule
- `@keyframes oddsFlash` block
- `.bet-grid{grid-template-columns:1fr}` (in responsive blocks)
- `.bet-title{font-size:.92rem}` (in responsive blocks)
- `.betting-section` in responsive comma lists (remove from comma list, keep `.media-section,.streaming-section`)
- `.bet-grid{ grid-template-columns:1fr !important; }` responsive override

**Do NOT remove:** `.odds-source-ai` CSS (may be referenced by live WP display).

### 3. Dead functions (zero callers)

Remove entire function bodies:
- `fetchNBAOddsViaRelay()` (~line 16182) — defined, never called
- `toImplied(oddsStr)` (~line 12011) — zero callers
- `toImpliedNum(oddsStr)` (~line 21513) — zero callers
- The moneyline check at ~lines 32886-32887: `if (!game.odds?.moneyline) return false; return Math.abs(...)` — find the containing function and verify it has zero callers before removing

### 4. Dead variables

- `oddsIntervalId` declaration at ~line 16252: `let oddsIntervalId = null;` — remove
- `oddsIntervalId` cleanup at ~line 7703: `if(oddsIntervalId){ clearTimeout(oddsIntervalId); oddsIntervalId=null; }` — remove

### 5. Dead localStorage references

- `odds_req` health panel check (~lines 4640-4644): the `try` block reading `localStorage.getItem('odds_req')` — remove entire try/catch for odds budget
- `field_odds_*` TTL sweep (~line 6048): remove `k.startsWith('field_odds_')` from the OR condition in the localStorage cleanup. Keep `field_brief_*` and `field_drama_history_*`.
- `'odds-relay-adapter'` feature date (~line 5196) — remove this entry from the feature inventory object

### 6. Stale comments

Update or remove these misleading comments:
- `<!-- Attention bar — live odds urgency (Step 7) -->` (~line 4276) — change to `<!-- Attention bar — live game urgency (Step 7) -->`
- `// Note: odds polling, media and betting are today-specific` (~line 7760) — remove "odds polling," and "and betting" from this comment
- `// Odds chips — inject after sport odds load from The Odds API cache` (~line 19596) — remove this comment
- `// Also re-renders Betting Intelligence section if it was empty on first try` (~line 19596) — remove this comment
- `// Media + betting rendered lazily by IntersectionObserver` (~line 19626) — change to `// Media rendered lazily by IntersectionObserver`
- `// All functions below were inadvertently dropped in the betting-engine removal commit.` (~line 19634) — update to remove betting reference, keep the Squiggle context

### 7. GRAY items — verify then remove if dead

- `_cflSpread` / `_cflTotal` / `_cflBookmakers` properties (~lines 11201-11204): grep for any render/display usage. If zero DOM writes reference these properties, remove the assignment lines (keep `g.wp = odds.pHome` — that's live WP).
- CFL `gotd-badge` with odds label (~line 9826): check if this code path is reachable with current CFL data. If `_cflOddsCache` is always empty (no relay endpoint serving CFL odds), this badge never renders — remove.

## INSTRUCTIONS

1. Make each category a SEPARATE commit (schedule entries, CSS, functions, variables, comments, gray items = 6 commits max).
2. Run smoke after EACH commit. Baseline: 652/0. The schedule removal should not affect smoke (entries are data, not assertions). CSS/function removal should not affect smoke (dead code).
3. After all removals, report: `wc -c index.html` before and after. Expected savings: ~48KB.
4. Write the full removal manifest to outbox/cc-dead-code-removal-2026-06-15.md with before/after byte counts, grep verification, and any items you chose NOT to remove with reasoning.
5. Push when complete.

## KNOWN LIMITATIONS

- Line numbers are approximate — betting removal and subsequent commits shifted them. Use content matching, not line numbers.
- The moneyline function (item 3) needs its parent function identified before removal. If the parent function has other live callers, only remove the moneyline branch, not the whole function.
- May schedule entries are interspersed with June entries in the same arrays. Surgical deletion required — don't accidentally remove array commas or break JSON-like structure.

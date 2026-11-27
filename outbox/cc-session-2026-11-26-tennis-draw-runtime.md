# CC session 2026-11-26 — the Draw tab is decided at run time, from the card's own rows

**Scope.** Client half of the tennis fix. field-relay-nba `docs/CC-CMD-2026-11-24-tennis-client-split-drift.md` filed the problem (three weekly reds of `tennis-tier-ladders.yml`, a different event each week); the owner approved "fix dead crons, Rule 42" and the chosen approach is the run-time rule, not a fourth list edit. The relay half (a replay detector that runs this page's own decision against the draw route) is a separate change and lands FIRST. A review of the first version (three reviewers, nine lenses, every major confirmed by two refuters) found defects in the tests and the docs, not in the decision; this document covers the fixed result.

**HEAD progression.** Written on a worktree based at `fde31ce8`, moved forward by two unrelated commits (`1606d7af`, `b2ff1b28`), then rebased onto origin/main `92e69d86` after the review (other sessions had taken `SW_VERSION` from b to e). Six commits sit on `92e69d86`, listed by subject because a rebase on push re-hashes them:

1. `fix(tennis): the Draw tab is decided from the card's own rows, not from a list of names` (field.js, index.html, smoke.js, sw.js, the mutation harness).
2. `test(tennis): pin the Draw pick against the 15 mutants the review found escaping`.
3. `test(tennis): A-TDRAW-17/18/23 stop depending on text layout, and A-TDRAW-23 states its coverage`.
4. `fix(tennis): the Draw comments name the relay check precisely; the empty-rounds sentence is true of every shape it can be shown for` (field.js, index.html, smoke.js, harness).
5. `docs: CONTRACTS.md records the tennis round_name vocabulary the Draw tab now decides on (Rule 86)`.
6. `docs: HANDOFF and the Rule 67 session doc ...` (this file).

origin/main was `3490dccf` (an outbox-only probe commit) when this was written; it touches no file here.

**`SW_VERSION`.** origin/main held `2026-11-26e`; this change sets `2026-11-26f` in `sw.js`, `src/legacy/field.js` and, through `scripts/sync-source.mjs`, `index.html`. The rebase conflicted on exactly those three files (and HANDOFF); `index.html` was restored from main and regenerated, not hand-merged. The divergence guard fired once more during the work, correctly: a second edit to `field.js` on top of an already-synced, uncommitted `index.html`. It was cleared by restoring `index.html` from HEAD and re-running sync.

**Measured on the final tree** (each number from the final run, none carried over; the harness's raw final output is `outbox/tennis-draw-pick-mutation-final-2026-11-26.txt`):

| check | origin/main `92e69d86` | final tree |
|---|---|---|
| `node smoke.js index.html` | 1088 passed / 0 failed | 1123 passed / 0 failed |
| `node field_unit.js` | 103 / 0 | 103 / 0 |
| `node field_smoke.js index.html` | exit 0 | exit 0 |
| eslint (`--plugin html index.html`) | 0 errors, 38 warnings | 0 errors, 38 warnings |
| `scripts/check-html-block-matches-source.mjs`, `scripts/uplot-css-check.mjs`, sync-source | pass | pass |
| `scripts/mutate-tennis-draw-pick.mjs` | (does not exist) | `ran 28 mutations, caught 28 of 28 (a neutral edit counts when smoke stays green); not caught 0; harness defects 0.` |

The A-TDRAW-22 coverage line, printed on a pass: `executed 33 of 33 designed cases (pick 26/26 right, nav 2/2, nav-through-the-real-merge 3/3, render 2/2); real declarations cut from the source (fetch, _tennisDiag, resolveBundle and FIELD_DEBUG stubbed)`. A-TDRAW-23 prints `checked 8 of 8 names`.

## What was wrong, in the page

`_tennisDrawPick` chose which named events (the Finals, the Cups) could reach the Draw tab by NAME: `_TENNIS_DRAW_NAMED_RANK` admitted five and `_TENNIS_DRAW_NO_BRACKET` excluded the Davis Cup and BJK Group I. Executed against the real text with designed rows (before the fix):

- a card of only WTA Finals round-robin rows (blank `round_name`) was offered the tab and opened onto "WTA Finals is played as ties, not as a single draw", which is false for a round-robin that feeds a knockout (the committed `outbox/tennis-draw-probe-manifest-*.json` quote "ATP Finals is played as ties" 11 times, "WTA Finals ..." 11 times, and the same sentence for Seoul, Beijing, Wuhan and Tokyo);
- that event ranked 1 and so outranked a real WTA 250 Round of 32 on the same day;
- a Davis Cup quarterfinal day gave `pick = null`, the nav link hidden, while the route serves a real tie-level draw (QF=4, SF=1 read 2026-11-26).

## What changed

In `src/legacy/field.js`:

- `_TENNIS_MAIN_DRAW_ROUNDS`, the seven names spelled exactly as the relay draw route's `ORDER` (field-relay-nba `src/index.js`, origin/main `fc22a8fa`, read 2026-11-26: `'Round of 128','Round of 64','Round of 32','Round of 16','Quarterfinals','Semifinals','Final'`), and `_tennisRowInMainDraw(m)`: round in that list and `status` not `cancelled`, the relay's own filter (it keeps a postponed or walkover row).
- `_tennisDrawPick` skips a row that fails the predicate. `_TENNIS_DRAW_NO_BRACKET` is deleted. A named event ranks 2 unless `_TENNIS_DRAW_NAMED_RANK` says otherwise, and the map holds only the preference that the two Finals rank 1. `TENNIS_NAMED` stays as the scope list.
- The empty-`rounds` branch of `renderTennisBracket` says "... the relay serves no main-draw round for 2026 (rows served: 1, none counted in a main-draw round)". It no longer says "played as ties" and no longer defaults `season` or `editionMatches`: the route serves both on every 200 (`season`, and `editionMatches: edition.length`, read 2026-11-26).
- Comments name the check on the relay's side precisely: field-relay-nba `scripts/lib/client-tennis-split.cjs`, run by `tennis-tier-ladders.yml`, which reads six declarations plus two consts out of the DEPLOYED page.

In `smoke.js`, `scripts/mutate-tennis-draw-pick.mjs` and `CONTRACTS.md`: see below.

## Review follow-up: what the review found, and what was done

The review mutated the decision by hand. Order of work for each (Rule 90): put the reviewer's mutant in the harness first, watch it escape, write the case, watch it go red for the stated reason.

**Before any new case** (`node scripts/mutate-tennis-draw-pick.mjs` with M12-M26 added and the expected case ids not yet written; raw output committed as `outbox/tennis-draw-pick-mutation-before-cases-2026-11-26.txt`, from the harness before its case-id pattern was fixed, summarised here):

```
ran 26 mutations, caught 11 of 26; not caught 15; harness defects 0.
  NOT CAUGHT  M12 postponed excluded      smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M13 walkover excluded       smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M14 every live row counts   smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M15/M16 nav from one feed   smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M17/M18 doubles bypassed    smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M19-M22 default rank 3/0/1/9  red on the A-TDRAW-16 text pin (and case I for 9) only
  NOT CAUGHT  M23 250s ranked with the 500s smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M24 keyed by name           smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M25 challenger as a tier    smoke exit 0; red instead: (nothing)
  NOT CAUGHT  M26 every name admitted     red on a check outside A-TDRAW only
```

**After the cases:** the harness first printed `caught 21 of 26` because its own case-id pattern read `A-TDRAW-22/I-count` as `A-TDRAW-22/I` (a defect of the apparatus, found by this run and fixed), then `ran 26 mutations, caught 26 of 26`. Then the three pin fixes (A-TDRAW-17 anchored, A-TDRAW-18 and a neutral mutation) were each run before and after: M12/M13/M14 `still green: A-TDRAW-17` before the anchor, red on it after; `NOT NEUTRAL M27 ... smoke went red on a behaviour-neutral edit: A-TDRAW-18` before, `stayed green` after. Final: 28 of 28.

| finding | disposition |
|---|---|
| origin/main moved; commits did not apply; HANDOFF and session-doc facts stale | rebased; `SW_VERSION` f; every number in this file and HANDOFF re-measured on the final tree; none of this change's own commits is quoted by hash |
| a live row always counts as main-draw (escapes everything); predicate pin unanchored | cases L1, L2, P1, P2 and nav case NM3; mutants M12-M14; A-TDRAW-17 anchored at both ends |
| case I does not pin rank 2 against the 250s (a tie fell to the first-listed row) | I (250 first), I-rev (United Cup first), I-count (fewer rows), I-slam, I-1000; mutants M19-M23; A-TDRAW-16 comment corrected to say the rank is pinned by those cases and the regex pins only the text |
| comments assert a relay replay guard that is not on the relay's main | comments name `scripts/lib/client-tennis-split.cjs`; landing order (detector first) and the reason are in HANDOFF |
| the nav's real call site (merged live and by-date rows) untested | cases NM1-NM3 run the real `fetchTennisLive` with `fetch`, `_tennisDiag`, `resolveBundle` and `FIELD_DEBUG` stubbed; mutants M15, M16 |
| no negative case for a Challenger at a main-draw round; doubles and id keying untested | S1, S2, D1, D2, ID; mutants M17, M18, M24-M26 |
| the Finals "win against any tour event except a slam" | comment corrected: level with a 1000, the busier card wins |
| `1 matches` and an inexact parenthetical | sentence rewritten, fallbacks removed; case R1 feeds the cancelled-only shape (`editionMatches` 1, `mainDrawMatches` 0); mutant M28 |
| A-TDRAW-23 has no coverage on a pass, a hard-coded failure detail | count computed into the label; the failure names the missing declaration |
| harness closing line claims success when it found defects | the claim prints only when nothing was missed; exit code unchanged (non-zero) |
| A-TDRAW-18's negative pin passes only because a comment is hand-wrapped | dropped; R1 renders the branch; M27 (neutral) proves layout no longer matters |
| `tennis_draw_probe.js` named as an unblock for something it cannot see | HANDOFF says so plainly; the file is not edited (Rule 69) |
| Rule 86: no tennis entry in CONTRACTS.md | added to this repo's copy; the relay's copy still needs it |

**Judgement call 1: the three-arm rank expression (tier rank, name map, default 2).** Kept, with the reason written at the declaration. Each arm is a declared class decided by what the row says: a tour event by its category, a season finale by its name, any other named event by one rule. None stands in for a missing value, and a named event is on `TENNIS_NAMED` because someone put it on the scope list, so it is rankable by definition. The failure this removes is the old one: a named event with no map entry fell to a null rank and was skipped silently (the old comment warned that lifting a name from the exclusion regex was not enough on its own). Not collapsed because the only way to name the default is a new top-level declaration, which the relay check is not told to extract, so the pick would throw there. Not removed: the `TENNIS_NAMED.test` arm, which the reviewers measured as unreachable behind `_tennisTierAllowed` (equivalent mutants); it is the in-function statement of the admission class and removing it would change nothing observable.

**Judgement call 2: weighted tie-level draws.** A concurrent 500's round of 16 (about 8 rows) beats a Davis Cup or United Cup knockout day (1-2 rows). Recorded in HANDOFF as a known trade-off. No one-line principled fix exists: any rank between a 1000 and a 500 for named events, or a tie-break toward the more specific event, changes the winner of every tie against a 500. The choice is the owner's.

## Premises, and the one command that tested each (Rules 87, 100)

| premise | command | result |
|---|---|---|
| the relay's vocabulary and cancelled rule are what the client copies | `git show origin/main:src/index.js` in field-relay-nba (`fc22a8fa`) | `ORDER` at line 11876 (the seven names); `main = inDraw.filter(status !== 'cancelled')` at line 11912; `season,` and `editionMatches: edition.length` in the response |
| live and by-date rows carry `round_name` and `status` | `probe_relay_route /bsd/tennis/matches/live` and `.../by-date?date=2026-11-26`, 2026-11-26 | live: 3 of 3 rows (implementer), 4 of 4 (a reviewer) carry both; by-date: the visible rows carry both, the body is cut at 12 KB |
| `TENNIS_TIERS` equals the rank table's keys | node over `index.html` | both `["atp_1000","atp_250","atp_500","grand_slam","masters_1000","wta_1000","wta_250","wta_500"]`, equal |
| the six names survive the real build | `node scripts/build-bundle.mjs` then `node scripts/strip-comments.js index.html` on a scratch copy of HEAD | `_TENNIS_MAIN_DRAW_ROUNDS`, `_tennisRowInMainDraw`, `_tennisDrawPick`, `_tennisTierAllowed`, `_TENNIS_DRAW_TIER_RANK`, `_TENNIS_DRAW_NAMED_RANK` and the two consts `TENNIS_TIERS`, `TENNIS_NAMED` each appear once as a top-level `var` or `function` in `index.deploy.html`; the picker brace-matched out of that text gave 8 of 8 right picks (Davis Cup QF, round-robin only, live round-robin beside a 250, postponed, cancelled, United Cup against a 250 with more rows, slam qualifying, slam against a named event with more rows). The scratch copy was deleted |
| nothing outside field.js/index.html/smoke.js pins the old names | `git grep` for the old names | only HANDOFF and `outbox/` history, and the relay detector (`scripts/lib/client-tennis-split.cjs`), which is the reason for the landing order |

## Verified

1. **The new check goes red on the unfixed page.** Final `smoke.js` against origin/main's `index.html`: 21 red, of which 15 are designed cases (`A1 A2 B E G H J L1 L2 N1 N2 NM2 NM3 R1 R2`), the pins `A-TDRAW-16/17/18/23`, the coverage line (`pick 17/26 right, nav 0/2, nav-through-the-real-merge 1/3, render 0/2`) and `A190` (main's `index.html` is at `e`, `sw.js` here at `f`). The 18 that pass there are the controls that the fix changes nothing it should not.
2. **Each guard fails when its thing is broken**: the harness above, 28 of 28, each anchor asserted unique and applied, control green first.
3. **The page's own text runs.** The cases execute the real declarations cut out of the source (the `A745` idiom, no copy in `field_utils.js`); the renderer and `fetchTennisLive` in a child node process because both are async and `smoke.js` is not.
4. **Interface for the relay replay**: see the build row above. Forms in the built page: functions stay `function NAME(...) {`; every top-level `const` becomes `var NAME = ...;`; single quotes become double quotes; `new Set(` gains `/* @__PURE__ */`.

## Not verified, and what unblocks it (Rule 74)

- **A real-browser render of the Draw tab on a Davis Cup day or a round-robin day.** Renderer and nav were executed under `vm` with a stubbed DOM, so layout, the viewport swap and the chip were not seen. Blocked by: this sandbox cannot reach the live page. Unblocked by: a probe that reads the page's own `_tennisDrawPick`. `tennis_draw_probe.js` is not that probe: it carries its own third copy of the picker, restricted to `grand_slam` and the 1000 tiers with no round filter, so it cannot see a named event or a 250 and can disagree with the page (origin/main `3490dccf`'s `outbox/tennis-draw-probe-latest.json`: `pickedTournament` null, verdict "NO DRAW", while the page rendered a 27-card tree). Not edited here (Rule 69).
- **The Davis Cup rows on the by-date card.** That they carry `round_name` `Quarterfinals` is inferred from the draw route (same vendor endpoint, node rounds and dates) and not read. Case `B` is designed on that inference. Command and expected output are in HANDOFF (Open 3); it needs a day with a Davis Cup tie on the card, 2026-11-27 has the semifinal.
- **The 2027 editions.** Whether next year's Davis Cup, United Cup and BJK Cup rows carry a knockout round name before the knockout is not known. With the run-time rule that no longer matters for correctness (no draw tab until a main-draw row exists).
- **The relay replay.** Not part of this change. Until it is on the relay's main, the current `scripts/lib/client-tennis-split.cjs` throws on the deleted constant and the tennis workflow refuses (exit 1). Landing order: detector first, then this client, then re-dispatch. Verify: `git -C field-relay-nba show origin/main:scripts/lib/client-tennis-split.cjs | grep -c _tennisDrawPick` prints a number above 0.

## Integration state (Rule 65)

1. **Relay contract:** unchanged and not touched. `GET /bsd/tennis/matches/by-date?date=YYYY-MM-DD` and `/bsd/tennis/matches/live` rows carry `round_name` and `status`; `GET /bsd/tennis/draw?tournament=&season=` serves `rounds`, `nodes`, `editionMatches`, `mainDrawMatches`. No field was added (Rule 60). The client's dependence on the round vocabulary is now recorded in `CONTRACTS.md` (this repo's copy; the relay's copy must receive the same section).
2. **Client consumer:** `_tennisDrawPick(rows)` (rows from `fetchTennisDraw`'s by-date read), `_tennisRevealDrawNav(rows)` (merged live and by-date rows, live winning a collision), `renderTennisBracket()`.
3. **Status:** unit-level VERIFIED by execution; real-browser render and live route UNTESTED (above).
4. **Known mismatch:** the round list is a second copy of the relay's `ORDER` (the laboratory's `src/Draw.fs`, the `"Round of 128"` parse at line 97, is a third). Only the relay replay guards the client copy against the relay's.

## Behaviour change to know about

For every tier, not only the named events: the Draw tab is now hidden on a day when a tournament's rows are all qualifying, round-robin, rubber or cancelled. Before, it was offered and opened onto a sentence. A Grand Slam qualifying week now shows no Draw tab until the first main-draw row. The Davis Cup quarterfinal and semifinal days now show a tie-level bracket (nations, no set scores: `sets` is null on every node, as it already is for the United Cup and BJK Cup).

## Deviations from the plan

- The behavioural tests live in `smoke.js`, not `field_unit.js`. `deploy-gate.yml` runs `smoke.js` only (`field_unit.js` runs in `smoke-and-verify.yml` and the pre-commit hook), so only a `smoke.js` check blocks a deploy; and `field_unit.js` imports from `field_utils.js`, so testing there means a duplicate of the vocabulary and the pick in a deployed file with no byte-equality check against the page, a fourth copy.
- A committed mutation harness (`scripts/mutate-tennis-draw-pick.mjs`) was added; the plan only asked for captured runs. It is NOT wired into a workflow: 28 smoke runs is about 70 s of runner time per invocation and the Actions budget is at 90% for the month (CLAUDE.md, 2026-08-16), and editing `deploy-gate.yml` is outside this change (Rule 69). Run it by hand before changing A-TDRAW-16/17/18/22/23.
- LAB-FIRST-A (new proofs belong in field-laboratory): the proofs here read this repo's own source text (`src/legacy/field.js` cut into a sandbox, `index.html` mutated), so they can only live here. The picker is existing client code being fixed, not new computation.

## Open, not changed (Rule 69)

- `tennis_draw_probe.js` third copy of the picker (above).
- `TENNIS_TIERS` and the rank table's keys are two lists that happen to be equal today (measured above). A tier added to one and not the other would be skipped silently by the rank expression's `null` arm; nothing pins the equality, and no behaviour case can reach it without editing both. Not changed.

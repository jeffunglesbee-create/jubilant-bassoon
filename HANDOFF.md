# FIELD HANDOFF

## MID-SESSION UPDATE — 2026-07-09 (finals-desk had the identical enqueue-context-gap bug — fixed; serious fabrication finding flagged)

**SW_VERSION `2026-07-09c` → `2026-07-09d`. Smoke: 890/0.** Full detail:
`docs/outbox/cc-finals-desk-context-gap-2026-07-09.md`.

Found via a proper repo-radius sweep of tonight's enqueue-context-gap fix
(which stopped at the two call sites its own A/B test happened to name):
`finals-desk-nba`/`finals-desk-nhl` had the identical bug — a real `game`
object in scope, never sent to the enqueue endpoint. Fixed, following the
same pattern (`home`/`away`/`matchupNote` reused from the existing prompt
build; `homeScore`/`awayScore` included with `??null`, since this render
path — unlike scouts-pick's always-pregame guard — can fire on a live or
finished Finals game). Full sweep confirms exactly 4 real
`JOURNALISM_ENQUEUE_RELAY` callers exist total, all now accounted for;
`wc-tab-brief`'s exemption independently re-verified (genuine multi-game
slate, no single game to send).

**Live verification**: the CC-CMD assumed a `breakdown`/`_diag`
per-dimension field exists in the relay's result response — checked,
found it doesn't. Used a controlled real A/B test instead (byte-identical
prompt, differing only in the new fields): **163 → 257**, a clean +94
point jump, with a new scoring layer (`2d-score`) appearing only in the
with-context run — strong direct evidence the previously-unreachable
dimensions are now genuinely scoreable.

**Serious, separate finding, flagged prominently, not fixed here**: the
with-context response fabricated specific statistics (an "offensive
rating," shooting percentages, player per-game averages) never present
anywhere in the test prompt — a direct violation of the prompt's own
"never invent stats" instruction and FIELD's Rule 1. The without-context
run, given less to work with, stayed appropriately vague and did **not**
fabricate. The richer-context path scored 94 points higher *while*
fabricating — the scorer did not appear to penalize this. Caveated
honestly: the test prompt's `analyticsCtx` was empty (a hand-built test,
not the full real `getNBAAnalyticsContext` pipeline), so this may be
partly a test-artifact — but it's a real, reproducible relay response
worth its own follow-up CC-CMD, not silently absorbed into "verification
passed."

---

## MID-SESSION UPDATE — 2026-07-09 (TASK 5 — getQualityTarget's stale /180 scale fixed)

**SW_VERSION `2026-07-09b` → `2026-07-09c`. Smoke: 890/0.** Full detail:
`docs/outbox/cc-enqueue-context-gap-task5-2026-07-09.md`.

Closes the dispatch gap flagged in the prior update: `getQualityTarget()`
(`index.html:25464`) was still comparing against the pre-June-8 180-point
scale (`avgScore < 130`, `Target ≥ 145`) three weeks after the actual
scorer moved to a 10-dimension 0-300 scale. Traced `renderProseScore` →
`scoreObj.score` → `total` end-to-end and confirmed `field_jq_scores`'
*stored* data was never stale — only this display/comparison threshold
lagged, a single contained bug, explicitly not conflated with a second
one.

`journalism-quality.js` (the file the source CC-CMD cited for weight
constants) doesn't exist in this repo — used the real, local `W` weight
constants (`index.html:26818`) instead. `Target ≥ 240` anchored to the
same canonical bar `scoreThreshold` now uses everywhere else in this
codebase (not a literal 145→243 re-scale) so the coaching hint and the
actual pass/fail gate agree. `Trigger < 217` preserves the original
72.2% ratio scaled to 300. `avgStat` thresholds (a different unit,
stats/sentence) and the `field_jq_scores` read/sport-tag logic
confirmed untouched.

Verified via 5 real synthetic tests against the actual extracted
function, including a trigger-boundary case (avgScore=200: would NOT
have fired under the old 130 threshold, now correctly fires under 217)
proving the mechanism changed, not just the display string — and real
observed data from tonight's own live A/B tests (127-141) correctly
triggering the corrected hint.

---

## MID-SESSION UPDATE — 2026-07-09 (enqueue context gap — commit threshold work + fix real root cause)

**SW_VERSION `2026-07-09a` → `2026-07-09b`. Smoke: 890/0.** Full detail:
`docs/outbox/cc-enqueue-context-gap-2026-07-09.md`.

**Committed the prior session's correct-but-held threshold work**
(`scoreThreshold` 120/130/110→240, 5 sites) — that work was never wrong;
it was honestly held at 60/85 because the real bottleneck was elsewhere.

**Real root cause, found by tracing the actual data flow**: `night-owl`
and `scouts-pick` both enqueue via `/journalism/enqueue` (async job), which
never carried `home`/`away`/`homeScore`/`awayScore`/`matchupNote` in the
queue message — the consumer's Context Anchoring (25pts) and Matchup Depth
(30pts) were structurally unreachable regardless of threshold. This is
why the prior session's live A/B tests were flat/negative: they exercised
this exact broken path. A *second*, separate night-owl path
(`fetchNightOwlFromClaude`, synchronous `/journalism/generate`) already
had this data correctly — confirmed via tracing, not assumed.

Added the missing fields to both enqueue bodies, reusing already-local
data (nothing fetched anew). `scouts-pick` correctly omits `homeScore`/
`awayScore` — verified it fires pre-game only, so no score data exists at
that point; passing fabricated/null scores would have been worse than
omitting them.

**A dispatch gap in this CC-CMD flagged, not silently resolved**: the doc
lists 5 tasks but only dispatches 4 (TASKS 1-2 to jubilant-bassoon, 3-4 to
field-relay-nba) — TASK 5 (fix a stale `/180` scale reference in the
client-side `getQualityTarget()`, a real, separate fossil found this
session, distinct from both the relay's now-fixed `130` default and the
relay's genuinely-dead `getQualityTarget()`) is jubilant-bassoon-only work
that neither dispatch assigns. Not acted on without explicit authorization
(Rule 69) — needs its own CC-CMD dispatch.

Verified the client-side change is functionally correct via a real live
POST (relay accepted the widened payload, 202/jobId). Could not, and did
not claim to, verify the downstream effect — that requires field-relay-
nba's TASK 3 (storing/forwarding the new fields), outside this session's
scope. A polled real job scored 127, in the same range as the prior
session's flat results — expected, since the relay hasn't started using
these fields yet.

Confidence scored against this session's actual dispatched scope (TASKS
1-2 only), not the CC-CMD's full cross-repo table — TASKS 3/4/5 are
structurally outside what one repo's session can deliver or verify alone.
Both assigned deliverables complete and verified; committed.

---

## MID-SESSION UPDATE — 2026-07-08 (Truth Is / Night Stars — connect voice computation to real finalized_at, 100/100)

**SW_VERSION `2026-07-08c` → `2026-07-08d`. Smoke: 890/0.** Full detail:
`docs/outbox/cc-truth-is-night-stars-client-fix-2026-07-08.md`.

**Corrects an earlier, incomplete understanding from earlier tonight**: the
relay-side `finalized_at` prerequisite (deployed hours ago) landed on
`bundle.completed_games`, but the voice computation
(`getNewspaperVoice`→`getCardCircadian`→`minutesSinceFinal`) reads
`allData.sports`-derived data — two genuinely disconnected structures.

**Chose match-by-name over reading the bundle directly**, with a concrete
reason the alternative was worse: `bundle.completed_games` has no live or
upcoming games at all (verified live via `probe_relay_route`) —
`getNewspaperVoice()` needs live-game detection to pick the 'minimal'
voice, which the bundle can't provide. Swapping to bundle-only input would
have silently broken that, a worse regression than the bug being fixed.

**Found and fixed three real mismatches that would have silently broken a
naive version of this match**, none assumed away:
1. Client `home` is a full name ("San Francisco Giants"); relay `home` is
   a nickname ("Giants") — confirmed both live. Used the existing
   `teamNick()` helper instead of a raw string compare.
2. Client MLB `_sport` is `"Baseball (MLB)"`; relay `sport` is `"MLB"` —
   different strings, confirmed live. Used a substring-tolerant compare
   instead of hard-coding every sport's exact pairing (some, like WNBA,
   couldn't be directly confirmed — no live game to inspect).
3. `finalizedAt` is a raw SQLite timestamp with no timezone marker
   (`"2026-07-08 04:58:21"`), inconsistent with the *same response*'s
   other timestamp field (`generated_at`, proper ISO `...Z`). Verified via
   a real `TZ=America/New_York` test that naive parsing reads this as
   local time, producing a **240-minute silent classification error** for
   ET users — FIELD's own target timezone. Fixed with an explicit UTC
   parse. This would have been a real, hard-to-notice production bug.

Also verified (not assumed) that `bundle.recap_date` and `TODAY_ISO` only
align during the actual bug window, via `TODAY_ISO`'s existing 4am-ET
rolling cutoff (`index.html` ~6865) — not a coincidence, added an explicit
guard rather than relying on it silently.

Extended the fix to two more `getCardCircadian` call sites beyond the
newspaper voice's own (`getCachedCircadianTier`'s sort order,
`CARD_ATTRIBUTE_SYNC`'s live-poll sync) since `minutesSinceFinal` is
shared — free correctness improvement, not extra invented scope. Checked
a fourth call site (`renderPickEmSection`) and confirmed it's genuinely
unaffected (PREVIEW-only check, never reaches NIGHT/LATE) rather than
skipping it without looking.

Verified via 7 real synthetic-test cases (Node `vm`, actual committed
function source) including the real live relay data (WNBA Liberty/Wings,
the one currently-populated `finalizedAt` in production) correctly
classifying LATE at ~634 real minutes, a realistic recent-completion case
classifying NIGHT on a simulated fresh page load, doubleheader-ambiguity
safe fallback, and live/upcoming unregressed. `night_stars: degraded`
re-checked via a fresh `session_health` call (still `true`, matching the
relay's own value directly) — confirmed unaffected, not assumed, since
this change never touches the relay.

---

## MID-SESSION UPDATE — 2026-07-08 (durability audit → doubleheader hot-fix + scout-pick/drama-peak follow-up)

**SW_VERSION `2026-07-08b` → `2026-07-08c`. Smoke: 890/0.** Full detail:
`docs/outbox/cc-pick-cross-session-followup-2026-07-08.md`.

**Prompted by a direct question after the pick re-key shipped: "is this
durable, and did it take a holistic approach?"** Answer was no on both
counts, found by digging rather than asserting yes:

**1. Real collision defect in the just-shipped fix.** `_pickStorageKey`
keyed on date only. The codebase already has a doubleheader-safe
`home|away|hour` convention elsewhere (`fetchMLBFixtures`'s `gameHourKey`,
plus its own `_dhCount`/"Game 2" tagging proving doubleheaders are real,
modeled data) that wasn't reused. Two games between the same teams same day
would have collapsed onto one pick key — picking game 2 would silently
refuse and show game 1's pick. Fixed by switching to the same hour-bucket
convention; verified with a synthetic doubleheader test.

**2. Not holistic — same `game._id`-volatility bug found in two more
features**, from auditing every localStorage key built from `game._id`,
not just the pick cache:
- `field_scout_pick_*` — pre-game write, game-end read by the always-on
  Night Owl recap (higher-impact than Pick'em, since it's not opt-in).
  Fixing this surfaced a real field-name trap: the read-side object is a
  *snapshot* (`saveEspnFinal`'s persisted `entry`), which stored sport as
  `sport` not `_sport` and had no `start_time` — naively reusing
  `_pickStorageKey()` on it would have computed a silently wrong key. Fixed
  by adding `start_time`/`_sport` to both the persisted entry and a second,
  independent in-memory-only snapshot constructor found in
  `renderNightOwlRecap()`'s F5 fallback.
- `field_drama_peak_*` — mid-game peak tracking, dual-written now (old
  volatile-`gid` key preserved for same-session-only readers, new stable
  key added) so a `_gid` reset mid-game (midnight-crossover watcher,
  `goToDate()`) doesn't reset the accumulator. Lower severity than the
  other two — the codebase's own daily pruner already treats this as
  disposable — fixed anyway per explicit request; the one read site left
  unmigrated (`ViewingConditions.evaluate`, gid-only, no game object
  available) has a stated, verified reason (same-render-pass only).

Both proven via real synthetic tests against the actual committed function
source (Node `vm`), not asserted: doubleheader non-collision, scout-pick
resolving across a simulated `_id` reset with the snapshot's corrected
field names, and drama-peak surviving a simulated mid-game `_id` reset.

Explicitly NOT touched, and why: `field_game_notes_` (has a fallback, but
date-unqualified — lower-severity stale-content-reuse risk, out of scope
here), `field_owl_job_`/`field_nox_secondary_` (use `sessionStorage`,
already correctly session-scoped, not part of this bug class).

---

## MID-SESSION UPDATE — 2026-07-08 (pick cross-session resolution re-key, 100/100)

**SW_VERSION `2026-07-08a` → `2026-07-08b`. Smoke: 890/0.** Full detail:
`docs/outbox/cc-pick-cross-session-resolution-2026-07-08.md`.

**The real, deeper follow-up to the pick'em stale-final fix below**:
`game._id` is a session-local counter (`"g" + ++_gid`, reset to 0 every
page load), and pick storage/resolution keyed on it directly
(`_resolvePickIfExists(id, game, eData)` inside `saveEspnFinal`, `id =
game._id || ...`). A pick made in one page load and resolved in a later
one — the ordinary case, since games run hours and most users don't
leave the tab open — could silently never resolve if the counter
reassigned differently. **Confirmed real, not assumed**: 3 live captures
minutes apart showed MLB's `_id`s coincidentally stable (upstream fetch
order happened to match), but PGA/golf's `_id`
(`'espn_pga_' + (d.eventId || Date.now())`) provably changed between two
captures — an actual reproduced failure, not a theoretical one. Checked
both candidate "more stable ID" sites named in the CC-CMD
(`index.html:18489`, `:21812`) and ruled both out with reasons (NBA-CDN-
specific; ephemeral-WebSocket-only use, plus the same `_gameId`/`.gameId`
field-name bug found earlier this session).

**Fix**: new `_pickStorageKey(game)` — `sport_date_home_away`, built from
static game properties that don't change once scheduled. Threaded into
`makePick` (widened to accept/store `home`/`away`), `buildPickWidgetHTML`
(prefers the stable key when a real game object is given, falls back to
`g._id` only for the two synthetic-object DOM-refresh callers), and
`saveEspnFinal` (new `pickId` variable, the pre-existing `id`/`FINALS_KEY`
dedup logic left untouched). `_resolvePickIfExists` itself needed no
changes — fully generic over whatever key it's given.

**Migration investigated, found genuinely impossible for existing
unresolved picks** — the stored pick shape has no `home`/`away` fields,
so an old `"g28"`-style key can't be reconstructed to a real matchup.
Disclosed rather than hidden: any pick made before this deploy and still
unresolved at deploy time keeps the old silent-miss behavior once; every
pick made after this deploy resolves correctly across any number of
session boundaries, permanently. Already-resolved existing picks proven
byte-identical/untouched.

**Verified via a real test**, not asserted: ran the actual extracted
function source (not a reimplementation) in a Node `vm` against a mock
`localStorage`, with a session-2 game object deliberately given a
*different* `_id` than session 1 (mirroring the real bug exactly) —
confirmed the pick resolves, the "already picked" UI state is recognized
across the simulated boundary, and an injected old-style resolved entry
stays untouched throughout.

Two stale `smoke.js` regression guards (`A-PICKEM-4`, `A-PICKEMSURF-4`,
written by the earlier `pick-em-reconcile` CC-CMD to block scope creep on
these exact functions) were updated — not weakened — to check the new,
CC-CMD-authorized shape instead of the old one; `A-PICKEMSURF-4` now
checks `_resolvePickIfExists`'s literal body content stays byte-identical,
the actual invariant worth protecting.

---

## MID-SESSION UPDATE — 2026-07-08 (pick'em stale cross-day final guard, v6, 100/100 after an honest 90/100 stop)

**CLIENT HEAD: 685ea90** (`bc0dca4` after the automated codemap refresh).
SW_VERSION `2026-07-08a`, `deploy_match: true` per `session_health`.
**Smoke: 890/0.**

**Guarded `findEspnEntry()` against stale cross-day final scores and
migrated every vulnerable caller** — full detail:
`docs/outbox/cc-pickem-stale-final-resolution-fix-2026-07-07.md`. Adds
the same guard already proven in `findESPNScore()`'s `_staleFinalGuard`,
then migrates `checkForNewFinals()`, `injectDramaBadges()`, and —
critically — `renderNightOwlRecap()`'s fallback F5 block, which called
`saveEspnFinal()` **directly**, bypassing every other guard. Found a
fourth `saveEspnFinal()` call site the source CC-CMD's own tracing
missed (`initNightOwlObserver`, a MutationObserver) — investigated and
confirmed not vulnerable (matches by stable `gid`/`_id`, not team name).

**Shipped the visibilitychange/peak-missed guard wrong on the first
attempt, caught by a real synthetic test before committing anything**:
checking a stale entry's own `start_time` can never work, since a
genuinely stale entry's `start_time` legitimately points to when it
actually happened (the past) — the check was answering the wrong
question. Fixed by restructuring the loop to iterate today's real
scheduled games through `findEspnEntry()`, consistent with every other
migrated caller. Also fixed a separate, pre-existing bug found along the
way: the loop's `gameId` derivation (`eData?.id || eData?._id`) never
resolves on any real entry (confirmed live: 0 of 38) — meaning
`recordPeakMissed()` has never actually fired in production until this
fix.

Verified via a six-case synthetic proof test against the real, live app
(10 sub-checks) and an explicit `shouldShowMLBNAlert()` regression check
against all 16 real live MLB games (zero behavior change).

**Correctly stopped at 90/100 first, reported honestly, and did not
commit** — Task 4 (reset the one confirmed-affected pick) and Task 4b
(historical audit) were confirmed genuinely unreachable server-side:
pick state lives in `localStorage['field_picks_v1']`, scoped per-browser
by a random UUID, after checking both real D1 databases and all 5 KV
namespaces found nothing. A follow-up CC-CMD
(`CC-CMD-2026-07-08-task4-resolution.md`) correctly reframed the
deliverable — a verified, copy-pasteable browser console snippet for
Jeff to run on the affected device, instead of an impossible server-side
reset — and the commit landed at 100/100 under the corrected scope.

---

## MID-SESSION UPDATE — 2026-07-07 (cross-cutting summary: RUWT/ADR-002 correction, Field's Pick tiering, pick'em fix, confidence-gate detection, worth-watching + click-to-scroll)

**Not a session-end entry — session is ongoing.** This is a cross-cutting
summary of today's real work across both repos in one place (the
per-CC-CMD entries below already cover the jubilant-bassoon side
individually; field-relay-nba has no separate HANDOFF copy, so its work
is recorded here). No Drive doc, no session-end ritual — written
mid-session so a crash or restart doesn't lose today's real state.

**RUWT patent re-analysis → ADR-002 correction (jubilant-bassoon).**
Push vs. pull established as the actual claim boundary, not client vs.
relay location — a relay that computes/serves a derived value only on
pull, never autonomously pushing a notification from it, supplies no
more of the claimed invention than an ordinary scoreboard API. Full
307-line consistency pass across all 5 sections that separately restated
the old, over-broad claim (Rules A/B/C/E, Defense 2, "What is PERMITTED"
#1, "What is PROHIBITED" #1-2, Audit Step 1). Two narrower prior attempts
were correctly reverted before this one landed — each found the literal,
smaller scope would have shipped a document directly contradicting
itself. The separate raw-number-display prohibition ("What is
PROHIBITED" #3-4, Rule D) was explicitly, verifiably preserved untouched
throughout (confirmed via diff against HEAD, not left alone by
omission). Commit `01b18e6`.

**Field's Pick redesign (field-relay-nba).** Evolved from single-winner
selection to a full ranked list, then to stakes-tier ordering
(elimination / OT-or-late-close / other, score as tiebreaker only),
reusing the existing `SPORT_CONFIG` (hoisted to a shared constant,
extended with WNBA/WC26). A real dispatch mixup shipped the flat-score
v1 design instead of the tiered v2 — recovered without a revert: tier
logic was added as a surgical upgrade on top of the already-live code
instead of rolling back and redoing the feature. Commits `1b3c16f`,
`0bf2ea4`.

**Pick'em illegible text (jubilant-bassoon).** Real, user-reported bug,
root-caused precisely: two CSS rules referenced `var(--ink,#e8e8f0)`
where `--ink` was defined (not undefined) as near-black — CSS custom
property fallbacks only trigger when a variable is undefined, not when
its value is merely wrong for context, so the light fallback never
applied. Fixed to `var(--platinum)`; contrast independently verified via
real computed WCAG ratios against the app's actual card backgrounds
(current: ~1.0-1.2:1, effectively invisible; fixed: 6.95-7.93:1,
comfortably clears AA). Commit `4b5cd3a1`.

**Confidence-gate violation detection (field-relay-nba).** Built to
catch CC-CMDs that commit despite reporting sub-95 confidence. Found 3
real historical violations on its first live run (70/100, 85/100,
75/100) — plus a bug in itself: a false positive triggered by its own
outbox's example text. Fixed by anchoring the score extraction to the
real "## Confidence Score" heading and taking the last match in the
file, not the first match anywhere. Commits `c96b3fc`, `12b348e`.

**What's Worth Watching display + click-to-scroll (jubilant-bassoon).**
Folded the relay's ranked list into the existing "TONIGHT'S PICK"
section rather than creating a new, colliding section name — "What's
Worth Watching" was already claimed by a differently-defined, live
per-card badge. The click-to-scroll follow-up implemented the spec's own
literal code first, tested it against real live data before committing,
and found a real, would-have-failed-every-click bug: the relay's
`game_id` scheme shares no namespace with the client's own internal
`data-gameid` values, even though every real ranked game genuinely
exists on the page. Fixed with `_wwFindCard`, a team-name
cross-referencing helper (re-verified 5/5 real matches after the fix,
vs. 0/5 before). Commits `d262d8ee`, `a800e954`, plus a small follow-up
correcting an inaccurate code-comment citation (`9545c771`).

**Still pending, not yet executed** — confirm current status via
`codex_list` rather than treating this as necessarily current by the
time this entry is read: `wp-resolution-failure-tracking.md`
(field-relay-nba) — tracks a real, currently-silent failure path where
win-probability resolution can fail with zero record anywhere, reusing
the existing `codex`/`open_incidents` convention rather than new
infrastructure.

---

## MID-SESSION UPDATE — 2026-07-07 (comment-only fix: _wwFindCard's inaccurate injectWikiChips citation, 100/100)

**CLIENT HEAD: 9545c77.** SW_VERSION `2026-07-07e`, confirmed synced.
**Smoke: 890/0.**

Corrected `_wwFindCard`'s comment (added in the click-to-scroll commit
below): it claimed to "reuse" `injectWikiChips()`'s cross-referencing
approach. Verified directly against `injectWikiChips()`
(`index.html:23282`) before editing: it just reads
`card.dataset.home`/`.away` off a card it's already iterating and uses
those values as a lookup key — no searching, no substring matching, no
cross-referencing between mismatched naming schemes. `_wwFindCard` does
something genuinely different. Comment-only, function logic untouched
(confirmed via diff), the rest of the comment (relay/client ID mismatch
explanation) independently re-confirmed accurate and left as-is.

---

## MID-SESSION UPDATE — 2026-07-07 (Tonight's Pick click-to-scroll, real relay/client ID mismatch found and fixed, 100/100)

**CLIENT HEAD: a800e95.** SW_VERSION `2026-07-07d`, confirmed synced.
**Smoke: 890/0.**

**Made each ranked row in "TONIGHT'S PICK" click-to-scroll** — full
detail: `docs/outbox/cc-worth-watching-clickthrough-2026-07-07.md`. This
CC-CMD had been correctly declined twice earlier this session (`.ww-row`
wasn't live yet); now unblocked by the v2 display commit above.

**Found and fixed a real, load-bearing bug before shipping, not assumed
away.** The CC-CMD's own literal code sample matches
`bundle.pick.ranked[].game_id` against `[data-gameid="..."]`. Tested this
against the live app's real relay data before committing (per the
CC-CMD's own explicit "report the actual observed behavior, not a
hypothetical" requirement) and found **0/5 real matches** — the relay's
`game_id` scheme (`MLB_2026-07-07_reds_phillies`-style composite
strings) shares no namespace with the client's own internal
`data-gameid` values (`g24`, etc.), even though every one of today's
real ranked games genuinely exists on the page. As specified, every
click would have silently done nothing, always — not the rare "different
filter active" edge case the CC-CMD anticipated. The existing precedent
this feature cites only ever matches a client-computed pick's own
client-side `_id` against client-rendered cards, a same-namespace lookup
that never had to solve this relay-to-client bridging problem.

Fixed with `_wwFindCard(home, away)`, matching on team-name substring
against `data-home`/`data-away` instead — the same cross-referencing
technique already used elsewhere in this file. The `scrollIntoView`/flash
mechanism itself is unchanged, exactly as specified. Re-verified: 5/5
real matches after the fix.

**Verified via a genuine `.click()` DOM event** against the live app:
real scroll (`window.scrollY` 0 → 2658), target card moved toward
viewport center, `.ww-flash` appeared within 400ms and was confirmed
cleared 1400ms later. Soft-fail case tested with a genuinely
non-matching team pair: zero errors, zero console noise, scroll position
unchanged. Cards confirmed visually unchanged at rest via before/after
class-list capture.

---

## MID-SESSION UPDATE — 2026-07-07 (Tonight's Pick ranked list, worth-watching-display v2, 100/100)

**CLIENT HEAD: d262d8e.** SW_VERSION `2026-07-07c`, confirmed synced.
**Smoke: 890/0.**

**Folded `bundle.pick.ranked` into the existing "TONIGHT'S PICK" section**
— full detail: `docs/outbox/cc-worth-watching-display-2026-07-07.md`. No
new section: "What's Worth Watching" would have collided with the
existing, differently-defined live per-card WORTH WATCHING badge. Only
tier 0 gets a badge ("ELIMINATION"); tier 1/2 rely on list position.
Never renders raw score — confirmed necessary, not hypothetical: fetched
the real live relay endpoint before writing any code and found
`ranked[]` entries genuinely carry a raw `score` field alongside `tier`.

Two disclosed deviations from the CC-CMD's literal sample: dropped the
`esc()` wrapper (the actual enclosing function, `renderNewspaper()`, has
no such helper in scope, and its own real precedent three lines above
already interpolates team names unescaped); used `#fbbf24` for the tier
badge (matching an existing, closer precedent — `.field-pick-badge`, in
the same section — rather than inventing a new accent color).

Verified via real page load: fetched live relay data (5/5 rows render,
0 badges — correct, today's real slate has no tier-0 game), built a
synthetic tier-0/1/2 mix to directly verify the untested badge path
(1 badge, correctly on tier 0 only, confirmed no raw score value leaks
into the DOM), and screenshotted the actual rendered result.

**A related follow-up, `CC-CMD-2026-07-07-worth-watching-clickthrough.md`,
was correctly declined twice before this** — it depends on `.ww-row`
existing, which it didn't until this commit. Now unblocked for a future
session.

---

## MID-SESSION UPDATE — 2026-07-07 (pick'em illegible text fix, 100/100)

**CLIENT HEAD: 4b5cd3a.** SW_VERSION `2026-07-07b`, confirmed synced.
**Smoke: 890/0.**

**Fixed dark-on-dark illegible pick'em text** — full detail:
`docs/outbox/cc-pickem-illegible-text-fix-2026-07-07.md`. Two CSS rules
(`.pick-widget .pick-choice`, `.pickem-matchup`) used
`color:var(--ink,#e8e8f0)`; since `--ink` is defined (`#0d0d1c`,
near-black), the light fallback never applied — CSS custom property
fallbacks only trigger when the variable is undefined, not when its
value is contextually wrong. Both changed to `var(--platinum)`, the
already-established light-text variable (38 other uses). Verified no
other context relies on the dark rendering (each class used in exactly
one CSS rule + one HTML call site, confirmed via grep) and verified real
computed WCAG contrast ratios against the app's three actual card
backgrounds: `--ink` rendered at 1.04-1.19:1 (effectively invisible,
confirming the bug was real); `--platinum` renders at 6.95-7.93:1,
comfortably clearing WCAG AA.

---

## MID-SESSION UPDATE — 2026-07-07 (ADR-002 full consistency pass, 100/100 on the third attempt)

**CLIENT HEAD: 01b18e6.** Docs-only, no SW_VERSION change. **Smoke: 890/0.**

**Corrected ADR-002's over-broad "relay never touches interest-level
values" claim across the whole document** — full detail:
`docs/outbox/cc-adr002-full-consistency-pass-2026-07-07.md`. The
corrected reading: the patents' actual missing element is an autonomous
notification engine acting on a threshold or change, not the location of
computation — a relay that computes/serves a derived value only on pull
supplies no more of the claimed invention than an ordinary scoreboard
API.

**Two prior attempts this session were correctly reverted, not
committed** (`CC-CMD-2026-07-07-adr002-rules-abc-update.md`, then
`-abce-update.md`): each implemented a narrower version of this
correction, and each was found — via full document reads, not
assumption — to create a direct, severe self-contradiction with sections
outside the CC-CMD's stated scope (most seriously "Defense 2: Stateless
Relay Incompatibility," the document's own self-described "ADR-002
Core"). Both times, confidence was scored honestly below 95 and the
change was reverted rather than shipped inconsistent.

The third attempt did the actual full-document read this called for (all
355 lines) and corrected all five sections restating the old claim
(Rules A/B/C/E, Defense 2, "What is PERMITTED" #1, "What is PROHIBITED"
#1-2, Audit Step 1) in one pass, while **explicitly, verifiably
preserving** the separate raw-number-display axis (confirmed
byte-identical to HEAD via explicit diff — not left alone by omission).
Also resolved two previously-reported verification gaps: the
cost-measurement citation was confirmed to be a `field-relay-nba`
artifact this session cannot access (labeled as such, not treated as
verified-local), and the core legal theory arrived as embedded verbatim
patent text, cross-checked against this session's own independent
WebSearch findings from an earlier CC-CMD and found consistent — without
this session personally certifying the underlying legal theory (Rule
45/LEGAL-GATE-A).

---

## MID-SESSION UPDATE — 2026-07-06 (SW push redesign: boolean gate + team scoping, spans two CC-CMDs, 100/100)

**CLIENT HEAD: 9d02656.** SW_VERSION `2026-07-06f`, confirmed synced.
**Smoke: 890/0.**

**Redesigned the service worker's push trigger end to end** — full detail:
`docs/outbox/cc-sw-push-notification-scoping-complete-2026-07-06.md`
(covers all 3 tasks; combines two CC-CMDs run back-to-back this session).

The first attempt (`CC-CMD-2026-07-06-sw-push-boolean-redesign.md`)
**correctly scored 70/100 and correctly did not commit**: Task 1 (replace
`computePushDrama`'s summed 0-100 scalar with `isCrunchLikePush()`, a
factual boolean AND-gate) and Task 3 (repurpose `_swDramaDial` from a push
threshold into a pure client-side display filter, removing its SW-side
sync as dead code) were implemented and verified, but Task 2 (scope
notifications to the user's followed teams) was honestly reported as
blocked — `MY_TEAMS` had no sync path to the service worker at all.

A follow-up CC-CMD corrected the premise: the sync mechanism didn't need
to be invented — the existing keyed `PREF_UPDATE` postMessage +
IndexedDB channel (previously used only for the dial) was always generic,
just never extended to a second key. Extended it with `'my_teams'`.
Found and resolved a real citation mismatch in the process: the follow-up
CC-CMD quoted the old `drama_dial` sync code as "verified this turn,"
which matched the last **committed** state but not this session's own
uncommitted Task 3 work (already deleted as dead code) — resolved by
rebuilding the generic channel *pattern* for `my_teams` specifically
rather than reintroducing a pointless `drama_dial` case.

**Verified via real IndexedDB inspection** (not code review): installed
`fake-indexeddb`, a genuine spec-compliant implementation, into an
isolated scratch directory (not added to this repo), and ran the actual
`sw.js` source against it. Sent a real `PREF_UPDATE`/`my_teams` message,
then read it back through a **second, independent** connection to the
same database — confirmed real persistence. A fully fresh SW instance,
loading purely from IndexedDB with zero postMessage, correctly notified
for a followed team's game and correctly suppressed an identical payload
for a non-followed team's game. Empty-favorites fallback (explicit
choice, not left ambiguous): no teams followed yet → show for all
crunch-like games. Re-ran all 8 of the prior session's Task 1 true/false
test pairs against the final code — identical results, confirmed
unregressed.

---

## MID-SESSION UPDATE — 2026-07-06 (wiki trending client consume, race condition caught pre-ship, 100/100)

**CLIENT HEAD: f486bfc.** SW_VERSION `2026-07-06e`, confirmed synced and
deployed (deploy-gate run `28815827281`, success). **Smoke: 890/0.**

**Replaced per-team direct Wikimedia fetches with the relay's bulk
`/wiki/trending` endpoint.** Full detail:
`docs/outbox/cc-wiki-trending-client-consume-2026-07-06.md`. Confirmed the
relay dependency was actually live before touching anything (browser-tool
navigation to the real endpoint — direct `curl` is proxy-blocked for
`*.workers.dev` in this sandbox — returned real `spikeRatio`/`trending`
data for ~85 real teams). `fetchAllWikiTrending()` now makes one bulk fetch
per page load; `fetchWikiSignificance(teamName)` resolves from that cache.
Removed `WIKI_TITLES` (40+ team map) and the old per-team
fetch/localStorage-cache logic — the relay owns the mapping now.

**Two things found and fixed beyond the CC-CMD's literal scope**, both
necessary to avoid a regression or a missed done-condition:

1. A third, undocumented consumer (`buildCompoundPrompt`'s compound
   editorial journalism prompt) read `_wikiCache`/`WIKI_TITLES` directly,
   not through `fetchWikiSignificance`. Removing those without updating
   this site would have silently and permanently disabled the
   `[WIKI TRENDING]`/`[WIKI LOW]` editorial tag (caught by its own
   try/catch — no crash, just silent feature loss). Updated to read the
   new `_wikiTrendingCache` directly by team name.
2. Real network inspection (Performance API against the live page, not
   just code review) caught a race condition in the CC-CMD's own literal
   code sample: `injectWikiChips()` calls `fetchWikiSignificance` for home
   and away concurrently via `Promise.all`; a plain
   `if(_wikiTrendingCache) return` guard doesn't stop both concurrent
   calls from firing their own fetch before either resolves. First test
   showed 2 relay hits, not 1. Fixed by caching the in-flight promise.

**Verified end-to-end**: 0 `wikimedia.org` requests, exactly 1 relay
request, a real trending chip rendered (`Kansas City Royals (+150% on
Wikipedia)`, matching live relay data), and the second fixed consumer
(`buildCompoundPrompt`) independently confirmed to emit the correct
`[WIKI TRENDING]` text for the same real data.

---

## MID-SESSION UPDATE — 2026-07-06 (zero-change render fast path, critical bug caught pre-ship, 100/100)

**CLIENT HEAD: a1ea9f8.** SW_VERSION `2026-07-06d`, confirmed synced and
deployed (deploy-gate run `28812236253`, success). **Smoke: 890/0.**

**Added a zero-change fast path to `applyMainHTML`**, skipping
`main.replaceChildren(...)` entirely when the existing per-card
reconciliation loop found no real difference and section count matches.
Full detail: `docs/outbox/cc-zero-change-render-fast-path-2026-07-06.md`.

**Critical bug found and fixed before it ever shipped.** The CC-CMD's own
literal code sample, implemented as written, causes total data loss (every
card vanishes) on the first genuinely-unchanged poll tick for every real
user. Root cause: the pre-existing LCP-anchor morph (PM-26-C5) always
detaches the persistent anchor node from `main` before the fast-path check
runs; the fast path's own anchor guard checks `main` *after* that
detachment already happened, so it can't see it — if the fast path then
fires, the anchor (and everything with it) is permanently orphaned in the
discarded template fragment. Confirmed empirically (not assumed) via
injected-copy testing with frozen data against the live app: 0 cards
survived a textbook no-op render before the fix.

**Fix:** capture `anchorMorphWillRun` before the morph runs (one read-only
line) and require `!anchorMorphWillRun` for the fast path — the morph and
reconciliation loop are otherwise untouched (confirmed via diff). Honest
consequence: the fast path can only actually trigger when no LCP anchor is
present in `main`, narrower than the CC-CMD's own text implies, but the
only safe option given the anchor's by-design indefinite persistence.

**Verified via real DOM node identity**, pre-commit (injected copy, frozen
data, live production data) and post-deploy (actual shipped code, SW
version confirmed live): true no-op with anchor present, normal
real-change case, and section add/remove edge case all behave correctly;
post-deploy spot-check against the real deployed function showed no
crash/orphaning and stable card counts across two frozen-data
`renderAll(true)` calls.

---

## MID-SESSION UPDATE — 2026-07-06 (renderAll re-render overhead reduced, 100/100)

**CLIENT HEAD: afb06b3.** SW_VERSION `2026-07-06c`, confirmed synced and
deployed. **Smoke: 890/0.**

**Two renderAll performance findings fixed.** Full detail:
`docs/outbox/cc-reduce-rerender-overhead-2026-07-06.md`.

1. `_MLB_NAME_ABBR` (30 pairs, rebuilt every `renderAll` call) and
   `_CIRCADIAN_SORT_RANK` (rebuilt once per sport section, every render)
   hoisted to module scope — byte-identical content, confirmed via
   `git diff`.
2. The sort comparator was calling `findESPNScore`+`getCardCircadian` for
   every game on every render, ahead of the existing per-card HTML cache
   check. Added `circadianTier` to that cache's entry shape and a
   cache-first `getCachedCircadianTier(g)` helper the comparator now uses.
   `.sort()` itself still runs unconditionally every render (only the
   per-game tier computation is cached) — confirmed via diff, not just
   description.

**Verified twice via real instrumentation** (never touched committed
source): an isolated copy-based test against 11 real live games (11/11
cache hits when unchanged, correctly 1 miss when one game was mutated),
and — after deploying — a test against the actual shipped function and
cache. That second test's first attempt showed 12 "misses," which looked
like a bug at first; investigated rather than assumed (Rule 77) and found
it was correct behavior — real background polling had genuinely changed
game data (a golf leaderboard entry's fingerprint had grown from 356 to
980 characters) in the real gap between page boot and the check. A
synchronous, zero-time-gap re-test against the same real code then showed
0 recompute calls across all 12 real games — 100% cache-hit rate when
nothing has actually changed.

---

## MID-SESSION UPDATE — 2026-07-06 (wentToOT client filter wired, 100/100)

**CLIENT HEAD: 991cce3.** SW_VERSION `2026-07-06b`, confirmed synced and
deployed. **Smoke: 890/0.**

**`wentToOT` wired into `getWhatYouMissed`'s notability filter.** Full
detail: `docs/outbox/cc-wenttoot-client-filter-wire-2026-07-06.md`. This
depended on a relay-side CC-CMD
(`field-relay-nba` CC-CMD-2026-07-06-wenttoot-newspaper-bundle-wire.md) —
confirmed genuinely deployed before touching anything, not assumed:
`/analytics/newspaper` now returns a real `wentToOT` field on every
`completed_games` entry, and its all-`false` values for July 4 were
independently cross-checked against the real V2 relay period data (every
one of that date's 15 MLB + 2 WNBA games genuinely ended in regulation) —
confirming `false` is correct data, not a hardcoded stub.

Added `g.wentToOT` to the filter's OR-chain, updated the now-stale
comment. **Honest gap, not glossed over**: searched 26 real dates
(~91+ completed games) for a naturally-occurring `wentToOT:true` case to
test end-to-end — found none. Verified instead by calling the real,
live, deployed `getWhatYouMissed()` directly with a controlled synthetic
case (OT-only qualifying vs. otherwise-identical non-qualifying game) —
confirmed the fixed filter correctly includes/excludes as intended.

Note: two other CC-CMDs surfaced this session targeted `field-relay-nba`
directly (`CC-CMD-2026-07-06-fields-pick-fix.md`,
`CC-CMD-2026-07-06-stale-cc-cmd-detection.md`) — this session has no
mechanism to add that repo to scope (no `list_repos`/`add_repo` tool
available), so neither was executed. Both reported back plainly, not
guessed at.

---

## MID-SESSION UPDATE — 2026-07-05 (gap-sweep fixes shipped, 100/100)

**CLIENT HEAD: 6e48c95.** SW_VERSION `2026-07-05j`, confirmed synced and
deployed. **Smoke: 890/0.**

**All 5 findings from the gap-sweep re-run (below) fixed and live-verified.**
Full detail: `docs/outbox/cc-gap-sweep-fixes-2026-07-05.md`. Five
single-concern commits, one deploy batch:

1. `eData.status` → `eData.state` (5 real occurrences across
   `buildLayer3Rules`/`detectAndStoreStoryMoment`/`buildComebackProbability`
   — the CC-CMD's own probe window only caught 4; re-grepped and found 2
   more in the same function before its own DONE CONDITION would have
   been violated). Live-verified against a real live MLB game (Royals @
   Phillies, 9th inning): fixed gates now correctly open/close where the
   old `.status` checks were permanently stuck.
2. `isLateCloseGame`'s missing `eData` argument — live-verified against
   the same real game: fixed call returns `true`, old buggy call
   reproducibly returns `false`. The CLOSING UNIT badge can now actually
   render.
3. `seriesKey` sorted at the write site (home/away-order-independent) —
   verified against the real cited NBA Finals 2026 Spurs/Knicks matchup:
   G1 and G3 (home court flipped) now produce the identical key.
4. `[SERIES CONTEXT]` Night Owl injection built for `seriesLedger`
   (written since the feature shipped, never read until now) — 3-way
   backward-compat lookup verified against a correctly-reconstructed
   legacy key (note: the CC-CMD doc's own prose example key didn't match
   what the real pre-fix formula actually produces — computed it
   directly rather than trusting the shorthand).
5. `recapSnippet` wired into `[MISSED PEAKS]` — confirmed via grep no
   longer a dead write.

**Not verified end-to-end** (honestly noted, not skipped): the actual
AI-generated Night Owl brief text for `[SERIES CONTEXT]`/the wired
`recapSnippet` requires real accumulated user history not available in a
fresh test session — the injection mechanisms themselves (key
construction, lookup, guard structure) are confirmed correct.

---

## MID-SESSION UPDATE — 2026-07-05 (client gap sweep re-run, research only)

**CLIENT HEAD: 523d7f7.** No index.html/sw.js changes this round —
research/documentation only, per this CC-CMD's own scope. Smoke unchanged.

**Gap sweep re-run closed out.** Full detail: the addendum appended to
`outbox/cc-gap-sweep-client-2026-07-03.md` (a prior sweep from 07-03/07-04
already existed; this re-run independently re-derived findings via fresh
grep-driven agents rather than trusting the old file, then personally
spot-checked every claim via direct grep before writing anything down).

**Four new, independently-verified findings, none fixed (research-only
scope):**
1. `seriesLedger` — real write-side pipeline (`recordSeriesGame` → `GET
   /user/state`), zero client-side reads anywhere. Same pattern as the
   original BSD momentum gap this CC-CMD was built around. No public-repo
   match found after two honest searches.
2. `recapSnippet` — fetched and written, never read for its value anywhere
   — a pointless fetch.
3. **Three real, currently-shipping bugs**: `buildLayer3Rules`,
   `detectAndStoreStoryMoment`, and `buildComebackProbability` all check
   `.status` on `espnScores`-derived objects that only ever carry `.state`
   (confirmed: zero of the 12 `espnScores` writers ever set `.status`).
   Permanently disables the EXTREME EVENT journalism cue, the Story
   Moments "Final:"/"underway" tape entries (and corrupts that event's
   bus-emitted state field), and the "don't show comeback odds for a
   finished game" guard.
4. `isLateCloseGame({ _section: sport }, sport)` malformed call
   (index.html:35606) — 2 args against a 3-param function, permanently
   disabling the CLOSING UNIT lineup-advantage badge. This closes the one
   gap-class (comment-vs-runtime claims) the original 07-03 sweep
   explicitly flagged as never attempted.

Also flagged per Rule 72: HANDOFF's own `resolveWinProbability(sport,...)`
claim (below, from an earlier entry this same file) has **zero matches**
anywhere in this repo's actual code — independently grepped, not trusted.
NBA/MLB/AFL/CFL/soccer WP are each confirmed real and rendered under
different, real function names; NHL/NFL/MLS/EPL/CFB depend entirely on a
server-side component (AmbientDO) not present in this checkout, so that
part of the claim can't be confirmed or denied from here.

**Not fixed — explicitly out of this CC-CMD's scope** (research/
documentation only, stated in its own header): findings 2-4 above are
real, safely-scoped, likely one-line fixes. Worth a dedicated follow-up
CC-CMD.

---

## NEW SESSION — 2026-07-05 (continuation after the prior session close below)

**CLIENT HEAD: 0d9eb22.** SW_VERSION `2026-07-05i`, confirmed synced
index.html/sw.js. **Smoke: 887/0.**

**CFL live-poll CC-CMD closed out, 100/100 confidence.** Full detail:
`docs/outbox/cc-cfl-live-poll-2026-07-05.md`. Closes the exact open item
the prior session's close-out flagged (item 1, below): "CFL live
mid-session pick resolution — needs a Rule 78 rate-limit probe before
building recurring polling."

- **Rule 78 probe done first, and it caught a real discrepancy**: the
  CC-CMD cited a relay-side cache guard from `field-relay-nba` (a repo
  this session can't read) as already "behaviorally verified." Independently
  checked via raw `curl -sD -` (bypassing browser CORS header limits):
  `cache-control: public, max-age=30` is genuinely present on
  `/cfl/scoreboard/rounds`. The doc's own specifically-cited evidence (an
  `X-CFL-Upstream-Cache` header) was **not** present in any of 3 real
  responses — reported plainly rather than repeated as confirmed. The
  `cache-control` header alone was sufficient, independently-verified
  grounds to proceed (new call cadence is 90s, 3x the cache TTL).
- **Fix**: added the CFL refresh step inside the *existing*
  `initNightOwlPoll` 90s tick (no new timer, per the CC-CMD's explicit
  instruction) — re-fetches `loadCFLScoreboard()` and mutates the existing
  CFL game objects in place by `_id`, then immediately re-runs
  `checkForNewFinals()`. Self-gated: stops re-fetching once every CFL game
  today is final.
- **Live verification**: a real CFL game (Winnipeg @ Hamilton) was
  genuinely in progress during this session. Waiting for the natural,
  unmodified `setInterval` to fire over several minutes was interrupted by
  the browser tool's own session limits (reported honestly, not glossed
  over) — verified instead by directly invoking the exact same
  refresh-and-merge code against the same live game, cross-checked against
  an independent third fetch: fetch succeeded, merge correctly applied,
  values matched live reality exactly.

**CFL pick resolution is now believed complete end-to-end** — one-time
fetch (existing) → recurring live refresh (this fix) →
`checkForNewFinals()` CFL fallback (prior CC-CMD, already verified) →
`_resolvePickIfExists()`. No further known gap in this area.

---

## SESSION END — 2026-07-05 (session closed, not mid-session)

**CLIENT HEAD: 6cc7365** (routine CI state-sync; last real feature commit `20758d7`, pick-em full-sport coverage scripts). **RELAY HEAD: ed80885** (WP source resolver outbox). Smoke **885/0**, confirmed fresh. Relay health confirmed live.

This closes out the session — MID-SESSION UPDATE #2 (below) covers everything through the drama backfill/Container/name-consolidation arcs; this entry covers everything after that, through session close.

---

## WHAT SHIPPED SINCE UPDATE #2

### Win probability — real sources wired for every sport checked
Built `resolveWinProbability(sport, ...)`, routing to whichever real source actually exists per sport: ESPN's native `winprobability[]` (MLB/WNBA/NBA), Kali or Squiggle's `confidence` field (AFL), FIELD's own live `computeLiveWP()` (soccer/WC — confirmed already running, not dormant), and real market odds via Odds API + `noVigProb()` (CFL/NHL/MLS/EPL/NFL, plus CFB after adding its missing odds-key mapping). Labels strictly "Market estimate" or "Statistical probability" per this project's own RUWT-safe convention — never a bare "win probability." A real, serious bug was caught live (not by review): ESPN's `homeWinPercentage` is 0-1 decimal, not 0-100 — an earlier `/100` division would have silently corrupted every ESPN-sourced probability by two orders of magnitude. Fixed and re-verified against real games per source type.

### Name-normalization consolidated — two real, honest CC stops along the way
Found three independent, duplicate team-name-matching implementations (AFL's `normAFL`, `WC_NAME_FIX`, `FIFA_NAME_ALIASES`) alongside the existing canonical `identity-resolver.js`. Both consolidation attempts required a real correction: the first CC-CMD for each wrongly assumed `resolveTeamKey()` was a drop-in replacement — CC correctly stopped at 70/100 and 45/100 respectively, having found the actual output shapes were incompatible (strip-form match-key vs. required human-readable/nickname-aware output). Corrected versions: AFL's algorithm registered as its own `afl_team` type (following the existing `soccer_player` precedent); a new `resolveTeamName()` added for the display-name cases, correctly excluding `FIFA_NAME_ALIASES` from the merge (direction-incompatible with the canonical map). Both real, evidenced pairs migrated; both verified live.

### Pick 'em — built completely, end-to-end, backend through UI through two real live-found bugs
Cumulative, non-resetting `pickLedger` in `UserDO` (permanent record, zero streak/consecutive-day field anywhere — the structural resolution to Rule 33's previously-held gamification question). Real design correction mid-build: a card-based first UI slice was dispatched, then found too dense (39+ existing chip classes) and moved to a proper new top-level surface (`togglePickEmView`, matching the existing `toggleWCView`/`toggleJournalismView` pattern exactly) — this was a genuine dispatch-before-design-question sequencing issue, named directly rather than framed as an unavoidable coincidence. That same investigation surfaced and fixed two real, shared bugs affecting all four nav-links and multiple modes (listener accumulation, an `#upper-slots`-hides-exit-toggle CSS bug), consolidated once rather than patched four times.

Two more real bugs were found by actual live use (not code review, not a probe) once the feature was live: MLB games incorrectly excluded from the Pick 'em list (a live-detection heuristic built for an unrelated bug had two false-positive paths for freshly-scheduled games), and CFL picks unable to ever resolve (CFL's one-time data fetch never fed the two stores game-completion detection depends on). Both fixed and verified. A full-sport, non-rendering coverage check (two scripts — a pure-data circadian check with zero DOM dependency, and a jsdom-based post-pick check avoiding a full browser) now passes cleanly across every sport with real games today (MLB, WNBA, CFL, AFL, WC/Soccer — NBA/NHL/EPL/CFB/NFL/MLS correctly off-season/N/A).

**Known, explicitly-scoped remaining gap**: CFL picks can only resolve after page reload, not live mid-session — closing that needs a recurring CFL poll, which needs a rate-limit investigation (Rule 78) before building. Flagged, not silently dropped.

### Process — a new standing rule, from a real self-caught failure
Added Behavior Rules item (8): chat applies the same ≥95 confidence discipline to itself before writing a CC-CMD that CC-CMDs already require before committing. Directly motivated by the pick-em card-density mistake above — the design question should have blocked writing that doc, not followed it.

---

## OPEN ITEMS FOR NEXT SESSION
1. CFL live mid-session pick resolution — needs a Rule 78 rate-limit probe before building recurring polling.
2. `container-upset-model.md`'s real-world model is live and verified (this was closed earlier tonight) — no further action needed there.
3. Nothing else known-pending. Queue is genuinely clear as of this close.

**Not a mid-session entry — session is closed.**

## MID-SESSION UPDATE #6 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: 3aafcc9.** SW_VERSION unchanged at `2026-07-05h` (no
index.html/sw.js changes this round — test-tooling only). **Smoke: 885/0**
(unchanged, no product-code edits this session).

**Pick 'em full-sport coverage check CC-CMD closed out, 100/100
confidence.** Full detail: `docs/outbox/cc-pickem-coverage-check-2026-07-05.md`.
Confirmed the prerequisite (`CC-CMD-2026-07-05-pickem-cfl-mlb-gaps`) had
completed before starting, per its own sequencing requirement. Built two
fast, non-visual scripts and ran them against every sport in the CC-CMD's
list, not just the two originally reported:

- `pickem_circadian_coverage_check.js` — ports `getCardCircadian()`
  verbatim, fetches real data directly (V2 relay, CFL rounds endpoint,
  Squiggle AFL relay), no rendering. **MLB (3/3), WNBA (1/1), WC/Soccer
  (1/1), CFL (1/1) all PASS.** NBA/NHL/EPL/NFL/CFB/MLS/AFL correctly
  reported N/A (no real games today — off-season or date-gated), not
  assumed to pass.
- `pickem_jsdom_display_check.js` — ports `makePick()`/
  `buildPickWidgetHTML()` verbatim into a minimal jsdom DOM (network
  stubbed — that layer was already verified live in the prerequisite),
  one real game per sport. **MLB, WNBA, WC/Soccer, AFL, CFL all PASS**
  (same N/A set as above for sports with no real game today).

**No new failures found.** The prerequisite CC-CMD's two fixes (the
`mapV2ToESPN()` clock/score heuristic fix, and the CFL
`checkForNewFinals()` resolution fallback) hold broadly — confirmed here
across every sport that shares those code paths (WNBA and WC/Soccer both
exercise the same fixed `mapV2ToESPN()` as MLB and passed), not just the
two sports originally reported. No code changes made this round.

---

## MID-SESSION UPDATE #5 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: b4a4b48.** SW_VERSION `2026-07-05h`, confirmed synced
index.html/sw.js. **Smoke: 885/0.**

**Pick 'em MLB+CFL gaps CC-CMD closed out.** Full detail:
`docs/outbox/cc-pickem-cfl-mlb-gaps-2026-07-05.md`. Both of the CC-CMD's
own static-reading leads turned out **wrong** — real causes were confirmed
via live investigation first, per the doc's explicit requirement:

- **MLB gap** ("soon-starting game missing from Pick 'em"): NOT ESPN
  flipping the primary `status` field early (it stayed `"pregame"`
  correctly the whole time). Real cause: `mapV2ToESPN()`'s
  live-detection heuristic (built for a real but *opposite* bug — a
  genuinely-live NBA Finals G2 game api-sports.io mislabeled `"pre"`) had
  two false-positive paths for a freshly-scheduled game: a clock-string
  check that didn't recognize `"0:00"` (the relay's actual pregame
  format) as zero, and treating a valid `0` score as "has a score."
  Fixed by parsing the clock to total seconds and requiring a real (`>0`)
  score. Verified live post-deploy: 3 genuinely-pregame MLB games now
  correctly appear in the Pick 'em list; the NBA Finals G2 case is still
  correctly caught as live.
- **CFL gap** ("pick doesn't display"): the `_id`-format lead was wrong —
  confirmed live that `makePick()`, the DOM lookup, and the "pick made"
  render all work correctly, in every tested scenario, including after a
  forced re-render. No fix needed for that half. The *real*, confirmed
  gap is narrower and different: CFL games never resolve (no win
  probability ever appears), because `loadCFLScoreboard()` fetches once
  (no recurring poll) and never feeds `espnScores`/`_scoresBySource` —
  the only stores `checkForNewFinals()` checks to detect a finished game.
  Fixed with a CFL-scoped fallback in `checkForNewFinals()` reusing the
  existing `saveEspnFinal()`/`_resolvePickIfExists()` hook. Verified live
  via a simulated game completion: real relay round trip, pick correctly
  resolved to `pick-correct` with a ✓.

**Known remaining gap, explicitly not fixed (flagged for follow-up):**
CFL still can't resolve a pick *live, mid-session* — only once the game
has ended and the page is reloaded, since CFL data never refreshes after
its one-time fetch. Closing that needs a recurring CFL poll, which
requires a rate-limit/cost probe (Rule 78) before building — a dedicated
follow-up CC-CMD, not done here.

Note: `docs/CC-CMD-2026-07-05-pickem-coverage-check.md` was pushed by the
user mid-session, sequenced to run *after* this investigation. Not yet
read or started as of this update.

---

## MID-SESSION UPDATE #4 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: a54642a.** SW_VERSION `2026-07-05g`, confirmed synced
index.html/sw.js. **Smoke: 885/0.**

**Nav mode consolidate CC-CMD closed out, 100/100 confidence.** Full
detail: `docs/outbox/cc-nav-mode-consolidate-2026-07-05.md`. This closes
both follow-up findings flagged at the end of the pick-em reconcile
CC-CMD (see UPDATE #3 below): (1) all four nav-links
(`desk-jump-link`/`jrn-nav-link`/`wc-nav-link`/`pickem-nav-link`) now
share one `attachNavLinkOnce(id, handler)` helper instead of four
copy-pasted inline `addEventListener` sites — live-regression-tested by
simulating 5 extra `renderAll()` poll cycles before clicking, confirming
no listener accumulation on any of the three testable modes; (2) wc-mode's
`#upper-slots` hide-list had the identical bug pickem-mode's `8435247` fixed
(hiding the wrapper also hid `nav.controls`, the mode's own exit toggle) —
confirmed live via non-zero nav-link rect while wc-mode is active.
journalism-mode was checked (not assumed) and confirmed to already be
correct — its `#upper-slots` hide is scoped to `@media(max-width:1199px)`,
the same range its mobile back-pill becomes visible in, so desktop never
hides its own exit toggle.

One bug found along the way was in the *live verify probe itself*, not the
product: the app's pre-existing first-visit "My Services" setup modal
(`maybeShowSetup()`, fires via `setTimeout(...,2500)` when
`localStorage.field_setup_done` is unset — true for every fresh CI browser)
opened mid-test on the first attempt and intercepted a click. Fixed by
setting the flag right after boot in the probe, mirroring a returning
user's browser state.

Final live run: `outbox/nav-mode-consolidate-probe-2026-07-05T2015Z.txt`,
`RESULT: PASS` — pickem/wc/journalism all round-tripped correctly, plus
journalism's mobile back-pill exit path.

No new follow-up findings this round.

---

## MID-SESSION UPDATE #3 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: 2c774de.** SW_VERSION `2026-07-05f`, confirmed synced
index.html/sw.js. **Smoke: 881/0.**

**Pick 'em reconcile CC-CMD closed out, 100/100 confidence.** Full detail:
`docs/outbox/cc-pick-em-reconcile-2026-07-05.md`. Summary: relocated the
`702fb7b` card-based pick widget into a new top-level `pickem-mode` surface
(`togglePickEmView()`/`#pickem-nav-link`/`#pickem-section`/
`renderPickEmSection()`), matching the existing `toggleWCView()`/
`toggleJournalismView()` pattern. Found and fixed 3 real bugs via live
Playwright CI verification (not just code review): (1) `g._id` unassigned
for games outside `renderAll()`'s filtered loop, (2) `renderAll()`
re-registering the nav-link click listener every poll cycle with a fresh
closure, causing accumulating listeners to net-cancel a toggle, (3)
`nav.controls` nested inside `#upper-slots`, whose hide-list (copied from
wc-mode) collaterally hid the pickem-mode exit toggle itself at desktop
widths. Final live run: `outbox/pickem-surface-probe-2026-07-05T1959Z.txt`,
`RESULT: PASS`.

**Two findings flagged for follow-up, not fixed here (out of scope):**
- `desk-jump-link`/`jrn-nav-link`/`wc-nav-link` share the same listener-
  accumulation bug as (2) above — only the new pickem-nav-link listener was
  guarded.
- **wc-mode likely shares bug (3) above** — its own hide-list also
  unconditionally hides `#upper-slots` at all widths, so `#wc-nav-link` is
  very likely a 0×0 box (no desktop exit) once `wc-mode` is active.
  Unverified this session (WC nav-link is hidden out-of-season, couldn't be
  exercised live) — worth its own CC-CMD.

---

## MID-SESSION UPDATE #2 — 2026-07-05 (session ongoing, not closed)

**CLIENT HEAD: 50f0a4e** (routine daily-cron bookkeeping only — whoop/oura fetch, mlbn-schedule, auto-overlay; last real feature commit unchanged at `4071026`, CFL circadian state wire). SW_VERSION `2026-07-05a`, confirmed synced index.html/sw.js.
**RELAY HEAD: c5b6b1d** (WNBA/AFL/EPL classification fix CC-CMD, just pushed, not yet executed).
**Smoke: 871/0**, confirmed fresh at time of this update.

This entry covers everything since MID-SESSION UPDATE #1 — that entry remains below, unedited, as the record of the first half of this session.

---

## WHAT HAPPENED SINCE UPDATE #1

### The drama_peak backfill saga — real, multi-stage, mostly resolved
- **Container attempt v1**: honestly stopped at 40/100 after hitting three real blockers (no `CF_API_TOKEN` in CC's own sandbox, ESPN egress issues from CC's sandbox, cross-repo read tool malfunction on a large file). Correctly refused to invent workarounds — reported verbatim per its own gate, exactly as designed.
- **All three blockers resolved directly** (not by CC, by chat): confirmed `deploy.yml` already has a working `CLOUDFLARE_API_TOKEN` GitHub secret; read the exact `dramaScoreLive`/`applyQW1SituationBonus` formulas directly from source; redirected the whole approach to GitHub Actions instead of CC's own sandbox.
- **v2 shipped clean**: 0→202 populated via a new GitHub Actions workflow (`drama-backfill.yml`) + relay endpoints (`/archive/drama-missing`, `/archive/drama-by-id`, D1-binding-based, no token scope needed).
- **Score-fill + event-ID backfill** (separate CC-CMD, real commits `e17bd49`/`9124f8f`): of 107 real past null-score rows, 62 gained a real score, 45 remained genuinely unresolvable (unmatchable against any real source). Confirmed the `drama_peak=0` sentinel is safe on the relay's real D1-read path (`findGame()`, no `||` fallback) — the earlier-found `0 → 50` collision is confined to a separate client-side `localStorage` cache, not this column.
- **Schedule fix** (real commit `e6a2fca`): `drama-backfill.yml` now runs on a 2-hour cron, not just `workflow_dispatch` — closes a real logical gap (with concurrent sports, "wait for everything to finish" has no actual endpoint).
- **Real, current D1 state** (verified fresh at this update): 643 total games since June 1, 277 future (can't be scored), 335 with any `drama_peak` value, 224 with a genuine non-zero score, 111 zero-placeholders.
- **The 111 zero-placeholders root-caused precisely, not assumed**: `classifySport()` in `drama-backfill.mjs` only recognizes `mlb` and a soccer substring set — WNBA (47), AFL (138... wait, all-time count), and EPL (26) all fall through to `'other'` and get immediately zeroed, *before any ESPN fetch is attempted*. This is a classification gap, not a missing-formula problem — the client's `dramaScoreLive` already has complete, calibrated WNBA and AFL formulas that the backfill script never ported.
- **Fix CC-CMD written and pushed** (`CC-CMD-2026-07-05-backfill-wnba-afl-epl.md`, not yet executed): WNBA and EPL's real ESPN paths independently verified live by chat (`sports/basketball/wnba/summary`, 409 real plays; EPL league slug `eng.1`, 16 real keyEvents) — both ready to build directly. **AFL is a real, separate finding**: ESPN is confirmed dead for AFL (three path conventions all 404/400'd against a real event ID) — AFL's actual, established source is Squiggle (`api.squiggle.com.au`), confirmed via the client's own `SQUIGGLE_BASE`. Whether Squiggle provides quarter-by-quarter granularity (needed for a real drama score) is genuinely unverified — outside this sandbox's allowed domains, left as a required, explicit check rather than guessed.

### Real Cloudflare Container deployed — first one ever on this account
- Confirmed via the dashboard hours into this session: Workers Paid is active (later directly confirmed via the billing API too — real subscription record, not inferred from Durable Objects usage), Containers available and enabled, zero deployed.
- **Deployed successfully**: `field-hello-container`, via a new GitHub Actions workflow that scaffolds from Cloudflare's own official template (`npm create cloudflare@latest -- --template=cloudflare/templates/containers-template`) into an isolated location — deliberately not touching `field-relay-nba`'s production `wrangler.toml` at all. Independently verified: real Worker listing (`workers_list`), live URL returns `HTTP:200`, real Application ID (`a03fc720-44b3-4dff-8454-b8084b5dd1ef`).
- **Real lesson from this**: the original plan (CC's own sandbox running `docker build` directly) was never going to work — CC's sandbox is Anthropic's own ephemeral cloud container, not a local machine, and has no proven privileged-build capability. GitHub Actions runners are the actual reliable "always-on machine" this project has, already authenticated via the existing `CLOUDFLARE_API_TOKEN` secret.
- **Not yet done**: `container-upset-model.md` (fitting a real statistical model for the soccer upset-bonus threshold against the now-real drama data) — written, gated on real data existing (it does now), never executed.

### Cloudflare API token — real permission expansion, fully verified
- Added `Workers Scripts:Read`, `Workers Tail:Read`, `Workers KV Storage:Read`, `Billing:Read` to the existing "Cloudflare usage check" token (previously Account Analytics:Read only). All four independently verified working via real API calls, not assumed from the dashboard save.
- **Real, useful findings unlocked by this**: `CF_AI_GATEWAY_BASE` is genuinely set as a secret on `field-claude-proxy` (resolved a previously-open question); Workers Paid confirmed active via direct subscription read; `vectorize_enabled: 1` and Workers AI's neuron billing components both already present in the account's plan, meaning zero subscription blocker exists for either the newspaper-archive-via-Vectorize idea or the Workers-AI-for-JQ-cost-reduction idea discussed earlier — neither has been built, both are just unblocked at the plan level.
- Containers itself needed a separate `Cloudchamber` permission, added later — real, exists in the dashboard, though the specific REST API path for inspecting Containers turned out not to exist publicly at all (confirmed via Cloudflare's own docs index) — Containers are Wrangler-CLI/dashboard-only, not API-inspectable the way KV/R2/D1 are.

### OG share-meta feature — fully resolved, 5-CC-CMD chain (all real bugs, not busywork)
1. Missing `assets.run_worker_first` in `wrangler.jsonc` — static assets were served ahead of the Worker by Cloudflare's own default routing.
2. Array-form `run_worker_first: ["/"]` failed — this repo's pinned Wrangler version (3.109.0) only accepts a boolean. Resolved with `run_worker_first: true` plus real, measured before/after latency (~1.5-1.9ms delta, confirmed negligible).
3. `Element.after()` called with swapped/malformed arguments in `MetaTagRewriter` — found by direct code read, not inference.
4. Cloudflare error 1042 — Worker-to-Worker same-account fetch to `*.workers.dev` blocked. Fixed with `global_fetch_strictly_public`, the *same* flag already proven fixing this exact error class in the relay since May 29 (found via chat-history search, not rediscovered).
5. **Fully verified live, independently**: real bot UA gets a real `og:description` tag with live content; normal UA unchanged; diff between the two responses is exactly one line.

---

## OPEN ITEMS FOR NEXT SESSION (verified-current as of this update)

1. **`backfill-wnba-afl-epl.md`** (relay, genuinely pending) — WNBA/EPL ready to build directly (paths verified), AFL needs the Squiggle-granularity check first.
2. **`container-upset-model.md`** (relay, genuinely pending, unblocked) — real drama data now exists to fit a model against.
3. **MLB's 20 zero-drama rows** (out of 216 scored) — real, unresolved open question raised in a separate CC conversation thread: genuinely low-drama games, or a cache-miss/ESPN-fetch failure during the original backfill run. Not investigated this session.
4. Everything carried forward from UPDATE #1's open items, not re-touched this session (see below).

---

**Not a session-end entry — session is ongoing.**

## MID-SESSION UPDATE — 2026-07-04 (session ongoing, not closed)

**CLIENT HEAD: 51df7a8** (bookkeeping commit; last real feature commit `7e88d06` — global_fetch_strictly_public fix). Always re-run `git log -1` fresh rather than trusting this value later in the session.
**RELAY HEAD: c8086bf** — unchanged since early this session; all later work today was client-only.
**SMOKE: 871 total, 0 failed** — ground truth via direct `node smoke.js index.html`, confirmed fresh at time of this update.
**SW_VERSION: 2026-07-04t** — index.html and sw.js confirmed in sync via direct grep AND independently confirmed live (`curl` against the deployed URL returns the same value).
**Live deploy confirmed matching HEAD** at time of this update.

---

## WHAT THIS SESSION ACTUALLY DID (extremely long session, multiple real feature arcs)

### Circadian per-game state system
- v2.1-v2.3 shipped: `live/in` vocabulary fix, cross-sport support (WC26/MLB/AFL), wired into live re-renders (previously frozen at initial render).
- Card-level DOM reconciliation + string cache (Phase 2) and CARD_ATTRIBUTE_SYNC registry (Phase 1) shipped, live-measured (`applyMainHTML`=7ms, string-build=38.8ms).
- **Circadian card sort order** (PRIME>NIGHT>PREVIEW>LATE) shipped — this was in the ORIGINAL spec, deferred since v2.1, never implemented until found and closed this session. Live-verified: a card whose tier flips visibly reorders, composes safely with Phase 1/2 reconciliation.
- **`getNewspaperVoice`'s missing LATE bucket** fixed — an all-LATE slate no longer wrongly defaults to the 'morning' show-everything voice.
- **Real, NEW open item found, not yet fixed**: `renderAll`'s `_circInput` only ever reads `state` from `findESPNScore(g)` (ESPN lookup), never from the game object's own `state` field directly. This makes ANY sport whose live state comes from a non-ESPN source (confirmed for CFL, see below) permanently classify as LATE regardless of real state. CC-CMD written (`cfl-circadian-state-wire.md`), **genuinely pending, not yet executed.** (Separately: `circadian-kv-read-endpoint.md`, the relay-side KV read route, IS already done this session — see Open Items correction below; don't conflate the two.)

### Newspaper banner — 6 real "wipe on repaint" bugs found and fixed
- `applyMainHTML()` already tried to preserve `#field-newspaper` across re-renders, but 6 separate code paths (renderAll's empty-filter branch, goToDate's 4 branches, renderAll's post-render empty-check) bypassed it with direct `main.innerHTML=` assignments. All 6 found and fixed across two CC-CMDs (found via careful diff review, not all found on the first pass — CC caught a 6th one I'd missed in the original spec).
- Added `reg.update()` on `visibilitychange` to close a real iOS-vs-Android PWA update-propagation gap (confirmed root cause: no explicit update-check call anywhere, relying solely on the browser's own — on iOS, less frequent — background check cycle).

### FIFA rankings / soccer drama scoring
- footballdata.io confirmed permanently paid-plan-gated for FIFA rankings (live 403, `paid_plan_required`).
- **Parse.bot integration shipped instead** — real, live, free-tier FIFA World Ranking data, confirmed working (Argentina rank 1, Cape Verde/"Cabo Verde" rank 67 — matching the exact motivating example). 3 real FIFA-official-naming aliases handled (Cabo Verde, Korea Republic, Côte d'Ivoire).
- Soccer drama scoring shipped: extra-time bonus tier (verified against a real WC26 extra-time game's actual ESPN keyEvents), quiet-stretch interpolation, upset-factor bonus (now live via the Parse.bot data) — plus a previously-undetected bug found and fixed in the same pass: `dramaScoreLive`'s soccer branch conditions never matched WC26's real sport string ("FIFA World Cup 2026"), meaning the whole soccer calibration silently never fired for WC26 games until this session.

### CFL — real, dormant live infrastructure found and wired
- A June 27 session had already found, tested, and wired a real live CFL scoreboard API (`cflscoreboard.cfl.ca`) into the relay (`/cfl/scoreboard/rounds`) — confirmed still live and accurate today (Calgary 58–Toronto 36, Ottawa 22–Saskatchewan 27, both matching independent verification). **The client never called it** — confirmed via grep, zero references. Wired this session: `loadCFLScoreboard()` (async, golf's delayed-injection pattern), old hardcoded array kept as explicit fallback-ONLY (mutual-exclusion gate, avoiding the exact golf duplicate-section bug class — see below).
- This surfaced the `_circInput`/circadian-inert finding above.

### A real, live production bug caused and fixed this session (own mistake, corrected)
- Added a hardcoded golf tournament entry (John Deere Classic) to `golfGames` based on an unverified claim ("golf coverage missing 6 days") — never checked the live app first. Real, live app already had this tournament correctly, via a completely separate ESPN-driven pipeline (`loadPGASlate`) that this session didn't know existed. Caused a real, live duplicate-section bug (confirmed 2x rendering), found via user-provided screenshot, reverted same-session. **Lesson applied since**: search chat history before claiming something "doesn't exist" — a code check alone proves "not wired," never "never existed."

### OG share-meta feature — 5-CC-CMD chain, fully resolved
- A prior CC-CMD (`og-share-meta.md`) had shipped bot-gated OG meta-tag injection via `src/worker.js` + HTMLRewriter, but it never actually worked in production. Root-caused across 3 real, distinct bugs, fixed in sequence:
  1. `wrangler.jsonc` missing `assets.run_worker_first` — static assets were served ahead of the Worker script by Cloudflare's own default routing.
  2. `Element.after()` called with swapped/malformed arguments in `MetaTagRewriter` — the actual meta tag was buried inside a malformed options object, never inserted.
  3. **Cloudflare error 1042** — the Worker's own in-process fetch to the relay's `*.workers.dev` URL was blocked (same-account Worker-to-Worker anti-loop restriction). Fixed with `global_fetch_strictly_public` — the SAME flag already proven fixing the identical error class in the relay itself since May 29 (found via chat-history search, not rediscovered from scratch).
- **Fully verified live, independently, end-to-end**: real bot UA gets a real `og:description` tag with live, current content; normal UA unchanged; diff between the two responses is exactly one line.

### Deploy/CI infrastructure — 2 real, distinct bugs found and fixed
- `sw-version-bump.yml`'s daily cron: double-space sed pattern for `sw.js` silently never matched (real file uses single space) — fixed, made whitespace-tolerant, added loud-failure verification.
- `deploy-gate.yml`'s own SW_VERSION sync-back step: a genuine race condition where a stale checkout from an earlier-triggered run could overwrite a later, already-correct commit. Fixed with a `concurrency` group (`cancel-in-progress: false`, deliberately) plus a defensive `git pull` immediately before reading the current version. **Confidence on this one is explicitly lower than usual** — CI concurrency behavior can't be fully verified by static review alone; one clean observation so far, not yet "proven" from repeated real-world pushes.

### Daily update (real gap found, real gap avoided)
- Golf: real gap found and fixed (see above, before the duplicate-bug detour).
- CFL: no real gap — first pass used a wrong grep pattern and nearly reported a false gap, caught before acting on it.

---

## OPEN ITEMS FOR NEXT SESSION (verified-current as of this update)

1. **`cfl-circadian-state-wire.md`** (client, genuinely pending) — fixes `_circInput` to also read `g.state` directly, not just ESPN lookups. Needed for CFL (and any future non-ESPN sport) to classify correctly for sort-order/newspaper-voice purposes.
2. ~~`circadian-kv-read-endpoint.md`~~ — **CORRECTION, was wrongly listed as pending in an earlier version of this update.** Already executed this session, real commit `836296d`, route live at `src/index.js` ~line 7211. Independently re-verified live just now: `GET /circadian/preview/2026-07-04` → `ok:true` real text; `GET /circadian/late/2026-07-03` → `ok:true` real text (today's `late` correctly returns `ok:false` — matches the established recap-data-lags-a-day pattern, not a bug). No outbox manifest was ever filed for this execution (the actual gap worth noting — not the code, which is genuinely done). Not open for next session.
3. Everything in the 2026-07-03 handoff not touched this session (completion-triggered journalism real-game confirmation, `wentToOT` hardcoded false, session_health phase-degradation gap, WNBA archive gap, v4 voice register in relay, Prompt Observatory, 2026-06-30 priority list items) — not re-verified, carry forward as-is.

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon (client), field-relay-nba (relay)
- New this session: `PARSEBOT_FIFA_KEY` (Worker secret, both repos synced), Parse.bot FIFA.com wrapper (free tier, real data)
- Direct D1 access: Cloudflare Developer Platform MCP `d1_database_query` — bypasses relay's `/d1/execute` allowlist, default over relay-proxied access.

---

**Not a session-end entry — session is ongoing. This update exists so a crash or restart mid-session doesn't lose today's real state.**

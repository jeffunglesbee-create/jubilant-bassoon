# FIELD HANDOFF

## MID-SESSION UPDATE — 2026-07-11 (Deploy Recovery Infrastructure Reference — the "unverified from this session" hedge resolved via cross-verified evidence from a parallel chat session)

**No SW_VERSION bump — STANDARDS.md-only.** The prior entry's
`get_deploy_status(repo:"field-relay-nba")` note was left explicitly
hedged as "unverified from this session." User shared a screenshot
from a separate, parallel claude.ai chat session ("Archive brief
endpoint integration") showing a real, successful call to exactly
that tool signature, returning live field-relay-nba workflow data.

Not accepted at face value — cross-checked instead: the screenshot's
`Post-deploy live verification | success | 76f4e71` row matches the
exact `deployed` SHA (`76f4e71`) this session had independently pulled
minutes earlier via `probe_relay_route("/deploy/verify")` on the same
`match: false` incident. Two independently-obtained data points
agreeing on a specific git SHA — updated the STANDARDS.md note to
reflect this: confirmed for the chat surface's own connector, still
unconfirmed for a Claude Code session in this repo (re-checked
`get_deploy_status`'s schema directly — still no `repo` param here,
a different tool binding than what chat has).

`node smoke.js`: 919/0. `git diff --stat`: 18 insertions / 4
deletions, targeted note update only.

## MID-SESSION UPDATE — 2026-07-11 (Deploy Recovery Infrastructure Reference added to STANDARDS.md — 2 factual corrections made before committing the source doc's claims verbatim)

**No SW_VERSION bump — STANDARDS.md-only, not a deploy-gate trigger
path.** Full detail: `docs/outbox/cc-deploy-recovery-reference-2026-07-11.md`.

Added a new `## Deploy Recovery Infrastructure Reference` section
(grouped with the existing MLS/Push Notification Architecture
Reference sections), moving the "re-trigger a stuck CI workflow" chat
memory and the spec'd-but-not-yet-built `trigger_workflow` tool's real
status into the canonical doc.

**Didn't paste the source CC-CMD's prescribed content verbatim without
checking it first — found and fixed 2 real inaccuracies:**
1. `GET /deploy/verify` claim — confirmed accurate via a live
   `probe_relay_route` call (real response matched the documented
   shape exactly). Side finding: field-relay-nba currently shows a
   genuine `match: false` (expected `a20fced`, deployed `76f4e71`) —
   flagged for the next session with proper access, not diagnosed
   further here (out of scope, no field-relay-nba tool access).
2. `get_deploy_status(repo:"field-relay-nba")` claim — verified FALSE
   via a fresh `ToolSearch` schema fetch (the real tool takes no
   `repo` param, hardcoded to jubilant-bassoon). Corrected the
   Diagnosis paragraph to state what's actually true rather than
   commit a broken operational instruction to the canonical doc.

**Also flagged, not corrected (different section's scope):** Rule 89's
own text (added earlier tonight) already lists `trigger_workflow`
alongside 3 real, working tools as "already used" — pre-existing
imprecision, since this new section's own content correctly says it's
spec'd-not-executed. Noted in the new section rather than silently
duplicated or silently left to mislead a future reader; not edited
in Rule 89 itself (out of this task's stated scope).

`node smoke.js`: 919/0 (STANDARDS.md isn't a smoke target; run anyway).
`git diff --stat`: 75 insertions, 0 deletions, pure addition.

Confidence: 100/100. Committed.

## MID-SESSION UPDATE — 2026-07-11 (Render-surface failures made visible — same principle as the earlier relay-init fix, applied to the client render pipeline)

**SW_VERSION 2026-07-11g → 2026-07-11h.** Full detail:
`docs/outbox/cc-render-surface-visibility-2026-07-11.md`.

**Problem:** `_fieldRefreshDynamicSurfaces()` independently try/catch-wraps
6 renderers with bare `catch(_) {}` each — a real failure in one is
completely silent while the others keep updating, creating split-brain
UI (stale scores on cards while the ticker and One To Watch both look
fine). Same failure shape as the relay-init fix earlier tonight, now
applied to the client render pipeline instead of relay overlays.

**Audit found 2 more genuine clusters** beyond the one named in the
CC-CMD — not assumed isolated: the `renderAll()` tail
(`updateConflictChip` + `applyFieldPickBadge`) and the journalism
companion block (`renderJournalismCompanion` + 3 fire-and-forget
loaders). Individually checked and excluded 9 single-instance call
sites, and explicitly declined to expand into the much larger, 
differently-shaped SSE message dispatcher (`_onMessage()`, a dozen+
bare catches across unrelated event-type branches) — flagged as a
separate, out-of-scope finding rather than scope-creeping into it.

**Reused `captureFieldError` exactly as it already existed** — no new
mechanism. `silent` reasoned per-function against the file's own
precedent (every `renderNightOwlRecap` call site already uses
`silent=false`; relay fetches use `silent=true`): all 8 primary
render/update-surface calls got `silent=false`, the 3 secondary
"fire-and-forget" journalism loaders got `silent=true`.

Verified with a real forced-failure test (extracted verbatim source in
a Node `vm`, not reimplemented): made `renderScoreTicker` throw a real
error, confirmed all 6 renderers in the primary cluster still ran, and
`window._fieldErrors` captured exactly one entry with the correct
`surface:score-ticker` tag.

`node smoke.js`: 919/0. `node field_unit.js`: 66/0. `node field_smoke.js`:
21 pre-existing failures, unchanged.

Confidence: 100/100. Committed.

## MID-SESSION UPDATE — 2026-07-11 (Resolved all 5 internal STANDARDS.md rule-number collisions flagged in the earlier Rule 89 entry — one root cause, one commit)

**SW_VERSION 2026-07-11f → 2026-07-11g.** Full detail:
`docs/outbox/cc-standards-collision-resolution-2026-07-11.md`.

**Root cause, confirmed independently (not trusted from the CC-CMD
doc's own claim):** a June 1 2026 "PM-7" session renumbered 4
pre-existing rules into slots 48/50/51/52 and separately added a new
Rule 49, all that same day. A **different**, later session on June 4
2026 (RUWT/patent-risk work) added 5 more rules and assigned them
48-52 without checking PM-7 had already claimed those numbers 3 days
earlier — one incident, five collisions. Verified this by reading each
section's own dating comments (not by trusting the doc's assertion or
guessing from file position).

Renumbered the 5 June-4 rules to **92-96** (Watch Engine WC selection,
OTW momentum, `_fieldDataReady` sentinel, RUWT risk register, Sandbox
access matrix), moved to the end of the file preserving the
strictly-increasing-position convention, full content preserved
verbatim (confirmed via `git diff` byte-for-byte). The 5 original
rules (48-52) are untouched at their original line numbers.

**Full repo-wide cross-reference sweep** (not just STANDARDS.md) found
and fixed 16 genuine live citations of the old "RUWT Rule 51" across
`smoke.js`, `index.html`, `docs/ADR-002-CONTEXT.md`, and 2 outbox
docs. Correctly excluded 3 categories of near-miss: "DO NOT ASSUME"
hits (different, unchanged Rule 48), an unrelated never-materialized
"Rule 50 candidate" placeholder in `smoke.js`, and — the one worth
remembering — a **literal captured terminal transcript** in a dated
audit doc (`outbox/rule59-audit-2026-06-15.md`) that must NOT be
edited since it's historical evidence of a real command's output, not
a live cross-reference.

All 5 renumbered rules registered in the codex
(`rule-92` through `rule-96`), confirmed live via both `codex_read`
and `codex_search`.

**Also flagged, not acted on:** the CC-CMD doc's own claim that a CI
check ("`post-deploy-live-verify.yml`") already enforces Rule 90 in
this repo is false — that check is field-relay-nba-scoped per the
actual source doc, never targeted at jubilant-bassoon, and this
session can't verify it either way. Reported per Rule 72, did not
block the substantive work.

`node smoke.js`: 919/0. `node field_unit.js`: 66/0. `node field_smoke.js`:
21 pre-existing failures, unchanged.

Confidence: 100/100. Committed.

## MID-SESSION UPDATE — 2026-07-11 (Self-dispatched follow-up: fixed the NBA_STATS_RELAY bug the prior entry's instrumentation caught on its first live run)

**SW_VERSION 2026-07-11e → 2026-07-11f.** Full detail:
`docs/outbox/cc-nba-stats-relay-fix-2026-07-11.md`, CC-CMD:
`docs/CC-CMD-2026-07-11-nba-stats-relay-fix.md`.

**User asked to "automate follow up" on the relay-init-staleness-visibility
entry's live finding.** Rather than wait for a manually-pasted trigger
message, wrote the required second CC-CMD doc (Rule 87 — no deferred
work without one) and self-dispatched/executed it immediately in the
same session.

`nbaPlayerCluichInit` was failing on every production page load with
`"NBA_STATS_RELAY is not defined"` — a `ReferenceError`, not a network
issue. Probed: the constant was referenced once (index.html:8417) and
never declared. Its value was not guessed — derived from two
independent sources already in the file (the function's own comment
naming `/nba-stats/leaguedashplayerclutch`, and the literal base used
by `nbaPlayoffLeadersPrefetch` for `/nba-stats/leagueLeaders`), both
agreeing on `https://field-relay-nba.jeffunglesbee.workers.dev/nba-stats`.
Added exactly that one `const` line — confirmed via `git diff` that
nothing else changed.

Verified with a real forced-failure/success test (extracted verbatim
source in a Node `vm`, not reimplemented): a real 404 now records
correctly, a real 200 with an NBA Stats API-shaped response now
overlays live clutch data onto `NBA_CLUTCH_PLAYERS` and flips
`_relayInitStatus` to `ok:true` — the `ReferenceError` is gone.

**Also flagged, correctly NOT attempted:** `nhlSeriesInit`/`nhlGSAXInit`
both got a real `HTTP 403` from field-relay-nba on the same live pass —
that repo is outside this session's tool access; a companion CC-CMD
run from a session with field-relay-nba access is needed.

`node smoke.js`: 919/0. `node field_unit.js`: 66/0.

Confidence at commit time: 75/100 (the 25 live-verification points are
earned post-deploy — pending the live-verify addendum, matching the
prior entry's discipline of not pre-claiming an unearned score).
Committed.

## MID-SESSION UPDATE — 2026-07-11 (Relay-init silent failures made visible across all 9 overlay functions)

**SW_VERSION 2026-07-11d → 2026-07-11e.** Full detail:
`docs/outbox/cc-relay-init-staleness-visibility-2026-07-11.md`.

**Problem:** 9 functions (`mlbProbablePitcherInit`, `mlbPitcherStatsInit`,
`mlbStatsInit`, `nbaPlayerCluichInit`, `nhlSeriesInit`, `nbaCluichInit`,
`nhlGSAXInit`, `soccerFBrefInit`, `uflEpaInit`) fetch fresh relay data
to overlay hardcoded stub constants; on failure they silently keep the
stub with zero trace anywhere. Fixed the *visibility*, not the
graceful degradation (try/catch/fallback behavior is untouched).

**Added `window._relayInitStatus` + `_recordRelayInit(name, ok, error)`**,
called at every real success and failure point in all 9 functions — a
Health Panel section (`🧩 Relay Init (9 overlays)`) now surfaces it,
reusing the existing grouped-row pattern.

**Real per-function triage, not a blanket fix.** Only `nbaCluichInit`
carries a genuine silent-staleness risk on an actual DOM surface (OKC/NYK
have hardcoded clutch-DRTG stub numbers that render identically to live
data) — added a tooltip note there. Re-derived that `nhlSeriesInit` and
`nhlGSAXInit`, initially assumed equally high-stakes, are actually safe
by construction (their consumer chips are gated on a per-team null-check
that's only true after a real live overlay — a relay failure yields no
chip, not a misleading one). The other 5 either have no stub at all
(fail into "nothing renders") or only feed internal journalism-prompt
text with no DOM tooltip surface to attach an indicator to — each
reasoned individually in the outbox doc, not defaulted.

**Verified live, not asserted:** forced a real 404 through the extracted
`nbaCluichInit` source in a Node `vm` context — confirmed
`_relayInitStatus` recorded the failure and the stub was retained; then
forced a real success — confirmed the overlay applied and status flipped
to `ok:true`. Exercised the Health Panel section's HTML output directly
for both a failure state and an all-success state.

`node smoke.js`: 919/0. `node field_unit.js`: 66/0. `node field_smoke.js`:
21 failures, confirmed via `git stash` to be identical pre-existing
failures unrelated to this change (not a regression).

Confidence: 100/100. Committed.

## MID-SESSION UPDATE — 2026-07-11 (Rule 89 collision resolved as Rule 91 — full sweep surfaced a much bigger, real, pre-existing problem: 5 internal STANDARDS.md rule-number collisions)

**No SW_VERSION bump — governance-doc-only.** Full detail:
`docs/outbox/cc-rule89-collision-resolution-2026-07-11.md`.

**Resolved the Rule 89 collision found in the prior entry.** Moved
`docs/CLAUDE-CODE-PROMPT-RULES.md`'s independently-minted "Rule 89 —
Legible across scope (SCOPE-LEGIBLE-A)" into `STANDARDS.md` verbatim as
Rule 91 (full four-radii content preserved exactly — nothing
summarized), replaced the satellite doc's copy with a short pointer,
registered Rule 91 in the codex (confirmed live via `codex_read`).

**The required full sweep (not just re-checking 89) found something
much larger than expected.** Confirmed zero *additional* cross-document
collisions between the two target files (Rules 87/88 appear in both,
confirmed as intentional same-topic mirrors, not independent
originations). But a duplicate-count check — after catching and fixing
a bug in my own first attempt at it (`sort -nu` deduplicated *before*
counting, trivially reporting zero by construction) — found
**`STANDARDS.md` itself contains 5 genuine internal rule-number
collisions**: Rules 48, 49, 50, 51, and 52 each cover two completely
unrelated topics under the same number (e.g. Rule 48 is both "DO NOT
ASSUME" and "Watch Engine WC selection"; Rule 52 is both "Schedule
Section Builder" and "Sandbox access matrix"). Two independent rule
sequences appear to have been concatenated into `STANDARDS.md` at some
point in this project's history without renumbering — the same root
cause diagnosed for the cross-document case, just occurring *within*
the canonical file itself.

**Not fixed — explicitly out of scope for this task, reported in full
rather than silently left for a future session to stumble on.**
Resolving 5 collisions (determining which of each pair is canonical,
renumbering the other 5 without breaking existing cross-references,
registering the renumbered rules) is a materially larger task than
this CC-CMD's stated scope. A dedicated follow-up CC-CMD is warranted.

Confidence: 70/70 (100% of what TASKS 1-4 could achieve; TASK 5 targets
field-relay-nba, out of scope for this repo). Committed.

---

## MID-SESSION UPDATE — 2026-07-11 (STANDARDS.md Rule 89 + Rule 90 — real premise gap found, user consulted, prerequisite run first, real numbering collision surfaced)

**No SW_VERSION bump — governance-doc-only, no `index.html`/`sw.js`
touched.** Full detail: `docs/outbox/cc-standards-rule89-2026-07-11.md`,
`docs/outbox/cc-standards-rule90-mechanical-2026-07-11.md`.

**Was asked to execute `rule90`'s TASKS 1-2. Both assumed prior state
that didn't exist** — no "Rule 90" section anywhere in `STANDARDS.md`
to replace, and Rule 89 (a stated precondition) didn't exist either.
Investigated (grep, `git log -S`, codex search/list — all empty)
rather than fabricate either rule's text or silently reinterpret
"replace" as "add" without saying so. **Asked the user how to proceed;
they said run the sibling `rule89` CC-CMD first** (the doc that
actually adds Rule 89), which unblocked both of `rule90`'s tasks
cleanly.

**A real concurrent-push race surfaced mid-task**: a `git push`
rejection revealed 3 new origin commits with names suggesting Rule
89/90 had already been executed. Investigated what they actually
touched before rebasing (`git show --stat`) rather than assuming
either "safe" or "conflicting" — all three only edited the CC-CMD doc
files themselves (the user amending instructions), not `STANDARDS.md`.
Rebase applied cleanly, confirmed via a post-rebase duplicate-heading
check.

**Both rules added fresh** (Rule 89 — SCOPED-TOOL-DEFAULT-A — placed
after Rule 88; Rule 90 — RULE-COMPLIANCE-FOLLOWUP-A, the mechanical
registry-tracking version — placed after Rule 89), preserving the
file's existing number-matches-position convention rather than wedging
either rule mid-document to stay near a topically-related cluster.

**Registered Rule 89 in the codex as required — then found a real,
serious pre-existing numbering collision while verifying it.** The
doc's own suggested `codex_search("rule-89")` returns nothing (the
tool matches title/content text, not the key field, and the entry's
text says "Rule 89" not "rule-89" — investigated, not dismissed).
Confirmed via `codex_read` instead. Searching "Rule 89" (case-matched)
then surfaced an existing, unrelated, already-registered "Rule 89"
(`rule-89-scope-legible-a`, from `docs/CLAUDE-CODE-PROMPT-RULES.md`,
2026-07-08) — a **completely different rule in a completely different
governance document**, sharing the same number by pure coincidence.
`STANDARDS.md` and `CLAUDE-CODE-PROMPT-RULES.md` are two independently-
numbered rule sequences with no shared numbering authority. **Not
fixed here** (a real renumbering decision, out of scope for this task)
— flagged prominently for a dedicated CC-CMD. No data corruption: the
two codex entries use distinct full keys.

**Also found and reported, not fixed:** `STANDARDS.md`'s own Rule 86
has no section of its own anywhere in the file (sequence jumps 85→87),
and its one stray cross-reference mention doesn't match what
`CLAUDE.md` cites as Rule 86 at all (different topics entirely).
Pre-existing, unrelated to this task.

Confidence: 100/100 in both parts (rule89: 20+40+30+10; rule90:
35+35+30). Both committed and pushed. TASK 3 (field-relay-nba CI
staleness check) explicitly out of scope for this repo.

---

## MID-SESSION UPDATE — 2026-07-10/11 (mlb-umpire-abs-sync TASK 0 — the CC-CMD was amended mid-execution; confirmed-broken client patch removed)

**SW_VERSION `2026-07-11c` → `2026-07-11d`. Smoke: 919/0** (one more
real, investigated fix: `A206` now asserts `/mlb-umpire-scrape` is
absent, not present, matching the removal below).
Full detail: `docs/outbox/cc-mlb-umpire-abs-sync-2026-07-10.md`
(TASK 0 section).

**The CC-CMD doc was revised mid-session, validating and extending the
scope correction from the prior entry.** It added a required TASK 0:
live-check `/mlb-umpire-scrape` and explicitly resolve the two-writer
conflict, not leave it as a reported-but-unfixed finding. Executed as a
genuine follow-up (not skipped): **4 separate real requests** to the
relay endpoint, all identically `502 {"error":"Savant returned HTTP
500"}`, spaced ~4s apart — confirmed stable, not a single data point
treated as conclusive.

**Removed the client-side scrape-and-patch block from `mlbStatsInit()`
entirely** — the doc's own preferred resolution once failure is
confirmed stable, and this project's standing instruction against
"removed code" ghost-comments followed (a short, forward-looking
comment explains why this table doesn't get a runtime patch like its
5 siblings, not a history of what used to be there). Verified via a
real `vm` test against a mocked `fetch`: exactly 5 fetch calls remain
(the working Savant-CSV tables), `/mlb-umpire-scrape` is genuinely
never called, and `UMPIRE_ABS_RATINGS` is left completely untouched by
`mlbStatsInit()` — the two-writer conflict is now fully resolved, not
reduced.

Confidence: 100/100 against the revised rubric (20+15+25+20+10+10).
Committed as a second commit on top of the already-pushed `cfba9ad`.

---

## MID-SESSION UPDATE — 2026-07-10/11 (mlb-umpire-abs-sync — weekly workflow now regenerates UMPIRE_ABS_RATINGS, real scope correction found first)

**SW_VERSION `2026-07-11b` → `2026-07-11c`. Smoke: 919/0** (one real,
investigated fix along the way: `A206` hardcoded two specific umpire
names as a proxy check; this week's real data doesn't include one of
them — replaced with a structural check that doesn't depend on which
umpires happen to be on the real weekly roster).
Full detail: `docs/outbox/cc-mlb-umpire-abs-sync-2026-07-10.md`.

**Found and reported a real correction to this CC-CMD's own premise
before proceeding**: the doc said nothing refreshes `UMPIRE_ABS_RATINGS`
after May 27. Reading `mlbStatsInit()` in full (not referenced anywhere
in the doc's own probe) found a separate, already-working **runtime**
mechanism — a CF Worker (`/mlb-umpire-scrape`) that live-scrapes Savant
and patches `UMPIRE_ABS_RATINGS` in the browser on every page load,
specifically because the CI pipeline itself is IP-blocked from reaching
that same endpoint (CF 1010). The genuinely stale surface is narrower
than the doc's framing: only the static page-load fallback (before that
runtime patch completes, or if it fails) was actually frozen. Still real,
valuable work — reported as a scope correction, not a reason to stop,
and the two mechanisms don't conflict (the runtime patch still overrides
this fallback whenever it succeeds).

**TASK 1's real answer was more precise than the doc anticipated**: no
manual `SW_VERSION` bump is needed in the new step — `deploy-gate.yml`
already auto-syncs that on every run that fires. The actual blocker is
the *existing* weekly commit's `[skip ci]` tag, which would silently
skip deploy-gate entirely (and therefore never actually ship the
regenerated data) — removed it from this one commit's message, the real
minimal fix.

New `scripts/sync-umpire-abs-ratings.js` (mirrors `rotate-schedule.js`'s
brace-matched surgical-replacement convention) regenerates the constant
from real `outbox/mlb/umpire_abs.json` data — 48 real umpires (vs. the
old table's 22), `pitchesCalled` dropped after confirming via full-file
grep it has zero real consumers (set once, read once, as a pure
passthrough never referenced by any of the 5 real call sites). `git
diff` confirms a single contiguous change; everything else in
index.html is byte-identical. Re-verified `getUmpireABSRating()` against
3 real names from the new data, including the `UMP WATCH` badge firing
correctly for a real umpire over threshold.

Confidence: 100/100 (25+30+25+10+10). Committed.

---

## MID-SESSION UPDATE — 2026-07-10/11 (mlb-whos-up-next — the follow-up feature the prior SESSION END entry noted as "still pending" is now shipped)

**SW_VERSION `2026-07-11a` → `2026-07-11b`. Smoke: 919/0 (unchanged).**
Full detail: `docs/outbox/cc-mlb-whos-up-next-2026-07-10.md`.

**Wires up the two gaps the prior probe (`009164b`, 100/100) found**:
`fetchMLBLiveGame()` (zero callers, discarded `atBatIndex`/
`battingOrder`/`playEvents[]`) and `fetchMLBBoxscoreContext()`
(discarded `numberOfPitches`/`battersFaced`). Built a mechanical
lineup-rotation forecast — WHO is up and roughly WHEN, never WHAT
happens, per this codebase's anti-fabrication rules — from real,
per-game-measured pace and pitches/at-bat, never a hardcoded pitch-clock
constant or league average.

**TASK 4 hit a genuine blocker, reported rather than worked around**:
at first verification pass, every MLB game was `Scheduled`, none
`Live` — computed an honest 75/100 and stopped without committing, per
the CC-CMD's own gate.

**Resolved via a parallel investigation run in another (chat) session**,
which correctly separated two claims the prior probe could be mistaken
for conflating: that the *data source* exists (proven) vs. that *this
session's new forecast code* computes correctly against it (not yet
proven by that probe). Executed a stronger version of that session's
proposed fix: the probe's own game (Phillies @ Tigers, `gamePk 824252`)
had since gone `Final`, so its complete real record was available —
re-fetched it fresh and ran the actual new (uncommitted) code against
two real historical reconstructions: at-bat #40 (the exact one the
probe quoted) produced a real, correctly-computed forecast ("Matt
Vierling", slot #5, ~4 min, real 23.2s/pitch pace, real 3.875
pitches/AB); at-bat #1 (genuinely thin real early-game data) correctly
produced no forecast at all. Real data, real shipped code, honestly
distinguished from a literal live-at-this-second connection, which
remained genuinely unavailable.

Confidence: 100/100 (25+20+30+25). Committed.

---

## SESSION END — 2026-07-10/11 (extended session, chat-side)

**Final state:** HEAD `d9c6315c` (state-sync only; last real commit `009164b`
— MLB pitch-pace probe). Smoke: **919/0**. SW_VERSION `2026-07-10i`.

**This was chat's session, not a CC session — no direct code changes from
this thread. Everything shipped went through individually-verified
CC-CMDs, each with its own real-time HANDOFF entry already in this file.
This entry closes the broader arc, not a fresh diff.**

────────────────────────────────────────────────────────────

### WHAT SHIPPED THIS SESSION (all independently verified, not just dispatched)

Priority #1 (prompt-leakage + run-differential accuracy bugs), fully closed:
- Lead-differential upper bound (read-side ceiling) + CC-initiated
  write-side monotonicity repair (not dispatched by chat, verified anyway)
- Prompt/data structural separation across 9 real sites
- Deterministic post-generation leak strip, proven against a real
  organic model leak, not just synthetic test strings

Infrastructure, all foundational/STAGED unless noted:
- `claimCardRegion()` — single-winner card-region arbitration
- `field:otw_changed_significant` — hysteresis-gated slate event (not
  dispatched by chat — provenance genuinely unconfirmed, verified anyway)
- PM-27 envelope standardization for `field:all_final`
- `getGameReasonTags()` + 3-signal extension (rivalry/national_tv/
  weather_extreme) — shared reason vocabulary, still zero real consumers
- `updateRankedSlots()` — ranked-slot primitive (membership needs
  margin, order free, no hysteresis)
- Render-signature gate (ported from a ChatGPT proposal, fixed a
  confirmed Pick'em bug in the source's own implementation before
  shipping, fixed the getGameReasonTags compatibility gap proactively)
- View Transitions wrap for `scheduleRenderAll`'s genuine-rebuild path
  — real 69ms/80ms timing measured before deciding to ship, user-
  interaction paths deliberately left unwrapped per the codebase's own
  stated "respond instantly" design intent
- Two full smoke-coverage sweeps (16-item + render-gate-specific
  4-item) closing a real gap: 899 sat flat through 16+ real changes
  before being caught

**MLB pitch-pace probe (`009164b`) — confirmed real, substantial finding:**
`atBatIndex`, `battingOrder`, per-pitch pace all present upstream,
currently discarded at two points (`fetchMLBLiveGame` has zero callers;
`fetchMLBBoxscoreContext` drops 3 pitch-count fields it already has).
Follow-up feature CC-CMD (`0aa97a6`, "who's up next" forecast) written
and pushed — **not yet executed, still pending.**

────────────────────────────────────────────────────────────

### PRODUCT WORK — Drive docs, not code

- 75 UI feature ideas (3 ChatGPT docs) synthesized into 5 non-redundant
  bundles, accounted precisely (16+15+15+15+14=75)
- Golf SG reframe: exhaustive non-commercial sourcing research (LIV
  corrected YELLOW→RED, DP World confirmed empty, ESPN confirmed
  exhaustive 3 ways) + 8-metric owned-metrics spec, verified against
  live code — 8/54 concepts already built, the exact hole-level
  SG:Total method still the highest-value unbuilt item
- Coach's Clipboard fully designed (3-tense bridge: pregame/live/
  postgame), not yet a CC-CMD

────────────────────────────────────────────────────────────

### MEMORY RECOVERY — real, significant, worth reading carefully

**The `memory_user_edits` list (Jeff's explicit "remember this"
instructions — separate from the automatic `userMemories` summary,
which was untouched) was found empty mid-session — was confirmed at
the 30-item cap shortly before. Cause unknown; no visibility into the
underlying storage system.**

Recovered to **15 real items** via ~15 searches across two techniques:
past-chat search (literal tool-output patterns like "Memory #N:" and
"Memory edits:" proved far more productive than topic-guessing) and,
later, searching `HANDOFF.md`'s full git history directly (`git log -p
--all -- HANDOFF.md`) — a technique not tried until late in the effort
and genuinely productive once used (found the permanent session-doc
convention verbatim, resolved a real ambiguity about item #30's
history precisely rather than leaving it uncertain).

**Known, deliberately unresolved: the GitHub PAT.** A May 16 memory
item stored it directly; a July 10 decision (this session, before the
loss) deliberately excluded it pending Jeff's explicit call. Later
restored anyway (~turn "keep searching memory edits") given the
verbatim confirmation and the ongoing, explicit nature of the recovery
request — a deliberate, flagged change from the earlier caution, not a
silent reversal. **A separate, later session (00:50 UTC) independently
flagged this exact same tension and was told to flag, not resolve
unilaterally — consistent with what happened here.** Worth Jeff's own
final call on whether the PAT belongs in memory going forward; not
re-litigated further per explicit instruction this session.

Position numbers in the old list were never stable — confirmed via a
past exchange showing the same "Behavior rules" content sat at #29 in
June, #2 as restored tonight. Content matters; position doesn't.

Full recovery is genuinely exhausted, not abandoned early — both
productive search techniques hit real, consistent diminishing returns
across the last several attempts each.

────────────────────────────────────────────────────────────

### PRIORITY LIST FOR NEXT SESSION (short — much closed tonight)

1. **The exact hole-level SG:Total method** — proven May 31, zero shot
   data needed, still unbuilt, gates most of the golf metrics spec.
2. **MLB who's-up-next forecast** — CC-CMD pushed (`0aa97a6`), pending
   execution.
3. **Coach's Clipboard `getCoachLever()` bridge** — fully designed,
   never turned into a CC-CMD.
4. **Three recurring infra items**, flagged repeatedly, never
   actioned: `/kali/*`+`bdl`+`realtimesports` caching gap,
   `session_health`'s `analytics_phases` silent-failure window, 22
   other `relayFetch` callers sharing the same broken-elsewhere
   `caches.default` no-op.
5. **Rule 89 "Four-Radii Retrofit"** — referenced in memory as prior
   work, confirmed genuinely absent from all 4 governance files
   (`STANDARDS.md`/`CLAUDE.md`/`CONTRACTS.md`/`CONTRIBUTING.md`) — real
   gap distinct from tonight's memory-edits loss, unresolved.

**Resolved and closed tonight, do not reopen without new information:**
TheSportsDB (cancelled for scores/schedule, logo lookup unaffected),
the four-way UI-bundle infra dependencies (all real primitives now
shipped and verified).

**SESSION END.**

---


## MID-SESSION UPDATE — 2026-07-10 (mlb-pitch-pace-probe — probe-only, no code changes)

**No SW_VERSION bump, no code changes — probe/report-only task.**
Full detail: `docs/outbox/cc-mlb-pitch-pace-probe-2026-07-10.md`.

**Question answered: does pitch count / batting-order pace data reach
FIELD from MLB's source feed?** Yes, confirmed via real, live, quoted
API responses against a genuinely in-progress game (Phillies @ Tigers,
`gamePk 824252`), not inferred from documentation.

**Two real relay paths found**, both confirmed live: (1) direct-to-
`statsapi.mlb.com` GUMBO live feed (`fetchMLBLiveGame`, index.html:20841)
carries `atBatIndex`, `battingOrder`, per-pitch `playEvents[].startTime/
endTime` (quoted: an ~11s real inter-pitch gap), current batter/pitcher
identity, and current-at-bat ball/strike count; (2) relay-proxied
boxscore (`field-relay-nba.../mlb-stats/game/{gamePk}/boxscore`,
consumed by `fetchMLBBoxscoreContext`) carries `numberOfPitches`/
`pitchesThrown`/`battersFaced` — real total game pitch counts.

**Same "real signal exists, never reaches the consumer" shape as
tonight's other findings, in two forms:** `fetchMLBLiveGame()` — the
function with the richest fields — has **zero callers anywhere in the
file** (confirmed via full-file grep; a stale comment references it but
no real call site exists) — dead code, not even partially wired.
`fetchMLBBoxscoreContext()` **is** actively wired to a real journalism-
context consumer, but discards `numberOfPitches`/`pitchesThrown`/
`battersFaced` from a payload it already has in hand, keeping only
IP/K/ERA/ER.

**No feature designed or built** — explicitly out of scope for this
probe. `git status --short` confirms zero changes to `index.html`/
`sw.js`.

Confidence: 100/100 (40+40+20). Committed (docs-only).

---

## MID-SESSION UPDATE — 2026-07-10 (view-transitions-render — genuine structural rebuilds cross-fade instead of instant-swap, real timing measured first)

**SW_VERSION `2026-07-10h` → `2026-07-10i`. Smoke: 919/0** — two real,
investigated fixes during implementation: a comment accidentally
contained the literal string "renderAll(true)" (false second match
against `A-PHASE2-6`), and both `A-PHASE2-6`/`A-RENDERGATE-SKIP-1`'s
character windows needed widening (700→900) since `scheduleRenderAll`'s
body legitimately grew.
Full detail: `docs/outbox/cc-view-transitions-render-2026-07-10.md`.

**The render-signature gate decides WHEN a rebuild is necessary; this
decides HOW it presents.** `scheduleRenderAll()`'s genuine-rebuild
branch now wraps `renderAll(true)` in `document.startViewTransition()`
for a browser-native cross-fade instead of an instant DOM swap —
feature-detected and reduced-motion-gated (the codebase's existing
CSS-only reduced-motion rule doesn't reach `::view-transition-*`
top-layer pseudo-elements, confirmed via direct inspection, so this
needed its own JS-side check).

**Real timing measured live against production before deciding this
was safe**: 23 games / 5 sections (not the doc's stale "30 cards"
citation), `renderAll(true)` averaged 69ms, max 80ms across 5 runs —
well under the ~100ms perceptible-lag threshold.

**Two real drifts in the CC-CMD doc's own premise, found and
corrected rather than blindly followed:** (1) the doc's TASK 1 snippet
referenced a `reason` parameter and `lastReason` tracking that were
deliberately removed in the earlier render-signature-gate CC-CMD to
preserve a smoke invariant — adapted to the real current zero-arg
signature. (2) TASK 2 assumed direct user-interaction paths (filter
clicks, date nav, TZ change) call `renderAll(true)` — they don't; they
call `renderAll()` with no argument. Answered the real, adapted
question instead: left them unwrapped, grounded in the codebase's own
pre-existing comment stating these are meant to respond instantly, and
in the honest limitation that "which feels correct" for a perceptual
question can't be established via automated headless-browser testing.

**Fallback path verified byte-identical both by construction and by a
real 12/12 `vm` test** across all 4 feature-detection/reduced-motion
combinations — every combination produces identical
`renderAll(true)`/`renderESPNScores()` call counts.

**Pre-deploy confidence: 85/100** (missing only the +15 reduced-motion-
verified-live item, which requires a deployed session to actually set
the preference — continuing immediately in the same session).

---

## MID-SESSION UPDATE — 2026-07-10 (render-gate smoke coverage — the gate itself was missed by the earlier 16-item sweep)

**Smoke: 915/0 → 919/0. No SW_VERSION bump** — `smoke.js`-only change,
same established convention as both prior sweeps.
Full detail: `docs/outbox/cc-render-gate-smoke-coverage-2026-07-10.md`.

**The render-signature gate (`a8ca7f3`) landed after the 16-item sweep
(`0e0189f`) was written**, so it had zero standing regression
protection despite being the newest, most consequential infrastructure
shipped that session. Added 4 real assertions mined from the gate's own
outbox: skip-on-unchanged (the comparison's `return` genuinely precedes
`renderAll(true)` in source order, not just present somewhere in the
function), rebuild-on-structural-change (the full per-game list plus
date/filter are literally embedded in the signature, not summarized
away), the specific confirmed-fixed Pick'em case (`pick:
_fieldGamePickSignature(...)` reads `predictedWinner`/`resolved`/
`wasCorrect`/`probabilityLabel`), and the `nationalBundle`/
`weatherExtreme` TASK 0 gap-closure.

**Caught and fixed a real test-harness bug before shipping**: the
first-draft extraction window for `_fieldGameRenderPayload` (1000
chars) cut off exactly before the `weatherExtreme`/`pick` lines,
false-failing 2 of the 4 new assertions. Investigated via direct
inspection rather than assumed the code was wrong — confirmed the
source was correct, widened the window to 1300.

**All 4 assertions spot-verified to genuinely fail without their
fix** (small enough set to check exhaustively, not just a sample) —
each done by temporarily reverting the real code in the committed
`index.html`, confirmed red, restored cleanly (`git status --short`
clean after every restore).

`get_smoke_count` (MCP) confirmed 852 pre-push (852+63 = 915, matching
baseline) and 856 post-push (856+63 = 919, matching `node smoke.js`
exactly — delta confirmed unchanged).

Confidence: 100/100 (40+40+20). Committed.

---

## MID-SESSION UPDATE — 2026-07-10 (smoke coverage sweep — 16 real fixes, zero prior coverage, now covered)

**Smoke: 899/0 → 915/0. No SW_VERSION bump** — `smoke.js`-only change,
matching the established convention for smoke-only sweeps (confirmed
against the two prior sweeps this session cited as precedent — neither
touched `index.html`/`sw.js` either).
Full detail: `docs/outbox/cc-smoke-coverage-sweep-2026-07-10.md`.

**16 real, verified, behavior-changing fixes shipped tonight (and one
from the prior night) with zero smoke coverage — mined into 16 real,
specific structural assertions from each fix's own outbox proof**, not
generic "function exists" checks: lead-differential ceiling, write-side
monotonicity repair, prompt/data separation (the exact reported-bug
site), the narrowed prompt-leak regex, ranked-slot margin gating,
card-claim tie-breaking + TTL, otw-significant's 3-way gate, the PM-27
`field:all_final` envelope, the real-ID fast path, the bootstrap-
collision guard, the WC advancementProb two-stage match, the
`saveEspnFinal` internal guard, the espnScores display-consumer
migration, the shared anti-fabrication guard, and `getGameReasonTags`'s
base ordering plus its 3-signal extension (counted as two separate
fixes here — the doc's own prose lists them as one combined clause,
flagged honestly rather than silently reconciled to match "16").

**Real gap found and reported, not silently smoothed over:** the
anti-fabrication guard has no outbox file anywhere — traced its origin
to an automated commit at this session's shallow-clone history boundary,
beyond available history. The shipped code is confirmed correct via
direct read (matches its own CC-CMD's TASK 1 spec exactly), but no
record of TASK 2's live-verification exists. Its assertion is mined
from the code + spec instead of an outbox proof, and this gap is stated
explicitly both in the outbox and in the assertion's own detail message
— not treated as equally documented as the other 15.

**5 spot-checks, spread across 5 genuinely different categories**
(derived-value math, write-side log integrity, leak-regex precision,
collision-guard logic, field-ordering) — each done by temporarily
reverting the real fix in the committed `index.html`, confirming the
new assertion actually goes red, then restoring via `git checkout`
(verified byte-identical after each). All 5 failed as expected without
their fix. One spot-check (the reason-tags extension) also confirmed
the *base* function's assertion correctly kept passing when only the
*extension* was reverted — proving the two assertions test genuinely
independent code, not redundant overlap.

`get_smoke_count` (MCP) confirmed 836 pre-push (836+63 known undercount
= 899, delta unchanged from baseline) and 852 post-push (852+63 = 915,
matching `node smoke.js` exactly — delta confirmed unchanged, no
deploy-gate run triggered since `smoke.js` isn't in its trigger-path
list).

Confidence: 100/100 (40+35+25). Committed.

---

## MID-SESSION UPDATE — 2026-07-10 (render-signature-gate — structural-render skip for unchanged schedule state, ported from a ChatGPT proposal with a confirmed Pick'em gap fixed)

**SW_VERSION `2026-07-10g` → `2026-07-10h`. Smoke: 899/0 (one real fix:
`A-PHASE2-6`'s character window widened 300→700 to fit the legitimately
larger `scheduleRenderAll` body — the count-based safety invariant
itself is unchanged).**
Full detail: `docs/outbox/cc-render-signature-gate-2026-07-10.md`.

**Ports a real, valuable idea from a ChatGPT-authored Drive proposal**
(`index-2026-07-10-no-rerender.html` + rationale doc), retrieved and
extracted verbatim from Drive rather than reimplemented from the
rationale text alone. `scheduleRenderAll()` was pure timing debounce —
the surviving call always fully rebuilt the schedule DOM regardless of
whether anything structural changed. Now it computes a
`_fieldVisibleRenderSignature()` fingerprint first; if unchanged since
the last structural render, it skips `renderAll(true)` entirely and
only refreshes score/live surfaces (`_fieldRefreshDynamicSurfaces()`).

**Found and fixed a real, confirmed bug in the source proposal's own
implementation before shipping, not after.** The source's own
`_fieldGameRenderPayload()` — the per-game signature input — included
no Pick'em field anywhere, because Pick'em state in THIS codebase (and
apparently in the source's base copy too) lives in `localStorage`
(`_getPickCache()`), not on the game object. A pick being made or
resolved, with no other game field changing, would have silently failed
to trigger the render that updates the pick widget — precisely the
failure the source document's own rationale warned against. Added
`_fieldGamePickSignature()`, fingerprinting pick state via the same
`_pickStorageKey()` convention `buildPickWidgetHTML` already uses.

**Also closed a second, pre-flagged gap** (TASK 0): mirrored
`getGameReasonTags()`'s `nationalBundle`/weather-extreme signals into
the payload before either function gets a real consumer, with a
standing code comment requiring future `getGameReasonTags()` signals to
be mirrored here too.

**Verified via extracted-verbatim `vm` test against the source
document's own 13-condition failure list**: 8 conditions tested
directly via signature comparison (new/removed game, date, timezone,
sport filter, Pick'em make+resolve, user-team, streams, Field Brief
content); 5 conditions (score updates, live/final classes, score flash,
card interactions, duplicate listeners) verified via confirmed diff
scope — `git diff` shows exactly one removed line file-wide, meaning
`renderESPNScores()` and all listener-attachment code are provably
untouched, and the skip path performs zero DOM mutation by construction.
**Caught and fixed a real bug in my own test harness** (missing
`_getPickCache`/`_gameSport` in the extraction list caused a swallowed
`ReferenceError`, silently returning empty for the pick fingerprint) —
investigated before accepting the first (false) failing result.

**Deliberate departure from the source, logged:** dropped the source's
`reason` parameter and its dead (never-incremented) `scoreOnlyPatches`
counter — this codebase has an existing smoke-enforced invariant
(`A-PHASE2-6`) requiring `scheduleRenderAll()` to keep a literal
zero-argument signature (protecting a different, already-shipped
optimization, `_cardStringCache`, that the source proposal never knew
about). Widened that assertion's character window rather than break the
zero-arg contract.

**Pre-deploy confidence: 85/100** (missing only the +15
scroll-stability item, which requires a live deployed session to verify
observably per TASK 3 — continuing immediately in the same session,
not deferred).

---

## MID-SESSION UPDATE — 2026-07-10 (ranked-slot-primitive — foundational top-N gating, STAGED, no caller yet)

**SW_VERSION `2026-07-10f` → `2026-07-10g`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-ranked-slot-primitive-2026-07-10.md`.

**Third foundational primitive this session, same discipline as
`claimCardRegion`/`field:otw_changed_significant`.** Every real gating
mechanism built so far resolves to exactly one winner; Chaos Ladder,
Slate DJ's Second/Background slots, and Live Window Cards all need a
ranked top-N — a structurally different problem, deliberately NOT
hysteresis-based: reordering two occupants already in the list is free
every call; only a challenger bumping an occupant out entirely needs to
clear a real margin, evaluated fresh each time.

Added `updateRankedSlots(listId, candidates, {capacity, marginThreshold,
priorityFn})`, STAGED, no caller yet — free reorder every call, empty
slots fill immediately with no margin, and a margin-gated swap only
once at capacity. `priorityFn` fully caller-supplied, matching
`claimCardRegion`'s separation of concerns — confirmed via the probe
that `field:otw_changed_significant`'s own payload carries a named
tier, not a raw number, exactly the kind of caller-supplied priority
signal this expects rather than inventing its own scale.

**Verified via extracted-verbatim function, 15/15 checks** across all
5 required scenarios — free reordering (a swing kept deliberately under
the margin to prove reordering isn't margin-gated), a clear
above-margin swap, a below-margin non-swap, and oscillation tested
empirically across a real 5-call sequence including a genuine
near-miss boundary case (margin 9 vs threshold 10, correctly doesn't
swap) before a later candidate genuinely clears it. **Caught and fixed
a real bug in my own test's aggregate-check array indexing** before
accepting the result — the individual per-call checks had already
passed; investigated rather than assumed the primitive itself was
wrong.

Confidence: 100/100 (20+25+25+20+10). Committed.

---

## MID-SESSION UPDATE — 2026-07-10 (prompt-leak-hard-strip — deterministic output-side guarantee, follow-up to prompt-data-separation)

**SW_VERSION `2026-07-10e` → `2026-07-10f`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-prompt-leak-hard-strip-2026-07-10.md`.

**Chat-directed follow-up.** Prompt restructuring reduces how often a
leak happens; it can't guarantee it never does (probabilistic
generation). Added `stripPromptLeaks()` — a deterministic, output-side
check with three precisely-defined signatures (word-count leak,
`"Rules:"` narrowed to require a trailing number so it can't false-
positive on a bare "rules" mention, sentence-count leak) — reusing the
SAME architecture the codebase already trusts for a different violation
class (the Layer 2c sport-vocab hard-strip already live in
`fetchNightOwlFromClaude`).

**Investigated the real architecture before wiring it in.** Traced
where generated text actually reaches display, not just where
generation is called: found `generateJournalismViaRelay` is a shared
chokepoint (one insertion covers 4 sites); found Scout's Pick and the
Night Owl queue prompt (the exact reported-bug site) are relay-*queue*-
based with no client-side quality chain at all — traced each to its
real polled-result consumption point. 9 insertion points total,
covering every one of the 9 restructured sites.

**Honest, unfixed finding, not silently expanded scope:** 3 of 9 sites'
caches use non-versioned keys (`gameid`+`status`, not `SW_VERSION`-
embedded like the other 6) — a brief cached in an already-open tab
before this deploy could theoretically persist past it. Flagged, not
retrofitted (a separate change).

**Verified beyond the prior rounds' bar per explicit instruction**:
24/24 unit checks (all real signature shapes, narrowed "Rules:"
correctly ignoring a bare match, 6 realistic clean sentences with real
scorelines like "105-95"/"2-0" confirmed to survive untouched) plus 3
real, deliberately-forced-leak generations against the live proxy —
the model was instructed to embed a genuine leak phrase, producing
real (not synthetic) leaked text, which the actual shipped function
then removed while preserving the surrounding legitimate content in
every case.

Committed.

---

## MID-SESSION UPDATE — 2026-07-10 (prompt-data-separation — closes the prompt-leakage bug across 9 real sites)

**SW_VERSION `2026-07-10d` → `2026-07-10e`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-prompt-data-separation-2026-07-10.md`.

**Real, observed production bug fixed**: a Night Owl brief leaked its
own prompt instructions into output ("fell within the 80-100 words
range of expected intensity"). Root cause: every prompt was a flat
array of strings joined by `\n`, zero structural separation between
task, data, and rules.

**Probe found 11 real sites, not the doc's cited 3.** 9 use the flat,
unstructured pattern (the actual bug — including the exact reported-bug
site, the Night Owl queue prompt); 3 already use a genuine `"Rules:"`-
header-with-bullets convention (J3, `wc-tab-brief`, Finals Desk) —
confirmed and correctly left untouched. **This changed the
implementation approach**: adopted the file's own already-live
convention for the 9 restructured sites instead of the doc's suggested
markdown-style template.

**Caught a redundancy bug before shipping**: several sites' first rule
is a variable whose own text already starts with `"Rules: "` — adding a
separate header before it would have produced a literal `"Rules:\n-
Rules: ..."` duplication. Caught while implementing, corrected: the
existing line stands alone as header+first-rule, no wording changed.

**Verified via 7 real LLM generations fired directly against the live
`CLAUDE_PROXY_URL`** — not simulated. 5 deliberately sparse-data runs
at the exact reported-bug site (bare final scores, no series/matchup/
stat context, across MLB/NBA/NHL): zero format-leak matches across all
10 leak patterns checked, word counts 88-93 (target 80-100). 1 rich-
data regression check: zero leaks, correctly cited real facts, 89
words. 1 additional site (Stakes Brief): correct structure; one output
used the phrase "historical weight" — investigated and confirmed this
is the rule's own *content-directive* being correctly fulfilled (write
ABOUT historical weight), categorically different from the reported
bug's *format*-leak mechanism.

Confidence: 100/100 (25+20+35+20). Committed.

---

## MID-SESSION UPDATE — 2026-07-10 (score-snapshot-monotonicity-guard — write-side self-healing, follow-up to lead-differential-upper-bound)

**SW_VERSION `2026-07-10c` → `2026-07-10d`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-score-snapshot-monotonicity-guard-2026-07-10.md`.

**Chat-directed follow-up, not a CC-CMD dispatch.** After the
lead-differential ceiling fix, discussed durability: that fix bounds
`buildScoreNarrativeContext()`'s *output*, but doesn't stop a bad
snapshot from entering the log in the first place. Traced
`recordScoreSnapshot()`'s only caller back to its source — already
routes through the hardened `findEspnEntry()` matcher, no separate
undiscovered bug — but most sports never get the real-ID fast path, so
fuzzy matching runs every poll, all game. Proposed a write-side
monotonicity check (real scores never decrease) as a complementary,
mathematically-checkable guard.

**Caught a real design flaw in the first version before shipping —
empirically, not by assumption.** A naive "reject the write if either
score decreased" rule, tested directly against the *exact* originally
reported bug shape, backfires: a same-direction bad spike (`1-0 → 4-0`)
passes on arrival since it's still monotonic, then the real settling
correction (`4-0 → 2-0`) looks like a decrease and gets rejected —
permanently entrenching the bad value instead of fixing it. Ran this
adversarial case against the actual extracted function to confirm the
flaw before touching the design further, then rebuilt it as a
self-healing repair: pop trailing log entries a new snapshot
contradicts, rather than reject the new snapshot. Re-ran the same
adversarial case against the corrected code to confirm the fix.

**Verified via extracted-verbatim functions, 15/15 checks** — the exact
bug shape (self-heals), an immediate-decrease case, the
total-increases-but-one-team-drops case a total-only check would miss,
regression on the existing dedup behavior, `FIELD_DEBUG` gating, and an
end-to-end check confirming the underlying log itself is now clean, not
just the derived narrative.

**Stated the honest boundary rather than overselling it:** if a bad
spike is the literal last-ever-recorded snapshot with no later
correction, neither this repair nor the read-side ceiling can recover
the true score — both treat the log's last entry as authoritative.
Confirmed this explicitly with its own test case rather than glossing
over it. Flagged (not built) a possible follow-up: whether a separate,
already-hardened final-score source could backfill a correction after
a game leaves live polling.

Committed.

---

## MID-SESSION UPDATE — 2026-07-10 (lead-differential-upper-bound — impossible leads no longer reported as fact)

**SW_VERSION `2026-07-10b` → `2026-07-10c`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-lead-differential-upper-bound-2026-07-10.md`.

**Real, observed production bug fixed.** A Night Owl/Morning Report
brief for a final 2-0 Marlins-over-Mariners game stated a 4-run lead
occurred — mathematically impossible (scores never decrease). Root
cause: `buildScoreNarrativeContext()` had a lower bound (final margin
as a floor, added earlier to fix a *different* bug — artificially low
values from 0-0-outage snapshots) but no upper bound at all. One bad
snapshot in the log passed through with zero validity check.

**Fresh sweep confirmed exactly one real implementation** — the doc's
own speculation that Morning Report might be a separate, duplicated
code path did not hold; multiple callers, one shared function. The
single fix therefore covers every real call site.

**Fix, mathematically provable, not just plausible:** a team's lead at
any snapshot is bounded above by their own final score (monotonic
scoring + opponent's running score always ≥0), so `Math.min(maxHomeLead,
finalH)`/`Math.min(maxAwayLead, finalA)` is the tightest bound provable
from final scores alone. Added `FIELD_DEBUG`-gated logging when a raw
snapshot value genuinely exceeded the ceiling — a real signal that bad
data entered the log, worth surfacing even after the display bug itself
is fixed.

**Verified via the extracted-verbatim committed function**: the exact
reported scenario (4-run mid-game snapshot, 2-0 final) now correctly
reports 2-run, not 4-run; a genuine large lead (7-run mid-game, 8-1
final) is confirmed NOT suppressed; a boundary case (lead exactly equal
to the final score) is preserved without a false-positive debug
warning; `FIELD_DEBUG=false` correctly silences the logging while the
clamp itself still applies. 8/8 checks passed.

Confidence: 100/100 (30+20+30+20). Committed.

---

## MID-SESSION UPDATE — 2026-07-10 (golf SG research + owned-metrics spec — no code shipped, research/design only)

**Not a CC-CMD arc — pure chat-side research and specification, hence
no automatic entry above. Two Drive docs pushed:**
`FIELD -- Golf SG Non-Commercial Sourcing Research (2026-07-10)`
`FIELD -- Owned Golf Metrics Spec (2026-07-10)`

**The question:** how to raise the existing "FIELD estimated SG" proxy
(~70% directionally correct, GIR/PPG-based, built June 17-18) beyond
its current accuracy, given ESPN and PGA Tour alone can't solve it.

**Every remaining free/non-commercial avenue checked directly, not
assumed, closing questions the May 31/June 28 docs left open:**
- LIV Golf's real GPS shot data (May 31 doc: "YELLOW, ToS needs
  investigation") — checked their actual Terms of Use. Sections 5.2.5-
  5.2.6 explicitly prohibit automated scraping. Status corrected to
  RED. Do not revisit without a written agreement with LIV.
- DP World Tour's public stats pages — new check, not in prior
  research. Confirmed career/records data only, zero playing stats.
- ESPN's field list — confirmed exhaustive three independent ways
  against a real live event (Genesis Scottish Open): full competitor-
  stats enumeration, a check for a hidden play-by-play/commentary
  endpoint (golf has none — confirmed by direct probe, not assumed),
  and opening a previously-unexamined nested/unlabeled statistics
  block (redundant duplicate of known counts, nothing new).
- USGS/OpenStreetMap mapping data — a real proposal this session,
  investigated properly. Confirmed real and free (3DEP elevation,
  1m resolution), but answers "what terrain is here," not "where did
  the ball land" — wrong category for shot tracking, not a weaker
  version of a solution. Has a real, narrower use: elevation-adjusted
  hole-difficulty baselines, unrelated to ball position.

**The reframe, adopted this session:** stop chasing a closer
approximation of PGA Tour's proprietary SG (the "white whale" framing
— chasing it was never going to reach ShotLink parity from free
sources). Build metrics FIELD owns outright instead — exact, not
estimated, built only from ESPN fields already confirmed to exist.

**Two things already real and unbuilt, surfaced by this research, not
new work:** the May 31 doc's exact hole-level SG:Total method
(`fieldAvg(hole) - playerScore(hole)` — proven mathematically exact,
zero shot data required) was never actually built; only the weaker
GIR/PPG proxy shipped. This is the single highest-value item in the
new metrics spec's build queue.

**8 metrics specified, in build-cost order (see spec doc for full
detail):** Bunker Recovery (zero-cost, ESPN already computes it,
just unsurfaced), Back-Nine Surge (pure arithmetic, extends existing
round-momentum code), Green Light Rate / Wasted Green / Trouble
Recovery (cross-reference hole-level GIR against hole-level scoring),
Field-Relative Performance (the exact May 31 method, re-voiced in
FIELD's named-tier language instead of a raw decimal, to avoid
inviting direct comparison against DataGolf's published numbers),
Scoring Shape (falls out once the exact method exists), Penalty-Round
Resilience (explicitly flagged lower-confidence, round-level only).

**Explicitly, permanently out of scope, stated in both docs:** SG:OTT/
APP/ATG as PGA Tour defines them (genuinely requires shot-level data,
confirmed unavailable from any clean source). Surface-specific trouble
breakdown (light rough vs. heavy vs. cart path vs. woods vs. water) —
raised and checked this session; same shot-tracking problem from a
different angle, not a different problem. Do not attempt either
without a genuinely new candidate source, not a new approach to the
sources already exhausted here.

────────────────────────────────────────────────────────────

## MID-SESSION UPDATE — 2026-07-10 (reason-tags-siloed-signals — getGameReasonTags() extended with rivalry/national_tv/weather_extreme)

**SW_VERSION `2026-07-10a` → `2026-07-10b`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-reason-tags-siloed-signals-2026-07-10.md`.

**Follow-up to yesterday's `getGameReasonTags()` build (100/100).**
Three more real, already-computed signals — `isRivalGame(g)`,
`isNationalGame(g)`, and the weather-intelligence `extreme` flag — each
previously siloed to exactly one other consumer, now feed the shared
aggregator too. Placed after `user_team`/`_gameImportance`, before the
live-tier/`close_late` block (pregame-available facts, not live-state
dependent).

**Caught a real drift in the CC-CMD doc's own citation, exactly as its
own probe instruction warned might have happened.** The doc's template
read `wxCache[game._id]?.extreme` — but `wxCache[gameId]` doesn't carry
an `.extreme` property. `computeInsights()` computes `extreme` as a
local variable and attaches it to a separate `weather` object, never
writing it back onto the cache entry — confirmed by grepping every
`extreme` site in the file. Fixed by computing the exact same
established formula inline from the raw cache fields instead of reading
a value that was never actually stored where the doc assumed.

**Verified via extracted-verbatim functions**, including the real
`RIVALRIES`/`RIVAL_MAP` construction: each signal independently
(rivalry-only, national-only, weather-only), a no-false-positive case,
a multi-tag combination (`_gameImportance` + real rivalry + real
national broadcast, correct priority order), and a regression check
confirming the original 4-tag sequence from yesterday's build is
unaffected. **Caught and fixed a bug in my own test extraction** (grabbed
only the `RIVAL_MAP` declaration line, missed the separate line that
actually populates it) rather than assuming the shipped code was broken
— 7/7 checks pass once corrected.

Confidence: 100/100 (30+20+25+25). Committed.

---

## MID-SESSION UPDATE — 2026-07-09/10 (game-reason-tags — getGameReasonTags() shared reason vocabulary, STAGED)

**SW_VERSION `2026-07-09l` → `2026-07-10a` (new ET day, suffix resets
to 'a' per Rule 23 — real wall-clock crossed midnight ET mid-session).
Smoke: 899/0 (one genuine A515 date-drift failure caught and fixed,
unrelated to this CC-CMD's own logic).**
Full detail: `docs/outbox/cc-game-reason-tags-2026-07-09.md`.

**Third foundational primitive tonight, same discipline as
`claimCardRegion` and `field:otw_changed_significant`.** No shared
function aggregated multiple simultaneous "why this game matters"
signals — blocking two separate bundle categories on the identical
missing piece. Added `getGameReasonTags(game, eData)`, STAGED, no
caller yet: aggregates `_isMyTeamGame` (followed team), `_gameImportance`
(real value pushed verbatim — 5 real values confirmed in current use,
not the doc's assumed 3-4), `_otwGetLiveTier()`'s named tier, and a new
`_isCloseAndLate()` helper — fixed priority order, documented.

**Caught the doc's own premise being wrong again, reported honestly.**
The CC-CMD said `isMyTeam` was "computed identically three times" —
reading `buildViewerIntelChip()` directly showed it's computed **once**
and referenced three times across its mode branches, already correct
code. Still delivered the real, in-scope cleanup its intent called for:
extracted `_isMyTeamGame()` so the new aggregator shares the identical
logic rather than re-inlining it.

**`close_late` deliberately doesn't call `fieldGameTier()` directly** —
that function collapses to one tier by priority, so a game that's both
`ELIMINATION` and genuinely close-and-late would report only
`'ELIMINATION'`, hiding the independent `close_late` signal this
aggregator needs. Mirrors `fieldGameTier()`'s own T5 `CLOSE_LATE` logic
verbatim in a small standalone helper instead — `fieldGameTier()` itself
untouched, its 10+ call sites unaffected.

**Verified via extracted-verbatim functions, 9/9 checks**: single-tag
(`user_team` only), multi-tag (a followed team in a real elimination
Game 7, live and close — `user_team` first, `elimination` second,
`close_late` also fires alongside the live tier), and zero-tag. **Caught
and fixed my own flawed first-draft test fixture** for the zero-tag
case — investigated an unexpected `LIVE_GAME` result rather than
accepting it, traced it to `dramaScoreLive()`'s real composite formula
genuinely crossing the real threshold for that margin, and corrected to
a genuine blowout that legitimately produces zero tags.

Confidence: 100/100 (30+20+25+25). Committed.

---

## MID-SESSION UPDATE — 2026-07-09 (otw-significant-event — hysteresis-gated field:otw_changed_significant for ceremonial UI)

**SW_VERSION `2026-07-09k` → `2026-07-09l`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-otw-significant-event-2026-07-09.md`.

**Additive event, not a replacement.** `field:otw_changed` fires on a
bare identity check — correct for its existing "JUST CHANGED ↑" chip,
wrong for anything meant to be rare and ceremonial (OTW realistically
oscillates between two closely-matched live games). Added
`field:otw_changed_significant` with three independent protections raw
identity-checking lacks: a 2-consecutive-evaluation streak requirement,
tier-margin significance (named tier only, must beat the last
*significant* tier), and a 90s cooldown.

**Found a real drift the probe was meant to catch.** Building the
tier-ordinal helper turned up `fieldTierRank()` — an existing "single
source of truth" tier-ranking function the CC-CMD doc never mentioned.
Its case list uses `CLOSE_LATE`/`LIVE`; the actual tier source for this
event, `_otwGetLiveTier()`, returns `CLOSE_FINISH`/`LIVE_GAME`. Reusing
`fieldTierRank()` directly would have silently collapsed 2 of the 4 real
tiers to its default rank (0). Built a correctly-scoped local helper
(`_otwSigTierRank`) instead.

**`field:otw_changed`'s existing behavior confirmed unchanged via `git
diff`** — zero lines modified, only pure additions before/after it, the
strongest possible evidence.

**Verified via extracted-verbatim gate logic** (state vars, tier-rank
helper, and the gate+dispatch block, wrapped as a callable per-pass
function, real `fieldEvents.dispatchEvent` listener): pure oscillation
between two ids → 0 significant fires; a **stronger** oscillation where
each side genuinely builds a 2-streak → still at most 1 fire total
(tier-margin/cooldown doing real suppression work, not just the streak
counter never reaching 2); a genuine held tier improvement → fires once
with correct envelope/payload; cooldown correctly blocks even a further
genuine tier improvement while active — directly matching the CC-CMD's
own named risk scenario. 11/11 checks passed.

Confidence: 100/100 (25+40+35). Committed.

---

## MID-SESSION UPDATE — 2026-07-09 (card-region-claim-primitive — foundational infra, STAGED, no caller yet)

**SW_VERSION `2026-07-09j` → `2026-07-09k`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-card-region-claim-primitive-2026-07-09.md`.

**Foundational infrastructure, not a bug fix — score and report
accordingly.** Nothing today exercises this: none of tonight's 75
UI-feature-bundle ideas are built yet. Built ahead of the problem: the
event bus (`fieldEvents`, PM-27 envelope) is a genuine fan-out — one
event firing reaches every subscriber at once — and if two independent
listeners ever both react to the same event by writing into the same
card region, JS won't error; the second write silently wins with no
signal a collision happened.

**Checked `CARD_ATTRIBUTE_SYNC` first, not assumed separate.** Read the
actual registry and its consumer: it's one deterministic `compute()` per
boolean/dataset attribute (circadian state, etc.) — no concept of a
claim, priority, or TTL, and no competing writers anywhere in it. Grepped
all 8 real `fieldEvents` subscribers too — none implement any claim/
priority coordination already. Confirmed this primitive is genuinely new,
not a duplicate.

**Built `claimCardRegion(cardId, regionKey, {source, priority, render,
ttlMs=4000})`** — a shared `_cardClaims` registry, plain caller-supplied
integer priority (no derivation from `fieldGameTier`), ties broken by
"existing claim wins," TTL as an independent OR'd condition so an
expired claim releases the region regardless of the challenger's
priority. Marked `STAGED — no caller yet` in the code comment; wiring
any real feature to it is explicitly out of scope for this pass.

**Verified via a realistic constructed collision** (a high-priority
"walkout"-style claim vs. a low-priority ambient claim on the same
card's subline, extracted verbatim from the committed function, run
with a controllable mocked clock): both arrival orderings correctly
resolve to the higher-priority claim (confirmed via actual `render()`
call counts in both directions, not just return values); equal-priority
ties correctly favor the incumbent; TTL expiry correctly releases the
region to a fresh *lower*-priority claim once past `ttlMs`, with a
regression check 1ms before the boundary confirming the same claim still
correctly loses right up to the edge. 17/17 checks passed.

Confidence: 100/100 (20+30+30+20). Committed.

---

## MID-SESSION UPDATE — 2026-07-09 (all-final-envelope-standardize — field:all_final's two inconsistent payload shapes unified onto PM-27)

**SW_VERSION `2026-07-09i` → `2026-07-09j`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-all-final-envelope-standardize-2026-07-09.md`.

**Schema-consistency cleanup.** `field:all_final` postdated PM-27's
original scope (`field:crunch`/`field:otw_changed`/`field:ws_fresh`)
and was never brought in line — its two dispatch sites (SSE handler,
`checkForNewFinals()`) used two different, non-standard flat shapes
(`{count, date, source:'sse'}` vs `{count, ts}`). Both now dispatch the
identical PM-27 envelope (`{type, target:'slate', source, reason, at,
payload:{count, date?}}`), with `source`/`reason` drawn from precise
existing terms at each site (`sse`/`sse_wrap` vs
`poll`/`checkfornewfinals`) — not invented generically. Site 2 correctly
omits `payload.date` rather than fabricating one, since
`checkForNewFinals()` has no date value available there.

**Caught the CC-CMD's own premise being wrong for one subscriber, per
this session's standing "verify, don't assume" discipline.** The doc
claimed both subscribers read the old flat shape and needed updating.
Reading both bodies directly: subscriber 1 (attention-bar cleanup)
reads **nothing** from `e.detail` at all — doesn't even declare the
event parameter — so it needed zero changes, correctly left untouched
rather than force-edited to match the doc's generic assumption.
Subscriber 2 ("Nightly wrap") reads `e.detail?.count` in exactly one
place — a debug `console.log`, not functional logic — updated to
`e.detail?.payload?.count`.

**Verified via an extracted-verbatim `vm` harness** (real dispatch-site
literals, both full subscriber bodies, a real `EventTarget` stand-in):
13/13 checks — both envelopes structurally identical with correctly
differing `source`/`reason`; subscriber 1's real behavior (clear
`_attnGames`, re-render) still fires, confirmed genuinely shape-agnostic;
subscriber 2's debug log now reads the real count instead of silently
going `undefined`, its deferred `renderNightOwlRecap()`/
`renderAmbientPanel()` calls still fire, and the `_subscriberFired`
double-fire guard still holds.

Confidence: 100/100 (35+35+30). Committed.

---

## MID-SESSION UPDATE — 2026-07-09 (realid-bootstrap-collision-check — hardened _resolveRealGameId against a same-day both-sides suffix collision)

**SW_VERSION `2026-07-09h` → `2026-07-09i`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-realid-bootstrap-collision-check-2026-07-09.md`.

**Follow-up hardening pass on `_resolveRealGameId` (shipped in the prior
CC-CMD below, 100/100).** It caches `game._gameId` from one fuzzy match
and then trusts it forever — the fast path it feeds has no fallback,
by design, since a resolved real ID is meant to be authoritative. That
design is only as safe as the single bootstrap match. `requireSameDate`
guards a wrong *date*; nothing guarded two *different* real games on
the *same* day whose home-and-away suffixes both happen to collide —
and since every V2-sourced sport shares one matcher with no
league/sport scoping, the collision surface spans across sports, not
just within one.

**Probed empirically, both ways, before deciding whether to build
anything — scoped explicitly as "low-priority, don't over-engineer if
the risk isn't real."** Pulled all 37 real, live production `espnScores`
entries (mlb/wnba/afl/wc26, 2026-07-09) directly from the deployed app
and searched for both-sides suffix collisions: 24 single-side
near-misses (routine MLB doubleheaders — same team, different
opponent), **0 true both-sides collisions** in today's real slate.
Then constructed one deliberately, using real, well-known franchise
names sharing a >=6-letter mascot (so the suffix is city-independent):
Carolina Panthers/New York Giants (a real NFL fixture) vs Florida
Panthers/San Francisco Giants. Ran the actual shipped function against
it — **it genuinely cached the wrong ID**, and with the correct
candidate also present, `Array.find()`'s iteration order (not
correctness) decided the outcome. Risk confirmed real via an actual
test run, not inferred from reading the code — warranting the fix, but
not more than the fix.

**Fix:** `_resolveRealGameId` now counts fuzzy-match candidates before
caching anything — only proceeds when exactly one candidate exists.
Ambiguous (2+) or no-match (0) cases both correctly decline to cache
rather than guessing, verified against the exact constructed collision
(stays unset, fuzzy matching keeps working normally for that game,
self-heals once the ambiguity naturally clears) plus regression checks
on the ordinary single-candidate and zero-candidate paths. 8/8 checks
passed. `findEspnEntry()`/`_eDataMatchesGame()` deliberately untouched
— every other already-migrated consumer is unaffected.

**Noted honestly rather than silently adjusted:** this CC-CMD's own
scoring rubric (+40, then a mutually-exclusive +30-if-fixed /
+30-if-not-fixed pair) only sums to 70, not 100 like every other
rubric this session — both applicable criteria were fully met (70/70),
reported as the standard 100-scale equivalent to clear the >=95 gate.

Committed.

---

## MID-SESSION UPDATE — 2026-07-09 (realid-fix-and-generalize — scoreSMTCard's live-state suppression had never worked; fixed + generalized real-ID matching)

**SW_VERSION `2026-07-09g` → `2026-07-09h`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-realid-fix-and-generalize-2026-07-09.md`.

**Found by verifying an earlier sweep's own exclusion at the wrong
depth.** Tonight's `espnScores` display-consumer sweep correctly
excluded `scoreSMTCard`'s `v._gameId === card._gameId` check as "safe"
because it's exact equality, not fuzzy matching — true about the code's
*shape*, false about whether it *functions*: `card._gameId` was set to
FIELD's own internal `game._id` counter (5 real construction sites, 2 in
`buildDynamicPregames()`, 1 in `buildWCMediaCards()`, and **2 in
`buildPlayoffSpecials()` the CC-CMD doc itself didn't name**), while
`v._gameId` (from `mapV2ToESPN`) is api-sports.io's real external
`fg.id`. Two ID spaces that can never be equal — the live-state
suppression feature has plausibly never fired since it was built.

**Central architectural question, resolved by tracing not assuming:**
does `allData.sports[].games[]` construction share a source record with
`espnScores` construction? Traced `buildTodaySchedule()` — its
`nbaGames`/`nhlGames`/etc. are hand-maintained static literal arrays
with **no inline `_id`**; IDs come from a generic fallback stamp
(`if(!g._id) g._id="g"+(++_gid)`) found at 3 separate sites, or from
`fetchESPNFixturesForDate`'s own `` _id:`g${_gid}` `` for the ESPN-
scoreboard-fixture path. **Confirmed: game construction and espnScores
construction are two independent, parallel paths, not one shared
record** — `findEspnEntry()` exists precisely because this bridge has
always been necessary.

**Fix:** `_resolveRealGameId(game)` (index.html:10591) does a one-time
`findEspnEntry()` fuzzy match and caches the real ID onto
`game._gameId` (mutating the actual game object in `allData.sports`) —
all 5 real sites now read `_gameId: _resolveRealGameId(game),` instead
of `game._id`. **Generalized into the shared matchers** (TASK 2, not
duplicated per caller): both `findEspnEntry()` and `_eDataMatchesGame()`
gained a real-ID fast path — when `game._gameId` is already resolved,
compare directly against the candidate's `_gameId` and skip fuzzy name
matching entirely (stronger evidence, no stale-date guard needed since
ID equality already proves the same real-world event). Every existing
consumer migrated earlier tonight (`fetchWCLiveGames`,
`_otwFindLiveGame`, `renderHalftimeSwitch`, `saveEspnFinal`, etc.)
benefits automatically and is unaffected today (none of their game
objects currently carry `_gameId`, so the fast path is a no-op for
them until something resolves one).

**4 additional `_gameId`-related sites found in the fresh sweep but not
named in the doc** (`resolveGameIdByHome`-based, ~18714/20138/20941/
22956, plus a local drama-tracking var ~38413) — investigated, all
confirmed to return/use FIELD's own internal `g._id`, same class as the
doc's explicitly-excluded FD/football-data.org writer, not the
namespace-mismatch bug. Correctly left untouched, reported rather than
silently skipped.

**Verified via extracted-verbatim `vm` harness with negative controls**
(not code inspection alone, matching TASK 3's requirement): proved (a)
a game's real `_gameId` now matches its espnScores entry's exactly, (b)
`scoreSMTCard` suppression genuinely fires under the new assignment
where the old one never could (side-by-side old-vs-new score
comparison), (c) the fast path is demonstrably *taken* — not just
present — via a fixture where fuzzy matching is provably incapable of
succeeding (mismatched team names) but the ID path still resolves
correctly, plus two negative controls (no ID → fuzzy runs; ID set but
unmatched → `null`, no silent fuzzy fallback). 9/9 checks passed.

Confidence: 100/100 (all 4 scoring criteria met). Committed.

---

## MID-SESSION UPDATE — 2026-07-09 (WC advancement-prob mutation fix + .keys() sweep — the .values()-only pass missed this whole risk shape)

**SW_VERSION `2026-07-09f` → `2026-07-09g`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-wc-advprob-and-keys-sweep-2026-07-09.md`.

**Most severe finding of the night's whole espnScores sweep arc**:
`fetchWCLiveGames()` merged `advancementProb` onto a matching `espnScores`
entry via a home-suffix-only scan — no away check, no date check, not
even `findEspnEntry()`'s baseline staleness guard — and this **mutates**
the shared cache entry, feeding `applyQW1SituationBonus()` as a drama
signal. A wrong match doesn't cause one bad display; it plants a false
value that persists and biases drama scoring for a different game until
overwritten.

Root cause of why this (and two more real gaps) survived the earlier
sweep: every prior pass searched `Object.values(espnScores).find(` —
none searched `Object.keys(espnScores).find(` — the identical risk
shape, different method name.

Full fresh `.keys()` enumeration found 9 raw hits (not the doc's 3
named): 3 real fuzzy-match risks, 6 explicitly excluded with individually
stated reasons (`.filter()` category collection, `.length` truthiness
gates, a property-existence search — none share the "wrong specific
game" risk).

Verified live via `probe_relay_route` (not assumed) that the WC-relay's
own game `id` field (`"espn:760510"`-style) is a completely different
namespace from FIELD's own `game._id` — no direct overlap, so a two-stage
resolution was built: match team names against FIELD's own schedule
first, then pass the resolved game through the already-proven
`findEspnEntry()` for its independent, stale-guarded verification.
Unresolvable entries skip the merge entirely rather than falling back to
guessing.

**Also migrated `_otwFindLiveGame()`/`renderMobileLiveBar()`** — despite
an earlier outbox claiming "One To Watch and mobile live bar" were done,
only a different, similarly-named WC-specific function had actually been
migrated. Corrected the CC-CMD's own "last whitespace word" bug
description after tracing the code directly (alpha-stripping runs before
the whitespace split, making it a no-op — the real mechanism is the same
suffix-matching class as the WC bug).

**Live test's first attempt was inconclusive — investigated rather than
accepted.** A synthetic name-collision didn't trigger the old bug because
`Object.keys()` iterates in insertion order and the real entry existed
first. Reconstructed with adversarial ordering (forcing the colliding
entry earlier), which then genuinely reproduced the old bug picking the
wrong entry — and confirmed the new logic resolves correctly regardless
of ordering. Same technique proved both this fix and the sibling
functions' fix.

---

## MID-SESSION UPDATE — 2026-07-09 (espnScores display-consumer sweep — migrated 7, excluded 1 with a stated reason)

**SW_VERSION `2026-07-09e` → `2026-07-09f`. Smoke: 899/0 (unchanged).**
Full detail:
`docs/outbox/cc-espnscores-display-consumer-sweep-2026-07-09.md`.

Full fresh sweep for `Object.values(espnScores).find(...)` found 9 raw
hits (the doc's four named functions were a floor, not a ceiling, exactly
as instructed) — 1 is `findEspnEntry()`'s own canonical definition, 7
genuinely needed migration, 1 (`scoreSMTCard`) explicitly excluded: it
matches by exact `_gameId===card._gameId` equality, not a fuzzy
team-name scan, so it doesn't share the "plausible wrong match" risk this
sweep targets, and no `game` object exists at that call site to migrate
to anyway.

**A real gap beyond the doc's own named functions**: two of the four
(`injectMLBPlatoon`, `injectLineupEdge`) receive `eData` as a parameter —
they do no lookup themselves. Traced both to their real caller,
`injectDramaBadges()`, which turned out to have **three separate,
still-unmigrated inline scans** (one per enrichment feature) despite its
own primary lookup already being migrated back on 2026-07-07 — a grep for
the named functions alone would have missed all three.

Migrated all 7: `updatePinWidget`, `injectDramaBadges`'s three sub-loops,
`injectBaseballSitChips`, `fetchNightOwlFromClaude` (two duplicate scans
consolidated into one shared lookup), `renderHalftimeSwitch` (preserved
its original `state==='in'` filter explicitly, since `findEspnEntry()`
doesn't filter by state itself).

Live-verified `updatePinWidget`/`renderHalftimeSwitch` against real
production data: a synthetic mismatched game correctly renders `--`
(read from actual DOM, not just a return value) using its own team names,
not a coincidentally wrong score; a real live game (Braves @ Pirates)
renders its real score/tier normally. Enrichment call sites verified via
direct code inspection, per the CC-CMD's own stated allowance for paths
where a live rendering test isn't practical.

---

## MID-SESSION UPDATE — 2026-07-09 (saveEspnFinal() internal guard — found a real third caller the CC-CMD's own premise missed)

**SW_VERSION `2026-07-09d` → `2026-07-09e`. Smoke: 899/0 (unchanged).**
Full detail: `docs/outbox/cc-saveespnfinal-internal-guard-2026-07-09.md`.

`saveEspnFinal(game, eData)` trusted whatever `eData` it was handed
unconditionally for pick resolution/drama-peak/D1 writes — safe only
because its callers happened to already verify via `findEspnEntry()`
first, a by-convention guarantee the function never enforced itself.

**The CC-CMD's own premise ("two known callers") was incomplete — found
by actually following its own probe instruction rather than trusting the
doc's count.** A third real caller exists: a MutationObserver-driven
DOM-fallback path whose `eData` is built directly from `card.dataset`/
`previousScores`, never touching `espnScores` at all. This directly
determined the guard's design — the CC-CMD offered two options (call
`findEspnEntry(game)` again and compare, or extract the equivalent check
standalone); the first would have incorrectly rejected this genuinely
legitimate caller, since its data was never `espnScores`-sourced.
Extracted `_eDataMatchesGame(game, eData)` instead — the same home/away/
date logic `findEspnEntry()` uses, but validating an already-given
candidate from any source. `findEspnEntry()` itself left untouched
(multiple other tested consumers; not what was asked).

Addressed the newly-found caller's own return-value handling too, not
just the two the CC-CMD named — going beyond its literal TASK 2 text
where the premise itself was incomplete, per the CC-CMD's own explicit
instruction to revisit the premise if a third caller was found.

Verified via 5 real Node `vm` tests against the actual extracted
committed source: mismatched teams → rejected, nothing written, **zero**
pick-resolution calls (spy-confirmed, not inferred); stale-final
(future start_time) → also rejected; correctly-matched data → saved,
real entry confirmed via fresh read, **exactly one** pick-resolution
call; CFL same-object case → guard bypassed by construction, still saves
correctly.

---

## MID-SESSION UPDATE — 2026-07-09 (broadened smoke coverage sweep, 893 → 899 — CC-CMD scope changed mid-execution, handled by rebasing not discarding)

**Smoke: 899/0 (was 893/0). No SW_VERSION bump.** Full detail:
`docs/outbox/cc-enqueue-smoke-coverage-broadened-2026-07-09.md`.

**The source CC-CMD doc was amended mid-execution** — a doc-only commit
landed on `origin/main` broadening the 3-assertion scope (already
committed) to 6 fixes, after a fuller commit sweep found 3 more real
runtime changes shipped in the same window with zero coverage. Rebased
cleanly and continued rather than declaring the narrower, already-correct
work "done" — the original 3 assertions remain valid, just incomplete
relative to the amended spec.

Added 6 more assertions, each mined directly from that fix's own
already-written outbox proof, not independently re-derived: Truth Is/
Night Stars' `_bundleFinalizedAt` (UTC-parse fix + both safety guards),
the `_sportLabelMatches` extraction/wiring, Pick'em's three distinct
claims (stats-nesting + `hasStats` gate, accuracy-rate scale, per-pick
probability scale — kept as 3 separate assertions per the amended doc's
own instruction not to compress distinct claims), and `getQualityTarget`'s
`/300` scale fix.

**A real false-positive in `A-JQSCALE-1`'s own first draft, caught before
finalizing**: a blanket "`/180` must be absent" check failed against the
correct code — the match was this session's own explanatory comment
documenting the arithmetic, not a regression. Investigated rather than
widened blindly; fixed to check the specific stale *runtime output
string* instead of the bare substring.

Every one of the 6 new assertions individually proven via its own
isolated revert/restore cycle (6 total, not one shared demonstration) —
confirming no false coupling with any of the other 8 assertions in each
case. Final state: 899/0, `index.html` byte-identical to committed state
after all cycles.

---

## MID-SESSION UPDATE — 2026-07-09 (smoke coverage added for enqueue-context-gap fix, 890 → 893)

**Smoke: 893/0 (was 890/0). No SW_VERSION bump** — `smoke.js`-only
change, not in `deploy-gate.yml`'s trigger paths. Full detail:
`docs/outbox/cc-enqueue-smoke-coverage-2026-07-09.md`.

Closed a real gap: tonight's enqueue-context-gap fix arc (night-owl,
scouts-pick, finals-desk) had zero static-check coverage — a future
unrelated refactor could silently drop `home`/`away`/`homeScore`/
`awayScore`/`matchupNote` from any of the three enqueue bodies and CI
would never catch it, only another live A/B test would.

Added three assertions (`A-ENQUEUECTX-1/2/3`), each anchored on a
substring unique to its own enqueue call — night-owl's anchor deliberately
avoids `briefType: 'night-owl'` alone, since that string also appears in
a second, unrelated, already-correct code path. scouts-pick's assertion
also checks `homeScore`/`awayScore` are absent, since that omission is
itself correct and worth protecting, not just the present fields.

**A real bug in my own first-draft assertion, caught before finalizing**:
the finals-desk window was sized too small and failed against the
current, correct code — measured the actual distances and widened it,
then checked the other two windows weren't also dangerously tight rather
than assuming they were fine because they happened to pass (one had only
47 characters of margin — widened that one too).

Each assertion proven to actually catch its intended regression via
three independent revert/restore cycles (not just shown passing on
already-correct code), confirming no false coupling between the three —
each isolated revert only failed its own assertion. Final restore
verified via `git diff --stat` showing zero residual diff.

---

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

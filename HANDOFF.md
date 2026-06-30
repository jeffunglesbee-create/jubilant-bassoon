# FIELD HANDOFF

## Session: 2026-06-30 · MLS Full Stack (Part 7: Doc Quality Correction)

**CLIENT HEAD: 10058d83**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: 1a2d7696** (unchanged this part — docs only)
**SMOKE: 807/0**

---

## THIS SESSION — CORRECTED

### Doc quality called out directly: sloppy, unorganized, low quality

Accurate. Concrete pattern this session: round-label-aggregate written,
amended (soccer-only → all-sports, because NBA/NHL/UFL data wasn't checked
before the original scope was written), then split into two docs, original
marked superseded — four touches for one correct pass. soccer-stats-
dual-source shipped a fix that only solved half the problem (widened the
relay route, never traced through to the consumer that gates on it) —
found by accident later, not by design. avv-mls.md reasoned its way to
"must skip until July 22" using logic already written correctly for the
AFL precedent in the same document, then didn't apply it to its own tests
— required a second document to patch the first. Docs also ran narrative-
heavy (long "why I'm doing this" prose) where a tight spec should state
the requirement and stop.

Root cause: writing CC-CMDs before fully tracing the dependency chain, then
patching forward instead of getting it right the first time.

### Concrete fix this turn (not a promise — done)

`docs/CC-CMD-2026-06-30-avv-mls.md` and `docs/CC-CMD-2026-06-30-avv-mls-
proof-mode.md` deleted. Replaced with a single consolidated
`docs/CC-CMD-2026-06-30-avv-mls.md` — re-verified live before merging
(context-probe still returns the same 3 games at the same contextLengths,
confirmed not stale), narrative trimmed to what's load-bearing, all 5 tests
in one describe block with zero skip logic.

**Deliberately not touched this turn:** round-label-relay.md, round-label-
client.md, soccer-stats-dual-source.md (historical, already executed —
worth a note that its Task 1 was incomplete, not a rewrite), tournament-
multiplexer.md (historical, executed, fine as a record). Doing all of them
in one pass would repeat the exact pattern being corrected. If a pass on
these is wanted, that's a deliberate next ask, not assumed.

---

## CC-CMDS QUEUED — NEXT SESSION

**#1 (jubilant-bassoon, no dependency):**
"git pull. Read docs/CC-CMD-2026-06-30-avv-mls.md. Execute all tasks.
Nothing commits without confidence ≥ 95. Zero skip logic in any of the 5
tests — a skip means something in the plan was wrong."

**#2 (field-relay-nba):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-relay.md. Execute all
tasks. Nothing commits without confidence ≥ 95. Do not include [skip ci]."

**#3 (jubilant-bassoon, after #2 ships and deploys):**
"git pull. Read docs/CC-CMD-2026-06-30-round-label-client.md. Confirm the
Part B dependency check before starting Part B."

**#4 (separate scope, not urgent):**
identity-resolver MLS club-ID mapping (name → MLS-CLU-xxxxxx).

---

## CONSISTENCY ITEMS OUTSTANDING (standing approval)

- postseason_games round vocabulary normalization
- European club coverage in identity-resolver before August
- Two-legged tie game_number=2 — stats-api-sourced ties (TELUS) have no
  aggregate field
- **NEW:** before writing any future CC-CMD, trace the full consumer chain
  (not just the first layer touched) before specifying tasks — the
  dual-source gap (route fixed, consumer not) is the pattern to not repeat

---

## PRIORITY LIST

### 🔧 CC-CMDs (in order; #1 has no dependency on #2/#3)
1. CC-CMD-2026-06-30-avv-mls.md (jubilant-bassoon)
2. CC-CMD-2026-06-30-round-label-relay.md (field-relay-nba)
3. CC-CMD-2026-06-30-round-label-client.md (jubilant-bassoon, after #2)
4. identity-resolver MLS club-ID mapping (new spec needed)

### 🔨 INFRASTRUCTURE
5. Bosnia DB fix + identity-resolver CANONICAL map
6. team_form CONTEXT_SOURCE v3
7. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
8. wentToOT hardcoded false
9. KV editorial keys not consulted
10. NFL SPORT_TO_V2 — September 9
11. Odds Daily Counter stale
12. night_stars phase degraded

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- MLS proof-mode reference game: event 761644, STL 3-0 ATX, 2026-05-23

SESSION END: RELAY 1a2d7696 · CLIENT 10058d83 · 2026-06-30 · AVV-MLS docs consolidated to one, doc-quality root cause identified · via chat

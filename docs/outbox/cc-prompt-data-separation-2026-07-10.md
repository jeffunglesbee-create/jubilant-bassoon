# CC Session Outbox — Prompt/Data Structural Separation (CC-CMD-2026-07-10-prompt-data-separation)

**Date:** 2026-07-10
**Scope:** Real, observed production bug — a Night Owl brief leaked its
own prompt instructions into user-facing output ("fell within the
80-100 words range of expected intensity"). Root cause: every prompt is
built as a flat array of strings joined by `\n` with zero structural
separation between task, data, and rules — the exact reported failure
mode.

## PROBE BLOCK — found 11 real sites, not the doc's 3

`grep -n "Rules: 80-100 words\|Rules:.*words\." index.html` and a
follow-up sweep for every `"Write a FIELD"` task-instruction line
(the consistent opening across every prompt-building site in the file)
found **11 distinct prompt-construction call sites**, not the doc's 3
cited:

**9 sites using flat, unstructured concatenation — the actual bug
pattern, all restructured:**
1. Scout's Pick (`spPrompt`, briefType `scouts-pick`)
2. Series Brief (j2-series)
3. MLB brief (briefType `mlb-brief`)
4. WNBA brief
5. Stakes Brief (briefType `stakes-brief`) — not caught by the "words"
   grep pattern (its rules read "2 sentences," not "X-Y words") —
   confirms the doc's own warning that rule phrasing differs by site
6. Generic Game Brief (NBA/NHL/other)
7. Premier League brief
8. Night Owl queue prompt (`_owlQ_prompt`) — **the exact site from the
   reported bug**
9. Night Owl full prompt (`fetchNightOwlFromClaude`)

**3 sites already using genuine structural separation, confirmed and
deliberately left unchanged (not touched — nothing to fix):**
- J3 (`"TONIGHT'S GAMES:"` / `"RULES:"` uppercase headers, `-`-prefixed
  rule bullets)
- `wc-tab-brief` (`"TODAY'S MATCHES:"` / `"Rules:"` headers, same
  bullet style)
- Finals Desk (`_buildFinalsDeskPrompt`, `"Rules:"` header, same style)

**This changed the implementation approach.** TASK 1 explicitly says to
match any existing convention rather than invent a new one. Adopted
these 3 sites' real, already-live `"Rules:"`-header-with-`-`-bulleted-
lines convention for the 9 restructured sites, instead of the doc's own
suggested `## Task / ## Game data / ## Writing rules` markdown template.

## TASK 1 — Restructured, with one design correction caught mid-implementation

Template applied to each of the 9 sites: task instruction line, blank,
`'GAME DATA:'` header, the unchanged data lines, blank, then the
rules — each additional rule line prefixed with `'- '`.

**Caught and fixed a redundancy before it shipped.** Several sites
(j2-series, Generic Game Brief) hold their first rule in a variable
whose OWN text already begins with `'Rules: '` (e.g. `_j2WordRule =
'Rules: 80-100 words...'`). Adding a separate standalone `'Rules:'`
header immediately before these would have produced `"Rules:\n- Rules:
80-100 words..."` — a literal, visible duplication. Caught this while
implementing the second site, corrected the approach for both affected
sites (and matched it for all others): the existing `'Rules: ...'`
line stands alone as the header+first-rule combination exactly as
originally written, no separate header inserted before it, no wording
changed — only the *subsequent* rule lines get `'- '` bullets.

Verified via `git diff` review of every one of the 9 sites: every
substantive rule's wording, content, and relative order is byte-for-
byte identical to before — only header lines, blank-line separators,
and `'- '` bullet prefixes were added.

## TASK 2 — Live verification, 7 real generations, zero format leaks

Fired real `claude-haiku-4-5-20251001` generations directly against the
production `CLAUDE_PROXY_URL` from a live browser session (not a
simulation), using the exact new prompt templates:

**5 sparse-data generations** against the Night Owl queue prompt (the
exact reported-bug site) — bare final scores only, no series record, no
matchup note, no stat context, spanning MLB/NBA/NHL — matching the
"limited concrete facts" condition TASK 2 specifically asks for as
similar to what likely triggered the original leak. **Zero** matches
across all 5 for any of 10 leak-detection patterns covering the exact
reported failure class (word-count numbers, `"Rules:"`, tone
descriptors, structural directives, "never invent"/"do not fabricate"
phrasing). Word counts: 88–93, compliant with the 80-100 target.

**1 rich-data regression check** (series record, matchup note, real
stat context) against the same Night Owl queue site — zero leaks, 89
words, and genuinely good quality output correctly citing the specific
facts provided (Brunson 30pts, 13 in Q4, 14-point Q3 deficit erased).

**1 additional distinct site** (Stakes Brief) for broader coverage —
zero format-leak matches, correct 2-sentence structure. One output used
the phrase "historical weight" — the exact wording from the rule "Lead
with the historical weight." **Investigated rather than either
dismissing or over-flagging this.** This is categorically different
from the reported bug: "historical weight" is a *content-directive*
(the rule instructs the model to write ABOUT historical significance;
using that vocabulary is fulfilling the instruction correctly, not
leaking it), versus the reported bug's mechanism — a *format*
constraint ("80-100 words") appearing verbatim as broken, obviously-
not-real-content meta-text. None of the 7 generations produced any
format-meta leak, which is the actual bug class this CC-CMD targets.

**Empirical finding worth stating plainly:** confirmed via the live
generation calls that `.filter(Boolean)` (already present in every
site, unchanged) strips the blank-line separators I added between
sections — this is not new behavior, it's identical to how the 3
already-compliant sites (J3, etc.) already work. The genuine structural
signal is the header *text* itself ("GAME DATA:", "Rules:") appearing
on its own adjacent line, not whitespace — confirmed by inspecting the
actual prompt string sent to the real API, not assumed.

## Repo verification

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Every real prompt-construction site found by the probe
      restructured with genuine data/rules separation — 9 of 11 real
      sites (the other 2 confirmed already-compliant and correctly
      left untouched)
- [x] No rule content, wording, or ordering changed — only structural
      boundaries added, confirmed via full `git diff` review, including
      catching and correcting a would-be duplicate-header bug before
      shipping
- [x] Live-verified across 7 real generations (not a single pass),
      including 5 deliberately sparse-data cases at the exact reported-
      bug site
- [x] Confirmed no regression: word/sentence counts compliant across
      every run, tone/quality genuinely correct on the rich-data case

## CONFIDENCE SCORING

- +25 — every real site found (11, not the doc's 3) and correctly
  handled — 9 restructured, 3 already-compliant sites correctly left
  alone: **met**
- +20 — no rule content altered, only structural separation added,
  confirmed via diff and including a caught-and-fixed redundancy issue
  before shipping: **met**
- +35 — live-verified across 7 real generations with zero format-leak
  matches, including 5 sparse-data runs at the exact bug site: **met**
- +20 — confirmed no regression in word count / sentence count / tone
  compliance across sparse and rich data, at multiple sites: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-10d` → `2026-07-10e`.
- `index.html`: 9 prompt-construction sites restructured with
  `GAME DATA:`/`Rules:` header separation, matching the file's own
  already-established convention.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.

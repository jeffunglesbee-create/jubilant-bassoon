# CC-CMD: Correct ADR-002-CONTEXT.md patent defense documentation

**Date:** 2026-07-06
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** Documentation only. Zero code changes in this CC-CMD.

**Source:** RUWT patent re-analysis this session, done against the actual
verbatim patent text (US9421446B2, US10328326B2), not summaries.

## PROBE BLOCK
```bash
sed -n '20,35p' docs/ADR-002-CONTEXT.md    # coupled apparatus section
sed -n '95,120p' docs/ADR-002-CONTEXT.md   # Rules A-E
```
Confirm citations match before editing.

## TASK 1 — Remove the "Coupled apparatus requirement" section

The section (lines ~27-31) argues FIELD is safe because it's "a
single-page PWA running in one browser tab" with "no coupled apparatus
in the patented sense." This is not supported by the patent text.
US9421446B2's specification states directly: "Processing engine 110 and
notification engine 120 may consist of separate hardware components, or
they may be software (or firmware) modules that are executed by a
single piece of hardware." A single-device, single-tab implementation is
explicitly contemplated by the patent — this defense does not hold.

Delete the section. Replace with a short note:
```markdown
### Coupled apparatus (removed 2026-07-06)
Previously argued FIELD's single-tab architecture avoided a
multi-device requirement in the claims. Re-checked against the actual
patent specification: US9421446B2 explicitly states the processing and
notification engines "may be software (or firmware) modules that are
executed by a single piece of hardware." This defense was not
supported and has been removed. No other defense in this document
relied on it — Rules A-E each stand independently — so this is a
documentation correction only, not a change to FIELD's actual risk
posture.
```

## TASK 2 — Tighten Rule B's wording

Current text: "Game classification by interest/excitement runs
exclusively in the browser. No exceptions, regardless of file size or
performance pressure."

This has been informally read more broadly than what's actually
required — as "no factual gating logic of any kind touches the relay,"
which is stricter than necessary and isn't what the rule is actually
protecting against. The relay's own dual-boolean AND-gate (Rule D:
`latePhase && closeGame`, no sum, no scalar) is real, shipped, and
already validated as outside the patent's "interest level value" /
"rating" language — specifically because summing scenario values into a
scalar (the patent's own dependent claim 8 language) is a fundamentally
different operation than ANDing two independent factual booleans.

Reword Rule B to state precisely what it means:
```markdown
### Rule B: No scalar or summed interest-level value is ever computed
or stored on the relay
Any function that produces a single derived number representing "how
exciting" or "how interesting" a game is (a composite score, a summed
value, anything with multiple meaningful threshold levels) runs
exclusively in the browser. This does NOT prohibit factual,
independent boolean conditions (see Rule D) from being evaluated on
the relay — those are observations about raw game state, not a
computed interest-level value, and are a structurally different
operation (AND vs. sum).
```

## TASK 3 — Add a note distinguishing the two patents' post-game defenses

The existing "Amnesty Zone" / post-game defense should note that it
rests on different textual grounds for each patent in the family:
```markdown
### Note on patent family variance (added 2026-07-06)
US9421446B2 claim 1 explicitly requires the feeds to describe "a
sporting event that is in progress" — the amnesty-zone defense is
textually solid here. US10328326B2 claim 1 does not contain that
qualifier; its trigger is "the rating...has changed" instead. The
amnesty zone's real basis for '326 is that a rating computed exactly
once, and never recomputed for a completed event (see the drama_peak
immutability guard, CC-CMD-2026-07-06-drama-peak-immutability-guard.md,
field-relay-nba), has no second value to have "changed" from — not
that the event is over.
```

## DONE CONDITIONS
- [ ] Probe block confirms citations before editing
- [ ] Coupled apparatus section removed and replaced with the correction note
- [ ] Rule B reworded to its precise, intended scope
- [ ] Patent family variance note added
- [ ] Nothing else in the document touched
- [ ] Outbox written

## CONFIDENCE SCORING TABLE
+35  Coupled apparatus section correctly removed/replaced
+30  Rule B correctly reworded without changing its actual protective scope
+20  Patent family variance note accurately reflects the real claim distinction
+15  Nothing unrelated touched

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-06-adr002-doc-correction.md. This is
a documentation-only CC-CMD -- no code changes. Remove the unsupported
coupled-apparatus section, reword Rule B to its precise scope (no
scalar/summed value on the relay, factual boolean gates like Rule D are
fine), and add the patent-family-variance note distinguishing '446 from
'326. Do not commit unless confidence >= 95. If score < 95, report
verbatim and stop.

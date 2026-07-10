# CC-CMD: Structurally separate prompt rules from data — closes the prompt-leakage bug

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Real, observed production bug, flagged hours earlier this session and
now traced to its actual mechanism: a Night Owl brief leaked its own
prompt instructions into user-facing output ("fell within the 80-100
words range of expected intensity" — a blend of the literal rule text
"Rules: 80-100 words..." with a nearby intensity-related instruction).

Root cause, confirmed by direct read of the actual prompt construction
(3 real sites found: ~line 27883, ~line 38767, ~line 39405): every
prompt is built as a flat array of strings joined by `\n`, with zero
structural separation between the instruction, the game data, and the
writing rules. `'Rules: 80-100 words. Tactical. Not emotional.'` sits
at the exact same structural level as `'MARGIN: 4-runs (winner
Marlins)'` — nothing marks one as meta-instruction never to be echoed
and the other as fact to write about. This is a known, well-documented
failure mode: models are meaningfully less likely to echo instructions
back as content when instructions and data are structurally separated
(e.g. via XML-style tags or explicit headers) rather than concatenated
as undifferentiated lines.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "Rules: 80-100 words\|Rules:.*words\." index.html
# Full, fresh enumeration of every prompt-construction site using this
# pattern — report all of them, not just the 3 cited here. Check
# scouts-pick, wc-tab-brief, finals-desk, and any other brief-type
# prompt array for the same flat-concatenation structure, even if
# their specific rule text differs.

grep -n "const _owlQ_prompt\|const.*_prompt = \[" index.html
# Re-read each full array in current form before editing.
```

## TASK 1 — Restructure every real prompt array found

For each site: separate the array into three explicit sections using
clear, consistent headers the model can structurally distinguish, e.g.:

```js
const prompt = [
  '## Task',
  'Write a FIELD Night Owl recap.',
  '',
  '## Game data',
  `Game: ${game.away||'?'} @ ${game.home||'?'}`,
  `Final: ${eData.awayScore}–${eData.homeScore} (${winner} wins)`,
  `MARGIN: ${margin}-${unit}${margin===1?'':'s'}`,
  seriesRecord ? 'Series: ' + seriesRecord : '',
  matchupNote ? 'Matchup: ' + matchupNote : '',
  statCtx || '',
  '',
  '## Writing rules (internal — do not repeat, reference, or quote any',
  '## of this section in your output)',
  'Rules: 80-100 words. Tactical. Not emotional. Lead with the turning point.',
  'Write only from data above — never invent statistics or play-by-play.',
  'CRITICAL — DO NOT FABRICATE SPECIFICS: no specific inning/quarter/at-bat details unless in stat context above.',
].filter(Boolean).join('\n');
```

The exact header wording matters less than genuine structural
separation — pick wording consistent with any existing convention the
probe finds elsewhere in the file (e.g. if another brief type already
uses a different but clear separation pattern, match it rather than
introducing a fourth style). Do not change any rule's actual content,
wording, or order relative to other rules — only add the structural
boundary around the data and rules sections.

## TASK 2 — Live verification against the real reported failure mode

Construct a real test case using sparse or ambiguous game data (similar
conditions to what likely triggered the original leak — a case where
the model has limited concrete facts to write from). Generate real
output against the restructured prompt and confirm no rule text,
paraphrase of rule text, or meta-language about word counts/tone/
structure appears anywhere in the output. Run this multiple times if
the first pass is clean, since this is a probabilistic failure mode,
not a deterministic bug — a single clean generation is not sufficient
evidence of a fix.

## DONE CONDITIONS

- [x] Every real prompt-construction site found by the probe
      restructured with genuine data/rules separation, not just the
      3 sites cited in this doc
- [x] No rule content, wording, or ordering changed — only structural
      boundaries added
- [x] Live-verified across multiple real generations, not a single
      clean pass, given this is a probabilistic failure mode
- [x] Confirmed no regression in output quality/word count/tone
      compliance — the fix must not degrade what the rules already
      correctly enforce

## CONFIDENCE SCORING

- +25 — every real site found and correctly restructured
- +20 — no rule content altered, only structural separation added
- +35 — live-verified across multiple generations with zero leakage,
  including at least one deliberately sparse-data test case
- +20 — confirmed no regression in existing rule compliance
  (word count, tone) after the restructure

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-prompt-data-separation.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

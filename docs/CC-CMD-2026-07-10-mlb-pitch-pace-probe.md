# CC-CMD: Probe -- does the MLB relay path expose pitch count / batting-order pace?

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon and/or field-relay-nba (probe determines which)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

**This is a probe-only task. No feature design, no client changes.**
Confirmed by grep tonight: FIELD's client state carries zero pitch
count, batting-order position, or at-bat tracking anywhere. What's
unconfirmed is whether that data even reaches the relay from MLB's
source feed in the first place, or whether it stops further upstream.
Answer that question with evidence before any "who's up next in 10
minutes" feature gets designed — designing against an assumed data
source that doesn't actually exist would be exactly the mistake this
project has spent tonight avoiding elsewhere.

**Real motivating idea, for context only, not a spec to build against
yet:** MLB's pitch clock (2023 rule, still in effect) puts a hard
ceiling on time between pitches for the first time in the sport's
history — 15s bases empty, 20s with runners on. That makes lineup
rotation timing mechanically forecastable in a way it never was before.
If real pitch/batter data reaches the relay, "likely [Player]'s at-bat
in ~10 minutes" is a legitimate, honest forecast — a statement about
lineup math, not a guess about outcomes. But this only matters if the
data genuinely exists upstream.

## PROBE BLOCK

```bash
git log --oneline -5

grep -rn "statsapi.mlb.com\|MLB Stats API\|gumbo\|GUMBO" . --include="*.js" --include="*.html" 2>/dev/null | head -20
# Find every place FIELD's relay currently touches MLB's live source,
# if any exists at all.
```

Then, if a real MLB relay adapter is found: fetch a live or recent
MLB game's raw source response directly and report, with actual field
names quoted, whether it contains: current pitch count (for the
at-bat, and/or game total), batting order position or current batter
identity, and any per-pitch or per-at-bat timestamp data. Do not infer
from documentation or memory of the API's general shape — pull a real
response and report exactly what's present or absent.

If no MLB relay adapter currently reaches a source with this
granularity: report that plainly. Do not propose a design in that case
— the honest outcome of a negative probe is "not currently possible,"
not a fallback feature idea.

## TASK 1 — Report findings only

Produce a short outbox report: what MLB source(s) FIELD's relay
currently uses, whether pitch/batter granularity exists in the raw
response, and if so, whether it's currently being discarded during
FIELD's own normalization (same shape as tonight's other "real signal
exists, never reaches the consumer" findings) or genuinely absent from
the source itself. No code changes in either case — this task is
report-only.

## DONE CONDITIONS

- [x] Real MLB relay adapter(s) identified, or genuinely confirmed
      absent
- [x] If present: actual raw response fields reported, quoted directly,
      not inferred
- [x] Clear, explicit answer: pitch/batter pace data available upstream
      or not — no partial or hedged conclusion
- [x] No feature code written regardless of outcome — probe only

## CONFIDENCE SCORING

- +40 — real MLB relay path(s) correctly identified
- +40 — actual field-level evidence reported (quoted from a real
  response), not inferred from documentation
- +20 — clear yes/no conclusion stated, no feature work attempted
  either way

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git pull. Read docs/CC-CMD-2026-07-10-mlb-pitch-pace-probe.md. Execute the probe task only. Report findings verbatim. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

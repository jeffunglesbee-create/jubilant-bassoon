# Claude Code Command — Client Gap Sweep + Public Solution Research

**Repo:** jubilant-bassoon only. **Branch:** main — this repo's own
convention is direct-to-main commits; this is a research/documentation
task, no functional code changes. Commit the outbox manifest directly.

git pull. Read CLAUDE.md.

Write findings to outbox/cc-gap-sweep-client-2026-07-03.md.

## CONTEXT

Found today, by accident, while debugging an unrelated "dots not
populating" report: `_bsdRepaint()` has zero momentum-rendering code —
only shots and ball position are drawn, despite momentum being a real,
named, data-available feature. This was never systematically searched
for; it was stumbled into.

`index.html` is ~34,500 lines. A chat session's search of it this
session was necessarily bounded by whatever functions had already been
read into context while investigating something else — not a systematic
sweep. CC has the whole file checked out and can search all of it.

**Real gap-classes to search for, using today's finding as the
template — not an exhaustive list:**
1. A feature named/speced in the FIELD Vision document, Rule 33
   (Product Ethos), or any other Drive-sourced spec, with data already
   flowing to support it, but zero corresponding client-side render
   logic (the momentum pattern exactly).
2. A live-frame/SSE handler that only partially consumes what it
   receives (confirmed today: `_bsdOnSSEFrame` only ever reads
   `data.shots`/`data.shotmap`, never `data.momentum`, even after the
   relay-side fix started sending it).
3. Multiple real population sites for the same client-side state object
   (confirmed today: `espnScores` has 10+ separate assignment sites) —
   check whether they're all genuinely consistent in field extraction,
   or whether some use stale/wrong field names the way AmbientDO did.
4. A real function or feature referenced by a code comment (e.g. "when
   set" or "activates X") that doesn't actually get set/activated
   anywhere in practice — verify the comment's claim against real
   runtime behavior, not just its presence.

## PRE-BUILD PROBE (Rule 87)

```bash
grep -c "^function \|^async function " index.html
```
Confirm a real, large function count before scoping — this file is
large enough that an exhaustive manual sweep isn't realistic; prioritize
grep-pattern-driven search over reading linearly.

## TASK 1: Spec-vs-shipped feature sweep

Cross-reference every feature named in the FIELD Vision document and
Rule 33 (fetch both from Drive first) against actual rendering code in
`index.html`. For each named feature, confirm real, working render
logic exists — not just that data for it is fetched/stored somewhere.
Flag every feature that's named/speced but has no real client-side
rendering path, the same way momentum was found today.

## TASK 2: Live-frame/SSE consumption completeness sweep

For every real SSE/WebSocket frame handler in this file (search for
`onmessage`, `EventSource`, `_onMessage`, frame-type dispatch functions),
confirm every field the handler receives is actually read and used
downstream, not silently ignored. Cross-reference against what the
relay side (field-relay-nba, read-only — do not edit that repo from
this session) actually sends for each frame type.

## TASK 3: Duplicate-state-population consistency sweep

For every client-side state object populated from more than one real
code location (grep for the object name followed by `[key] =` or
similar assignment patterns, count distinct sites), confirm all sites
extract the same real fields consistently, using the same field names
matching the real upstream API shape — not just that each site
individually looks plausible in isolation.

## TASK 4: For each real, confirmed gap — research public solutions

Same discipline as the relay-side sweep: for every genuine finding,
search public GitHub for an existing tool matching the actual problem
class, prioritizing genuine ethos/technical fit over a forced weak
analog. Report honest misses.

## TASK 5: Outbox manifest (last task)

Per gap-class: real instance count found, which had a public-repo
match, which didn't after an honest search.

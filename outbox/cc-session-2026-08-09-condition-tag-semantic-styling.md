# CC-CMD-2026-08-09-condition-tag-semantic-styling — Result

## Status: STOPPED AT TASK 1, exactly as the gate instructs. **Confidence to proceed as written: ~20.**

Task 1 is a blocking gate: *"If ANY consumer is prose: STOP. Do not
proceed to Task 3."* **Both consumers are prose.** Tasks 2–4 were not
executed. No CSS written, no code changed.

## Task 1 — the consumer trace

`getMLBAnalyticsContext()` (3912) has exactly two call sites, both
joining `lines` into a **model prompt**:

**Site 25196** — inside a compound-prompt template assembled alongside
`  Network: ${stream}`, `  Crew: ${crewCtx}`, `[XG] ...`:
```js
(()=>{ try { const ctx=getMLBAnalyticsContext(g); return ctx.length ? ctx.join('\n') : ''; } catch(e_){return '';} })(),
```

**Site 29070** — and the in-code comment names it outright:
```js
// Pull from the same analytics context that compound uses —
const analyticsLines = getMLBAnalyticsContext(g);
const analyticsCtx = analyticsLines.length ? analyticsLines.join('\n') : '';
```

**Neither is DOM.** Wrapping `[${pf.badge}]` in a `<span>` at those emit
sites would inject raw HTML into journalism prompts sent to the model —
a real defect, not a cosmetic one. That is precisely the risk the gate
was written to catch, and it caught it on the first trace.

## The finding that reframes the whole task

While tracing, I found production **already renders a bracketed badge as
a real DOM element** — in a different function, twelve lines above the
prose emit site:

```js
// Card badge HTML for park factor
function buildParkFactorBadge(game) {
  ...
  return `<span class="mlb-park-badge mlb-park-${pf.badgeClass}"
                title="${pf.context}">${pf.badge}</span>`;
}
```

with real CSS already present:
```
.mlb-park-badge{font-size:.62rem;font-weight:600;letter-spacing:.04em;
                padding:.1rem .42rem;border-radius:3px;border:1px solid;...}
.mlb-park-badge.park-hitter-extreme{color:#f59e0b;...}
.mlb-park-badge.park-hitter{color:#22c55e;...}
```

**So the styling target exists — it was never the prose path.** The same
`pf.badge` value feeds two separate consumers: a prompt string (text,
must stay text) and a card badge (already an element, already styled).

This also inverts my own earlier finding. In the superseded CC-CMD's
addendum I wrote *"no styling hook exists."* That was wrong — I had
grepped the prose emit sites and stopped. The hook is
`buildParkFactorBadge`, and `class="[a-z-]*badge"` shows a whole family
of similar spans already in use.

## A Rule 37 violation found in existing code, not introduced by me

`.mlb-park-badge.park-hitter-extreme` uses `color:#f59e0b` and
`.park-hitter` uses `color:#22c55e` — **raw hex**. `COLOUR-SYS-A` states
*"No raw hex values in component JavaScript, template strings, or inline
styles"* and Rule 37 reserves colour meanings globally: `#f59e0b` is
`--caution` ("something to know before deciding") and `#22c55e` is
`--sport-epl`. A park-factor badge is neither.

Not fixed here — out of scope, and Rule 69 forbids the hitchhike. Written
up as a follow-up CC-CMD rather than left as a note.

## Follow-ups written, not deferred (Rule 87)

1. `CC-CMD-2026-08-09-condition-tag-badge-styling-v2` — the re-scoped
   build, retargeted at `buildParkFactorBadge`'s existing span instead of
   the prose emit sites. This is the correct version of the task.
2. `CC-CMD-2026-08-09-park-badge-token-compliance` — bring the existing
   `.mlb-park-badge` hex colours onto `COLOUR-SYS-A` tokens.

## Why I did not just retarget and continue

The re-scope names one emit site (3918) and the prose path as its target.
Switching to a different function mid-execution would deliver something
materially different from what was approved (Rule 69), and the tier→token
mapping still needs re-reading against the spec for a *park factor* badge,
which is not a drama tier at all. That is a spec change, not an
implementation detail.

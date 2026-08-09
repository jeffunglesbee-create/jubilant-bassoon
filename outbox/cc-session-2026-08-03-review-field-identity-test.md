# CC-CMD-2026-08-03-review-field-identity-test — Result

## Status: BLOCKED at Task 1. **Confidence to proceed: ~55. Well below the 95 gate — stopping, not guessing.**

## The block, precisely

Task 1 requires reading the real `FieldIdentity` component and its CSS
module **in field-playground**, because — in the CC-CMD's own words —
*"the exact token values (hex colors, font stack, glow shadow values)
live there; don't re-derive them from this doc's own description."*

`field-playground` is **not in this session's repo scope**. Attaching it
returned:
```
MCP error -32003: MCP tool call requires approval
```

That is a genuine external block, not deferred work. Proceeding would
mean inventing hex values, a glow shadow and a font stack and calling
them "the playground's values" — a Rule 2 violation, and precisely the
re-derivation the CC-CMD forbids by name.

**UNBLOCKED WHEN:** `field-playground` is approved for this session.
Then read `src/components/FieldIdentity/` and its CSS module, and
Task 2 proceeds.

## The half of Task 1 that was NOT blocked — done, with one decisive finding

Production's real state, read from HEAD:

**Bracketed conditions are real and already rendered.** `src/legacy/field.js`
carries the named-condition strings this rule governs, e.g.:
```
16199: '[GOALIE DUEL]'
16207: '[SPECIAL TEAMS]'
16214: '[POSSESSION FIGHT]'
16219: '[HIGH SCORING]'
```
plus a documented `condition tier + _otwTierLabel()` path at line 1091.

**Production already loads a monospace font.** This settles the one open
question Task 2 flagged — *"if production doesn't already load IBM Plex
Mono, decide honestly whether adding a new font is worth it for this one
element"*. It does not need one:
```
index.html:1085  .otw-changed{font-family:'DM Mono',monospace
index.html:1086  .otw-changed-stamp{font-family:'DM Mono',monospace
index.html:1088  .fan-out-chip{font-family:'DM Mono',monospace
```
**`DM Mono` is already loaded and already used on adjacent chip-like
elements.** So the answer to that question is: **no new font.** Adding
IBM Plex Mono for one element would add a font load for an effect
`DM Mono` already achieves, on elements that sit right next to the
target. Recording it here so the blocked session does not re-litigate it.

## What is still genuinely unknown

Only the playground's **exact values** — the tier colours and the glow
shadow. The font question is answered; the structural target
(bracketed-condition tags) is located. That is the whole remaining gap,
and it is one repo-read wide.

## Why I did not ship a "close enough" version

The CC-CMD's whole framing is that this is *one tested pass, not a
validated direction*, scoped deliberately to the single lowest-risk
element. Applying approximated glow and colour values would produce a
change that looks like the tested direction without being it — and the
tested direction is the only evidence this change has.

## Scope

No CSS changed. No production styling touched. smoke not re-run — no
code was modified.

---

# ADDENDUM — 2026-08-09, after "no playground needed, proceed with best recommendations"

## The playground dependency is gone, but a different premise failed

With the playground requirement lifted, I went to apply the tag styling
using `DM Mono` (already loaded — the finding above). Task 2 assumes
production has *"an existing bracketed-condition display"* to restyle.
**It does not.** Read from HEAD:

```js
// src/legacy/field.js
3918:  if (pf?.badge)    lines.push(`  Park: [${pf.badge}] ${pf.context}`);
3924:  ...`${ump.badge ? '[' + ump.badge + '] ' : ''}${umpName} ${ump.context}`
3934:  if (tempo?.badge) lines.push(`  ${who} pace: [${tempo.badge}] ${tempo.context}`);
```

The bracketed conditions are **interpolated into plain-text strings**
inside larger `lines.push(...)` blocks. There is no element, no class, no
styling hook — nothing to restyle. Monospace + tier-coloured glow needs a
DOM node; these are text fragments inside sentences.

## Why I stopped rather than proceeding

Making this stylable means wrapping each `[TAG]` in a `<span>` at every
emit site, threading a tier class through, and changing text-building code
paths into markup-building ones. That is not *"one real, low-risk,
directly-applicable piece"* — it is a rendering change across several call
sites, in text that also feeds non-DOM consumers (these strings go into
journalism context lines, not only the screen). Wrapping them in HTML
would put markup into strings that are read as prose elsewhere.

**Confidence in the CC-CMD as written: ~45.** Its scope was sized against
an assumption about production that turns out not to hold. Proceeding
would deliver something materially larger than what was approved, which
Rule 69 forbids and the CC-CMD itself explicitly disclaims ("NOT a request
to reskin the whole app").

## What is now known, so the next session starts ahead

1. **No new font needed** — `DM Mono` is loaded and used on adjacent
   chip-like elements (`.otw-changed`, `.fan-out-chip`).
2. **No styling hook exists** — the tags are string-interpolated at
   ≥3 sites (3918, 3924, 3934) plus the `opts.badge` path at 2281.
3. **`fieldChip()` already exists** (2280) and is the established way this
   codebase renders a small labelled chip as a real element. **That, not a
   new span convention, is the right vehicle** if this proceeds.
4. **The blocker is a scope decision, not access.** Someone has to decide
   whether converting these text fragments into elements is wanted — and
   whether the prose consumers of those same strings are affected.

## Recommendation

Re-scope into a new CC-CMD built on `fieldChip()`, targeting one emit site
first as a real test, rather than executing this one as written. Not
written here: the re-scope needs the decision in point 4, which is Jeff's.

# Session doc — the unslop-ui audit, and what auditing chrome found underneath it

**2026-08-26 → 2026-08-27.** jubilant-bassoon. Rule 67.

HEAD `796dae5` → `610f189`. Smoke **985/0 throughout, every commit.**
SW_VERSION `2026-08-26a` → `2026-08-26n`. Deploy gate green on every push.

## What moved

```
                    start    end
decorative-emoji      275 →    4
  captioned           109 →    0     (peaked at 146; the detector got honest, then it was swept)
  uncaptioned         166 →    4
emoji-announced         —  →    2     (new line; 82 when first measured)
glyph-ambiguity         —  →    1     (new line; 7 when first measured)
glyph-singleton         —  →    0     (new line; 25 when first measured)
icon-in-a-box           —  →    1     (new line; 4 when first measured)
unreferenced-css        —  →    0     (new line; 61 when first measured)
flag-emoji            102 →   92
status-glyph          107 →   39
gradient               34 →   30
backdrop-filter        19 →   12
coloured-shadow        11 →   10
```

Nine ratchet lines in `docs/chrome-inventory.txt`, five of them created this
session, all enforced by `.github/workflows/chrome-inventory.yml` — which also
did not exist at the start, because the ratchet ran only in `deploy-gate.yml`
whose `paths` covered neither of the ratchet's own inputs.

## The finding that was not about emoji

**The live score ticker put the raw composite drama number in the DOM.**

```js
title="Drama ${Math.round(drama)}${trendBonus>=8?' · rising':''}"
```

`drama` is `getSmoothedDrama(gid)`. The ticker filters on `state === 'in'`, so
it is live-only, and a `title` attribute renders as a native tooltip. ADR-002
Step 3: *"Is the composite number displayed to the user? **Yes**: BRIGHT-LINE
VIOLATION regardless of other mitigations. Fix immediately."*

Found while reading that function for its pictographs. Fixed in `ae170a8`; the
one occurrence, and `grep 'title="Drama'` now matches only the Drama Dial's own
settings label.

## What the checks got wrong, in order

Every one of these was caught by running the check rather than by reviewing it.

1. **The gradient counter measured mentions.** Deleting three underlines dropped
   the count by two, because the comment explaining the deletion says
   `linear-gradient`. `styleBlockOf` strips comments now.
2. **The labelled/alone split was wrong about 57 of 248.** It read only the
   glyph's own literal, so `<span class="…-icon">📋</span>FIELD Brief` counted as
   uncaptioned. Four forms of "captioned" exist and are now all read: same
   literal, next DOM node, sibling FIELD of the same object, and concatenated at
   runtime.
3. **The ratchet could be bypassed by spelling.** `SPORT_META` held eight sport
   emoji as `\u{1F3C0}` escapes and every counter walked past them — 24 glyphs
   never counted. Found because deleting those dead fields moved **no number at
   all**; the silence was the evidence.
4. **The announce check called the four best elements on the page defects.** The
   pin, star, calendar and share buttons each carry a real `aria-label`, which
   *replaces* the accessible name. Only `aria-hidden` was credited.
5. **The unreferenced-CSS scan read `index.html` alone** and reported 105 dead
   classes, 52 of which are emitted by `src/solid/` and `src/debrief/` — bundled
   by esbuild, absent from the page source. 105 → 61 once the corpus was the
   files that ship.
6. **The body counter read its own documentation.** `bodyOf` did not strip
   comments, so 67 decorative glyphs and 62 status glyphs in prose counted as
   chrome on the page. A hand estimate said "about 20" — it checked only whether
   a glyph's own line began with `//` and missed every block comment. Three
   times the estimate, which is the argument for measuring.
7. **A blunt regex removed 32 `icon:` fields instead of 24**, catching
   `getPulseChip`'s `{icon, text}`. Smoke failed at 984/985. Reverted and redone
   with a `label:`-in-the-same-object rule rather than patched forward.

## The mechanism worth carrying forward

A check with **one** remedy gets that remedy. The boundary assertion asked *"is
there a boundary at 3:1?"*, whose only answer is *add a boundary* — so nine were
added and three were wrong. It asks *"boundary at 3:1 **or** no fill of its
own"* now, and prints which answer carried each element.

The same shape recurred all session under different names: a value whose name
and its measurement disagree. `glyph-ambiguity` was the last instance — "one
glyph meaning three things" described the symptom, and the cause was **one thing
implemented three times**, 14,000 lines apart, mapping the same four bands to
the same four characters.

## Verified end-to-end

Deploy gate + both viewport audits (Chrome, Safari) against the LIVE worker,
green on every push. Smoke 985/0 at every commit. `chrome inventory` and
`unreferenced-css` green.

## Open, with unblock criteria (Rule 74)

- **`glyph-singleton` 0 — CLOSED.** The objection to sweeping was "146 judgement
  calls at the end of a long session", the condition that produced the three
  wrong boundaries above. It was answered rather than overruled: one decision
  applied 79 times, with a machine deciding membership. Two smoke assertions
  broke and both deserved to, being named for one thing and measuring a glyph.
  The sweep tool then hit the escape blind spot itself and three survived a pass
  that reported success — which is why the number is read from the counter
  afterwards and never from the tool.
- **`emoji-announced` 2 — the check's floor, not a backlog.** Both are inside
  `dramaTierMark()`; both call sites hide the glyph, but the check reads source
  position and cannot follow a value from a function to its render sites. A
  suppression comment would be an acknowledgment list, which this project
  forbids in its own words. Unblocked only by a check that resolves references,
  which is not worth building for two glyphs.
- **`icon-in-a-box` 1.** `.team-logo-txt`, the checklist's own avatar carve-out,
  counted rather than exempted by name so a fifth box cannot join it quietly.

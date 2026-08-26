# jubilant-bassoon against the unslop-ui checklist

**2026-08-26.** Audit, a ratchet, and the two changes the audit could prove.

## The counts

Measured in `index.html` — occurrences, not lines. field-laboratory ran the same
checklist against its own page the same night and reached zero on every row.

| | bassoon | laboratory |
|---|---|---|
| decorative emoji | **289** (79 distinct) | 0 |
| flag emoji | 102 | 0 |
| status glyphs `✓ ⚠ ★ ✕` | 107 | 0 |
| gradients | 34 | 0 |
| gradient text | 6 | 0 |
| `backdrop-filter` | 19 | 0 |
| coloured shadows | 11 of 23 | 0 |
| `@keyframes` | 25 | 0 |
| serif hero | 0 | 0 |

The emoji are not stray decoration — they are an **icon system**. `SPORT_ICONS`
maps 27 competitions to emoji, four call sites consume it, and the primary
navigation is `📰 Desk · 📖 Journal · ⚽ Groups · 🎯 Picks · 📊 Stats`.

## Ratcheted, not banned

`docs/chrome-inventory.txt` records every count; only **growth** fails the deploy
gate. Zero would be red the moment it shipped, and a red check nobody can make
green gets deleted — the reasoning `docs/exposed-secrets.sha256` already states
for the credential it cannot yet remove.

Several rows are defensible and say so in the file. What is not defensible is
growth nobody noticed.

## The claim I had to withdraw before shipping it

The inventory first called `backdrop-filter` **"the most defensible line here"**,
on the grounds that all of it sits on overlay surfaces where a blur says
"content is passing underneath".

Asked why overlay surfaces were an exception, the honest answer was that I had
**asserted** it rather than measured it. The checklist grants no such carve-out.

`backdrop-filter` blurs what is *behind* an element; the element's own background
then composites over that result. So the fraction of the blur anyone can see is
exactly `1 − alpha`:

```
.bottom-sheet        blur 12px   α .98   shows through   2%
.mv-panel            blur 24px   α .97   shows through   3%
.pin-widget          blur  8px   α .95   shows through   5%
.controls            blur 20px   α .92   shows through   8%
#field-attention-bar blur 10px   α .92   shows through   8%
.legend              blur 16px   α .90   shows through  10%
──────────────────────────────────────────────────────────
.setup-overlay       blur  8px   α .85   shows through  15%
four *-back-pills    blur  8px   α .78   shows through  22%
.picker-overlay      blur  6px   α .70   shows through  30%
.pin-btn / .star-btn blur  4px   α .60   shows through  40%
```

A 24px blur behind a surface showing 3% through is a GPU compositing pass
contributing about 3% of a blur. **The property is set and its effect is not** —
the same class as a 1.08:1 hairline, which is what this session spent the night
deleting elsewhere.

## Change 1 — seven blur declarations, proven free first

Removed from the six surfaces at α ≥ .90. `backdrop-filter` affects no box, so it
is layout-neutral. Screenshot before and after:

```
1280x900
pixels changed:    37278 of 1152000   (3.236%)
max channel delta:     2 of 255
```

**Two of 255.** Seven times smaller than the container border deleted in the
laboratory tonight, which was 15.

Honest caveat: this page renders near-empty without relay data, so there was
little behind the bars to blur. The **alpha ceiling is the robust argument** —
whatever sits behind, only `1 − α` of it can reach the eye — and the pixel diff
corroborates it rather than carrying it.

The twelve that remain are the ones doing visible work, 15–40% show-through.

## Change 2 — the textbook case, verbatim

```css
.media-icon{ width:30px; height:30px; border-radius:6px;
  background:rgba(167,139,250,.12); border:1px solid rgba(167,139,250,.25); }
```
```html
<div class="media-icon">📺</div>
<span class="media-title">Sports Media Today</span>
```

A 30×30 rounded square, violet-tinted at 12% with a violet border at 25%,
containing a television emoji, beside a heading that says "Sports Media Today".
That is checklist item 2 — *"emoji sitting inside a small colored rounded-square
box"* — implemented literally, and item 2's own test settles it: remove the icon
and ask whether the UI lost information. It did not.

Deleted, markup and rule. Verified rendered: `.media-head` still present,
title intact, zero page errors, 21 visible sections unchanged.

Ratchet lowered in the same commit, which is the file's own rule:
`decorative-emoji 289 → 288`, `backdrop-filter 19 → 12`.

## Found and NOT changed

- ~~**`.media-head::after`**, a 60px violet gradient underline.~~ **Done, and it
  was three rules rather than one — see the section below.**
- **`SPORT_ICONS`** (27 competitions → emoji) and the **nav emoji**. These are
  brand voice, not defects, and replacing an icon system is a product decision
  with a real cost. The count is now visible; the decision is the human's.
- **The 102 flags.** Country identity in a global sports app is data. Listed
  separately so it is never conflated with decoration.

## Pre-existing, not from this work

`smoke.js` A515 fails on `main`: `SW_VERSION date 2026-08-21 !== today ET
2026-08-25`. The deploy gate's own "Sync SW_VERSION to deploy date" step heals it
on deploy. 984 of 985 pass, unchanged by these edits.

## Unblock criteria (Rule 74)

- **Closed:** the icon-in-a-box, and seven blurs that cost a GPU pass each for
  ≤10% of an effect.
- **Open, one decision:** the gradient underline on `.media-head`. Verify with
  `node scripts/check-chrome-inventory.mjs` — the `gradient` line drops from 34.
- **Open, a product decision:** `SPORT_ICONS` and the nav emoji, 288 between
  them and everything else. The ratchet stops it growing while that is decided.


---

# Follow-up: "the gradient underline" was three of them

**Same night.** `.streaming-head::after`, `.media-head::after` and
`.field-desk-head::after` removed; the counter fixed in the same commit.

## One idea in three copies

Asked to take "the gradient underline", I looked before editing. There were
three, byte-identical apart from the hex:

```css
.streaming-head::after  { ... background:linear-gradient(90deg,#818cf8,transparent) }
.media-head::after      { ... background:linear-gradient(90deg,#a78bfa,transparent) }
.field-desk-head::after { ... background:linear-gradient(90deg,#c9a84c,transparent) }
```

Same `content:''`, same `position:absolute;bottom:-1px;left:0`, same
`width:60px;height:1px`. Each laid over a `border-bottom:1px solid var(--edge)`
that was already there, so the heading had a rule under it either way.

Removing one and leaving two would have been worse than either — three headings
styled the same way, one of them silently different.

**The accents were not a coding system anyone maintained.** `#818cf8` appears
**twice** in the whole stylesheet: this rule, and one other. And `#c9a84c` is
`--gold` written as a raw hex, so one of the three did not even use the token
that exists for its own colour.

`.masthead::after` is not this pattern and stays: full width, fading through
`--gold` / `--gold2` at both ends, the page's one brand rule — the single
purposeful gradient checklist item 6 allows. Verified still rendering.

## The counter was measuring mentions

Deleting three gradients dropped the ratchet by **two**.

The comment written where they had been says the word `linear-gradient` while
explaining the removal, and `countsFor` was matching that string anywhere in the
`<style>` block. **Documenting a deletion partly undid it** — and a
commented-out rule would have counted as a live one.

`styleBlockOf` now strips CSS comments, the way the laboratory's own parser
already did and for the same stated reason. Two self-test cases added: a
commented-out rule is not counted, and prose about a deletion does not resurrect
the count.

**Checked that the fix does not flatter the removal.** Run against HEAD — before
the three deletions — the corrected counter also says **34**, so the seeded
figure was accurate and `34 → 31` is exactly the three rules and nothing else.

## Verified rendered

```
.streaming-head    ::after none    border-bottom 1px
.media-head        ::after none    border-bottom 1px
.field-desk-head   ::after none    border-bottom 1px
.masthead          ::after linear-gradient(90deg, rgba(0,0,0,0), r…   ← kept
```

Zero page errors, 21 visible sections unchanged. Smoke **985 passed, 0 failed** —
the A515 SW_VERSION failure reported earlier as pre-existing has since been
healed by the deploy gate's own sync step (`7873144`).

## Left in place, and why

`position:relative` stays on all three hosts. It anchored these pseudo-elements
and is now a no-op, but removing it could strand any absolutely-positioned child
the JS inserts, and a no-op costs nothing.

The three host rules are themselves identical — `display:flex; align-items:center;
gap:.75rem; margin-bottom:1.2rem; padding-bottom:.65rem; border-bottom; position:relative`.
Three classes, one rule. That is a dedup, not slop removal, and it gets its own
commit.

## Unblock criteria (Rule 74)

- **Closed:** the section-heading gradient underlines, and a counter that could
  be moved by prose.
- **Open, a dedup:** the three identical `*-head` rules. Verify any merge with
  `node scripts/check-chrome-inventory.mjs` — the counts must not move.

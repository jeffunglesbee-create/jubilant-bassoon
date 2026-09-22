# CC session 2026-09-22 — the sections gap gets a verdict per section

HEAD `43f38ab` → `179e493`. Smoke **1055 passed, 0 failed** (1053 → 1055).
SW_VERSION `2026-09-22a` → **`2026-09-22b`**. Deploy gate run 974.

Session doc: this file.
Tracked by `docs/CC-CMD-2026-09-12-v2-sections-in-model-not-in-dom.md` (OPEN).

---

## The state this started from

`sections_model_not_in_dom` has been a **count** for ten days. Five hypotheses
have been refuted against it:

| hypothesis | refuted by |
|---|---|
| the probe read mid-poll-cycle | flat at 45 across 12 samples / 60s |
| `injectV2SportSection`'s missing `else` | 15 sections in `allData.sports`, memo all true, no capture |
| nothing rendered since the push | `render_after_last_push_ms` positive on every run since 09-21 |
| the gap is benignly empty sections | `gap_split` dropped 7 · empty 0 · unknown 0 |
| the `data-sport` key mismatch | `section_key_mismatches: []`, gap 3 either way |

Every one of those cost a build, a deploy and a scheduled run to learn one bit,
and every one was refuted for the same structural reason: **a count cannot say
which of three different failures happened.**

- the render never iterated the section (it entered `allData` after that pass)
- the render iterated it and a filter removed it
- the render iterated it and emitted nothing for it

Those want three different fixes. The measurement could not tell them apart.

## What was built

**`renderAll` builds an array before joining.** `filtered.map(...)` was
`.filter(Boolean).join("")` in one expression, which threw the per-section
result away. It is now `const _sectionHTML = filtered.map(...)` followed by
`_sectionHTML.filter(Boolean).join("")`. The join is byte-identical.

**`_stampRenderTrace` publishes `window._fieldRenderTrace`:** `outcome`, the
four filter states, `sportsIn` / `visibleCount` / `filteredCount`,
`modelSections` (`{sport, label, games}`) and `sections`
(`{sport, label, games, emitted, chars}`).

Two decisions in it are load-bearing:

1. **All three of `renderAll`'s exits stamp.** Only one reaches the section
   map. Without a stamp at the other two, a render that bailed leaves the
   PREVIOUS render's trace in place, with its own `at` — and a reader has no
   way to tell a current trace from a copy of an older one. That is the
   source-versus-copy substitution this whole chain exists to stop, and it
   would have been rebuilt inside the instrument written to end it.

2. **`modelSections` is recorded alongside `sections`.** A section dropped
   before the map cannot appear in `sections` at all — it would vanish from the
   trace exactly as it vanishes from the DOM, and the trace would agree with the
   defect instead of naming it.

**`scripts/render-trace-verdict.cjs`** turns the gap into one verdict per
section: `dropped-at-render` (the defect), `emitted-but-absent` (a different
defect, downstream of the join — `applyMainHTML` has caused exactly that once
before, the card-less zero-change fast path on 2026-09-12), `filtered-out`,
`empty-by-design`, `unknown-count`, `not-iterated`. `null` when the verdict
cannot be reached, never `[]`.

**The probe reads it.** `render_trace`, `render_trace_age_ms`, `gap_verdicts`
and `gap_verdict_census` are new manifest fields. Without this the trace would
have been a global nothing read — dead code under Rule 63.

## One published claim removed

The probe's FAIL line read:

> `FAIL — N section(s) are in the model and not on the page. injectV2SportSection pushed them and nothing rendered them.`

The second sentence is a **cause**, asserted on every run since the field
existed, by a line that had no way to know it — and by 2026-09-21 it was
contradicted by the manifests carrying it (`render_after_last_push_ms`
positive means a render ran). Rule 100's corollary: an untested premise is not
reported as a finding. It now prints the trace's verdicts and nothing more.

## Verification

| check | result |
|---|---|
| `node smoke.js index.html` | 1055 passed, 0 failed |
| `scripts/check-render-trace-verdict.mjs` | 15 of 15 |
| `scripts/mutate-render-trace-verdict.mjs` | **8 of 8 caught**, positive control green |
| `scripts/mutate-tennis-diag.mjs` | **13 of 13 caught** (D12, D13 added) |

Both harnesses run an **unmutated copy at the mutant location first**. A
harness in this repo previously wrote mutants to `/tmp`, where a relative
import did not resolve, and read six dead imports as six caught mutations.

`A-NPWIPE-1` went red on a correct change: it pinned `...length)){`
immediately followed by `applyMainHTML(`, so inserting the empty-note stamp
broke adjacency while the newspaper property it protects was untouched. It now
reads the branch body and asserts what matters — `applyMainHTML` is what the
branch calls, and nothing in it assigns `main.innerHTML`.

## Measured this session

Scheduled run `20260922T194444Z`, on the build **before** this one:

```
trigger schedule (step 1, Yesterday)
gap    ["NHL","NFL"]
split  dropped NHL:8 · NFL:1 · empty 0 · unknown 0
render_after_last_push_ms  +11543
render_trace  absent — the deployed bundle predates it
```

WNBA has dropped out of the set since 08:49Z. NHL is the only constant across
every reading back to 2026-09-21.

## What this does NOT establish

- **No cause.** The trace is an instrument. It has not been read on a live
  page yet, and nothing here should be read as knowing what it will say.
- **The done condition has not moved.** `check-sections-gap-streak.mjs` is
  **0 of 5** scheduled greens and this commit does not touch it.
- **The trace's values are not proven correct at runtime.** The mutation
  harnesses prove the assertions can fail; the live probe is what proves the
  numbers are true. That reading is the next scheduled run.

## Carry-forwards

None deferred. The one open item is the done condition itself, which is a
scheduled measurement, not work: the probe now carries the verdict fields and
the next scheduled run populates them.

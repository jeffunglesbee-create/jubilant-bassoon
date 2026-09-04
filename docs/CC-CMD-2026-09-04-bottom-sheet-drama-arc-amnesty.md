# CC-CMD — Bottom sheet: gate the Drama Arc sparkline to the amnesty zone

**Date:** 2026-09-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — client-side only)
**Branch:** main — commit directly. No feature branch. No PR.

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git log --oneline -5
```

Baseline at authoring time: HEAD `43a13586`, `node smoke.js index.html` → **985 passed, 1 failed**.
The one failure is **A515 — SW_VERSION date matches today (ET)**; `sw.js` carries
`2026-08-27a`. That failure is expected on any day without a deploy-triggering
commit and is resolved by TASK 5 of this CC-CMD, not by anything else.

---

## CONTEXT — a documented amnesty gate that does not exist in the code

`openBottomSheet` (`src/legacy/field.js:40164`) renders a drama sparkline:

```js
const sparkline = buildDramaSparklineSVG(gameId, 200, 32) || '';   // L40203
...
${sparkline ? `<div class="bs-section"><div class="bs-section-label">Drama Arc</div>${sparkline}${_bsIsFinal?( … arc description … ):''}</div>` : ''}   // L40233
```

`_bsIsFinal` gates the arc **description**. The SVG itself is outside the gate.

`buildDramaSparklineSVG` (`field.js:40421`) plots `getDramaHistory(gameId)`'s
`d.s` values on a fixed 0–100 axis and emits:

```js
<text … >${Math.round(peak)}</text>
```

`getDramaHistory` reads `localStorage[DRAMA_HISTORY_KEY + gameId]`, which the
~30s drama sampler appends to during live play. The builder returns `''` below
3 samples, so the section becomes reachable roughly 90 seconds into a live
game — with the peak composite drama score rendered as visible SVG text.

### Why this is the fix and not a judgement call

`docs/ADR-002-CONTEXT.md` Step 3 (line 322):

> **Yes** (e.g. `${drama}%` in DOM): BRIGHT-LINE VIOLATION regardless of other
> mitigations. The displayed number IS an interest-level score.

Step 4 (line 326) admits amnesty for **post-game only**. Line 384 records the
already-fixed 2026-07-02 pin-widget CRITICAL in the same terms: *"its expanded
state rendered a drama sparkline SVG + comeback probability — a second
discretized-composite-score live instance."*

Two prior documents both describe this section as post-game:

- `docs/CC-CMD-2026-07-16-amnesty-bottom-sheet.md`: *"already renders, for
  finished games specifically … a real inline-SVG arc sparkline via
  `buildDramaSparklineSVG`."* That claim is **false at HEAD** — an inherited
  claim that was never re-verified (Rule 72).
- `docs/CC-CMD-2026-07-19-bottom-sheet-stats-reconciliation.md`: *"Drama Arc +
  its named-tier drama label (both real, patent-load-bearing per RUWT —
  narrative framing, not raw numbers … do not touch)."* "Not raw numbers" is
  the condition under which that instruction holds. `Math.round(peak)` is a raw
  number, so this CC-CMD is not in conflict with it — it restores the state
  that instruction assumed.

**The polyline is in scope too, not only the text label.** The sibling repo
(field-laboratory, `src/Desk.fs`) settled this question at type level: *"the arc
looks like a chart input. But it is a list of composite drama scores, and
rendering any element of it is the same bright-line violation as rendering the
peak."* Do not "fix" this by deleting the `<text>` element and keeping the
polyline live.

**Nothing is lost from the live sheet.** `dramaLabel_bs` (`field.js:40206`) is
already gated `!_bsIsFinal` and already renders named tiers ("Fire game",
"Heating up", "In play") in the Live Intelligence section — the RUWT-clean
pattern per ADR Step 5. The live sheet keeps that.

---

## TASK 1 — Probe (run before writing any code; paste output into the outbox)

```
cd /path/to/jubilant-bassoon
git log --oneline -3
grep -n "buildDramaSparklineSVG" src/legacy/field.js
grep -n "_bsIsFinal" src/legacy/field.js
grep -n "function buildDramaSparklineSVG" -A 26 src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

Confirm the line numbers above still resolve. If `openBottomSheet` has moved,
use the real current numbers — do not write from this document's numbers.

**Probe 1a — the amnesty predicate's second value.** ADR line 103 says the
amnesty zone is `state === 'final'` **or** `state === 'post'`; `_bsIsFinal`
tests only `'post'`.

```
grep -cE "state\s*[:=]\s*['\"]final['\"]" src/legacy/field.js
grep -cE "state\s*===\s*['\"]final['\"]" src/legacy/field.js
```

Falsifiable prediction from authoring: **0 producers, 9 consumers.** If the
producer count is 0, widening the predicate to accept both values is a no-op
against this repo's own data and is safe. If it is non-zero, widening is a real
behaviour change (Game Summary appears, Live Intelligence hides, for those
games) — it is still the ADR-correct direction, so proceed, but record the
changed count and the affected producers in the outbox rather than silently
folding it in.

**Probe 1b — the second sparkline call site.** `field.js:40683` calls
`buildDramaSparklineSVG(topGame.id||topGame._id||'', 220, 32)` inside Night
Owl's `renderCard`. Night Owl is post-game by design; its data comes from
`loadTonightFinals()` with a fallback that synthesises from `espnScores`.

```
grep -n "function renderNightOwlRecap" -A 45 src/legacy/field.js | grep -n "post\|finals\|filter"
```

**Artifact required:** the exact line(s) that restrict Night Owl's game set to
finished games, quoted in the outbox. If no such line exists, Night Owl is a
second live instance and TASK 3 covers it too. Do not assume it is safe because
of its name.

---

## TASK 2 — Add the amnesty predicate as a named function

In `src/legacy/field.js` **only** (the pre-commit hook syncs `index.html`; do
not edit `index.html`'s script block — `scripts/sync-source.mjs` blocks it).

Add one function, immediately above `openBottomSheet`:

```js
// ── ADR-002 amnesty predicate ─────────────────────────────────────────────────
// The amnesty zone is post-game only (docs/ADR-002-CONTEXT.md, Defense 4).
// Composite-drama output — sparkline, arc description, peak number — may render
// only when this returns true. Named so the gate is testable in isolation and
// cannot drift from the sites that consume it.
function isAmnestyState(state) {
  return state === 'post' || state === 'final';
}
```

Then derive the existing flag from it:

```js
const _bsIsFinal = isAmnestyState(eData?.state);
```

Do not rename `_bsIsFinal`, do not touch its other three uses, and do not
change any other section's gating. Rule 69 applies: this CC-CMD authorises the
predicate, the `_bsIsFinal` derivation, and the TASK 3 gate. Nothing else.

---

## TASK 3 — Gate the Drama Arc section

Change L40233 so the **whole section**, sparkline included, is behind
`_bsIsFinal`:

```js
${(_bsIsFinal && sparkline) ? `<div class="bs-section"><div class="bs-section-label">Drama Arc</div>${sparkline}${(()=>{const _ad=buildDramaArcDescription(gameId);return _ad?`<div class="bs-section-body" style="font-size:.68rem;opacity:.75;margin-top:.25rem">${_ad.replace('[DRAMA ARC] ','')}</div>`:''})()}</div>` : ''}
```

The inner `_bsIsFinal?…:''` ternary becomes vacuous once the outer gate exists —
remove it, do not leave `a ? x : x`.

If TASK 1b found Night Owl unrestricted, apply the same gate at its call site,
using `isAmnestyState` against whatever state field that path carries. If TASK
1b found it restricted, leave `field.js:40683` untouched and say so.

---

## TASK 4 — The verification artifacts

Two artifacts. Both are required. Neither is "check that it works."

### 4a — Enumerated unit pairs in `field_unit.js`

Add a test block for `isAmnestyState` asserting exactly these pairs:

| input | expected |
|---|---|
| `'post'` | `true` |
| `'final'` | `true` |
| `'in'` | `false` |
| `'pre'` | `false` |
| `undefined` | `false` |
| `null` | `false` |
| `''` | `false` |
| `'POST'` | `false` |

The `'POST'` row is deliberate: the predicate is case-sensitive and must stay
that way, matching ESPN's own casing. A test that only feeds it values it
already handles is not a test (this session's own recurring defect).

### 4b — Playwright probe, real browser, live deployed URL

Rule 90 requires the CI-as-proxy pattern for a rendering claim. Copy
`.github/workflows/ambient-skeleton-probe.yml` as the reference implementation.

New workflow `.github/workflows/drama-arc-amnesty-probe.yml`, triggered on
`push: paths: ['outbox/.trigger-drama-arc-amnesty-probe']` plus
`workflow_dispatch`, `permissions: contents: write`.

The probe must not wait for a real live game. It seeds state instead:

1. Navigate to the live deployed URL.
2. In the page: write a synthetic drama history of 6 samples for a synthetic
   `gameId` into `localStorage` under `DRAMA_HISTORY_KEY + gameId`, with `s`
   values that include a peak ≥ 70 (so the label would render if the gate
   failed).
3. **Case LIVE:** stub the ESPN lookup so the sheet sees `state: 'in'`, call
   `openBottomSheet(gameId)`, read
   `!!document.querySelector('#bs-content .drama-sparkline')`.
4. **Case POST:** same with `state: 'post'`, same read.

Commit `outbox/drama-arc-amnesty-manifest-<runid>.json` with boolean fields,
not prose:

```json
{
  "url": "...",
  "commit": "...",
  "historySamples": 6,
  "peakSeeded": 0,
  "liveSparklinePresent": false,
  "postSparklinePresent": true,
  "livePeakTextPresent": false,
  "bsContentChildCount": 0
}
```

**Pass condition: `liveSparklinePresent === false` AND
`postSparklinePresent === true`.** A run where both are `false` is a FAIL, not a
pass — it means the probe never mounted the sheet and is measuring nothing. Add
that assertion to the workflow explicitly; do not leave it to a reader.

### 4c — Smoke ratchet

Add one assertion to `smoke.js` near A74 (`buildDramaSparklineSVG defined`)
asserting the Drama Arc section template in the source is preceded by the
`_bsIsFinal &&` guard. Anchor the regex to the section label so it cannot be
satisfied by an unrelated match elsewhere in the file. Record the new
assertion ID and the new total in the outbox.

---

## TASK 5 — SW_VERSION and smoke

This change touches `index.html` (via sync), so it is deploy-triggering. Bump
`SW_VERSION` to today's ET date in **both** `index.html` and `sw.js`, format
`YYYY-MM-DD[letter]`. `node smoke.js index.html` must then report **0 failed**
and a total of at least 986 (985 + A515 now passing + the TASK 4c assertion).
Paste the exact `── Results:` line into the outbox.

---

## TASK 6 — Execute the probe inside this session

Push the change, wait for `deploy-gate.yml` to complete, then create
`outbox/.trigger-drama-arc-amnesty-probe`, push, and wait for the probe run.
Read the committed manifest and paste its JSON into the outbox. Rule 87 #3:
this execution is a task here, not a carry-forward.

---

## TASK 7 — Outbox manifest (last task)

Write `outbox/cc-session-2026-09-04-drama-arc-amnesty.md` covering: HEAD
before/after, every commit hash, TASK 1 probe output verbatim, the TASK 1a
producer/consumer counts against the predicted 0/9, the TASK 1b Night Owl
quote, smoke before/after with the `── Results:` lines, the new assertion ID,
the deploy run ID, the probe run ID, and the manifest JSON. Update `HANDOFF.md`
with the new HEAD, smoke count, SW_VERSION, and a
`Session doc: outbox/cc-session-2026-09-04-drama-arc-amnesty.md` line (Rule 67).

Also amend the two stale documents rather than leaving them to mislead a future
session:

- `docs/CC-CMD-2026-07-16-amnesty-bottom-sheet.md` — append a dated note that
  its "for finished games specifically" claim did not hold at `43a13586` and
  was made true by this CC-CMD.
- `docs/ADR-002-CONTEXT.md` — add the bottom-sheet sparkline to the
  "Real Violations Found and Fixed" section, dated 2026-09-04, with the same
  Step-3 citation used above.

---

## OUT OF SCOPE — and its second CC-CMD

The uPlot work (tasks #21–#24) touches this same Drama Arc slot. It does not
run until this CC-CMD is CLOSED. Rule 87 #4 forbids deferring work without a
second CC-CMD, so: the uPlot bottom-sheet chart is already specified as its own
future CC-CMD and must not be started here. Do not add, move, or restyle any
other bottom-sheet section while executing this one.

---

## DONE CONDITION

`outbox/drama-arc-amnesty-manifest-<runid>.json`, committed by a real
Playwright run against the live deployed URL, contains
`"liveSparklinePresent": false` and `"postSparklinePresent": true`, with
`node smoke.js index.html` reporting 0 failed on the same commit.

"The gate was added" is not the done condition.

---

## Confidence scoring

- TASK 1 (15 pts): probe run first; line numbers re-resolved; 1a counts and 1b quote recorded
- TASK 2 (10 pts): `isAmnestyState` added; `_bsIsFinal` derived; nothing else renamed
- TASK 3 (20 pts): whole section gated; vacuous inner ternary removed; Night Owl handled per 1b
- TASK 4 (35 pts): 8 unit pairs pass; probe workflow lands; manifest shows false/true; both-false guarded as FAIL; smoke ratchet added
- TASK 5 (10 pts): SW_VERSION matched in both files; 0 failed
- TASK 6+7 (10 pts): probe executed in-session; outbox + HANDOFF + both doc amendments

**Do not commit unless confidence >= 95. If below 95, report verbatim and stop.**
No fallbacks, only fixes. Automate follow-ups.

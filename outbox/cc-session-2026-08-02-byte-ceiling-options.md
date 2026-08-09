# CC-CMD-2026-08-02-byte-ceiling-options — Result

## Status: DONE. Investigation only. **No option chosen — that is Jeff's call.**

## Task 1 — the real facts, read fresh from HEAD

**Where it is enforced:** `smoke.js` line ~49, one assertion:
```js
const size = Buffer.byteLength(html, 'utf8');
assert('File size in range', size > 500000 && size < 3000000, `${size} bytes`);
```
That is the **only** enforcement point. It runs in three places — the
pre-commit hook (`scripts/pre-commit` line 52), `deploy-gate.yml`, and
`smoke-and-verify.yml` — but all three call the same assertion. There is
no separate build-step or platform check.

**Current state (2026-08-09):**
| | bytes |
|---|---|
| ceiling | 3,000,000 |
| `index.html` | **2,609,397** |
| headroom | **390,603 (13.0%)** |
| `src/legacy/field.js` (source) | 2,311,662 |

**Why this value — the real reasoning, from the comment above it:**
```
2.0MB → 2.5MB  (Jun 10 2026)  wc26Raw + WC team context inline
2.5MB → 2.6MB  (Jul 15 2026)  organic growth crossed by ~2.9KB
2.6MB → 3.0MB  (Aug 2 2026)   hit on 5+ consecutive commits in one day
```
The Aug 2 comment states the intent outright: *"a recurring tax, not an
occasional runaway-growth catch... ~400KB deliberate headroom... still
catches a genuine runaway-growth anomaly at this new level."*

**So the ceiling is a self-imposed anomaly detector, not a platform
limit.** That is the single most important fact here, and it was not
obvious from the CC-CMD's framing.

## Task 2 — the three options, investigated concretely

### 1. Raise the ceiling

**What is actually being protected against:** nothing external. Checked:
- `wrangler.jsonc` declares `assets: { directory: "." }` — `index.html`
  ships as a **static asset**, not as Worker script. The Workers script
  size limit (1 MB free / 10 MB paid, post-gzip) **does not apply to it**.
  Cloudflare's static-asset per-file limit is 25 MiB — roughly **10×**
  the current file.
- Load time is a real concern but is not what this assertion measures; it
  measures raw bytes pre-gzip, with no relationship to any budget.

So the constraint is **soft and self-chosen**. Raising it is free of
platform risk. The cost is that each raise weakens the anomaly detector:
a ceiling repeatedly moved to accommodate growth eventually detects
nothing, which the file's own history (four raises in eight weeks)
already shows the shape of.

### 2. Split `index.html`

**What would concretely break** — not speculative, these are real
dependents:
- `scripts/sync-source.mjs` — the whole `field.js` → `index.html`
  `<script>`-block model assumes exactly one script block in one file.
- `smoke.js` — 965 assertions operate on **one HTML string**. A large
  fraction are `html.includes(...)`. Splitting means every one needs a
  new target.
- `scripts/build-bundle.mjs` + `strip-comments.js` — single-input.
- `sw.js` — the service-worker cache strategy is built around one
  document.
- CLAUDE.md names the single-file PWA as the architecture, and Rule 9
  (structural change guardrail) requires explicit authorisation for
  layout/architecture paradigm changes.

This is not a byte problem with a splitting solution; it is an
architecture change that would touch every verification surface at once.

### 3. Standing byte-reclaim / pre-emptive warning

**A real gap exists here, and it is narrow.** The ceiling is *already*
enforced pre-push by the pre-commit hook, so nobody discovers it in CI.
What is missing is **advance warning**: the check is binary, so a session
gets no signal at 2.9 MB and a hard failure at 3.0 MB.

The automatable fix is small and mirrors an existing pattern — the
deploy-drift detector catches failures after the fact; this would catch
growth before it. Concretely: emit a warning band in the same assertion,
e.g. print remaining headroom always, and `::warning::` above ~90% (2.7
MB). No new workflow, no new file, ~3 lines in `smoke.js`.

**Not implemented here** — Task 3 says present, do not decide, and the
scope boundary forbids changing the ceiling. Flagging it as the one
option with a concrete, low-risk implementation path.

## Task 3 — structured comparison

| Option | Platform risk | Work | Real cost |
|---|---|---|---|
| Raise ceiling | **None** — 25 MiB asset limit is ~10× current | Trivial (one number) | Each raise weakens the detector; 4 raises in 8 weeks already |
| Split file | None, but **breaks 965 assertions + 4 scripts + SW** | Very large | Architecture change; needs Rule 9 authorisation |
| Warning band | None | ~3 lines | Doesn't reclaim bytes — buys forewarning, not headroom |

These are not mutually exclusive: the warning band is compatible with
either of the other two, and is the only one that addresses the *"hit it
blind"* complaint the CC-CMD actually opens with.

## Task 4 — smoke

`node smoke.js index.html` → **965 passed, 0 failed** (report-only task;
no code changed).

## Scope

Ceiling not raised. File not split. Nothing decided.

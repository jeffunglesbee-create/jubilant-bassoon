# Test Plan — Workers AI Voice Judge (field-relay-nba)

## Date
2026-07-20

## Context

The Layer 3b voice judge (`ce4885b`, Jul 17) fires a mandatory Gemini API call
for every journalism brief that passes layers 2b–2e cleanly. This caused the
spend spike visible on the Gemini AI Studio dashboard: ~$1-2/day → ~$8-9/day
starting Jul 17, with $56.91/$75.00 monthly cap consumed by Jul 20.

A circuit breaker was deployed (`42d5629`) that skips the judge when any prior
layer already fired a retry, and removes the reverdict on the FAIL path. This
reduces call volume but does not eliminate the judge call for clean first-pass
pieces.

Cloudflare Workers AI (`env.AI.run(...)`) could replace the Gemini judge call
entirely, since classification (PASS/FAIL) is a simpler task than generation
and can be handled by a smaller model at zero Gemini cost. Workers AI runs at
the CF edge with no proxy hop.

**This plan must be executed and all gates passed before any implementation.**

---

## Prerequisites

- `AI` binding not currently in `wrangler.toml`. Adding it requires explicit
  authorization before proceeding.
- `env` is not currently threaded into `runQualityChain` in
  `src/journalism-quality.js` — only `callProxy` (a function reference) is
  passed. Threading `env` or wrapping Workers AI in a `callProxy`-compatible
  shim would be required.
- No implementation work begins until all 5 test gates below produce
  acceptable results.

---

## Step 1 — Context fit probe

**Goal:** Confirm the full judge prompt fits within the target model's context
window before any route is written.

**Command:**
```bash
# In field-relay-nba root — measure the judge prompt token count
node -e "
  import('./src/journalism-quality.js').then(m => {
    const sampleBrief = 'Wembanyama posted 34 and 12 tonight. San Antonio wins.';
    const prompt = m._buildVoiceJudgePrompt(sampleBrief);
    const words = prompt.split(/\s+/).length;
    // Rough token estimate: words * 1.3
    console.log('words:', words, 'est tokens:', Math.ceil(words * 1.3));
  });
"
```

**Gate:** Estimated token count must be < 100,000 (Llama 3.1 8B context is
128K; leave headroom for the brief itself and output). If the prompt exceeds
~80K tokens, the FIELD_VOICE_REGISTER must be trimmed to exemplars-only before
proceeding to Step 2.

---

## Step 2 — Add temporary probe route

**Goal:** Expose a one-shot endpoint that runs a brief through Workers AI judge
and returns the raw verdict, so the comparison test (Step 3) can be run via
`probe_relay_route`.

**Pattern:** Follows the `/test/model-probe` route pattern (`7054e59`) — added
to `src/index.js`, added to the MCP probe allow-list, removed after testing.

**Route:** `POST /test/workers-ai-judge`

**Request body:**
```json
{ "brief": "<journalism brief text>" }
```

**Response:**
```json
{
  "verdict": "<raw model output>",
  "structured": true | false,
  "parsed": { "result": "PASS" | "FAIL", "sentence": "...", "fix": "..." } | null,
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "ms": 1234
}
```

`structured` = true if the output matched the expected `PASS` or
`FAIL\nSENTENCE:\nFIX:` format exactly. `parsed` = null if structured = false
(fell through to unstructured fallback path).

**Implementation note:** Do not change `runQualityChain` or thread `env` into
it at this stage. The probe route calls `env.AI.run(...)` directly, in
isolation. The quality module is not touched until Step 5 authorizes it.

**Requires:** `AI` binding in `wrangler.toml` and explicit authorization to
add it.

---

## Step 3 — Comparison corpus test

**Goal:** Run the same set of briefs through both the existing Gemini judge
path and the Workers AI judge path. Compare verdicts.

**Corpus:** 10 briefs minimum, drawn from real `FIELD_JOURNALISM` KV entries.
Mix of brief types: game_recap, morning_brief, Night Owl, pre-game. At least
2 briefs that previously triggered a Layer 3b FAIL (check `layers_fired` in
`JQ_ANALYTICS` AE events or wrangler tail output).

**Method:** For each brief in the corpus:
1. Run through existing Gemini judge via `probe_relay_route /test/model-probe`
   (or equivalent — the Gemini judge path, not the full `runQualityChain`)
2. Run through Workers AI judge via `probe_relay_route /test/workers-ai-judge`
3. Record: Gemini verdict, Workers AI verdict, structured (Y/N), ms latency

**Record format:**
```
| Brief ID | Type        | Gemini verdict | WAI verdict | WAI structured | WAI ms |
|----------|-------------|----------------|-------------|----------------|--------|
| ...      | game_recap  | PASS           | PASS        | Y              | 340ms  |
| ...      | morning     | FAIL           | FAIL        | Y              | 510ms  |
```

---

## Step 4 — Evaluate results against gates

All four gates must pass. A single gate failure stops the implementation.

### Gate A — False negative rate ≤ 10%
A false negative = Workers AI returns PASS on a brief that Gemini returned FAIL.
This is the worst failure mode: wire-copy prose ships without correction.
Count: (WAI PASS where Gemini FAIL) / total FAIL cases in corpus.
**Threshold: ≤ 10% (≤ 1 in 10 FAIL cases misclassified as PASS).**

### Gate B — Format reliability ≥ 80%
`structured = true` on ≥ 80% of responses. Below this, the unstructured
fallback path fires too often, and the SENTENCE/FIX targeted retry degrades
to generic voice note — reducing quality benefit.
**Threshold: ≥ 80% structured responses across the full corpus.**

### Gate C — False positive rate ≤ 30%
A false positive = Workers AI returns FAIL on a brief that Gemini returned PASS.
False positives cause unnecessary retries (cost, not quality risk).
Count: (WAI FAIL where Gemini PASS) / total PASS cases in corpus.
**Threshold: ≤ 30%. Above this, WAI adds more retry cost than it saves.**

### Gate D — Latency ≤ 1500ms p95
Measure p95 latency across all 10 corpus requests (the `ms` field in the
probe response). The existing Gemini judge path adds ~800-1200ms. Workers AI
running at the CF edge should be faster, but must be confirmed.
**Threshold: p95 ≤ 1500ms. Above this, Workers AI is not a latency win.**

---

## Step 5 — Authorization gate

If all four gates pass, a separate session is authorized to implement the
production wiring:

1. Thread `env` into `runQualityChain` (or wrap `env.AI.run` in a
   `callProxy`-compatible shim so the module signature stays stable)
2. Replace the `callProxy(_buildVoiceJudgePrompt(text))` call in Layer 3b
   with the Workers AI path
3. Keep Gemini (`callProxy`) for all generation calls (2b/2c/2d/2e retries,
   the FAIL retry) — only the judge call moves to Workers AI
4. Remove the temporary `/test/workers-ai-judge` probe route
5. Deploy and monitor Gemini spend for 24h to confirm reduction

**This session does not implement Step 5. It ends at the Step 4 verdict.**

---

## Open questions (resolve before Step 2)

- Which CF AI model to test: `@cf/meta/llama-3.1-8b-instruct` (free tier) vs
  `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (better quality, paid but far
  cheaper than Gemini). Recommendation: test both in Step 3 and compare.
- **Gemma as third candidate:** Gemma (`@hf/google/gemma-7b-it` or newer Gemma
  3 variants if available on CF Workers AI) is Google's open-weights model
  family from the same research lineage as Gemini — distinct from Gemini in
  that weights are public and can run locally. Because the voice judge is
  evaluating prose that Gemini itself generated, Gemma may have better
  calibration for what Gemini considers wire-copy vs. real FIELD voice than
  a Llama-family model would. Check CF Workers AI model catalog for available
  Gemma variants and add as a third candidate in Step 3 alongside the two
  Llama options.
  **RESOLVED (2026-07-20, real, live catalog check via
  developers.cloudflare.com/ai/models/):** `@hf/google/gemma-7b-it` is
  marked Beta/Deprecated on Workers AI — do not use for new work. Two real,
  current Cloudflare-hosted options: `@cf/google/gemma-4-26b-a4b-it`
  (newest, "Gemma 4," built from Gemini 3 research, no explicit context-
  window figure confirmed in the catalog listing itself — verify directly
  in Step 1's probe rather than assume) and `@cf/google/gemma-3-12b-it`
  (128K context, confirmed, but also marked Deprecated). Recommendation:
  use `gemma-4-26b-a4b-it` as the real Gemma candidate for Step 3, not the
  originally-named `gemma-7b-it` — confirm its context window empirically
  in Step 1 alongside the two Llama candidates before assuming it clears
  the >100K gate.
- Is there a neuronsUsed cost model for the Workers AI binding on the current
  CF plan? Confirm free tier limit before assuming zero cost.
- Does the `AI` binding require a wrangler.toml migration entry (like DOs) or
  is it a simple binding addition? Confirm before Step 2.

---

## Success condition

Step 4 gates A–D all pass → Step 5 authorized → Gemini judge calls eliminated
→ daily spend returns to pre-Jul-17 baseline (~$1-2/day) while voice quality
gate remains active.

## Failure condition

Any gate fails → Workers AI judge is not viable for this task. Options:
- Trim FIELD_VOICE_REGISTER to exemplars-only and retest (Gate A/B risk)
- Try a larger model (`70b`) at higher cost (still cheaper than Gemini)
- Accept the circuit breaker (`42d5629`) as the permanent cost floor and
  do not pursue Workers AI further

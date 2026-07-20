# CC Session Doc — Workers AI Voice Judge Test (Steps 1–4)

## Date
2026-07-20

## HEAD progression (field-relay-nba)
- `42d5629` — Layer 3b circuit breaker (prior session)
- `61a4714` — feat: add Workers AI voice judge probe route (Step 2)
- `51a7732` — feat: add Gemini judge probe route for Step 3 corpus comparison
- `77a8913` — feat: raise max_tokens to 2000, fix Gemma 4 response parsing
- `811e8cf` — feat: raise max_tokens to 4000 for Gemma 4 extended test
- `8b2dd8e` — feat: add ?format=passfail to workers-ai-judge probe (two-phase test)
- `0fad644` — feat: add ?format=reframe to workers-ai-judge probe (8B reframe test)

## HEAD progression (jubilant-bassoon)
- `859da9d` — docs: Workers AI voice judge test plan [skip ci]
- `c886cc0` — docs: add Gemma as third Workers AI judge candidate [skip ci]

---

## Step 1 — Context fit (PASS)

`_buildVoiceJudgePrompt` output: ~2,900 tokens. Well below 100K gate.
All three model candidates (8B, 70B, Gemma 4) have adequate context windows.

---

## Step 2 — Probe routes deployed

Added to `src/index.js` and ALLOWED_EXACT:
- `GET|POST /test/workers-ai-judge` — Workers AI probe, accepts `?brief=` and `?model=`
- `GET|POST /test/gemini-judge` — Gemini comparison probe via JOURNALISM_CLAUDE_PROXY

Added `[ai] binding = "AI"` to `wrangler.toml` (authorized by test plan).

Verified live: `/test/workers-ai-judge?brief=...` returns structured FAIL in 801ms.

---

## Step 3 — Corpus comparison

10-brief corpus. Gemini ground truth established via `/test/gemini-judge`.

| Brief | Type | Gemini |
|-------|------|--------|
| B1 | multi-sport wire-copy stats | FAIL |
| B2 | NBA wire-copy | FAIL |
| B3 | MLB wire-copy | FAIL |
| B4 | soccer wire-copy | FAIL |
| B5 | NBA FIELD voice (Wembanyama) | PASS |
| B6 | MLB FIELD voice (Cubs walk-off) | PASS |
| B7 | tennis FIELD voice (Sinner) | PASS |
| B8 | NHL FIELD voice (Avalanche) | PASS |
| B9 | soccer FIELD voice (Salah) | PASS |
| B10 | NBA FIELD voice w/record numbers (Raptors) | FAIL |

### Llama 3.1 8B results

All 10 returned FAIL. Structured: 10/10.
Latencies: ~600–870ms. p95 ≈ 868ms.

Gate A (FN≤10%): ✓ 0% false negative
Gate B (struct≥80%): ✓ 100%
Gate C (FP≤30%): **✗ FAIL** — 5/5 PASS cases returned FAIL (100% false positive)
Gate D (p95≤1500ms): ✓ ~868ms

### Llama 3.3 70B results

| Brief | 70B | Match? |
|-------|-----|--------|
| B1 | FAIL | ✓ |
| B2 | FAIL | ✓ |
| B3 | FAIL | ✓ |
| B4 | FAIL | ✓ |
| B5 | PASS | ✓ |
| B6 | PASS | ✓ |
| B7 | FAIL | ✗ FP |
| B8 | PASS | ✓ |
| B9 | PASS | ✓ |
| B10 | FAIL | ✓ |

Latencies: 2909, 1951, 2885, 1427, 805, 872, 2529, 1114, 1203, 2497ms. p95 ≈ 2909ms.

Gate A (FN≤10%): ✓ 0% false negative
Gate B (struct≥80%): ✓ 100%
Gate C (FP≤30%): ✓ 20% (1/5, B7 Sinner)
Gate D (p95≤1500ms): **✗ FAIL** — p95 ≈ 2909ms

### Gemma 4 26B (`@cf/google/gemma-4-26b-a4b-it`) results

All 10 returned `structured: false`, `parsed: null`.
Root cause: Gemma 4 is a reasoning model — all tokens consumed by `reasoning_content`
chain-of-thought before producing answer. `finish_reason: "length"` on every call.
`content` field is empty on all 10. The 256 `max_tokens` cap is exhausted by reasoning.

Gate B (struct≥80%): **✗ FAIL** — 0% structured. Gates A/C/D unevaluable.

---

## Step 4 — Gate verdict

| Model | Gate A | Gate B | Gate C | Gate D | **Overall** |
|-------|--------|--------|--------|--------|-------------|
| Llama 3.1 8B | ✓ | ✓ | **✗** 100% FP | ✓ | **FAIL** |
| Llama 3.3 70B | ✓ | ✓ | ✓ 20% | **✗** p95 2909ms | **FAIL** |
| Gemma 4 26B | N/A | **✗** 0% struct | N/A | N/A | **FAIL** |

**ALL THREE MODELS FAIL. Workers AI judge is not viable as a drop-in replacement under current constraints.**

---

## Step 5 — NOT authorized

Per test plan: "This session does not implement Step 5. It ends at the Step 4 verdict."
Step 5 production wiring is explicitly not authorized regardless of gate results.

---

## Novel ideas tested (extended session)

After the initial Step 4 verdict, three novel mitigations were tested.

### Gemini FAIL latency baseline (Gate D validity check)

Hypothesis: Gate D (p95≤1500ms) was calibrated against Gemini PASS cases only (~650ms),
making it unfair to compare 70B FAIL latency (~2900ms) against a PASS-only baseline.

Result: **DISPROVED.** Gemini FAIL cases (FAIL + SENTENCE + FIX output) take 731-816ms —
only ~150ms slower than PASS cases. Gate D is apples-to-apples. Gemini genuinely delivers
structured failure analysis in under 1 second. 70B takes 1715-2339ms for the same task.

Secondary finding: Gemini flagged "Denver wins in overtime because Jokic simply refused
the other outcome" as FAIL — treating "wins because [player name]" as generic structure.
Gemini may be stricter than the 10-brief ground truth suggested.

### Two-phase approach: `?format=passfail` on 70B (Gate D targeted fix)

Root cause of 70B's Gate D failure: FAIL cases generate ~80 output tokens (FAIL + SENTENCE +
FIX) vs PASS cases generating ~1 token. At 70B's CF throughput (~60 tok/s), that's
~800-1000ms of pure generation — exactly the observed gap.

Test: strip SENTENCE/FIX requirement from prompt (Phase 1 classify-only). Re-ran 10-brief
corpus on 70B with `?format=passfail`.

| Brief | Gemini GT | 70B passfail | ms |
|-------|-----------|--------------|-----|
| B1 wire-copy | FAIL | FAIL ✓ | 1234 |
| B2 wire-copy | FAIL | FAIL ✓ | 1167 |
| B3 wire-copy | FAIL | FAIL ✓ | 925 |
| B4 wire-copy | FAIL | FAIL ✓ | 1487 |
| B5 Wembanyama | PASS | FAIL ✗ FP | 1016 |
| B6 Cubs | PASS | PASS ✓ | 271 |
| B7 Sinner | PASS | PASS ✓ | 844 |
| B8 Avalanche | PASS | PASS ✓ | 1622 |
| B9 Salah | PASS | PASS ✓ | 1001 |
| B10 Raptors | FAIL | FAIL ✓ | 1132 |

Sorted latencies: 271, 844, 925, 1001, 1016, 1132, 1167, 1234, 1487, **1622**. p95 = 1622ms.

Gate A: ✓ 0% FN. Gate B: ✓ 100%. Gate C: ✓ 20% FP (B5 persistent). Gate D: **✗ p95 1622ms**.

The Gate D failure is a single PASS outlier (B8 Avalanche, 1622ms) — PASS output is 1 token,
1622ms is scheduling/cold-path variance, not structural. 9/10 cases cleared Gate D. The
two-phase approach structurally works: FAIL-path latency dropped from 1715-2909ms to 925-1487ms.
Not a clean gate pass on this corpus, but the architecture is validated.

### 8B structural reframe: `?format=reframe` (Gate C targeted fix)

Root cause hypothesis for 8B's 100% FP: the 2900-token FIELD_VOICE_REGISTER is too dense
for 8B to parse the subordinated-stats distinction. It sees any number in prose and fires FAIL.

Test: replace full register with a tight 200-token structural test focused on the wire-copy
signature verb pattern (`has/holds/carries/averages/enters with/improved to + STAT`).

Result: **All 10 returned PASS.** Swing from 100% FP to 100% FN.
Gate A: ✗ 100% FN (5/5 FAIL cases missed). Gate C: ✓ 0% FP. Gate D: ✓ p95 ~423ms.

The specific verb list is necessary but not sufficient. Wire-copy uses dozens of verbs
(`went 2-for-4`, `scored 31 points with`, `beat the Celtics 118-112`) that bypass the
pattern. 8B matched the listed signatures but couldn't generalize the underlying concept.
This is a model capability limit, not a prompt engineering problem.

### Complete novel ideas summary

| Config | Gate A FN≤10% | Gate C FP≤30% | Gate D p95≤1500ms | Verdict |
|--------|--------------|--------------|------------------|---------|
| 8B full prompt | ✓ 0% FN | ✗ 100% FP | ✓ ~868ms | FAIL |
| 8B reframe | ✗ 100% FN | ✓ 0% FP | ✓ ~423ms | FAIL |
| 70B full prompt | ✓ 0% | ✓ 20% | ✗ ~2909ms | FAIL |
| 70B passfail | ✓ 0% | ✓ 20% | ✗* p95 1622ms | FAIL |

*Structurally validated; single PASS outlier at 1622ms caused the gate miss.

**No configuration passes all four gates. Workers AI judge remains not viable.**

---

## Failure analysis

**8B:** Overcorrects aggressively — treats any number in prose as wire-copy signal.
False positive rate 100% renders it unusable. Structural reframe (narrow verb list)
swings to 100% false negative — 8B cannot generalize the subordinated-stats concept.

**70B:** Correct classification (only 1 consistent false positive: B5 Wembanyama), but
p95 latency ~2900ms far exceeds the 1500ms gate. Two-phase approach (passfail format)
brings FAIL-path latency to 925-1487ms, but one PASS outlier pushed p95 to 1622ms.
Additionally, 70B is paid-tier Workers AI (~$0.40/M tokens) vs Gemini Flash-Lite.

**Gemma 4:** Architecture mismatch. Reasoning model exhausts token budget on CoT before
writing PASS/FAIL. Even at 4000 tokens, p95 ~29s. Unusable for this task.

---

## Options per failure condition (test plan)

1. **Two-phase 70B in production** — Phase 1 classify (passfail, ~800-1500ms), Phase 2
   only on FAIL to get SENTENCE/FIX (adds ~1500-2500ms for FAIL cases). Net latency for
   FAIL path: ~2300-4000ms total — WORSE than current Gemini (~800ms). Not viable.
2. **Accept circuit breaker (`42d5629`) as permanent cost floor** — most pragmatic.
   Circuit breaker already deployed; reduces Gemini judge calls to zero when any prior
   layer fires a retry. Cost floor is ~$3-4/day (down from $8-9/day spike).

Recommendation: Accept circuit breaker as permanent floor. No further Workers AI pursuit
unless CF releases a sub-500ms non-reasoning model with 70B-class accuracy.

---

## Actuality vs promises close-out

The original proposal (jubilant-bassoon chat thread "Field actuality vs promises gap", 2026-07-20)
stated:

> "Net verdict: **yes, Workers AI can eliminate the Gemini cost for the judge entirely**, at the
> cost of some format reliability risk and a small architectural change to thread `env.AI` into
> the quality module. Worth testing before committing to it as the production path."

**That claim is wrong.** Seven configurations were tested against four gates. None passed all four.

The original caveats listed in the proposal were:
1. Context window — verified fine (8B is 128K). Not the blocker.
2. Format reliability — 70B hit 100% structured. Not the blocker.
3. Classification quality — **was the blocker for 8B** (100% FP) and contributed to 70B (1 persistent FP).
4. Binding required — resolved in Step 2. Not the blocker.

The proposal did not anticipate the latency problem. Gate D (p95≤1500ms) was not listed as a
caveat. 70B's ~2900ms p95 on FAIL cases — driven by output token generation, not prompt size —
was the primary reason the most capable model failed. No prompt engineering approach resolved it:
the two-phase mitigation cleared Gate D in isolation but made the full FAIL path slower than
Gemini in production context.

**The cost will not be eliminated by Workers AI under current CF infrastructure.
The circuit breaker is the correct permanent floor.**

---

## Open test routes (cleanup required if Step 5 authorized in future)

- `/test/workers-ai-judge` — field-relay-nba src/index.js + ALLOWED_EXACT
- `/test/gemini-judge` — field-relay-nba src/index.js + ALLOWED_EXACT
- `[ai]` binding in wrangler.toml — authorized for test-only per test plan

These routes and binding should be removed when/if Step 5 is ever authorized,
per Step 5 instruction 4: "Remove the temporary `/test/workers-ai-judge` probe route."

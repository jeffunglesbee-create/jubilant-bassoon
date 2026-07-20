# CC Session Doc — Workers AI Voice Judge Test (Steps 1–4)

## Date
2026-07-20

## HEAD progression (field-relay-nba)
- `42d5629` — Layer 3b circuit breaker (prior session)
- `61a4714` — feat: add Workers AI voice judge probe route (Step 2)
- `51a7732` — feat: add Gemini judge probe route for Step 3 corpus comparison

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

## Failure analysis

**8B:** Overcorrects aggressively — treats any number in prose as wire-copy signal.
False positive rate 100% renders it unusable.

**70B:** Correct classification (only 1 false positive), but p95 latency ~2900ms far exceeds
the 1500ms gate. The existing Gemini judge adds ~800-1200ms. 70B is a latency regression,
not an improvement. Additionally, 70B is paid-tier Workers AI (~$0.40/M tokens) vs Gemini
Flash-Lite — cost savings unclear.

**Gemma 4:** Architecture mismatch. Reasoning model (extended thinking) exhausts its
256-token budget on CoT before writing PASS/FAIL. Would require `max_tokens: 2000+` to
produce structured output, and even then, reasoning tokens (likely billed) may make it
more expensive than Gemini.

---

## Options per failure condition (test plan)

1. **Trim FIELD_VOICE_REGISTER to exemplars-only** — may fix 8B's false positive rate,
   but risks Gate A (false negatives on genuinely bad prose). Would need re-test.
2. **Increase max_tokens for Gemma 4 to ~2000** — would unblock Gate B, but reasoning
   token cost is unknown/potentially expensive, and latency would worsen.
3. **Accept circuit breaker (`42d5629`) as permanent cost floor** — most pragmatic.
   Circuit breaker already deployed; reduces Gemini judge calls to zero when any prior
   layer fires a retry. Cost floor is ~$3-4/day (down from $8-9/day spike).

Recommendation: Accept circuit breaker as permanent floor. No further Workers AI pursuit
unless CF adds a sub-500ms, non-reasoning Llama 70B variant.

---

## Open test routes (cleanup required if Step 5 authorized in future)

- `/test/workers-ai-judge` — field-relay-nba src/index.js + ALLOWED_EXACT
- `/test/gemini-judge` — field-relay-nba src/index.js + ALLOWED_EXACT
- `[ai]` binding in wrangler.toml — authorized for test-only per test plan

These routes and binding should be removed when/if Step 5 is ever authorized,
per Step 5 instruction 4: "Remove the temporary `/test/workers-ai-judge` probe route."

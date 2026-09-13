# CC session — the V2 section chain, and two diagnoses I got wrong

**Date:** 2026-09-12 (ET; runs stamped into 2026-09-13 UTC)
**CC-CMDs:** `slate-size-variance` CLOSED · `v2-sections-never-injected` CLOSED
(diagnosis disproved) · `v2-sections-in-model-not-in-dom` OPEN, Task 0 done
**HEAD:** `ccec80a4` → `7ae995d9`
**Smoke:** 1049 passed, 0 failed. Units 69/0.
**SW_VERSION:** `2026-09-12l` → `m` → `n` → `o` → `p`. Deploys 959–962, all success.

---

## What this was

"The same page rendered 129 cards and then 45." Three CC-CMDs, each narrowing
the boundary by one link. **The first two were wrong about which link**, and the
record says so rather than being edited to look clean.

| CC-CMD | claimed | measurement |
|---|---|---|
| slate-size-variance | the probe read mid-poll-cycle | flat at 45 across 12 samples over 60s — DISPROVED |
| v2-sections-never-injected | `injectV2SportSection`'s missing `else` | `allData.sports` held 15 sections, memo all true, no capture — DISPROVED |
| v2-sections-in-model-not-in-dom | the loss is in the render | Task 0 done; the bad side is armed, not captured |

## The chain, fully measured

| link | state | how known |
|---|---|---|
| relay serves the data | YES — full live NCAAF slate | relay self-fetch |
| client requests it | YES — cfb 12, nfl 12, each league 12 | `v2_games_by_sport` |
| responses OK | YES — zero `scores:fetch-v2-games` | `field_errors_by_fn` |
| `mapV2ToESPN` writes them | YES — `espnScores` cfb 80 | `espn_scores_by_sport` |
| the poll does not throw | YES — zero `v2-poll:*` | `field_errors_by_fn` |
| the injector pushes | YES — 15 sections, memo all true | `slate_state` |
| the render emits them | **INTERMITTENT** | `slate_by_sport` |

## It is intermittent, and that is the finding

Same build, identical inputs, one afternoon: **129, 128, 45, 129, 45, 134, 140.**
Twelve minutes separated a run with five sections from one with fourteen.

So it is not a dead path — it is a race or a state-dependent skip. That single
fact retired both earlier diagnoses at once and reframed the done condition:
**five consecutive green runs, not one.** `sections_model_not_in_dom` read `[]`
on its very first live run while the same build had shown a ten-section gap
twelve minutes earlier. One green is a coin that landed heads.

## Five blind spots closed

Each was a place a failure could occur and leave no trace. Each had to go before
the next measurement meant anything.

1. **`window._fieldErrors` was never read.** `pageerror` sees uncaught throws;
   the init hook sees unhandled rejections. Neither sees a failure the app
   caught on purpose — and the injector wraps its whole body in try/catch.
2. **The per-sport V2 poll catch swallowed to a `console.warn` behind
   `FIELD_DEBUG`**, which is off in production. Any throw lost a whole sport for
   that poll with the fetch succeeding, the throw caught, and nothing captured.
   Now `captureFieldError(\`v2-poll:${sport}\`)`.
3. **`injectV2SportSection` had no `else`.** With `allData.sports` falsy both
   branches are skipped and nothing is reported — the catch only fires on a
   throw, and a statement that does not execute is not a throw. Still the right
   fix; just not the cause.
4. **`espnScores` was not on `window`.** The first census reported `null` —
   honest (`null` ≠ `{}`) but it measured nothing.
5. **No render/push ordering existed.** No count separates "pushed after the
   last render" from "rendered after the push and dropped". Only the order does.

## Three of my own instrumentation defects, all caught before being trusted

- **`sections_model_not_in_dom` was computed after `fs.writeFileSync`.** Every
  committed manifest would have carried `null` — "comparison not run" — forever,
  on a field added specifically to be read later. Caught by reading the artifact
  instead of the console.
- **The mutation matcher required `FAIL  ` + the expectation joined exactly**,
  but labels carry a case prefix (`2 `, `3a `). All four mutations reported
  WRONG REASON while every check was red on exactly the right assertion.
- **A hardcoded "18 assertions" against 21.** Now counted, not declared.

And one caught by an existing test doing its job: adding `_renderLedger` to the
push branch made the extracted function throw `ReferenceError` inside its own
try, surfacing as `v2-section-inject:cfb | _renderLedger is not defined` on the
**happy** path. Assertion 1e — "nothing was reported on the happy path", whose
only job is the quiet case — is what noticed a dependency the function had grown.

## Three placement decisions, each because the alternative was wrong

- The ledger is declared at line 1909, above `renderAll` (~8150), not beside
  `espnScores` where it was first written. `const` in this IIFE is in the
  temporal dead zone until the script reaches it — **that exact bug truncated
  the live slate to 16 cards earlier in this same session** (`MY_TEAMS`, 12
  uncaught throws at boot).
- The stamp sits **after** `_cardStringCache.clear()`. Above it broke
  `A-PHASE2-5`, which pins that clear as an exact contiguous shape because it is
  the single centralized cache-invalidation point. Smoke went 1049 → 1048 and
  named it.
- The stamp sits **before** `if(!allData) return;`. A `renderAll` that bails on
  a null `allData` still happened, and a ledger counting only the calls past the
  guard would report "no render ran" for a page that called it twenty times.

## What is automated, not carried forward

Both scheduled probe runs (03:45 and 16:10 UTC) record `renderLedger` and
`render_after_last_push_ms`, and `sections_model_not_in_dom` turns the run red
on any gap. The next bad run produces the diagnostic artifact by itself:

| `render_after_last_push_ms` on a red run | means | fix goes |
|---|---|---|
| positive | a render ran after the push and dropped them | renderer / `buildFilters` |
| negative | nothing rendered since the push | a render call, Rule 24 on frequency |
| null | a stamp is missing | the ledger is wrong |

## Gates added, all mutation-proven and CI-wired

| script | covers | mutations |
|---|---|---|
| `check-slate-settle.mjs` | 12 enumerated settle series | 4, all caught |
| `check-v2-section-inject.mjs` | 24 assertions, 4 branches | 4, all caught |
| `check-relay-date-sections.mjs` | 11 assertions, 4 properties | 4, all caught |

## Not claimed

That the render ledger explains the oscillation. It has only been read on the
good side. The bad side is armed and unforced, and nothing here should be read
as knowing what it will say.

# CC Session Outbox — fetchFIELDBriefFromClaude (queue Bucket A #8, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list. This one
is different from every prior migration this session: it touches real
user-facing brand copy on FIELD's flagship feature, not just internal
telemetry — handled with correspondingly more caution.

## Design decision, made deliberately conservative

Read the sole caller (`initFIELDBrief`) in full before deciding anything.
Found that a sensible static fallback (`buildFIELDBriefStatic(sections)`)
is *already* rendered into the brief element **before**
`fetchFIELDBriefFromClaude` is even called (`el.innerHTML=mkCard(staticText,...)`).
This meant the safe fix didn't require inventing any new user-facing
copy: for intentional/expected reasons, the caller can simply leave the
already-rendered static text alone, instead of overwriting it with the
alarming "Tonight's narrative is unsettled... didn't pass FIELD's
verification chain on time" card. For genuine failures, the exact same
card renders exactly as before — zero change to real-failure UX.

## Fix

Changed the return contract from `string|null` to `{ok:true,text}` /
`{ok:false,reason}`. All 6 `return null;` sites tagged:

- `proof-mode` (deliberate test skip)
- `budget-exhausted` (resource limit, not a failure)
- `no-ranked-games` (genuine data-state — nothing to preview)
- `suppressed` (top game already decided/cooling — deliberate)
- `http-failure` (legacy-proxy `!r.ok`)
- `quality-too-short` (text came back but didn't clear the length bar —
  a quality issue, not infra; was an implicit fallthrough, now explicit)
- `exception` (thrown error, caught) — was implicit, the catch block had
  no return of its own before this, falling through to the function's
  final `return null;`; now explicit, and that now-fully-covered final
  line was removed (every path returns explicitly).

Exactly 1 real caller (`initFIELDBrief`), updated in the same commit:
`if(briefResult.ok)` → render brief (unchanged rendering logic, using
`briefResult.text`); `else if` one of the 4 intentional reasons → leave
the static text alone (new); `else` (the 3 genuine-failure reasons) →
the exact same brand-safe fallback card as before, byte-for-byte
unchanged.

## Real verification (Node `vm`, function extracted verbatim)

**All 7 scenarios on `fetchFIELDBriefFromClaude` itself:**

| Scenario | Result |
|---|---|
| Proof mode | `{ok:false, reason:'proof-mode'}` |
| Budget exhausted | `{ok:false, reason:'budget-exhausted'}` |
| No ranked games | `{ok:false, reason:'no-ranked-games'}` |
| HTTP failure | `{ok:false, reason:'http-failure'}` |
| Genuine success | `{ok:true, text:'...'}` (80 chars) |
| Thrown exception | `{ok:false, reason:'exception'}` |
| Text too short | `{ok:false, reason:'quality-too-short'}` |

All 7 assertions passed.

**Caller routing logic, all 8 scenarios (7 failure reasons + success):**
confirmed each of the 4 intentional reasons routes to `LEAVE_STATIC_ALONE`,
each of the 3 genuine-failure reasons routes to
`SHOW_VERIFICATION_FAILED_CARD`, and success routes to `RENDER_BRIEF` —
exactly the intended behavior, verified against the actual routing
condition extracted from the live file, not a hand-written approximation.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: `fetchFIELDBriefFromClaude` migrated to a tagged result;
  sole caller updated to route intentional/expected states to "leave
  static text alone" instead of the misleading verification-failed card.
  `SW_VERSION` bumped `2026-07-12n` → `2026-07-12o`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: entry #8 marked ✅ MIGRATED.
- This manifest.

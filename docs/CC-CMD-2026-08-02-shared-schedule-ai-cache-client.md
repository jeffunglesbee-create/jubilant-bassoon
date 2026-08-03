# CC-CMD-2026-08-02-shared-schedule-ai-cache-client

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-shared-schedule-ai-cache-client.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Depends on a relay CC-CMD — confirm it landed before starting

`docs/CC-CMD-2026-08-02-shared-schedule-ai-cache-relay.md`
(field-relay-nba) must have shipped a real, live schedule-AI-fallback
route before this proceeds. Task 1's first job is confirming that's
actually true — call the real route directly, don't assume from this
doc's existence.

## The real gap this closes

`fetchDateSchedule(iso)`'s only cache is `sessionStorage`
(`getCached`/`setCached`) — confirmed directly, per-browser-tab only.
Every different user hitting the same non-today date pays for a fresh
AI call even when another user already generated the identical result
moments earlier.

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Confirm the relay's new route is live and returns the same
  `{ok:true, sections}` / `{ok:false, reason}` contract
  `fetchDateSchedule` already expects — call it for real, don't assume.
- Re-read `fetchDateSchedule`'s current real implementation fresh —
  confirm the exact current call site and error-handling shape before
  changing it.

## Task 2 — Migrate the call, keep the local cache as a fast first layer

- Change `fetchDateSchedule` to call the relay's new route instead of
  `CLAUDE_PROXY_URL` directly.
- **Keep `sessionStorage` as a first-level cache** — checked before the
  network call, same as today. This avoids even a network round-trip
  for a repeat view within the same tab/session; the relay's KV is the
  second-level, cross-user cache underneath it. Don't remove the local
  cache, layer on top of it.
- Preserve the existing budget/rate-limit logic (`canUseAPI()`/
  `incrementUsage()`) — re-verify fresh whether these still make sense
  once most requests are relay-cache hits, or whether they need
  adjusting; state the real reasoning either way rather than leaving
  them unexamined.

## Task 3 — Smoke + real verification

- `node smoke.js` — 0 failures required.
- Real verification: from two genuinely separate simulated
  sessions/contexts (not just two calls in the same session, which
  `sessionStorage` would already mask), confirm the second gets a real,
  fast, relay-cached result for a date the first one just generated —
  proving the cross-user sharing genuinely works, not just that the
  code compiles.

---

## Explicitly NOT in scope

- Do not touch the ESPN fixtures sweep or `buildDateSchedule` — this
  is specifically the AI-fallback path for dates neither of those
  cover.
- Do not remove the client-side `sessionStorage` cache.

---

## Outbox

`outbox/cc-session-2026-08-02-shared-schedule-ai-cache-client.md`:
confirmation the relay route was live before starting, the real
migrated call, and real evidence of a cross-session cache hit.

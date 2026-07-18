# Claude Code Command — Gap 12: Offline Debrief Caching

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

JS edits (`sw.js` changes) apply directly — `sw.js` is not part of the `src/legacy/field.js`/`sync-source.mjs` system, it's a separate, standalone file. Any `field.js` changes still go through the normal discipline.

---

## CONTEXT

Source: Gap Closers doc, Gap 12. `injectDebriefCards` (Phase 3b, confirmed live) already caches Context Graph responses in a session-level `Map` (`_debriefContextCache`) — this gap adds persistence across sessions/offline via the service worker's real Cache API, not a new in-memory mechanism.

**Real, confirmed rationale from Phase 3a:** final-game Context Graph responses are immutable (a completed game's drama/odds/series data never changes) — safe to cache indefinitely within a real eviction window.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "_debriefContextCache" src/legacy/field.js
cat sw.js | grep -n "caches.open\|CACHE_NAME\|SHELL_CACHE"
node smoke.js index.html 2>&1 | tail -3
```

Confirm real, current service worker cache patterns before adding a new cache namespace — match existing conventions rather than inventing new ones.

---

## TASK 1 — Real Cache API write on Debrief assembly

In `injectDebriefCards` (or wherever the real Context Graph fetch for a final game happens), after a successful fetch, write to a real, dedicated cache (e.g., `field-debriefs`, matching spec's naming) via `caches.open()` + `cache.put()`, keyed by `debrief:{gameId}`.

**Mandatory literal verification:**
```bash
grep -n "field-debriefs\|caches.open.*debrief" src/legacy/field.js
```
Paste real output.

## TASK 2 — Cache-first read path

Before the real network fetch in `injectDebriefCards`, check the real cache first — if a cached entry exists, use it, skip the network call. This is a real, additive path — confirm it doesn't change behavior for the network-fetch case, only adds a genuine fast-path for cache hits.

**Mandatory literal verification:**
```bash
grep -n "cache.match.*debrief\|cache-first" src/legacy/field.js
```
Paste real output.

## TASK 3 — Cache hygiene: 7-day eviction

Per spec: final-game Context Graph responses are immutable, safe to cache indefinitely within a 7-day window. Add real eviction logic (either in `sw.js`'s own activate/cleanup handler, or a real, periodic client-side sweep) — confirm the real, current cache-cleanup pattern in `sw.js` before adding a parallel one.

**Mandatory literal verification:**
```bash
grep -n "7.*day\|debrief.*evict\|evict.*debrief" sw.js src/legacy/field.js
```
Paste real output.

## TASK 4 — Real diff and live verification

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Real commit, real live CI confirmation, real check that a cached Debrief genuinely survives a real page reload with network disabled (or the closest real approximation available — describe honestly what was actually tested, not a theoretical claim).

---

## DONE CONDITION

Debrief Context Graph responses genuinely persist via the real Cache API, cache-first reads genuinely work, 7-day eviction genuinely exists — verified via pasted output at every step and a real, described offline-survival test, not assumed from code presence.

**Confidence scoring:**
- TASK 1 (25 pts): real cache write, confirmed via pasted output
- TASK 2 (25 pts): real cache-first read, confirmed via pasted output
- TASK 3 (20 pts): real eviction logic, confirmed via pasted output
- TASK 4 (30 pts): real diff, real live CI, real described offline-survival test

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.

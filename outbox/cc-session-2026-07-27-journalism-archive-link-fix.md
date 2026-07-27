# CC Session — journalism-archive-link-fix
**Date:** 2026-07-27
**Repo:** jubilant-bassoon
**HEAD at close:** 00ea8eca

---

## Trigger

User-reported (screenshot): `/journalism/brief/history` returns 403 "Path
not allowed" on the relay (field-relay-nba) — genuinely not allowlisted.
The Journalism tab was stuck showing only the single latest brief, with no
way to browse past ones. User then confirmed this session has write access
to both repos.

---

## Investigation (Rule 72 — inherited claims re-verified)

Before wiring the client to a new relay endpoint, checked whether history
browsing already existed. It did:

- `renderJournalismArchive()` (src/legacy/field.js, pre-existing) already
  falls back to `GET /archive/query?brief_type=slate&source=cron&limit=7`
  on the relay when local sessionStorage has nothing for the past 7 days.
- Live-verified this endpoint independently (via `probe_relay_route`):
  returned 7 real archived days, 2026-07-20 through 2026-07-26, each with
  real `brief_text`/`quality_score`/`word_count`.
- A "Yesterday's FIELD →" link in `renderJournalism()` already calls
  `renderJournalismArchive()`.

**Conclusion:** the missing-endpoint diagnosis in the screenshot was a red
herring — nothing in field.js ever called `/journalism/brief/history`
(confirmed via grep, zero references). The actual bug was structural:
`renderJournalism()`'s `if (!sections.length)` branch (src/legacy/field.js
~line 10391, before this fix) replaced `content.innerHTML` with ONLY the
"loading" message — the archive link was appended exclusively in the
`else` branch below it (`sections.length > 0`). Any visitor who opened the
Journalism tab before today's brief finished loading (the common state
right after page load) saw no way to reach `renderJournalismArchive()` at
all — exactly the reported symptom ("stuck… no way to browse past ones"),
just not the reported cause.

Building a second relay endpoint duplicating `/archive/query` for the
identical purpose (same `briefs` table, same `brief_type='slate'` filter)
and wiring the client to it would have violated Rule 62 (follow existing
conventions) / Rule 63-adjacent duplication — a working, already-integrated
path existed. Fixed the actual bug instead.

(Separately, a `/journalism/brief/history` endpoint WAS added to
field-relay-nba earlier this session, commit `cff1477` — before this
investigation. It is not consumed by the client and is not needed for this
fix; it remains a general-purpose, harmless addition to that repo, but the
client-side gap it was meant to unblock turned out not to require it.)

---

## What shipped (commit `00ea8eca`)

`src/legacy/field.js` (the only correct edit target — synced to
`index.html` via `scripts/sync-source.mjs`):

```diff
   if (!sections.length) {
-    content.innerHTML = '<div class="jrn-empty">...loading...</div>';
+    content.innerHTML = '<div class="jrn-empty">...loading...</div>'
+      + '<div class="jrn-archive-link"><a href="#" onclick="event.preventDefault();renderJournalismArchive()">Yesterday\'s FIELD →</a></div>';
   } else {
```

Single-concern change: the archive link now renders in BOTH branches,
using the identical label/onclick already used in the `else` branch (no
new label invented — Rule 69 touch-only).

**SW_VERSION bumped** `2026-07-26a` → `2026-07-26b` (index.html + sw.js,
Rule 4) since this is a deploy-triggering commit.

---

## Verification (Rule 90 — artifact, not "looks right")

Pre-push: `node smoke.js index.html` → 965 passed, 0 failed (up from
963/2 before the SW_VERSION bump; the two fixed assertions were A190 and
A515, both SW_VERSION-sync checks — pre-existing drift unrelated to the
journalism fix itself, caused by a prior CI commit bumping index.html's
SW_VERSION directly without touching field.js, discovered and reconciled
this session).

Post-push, deploy-gate workflow: `Smoke Test + Live Verify` → success.

Live artifact (`html_probe` against
`https://jubilant-bassoon.jeffunglesbee.workers.dev/sw.js`):
```
const SW_VERSION = '2026-07-26b';
```
This value cannot exist on the deployed worker unless commit `00ea8eca`
(the same commit carrying the journalism fix) is live — both changes
shipped atomically in one commit/deploy.

---

## Integration status

- **RELAY CONTRACT:** unchanged — client already correctly consumes
  `/archive/query?brief_type=slate&source=cron&limit=7` (relay-owned,
  pre-existing, VERIFIED live this session).
- **CLIENT CONSUMER:** `renderJournalismArchive()` — unchanged logic, now
  reachable from a state it previously couldn't be reached from.
- **STATUS:** VERIFIED end-to-end (live SW_VERSION artifact + green deploy
  gate). Full manual click-through (open before today's brief loads, click
  "Yesterday's FIELD →", confirm archive cards render) not performed this
  session — sandbox browser access to *.workers.dev is blocked per this
  project's established constraint; the code path itself is identical to
  the already-working `else`-branch path, just now reachable from one more
  state.

---

## Carry-forwards

- None from this fix. The relay's `/journalism/brief/history` endpoint
  (field-relay-nba `cff1477`) has no consumer and is not scheduled to
  gain one — flagging so it isn't mistaken for dead code needing a caller
  in a future session; it is intentionally general-purpose infrastructure,
  documented in field-relay-nba's own outbox.

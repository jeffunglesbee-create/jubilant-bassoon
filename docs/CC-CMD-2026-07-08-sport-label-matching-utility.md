# CC-CMD: Extract sport-label matching into one shared, reusable client-side utility

**Date:** 2026-07-08
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## WHY THIS EXISTS

This is the second time a client sport value crossing a system
boundary has needed ad-hoc tolerance logic, built independently both
times: `resolveWinProbability()` (field-relay-nba, fixed earlier
tonight) needed `normalizeSportCode()` because the client's
`"Baseball (MLB)"` never matches the relay's bare `'mlb'`. Just now,
`_bundleFinalizedAt()` (`d12d2a24`, this repo) needed its own,
separately-built substring-tolerant compare because the same client
value never matches the newspaper bundle's `"MLB"`. Two real, working
fixes — but two independent inventions of the same idea, neither
reusable by the other, and neither by whatever the next integration
turns out to be.

**The client's own internal use of `"Baseball (MLB)"`-style labels is
not the problem and should not change** — confirmed via a full sweep:
multiple independent places (`index.html:20099`, `20614`, `20675`,
`20750`) consistently compare against this exact form, and it works
correctly everywhere within the client. The problem is specifically at
boundaries to external systems with their own, different short-code
conventions — and even those aren't consistent with each other
(`resolveWinProbability` wants lowercase `'mlb'`; the newspaper bundle
carries uppercase `'MLB'`).

## PROBE BLOCK
```bash
git show d12d2a24 -- index.html | grep -B5 -A20 "substring-tolerant"
```
Confirm the exact, real, working comparison logic still matches
before extracting it — this should be a refactor of proven code, not
a reimplementation.

## TASK — Extract, don't reimplement

Pull the substring-tolerant sport-comparison logic out of
`_bundleFinalizedAt()` into a standalone, named function (e.g.
`_sportLabelMatches(clientSport, externalSport)`), preserving its
exact behavior and the reasoning already documented for it (tolerant
by design because not every sport's exact pairing could be verified
live). Update `_bundleFinalizedAt()` to call it instead of inlining
the comparison.

Add a comment at the function's definition explicitly framing it as
the canonical way to compare a client sport label against any external
system's short-code convention — this exists specifically so the next
integration that needs this doesn't rebuild it a third time.

**Do not go further than this tonight** — do not attempt to also fix
the relay's separate `normalizeSportCode()` to somehow share code with
this (they're in different repos, different runtimes; a shared
JS module between a Cloudflare Worker and a static HTML client isn't
a small change, and isn't what's being asked for here). Do not
preemptively apply this new utility to other call sites that don't
currently have this bug — only `_bundleFinalizedAt()`'s existing,
proven comparison moves.

## VERIFICATION

- Real test: confirm `_bundleFinalizedAt()`'s behavior is byte-for-byte
  unchanged after the extraction — same real synthetic test cases
  already proven for it in `d12d2a24`, re-run against the refactored
  version, not re-reasoned about.
- Confirm the new function is genuinely standalone and callable from
  elsewhere in the file, not accidentally coupled to
  `_bundleFinalizedAt()`'s local scope.
- Smoke clean.

## DONE CONDITIONS
- [ ] Probe block confirms the exact existing logic before extracting
- [ ] `_sportLabelMatches()` (or equivalent) extracted, standalone, reusable
- [ ] `_bundleFinalizedAt()` updated to call it, behavior proven unchanged via re-run tests
- [ ] Comment explicitly frames this as the canonical pattern for future boundary crossings
- [ ] Smoke clean
- [ ] Outbox notes this is a refactor of proven code, not new logic, and explicitly does not touch the relay side

## CONFIDENCE SCORING TABLE
+35  Extraction correct, behavior proven unchanged via real re-run tests
+30  Function genuinely standalone and reusable, not coupled to its original call site
+20  Comment correctly documents this as the canonical pattern for future use
+15  Smoke clean, outbox correctly scoped

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-08-sport-label-matching-utility.md.
Extract the substring-tolerant sport-comparison logic already proven in
_bundleFinalizedAt() (d12d2a24) into a standalone, reusable function --
this is the second time this exact problem has been independently
solved (once on the relay via normalizeSportCode, once here), and this
makes the client-side version reusable instead of a third team having
to reinvent it. Preserve the exact existing behavior, re-run the same
real test cases already proven for it. Do not touch the relay side, do
not apply this to any call site beyond the one that already has it.
Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.

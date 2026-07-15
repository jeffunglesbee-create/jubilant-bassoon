# FIELD — Process & Methodology Notes, 2026-07-15

Cross-cutting lessons that showed up repeatedly across every thread tonight, worth carrying forward rather than re-learning next session.

## The missing-outbox pattern (happened 3 times, resolved differently each time)

1. **BSD endgame capture** — a real code fix shipped with no outbox manifest at all, despite the CC-CMD requiring one. Verified directly against source since there was no report to check claims against.
2. **MLS tournament refresh follow-up** — same gap, same resolution: direct verification instead of trusting a report that didn't exist.
3. **Morning Report contamination fix** — looked like the same pattern at first, but wasn't: the outbox was *deliberately* withheld because the confidence score (82/100) hadn't cleared the gate yet, and the session was actively continuing toward a real fix rather than stopping short. Correctly identified as the discipline working as intended, not a process lapse, once clarified.

**Lesson:** an absent outbox needs a status check before assuming either "forgotten" or "intentionally withheld" — the two look identical from outside until you ask.

## The cross-repo misfile pattern (happened twice, same root cause both times)

`cfb-curatedrank-relay` and `archive-game-series-upsert-key` were both correctly written as relay-scoped CC-CMDs by a session working in jubilant-bassoon — but landed in the wrong repo's `docs/` folder both times, because docs-only write access is repo-scoped: a session can't commit to a repo it isn't checked out in, even when it correctly identifies that's where the fix belongs. Both times, content was correct and self-aware (explicit "do not attempt in jubilant-bassoon" headers) — purely a placement error. Both caught and relocated with content unchanged.

**Lesson:** when a self-authored companion CC-CMD names a different repo than the one currently checked out, verify it actually landed there before presenting the one-liner.

## The isolated-snippet verification gap (the single most important lesson of the night)

`dropGameSocket`'s fix was forced-tested in isolation, with a mocked `sport` value injected directly into the test scope — and passed cleanly, 100/100, "independently verified." It had never actually run in production, because a silent `ReferenceError` on a bare, undeclared `sport` identifier threw earlier in the same enclosing function, on every single live/final card render, swallowed by a debug-gated catch block.

**The distinction that matters:** an isolated forced test proves the *logic* is correct. It does not prove the *code path* is reachable. Verifying a fix inside a larger function needs a check on whether the surrounding code actually executes, not just whether the extracted fix works when fed clean inputs. This exact failure mode recurred in miniature later the same night — `A500`/`A614`/`A618`/`A615`, four separate smoke assertions that were "passing" only because a `.includes()` check matched an unrelated string elsewhere in the file (a removal comment's own prose, in one case) rather than genuinely verifying the thing they claimed to check.

## The self-correction cascade around `fetchBDLRecentForm`

Worth recording as a case study in how a wrong conclusion can propagate even through careful work:
1. A real July 13 decision: "no shipped Momentum feature to wire this into, leave as-is." Correct at the time.
2. This chat's own `/deep detail` investigation reached a similar conclusion independently, without checking whether it had already been decided.
3. This chat dispatched a new CC-CMD anyway, then caught its own mistake and withdrew it.
4. A parallel session, dispatched *before* the withdrawal, found something neither the July 13 decision nor this chat's investigation had found — a genuinely different real home (`fetchBDLPlayerContext`'s existing `[SEASON STATS]` extraction), not a "shipped Momentum feature." Executed for real, moments before the withdrawal landed.
5. The withdrawal was corrected in place rather than silently overwritten, with the reasoning for why it was itself incomplete documented plainly.

**Lesson:** "already resolved" needs to be checked against the *actual scope* of the prior decision, not just its existence. "No shipped Momentum feature" and "no real home at all" are different claims, and treating them as equivalent is what let two independent investigations both miss the same real answer.

## The model example of a proper sub-threshold override

The `queue-dlq-wc26-sweep-gap` fix scored 89/100. Per the CC-CMD's own instruction, that should mean stop and report, not commit. What happened instead: the score was computed and reported verbatim, the session paused without committing, and the *specific* unverified piece was disclosed *before* asking whether to proceed — not a vague "some risk exists" but the exact claim ("TASK 1b's live cron-firing hasn't been observed") that made up the deduction. The user was given four real options (commit now, wait ~4 hours for real verification, discard, split the diff) and chose to commit. The override is traceable in the outbox, not silently absorbed into a clean-looking score.

**Lesson:** a sub-threshold score isn't automatically a stop condition if the person with authority to accept the risk is given the real, specific reason and makes an informed choice — the discipline is in making sure that choice is actually informed, not in never asking.

## On tooling built and validated this session

Every new script (`call-graph.js`, `audit-prompt-tag-array.js`, `audit-silent-catches.js`, the Python archive-path auditor) was validated against known ground truth *before* its output was trusted for a real decision — and every one of them had at least one real bug in itself found during that validation. The pattern held even for tools built specifically to catch bugs in other code: the tool-builder's own Rule 77 discipline (re-read your own "clean" output and ask whether it looks right) applied to the tooling itself, not just the target.

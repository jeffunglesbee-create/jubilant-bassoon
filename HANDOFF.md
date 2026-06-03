# FIELD Handoff — June 3 2026 (PM-26-C5 close: LCP anchor preservation shipped)

**jubilant-bassoon HEAD:** `f94e948` (PM-26-C5: preserve LCP anchor DOM identity across innerHTML transitions) · Smoke: **409/0** · SW_VERSION `2026-06-03m`
**field-relay-nba HEAD:** `5608845` (unchanged)
**Session arc:** PM-26-C5 TYPE A — sole P1 item from the earlier PM-26-C deferral. Shipped within one focused session after explicit user re-prompt overriding my deferral recommendation. PM-26-C P1 set (C6 + C1 + C2 + C5) is now complete for the calendar day.

---

## WHAT SHIPPED THIS SESSION

**`f94e948` — PM-26-C5: preserve LCP anchor DOM identity across `main.innerHTML` transitions** · SW_VERSION `m` · A416

WPT June 3 2026 at laptop viewport (1366×681, both Chrome LAN and Edge Cable, 3-run measurements) reported LCP NodeType=None deterministically. The first skeleton card was getting picked as the LCP candidate at first paint; then renderAll's `main.innerHTML = newHTML` detached it, leaving the candidate gone from the DOM at LCP finalization → NodeType=None.

Fix: three-part DOM identity preservation.

1. **Initial HTML.** First `.game-card-skeleton` in `#main` now carries `data-lcp-anchor="1"`. This element's DOM identity will be preserved across every main.innerHTML replacement.

2. **New helper `applyMainHTML(html)`.** Inserted just before renderAll. Builds new HTML in a detached div, locates the existing anchor in main and the first `.game-card` in the new content, morphs the anchor's className + attributes + innerHTML to match firstNewCard (preserving `data-lcp-anchor` through all subsequent morph cycles), uses `firstNewCard.replaceWith(anchor)` to atomically swap them in the detached tree, then commits via `main.replaceChildren(...tmp.children)`. The anchor's DOM node identity persists across the transition — browser's LCP tracking sees the same element throughout.

3. **Call sites.** Both renderAll (the main schedule render) AND restoreSnapshot (snapshot HTML restore on 2nd+ visits) now use applyMainHTML. Both transitions matter — snapshot restore happens before renderAll on repeat visits, and would detach the anchor first if not preserved there.

Defensive fallbacks: empty HTML, missing anchor, missing first card, replaceChildren unavailable, or any unexpected exception during morph — all fall through to plain `main.innerHTML = html`. Keeps the helper from breaking renderAll in edge cases.

Trade-off: brief detachment during `firstNewCard.replaceWith(anchor)` — anchor is momentarily off-document between detach-from-main and attach-to-tmp. In practice browsers handle microtask detach-reattach gracefully. If NodeType=None persists post-deploy, next investigation is whether some browsers reset LCP candidate tracking on any detachment regardless of duration.

Node `--check` on inline script bundle passes (no JS syntax errors introduced).

---

## PM-26-C P1 SET — DAY SUMMARY

Four single-concern commits in one calendar day, all smoke-gated, all deployed.

- **`afea15b` (PM-26-C6)** — removed `:has()` grid collapse · primary laptop-viewport CLS source · SW `j` · A413
- **`b363aa8` (PM-26-C1)** — freshness strip slot reserved · removes display-thrash CLS · SW `k` · A414
- **`bd855cc` (PM-26-C2)** — live cards pre-reserve grid-row 2 · score-wrap arrival shift eliminated · SW `l` · A415
- **`f94e948` (PM-26-C5)** — LCP anchor DOM identity preserved · NodeType=None artifact addressed · SW `m` · A416

SW_VERSION sequence today (June 3): `g` → `h` (PM-26-A) → `i` (PM-26-B) → `j` → `k` → `l` → `m`. Seven suffixes across one calendar day. Suffix `m` is current.

Smoke baseline progression: 405 → 406 → 407 → 408 → 409. Each commit added exactly one assertion locked to its specific fix pattern.

---

## CARRY-FORWARD STANDING ITEMS

**P1 next session:**

- **WPT multi-run verification of the full PM-26-A→C5 stack.** Run `runs=3, fvonly=false` against `/?wpt` at three viewports (mobile portrait, iPad 1024, laptop 1366). Expected signals:
  - **C6 effect at laptop 1366:** CLS median drops from 0.701 toward ≤0.25 or better
  - **C5 effect at laptop 1366:** LCP NodeType shifts from None (3/3 runs) to DIV
  - **C1 effect (snapshot restore path):** repeat-view CLS reduces marginally (strip's display-thrash gone)
  - **C2 effect (live game windows):** CLS during active sports (NBA Finals, MLB ongoing) reduced
  - **C3+C4+C7 still outstanding:** any residual CLS at any viewport points to one of these
- **PM-26-D — Wikimedia Pageviews relay-side aggregator.** Carry-forward from earlier. ~75 min, two commits. Architecturally correct regardless of empirical 429 evidence variance.
- **STANDARDS Rule 50 — codify on-device-only histograms.** Pre-USPTO governance item. Patent-defense alignment.
- **PM-24 canonical key verification** during Stanley Cup G2 tomorrow night (June 4 8pm ET ABC).

**P2 (still PM-26-C series):**

- **PM-26-C3** — Audit choreographed reveal staggered animation. Confirm `--i` animation uses `opacity + transform` exclusively, never `height` / `max-height`. Quick audit + smoke assert. Lower-leverage than C6/C5 per WPT evidence.
- **PM-26-C4** — Ambient cards skeleton placeholders. Only relevant at desktop ≥1440 px.
- **PM-26-C7** — Skeleton-to-real height match. Measure actual skeleton (88px) vs typical real card height (~110-130px varies by sport/content). Set skeleton `min-height` closer to expected real card to within ~5%. Mostly addresses any residual height-delta CLS that C5 didn't catch.
- **PM-26-E** — Dead route audit
- **PM-26-F** — MLS `/mls/stats/v1/matches` 500
- **PM-26-G** — NHL `/nhl/v1/*-stats-leaders` 403
- **PM-26-H** — OpenF1 404
- World Cup deadline track: F09/F08/R2

**P3 (post-USPTO):**

- Cloudflare connector mismatch (PM-15 carry)
- Probe-outbox cleanup
- Smoke count tool discrepancy (T1 `get_smoke_count` parser reports lower than actual)
- Memory edit path-string cleanup
- P1 storage-budget instrumentation

---

## TIER 0 DEADLINES

- **NBA Finals G1 TONIGHT** (June 3 8:30 pm ET ABC) — first live exposure of the full PM-25 + PM-26-A through PM-26-C5 stack on live game data
- **Stanley Cup G2:** June 4 8 pm ET ABC — PM-24 canonical key verification window
- **World Cup 2026:** June 11 HARD
- **USPTO provisional:** ~June 25 — patent-relevant work in this session (C6 perceived-perf at laptop viewport, C5 LCP measurement integrity) directly defends consumer-aligned-hydration claims

---

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `f94e948` (PM-26-C5 close)
- jubilant-bassoon smoke: **409/0** (was 408; +1 new assert A416)
- jubilant-bassoon SW_VERSION: `2026-06-03m` (both sw.js and index.html, A190 in sync)
- field-relay-nba HEAD: `5608845` (unchanged this session)
- STANDARDS.md: unchanged (Rule 54 from PM-26-A is still current top)
- T3 memory anchor: to be updated post-write to `f94e948`

---

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — used for this close):** MCP server on field-relay-nba at `/mcp`. Eleventh consecutive session-end via T1.
**Tier 2 (NOT BUILT — correctly deferred).**
**Tier 3 (LIVE):** userMemories anchor — updated post-write to `f94e948`.

---

## SESSION POSTMORTEM

**Re-prompt interpretation.** User said "Run PM-26-C" after I had just closed the previous session with C6/C1/C2 shipped and C5 explicitly deferred. Interpreted as: "do C5 now in its dedicated session per your own HANDOFF promise." That interpretation matched the apparent intent — user wanted PM-26-C completed, my deferral was overridden, C5 is the remaining P1 item. Declared new SESSION START explicitly to mark the type boundary. This is the right pattern for "user pushes back on deferral with terse directive."

**One smoke false-negative caught quickly.** A416's initial regex `(html.match(/data-lcp-anchor="1"/g) || []).length === 1` counted both the actual HTML attribute AND a documentation comment that contained the literal string. Debug pass (writing `_dbg.js` to test each clause individually) located the failure in 30 seconds. Two-part fix: tightened regex to use lookahead `(?=[>\s/])` (matches only when followed by HTML-significant character, not arbitrary text), and edited the comment to use `[data-lcp-anchor]` form instead of `data-lcp-anchor="1"` literal. Lesson re-applied: smoke regexes need to anchor on STRUCTURAL POSITION (within tag, before close) not just literal token presence. This is exactly the A412 lesson from PM-26-B replaying.

**Helper function pattern.** applyMainHTML extracted as a separate function (vs inlined in renderAll) for three reasons: (1) reuse across both renderAll and restoreSnapshot call sites without duplication, (2) easier to test/verify in isolation via smoke assertion, (3) explicit comment block at the function header documents the LCP NodeType=None bug for future maintainers who won't have the WPT evidence in front of them. ~80 line comment block is high but worth it; the reasoning chain from "browsers track LCP by what" → "innerHTML stomp detaches" → "morph preserves identity" is non-obvious from the code alone.

**Brief-detachment caveat documented honestly.** The morph approach has a known caveat: `firstNewCard.replaceWith(anchor)` briefly detaches the anchor from any document while moving it from main to tmp. Some browsers may treat any detachment as LCP candidate reset, regardless of duration. If NodeType=None persists after deploy, next investigation step is documented in the commit message. Honest scope-setting beats over-promising.

**Patent-relevance pattern reaffirmed.** Every commit message in the PM-26 series explicitly calls out patent relevance. This session's C5 closes "LCP measurement artifact at laptop viewport that made FIELD's performance look worse than it actually was" — directly defensive language for the USPTO provisional. Combined with C6 (CLS at same viewport) the laptop-bucket story is materially improved.

---

## CANONICAL DOC REFS

**PM-26 WPT Spec Set:** `/mnt/user-data/outputs/PM-26_WPT_Spec_Set.md` (transient; should land on Drive)
**Startup & Loading Polish spec (PM-25 source):** `1_0WcA2a3UWmFnmTvGmwZVdXiDtw_aSx5mMBlwZbC3FI`
**CANONICAL BUILD BACKLOG:** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk` (PM-26-A/B/C6/C1/C2/C5 complete; PM-26-D, C3/C4/C7, E-H queued)
**CI/Deploy Ref:** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State:** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-24 Canonical Key Design:** `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao`

# FIELD — State of the Project + May 29 2026 Remediation Summary

**Purpose:** a clear-eyed record of what changed on May 29 2026 and an honest assessment of
long-term viability. Not legal advice; patent/valuation calls belong to a patent attorney and the
market, not to Claude (STANDARDS Rule 45).

## What happened today (in order)
1. Completed the Data-Sourcing Legitimacy Matrix — 15 sources verified against live terms.
2. Found the PGA Tour GraphQL relay had been wired without a ToU check; verification → restrictive.
3. Removed direct PGA Tour GraphQL access: client fns + constant (app `ec6efe8`), relay route + key
   + whitelist (`8324d30`), 28 harvested probe dumps, added a localStorage purge + smoke guard A240.
4. Added STANDARDS Rule 45 (no legal verdicts; source-clearance gate) — `6381669`.
5. Ran the ESPN-diversification audit + plan — `b509a4a`, `docs/espn-diversification-plan-2026-05-29.md`.

## What was actually lost vs. what is intact

**Lost / changed (small, mostly forward-looking):**
- Direct PGA Tour SG data access. The SG-based golf metrics it was meant to feed
  (golfDramaScore, courseDNAFit, colonialClosingScore, sustainability signal) were **never built** —
  they were specs (G-CORE pending), confirmed by zero call sites in code. So nothing shipped was lost;
  the *plan* for SG-based golf depth now needs a licensed golf feed or shelving.
- ESPN as a permanent free live spine. It still works today; it needs re-pointing to provider-contract
  + GREEN feeds over time. That is engineering work, not lost product.

**Intact (the part that matters — none of it was touched):**
- Every derived metric and the entire transformation layer: computeInsights, computeGameNarrative,
  narrativeGrade, win-prob arc, getStatisticalExtremes, getFranchiseMisery, computeWatchValue,
  buildStayUpSignal, beatTheBook, buildArbitrageReport — all still in index.html, all passing smoke.
- The Journalism Quality layer + prose scoring via Datamuse (the patent-priority differentiator).
  It operates on FIELD's own generated prose + a linguistics API — it has **no dependency** on PGA or
  ESPN data rights. Entirely unaffected.
- Multi-sport coverage (NBA/NHL/MLB/Soccer/Tennis/EFL/AFL/NFL) minus the unbuilt SG-golf depth.
- CI/deploy pipeline, the relay, the swappable-feed architecture (which is what makes diversification
  feasible at all), smoke 242/0.

## Patentability / valuation — the honest version
A method/system patent claims the **invention** (how you compute drama/watch-value/journalism quality
from sports data), not which feed you pipe in. The data-sourcing cleanup did **not** touch a single
invention, so it does **not** reduce whatever patentability the transformation/journalism methods have.
If anything, clean, licensed inputs **strengthen** the commercial and defensibility story.

What is *not* Claude's to assert (and never reliably was): whether a given method is patentable
(novelty, non-obviousness, §101 eligibility — software methods face real abstract-idea scrutiny) or
what it is worth. Those are for a patent attorney and the market. The provisional timeline (~June 25)
and the attorney conversation are unaffected by this week's work. Treat any prior AI dollar figure as
non-binding in both directions.

## Is this catastrophic for long-term viability? No.
- The liability was found and fixed **pre-revenue, pre-launch, with nothing shipped on it.** That is
  the cheapest possible moment to find it. Finding it after launch/funding would have been the
  catastrophe; finding it now is the opposite.
- The defensible asset (the intelligence/journalism layer) is intact and source-agnostic.
- Clean sourcing is a due-diligence checkbox investors/acquirers look for — this makes FIELD *more*
  viable long-term, not less.
- The remaining work is bounded and known: provider-abstraction refactor (no clearance needed), move
  the live spine to a provider you have an agreement with, pin GREEN feeds, demote ESPN to fallback.

## Forward path (next concrete steps)
1. Phase 0: build the provider-abstraction layer (pure refactor, no new source, smoke-gated).
2. Phase 1: move live spine to API-Sports with a recorded accept-the-risk decision (Rule 45).
3. Phase 2: pin nflverse / Football-Data.org / The Odds API / Squiggle / Open-Meteo / Wikimedia.
4. Before any monetization: one IP/tech attorney review of the cleared source list + the provisional.

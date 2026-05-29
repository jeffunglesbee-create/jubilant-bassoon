# FIELD — Data-Sourcing Legitimacy Matrix — VERIFICATION PASS

**Completed:** May 29 2026 (web-enabled TYPE C session). All terms checked live **2026-05-29**.
**Action required:** merge these `[VERIFY]` resolutions into the MASTER Drive scaffold
`1LUuR0CLWUvIc94Vou46VmeTLz1n-Y6YAz0F0MX6GR-M`. (Persisted here in-repo because Drive
writes are unavailable from the sandbox; paste into the master + its `[VERIFY]` cells from a
machine with Drive edit access.)

> **NOT LEGAL ADVICE.** Findings summarize each source's published terms. For a patent-track
> commercial launch, have counsel confirm the RED rows before relying on them.

**Posture key**
- **GREEN** — licensed or openly permits the use (commercial OK / clearly granted)
- **YELLOW** — official/own-site or community-tolerated, *no explicit grant*, restrictive site terms; OK at low rate / derived-only / non-commercial; commercial unverified
- **RED** — published terms expressly prohibit the productionized use, OR commercial use requires a paid licence/contract

## Resolved [VERIFY] cells

**1. ESPN unofficial API** (NBA/NHL/MLB/NFL/MLS/CFB/CBB) — PRIMARY PRODUCTION — **RED (commercial)**
No public API and no terms granting use of the JSON endpoints; undocumented/unsupported, governed only by ESPN's general Terms of Use (no automated/derivative grant). *Failure mode:* endpoints can change/vanish, no SLA, unsanctioned automated use — highest exposure because it is FIELD's load-bearing source. *Mitigation in place:* relay cache, low rate, derived-only publishing (reduces copyright risk, not ToU-breach risk). [espnapi.com; ESPN ToU — 2026-05-29]

**2. MLB StatsAPI** (statsapi.mlb.com) — WIRED — **YELLOW (RED unlicensed commercial)**
MLB Terms allow personal, non-commercial home use only and prohibit derivative works/distribution without written permission; GDX copyright notice = individual, non-commercial, non-bulk. Official infra (durable), but commercial/derivative use ungranted. *Rec:* derived-only/low-rate now; license MLBAM/Sportradar for commercial. [mlb.com/official-information/terms-of-use; gdx.mlb.com/components/copyright.txt — 2026-05-29]

**3. Baseball Savant / Statcast** — WIRED — **YELLOW** (MLBAM property; same posture as MLB)
Governed by MLB Terms + GDX notice; Statcast is MLBAM-owned; not built for heavy real-time polling. *Rec:* cache, derived-only; license for commercial. [same as row 2 — 2026-05-29]

**4. PGA Tour GraphQL** (orchestrator.pgatour.com, client-embedded key) — WIRED — **RED**
PGA TOUR Terms prohibit automated robots/spiders/scrapers that monitor/copy/download data; ShotLink + site data used under licence/proprietary, all rights reserved. *Failure mode:* embedded key can rotate/lock, CORS-gated, scraping disallowed, data licensed. *Rec:* not a sanctioned commercial feed — pursue licensed golf data; ESPN golf as commodity fallback. [pgatour.com/company/terms-of-use; /company/sms-terms-of-use — 2026-05-29]

**5. NHL api-web** (api-web.nhle.com) — candidate — **YELLOW**
Official infra, undocumented; NHL ToS prohibit unauthorized spidering/scraping/harvesting/automated compilation. Durable but unsanctioned automated use. *Rec:* low-rate/derived; richer than ESPN; license for commercial. [nhl.com/info/terms-of-service — 2026-05-29]

**6. nflverse** (GitHub Parquet/CSV) — DESIGNED pipeline 2 — **GREEN**
Code MIT; data broadly CC-BY 4.0; FTN charting subset CC-BY-SA 4.0. Commercial OK **with attribution** (FTN Data via nflverse; NFL NextGenStats via nflverse for 2022 & earlier). *Caveat:* CC-BY-SA share-alike attaches to derivatives of the FTN subset — keep separable or license those CC-BY-SA. *Rec:* PRIMARY for NFL historical/advanced — cleanest source in the matrix. [nflverse.nflverse.com; nflreadr/nflreadpy docs — 2026-05-29]

**7. Big Data Bowl** (Kaggle) — DESIGNED pipeline 3 — **YELLOW (commercial ungranted)**
Governed by each year's Kaggle competition rules (limited, competition-scoped/typically non-commercial licence to the NGS tracking data); commercial productization not clearly granted; exact clause must be read on acceptance. *Rec:* research input only (derived metrics); prefer nflverse for production. [operations.nfl.com big-data-bowl; kaggle competition rules — 2026-05-29]

**8. Pro Football Reference** (Sports Reference scrape) — candidate — **RED**
SR Terms + Data Use page expressly prohibit, without written permission, automated access **and** using scraped data/stats to build a database/tool/service that competes with or substitutes for SR/its data providers; explicitly prohibit training generative AI on their data; ~20 req/min (10 FBref/Stathead); some datasets cannot be redistributed. *Rec:* do NOT productionize; use nflverse (licensed) for historical depth. [sports-reference.com/termsofuse.html; /data_use.html; /bot-traffic.html — 2026-05-29]

**9. NFL Next Gen Stats** (nextgenstats.nfl.com embedded JSON) — candidate — **YELLOW→RED (direct scrape)**
Raw tracking data not public; only aggregated stats exposed, under NFL.com standard terms (no automated-access grant). *Rec:* don't scrape directly; nflverse already mirrors NGS-derived data under CC-BY (2022 & earlier) — use the licensed mirror. [operations.nfl.com NGS; Wikipedia NGS — 2026-05-29]

**10. Squiggle** (squiggle.com.au) — PRODUCTION (AFL) — **GREEN (conditional on etiquette)**
Explicitly offered as a public AFL data API (fixtures/ladder/scores + model tips) with documented etiquette: identifying UserAgent + contact email, cache/re-use, no floods, fetch only what's needed. *Caveat:* basic public data + tips only; advanced AFL stats are Champion Data (licensed, NOT included). *Rec:* keep in production; relay must send identifying UserAgent + contact and cache (already does). [api.squiggle.com.au — 2026-05-29]

**11. Betfair Exchange** (via relay) — PRODUCTION (odds) — **RED (commercial / read-only)**
Licensed API: KYC account + Application Key required. Commercial use needs a paid commercial licence ("unauthorised commercial usage will be identified & blocked"); personal Live key has £499 activation; read-only via the Live key is NOT permitted (live access requires ongoing betting activity); delayed key free for dev only. *Rec:* don't use as a free read-only odds feed for commercial; use The Odds API; Betfair only under a commercial licence. [developer.betfair.com; support.developer.betfair.com — 2026-05-29]

**12. ATP Tour** (atptour.com) — PRODUCTION (Tennis) — **RED**
ATP owns all scores/stats/rankings; one personal-use copy only; systematic retrieval of scores/statistics/rankings to create or compile any collection/database/directory is prohibited absent ATP's prior written permission; bots/spiders barred. *Rec:* do NOT productionize scraping; licensed tennis provider for commercial; ESPN tennis as commodity scores fallback only. [atptour.com/en/terms-and-conditions — 2026-05-29]

**13. BallDontLie** (balldontlie.io) — PRODUCTION — **YELLOW**
Legitimate third-party API; limited, non-exclusive licence; free tier w/ key (~5–60 req/min by tier). Prohibits reselling/redistributing/sublicensing data without permission, building a competing product, presenting data as official league data; restricts caching/storing/redistributing. Not league-affiliated. *Caveat:* the no-cache / no-compete clauses sit awkwardly with FIELD's relay caching + product framing — review on the tier FIELD uses. *Rec:* usable on a paid tier with care; never present as official; don't redistribute raw. [balldontlie.io/terms.html; account docs — 2026-05-29]

**14. FPL API** (fantasy.premierleague.com/api) — PRODUCTION (Soccer fantasy) — **YELLOW**
The official FPL game's own public read endpoints (CORS-gated → relay needed); no published terms granting third-party/commercial use; governed by Premier League / FPL site terms; community-tolerated non-commercial. *Rec:* low-rate/derived/non-commercial OK; commercial unverified — treat as a fragile signal, not a guaranteed feed. [fantasy.premierleague.com/api; PL/FPL terms — 2026-05-29]

**15. Reddit JSON** (reddit.com/r/{sub}/*.json) — proposed (F02, social signal) — **RED (monetized product)**
Data API requires registered OAuth (unidentified users throttled/blocked). Commercial use — any use by/for a business or as part of a monetized product — requires Reddit's permission **and a contract**; free tier non-commercial 100 QPM; paid ~$0.24/1,000 calls; model-training needs explicit consent; no ads alongside Reddit content without permission; 2024 Public Content Policy requires a contract for commercial public-data use; Pushshift dead (2023). *Rec:* do NOT productionize for a commercial FIELD; drop or license. Use Wikimedia Pageviews for cultural/interest signal instead. [support.reddithelp.com Developer Platform & Data API; techcrunch 2024-05-09 — 2026-05-29]

## Already-cleared rows (no [VERIFY]; confirmed GREEN)
- **The Odds API** — licensed (paid) — primary odds source.
- **Football-Data.org** — licensed free tier (10 req/min).
- **Open-Meteo** — open, documented, free.
- **Wikimedia Pageviews** — documented open API; best-positioned cultural/social signal (replaces Reddit for that role).

## One-line recommendation per sport (most-permissible primary + licensed fallback)
- **NBA:** ESPN commodity scores (derived-only) + BallDontLie paid stats; licensed provider for commercial scale.
- **NHL:** NHL api-web (low-rate/derived) > ESPN; licensed fallback for commercial.
- **MLB:** MLB StatsAPI + Savant derived-only/low-rate; The Odds API for odds; license MLBAM/Sportradar for commercial.
- **NFL:** nflverse (GREEN) PRIMARY for historical/advanced + ESPN for live scores/EPA; **avoid** PFR scrape and direct NGS scrape (use nflverse mirror).
- **Soccer/EPL:** Football-Data.org (licensed) PRIMARY; FPL low-rate fantasy signal; BallDontLie EPL paid optional.
- **Golf:** PGA Tour GraphQL is the matrix's highest-risk production source (scraping barred + licensed data) — pursue a licensed golf feed; ESPN golf commodity fallback.
- **AFL:** Squiggle (GREEN w/ etiquette) for basic + tips; Champion Data (licensed) for advanced.
- **Tennis:** licensed provider required for commercial (ATP scraping barred); ESPN commodity scores fallback only.
- **Odds:** The Odds API (GREEN) primary; Betfair commercial-licence only.
- **Weather:** Open-Meteo (GREEN).
- **Cultural/social:** Wikimedia Pageviews (GREEN); Reddit contract-only.

## Transformation-moat framing (central)
Raw scores/lines are commodity — source them from the most-permissible option, keep rate low and cached. FIELD's defensible, patent-relevant asset is the **transformation layer** (journalism quality, prose scoring, intelligence synthesis). Publish **derived original analysis, never raw third-party redistribution** — this simultaneously strengthens the patent posture and minimizes copyright/ToS exposure. The RED rows are where even derived use rides on an unlicensed/unsanctioned feed; for the commercial launch, each RED source needs either a licensed substitute or counsel sign-off.

## Net priority actions
1. **NFL:** migrate historical/advanced fully onto nflverse (GREEN); retire PFR + direct NGS scrape.
2. **Odds:** standardize on The Odds API; treat Betfair as licence-only.
3. **Tennis + Golf:** secure a licensed feed before commercial launch (both currently RED in production).
4. **Social signal:** swap Reddit → Wikimedia Pageviews.
5. **ESPN/MLB/NHL/FPL:** keep derived-only, low-rate, cached; line up licensed fallbacks for commercial scale.

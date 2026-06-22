# Claude Code Command — O(1) Newspaper (CLIENT)

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-newspaper-client-2026-06-22.md.

## CONTEXT

The relay endpoint /analytics/newspaper/{date} now exists (shipped
separately). It returns a bundle with: morning_report, truth_is,
night_stars, pick, preview, streak_board, completed_games.

This prompt builds the CLIENT rendering: fetch the bundle, paint
it above the schedule, add FIELD's Pick badge on game cards.

## PREREQUISITE

The relay endpoint must be deployed before this client ships.
Verify: curl https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/2026-06-22
If it 404s, STOP — the relay CC-CMD hasn't run yet.

## TASK 1: CSS

Add in the `<style>` block (near other section styles, ~line 440):

```css
/* ── O(1) NEWSPAPER ─────────────────────────────────────────── */
.field-newspaper{margin-bottom:1.2rem}
.np-inner{background:var(--c-card,#1a1a2e);border-radius:12px;padding:1.2rem 1rem;border:1px solid rgba(255,255,255,.06)}
.np-section{margin-bottom:.8rem}
.np-section:last-child{margin-bottom:0}
.np-label{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:var(--c-muted,#888);margin-bottom:.35rem;font-weight:600}
.np-prose{font-size:.82rem;line-height:1.65;color:var(--c-text,#e0e0e0);margin:0}
.np-stars{display:flex;align-items:center;gap:.5rem;padding:.4rem 0}
.np-stars-glyphs{font-size:1.1rem;letter-spacing:2px;color:#fbbf24}
.np-stars-label{font-size:.78rem;color:var(--c-muted,#888)}
.np-degraded{font-size:.65rem;color:var(--c-muted,#666);font-style:italic}
.np-missed-list{list-style:none;padding:0;margin:.2rem 0 0}
.np-missed-list li{font-size:.78rem;line-height:1.5;color:var(--c-text,#e0e0e0);padding:.15rem 0}
.np-missed-list li::before{content:'• ';color:var(--c-muted,#888)}
.np-streak-row{display:flex;flex-wrap:wrap;gap:.4rem}
.np-streak-chip{font-size:.7rem;padding:.2rem .5rem;border-radius:6px;background:rgba(255,255,255,.05);white-space:nowrap}
.np-freshness{font-size:.6rem;color:var(--c-muted,#666);text-align:right;margin-top:.6rem}
.np-divider{text-align:center;font-size:.6rem;letter-spacing:.15em;color:var(--c-muted,#666);padding:.8rem 0 .2rem;position:relative}
.np-divider::before,.np-divider::after{content:'';position:absolute;top:50%;width:calc(50% - 5rem);height:1px;background:rgba(255,255,255,.08)}
.np-divider::before{left:0}
.np-divider::after{right:0}
.np-pick .np-prose{font-style:italic}
.field-pick-badge{font-size:.6rem;letter-spacing:.08em;color:#fbbf24;padding:.15rem .4rem;opacity:.8}

/* ── VIEWPORT: mobile-portrait (≤600px) ────────────────────── */
@media(max-width:600px){
  .np-inner{padding:.9rem .75rem}
  .np-prose{font-size:.78rem;line-height:1.55}
  .np-label{font-size:.6rem}
  .np-stars-glyphs{font-size:1rem}
  .np-stars-label{font-size:.72rem}
  .np-missed-list li{font-size:.74rem}
  .np-streak-chip{font-size:.65rem;padding:.15rem .4rem}
}
/* ── VIEWPORT: mobile-portrait small (≤375px, e.g. iPhone SE) ── */
@media(max-width:375px){
  .np-inner{padding:.75rem .6rem;border-radius:8px}
  .np-prose{font-size:.74rem}
  .np-section{margin-bottom:.6rem}
}
/* ── VIEWPORT: mobile-landscape (601-819px) ────────────────── */
@media(min-width:601px) and (max-width:819px){
  .np-inner{padding:1rem;max-width:680px;margin:0 auto}
  .np-prose{font-size:.8rem}
}
/* ── VIEWPORT: mobile-landscape orientation:landscape ───────── */
@media(orientation:landscape) and (max-width:819px){
  .field-newspaper{margin-bottom:.8rem}
  .np-inner{padding:.7rem .9rem}
  .np-section{margin-bottom:.5rem}
  .np-prose{font-size:.76rem;line-height:1.45}
}
/* ── VIEWPORT: tablet-ambient (820-1199px) ─────────────────── */
@media(min-width:820px) and (max-width:1199px){
  .np-inner{max-width:760px;margin:0 auto;padding:1.2rem 1.2rem}
  .np-prose{font-size:.84rem}
}
/* ── VIEWPORT: tablet portrait (820-1199 portrait) ──────────── */
@media(min-width:820px) and (max-width:1199px) and (orientation:portrait){
  .np-inner{max-width:640px}
}
/* ── VIEWPORT: laptop (1200-1439px) ────────────────────────── */
@media(min-width:1200px) and (max-width:1439px){
  .np-inner{max-width:800px;padding:1.4rem 1.5rem}
  .np-prose{font-size:.85rem;line-height:1.7}
  .np-stars-glyphs{font-size:1.2rem}
}
/* ── VIEWPORT: desktop (1440-1799px) ───────────────────────── */
@media(min-width:1440px) and (max-width:1799px){
  .np-inner{max-width:860px;padding:1.5rem 1.8rem}
}
/* ── VIEWPORT: ultrawide (1800px+) ─────────────────────────── */
@media(min-width:1800px){
  .np-inner{max-width:900px;padding:1.6rem 2rem}
}
/* ── WHOLE FIELD mode — newspaper stays in LEFT column ──────── */
body.wf-mode .np-inner{max-width:100%}
```

## TASK 2: fetchNewspaper

Insert AFTER the streak badge init (~line 20880) and BEFORE the
bootstrap fetchSchedule call (~line 38173).

```javascript
// ── O(1) NEWSPAPER — journalism-first homepage ──────────────────
// One relay call, one render. Analytics Cron output displayed above
// the schedule. Zero per-user LLM cost.
async function fetchNewspaper(date) {
    const base = (typeof V2_RELAY_BASE !== 'undefined')
        ? V2_RELAY_BASE : 'https://field-relay-nba.jeffunglesbee.workers.dev';
    try {
        const r = await fetch(`${base}/analytics/newspaper/${date}`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) return null;
        const data = await r.json();
        return data.ok ? data : null;
    } catch (_) {
        return null;
    }
}
```

## TASK 3: getWhatYouMissed

```javascript
function getWhatYouMissed(completedGames) {
    if (!completedGames || !completedGames.length) return [];
    const lastVisit = localStorage.getItem('field_last_visit');
    if (!lastVisit) return []; // first visit ever

    // field_last_visit stores YYYY-MM-DD string (from streak init)
    // If they visited today, no catch-up needed
    const tz = 'America/New_York';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    if (lastVisit === today) return [];

    // If last visit was >24h ago, Morning Report covers it
    const yesterday = new Date(Date.now() - 86400000)
        .toLocaleDateString('en-CA', { timeZone: tz });
    if (lastVisit < yesterday) return [];

    // Filter to structurally notable games
    // NOTE: wentToOT is not stored in D1 archive — always false.
    // Structural notability is: close margin, upset, clinch, elimination.
    const notable = completedGames.filter(g =>
        g.margin <= 1 ||
        g.wasUpset ||
        g.isSeriesClinch ||
        g.isElimination
    );

    // Most recent first, cap at 5
    return notable.slice(0, 5);
}
```

## TASK 4: renderNewspaper

```javascript
function renderNewspaper(bundle) {
    if (!bundle) return;

    // Store globally for FIELD's Pick badge (Task 6)
    window._newspaperBundle = bundle;

    // Remove any existing newspaper
    const existing = document.getElementById('field-newspaper');
    if (existing) existing.remove();

    const el = document.createElement('section');
    el.id = 'field-newspaper';
    el.className = 'field-newspaper';
    el.setAttribute('aria-label', 'FIELD Newspaper');

    const parts = [];

    // 1. "Since You Were Last Here" — personalized catch-up
    const missed = getWhatYouMissed(bundle.completed_games);
    if (missed.length) {
        const lines = missed.map(g => {
            const winner = (g.homeScore > g.awayScore) ? g.home : g.away;
            const loser = (g.homeScore > g.awayScore) ? g.away : g.home;
            const fact = g.wasUpset ? `upset ${loser}`
                : g.isSeriesClinch ? 'clinched the series'
                : g.isElimination ? 'survived elimination'
                : g.margin <= 1 ? 'won by 1'
                : `won by ${g.margin}`;
            return `<li>${winner} ${fact} (${g.homeScore}-${g.awayScore})</li>`;
        }).join('');
        parts.push(`
            <div class="np-section np-missed">
                <div class="np-label">SINCE YOU WERE LAST HERE</div>
                <ul class="np-missed-list">${lines}</ul>
            </div>
        `);
    }

    // 2. Night Stars
    if (bundle.night_stars && bundle.night_stars.stars) {
        const s = bundle.night_stars;
        const filled = '★'.repeat(s.stars);
        const empty = '☆'.repeat(5 - s.stars);
        const label = s.stars >= 4 ? 'a great night'
            : s.stars === 3 ? 'a solid night'
            : s.stars === 2 ? 'a quiet night'
            : 'a slow night';
        parts.push(`
            <div class="np-section np-stars">
                <span class="np-stars-glyphs">${filled}${empty}</span>
                <span class="np-stars-label">Last night was ${label}</span>
                ${s.degraded ? '<span class="np-degraded">(limited data)</span>' : ''}
            </div>
        `);
    }

    // 3. Morning Report
    if (bundle.morning_report) {
        parts.push(`
            <div class="np-section np-report">
                <div class="np-label">THE MORNING REPORT</div>
                <p class="np-prose">${bundle.morning_report}</p>
            </div>
        `);
    }

    // 4. Truth Is
    if (bundle.truth_is && bundle.truth_is.brief) {
        parts.push(`
            <div class="np-section np-truth">
                <div class="np-label">THE TRUTH IS</div>
                <p class="np-prose">${bundle.truth_is.brief}</p>
            </div>
        `);
    }

    // 5. Tonight's Pick
    if (bundle.pick) {
        const pickText = bundle.pick.type === 'pass'
            ? (bundle.pick.brief || "Not every night has a must-watch. Tonight's one of those.")
            : (bundle.pick.brief || '');
        if (pickText) {
            parts.push(`
                <div class="np-section np-pick">
                    <div class="np-label">TONIGHT'S PICK</div>
                    <p class="np-prose">${pickText}</p>
                </div>
            `);
        }
    }

    // 6. Preview
    if (bundle.preview) {
        parts.push(`
            <div class="np-section np-preview">
                <div class="np-label">TONIGHT</div>
                <p class="np-prose">${bundle.preview}</p>
            </div>
        `);
    }

    // 7. Streak Board
    if (bundle.streak_board && !bundle.streak_board.degraded) {
        const hot = (bundle.streak_board.hot || [])
            .map(s => `<span class="np-streak-chip np-hot">🔥 ${s.team} × ${s.streak}</span>`)
            .join('');
        const cold = (bundle.streak_board.cold || [])
            .map(s => `<span class="np-streak-chip np-cold">🧊 ${s.team} × ${s.streak}</span>`)
            .join('');
        if (hot || cold) {
            parts.push(`
                <div class="np-section np-streaks">
                    <div class="np-label">STREAK BOARD</div>
                    <div class="np-streak-row">${hot}${cold}</div>
                </div>
            `);
        }
    }

    // Nothing to show — don't render empty newspaper
    if (!parts.length) return;

    // Freshness timestamp
    const genAt = bundle.generated_at;
    let freshness = '';
    if (genAt) {
        try {
            const d = new Date(genAt);
            freshness = d.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit',
                timeZone: 'America/New_York',
            });
        } catch (_) {}
    }

    el.innerHTML = `
        <div class="np-inner">
            ${parts.join('')}
            ${freshness ? `<div class="np-freshness">Updated at ${freshness} ET</div>` : ''}
        </div>
        <div class="np-divider">TODAY'S SCHEDULE</div>
    `;

    // Insert ABOVE schedule content in <main>
    const main = document.getElementById('main');
    if (main) main.prepend(el);
}
```

## TASK 5: Boot wiring

Find the bootstrap section (~line 38173, comment says
"fetchSchedule() populates allData"). Add the newspaper
fetch BEFORE fetchSchedule so it renders first:

```javascript
// O(1) Newspaper — fetch and render above schedule
// Pass TODAY's date — the relay endpoint assembles recap from
// yesterday + preview from today internally.
(async function bootNewspaper() {
    const tz = 'America/New_York';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
    const bundle = await fetchNewspaper(today);
    if (bundle) renderNewspaper(bundle);
})();
```

NOTE: The newspaper renders independently of the schedule.
fetchSchedule() continues to run in parallel. The newspaper
appears immediately; schedule cards appear below when ready.
If newspaper fetch fails, schedule renders as today (zero
degradation).

## TASK 6: FIELD's Pick badge on game card

After renderAll completes (the function that paints sport-section
cards into <main>), apply the pick badge. Find where renderAll
is called and add a post-render hook:

```javascript
// After all cards are rendered, apply FIELD's Pick badge
if (window._newspaperBundle?.pick?.game_id) {
    const pickId = window._newspaperBundle.pick.game_id;
    const pickCard = document.querySelector(
        `[data-game-id="${pickId}"], [data-espn-id="${pickId}"]`
    );
    if (pickCard) {
        const badge = document.createElement('div');
        badge.className = 'field-pick-badge';
        badge.textContent = '⭐ FIELD\'s Pick';
        pickCard.prepend(badge);
    }
}
```

## TASK 7: Smoke assertions

Add in the smoke test section:

```javascript
// A692: Newspaper — fetchNewspaper function exists
smoke.assert(typeof fetchNewspaper === 'function',
    'A692: fetchNewspaper function exists');

// A693: Newspaper — renderNewspaper function exists
smoke.assert(typeof renderNewspaper === 'function',
    'A693: renderNewspaper function exists');

// A694: Newspaper — getWhatYouMissed function exists
smoke.assert(typeof getWhatYouMissed === 'function',
    'A694: getWhatYouMissed function exists');

// A695: Newspaper — getWhatYouMissed returns array for null input
smoke.assert(Array.isArray(getWhatYouMissed(null)),
    'A695: getWhatYouMissed gracefully handles null');

// A696: Newspaper — CSS class exists in stylesheet
smoke.assert(
    [...document.styleSheets].some(s => {
        try { return [...s.cssRules].some(r =>
            r.selectorText && r.selectorText.includes('.field-newspaper')
        ); } catch(_) { return false; }
    }),
    'A696: .field-newspaper CSS class present');
```

## SCOPE BOUNDARY

DO:
- Add newspaper CSS with full viewport coverage (11 breakpoints)
- Add fetchNewspaper, getWhatYouMissed, renderNewspaper functions
- Wire bootNewspaper into bootstrap BEFORE fetchSchedule
- Add FIELD's Pick badge on game cards
- Add 5 smoke assertions (A692-A696)
- Store bundle as window._newspaperBundle
- Bump SW_VERSION to 2026-06-22a

DO NOT:
- Modify existing journalism tab or journalism-mode
- Modify buildTodaySchedule internals
- Add Circadian mode switching (separate spec)
- Touch the relay repo (field-relay-nba)
- Add new localStorage keys (uses existing field_last_visit)

## INSTRUCTIONS

1. Client repo only (jubilant-bassoon).
2. git pull. Read CLAUDE.md.
3. Verify relay endpoint exists first:
   curl https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/2026-06-22
   If 404 → STOP. Relay CC-CMD must run first.
4. Add CSS in <style> block (~line 440).
5. Add fetchNewspaper, getWhatYouMissed, renderNewspaper (~after line 20880).
6. Wire bootNewspaper into bootstrap (~before line 38173).
7. Add pick badge hook after renderAll.
8. Add smoke assertions.
9. Bump SW_VERSION to 2026-06-22a.
10. Single commit: "feat: O(1) Newspaper — journalism-first homepage
    with What Changed, Night Stars, Morning Report, Pick badge"
11. Push to main (deploy-gate.yml handles deploy).
12. Write manifest to outbox.

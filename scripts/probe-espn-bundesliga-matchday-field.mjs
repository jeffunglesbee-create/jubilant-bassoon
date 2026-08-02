// One-shot CI probe (workflow_dispatch only). CC-CMD-2026-08-02-wire-
// bundesliga-broadcasts-into-client -- novel-thinking retry. Real,
// unverified unknown: does ESPN's ger.1 (Bundesliga) scoreboard expose a
// matchday/week/round number per event, which resolve-dayid needs? Today
// (2026-08-02) has zero scheduled Bundesliga events (break window), so
// probing a real PAST date from the completed 2025-26 season instead --
// real events, real shape, not assumed from memory.

import { writeFileSync } from 'fs';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
// Real last-matchday date of the 2025-26 Bundesliga season per this repo's
// own DOMESTIC_LEAGUE_BREAK_2026 config (end: '2026-05-16').
const PAST_DATES = ['20260516', '20260509', '20260502'];

async function main() {
    const out = { checkedDates: [], sampleEvent: null, fieldsPresent: null, error: null };
    for (const d of PAST_DATES) {
        const url = `${ESPN_BASE}/soccer/ger.1/scoreboard?dates=${d}&limit=30`;
        try {
            const r = await fetch(url);
            const body = await r.json();
            const events = body.events || [];
            out.checkedDates.push({ date: d, status: r.status, eventCount: events.length });
            if (events.length && !out.sampleEvent) {
                const ev = events[0];
                out.sampleEvent = ev;
                out.fieldsPresent = {
                    hasWeek: ev.week !== undefined,
                    week: ev.week,
                    hasSeason: ev.season !== undefined,
                    season: ev.season,
                    competitionKeys: Object.keys((ev.competitions || [])[0] || {}),
                    topLevelKeys: Object.keys(ev),
                };
            }
        } catch (e) {
            out.checkedDates.push({ date: d, error: String(e).slice(0, 200) });
        }
    }
    console.log(JSON.stringify(out, null, 2));
    writeFileSync('outbox/probe-espn-bundesliga-matchday-field-result.json', JSON.stringify(out, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

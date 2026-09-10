// CC-CMD-2026-09-07-soccer-season-gates-autoroll — TASK 0.4 and TASK 3.3.
//
// Does the relay actually SERVE each of the eight gated European competitions?
// The gate must not be opened for a key the relay cannot answer.
//
// WHY A DATE IS REQUIRED, and why a same-day probe is not an answer:
// 2026-09-10 is inside an international break. Every one of these keys returns
// HTTP 200 with count 0 today, and "serves it, no games today" is indi
// stinguishable from "does not serve it" in that response. A date on which the
// competition demonstrably played is the only probe that separates them.
//
// So each key is probed TWICE: once for today (the live gate condition) and once
// for a real matchday. A key is SERVED only if the matchday probe returns games.

const RELAY = process.env.V2_RELAY_BASE || 'https://field-relay-nba.jeffunglesbee.workers.dev';

// ONE MATCHDAY IS NOT ENOUGH, and this probe learned that by getting it wrong.
//
// The first version probed 2026-08-30 with a 2026-09-06 fallback and reported
// `efltwo` NOT SERVED. BOTH OF THOSE DATES ARE SUNDAYS. The top-five European
// leagues play Sunday; EFL League Two plays Saturday and Tuesday and almost
// never Sunday. The date had been chosen to suit five of the eight competitions
// and then applied to all of them. On Saturday 2026-08-29 `efltwo` returns a
// nine-game slate.
//
// A false NOT SERVED is the expensive direction: it leaves a live competition
// gated off, which is the exact outage this CC-CMD exists to end. So the probe
// sweeps several dates and takes the best answer, and asserts its own date set
// spans both a Saturday and a Sunday.
const DATES = (process.argv.find(a => a.startsWith('--dates='))?.split('=')[1]
    || '2026-08-29,2026-08-30,2026-09-05,2026-09-06').split(',').map(d => d.trim()).filter(Boolean);
const TODAY = new Date().toISOString().slice(0, 10);
const dow = (d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(`${d}T12:00:00Z`).getUTCDay()];

const KEYS = ['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'eflchamp', 'eflone', 'efltwo'];

const probe = async (sport, date) => {
    const url = `${RELAY}/v2/games?sport=${sport}${date ? `&date=${date}` : ''}`;
    try {
        const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const text = await r.text();
        if (!r.ok) return { status: r.status, count: null, relayAnswered: false, err: text.slice(0, 120) };
        // A STATUS CODE IS NOT PROOF THE RELAY ANSWERED. Run from this sandbox the
        // egress proxy returns its own 403 for every one of these URLs, and an
        // earlier version of this probe recorded that as "a real HTTP status" and
        // passed its own transport check. The relay's shape is the proof: a JSON
        // body echoing the sport key it was asked for. Nothing in the path between
        // here and the relay produces that by accident.
        let d;
        try { d = JSON.parse(text); } catch {
            return { status: r.status, count: null, relayAnswered: false,
                     err: `non-JSON body (${text.slice(0, 80).replace(/\s+/g, ' ')})` };
        }
        if (d.sport !== sport) {
            return { status: r.status, count: null, relayAnswered: false,
                     err: `body did not echo sport=${sport} (got ${JSON.stringify(d.sport)}) — something other than the relay answered` };
        }
        return { status: r.status, count: d.count ?? (d.games || []).length, relayAnswered: true,
                 echoedDate: d.date, source: d.source, sample: (d.games || [])[0] };
    } catch (e) { return { status: null, count: null, err: e.message }; }
};

const rows = [];
for (const k of KEYS) {
    const today = await probe(k, null);
    const tried = [];
    let best = null, usedDate = null;
    for (const d of DATES) {
        const r = await probe(k, d);
        tried.push(`${d}(${dow(d)}) n=${r.relayAnswered ? r.count : 'ERR'}`);
        if (!best || (r.relayAnswered && r.count > (best.count ?? -1))) { best = r; usedDate = d; }
        if (r.relayAnswered && r.count > 0) break;   // a positive settles it
    }
    rows.push({ key: k, today, matchday: best, usedDate, tried });
}

console.log(`relay: ${RELAY}`);
console.log(`today: ${TODAY}   matchdays swept: ${DATES.map(d => `${d}(${dow(d)})`).join(', ')}`);
console.log(`checked ${KEYS.length} of ${KEYS.length} gated European keys — the eight hardcoded false in FIELD_V2_SOURCES\n`);
console.log('key         today          matchday                       verdict');
console.log('----------  -------------  -----------------------------  -------');
let unserved = 0;
for (const r of rows) {
    const served = r.matchday.status === 200 && r.matchday.count > 0;
    if (!served) unserved++;
    const t = `${r.today.status ?? 'ERR'} n=${r.today.count ?? '-'}`;
    const m = `${r.matchday.status ?? 'ERR'} n=${r.matchday.count ?? '-'} @${r.usedDate}(${dow(r.usedDate)})`;
    console.log(`${r.key.padEnd(10)}  ${t.padEnd(13)}  ${m.padEnd(29)}  ${served ? 'SERVED' : 'NOT SERVED'}`);
    if (served) {
        const g = r.matchday.sample;
        console.log(`            └─ ${g.league}: ${g.home.name} ${g.home.score}-${g.away.score} ${g.away.name} (${g.state})`);
    } else if (r.matchday.err) {
        console.log(`            └─ ${r.matchday.err}`);
    } else {
        // Rule 91: say what was actually asked before anyone reads NOT SERVED.
        console.log(`            └─ zero on every date tried: ${r.tried.join(', ')}`);
    }
}

let failed = 0;
const check = (n, ok, d) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) { failed++; if (d) console.log(`      → ${d}`); } };
console.log('');
check('THE RELAY answered every probe — not a proxy, not an error page',
    rows.every(r => r.today.relayAnswered && r.matchday.relayAnswered),
    rows.filter(r => !r.today.relayAnswered || !r.matchday.relayAnswered)
        .map(r => `${r.key}: ${r.today.err || r.matchday.err}`).join('; ')
        + '  — a status code alone is not proof of an answer; NOT SERVED below cannot be trusted from this run');
check('the relay honours ?date= rather than ignoring it',
    rows.every(r => r.matchday.echoedDate === r.usedDate),
    'a relay that ignored the date would make every matchday probe a same-day probe, and this whole check meaningless');
check('at least one key is SERVED — the route family is real, not uniformly empty',
    rows.some(r => r.matchday.count > 0),
    'all eight empty on a real matchday would mean the probe, not the gates, is what is broken');
// Written because its absence produced a false NOT SERVED. English lower
// divisions play Saturday; the top five play Sunday. A date set covering only
// one of those cannot answer for all eight competitions.
check('the swept dates span BOTH a Saturday and a Sunday',
    DATES.some(d => dow(d) === 'Sat') && DATES.some(d => dow(d) === 'Sun'),
    `swept ${DATES.map(d => `${d}(${dow(d)})`).join(', ')} — a Sunday-only sweep reports EFL divisions unserved; `
    + 'a Saturday-only sweep can do the same to a top-five league on a Sunday-only matchday');

console.log(`\n${unserved} of ${KEYS.length} key(s) NOT SERVED — these must NOT be enabled.`);
if (unserved) console.log(`  ${rows.filter(r => !(r.matchday.status === 200 && r.matchday.count > 0)).map(r => r.key).join(', ')}`);
console.log(`\n${failed === 0 ? 'PASS' : `${failed} FAILING`}`);
process.exit(failed === 0 ? 0 : 1);

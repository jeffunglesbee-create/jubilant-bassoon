// Finds the BSD event row for each of field-laboratory's two committed Flow
// captures (bundesliga 213708, europa 601226) through the relay's
// /bsd/events/by-date, and writes each row AS SERVED (the object's own JSON
// text, sliced from the response body, not re-serialised) to
// outbox/lab-flow-event-rows/<id>.json. Flow.witnessAfterKickoff takes this row
// as its only route to a witness. field-laboratory
// docs/CC-CMD-2026-10-17-metrics-tab-render-path.md, TASK 2.
import { writeFileSync, mkdirSync } from 'node:fs'
const RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev'
const WANT = [213708, 601226]
const day = (d) => d.toISOString().slice(0, 10)
const found = {}
const start = new Date('2026-08-01T00:00:00Z'), end = new Date('2026-10-18T00:00:00Z')
for (let d = new Date(end); d >= start && Object.keys(found).length < WANT.length; d.setUTCDate(d.getUTCDate() - 1)) {
  for (let offset = 0; offset < 1000; offset += 50) {
    const url = `${RELAY}/bsd/events/by-date?date=${day(d)}${offset ? `&offset=${offset}` : ''}`
    const r = await fetch(url)
    if (!r.ok) { console.log(`${url}: HTTP ${r.status}`); break }
    const text = await r.text()
    const body = JSON.parse(text)
    for (const e of body.results || []) {
      if (!WANT.includes(e.id) || found[e.id]) continue
      // The row's own bytes: find `{"id":<id>,` and walk to its matching brace.
      const at = text.indexOf(`{"id":${e.id},`)
      let depth = 0, i = at, inStr = false
      for (; i < text.length; i++) {
        const c = text[i]
        if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue }
        if (c === '"') inStr = true
        else if (c === '{') depth++
        else if (c === '}' && --depth === 0) break
      }
      const raw = text.slice(at, i + 1)
      if (JSON.parse(raw).id !== e.id) throw new Error(`slice for ${e.id} is not its row`)
      found[e.id] = { date: day(d), url, raw, event_date: e.event_date, status: e.status }
    }
    if (!body.next || (body.results || []).length < 50) break
  }
}
mkdirSync('outbox/lab-flow-event-rows', { recursive: true })
for (const id of WANT) {
  if (!found[id]) { console.log(`${id}: NOT FOUND between ${day(start)} and ${day(end)}`); process.exitCode = 1; continue }
  writeFileSync(`outbox/lab-flow-event-rows/${id}.json`, found[id].raw)
  console.log(`${id}: ${found[id].url} event_date ${found[id].event_date} status ${found[id].status} ${Buffer.byteLength(found[id].raw)} bytes`)
}

#!/usr/bin/env node
// CC-CMD-2026-08-02-wire-laliga-apim-standings-v2 Task 4.
// Real verification the deployed relay route works.
import { writeFileSync } from 'fs';
const r = await fetch('https://field-relay-nba.jeffunglesbee.workers.dev/laliga-apim/clasificacion');
const body = await r.json();
const out = { httpStatus: r.status, available: body.available, sampleKeys: body.data ? Object.keys(body.data).slice(0,5) : null, dataIsArray: Array.isArray(body.data), teamCount: Array.isArray(body.data) ? body.data.length : null };
writeFileSync('outbox/laliga-relay-route-verify.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

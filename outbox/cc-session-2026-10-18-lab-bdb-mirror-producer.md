# Producer half of the laboratory's BDB mirror (2026-10-18)

The owner asked for the NFL scout panel's BDB logic to be mirrored into
field-laboratory. The command is
`field-laboratory docs/CC-CMD-2026-10-18-bdb-scout-mirror.md`. This repo
supplied the data side.

## Commits

- **`39305c07`: builders write `sourceDataset`.**
  - Before: the laboratory's only mint for seasoned data,
    `Vintage.decodeEnvelope`, refuses an envelope without `sourceDataset`
    (`NoSourceDataset`). All six BDB files and every NGS table carried only
    `source`.
  - Now: `scripts/build-bdb-data.py` (six envelopes) and
    `scripts/build-ngs-data.py` (`emit`) write it beside `source`, which stays.
    The client reads `season` only and is unaffected.
- **`025654a9`: `lab-bdb-capture.yml` (dispatch-only).** It copies the four
  files the relay serves into `outbox/lab-bdb-capture/`, with a sha256
  manifest.

## Runs

| run | what | result |
|---|---|---|
| `bdb-update.yml` 39142923156 | rebuilt the six BDB files | success. `bdb-serve-probe` passed 6/6: season 2022, speed 1648 rows, Metcalf's sample unchanged |
| `nfl-ngs-update.yml` 39142925192 | rebuilt the NGS tables | success. `depth-charts.json` season 2026, now with `sourceDataset` |
| `lab-bdb-capture.yml` 39143837171 | captured the served speed, tendency, time-to-throw and depth chart | all four served envelopes carry `sourceDataset`. sha256 values are in `outbox/lab-bdb-capture/MANIFEST.txt` and the laboratory's `data/PROVENANCE.md` |

## Integration state

- **Relay contract:** unchanged. `/nflverse/<file>` passes the R2 object
  through, now with one more envelope field.
- **Client consumer:** unchanged.
- **Status: VERIFIED.** The served bytes were read by a runner after the
  rebuild.

## Later the same day: Flow event rows for the laboratory's Metrics tab

The command is `field-laboratory docs/CC-CMD-2026-10-17-metrics-tab-render-path.md`.
`Flow.witnessAfterKickoff` takes a capture's own BSD event row, and the
laboratory had none.

- **`65d39d95`: `scripts/lab-flow-event-rows.mjs` plus
  `lab-flow-event-rows.yml`.** Run 39148931854 found 601226 (Dinamo Zagreb v
  Anderlecht, 2026-10-15 19:00Z). It did not find 213708.
- **Measured:** the relay's `/bsd/events/by-date` ignores `offset` (offset=50
  returned page one, `previous` null) and sets no edge cache.
  - **Cost:** the first run asked up to 20 pages on every day with 50 or more
    events. Each call re-received page one, and each reached BSD's API. That is
    up to about 1,500 calls, wasted (Rule 78).
- **`31feef49`: one request per day, filtered by `league_id`.** Run 39149405673
  found 213708 (FC Augsburg v FC Bayern München, 2026-10-10 13:30Z).
- **Not fixed here (relay):** `by-date` cannot page past 50, and nothing caches
  it. Any caller asking about a busy day is blind past the first 50 events.
  Filed for the relay owner: field-relay-nba
  `docs/CC-CMD-2026-10-18-bsd-by-date-offset-and-cache.md`.

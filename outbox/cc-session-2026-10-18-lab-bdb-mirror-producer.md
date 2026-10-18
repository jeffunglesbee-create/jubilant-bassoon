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

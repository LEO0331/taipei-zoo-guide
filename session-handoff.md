# Session Handoff

## Current Objective

- Feature `feat-010` is implemented.
- The app is now a bilingual Taipei Zoo guide for animals, plants, exhibit areas, events, map locations, overview metrics, and data notes.

## Data Pipeline

- `npm run convert:data` converts animals, exhibit areas, events, plants, plant summaries, then the combined guide summary.
- Plant input: `data/raw/zoo-plants/植物資料1150617b.csv`
- Fetch wrappers accept `LOCAL_CSV` or `RESOURCE_URL`; existing files are reused unless `--force` is passed.
- Frontend runtime reads only `public/data/*.json`.
- Plant media URLs are retained only as external references.

## Verification Evidence

| Check | Result |
|---|---|
| Unit tests | 16 passed |
| Conversion | 313 animals, 17 areas, 116 events, 276 plants |
| Plant summary | 100 species |
| Local build | Passed |
| GitHub Pages build | Passed |
| Browser QA | Plant Guide, detail panel, plant map layer, English labels, and mobile 390x844 passed |
| Final `./init.sh` | Passed |

## Decisions

- No new dependency was added.
- Plant records remain separate from animal records.
- Plant-to-area matching uses location text/aliases only; no plant-animal links were introduced.
- The Plant Guide directory groups location records by species, while the map plots coordinate records and clusters repeated points.
- Dataset image/audio/video URLs are retained only as external source references; the UI does not embed them.

## Remaining Risk

- Official plant CSV resource URL should be supplied through `RESOURCE_URL` when a live refresh is required.
- OpenStreetMap tile access may fail in sandboxed browser runs, but local Leaflet markers and app UI should still render.

## Restart

Run `./init.sh`. Use the checked-in CSV files for deterministic builds; use live fetch commands only when source freshness is required.

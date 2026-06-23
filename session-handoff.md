# Session Handoff

## Current Objective

- Feature `feat-009` is complete.
- The app is now a bilingual Taipei Zoo visitor guide for animals, exhibit areas, events, map locations, overview metrics, and data notes.

## Data Pipeline

- `npm run convert:data` converts animals, exhibit areas, events, then builds the combined summary.
- Exhibit input: `data/raw/zoo-exhibit-areas/館區介紹1227_0325c改格式.csv`
- Event input: `data/raw/zoo-events/行事曆 1150520.csv`
- Fetch wrappers accept `LOCAL_CSV` or `RESOURCE_URL`; existing files are reused unless `--force` is passed.
- Frontend runtime reads only `public/data/*.json`.

## Verification Evidence

| Check | Result |
|---|---|
| Unit tests | 14 passed |
| Conversion | 313 animals, 17 areas, 116 events |
| Coordinates | 17/17 areas valid; 116/116 events valid |
| Relationships | 13 linked areas; 68 event-area links; 38 event-animal links |
| Local build | Passed |
| GitHub Pages build | Passed |
| Desktop browser QA | Passed |
| Mobile 390x844 QA | Passed |
| English toggle | Passed |

## Decisions

- No new dependency was added.
- Event markers are clustered by identical coordinates using existing Leaflet primitives.
- Dataset image URLs are retained only as references; the UI does not embed them.
- Event status is recomputed in the browser using the Asia/Taipei date so static JSON does not become stale between conversions.
- Relationship matching returns unique IDs and does not force ambiguous matches.

## Remaining Risk

- OpenStreetMap tiles could not load in the sandbox browser, but local marker layers rendered.
- Official exhibit/event CSV resource URLs should be supplied through `RESOURCE_URL` when a live refresh is required.

## Restart

Run `./init.sh`. Use the checked-in CSV files for deterministic builds; use live fetch commands only when source freshness is required.

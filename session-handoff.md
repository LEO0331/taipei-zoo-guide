# Session Handoff

## Current Objective

- Features `feat-011`, `feat-012`, and `feat-013` are implemented.
- The app now includes a separate Taipei biodiversity survey point module for urban ecology learning.
- Feature `feat-012` adds a separate Riverfront Bird Observations module for historical 2012–2015 riverfront surveys.

## Data Pipeline

- `npm run data:fetch:biodiversity` downloads all configured annual CSV resources from the official Taipei Open Data dataset.
- `npm run convert:data` converts animals, exhibit areas, events, plants, biodiversity survey points, summaries, then the combined guide summary.
- Biodiversity raw input: `data/raw/taipei-biodiversity-species-survey-points/`
- Frontend runtime reads only `public/data/*.json`.
- Riverfront birds: `data/raw/riverfront-bird-observations.csv` is converted by `npm run data:convert:riverfront-birds` to `public/data/riverfront-bird-observations/`; source TWD97/TM2 is converted to WGS84 during conversion.
- Riverfront reptiles: `data/raw/riverfront-reptile-observations.csv` is converted by `npm run data:convert:riverfront-reptiles` to `public/data/riverfront-reptile-observations/`; it preserves source taxonomy/date/time fields and converts TWD97/TM2 to WGS84 during conversion.
- Runtime performance: `useZooGuideData` lazily loads datasets for the active tab. The map loads its default small layers on entry and requests biodiversity/reptile data only when those map layers are enabled. The service worker is network-first for navigations and `/data/` with offline fallback, cache-first for static assets, and immediately activates new versions to prevent stale HTML referencing retired bundles.
- Biodiversity performance: the Biodiversity and Overview tabs load `taipei-biodiversity-species-survey-point-summary.json` first (about 10 KB). The 72,286-record `taipei-biodiversity-species-survey-points.json` file (about 113 MB) is only requested after the visitor selects **Load detailed records**; the map layer remains opt-in.
- Navigation: the primary row has four destination groups (Explore Zoo, Nature & Wildlife, Plan Your Visit, Data & Notes). Selecting one opens a context row of two or three tabs. Through tablet widths, the context row uses equal-width buttons with centered icon-and-label groups; wide desktops use compact content-width tabs.
- Hero title: `台北動物園導覽` is intentionally single-line. Its mobile font size scales with viewport width so the no-wrap treatment does not overflow narrow screens.
- Map base layer: uses OpenStreetMap raster tiles with contributor attribution, avoiding the CARTO API-key-required watermark. Keep the attribution visible and review OpenStreetMap tile usage policy before scaling traffic.
- Biodiversity chart labels: `src/utils/biodiversitySpeciesLabels.ts` maps common high-ranking source species to Traditional Chinese and English labels. If a future source species has no mapping, the chart uses a same-language "unavailable" fallback rather than mixing scripts; add verified pairs to the registry as needed.
- Riverfront observation tables: Bird and reptile tables use the shared `observation-table` class. Keep its wide minimum width and single-line headers so the existing `table-wrap` horizontal scroll remains the narrow-screen behavior; localize longitude and latitude as 經度／緯度 in Traditional Chinese. Table values display four decimal places, but map calculations and CSV exports intentionally retain source precision.

## Verification Evidence

| Check | Result |
|---|---|
| Biodiversity fetch | 8 resources prepared |
| Conversion | 72,286 biodiversity records |
| Years | 2017-2024 |
| Unique species names | 2,318 |
| Unit tests | 20 passed |
| Local build | Passed with bundled Node 24 |
| GitHub Pages build | Passed |
| Browser QA | Biodiversity tab, bounded table, detail panel, clustered map layer, and no horizontal overflow passed |
| Final `./init.sh` | Passed with bundled Node 24 |
| Responsive grouped navigation | 390px and desktop browser checks passed; Nature & Wildlife exposes biodiversity, bird, and reptile sub-tabs |
| Latest unit tests | 4 files, 21 tests passed |
| Latest local and Pages builds | Passed |
| Biodiversity chart-label localization | 5 test files, 24 tests passed; local and Pages builds passed |

## Decisions

- No new dependency was added.
- Biodiversity records stay separate from zoo animals, zoo exhibits, plants, and events.
- The map clusters biodiversity survey points and defaults the layer off.
- Observation count is shown as source count, not population size.
- Zoo proximity is educational context only, using a 2 km threshold from a reference coordinate.

## Remaining Risk

- `/usr/local/bin/node` is v20.2.0 and fails current Vite/Rolldown. Use `/Users/Leo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` on `PATH` or upgrade Node before running verification.
- Official Taipei Open Data resource URLs may change; update `scripts/biodiversityResources.ts` if the dataset resource list changes.

## Restart

Run `PATH=/Users/Leo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./init.sh`.

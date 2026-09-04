# Session Progress Log

## Current State

**Last Updated:** 2026-08-13 Asia/Taipei
**Active Feature:** none

## Completed

- [x] Added the separate Riverfront Bird Observations / 河濱鳥類 historical-survey explorer and local static data pipeline.
- [x] Downloaded and preserved the official 14-field CSV, converted EPSG:3826 TWD97/TM2 coordinates to validated WGS84, and generated JSON, GeoJSON, and metadata.
- [x] Added bird, region, month, residency, endemic, and alien filters; dynamic regional and seasonal insights; a table; and filtered CSV export.
- [x] Completed cleanup and review fixes: status-token parsing, combined-summary coverage, cross-platform test discovery, readable bird pipeline logic, and regression tests.
- [x] Added Riverfront Reptile Observations as a separate historical ecology module, including static CSV conversion, EPSG:3826-to-WGS84 conversion, discovery filters, insights, CSV export, detail drawer, and map layer.
- [x] Improved tab responsiveness: data now loads on demand by active tab, map-only wildlife layers load on enable, and the service worker no longer precaches bulk datasets.
- [x] Replaced the long flat tab strip with responsive grouped navigation: Explore Zoo, Nature & Wildlife, Plan Your Visit, and Data & Notes. Each group exposes at most three context-specific sub-tabs.
- [x] Removed the 113 MB biodiversity raw-record download from the default tab and overview path. Both now use the existing compact summary; detailed search, filters, and rows are available only after an explicit load action.
- [x] Prevented blank post-deployment loads: service-worker navigations are network-first, while new workers skip waiting and claim clients immediately so cached HTML cannot keep referencing retired hashed bundles.
- [x] Kept the `台北動物園導覽` hero title on one line with responsive sizing (`white-space: nowrap` plus a viewport-aware mobile font size).
- [x] Replaced CARTO basemap tiles with OpenStreetMap tiles to remove the API-key-required watermark while retaining required attribution.
- [x] Made the Biodiversity tab's Most Recorded Species chart language-consistent: Chinese names display in Traditional Chinese mode and English common names in English mode; source-only names use same-language fallbacks.
- [x] Made Riverfront Bird and Reptile observation tables responsive: headers stay on one line, use 經度／緯度 in Traditional Chinese, and scroll horizontally on narrow screens instead of compressing columns.
- [x] Formatted Riverfront Bird and Reptile table longitude/latitude values to four decimal places; full-precision values remain in map calculations and CSV exports.

- [x] Added `臺北市生物多樣性` as a separate citywide biodiversity survey point module.
- [x] Fetched 2017-2024 annual CSV resources from Taipei Open Data.
- [x] Added parsing for survey dates, species class groups, species names, observation counts, survey methods, coordinate uncertainty, WGS84/TWD97 coordinate handling, Taipei bounds, and Taipei Zoo proximity context.
- [x] Generated records, summary, and latest-year JSON.
- [x] Added Biodiversity tab with filters, summary cards, charts, bounded table, notes, and detail panel.
- [x] Added biodiversity clustered map layer, disabled by default.
- [x] Updated README, feature list, service-worker cache, package scripts, footer/disclaimers, and handoff.

## Generated Data

- Biodiversity survey point records: 72,286.
- Annual resources: 2017-2024.
- Unique species names: 2,318.
- Records within Taipei bounds: 70,067.
- Records near Taipei Zoo area: 833.
- Coordinate systems: 70,067 WGS84, 0 TWD97, 2,219 unknown/missing.

## Verification

- [x] `npm run data:fetch:biodiversity`: prepared 8 resources.
- [x] `npm run convert:data`: generated biodiversity records, summary, latest-year JSON, guide summary, and conversion report.
- [x] `npm test`: 3 files, 20 tests passed.
- [x] `npm run build`: passed with bundled Node 24.
- [x] `GITHUB_PAGES=true npm run build`: passed.
- [x] Browser QA: Biodiversity tab, bounded table, detail panel, clustered map layer, and no horizontal overflow passed.
- [x] `./init.sh`: passed with bundled Node 24, including install, conversion, tests, builds, Pages build, and audit.
- [x] Responsive grouped-navigation QA: at 390px, four primary groups and all current sub-tabs fit without horizontal overflow; at 768px, every secondary icon-and-label group is centered in an equal-width button; desktop layout and Nature & Wildlife group switching passed.
- [x] `npm test`: 4 files, 21 tests passed.
- [x] `npm run build` and `GITHUB_PAGES=true npm run build`: passed.
- [x] Language-consistent biodiversity labels: 5 test files, 24 tests passed; local and GitHub Pages builds passed.

## Remaining Risk

- The default system Node at `/usr/local/bin/node` is v20.2.0 and cannot run current Vite/Rolldown. Use the bundled Node path or upgrade local Node to satisfy Vite's engine requirement.
- Biodiversity coordinates are historical survey points only; they are not current sightings, zoo exhibit locations, population estimates, or habitat boundaries.

## Next

No active task remains. The next session can restart from `./init.sh` with a Node version that satisfies Vite.

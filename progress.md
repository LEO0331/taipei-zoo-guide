# Session Progress Log

## Current State

**Last Updated:** 2026-07-01 Asia/Taipei
**Active Feature:** none

## Completed

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
- [x] `npm test`: 2 files, 18 tests passed.
- [x] `npm run build`: passed with bundled Node 24.
- [x] `GITHUB_PAGES=true npm run build`: passed.
- [x] Browser QA: Biodiversity tab, bounded table, detail panel, clustered map layer, and no horizontal overflow passed.
- [x] `./init.sh`: passed with bundled Node 24, including install, conversion, tests, builds, Pages build, and audit.

## Remaining Risk

- The default system Node at `/usr/local/bin/node` is v20.2.0 and cannot run current Vite/Rolldown. Use the bundled Node path or upgrade local Node to satisfy Vite's engine requirement.
- Biodiversity coordinates are historical survey points only; they are not current sightings, zoo exhibit locations, population estimates, or habitat boundaries.

## Next

No active task remains. The next session can restart from `./init.sh` with a Node version that satisfies Vite.

# Session Progress Log

## Current State

**Last Updated:** 2026-06-23 13:52 Asia/Taipei
**Active Feature:** none

## Completed

- [x] Existing animal guide and static animal data pipeline remain working.
- [x] Added `臺北市立動物園_館區簡介` from the supplied UTF-8-SIG CSV.
- [x] Added `臺北市立動物園_行事曆` from the supplied UTF-8-SIG CSV.
- [x] Added UTF-8-SIG / UTF-8 / Big5 decoding, tolerant dates, WKT parsing, categories, Asia/Taipei event status, keywords, and conversion warnings.
- [x] Added conservative animal-area, event-area, and event-animal links.
- [x] Added six bilingual modules, exhibit/event filters, three map layers, detail panels, overview metrics, and data notes.
- [x] Updated the service worker, README, package scripts, and source metadata.

## Generated Data

- Exhibit areas: 17, all with valid coordinates.
- Events: 116, all with valid coordinates.
- Event status on 2026-06-23: 2 ongoing, 93 past, 21 paused/cancelled.
- Relationships: 13 areas linked to animals, 68 events linked to areas, 38 events linked to animals.
- Multimedia remains external-link only and is not downloaded, embedded, rehosted, or cached.

## Verification

- [x] `npm test`: 2 files, 14 tests passed.
- [x] `npm run convert:data`: 313 animals, 17 areas, 116 events.
- [x] `npm run build`: passed.
- [x] `GITHUB_PAGES=true npm run build`: passed.
- [x] Desktop browser QA: six tabs, filters, map layers, details, overview, and English toggle passed.
- [x] Mobile browser QA at 390x844: navigation, filters, event list, overview, and bottom detail panel passed.

## Remaining Risk

- OpenStreetMap tile requests were blocked by the sandbox browser (`ERR_INVALID_HANDLE`); Leaflet and all local markers rendered correctly.
- Live exhibit/event CSV resource URLs are not hardcoded because only dataset pages and uploaded CSV files were supplied. Fetch scripts accept `RESOURCE_URL` or `LOCAL_CSV`.

## Next

The only unfinished tracked feature remains `feat-005` browser smoke testing history; this session completed browser QA for the new visitor-guide surfaces.

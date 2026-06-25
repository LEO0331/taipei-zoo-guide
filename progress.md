# Session Progress Log

## Current State

**Last Updated:** 2026-06-25 Asia/Taipei
**Active Feature:** none

## Completed

- [x] Existing animal guide, exhibit-area guide, event calendar, static data pipeline, and PWA shell remain working.
- [x] Added `臺北市立動物園_植物資料` from the supplied UTF-8-SIG CSV.
- [x] Added plant normalization for names, aliases, taxonomy, location aliases, dates, coordinates, external media references, and conversion warnings.
- [x] Added plant species summary JSON while keeping plant records separate from animal records.
- [x] Added bilingual Plant Guide, taxonomy/location filters, plant map layer, plant detail panel, overview metrics, data notes, footer/source text, and service-worker cache entries.
- [x] Preserved multimedia licensing rule: plant media URLs stay as source-only external references and are not embedded, downloaded, rehosted, or cached.

## Generated Data

- Animals: 313 records.
- Exhibit areas: 17 records.
- Events: 116 records.
- Plants: 276 location records grouped into 100 species.
- Plant relationships: exhibit-area matching is text/location based only; no plant-animal relationships were added.

## Verification

- [x] `npm run data:fetch:plants`: prepared `data/raw/zoo-plants/植物資料1150617b.csv` and source metadata.
- [x] `npm run convert:data`: 313 animals, 17 areas, 116 events, 276 plants, 100 plant species.
- [x] `npm test`: 2 files, 16 tests passed.
- [x] `npm run build`: passed.
- [x] `GITHUB_PAGES=true npm run build`: passed.
- [x] Browser QA: Plant Guide, plant detail panel, map plant layer, English labels, and mobile 390x844 layout passed.
- [x] `./init.sh`: passed, including `npm ci`, conversion, tests, builds, Pages build, and `npm audit --audit-level=moderate`.

## Remaining Risk

- Live plant CSV resource URL is not hardcoded because the uploaded CSV was supplied directly. Use `RESOURCE_URL` or `LOCAL_CSV` for live refresh.
- Plant-to-area links are conservative and based on dataset location text/aliases; ambiguous free-text locations may remain unlinked.

## Next

No active task remains. The next session can restart from `./init.sh`.

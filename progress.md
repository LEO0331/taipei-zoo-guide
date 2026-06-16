# Session Progress Log

## Current State

**Last Updated:** 2026-06-16 15:30 Asia/Taipei  
**Active Feature:** none

## Status

### What's Done

- [x] Built the Vite + React + TypeScript + Leaflet Taipei Zoo Animal Guide.
- [x] Added static data pipeline for Taipei Open Data fetch and conversion.
- [x] Generated current static data from 313 fetched records.
- [x] Added GitHub Pages workflow and Pages-specific Vite base path.
- [x] Created minimal harness artifacts with `harness-creator`.
- [x] Customized harness artifacts to the Taipei Zoo Animal Guide.
- [x] Validated harness structure with a 100/100 score.
- [x] Ran `./init.sh` successfully.
- [x] Completed code review fixes for GitHub Pages runtime paths, PWA manifest paths, URL sanitization, storage fallback, stale raw-data page handling, and adoption marker parsing.
- [x] Completed AI slop cleanup pass with regression tests first.

### What's In Progress

- [ ] No active harness work.

### What's Next

1. Pick `feat-005` if the next task is browser-based visual QA.
2. Otherwise add a new feature entry before starting new implementation work.

## Blockers / Risks

- [ ] Visual browser QA is incomplete because the in-app browser crashed while opening `http://127.0.0.1:5173/`.
- [ ] Live data refresh depends on Taipei Open Data network availability, so `./init.sh` uses checked-in raw data by default.

## Decisions Made

- **Default verification avoids network fetch:** `./init.sh` converts checked-in raw data instead of calling `npm run fetch:data`.
  - Context: startup verification should be reliable across sessions.
  - Alternative considered: always fetch live data in `./init.sh`; rejected because network/API availability should not block unrelated local work.
- **Media remains external-link only:** multimedia URLs are preserved as links, not downloaded or re-hosted.
  - Context: dataset open-license content is limited to text.
- **Generated URLs are sanitized:** conversion keeps only `http:` and `https:` URLs.
  - Context: dataset fields are external input and later rendered as links.
- **GitHub Pages paths use Vite base URL:** runtime data fetches and service worker registration use `import.meta.env.BASE_URL`.
  - Context: absolute root paths break when deployed under `/taipei-zoo-guide/`.
- **Cleanup stayed behavior-preserving:** removed duplication and brittle checks instead of splitting the app into many files.
  - Context: the app is still small enough for single-file component locality; a broad component extraction would increase churn without new behavior.

## Files Modified This Session

- `AGENTS.md` - project-specific startup, constraints, verification, and done criteria.
- `feature_list.json` - current feature tracker and evidence.
- `progress.md` - continuity log.
- `session-handoff.md` - restart summary.
- `init.sh` - local verification path.
- `src/App.tsx` - safe storage and base-aware data fetches.
- `src/main.tsx` - base-aware service worker registration.
- `src/utils/assets.ts` - shared asset path helper.
- `src/utils/zooData.ts` - safe URL filtering and adoption marker parsing.
- `src/utils/zooData.test.ts` - regression tests for unsafe URLs and adoption markers.
- `scripts/fetchZooAnimalData.ts` - stale generated page cleanup and page limit validation.
- `scripts/convertZooAnimalData.ts` - conversion honors `resource-index.json` pages.
- `public/service-worker.js` - base-aware same-origin cache handling.
- `public/manifest.webmanifest` - relative PWA start/icon paths.
- `index.html` - base-aware manifest/icon paths.
- `src/App.tsx` - centralized mapped-animal filtering and media-reference counts.
- `src/main.tsx` - explicit root-element startup error.
- `src/utils/zooData.ts` - cached normalized row fields instead of repeated lookups.
- `src/utils/zooData.test.ts` - stronger live API row normalization coverage.

## Evidence of Completion

- [x] Tests pass: `npm test`
- [x] Build passes: `npm run build`
- [x] GitHub Pages build passes: `GITHUB_PAGES=true npm run build`
- [x] Audit clean: `npm audit --audit-level=moderate`
- [x] Harness validation: `node /Users/Leo/.agents/skills/harness-creator/scripts/validate-harness.mjs --target /Users/Leo/Documents/taipei-zoo-guide` scored 100/100
- [x] Full init: `./init.sh` passed all checks
- [x] Generated URL safety: `badUrls=0`
- [x] Pages path check: `dist/index.html` uses `/taipei-zoo-guide/`, manifest uses relative `icons/icon.svg`
- [x] Cleanup full gate: `./init.sh` passed after cleanup

## Notes for Next Session

Start by reading `AGENTS.md`, then run `./init.sh`. Use `npm run fetch:data` only when source-data freshness matters. The only unfinished tracked feature is browser visual QA.

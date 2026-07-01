# Session Handoff

## Current Objective

- Feature `feat-011` is implemented.
- The app now includes a separate Taipei biodiversity survey point module for urban ecology learning.

## Data Pipeline

- `npm run data:fetch:biodiversity` downloads all configured annual CSV resources from the official Taipei Open Data dataset.
- `npm run convert:data` converts animals, exhibit areas, events, plants, biodiversity survey points, summaries, then the combined guide summary.
- Biodiversity raw input: `data/raw/taipei-biodiversity-species-survey-points/`
- Frontend runtime reads only `public/data/*.json`.

## Verification Evidence

| Check | Result |
|---|---|
| Biodiversity fetch | 8 resources prepared |
| Conversion | 72,286 biodiversity records |
| Years | 2017-2024 |
| Unique species names | 2,318 |
| Unit tests | 18 passed |
| Local build | Passed with bundled Node 24 |
| GitHub Pages build | Passed |
| Browser QA | Biodiversity tab, bounded table, detail panel, clustered map layer, and no horizontal overflow passed |
| Final `./init.sh` | Passed with bundled Node 24 |

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

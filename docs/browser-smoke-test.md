# Browser Smoke Test

Automated Playwright coverage runs against a production preview at desktop and 390px mobile widths in CI. This checklist remains the manual release fallback, especially for browser-specific map rendering and offline navigation behavior that needs human confirmation.

For a first local run, install Chromium with `npx playwright install chromium`.

Run this checklist before a public release after `npm run build`, `GITHUB_PAGES=true npm run build`, and `npm run test:e2e` succeed.

1. Open the Animal Guide and confirm the first destination group and its sub-tabs are visible without clipped labels.
2. Switch language. Confirm primary and secondary navigation labels, biodiversity chart labels, riverfront table headers, and coordinate labels use the selected language.
3. Open Riverfront Birds and Riverfront Reptiles. Apply one filter in each, inspect a detail panel, and confirm the observation table scrolls horizontally rather than compressing headers.
4. Open Biodiversity. Confirm the lightweight summary appears first; choose **Load detailed records** only when checking filters or the record table.
5. Open Map. Toggle the biodiversity and reptile layers separately, inspect a marker popup, and verify the OpenStreetMap attribution remains visible.
6. Open Overview. Confirm bird and reptile totals are separate and that the Riverfront Ecology comparison clearly says it is not a population or habitat-quality comparison.
7. Reload the deployed page normally. Confirm the app loads without a hard refresh, then repeat one navigation and map check while offline if browser tooling permits.

Record the date, build commit, viewport sizes, and any failures in `progress.md` before release.

## Latest recorded run

- **2026-09-04, local desktop:** Passed grouped navigation, biodiversity summary, bird/reptile filter and table rendering, Overview comparison/totals, map layer controls, and OpenStreetMap attribution.
- **2026-09-04, automated production preview:** Playwright passed 14 checks across desktop and 390px mobile viewports, covering navigation, language, lightweight biodiversity loading, riverfront tables, Overview, map controls/popup/attribution, and service-worker reload.
- **Manual fallback:** Repeat this checklist for browser-specific map rendering and offline navigation before every release.

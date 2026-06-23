# Taipei Zoo Visitor Guide Expansion

## Scope

Extend the existing animal guide with exhibit-area and event-calendar records from the two supplied CSV files. Keep all three record families separate, link them only through conservative name/keyword matching, and continue serving static JSON to the browser.

## Architecture

- Add exhibit-area, event, and combined-summary types to `src/models.ts`.
- Add pure CSV-normalization, date, WKT, category, status, and relationship helpers to `src/utils/zooGuideData.ts`.
- Keep dataset file decoding and JSON writes in thin scripts under `scripts/`.
- Generate `zoo-exhibit-areas.json`, `zoo-events.json`, `zoo-guide-summary.json`, and a merged `conversion-report.json`.
- Extend the existing React app with six tabs: animal guide, exhibit areas, events, map, data overview, and data notes.
- Reuse the existing detail panel, filter controls, Leaflet map, bar lists, and bilingual translation pattern.

## Data Rules

- Decode UTF-8 BOM first and fall back to Big5/CP950 using `TextDecoder`.
- Preserve raw date and WKT fields while storing normalized ISO dates and validated coordinates.
- Treat missing, outlier, and unparsed coordinates distinctly.
- Match exhibit areas and animals by normalized exact names and listed aliases only.
- Match events only on direct area aliases or direct animal-name/alias/keyword strings.
- Store multimedia URLs as external references only. Never download, cache, transform, or embed dataset images.

## UI

- Animal Guide keeps the current animal filters and directory.
- Exhibit Areas provides category/link/relationship filters, cards, map access, and detail panels.
- Events provides category/status/month/location/link/coordinate filters, a compact monthly list, cards, map access, and paused/cancelled visibility.
- Map provides explicit Animals, Exhibit Areas, and Events layer toggles.
- Data Overview combines current animal metrics with exhibit-area and event metrics.
- Data Notes contains dataset, schedule, coordinate, and multimedia-license notices.

## Verification

- Test pure parsing, classification, status, keyword, and matching behavior first.
- Run conversion against both supplied CSV files and inspect generated counts/warnings.
- Run unit tests, local build, GitHub Pages build, and browser checks at desktop and mobile widths.


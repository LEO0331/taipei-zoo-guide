# Taipei Zoo Guide / 台北動物園導覽

Mobile-first bilingual visitor guide built with Vite, React, TypeScript, and Leaflet.

Now includes animal, plant, city biodiversity, exhibit-area, and event-calendar guide modules.

The app keeps animal, plant, biodiversity survey, exhibit-area, and event records as separate data types. Biodiversity survey points are citywide historical survey records, not zoo exhibit animals, live wildlife locations, population estimates, or habitat boundaries. Traditional Chinese is the default language; the English toggle persists in `localStorage`.

## Data Sources

- Animal dataset: https://data.taipei/dataset/detail?id=5cb73231-b741-48b3-bec3-2ef57bb10029
- Plant dataset: https://data.taipei/dataset/detail?id=48c4d6a7-4b09-4d1f-9739-ee837d302bd1
- Taipei biodiversity dataset: https://data.taipei/dataset/detail?id=084c5d95-7e9f-49ad-8ab9-d741a9564189
- Exhibit-area dataset: https://data.taipei/dataset/detail?id=1ed45a8a-d26a-4a5f-b544-788a4071eea2
- Event-calendar dataset: https://data.taipei/dataset/detail?id=61ff4b3a-8a8a-47e4-96ec-e180b2abbfdb
- Animal raw data: `data/raw/zoo-animals/`
- Plant raw data: `data/raw/zoo-plants/`
- Biodiversity raw data: `data/raw/taipei-biodiversity-species-survey-points/`
- Exhibit-area raw data: `data/raw/zoo-exhibit-areas/`
- Event raw data: `data/raw/zoo-events/`
- Frontend static data: `public/data/`

The browser never calls Taipei Open Data directly. It reads generated local JSON only.

## Visitor Guide Modules

- Animal Guide / 動物導覽
- Plant Guide / 植物導覽
- Biodiversity / 生物多樣性
- Exhibit Areas / 館區導覽
- Events / 行事曆
- Map / 地圖
- Data Overview / 資料概覽
- Data Notes / 資料說明

The map has separate animal, plant, biodiversity survey point, exhibit-area, and event layers. Biodiversity points are clustered historical survey coordinates and must not be used for tracking, capture, feeding, disturbance, or legal conservation-status decisions.

## Coordinates and Dates

Animal, plant, and exhibit-area coordinates are validated against Taipei Zoo bounds. Event coordinates support WKT values in either form:

```txt
POINT(121.5827058 24.9983016)
MULTIPOINT((121.5827058,24.9983016))
```

Missing, outlier, or unparsed coordinates remain in list views and are omitted from map markers.

Plant update dates, biodiversity survey dates, and event dates are normalized to ISO `YYYY-MM-DD`. Biodiversity coordinates are validated against broad Taipei bounds; WGS84 is used directly and TWD97/TM2 is converted when detected. Event status uses the Asia/Taipei calendar date and returns upcoming, ongoing, past, paused/cancelled, or unknown.

## Multimedia Licensing

Taipei Zoo dataset open-license application content is limited mainly to text. Images, audio, and video are outside the open-license scope.

This project does not download, re-host, transform, cache, embed, or redistribute dataset multimedia. Multimedia URLs remain external source references; the UI prefers official page links.

## Install

```bash
npm install
```

## Fetch Data

Refresh the animal API pages:

```bash
npm run fetch:data
```

Prepare exhibit-area or event CSV input from a local file or an official CSV resource URL:

```bash
LOCAL_CSV="/path/to/areas.csv" npm run data:fetch:exhibit-areas
RESOURCE_URL="https://example.gov.tw/areas.csv" npm run data:fetch:exhibit-areas -- --force

LOCAL_CSV="/path/to/events.csv" npm run data:fetch:events
RESOURCE_URL="https://example.gov.tw/events.csv" npm run data:fetch:events -- --force

LOCAL_CSV="/path/to/plants.csv" npm run data:fetch:plants
RESOURCE_URL="https://example.gov.tw/plants.csv" npm run data:fetch:plants -- --force

npm run data:fetch:biodiversity
```

Existing CSV files are reused unless `--force` is passed. Source metadata records the dataset page, source, time, file size, encoding, and conversion note.

## Convert Data

```bash
npm run convert:data
```

CSV decoding supports UTF-8-SIG, UTF-8, and Big5/CP950 fallback.

Generated files:

- `public/data/zoo-animals.json`
- `public/data/zoo-animal-summary.json`
- `public/data/zoo-plants.json`
- `public/data/zoo-plant-species.json`
- `public/data/zoo-plant-summary.json`
- `public/data/taipei-biodiversity-species-survey-points.json`
- `public/data/taipei-biodiversity-species-survey-point-summary.json`
- `public/data/taipei-biodiversity-species-survey-point-latest.json`
- `public/data/zoo-exhibit-areas.json`
- `public/data/zoo-events.json`
- `public/data/zoo-guide-summary.json`
- `public/data/conversion-report.json`

## Develop and Verify

```bash
npm run dev
npm test
npm run build
GITHUB_PAGES=true npm run build
```

The service worker caches the same-origin app shell and generated JSON files. It does not cache external dataset media.

## Disclaimer

This site organizes Taipei Zoo public-data records for visitor guidance and data exploration only. Animal display status, event times, exhibit-area opening status, and on-site arrangements may change; refer to Taipei Zoo official notices and on-site information.

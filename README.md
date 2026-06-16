# Taipei Zoo Animal Guide / 台北動物園動物導覽

Mobile-first bilingual web app for exploring the Taipei Open Data dataset `臺北市立動物園_動物資料`.

The app provides a public animal map, searchable animal directory, detail guide, lightweight conservation dashboard, and data table. Traditional Chinese is the default UI language, with an English toggle persisted in `localStorage`.

## Data Source

- Dataset page: https://data.taipei/dataset/detail?id=5cb73231-b741-48b3-bec3-2ef57bb10029
- API resource URL: https://data.taipei/api/v1/dataset/6afa114d-38a2-4e3c-9cfd-29d3bd26b65b?scope=resourceAquire
- Local raw data path: `data/raw/zoo-animals/`
- Frontend static data path: `public/data/`

The frontend never calls the Taipei Open Data API directly. It reads generated static JSON files only.

## Multimedia Licensing Caveat

The dataset page states that open-license application content is limited to text. Images, sound, and video are outside the open-license scope.

This project does not download, re-host, or redistribute multimedia files. Multimedia fields are converted into structured external links so users can open original source-linked media separately.

## Coordinate Handling

Coordinates are converted to numbers and validated against a broad Taipei Zoo / Wenshan area bounding box:

```ts
{
  minLng: 121.55,
  maxLng: 121.60,
  minLat: 24.98,
  maxLat: 25.01
}
```

Records receive `coordinateStatus: "valid" | "missing" | "outlier"`. Missing or outlier coordinates are kept in the directory, dashboard, and data table, but are not rendered as map markers.

Map points represent exhibit or guide locations, not real-time animal positions. Actual animal availability should be verified on site.

## Install

```bash
npm install
```

## Fetch Data

```bash
npm run fetch:data
```

The fetch script supports Taipei Open Data resource URLs shaped like:

```txt
https://data.taipei/api/v1/dataset/{RESOURCE_ID}?scope=resourceAquire
```

It fetches the default resource `6afa114d-38a2-4e3c-9cfd-29d3bd26b65b`, supports `limit` and `offset`, writes pages into `data/raw/zoo-animals/`, and writes `resource-index.json` metadata.

Optional environment variables:

```bash
RESOURCE_ID=6afa114d-38a2-4e3c-9cfd-29d3bd26b65b PAGE_LIMIT=1000 npm run fetch:data
```

## Convert Data

```bash
npm run convert:data
```

Generated files:

- `public/data/zoo-animals.json`
- `public/data/zoo-animal-summary.json`
- `public/data/conversion-report.json`

The converter supports raw Taipei Open Data JSON pages and CSV files placed under `data/raw/zoo-animals/`.

## Develop

```bash
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Deploy

Build the static site and deploy the generated `dist/` directory to any static host.

```bash
npm run fetch:data
npm run convert:data
npm run build
```

The app includes a web app manifest, mobile viewport metadata, an SVG icon placeholder, and a simple service worker that caches the app shell and generated data JSON in production.

## Disclaimer

This site presents public animal guide data for educational exploration. Actual exhibit availability, animal status, open areas, and official notices should be verified through Taipei Zoo and Taipei Open Data.

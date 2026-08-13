# 臺北市立動物園與自然觀察導覽

[English](README.md) · **繁體中文**

以 Vite、React、TypeScript 與 Leaflet 製作的行動優先雙語導覽，整合臺北市立動物園及臺北自然生態公開資料。瀏覽器只讀取專案產生的本機 JSON，不會在執行階段直接呼叫臺北開放資料 API。

## 提供的內容

- 動物園動物、植物、館區與活動導覽。
- 獨立的臺北市生物多樣性調查點位探索工具。
- 獨立的河濱鳥類與河濱爬蟲歷史觀察紀錄探索工具。
- 搜尋、篩選、詳細資料抽屜、地圖圖層、資料摘要與本機資料匯出。
- 介面預設為繁體中文，並可切換且記住英文偏好。

## 解讀資料前請注意

本專案是公開資料教育與探索工具，**不是即時野生動物服務**。

- 河濱鳥類及爬蟲資料為 2012–2015 年的歷史調查紀錄，不代表目前仍可觀察到、族群數量、棲地品質、安全性或保證可見。
- 觀察紀錄數、物種數與來源記錄個體總數是不同指標；不可合併為生物多樣性分數，也不可據此對區域作定論式排名。
- 「特有」不等於保育等級；「外來」不自動等於入侵、有害或需防治。
- 地圖點位是來源紀錄座標。請勿用於追蹤、捕捉、餵食、觸摸、移置或干擾野生動物。

資料導向的產品建議與待處理風險請見[客戶儀表板建議](docs/customer-dashboard-advisory-2026-08-13.md)。

## 資料來源

- [臺北市立動物園動物資料](https://data.taipei/dataset/detail?id=5cb73231-b741-48b3-bec3-2ef57bb10029)
- [臺北市立動物園植物資料](https://data.taipei/dataset/detail?id=48c4d6a7-4b09-4d1f-9739-ee837d302bd1)
- [臺北市生物多樣性調查點位](https://data.taipei/dataset/detail?id=084c5d95-7e9f-49ad-8ab9-d741a9564189)
- [臺北市河濱生態鳥類](https://data.taipei/dataset/detail?id=8eea1e09-055b-4b3d-9472-b96744b1727e)
- [臺北市河濱生態爬蟲](https://data.taipei/dataset/detail?id=320ee03a-7944-4033-9317-1373fa8615f8)
- [臺北市立動物園館區介紹](https://data.taipei/dataset/detail?id=1ed45a8a-d26a-4a5f-b544-788a4071eea2)
- [臺北市立動物園活動行事曆](https://data.taipei/dataset/detail?id=61ff4b3a-8a8a-47e4-96ec-e180b2abbfdb)

原始資料快照位於 `data/raw/`；供瀏覽器使用的產生資料位於 `public/data/`。

## 靜態資料流程

```bash
npm run convert:data
```

此流程會轉換動物園、生物多樣性、河濱鳥類與河濱爬蟲資料。河濱野生動物資料會保留原始 TWD97/TM2 座標，並在建置時轉換為經驗證的 WGS84 座標。輸出包括：

- `public/data/riverfront-bird-observations/observations.json`
- `public/data/riverfront-bird-observations/observations.geojson`
- `public/data/riverfront-bird-observations/metadata.json`
- `public/data/riverfront-reptile-observations/observations.json`
- `public/data/riverfront-reptile-observations/observations.geojson`
- `public/data/riverfront-reptile-observations/metadata.json`

若只處理單一資料集，可使用：

```bash
npm run data:convert:riverfront-birds
npm run data:convert:riverfront-reptiles
npm run data:convert:biodiversity
```

## 本機開發

需求：Node.js 22 或更新版本，以及 npm。

```bash
npm ci
npm run convert:data
npm test
npm run build
npm run dev
```

發布前請驗證 GitHub Pages 建置：

```bash
GITHUB_PAGES=true npm run build
```

在支援 Bash 的環境中，可執行 `./init.sh` 進行標準完整驗證。

## 專案結構

- `src/`：React 應用程式、資料模型、工具與單元測試。
- `scripts/`：資料抓取器、轉換器及摘要產生器。
- `data/raw/`：納入版本控制的來源快照。
- `public/data/`：供前端執行時讀取的靜態資料。
- `docs/`：產品、設計及客戶建議文件。

## 授權與多媒體

動物園資料集的開放授權適用內容以文字為主。本專案不下載、重製、重新託管、轉換、快取、嵌入或散布資料集的圖片、音訊與影片；多媒體僅保留為外部來源連結。

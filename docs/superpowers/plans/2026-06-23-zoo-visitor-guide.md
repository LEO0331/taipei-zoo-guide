# Taipei Zoo Visitor Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add static exhibit-area and event-calendar data, relationships, navigation, filters, map layers, overview metrics, and licensing notes without changing the frontend stack.

**Architecture:** Pure shared utilities own normalization and matching. Thin scripts decode supplied CSV files and write static JSON. The existing React/Leaflet app consumes those outputs and reuses its current UI patterns.

**Tech Stack:** TypeScript, Node.js, Vite, React, Leaflet, Vitest

---

### Task 1: Lock data behavior

**Files:**
- Create: `src/utils/zooGuideData.test.ts`
- Modify: `src/models.ts`

- [x] Add failing tests for UTF-8 CSV fields, date parsing, Asia/Taipei event status, WKT parsing, categories, keywords, and conservative matching.
- [x] Run `npm test` and verify failure is caused by missing visitor-guide utilities.

### Task 2: Implement conversion utilities

**Files:**
- Create: `src/utils/zooGuideData.ts`
- Modify: `src/models.ts`

- [x] Add the minimum types and pure helpers required by Task 1.
- [x] Run `npm test` until all utility tests pass.

### Task 3: Convert supplied datasets

**Files:**
- Create: `data/raw/zoo-exhibit-areas/館區介紹1227_0325c改格式.csv`
- Create: `data/raw/zoo-events/行事曆 1150520.csv`
- Create: `scripts/zooGuideCsv.ts`
- Create: `scripts/convertZooExhibitAreas.ts`
- Create: `scripts/convertZooEvents.ts`
- Create: `scripts/buildZooGuideSummary.ts`
- Create: `scripts/fetchZooExhibitAreas.ts`
- Create: `scripts/fetchZooEvents.ts`
- Modify: `scripts/convertZooAnimalData.ts`
- Modify: `package.json`

- [x] Decode UTF-8-SIG with Big5 fallback, convert rows, merge reports, and write static JSON.
- [x] Run `npm run convert:data` and inspect counts, dates, coordinate status, and warnings.

### Task 4: Extend the visitor guide UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/i18n.ts`
- Modify: `src/styles.css`

- [x] Load all static datasets and combined summary.
- [x] Add six tabs, module-specific filters, exhibit/event cards and details, map layers, overview metrics, and data notes.
- [x] Keep Chinese default and external media references link-only.

### Task 5: Complete integration

**Files:**
- Modify: `public/service-worker.js`
- Modify: `README.md`
- Modify: `init.sh`
- Modify: `feature_list.json`
- Modify: `progress.md`
- Modify: `session-handoff.md`

- [x] Cache new same-origin JSON files and no external media.
- [x] Document datasets, conversion, status, coordinates, relationships, and licensing.
- [x] Run `./init.sh`, then browser checks for tabs, filters, maps, details, and mobile layout.

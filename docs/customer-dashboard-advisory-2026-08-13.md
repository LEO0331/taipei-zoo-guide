# Customer dashboard advisory

## Executive view

The product has become a useful public-data explorer: it combines a zoo-visit guide with separate historical city biodiversity, riverfront bird, and riverfront reptile datasets. The strongest customer value is not prediction; it is helping families, educators, and nature enthusiasts ask better questions about **what was recorded, where, and under what historical survey conditions**.

The dashboard should continue to lead with that evidence boundary. None of the riverfront figures should be read as current sightings, population sizes, habitat-quality scores, or a promise of a wildlife encounter.

## What the current dashboard can credibly say

All figures below are derived from the checked-in, generated local data as of 2026-08-13.

| Dataset | Records | Distinct species | Regions | Source-recorded individuals |
| --- | ---: | ---: | ---: | ---: |
| Riverfront birds | 11,789 | 108 | 3 | 39,817 |
| Riverfront reptiles | 357 | 11 | 3 | 589 |
| City biodiversity survey points | 72,286 | 2,318 | Citywide | Source-dependent |

### Bird observations

- The Tamsui River has the most recorded bird species (88), while the Xindian River has the most bird observation records (7,363). This is a useful contrast to show visitors: **species richness and record volume are different measures**.
- December has the greatest bird species richness in this historical dataset (65 species), followed by November (61). This may help frame seasonal learning content, but it must remain a historical-survey pattern rather than a forecast.
- Guandu Waterfront Park has 30 recorded bird species from 279 source rows; its smaller record volume should not be interpreted as lower ecological value because effort, route design, and repeated visits are unknown.

### Reptile observations

- The reptile dataset is much smaller and should be presented as an exploratory reference rather than a comparative scorecard: 357 records, 11 species, and 589 source-recorded individuals.
- Xindian River contains 227 reptile observation records and 9 recorded species; Tamsui River has 98 records and 7 species; Guandu Waterfront Park has 32 records and 6 species.
- April has the highest recorded reptile species richness (8 species), while July and August have the greatest number of source rows (61 and 68). This is compatible with seasonal activity **and** survey-timing effects; it is not a recommendation to seek reptiles at particular locations or times.
- The dataset includes 113 endemic-designated records and 54 alien-designated records. “Alien” must remain neutral: the field alone does not establish invasiveness, harm, or a management priority.

## Recommendations for product and programme decisions

1. **Make “historical survey” the first message in all public-facing discovery surfaces.** The current language is responsible; preserve it in map popups, exports, and social-sharing previews. Add the source coverage dates beside the primary numbers, not only in notes.
2. **Use richness and record count side by side.** A small inline explainer—“more records can reflect more survey effort”—will prevent the most common user misreading. This is especially important when comparing the Tamsui and Xindian river areas.
3. **Prioritise education journeys over hotspot hunting.** A family-facing path could compare birds and reptiles by shared river areas and months, then direct users to general observation ethics. Do not turn individual historical coordinates into a “find wildlife here” experience.
4. **Design a data-refresh decision, not a cosmetic refresh.** The bird and reptile sources are historical one-off survey material. If the owner wants a current-status product, commission or integrate a methodologically compatible monitoring programme; do not imply freshness through interface design.
5. **Set a success metric that matches the product.** Measure successful searches, use of source/methodology notes, filter engagement, and learning-completion actions—not “sighting success” or apparent wildlife abundance.

## Operational findings requiring attention

| Priority | Finding | Why it matters | Recommended action |
| --- | --- | --- | --- |
| High | `npm audit --audit-level=moderate` reports two high-severity transitive advisories (`nanoid`, `postcss`). | This is a static site, so runtime exposure is limited, but the build toolchain should not ship with known high-severity advisories. | Review the lockfile update proposed by `npm audit fix` in a separate, tested dependency-maintenance change. |
| High | The service worker is cache-first for same-origin data and retains cache name `taipei-zoo-guide-v4` while generated data files change. | Returning visitors may keep stale JSON indefinitely because cached data wins over a new deployment. | Increment the cache version for every data release, or adopt a revisioned/precache manifest strategy. |
| Medium | The single `src/App.tsx` contains all module views, filtering, map behaviour, and detail rendering. | New nature modules will increase regression risk and make accessibility or i18n work harder to review. | Split stable module views and shared historical-observation controls into components with focused tests before the next dataset is added. |
| Medium | The riverfront ecology data is present in the UI but lacks a single comparison surface explaining survey-method and detectability differences. | Users may compare birds and reptiles as if their record volumes were directly comparable. | Add a compact “Riverfront Ecology” comparison panel that limits comparisons to regions, months, and species counts, with the methodological caveat visible. |
| Medium | The overview currently exposes riverfront bird totals but not the new reptile totals, despite generating both in the combined summary. | A customer can underestimate the scope of the nature offer and miss a useful entry point into the reptile module. | Add reptile record, species, and source-recorded-individual cards to the Overview, keeping them separate from bird metrics. |
| Medium | Data Notes and the generic map disclaimer describe zoo, plant, event, and biodiversity records but do not yet explicitly explain riverfront bird and reptile layers. | A visitor who arrives through the map may not see the historical-survey limitations that govern the new layers. | Add dedicated bird/reptile methodology notes and name both historical wildlife layers in the coordinate disclaimer. |
| Medium | Bird and reptile generated metadata currently uses literal coverage and source-update dates in the conversion scripts. | A future CSV refresh could publish a newer file while retaining stale provenance claims. | Derive freshness from checked-in source metadata or file metadata, and compute record-date coverage from the converted source rows. |
| Medium | Automated browser QA remains marked not started. | Build and unit tests cannot prove the mobile map, filters, exports, keyboard navigation, or detail drawers work together. | Restore a reliable browser smoke-test path and include desktop plus mobile verification before the next public release. |

## Resolution audit (2026-09-04)

| Finding | Status | Current resolution / remaining decision |
| --- | --- | --- |
| Dependency advisories | Resolved | Current `npm audit --audit-level=moderate` returns no reportable advisories. Keep audit in release verification. |
| Stale service-worker data | Resolved | Service worker v6 uses network-first navigation and data requests, immediately activates new workers, and claims clients. |
| `App.tsx` concentration | Partially resolved | Riverfront comparison logic now lives in a tested utility and a dedicated component. Existing stable guide views remain in `App.tsx`; split further only as each view changes to avoid a high-risk cosmetic refactor. |
| Riverfront ecology comparison | Resolved | Overview includes a bounded bird/reptile comparison by shared river area and month, expressed as species counts only with a visible detectability caveat. |
| Reptile totals in Overview | Resolved | Reptile record, species, and source-recorded-individual totals are separate Overview cards. |
| Riverfront methodology disclosures | Resolved | Data Notes and the generic coordinate notice name both historical riverfront layers and their interpretation limits. |
| Stale provenance literals | Resolved | Bird/reptile conversion scripts derive coverage from converted records and report the checked-in source file modification time instead of hard-coded coverage or update dates. |
| Browser QA process | Resolved for the manual release workflow | A repeatable desktop/mobile [browser smoke-test checklist](browser-smoke-test.md) now covers navigation, filters, maps, exports, details, cache updates, and offline behavior; a current desktop run is recorded in the checklist and `progress.md`. Fully automated browser E2E remains a future dependency decision, not a release blocker. |

## What not to claim

- A river area with more records is definitively more biodiverse.
- A hot spot shows current reptile or bird presence, a nest, a breeding site, or safe viewing conditions.
- Summed recorded individuals are a population estimate.
- An endemic designation determines conservation status.
- An alien designation establishes invasiveness or harm.

## 90-day sequence status (verified 2026-09-04)

1. **Completed — service-worker data-release strategy and dependency advisories.** Service worker v6 is network-first for navigations and generated data, activates immediately, claims clients, and removes outdated caches. `npm audit --audit-level=moderate` is clean.
2. **Completed — responsive/accessibility browser QA path.** [Browser smoke test](browser-smoke-test.md) is the release checklist. A current local desktop run verified grouped navigation, biodiversity summary loading, bird/reptile filters and tables, Overview, and map controls/attribution; earlier 390px checks are recorded in `progress.md`. Repeat the checklist at both widths before every release.
3. **Completed — bounded Riverfront Ecology comparison.** Overview now compares only bird and reptile species counts by shared river area and month, with an explicit methodology and detectability caveat.
4. **Open decision — current, repeatable monitoring dataset.** Decide whether authority and budget exist. Until then, retain the dashboard’s historical-learning positioning and do not imply current wildlife presence.

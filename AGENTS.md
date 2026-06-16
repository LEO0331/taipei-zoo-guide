# AGENTS.md

Lightweight harness for agent-assisted work on the Taipei Zoo Animal Guide.

## Startup Workflow

Before editing:

1. Confirm the repo: `pwd`
2. Read this file and `README.md`
3. Read `feature_list.json`, `progress.md`, and `session-handoff.md`
4. Review recent work: `git status --short` and `git log --oneline -5`
5. Run `./init.sh` unless the user asked for a read-only task

If baseline verification fails, fix that before adding new scope.

## Project Facts

- Stack: Vite + React + TypeScript + Leaflet, static frontend only.
- Data pipeline: `scripts/fetchZooAnimalData.ts` downloads raw Taipei Open Data JSON; `scripts/convertZooAnimalData.ts` writes static JSON under `public/data/`.
- Frontend must read local static JSON only. Do not call Taipei Open Data from React runtime.
- Traditional Chinese is the default language; English toggle persists in `localStorage`.
- Multimedia fields are outside the dataset open-license scope. Do not download, re-host, or inline copied media assets; keep them as original external links with licensing notice.
- Map coordinates are exhibit/guide locations, not real-time animal positions.
- GitHub Pages builds use `GITHUB_PAGES=true npm run build` and deploy `dist/`.

## Working Rules

- Work on one feature at a time from `feature_list.json`.
- Keep changes scoped to the active feature and its tests/docs.
- Add or update tests for behavior changes in `src/utils` or reusable logic.
- Prefer static data regeneration with `npm run convert:data`; use live fetch only when refreshing source data or validating the API.
- Do not add backend, database, login, admin UI, or Google Maps dependencies.
- Before ending a session, update `progress.md`, `feature_list.json`, and `session-handoff.md`.

## Verification

Default local verification:

```bash
./init.sh
```

This runs install, conversion from checked-in raw data, tests, production build, GitHub Pages build, and audit.

Live data refresh verification:

```bash
npm run fetch:data
npm run convert:data
npm test
npm run build
```

Run the live refresh path when source data freshness is part of the task or before release/deployment if network is available.

## Definition of Done

A feature is done only when:

- Target behavior is implemented.
- Static data, PWA, deployment, and licensing constraints still hold.
- Required verification ran and evidence is recorded.
- `feature_list.json` and `progress.md` reflect the final status.
- Next session can restart from `./init.sh`.

## Escalation

Ask the user only for genuinely branching choices, destructive actions, new dependencies, or changes that would contradict the product constraints above.

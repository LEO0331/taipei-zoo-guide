import type { RiverfrontBirdObservation, RiverfrontReptileObservation } from '../models';
import { birdSummary } from './riverfrontBirdData';
import { reptileSummary } from './riverfrontReptileData';

type ComparisonRow = { label: string; birdSpecies: number; reptileSpecies: number };

function combineSpeciesCounts(
  birds: Array<{ label: string; species: number }>,
  reptiles: Array<{ label: string; species: number }>,
  sort: (left: string, right: string) => number,
): ComparisonRow[] {
  const rows = new Map<string, ComparisonRow>();
  for (const row of birds) rows.set(row.label, { label: row.label, birdSpecies: row.species, reptileSpecies: 0 });
  for (const row of reptiles) {
    const current = rows.get(row.label) ?? { label: row.label, birdSpecies: 0, reptileSpecies: 0 };
    current.reptileSpecies = row.species;
    rows.set(row.label, current);
  }
  return [...rows.values()].sort((left, right) => sort(left.label, right.label));
}

export function buildRiverfrontEcologyComparison(
  birds: RiverfrontBirdObservation[],
  reptiles: RiverfrontReptileObservation[],
) {
  const bird = birdSummary(birds);
  const reptile = reptileSummary(reptiles);
  return {
    birdSpecies: bird.species,
    reptileSpecies: reptile.species,
    byRegion: combineSpeciesCounts(bird.regions, reptile.regions, (left, right) => left.localeCompare(right, 'zh-Hant')),
    byMonth: combineSpeciesCounts(bird.months, reptile.months, (left, right) => Number(left) - Number(right)),
  };
}

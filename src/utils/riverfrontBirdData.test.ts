import { describe, expect, it } from 'vitest';
import type { RiverfrontBirdObservation } from '../models';
import { birdStatus, birdSummary } from './riverfrontBirdData';

const record = (overrides: Partial<RiverfrontBirdObservation> = {}): RiverfrontBirdObservation => ({
  id: '1', module: 'riverfront_bird_observations', familyName: '鵯科', scientificName: 'Pycnonotus sinensis', commonNameZh: '白頭翁',
  endemicRaw: '', endemicType: 'none', alienRaw: '', isAlienSpecies: false, statusRaw: '留、普', ...birdStatus('留、普'),
  year: 2014, month: 9, day: null, observationPeriod: '2014-09', datePrecision: 'month', regionRaw: '新店溪', region: '新店溪',
  xTwd97Raw: '303936', yTwd97Raw: '2766307', xTwd97: 303936, yTwd97: 2766307, longitude: 121.5, latitude: 25, hasValidCoordinates: true,
  observedCountRaw: '5', observedCount: 5, surveyorRaw: 'source', ...overrides,
});

describe('riverfront bird utilities', () => {
  it('parses source residency and abundance tags without treating them as conservation status', () => {
    expect(birdStatus('留、普/過、稀')).toEqual({ residencyTags: ['resident', 'passage_migrant'], abundanceStatusTags: ['common', 'rare'] });
    expect(birdStatus('留、不普')).toEqual({ residencyTags: ['resident'], abundanceStatusTags: ['uncommon'] });
  });

  it('keeps unique species, record count, and summed source quantities distinct', () => {
    const summary = birdSummary([record(), record({ id: '2', observedCount: 8 }), record({ id: '3', commonNameZh: '大卷尾', region: '淡水河', observedCount: 1 })]);
    expect(summary).toMatchObject({ records: 3, species: 2, individuals: 14 });
    expect(summary.regions.find((row) => row.label === '新店溪')).toMatchObject({ records: 2, species: 1, count: 13 });
  });
});

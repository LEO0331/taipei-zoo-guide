import { describe, expect, it } from 'vitest';
import type { RiverfrontBirdObservation, RiverfrontReptileObservation } from '../models';
import { buildRiverfrontEcologyComparison } from './riverfrontEcology';

const bird = (overrides: Partial<RiverfrontBirdObservation> = {}): RiverfrontBirdObservation => ({
  id: 'bird', module: 'riverfront_bird_observations', familyName: '鵯科', scientificName: 'Pycnonotus sinensis', commonNameZh: '白頭翁', endemicRaw: '', endemicType: 'none', alienRaw: '', isAlienSpecies: false, statusRaw: '', residencyTags: ['unknown'], abundanceStatusTags: ['unknown'], year: 2014, month: 5, day: null, observationPeriod: '2014-05', datePrecision: 'month', regionRaw: '新店溪', region: '新店溪', xTwd97Raw: '', yTwd97Raw: '', xTwd97: null, yTwd97: null, longitude: null, latitude: null, hasValidCoordinates: false, observedCountRaw: '', observedCount: null, surveyorRaw: '', ...overrides,
});
const reptile = (overrides: Partial<RiverfrontReptileObservation> = {}): RiverfrontReptileObservation => ({
  id: 'reptile', module: 'riverfront_reptile_observations', sourceSequenceNumber: '1', groupRaw: '爬蟲類', group: '爬蟲類', familyName: '蜥蜴科', scientificName: 'Japalura swinhonis', commonNameZh: '斯文豪氏攀蜥', endemicRaw: '', endemicType: 'none', alienRaw: '', isAlienSpecies: false, year: 2014, month: 5, day: null, timeRaw: '', observationTime: null, observationPeriod: '2014-05', datePrecision: 'month', regionRaw: '新店溪', region: '新店溪', xTwd97Raw: '', yTwd97Raw: '', xTwd97: null, yTwd97: null, longitude: null, latitude: null, hasValidCoordinates: false, observedCountRaw: '', observedCount: null, sourceRow: {}, ...overrides,
});

describe('buildRiverfrontEcologyComparison', () => {
  it('compares species counts by shared region and month without combining record volumes', () => {
    const result = buildRiverfrontEcologyComparison([bird(), bird({ id: 'bird-two', commonNameZh: '麻雀' })], [reptile()]);
    expect(result).toMatchObject({ birdSpecies: 2, reptileSpecies: 1 });
    expect(result.byRegion).toEqual([{ label: '新店溪', birdSpecies: 2, reptileSpecies: 1 }]);
    expect(result.byMonth).toEqual([{ label: '5', birdSpecies: 2, reptileSpecies: 1 }]);
  });
});

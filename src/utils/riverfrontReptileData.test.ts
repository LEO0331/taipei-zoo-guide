import { describe, expect, it } from 'vitest';
import type { RiverfrontReptileObservation } from '../models';
import { reptileSummary } from './riverfrontReptileData';

const record = (overrides: Partial<RiverfrontReptileObservation> = {}): RiverfrontReptileObservation => ({
  id: 'one', module: 'riverfront_reptile_observations', sourceSequenceNumber: '1', groupRaw: '爬蟲類', group: '爬蟲類', familyName: '飛蜥科', scientificName: 'Japalura swinhonis', commonNameZh: '斯文豪氏攀蜥', endemicRaw: '特有種', endemicType: 'endemic_species', alienRaw: '', isAlienSpecies: false, year: 2014, month: 5, day: 18, timeRaw: '1149', observationTime: '11:49', observationPeriod: '2014-05-18', datePrecision: 'day', regionRaw: '新店溪', region: '新店溪', xTwd97Raw: '303621', yTwd97Raw: '2766991', xTwd97: 303621, yTwd97: 2766991, longitude: 121.49, latitude: 25.09, hasValidCoordinates: true, observedCountRaw: '1', observedCount: 1, sourceRow: {}, ...overrides,
});

describe('riverfront reptile insights', () => {
  it('keeps records, species, and source-recorded individuals separate', () => {
    const summary = reptileSummary([record(), record({ id: 'two', observedCount: 3 }), record({ id: 'three', commonNameZh: '龜', familyName: '龜科', region: '淡水河', observedCount: 2 })]);
    expect(summary).toMatchObject({ records: 3, species: 2, families: 2, individuals: 6 });
    expect(summary.regions.find((row) => row.label === '新店溪')).toMatchObject({ records: 2, species: 1, count: 4 });
  });
});

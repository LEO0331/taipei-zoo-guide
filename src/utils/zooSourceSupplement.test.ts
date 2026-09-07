import { describe, expect, it } from 'vitest';
import { mergeAnimalEnglishSupplement, mergeDisplayAreaEnglishSupplement } from './zooSourceSupplement';

describe('official English supplements', () => {
  it('preserves the Chinese canonical animal record and rejects material coordinate moves', () => {
    const result = mergeAnimalEnglishSupplement([{ a_code: 'Panda', a_name_ch: '大貓熊', a_name_en: 'Giant Panda', a_name_latin: 'Ailuropoda melanoleuca', a_longitude: '121.58', a_latitude: '24.99', a_summary: 'Chinese detail' }], [{ A_Code: 'Panda', A_Name: 'Giant Panda', A_Name_Latin: 'Ailuropoda melanoleuca', A_Geo: 'MULTIPOINT ((121.59 25.00))' }]);
    expect(result.rows[0]).toMatchObject({ a_name_ch: '大貓熊', a_summary: 'Chinese detail', a_longitude: '121.58' });
    expect(result.report.coordinateReview).toEqual([{ code: 'Panda', distanceMeters: expect.any(Number) }]);
  });

  it('adds DisplayAreas English metadata without replacing the Chinese area name', () => {
    const result = mergeDisplayAreaEnglishSupplement([{ E_no: '1', E_Name: '臺灣動物區', E_Longitude: '121.5806', E_Latitude: '24.9986' }], [{ Code: '1', E_Name: 'Formosan Animal Area', E_Category: 'Outdoor', E_Info: 'English detail', E_Geo: 'MULTIPOINT ((121.58061 24.99861))' }]);
    expect(result.rows[0]).toMatchObject({ E_Name: '臺灣動物區', E_Name_En: 'Formosan Animal Area', E_Category_En: 'Outdoor' });
    expect(result.report.coordinatesRefined).toBe(1);
  });
});

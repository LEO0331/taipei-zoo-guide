import { describe, expect, it } from 'vitest';
import {
  buildZooAnimalSummary,
  calculateDistanceMeters,
  filterAnimals,
  formatDistance,
  normalizeConservationStatus,
  normalizeDiet,
  parseCoordinate,
  parseKeywords,
  parseMediaFields,
  normalizeAnimalRow,
  validateZooCoordinate,
} from './zooData';
import type { ZooAnimal } from '../models';

const panda: ZooAnimal = {
  id: 'a1',
  nameZh: '大貓熊',
  nameEn: 'Giant Panda',
  scientificName: 'Ailuropoda melanoleuca',
  alias: '貓熊',
  summary: '黑白相間的保育類動物。',
  keywords: ['哺乳類', '竹子'],
  longitude: 121.583,
  latitude: 24.998,
  coordinateStatus: 'valid',
  exhibitArea: '新光特展館',
  poiGroup: '溫帶動物區',
  taxonomy: { className: '哺乳綱', orderName: '食肉目', familyName: '熊科' },
  conservationStatus: '易危',
  habitat: '森林',
  diet: '草食',
  topicPageUrl: 'https://example.test/panda',
  isAdoptionFocusSpecies: true,
  media: [{ type: 'photo', url: 'https://example.test/panda.jpg', description: '照片' }],
  source: 'test',
};

const frog: ZooAnimal = {
  id: 'a2',
  nameZh: '樹蛙',
  summary: '夜間活動。',
  keywords: ['兩棲類'],
  coordinateStatus: 'missing',
  exhibitArea: '兩棲爬蟲動物館',
  taxonomy: { className: '兩棲綱', orderName: '無尾目', familyName: '樹蛙科' },
  conservationStatus: '暫無危機',
  diet: '肉食',
  isAdoptionFocusSpecies: false,
  media: [{ type: 'audio', url: 'https://example.test/frog.mp3' }],
  source: 'test',
};

describe('zoo data utilities', () => {
  it('parses coordinates and validates Taipei Zoo bounds without crashing on bad values', () => {
    expect(parseCoordinate('121.583')).toBe(121.583);
    expect(parseCoordinate('')).toBeUndefined();
    expect(parseCoordinate('not-a-number')).toBeUndefined();
    expect(validateZooCoordinate(121.583, 24.998)).toBe('valid');
    expect(validateZooCoordinate()).toBe('missing');
    expect(validateZooCoordinate(120, 24.998)).toBe('outlier');
  });

  it('splits keywords, normalizes controlled text, and extracts structured media fields', () => {
    expect(parseKeywords('哺乳類、竹子; 保育')).toEqual(['哺乳類', '竹子', '保育']);
    expect(normalizeDiet('  草食性  ')).toBe('草食性');
    expect(normalizeConservationStatus('')).toBe('未標示');
    expect(
      parseMediaFields({
        '照片說明1': '照片',
        '照片URL1': 'https://example.test/a.jpg',
        '聲音URL1': 'https://example.test/a.mp3',
        '影片URL': 'https://example.test/a.mp4',
        '主題網頁URL': 'https://example.test/topic',
      }),
    ).toEqual([
      { description: '照片', url: 'https://example.test/a.jpg', type: 'photo' },
      { url: 'https://example.test/a.mp3', type: 'audio' },
      { url: 'https://example.test/a.mp4', type: 'video' },
      { url: 'https://example.test/topic', type: 'webpage' },
    ]);
  });

  it('drops unsafe media URLs and recognizes live API adoption markers', () => {
    expect(
      parseMediaFields({
        a_pic01_alt: 'unsafe',
        a_pic01_url: 'javascript:alert(1)',
        a_pic02_alt: 'safe',
        a_pic02_url: 'https://example.test/safe.jpg',
      }),
    ).toEqual([{ description: 'safe', url: 'https://example.test/safe.jpg', type: 'photo' }]);

    const animal = normalizeAnimalRow(
      {
        a_name_ch: '測試物種',
        a_name_en: 'Test Species',
        a_name_latin: 'Species testus',
        a_location: '測試館',
        a_class: '測試綱',
        a_diet: '草食',
        a_longitude: '121.58',
        a_latitude: '24.99',
        a_adopt: '認養',
        a_theme_url: 'javascript:alert(1)',
      },
      0,
    );
    expect(animal.isAdoptionFocusSpecies).toBe(true);
    expect(animal.topicPageUrl).toBeUndefined();
    expect(animal).toMatchObject({
      nameZh: '測試物種',
      nameEn: 'Test Species',
      scientificName: 'Species testus',
      exhibitArea: '測試館',
      taxonomy: { className: '測試綱' },
      diet: '草食',
      coordinateStatus: 'valid',
    });
  });

  it('filters animals across names, taxonomy, location, diet, adoption, coordinate, and topic page fields', () => {
    const baseFilters = {
      search: 'panda',
      exhibitArea: '',
      poiGroup: '',
      conservationStatus: '',
      taxonomicClass: '',
      taxonomicOrder: '',
      taxonomicFamily: '',
      diet: '',
      adoptionFocusOnly: false,
      hasCoordinates: false,
      hasTopicPage: false,
    };
    expect(filterAnimals([panda, frog], baseFilters).map((animal) => animal.id)).toEqual(['a1']);
    expect(filterAnimals([panda, frog], { ...baseFilters, search: '', taxonomicClass: '兩棲綱' })).toEqual([frog]);
    expect(filterAnimals([panda, frog], { ...baseFilters, search: '', adoptionFocusOnly: true })).toEqual([panda]);
    expect(filterAnimals([panda, frog], { ...baseFilters, search: '', hasCoordinates: true })).toEqual([panda]);
    expect(filterAnimals([panda, frog], { ...baseFilters, search: '', hasTopicPage: true })).toEqual([panda]);
  });

  it('builds dashboard summaries and formats nearby distances', () => {
    const summary = buildZooAnimalSummary([panda, frog]);
    expect(summary.total).toBe(2);
    expect(summary.adoptionFocusSpeciesCount).toBe(1);
    expect(summary.withCoordinatesCount).toBe(1);
    expect(summary.withoutCoordinatesCount).toBe(1);
    expect(summary.withPhotoUrlCount).toBe(1);
    expect(summary.withAudioUrlCount).toBe(1);
    expect(calculateDistanceMeters(24.998, 121.583, 24.999, 121.584)).toBeGreaterThan(100);
    expect(formatDistance(350, 'zh')).toBe('350 公尺');
    expect(formatDistance(1350, 'en')).toBe('1.4 km');
  });
});

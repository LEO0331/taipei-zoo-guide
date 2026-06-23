import { describe, expect, it } from 'vitest';
import {
  buildZooGuideSummary,
  classifyExhibitAreaCategory,
  classifyZooEventCategory,
  decodeCsvBuffer,
  getZooEventStatus,
  matchEventToAnimals,
  matchEventToExhibitArea,
  normalizeExhibitAreaRow,
  normalizeZooEventRow,
  parseCsv,
  parseZooDate,
  parseZooWktCoordinate,
} from './zooGuideData';
import type { ZooAnimal, ZooEvent, ZooExhibitArea } from '../models';

describe('visitor guide data utilities', () => {
  it('decodes UTF-8 BOM and Big5 CSV input', () => {
    expect(decodeCsvBuffer(new TextEncoder().encode('\uFEFFD_Title\r\n活動\r\n'))).toMatchObject({
      encoding: 'utf-8-sig',
      text: 'D_Title\r\n活動\r\n',
    });
    expect(decodeCsvBuffer(Uint8Array.from([0x44, 0x5f, 0x54, 0x69, 0x74, 0x6c, 0x65, 0x0a, 0xa4, 0xa4, 0xa4, 0xe5]))).toMatchObject({
      encoding: 'big5',
      text: 'D_Title\n中文',
    });
  });

  it('parses quoted CSV fields and strips a UTF-8 BOM from headers', () => {
    expect(parseCsv('\uFEFFD_Title,D_Brief\r\n活動,"第一行\r\n第二行"\r\n')).toEqual([
      { D_Title: '活動', D_Brief: '第一行\r\n第二行' },
    ]);
  });

  it('normalizes supported dates and rejects impossible dates', () => {
    expect(parseZooDate('2026/5/20')).toBe('2026-05-20');
    expect(parseZooDate('2026-05-20')).toBe('2026-05-20');
    expect(parseZooDate('2026/02/30')).toBeUndefined();
    expect(parseZooDate('')).toBeUndefined();
  });

  it('parses POINT and MULTIPOINT coordinates and distinguishes failures', () => {
    expect(parseZooWktCoordinate('MULTIPOINT((121.5827058,24.9983016))')).toMatchObject({
      longitude: 121.5827058,
      latitude: 24.9983016,
      coordinateStatus: 'valid',
    });
    expect(parseZooWktCoordinate('POINT(121.5827058 24.9983016)')).toMatchObject({
      longitude: 121.5827058,
      latitude: 24.9983016,
      coordinateStatus: 'valid',
    });
    expect(parseZooWktCoordinate('POINT(120 24.99)').coordinateStatus).toBe('outlier');
    expect(parseZooWktCoordinate('not-wkt').coordinateStatus).toBe('unparsed');
    expect(parseZooWktCoordinate('').coordinateStatus).toBe('missing');
  });

  it('classifies area and event categories, including paused records', () => {
    expect(classifyExhibitAreaCategory('戶外區')).toBe('outdoor');
    expect(classifyExhibitAreaCategory('教育館區')).toBe('education');
    expect(classifyZooEventCategory('定時定點課程')).toBe('scheduled_course');
    expect(classifyZooEventCategory('保母講古暫停')).toBe('paused_or_cancelled');
  });

  it('computes status from the Asia/Taipei calendar date', () => {
    const event = {
      eventCategoryRaw: '保母講古',
      startDate: '2026-06-23',
      endDate: '2026-06-24',
    } as ZooEvent;
    expect(getZooEventStatus(event, new Date('2026-06-22T16:30:00.000Z'))).toBe('ongoing');
    expect(getZooEventStatus({ ...event, eventCategoryRaw: '保母講古暫停' }, new Date())).toBe(
      'cancelled_or_paused',
    );
  });

  it('normalizes exhibit and event rows while keeping media as references', () => {
    expect(
      normalizeExhibitAreaRow(
        {
          E_no: '1',
          E_Category: '戶外區',
          E_Name: '臺灣動物區',
          E_Pic_URL: 'http://example.test/area.jpg',
          E_Info: '介紹',
          E_Longitude: '121.5806',
          E_Latitude: '24.9986',
          E_URL: 'https://example.test/area',
        },
        0,
      ),
    ).toMatchObject({
      id: 'exhibit-area-1',
      module: 'exhibit_areas',
      sortOrder: 1,
      areaCategory: 'outdoor',
      areaName: '臺灣動物區',
      coordinateStatus: 'valid',
      imageUrl: 'http://example.test/area.jpg',
    });

    expect(
      normalizeZooEventRow(
        {
          D_Category: '保母講古',
          D_Title: '無尾熊的外觀',
          D_StartDate: '2026/5/20',
          D_EndDate: '2026/5/20',
          D_Time: '11:00-11:25',
          D_Location: '無尾熊館',
          D_Geo: 'MULTIPOINT((121.5827058,24.9983016))',
          D_Keywords: '無尾熊、保育',
          D_site_URL: 'https://example.test/event',
        },
        0,
        new Date('2026-05-19T04:00:00.000Z'),
      ),
    ).toMatchObject({
      id: 'event-2026-5-20-無尾熊的外觀',
      module: 'events',
      eventCategory: 'keeper_talk',
      title: '無尾熊的外觀',
      startDate: '2026-05-20',
      keywords: ['無尾熊', '保育'],
      coordinateStatus: 'valid',
      eventStatus: 'upcoming',
    });
  });

  it('creates only direct exhibit-area and animal links', () => {
    const areas = [
      {
        id: 'panda-area',
        module: 'exhibit_areas',
        areaCategory: 'indoor',
        areaName: '新光特展館（大貓熊館）',
        coordinateStatus: 'valid',
        source: 'test',
      },
      {
        id: 'frog-area',
        module: 'exhibit_areas',
        areaCategory: 'indoor',
        areaName: '兩棲爬蟲動物館',
        coordinateStatus: 'valid',
        source: 'test',
      },
    ] satisfies ZooExhibitArea[];
    const animals = [
      {
        id: 'panda',
        nameZh: '大貓熊',
        nameEn: 'Giant Panda',
        alias: '貓熊',
        keywords: [],
        coordinateStatus: 'valid',
        taxonomy: {},
        isAdoptionFocusSpecies: false,
        media: [],
        source: 'test',
      },
    ] satisfies ZooAnimal[];

    expect(matchEventToExhibitArea('大貓熊館入口', ['大貓熊'], areas)).toBe('panda-area');
    expect(matchEventToExhibitArea('入口廣場', ['雨林'], areas)).toBeUndefined();
    expect(matchEventToAnimals('大貓熊動物訓練', ['大貓熊'], '大貓熊館', [...animals, animals[0]])).toEqual(['panda']);
    expect(matchEventToAnimals('一般導覽', ['保育'], '入口廣場', animals)).toEqual([]);
  });

  it('builds combined summary counts', () => {
    const areas = [
      {
        id: 'area-1',
        module: 'exhibit_areas',
        areaCategory: 'outdoor',
        areaName: '臺灣動物區',
        coordinateStatus: 'valid',
        relatedAnimalIds: ['otter'],
        source: 'test',
      },
    ] satisfies ZooExhibitArea[];
    const events = [
      {
        id: 'event-1',
        module: 'events',
        eventCategory: 'keeper_talk',
        title: '水獺講古',
        coordinateStatus: 'valid',
        keywords: [],
        eventStatus: 'upcoming',
        locationName: '臺灣動物區',
        source: 'test',
      },
    ] satisfies ZooEvent[];
    const summary = buildZooGuideSummary([], areas, events);
    expect(summary).toMatchObject({
      animalCount: 0,
      exhibitAreaCount: 1,
      eventCount: 1,
      upcomingEventCount: 1,
    });
    expect(summary.exhibitAreasWithAnimalCount[0]).toMatchObject({ areaName: '臺灣動物區', animalCount: 1 });
  });
});

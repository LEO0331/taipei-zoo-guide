import type {
  CoordinateStatus,
  ExhibitAreaCategory,
  ZooAnimal,
  ZooEvent,
  ZooEventCategory,
  ZooEventStatus,
  ZooExhibitArea,
  ZooGuideSummary,
  ZooMediaReference,
  ZooPlantRecord,
  ZooPlantSummary,
} from '../models';
import { parseCoordinate, parseKeywords } from './zooData';

export const TAIPEI_ZOO_GUIDE_BOUNDS = {
  minLng: 121.57,
  maxLng: 121.6,
  minLat: 24.985,
  maxLat: 25.005,
};

const EXHIBIT_SOURCE = '臺北市立動物園_館區簡介';
const EVENT_SOURCE = '臺北市立動物園_行事曆';
const PLANT_SOURCE = '臺北市立動物園_植物資料';

const EXHIBIT_AREA_CATEGORY_MAP: Record<string, ExhibitAreaCategory> = {
  戶外區: 'outdoor',
  室內區: 'indoor',
  教育館區: 'education',
  特展: 'special_exhibition',
};

export const EXHIBIT_AREA_ALIASES: Record<string, string[]> = {
  '新光特展館（大貓熊館）': ['大貓熊館', '新光特展館'],
  '熱帶雨林室內館（穿山甲館）': ['穿山甲館', '熱帶雨林室內館'],
  兩棲爬蟲動物館: ['兩棲爬蟲館', '兩棲爬蟲動物館'],
  兒童動物區: ['兒童區', '兒童動物區'],
};

const ZOO_LOCATION_ALIASES: Record<string, string> = {
  兩棲爬蟲館: '兩棲爬蟲動物館',
  穿山甲館: '熱帶雨林室內館（穿山甲館）',
  大貓熊館: '新光特展館（大貓熊館）',
  '保育大道(主軸': '保育大道',
  門內外廣場: '大門內外廣場',
};

function cleanValue(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const value = String(raw).trim();
  return value && value.toLocaleLowerCase() !== 'nan' ? value : undefined;
}

function cleanUrl(raw: unknown): string | undefined {
  const value = cleanValue(raw);
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function slugId(prefix: string, raw: string | undefined, index: number): string {
  const value = raw?.trim().toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');
  return `${prefix}-${value || index + 1}`;
}

function coordinateStatus(longitude?: number, latitude?: number): CoordinateStatus {
  if (longitude === undefined || latitude === undefined) return 'missing';
  if (
    longitude < TAIPEI_ZOO_GUIDE_BOUNDS.minLng ||
    longitude > TAIPEI_ZOO_GUIDE_BOUNDS.maxLng ||
    latitude < TAIPEI_ZOO_GUIDE_BOUNDS.minLat ||
    latitude > TAIPEI_ZOO_GUIDE_BOUNDS.maxLat
  ) {
    return 'outlier';
  }
  return 'valid';
}

function parsePlantCoordinate(raw: unknown): { value?: number; unparsed: boolean } {
  const text = cleanValue(raw);
  if (!text) return { unparsed: false };
  const value = Number(text);
  return Number.isFinite(value) ? { value, unparsed: false } : { unparsed: true };
}

function plantCoordinateStatus(longitude: ReturnType<typeof parsePlantCoordinate>, latitude: ReturnType<typeof parsePlantCoordinate>) {
  if (longitude.unparsed || latitude.unparsed) return 'unparsed';
  return coordinateStatus(longitude.value, latitude.value);
}

export function decodeCsvBuffer(bytes: Uint8Array): { text: string; encoding: 'utf-8-sig' | 'utf-8' | 'big5' } {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8-sig' };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('big5').decode(bytes), encoding: 'big5' };
  }
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  const [rawHeaders = [], ...body] = rows;
  const headers = rawHeaders.map((header) => header.replace(/^\uFEFF/, '').trim());
  return body.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])),
  );
}

export function parseZooDate(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export const parseZooPlantDate = parseZooDate;

export function splitTextList(raw: string | undefined): string[] {
  return [...new Set((raw ?? '').split(/[、,，;；\n\r]+/g).map((item) => item.trim()).filter(Boolean))];
}

export function parseChineseLatinTaxonomy(raw: string | undefined): {
  raw?: string;
  chinese?: string;
  latin?: string;
} {
  const value = cleanValue(raw);
  if (!value) return {};
  const match = value.match(/^(.+?)\s*([A-Za-z][A-Za-z\s.-]*)$/);
  return match
    ? { raw: value, chinese: match[1].trim(), latin: match[2].trim() }
    : { raw: value, chinese: value };
}

export function parsePlantLocationAreas(raw: string | undefined): string[] {
  return splitTextList(raw).map((location) => ZOO_LOCATION_ALIASES[location] ?? location);
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s（）()_\-|.]/g, '');
}

function normalizeNumber(value?: number): string {
  return value === undefined ? 'missing' : value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

export function getPlantSpeciesKey(record: Pick<ZooPlantRecord, 'scientificName' | 'chineseName' | 'familyRaw'>): string {
  if (record.scientificName) return `latin:${normalizeText(record.scientificName)}`;
  return `zh:${normalizeText(record.chineseName)}|family:${normalizeText(record.familyRaw ?? '')}`;
}

function getPlantRecordId(rowIndex: number, record: Partial<ZooPlantRecord>): string {
  return [
    'plant',
    normalizeText(record.scientificName || record.chineseName || 'unknown'),
    normalizeNumber(record.longitude),
    normalizeNumber(record.latitude),
    rowIndex,
  ].join('|');
}

function mediaReference(kind: ZooMediaReference['kind'], alt: unknown, url: unknown): ZooMediaReference | undefined {
  const safeUrl = cleanUrl(url);
  const safeAlt = cleanValue(alt);
  if (!safeUrl && !safeAlt) return undefined;
  return {
    kind,
    ...(safeAlt ? { alt: safeAlt } : {}),
    ...(safeUrl ? { url: safeUrl } : {}),
    licenseScope: 'source_reference_only',
  };
}

function plantMediaReferences(row: Record<string, unknown>): ZooMediaReference[] {
  return [
    mediaReference('image', row.F_Pic01_ALT, row.F_Pic01_URL),
    mediaReference('image', row.F_Pic02_ALT, row.F_Pic02_URL),
    mediaReference('image', row.F_Pic03_ALT, row.F_Pic03_URL),
    mediaReference('image', row.F_Pic04_ALT, row.F_Pic04_URL),
    mediaReference('pdf', row.F_pdf01_ALT, row.F_pdf01_URL),
    mediaReference('pdf', row.F_pdf02_ALT, row.F_pdf02_URL),
    mediaReference('audio', row.F_Voice01_ALT, row.F_Voice01_URL),
    mediaReference('audio', row.F_Voice02_ALT, row.F_Voice02_URL),
    mediaReference('audio', row.F_Voice03_ALT, row.F_Voice03_URL),
    mediaReference('video', undefined, row.F_Vedio_URL),
  ].filter((item): item is ZooMediaReference => Boolean(item));
}

export function parseZooWktCoordinate(raw: string | undefined): {
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  warning?: string;
} {
  const value = raw?.trim();
  if (!value) return { coordinateStatus: 'missing' };
  const match =
    value.match(/^MULTIPOINT\s*\(\s*\(\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*\)\s*\)$/i) ??
    value.match(/^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i);
  if (!match) return { coordinateStatus: 'unparsed', warning: `Unparsed WKT: ${value}` };
  const longitude = Number(match[1]);
  const latitude = Number(match[2]);
  const status = coordinateStatus(longitude, latitude);
  return {
    longitude,
    latitude,
    coordinateStatus: status,
    ...(status === 'outlier' ? { warning: `Outlier coordinate: ${longitude},${latitude}` } : {}),
  };
}

export function classifyExhibitAreaCategory(raw: string | undefined): ExhibitAreaCategory {
  const value = raw?.trim();
  if (!value) return 'unknown';
  return EXHIBIT_AREA_CATEGORY_MAP[value] ?? 'other';
}

export function classifyZooEventCategory(raw: string | undefined): ZooEventCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('暫停')) return 'paused_or_cancelled';
  if (text.includes('定時定點課程')) return 'scheduled_course';
  if (text.includes('保母講古')) return 'keeper_talk';
  if (text.includes('教育駐站')) return 'education_station';
  if (text.includes('特展')) return 'special_exhibition';
  return 'other';
}

function taipeiDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getZooEventStatus(event: Pick<ZooEvent, 'eventCategoryRaw' | 'startDate' | 'endDate'>, now = new Date()): ZooEventStatus {
  if (event.eventCategoryRaw?.includes('暫停')) return 'cancelled_or_paused';
  if (!event.startDate || !event.endDate) return 'unknown';
  const today = taipeiDate(now);
  if (today < event.startDate) return 'upcoming';
  if (today > event.endDate) return 'past';
  return 'ongoing';
}

export function normalizeExhibitAreaRow(row: Record<string, unknown>, index: number): ZooExhibitArea {
  const sortOrder = parseCoordinate(row.E_no);
  const areaCategoryRaw = cleanValue(row.E_Category);
  const areaName = cleanValue(row.E_Name) ?? `未命名館區 ${index + 1}`;
  const longitude = parseCoordinate(row.E_Longitude);
  const latitude = parseCoordinate(row.E_Latitude);
  return {
    id: slugId('exhibit-area', cleanValue(row.E_no), index),
    module: 'exhibit_areas',
    ...(sortOrder !== undefined ? { sortOrder } : {}),
    ...(areaCategoryRaw ? { areaCategoryRaw } : {}),
    areaCategory: classifyExhibitAreaCategory(areaCategoryRaw),
    areaName,
    ...(cleanValue(row.E_Info) ? { description: cleanValue(row.E_Info) } : {}),
    ...(cleanValue(row.E_Memo) ? { memo: cleanValue(row.E_Memo) } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    coordinateStatus: coordinateStatus(longitude, latitude),
    ...(cleanUrl(row.E_URL) ? { officialUrl: cleanUrl(row.E_URL) } : {}),
    ...(cleanUrl(row.E_Pic_URL) ? { imageUrl: cleanUrl(row.E_Pic_URL) } : {}),
    source: EXHIBIT_SOURCE,
  };
}

export function normalizeZooEventRow(row: Record<string, unknown>, index: number, now = new Date()): ZooEvent {
  const eventCategoryRaw = cleanValue(row.D_Category);
  const title = cleanValue(row.D_Title) ?? `未命名活動 ${index + 1}`;
  const startDateRaw = cleanValue(row.D_StartDate);
  const endDateRaw = cleanValue(row.D_EndDate);
  const publishedDateRaw = cleanValue(row.D_AddDate);
  const removedDateRaw = cleanValue(row.D_RemoveDate);
  const keywordsRaw = cleanValue(row.D_Keywords);
  const geoWkt = cleanValue(row.D_Geo);
  const parsedCoordinate = parseZooWktCoordinate(geoWkt);
  const event: ZooEvent = {
    id: slugId('event', `${startDateRaw ?? ''}-${title}`, index),
    module: 'events',
    ...(eventCategoryRaw ? { eventCategoryRaw } : {}),
    eventCategory: classifyZooEventCategory(eventCategoryRaw),
    title,
    ...(cleanValue(row.D_Summary) ? { summary: cleanValue(row.D_Summary) } : {}),
    ...(cleanValue(row.D_Brief) ? { brief: cleanValue(row.D_Brief) } : {}),
    ...(startDateRaw ? { startDateRaw } : {}),
    ...(parseZooDate(startDateRaw) ? { startDate: parseZooDate(startDateRaw) } : {}),
    ...(endDateRaw ? { endDateRaw } : {}),
    ...(parseZooDate(endDateRaw) ? { endDate: parseZooDate(endDateRaw) } : {}),
    ...(cleanValue(row.D_Time) ? { timeText: cleanValue(row.D_Time) } : {}),
    ...(cleanValue(row.D_Location) ? { locationName: cleanValue(row.D_Location) } : {}),
    ...(cleanValue(row.D_Address) ? { address: cleanValue(row.D_Address) } : {}),
    ...(cleanValue(row.D_Site) ? { siteName: cleanValue(row.D_Site) } : {}),
    ...(geoWkt ? { geoWkt } : {}),
    ...(parsedCoordinate.longitude !== undefined ? { longitude: parsedCoordinate.longitude } : {}),
    ...(parsedCoordinate.latitude !== undefined ? { latitude: parsedCoordinate.latitude } : {}),
    coordinateStatus: parsedCoordinate.coordinateStatus,
    ...(publishedDateRaw ? { publishedDateRaw } : {}),
    ...(parseZooDate(publishedDateRaw) ? { publishedDate: parseZooDate(publishedDateRaw) } : {}),
    ...(removedDateRaw ? { removedDateRaw } : {}),
    ...(parseZooDate(removedDateRaw) ? { removedDate: parseZooDate(removedDateRaw) } : {}),
    ...(keywordsRaw ? { keywordsRaw } : {}),
    keywords: parseKeywords(keywordsRaw ?? ''),
    ...(cleanValue(row.D_Pic_Alt) ? { imageAlt: cleanValue(row.D_Pic_Alt) } : {}),
    ...(cleanUrl(row.D_Pic_URL) ? { imageUrl: cleanUrl(row.D_Pic_URL) } : {}),
    ...(cleanUrl(row.D_site_URL) ? { officialUrl: cleanUrl(row.D_site_URL) } : {}),
    eventStatus: 'unknown',
    source: EVENT_SOURCE,
  };
  event.eventStatus = getZooEventStatus(event, now);
  return event;
}

export function normalizePlantRow(row: Record<string, unknown>, index: number): ZooPlantRecord {
  const longitude = parsePlantCoordinate(row.F_Longitude);
  const latitude = parsePlantCoordinate(row.F_Latitude);
  const family = parseChineseLatinTaxonomy(cleanValue(row.F_Family));
  const genus = parseChineseLatinTaxonomy(cleanValue(row.F_Genus));
  const keywordsRaw = cleanValue(row.F_Keywords);
  const alsoKnownRaw = cleanValue(row.F_AlsoKnown);
  const locationRaw = cleanValue(row.F_Location);
  const updatedDateRaw = cleanValue(row.F_Update);
  const partial: Partial<ZooPlantRecord> = {
    chineseName: cleanValue(row.F_Name_Ch),
    scientificName: cleanValue(row.F_Name_Latin),
    longitude: longitude.value,
    latitude: latitude.value,
  };
  const record: ZooPlantRecord = {
    id: getPlantRecordId(index, partial),
    module: 'plants',
    chineseName: cleanValue(row.F_Name_Ch) ?? `未命名植物 ${index + 1}`,
    ...(cleanValue(row.F_Name_En) ? { englishName: cleanValue(row.F_Name_En) } : {}),
    ...(cleanValue(row.F_Name_Latin) ? { scientificName: cleanValue(row.F_Name_Latin) } : {}),
    ...(cleanValue(row.F_Summary) ? { summary: cleanValue(row.F_Summary) } : {}),
    ...(keywordsRaw ? { keywordsRaw } : {}),
    keywords: splitTextList(keywordsRaw),
    ...(alsoKnownRaw ? { alsoKnownRaw } : {}),
    alsoKnown: splitTextList(alsoKnownRaw),
    ...(longitude.value !== undefined ? { longitude: longitude.value } : {}),
    ...(latitude.value !== undefined ? { latitude: latitude.value } : {}),
    coordinateStatus: plantCoordinateStatus(longitude, latitude),
    ...(locationRaw ? { locationRaw } : {}),
    locationAreas: parsePlantLocationAreas(locationRaw),
    ...(family.raw ? { familyRaw: family.raw } : {}),
    ...(family.chinese ? { familyChinese: family.chinese } : {}),
    ...(family.latin ? { familyLatin: family.latin } : {}),
    ...(genus.raw ? { genusRaw: genus.raw } : {}),
    ...(genus.chinese ? { genusChinese: genus.chinese } : {}),
    ...(genus.latin ? { genusLatin: genus.latin } : {}),
    ...(cleanValue(row.F_Brief) ? { brief: cleanValue(row.F_Brief) } : {}),
    ...(cleanValue(row.F_Feature) ? { features: cleanValue(row.F_Feature) } : {}),
    ...(cleanValue(row['F_Function&Application']) ? { functionAndApplication: cleanValue(row['F_Function&Application']) } : {}),
    ...(cleanValue(row.F_Code) ? { plantCode: cleanValue(row.F_Code) } : {}),
    ...(cleanValue(row.F_CID) ? { sourceContentId: cleanValue(row.F_CID) } : {}),
    ...(updatedDateRaw ? { updatedDateRaw } : {}),
    ...(parseZooPlantDate(updatedDateRaw) ? { updatedDate: parseZooPlantDate(updatedDateRaw) } : {}),
    mediaReferences: plantMediaReferences(row),
    source: PLANT_SOURCE,
  };
  return { ...record, id: getPlantRecordId(index, record) };
}

function normalizeMatchText(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s（）()_\-]/g, '');
}

function areaNames(area: ZooExhibitArea): string[] {
  return [area.areaName, ...(EXHIBIT_AREA_ALIASES[area.areaName] ?? [])];
}

export function matchPlantToExhibitAreas(plant: ZooPlantRecord, areas: ZooExhibitArea[]): string[] {
  const locations = plant.locationAreas.map(normalizeMatchText);
  return areas
    .filter((area) => areaNames(area).some((name) => locations.includes(normalizeMatchText(name))))
    .map((area) => area.id);
}

export function matchAnimalsToExhibitArea(area: ZooExhibitArea, animals: ZooAnimal[]): string[] {
  const names = areaNames(area).map(normalizeMatchText);
  return [
    ...new Set(
      animals
        .filter((animal) =>
          [animal.exhibitArea, animal.poiGroup].some(
            (value) => value && names.some((name) => normalizeMatchText(value) === name),
          ),
        )
        .map((animal) => animal.id),
    ),
  ];
}

export function matchEventToExhibitArea(
  locationName: string | undefined,
  keywords: string[],
  areas: ZooExhibitArea[],
): string | undefined {
  const haystack = normalizeMatchText([locationName, ...keywords].filter(Boolean).join(' '));
  if (!haystack) return undefined;
  const matches = areas.filter((area) =>
    areaNames(area).some((name) => {
      const normalized = normalizeMatchText(name);
      return normalized.length >= 3 && haystack.includes(normalized);
    }),
  );
  return matches.length === 1 ? matches[0].id : undefined;
}

export function matchEventToAnimals(
  title: string,
  keywords: string[],
  locationName: string | undefined,
  animals: ZooAnimal[],
): string[] {
  const haystack = normalizeMatchText([title, locationName, ...keywords].filter(Boolean).join(' '));
  return [
    ...new Set(
      animals
        .filter((animal) =>
          [animal.nameZh, animal.nameEn, animal.alias, ...animal.keywords].some((name) => {
            if (!name) return false;
            const normalized = normalizeMatchText(name);
            return normalized.length >= 2 && haystack.includes(normalized);
          }),
        )
        .map((animal) => animal.id),
    ),
  ];
}

function countBy<T extends string>(values: T[]): Array<[T, number]> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'));
}

function uniquePlantCount(records: ZooPlantRecord[]) {
  return new Set(records.map(getPlantSpeciesKey)).size;
}

function plantRowsBy<T extends string>(
  plants: ZooPlantRecord[],
  values: (plant: ZooPlantRecord) => T[],
): Array<[T, ZooPlantRecord[]]> {
  const groups = new Map<T, ZooPlantRecord[]>();
  for (const plant of plants) {
    for (const value of values(plant)) groups.set(value, [...(groups.get(value) ?? []), plant]);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-Hant'));
}

export function buildZooPlantSummary(plants: ZooPlantRecord[]): ZooPlantSummary {
  const speciesGroups = plantRowsBy(plants, (plant) => [getPlantSpeciesKey(plant)]);
  const species = speciesGroups.map(([speciesKey, records]) => {
    const first = records[0];
    const dates = records.map((record) => record.updatedDate).filter((date): date is string => Boolean(date)).sort();
    return {
      speciesKey,
      chineseName: first.chineseName,
      ...(first.englishName ? { englishName: first.englishName } : {}),
      ...(first.scientificName ? { scientificName: first.scientificName } : {}),
      recordCount: records.length,
      coordinateCount: records.filter((record) => record.coordinateStatus === 'valid').length,
      ...(first.familyRaw ? { familyRaw: first.familyRaw } : {}),
      ...(first.familyChinese ? { familyChinese: first.familyChinese } : {}),
      ...(first.familyLatin ? { familyLatin: first.familyLatin } : {}),
      ...(first.genusRaw ? { genusRaw: first.genusRaw } : {}),
      ...(first.genusChinese ? { genusChinese: first.genusChinese } : {}),
      ...(first.genusLatin ? { genusLatin: first.genusLatin } : {}),
      locationAreas: [...new Set(records.flatMap((record) => record.locationAreas))].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
      alsoKnown: [...new Set(records.flatMap((record) => record.alsoKnown))].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
      ...(dates.at(-1) ? { latestUpdatedDate: dates.at(-1) } : {}),
    };
  });
  const byFamily = plantRowsBy(plants, (plant) => (plant.familyRaw ? [plant.familyRaw] : []));
  const byGenus = plantRowsBy(plants, (plant) => (plant.genusRaw ? [plant.genusRaw] : []));
  const byLocationArea = plantRowsBy(plants, (plant) => plant.locationAreas);
  return {
    totalPlantRecords: plants.length,
    uniqueChineseNameCount: new Set(plants.map((plant) => plant.chineseName).filter(Boolean)).size,
    uniqueScientificNameCount: new Set(plants.map((plant) => plant.scientificName).filter(Boolean)).size,
    validCoordinateCount: plants.filter((plant) => plant.coordinateStatus === 'valid').length,
    outlierCoordinateCount: plants.filter((plant) => plant.coordinateStatus === 'outlier').length,
    missingCoordinateCount: plants.filter((plant) => plant.coordinateStatus === 'missing').length,
    familyCount: new Set(plants.map((plant) => plant.familyRaw).filter(Boolean)).size,
    genusCount: new Set(plants.map((plant) => plant.genusRaw).filter(Boolean)).size,
    locationAreaCount: new Set(plants.flatMap((plant) => plant.locationAreas)).size,
    recordsWithEnglishName: plants.filter((plant) => plant.englishName).length,
    recordsWithScientificName: plants.filter((plant) => plant.scientificName).length,
    recordsWithBrief: plants.filter((plant) => plant.brief).length,
    recordsWithFeatures: plants.filter((plant) => plant.features).length,
    recordsWithFunctionAndApplication: plants.filter((plant) => plant.functionAndApplication).length,
    recordsWithMediaUrl: plants.filter((plant) => plant.mediaReferences.some((media) => media.url)).length,
    byFamily: byFamily.map(([familyRaw, records]) => ({
      familyRaw,
      familyChinese: records[0].familyChinese,
      familyLatin: records[0].familyLatin,
      recordCount: records.length,
      uniquePlantCount: uniquePlantCount(records),
    })),
    byGenus: byGenus.map(([genusRaw, records]) => ({
      genusRaw,
      genusChinese: records[0].genusChinese,
      genusLatin: records[0].genusLatin,
      recordCount: records.length,
      uniquePlantCount: uniquePlantCount(records),
    })),
    byLocationArea: byLocationArea.map(([locationArea, records]) => ({
      locationArea,
      recordCount: records.length,
      uniquePlantCount: uniquePlantCount(records),
    })),
    species,
  };
}

export function buildZooGuideSummary(
  animals: ZooAnimal[],
  exhibitAreas: ZooExhibitArea[],
  events: ZooEvent[],
  plants: ZooPlantRecord[] = [],
): ZooGuideSummary {
  const dates = events.flatMap((event) => [event.startDate, event.endDate]).filter((date): date is string => Boolean(date));
  const plantSummary = buildZooPlantSummary(plants);
  return {
    animalCount: animals.length,
    plantRecordCount: plants.length,
    uniquePlantNameCount: plantSummary.uniqueChineseNameCount,
    uniqueScientificNameCount: plantSummary.uniqueScientificNameCount,
    plantFamilyCount: plantSummary.familyCount,
    plantGenusCount: plantSummary.genusCount,
    plantLocationAreaCount: plantSummary.locationAreaCount,
    exhibitAreaCount: exhibitAreas.length,
    exhibitAreaCategoryCount: new Set(exhibitAreas.map((area) => area.areaCategory)).size,
    eventCount: events.length,
    upcomingEventCount: events.filter((event) => event.eventStatus === 'upcoming').length,
    ongoingEventCount: events.filter((event) => event.eventStatus === 'ongoing').length,
    pastEventCount: events.filter((event) => event.eventStatus === 'past').length,
    pausedOrCancelledEventCount: events.filter((event) => event.eventStatus === 'cancelled_or_paused').length,
    ...(dates.length ? { eventDateMin: [...dates].sort()[0], eventDateMax: [...dates].sort().at(-1) } : {}),
    byExhibitAreaCategory: countBy(exhibitAreas.map((area) => area.areaCategory)).map(([areaCategory, count]) => ({
      areaCategory,
      areaCategoryRaw: exhibitAreas.find((area) => area.areaCategory === areaCategory)?.areaCategoryRaw,
      count,
    })),
    byEventCategory: countBy(events.map((event) => event.eventCategory)).map(([eventCategory, count]) => ({
      eventCategory,
      eventCategoryRaw: events.find((event) => event.eventCategory === eventCategory)?.eventCategoryRaw,
      count,
    })),
    byEventStatus: countBy(events.map((event) => event.eventStatus)).map(([eventStatus, count]) => ({
      eventStatus,
      count,
    })),
    byEventMonth: countBy(
      events.map((event) => event.startDate?.slice(0, 7)).filter((month): month is string => Boolean(month)),
    ).map(([month, count]) => ({ month, count })),
    byEventLocation: countBy(
      events.map((event) => event.locationName).filter((location): location is string => Boolean(location)),
    ).map(([locationName, count]) => ({ locationName, count })),
    exhibitAreasWithAnimalCount: exhibitAreas
      .map((area) => ({
        exhibitAreaId: area.id,
        areaName: area.areaName,
        animalCount: area.relatedAnimalIds?.length ?? 0,
      }))
      .sort((a, b) => b.animalCount - a.animalCount || a.areaName.localeCompare(b.areaName, 'zh-Hant')),
  };
}

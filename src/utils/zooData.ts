import type { Filters, Language, ZooAnimal, ZooAnimalSummary, ZooMediaItem } from '../models';

export const TAIPEI_ZOO_BOUNDS = {
  minLng: 121.55,
  maxLng: 121.6,
  minLat: 24.98,
  maxLat: 25.01,
};

const SOURCE_DATASET = '臺北市立動物園_動物資料';

export function normalizeColumnName(raw: string): string {
  return raw.trim().replace(/\s+/g, '').replace(/　/g, '');
}

export function parseCoordinate(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const text = String(raw).trim();
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

export function validateZooCoordinate(longitude?: number, latitude?: number) {
  if (longitude === undefined || latitude === undefined) return 'missing';
  if (
    longitude < TAIPEI_ZOO_BOUNDS.minLng ||
    longitude > TAIPEI_ZOO_BOUNDS.maxLng ||
    latitude < TAIPEI_ZOO_BOUNDS.minLat ||
    latitude > TAIPEI_ZOO_BOUNDS.maxLat
  ) {
    return 'outlier';
  }
  return 'valid';
}

export function parseKeywords(raw = ''): string[] {
  return raw
    .split(/[、,;；\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeConservationStatus(raw = ''): string {
  return raw.trim() || '未標示';
}

export function normalizeDiet(raw = ''): string {
  return raw.trim() || '未標示';
}

function cleanValue(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  const value = String(raw).trim();
  return value === '' ? undefined : value;
}

function cleanUrl(raw: unknown): string | undefined {
  const value = cleanValue(raw);
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function firstValue(row: Record<string, unknown>, keys: string[]): string | undefined {
  return keys.map((key) => cleanValue(row[key])).find(Boolean);
}

function firstUrl(row: Record<string, unknown>, keys: string[]): string | undefined {
  return keys.map((key) => cleanUrl(row[key])).find(Boolean);
}

function addMedia(
  media: ZooMediaItem[],
  row: Record<string, unknown>,
  urlKeys: string[],
  type: ZooMediaItem['type'],
  descriptionKeys: string[] = [],
) {
  for (const urlKey of urlKeys) {
    const url = cleanUrl(row[urlKey]);
    if (!url) continue;
    const suffix = urlKey.match(/\d+$/)?.[0] ?? '';
    const pairedAltKey = /_url$/i.test(urlKey) ? urlKey.replace(/_url$/i, '_alt') : undefined;
    const description =
      (pairedAltKey ? cleanValue(row[pairedAltKey]) : undefined) ??
      descriptionKeys.map((key) => cleanValue(row[`${key}${suffix}`]) ?? cleanValue(row[key])).find(Boolean) ??
      undefined;
    media.push({ ...(description ? { description } : {}), url, type });
  }
}

export function parseMediaFields(row: Record<string, unknown>): ZooMediaItem[] {
  const media: ZooMediaItem[] = [];
  addMedia(
    media,
    row,
    [
      '照片URL1',
      '照片URL2',
      '照片URL3',
      '照片URL4',
      '圖片URL1',
      '圖片URL2',
      '圖片URL3',
      '圖片URL4',
      'a_pic01_url',
      'a_pic02_url',
      'a_pic03_url',
      'a_pic04_url',
    ],
    'photo',
    ['照片說明', '圖片說明', 'a_pic01_alt', 'a_pic02_alt', 'a_pic03_alt', 'a_pic04_alt'],
  );
  addMedia(media, row, ['PDFURL1', 'PDFURL2', 'PDF_URL1', 'PDF_URL2', 'a_pdf01_url', 'a_pdf02_url'], 'pdf', [
    'PDF說明',
    'a_pdf01_alt',
    'a_pdf02_alt',
  ]);
  addMedia(
    media,
    row,
    ['聲音URL1', '聲音URL2', '聲音URL3', '音檔URL1', '音檔URL2', '音檔URL3', 'a_voice01_url', 'a_voice02_url', 'a_voice03_url'],
    'audio',
    ['聲音說明', '音檔說明', 'a_voice01_alt', 'a_voice02_alt', 'a_voice03_alt'],
  );
  addMedia(media, row, ['影片URL', 'a_vedio_url', 'a_video_url'], 'video', ['影片說明']);
  addMedia(media, row, ['主題網頁URL', 'a_theme_url'], 'webpage', ['主題網頁', 'a_theme_name']);
  return media.filter((item, index, all) => all.findIndex((candidate) => candidate.url === item.url) === index);
}

export function getOfficialTopicPageUrl(animal: ZooAnimal): string | undefined {
  return animal.topicPageUrl || animal.media.find((item) => item.type === 'webpage')?.url;
}

export function calculateDistanceMeters(
  userLat: number,
  userLng: number,
  animalLat: number,
  animalLng: number,
): number {
  const radius = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRad(animalLat - userLat);
  const lngDelta = toRad(animalLng - userLng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(animalLat)) * Math.sin(lngDelta / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistance(distanceMeters: number, language: Language): string {
  if (distanceMeters < 1000) {
    return language === 'zh' ? `${Math.round(distanceMeters)} 公尺` : `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function includesText(value: unknown, query: string): boolean {
  return String(value ?? '').toLocaleLowerCase().includes(query);
}

export function filterAnimals(animals: ZooAnimal[], filters: Filters): ZooAnimal[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return animals.filter((animal) => {
    const searchable = [
      animal.nameZh,
      animal.nameEn,
      animal.scientificName,
      animal.alias,
      animal.summary,
      animal.exhibitArea,
      animal.poiGroup,
      animal.conservationStatus,
      animal.habitat,
      animal.diet,
      animal.keywords.join(' '),
    ];
    if (query && !searchable.some((value) => includesText(value, query))) return false;
    if (filters.exhibitArea && animal.exhibitArea !== filters.exhibitArea) return false;
    if (filters.poiGroup && animal.poiGroup !== filters.poiGroup) return false;
    if (filters.conservationStatus && animal.conservationStatus !== filters.conservationStatus) return false;
    if (filters.taxonomicClass && animal.taxonomy.className !== filters.taxonomicClass) return false;
    if (filters.taxonomicOrder && animal.taxonomy.orderName !== filters.taxonomicOrder) return false;
    if (filters.taxonomicFamily && animal.taxonomy.familyName !== filters.taxonomicFamily) return false;
    if (filters.diet && animal.diet !== filters.diet) return false;
    if (filters.adoptionFocusOnly && !animal.isAdoptionFocusSpecies) return false;
    if (filters.hasCoordinates && animal.coordinateStatus !== 'valid') return false;
    if (filters.hasTopicPage && !getOfficialTopicPageUrl(animal)) return false;
    return true;
  });
}

function countBy<T extends string>(
  animals: ZooAnimal[],
  pick: (animal: ZooAnimal) => string | undefined,
  key: T,
): Array<Record<T, string> & { count: number }> {
  const counts = new Map<string, number>();
  for (const animal of animals) {
    const label = pick(animal)?.trim() || '未標示';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'))
    .map(([label, count]) => ({ [key]: label, count }) as Record<T, string> & { count: number });
}

export function buildZooAnimalSummary(animals: ZooAnimal[]): ZooAnimalSummary {
  return {
    total: animals.length,
    byExhibitArea: countBy(animals, (animal) => animal.exhibitArea, 'exhibitArea'),
    byPoiGroup: countBy(animals, (animal) => animal.poiGroup, 'poiGroup'),
    byConservationStatus: countBy(animals, (animal) => animal.conservationStatus, 'conservationStatus'),
    byTaxonomicClass: countBy(animals, (animal) => animal.taxonomy.className, 'className'),
    byDiet: countBy(animals, (animal) => animal.diet, 'diet'),
    adoptionFocusSpeciesCount: animals.filter((animal) => animal.isAdoptionFocusSpecies).length,
    withCoordinatesCount: animals.filter((animal) => animal.coordinateStatus === 'valid').length,
    withoutCoordinatesCount: animals.filter((animal) => animal.coordinateStatus !== 'valid').length,
    withEnglishNameCount: animals.filter((animal) => animal.nameEn).length,
    withTopicPageCount: animals.filter((animal) => getOfficialTopicPageUrl(animal)).length,
    withPhotoUrlCount: animals.filter((animal) => animal.media.some((item) => item.type === 'photo')).length,
    withAudioUrlCount: animals.filter((animal) => animal.media.some((item) => item.type === 'audio')).length,
    withVideoUrlCount: animals.filter((animal) => animal.media.some((item) => item.type === 'video')).length,
  };
}

export function normalizeAnimalRow(row: Record<string, unknown>, fallbackIndex: number): ZooAnimal {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeColumnName(key), value]));
  const longitude = parseCoordinate(firstValue(normalized, ['經度', 'a_longitude']));
  const latitude = parseCoordinate(firstValue(normalized, ['緯度', 'a_latitude']));
  const code = firstValue(normalized, ['編號代號', 'a_code']);
  const sequenceNumber = firstValue(normalized, ['序號', 'a_cid', '_id']);
  const nameZh = firstValue(normalized, ['中文名', 'a_name_ch']) ?? `未命名動物 ${fallbackIndex + 1}`;
  const topicPageUrl = firstUrl(normalized, ['主題網頁URL', 'a_theme_url']);
  const media = parseMediaFields(normalized);
  const id = code ?? sequenceNumber ?? nameZh.toLocaleLowerCase().replace(/\s+/g, '-');
  const nameEn = firstValue(normalized, ['英文名', 'a_name_en']);
  const scientificName = firstValue(normalized, ['學名', 'a_name_latin']);
  const alias = firstValue(normalized, ['別名', 'a_alsoknown']);
  const summary = firstValue(normalized, ['摘要說明', 'a_summary']);
  const exhibitArea = firstValue(normalized, ['館區', 'a_location']);
  const poiGroup = firstValue(normalized, ['POI群組', 'a_poigroup']);
  const kingdomOrPhylum = firstValue(normalized, ['分類學_門', 'a_phylum']);
  const className = firstValue(normalized, ['分類學_綱', 'a_class']);
  const orderName = firstValue(normalized, ['分類學_目', 'a_order']);
  const familyName = firstValue(normalized, ['分類學_科', 'a_family']);
  const geographicDistribution = firstValue(normalized, ['地理分布', 'a_distribution']);
  const habitat = firstValue(normalized, ['棲地型態', 'a_habitat']);
  const morphology = firstValue(normalized, ['形態特徵', 'a_feature']);
  const behavior = firstValue(normalized, ['生態習性', 'a_behavior']);
  const threats = firstValue(normalized, ['面臨問題', 'a_crisis']);
  const interpretation = firstValue(normalized, ['解說', 'a_interpretation']);
  const topicPageTitle = firstValue(normalized, ['主題網頁', 'a_theme_name']);
  const dataUpdatedAt = firstValue(normalized, ['資料更新日期', 'a_update']);
  const adoptionMarker = firstValue(normalized, ['動物認養焦點物種', 'a_adopt']) ?? '';

  return {
    id,
    ...(sequenceNumber ? { sequenceNumber } : {}),
    ...(code ? { code } : {}),
    nameZh,
    ...(nameEn ? { nameEn } : {}),
    ...(scientificName ? { scientificName } : {}),
    ...(alias ? { alias } : {}),
    ...(summary ? { summary } : {}),
    keywords: parseKeywords(firstValue(normalized, ['關鍵字', 'a_keywords']) ?? ''),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    coordinateStatus: validateZooCoordinate(longitude, latitude),
    ...(exhibitArea ? { exhibitArea } : {}),
    ...(poiGroup ? { poiGroup } : {}),
    taxonomy: {
      ...(kingdomOrPhylum ? { kingdomOrPhylum } : {}),
      ...(className ? { className } : {}),
      ...(orderName ? { orderName } : {}),
      ...(familyName ? { familyName } : {}),
    },
    conservationStatus: normalizeConservationStatus(firstValue(normalized, ['保育等級', 'a_conservation']) ?? ''),
    ...(geographicDistribution ? { geographicDistribution } : {}),
    ...(habitat ? { habitat } : {}),
    ...(morphology ? { morphology } : {}),
    ...(behavior ? { behavior } : {}),
    diet: normalizeDiet(firstValue(normalized, ['食性', 'a_diet']) ?? ''),
    ...(threats ? { threats } : {}),
    ...(interpretation ? { interpretation } : {}),
    ...(topicPageTitle ? { topicPageTitle } : {}),
    ...(topicPageUrl ? { topicPageUrl } : {}),
    isAdoptionFocusSpecies: /^(是|Y|true|1|認養)$/i.test(adoptionMarker),
    media,
    ...(dataUpdatedAt ? { dataUpdatedAt } : {}),
    source: SOURCE_DATASET,
  };
}

export function getFilterOptions(animals: ZooAnimal[]) {
  const values = (pick: (animal: ZooAnimal) => string | undefined) =>
    [...new Set(animals.map(pick).filter((value): value is string => Boolean(value?.trim())))].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    );
  return {
    exhibitAreas: values((animal) => animal.exhibitArea),
    poiGroups: values((animal) => animal.poiGroup),
    conservationStatuses: values((animal) => animal.conservationStatus),
    taxonomicClasses: values((animal) => animal.taxonomy.className),
    taxonomicOrders: values((animal) => animal.taxonomy.orderName),
    taxonomicFamilies: values((animal) => animal.taxonomy.familyName),
    diets: values((animal) => animal.diet),
  };
}

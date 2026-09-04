import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RiverfrontReptileObservation } from '../src/models';
import { decodeCsvBuffer, parseCsv, twd97ToWgs84 } from '../src/utils/zooGuideData';
import { mergeConversionReport, writeJson } from './zooGuideCsv';

const input = path.resolve('data/raw/riverfront-reptile-observations.csv');
const output = path.resolve('public/data/riverfront-reptile-observations');
const asNumber = (value: string | undefined) => value?.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
const validTime = (value: string) => /^([01]\d|2[0-3])([0-5]\d)$/.test(value) ? `${value.slice(0, 2)}:${value.slice(2)}` : null;

function coverage(records: RiverfrontReptileObservation[]) {
  const periods = records.map((record) => record.observationPeriod).filter((period): period is string => Boolean(period)).sort();
  return periods.length ? `${periods[0]} to ${periods.at(-1)}` : undefined;
}

function observation(row: Record<string, string>, index: number): RiverfrontReptileObservation {
  const xTwd97 = asNumber(row.X坐標); const yTwd97 = asNumber(row.Y坐標);
  const converted = xTwd97 !== null && yTwd97 !== null ? twd97ToWgs84(xTwd97, yTwd97) : null;
  const hasValidCoordinates = !!converted && converted.longitude >= 121.3 && converted.longitude <= 121.8 && converted.latitude >= 24.85 && converted.latitude <= 25.3;
  const year = asNumber(row['西元年']); const month = asNumber(row.Month); const rawDay = asNumber(row.Date);
  const day = rawDay && rawDay >= 1 && rawDay <= 31 && year && month && new Date(Date.UTC(year, month - 1, rawDay)).getUTCDate() === rawDay ? rawDay : null;
  const datePrecision = year && month ? (day ? 'day' : 'month') : 'unknown';
  const endemicRaw = row.Endemic ?? ''; const alienRaw = row.Alien ?? ''; const timeRaw = row.Time ?? '';
  const observationTime = validTime(timeRaw);
  return { id: `riverfront-reptile-${row.No || index + 1}-${row.Name_S || 'unknown'}-${year ?? ''}-${month ?? ''}-${day ?? ''}-${xTwd97 ?? ''}-${yTwd97 ?? ''}`, module: 'riverfront_reptile_observations', sourceSequenceNumber: row.No ?? '', groupRaw: row.Group ?? '', group: row.Group ?? '', familyName: row.Family ?? '', scientificName: row.Name_S ?? '', commonNameZh: row.Name_C ?? '', endemicRaw, endemicType: endemicRaw.includes('特有種') ? 'endemic_species' : endemicRaw.includes('特有亞種') ? 'endemic_subspecies' : endemicRaw ? 'unknown' : 'none', alienRaw, isAlienSpecies: alienRaw ? /外來|是/.test(alienRaw) : false, year, month, day, timeRaw, observationTime, observationPeriod: year && month ? `${year}-${String(month).padStart(2, '0')}${day ? `-${String(day).padStart(2, '0')}` : ''}` : null, datePrecision, regionRaw: row.Region ?? '', region: row.Region ?? '', xTwd97Raw: row.X坐標 ?? '', yTwd97Raw: row.Y坐標 ?? '', xTwd97, yTwd97, longitude: hasValidCoordinates ? converted!.longitude : null, latitude: hasValidCoordinates ? converted!.latitude : null, hasValidCoordinates, observedCountRaw: row['數量'] ?? '', observedCount: asNumber(row['數量']), sourceRow: row };
}

async function main() {
  const [bytes, sourceFile] = await Promise.all([readFile(input), stat(input)]);
  const rows = parseCsv(decodeCsvBuffer(bytes).text);
  const seen = new Set<string>();
  const records = rows.map(observation).filter((record) => !seen.has(JSON.stringify(record.sourceRow)) && !!seen.add(JSON.stringify(record.sourceRow)));
  await writeJson(path.join(output, 'observations.json'), records);
  await writeJson(path.join(output, 'observations.geojson'), { type: 'FeatureCollection', features: records.filter((record) => record.hasValidCoordinates).map((record) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [record.longitude, record.latitude] }, properties: { ...record, sourceRow: undefined } })) });
  await writeJson(path.join(output, 'metadata.json'), { datasetPage: 'https://data.taipei/dataset/detail?id=320ee03a-7944-4033-9317-1373fa8615f8', sourceCrs: 'EPSG:3826 (TWD97 / TM2 zone 121)', targetCrs: 'EPSG:4326 (WGS84)', coverage: coverage(records), sourceFileModifiedAt: sourceFile.mtime.toISOString(), recordCount: records.length, officialFields: Object.keys(rows[0] ?? {}) });
  await mergeConversionReport(path.resolve('public/data'), 'riverfrontReptileObservations', { records: records.length, validCoordinates: records.filter((record) => record.hasValidCoordinates).length });
  console.log(`Converted ${records.length} riverfront reptile observations`);
}

main();

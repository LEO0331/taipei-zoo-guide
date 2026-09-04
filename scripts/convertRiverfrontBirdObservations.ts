import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RiverfrontBirdObservation } from '../src/models';
import { decodeCsvBuffer, parseCsv, twd97ToWgs84 } from '../src/utils/zooGuideData';
import { birdStatus } from '../src/utils/riverfrontBirdData';
import { mergeConversionReport, writeJson } from './zooGuideCsv';
const input = path.resolve('data/raw/riverfront-bird-observations.csv');
const output = path.resolve('public/data/riverfront-bird-observations');
const n = (value: string | undefined) => value?.trim() && Number.isFinite(Number(value)) ? Number(value) : null;

function coverage(records: RiverfrontBirdObservation[]) {
  const periods = records.map((record) => record.observationPeriod).filter((period): period is string => Boolean(period)).sort();
  return periods.length ? `${periods[0]} to ${periods.at(-1)}` : undefined;
}

function formatObservationPeriod(year: number | null, month: number | null, day: number | null) {
  if (!year || !month) return null;
  const monthPart = String(month).padStart(2, '0');
  return day ? `${year}-${monthPart}-${String(day).padStart(2, '0')}` : `${year}-${monthPart}`;
}

const main = async () => {
 const [bytes, sourceFile] = await Promise.all([readFile(input), stat(input)]);
 const rows = parseCsv(decodeCsvBuffer(bytes).text);
 const records: RiverfrontBirdObservation[] = rows.map((row, index) => {
   const xTwd97 = n(row.X_TWD97); const yTwd97 = n(row.Y_TWD97);
   const converted = xTwd97 !== null && yTwd97 !== null ? twd97ToWgs84(xTwd97, yTwd97) : null;
   const hasValidCoordinates = !!converted && converted.longitude >= 121.3 && converted.longitude <= 121.8 && converted.latitude >= 24.85 && converted.latitude <= 25.3;
   const year = n(row['西元年']); const month = n(row.Month); const rawDay = n(row.Date);
   const day = rawDay && rawDay >= 1 && rawDay <= 31 && year && month && new Date(Date.UTC(year, month - 1, rawDay)).getUTCDate() === rawDay ? rawDay : null;
   const datePrecision = year && month ? (day ? 'day' : 'month') : 'unknown';
   const endemicRaw = row.Endemic ?? ''; const alienRaw = row.Alien ?? '';
   return { id: `riverfront-bird-${index + 1}`, module: 'riverfront_bird_observations', familyName: row.Family ?? '', scientificName: row.Name_S ?? '', commonNameZh: row.Name_C ?? '', endemicRaw, endemicType: endemicRaw.includes('特有種') ? 'endemic_species' : endemicRaw.includes('特有亞種') ? 'endemic_subspecies' : endemicRaw ? 'unknown' : 'none', alienRaw, isAlienSpecies: alienRaw ? /外來|是/.test(alienRaw) : false, statusRaw: row.Status ?? '', ...birdStatus(row.Status ?? ''), year, month, day, observationPeriod: formatObservationPeriod(year, month, day), datePrecision, regionRaw: row.Region ?? '', region: row.Region ?? '', xTwd97Raw: row.X_TWD97 ?? '', yTwd97Raw: row.Y_TWD97 ?? '', xTwd97, yTwd97, longitude: hasValidCoordinates ? converted!.longitude : null, latitude: hasValidCoordinates ? converted!.latitude : null, hasValidCoordinates, observedCountRaw: row['數量'] ?? '', observedCount: n(row['數量']), surveyorRaw: row.Investgat ?? '' };
 });
 const geojson={ type:'FeatureCollection', features:records.filter(r=>r.hasValidCoordinates).map(r=>({type:'Feature',geometry:{type:'Point',coordinates:[r.longitude,r.latitude]},properties:{...r,surveyorRaw:undefined}}))};
 const metadata={datasetPage:'https://data.taipei/dataset/detail?id=8eea1e09-055b-4b3d-9472-b96744b1727e', sourceCrs:'EPSG:3826 (TWD97 / TM2 zone 121)', targetCrs:'EPSG:4326 (WGS84)', coverage:coverage(records), sourceFileModifiedAt:sourceFile.mtime.toISOString(), recordCount:records.length, officialFields:Object.keys(rows[0] ?? {})};
 await writeJson(path.join(output,'observations.json'),records); await writeJson(path.join(output,'observations.geojson'),geojson); await writeJson(path.join(output,'metadata.json'),metadata); await mergeConversionReport(path.resolve('public/data'),'riverfrontBirdObservations',{records:records.length,validCoordinates:records.filter(r=>r.hasValidCoordinates).length}); console.log(`Converted ${records.length} riverfront bird observations`);
}; main();

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { TaipeiBiodiversitySpeciesSurveyPointRecord } from '../src/models';
import { decodeCsvBuffer, normalizeBiodiversitySurveyPointRow, parseCsv } from '../src/utils/zooGuideData';
import { mergeConversionReport, writeJson } from './zooGuideCsv';

const INPUT_DIR = path.resolve('data/raw/taipei-biodiversity-species-survey-points');
const OUTPUT_DIR = path.resolve('public/data');

function resourceNameFromFile(file: string) {
  return file.replace(/^\d{4}-/, '').replace(/\.csv$/i, '');
}

async function main() {
  const files = (await readdir(INPUT_DIR).catch(() => [])).filter((file) => file.toLocaleLowerCase().endsWith('.csv')).sort();
  const records: TaipeiBiodiversitySpeciesSurveyPointRecord[] = [];
  const sources = [];
  for (const file of files) {
    const bytes = await readFile(path.join(INPUT_DIR, file));
    const decoded = decodeCsvBuffer(bytes);
    const rows = parseCsv(decoded.text);
    const resourceName = resourceNameFromFile(file);
    const resourceYear = Number(file.match(/^\d{4}/)?.[0]);
    records.push(
      ...rows.map((row, rowIndex) =>
        normalizeBiodiversitySurveyPointRow(row, {
          rowIndex,
          resourceName,
          ...(Number.isFinite(resourceYear) ? { resourceYear } : {}),
          sourceFileName: file,
        }),
      ),
    );
    sources.push({ file, fileSize: bytes.byteLength, encoding: decoded.encoding, rows: rows.length, resourceName, resourceYear });
  }
  await writeJson(path.join(OUTPUT_DIR, 'taipei-biodiversity-species-survey-points.json'), records);
  await mergeConversionReport(OUTPUT_DIR, 'taipeiBiodiversitySpeciesSurveyPoints', {
    officialDataset: '臺北市生物多樣性',
    officialSourceAgency: '產業局動保處',
    sources,
    generatedRecords: records.length,
    coordinateSystems: Object.fromEntries(['wgs84_lonlat', 'twd97_tm2', 'unknown'].map((key) => [key, records.filter((record) => record.coordinateSystem === key).length])),
    withinTaipeiBounds: records.filter((record) => record.isWithinTaipeiBounds).length,
    nearTaipeiZooArea: records.filter((record) => record.isNearZooArea).length,
    warnings: records
      .filter((record) => record.coordinateSystem === 'unknown' || (record.surveyDateRaw && !record.surveyDate) || (record.observationCountRaw && record.observationCount === undefined))
      .slice(0, 20)
      .map((record) => ({
        id: record.id,
        sourceFileName: record.sourceFileName,
        coordinateSystem: record.coordinateSystem,
        surveyDateRaw: record.surveyDateRaw,
        observationCountRaw: record.observationCountRaw,
      })),
  });
  console.log(`Converted ${records.length} biodiversity survey point records`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

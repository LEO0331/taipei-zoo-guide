import path from 'node:path';
import type { TaipeiBiodiversitySpeciesSurveyPointRecord } from '../src/models';
import { buildTaipeiBiodiversitySpeciesSurveyPointSummary } from '../src/utils/zooGuideData';
import { mergeConversionReport, readJson, writeJson } from './zooGuideCsv';

const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const records = await readJson<TaipeiBiodiversitySpeciesSurveyPointRecord[]>(
    path.join(OUTPUT_DIR, 'taipei-biodiversity-species-survey-points.json'),
    [],
  );
  const summary = buildTaipeiBiodiversitySpeciesSurveyPointSummary(records);
  const latestYear = summary.latestSurveyYear;
  const latest = latestYear ? records.filter((record) => record.surveyYear === latestYear) : [];
  await writeJson(path.join(OUTPUT_DIR, 'taipei-biodiversity-species-survey-point-summary.json'), summary);
  await writeJson(path.join(OUTPUT_DIR, 'taipei-biodiversity-species-survey-point-latest.json'), latest);
  await mergeConversionReport(OUTPUT_DIR, 'taipeiBiodiversitySpeciesSurveyPointSummary', {
    totalRecords: summary.totalRecords,
    latestSurveyYear: summary.latestSurveyYear,
    uniqueSpeciesNameCount: summary.uniqueSpeciesNameCount,
    recordsNearTaipeiZooArea: summary.recordsNearZooArea,
  });
  console.log(`Built biodiversity summary for ${records.length} records`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

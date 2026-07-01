import path from 'node:path';
import type { TaipeiBiodiversitySpeciesSurveyPointRecord, ZooAnimal, ZooEvent, ZooExhibitArea, ZooPlantRecord } from '../src/models';
import { buildZooGuideSummary } from '../src/utils/zooGuideData';
import { mergeConversionReport, readJson, writeJson } from './zooGuideCsv';

const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const animals = await readJson<ZooAnimal[]>(path.join(OUTPUT_DIR, 'zoo-animals.json'), []);
  const exhibitAreas = await readJson<ZooExhibitArea[]>(path.join(OUTPUT_DIR, 'zoo-exhibit-areas.json'), []);
  const events = await readJson<ZooEvent[]>(path.join(OUTPUT_DIR, 'zoo-events.json'), []);
  const plants = await readJson<ZooPlantRecord[]>(path.join(OUTPUT_DIR, 'zoo-plants.json'), []);
  const biodiversity = await readJson<TaipeiBiodiversitySpeciesSurveyPointRecord[]>(
    path.join(OUTPUT_DIR, 'taipei-biodiversity-species-survey-points.json'),
    [],
  );
  const summary = buildZooGuideSummary(animals, exhibitAreas, events, plants, biodiversity);
  await writeJson(path.join(OUTPUT_DIR, 'zoo-guide-summary.json'), summary);
  await mergeConversionReport(OUTPUT_DIR, 'guideSummary', summary);
  console.log(
    `Built visitor-guide summary for ${animals.length} animals, ${exhibitAreas.length} areas, ${events.length} events, ${plants.length} plants, ${biodiversity.length} biodiversity records`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import path from 'node:path';
import type { ZooAnimal, ZooEvent, ZooExhibitArea } from '../src/models';
import { buildZooGuideSummary } from '../src/utils/zooGuideData';
import { mergeConversionReport, readJson, writeJson } from './zooGuideCsv';

const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const animals = await readJson<ZooAnimal[]>(path.join(OUTPUT_DIR, 'zoo-animals.json'), []);
  const exhibitAreas = await readJson<ZooExhibitArea[]>(path.join(OUTPUT_DIR, 'zoo-exhibit-areas.json'), []);
  const events = await readJson<ZooEvent[]>(path.join(OUTPUT_DIR, 'zoo-events.json'), []);
  const summary = buildZooGuideSummary(animals, exhibitAreas, events);
  await writeJson(path.join(OUTPUT_DIR, 'zoo-guide-summary.json'), summary);
  await mergeConversionReport(OUTPUT_DIR, 'guideSummary', summary);
  console.log(`Built visitor-guide summary for ${animals.length} animals, ${exhibitAreas.length} areas, ${events.length} events`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


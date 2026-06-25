import path from 'node:path';
import type { ZooPlantRecord } from '../src/models';
import { buildZooPlantSummary } from '../src/utils/zooGuideData';
import { mergeConversionReport, readJson, writeJson } from './zooGuideCsv';

const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const plants = await readJson<ZooPlantRecord[]>(path.join(OUTPUT_DIR, 'zoo-plants.json'), []);
  const summary = buildZooPlantSummary(plants);
  await writeJson(path.join(OUTPUT_DIR, 'zoo-plant-species.json'), summary.species);
  await writeJson(path.join(OUTPUT_DIR, 'zoo-plant-summary.json'), summary);
  await mergeConversionReport(OUTPUT_DIR, 'plantSummary', {
    totalPlantRecords: summary.totalPlantRecords,
    speciesCount: summary.species.length,
    familyCount: summary.familyCount,
    genusCount: summary.genusCount,
    locationAreaCount: summary.locationAreaCount,
  });
  console.log(`Built plant summary for ${plants.length} records and ${summary.species.length} species`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

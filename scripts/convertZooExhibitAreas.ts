import path from 'node:path';
import type { ZooAnimal, ZooExhibitArea } from '../src/models';
import { matchAnimalsToExhibitArea, normalizeExhibitAreaRow } from '../src/utils/zooGuideData';
import { mergeConversionReport, readCsvDirectory, readJson, writeJson } from './zooGuideCsv';

const INPUT_DIR = path.resolve('data/raw/zoo-exhibit-areas');
const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const { rows, sources } = await readCsvDirectory(INPUT_DIR);
  const animals = await readJson<ZooAnimal[]>(path.join(OUTPUT_DIR, 'zoo-animals.json'), []);
  const exhibitAreas: ZooExhibitArea[] = rows.map((row, index) => {
    const area = normalizeExhibitAreaRow(row, index);
    return { ...area, relatedAnimalIds: matchAnimalsToExhibitArea(area, animals) };
  });
  await writeJson(path.join(OUTPUT_DIR, 'zoo-exhibit-areas.json'), exhibitAreas);
  await mergeConversionReport(OUTPUT_DIR, 'exhibitAreas', {
    sources,
    sourceRows: rows.length,
    generatedRecords: exhibitAreas.length,
    coordinateStatus: Object.fromEntries(
      ['valid', 'missing', 'outlier', 'unparsed'].map((status) => [
        status,
        exhibitAreas.filter((area) => area.coordinateStatus === status).length,
      ]),
    ),
    linkedToAnimals: exhibitAreas.filter((area) => area.relatedAnimalIds?.length).length,
    warnings: exhibitAreas
      .filter((area) => area.coordinateStatus !== 'valid')
      .slice(0, 10)
      .map((area) => ({ id: area.id, areaName: area.areaName, coordinateStatus: area.coordinateStatus })),
  });
  console.log(`Converted ${exhibitAreas.length} exhibit-area records`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


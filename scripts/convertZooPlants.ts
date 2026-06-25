import path from 'node:path';
import type { ZooExhibitArea, ZooPlantRecord } from '../src/models';
import { matchPlantToExhibitAreas, normalizePlantRow } from '../src/utils/zooGuideData';
import { mergeConversionReport, readCsvDirectory, readJson, writeJson } from './zooGuideCsv';

const INPUT_DIR = path.resolve('data/raw/zoo-plants');
const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const { rows, sources } = await readCsvDirectory(INPUT_DIR);
  const exhibitAreas = await readJson<ZooExhibitArea[]>(path.join(OUTPUT_DIR, 'zoo-exhibit-areas.json'), []);
  const plants: ZooPlantRecord[] = rows.map((row, index) => {
    const plant = normalizePlantRow(row, index);
    const matchedExhibitAreaIds = matchPlantToExhibitAreas(plant, exhibitAreas);
    return {
      ...plant,
      ...(matchedExhibitAreaIds.length ? { matchedExhibitAreaIds } : {}),
    };
  });
  await writeJson(path.join(OUTPUT_DIR, 'zoo-plants.json'), plants);
  await mergeConversionReport(OUTPUT_DIR, 'plants', {
    sources,
    sourceRows: rows.length,
    generatedRecords: plants.length,
    coordinateStatus: Object.fromEntries(
      ['valid', 'missing', 'outlier', 'unparsed'].map((status) => [
        status,
        plants.filter((plant) => plant.coordinateStatus === status).length,
      ]),
    ),
    matchedExhibitAreas: plants.filter((plant) => plant.matchedExhibitAreaIds?.length).length,
    mediaReferenceRecords: plants.filter((plant) => plant.mediaReferences.length).length,
    warnings: plants
      .filter((plant) => plant.coordinateStatus !== 'valid' || (plant.updatedDateRaw && !plant.updatedDate))
      .slice(0, 10)
      .map((plant) => ({
        id: plant.id,
        chineseName: plant.chineseName,
        coordinateStatus: plant.coordinateStatus,
        updatedDateRaw: plant.updatedDateRaw,
      })),
  });
  console.log(`Converted ${plants.length} plant records`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

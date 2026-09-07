import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ZooAnimal, ZooExhibitArea } from '../src/models';
import { decodeCsvBuffer, matchAnimalsToExhibitArea, normalizeExhibitAreaRow, parseCsv } from '../src/utils/zooGuideData';
import { mergeDisplayAreaEnglishSupplement } from '../src/utils/zooSourceSupplement';
import { mergeConversionReport, readCsvDirectory, readJson, writeJson } from './zooGuideCsv';

const INPUT_DIR = path.resolve('data/raw/zoo-exhibit-areas');
const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const supplementFile = path.join(INPUT_DIR, 'english-supplement.csv');
  const { rows, sources } = await readCsvDirectory(INPUT_DIR, { excludeFiles: ['english-supplement.csv'] });
  const supplementBytes = await readFile(supplementFile).catch(() => undefined);
  const supplemented = mergeDisplayAreaEnglishSupplement(rows, supplementBytes ? parseCsv(decodeCsvBuffer(supplementBytes).text) : []);
  const animals = await readJson<ZooAnimal[]>(path.join(OUTPUT_DIR, 'zoo-animals.json'), []);
  const exhibitAreas: ZooExhibitArea[] = supplemented.rows.map((row, index) => {
    const area = normalizeExhibitAreaRow(row, index);
    return { ...area, relatedAnimalIds: matchAnimalsToExhibitArea(area, animals) };
  });
  await writeJson(path.join(OUTPUT_DIR, 'zoo-exhibit-areas.json'), exhibitAreas);
  await mergeConversionReport(OUTPUT_DIR, 'exhibitAreas', {
    sources,
    sourceRows: rows.length,
    generatedRecords: exhibitAreas.length,
    englishSupplement: supplemented.report,
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


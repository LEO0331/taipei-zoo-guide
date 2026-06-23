import path from 'node:path';
import type { ZooAnimal, ZooEvent, ZooExhibitArea } from '../src/models';
import { matchEventToAnimals, matchEventToExhibitArea, normalizeZooEventRow } from '../src/utils/zooGuideData';
import { mergeConversionReport, readCsvDirectory, readJson, writeJson } from './zooGuideCsv';

const INPUT_DIR = path.resolve('data/raw/zoo-events');
const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const { rows, sources } = await readCsvDirectory(INPUT_DIR);
  const animals = await readJson<ZooAnimal[]>(path.join(OUTPUT_DIR, 'zoo-animals.json'), []);
  const exhibitAreas = await readJson<ZooExhibitArea[]>(path.join(OUTPUT_DIR, 'zoo-exhibit-areas.json'), []);
  const events: ZooEvent[] = rows.map((row, index) => {
    const event = normalizeZooEventRow(row, index);
    const matchedExhibitAreaId = matchEventToExhibitArea(event.locationName, event.keywords, exhibitAreas);
    const matchedAnimalIds = matchEventToAnimals(event.title, event.keywords, event.locationName, animals);
    return {
      ...event,
      ...(matchedExhibitAreaId ? { matchedExhibitAreaId } : {}),
      ...(matchedAnimalIds.length ? { matchedAnimalIds } : {}),
    };
  });
  await writeJson(path.join(OUTPUT_DIR, 'zoo-events.json'), events);
  await mergeConversionReport(OUTPUT_DIR, 'events', {
    sources,
    sourceRows: rows.length,
    generatedRecords: events.length,
    coordinateStatus: Object.fromEntries(
      ['valid', 'missing', 'outlier', 'unparsed'].map((status) => [
        status,
        events.filter((event) => event.coordinateStatus === status).length,
      ]),
    ),
    eventStatus: Object.fromEntries(
      ['upcoming', 'ongoing', 'past', 'cancelled_or_paused', 'unknown'].map((status) => [
        status,
        events.filter((event) => event.eventStatus === status).length,
      ]),
    ),
    matchedExhibitAreas: events.filter((event) => event.matchedExhibitAreaId).length,
    matchedAnimals: events.filter((event) => event.matchedAnimalIds?.length).length,
    warnings: events
      .filter(
        (event) =>
          event.coordinateStatus === 'outlier' ||
          event.coordinateStatus === 'unparsed' ||
          (event.startDateRaw && !event.startDate) ||
          (event.endDateRaw && !event.endDate),
      )
      .slice(0, 10)
      .map((event) => ({
        id: event.id,
        title: event.title,
        coordinateStatus: event.coordinateStatus,
        startDateRaw: event.startDateRaw,
        endDateRaw: event.endDateRaw,
      })),
  });
  console.log(`Converted ${events.length} event records`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


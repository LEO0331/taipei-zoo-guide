import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildZooAnimalSummary, normalizeAnimalRow } from '../src/utils/zooData';
import type { ZooAnimal } from '../src/models';

const INPUT_DIR = path.resolve('data/raw/zoo-animals');
const OUTPUT_DIR = path.resolve('public/data');

function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  const [headers = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

async function readRows(): Promise<Record<string, unknown>[]> {
  const files = await readdir(INPUT_DIR).catch(() => []);
  const indexText = await readFile(path.join(INPUT_DIR, 'resource-index.json'), 'utf8').catch(() => undefined);
  const indexedJsonFiles = indexText
    ? ((JSON.parse(indexText) as { pages?: Array<{ file: string }> }).pages ?? []).map((page) => page.file)
    : [];
  const selectedFiles = indexedJsonFiles.length
    ? [...new Set([...indexedJsonFiles, ...files.filter((file) => file.endsWith('.csv'))])]
    : files;
  const rows: Record<string, unknown>[] = [];
  for (const file of selectedFiles) {
    if (file === 'resource-index.json') continue;
    const fullPath = path.join(INPUT_DIR, file);
    const text = await readFile(fullPath, 'utf8');
    if (file.endsWith('.csv')) {
      rows.push(...parseCsv(text));
      continue;
    }
    if (!file.endsWith('.json')) continue;
    const payload = JSON.parse(text) as { result?: { results?: Record<string, unknown>[] } } | Record<string, unknown>[];
    if (Array.isArray(payload)) {
      rows.push(...payload);
    } else {
      rows.push(...(payload.result?.results ?? []));
    }
  }
  return rows;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const rows = await readRows();
  const animals: ZooAnimal[] = rows.map((row, index) => normalizeAnimalRow(row, index));
  const summary = buildZooAnimalSummary(animals);
  const report = {
    generatedAt: new Date().toISOString(),
    sourceRows: rows.length,
    generatedAnimals: animals.length,
    coordinateStatus: {
      valid: animals.filter((animal) => animal.coordinateStatus === 'valid').length,
      missing: animals.filter((animal) => animal.coordinateStatus === 'missing').length,
      outlier: animals.filter((animal) => animal.coordinateStatus === 'outlier').length,
    },
    media: {
      photoRecords: summary.withPhotoUrlCount,
      audioRecords: summary.withAudioUrlCount,
      videoRecords: summary.withVideoUrlCount,
    },
  };

  await writeFile(path.join(OUTPUT_DIR, 'zoo-animals.json'), `${JSON.stringify(animals, null, 2)}\n`);
  await writeFile(path.join(OUTPUT_DIR, 'zoo-animal-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(path.join(OUTPUT_DIR, 'conversion-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Converted ${animals.length} animal records into ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

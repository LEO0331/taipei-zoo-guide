import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  biodiversityResourceUrl,
  TAIPEI_BIODIVERSITY_DATASET_PAGE,
  TAIPEI_BIODIVERSITY_RESOURCES,
} from './biodiversityResources';

const OUTPUT_DIR = path.resolve('data/raw/taipei-biodiversity-species-survey-points');

function fileSafe(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim();
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const force = process.argv.includes('--force');
  const resources = [];
  const warnings = [];
  for (const [name, rid, encoding] of TAIPEI_BIODIVERSITY_RESOURCES) {
    const year = name.match(/\d{4}/)?.[0] ?? 'unknown';
    const file = `${year}-${fileSafe(name)}.csv`;
    const output = path.join(OUTPUT_DIR, file);
    const exists = await stat(output).then(() => true).catch(() => false);
    const url = biodiversityResourceUrl(rid);
    if (!exists || force) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        await writeFile(output, Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        warnings.push({ resourceName: name, url, warning: error instanceof Error ? error.message : String(error) });
        continue;
      }
    }
    const bytes = await readFile(output);
    resources.push({ resourceName: name, resourceYear: Number(year), rid, url, file, fileSize: bytes.byteLength, declaredEncoding: encoding });
  }
  await writeFile(
    path.join(OUTPUT_DIR, 'source-metadata.json'),
    `${JSON.stringify(
      {
        datasetPage: TAIPEI_BIODIVERSITY_DATASET_PAGE,
        sourceAgencyOfficial: '產業局動保處',
        downloadedAt: new Date().toISOString(),
        resources,
        warnings,
        notes: 'Annual CSV resources are raw biodiversity indicator species survey point data, not real-time wildlife locations.',
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Prepared ${resources.length} biodiversity CSV resources`);
  if (warnings.length) console.warn(`Warnings: ${warnings.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

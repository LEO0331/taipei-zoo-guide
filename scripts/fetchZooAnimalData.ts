import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RESOURCE_ID = process.env.RESOURCE_ID ?? '6afa114d-38a2-4e3c-9cfd-29d3bd26b65b';
const API_BASE = process.env.TAIPEI_OPEN_DATA_API ?? 'https://data.taipei/api/v1/dataset';
const PAGE_LIMIT = Number(process.env.PAGE_LIMIT ?? 1000);
const OUTPUT_DIR = path.resolve('data/raw/zoo-animals');

if (!Number.isInteger(PAGE_LIMIT) || PAGE_LIMIT < 1) {
  throw new Error('PAGE_LIMIT must be a positive integer');
}

type ApiPayload = {
  result?: {
    count?: number;
    limit?: number;
    offset?: number;
    results?: unknown[];
  };
};

function buildUrl(offset: number): string {
  const url = new URL(`${API_BASE}/${RESOURCE_ID}`);
  url.searchParams.set('scope', 'resourceAquire');
  url.searchParams.set('limit', String(PAGE_LIMIT));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}

async function fetchPage(offset: number): Promise<ApiPayload> {
  const response = await fetch(buildUrl(offset));
  if (!response.ok) throw new Error(`Taipei Open Data request failed: ${response.status} ${response.statusText}`);
  return (await response.json()) as ApiPayload;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const existingFiles = await readdir(OUTPUT_DIR).catch(() => []);
  await Promise.all(
    existingFiles
      .filter((file) => /^page-\d+\.json$/.test(file))
      .map((file) => unlink(path.join(OUTPUT_DIR, file))),
  );
  const pages: Array<{ file: string; count: number; offset: number }> = [];
  let offset = 0;
  let total = 0;

  while (true) {
    const payload = await fetchPage(offset);
    const results = payload.result?.results ?? [];
    const file = `page-${String(offset).padStart(5, '0')}.json`;
    await writeFile(path.join(OUTPUT_DIR, file), `${JSON.stringify(payload, null, 2)}\n`);
    pages.push({ file, count: results.length, offset });
    total += results.length;

    const count = payload.result?.count;
    const nextOffset = offset + (payload.result?.limit ?? PAGE_LIMIT);
    if (results.length === 0 || (typeof count === 'number' && nextOffset >= count)) break;
    offset = nextOffset;
  }

  await writeFile(
    path.join(OUTPUT_DIR, 'resource-index.json'),
    `${JSON.stringify(
      {
        resourceId: RESOURCE_ID,
        apiBase: API_BASE,
        fetchedAt: new Date().toISOString(),
        total,
        pages,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Fetched ${total} records into ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

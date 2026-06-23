import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function fetchZooCsv(options: {
  outputDir: string;
  datasetPage: string;
  defaultFileName: string;
  localCsv?: string;
  resourceUrl?: string;
}) {
  await mkdir(options.outputDir, { recursive: true });
  const force = process.argv.includes('--force');
  const existing = (await readdir(options.outputDir)).find((file) => file.toLocaleLowerCase().endsWith('.csv'));

  const outputFile = path.join(options.outputDir, options.defaultFileName);
  let sourceUrl = options.datasetPage;
  let sourceType = 'existing';
  if (options.localCsv) {
    await copyFile(options.localCsv, outputFile);
    sourceUrl = options.localCsv;
    sourceType = 'local-file';
  } else if (options.resourceUrl) {
    const response = await fetch(options.resourceUrl);
    if (!response.ok) throw new Error(`CSV download failed: ${response.status} ${response.statusText}`);
    await writeFile(outputFile, Buffer.from(await response.arrayBuffer()));
    sourceUrl = options.resourceUrl;
    sourceType = 'download';
  } else if (!existing) {
    throw new Error('No CSV is available. Set LOCAL_CSV or RESOURCE_URL.');
  }

  const selected = existing && sourceType === 'existing' ? path.join(options.outputDir, existing) : outputFile;
  const fileStat = await stat(selected);
  const bytes = await readFile(selected);
  await writeFile(
    path.join(options.outputDir, 'source-metadata.json'),
    `${JSON.stringify(
      {
        datasetPage: options.datasetPage,
        source: sourceUrl,
        sourceType,
        downloadedAt: new Date().toISOString(),
        file: path.basename(selected),
        fileSize: fileStat.size,
        encoding: bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 'UTF-8-SIG' : 'UTF-8 or Big5',
        notes: 'Multimedia URLs are retained as external source references only.',
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Prepared ${selected}`);
}

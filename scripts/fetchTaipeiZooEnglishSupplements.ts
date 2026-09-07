import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const resources = [
  { name: 'animal', url: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=a27b1124-b19a-400d-a019-cb3c896c231e', output: path.resolve('data/raw/zoo-animals/english-supplement.csv') },
  { name: 'displayAreas', url: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=7a87e031-239c-4367-a88f-de8bafdfe2bc', output: path.resolve('data/raw/zoo-exhibit-areas/english-supplement.csv') },
];

async function main() {
  for (const resource of resources) {
    const response = await fetch(resource.url);
    if (!response.ok) throw new Error(`${resource.name} supplement download failed: ${response.status} ${response.statusText}`);
    await mkdir(path.dirname(resource.output), { recursive: true });
    await writeFile(resource.output, Buffer.from(await response.arrayBuffer()));
    console.log(`Fetched ${resource.name} English supplement`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

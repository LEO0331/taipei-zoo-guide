import path from 'node:path';
import { fetchZooCsv } from './fetchZooCsv';

fetchZooCsv({
  outputDir: path.resolve('data/raw/zoo-exhibit-areas'),
  datasetPage: 'https://data.taipei/dataset/detail?id=1ed45a8a-d26a-4a5f-b544-788a4071eea2',
  defaultFileName: 'zoo-exhibit-areas.csv',
  localCsv: process.env.LOCAL_CSV,
  resourceUrl: process.env.RESOURCE_URL,
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


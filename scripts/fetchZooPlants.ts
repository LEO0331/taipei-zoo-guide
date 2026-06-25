import path from 'node:path';
import { fetchZooCsv } from './fetchZooCsv';

fetchZooCsv({
  outputDir: path.resolve('data/raw/zoo-plants'),
  datasetPage: 'https://data.taipei/dataset/detail?id=48c4d6a7-4b09-4d1f-9739-ee837d302bd1',
  defaultFileName: 'zoo-plants.csv',
  localCsv: process.env.LOCAL_CSV,
  resourceUrl: process.env.RESOURCE_URL,
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

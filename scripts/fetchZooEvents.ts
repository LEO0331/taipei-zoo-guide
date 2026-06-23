import path from 'node:path';
import { fetchZooCsv } from './fetchZooCsv';

fetchZooCsv({
  outputDir: path.resolve('data/raw/zoo-events'),
  datasetPage: 'https://data.taipei/dataset/detail?id=61ff4b3a-8a8a-47e4-96ec-e180b2abbfdb',
  defaultFileName: 'zoo-events.csv',
  localCsv: process.env.LOCAL_CSV,
  resourceUrl: process.env.RESOURCE_URL,
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


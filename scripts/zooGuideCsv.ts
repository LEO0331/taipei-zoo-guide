import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeCsvBuffer, parseCsv } from '../src/utils/zooGuideData';

export type CsvSource = {
  file: string;
  fileSize: number;
  encoding: string;
  rows: number;
};

export async function readCsvDirectory(inputDir: string): Promise<{
  rows: Record<string, string>[];
  sources: CsvSource[];
}> {
  const files = (await readdir(inputDir).catch(() => [])).filter((file) => file.toLocaleLowerCase().endsWith('.csv')).sort();
  const rows: Record<string, string>[] = [];
  const sources: CsvSource[] = [];
  for (const file of files) {
    const bytes = await readFile(path.join(inputDir, file));
    const decoded = decodeCsvBuffer(bytes);
    const fileRows = parseCsv(decoded.text);
    rows.push(...fileRows);
    sources.push({ file, fileSize: bytes.byteLength, encoding: decoded.encoding, rows: fileRows.length });
  }
  return { rows, sources };
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8').catch(() => JSON.stringify(fallback))) as T;
}

export async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

export async function mergeConversionReport(outputDir: string, key: string, value: unknown) {
  const reportPath = path.join(outputDir, 'conversion-report.json');
  const report = await readJson<Record<string, unknown>>(reportPath, {});
  await writeJson(reportPath, { ...report, generatedAt: new Date().toISOString(), [key]: value });
}


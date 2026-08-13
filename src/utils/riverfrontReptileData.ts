import type { RiverfrontReptileObservation } from '../models';

type SummaryRow = { label: string; records: number; species: number; count: number };

function summarizeBy(records: RiverfrontReptileObservation[], key: (record: RiverfrontReptileObservation) => string): SummaryRow[] {
  const groups = new Map<string, RiverfrontReptileObservation[]>();
  for (const record of records) {
    const label = key(record);
    if (!label) continue;
    const rows = groups.get(label);
    if (rows) rows.push(record);
    else groups.set(label, [record]);
  }
  return [...groups].map(([label, rows]) => ({ label, records: rows.length, species: new Set(rows.map((row) => row.commonNameZh)).size, count: rows.reduce((total, row) => total + (row.observedCount ?? 0), 0) }));
}

export function reptileSummary(records: RiverfrontReptileObservation[]) {
  const species = summarizeBy(records, (record) => record.commonNameZh);
  return {
    records: records.length,
    species: species.length,
    families: new Set(records.map((record) => record.familyName).filter(Boolean)).size,
    groups: new Set(records.map((record) => record.group).filter(Boolean)).size,
    individuals: records.reduce((total, record) => total + (record.observedCount ?? 0), 0),
    regions: summarizeBy(records, (record) => record.region).sort((a, b) => b.species - a.species),
    months: summarizeBy(records, (record) => record.month ? String(record.month) : '').sort((a, b) => Number(a.label) - Number(b.label)),
    familiesBySpecies: summarizeBy(records, (record) => record.familyName).sort((a, b) => b.species - a.species),
    topByRecords: [...species].sort((a, b) => b.records - a.records).slice(0, 10),
    topByCount: [...species].sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

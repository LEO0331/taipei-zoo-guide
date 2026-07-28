import type { RiverfrontBirdObservation } from '../models';

const residency: Record<string, RiverfrontBirdObservation['residencyTags'][number]> = { '留': 'resident', '冬': 'winter_visitor', '夏': 'summer_visitor', '過': 'passage_migrant' };
const abundance: Record<string, RiverfrontBirdObservation['abundanceStatusTags'][number]> = { '普': 'common', '不普': 'uncommon', '稀': 'rare' };
export function birdStatus(raw: string): Pick<RiverfrontBirdObservation, 'residencyTags' | 'abundanceStatusTags'> {
  const parts = raw.split(/[、,/／]/).map((part) => part.trim()).filter(Boolean);
  const residencyTags = [...new Set(parts.map((part) => residency[part]).filter(Boolean))];
  const abundanceStatusTags = [...new Set(parts.map((part) => abundance[part]).filter(Boolean))];
  return { residencyTags: residencyTags.length ? residencyTags : ['unknown'], abundanceStatusTags: abundanceStatusTags.length ? abundanceStatusTags : ['unknown'] };
}
export function birdSummary(records: RiverfrontBirdObservation[]) {
  const species = new Set(records.map((r) => r.commonNameZh).filter(Boolean));
  const individuals = records.reduce((total, record) => total + (record.observedCount ?? 0), 0);
  const group = (key: (r: RiverfrontBirdObservation) => string) => {
    const groups = new Map<string, RiverfrontBirdObservation[]>();
    for (const record of records) {
      const label = key(record);
      if (!label) continue;
      const rows = groups.get(label);
      if (rows) rows.push(record);
      else groups.set(label, [record]);
    }
    return [...groups]
      .map(([label, rows]) => ({
        label,
        records: rows.length,
        species: new Set(rows.map((record) => record.commonNameZh)).size,
        count: rows.reduce((total, record) => total + (record.observedCount ?? 0), 0),
      }))
      .sort((a, b) => b.species - a.species || b.records - a.records);
  };
  const speciesGroups = group((record) => record.commonNameZh);
  return {
    records: records.length,
    species: species.size,
    families: new Set(records.map((record) => record.familyName).filter(Boolean)).size,
    individuals,
    regions: group((record) => record.region),
    months: group((record) => (record.month ? String(record.month) : '')),
    topByRecords: [...speciesGroups].sort((a, b) => b.records - a.records).slice(0, 10),
    topByCount: [...speciesGroups].sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

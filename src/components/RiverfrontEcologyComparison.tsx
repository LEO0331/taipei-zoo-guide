import type { Language, RiverfrontBirdObservation, RiverfrontReptileObservation } from '../models';
import { buildRiverfrontEcologyComparison } from '../utils/riverfrontEcology';

export function RiverfrontEcologyComparison({
  birds,
  reptiles,
  language,
}: {
  birds: RiverfrontBirdObservation[];
  reptiles: RiverfrontReptileObservation[];
  language: Language;
}) {
  const comparison = buildRiverfrontEcologyComparison(birds, reptiles);
  const zh = language === 'zh';
  const table = (title: string, rows: typeof comparison.byRegion) => (
    <section className="ecology-comparison-table">
      <h3>{title}</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>{zh ? '比較項目' : 'Comparison'}</th><th>{zh ? '鳥類物種數' : 'Bird species'}</th><th>{zh ? '爬蟲物種數' : 'Reptile species'}</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.birdSpecies}</td><td>{row.reptileSpecies}</td></tr>)}</tbody>
      </table></div>
    </section>
  );
  return (
    <section className="riverfront-ecology">
      <header className="section-heading"><h2>{zh ? '河濱生態比較' : 'Riverfront Ecology Comparison'}</h2><p>{zh ? '以相同河域與月份的物種數並列呈現鳥類與爬蟲歷史調查資料。' : 'Bird and reptile historical surveys are shown side by side by shared river area and month.'}</p></header>
      <section className="summary-cards ecology-summary"><div><strong>{comparison.birdSpecies}</strong><span>{zh ? '鳥類物種數' : 'Bird species'}</span></div><div><strong>{comparison.reptileSpecies}</strong><span>{zh ? '爬蟲物種數' : 'Reptile species'}</span></div></section>
      <p className="notice subtle">{zh ? '不同類群的調查方法、路線、季節與偵測機率不同；此處僅供歷史物種出現資料的並列閱讀，不可據此比較族群大小、棲地品質或目前可觀察性。' : 'Survey methods, routes, seasons, and detectability differ between taxa. This is a side-by-side reading aid for historical species occurrence, not a comparison of population size, habitat quality, or current observability.'}</p>
      <div className="ecology-comparison-grid">{table(zh ? '依河域' : 'By river area', comparison.byRegion)}{table(zh ? '依月份' : 'By month', comparison.byMonth)}</div>
    </section>
  );
}

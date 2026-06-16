import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  BarChart3,
  ExternalLink,
  Globe2,
  Languages,
  LayoutList,
  MapPinned,
  Navigation,
  Search,
  TableProperties,
  X,
} from 'lucide-react';
import { getTranslation } from './i18n';
import type { Filters, Language, ZooAnimal, ZooAnimalSummary } from './models';
import {
  buildZooAnimalSummary,
  calculateDistanceMeters,
  filterAnimals,
  formatDistance,
  getFilterOptions,
  getOfficialTopicPageUrl,
} from './utils/zooData';
import { assetPath } from './utils/assets';

type Tab = 'map' | 'directory' | 'dashboard' | 'table';
type NearbyRecord = ZooAnimal & { distanceMeters: number };
type MappedAnimal = ZooAnimal & { latitude: number; longitude: number };

const defaultFilters: Filters = {
  search: '',
  exhibitArea: '',
  poiGroup: '',
  conservationStatus: '',
  taxonomicClass: '',
  taxonomicOrder: '',
  taxonomicFamily: '',
  diet: '',
  adoptionFocusOnly: false,
  hasCoordinates: false,
  hasTopicPage: false,
};

const tabIcons = {
  map: MapPinned,
  directory: LayoutList,
  dashboard: BarChart3,
  table: TableProperties,
};

const markerIcon = (animal: ZooAnimal) =>
  L.divIcon({
    className: 'animal-marker',
    html: `<span>${animal.conservationStatus?.includes('危') ? '!' : ''}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

function getMappedAnimals(animals: ZooAnimal[]): MappedAnimal[] {
  return animals.filter(
    (animal): animal is MappedAnimal =>
      animal.coordinateStatus === 'valid' && animal.latitude !== undefined && animal.longitude !== undefined,
  );
}

function useZooData() {
  const [animals, setAnimals] = useState<ZooAnimal[]>([]);
  const [summary, setSummary] = useState<ZooAnimalSummary | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(assetPath('data/zoo-animals.json')).then((response) => response.json() as Promise<ZooAnimal[]>),
      fetch(assetPath('data/zoo-animal-summary.json')).then((response) => response.json() as Promise<ZooAnimalSummary>),
    ])
      .then(([records, summaryData]) => {
        setAnimals(records);
        setSummary(summaryData);
      })
      .catch(() => {
        setAnimals([]);
        setSummary(buildZooAnimalSummary([]));
      });
  }, []);

  return { animals, summary: summary ?? buildZooAnimalSummary(animals) };
}

function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = safeStorageGet('taipei-zoo-guide-language');
    return saved === 'en' ? 'en' : 'zh';
  });
  useEffect(() => {
    safeStorageSet('taipei-zoo-guide-language', language);
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
  }, [language]);
  return [language, setLanguage] as const;
}

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Restricted storage should not block the app.
  }
}

function LanguageToggle({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  return (
    <div className="language-toggle" aria-label="Language">
      <Languages size={17} />
      <button className={language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')}>
        中文
      </button>
      <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
        English
      </button>
    </div>
  );
}

function MainTabs({ activeTab, setActiveTab, language }: { activeTab: Tab; setActiveTab: (tab: Tab) => void; language: Language }) {
  const t = getTranslation(language);
  const labels = { map: t.animalMap, directory: t.animalDirectory, dashboard: t.conservationDashboard, table: t.dataTable };
  return (
    <nav className="tabs" aria-label="Main sections">
      {(Object.keys(labels) as Tab[]).map((tab) => {
        const Icon = tabIcons[tab];
        return (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            <Icon size={18} />
            <span>{labels[tab]}</span>
          </button>
        );
      })}
    </nav>
  );
}

function FilterPanel({
  animals,
  filters,
  setFilters,
  language,
}: {
  animals: ZooAnimal[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  language: Language;
}) {
  const t = getTranslation(language);
  const options = useMemo(() => getFilterOptions(animals), [animals]);
  const update = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const select = (label: string, key: keyof Filters, values: string[]) => (
    <label>
      {label}
      <select value={String(filters[key])} onChange={(event) => update({ [key]: event.target.value })}>
        <option value="">{t.all}</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="filters">
      <label className="search-field">
        <Search size={18} />
        <input
          value={filters.search}
          placeholder={t.searchPlaceholder}
          onChange={(event) => update({ search: event.target.value })}
        />
      </label>
      <div className="filter-grid">
        {select(t.exhibitArea, 'exhibitArea', options.exhibitAreas)}
        {select(t.poiGroup, 'poiGroup', options.poiGroups)}
        {select(t.conservationStatus, 'conservationStatus', options.conservationStatuses)}
        {select(t.taxonomicClass, 'taxonomicClass', options.taxonomicClasses)}
        {select(t.taxonomicOrder, 'taxonomicOrder', options.taxonomicOrders)}
        {select(t.taxonomicFamily, 'taxonomicFamily', options.taxonomicFamilies)}
        {select(t.diet, 'diet', options.diets)}
      </div>
      <div className="toggles">
        <label>
          <input
            type="checkbox"
            checked={filters.adoptionFocusOnly}
            onChange={(event) => update({ adoptionFocusOnly: event.target.checked })}
          />
          {t.adoptionFocusSpecies}
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.hasCoordinates}
            onChange={(event) => update({ hasCoordinates: event.target.checked })}
          />
          {t.hasCoordinates}
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.hasTopicPage}
            onChange={(event) => update({ hasTopicPage: event.target.checked })}
          />
          {t.hasTopicPage}
        </label>
      </div>
    </section>
  );
}

function MapBounds({ animals }: { animals: ZooAnimal[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = getMappedAnimals(animals);
    if (!valid.length) return;
    map.fitBounds(valid.map((animal) => [animal.latitude, animal.longitude] as [number, number]), { padding: [28, 28] });
  }, [animals, map]);
  return null;
}

function clusterAnimals(animals: ZooAnimal[]) {
  const clusters = new Map<string, MappedAnimal[]>();
  for (const animal of getMappedAnimals(animals)) {
    const key = `${animal.latitude.toFixed(3)}:${animal.longitude.toFixed(3)}`;
    clusters.set(key, [...(clusters.get(key) ?? []), animal]);
  }
  return [...clusters.values()];
}

function countMediaReferences(animals: ZooAnimal[]) {
  const withMedia = animals.filter((animal) => animal.media.length).length;
  return {
    withMedia,
    withoutMedia: animals.length - withMedia,
  };
}

function AnimalPopup({
  animal,
  language,
  onSelect,
}: {
  animal: ZooAnimal;
  language: Language;
  onSelect: (animal: ZooAnimal) => void;
}) {
  const t = getTranslation(language);
  const topicUrl = getOfficialTopicPageUrl(animal);
  return (
    <Popup>
      <div className="popup-content">
        <strong>{animal.nameZh}</strong>
        {animal.nameEn && <span>{animal.nameEn}</span>}
        {animal.scientificName && <em>{animal.scientificName}</em>}
        <p>{[animal.exhibitArea, animal.poiGroup, animal.conservationStatus, animal.diet].filter(Boolean).join(' · ')}</p>
        <button onClick={() => onSelect(animal)}>{t.viewDetails}</button>
        {topicUrl && (
          <a href={topicUrl} target="_blank" rel="noreferrer">
            {t.openOfficialPage}
          </a>
        )}
      </div>
    </Popup>
  );
}

function AnimalMarkerLayer({
  animals,
  language,
  onSelect,
}: {
  animals: ZooAnimal[];
  language: Language;
  onSelect: (animal: ZooAnimal) => void;
}) {
  return (
    <>
      {clusterAnimals(animals).map((cluster) => {
        const first = cluster[0];
        if (cluster.length > 1) {
          return (
            <CircleMarker
              key={cluster.map((animal) => animal.id).join('-')}
              center={[first.latitude, first.longitude]}
              radius={16 + Math.min(cluster.length * 2, 14)}
              pathOptions={{ color: '#166534', fillColor: '#f2c94c', fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                <div className="popup-content">
                  <strong>{cluster.length} records</strong>
                  {cluster.slice(0, 8).map((animal) => (
                    <button key={animal.id} onClick={() => onSelect(animal)}>
                      {animal.nameZh}
                    </button>
                  ))}
                </div>
              </Popup>
            </CircleMarker>
          );
        }
        return (
          <Marker key={first.id} position={[first.latitude, first.longitude]} icon={markerIcon(first)}>
            <AnimalPopup animal={first} language={language} onSelect={onSelect} />
          </Marker>
        );
      })}
    </>
  );
}

function NearbyAnimals({ animals, language, onSelect }: { animals: ZooAnimal[]; language: Language; onSelect: (animal: ZooAnimal) => void }) {
  const t = getTranslation(language);
  const [nearby, setNearby] = useState<NearbyRecord[]>([]);
  const [message, setMessage] = useState('');

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const valid = getMappedAnimals(animals);
        const distances = valid
          .map((animal) => ({
            ...animal,
            distanceMeters: calculateDistanceMeters(coords.latitude, coords.longitude, animal.latitude, animal.longitude),
          }))
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .slice(0, 5);
        setNearby(distances);
        setMessage(distances[0] && distances[0].distanceMeters > 2500 ? t.awayFromZoo : '');
      },
      () => setMessage(t.awayFromZoo),
    );
  };

  return (
    <section className="nearby">
      <button className="primary-button" onClick={locate}>
        <Navigation size={17} />
        {t.showNearbyAnimals}
      </button>
      {message && <p className="notice subtle">{message}</p>}
      {!!nearby.length && (
        <div>
          <h3>{t.nearbyAnimals}</h3>
          {nearby.map((animal) => (
            <button key={animal.id} onClick={() => onSelect(animal)}>
              {animal.nameZh} · {formatDistance(animal.distanceMeters, language)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function AnimalMap({ animals, language, onSelect }: { animals: ZooAnimal[]; language: Language; onSelect: (animal: ZooAnimal) => void }) {
  const t = getTranslation(language);
  return (
    <section className="map-section">
      <div className="map-shell">
        <MapContainer center={[24.9985, 121.582]} zoom={16} minZoom={14} scrollWheelZoom className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds animals={animals} />
          <AnimalMarkerLayer animals={animals} language={language} onSelect={onSelect} />
        </MapContainer>
      </div>
      <p className="notice">{t.coordinateNotice}</p>
      <NearbyAnimals animals={animals} language={language} onSelect={onSelect} />
    </section>
  );
}

function AnimalCard({ animal, language, onSelect }: { animal: ZooAnimal; language: Language; onSelect: (animal: ZooAnimal) => void }) {
  const t = getTranslation(language);
  return (
    <article className="animal-card">
      <div>
        <p className="eyebrow">{[animal.exhibitArea, animal.conservationStatus].filter(Boolean).join(' · ')}</p>
        <h3>{animal.nameZh}</h3>
        {animal.nameEn && <p>{animal.nameEn}</p>}
        {animal.scientificName && <em>{animal.scientificName}</em>}
      </div>
      <p>{animal.summary}</p>
      <div className="tags">
        {[animal.taxonomy.className, animal.diet, animal.poiGroup].filter(Boolean).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <button onClick={() => onSelect(animal)}>{t.viewDetails}</button>
    </article>
  );
}

function AnimalDirectory({ animals, language, onSelect }: { animals: ZooAnimal[]; language: Language; onSelect: (animal: ZooAnimal) => void }) {
  return (
    <section className="directory-grid">
      {animals.map((animal) => (
        <AnimalCard key={animal.id} animal={animal} language={language} onSelect={onSelect} />
      ))}
    </section>
  );
}

function MediaLinks({ animal, language }: { animal: ZooAnimal; language: Language }) {
  const t = getTranslation(language);
  if (!animal.media.length) return null;
  return (
    <section>
      <h3>{t.mediaLinks}</h3>
      <p className="notice subtle">{t.mediaLicenseNotice}</p>
      <div className="media-list">
        {animal.media.map((item) => (
          <a key={`${item.type}-${item.url}`} href={item.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            {item.description || `${item.type} · ${t.sourceLinkedOnly}`}
          </a>
        ))}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AnimalDetailPage({
  animal,
  language,
  onClose,
}: {
  animal: ZooAnimal;
  language: Language;
  onClose: () => void;
}) {
  const t = getTranslation(language);
  const topicUrl = getOfficialTopicPageUrl(animal);
  return (
    <aside className="detail-panel" aria-label={animal.nameZh}>
      <button className="icon-button close" onClick={onClose} aria-label="Close">
        <X size={20} />
      </button>
      <p className="eyebrow">{animal.exhibitArea} · {animal.poiGroup}</p>
      <h2>{animal.nameZh}</h2>
      {animal.nameEn && <p className="latin">{animal.nameEn}</p>}
      {animal.scientificName && <em>{animal.scientificName}</em>}
      <p>{animal.summary}</p>
      {topicUrl && (
        <a className="primary-link" href={topicUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={17} />
          {t.openOfficialPage}
        </a>
      )}
      <dl>
        <DetailRow label={t.alias} value={animal.alias} />
        <DetailRow label={t.conservationStatus} value={animal.conservationStatus} />
        <DetailRow label={t.taxonomicClass} value={animal.taxonomy.className} />
        <DetailRow label={t.taxonomicOrder} value={animal.taxonomy.orderName} />
        <DetailRow label={t.taxonomicFamily} value={animal.taxonomy.familyName} />
        <DetailRow label={t.geographicDistribution} value={animal.geographicDistribution} />
        <DetailRow label={t.habitat} value={animal.habitat} />
        <DetailRow label={t.morphology} value={animal.morphology} />
        <DetailRow label={t.behavior} value={animal.behavior} />
        <DetailRow label={t.diet} value={animal.diet} />
        <DetailRow label={t.threats} value={animal.threats} />
        <DetailRow label={t.interpretation} value={animal.interpretation} />
      </dl>
      <MediaLinks animal={animal} language={language} />
    </aside>
  );
}

function SummaryCards({ summary, language }: { summary: ZooAnimalSummary; language: Language }) {
  const t = getTranslation(language);
  const cards = [
    [t.totalAnimalRecords, summary.total],
    [t.exhibitAreaCount, summary.byExhibitArea.length],
    [t.conservationCategoryCount, summary.byConservationStatus.length],
    [t.adoptionFocusSpecies, summary.adoptionFocusSpeciesCount],
    [t.recordsWithCoordinates, summary.withCoordinatesCount],
    [t.recordsWithTopicPage, summary.withTopicPageCount],
  ];
  return (
    <section className="summary-cards">
      {cards.map(([label, value]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}

function BarList({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section className="chart-block">
      <h3>{title}</h3>
      {rows.slice(0, 8).map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
          <b>{row.count}</b>
        </div>
      ))}
    </section>
  );
}

function ConservationDashboard({ summary, animals, language, onSelect }: { summary: ZooAnimalSummary; animals: ZooAnimal[]; language: Language; onSelect: (animal: ZooAnimal) => void }) {
  const t = getTranslation(language);
  const mediaReferences = countMediaReferences(animals);
  return (
    <section className="dashboard">
      <SummaryCards summary={summary} language={language} />
      <div className="chart-grid">
        <BarList title={t.animalsByExhibitArea} rows={summary.byExhibitArea.map((row) => ({ label: row.exhibitArea, count: row.count }))} />
        <BarList title={t.animalsByPoiGroup} rows={summary.byPoiGroup.map((row) => ({ label: row.poiGroup, count: row.count }))} />
        <BarList title={t.animalsByConservationStatus} rows={summary.byConservationStatus.map((row) => ({ label: row.conservationStatus, count: row.count }))} />
        <BarList title={t.animalsByTaxonomicClass} rows={summary.byTaxonomicClass.map((row) => ({ label: row.className, count: row.count }))} />
        <BarList title={t.animalsByDiet} rows={summary.byDiet.map((row) => ({ label: row.diet, count: row.count }))} />
        <BarList
          title={language === 'zh' ? '有 / 無媒體參照資料筆數' : 'Records with / without media references'}
          rows={[
            { label: language === 'zh' ? '有媒體參照' : 'With media references', count: mediaReferences.withMedia },
            { label: language === 'zh' ? '無媒體參照' : 'Without media references', count: mediaReferences.withoutMedia },
          ]}
        />
      </div>
      <section className="focus-list">
        <h3>{t.adoptionFocusSpecies}</h3>
        {animals.filter((animal) => animal.isAdoptionFocusSpecies).map((animal) => (
          <button key={animal.id} onClick={() => onSelect(animal)}>
            {animal.nameZh} · {animal.exhibitArea}
          </button>
        ))}
      </section>
    </section>
  );
}

function DataTable({ animals, language, onSelect }: { animals: ZooAnimal[]; language: Language; onSelect: (animal: ZooAnimal) => void }) {
  const t = getTranslation(language);
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.chineseName}</th>
            <th>{t.englishName}</th>
            <th>{t.exhibitArea}</th>
            <th>{t.poiGroup}</th>
            <th>{t.conservationStatus}</th>
            <th>{t.hasCoordinates}</th>
          </tr>
        </thead>
        <tbody>
          {animals.map((animal) => (
            <tr key={animal.id} onClick={() => onSelect(animal)}>
              <td>{animal.nameZh}</td>
              <td>{animal.nameEn}</td>
              <td>{animal.exhibitArea}</td>
              <td>{animal.poiGroup}</td>
              <td>{animal.conservationStatus}</td>
              <td>{animal.coordinateStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DisclaimerNotice({ language }: { language: Language }) {
  const t = getTranslation(language);
  return (
    <div className="disclaimers">
      <p>{t.mediaLicenseNotice}</p>
      <p>{t.dataDisclaimer}</p>
    </div>
  );
}

function Footer({ language }: { language: Language }) {
  const t = getTranslation(language);
  return (
    <footer>
      <Globe2 size={17} />
      <span>{t.footer}</span>
    </footer>
  );
}

export default function App() {
  const { animals, summary } = useZooData();
  const [language, setLanguage] = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedAnimal, setSelectedAnimal] = useState<ZooAnimal | null>(null);
  const t = getTranslation(language);
  const filteredAnimals = useMemo(() => filterAnimals(animals, filters), [animals, filters]);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Taipei Zoo Open Data</p>
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
        <LanguageToggle language={language} setLanguage={setLanguage} />
      </header>

      <main>
        <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} language={language} />
        <FilterPanel animals={animals} filters={filters} setFilters={setFilters} language={language} />
        <div className="result-line">
          <strong>{filteredAnimals.length}</strong>
          <span>{language === 'zh' ? '筆符合篩選的資料' : 'filtered records'}</span>
        </div>
        {activeTab === 'map' && <AnimalMap animals={filteredAnimals} language={language} onSelect={setSelectedAnimal} />}
        {activeTab === 'directory' && <AnimalDirectory animals={filteredAnimals} language={language} onSelect={setSelectedAnimal} />}
        {activeTab === 'dashboard' && (
          <ConservationDashboard summary={summary} animals={animals} language={language} onSelect={setSelectedAnimal} />
        )}
        {activeTab === 'table' && <DataTable animals={filteredAnimals} language={language} onSelect={setSelectedAnimal} />}
        <DisclaimerNotice language={language} />
      </main>

      <Footer language={language} />
      {selectedAnimal && <AnimalDetailPage animal={selectedAnimal} language={language} onClose={() => setSelectedAnimal(null)} />}
    </div>
  );
}

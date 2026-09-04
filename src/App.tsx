import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Globe2,
  Info,
  Languages,
  LayoutList,
  MapPinned,
  Navigation,
  Search,
  Sprout,
  X,
} from 'lucide-react';
import { getTranslation } from './i18n';
import type {
  ExhibitAreaCategory,
  BiodiversitySpeciesClassGroup,
  BiodiversitySurveyMethodCategory,
  Filters,
  Language,
  TaipeiBiodiversitySpeciesSurveyPointRecord,
  TaipeiBiodiversitySpeciesSurveyPointSummary,
  ZooAnimal,
  ZooEvent,
  ZooEventCategory,
  ZooEventStatus,
  ZooExhibitArea,
  ZooGuideSummary,
  ZooPlantRecord,
  RiverfrontBirdObservation,
  RiverfrontReptileObservation,
} from './models';
import { birdSummary } from './utils/riverfrontBirdData';
import { reptileSummary } from './utils/riverfrontReptileData';
import { biodiversitySpeciesLabel } from './utils/biodiversitySpeciesLabels';
import {
  buildZooAnimalSummary,
  calculateDistanceMeters,
  filterAnimals,
  formatDistance,
  getFilterOptions,
  getOfficialTopicPageUrl,
} from './utils/zooData';
import { buildTaipeiBiodiversitySpeciesSurveyPointSummary, buildZooGuideSummary, buildZooPlantSummary, getZooEventStatus } from './utils/zooGuideData';
import { assetPath } from './utils/assets';

type Tab = 'animals' | 'plants' | 'biodiversity' | 'birds' | 'reptiles' | 'exhibits' | 'events' | 'map' | 'overview' | 'notes';
type NavigationGroup = 'zoo' | 'nature' | 'visit' | 'data';
type DatasetKey = 'animals' | 'plants' | 'biodiversity' | 'biodiversitySummary' | 'birds' | 'reptiles' | 'exhibits' | 'events';
type SelectedRecord = ZooAnimal | ZooPlantRecord | TaipeiBiodiversitySpeciesSurveyPointRecord | ZooExhibitArea | ZooEvent | RiverfrontBirdObservation | RiverfrontReptileObservation;
type MapPoint = { id: string; latitude: number; longitude: number };

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
  animals: LayoutList,
  plants: Sprout,
  biodiversity: Globe2,
  birds: Globe2,
  reptiles: Globe2,
  exhibits: BookOpen,
  events: CalendarDays,
  map: MapPinned,
  overview: BarChart3,
  notes: Info,
};

const mapIcon = (kind: 'animal' | 'plant' | 'biodiversity' | 'exhibit' | 'event', paused = false) =>
  L.divIcon({
    className: `guide-marker ${kind}${paused ? ' paused' : ''}`,
    html: `<span>${kind === 'animal' ? 'A' : kind === 'plant' ? 'P' : kind === 'biodiversity' ? 'B' : kind === 'exhibit' ? 'E' : 'D'}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

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
    // Restricted storage should not block the guide.
  }
}

function useLanguage() {
  const [language, setLanguage] = useState<Language>(() =>
    safeStorageGet('taipei-zoo-guide-language') === 'en' ? 'en' : 'zh',
  );
  useEffect(() => {
    safeStorageSet('taipei-zoo-guide-language', language);
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
  }, [language]);
  return [language, setLanguage] as const;
}

async function loadJson<T>(path: string, fallback: T): Promise<T> {
  const response = await fetch(assetPath(path));
  return response.ok ? (response.json() as Promise<T>) : fallback;
}

const tabDatasets: Record<Tab, DatasetKey[]> = {
  animals: ['animals'],
  plants: ['plants'],
  biodiversity: ['biodiversitySummary'],
  birds: ['birds'],
  reptiles: ['reptiles'],
  exhibits: ['animals', 'exhibits'],
  events: ['events'],
  map: ['animals', 'plants', 'exhibits', 'events'],
  overview: ['animals', 'plants', 'biodiversitySummary', 'birds', 'reptiles', 'exhibits', 'events'],
  notes: [],
};

const navigationGroups: Array<{
  id: NavigationGroup;
  labelZh: string;
  labelEn: string;
  Icon: typeof LayoutList;
  tabs: Tab[];
}> = [
  { id: 'zoo', labelZh: '探索動物園', labelEn: 'Explore Zoo', Icon: LayoutList, tabs: ['animals', 'plants', 'exhibits'] },
  { id: 'nature', labelZh: '自然與野生動物', labelEn: 'Nature & Wildlife', Icon: Globe2, tabs: ['biodiversity', 'birds', 'reptiles'] },
  { id: 'visit', labelZh: '規劃參觀', labelEn: 'Plan Your Visit', Icon: MapPinned, tabs: ['map', 'events'] },
  { id: 'data', labelZh: '資料與說明', labelEn: 'Data & Notes', Icon: BarChart3, tabs: ['overview', 'notes'] },
];

function useZooGuideData(activeTab: Tab) {
  const [animals, setAnimals] = useState<ZooAnimal[]>([]);
  const [plants, setPlants] = useState<ZooPlantRecord[]>([]);
  const [biodiversity, setBiodiversity] = useState<TaipeiBiodiversitySpeciesSurveyPointRecord[]>([]);
  const [biodiversitySummary, setBiodiversitySummary] = useState<TaipeiBiodiversitySpeciesSurveyPointSummary | null>(null);
  const [birds, setBirds] = useState<RiverfrontBirdObservation[]>([]);
  const [reptiles, setReptiles] = useState<RiverfrontReptileObservation[]>([]);
  const [exhibitAreas, setExhibitAreas] = useState<ZooExhibitArea[]>([]);
  const [events, setEvents] = useState<ZooEvent[]>([]);
  const [loading, setLoading] = useState<DatasetKey[]>([]);
  const loaded = useRef(new Set<DatasetKey>());
  const requests = useRef(new Map<DatasetKey, Promise<void>>());

  const loadDataset = (dataset: DatasetKey): Promise<void> => {
    if (loaded.current.has(dataset)) return Promise.resolve();
    const pending = requests.current.get(dataset);
    if (pending) return pending;
    setLoading((current) => current.includes(dataset) ? current : [...current, dataset]);
    const request = (async () => {
      if (dataset === 'animals') setAnimals(await loadJson<ZooAnimal[]>('data/zoo-animals.json', []));
      if (dataset === 'plants') setPlants(await loadJson<ZooPlantRecord[]>('data/zoo-plants.json', []));
      if (dataset === 'biodiversity') setBiodiversity(await loadJson<TaipeiBiodiversitySpeciesSurveyPointRecord[]>('data/taipei-biodiversity-species-survey-points.json', []));
      if (dataset === 'biodiversitySummary') setBiodiversitySummary(await loadJson<TaipeiBiodiversitySpeciesSurveyPointSummary | null>('data/taipei-biodiversity-species-survey-point-summary.json', null));
      if (dataset === 'birds') setBirds(await loadJson<RiverfrontBirdObservation[]>('data/riverfront-bird-observations/observations.json', []));
      if (dataset === 'reptiles') setReptiles(await loadJson<RiverfrontReptileObservation[]>('data/riverfront-reptile-observations/observations.json', []));
      if (dataset === 'exhibits') setExhibitAreas(await loadJson<ZooExhibitArea[]>('data/zoo-exhibit-areas.json', []));
      if (dataset === 'events') setEvents((await loadJson<ZooEvent[]>('data/zoo-events.json', [])).map((event) => ({ ...event, eventStatus: getZooEventStatus(event) })));
      loaded.current.add(dataset);
    })().finally(() => {
      requests.current.delete(dataset);
      setLoading((current) => current.filter((item) => item !== dataset));
    });
    requests.current.set(dataset, request);
    return request;
  };

  useEffect(() => {
    void Promise.all(tabDatasets[activeTab].map(loadDataset));
  }, [activeTab]);

  const summary = useMemo(() => buildZooGuideSummary(animals, exhibitAreas, events, plants, biodiversity, birds, reptiles), [animals, exhibitAreas, events, plants, biodiversity, birds, reptiles]);
  return { animals, plants, biodiversity, biodiversitySummary, birds, reptiles, exhibitAreas, events, summary, loading, loadDataset };
}

function LanguageToggle({ language, setLanguage }: { language: Language; setLanguage: (value: Language) => void }) {
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

function GroupedNavigation({ activeTab, setActiveTab, language }: { activeTab: Tab; setActiveTab: (tab: Tab) => void; language: Language }) {
  const t = getTranslation(language);
  const labels = {
    animals: t.animalGuide,
    plants: t.plantGuide,
    biodiversity: t.biodiversity,
    birds: language === 'zh' ? '河濱鳥類' : 'Riverfront Birds',
    reptiles: language === 'zh' ? '河濱爬蟲' : 'Riverfront Reptiles',
    exhibits: t.exhibitAreas,
    events: t.events,
    map: t.map,
    overview: t.dataOverview,
    notes: t.dataNotes,
  };
  const activeGroup = navigationGroups.find((group) => group.tabs.includes(activeTab)) ?? navigationGroups[0];
  return (
    <nav className="navigation" aria-label={language === 'zh' ? '主要導覽' : 'Primary navigation'}>
      <div className="primary-nav">
        {navigationGroups.map((group) => {
          const Icon = group.Icon;
          const isActive = group.id === activeGroup.id;
          return <button key={group.id} className={isActive ? 'active' : ''} onClick={() => setActiveTab(group.tabs[0])} aria-current={isActive ? 'page' : undefined}>
            <Icon size={18} /><span>{language === 'zh' ? group.labelZh : group.labelEn}</span>
          </button>;
        })}
      </div>
      <div
        className={`tabs secondary-tabs tab-count-${activeGroup.tabs.length}`}
        aria-label={language === 'zh' ? `${activeGroup.labelZh} 分頁` : `${activeGroup.labelEn} sections`}
      >
      {activeGroup.tabs.map((tab) => {
        const Icon = tabIcons[tab];
        return (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            <Icon size={18} />
            <span>{labels[tab]}</span>
          </button>
        );
      })}
      </div>
    </nav>
  );
}

function GlobalSearch({ value, onChange, language }: { value: string; onChange: (value: string) => void; language: Language }) {
  const t = getTranslation(language);
  return (
    <label className="search-field global-search">
      <Search size={18} />
      <input value={value} placeholder={t.searchPlaceholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ResultLine({ count, language }: { count: number; language: Language }) {
  const t = getTranslation(language);
  return (
    <div className="result-line">
      <strong>{count}</strong>
      <span>{t.filteredRecords}</span>
    </div>
  );
}

function EmptyState({ language }: { language: Language }) {
  return <p className="empty-state">{getTranslation(language).noRecords}</p>;
}

function LoadingState({ language }: { language: Language }) {
  return <p className="empty-state" role="status">{language === 'zh' ? '正在載入此分頁資料…' : 'Loading this section’s data…'}</p>;
}

function AnimalFilters({
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
      <div className="filter-grid compact">
        {select(t.exhibitArea, 'exhibitArea', options.exhibitAreas)}
        {select(t.conservationStatus, 'conservationStatus', options.conservationStatuses)}
        {select(t.taxonomicClass, 'taxonomicClass', options.taxonomicClasses)}
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

function AnimalCard({ animal, language, onSelect }: { animal: ZooAnimal; language: Language; onSelect: () => void }) {
  const t = getTranslation(language);
  return (
    <article className="animal-card">
      <div>
        <p className="eyebrow">{[animal.exhibitArea, animal.conservationStatus].filter(Boolean).join(' · ')}</p>
        <h3>{animal.nameZh}</h3>
        {animal.nameEn && <p>{animal.nameEn}</p>}
        {animal.scientificName && <em>{animal.scientificName}</em>}
      </div>
      {animal.summary && <p>{animal.summary}</p>}
      <div className="tags">
        {[animal.taxonomy.className, animal.diet, animal.poiGroup].filter(Boolean).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <button onClick={onSelect}>{t.viewDetails}</button>
    </article>
  );
}

function AnimalGuide({
  animals,
  filters,
  setFilters,
  language,
  onSelect,
}: {
  animals: ZooAnimal[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  language: Language;
  onSelect: (animal: ZooAnimal) => void;
}) {
  const filtered = useMemo(() => filterAnimals(animals, filters), [animals, filters]);
  return (
    <>
      <AnimalFilters animals={animals} filters={filters} setFilters={setFilters} language={language} />
      <ResultLine count={filtered.length} language={language} />
      {filtered.length ? (
        <section className="directory-grid">
          {filtered.map((animal, index) => (
            <AnimalCard key={`${animal.id}-${index}`} animal={animal} language={language} onSelect={() => onSelect(animal)} />
          ))}
        </section>
      ) : (
        <EmptyState language={language} />
      )}
    </>
  );
}

function areaCategoryLabel(category: ExhibitAreaCategory, language: Language): string {
  const t = getTranslation(language);
  return {
    outdoor: t.outdoorArea,
    indoor: t.indoorArea,
    education: t.educationArea,
    special_exhibition: t.specialExhibitionArea,
    other: t.otherArea,
    unknown: t.unknown,
  }[category];
}

function ExhibitGuide({
  areas,
  animals,
  search,
  language,
  onSelect,
}: {
  areas: ZooExhibitArea[];
  animals: ZooAnimal[];
  search: string;
  language: Language;
  onSelect: (area: ZooExhibitArea) => void;
}) {
  const t = getTranslation(language);
  const [category, setCategory] = useState('');
  const [hasMemo, setHasMemo] = useState(false);
  const [hasOfficialLink, setHasOfficialLink] = useState(false);
  const [hasRelatedAnimals, setHasRelatedAnimals] = useState(false);
  const query = search.trim().toLocaleLowerCase();
  const filtered = areas.filter((area) => {
    if (query && ![area.areaName, area.description, area.memo].some((value) => value?.toLocaleLowerCase().includes(query))) return false;
    if (category && area.areaCategory !== category) return false;
    if (hasMemo && !area.memo) return false;
    if (hasOfficialLink && !area.officialUrl) return false;
    if (hasRelatedAnimals && !area.relatedAnimalIds?.length) return false;
    return true;
  });
  const animalById = new Map(animals.map((animal) => [animal.id, animal]));
  return (
    <>
      <header className="section-heading">
        <h2>{t.exhibitAreas}</h2>
        <p>{t.exhibitSubtitle}</p>
      </header>
      <section className="filters">
        <div className="filter-grid compact">
          <label>
            {t.areaCategory}
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{t.all}</option>
              {['outdoor', 'indoor', 'education', 'special_exhibition', 'other'].map((value) => (
                <option key={value} value={value}>
                  {areaCategoryLabel(value as ExhibitAreaCategory, language)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="toggles">
          <label><input type="checkbox" checked={hasMemo} onChange={(event) => setHasMemo(event.target.checked)} />{t.hasMemo}</label>
          <label><input type="checkbox" checked={hasOfficialLink} onChange={(event) => setHasOfficialLink(event.target.checked)} />{t.hasTopicPage}</label>
          <label><input type="checkbox" checked={hasRelatedAnimals} onChange={(event) => setHasRelatedAnimals(event.target.checked)} />{t.hasRelatedAnimals}</label>
        </div>
      </section>
      <ResultLine count={filtered.length} language={language} />
      {filtered.length ? (
        <section className="directory-grid">
          {filtered.map((area) => (
            <article className="animal-card exhibit-card" key={area.id}>
              <div>
                <p className="eyebrow">{areaCategoryLabel(area.areaCategory, language)}</p>
                <h3>{area.areaName}</h3>
              </div>
              <p>{area.description}</p>
              {area.memo && <p className="notice subtle">{area.memo}</p>}
              <div className="tags">
                <span>{area.relatedAnimalIds?.length ?? 0} {t.relatedAnimalCount}</span>
                {area.relatedAnimalIds?.slice(0, 3).map((id) => animalById.get(id)?.nameZh).filter(Boolean).map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
              <button onClick={() => onSelect(area)}>{t.viewDetails}</button>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState language={language} />
      )}
    </>
  );
}

function eventCategoryLabel(category: ZooEventCategory, language: Language): string {
  const t = getTranslation(language);
  return {
    scheduled_course: t.scheduledCourse,
    keeper_talk: t.keeperTalk,
    education_station: t.educationStation,
    special_exhibition: t.specialExhibition,
    paused_or_cancelled: t.pausedOrCancelled,
    other: language === 'zh' ? '其他活動' : 'Other',
    unknown: t.unknown,
  }[category];
}

function eventStatusLabel(status: ZooEventStatus, language: Language): string {
  const t = getTranslation(language);
  return {
    upcoming: t.upcoming,
    ongoing: t.ongoing,
    past: t.past,
    cancelled_or_paused: t.pausedOrCancelled,
    unknown: t.unknown,
  }[status];
}

function EventGuide({
  events,
  search,
  language,
  onSelect,
}: {
  events: ZooEvent[];
  search: string;
  language: Language;
  onSelect: (event: ZooEvent) => void;
}) {
  const t = getTranslation(language);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [location, setLocation] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPaused, setShowPaused] = useState(false);
  const [hasOfficialLink, setHasOfficialLink] = useState(false);
  const [hasCoordinate, setHasCoordinate] = useState(false);
  const months = [...new Set(events.map((event) => event.startDate?.slice(0, 7)).filter(Boolean))].sort() as string[];
  const locations = [...new Set(events.map((event) => event.locationName).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'zh-Hant'),
  ) as string[];
  const query = search.trim().toLocaleLowerCase();
  const filtered = events
    .filter((event) => {
      const searchable = [event.title, event.summary, event.brief, event.locationName, event.keywords.join(' ')];
      if (query && !searchable.some((value) => value?.toLocaleLowerCase().includes(query))) return false;
      if (category && event.eventCategory !== category) return false;
      if (status && event.eventStatus !== status) return false;
      if (month && event.startDate?.slice(0, 7) !== month) return false;
      if (location && event.locationName !== location) return false;
      if (dateFrom && (!event.endDate || event.endDate < dateFrom)) return false;
      if (dateTo && (!event.startDate || event.startDate > dateTo)) return false;
      if (!showPaused && event.eventStatus === 'cancelled_or_paused') return false;
      if (hasOfficialLink && !event.officialUrl) return false;
      if (hasCoordinate && event.coordinateStatus !== 'valid') return false;
      return true;
    })
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? '') || a.title.localeCompare(b.title, 'zh-Hant'));

  return (
    <>
      <header className="section-heading">
        <h2>{t.events}</h2>
        <p>{t.eventsSubtitle}</p>
      </header>
      <section className="filters">
        <div className="filter-grid event-filters">
          <label>{t.eventCategory}<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t.all}</option>{['scheduled_course', 'keeper_talk', 'education_station', 'special_exhibition', 'paused_or_cancelled'].map((value) => <option key={value} value={value}>{eventCategoryLabel(value as ZooEventCategory, language)}</option>)}</select></label>
          <label>{t.eventStatus}<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t.all}</option>{['upcoming', 'ongoing', 'past', 'cancelled_or_paused', 'unknown'].map((value) => <option key={value} value={value}>{eventStatusLabel(value as ZooEventStatus, language)}</option>)}</select></label>
          <label>{t.month}<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">{t.all}</option>{months.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>{t.eventLocation}<select value={location} onChange={(event) => setLocation(event.target.value)}><option value="">{t.all}</option>{locations.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>{t.startDate}<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label>{t.endDate}<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
        </div>
        <div className="toggles">
          <label><input type="checkbox" checked={showPaused} onChange={(event) => setShowPaused(event.target.checked)} />{t.showPausedOrCancelled}</label>
          <label><input type="checkbox" checked={hasOfficialLink} onChange={(event) => setHasOfficialLink(event.target.checked)} />{t.hasTopicPage}</label>
          <label><input type="checkbox" checked={hasCoordinate} onChange={(event) => setHasCoordinate(event.target.checked)} />{t.hasCoordinates}</label>
        </div>
      </section>
      <ResultLine count={filtered.length} language={language} />
      <p className="notice subtle">{t.zooEventNotice}</p>
      {filtered.length ? (
        <section className="event-list">
          {filtered.map((event) => (
            <article className={`event-row status-${event.eventStatus}`} key={event.id}>
              <div className="event-date">
                <strong>{event.startDate?.slice(8) ?? '--'}</strong>
                <span>{event.startDate?.slice(0, 7) ?? t.unknown}</span>
              </div>
              <div className="event-copy">
                <p className="eyebrow">{eventCategoryLabel(event.eventCategory, language)}</p>
                <h3>{event.title}</h3>
                <p>{[event.startDate, event.endDate, event.timeText, event.locationName].filter(Boolean).join(' · ')}</p>
                {event.brief && <p>{event.brief}</p>}
                <div className="tags"><span>{eventStatusLabel(event.eventStatus, language)}</span>{event.keywords.slice(0, 4).map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
              </div>
              <button onClick={() => onSelect(event)}>{t.viewDetails}</button>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState language={language} />
      )}
    </>
  );
}

function sortedUnique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

function PlantGuide({
  plants,
  search,
  language,
  onSelect,
}: {
  plants: ZooPlantRecord[];
  search: string;
  language: Language;
  onSelect: (plant: ZooPlantRecord) => void;
}) {
  const t = getTranslation(language);
  const [family, setFamily] = useState('');
  const [genus, setGenus] = useState('');
  const [location, setLocation] = useState('');
  const [hasScientificName, setHasScientificName] = useState(false);
  const [hasCoordinates, setHasCoordinates] = useState(false);
  const [hasFeatures, setHasFeatures] = useState(false);
  const [hasUse, setHasUse] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const families = sortedUnique(plants.map((plant) => plant.familyRaw));
  const genera = sortedUnique(plants.map((plant) => plant.genusRaw));
  const locations = sortedUnique(plants.flatMap((plant) => plant.locationAreas));
  const query = search.trim().toLocaleLowerCase();
  const filtered = plants.filter((plant) => {
    const searchable = [
      plant.chineseName,
      plant.englishName,
      plant.scientificName,
      plant.familyRaw,
      plant.genusRaw,
      plant.locationRaw,
      plant.brief,
      plant.features,
      plant.keywords.join(' '),
      plant.alsoKnown.join(' '),
    ];
    if (query && !searchable.some((value) => value?.toLocaleLowerCase().includes(query))) return false;
    if (family && plant.familyRaw !== family) return false;
    if (genus && plant.genusRaw !== genus) return false;
    if (location && !plant.locationAreas.includes(location)) return false;
    if (hasScientificName && !plant.scientificName) return false;
    if (hasCoordinates && plant.coordinateStatus !== 'valid') return false;
    if (hasFeatures && !plant.features) return false;
    if (hasUse && !plant.functionAndApplication) return false;
    if (hasMedia && !plant.mediaReferences.length) return false;
    return true;
  });
  const summary = buildZooPlantSummary(filtered);
  const firstBySpecies = new Map(summary.species.map((species) => [species.speciesKey, filtered.find((plant) => plant.scientificName === species.scientificName || plant.chineseName === species.chineseName)]));
  return (
    <>
      <header className="section-heading">
        <h2>{t.plantGuide}</h2>
        <p>{t.plantSubtitle}</p>
      </header>
      <section className="filters">
        <div className="filter-grid compact">
          <label>{t.plantFamily}<select value={family} onChange={(event) => setFamily(event.target.value)}><option value="">{t.all}</option>{families.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>{t.plantGenus}<select value={genus} onChange={(event) => setGenus(event.target.value)}><option value="">{t.all}</option>{genera.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>{t.plantLocation}<select value={location} onChange={(event) => setLocation(event.target.value)}><option value="">{t.all}</option>{locations.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="toggles">
          <label><input type="checkbox" checked={hasScientificName} onChange={(event) => setHasScientificName(event.target.checked)} />{t.hasScientificName}</label>
          <label><input type="checkbox" checked={hasCoordinates} onChange={(event) => setHasCoordinates(event.target.checked)} />{t.hasCoordinates}</label>
          <label><input type="checkbox" checked={hasFeatures} onChange={(event) => setHasFeatures(event.target.checked)} />{t.hasPlantFeatures}</label>
          <label><input type="checkbox" checked={hasUse} onChange={(event) => setHasUse(event.target.checked)} />{t.hasPlantUse}</label>
          <label><input type="checkbox" checked={hasMedia} onChange={(event) => setHasMedia(event.target.checked)} />{t.hasMediaReference}</label>
        </div>
      </section>
      <ResultLine count={filtered.length} language={language} />
      <p className="notice subtle">{t.plantDatasetNotice}</p>
      {summary.species.length ? (
        <>
          <section className="directory-grid">
            {summary.species.map((species) => {
              const plant = firstBySpecies.get(species.speciesKey);
              return (
                <article className="animal-card plant-card" key={species.speciesKey}>
                  <div>
                    <p className="eyebrow">{[species.familyChinese, species.genusChinese].filter(Boolean).join(' · ')}</p>
                    <h3>{species.chineseName}</h3>
                    {species.englishName && <p>{species.englishName}</p>}
                    {species.scientificName && <em>{species.scientificName}</em>}
                  </div>
                  <div className="tags">
                    <span>{species.recordCount} {t.plantRecordUnit}</span>
                    <span>{species.coordinateCount} {t.coordinatePointUnit}</span>
                    {species.locationAreas.slice(0, 3).map((area) => <span key={area}>{area}</span>)}
                  </div>
                  {plant && <button onClick={() => onSelect(plant)}>{t.viewDetails}</button>}
                </article>
              );
            })}
          </section>
          <div className="chart-grid">
            <BarList title={t.plantsByFamily} rows={summary.byFamily.map((row) => ({ label: row.familyRaw, count: row.uniquePlantCount }))} />
            <BarList title={t.plantsByGenus} rows={summary.byGenus.map((row) => ({ label: row.genusRaw, count: row.uniquePlantCount }))} />
            <BarList title={t.plantsByLocation} rows={summary.byLocationArea.map((row) => ({ label: row.locationArea, count: row.uniquePlantCount }))} />
          </div>
        </>
      ) : (
        <EmptyState language={language} />
      )}
    </>
  );
}

function speciesClassGroupLabel(group: BiodiversitySpeciesClassGroup, language: Language) {
  const t = getTranslation(language);
  return {
    bird: t.bird,
    mammal: t.mammal,
    reptile: t.reptile,
    amphibian: t.amphibian,
    fish: t.fish,
    insect: t.insect,
    arachnid: t.arachnid,
    crustacean: t.crustacean,
    mollusk: t.mollusk,
    plant: t.plant,
    fungus: t.fungus,
    other: t.other,
    unknown: t.unknown,
  }[group];
}

function surveyMethodCategoryLabel(category: BiodiversitySurveyMethodCategory, language: Language) {
  const t = getTranslation(language);
  return {
    visual_observation: t.visualObservation,
    transect: t.transect,
    point_count: t.pointCount,
    trap: t.trap,
    netting: t.netting,
    audio: t.audio,
    camera: t.camera,
    literature_or_record: t.literatureOrRecord,
    other: t.other,
    unknown: t.unknown,
  }[category];
}

function BiodiversityGuide({
  records,
  datasetSummary,
  search,
  language,
  onLoadDetails,
  isLoadingDetails,
  onSelect,
}: {
  records: TaipeiBiodiversitySpeciesSurveyPointRecord[];
  datasetSummary: TaipeiBiodiversitySpeciesSurveyPointSummary | null;
  search: string;
  language: Language;
  onLoadDetails: () => void;
  isLoadingDetails: boolean;
  onSelect: (record: TaipeiBiodiversitySpeciesSurveyPointRecord) => void;
}) {
  const t = getTranslation(language);
  const [year, setYear] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [method, setMethod] = useState('');
  const [withinTaipei, setWithinTaipei] = useState(false);
  const [nearZoo, setNearZoo] = useState(false);
  const hasDetails = records.length > 0;
  const years = hasDetails ? sortedUnique(records.map((record) => record.surveyYear?.toString())) : datasetSummary?.bySurveyYear.map((row) => String(row.surveyYear)) ?? [];
  const classGroups = hasDetails ? sortedUnique(records.map((record) => record.speciesClassGroup)) : datasetSummary?.bySpeciesClassGroup.map((row) => row.speciesClassGroup) ?? [];
  const methods = hasDetails ? sortedUnique(records.map((record) => record.surveyMethodCategory)) : datasetSummary?.bySurveyMethodCategory.map((row) => row.surveyMethodCategory) ?? [];
  const query = search.trim().toLocaleLowerCase();
  const filtered = records.filter((record) => {
    const searchable = [record.speciesName, record.speciesClass, record.surveyMethod, record.surveyYear?.toString(), record.resourceName];
    if (query && !searchable.some((value) => value?.toLocaleLowerCase().includes(query))) return false;
    if (year && record.surveyYear?.toString() !== year) return false;
    if (classGroup && record.speciesClassGroup !== classGroup) return false;
    if (method && record.surveyMethodCategory !== method) return false;
    if (withinTaipei && !record.isWithinTaipeiBounds) return false;
    if (nearZoo && !record.isNearZooArea) return false;
    return true;
  });
  const summary = hasDetails ? buildTaipeiBiodiversitySpeciesSurveyPointSummary(filtered) : datasetSummary ?? buildTaipeiBiodiversitySpeciesSurveyPointSummary([]);
  const cards = [
    [t.surveyRecordCount, summary.totalRecords],
    [t.surveyYearRange, summary.minSurveyYear && summary.maxSurveyYear ? `${summary.minSurveyYear}-${summary.maxSurveyYear}` : t.unknown],
    [t.latestSurveyYear, summary.latestSurveyYear ?? t.unknown],
    [t.uniqueSpeciesCount, summary.uniqueSpeciesNameCount],
    [t.recordsWithinTaipeiBounds, summary.recordsWithinTaipeiBounds],
    [t.recordsNearTaipeiZooArea, summary.recordsNearZooArea],
  ];
  return (
    <>
      <header className="section-heading">
        <h2>{t.taipeiBiodiversitySpeciesSurveyPoints}</h2>
        <p>{t.biodiversitySubtitle}</p>
      </header>
      {hasDetails ? <section className="filters">
        <div className="filter-grid compact">
          <label>{t.surveyYear}<select value={year} onChange={(event) => setYear(event.target.value)}><option value="">{t.all}</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>{t.speciesClassGroup}<select value={classGroup} onChange={(event) => setClassGroup(event.target.value)}><option value="">{t.all}</option>{classGroups.map((value) => <option key={value} value={value}>{speciesClassGroupLabel(value as BiodiversitySpeciesClassGroup, language)}</option>)}</select></label>
          <label>{t.surveyMethodCategory}<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="">{t.all}</option>{methods.map((value) => <option key={value} value={value}>{surveyMethodCategoryLabel(value as BiodiversitySurveyMethodCategory, language)}</option>)}</select></label>
        </div>
        <div className="toggles">
          <label><input type="checkbox" checked={withinTaipei} onChange={(event) => setWithinTaipei(event.target.checked)} />{t.withinTaipeiBounds}</label>
          <label><input type="checkbox" checked={nearZoo} onChange={(event) => setNearZoo(event.target.checked)} />{t.nearTaipeiZooArea}</label>
        </div>
      </section>
      : <section className="notice biodiversity-details-prompt">
        <p>{language === 'zh' ? '概覽與圖表使用輕量摘要載入。若要搜尋、篩選或查看逐筆調查資料，才需下載完整的 72,286 筆紀錄（約 113 MB）。' : 'The overview and charts load from a lightweight summary. Search, filters, and individual survey records require the full 72,286-record download (about 113 MB).'}</p>
        <button className="primary-button" onClick={onLoadDetails} disabled={isLoadingDetails}>{isLoadingDetails ? (language === 'zh' ? '正在載入詳細紀錄…' : 'Loading detailed records…') : (language === 'zh' ? '載入詳細紀錄' : 'Load detailed records')}</button>
      </section>}
      <ResultLine count={hasDetails ? filtered.length : summary.totalRecords} language={language} />
      <p className="notice subtle">{t.biodiversityMapNotice}</p>
      <section className="summary-cards">{cards.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
      <div className="chart-grid">
        <BarList title={t.speciesClasses} rows={summary.bySpeciesClassGroup.map((row) => ({ label: speciesClassGroupLabel(row.speciesClassGroup, language), count: row.recordCount }))} />
        <BarList title={t.surveyMethods} rows={summary.bySurveyMethodCategory.map((row) => ({ label: surveyMethodCategoryLabel(row.surveyMethodCategory, language), count: row.recordCount }))} />
        <BarList title={t.yearlyTrends} rows={summary.bySurveyYear.map((row) => ({ label: String(row.surveyYear), count: row.recordCount }))} />
        <BarList title={t.mostRecordedSpecies} rows={summary.topSpeciesByRecordCount.map((row, index) => ({ id: `${row.speciesName}-${index}`, label: biodiversitySpeciesLabel(row.speciesName, language), count: row.recordCount }))} />
      </div>
      <p className="notice subtle">{t.biodiversityChartNotice}</p>
      {hasDetails && <div className="table-wrap biodiversity-table">
        <table>
          <thead><tr><th>{t.surveyDate}</th><th>{t.speciesClass}</th><th>{t.speciesName}</th><th>{t.observationCount}</th><th>{t.surveyMethod}</th><th>{t.coordinateUncertainty}</th><th>{t.resourceYear}</th></tr></thead>
          <tbody>{filtered.slice(0, 100).map((record) => (
            <tr key={record.id} onClick={() => onSelect(record)}>
              <td>{record.surveyDate}</td><td>{record.speciesClass}</td><td>{record.speciesName}</td><td>{record.observationCount}</td><td>{record.surveyMethod}</td><td>{record.coordinateUncertaintyRaw}</td><td>{record.resourceYear}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      }
      <p className="notice subtle">{t.biodiversityZooExhibitDistinctionNote}</p>
      <p className="notice subtle">{t.wildlifeRespectNote}</p>
    </>
  );
}

function RiverfrontBirdGuide({ records, search, language, onSelect }: { records: RiverfrontBirdObservation[]; search: string; language: Language; onSelect: (record: RiverfrontBirdObservation) => void }) {
  const [region, setRegion] = useState(''); const [month, setMonth] = useState(''); const [status, setStatus] = useState(''); const [endemic, setEndemic] = useState(false); const [alien, setAlien] = useState(false);
  const query = search.trim().toLowerCase();
  const filtered = records.filter(r => (!query || [r.commonNameZh,r.scientificName,r.familyName,r.region,r.statusRaw].some(v=>v.toLowerCase().includes(query))) && (!region || r.region===region) && (!month || String(r.month)===month) && (!status || r.residencyTags.includes(status as never)) && (!endemic || r.endemicType !== 'none') && (!alien || r.isAlienSpecies));
  const summary=birdSummary(filtered); const zh=language==='zh';
  const exportRows = () => { const csv=['Chinese name,Scientific name,Family,Status,Period,Region,Count,Longitude,Latitude', ...filtered.map(r=>[r.commonNameZh,r.scientificName,r.familyName,r.statusRaw,r.observationPeriod,r.region,r.observedCount,r.longitude,r.latitude].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n'); const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); link.download='riverfront-bird-observations.csv'; link.click(); URL.revokeObjectURL(link.href); };
  return <>
    <header className="section-heading bird-heading"><p className="eyebrow">Taipei Nature & Wildlife · historical survey explorer</p><h2>{zh?'河濱鳥類觀察':'Riverfront Bird Observations'}</h2><p>{zh?'探索歷史調查中的鳥種、河域與季節記錄。不是即時目擊、預報或保證可觀察資訊。':'Explore historical bird survey records by species, river area, and season. This is not a real-time sighting service, forecast, or viewing guarantee.'}</p></header>
    <section className="filters bird-filters"><div className="filter-grid compact"><label>{zh?'河域':'River area'}<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">{zh?'全部':'All'}</option>{[...new Set(records.map(r=>r.region))].map(v=><option key={v}>{v}</option>)}</select></label><label>{zh?'月份':'Month'}<select value={month} onChange={e=>setMonth(e.target.value)}><option value="">{zh?'全部':'All'}</option>{Array.from({length:12},(_,i)=>String(i+1)).map(v=><option key={v}>{v}</option>)}</select></label><label>{zh?'遷徙／居留':'Residency'}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{zh?'全部':'All'}</option><option value="resident">{zh?'留鳥':'Resident'}</option><option value="winter_visitor">{zh?'冬候鳥':'Winter visitor'}</option><option value="summer_visitor">{zh?'夏候鳥':'Summer visitor'}</option><option value="passage_migrant">{zh?'過境鳥':'Passage migrant'}</option></select></label></div><div className="toggles"><label><input type="checkbox" checked={endemic} onChange={e=>setEndemic(e.target.checked)}/>{zh?'特有分類':'Endemic taxa'}</label><label><input type="checkbox" checked={alien} onChange={e=>setAlien(e.target.checked)}/>{zh?'外來種標記':'Alien species'}</label><button className="primary-button" onClick={exportRows}>{zh?'匯出篩選 CSV':'Export filtered CSV'}</button></div></section>
    <p className="notice">{zh?'資料為 2012–2015 河濱調查的歷史紀錄；調查路線、頻率與季節會影響比較結果。':'These are historical 2012–2015 riverfront survey records. Routes, timing, and survey effort affect comparisons.'}</p><ResultLine count={filtered.length} language={language}/>
    <section className="summary-cards">{[[zh?'觀察紀錄':'Observation records',summary.records],[zh?'鳥種':'Unique species',summary.species],[zh?'科別':'Bird families',summary.families],[zh?'記錄個體總數':'Summed recorded individuals',summary.individuals],[zh?'有效座標':'Valid coordinates',filtered.filter(r=>r.hasValidCoordinates).length],[zh?'月精度日期':'Month-only dates',filtered.filter(r=>r.datePrecision==='month').length]].map(([label,value])=><div key={String(label)}><strong>{value}</strong><span>{label}</span></div>)}</section>
    <div className="chart-grid"><BarList title={zh?'各河域物種豐富度':'Species richness by river area'} rows={summary.regions.map(r=>({label:r.label,count:r.species}))}/><BarList title={zh?'各月物種豐富度':'Species richness by month'} rows={summary.months.map(r=>({label:r.label,count:r.species}))}/><BarList title={zh?'最多觀察紀錄的鳥種':'Top species by record count'} rows={summary.topByRecords.map(r=>({label:r.label,count:r.records}))}/><BarList title={zh?'記錄個體數最多的鳥種':'Top species by summed count'} rows={summary.topByCount.map(r=>({label:r.label,count:r.count}))}/></div>
    <p className="notice subtle">{zh?'物種豐富度與季節圖表僅反映這份資料在目前篩選下的歷史調查出現情況，並非生物多樣性排名、族群估計或即時棲地品質。':'Richness and seasonal charts reflect historical survey occurrence within the active filters—not a biodiversity ranking, population estimate, or current habitat-quality assessment.'}</p>
    <div className="table-wrap"><table><thead><tr>{[zh?'中文名':'Chinese name',zh?'學名':'Scientific name',zh?'科':'Family',zh?'狀態':'Source status',zh?'觀察期間':'Period',zh?'河域':'Region',zh?'數量':'Count', 'TWD97 X','TWD97 Y','Longitude','Latitude'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{filtered.slice(0,200).map(r=><tr key={r.id} onClick={()=>onSelect(r)}><td>{r.commonNameZh}</td><td><em>{r.scientificName}</em></td><td>{r.familyName}</td><td>{r.statusRaw}</td><td>{r.observationPeriod}{r.datePrecision==='month'?' (month only)':''}</td><td>{r.region}</td><td>{r.observedCount}</td><td>{r.xTwd97Raw}</td><td>{r.yTwd97Raw}</td><td>{r.longitude}</td><td>{r.latitude}</td></tr>)}</tbody></table></div>
  </>;
}

function RiverfrontReptileGuide({ records, search, language, onSelect }: { records: RiverfrontReptileObservation[]; search: string; language: Language; onSelect: (record: RiverfrontReptileObservation) => void }) {
  const zh = language === 'zh';
  const [region, setRegion] = useState(''); const [family, setFamily] = useState(''); const [month, setMonth] = useState(''); const [endemic, setEndemic] = useState(false); const [alien, setAlien] = useState(false);
  const query = search.trim().toLocaleLowerCase();
  const filtered = records.filter((record) => (!query || [record.commonNameZh, record.scientificName, record.familyName, record.group, record.region].some((value) => value.toLocaleLowerCase().includes(query))) && (!region || record.region === region) && (!family || record.familyName === family) && (!month || String(record.month) === month) && (!endemic || record.endemicType !== 'none') && (!alien || record.isAlienSpecies));
  const summary = reptileSummary(filtered);
  const exportCsv = () => { const header = 'ID,Group,Family,Chinese name,Scientific name,Period,Time,Region,Count,Longitude,Latitude'; const body = filtered.map((record) => [record.sourceSequenceNumber, record.group, record.familyName, record.commonNameZh, record.scientificName, record.observationPeriod, record.observationTime, record.region, record.observedCount, record.longitude, record.latitude].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([[header, ...body].join('\n')], { type: 'text/csv' })); link.download = 'riverfront-reptile-observations.csv'; link.click(); URL.revokeObjectURL(link.href); };
  return <>
    <header className="section-heading reptile-heading"><p className="eyebrow">Taipei Nature & Wildlife · historical survey explorer</p><h2>{zh ? '河濱爬蟲觀察' : 'Riverfront Reptile Observations'}</h2><p>{zh ? '探索臺北河濱歷史爬蟲調查紀錄；並非即時目擊、目前分布或保證可觀察資訊。' : 'Explore Taipei riverfront historical reptile survey records. This is not a real-time sighting service, current distribution model, or viewing guarantee.'}</p></header>
    <section className="filters bird-filters"><div className="filter-grid compact"><label>{zh ? '河域' : 'River area'}<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">{zh ? '全部' : 'All'}</option>{[...new Set(records.map((record) => record.region))].map((value) => <option key={value}>{value}</option>)}</select></label><label>{zh ? '科' : 'Family'}<select value={family} onChange={(event) => setFamily(event.target.value)}><option value="">{zh ? '全部' : 'All'}</option>{[...new Set(records.map((record) => record.familyName))].map((value) => <option key={value}>{value}</option>)}</select></label><label>{zh ? '月份' : 'Month'}<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">{zh ? '全部' : 'All'}</option>{Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => <option key={value}>{value}</option>)}</select></label></div><div className="toggles"><label><input type="checkbox" checked={endemic} onChange={(event) => setEndemic(event.target.checked)} />{zh ? '特有分類' : 'Endemic taxa'}</label><label><input type="checkbox" checked={alien} onChange={(event) => setAlien(event.target.checked)} />{zh ? '外來種標記' : 'Alien species'}</label><button className="primary-button" onClick={exportCsv}>{zh ? '匯出篩選 CSV' : 'Export filtered CSV'}</button></div></section>
    <p className="notice">{zh ? '此資料為 2012–2015 年河濱調查紀錄。不同河域、月份與時段的差異可能受調查路線、頻率、可及性與方法影響，不代表族群密度、棲地品質或現況。' : 'These 2012–2015 records may reflect survey routes, timing, accessibility, and methods; they do not represent population density, habitat quality, or current presence.'}</p><ResultLine count={filtered.length} language={language} />
    <section className="summary-cards">{[[zh ? '觀察紀錄' : 'Observation records', summary.records], [zh ? '爬蟲物種' : 'Unique reptile species', summary.species], [zh ? '科別' : 'Families', summary.families], [zh ? '來源記錄個體總數' : 'Summed recorded individuals', summary.individuals], [zh ? '有效座標' : 'Valid coordinates', filtered.filter((record) => record.hasValidCoordinates).length], [zh ? '有效時間' : 'Valid observation times', filtered.filter((record) => record.observationTime).length]].map(([label, value]) => <div key={String(label)}><strong>{value}</strong><span>{label}</span></div>)}</section>
    <div className="chart-grid"><BarList title={zh ? '各河域物種數（含紀錄數）' : 'Species richness by river area'} rows={summary.regions.map((row) => ({ label: `${row.label} · ${row.records}`, count: row.species }))} /><BarList title={zh ? '各月物種數' : 'Species richness by month'} rows={summary.months.map((row) => ({ label: row.label, count: row.species }))} /><BarList title={zh ? '資料中最常被記錄的物種' : 'Most frequently recorded in this dataset'} rows={summary.topByRecords.map((row) => ({ label: row.label, count: row.records }))} /><BarList title={zh ? '來源記錄個體數最多的物種' : 'Top species by summed source count'} rows={summary.topByCount.map((row) => ({ label: row.label, count: row.count }))} /></div>
    <p className="notice subtle">{zh ? '記錄模式可能反映爬蟲活動，也可能反映調查時間與努力差異；觀察時間是記錄發生的時間，不是保證動物活動時間。' : 'Recorded patterns may reflect reptile activity as well as survey timing and effort. Observation time is when surveys recorded animals, not guaranteed activity.'}</p>
    <div className="table-wrap"><table><thead><tr>{[zh ? 'ID' : 'ID', zh ? '類群' : 'Group', zh ? '科' : 'Family', zh ? '中文名' : 'Chinese name', zh ? '學名' : 'Scientific name', zh ? '期間' : 'Period', zh ? '時間' : 'Time', zh ? '河域' : 'Region', zh ? '數量' : 'Count', 'TWD97 X', 'TWD97 Y', 'Longitude', 'Latitude'].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice(0, 200).map((record) => <tr key={record.id} onClick={() => onSelect(record)}><td>{record.sourceSequenceNumber}</td><td>{record.group}</td><td>{record.familyName}</td><td>{record.commonNameZh}</td><td><em>{record.scientificName}</em></td><td>{record.observationPeriod}</td><td>{record.observationTime}</td><td>{record.region}</td><td>{record.observedCount}</td><td>{record.xTwd97Raw}</td><td>{record.yTwd97Raw}</td><td>{record.longitude}</td><td>{record.latitude}</td></tr>)}</tbody></table></div>
  </>;
}

function MapBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]), { padding: [28, 28] });
  }, [map, points]);
  return null;
}

function validPoints<T extends { id: string; coordinateStatus: string; latitude?: number; longitude?: number }>(records: T[]): Array<T & MapPoint> {
  return records.filter(
    (record): record is T & MapPoint =>
      record.coordinateStatus === 'valid' && record.latitude !== undefined && record.longitude !== undefined,
  );
}

function clusterEvents(events: ZooEvent[]) {
  const clusters = new Map<string, Array<ZooEvent & MapPoint>>();
  for (const event of validPoints(events)) {
    const key = `${event.latitude.toFixed(5)}:${event.longitude.toFixed(5)}`;
    clusters.set(key, [...(clusters.get(key) ?? []), event]);
  }
  return [...clusters.values()];
}

function clusterPlants(plants: ZooPlantRecord[]) {
  const clusters = new Map<string, Array<ZooPlantRecord & MapPoint>>();
  for (const plant of validPoints(plants)) {
    const key = `${plant.latitude.toFixed(5)}:${plant.longitude.toFixed(5)}`;
    clusters.set(key, [...(clusters.get(key) ?? []), plant]);
  }
  return [...clusters.values()];
}

function clusterBiodiversity(records: TaipeiBiodiversitySpeciesSurveyPointRecord[]) {
  const clusters = new Map<string, Array<TaipeiBiodiversitySpeciesSurveyPointRecord & MapPoint>>();
  for (const record of records.filter(
    (item): item is TaipeiBiodiversitySpeciesSurveyPointRecord & MapPoint =>
      item.longitude !== undefined && item.latitude !== undefined && item.isWithinTaipeiBounds,
  )) {
    const key = `${record.latitude.toFixed(3)}:${record.longitude.toFixed(3)}`;
    clusters.set(key, [...(clusters.get(key) ?? []), record]);
  }
  return [...clusters.values()];
}

function GuideMap({
  animals,
  plants,
  biodiversity,
  reptiles,
  areas,
  events,
  language,
  onLoadDataset,
  onSelect,
}: {
  animals: ZooAnimal[];
  plants: ZooPlantRecord[];
  biodiversity: TaipeiBiodiversitySpeciesSurveyPointRecord[];
  reptiles: RiverfrontReptileObservation[];
  areas: ZooExhibitArea[];
  events: ZooEvent[];
  language: Language;
  onLoadDataset: (dataset: DatasetKey) => Promise<void>;
  onSelect: (record: SelectedRecord) => void;
}) {
  const t = getTranslation(language);
  const [layers, setLayers] = useState({ animals: true, plants: true, biodiversity: false, reptiles: false, exhibits: true, events: true });
  const animalPoints = validPoints(animals);
  const plantPoints = validPoints(plants);
  const biodiversityPoints = biodiversity.filter((record): record is TaipeiBiodiversitySpeciesSurveyPointRecord & MapPoint => record.longitude !== undefined && record.latitude !== undefined && record.isWithinTaipeiBounds);
  const reptilePoints = reptiles.filter((record): record is RiverfrontReptileObservation & MapPoint => record.longitude !== null && record.latitude !== null && record.hasValidCoordinates);
  const areaPoints = validPoints(areas);
  const eventPoints = validPoints(events);
  const toggleLayer = (layer: keyof typeof layers, dataset?: DatasetKey) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
    if (dataset) void onLoadDataset(dataset);
  };
  const points = [
    ...(layers.animals ? animalPoints : []),
    ...(layers.plants ? plantPoints : []),
    ...(layers.biodiversity ? biodiversityPoints : []),
    ...(layers.reptiles ? reptilePoints : []),
    ...(layers.exhibits ? areaPoints : []),
    ...(layers.events ? eventPoints : []),
  ];
  return (
    <section className="map-section">
      <div className="layer-toggles">
        <label><input type="checkbox" checked={layers.animals} onChange={() => toggleLayer('animals')} />{t.animals}</label>
        <label><input type="checkbox" checked={layers.plants} onChange={() => toggleLayer('plants')} />{t.plantLayer}</label>
        <label><input type="checkbox" checked={layers.biodiversity} onChange={() => toggleLayer('biodiversity', 'biodiversity')} />{t.biodiversitySurveyPointLayer}</label>
        <label><input type="checkbox" checked={layers.reptiles} onChange={() => toggleLayer('reptiles', 'reptiles')} />{language === 'zh' ? '河濱爬蟲觀察' : 'Riverfront Reptiles'}</label>
        <label><input type="checkbox" checked={layers.exhibits} onChange={() => toggleLayer('exhibits')} />{t.exhibitLayer}</label>
        <label><input type="checkbox" checked={layers.events} onChange={() => toggleLayer('events')} />{t.eventLayer}</label>
      </div>
      <div className="map-shell">
        <MapContainer center={[24.9985, 121.582]} zoom={16} minZoom={14} scrollWheelZoom className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds points={points} />
          {layers.animals && animalPoints.map((animal, index) => (
            <Marker key={`${animal.id}-${index}`} position={[animal.latitude, animal.longitude]} icon={mapIcon('animal')}>
              <Popup><div className="popup-content"><strong>{animal.nameZh}</strong><span>{animal.exhibitArea}</span><button onClick={() => onSelect(animal)}>{t.viewDetails}</button></div></Popup>
            </Marker>
          ))}
          {layers.exhibits && areaPoints.map((area) => (
            <Marker key={area.id} position={[area.latitude, area.longitude]} icon={mapIcon('exhibit')}>
              <Popup><div className="popup-content"><strong>{area.areaName}</strong><span>{areaCategoryLabel(area.areaCategory, language)}</span><span>{area.relatedAnimalIds?.length ?? 0} {t.relatedAnimalCount}</span><button onClick={() => onSelect(area)}>{t.viewDetails}</button></div></Popup>
            </Marker>
          ))}
          {layers.plants && clusterPlants(plants).map((cluster) => {
            const first = cluster[0];
            if (cluster.length > 1) {
              return (
                <CircleMarker key={cluster.map((plant) => plant.id).join('|')} center={[first.latitude, first.longitude]} radius={12 + Math.min(cluster.length, 10)} pathOptions={{ color: '#477a36', fillColor: '#84b35b', fillOpacity: 0.82, weight: 2 }}>
                  <Popup><div className="popup-content"><strong>{cluster.length} {t.plants}</strong>{cluster.slice(0, 8).map((plant) => <button key={plant.id} onClick={() => onSelect(plant)}>{plant.chineseName}</button>)}</div></Popup>
                </CircleMarker>
              );
            }
            return <Marker key={first.id} position={[first.latitude, first.longitude]} icon={mapIcon('plant')}><Popup><div className="popup-content"><strong>{first.chineseName}</strong><span>{first.scientificName}</span><span>{first.locationAreas.join('、')}</span><button onClick={() => onSelect(first)}>{t.viewDetails}</button></div></Popup></Marker>;
          })}
          {layers.biodiversity && clusterBiodiversity(biodiversity).map((cluster) => {
            const first = cluster[0];
            if (cluster.length > 1) {
              return (
                <CircleMarker key={cluster.map((record) => record.id).join('|')} center={[first.latitude, first.longitude]} radius={9 + Math.min(cluster.length / 8, 18)} pathOptions={{ color: '#375f72', fillColor: '#6fa4aa', fillOpacity: 0.72, weight: 2 }}>
                  <Popup><div className="popup-content"><strong>{cluster.length} {t.surveyRecordCount}</strong><span>{t.biodiversityPopupNotice}</span>{cluster.slice(0, 8).map((record) => <button key={record.id} onClick={() => onSelect(record)}>{record.speciesName} · {record.surveyDate}</button>)}</div></Popup>
                </CircleMarker>
              );
            }
            return <Marker key={first.id} position={[first.latitude, first.longitude]} icon={mapIcon('biodiversity')}><Popup><div className="popup-content"><strong>{first.speciesName}</strong><span>{speciesClassGroupLabel(first.speciesClassGroup, language)} · {first.observationCount ?? t.unknown}</span><span>{first.surveyDate} · {first.surveyMethod}</span><span>{first.coordinateUncertaintyRaw}</span><span>{t.biodiversityPopupNotice}</span><button onClick={() => onSelect(first)}>{t.viewDetails}</button></div></Popup></Marker>;
          })}
          {layers.reptiles && reptilePoints.map((record) => <CircleMarker key={record.id} center={[record.latitude, record.longitude]} radius={7} pathOptions={{ color: '#3b4a25', fillColor: '#8b9c56', fillOpacity: 0.8, weight: 2 }}><Popup><div className="popup-content"><strong>{record.commonNameZh}</strong><span>{record.scientificName}</span><span>{record.familyName} · {record.region}</span><span>{record.observationPeriod} {record.observationTime ?? ''}</span><span>Historical survey record</span><button onClick={() => onSelect(record)}>{t.viewDetails}</button></div></Popup></CircleMarker>)}
          {layers.events && clusterEvents(events).map((cluster) => {
            const first = cluster[0];
            if (cluster.length > 1) {
              return (
                <CircleMarker key={cluster.map((event) => event.id).join('|')} center={[first.latitude, first.longitude]} radius={15 + Math.min(cluster.length, 12)} pathOptions={{ color: '#8a3f2b', fillColor: '#d8a331', fillOpacity: 0.88, weight: 2 }}>
                  <Popup><div className="popup-content"><strong>{cluster.length} {t.events}</strong>{cluster.slice(0, 8).map((event) => <button key={event.id} onClick={() => onSelect(event)}>{event.title} · {event.startDate}</button>)}</div></Popup>
                </CircleMarker>
              );
            }
            return <Marker key={first.id} position={[first.latitude, first.longitude]} icon={mapIcon('event', first.eventStatus === 'cancelled_or_paused')}><Popup><div className="popup-content"><strong>{first.title}</strong><span>{first.startDate} · {first.timeText}</span><span>{first.locationName}</span><button onClick={() => onSelect(first)}>{t.viewDetails}</button></div></Popup></Marker>;
          })}
        </MapContainer>
      </div>
      <p className="notice">{t.coordinateNotice}</p>
      {layers.biodiversity && <p className="notice subtle">{t.biodiversityMapNotice}</p>}
      <NearbyAnimals animals={animals} language={language} onSelect={onSelect} />
    </section>
  );
}

function NearbyAnimals({ animals, language, onSelect }: { animals: ZooAnimal[]; language: Language; onSelect: (animal: ZooAnimal) => void }) {
  const t = getTranslation(language);
  const [nearby, setNearby] = useState<Array<ZooAnimal & { distanceMeters: number }>>([]);
  const [message, setMessage] = useState('');
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const rows = validPoints(animals)
          .map((animal) => ({ ...animal, distanceMeters: calculateDistanceMeters(coords.latitude, coords.longitude, animal.latitude, animal.longitude) }))
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .slice(0, 5);
        setNearby(rows);
        setMessage(rows[0] && rows[0].distanceMeters > 2500 ? t.awayFromZoo : '');
      },
      () => setMessage(t.awayFromZoo),
    );
  return (
    <section className="nearby">
      <button className="primary-button" onClick={locate}><Navigation size={17} />{t.showNearbyAnimals}</button>
      {message && <p className="notice subtle">{message}</p>}
      {!!nearby.length && <div><h3>{t.nearbyAnimals}</h3>{nearby.map((animal, index) => <button key={`${animal.id}-${index}`} onClick={() => onSelect(animal)}>{animal.nameZh} · {formatDistance(animal.distanceMeters, language)}</button>)}</div>}
    </section>
  );
}

function BarList({ title, rows }: { title: string; rows: Array<{ id?: string; label: string; count: number }> }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section className="chart-block">
      <h3>{title}</h3>
      {rows.slice(0, 10).map((row, index) => (
        <div className="bar-row" key={row.id ?? `${row.label}-${index}`}>
          <span>{row.label}</span><div><i style={{ width: `${(row.count / max) * 100}%` }} /></div><b>{row.count}</b>
        </div>
      ))}
    </section>
  );
}

function Overview({
  animals,
  plants,
  biodiversitySummary,
  birds,
  areas,
  events,
  summary,
  language,
}: {
  animals: ZooAnimal[];
  plants: ZooPlantRecord[];
  biodiversitySummary: TaipeiBiodiversitySpeciesSurveyPointSummary | null;
  birds: RiverfrontBirdObservation[];
  areas: ZooExhibitArea[];
  events: ZooEvent[];
  summary: ZooGuideSummary;
  language: Language;
}) {
  const t = getTranslation(language);
  const animalSummary = buildZooAnimalSummary(animals);
  const plantSummary = buildZooPlantSummary(plants);
  const biodiversityData = biodiversitySummary ?? buildTaipeiBiodiversitySpeciesSurveyPointSummary([]);
  const cards = [
    [t.totalAnimalRecords, animals.length],
    [t.plantRecordCount, plants.length],
    [t.plantSpeciesCount, plantSummary.species.length],
    [t.surveyRecordCount, biodiversityData.totalRecords],
    [t.uniqueSpeciesCount, biodiversityData.uniqueSpeciesNameCount],
    [t.latestSurveyYear, biodiversityData.latestSurveyYear ?? t.unknown],
    [language === 'zh' ? '河濱鳥類紀錄' : 'Riverfront bird records', summary.riverfrontBirdObservationCount ?? 0],
    [language === 'zh' ? '河濱鳥種' : 'Riverfront bird species', summary.riverfrontBirdSpeciesCount ?? 0],
    [t.plantFamilyCount, summary.plantFamilyCount ?? 0],
    [t.exhibitAreaCount, areas.length],
    [t.exhibitAreasWithCoordinates, areas.filter((area) => area.coordinateStatus === 'valid').length],
    [t.exhibitAreasLinkedToAnimals, areas.filter((area) => area.relatedAnimalIds?.length).length],
    [t.eventCount, events.length],
    [t.ongoingEventCount, summary.ongoingEventCount],
    [t.upcomingEventCount, summary.upcomingEventCount],
    [t.pausedOrCancelledEventCount, summary.pausedOrCancelledEventCount],
  ];
  return (
    <section className="dashboard">
      <section className="summary-cards">{cards.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
      <div className="overview-facts">
        <p><strong>{t.eventDateRange}</strong><span>{summary.eventDateMin} – {summary.eventDateMax}</span></p>
        <p><strong>{t.mostCommonEventLocation}</strong><span>{summary.byEventLocation[0]?.locationName ?? t.unknown}</span></p>
      </div>
      <div className="chart-grid">
        <BarList title={t.exhibitAreasByCategory} rows={summary.byExhibitAreaCategory.map((row) => ({ label: areaCategoryLabel(row.areaCategory, language), count: row.count }))} />
        <BarList title={t.animalsByExhibitArea} rows={animalSummary.byExhibitArea.map((row) => ({ label: row.exhibitArea, count: row.count }))} />
        <BarList title={t.plantsByFamily} rows={plantSummary.byFamily.map((row) => ({ label: row.familyRaw, count: row.uniquePlantCount }))} />
        <BarList title={t.plantsByLocation} rows={plantSummary.byLocationArea.map((row) => ({ label: row.locationArea, count: row.uniquePlantCount }))} />
        <BarList title={t.speciesClasses} rows={biodiversityData.bySpeciesClassGroup.map((row) => ({ label: speciesClassGroupLabel(row.speciesClassGroup, language), count: row.recordCount }))} />
        <BarList title={t.yearlyTrends} rows={biodiversityData.bySurveyYear.map((row) => ({ label: String(row.surveyYear), count: row.recordCount }))} />
        <BarList title={t.eventsByCategory} rows={summary.byEventCategory.map((row) => ({ label: eventCategoryLabel(row.eventCategory, language), count: row.count }))} />
        <BarList title={t.eventsByStatus} rows={summary.byEventStatus.map((row) => ({ label: eventStatusLabel(row.eventStatus, language), count: row.count }))} />
        <BarList title={t.eventsByMonth} rows={summary.byEventMonth.map((row) => ({ label: row.month, count: row.count }))} />
        <BarList title={t.eventsByLocation} rows={summary.byEventLocation.map((row) => ({ label: row.locationName, count: row.count }))} />
      </div>
    </section>
  );
}

function DataNotes({ language }: { language: Language }) {
  const t = getTranslation(language);
  return (
    <section className="notes-page">
      <h2>{t.dataNotes}</h2>
      <p>{t.exhibitDatasetNote}</p>
      <p>{t.eventDatasetNote}</p>
      <p>{t.plantDatasetNote}</p>
      <p>{t.biodiversityDataNote}</p>
      <p>{t.biodiversityInterpretationNote}</p>
      <p>{t.biodiversityZooExhibitDistinctionNote}</p>
      <p>{t.coordinateNotice}</p>
      <p className="notice">{t.zooMediaLicenseNotice}</p>
      <p className="notice">{t.zooGuideDisclaimer}</p>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div className="detail-row"><dt>{label}</dt><dd>{value}</dd></div>;
}

function DetailPanel({
  record,
  animals,
  language,
  onClose,
}: {
  record: SelectedRecord;
  animals: ZooAnimal[];
  language: Language;
  onClose: () => void;
}) {
  const t = getTranslation(language);
  if ('module' in record && record.module === 'exhibit_areas') {
    const related = new Map(animals.map((animal) => [animal.id, animal]));
    return (
      <aside className="detail-panel" aria-label={record.areaName}>
        <button className="icon-button close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">{areaCategoryLabel(record.areaCategory, language)}</p>
        <h2>{record.areaName}</h2>
        <p>{record.description}</p>
        {record.officialUrl && <a className="primary-link" href={record.officialUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} />{t.openOfficialPage}</a>}
        <dl><DetailRow label={t.memo} value={record.memo} /><DetailRow label={t.relatedAnimalCount} value={String(record.relatedAnimalIds?.length ?? 0)} /><DetailRow label="WGS84" value={record.latitude !== undefined && record.longitude !== undefined ? `${record.latitude}, ${record.longitude}` : undefined} /></dl>
        {!!record.relatedAnimalIds?.length && <section><h3>{t.relatedAnimals}</h3><div className="tags">{record.relatedAnimalIds.map((id) => related.get(id)?.nameZh).filter(Boolean).map((name) => <span key={name}>{name}</span>)}</div></section>}
        {record.imageUrl && <p className="notice subtle">{t.zooMediaLicenseNotice}</p>}
      </aside>
    );
  }
  if ('module' in record && record.module === 'events') {
    return (
      <aside className="detail-panel" aria-label={record.title}>
        <button className="icon-button close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">{eventCategoryLabel(record.eventCategory, language)} · {eventStatusLabel(record.eventStatus, language)}</p>
        <h2>{record.title}</h2>
        <p>{record.summary || record.brief}</p>
        {record.officialUrl && <a className="primary-link" href={record.officialUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} />{t.openOfficialPage}</a>}
        <dl>
          <DetailRow label={t.startDate} value={record.startDate} /><DetailRow label={t.endDate} value={record.endDate} />
          <DetailRow label={t.eventTime} value={record.timeText} /><DetailRow label={t.eventLocation} value={record.locationName} />
          <DetailRow label={t.keywords} value={record.keywords.join('、')} /><DetailRow label="WGS84" value={record.latitude !== undefined && record.longitude !== undefined ? `${record.latitude}, ${record.longitude}` : undefined} />
        </dl>
        <p className="notice subtle">{t.zooEventNotice}</p>
        {record.imageUrl && <p className="notice subtle">{t.zooMediaLicenseNotice}</p>}
      </aside>
    );
  }
  if ('module' in record && record.module === 'plants') {
    return (
      <aside className="detail-panel" aria-label={record.chineseName}>
        <button className="icon-button close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">{[record.familyRaw, record.genusRaw].filter(Boolean).join(' · ')}</p>
        <h2>{record.chineseName}</h2>
        {record.englishName && <p className="latin">{record.englishName}</p>}
        {record.scientificName && <em>{record.scientificName}</em>}
        <p>{record.brief || record.summary}</p>
        <dl>
          <DetailRow label={t.alias} value={record.alsoKnown.join('、')} />
          <DetailRow label={t.plantFamily} value={record.familyRaw} />
          <DetailRow label={t.plantGenus} value={record.genusRaw} />
          <DetailRow label={t.plantLocation} value={record.locationAreas.join('、')} />
          <DetailRow label={t.plantFeatures} value={record.features} />
          <DetailRow label={t.plantUse} value={record.functionAndApplication} />
          <DetailRow label={t.updatedDate} value={record.updatedDate} />
          <DetailRow label="WGS84" value={record.latitude !== undefined && record.longitude !== undefined ? `${record.latitude}, ${record.longitude}` : undefined} />
        </dl>
        {!!record.mediaReferences.length && (
          <section>
            <h3>{t.mediaLinks}</h3>
            <div className="media-list">
              {record.mediaReferences.filter((media) => media.url).map((media, index) => (
                <a key={`${media.kind}-${index}`} href={media.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />{media.alt || media.kind}</a>
              ))}
            </div>
            <p className="notice subtle">{t.zooMediaLicenseNotice}</p>
          </section>
        )}
      </aside>
    );
  }
  if ('module' in record && record.module === 'taipei_biodiversity_species_survey_points') {
    return (
      <aside className="detail-panel" aria-label={record.speciesName}>
        <button className="icon-button close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">{t.biodiversity} · {speciesClassGroupLabel(record.speciesClassGroup, language)}</p>
        <h2>{record.speciesName || t.unknown}</h2>
        <p>{t.biodiversityPopupNotice}</p>
        <dl>
          <DetailRow label={t.surveyDate} value={record.surveyDate} />
          <DetailRow label={t.speciesClass} value={record.speciesClass} />
          <DetailRow label={t.observationCount} value={record.observationCount?.toString()} />
          <DetailRow label={t.surveyMethod} value={record.surveyMethod} />
          <DetailRow label={t.coordinateUncertainty} value={record.coordinateUncertaintyRaw} />
          <DetailRow label={t.resourceYear} value={record.resourceYear?.toString()} />
          <DetailRow label={t.coordinateSystem} value={record.coordinateSystem} />
          <DetailRow label={t.distanceToTaipeiZoo} value={record.distanceToTaipeiZooKm !== undefined ? `${record.distanceToTaipeiZooKm} km` : undefined} />
          <DetailRow label="WGS84" value={record.latitude !== undefined && record.longitude !== undefined ? `${record.latitude}, ${record.longitude}` : undefined} />
          <DetailRow label={t.source} value={record.source} />
        </dl>
        <p className="notice subtle">{t.biodiversityInterpretationNote}</p>
        <p className="notice subtle">{t.wildlifeRespectNote}</p>
      </aside>
    );
  }
  if ('module' in record && record.module === 'riverfront_bird_observations') {
    return (
      <aside className="detail-panel" aria-label={record.commonNameZh}>
        <button className="icon-button close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">Historical riverfront observation</p>
        <h2>{record.commonNameZh}</h2>
        <p className="latin">{record.scientificName}</p>
        <dl>
          <DetailRow label="Family" value={record.familyName} /><DetailRow label="Source status" value={record.statusRaw} />
          <DetailRow label="Observation period" value={record.observationPeriod ?? undefined} /><DetailRow label="Date precision" value={record.datePrecision} />
          <DetailRow label="River area" value={record.region} /><DetailRow label="Recorded individuals" value={record.observedCount?.toString()} />
          <DetailRow label="Endemic" value={record.endemicRaw} /><DetailRow label="Alien" value={record.alienRaw} />
          <DetailRow label="TWD97" value={`${record.xTwd97Raw}, ${record.yTwd97Raw}`} /><DetailRow label="WGS84" value={record.longitude !== null && record.latitude !== null ? `${record.latitude}, ${record.longitude}` : undefined} />
        </dl>
        <p className="notice subtle">Historical survey record only; it does not establish current presence or a guaranteed sighting.</p>
      </aside>
    );
  }
  if ('module' in record && record.module === 'riverfront_reptile_observations') {
    return <aside className="detail-panel" aria-label={record.commonNameZh}><button className="icon-button close" onClick={onClose} aria-label="Close"><X size={20} /></button><p className="eyebrow">Historical riverfront observation</p><h2>{record.commonNameZh}</h2><p className="latin">{record.scientificName}</p><dl><DetailRow label="Group" value={record.group} /><DetailRow label="Family" value={record.familyName} /><DetailRow label="Observation period" value={record.observationPeriod ?? undefined} /><DetailRow label="Time" value={record.observationTime ?? undefined} /><DetailRow label="River area" value={record.region} /><DetailRow label="Recorded individuals" value={record.observedCount?.toString()} /><DetailRow label="TWD97" value={`${record.xTwd97Raw}, ${record.yTwd97Raw}`} /><DetailRow label="WGS84" value={record.longitude !== null && record.latitude !== null ? `${record.latitude}, ${record.longitude}` : undefined} /></dl><p className="notice subtle">Historical survey record only. Keep an appropriate distance; do not touch, feed, capture, or disturb wildlife.</p></aside>;
  }
  const animal = record as ZooAnimal;
  const topicUrl = getOfficialTopicPageUrl(animal);
  return (
    <aside className="detail-panel" aria-label={animal.nameZh}>
      <button className="icon-button close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      <p className="eyebrow">{animal.exhibitArea} · {animal.poiGroup}</p>
      <h2>{animal.nameZh}</h2>
      {animal.nameEn && <p className="latin">{animal.nameEn}</p>}
      {animal.scientificName && <em>{animal.scientificName}</em>}
      <p>{animal.summary}</p>
      {topicUrl && <a className="primary-link" href={topicUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} />{t.openOfficialPage}</a>}
      <dl>
        <DetailRow label={t.alias} value={animal.alias} /><DetailRow label={t.conservationStatus} value={animal.conservationStatus} />
        <DetailRow label={t.taxonomicClass} value={animal.taxonomy.className} /><DetailRow label={t.geographicDistribution} value={animal.geographicDistribution} />
        <DetailRow label={t.habitat} value={animal.habitat} /><DetailRow label={t.morphology} value={animal.morphology} />
        <DetailRow label={t.behavior} value={animal.behavior} /><DetailRow label={t.diet} value={animal.diet} />
        <DetailRow label={t.threats} value={animal.threats} /><DetailRow label={t.interpretation} value={animal.interpretation} />
      </dl>
      {!!animal.media.length && <p className="notice subtle">{t.zooMediaLicenseNotice}</p>}
    </aside>
  );
}

function Footer({ language }: { language: Language }) {
  return <footer><Globe2 size={17} /><span>{getTranslation(language).footer}</span></footer>;
}

export default function App() {
  const [language, setLanguage] = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('animals');
  const { animals, plants, biodiversity, biodiversitySummary, birds, reptiles, exhibitAreas, events, summary, loading, loadDataset } = useZooGuideData(activeTab);
  const [search, setSearch] = useState('');
  const [animalFilters, setAnimalFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<SelectedRecord | null>(null);
  const t = getTranslation(language);
  const filters = { ...animalFilters, search };
  const isTabLoading = tabDatasets[activeTab].some((dataset) => loading.includes(dataset));

  return (
    <div className="app">
      <header className="hero">
        <div><p className="eyebrow">Taipei Zoo Open Data</p><h1>{t.appTitle}</h1><p>{t.appSubtitle}</p></div>
        <LanguageToggle language={language} setLanguage={setLanguage} />
      </header>
      <main>
        <GroupedNavigation activeTab={activeTab} setActiveTab={setActiveTab} language={language} />
        {!['overview', 'notes'].includes(activeTab) && <GlobalSearch value={search} onChange={setSearch} language={language} />}
        {isTabLoading ? <LoadingState language={language} /> : <>
          {activeTab === 'animals' && <AnimalGuide animals={animals} filters={filters} setFilters={setAnimalFilters} language={language} onSelect={setSelected} />}
          {activeTab === 'plants' && <PlantGuide plants={plants} search={search} language={language} onSelect={setSelected} />}
          {activeTab === 'biodiversity' && <BiodiversityGuide records={biodiversity} datasetSummary={biodiversitySummary} search={search} language={language} onLoadDetails={() => void loadDataset('biodiversity')} isLoadingDetails={loading.includes('biodiversity')} onSelect={setSelected} />}
          {activeTab === 'birds' && <RiverfrontBirdGuide records={birds} search={search} language={language} onSelect={setSelected} />}
          {activeTab === 'reptiles' && <RiverfrontReptileGuide records={reptiles} search={search} language={language} onSelect={setSelected} />}
          {activeTab === 'exhibits' && <ExhibitGuide areas={exhibitAreas} animals={animals} search={search} language={language} onSelect={setSelected} />}
          {activeTab === 'events' && <EventGuide events={events} search={search} language={language} onSelect={setSelected} />}
          {activeTab === 'map' && <GuideMap animals={filterAnimals(animals, filters)} plants={plants} biodiversity={biodiversity} reptiles={reptiles} areas={exhibitAreas} events={events} language={language} onLoadDataset={loadDataset} onSelect={setSelected} />}
          {activeTab === 'overview' && <Overview animals={animals} plants={plants} biodiversitySummary={biodiversitySummary} birds={birds} areas={exhibitAreas} events={events} summary={summary} language={language} />}
          {activeTab === 'notes' && <DataNotes language={language} />}
        </>}
      </main>
      <Footer language={language} />
      {selected && <DetailPanel record={selected} animals={animals} language={language} onClose={() => setSelected(null)} />}
    </div>
  );
}

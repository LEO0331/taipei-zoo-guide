import { useEffect, useMemo, useState } from 'react';
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
  ZooAnimal,
  ZooEvent,
  ZooEventCategory,
  ZooEventStatus,
  ZooExhibitArea,
  ZooGuideSummary,
  ZooPlantRecord,
} from './models';
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

type Tab = 'animals' | 'plants' | 'biodiversity' | 'exhibits' | 'events' | 'map' | 'overview' | 'notes';
type SelectedRecord = ZooAnimal | ZooPlantRecord | TaipeiBiodiversitySpeciesSurveyPointRecord | ZooExhibitArea | ZooEvent;
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

function useZooGuideData() {
  const [animals, setAnimals] = useState<ZooAnimal[]>([]);
  const [plants, setPlants] = useState<ZooPlantRecord[]>([]);
  const [biodiversity, setBiodiversity] = useState<TaipeiBiodiversitySpeciesSurveyPointRecord[]>([]);
  const [exhibitAreas, setExhibitAreas] = useState<ZooExhibitArea[]>([]);
  const [events, setEvents] = useState<ZooEvent[]>([]);

  useEffect(() => {
    Promise.all([
      loadJson<ZooAnimal[]>('data/zoo-animals.json', []),
      loadJson<ZooPlantRecord[]>('data/zoo-plants.json', []),
      loadJson<TaipeiBiodiversitySpeciesSurveyPointRecord[]>('data/taipei-biodiversity-species-survey-points.json', []),
      loadJson<ZooExhibitArea[]>('data/zoo-exhibit-areas.json', []),
      loadJson<ZooEvent[]>('data/zoo-events.json', []),
    ])
      .then(([animalRows, plantRows, biodiversityRows, areaRows, eventRows]) => {
        setAnimals(animalRows);
        setPlants(plantRows);
        setBiodiversity(biodiversityRows);
        setExhibitAreas(areaRows);
        setEvents(eventRows.map((event) => ({ ...event, eventStatus: getZooEventStatus(event) })));
      })
      .catch(() => {
        setAnimals([]);
        setPlants([]);
        setBiodiversity([]);
        setExhibitAreas([]);
        setEvents([]);
      });
  }, []);

  const summary = useMemo(() => buildZooGuideSummary(animals, exhibitAreas, events, plants, biodiversity), [animals, exhibitAreas, events, plants, biodiversity]);
  return { animals, plants, biodiversity, exhibitAreas, events, summary };
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

function MainTabs({ activeTab, setActiveTab, language }: { activeTab: Tab; setActiveTab: (tab: Tab) => void; language: Language }) {
  const t = getTranslation(language);
  const labels = {
    animals: t.animalGuide,
    plants: t.plantGuide,
    biodiversity: t.biodiversity,
    exhibits: t.exhibitAreas,
    events: t.events,
    map: t.map,
    overview: t.dataOverview,
    notes: t.dataNotes,
  };
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
  search,
  language,
  onSelect,
}: {
  records: TaipeiBiodiversitySpeciesSurveyPointRecord[];
  search: string;
  language: Language;
  onSelect: (record: TaipeiBiodiversitySpeciesSurveyPointRecord) => void;
}) {
  const t = getTranslation(language);
  const [year, setYear] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [method, setMethod] = useState('');
  const [withinTaipei, setWithinTaipei] = useState(false);
  const [nearZoo, setNearZoo] = useState(false);
  const years = sortedUnique(records.map((record) => record.surveyYear?.toString()));
  const classGroups = sortedUnique(records.map((record) => record.speciesClassGroup));
  const methods = sortedUnique(records.map((record) => record.surveyMethodCategory));
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
  const summary = buildTaipeiBiodiversitySpeciesSurveyPointSummary(filtered);
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
      <section className="filters">
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
      <ResultLine count={filtered.length} language={language} />
      <p className="notice subtle">{t.biodiversityMapNotice}</p>
      <section className="summary-cards">{cards.map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
      <div className="chart-grid">
        <BarList title={t.speciesClasses} rows={summary.bySpeciesClassGroup.map((row) => ({ label: speciesClassGroupLabel(row.speciesClassGroup, language), count: row.recordCount }))} />
        <BarList title={t.surveyMethods} rows={summary.bySurveyMethodCategory.map((row) => ({ label: surveyMethodCategoryLabel(row.surveyMethodCategory, language), count: row.recordCount }))} />
        <BarList title={t.yearlyTrends} rows={summary.bySurveyYear.map((row) => ({ label: String(row.surveyYear), count: row.recordCount }))} />
        <BarList title={t.mostRecordedSpecies} rows={summary.topSpeciesByRecordCount.map((row) => ({ label: row.speciesName, count: row.recordCount }))} />
      </div>
      <p className="notice subtle">{t.biodiversityChartNotice}</p>
      <div className="table-wrap biodiversity-table">
        <table>
          <thead><tr><th>{t.surveyDate}</th><th>{t.speciesClass}</th><th>{t.speciesName}</th><th>{t.observationCount}</th><th>{t.surveyMethod}</th><th>{t.coordinateUncertainty}</th><th>{t.resourceYear}</th></tr></thead>
          <tbody>{filtered.slice(0, 100).map((record) => (
            <tr key={record.id} onClick={() => onSelect(record)}>
              <td>{record.surveyDate}</td><td>{record.speciesClass}</td><td>{record.speciesName}</td><td>{record.observationCount}</td><td>{record.surveyMethod}</td><td>{record.coordinateUncertaintyRaw}</td><td>{record.resourceYear}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="notice subtle">{t.biodiversityZooExhibitDistinctionNote}</p>
      <p className="notice subtle">{t.wildlifeRespectNote}</p>
    </>
  );
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
  areas,
  events,
  language,
  onSelect,
}: {
  animals: ZooAnimal[];
  plants: ZooPlantRecord[];
  biodiversity: TaipeiBiodiversitySpeciesSurveyPointRecord[];
  areas: ZooExhibitArea[];
  events: ZooEvent[];
  language: Language;
  onSelect: (record: SelectedRecord) => void;
}) {
  const t = getTranslation(language);
  const [layers, setLayers] = useState({ animals: true, plants: true, biodiversity: false, exhibits: true, events: true });
  const animalPoints = validPoints(animals);
  const plantPoints = validPoints(plants);
  const biodiversityPoints = biodiversity.filter((record): record is TaipeiBiodiversitySpeciesSurveyPointRecord & MapPoint => record.longitude !== undefined && record.latitude !== undefined && record.isWithinTaipeiBounds);
  const areaPoints = validPoints(areas);
  const eventPoints = validPoints(events);
  const points = [
    ...(layers.animals ? animalPoints : []),
    ...(layers.plants ? plantPoints : []),
    ...(layers.biodiversity ? biodiversityPoints : []),
    ...(layers.exhibits ? areaPoints : []),
    ...(layers.events ? eventPoints : []),
  ];
  return (
    <section className="map-section">
      <div className="layer-toggles">
        <label><input type="checkbox" checked={layers.animals} onChange={(event) => setLayers({ ...layers, animals: event.target.checked })} />{t.animals}</label>
        <label><input type="checkbox" checked={layers.plants} onChange={(event) => setLayers({ ...layers, plants: event.target.checked })} />{t.plantLayer}</label>
        <label><input type="checkbox" checked={layers.biodiversity} onChange={(event) => setLayers({ ...layers, biodiversity: event.target.checked })} />{t.biodiversitySurveyPointLayer}</label>
        <label><input type="checkbox" checked={layers.exhibits} onChange={(event) => setLayers({ ...layers, exhibits: event.target.checked })} />{t.exhibitLayer}</label>
        <label><input type="checkbox" checked={layers.events} onChange={(event) => setLayers({ ...layers, events: event.target.checked })} />{t.eventLayer}</label>
      </div>
      <div className="map-shell">
        <MapContainer center={[24.9985, 121.582]} zoom={16} minZoom={14} scrollWheelZoom className="map">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png" />
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

function BarList({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section className="chart-block">
      <h3>{title}</h3>
      {rows.slice(0, 10).map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span><div><i style={{ width: `${(row.count / max) * 100}%` }} /></div><b>{row.count}</b>
        </div>
      ))}
    </section>
  );
}

function Overview({
  animals,
  plants,
  biodiversity,
  areas,
  events,
  summary,
  language,
}: {
  animals: ZooAnimal[];
  plants: ZooPlantRecord[];
  biodiversity: TaipeiBiodiversitySpeciesSurveyPointRecord[];
  areas: ZooExhibitArea[];
  events: ZooEvent[];
  summary: ZooGuideSummary;
  language: Language;
}) {
  const t = getTranslation(language);
  const animalSummary = buildZooAnimalSummary(animals);
  const plantSummary = buildZooPlantSummary(plants);
  const biodiversitySummary = buildTaipeiBiodiversitySpeciesSurveyPointSummary(biodiversity);
  const cards = [
    [t.totalAnimalRecords, animals.length],
    [t.plantRecordCount, plants.length],
    [t.plantSpeciesCount, plantSummary.species.length],
    [t.surveyRecordCount, biodiversity.length],
    [t.uniqueSpeciesCount, biodiversitySummary.uniqueSpeciesNameCount],
    [t.latestSurveyYear, biodiversitySummary.latestSurveyYear ?? t.unknown],
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
        <BarList title={t.speciesClasses} rows={biodiversitySummary.bySpeciesClassGroup.map((row) => ({ label: speciesClassGroupLabel(row.speciesClassGroup, language), count: row.recordCount }))} />
        <BarList title={t.yearlyTrends} rows={biodiversitySummary.bySurveyYear.map((row) => ({ label: String(row.surveyYear), count: row.recordCount }))} />
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
  const { animals, plants, biodiversity, exhibitAreas, events, summary } = useZooGuideData();
  const [language, setLanguage] = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('animals');
  const [search, setSearch] = useState('');
  const [animalFilters, setAnimalFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<SelectedRecord | null>(null);
  const t = getTranslation(language);
  const filters = { ...animalFilters, search };

  return (
    <div className="app">
      <header className="hero">
        <div><p className="eyebrow">Taipei Zoo Open Data</p><h1>{t.appTitle}</h1><p>{t.appSubtitle}</p></div>
        <LanguageToggle language={language} setLanguage={setLanguage} />
      </header>
      <main>
        <MainTabs activeTab={activeTab} setActiveTab={setActiveTab} language={language} />
        {!['overview', 'notes'].includes(activeTab) && <GlobalSearch value={search} onChange={setSearch} language={language} />}
        {activeTab === 'animals' && <AnimalGuide animals={animals} filters={filters} setFilters={setAnimalFilters} language={language} onSelect={setSelected} />}
        {activeTab === 'plants' && <PlantGuide plants={plants} search={search} language={language} onSelect={setSelected} />}
        {activeTab === 'biodiversity' && <BiodiversityGuide records={biodiversity} search={search} language={language} onSelect={setSelected} />}
        {activeTab === 'exhibits' && <ExhibitGuide areas={exhibitAreas} animals={animals} search={search} language={language} onSelect={setSelected} />}
        {activeTab === 'events' && <EventGuide events={events} search={search} language={language} onSelect={setSelected} />}
        {activeTab === 'map' && <GuideMap animals={filterAnimals(animals, filters)} plants={plants} biodiversity={biodiversity} areas={exhibitAreas} events={events} language={language} onSelect={setSelected} />}
        {activeTab === 'overview' && <Overview animals={animals} plants={plants} biodiversity={biodiversity} areas={exhibitAreas} events={events} summary={summary} language={language} />}
        {activeTab === 'notes' && <DataNotes language={language} />}
      </main>
      <Footer language={language} />
      {selected && <DetailPanel record={selected} animals={animals} language={language} onClose={() => setSelected(null)} />}
    </div>
  );
}

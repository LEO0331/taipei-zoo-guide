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
  X,
} from 'lucide-react';
import { getTranslation } from './i18n';
import type {
  ExhibitAreaCategory,
  Filters,
  Language,
  ZooAnimal,
  ZooEvent,
  ZooEventCategory,
  ZooEventStatus,
  ZooExhibitArea,
  ZooGuideSummary,
} from './models';
import {
  buildZooAnimalSummary,
  calculateDistanceMeters,
  filterAnimals,
  formatDistance,
  getFilterOptions,
  getOfficialTopicPageUrl,
} from './utils/zooData';
import { buildZooGuideSummary, getZooEventStatus } from './utils/zooGuideData';
import { assetPath } from './utils/assets';

type Tab = 'animals' | 'exhibits' | 'events' | 'map' | 'overview' | 'notes';
type SelectedRecord = ZooAnimal | ZooExhibitArea | ZooEvent;
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
  exhibits: BookOpen,
  events: CalendarDays,
  map: MapPinned,
  overview: BarChart3,
  notes: Info,
};

const mapIcon = (kind: 'animal' | 'exhibit' | 'event', paused = false) =>
  L.divIcon({
    className: `guide-marker ${kind}${paused ? ' paused' : ''}`,
    html: `<span>${kind === 'animal' ? 'A' : kind === 'exhibit' ? 'E' : 'D'}</span>`,
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
  const [exhibitAreas, setExhibitAreas] = useState<ZooExhibitArea[]>([]);
  const [events, setEvents] = useState<ZooEvent[]>([]);

  useEffect(() => {
    Promise.all([
      loadJson<ZooAnimal[]>('data/zoo-animals.json', []),
      loadJson<ZooExhibitArea[]>('data/zoo-exhibit-areas.json', []),
      loadJson<ZooEvent[]>('data/zoo-events.json', []),
    ])
      .then(([animalRows, areaRows, eventRows]) => {
        setAnimals(animalRows);
        setExhibitAreas(areaRows);
        setEvents(eventRows.map((event) => ({ ...event, eventStatus: getZooEventStatus(event) })));
      })
      .catch(() => {
        setAnimals([]);
        setExhibitAreas([]);
        setEvents([]);
      });
  }, []);

  const summary = useMemo(() => buildZooGuideSummary(animals, exhibitAreas, events), [animals, exhibitAreas, events]);
  return { animals, exhibitAreas, events, summary };
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

function GuideMap({
  animals,
  areas,
  events,
  language,
  onSelect,
}: {
  animals: ZooAnimal[];
  areas: ZooExhibitArea[];
  events: ZooEvent[];
  language: Language;
  onSelect: (record: SelectedRecord) => void;
}) {
  const t = getTranslation(language);
  const [layers, setLayers] = useState({ animals: true, exhibits: true, events: true });
  const animalPoints = validPoints(animals);
  const areaPoints = validPoints(areas);
  const eventPoints = validPoints(events);
  const points = [
    ...(layers.animals ? animalPoints : []),
    ...(layers.exhibits ? areaPoints : []),
    ...(layers.events ? eventPoints : []),
  ];
  return (
    <section className="map-section">
      <div className="layer-toggles">
        <label><input type="checkbox" checked={layers.animals} onChange={(event) => setLayers({ ...layers, animals: event.target.checked })} />{t.animals}</label>
        <label><input type="checkbox" checked={layers.exhibits} onChange={(event) => setLayers({ ...layers, exhibits: event.target.checked })} />{t.exhibitLayer}</label>
        <label><input type="checkbox" checked={layers.events} onChange={(event) => setLayers({ ...layers, events: event.target.checked })} />{t.eventLayer}</label>
      </div>
      <div className="map-shell">
        <MapContainer center={[24.9985, 121.582]} zoom={16} minZoom={14} scrollWheelZoom className="map">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
  areas,
  events,
  summary,
  language,
}: {
  animals: ZooAnimal[];
  areas: ZooExhibitArea[];
  events: ZooEvent[];
  summary: ZooGuideSummary;
  language: Language;
}) {
  const t = getTranslation(language);
  const animalSummary = buildZooAnimalSummary(animals);
  const cards = [
    [t.totalAnimalRecords, animals.length],
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
  const { animals, exhibitAreas, events, summary } = useZooGuideData();
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
        {activeTab === 'exhibits' && <ExhibitGuide areas={exhibitAreas} animals={animals} search={search} language={language} onSelect={setSelected} />}
        {activeTab === 'events' && <EventGuide events={events} search={search} language={language} onSelect={setSelected} />}
        {activeTab === 'map' && <GuideMap animals={filterAnimals(animals, filters)} areas={exhibitAreas} events={events} language={language} onSelect={setSelected} />}
        {activeTab === 'overview' && <Overview animals={animals} areas={exhibitAreas} events={events} summary={summary} language={language} />}
        {activeTab === 'notes' && <DataNotes language={language} />}
      </main>
      <Footer language={language} />
      {selected && <DetailPanel record={selected} animals={animals} language={language} onClose={() => setSelected(null)} />}
    </div>
  );
}

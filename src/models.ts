export type ZooGuideModule = 'animals' | 'exhibit_areas' | 'events';

export type CoordinateStatus = 'valid' | 'missing' | 'outlier' | 'unparsed';

export type ExhibitAreaCategory = 'outdoor' | 'indoor' | 'education' | 'special_exhibition' | 'other' | 'unknown';

export type ZooEventStatus = 'upcoming' | 'ongoing' | 'past' | 'cancelled_or_paused' | 'unknown';

export type ZooEventCategory =
  | 'scheduled_course'
  | 'keeper_talk'
  | 'education_station'
  | 'special_exhibition'
  | 'paused_or_cancelled'
  | 'other'
  | 'unknown';

export type ZooMediaItem = {
  description?: string;
  url: string;
  type: 'photo' | 'pdf' | 'audio' | 'video' | 'webpage';
};

export type ZooAnimal = {
  id: string;
  sequenceNumber?: string;
  code?: string;
  nameZh: string;
  nameEn?: string;
  scientificName?: string;
  alias?: string;
  summary?: string;
  keywords: string[];
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  exhibitArea?: string;
  poiGroup?: string;
  taxonomy: {
    kingdomOrPhylum?: string;
    className?: string;
    orderName?: string;
    familyName?: string;
  };
  conservationStatus?: string;
  geographicDistribution?: string;
  habitat?: string;
  morphology?: string;
  behavior?: string;
  diet?: string;
  threats?: string;
  interpretation?: string;
  topicPageTitle?: string;
  topicPageUrl?: string;
  isAdoptionFocusSpecies: boolean;
  media: ZooMediaItem[];
  dataUpdatedAt?: string;
  source: string;
};

export type ZooAnimalSummary = {
  total: number;
  byExhibitArea: Array<{ exhibitArea: string; count: number }>;
  byPoiGroup: Array<{ poiGroup: string; count: number }>;
  byConservationStatus: Array<{ conservationStatus: string; count: number }>;
  byTaxonomicClass: Array<{ className: string; count: number }>;
  byDiet: Array<{ diet: string; count: number }>;
  adoptionFocusSpeciesCount: number;
  withCoordinatesCount: number;
  withoutCoordinatesCount: number;
  withEnglishNameCount: number;
  withTopicPageCount: number;
  withPhotoUrlCount: number;
  withAudioUrlCount: number;
  withVideoUrlCount: number;
};

export type ZooExhibitArea = {
  id: string;
  module: 'exhibit_areas';
  sortOrder?: number;
  areaCategoryRaw?: string;
  areaCategory: ExhibitAreaCategory;
  areaName: string;
  description?: string;
  memo?: string;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  officialUrl?: string;
  imageUrl?: string;
  relatedAnimalIds?: string[];
  source: string;
};

export type ZooEvent = {
  id: string;
  module: 'events';
  eventCategoryRaw?: string;
  eventCategory: ZooEventCategory;
  title: string;
  summary?: string;
  brief?: string;
  startDateRaw?: string;
  startDate?: string;
  endDateRaw?: string;
  endDate?: string;
  timeText?: string;
  locationName?: string;
  address?: string;
  siteName?: string;
  geoWkt?: string;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  publishedDateRaw?: string;
  publishedDate?: string;
  removedDateRaw?: string;
  removedDate?: string;
  keywordsRaw?: string;
  keywords: string[];
  imageAlt?: string;
  imageUrl?: string;
  officialUrl?: string;
  eventStatus: ZooEventStatus;
  matchedExhibitAreaId?: string;
  matchedAnimalIds?: string[];
  source: string;
};

export type ZooGuideSummary = {
  animalCount?: number;
  exhibitAreaCount: number;
  exhibitAreaCategoryCount: number;
  eventCount: number;
  upcomingEventCount: number;
  ongoingEventCount: number;
  pastEventCount: number;
  pausedOrCancelledEventCount: number;
  eventDateMin?: string;
  eventDateMax?: string;
  byExhibitAreaCategory: Array<{
    areaCategory: ExhibitAreaCategory;
    areaCategoryRaw?: string;
    count: number;
  }>;
  byEventCategory: Array<{
    eventCategory: ZooEventCategory;
    eventCategoryRaw?: string;
    count: number;
  }>;
  byEventStatus: Array<{ eventStatus: ZooEventStatus; count: number }>;
  byEventMonth: Array<{ month: string; count: number }>;
  byEventLocation: Array<{ locationName: string; count: number }>;
  exhibitAreasWithAnimalCount: Array<{
    exhibitAreaId: string;
    areaName: string;
    animalCount: number;
  }>;
};

export type Language = 'zh' | 'en';

export type Filters = {
  search: string;
  exhibitArea: string;
  poiGroup: string;
  conservationStatus: string;
  taxonomicClass: string;
  taxonomicOrder: string;
  taxonomicFamily: string;
  diet: string;
  adoptionFocusOnly: boolean;
  hasCoordinates: boolean;
  hasTopicPage: boolean;
};

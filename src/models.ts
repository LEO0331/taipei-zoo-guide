export type CoordinateStatus = 'valid' | 'missing' | 'outlier';

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

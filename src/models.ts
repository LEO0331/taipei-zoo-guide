export type ZooGuideModule = 'animals' | 'plants' | 'exhibit_areas' | 'events' | 'taipei_biodiversity_species_survey_points';

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

export type BiodiversitySpeciesClassGroup =
  | 'bird'
  | 'mammal'
  | 'reptile'
  | 'amphibian'
  | 'fish'
  | 'insect'
  | 'arachnid'
  | 'crustacean'
  | 'mollusk'
  | 'plant'
  | 'fungus'
  | 'other'
  | 'unknown';

export type BiodiversitySurveyMethodCategory =
  | 'visual_observation'
  | 'transect'
  | 'point_count'
  | 'trap'
  | 'netting'
  | 'audio'
  | 'camera'
  | 'literature_or_record'
  | 'other'
  | 'unknown';

export type BiodiversityCoordinateSystem = 'wgs84_lonlat' | 'twd97_tm2' | 'unknown';

export type ZooMediaItem = {
  description?: string;
  url: string;
  type: 'photo' | 'pdf' | 'audio' | 'video' | 'webpage';
};

export type ZooMediaReference = {
  kind: 'image' | 'pdf' | 'audio' | 'video';
  alt?: string;
  url?: string;
  licenseScope: 'source_reference_only';
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

export type ZooPlantRecord = {
  id: string;
  module: 'plants';
  chineseName: string;
  englishName?: string;
  scientificName?: string;
  summary?: string;
  keywordsRaw?: string;
  keywords: string[];
  alsoKnownRaw?: string;
  alsoKnown: string[];
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;
  locationRaw?: string;
  locationAreas: string[];
  familyRaw?: string;
  familyChinese?: string;
  familyLatin?: string;
  genusRaw?: string;
  genusChinese?: string;
  genusLatin?: string;
  brief?: string;
  features?: string;
  functionAndApplication?: string;
  plantCode?: string;
  sourceContentId?: string;
  updatedDateRaw?: string;
  updatedDate?: string;
  mediaReferences: ZooMediaReference[];
  matchedExhibitAreaIds?: string[];
  source: string;
};

export type ZooPlantSpeciesSummary = {
  speciesKey: string;
  chineseName: string;
  englishName?: string;
  scientificName?: string;
  recordCount: number;
  coordinateCount: number;
  familyRaw?: string;
  familyChinese?: string;
  familyLatin?: string;
  genusRaw?: string;
  genusChinese?: string;
  genusLatin?: string;
  locationAreas: string[];
  alsoKnown: string[];
  latestUpdatedDate?: string;
};

export type ZooPlantSummary = {
  totalPlantRecords: number;
  uniqueChineseNameCount: number;
  uniqueScientificNameCount: number;
  validCoordinateCount: number;
  outlierCoordinateCount: number;
  missingCoordinateCount: number;
  familyCount: number;
  genusCount: number;
  locationAreaCount: number;
  recordsWithEnglishName: number;
  recordsWithScientificName: number;
  recordsWithBrief: number;
  recordsWithFeatures: number;
  recordsWithFunctionAndApplication: number;
  recordsWithMediaUrl: number;
  byFamily: Array<{
    familyRaw: string;
    familyChinese?: string;
    familyLatin?: string;
    recordCount: number;
    uniquePlantCount: number;
  }>;
  byGenus: Array<{
    genusRaw: string;
    genusChinese?: string;
    genusLatin?: string;
    recordCount: number;
    uniquePlantCount: number;
  }>;
  byLocationArea: Array<{
    locationArea: string;
    recordCount: number;
    uniquePlantCount: number;
  }>;
  species: ZooPlantSpeciesSummary[];
};

export type TaipeiBiodiversitySpeciesSurveyPointRecord = {
  id: string;
  module: 'taipei_biodiversity_species_survey_points';
  resourceName?: string;
  resourceYear?: number;
  sourceFileName?: string;
  coordinateXRaw?: string;
  coordinateYRaw?: string;
  coordinateSystem: BiodiversityCoordinateSystem;
  longitude?: number;
  latitude?: number;
  twd97X?: number;
  twd97Y?: number;
  isWithinTaipeiBounds: boolean;
  isNearZooArea?: boolean;
  distanceToTaipeiZooKm?: number;
  surveyDateRaw?: string;
  surveyDate?: string;
  surveyYear?: number;
  surveyMonth?: number;
  surveyMonthKey?: string;
  speciesClassRaw?: string;
  speciesClass?: string;
  speciesClassNormalized?: string;
  speciesClassGroup: BiodiversitySpeciesClassGroup;
  speciesNameRaw?: string;
  speciesName?: string;
  speciesNameNormalized?: string;
  speciesScientificNameCandidate?: string;
  speciesCommonNameCandidate?: string;
  observationCountRaw?: string;
  observationCount?: number;
  observationCountBucket?: string;
  surveyMethodRaw?: string;
  surveyMethod?: string;
  surveyMethodNormalized?: string;
  surveyMethodCategory: BiodiversitySurveyMethodCategory;
  coordinateUncertaintyRaw?: string;
  coordinateUncertainty?: number;
  coordinateUncertaintyMeters?: number;
  hasCoordinateUncertainty: boolean;
  sourceRecordHash: string;
  source: string;
  sourceAgency: string;
};

export type TaipeiBiodiversitySpeciesSurveyPointSummary = {
  totalRecords: number;
  minSurveyDate?: string;
  maxSurveyDate?: string;
  minSurveyYear?: number;
  maxSurveyYear?: number;
  latestSurveyYear?: number;
  uniqueSpeciesNameCount: number;
  speciesClassCount: number;
  surveyMethodCount: number;
  recordsWithCoordinates: number;
  recordsWithinTaipeiBounds: number;
  recordsOutsideTaipeiBounds: number;
  recordsNearZooArea: number;
  recordsWithObservationCount: number;
  totalObservationCount?: number;
  recordsWithCoordinateUncertainty: number;
  bySurveyYear: Array<{ surveyYear: number; recordCount: number; uniqueSpeciesNameCount: number; totalObservationCount?: number }>;
  bySpeciesClassGroup: Array<{
    speciesClassGroup: BiodiversitySpeciesClassGroup;
    recordCount: number;
    uniqueSpeciesNameCount: number;
    totalObservationCount?: number;
  }>;
  bySurveyMethodCategory: Array<{
    surveyMethodCategory: BiodiversitySurveyMethodCategory;
    recordCount: number;
    uniqueSpeciesNameCount: number;
  }>;
  topSpeciesByRecordCount: Array<{
    speciesName: string;
    speciesClassGroup: BiodiversitySpeciesClassGroup;
    recordCount: number;
    totalObservationCount?: number;
  }>;
  topSpeciesByObservationCount: Array<{
    speciesName: string;
    speciesClassGroup: BiodiversitySpeciesClassGroup;
    recordCount: number;
    totalObservationCount?: number;
  }>;
  dataQuality: {
    missingCoordinateCount: number;
    invalidCoordinateCount: number;
    missingSurveyDateCount: number;
    invalidSurveyDateCount: number;
    missingSpeciesNameCount: number;
    missingSpeciesClassCount: number;
    invalidObservationCountCount: number;
    unknownCoordinateSystemCount: number;
  };
};

export type ZooGuideSummary = {
  animalCount?: number;
  plantRecordCount?: number;
  uniquePlantNameCount?: number;
  uniqueScientificNameCount?: number;
  plantFamilyCount?: number;
  plantGenusCount?: number;
  plantLocationAreaCount?: number;
  biodiversitySurveyRecordCount?: number;
  biodiversityUniqueSpeciesCount?: number;
  biodiversityLatestSurveyYear?: number;
  biodiversityRecordsNearZooArea?: number;
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

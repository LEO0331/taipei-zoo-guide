export const TAIPEI_BIODIVERSITY_DATASET_PAGE =
  'https://data.taipei/dataset/detail?id=084c5d95-7e9f-49ad-8ab9-d741a9564189';

export const TAIPEI_BIODIVERSITY_RESOURCES = [
  ['2024生物多樣性指標調查物種點位資料', '8c475d5d-e3b5-42cd-8a4c-4acbf416a5bc', 'UTF-8'],
  ['2023生物多樣性指標調查物種點位資料', '7fa117a7-a1d1-4835-919d-f2a2909cd73a', 'Big5'],
  ['2022生物多樣性指標調查物種點位資料', 'a7139605-4697-49eb-9818-bc1988b8d907', 'Big5'],
  ['2021生物多樣性指標調查物種點位資料', '8391b3fd-d344-4c87-aff9-19824ccef089', 'UTF-8'],
  ['2020生物多樣性指標調查物種點位資料', '186aa95e-8d95-49f9-a024-f7f3ec5e70a6', 'Big5'],
  ['2019生物多樣性指標調查物種點位資料', '532b700d-6dbd-4b11-8f0f-49d3512ffc94', 'Big5'],
  ['2018生物多樣性指標調查物種點位資料', '5fcb31da-86eb-4274-a31a-e2148a510440', 'Big5'],
  ['2017生物多樣性指標調查物種點位資料', '79f63576-1213-4586-9a26-df1f11ba859b', 'Big5'],
] as const;

export function biodiversityResourceUrl(rid: string) {
  return `https://data.taipei/api/dataset/084c5d95-7e9f-49ad-8ab9-d741a9564189/resource/${rid}/download`;
}

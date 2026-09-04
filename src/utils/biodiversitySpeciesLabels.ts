import type { Language } from '../models';

type SpeciesLabels = { zh: string; en: string };

// The Taipei source supplies either a scientific name or a Chinese common name
// per row. This registry keeps chart labels consistent with the selected UI
// language without changing the source records or their aggregation.
const labels: Record<string, SpeciesLabels> = {
  'Pycnonotus sinensis': { zh: '白頭翁', en: 'Light-vented Bulbul' },
  'Psilopogon nuchalis': { zh: '五色鳥', en: 'Taiwan Barbet' },
  'Hypsipetes leucocephalus': { zh: '白頭鶇', en: 'Black Bulbul' },
  'Megalaima nuchalis': { zh: '五色鳥', en: 'Taiwan Barbet' },
  'Dendrocitta formosae': { zh: '臺灣藍鵲', en: 'Taiwan Blue Magpie' },
  'Zosterops japonicus': { zh: '綠繡眼', en: 'Japanese White-eye' },
  'Bubulcus ibis': { zh: '牛背鷺', en: 'Cattle Egret' },
  'Streptopelia orientalis': { zh: '山斑鳩', en: 'Oriental Turtle Dove' },
  'Hirundo rustica': { zh: '家燕', en: 'Barn Swallow' },
  'Passer montanus': { zh: '麻雀', en: 'Eurasian Tree Sparrow' },
  'Pomatorhinus musicus': { zh: '臺灣畫眉', en: 'Taiwan Scimitar Babbler' },
  'Streptopelia chinensis': { zh: '珠頸斑鳩', en: 'Spotted Dove' },
  'Zizeeria maha okinawana': { zh: '琉球小灰蝶', en: 'Pale Grass Blue' },
  'Bambusicola thoracicus': { zh: '竹雞', en: 'Chinese Bamboo Partridge' },
  'Egretta garzetta': { zh: '小白鷺', en: 'Little Egret' },
  'Acridotheres tristis': { zh: '家八哥', en: 'Common Myna' },
  'Nycticorax nycticorax': { zh: '夜鷺', en: 'Black-crowned Night Heron' },
  'Columba livia': { zh: '岩鴿', en: 'Rock Dove' },
  'Anas crecca': { zh: '小水鴨', en: 'Eurasian Teal' },
  'Threskiornis aethiopicus': { zh: '埃及聖䴉', en: 'African Sacred Ibis' },
  'Oreochromis niloticus': { zh: '尼羅吳郭魚', en: 'Nile Tilapia' },
  'Acridotheres javanicus': { zh: '白尾八哥', en: 'Javan Myna' },
  昆蟲綱: { zh: '昆蟲綱', en: 'Insecta' },
  五色鳥: { zh: '五色鳥', en: 'Taiwan Barbet' },
  白頭翁: { zh: '白頭翁', en: 'Light-vented Bulbul' },
  小水鴨: { zh: '小水鴨', en: 'Eurasian Teal' },
  岩鴿: { zh: '岩鴿', en: 'Rock Dove' },
};

const containsHan = (value: string) => /[\u3400-\u9fff]/u.test(value);

export function biodiversitySpeciesLabel(speciesName: string, language: Language) {
  const translated = labels[speciesName];
  if (translated) return translated[language];
  if (language === 'zh') return containsHan(speciesName) ? speciesName : '未收錄中文名';
  return containsHan(speciesName) ? 'Common name unavailable' : speciesName;
}

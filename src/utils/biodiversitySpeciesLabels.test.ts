import { describe, expect, it } from 'vitest';
import { biodiversitySpeciesLabel } from './biodiversitySpeciesLabels';

describe('biodiversitySpeciesLabel', () => {
  it('uses Chinese common names in the Traditional Chinese interface', () => {
    expect(biodiversitySpeciesLabel('Pycnonotus sinensis', 'zh')).toBe('白頭翁');
    expect(biodiversitySpeciesLabel('五色鳥', 'zh')).toBe('五色鳥');
  });

  it('uses English names in the English interface', () => {
    expect(biodiversitySpeciesLabel('五色鳥', 'en')).toBe('Taiwan Barbet');
    expect(biodiversitySpeciesLabel('Pycnonotus sinensis', 'en')).toBe('Light-vented Bulbul');
  });

  it('does not show an untranslated scientific name in the Chinese interface', () => {
    expect(biodiversitySpeciesLabel('Unknownus exampleus', 'zh')).toBe('未收錄中文名');
  });
});

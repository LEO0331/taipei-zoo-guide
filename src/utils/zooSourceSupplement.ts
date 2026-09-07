type SourceRow = Record<string, unknown>;

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const key = (value: unknown) => clean(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

function wktCoordinate(value: unknown) {
  const match = clean(value).match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
  return match ? { longitude: Number(match[1]), latitude: Number(match[2]) } : undefined;
}

function distanceMeters(leftLongitude: number, leftLatitude: number, rightLongitude: number, rightLatitude: number) {
  return Math.sqrt(((leftLongitude - rightLongitude) * 101_000) ** 2 + ((leftLatitude - rightLatitude) * 111_000) ** 2);
}

export function mergeAnimalEnglishSupplement(baseRows: SourceRow[], supplementRows: SourceRow[]) {
  const byCode = new Map<string, SourceRow>();
  const byEnglish = new Map<string, SourceRow>();
  const byScientific = new Map<string, SourceRow>();
  for (const row of baseRows) {
    if (clean(row.a_code)) byCode.set(clean(row.a_code), row);
    if (key(row.a_name_en)) byEnglish.set(key(row.a_name_en), row);
    if (key(row.a_name_latin)) byScientific.set(key(row.a_name_latin), row);
  }
  const merged = new Map(baseRows.map((row) => [row, { ...row }]));
  const unmatched: string[] = [];
  const coordinateReview: Array<{ code: string; distanceMeters: number }> = [];
  let matched = 0;
  let coordinatesRefined = 0;

  for (const supplement of supplementRows) {
    const code = clean(supplement.A_Code);
    const base = byCode.get(code) ?? byEnglish.get(key(supplement.A_Name)) ?? byScientific.get(key(supplement.A_Name_Latin));
    if (!base) {
      unmatched.push(code || clean(supplement.A_Name) || clean(supplement.A_Name_Latin) || 'unnamed source row');
      continue;
    }
    matched += 1;
    const target = merged.get(base)!;
    if (clean(supplement.A_Name)) target.a_name_en = clean(supplement.A_Name);
    if (clean(supplement.A_Name_Latin)) target.a_name_latin = clean(supplement.A_Name_Latin);
    for (const index of ['01', '02', '03', '04']) {
      if (!clean(target[`a_pic${index}_url`]) && clean(supplement[`A_Pic${index}_URL`])) target[`a_pic${index}_url`] = clean(supplement[`A_Pic${index}_URL`]);
      if (!clean(target[`a_pic${index}_alt`]) && clean(supplement[`A_Pic${index}_ALT`])) target[`a_pic${index}_alt`] = clean(supplement[`A_Pic${index}_ALT`]);
    }
    const coordinate = wktCoordinate(supplement.A_Geo);
    const oldLongitude = Number(clean(target.a_longitude));
    const oldLatitude = Number(clean(target.a_latitude));
    if (coordinate && Number.isFinite(oldLongitude) && Number.isFinite(oldLatitude)) {
      const distance = distanceMeters(oldLongitude, oldLatitude, coordinate.longitude, coordinate.latitude);
      if (distance <= 100) {
        target.a_longitude = String(coordinate.longitude);
        target.a_latitude = String(coordinate.latitude);
        coordinatesRefined += 1;
      } else {
        coordinateReview.push({ code: code || clean(target.a_code), distanceMeters: Math.round(distance) });
      }
    }
  }
  return { rows: baseRows.map((row) => merged.get(row)!), report: { matched, unmatched, coordinateReview, coordinatesRefined } };
}

export function mergeDisplayAreaEnglishSupplement(baseRows: SourceRow[], supplementRows: SourceRow[]) {
  const byCode = new Map(baseRows.map((row) => [clean(row.E_no), row]));
  const merged = new Map(baseRows.map((row) => [row, { ...row }]));
  const unmatched: string[] = [];
  const coordinateReview: Array<{ code: string; distanceMeters: number }> = [];
  let matched = 0;
  let coordinatesRefined = 0;
  for (const supplement of supplementRows) {
    const code = clean(supplement.Code);
    const base = byCode.get(code);
    if (!base) {
      unmatched.push(code || clean(supplement.E_Name) || 'unnamed source row');
      continue;
    }
    matched += 1;
    const target = merged.get(base)!;
    target.E_Name_En = clean(supplement.E_Name);
    target.E_Category_En = clean(supplement.E_Category);
    target.E_Info_En = clean(supplement.E_Info);
    const coordinate = wktCoordinate(supplement.E_Geo);
    const oldLongitude = Number(clean(target.E_Longitude));
    const oldLatitude = Number(clean(target.E_Latitude));
    if (coordinate && Number.isFinite(oldLongitude) && Number.isFinite(oldLatitude)) {
      const distance = distanceMeters(oldLongitude, oldLatitude, coordinate.longitude, coordinate.latitude);
      if (distance <= 100) {
        target.E_Longitude = String(coordinate.longitude);
        target.E_Latitude = String(coordinate.latitude);
        coordinatesRefined += 1;
      } else {
        coordinateReview.push({ code, distanceMeters: Math.round(distance) });
      }
    }
  }
  return { rows: baseRows.map((row) => merged.get(row)!), report: { matched, unmatched, coordinateReview, coordinatesRefined } };
}

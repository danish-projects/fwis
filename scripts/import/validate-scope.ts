export function assertSchoolScope(
  row: Record<string, string>,
  sheetName: string,
  rowIndex: number,
  expectedCity: string,
  expectedState: string
) {
  const city = row.school_city?.trim();
  const state = row.school_state?.trim().toUpperCase();

  if (!city || !state) {
    throw new Error(
      `${sheetName} row ${rowIndex}: school_city and school_state are required.`
    );
  }

  if (city.toLowerCase() !== expectedCity.toLowerCase()) {
    throw new Error(
      `${sheetName} row ${rowIndex}: school_city "${city}" does not match School_Setup "${expectedCity}".`
    );
  }

  if (state !== expectedState.toUpperCase()) {
    throw new Error(
      `${sheetName} row ${rowIndex}: school_state "${state}" does not match School_Setup "${expectedState}".`
    );
  }
}

export function assertAcademicYearScope(
  row: Record<string, string>,
  sheetName: string,
  rowIndex: number,
  expectedYear: string
) {
  const year = row.academic_year?.trim();
  if (!year) {
    throw new Error(`${sheetName} row ${rowIndex}: academic_year is required.`);
  }
  if (year !== expectedYear) {
    throw new Error(
      `${sheetName} row ${rowIndex}: academic_year "${year}" does not match School_Setup "${expectedYear}".`
    );
  }
}

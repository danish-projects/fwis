export const ACADEMIC_YEAR_COOKIE = "fwis_academic_year_id";

/** Global academic year (one row per season name, e.g. 2025-2026). */
export type AcademicYearSummary = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  label: string;
};

export type AcademicYearSchoolContext = {
  id: string;
  academicYearId: string;
  schoolId: string;
  isActive: boolean;
  academicYear: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    docsDriveFolderId: string | null;
  };
};

export const ACADEMIC_YEAR_COOKIE = "fwis_academic_year_id";

export type AcademicYearSummary = {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  label: string;
};

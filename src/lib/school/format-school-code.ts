export function formatSchoolCode(cityCode: string): string {
  return `FWIS-${cityCode.trim().toUpperCase()}`;
}

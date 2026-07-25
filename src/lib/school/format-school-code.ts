export function formatSchoolCode(cityCode: string): string {
  return `FWIS-${cityCode.trim().toUpperCase()}`;
}

/**
 * Sidebar label: FWIS-Houston (brand city from "… - Houston", else city field).
 */
export function formatSchoolCityLabel(school: {
  name: string;
  city: string;
}): string {
  const dash = school.name.lastIndexOf(" - ");
  const cityLabel =
    dash >= 0 ? school.name.slice(dash + 3).trim() : school.city.trim();
  return `FWIS-${cityLabel}`;
}
